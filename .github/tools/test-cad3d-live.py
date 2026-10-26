#!/usr/bin/env python3
"""Offline tests of publication boundaries, drift checks and error recovery."""
import copy
from contextlib import redirect_stdout
import ftplib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('cad3d_live', Path(__file__).with_name('cad3d-live.py'))
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class FakeFTP:
    def __init__(self, files):
        self.files = dict(files)
        self.writes = []
        self.fail_rename = None
        self.lost_rename_reply = None

    def mlsd(self, directory):
        return [(Path(p).name, {'type': 'file'}) for p in self.files if str(Path(p).parent) == directory]

    def retrbinary(self, command, write):
        name = command.removeprefix('RETR ')
        if name not in self.files:
            raise ftplib.error_perm('550 Missing')
        write(self.files[name])

    def storbinary(self, command, stream):
        name = command.removeprefix('STOR ')
        self.writes.append(('store', name))
        self.files[name] = stream.read()

    def rename(self, source, target):
        if self.fail_rename == target:
            raise ftplib.error_perm('550 Rename rejected')
        self.writes.append(('rename', target))
        self.files[target] = self.files.pop(source)
        if self.lost_rename_reply == target:
            self.lost_rename_reply = None
            raise ConnectionError('Reply lost after successful rename')

    def delete(self, name):
        self.writes.append(('delete', name))
        if name not in self.files:
            raise ftplib.error_perm('550 Missing')
        del self.files[name]


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.enterContext(redirect_stdout(io.StringIO()))
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root / 'output'
        self.release = {'schema': 1, 'release_id': 'test-1', 'origin': deploy.ORIGIN,
                        'remote_directory': deploy.REMOTE, 'files': []}
        self.old = {'assets/first.webp': b'first original', 'assets/second.webp': b'second original'}
        for target, before in self.old.items():
            source = 'cad3d-preview/' + target
            path = self.root / source
            path.parent.mkdir(parents=True, exist_ok=True)
            after = before + b' optimized'
            path.write_bytes(after)
            self.release['files'].append({'source': source, 'target': target,
                                         'before_sha256': deploy.digest(before), 'sha256': deploy.digest(after)})
        self.manifest = self.root / 'release.json'
        self.ftp = FakeFTP(self.old)

    def validate(self, release=None):
        self.manifest.write_text(json.dumps(release or self.release))
        return deploy.load_release(self.manifest, self.root)

    def plan(self):
        self.validate()
        return deploy.plan(self.ftp, self.release, self.out, self.root)

    def apply(self):
        deploy.apply(self.ftp, self.release, self.out, self.root)

    def test_validate_does_not_access_server(self):
        self.validate()
        self.assertEqual(self.ftp.writes, [])

    def test_reject_paths_executables_and_root_configuration(self):
        for target in ['../index.html', '/index.html', 'assets/../../wp-config.php',
                       'assets/.htaccess', 'assets/a.php', 'pages/it/../../index.html',
                       'assets/bad\r\nDELE something', 'index.php', 'wp-content/file.webp']:
            with self.subTest(target=target), self.assertRaises(ValueError):
                deploy.target_path(target)

    def test_reject_changed_namespace_and_unreviewed_local_bytes(self):
        bad = copy.deepcopy(self.release)
        bad['remote_directory'] = '/www.cad3d.expert/'
        with self.assertRaises(ValueError):
            self.validate(bad)
        (self.root / self.release['files'][0]['source']).write_bytes(b'not reviewed')
        with self.assertRaises(ValueError):
            self.validate()

    def test_plan_drift_in_last_file_prevents_all_writes(self):
        self.ftp.files['assets/second.webp'] = b'changed by another session'
        with self.assertRaises(ValueError):
            self.plan()
        self.assertEqual(self.ftp.writes, [])

    def test_plan_is_read_only_and_backs_up_originals(self):
        self.plan()
        self.assertEqual(self.ftp.files, self.old)
        self.assertEqual(self.ftp.writes, [])
        with deploy.ZipFile(self.out / 'backup.zip') as z:
            for target, before in self.old.items():
                self.assertEqual(z.read('before/' + target), before)

    def test_drift_after_backup_blocks_before_first_write(self):
        self.plan()
        self.ftp.files['assets/second.webp'] = b'new edit after planning'
        with self.assertRaises(ValueError):
            self.apply()
        self.assertEqual(self.ftp.writes, [])

    def test_success_verifies_bytes_and_leaves_unrelated_files(self):
        self.ftp.files['tour/customer.txt'] = b'untouched'
        self.plan()
        self.apply()
        for e in self.release['files']:
            self.assertEqual(deploy.digest(self.ftp.files[e['target']]), e['sha256'])
        self.assertEqual(self.ftp.files['tour/customer.txt'], b'untouched')
        self.assertFalse(any('cad3d-upload-' in n for n in self.ftp.files))

    def test_partial_failure_restores_every_previous_file(self):
        self.plan()
        self.ftp.fail_rename = 'assets/second.webp'
        with self.assertRaisesRegex(RuntimeError, 'previous bytes restored'):
            self.apply()
        self.assertEqual(self.ftp.files, self.old)

    def test_rename_success_with_lost_reply_is_also_restored(self):
        self.plan()
        self.ftp.lost_rename_reply = 'assets/first.webp'
        with self.assertRaisesRegex(RuntimeError, 'previous bytes restored'):
            self.apply()
        self.assertEqual(self.ftp.files, self.old)

    def test_completed_release_is_idempotent(self):
        self.plan()
        self.apply()
        self.ftp.writes.clear()
        report = self.plan()
        self.assertTrue(all(e['status'] == 'unchanged' for e in report['files']))
        self.apply()
        self.assertEqual(self.ftp.writes, [])

    def test_added_file_is_removed_if_later_upload_fails(self):
        target = self.release['files'][0]['target']
        del self.ftp.files[target]
        self.release['files'][0]['before_sha256'] = None
        self.plan()
        self.ftp.fail_rename = 'assets/second.webp'
        with self.assertRaisesRegex(RuntimeError, 'previous bytes restored'):
            self.apply()
        self.assertNotIn(target, self.ftp.files)
        self.assertEqual(self.ftp.files['assets/second.webp'], self.old['assets/second.webp'])

    def test_reject_plan_mismatch_without_writing(self):
        self.plan()
        plan = self.out / 'plan.json'
        data = json.loads(plan.read_text())
        data['files'][0]['sha256'] = '0' * 64
        plan.write_text(json.dumps(data))
        with self.assertRaises(ValueError):
            self.apply()
        self.assertEqual(self.ftp.writes, [])

    def test_cannot_apply_without_backup(self):
        self.plan()
        (self.out / 'backup.zip').unlink()
        with self.assertRaises(FileNotFoundError):
            self.apply()
        self.assertEqual(self.ftp.writes, [])

    def test_corrupt_staged_upload_does_not_replace_live_file(self):
        self.plan()
        original_store = self.ftp.storbinary
        def corrupt_store(command, stream):
            original_store(command, io.BytesIO(b'corrupted transfer'))
        self.ftp.storbinary = corrupt_store
        with self.assertRaisesRegex(RuntimeError, 'previous bytes restored'):
            self.apply()
        self.assertEqual(self.ftp.files, self.old)

    def test_connection_requires_verified_tls_and_private_data_channel(self):
        from unittest.mock import MagicMock
        ftp = MagicMock()
        ftp.sock.getpeername.return_value = ('192.0.2.10', 21)
        addresses = [(deploy.socket.AF_INET, deploy.socket.SOCK_STREAM, 6, '', ('192.0.2.10', 21))]
        with patch.object(deploy.ftplib, 'FTP_TLS', return_value=ftp) as factory:
            with patch.object(deploy.socket, 'getaddrinfo', return_value=addresses):
                with patch.dict(deploy.os.environ, {'FTP_SERVER': 'host.example',
                                                   'FTP_USERNAME': 'user', 'FTP_PASSWORD': 'test-only'}):
                    self.assertIs(deploy.connect(), ftp)
        ctx = factory.call_args.kwargs['context']
        self.assertTrue(ctx.check_hostname)
        self.assertEqual(ctx.verify_mode, deploy.ssl.CERT_REQUIRED)
        ftp.connect.assert_called_once_with(deploy.FTPS_HOST, 21)
        ftp.prot_p.assert_called_once()
        ftp.cwd.assert_called_once_with(deploy.REMOTE)

    def test_different_certified_endpoint_is_rejected_before_login(self):
        from unittest.mock import MagicMock
        ftp = MagicMock()
        ftp.sock.getpeername.return_value = ('192.0.2.99', 21)
        addresses = [(deploy.socket.AF_INET, deploy.socket.SOCK_STREAM, 6, '', ('192.0.2.10', 21))]
        with patch.object(deploy.ftplib, 'FTP_TLS', return_value=ftp):
            with patch.object(deploy.socket, 'getaddrinfo', return_value=addresses):
                with patch.dict(deploy.os.environ, {'FTP_SERVER': 'host.example'}):
                    with self.assertRaisesRegex(ValueError, 'does not match'):
                        deploy.connect()
        ftp.login.assert_not_called()
        ftp.close.assert_called_once()

    def test_https_checks_resources_and_public_home(self):
        class Response:
            status = 200
            url = deploy.ORIGIN
            def __init__(self, data):
                self.data = data
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def read(self):
                return self.data
        responses = [Response((self.root / e['source']).read_bytes()) for e in self.release['files']]
        responses.append(Response(b'<title>CAD3D.Expert</title><h1>Home</h1>'))
        with patch.object(deploy, 'urlopen', side_effect=responses) as opener:
            deploy.verify_http(self.release)
        self.assertEqual(opener.call_count, 3)
        self.assertIn('?cad3d_release=test-1', opener.call_args_list[0].args[0].full_url)

    def test_reject_duplicate_targets_or_out_of_scope_source(self):
        bad = copy.deepcopy(self.release)
        bad['files'].append(copy.deepcopy(bad['files'][0]))
        with self.assertRaises(ValueError):
            self.validate(bad)
        bad = copy.deepcopy(self.release)
        bad['files'][0]['source'] = 'README.md'
        with self.assertRaises(ValueError):
            self.validate(bad)

    def test_html_verification_accepts_cloudflare_email_rewriting(self):
        page = '<html lang="it"><head><title>CAD3D.Expert</title><script src="/_cad3d-site/assets/new.js"></script></head><body><h1>Home</h1><a href="mailto:public@example.test">Scrivimi</a></body></html>'
        served = page.replace('mailto:public@example.test', '/cdn-cgi/l/email-protection#1234').replace('</body>', '<script src="/cdn-cgi/scripts/email-decode.min.js"></script></body>')
        deploy.verify_page(page, served)

    def test_html_verification_rejects_old_runtime_and_changed_copy(self):
        page = '<html><head><script src="/_cad3d-site/assets/new.js"></script></head><body><h1>Home CAD3D.Expert</h1></body></html>'
        with self.assertRaises(ValueError):
            deploy.verify_page(page, page.replace('new.js', 'old.js'))
        with self.assertRaises(ValueError):
            deploy.verify_page(page, page.replace('Home CAD3D.Expert', 'Old page'))


if __name__ == '__main__':
    unittest.main()
