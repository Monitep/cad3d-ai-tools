import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
// Minimal event harness: exercise the actual app's generation, request and export
// paths without a browser, target site, PHP execution or remote network requests.
test('prepare, authenticated runtime read and secret-free report export',async()=>{
 class Element{
  constructor(id){this.id=id;this.textContent='';this.value='';this.events={};this.children=[];this.hidden=false;this.disabled=false;this.checked=false;this.classList={toggle(){}};this.dataset={};}
  addEventListener(n,fn){this.events[n]=fn;}append(...x){this.children.push(...x);}replaceChildren(){this.children=[];}setAttribute(){}removeAttribute(){}focus(){}scrollIntoView(){}remove(){}click(){}
 }
 const ids=['sources','prepare','prepared','run','error','audit-form','endpoint','authorized','progress','result','demo-banner','verdict','verdict-icon','evidence-label','result-title','result-text','next-action','php-version','php-sapi','backport-note','observed','config-wrapper','config','version-form','version','backport','demo','import-file','export','print'];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element(id)]));const memory=new Map(),downloads=[];
 globalThis.document={getElementById:id=>elements[id],querySelectorAll:()=>[],createElement:()=>new Element('created'),body:new Element('body')};
 globalThis.sessionStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 globalThis.location={origin:'https://audit.example.com'};
 globalThis.matchMedia=()=>({matches:true});
 globalThis.window={print(){}};
 Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
 const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,oldFetch=globalThis.fetch;
 URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:test';};URL.revokeObjectURL=()=>{};
 try{
 await import('../../../php2shell-audit/app.js?test=event-flow');
 await elements.prepare.events.click();
 const pending=JSON.parse(memory.get('php2shell-audit-pending'));
 assert.match(pending.token,/^[a-f0-9]{64}$/);assert.equal(elements.run.disabled,false);
 const php=await downloads[0].text();assert.ok(php.includes(createHash('sha256').update(pending.token).digest('hex')));assert.ok(!php.includes(pending.token));assert.ok(php.includes('https://audit.example.com'));
 elements.endpoint.value='https://owned.example.com/'+pending.filename;elements.authorized.checked=true;
 let requests=0;
 globalThis.fetch=async(url,options)=>{
 requests++;assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.headers['X-Audit-Token'],pending.token);assert.match(options.headers['X-Audit-Nonce'],/^[a-f0-9]{32}$/);
 return new Response(JSON.stringify({schema:'php2shell-runtime/1',observed_at:new Date().toISOString(),nonce:options.headers['X-Audit-Nonce'],runtime:{php_version:'8.4.27',sapi:'fpm-fcgi',os:'Linux'},config:{memory_limit:'128M'}}),{headers:{'content-type':'application/json'}});
 };
 await elements['audit-form'].events.submit({preventDefault(){}});
 assert.equal(requests,1);assert.equal(elements['result-title'].textContent,'Versione con le correzioni PHP2Shell');assert.equal(elements.error.hidden,true);
 elements.export.events.click();const exported=await downloads.at(-1).text();assert.ok(!exported.includes(pending.token));assert.equal(JSON.parse(exported).evaluation.exploit_tested,false);
 // A replay or cache response with a wrong nonce must not leave a valid result.
 globalThis.fetch=async()=>new Response(JSON.stringify({schema:'php2shell-runtime/1',observed_at:new Date().toISOString(),nonce:'old',runtime:{php_version:'8.4.27',sapi:'fpm-fcgi'},config:{}}),{headers:{'content-type':'application/json'}});
 await elements['audit-form'].events.submit({preventDefault(){}});
 assert.equal(elements.error.hidden,false);assert.match(elements.error.textContent,/non corrisponde/);assert.equal(elements.result.hidden,true);
 }finally{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;globalThis.fetch=oldFetch;}
});
