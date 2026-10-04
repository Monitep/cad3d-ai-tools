"""VideoPocket: single-user NAS service, durable queue, isolated downloader."""
import asyncio
import contextlib
import hashlib
import hmac
import ipaddress
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import sqlite3
import sys
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from worker import validate_url

ROOT = Path(os.environ.get('DATA_DIR', './data')).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
DB = ROOT / 'queue.sqlite3'
PASSWORD = os.environ.get('APP_PASSWORD', '')
MAX_BYTES = int(os.environ.get('MAX_FILE_MB', '2048')) * 1024 * 1024
STORAGE_BYTES = int(os.environ.get('STORAGE_MB', '10240')) * 1024 * 1024
RETENTION = int(os.environ.get('RETENTION_HOURS', '48')) * 3600
SESSIONS = {}
TICKETS = {}
LOGIN_ATTEMPTS = {}
ACTIVE = {}
METADATA_LOCK = asyncio.Lock()
WORKER = Path(__file__).with_name('worker.py')


def connect():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    with connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, url TEXT, title TEXT, quality TEXT, status TEXT, progress INTEGER, error TEXT, filename TEXT, created REAL, updated REAL)')
        db.execute("UPDATE jobs SET status='queued',progress=0 WHERE status IN ('downloading','processing')")


def update(job_id, **values):
    values['updated'] = time.time()
    with connect() as db:
        db.execute('UPDATE jobs SET ' + ','.join(key + '=?' for key in values) + ' WHERE id=?', [*values.values(), job_id])


def get_job(job_id):
    with connect() as db:
        result = db.execute('SELECT * FROM jobs WHERE id=?', (job_id,)).fetchone()
    if not result:
        raise HTTPException(404, 'Download non trovato.')
    return dict(result)


def public_job(job):
    return {key: value for key, value in dict(job).items() if key != 'filename'}


def auth(authorization: str = Header(default='')):
    token = authorization.removeprefix('Bearer ')
    if not token or SESSIONS.get(token, 0) < time.time():
        raise HTTPException(401, 'Accedi al tuo NAS per continuare.')
    return token


def prune_ephemeral():
    now = time.time()
    for table in (SESSIONS, TICKETS):
        for key, value in list(table.items()):
            expiry = value if table is SESSIONS else value['expires']
            if expiry < now:
                table.pop(key, None)
    for key, values in list(LOGIN_ATTEMPTS.items()):
        values[:] = [t for t in values if t > now - 900]
        if not values:
            LOGIN_ATTEMPTS.pop(key, None)


async def stop_process(proc):
    if proc.returncode is None:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(proc.pid, signal.SIGTERM)
        try:
            await asyncio.wait_for(proc.wait(), 4)
        except asyncio.TimeoutError:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGKILL)
            await proc.wait()


async def spawn(payload):
    proc = await asyncio.create_subprocess_exec(sys.executable, str(WORKER),
        stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL, start_new_session=True,
        limit=1024 * 1024)
    proc.stdin.write(json.dumps(payload).encode())
    await proc.stdin.drain()
    proc.stdin.close()
    return proc


async def metadata(payload):
    # Reject excess concurrent requests rather than building an unbounded queue.
    if METADATA_LOCK.locked():
        raise HTTPException(429, 'Una ricerca è già in corso. Riprova tra poco.')
    async with METADATA_LOCK:
        proc = await spawn(payload)
        try:
            output, _ = await asyncio.wait_for(proc.communicate(), 65)
        except asyncio.TimeoutError:
            raise HTTPException(504, 'Il sito non ha risposto in tempo. Riprova.')
        finally:
            await stop_process(proc)
        if len(output) > 1024 * 1024:
            raise HTTPException(502, 'Risposta del sito troppo grande.')
        try:
            result = json.loads(output.splitlines()[-1])
        except (ValueError, IndexError):
            raise HTTPException(502, 'Impossibile leggere il video dal sito.')
        if result.get('error'):
            raise HTTPException(422, result['error'])
        return result


def used_storage():
    return sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())


def cleanup():
    cutoff = time.time() - RETENTION
    with connect() as db:
        stale = db.execute("SELECT id FROM jobs WHERE updated<? AND status IN ('done','error','cancelled')", (cutoff,)).fetchall()
        for row in stale:
            shutil.rmtree(ROOT / row['id'], ignore_errors=True)
            db.execute('DELETE FROM jobs WHERE id=?', (row['id'],))
    prune_ephemeral()


async def run_download(job):
    job_id = job['id']
    directory = ROOT / job_id
    directory.mkdir(exist_ok=True)
    if used_storage() + 3 * MAX_BYTES > STORAGE_BYTES or shutil.disk_usage(ROOT).free < 3 * MAX_BYTES + 256 * 1024**2:
        update(job_id, status='error', error='Spazio insufficiente. Elimina alcuni download dal NAS.')
        return
    update(job_id, status='downloading', error='')
    proc = await spawn({'mode': 'download', 'url': job['url'], 'quality': job['quality'], 'directory': str(directory)})
    ACTIVE[job_id] = proc
    started = time.monotonic()
    failed = False
    try:
        while True:
            if get_job(job_id)['status'] == 'cancelled':
                failed = True
                break
            if time.monotonic() - started > 7200:
                raise ValueError('Tempo massimo di download superato.')
            if sum(p.stat().st_size for p in directory.rglob('*') if p.is_file()) > MAX_BYTES * 3 or used_storage() > STORAGE_BYTES:
                raise ValueError('Il download supera lo spazio consentito.')
            try:
                line = await asyncio.wait_for(proc.stdout.readline(), 1)
            except asyncio.TimeoutError:
                continue
            if not line:
                break
            data = json.loads(line)
            if data.get('error'):
                raise ValueError(data['error'])
            if data.get('status') in ('downloading', 'processing'):
                update(job_id, status=data['status'], progress=data.get('progress', 0))
            if data.get('title'):
                update(job_id, title=data['title'][:250])
        if failed:
            return
        await proc.wait()
        files = [p for p in directory.iterdir() if p.suffix.lower() in ('.mp4', '.mkv', '.webm', '.mp3', '.m4a', '.mov', '.ogg', '.opus')]
        if proc.returncode or len(files) != 1:
            raise ValueError('Il sito non ha prodotto un file scaricabile.')
        if files[0].stat().st_size > MAX_BYTES:
            raise ValueError('Il video supera il limite di dimensione.')
        update(job_id, status='done', progress=100, filename=files[0].name)
    except (ValueError, OSError) as error:
        failed = True
        if get_job(job_id)['status'] != 'cancelled':
            update(job_id, status='error', error=str(error)[:200])
    finally:
        await stop_process(proc)
        ACTIVE.pop(job_id, None)
        if failed:
            shutil.rmtree(directory, ignore_errors=True)


async def queue_loop():
    while True:
        cleanup()
        with connect() as db:
            job = db.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created LIMIT 1").fetchone()
        if job:
            try:
                await run_download(dict(job))
            except Exception:
                update(job['id'], status='error', error='Servizio interrotto. Riprova il download.')
        else:
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app):
    if len(PASSWORD) < 16 or PASSWORD.startswith('CAMBIA_'):
        raise RuntimeError('APP_PASSWORD deve contenere almeno 16 caratteri ed essere diversa dall’esempio.')
    init_db()
    task = asyncio.create_task(queue_loop())
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
        for proc in list(ACTIVE.values()):
            await stop_process(proc)


app = FastAPI(title='VideoPocket', lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(CORSMiddleware,
    allow_origins=[x.strip() for x in os.environ.get('ALLOWED_ORIGINS', 'https://cad3d.expert,https://www.cad3d.expert').split(',') if x.strip()],
    allow_methods=['GET', 'POST', 'DELETE'], allow_headers=['Authorization', 'Content-Type'],
    allow_credentials=False)


@app.middleware('http')
async def headers(request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: http:; connect-src 'self' https: http:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
    if request.url.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response


class Login(BaseModel):
    password: str = Field(max_length=200)


class Video(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class Download(Video):
    quality: str = '1080'
    title: str = Field(default='Video', max_length=250)


@app.get('/api/health')
def health():
    return {'service': 'videopocket', 'version': '1.0'}


@app.post('/api/login')
def login(body: Login, request: Request):
    prune_ephemeral()
    # Do not trust caller-supplied forwarded IP headers.
    key = request.client.host if request.client else 'unknown'
    attempts = LOGIN_ATTEMPTS.setdefault(key, [])
    if len(attempts) >= 8:
        raise HTTPException(429, 'Troppi tentativi. Attendi 15 minuti.')
    if not hmac.compare_digest(hashlib.sha256(body.password.encode()).digest(), hashlib.sha256(PASSWORD.encode()).digest()):
        attempts.append(time.time())
        raise HTTPException(401, 'Password non corretta.')
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = time.time() + 12 * 3600
    return {'token': token, 'expires_in': 43200}


@app.post('/api/logout')
def logout(token=Depends(auth)):
    SESSIONS.pop(token, None)
    return {'ok': True}


@app.get('/api/settings')
def settings(token=Depends(auth)):
    from yt_dlp.version import __version__
    return {'engine': __version__, 'max_file_mb': MAX_BYTES // 1024**2,
            'retention_hours': RETENTION // 3600, 'used_mb': round(used_storage() / 1024**2),
            'storage_mb': STORAGE_BYTES // 1024**2}


@app.post('/api/info')
async def info(body: Video, token=Depends(auth)):
    try:
        validate_url(body.url)
    except ValueError as error:
        raise HTTPException(422, str(error))
    return await metadata({'mode': 'info', 'url': body.url})


@app.get('/api/search')
async def search(q: str, token=Depends(auth)):
    if not 2 <= len(q.strip()) <= 150:
        raise HTTPException(422, 'Scrivi da 2 a 150 caratteri per la ricerca.')
    return await metadata({'mode': 'search', 'query': q.strip()})


@app.post('/api/jobs')
def create_job(body: Download, token=Depends(auth)):
    try:
        validate_url(body.url)
    except ValueError as error:
        raise HTTPException(422, str(error))
    if body.quality not in ('720', '1080', '2160', 'audio'):
        raise HTTPException(422, 'Qualità non supportata.')
    with connect() as db:
        if db.execute("SELECT count(*) FROM jobs WHERE status IN ('queued','downloading','processing')").fetchone()[0] >= 12:
            raise HTTPException(429, 'La coda è piena. Attendi il completamento dei download.')
        job_id = secrets.token_hex(12)
        now = time.time()
        db.execute('INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?)',
            (job_id, body.url, body.title, body.quality, 'queued', 0, '', '', now, now))
    return public_job(get_job(job_id))


@app.get('/api/jobs')
def list_jobs(token=Depends(auth)):
    with connect() as db:
        jobs = db.execute('SELECT * FROM jobs ORDER BY created DESC LIMIT 100').fetchall()
    return {'jobs': [public_job(job) for job in jobs]}


@app.post('/api/jobs/{job_id}/cancel')
async def cancel_job(job_id: str, token=Depends(auth)):
    job = get_job(job_id)
    if job['status'] not in ('queued', 'downloading', 'processing'):
        raise HTTPException(409, 'Questo download è già terminato.')
    update(job_id, status='cancelled', error='')
    if job_id in ACTIVE:
        await stop_process(ACTIVE[job_id])
    return {'ok': True}


@app.delete('/api/jobs/{job_id}')
def delete_job(job_id: str, token=Depends(auth)):
    job = get_job(job_id)
    if job['status'] in ('queued', 'downloading', 'processing') or job_id in ACTIVE:
        raise HTTPException(409, 'Annulla il download e attendi qualche secondo prima di eliminarlo.')
    shutil.rmtree(ROOT / job_id, ignore_errors=True)
    with connect() as db:
        db.execute('DELETE FROM jobs WHERE id=?', (job_id,))
    return {'ok': True}


@app.post('/api/jobs/{job_id}/ticket')
def file_ticket(job_id: str, token=Depends(auth)):
    job = get_job(job_id)
    if job['status'] != 'done':
        raise HTTPException(409, 'Il file non è ancora pronto.')
    prune_ephemeral()
    if len(TICKETS) > 256:
        raise HTTPException(429, 'Troppi download aperti. Attendi un minuto.')
    ticket = secrets.token_urlsafe(32)
    TICKETS[ticket] = {'job_id': job_id, 'expires': time.time() + 60}
    return {'path': '/api/files/' + ticket}


@app.get('/api/files/{ticket}')
def download_file(ticket: str):
    item = TICKETS.get(ticket)
    if not item or item['expires'] < time.time():
        raise HTTPException(401, 'Link scaduto. Premi di nuovo Salva sul telefono.')
    job = get_job(item['job_id'])
    path = (ROOT / job['id'] / job['filename']).resolve()
    if ROOT not in path.parents or not path.is_file():
        raise HTTPException(404, 'File non più disponibile.')
    return FileResponse(path, filename=path.name, headers={'Cache-Control': 'no-store'})


web = Path(os.environ.get('WEB_DIR', Path(__file__).parents[2] / 'videopocket'))
if web.is_dir():
    app.mount('/', StaticFiles(directory=web, html=True), name='web')
