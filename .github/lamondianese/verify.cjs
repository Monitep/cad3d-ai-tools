const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'../../lamondianese');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('navigation'))errors.push(e.message);});
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://cad3d.expert/ai/lamondianese/',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document;
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
for(const f of ['wines.js','app.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
const click=s=>d.querySelector(s).click(),cards=()=>d.querySelectorAll('.wine-card').length;
assert.equal(w.WINES.length,11);assert.equal(cards(),11);
for(const [category,count] of [['ruche',2],['bianchi',2],['rosato',1],['rossi',6],['tutti',11]]){click(`[data-filter="${category}"]`);assert.equal(cards(),count,category);}
click('#hero-wine-open');assert.equal(d.querySelector('#modal-wine-name').textContent,'Oniro');click('#wine-dialog [data-close]');
click('#reading-toggle');assert.equal(d.querySelector('#reading-toggle').getAttribute('aria-expanded'),'true');
for(const size of ['large','largest','normal']){click(`.reading-options [data-reading="${size}"]`);assert.equal(d.documentElement.dataset.reading,size);assert.equal(w.localStorage.getItem('mondianese-reading-size'),size);assert.equal(d.querySelectorAll('.reading-options [aria-pressed="true"]').length,1);}
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(d.querySelector('#reading-panel').hidden);assert.equal(d.activeElement.id,'reading-toggle');
const search=d.querySelector('#wine-search');search.value='noah';search.dispatchEvent(new w.Event('input'));assert.equal(cards(),1);
search.value='non esiste';search.dispatchEvent(new w.Event('input'));assert.equal(cards(),0);assert.equal(d.querySelector('#empty-state').hidden,false);
click('#reset-search');assert.equal(search.value,'');assert.equal(cards(),11);assert.equal(d.activeElement.id,'wine-search');
for(const wine of w.WINES){click(`[data-wine-id="${wine.id}"]`);assert.equal(d.querySelector('#modal-wine-name').textContent,wine.name);assert(d.querySelector('#wine-dialog').open);assert(d.querySelector('#modal-wine-pdf').href.endsWith(wine.pdf));assert(d.querySelector('#modal-wine-shop').href.endsWith(wine.shop));assert.equal(d.querySelectorAll('#modal-wine-facts > div').length,6);click('#original-bottle');assert(d.querySelector('#modal-wine-image').src.endsWith(wine.id+'-original.webp'));click('#original-bottle');assert(d.querySelector('#modal-wine-image').src.endsWith(wine.id+'.webp'));click('#wine-dialog [data-close]');assert(!d.body.classList.contains('dialog-open'));}
click('#language');assert.equal(d.documentElement.lang,'en');assert.equal(d.querySelector('#hero-title').innerHTML,'Monferrato,<br>to be felt.');
const englishKeys=[...d.querySelectorAll('[data-i18n]')].filter(el=>el.textContent.trim()==='');assert.equal(englishKeys.length,0);
click('[data-wine-id="biancaura"]');assert(d.querySelector('#modal-wine-facts').textContent.includes('Timorasso and Riesling'));click('#wine-dialog [data-close]');
click('#language');assert.equal(d.documentElement.lang,'it');
click('#wine-next');assert.equal(d.querySelector('#featured-name').textContent,'L’Inizio');click('#wine-prev');assert.equal(d.querySelector('#featured-name').textContent,'Oniro');
for(const [index,wine] of w.WINES.entries()){click(`[data-wine-index="${index}"]`);assert.equal(d.querySelector('#featured-pairing').textContent,wine.pairing);assert.equal(d.querySelector('#featured-ageing').textContent,wine.ageing);}
click('#language');assert.equal(d.querySelector('#featured-ageing').textContent,w.WINES.at(-1).ageingEn);assert.equal(d.querySelector('#reading-title').textContent,'Text size');click('#language');
click('#menu-open');assert.equal(d.querySelector('#menu-open').getAttribute('aria-expanded'),'true');click('#menu-dialog nav a');assert.equal(d.querySelector('#menu-open').getAttribute('aria-expanded'),'false');
click('#request-open');const form=d.querySelector('#request-form');form.querySelector('[name=name]').value='Michele';form.querySelector('[name=message]').value='Una visita sabato';form.dispatchEvent(new w.Event('submit',{cancelable:true}));assert(d.querySelector('#prepared-message').value.includes('Michele'));assert(d.querySelector('#prepared-message').value.includes('Una visita sabato'));assert.equal(d.querySelector('#prepared-message').hidden,false);click('#request-dialog [data-close]');
for(const a of [...d.querySelectorAll('a[href^="#"]')]){if(a.hash)assert(d.querySelector(a.hash),'Missing anchor '+a.hash);}
for(const wine of w.WINES)for(const suffix of ['.webp','-small.webp'])assert(fs.existsSync(path.join(root,'assets',wine.id+suffix)));
assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS: reading-size options and saved preference; keyboard dismissal; hero wine shortcut; search reset; 11 featured pairings and ageing;  11 wines; all category counts; search and empty state; 11 product dialogs; official links; IT/EN; wine controls; mobile menu; email preparation; anchors; assets.');
dom.window.close();
