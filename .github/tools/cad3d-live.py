#!/usr/bin/env python3
"""Publish an explicitly reviewed list of CAD3D files over verified FTPS.

No mirroring, deletion of pre-existing files, root changes or credential files.
Uses the Python standard library. A plan must be backed up before apply.
"""
import argparse
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import ssl
import sys
import uuid
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / '.github/cad3d-live/release.json'
REMOTE = '/www.cad3d.expert/_cad3d-site/'
ORIGIN = 'https://www.cad3d.expert/'
SHA = re.compile(r'[a-f0-9]{64}')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def relative(value):
    if not isinstance(value, str) or not value or '\\' in value:
        raise ValueError('Invalid relative path')
    p = PurePosixPath(value)
    if p.is_absolute() or any(x in ('', '.', '..') for x in value.split('/')):
        raise ValueError('Path must be relative and normalized: ' + value)
    if any(ord(c) < 32 for c in value):
        raise ValueError('Control characters in path')
    return p


def target_path(value):
    p = relative(value)
    allowed = ((len(p.parts) > 1 and p.parts[0] == 'assets') or
               (len(p.parts) == 3 and p.parts[0] == 'pages' and
                p.parts[1] in ('it', 'en') and p.suffix == '.html') or
               value == 'sitemap.xml')
    if not allowed or any(x.startswith('.') for x in p.parts):
        raise ValueError('Target outside public CAD3D pages/assets: ' + value)
    if p.suffix.lower() in ('.php', '.phtml', '.phar', '.cgi', '.py', '.sh', '.zip'):
        raise ValueError('Executable/archive target is not allowed: ' + value)
    return p.as_posix()


def load_release(path=MANIFEST, root=ROOT):
    manifest = json.loads(Path(path).read_text(encoding='utf-8'))
    if manifest.get('schema') != 1 or manifest.get('origin') != ORIGIN:
        raise ValueError('Unsupported release schema or origin')
    if manifest.get('remote_directory') != REMOTE:
        raise ValueError('The remote directory is fixed to the CAD3D namespace')
    if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', manifest.get('release_id', '')):
        raise ValueError('Invalid release ID')
    entries = manifest.get('files', [])
    if not 1 <= len(entries) <= 100:
        raise ValueError('A release must contain 1..100 reviewed files')
    targets = set()
    for e in entries:
        target = target_path(e['target'])
        if target in targets:
            raise ValueError('Duplicate target: ' + target)
        targets.add(target)
        source = relative(e['source']).as_posix()
        if not source.startswith(('cad3d-preview/assets/', '.github/cad3d-live/payload/')):
            raise ValueError('Source is not in a release source directory')
        local = (root / source).resolve()
        if not local.is_relative_to(root.resolve()) or not local.is_file():
            raise ValueError('Missing or unsafe source: ' + source)
        before = e.get('before_sha256')
        if before is not None and not SHA.fullmatch(before):
            raise ValueError('Invalid before hash')
        if not SHA.fullmatch(e.get('sha256', '')) or digest(local.read_bytes()) != e['sha256']:
            raise ValueError('Source bytes do not match the reviewed hash: ' + source)
    return manifest


def connect():
    # Secrets remain in environment/memory. TLS and certificate verification are required.
    ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=60)
    ftp.connect(os.environ['FTP_SERVER'], 21)
    ftp.login(os.environ['FTP_USERNAME'], os.environ['FTP_PASSWORD'])
    ftp.prot_p()
    ftp.cwd(REMOTE)
    return ftp


def read_remote(ftp, path, missing_ok=False):
    # Listing the parent distinguishes a missing file from a failed RETR/permission error.
    p = PurePosixPath(target_path(path))
    if missing_ok:
        names = {name for name, _ in ftp.mlsd(str(p.parent))}
        if p.name not in names:
            return None
    data = io.BytesIO()
    ftp.retrbinary('RETR ' + str(p), data.write)
    return data.getvalue()


def inspect(ftp, release, root=ROOT):
    result, originals = [], {}
    for e in release['files']:
        before = read_remote(ftp, e['target'], missing_ok=e.get('before_sha256') is None)
        observed = digest(before) if before is not None else None
        # Idempotence permits resuming a completed release, but rejects all other drift.
        if observed not in (e.get('before_sha256'), e['sha256']):
            raise ValueError('Live file changed; capture a new baseline: ' + e['target'])
        status = 'unchanged' if observed == e['sha256'] else 'replace' if before is not None else 'add'
        result.append({**e, 'observed_sha256': observed, 'status': status,
                       'before_bytes': len(before) if before is not None else 0,
                       'after_bytes': (root / e['source']).stat().st_size})
        originals[e['target']] = before
    return result, originals


def plan(ftp, release, out, root=ROOT):
    entries, originals = inspect(ftp, release, root)
    out.mkdir(parents=True, exist_ok=True)
    report = {'schema': 1, 'release_id': release['release_id'],
              'remote_directory': REMOTE, 'files': entries}
    # Backup must be persisted by the workflow before any server mutation.
    with ZipFile(out / 'backup.zip', 'w', ZIP_DEFLATED) as z:
        z.writestr('plan.json', json.dumps(report, indent=2))
        for name, data in originals.items():
            if data is not None:
                z.writestr('before/' + name, data)
    (out / 'plan.json').write_text(json.dumps(report, indent=2) + '\n')
    for e in entries:
        print(f"{e['status']}: {e['target']} ({e['before_bytes']} -> {e['after_bytes']} bytes)")
    return report


def apply(ftp, release, out, root=ROOT):
    report = json.loads((out / 'plan.json').read_text())
    if report['release_id'] != release['release_id'] or report['remote_directory'] != REMOTE:
        raise ValueError('Plan does not match release')
    expected = {e['target']: e for e in release['files']}
    planned = {e['target']: e for e in report['files']}
    if expected.keys() != planned.keys():
        raise ValueError('Plan file list does not match release')
    with ZipFile(out / 'backup.zip') as z:
        if json.loads(z.read('plan.json')) != report:
            raise ValueError('Backup does not match plan')
        originals = {}
        for name, e in planned.items():
            if any(e.get(k) != expected[name].get(k) for k in ('source', 'sha256', 'before_sha256')):
                raise ValueError('Plan bytes do not match release: ' + name)
            before = z.read('before/' + name) if e['observed_sha256'] else None
            if (digest(before) if before is not None else None) != e['observed_sha256']:
                raise ValueError('Backup hash mismatch: ' + name)
            originals[name] = before
    # Check every target again before the first write, including already-completed files.
    for name, e in planned.items():
        current = read_remote(ftp, name, missing_ok=e['observed_sha256'] is None)
        if (digest(current) if current is not None else None) != e['observed_sha256']:
            raise ValueError('Live file changed after planning: ' + name)
    changed, staged = [], []
    try:
        for name, e in planned.items():
            if e['status'] == 'unchanged':
                continue
            # Stage the complete file in its existing parent; never truncate the live file.
            p = PurePosixPath(name)
            temp = str(p.with_name('cad3d-upload-' + uuid.uuid4().hex + p.suffix))
            staged.append(temp)
            ftp.storbinary('STOR ' + temp, io.BytesIO((root / e['source']).read_bytes()))
            staged_data = io.BytesIO()
            ftp.retrbinary('RETR ' + temp, staged_data.write)
            if digest(staged_data.getvalue()) != e['sha256']:
                raise ValueError('Staged upload hash mismatch: ' + name)
            # Record before rename: recover even if RNTO succeeds but the reply is lost.
            changed.append(name)
            ftp.rename(temp, name)
            staged.remove(temp)
            if digest(read_remote(ftp, name)) != e['sha256']:
                raise ValueError('Published hash mismatch: ' + name)
        print('FTPS upload and byte verification completed.')
    except Exception as exc:
        errors = []
        for name in reversed(changed):
            try:
                before = originals[name]
                if before is None:
                    # Only remove the new file if its bytes are still ours.
                    current = read_remote(ftp, name, missing_ok=True)
                    if current is not None:
                        if digest(current) != planned[name]['sha256']:
                            raise ValueError('New remote file changed during rollback')
                        ftp.delete(name)
                else:
                    current = read_remote(ftp, name)
                    if digest(current) not in (digest(before), planned[name]['sha256']):
                        raise ValueError('Remote file changed during rollback')
                    ftp.storbinary('STOR ' + name, io.BytesIO(before))
                    if digest(read_remote(ftp, name)) != digest(before):
                        raise ValueError('Restored bytes failed verification')
            except Exception as restore_error:
                errors.append(name + ': ' + str(restore_error))
        message = 'Upload failed; ' + ('rollback incomplete: ' + '; '.join(errors) if errors else 'previous bytes restored.')
        raise RuntimeError(message) from exc
    finally:
        # These are solely temporary files created by this invocation, never a remote mirror.
        for temp in staged:
            try:
                p = PurePosixPath(temp)
                if p.name in {name for name, _ in ftp.mlsd(str(p.parent))}:
                    ftp.delete(temp)
            except ftplib.all_errors:
                print('Temporary upload remains: ' + temp, file=sys.stderr)


def verify_http(release):
    # A release-specific cache key checks public delivery without CDN credentials.
    for e in release['files']:
        url = ORIGIN + '_cad3d-site/' + e['target'] + '?cad3d_release=' + release['release_id']
        with urlopen(Request(url, headers={'User-Agent': 'CAD3D-Deploy/1.0'}), timeout=60) as response:
            if urlsplit(response.url).hostname not in ('cad3d.expert', 'www.cad3d.expert'):
                raise ValueError('Unexpected HTTP redirect')
            if response.status != 200 or digest(response.read()) != e['sha256']:
                raise ValueError('HTTP delivery does not match release: ' + e['target'])
        print('HTTP bytes verified: ' + e['target'])
    with urlopen(Request(ORIGIN, headers={'User-Agent': 'CAD3D-Deploy/1.0'}), timeout=60) as response:
        document = response.read().decode('utf-8')
        if response.status != 200 or 'CAD3D.Expert' not in document or '<h1' not in document:
            raise ValueError('Public home smoke check failed')
    print('Public HTTPS home responded with the CAD3D page.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('validate', 'plan', 'apply', 'http'))
    parser.add_argument('--out', type=Path, default=ROOT / '.cad3d-live-output')
    args = parser.parse_args()
    release = load_release()
    if args.mode == 'validate':
        print(f"Valid release {release['release_id']}: {len(release['files'])} explicit files; no connection made.")
        return
    if args.mode == 'http':
        verify_http(release)
        return
    ftp = connect()
    try:
        if args.mode == 'plan':
            plan(ftp, release, args.out)
        else:
            apply(ftp, release, args.out)
    finally:
        ftp.close()


if __name__ == '__main__':
    main()
