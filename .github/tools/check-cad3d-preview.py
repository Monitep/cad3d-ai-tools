#!/usr/bin/env python3
"""Check registered pages, bilingual navigation, anchors and local assets before FTP."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / 'cad3d-preview'
SOURCE = REPO / '.github/cad3d-site'
REFERENCE_ATTRIBUTES = (
    'href', 'src', 'poster', 'data-image', 'data-panorama', 'data-scene-src',
    'data-mobile-src', 'data-energy-src', 'data-film-src', 'data-film-mobile', 'data-film-poster',
)


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids, self.meta, self.controls, self.switches = [], [], [], [], []
        self.h1, self.lang = 0, None
        self.classes = Counter()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang = a.get('lang')
        if tag == 'h1':
            self.h1 += 1
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'meta':
            self.meta.append(a)
        classes = a.get('class', '').split()
        self.classes.update(classes)
        if 'language-switch' in classes:
            self.switches.append(a)
        for key in ('aria-controls', 'aria-labelledby'):
            self.controls.extend(a.get(key, '').split())
        for key in REFERENCE_ATTRIBUTES:
            if a.get(key):
                self.refs.append(a[key])
        if a.get('srcset'):
            self.refs.extend(item.strip().split()[0] for item in a['srcset'].split(',') if item.strip())

    handle_startendtag = handle_starttag


def main():
    registry = json.loads((SOURCE / 'pages.json').read_text(encoding='utf-8'))
    expected = {ROOT / prefix / p['file'] for p in registry for prefix in ('', 'en')}
    expected.add(ROOT / 'qa.html')
    pages = {p: Page() for p in ROOT.rglob('*.html')}
    errors = []
    for path in expected - pages.keys():
        errors.append(f'Missing registered page: {path.relative_to(ROOT)}')
    for path in pages.keys() - expected:
        errors.append(f'Unregistered HTML: {path.relative_to(ROOT)} (register its source; do not delete it blindly)')
    for path, doc in pages.items():
        doc.feed(path.read_text(encoding='utf-8'))
    for path, doc in pages.items():
        name = str(path.relative_to(ROOT))
        if path.name != 'qa.html':
            if doc.h1 != 1:
                errors.append(f'{name}: {doc.h1} H1s')
            for cls in ('site-header', 'desktop-nav', 'mobile-nav', 'site-footer', 'lightbox'):
                if doc.classes[cls] != 1:
                    errors.append(f'{name}: expected one {cls}')
            if len(doc.switches) != 1:
                errors.append(f'{name}: expected one language switch')
            else:
                switch = doc.switches[0]
                language = 'en' if doc.lang == 'it' else 'it'
                counterpart = ROOT / ('en' if language == 'en' else '') / path.name
                target = (path.parent / urlsplit(switch.get('href', '')).path).resolve()
                if switch.get('lang') != language or target != counterpart:
                    errors.append(f'{name}: language switch must preserve the page')
        if doc.lang not in ('it', 'en'):
            errors.append(f'{name}: invalid language')
        if not any(m.get('name') == 'robots' and 'noindex' in m.get('content', '') for m in doc.meta):
            errors.append(f'{name}: missing preview noindex')
        for key, count in Counter(doc.ids).items():
            if count > 1:
                errors.append(f'{name}: duplicate ID {key}')
        for key in doc.controls:
            if key not in doc.ids:
                errors.append(f'{name}: missing ARIA target {key}')
        for ref in doc.refs:
            url = urlsplit(ref)
            if url.scheme or url.netloc:
                continue
            target = (path.parent / unquote(url.path)).resolve() if url.path else path
            if not target.is_file():
                errors.append(f'{name}: missing {ref}')
                continue
            if not target.stat().st_size:
                errors.append(f'{name}: empty asset {ref}')
            if url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(f'{name}: missing anchor {ref}')
    print(json.dumps({'pages': len(pages), 'languages': ['it', 'en'], 'errors': errors}, ensure_ascii=False, indent=2))
    raise SystemExit(bool(errors))


if __name__ == '__main__':
    main()
