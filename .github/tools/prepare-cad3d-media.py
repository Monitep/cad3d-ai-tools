#!/usr/bin/env python3
"""Prepare native 16K tour masters as Pannellum tiles and web video assets.

Requires Pillow and FFmpeg. Input files are supplied by the owner; they are
never modified. Cubeface density follows Pannellum's width / pi convention,
rounded UP to eight pixels. No reduced equirectangular texture is published.
"""
from pathlib import Path
from PIL import Image
from zipfile import ZipFile
import argparse, hashlib, json, math, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'cad3d-preview/assets'
SCENES = [('terrace', 'D5_A03_20240201_184512.jpg', -18),
          ('pool', 'D5_A04_20240201_183040.jpg', 18)]
FACES = [('f', 0, 0), ('b', 180, 0), ('u', 0, 90),
         ('d', 0, -90), ('l', -90, 0), ('r', 90, 0)]
TILE = 2048
FALLBACK = 2048
Image.MAX_IMAGE_PIXELS = 140_000_000

def ffmpeg(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error',
                           '-threads', '2', *map(str, args)], check=True,
                          stdout=subprocess.PIPE).stdout

def sha(path):
    return hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()

def panorama(master, scene, yaw, temp):
    with Image.open(master) as im:
        native = im.size
    if native != (16384, 8192):
        raise ValueError(f'Expected native 16K master, got {native}: {master}')
    face_size = 8 * math.ceil(native[0] / math.pi / 8)
    levels = math.ceil(math.log2(face_size / TILE)) + 1
    target = ASSETS / f'pano-{scene}-v5'
    for face, face_yaw, face_pitch in FACES:
        projection = (f'v360=input=equirect:output=flat:interp=lanczos:'
                      f'yaw={face_yaw}:pitch={face_pitch}:h_fov=90:v_fov=90:'
                      f'w={face_size}:h={face_size}')
        pixels = ffmpeg('-i', master, '-vf', projection, '-frames:v', '1',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1')
        full = Image.frombytes('RGB', (face_size, face_size), pixels)
        del pixels
        image = full
        size = face_size
        for level in range(levels, 0, -1):
            folder = target / str(level)
            folder.mkdir(parents=True, exist_ok=True)
            if level != levels:
                image = image.resize((size, size), Image.Resampling.LANCZOS)
            for row in range(math.ceil(size / TILE)):
                for col in range(math.ceil(size / TILE)):
                    tile = image.crop((col*TILE, row*TILE,
                                       min((col+1)*TILE, size),
                                       min((row+1)*TILE, size)))
                    tile.save(folder/f'{face}{row}_{col}.jpg',
                              quality=92, subsampling=2, optimize=True)
            size //= 2
        fallback = target/'fallback'
        fallback.mkdir(exist_ok=True)
        full.resize((FALLBACK, FALLBACK), Image.Resampling.LANCZOS).save(
            fallback/f'{face}.jpg', quality=91, subsampling=2, optimize=True)
        print(f'{scene}: face {face}, {face_size}px, {levels} levels', flush=True)
    preview = ASSETS/f'panorama-{scene}-preview-v5.jpg'
    ffmpeg('-i', master, '-vf', f'v360=input=equirect:output=flat:interp=lanczos:'
           f'yaw={yaw}:pitch=0:h_fov=100:v_fov=67:w=1600:h=900',
           '-frames:v', '1', '-q:v', '2', '-y', preview)
    return {'source_name': master.name, 'source_sha256': sha(master),
            'source_dimensions': list(native), 'cube_resolution': face_size,
            'tile_resolution': TILE, 'max_level': levels,
            'fallback_face_resolution': FALLBACK,
            'directory': str(target.relative_to(ROOT)),
            'files': len(list(target.rglob('*.jpg'))),
            'bytes': sum(p.stat().st_size for p in target.rglob('*.jpg'))}

def videos(source):
    report = []
    for name, key, seconds in [('D5_Clip 1_20231019_230023.mp4', 'interior', 18),
                               ('Clip 11.mp4', 'detail', 10)]:
        original = source/name
        for mobile, width, height, crf, cap in [(False,1920,1080,24,3500),
                                               (True,1280,720,23,1800)]:
            suffix = '-mobile' if mobile else ''
            output = ASSETS/f'film-{key}-v5{suffix}.mp4'
            ffmpeg('-i', original, '-vf', f'fps=30,scale={width}:{height}',
                   '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf),
                   '-maxrate', f'{cap}k', '-bufsize', f'{cap*2}k',
                   '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                   '-map_metadata', '-1', '-y', output)
        report.append({'source_name': name, 'source_sha256': sha(original),
                       'native_dimensions': [1920,1080], 'duration_approx_s': seconds,
                       'audio': False, 'web_fps': 30,
                       'desktop': f'film-{key}-v5.mp4',
                       'mobile': f'film-{key}-v5-mobile.mp4'})
    return report

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--skip-video', action='store_true')
    args = parser.parse_args()
    result = {'panoramas': {}, 'viewer': {'name':'Pannellum','version':'2.5.7',
        'source':'https://github.com/mpetroff/pannellum/releases/tag/2.5.7',
        'license':'MIT'}, 'notes': [
        'Both panoramas are projected from the native 16384x8192 ZIP masters.',
        '5216px cubefaces preserve the source angular sampling density.',
        'WebGL loads visible tiles at the appropriate resolution, including the full level.',
        'CSS 3D fallback uses separate 2048px cubefaces; it is not the full-detail WebGL path.',
        'Video is original CGI, silent, user initiated, 1080p desktop / 720p mobile.']}
    with tempfile.TemporaryDirectory(prefix='cad3d-native-master-') as folder:
        temp = Path(folder)
        with ZipFile(args.source_dir/'Render Per Tour No People.zip') as archive:
            for key, name, yaw in SCENES:
                master = temp/name
                with archive.open(name) as source, master.open('wb') as destination:
                    import shutil
                    shutil.copyfileobj(source,destination)
                result['panoramas'][key] = panorama(master,key,yaw,temp)
    if args.skip_video:
        previous=ROOT/'.github/tools/CAD3D-MEDIA-ASSETS.json'
        if previous.exists():
            result['videos']=json.loads(previous.read_text()).get('videos',[])
    else:
        result['videos'] = videos(args.source_dir)
    sizes_path = ASSETS/'image-sizes.json'
    sizes = json.loads(sizes_path.read_text())
    for image in list(ASSETS.glob('*v5.jpg'))+list(ASSETS.glob('*v5.webp')):
        with Image.open(image) as im:
            sizes[image.name] = list(im.size)
    sizes_path.write_text(json.dumps(sizes,indent=2)+'\n')
    (ROOT/'.github/tools/CAD3D-MEDIA-ASSETS.json').write_text(
        json.dumps(result,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(result,indent=2),flush=True)

if __name__ == '__main__':
    main()
