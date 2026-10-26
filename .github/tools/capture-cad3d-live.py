#!/usr/bin/env python3
"""Read explicitly listed public production files over the existing verified FTPS connection."""
import argparse
import importlib.util
import json
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('cad3d_live', Path(__file__).with_name('cad3d-live.py'))
LIVE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LIVE)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate', action='store_true')
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    spec = json.loads((LIVE.ROOT / '.github/cad3d-live/inspect.json').read_text())
    targets = spec.get('files', [])
    if spec.get('schema') != 1 or not 1 <= len(targets) <= 100 or len(targets) != len(set(targets)):
        raise ValueError('Invalid inspection file list')
    targets = [LIVE.target_path(p) for p in targets]
    if args.validate:
        print(f'Valid read-only inspection: {len(targets)} public files; no connection made.')
        return
    if args.out is None:
        raise ValueError('--out is required')
    args.out.mkdir(parents=True, exist_ok=True)
    manifest = []
    ftp = LIVE.connect()
    try:
        for target in targets:
            data = LIVE.read_remote(ftp, target)
            output = args.out / target
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(data)
            manifest.append({'path': target, 'sha256': LIVE.digest(data), 'bytes': len(data)})
            print('Read:', target, len(data), 'bytes')
    finally:
        ftp.close()
    (args.out / 'capture.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Read-only capture completed; no server writes.')


if __name__ == '__main__':
    main()
