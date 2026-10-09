(() => {
 'use strict';
 const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
 const wines = window.WINES;
 let language = 'it', activeWine = 0, activeFilter = 'tutti', wineTransition = 0, currentModalWine = null;
 const italian = Object.fromEntries($$('[data-i18n]').map(el => [el.dataset.i18n, el.innerHTML]));
 const english = {
 skip:'Skip to content',navCellar:'The winery',navWines:'Our wines',navExperiences:'Experiences',navStay:'Hospitality',visit:'Come and visit',heroPlace:'Montemagno Monferrato, Piedmont',heroTitle:'Monferrato,<br>to be felt.',heroIntro:'Wines that tell a land’s story.<br>A place that invites you to stay.',exploreWines:'Explore our wines',discoverCellar:'Discover the winery',heroBottom:'La Mondianese · Winery and agriturismo',scroll:'Let us guide you',heroSide:'One passion, many expressions.',originNote:'Our land, our way of being',originTitle:'Rooted in the land.<br>Wine at heart.',vineCaption:'It all begins here.',originLead:'Between Montemagno and Castagnole Monferrato, a nineteenth-century farmhouse holds a passion renewed with every harvest.',originBody:'Caring for the vines, harvesting by hand, patiently ageing the wine. These are the gestures behind our wines: different expressions of the same land, discovered one glass at a time.',cellarStoryLink:'Step into our cellar',collectionNote:'The La Mondianese collection',wineTitle:'A voice<br>for every wine.',wineIntro:'Luminous whites, a delicate rosé and reds with a Piedmontese character. Find the bottle that speaks to your taste.',artCaption:'One land. Eleven interpretations.',grapes:'Grape varieties',serve:'Serve at',discoverWine:'Discover this wine',allWines:'Every shade of wine.',all:'All',white:'Whites',rose:'Rosé',red:'Other reds',searchLabel:'Find a wine',noWines:'No wines found. Try another name or select “All”.',wineFootnote:'Characteristics from the winery’s technical sheets. Alcohol levels and blends may vary with the vintage.',cellarNote:'Time, a precious ingredient',cellarTitle:'Patience<br>has a fragrance.',cellarText:'Beneath the hills, among barrels, barriques and tonneaux, wine finds the time to express itself. Above, a modern winery accompanies each stage of vinification.',visitCellar:'Experience the winery',experiencesNote:'The pleasure of meeting',experiencesTitle:'The glass is<br>just the beginning.',experiencesIntro:'Walk through the vines, explore the cellar and sit with us. Wine becomes even more beautiful when it brings people together.',tastingCaption:'Our tasting room',tourTitle:'From vineyard to cellar',tourText:'A journey through the vines, vinification and ageing, to discover our wine culture up close.',tastingTitle:'A taste of Monferrato',tastingText:'A guided tasting in our tasting room. Arrangements, availability and prices are agreed with the winery.',territoryTitle:'Take in the landscape',territoryText:'Panoramic paths to explore on foot or by mountain bike, among nature and rolling hills.',planVisit:'Plan your visit',visitTimes:'The winery’s website lists tastings at 10:30 and 15:30. Confirm the time before travelling.',stayNote:'Hospitality at the farmhouse',stayTitle:'Take a pause.<br>Find a different pace.',stayIntro:'Three rooms, three wine names. In the nineteenth-century farmhouse, the landscape enters through the windows and invites you to slow down.',stayStatus:'The agriturismo is being renovated. Room reservations are temporarily suspended.',stayInfo:'Ask about reopening',doubleRoom:'Double bed and private bathroom.',suiteRoom:'Small suite, two bedrooms and a private bathroom.',stayOfficial:'Current information on the official website',contactNote:'We look forward to seeing you in Monferrato',contactTitle:'Let’s<br>meet.',contactIntro:'For a tasting, a wine to discover or a question about the farmhouse, choose how to get in touch.',directions:'Get directions',prepareRequest:'Prepare an enquiry',footerLine:'The character of a land.<br>The pleasure of sharing it.',officialShop:'Visit the official shop',aboutDemo:'About this demo',demoCredit:'Independent redesign demo. Wine presentation images and opening landscape created with AI.',contacts:'Contact',technicalSheet:'Official technical sheet (PDF)',seeOfficialShop:'View in the official shop',modalNote:'This image is an AI creative presentation based on the original bottle. Refer to the winery for the label, vintage, availability and price.',requestTitle:'Your visit<br>begins here.',requestIntro:'Fill in the details: we’ll prepare a message to send using your email app.',yourName:'Your name',interest:'Your interest',tastingOption:'Visit and tasting',winesOption:'Wine information',stayOption:'Agriturismo reopening',date:'Preferred date',people:'Guests',message:'Your message',openMail:'Open the message in your email app',mailNotice:'Sending happens only in your email app. We do not collect or store this information.',copyMessage:'Copy the message',demoTitle:'A fresh perspective.',demoInfo:'This is an independent redesign proposal by CAD3D.Expert. It is not the winery’s official website and does not process orders or bookings.',demoImages:'The 11 wine presentation images were generated with AI using the original bottles as references. The opening landscape is an interpretation of Monferrato; the winery and room photographs come from the original website.',demoData:'Information was consulted on 9 October 2026. Details, labels and image rights must be confirmed with the winery before an official launch.',originalSite:'Open the official website',originalBottle:'View the original bottle'
 };
 const labels = {it:{wine:'vini',vitigni:'Vitigni',alcohol:'Alcol',temp:'Temperatura',ageing:'Vinificazione e affinamento',soil:'Terreno',pairing:'A tavola',all:'Tutti',request:'Richiesta informazioni',hello:'Buongiorno La Mondianese,',name:'Mi chiamo',interest:'Sono interessato/a a',date:'Data desiderata',people:'Persone',message:'Messaggio',thanks:'Grazie,',copied:'Messaggio copiato.',copyError:'Seleziona il messaggio qui sopra e copialo.',tasting:'una visita con degustazione',wines:'informazioni sui vini',stay:'informazioni sulla riapertura dell’agriturismo'},en:{wine:'wines',vitigni:'Grape varieties',alcohol:'Alcohol',temp:'Serving temperature',ageing:'Vinification and ageing',soil:'Soil',pairing:'At the table',all:'All',request:'Information enquiry',hello:'Hello La Mondianese,',name:'My name is',interest:'I am interested in',date:'Preferred date',people:'Guests',message:'Message',thanks:'Thank you,',copied:'Message copied.',copyError:'Select and copy the message above.',tasting:'a visit with wine tasting',wines:'information about your wines',stay:'information about the agriturismo reopening'}};
 const field = (wine, key) => language === 'en' && wine[key+'En'] ? wine[key+'En'] : wine[key];
 const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const notesHTML = wine => field(wine,'notes').map(n => `<span>${escapeHTML(n)}</span>`).join('');
 const normalise = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'');
 function setLanguage(lang){
  language=lang;document.documentElement.lang=lang;
  $$('[data-i18n]').forEach(el=>{const v=(lang==='en'?english:italian)[el.dataset.i18n];if(v!==undefined)el.innerHTML=v;});
  $$('[data-placeholder]').forEach(el=>el.placeholder=(lang==='en'?english:italian)[el.dataset.placeholder]||'Cerca un vino');
  $('#language').textContent=lang==='it'?'EN':'IT';$('#language').setAttribute('aria-label',lang==='it'?'Switch to English':'Passa all’italiano');
  $('#wine-prev').setAttribute('aria-label',lang==='it'?'Vino precedente':'Previous wine');$('#wine-next').setAttribute('aria-label',lang==='it'?'Vino successivo':'Next wine');
  $('#menu-open').setAttribute('aria-label',lang==='it'?'Apri il menu':'Open menu');
  $$('[data-close]').forEach(el=>el.setAttribute('aria-label',lang==='it'?'Chiudi':'Close'));
  $('#wine-shortcuts').setAttribute('aria-label',lang==='it'?'Scegli un vino':'Choose a wine');
  updateFeatured();renderCatalog();if(currentModalWine)populateWineDialog(currentModalWine);
  document.title=lang==='it'?'La Mondianese | Il Monferrato, da sentire':'La Mondianese | Monferrato, to be felt';
  window.ScrollTrigger?.refresh();
 }
 $('#language').addEventListener('click',()=>setLanguage(language==='it'?'en':'it'));
 function updateFeatured(){
  const w=wines[activeWine];$('#featured-name').textContent=w.name;$('#featured-denomination').textContent=w.denomination;$('#featured-description').textContent=field(w,'description');$('#featured-notes').innerHTML=notesHTML(w);$('#featured-grapes').textContent=field(w,'grapes');$('#featured-temperature').textContent=w.temperature;$('#wine-counter').textContent=`${String(activeWine+1).padStart(2,'0')} / ${wines.length}`;
  const img=$('#featured-image');img.src=`assets/${w.id}.webp`;img.alt=`${w.name}, ${language==='it'?'presentazione ambientata':'wine presentation'}`;
  $('#wine-shortcuts').innerHTML=wines.map((w,i)=>`<button data-wine-index="${i}" aria-pressed="${i===activeWine}">${escapeHTML(w.name)}</button>`).join('');
 }
 function changeWine(index){
  if(index===activeWine)return;
  activeWine=(index+wines.length)%wines.length;const token=++wineTransition;
  const img=$('#featured-image'),content=$('#wine-story-content');
  if(!window.gsap||matchMedia('(prefers-reduced-motion: reduce)').matches){updateFeatured();return;}
  gsap.killTweensOf([img,content]);
  gsap.to([img,content],{opacity:.15,duration:.18,overwrite:true,onComplete:()=>{
   if(token!==wineTransition)return;updateFeatured();
   const reveal=()=>{if(token!==wineTransition)return;gsap.to([img,content],{opacity:1,duration:.45,overwrite:true});};
   if(img.complete)reveal();else{img.onload=reveal;img.onerror=reveal;}
  }});
 }
 $('#wine-prev').addEventListener('click',()=>changeWine(activeWine-1));$('#wine-next').addEventListener('click',()=>changeWine(activeWine+1));
 $('#wine-shortcuts').addEventListener('click',e=>{const b=e.target.closest('[data-wine-index]');if(b)changeWine(Number(b.dataset.wineIndex));});
 function renderCatalog(){
  const q=normalise($('#wine-search').value.trim());
  const filtered=wines.filter(w=>(activeFilter==='tutti'||w.category===activeFilter)&&normalise([w.name,w.denomination,field(w,'grapes'),...field(w,'notes')].join(' ')).includes(q));
  $('#catalog-count').textContent=`${filtered.length} ${labels[language].wine}`;
  $('#wine-grid').innerHTML=filtered.map(w=>`<article class="wine-card"><button data-wine-id="${w.id}" aria-label="${language==='it'?'Scopri':'Discover'} ${escapeHTML(w.name)}"><div class="wine-card-image"><img src="assets/${w.id}-small.webp" srcset="assets/${w.id}-small.webp 540w, assets/${w.id}.webp 1086w" sizes="(max-width:650px) 45vw,(max-width:900px) 44vw,28vw" width="1086" height="1448" alt="${escapeHTML(w.name)}, ${language==='it'?'bottiglia ambientata':'wine presentation'}" loading="lazy"><span class="card-plus" aria-hidden="true">+</span></div><div class="wine-card-copy"><h3>${escapeHTML(w.name)}</h3><p class="wine-card-denomination">${escapeHTML(w.denomination)}</p><p class="wine-card-notes">${field(w,'notes').map(escapeHTML).join(' · ')}</p></div></button></article>`).join('');
  $('#empty-state').hidden=filtered.length>0;
 }
 $$('.filters button').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;$$('.filters button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));renderCatalog();}));
 $('#wine-search').addEventListener('input',renderCatalog);
 const dialogs=$$('dialog');
 function openDialog(dialog){dialog.showModal();document.body.classList.add('dialog-open');if(dialog.id==='menu-dialog')$('#menu-open').setAttribute('aria-expanded','true');}
 dialogs.forEach(dialog=>{
  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{if(!dialogs.some(d=>d.open))document.body.classList.remove('dialog-open');if(dialog.id==='wine-dialog')currentModalWine=null;if(dialog.id==='menu-dialog')$('#menu-open').setAttribute('aria-expanded','false');});
 });
 $('#menu-open').addEventListener('click',()=>openDialog($('#menu-dialog')));
 $$('#menu-dialog nav a').forEach(a=>a.addEventListener('click',()=>$('#menu-dialog').close()));
 function populateWineDialog(w){
  $('#modal-wine-image').classList.remove('original-packshot');$('#original-bottle').dataset.original='false';$('#original-bottle').textContent=language==='it'?'Vedi la bottiglia originale':'View the original bottle';
  const l=labels[language];$('#modal-wine-name').textContent=w.name;$('#modal-wine-denomination').textContent=w.denomination;$('#modal-wine-description').textContent=field(w,'description');$('#modal-wine-notes').innerHTML=notesHTML(w);$('#modal-wine-image').src=`assets/${w.id}.webp`;$('#modal-wine-image').alt=w.name;
  $('#modal-wine-facts').innerHTML=[[l.vitigni,field(w,'grapes')],[l.alcohol,w.alcohol+' vol.'],[l.temp,w.temperature],[l.ageing,field(w,'ageing')],[l.soil,field(w,'soil')],[l.pairing,field(w,'pairing')]].map(([k,v])=>`<div><dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd></div>`).join('');
  $('#modal-wine-pdf').href=`https://www.lamondianese.com/wp-content/uploads/${w.pdf}`;$('#modal-wine-shop').href=`https://www.lamondianese.com/prodotto/${w.shop}`;
 }
 $('#original-bottle').addEventListener('click',()=>{if(!currentModalWine)return;const original=$('#original-bottle').dataset.original!=='true';$('#original-bottle').dataset.original=String(original);$('#modal-wine-image').src=`assets/${currentModalWine.id}${original?'-original':''}.webp`;$('#modal-wine-image').classList.toggle('original-packshot',original);$('#original-bottle').textContent=original?(language==='it'?'Torna all’immagine ambientata':'Back to the creative image'):(language==='it'?'Vedi la bottiglia originale':'View the original bottle');});
 function openWine(id){const w=wines.find(w=>w.id===id);if(!w)return;currentModalWine=w;populateWineDialog(w);$('#wine-dialog').scrollTop=0;openDialog($('#wine-dialog'));}
 $('#wine-grid').addEventListener('click',e=>{const b=e.target.closest('[data-wine-id]');if(b)openWine(b.dataset.wineId);});$('#featured-open').addEventListener('click',()=>openWine(wines[activeWine].id));
 $('#request-open').addEventListener('click',()=>openDialog($('#request-dialog')));$('#demo-open').addEventListener('click',()=>openDialog($('#demo-dialog')));
 const today=new Date();const dateLocal=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;$('#request-form input[type=date]').min=dateLocal;
 $('#request-form').addEventListener('submit',e=>{
  e.preventDefault();const data=new FormData(e.target),l=labels[language];
  const lines=[l.hello,'',`${l.name} ${data.get('name')}.`,`${l.interest} ${l[data.get('interest')]}.`];
  if(data.get('date'))lines.push(`${l.date}: ${data.get('date')}`);if(data.get('people'))lines.push(`${l.people}: ${data.get('people')}`);if(data.get('message'))lines.push('',`${l.message}: ${data.get('message')}`);lines.push('',l.thanks,String(data.get('name')));
  const body=lines.join('\n');$('#prepared-message').value=body;$('#prepared-message').hidden=false;$('#copy-request').hidden=false;
  const link=document.createElement('a');link.href=`mailto:office@lamondianese.com?subject=${encodeURIComponent(l.request)}&body=${encodeURIComponent(body)}`;link.click();
 });
 $('#copy-request').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#prepared-message').value);$('#copy-status').textContent=labels[language].copied;}catch{$('#prepared-message').focus();$('#prepared-message').select();$('#copy-status').textContent=labels[language].copyError;}});
 const header=$('#header');let ticking=false;
 window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{header.classList.toggle('sticky',window.scrollY>110);ticking=false;});ticking=true;}},{passive:true});header.classList.toggle('sticky',window.scrollY>110);
 function setupMotion(){
  if(!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);const mm=gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',()=>{
   const tl=gsap.timeline({defaults:{ease:'power3.out'}});
   tl.from('.hero-landscape',{scale:1.07,duration:1.7},0).from('.hero-place, .hero h1, .hero-intro, .hero-links',{opacity:0,y:20,duration:.85,stagger:.13,clearProps:'opacity,transform'},.2);
   gsap.to('.hero-landscape',{yPercent:12,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
   gsap.fromTo('.cellar-story > img',{yPercent:-5},{yPercent:5,ease:'none',scrollTrigger:{trigger:'.cellar-story',start:'top bottom',end:'bottom top',scrub:1}});
  });
  document.fonts?.ready.then(()=>ScrollTrigger.refresh());window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
 }
 updateFeatured();renderCatalog();setupMotion();
})();
