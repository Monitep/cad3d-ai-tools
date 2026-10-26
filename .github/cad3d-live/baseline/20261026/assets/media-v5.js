'use strict';
(() => {
 const $=(s,r=document)=>r.querySelector(s);
 const $$=(s,r=document)=>[...r.querySelectorAll(s)];
 const english=document.documentElement.lang==='en';
 const text=(it,en)=>english?en:it;
 const assets=document.body.dataset.assets;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');

 function initPanorama(container){
  const surface=$('.panorama-surface',container);
  const fallback=$('.panorama-fallback',container);
  const status=$('.pano-status',container);
  const wrapper=container.closest('.panorama-experience');
  const buttons=$$('[data-panorama-select]',wrapper);
  const starts={terrace:-18,pool:18};
  let viewer;
  function setSelection(id){
   container.dataset.panoramaScene=id;
   buttons.forEach(b=>{const active=b.dataset.panoramaSelect===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
   fallback.src=assets+'panorama-'+id+'-preview-v5.jpg';
   fallback.alt=id==='pool'?text('La piscina della villa virtuale','The virtual villa pool'):text('La terrazza della villa virtuale','The virtual villa terrace');
  }
  function unavailable(){
   fallback.hidden=false;surface.hidden=true;
   $('.panorama-controls',container).hidden=true;
   $('.panorama-hint',container).hidden=true;
   status.textContent=text('Vista 360° non disponibile. Puoi continuare nel tour completo.','360° view is unavailable. You can continue in the full tour.');
  }
  function start(){
   if(viewer)return;
   if(!window.pannellum){unavailable();return;}
   status.textContent=text('Caricamento della vista…','Loading the view…');
   const scenes={};
   for(const id of ['terrace','pool'])scenes[id]={type:'multires',yaw:starts[id],pitch:0,hfov:100,
    multiRes:{basePath:assets+'pano-'+id+'-v5',path:'/%l/%s%y_%x',
     fallbackPath:'/fallback/%s',extension:'jpg',tileResolution:2048,maxLevel:3,cubeResolution:5216}};
   try{
    viewer=pannellum.viewer(surface,{default:{firstScene:container.dataset.panoramaScene,
     autoLoad:true,showControls:false,mouseZoom:'fullscreenonly',keyboardZoom:false,
     disableKeyboardCtrl:true,sceneFadeDuration:reduced.matches?0:300,
     minHfov:30,maxHfov:120,multiResMinHfov:true,escapeHTML:true,
     backgroundColor:[.05,.12,.15],strings:{loadingLabel:text('Caricamento della vista…','Loading the view…')}},scenes});
    viewer.on('load',()=>{
     fallback.hidden=true;status.textContent='';container.dataset.panoramaReady='true';
     container.dataset.panoramaRenderer=$('.pnlm-world',surface)?'css3d':'webgl';
    });
    viewer.on('scenechange',id=>{setSelection(id);container.dataset.panoramaReady='false';});
    viewer.on('error',unavailable);
   }catch{unavailable();}
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{
   const id=button.dataset.panoramaSelect;if(viewer&&viewer.getScene()===id)return;setSelection(id);
   if(viewer){status.textContent=text('Caricamento della vista…','Loading the view…');viewer.loadScene(id,0,starts[id],100);}
   else start();
  }));
  $$('[data-pano]',container).forEach(button=>button.addEventListener('click',async()=>{
   start();if(!viewer)return;
   const action=button.dataset.pano, duration=reduced.matches?0:160;
   if(action==='plus')viewer.setHfov(Math.max(30,viewer.getHfov()-15),duration);
   if(action==='minus')viewer.setHfov(Math.min(120,viewer.getHfov()+15),duration);
   if(action==='reset'){viewer.setYaw(starts[container.dataset.panoramaScene],duration);viewer.setPitch(0,duration);viewer.setHfov(100,duration);}
   if(action==='full'){
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(wrapper.requestFullscreen)await wrapper.requestFullscreen();else status.textContent=text('Usa il tour completo per la vista a schermo intero.','Use the full tour for a full-screen view.');}
    catch{status.textContent=text('Schermo intero non disponibile in questo browser.','Full screen is not available in this browser.');}
   }
  }));
  surface.addEventListener('keydown',event=>{
   if(!viewer)return;const duration=reduced.matches?0:120;
   const actions={ArrowLeft:()=>viewer.setYaw(viewer.getYaw()-8,duration),ArrowRight:()=>viewer.setYaw(viewer.getYaw()+8,duration),
    ArrowUp:()=>viewer.setPitch(Math.min(80,viewer.getPitch()+6),duration),ArrowDown:()=>viewer.setPitch(Math.max(-80,viewer.getPitch()-6),duration),
    '+':()=>viewer.setHfov(Math.max(30,viewer.getHfov()-10),duration),'-':()=>viewer.setHfov(Math.min(120,viewer.getHfov()+10),duration)};
   if(actions[event.key]){event.preventDefault();actions[event.key]();}
  });
  new ResizeObserver(()=>viewer?.resize()).observe(container);
  document.addEventListener('fullscreenchange',()=>viewer?.resize());
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){start();observer.disconnect();}},{rootMargin:'200px'});
  observer.observe(container);
 }
 $$('.panorama').forEach(initPanorama);

 function initFilm(container){
  const video=$('video',container),toggle=$('[data-film-toggle]',container);
  const buttons=$$('[data-film-src]',container),status=$('.film-status',container);
  let selected=buttons.find(b=>b.classList.contains('active'))||buttons[0],request=0;
  const source=button=>matchMedia('(max-width:580px)').matches?button.dataset.filmMobile:button.dataset.filmSrc;
  function selection(button){
   request++;selected=button;video.pause();
   video.src=source(button);video.poster=button.dataset.filmPoster;
   video.setAttribute('aria-label',text('Video CGI della villa: ','CGI villa video: ')+button.textContent.trim());
   $('.film-caption>p',container).textContent=button.dataset.filmCaption;
   $('.film-meta',container).textContent=button.dataset.filmDuration+' s · '+text('CGI · Senza audio','CGI · Silent');
   buttons.forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
   status.textContent='';syncButton();
  }
  function syncButton(){
   const playing=!video.paused&&!video.ended;
   $('span',toggle).textContent=playing?text('Metti in pausa','Pause video'):text('Riproduci il video','Play video');
   toggle.setAttribute('aria-pressed',String(playing));
  }
  async function play(){
   const ticket=++request;
   status.textContent=text('Caricamento del video…','Loading the video…');
   try{await video.play();if(ticket===request)status.textContent='';}
   catch{if(ticket===request)status.textContent=text('Il video non parte. Prova il pulsante del player o apri il file.','Video could not start. Try the player button or open the file.');}
  }
  toggle.hidden=false;
  toggle.addEventListener('click',()=>{if(video.paused||video.ended)play();else video.pause();});
  buttons.forEach(button=>button.addEventListener('click',()=>{const playing=!video.paused&&!video.ended;selection(button);if(playing)play();}));
  for(const event of ['play','pause','ended'])video.addEventListener(event,syncButton);
  video.addEventListener('playing',()=>{status.textContent='';});
  video.addEventListener('waiting',()=>{if(!video.paused)status.textContent=text('Caricamento del video…','Loading the video…');});
  video.addEventListener('error',()=>{status.textContent=text('Il video non è disponibile. ','Video is unavailable. ');const link=document.createElement('a');link.href=source(selected);link.textContent=text('Apri il file video','Open the video file');status.append(link);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
  new IntersectionObserver(entries=>{if(entries.every(e=>!e.isIntersecting))video.pause();},{threshold:.05}).observe(video);
  selection(selected);
 }
 $$('[data-film]').forEach(initFilm);
})();
