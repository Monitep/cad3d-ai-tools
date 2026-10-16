import asyncio
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import time
import functools
import http.server
import shutil
import subprocess
import threading

import pytest
from fastapi.testclient import TestClient

SERVICE = Path(__file__).resolve().parents[2] / 'nas-services' / 'videopocket'
sys.path.insert(0, str(SERVICE))
os.environ['DATA_DIR'] = tempfile.mkdtemp(prefix='videopocket-tests-')
os.environ['APP_PASSWORD'] = 'test-only-password-for-videopocket'
import app as service
from worker import validate_url, public_address


@pytest.fixture()
def client(monkeypatch, tmp_path):
    monkeypatch.setattr(service, 'ROOT', tmp_path)
    monkeypatch.setattr(service, 'DB', tmp_path / 'queue.sqlite3')
    service.SESSIONS.clear()
    service.TICKETS.clear()
    service.LOGIN_ATTEMPTS.clear()
    service.ACTIVE.clear()
    async def inert_queue():
        await asyncio.sleep(3600)
    monkeypatch.setattr(service, 'queue_loop', inert_queue)
    with TestClient(service.app) as c:
        yield c


def login(client):
    response = client.post('/api/login', json={'password': service.PASSWORD})
    assert response.status_code == 200
    return {'Authorization': 'Bearer ' + response.json()['token']}


def test_auth_required_and_logout_revokes(client):
    assert client.get('/api/jobs').status_code == 401
    headers = login(client)
    assert client.get('/api/jobs', headers=headers).status_code == 200
    assert client.post('/api/logout', headers=headers).status_code == 200
    assert client.get('/api/jobs', headers=headers).status_code == 401


def test_login_throttling(client):
    for _ in range(8):
        assert client.post('/api/login', json={'password': 'wrong'}).status_code == 401
    assert client.post('/api/login', json={'password': service.PASSWORD}).status_code == 429


@pytest.mark.parametrize('url', [
    'file:///etc/passwd', 'https://127.0.0.1/', 'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data', 'http://[::1]/',
    'http://name.local/', 'https://user:pass@example.com/',
    'http://example.com:5000/', 'http://localhost/', 'http://224.0.0.1/',
])
def test_rejects_nonpublic_links(url):
    with pytest.raises(ValueError):
        validate_url(url)


@pytest.mark.parametrize('address', ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', '::ffff:192.168.1.1', '224.0.0.1'])
def test_network_blocks_private_and_multicast(address):
    with pytest.raises(OSError):
        public_address(address)


def test_public_link_and_address():
    assert validate_url('https://www.youtube.com/watch?v=abc')
    public_address('8.8.8.8')


def test_queue_cancel_delete_and_cap(client):
    headers = login(client)
    body = {'url': 'https://www.youtube.com/watch?v=abc', 'quality': '1080'}
    assert client.post('/api/jobs', headers=headers, json={**body, 'quality': 'weird'}).status_code == 422
    jobs = [client.post('/api/jobs', headers=headers, json=body).json() for _ in range(12)]
    assert client.post('/api/jobs', headers=headers, json=body).status_code == 429
    job_id = jobs[0]['id']
    assert client.delete('/api/jobs/' + job_id, headers=headers).status_code == 409
    assert client.post('/api/jobs/' + job_id + '/cancel', headers=headers).status_code == 200
    assert client.delete('/api/jobs/' + job_id, headers=headers).status_code == 200
    assert len(client.get('/api/jobs', headers=headers).json()['jobs']) == 11


def test_file_download_requires_short_lived_ticket(client):
    headers = login(client)
    job = client.post('/api/jobs', headers=headers, json={'url': 'https://example.com/video.mp4'}).json()
    job_id = job['id']
    assert client.post(f'/api/jobs/{job_id}/ticket', headers=headers).status_code == 409
    directory = service.ROOT / job_id
    directory.mkdir()
    (directory / 'video.mp4').write_bytes(b'video-test-data')
    service.update(job_id, status='done', filename='video.mp4')
    assert client.post(f'/api/jobs/{job_id}/ticket').status_code == 401
    link = client.post(f'/api/jobs/{job_id}/ticket', headers=headers).json()['path']
    result = client.get(link)
    assert result.content == b'video-test-data'
    assert 'attachment' in result.headers['content-disposition']
    assert client.get(link, headers={'Range': 'bytes=0-4'}).content == b'video'
    service.TICKETS[link.rsplit('/', 1)[-1]]['expires'] = time.time() - 1
    assert client.get(link).status_code == 401


def test_cors_exact_origin(client):
    headers = {'Origin': 'https://cad3d.expert', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type'}
    r = client.options('/api/jobs', headers=headers)
    assert r.headers.get('access-control-allow-origin') == 'https://cad3d.expert'
    headers['Origin'] = 'https://untrusted.example'
    r = client.options('/api/jobs', headers=headers)
    assert 'access-control-allow-origin' not in r.headers


def test_info_search_use_isolated_worker(client, monkeypatch):
    async def fake_metadata(payload):
        if payload['mode'] == 'search':
            assert payload['query'] == 'architettura'
        return {'results': [{'title': 'Video', 'url': 'https://example.com/video.mp4'}]}
    monkeypatch.setattr(service, 'metadata', fake_metadata)
    headers = login(client)
    assert client.get('/api/search?q=architettura', headers=headers).json()['results']
    assert client.post('/api/info', headers=headers, json={'url': 'https://example.com/video.mp4'}).status_code == 200
    assert client.post('/api/info', headers=headers, json={'url': 'http://192.168.1.1'}).status_code == 422


def test_retention_removes_old_files_and_record(client):
    headers = login(client)
    job_id = client.post('/api/jobs', headers=headers, json={'url': 'https://example.com/video.mp4'}).json()['id']
    directory = service.ROOT / job_id
    directory.mkdir()
    (directory / 'video.mp4').write_bytes(b'old file')
    service.update(job_id, status='done', filename='video.mp4')
    with service.connect() as db:
        db.execute('UPDATE jobs SET updated=? WHERE id=?', (time.time() - service.RETENTION - 1, job_id))
    service.cleanup()
    assert not directory.exists()
    assert client.get('/api/jobs', headers=headers).json()['jobs'] == []


def test_download_process_success_and_storage_guard(client, monkeypatch):
    class FakeProcess:
        returncode = 0
        pid = 0
        def __init__(self):
            self.stdout = asyncio.StreamReader()
            self.stdout.feed_data((json.dumps({'status': 'downloading', 'progress': 50}) + '\n' + json.dumps({'status': 'done', 'title': 'Finished'}) + '\n').encode())
            self.stdout.feed_eof()
        async def wait(self):
            return 0
    async def fake_spawn(payload):
        Path(payload['directory'], 'finished.mp4').write_bytes(b'valid-test-fixture')
        return FakeProcess()
    monkeypatch.setattr(service, 'spawn', fake_spawn)
    headers = login(client)
    job_id = client.post('/api/jobs', headers=headers, json={'url': 'https://example.com/video.mp4'}).json()['id']
    asyncio.run(service.run_download(service.get_job(job_id)))
    assert service.get_job(job_id)['status'] == 'done'
    monkeypatch.setattr(service, 'STORAGE_BYTES', 1)
    job_id = client.post('/api/jobs', headers=headers, json={'url': 'https://example.com/video.mp4'}).json()['id']
    asyncio.run(service.run_download(service.get_job(job_id)))
    assert service.get_job(job_id)['status'] == 'error'


@pytest.mark.parametrize('quality,extension', [('720', '.mp4'), ('audio', '.mp3')])
def test_real_engine_with_local_fixture(tmp_path, quality, extension):
    """Real yt-dlp/ffmpeg; loopback permissions change only in the test child."""
    if not shutil.which('ffmpeg'):
        pytest.skip('ffmpeg not installed')
    fixture = tmp_path / 'fixture.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
        'color=c=orange:s=96x64:d=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1',
        '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', str(fixture)], check=True, timeout=20)
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(tmp_path)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    output = tmp_path / 'output'
    output.mkdir()
    try:
        code = ('import sys;sys.path.insert(0,' + repr(str(SERVICE)) + ');'
                'import worker;worker.protect_network=lambda:None;'
                'worker.validate_url=lambda url:url;worker.main()')
        result = subprocess.run([sys.executable, '-c', code], input=json.dumps({
            'mode': 'download', 'url': f'http://127.0.0.1:{server.server_port}/fixture.mp4',
            'quality': quality, 'directory': str(output)}), capture_output=True, text=True, timeout=30)
        assert result.returncode == 0, result.stderr
        events = [json.loads(line) for line in result.stdout.splitlines()]
        assert events[-1]['status'] == 'done'
        files = list(output.iterdir())
        assert len(files) == 1 and files[0].suffix == extension
        assert files[0].stat().st_size > 1000
    finally:
        server.shutdown()
        server.server_close()
