'use strict';
const $ = (id) => document.getElementById(id);
const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
const sources = [
  {name:'YouTube',mark:'▶',color:'#b72531',home:'https://www.youtube.com/',search:q=>'https://www.youtube.com/results?search_query='+encodeURIComponent(q)},
  {name:'Vimeo',mark:'v',color:'#087597',home:'https://vimeo.com/',search:q=>'https://vimeo.com/search?q='+encodeURIComponent(q)},
  {name:'Dailymotion',mark:'d',color:'#2460b8',home:'https://www.dailymotion.com/',search:q=>'https://www.dailymotion.com/search/'+encodeURIComponent(q)+'/videos'},
  {name:'TikTok',mark:'♪',color:'#303744',home:'https://www.tiktok.com/',search:q=>'https://www.tiktok.com/search?q='+encodeURIComponent(q)},
  {name:'Instagram',mark:'◎',color:'#98438e',home:'https://www.instagram.com/'},
  {name:'Facebook',mark:'f',color:'#245fb9',home:'https://www.facebook.com/watch/',search:q=>'https://www.facebook.com/search/videos/?q='+encodeURIComponent(q)},
  {name:'Twitch',mark:'T',color:'#7047be',home:'https://www.twitch.tv/',search:q=>'https://www.twitch.tv/search?term='+encodeURIComponent(q)},
  {name:'X',mark:'X',color:'#3f4958',home:'https://x.com/',search:q=>'https://x.com/search?q='+encodeURIComponent(q)+'&f=video'},
  {name:'RaiPlay',mark:'R',color:'#24529e',home:'https://www.raiplay.it/'}
];
let endpoint = localStorage.getItem('vp-endpoint') || '';
let token = sessionStorage.getItem('vp-token') || '';
if (sessionStorage.getItem('vp-session-endpoint') !== endpoint) token = '';
let activeView = 'download', currentVideo = null, toastTimer, installPrompt, pollBusy = false, refreshSequence = 0;
let jobCache = new Map();
let connected = false;

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','icon'); svg.setAttribute('aria-hidden','true');
  const use = document.createElementNS('http://www.w3.org/2000/svg','use');
  use.setAttribute('href','icons.svg#'+name); svg.append(use); return svg;
}
function toast(message, error=false) {
  $('toast').textContent = message; $('toast').classList.toggle('error',error); $('toast').hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').hidden=true,error?8000:4500);
}
function showView(view) {
  activeView=view;
  for (const el of document.querySelectorAll('.view')) el.hidden=el.id!=='view-'+view;
  for (const button of document.querySelectorAll('[data-view]')) {
    if(button.dataset.view===view) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  }
  window.scrollTo({top:0,behavior:'instant'});
  if(view==='download') refreshJobs();
  if(view==='settings' && token) loadSettings();
}
function setConnection(state) {
  connected=state;
  $('connection-state').textContent=state?'NAS collegato':'Collega NAS';
  $('connection').classList.toggle('connected',state);
  $('logout').hidden=!token;
  if(!state) $('service-info').hidden=true;
}
function needConnection() {
  if (!endpoint || !token) { showView('settings'); toast('Collega il NAS per usare ricerca e download.'); return false; }
  return true;
}
function checkEndpoint(value) {
  const url = new URL(value);
  if(!['https:','http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) throw new Error('Inserisci l’indirizzo base del servizio, senza percorsi o credenziali.');
  if(location.protocol==='https:' && url.protocol!=='https:') throw new Error('Dal sito serve un indirizzo HTTPS del NAS. Per la rete locale, apri direttamente l’app ospitata dal NAS.');
  if(url.protocol==='http:' && !/^(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(url.hostname)) throw new Error('Per un indirizzo pubblico è richiesto HTTPS.');
  return url.origin;
}
async function request(path, options={}) {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),options.timeout || 75000);
  try {
    const response = await fetch((options.endpoint || endpoint)+path,{
      method:options.method || 'GET', signal:controller.signal, credentials:'omit', referrerPolicy:'no-referrer',
      headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token && !options.noAuth?{Authorization:'Bearer '+token}:{})},
      body:options.body?JSON.stringify(options.body):undefined
    });
    const data=await response.json();
    if(!response.ok) {
      if(response.status===401 && !options.noAuth) { token=''; sessionStorage.removeItem('vp-token'); setConnection(false); }
      throw new Error(typeof data.detail==='string'?data.detail:'La richiesta non è stata accettata.');
    }
    return data;
  } catch(error) {
    if(error.name==='AbortError') throw new Error('Il servizio non risponde in tempo. Controlla il NAS e riprova.');
    if(error instanceof TypeError) throw new Error('NAS non raggiungibile. Verifica indirizzo, VPN, HTTPS e collegamento del servizio.');
    throw error;
  } finally { clearTimeout(timeout); }
}
async function busy(button, fn) {
  const text=button.textContent; button.disabled=true; button.classList.add('loading');
  try { await fn(); } catch(error) { toast(error.message,true); }
  finally { button.disabled=false; button.classList.remove('loading'); if(!button.textContent) button.textContent=text; }
}
function safeURL(value) {
  try { const url=new URL(value); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
function duration(seconds) {
  if(!Number.isFinite(seconds)) return '';
  const n=Math.floor(seconds); return (n>=3600?Math.floor(n/3600)+':':'')+(n>=3600?String(Math.floor(n/60)%60).padStart(2,'0'):Math.floor(n/60))+':'+String(n%60).padStart(2,'0');
}
function thumbnail(value) {
  const url=safeURL(value);
  if(!url || (location.protocol==='https:' && !url.startsWith('https:'))) return null;
  const img=make('img'); img.src=url; img.alt=''; img.loading='lazy'; img.referrerPolicy='no-referrer'; img.addEventListener('error',()=>img.remove(),{once:true}); return img;
}
function chooseVideo(video) {
  if(!safeURL(video.url)) { toast('Il video non ha un link utilizzabile.',true); return; }
  currentVideo=video; $('video-url').value=video.url;
  const panel=$('video-preview'); panel.replaceChildren(); panel.hidden=false;
  const img=thumbnail(video.thumbnail); if(img)panel.append(img);
  panel.append(make('h3','',video.title));
  panel.append(make('p','meta',[video.channel,duration(video.duration)].filter(Boolean).join(' · ')));
  if(video.live) { panel.append(make('p','job-error','Le dirette in corso non sono disponibili per il download.')); return; }
  const actions=make('div','actions');
  const quality=make('select'); quality.id='quality'; quality.setAttribute('aria-label','Qualità del download');
  for(const [value,label] of [['1080','Video · fino a 1080p'],['720','Video · fino a 720p'],['2160','Video · fino a 4K'],['audio','Solo audio · MP3']]) {const opt=make('option','',label);opt.value=value;quality.append(opt);}
  const add=make('button','primary','Scarica sul NAS'); add.type='button'; add.prepend(icon('download'));
  add.addEventListener('click',()=>busy(add,async()=>{
    if(!needConnection()) return;
    await request('/api/jobs',{method:'POST',body:{url:video.url,quality:quality.value,title:video.title}});
    toast('Aggiunto alla coda. Il NAS prepara il file.'); showView('download'); await refreshJobs();
  }));
  actions.append(quality,add);panel.append(actions);
  panel.append(make('p','hint','Qualità massima richiesta; formato e risoluzione dipendono dal video disponibile.'));
}
function emptyJobs(message, connect=false) {
  const div=make('div','empty'); div.append(icon('download'),make('h3','',connect?'Collega il tuo NAS':'Nessun download in coda'),make('p','',message));
  if(connect) {const b=make('button','secondary','Collega il NAS');b.type='button';b.onclick=()=>showView('settings');div.append(b);}
  $('jobs').replaceChildren(div);
}
const states={queued:'In coda',downloading:'Download sul NAS',processing:'Preparazione del file',done:'Pronto sul NAS',error:'Non riuscito',cancelled:'Annullato'};
function renderJobs(jobs) {
  jobCache=new Map(jobs.map(x=>[x.id,x]));
  if(!jobs.length) { emptyJobs('Incolla un link per preparare il primo video.');return; }
  const fragment=document.createDocumentFragment();
  for(const job of jobs) {
    const box=make('article','job');box.dataset.job=job.id;
    box.append(make('h3','job-title',job.title));
    const details=make('div','job-details');details.append(make('span','',states[job.status] || job.status),make('span','',job.quality==='audio'?'MP3':'Fino a '+job.quality+'p'));box.append(details);
    if(['queued','downloading','processing'].includes(job.status)) {
      const progress=make('progress');progress.max=100;progress.value=job.progress;progress.setAttribute('aria-label','Avanzamento download');box.append(progress);
    }
    if(job.error)box.append(make('p','job-error',job.error));
    const actions=make('div','job-actions');
    if(job.status==='done') {
      const save=make('button','primary','Salva sul telefono');save.type='button';save.dataset.action='save';actions.append(save);
    } else if(['queued','downloading','processing'].includes(job.status)) {
      const cancel=make('button','secondary','Annulla');cancel.type='button';cancel.dataset.action='cancel';actions.append(cancel);
    } else {
      const retry=make('button','secondary','Riprova');retry.type='button';retry.dataset.action='retry';actions.append(retry);
    }
    if(!['queued','downloading','processing'].includes(job.status)) {
      const del=make('button','quiet');del.type='button';del.dataset.action='delete';del.setAttribute('aria-label','Elimina '+job.title+' dal NAS');del.append(icon('trash'));actions.append(del);
    }
    box.append(actions);fragment.append(box);
  }
  // Keep focused action stable while polling.
  const focused=document.activeElement; const focusJob=focused?.closest('.job')?.dataset.job; const focusAction=focused?.dataset.action;
  $('jobs').replaceChildren(fragment);
  if(focusJob && focusAction) $('jobs').querySelector(`[data-job="${focusJob}"] [data-action="${focusAction}"]`)?.focus({preventScroll:true});
}
async function refreshJobs(visibleErrors=false) {
  if(!endpoint || !token) { emptyJobs('La coda resta sul NAS e prosegue a schermo spento.',true);return; }
  const sequence=++refreshSequence;
  try { const data=await request('/api/jobs',{timeout:10000}); if(sequence===refreshSequence) {setConnection(true);renderJobs(data.jobs);} }
  catch(error) {if(sequence!==refreshSequence)return;setConnection(false);if(visibleErrors)toast(error.message,true);}
}
$('jobs').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  const job=jobCache.get(button.closest('.job').dataset.job);if(!job)return;
  busy(button,async()=>{
    if(!needConnection())return;
    switch(button.dataset.action){
      case 'save': { const data=await request(`/api/jobs/${job.id}/ticket`,{method:'POST'}); if(!/^\/api\/files\/[\w-]+$/.test(data.path))throw new Error('Link di download non valido.'); const a=make('a'); a.href=endpoint+data.path; a.referrerPolicy='no-referrer'; a.rel='noreferrer';document.body.append(a);a.click();a.remove();toast('Trasferimento avviato. Controlla i download del browser.');break; }
      case 'cancel': await request(`/api/jobs/${job.id}/cancel`,{method:'POST'}); await refreshJobs();break;
      case 'retry': await request('/api/jobs',{method:'POST',body:{url:job.url,quality:job.quality,title:job.title}});await refreshJobs();break;
      case 'delete': if(!window.confirm('Eliminare questo download dal NAS? Le copie già salvate sul telefono restano disponibili.'))return;await request(`/api/jobs/${job.id}`,{method:'DELETE'});await refreshJobs();break;
    }
  });
});
$('link-form').addEventListener('submit',event=>{event.preventDefault();busy($('analyze'),async()=>{
  if(!needConnection())return;
  $('video-preview').hidden=true;currentVideo=null;
  const data=await request('/api/info',{method:'POST',body:{url:$('video-url').value.trim()}});
  if(!data.results?.length)throw new Error('Il sito non ha restituito un video.');chooseVideo(data.results[0]);
});});
$('video-url').addEventListener('input',()=>{currentVideo=null;$('video-preview').hidden=true;});
$('paste').addEventListener('click',async()=>{try{const text=await navigator.clipboard.readText();const match=text.match(/https?:\/\/[^\s<>"']+/);$('video-url').value=match?match[0]:text.trim();$('video-preview').hidden=true;currentVideo=null;toast('Link incollato. Premi Leggi il video.');}catch{toast('Tieni premuto nel campo Link del video e scegli Incolla.');$('video-url').focus();}});
$('search-form').addEventListener('submit',event=>{event.preventDefault();busy(event.submitter,async()=>{
  if(!needConnection())return;
  $('results').replaceChildren(make('div','empty','Ricerca su YouTube in corso…'));$('result-count').textContent='';
  try {
    const data=await request('/api/search?q='+encodeURIComponent($('query').value.trim()));
    $('result-count').textContent=data.results.length+' video';$('results').replaceChildren();
    if(!data.results.length){$('results').append(make('div','empty','Nessun video trovato. Prova un’altra ricerca.'));return;}
    for(const video of data.results){
      const card=make('article','result'),image=make('div','result-image');const img=thumbnail(video.thumbnail);if(img)image.append(img);if(video.duration)image.append(make('span','duration',duration(video.duration)));
      const content=make('div','result-content');content.append(make('h3','',video.title),make('p','meta',video.channel));
      const select=make('button','primary full','Scegli questo video');select.type='button';select.onclick=()=>{showView('download');chooseVideo(video);$('video-preview').scrollIntoView({block:'center',behavior:'smooth'});};content.append(select);card.append(image,content);$('results').append(card);
    }
  } catch(error){$('results').replaceChildren(make('div','error-box',error.message));throw error;}
});});
for(const source of sources){
  const a=make('a','site');a.href=source.home;a.target='_blank';a.rel='noopener noreferrer';a.style.setProperty('--site-color',source.color);a.append(make('span','site-mark',source.mark),make('strong','',source.name),make('small','','Apri nel browser'));$('sites').append(a);
  if(source.search){const b=make('button','',source.name);b.type='button';b.onclick=()=>{
    const query=$('query').value.trim();if(query.length<2){toast('Scrivi prima cosa vuoi cercare.');$('query').focus();return;}
    if(source.name==='YouTube'){$('search-form').requestSubmit();return;}
    window.open(source.search(query),'_blank','noopener,noreferrer');
  };$('search-sources').append(b);}
}
$('settings-form').addEventListener('submit',event=>{event.preventDefault();busy($('connect-button'),async()=>{
  const target=checkEndpoint($('api-url').value.trim());
  const health=await request('/api/health',{endpoint:target,noAuth:true,timeout:10000});
  if(health.service!=='videopocket')throw new Error('Questo indirizzo non è un servizio VideoPocket.');
  if(target===endpoint && token && !$('password').value){await loadSettings();toast('Collegamento verificato.');return;}
  if(!$('password').value)throw new Error('Inserisci la password dedicata a VideoPocket.');
  const data=await request('/api/login',{endpoint:target,method:'POST',noAuth:true,body:{password:$('password').value},timeout:10000});
  endpoint=target;token=data.token;localStorage.setItem('vp-endpoint',endpoint);sessionStorage.setItem('vp-token',token);sessionStorage.setItem('vp-session-endpoint',endpoint);$('password').value='';setConnection(true);
  await loadSettings();toast('NAS collegato. Puoi cercare e scaricare.');showView('download');
});});
async function loadSettings(){
  try{const data=await request('/api/settings',{timeout:10000});setConnection(true);const box=$('service-info');box.hidden=false;box.replaceChildren(make('h3','','NAS pronto'),make('p','hint wrap','yt-dlp '+data.engine));
    const grid=make('div','service-grid');for(const [value,label] of [[data.used_mb+' MB','Spazio occupato'],[Math.round(data.storage_mb/1024)+' GB','Spazio massimo'],[data.max_file_mb+' MB','Limite per video'],[data.retention_hours+' ore','Conservazione sul NAS']]){const div=make('div');div.append(make('strong','',value),make('span','',label));grid.append(div);}box.append(grid);
  }catch(error){setConnection(false);toast(error.message,true);}
}
$('logout').addEventListener('click',()=>busy($('logout'),async()=>{try{await request('/api/logout',{method:'POST',timeout:5000});}finally{token='';sessionStorage.removeItem('vp-token');sessionStorage.removeItem('vp-session-endpoint');setConnection(false);emptyJobs('Accedi al NAS per ritrovare la coda.',true);toast('Telefono disconnesso.');}}));
$('show-password').onclick=()=>{const show=$('password').type==='password';$('password').type=show?'text':'password';$('show-password').setAttribute('aria-label',show?'Nascondi password':'Mostra password');};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>showView(b.dataset.view);
for(const b of document.querySelectorAll('.connect-action'))b.onclick=()=>showView('settings');
$('connection').onclick=()=>showView('settings');$('refresh').onclick=()=>refreshJobs(true);
function onlineState(){$('offline').hidden=navigator.onLine;}
window.addEventListener('online',()=>{onlineState();refreshJobs();});window.addEventListener('offline',onlineState);onlineState();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install').hidden=false;});
$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
$('api-url').value=endpoint || (location.port==='8787'?location.origin:'');
const params=new URLSearchParams(location.search);const shared=[params.get('url'),params.get('text')].filter(Boolean).join(' ');const match=shared.match(/https?:\/\/[^\s<>"']+/);
if(match){$('video-url').value=match[0];history.replaceState(null,'',location.pathname);toast('Link ricevuto. Premi Leggi il video.');}
setConnection(false);refreshJobs();
setInterval(async()=>{if(pollBusy || document.hidden || activeView!=='download' || !token)return;pollBusy=true;try{await refreshJobs();}finally{pollBusy=false;}},4000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden && activeView==='download')refreshJobs();});
