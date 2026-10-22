import {assess,validateSnapshot,validateEndpoint,makePHP,BASELINE_DATE,SOURCES} from './engine.js?v=20261022-2';
const $=id=>document.getElementById(id);
const labels={live:'Lettura diretta dal runtime web',manual:'Versione inserita manualmente',imported:'Report importato · origine non autenticata',demo:'Esempio dimostrativo'};
let current=null,pending=null,busy=false;
function storePending(){try{sessionStorage.setItem('php2shell-audit-pending',JSON.stringify(pending));}catch{}}
try{const saved=JSON.parse(sessionStorage.getItem('php2shell-audit-pending'));if(saved&&/^[a-f0-9]{64}$/.test(saved.token)&&saved.expires>Date.now()/1000&&/^php2shell-audit-[a-f0-9]{8}\.php$/.test(saved.filename))pending=saved;}catch{}
function nonce(bytes=16){return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),n=>n.toString(16).padStart(2,'0')).join('');}
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function nav(view){document.querySelectorAll('.view').forEach(x=>x.hidden=x.id!=='view-'+view);document.querySelectorAll('.nav').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});$('result').hidden=!current||view==='guida';}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));
function error(message){$('error').textContent=message;$('error').hidden=false;}
function refreshPending(){if(pending){$('prepared').textContent='File: '+pending.filename+' · Scade alle '+new Date(pending.expires*1000).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'.';$('run').disabled=busy||pending.expires<=Date.now()/1000;}else $('run').disabled=true;}
$('prepare').addEventListener('click',async()=>{
 if(pending&&!confirm('Il nuovo file avrà una nuova chiave. Il file preparato prima non potrà più essere verificato da questa scheda. Continuare?'))return;
 try{
 const token=nonce(32),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const tokenHash=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
 const candidate={token,expires:Math.floor(Date.now()/1000)+3600,filename:'php2shell-audit-'+nonce(4)+'.php'};
 const php=makePHP({tokenHash,expires:candidate.expires,origin:location.origin});
 pending=candidate;storePending();download(php,pending.filename,'application/x-httpd-php');refreshPending();$('error').hidden=true;
 }catch(e){error('Impossibile preparare il file. Apri la console dal suo indirizzo HTTPS. '+e.message);}
});
function report({snapshot=null,version='',source='manual',backport='',endpoint='',demo=false}){
 const evaluation=assess(snapshot?snapshot.runtime.php_version:version,source,backport);
 if(snapshot&&['cli','phpdbg'].includes(snapshot.runtime.sapi)){evaluation.status='unknown';evaluation.title='Questo report proviene dal PHP da terminale';evaluation.text='La versione CLI non dimostra quale runtime serva le richieste del sito.';evaluation.action='Esegui il file diagnostico attraverso il sito, nel pool e nella cartella dell’applicazione.';}
 return {schema:'php2shell-audit/1',created_at:new Date().toISOString(),baseline:BASELINE_DATE,mode:source,demo,endpoint,snapshot,evaluation,limitations:['Nessuna prova di sfruttamento eseguita.','Nessuna verifica indipendente di backport, pacchetti installati, riavvio dei processi o copertura di tutti i nodi.','La versione del runtime non certifica la sicurezza generale né esclude compromissioni precedenti.'],sources:SOURCES.map(x=>({title:x[0],url:x[1]}))};
}
function show(data){
 current=data;const e=data.evaluation,s=data.snapshot;
 $('demo-banner').hidden=!data.demo;$('verdict').className='verdict '+e.status;$('verdict-icon').textContent=e.status==='patched'?'✓':e.status==='unknown'?'?':'!';
 $('evidence-label').textContent=labels[data.mode]||labels.imported;
 $('result-title').textContent=e.title;$('result-text').textContent=e.text;$('next-action').textContent=e.action;
 $('php-version').textContent=e.version;$('php-sapi').textContent=s?s.runtime.sapi:'Non rilevata';
 $('backport-note').hidden=!e.backport;$('backport-note').textContent='Backport dichiarato: '+e.backport;
 const age=s?Date.now()-Date.parse(s.observed_at):0;
 $('observed').textContent=(s?'Osservato il '+new Date(s.observed_at).toLocaleString('it-IT')+(data.endpoint?' · '+data.endpoint:''):'Valutazione manuale del '+new Date(data.created_at).toLocaleString('it-IT'))+(age>86400000?' · Attenzione: il report ha più di 24 ore; ripeti la lettura.':'')+(age< -300000?' · Data nel futuro: controlla l’orologio del server.':'');
 $('config-wrapper').hidden=!s;$('config').replaceChildren();
 if(s)for(const [key,value] of Object.entries(s.config)){const tr=document.createElement('tr');for(const v of [key,value===false?'Direttiva non disponibile':value===''?'Vuoto / disattivato':String(value)]){const td=document.createElement('td');td.textContent=v;tr.append(td);}$('config').append(tr);}
 document.querySelectorAll('.limits input').forEach(x=>x.checked=false);$('result').hidden=false;$('result').focus({preventScroll:true});$('result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
$('audit-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;$('error').hidden=true;$('result').hidden=true;current=null;
 try{
 if(!pending||pending.expires<=Date.now()/1000)throw new Error('Prepara un nuovo file PHP: quello corrente è assente o scaduto.');
 const u=validateEndpoint($('endpoint').value);
 if(u.pathname.split('/').pop()!==pending.filename)throw new Error('Il nome del file nell’URL deve essere '+pending.filename+'.');
 if(!$('authorized').checked)throw new Error('Conferma di essere autorizzato a verificare questo sito.');
 busy=true;refreshPending();$('prepare').disabled=true;$('progress').textContent='Lettura del runtime in corso…';
 const n=nonce();const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 let res,text;
 try{
 res=await fetch(u.href,{method:'GET',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',headers:{'X-Audit-Token':pending.token,'X-Audit-Nonce':n},signal:controller.signal});
 if(!res.ok){const explanations={404:'File non trovato o chiave non valida.',403:'Origine della console non autorizzata.',410:'Il file diagnostico è scaduto.',405:'Il metodo GET è stato bloccato.'};throw new Error('HTTP '+res.status+'. '+(explanations[res.status]||'Il server non ha restituito un report valido.'));}
 if(!(res.headers.get('content-type')||'').includes('application/json'))throw new Error('Il server non restituisce JSON. Controlla che il file sia eseguito da PHP e non servito come testo o intercettato dal provider.');
 const reader=res.body.getReader(),chunks=[];let total=0;
 try{while(true){const chunk=await reader.read();if(chunk.done)break;total+=chunk.value.byteLength;if(total>32768){await reader.cancel();throw new Error('La risposta supera 32 KB: il file non restituisce il report atteso.');}chunks.push(chunk.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}text=new TextDecoder().decode(bytes);
 }finally{clearTimeout(timeout);}
 const snapshot=validateSnapshot(JSON.parse(text));if(snapshot.nonce!==n)throw new Error('La risposta non corrisponde a questa richiesta. Potrebbe provenire da una cache o da un file diverso.');
 show(report({snapshot,source:'live',endpoint:u.origin+u.pathname}));
 }catch(e){error(e.name==='AbortError'?'Nessuna risposta entro 12 secondi. Verifica che il file sia raggiungibile e riprova.':e instanceof TypeError?'Collegamento non riuscito. Verifica URL HTTPS, CORS, certificato, reindirizzamenti e header X-Audit-* nel proxy. Nessun risultato è stato ottenuto.':e instanceof SyntaxError?'La risposta non contiene JSON valido. Verifica che il provider non inserisca pagine di errore o avvisi PHP.':e.message);}
 finally{busy=false;refreshPending();$('prepare').disabled=false;$('progress').textContent='';}
});
$('version-form').addEventListener('submit',e=>{e.preventDefault();show(report({version:$('version').value.trim(),source:'manual',backport:$('backport').value.trim()}));});
$('demo').addEventListener('click',()=>{const snapshot={schema:'php2shell-runtime/1',observed_at:new Date().toISOString(),nonce:'demo',runtime:{php_version:'8.3.30',sapi:'fpm-fcgi',os:'Linux',zts:false},config:{memory_limit:'256M',post_max_size:'16M',upload_max_filesize:'8M',file_uploads:'1','enable_post_data_reading':'1','session.upload_progress.enabled':'1','session.auto_start':'0','session.save_handler':'files'}};show(report({snapshot,source:'demo',demo:true,endpoint:'https://esempio.invalid/diagnostica.php'}));});
$('import-file').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;$('error').hidden=true;
 try{
 if(file.size>131072)throw new Error('Il file supera 128 KB. Seleziona il report JSON esportato dalla console.');
 const x=JSON.parse(await file.text());let result;
 if(x.schema==='php2shell-audit/1'){
 if(x.snapshot)result=report({snapshot:validateSnapshot(x.snapshot),source:'imported',backport:typeof x.evaluation?.backport==='string'?x.evaluation.backport.slice(0,400):'',demo:!!x.demo});
 else {if(typeof x.evaluation?.version!=='string'||x.evaluation.version.length>100)throw new Error('Versione assente dal report.');result=report({version:x.evaluation.version,source:'imported',backport:typeof x.evaluation.backport==='string'?x.evaluation.backport.slice(0,400):'',demo:!!x.demo});}
 }else result=report({snapshot:validateSnapshot(x),source:'imported'});
 show(result);
 }catch(err){error(err instanceof SyntaxError?'Il file non contiene JSON valido.':err.message);$('result').hidden=true;current=null;}
 finally{e.target.value='';}
});
$('export').addEventListener('click',()=>{if(current)download(JSON.stringify(current,null,2),'php2shell-report'+(current.demo?'-ESEMPIO':'')+'.json','application/json');});
$('print').addEventListener('click',()=>window.print());
for(const [title,url] of SOURCES){const li=document.createElement('li'),a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=title;li.append(a);$('sources').append(li);}
refreshPending();
