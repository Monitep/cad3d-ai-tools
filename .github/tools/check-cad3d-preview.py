"""Validate navigation, static assets and page structure before FTP deployment."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json

ROOT=Path(__file__).resolve().parents[2]/'cad3d-preview'
class Page(HTMLParser):
    def __init__(self):super().__init__();self.refs=[];self.ids=set();self.h1=0;self.meta=[];self.lang=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.lang=a.get('lang')
        if tag=='h1':self.h1+=1
        if 'id' in a:self.ids.add(a['id'])
        if tag=='meta':self.meta.append(a)
        for k in ('href','src','poster','data-image','data-panorama','data-scene-src','data-energy-src','data-film-src','data-film-mobile','data-film-poster'):
            if a.get(k):self.refs.append(a[k])

pages={p:Page() for p in ROOT.rglob('*.html')}
for path,doc in pages.items():doc.feed(path.read_text())
errors=[]
for path,doc in pages.items():
    if path.name!='qa.html' and doc.h1!=1:errors.append(f'{path.name}: {doc.h1} H1s')
    if doc.lang not in ('it','en'):errors.append(f'{path}: invalid language')
    if not any(m.get('name')=='robots' and 'noindex' in m.get('content','') for m in doc.meta):errors.append(f'{path}: missing noindex')
    for ref in doc.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc:continue
        target=(path.parent/unquote(url.path)).resolve() if url.path else path
        if not target.is_file():errors.append(f'{path.relative_to(ROOT)}: missing {ref}');continue
        if target.stat().st_size==0:errors.append(f'Empty asset: {target.name}')
        if url.fragment and target in pages and url.fragment not in pages[target].ids:errors.append(f'Missing anchor {ref}')
report={'pages':len(pages),'languages':['it','en'],'errors':errors,'site_bytes':sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())}
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
