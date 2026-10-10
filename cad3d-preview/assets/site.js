'use strict';
(() => {
 const $ = (selector,root=document) => root.querySelector(selector);
 const $$ = (selector,root=document) => [...root.querySelectorAll(selector)];
 const english = document.documentElement.lang === 'en';
 const assets = document.body.dataset.assets;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const text = (it,en) => english ? en : it;
 const header = $('.site-header');
 const updateHeader = () => header.classList.toggle('scrolled',scrollY > 35);
 updateHeader(); addEventListener('scroll',updateHeader,{passive:true});
 const menu = $('.mobile-nav');
 const toggle = $('.menu-toggle');
 function closeMenu(){
  menu.hidden = true; toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-label',text('Apri il menu','Open menu'));
  header.classList.remove('menu-open'); document.body.style.overflow = '';
  $('main').inert = false; $('.site-footer').inert = false;
 }
 toggle.addEventListener('click',() => {
  if(toggle.getAttribute('aria-expanded') === 'true'){closeMenu();toggle.focus();return;}
  menu.hidden = false; toggle.setAttribute('aria-expanded','true');
  toggle.setAttribute('aria-label',text('Chiudi il menu','Close menu'));
  header.classList.add('menu-open'); document.body.style.overflow='hidden';
  $('main').inert=true; $('.site-footer').inert=true; $('a',menu).focus();
 });
 $$('a',menu).forEach(a=>a.addEventListener('click',closeMenu));
 document.addEventListener('keydown',event=>{
  if(toggle.getAttribute('aria-expanded') !== 'true')return;
  if(event.key==='Escape'){closeMenu();toggle.focus();}
  if(event.key==='Tab'){
   const targets=[...$$('a,button',header),...$$('a',menu)].filter(e=>e.getClientRects().length);
   const first=targets[0],last=targets.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 matchMedia('(min-width:1025px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
 const serviceToggle=$('.services-toggle');
 const serviceMenu=$('.services-menu');
 function closeServices(){serviceMenu.hidden=true;serviceToggle.setAttribute('aria-expanded','false');}
 serviceToggle.addEventListener('click',()=>{const open=serviceToggle.getAttribute('aria-expanded')!=='true';serviceMenu.hidden=!open;serviceToggle.setAttribute('aria-expanded',String(open));});
 document.addEventListener('click',event=>{if(!event.target.closest('.nav-services'))closeServices();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!serviceMenu.hidden){closeServices();serviceToggle.focus();}});
 document.addEventListener('focusin',event=>{if(!event.target.closest('.nav-services'))closeServices();});
 matchMedia('(max-width:1024px)').addEventListener('change',event=>{if(event.matches)closeServices();});
 function changeImage(target,src,alt,mobileSrc=''){
  const source=target.closest('picture')?.querySelector('source');
  const applyImage=()=>{if(source)source.srcset=mobileSrc||src;target.src=src;if(alt)target.alt=alt;};
  const image=new Image(); const requestId=(target._requestId||0)+1;target._requestId=requestId;
  image.onload=()=>{
   if(target._requestId!==requestId)return;
   if(window.gsap&&!reduced.matches){
    gsap.killTweensOf(target);
    gsap.timeline().to(target,{opacity:0,duration:.18,ease:'power1.out'})
     .call(applyImage)
     .fromTo(target,{scale:1.045,opacity:0},{scale:1,opacity:1,duration:.7,ease:'power2.out',immediateRender:false});
   }else{applyImage();}
  };
  image.onerror=()=>{target._requestId=0;};image.src=source&&mobileSrc&&matchMedia('(max-width:580px)').matches?mobileSrc:src;
 }
 $$('.scene-picker button').forEach(button=>button.addEventListener('click',()=>{
  $$('.scene-picker button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  $('.hero-caption').textContent=button.dataset.caption;
  changeImage($('.hero-picture'),button.dataset.sceneSrc||assets+button.dataset.scene+'.webp',button.dataset.caption,button.dataset.mobileSrc);
 }));
 const energyDescriptions={solar:text('Produzione energetica e attività agricola nello stesso paesaggio.','Energy generation and agriculture in the same landscape.'),bess:text('Sistemi di accumulo e infrastrutture, letti nel loro contesto.','Storage systems and infrastructure, seen in their context.'),agri:text('Strutture, pannelli e percorsi: il progetto dal punto di vista di chi lo attraversa.','Structures, panels and paths: the project from the perspective of someone walking through it.')};
 $$('.energy-tabs button').forEach(button=>button.addEventListener('click',()=>{
  $$('.energy-tabs button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  $('.energy-caption').textContent=energyDescriptions[button.dataset.energy];
  changeImage($('.energy-image img'),assets+button.dataset.energy+'.webp',energyDescriptions[button.dataset.energy]);
 }));
 const comparison=$('.comparison');
 if(comparison){
  $('input',comparison).addEventListener('input',event=>comparison.style.setProperty('--position',event.target.value+'%'));
  $$('[data-comparison-mode]').forEach(button=>button.addEventListener('click',()=>{
   $$('[data-comparison-mode]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
   const mitigation=button.dataset.comparisonMode==='mitigation';
   $('.comparison-after',comparison).style.backgroundPosition=mitigation?'center bottom':'center 50%';
   $('.comparison-label.after',comparison).textContent=mitigation?text('Con mitigazione','With mitigation'):text('Progetto','Project');
  }));
 }
 const filterButtons=$$('[data-filter]');
 function filterProjects(category){
  if(!filterButtons.some(b=>b.dataset.filter===category))category='all';
  filterButtons.forEach(b=>{b.classList.toggle('active',b.dataset.filter===category);b.setAttribute('aria-pressed',String(b.dataset.filter===category));});
  let count=0;$$('.project-card').forEach(card=>{card.hidden=category!=='all'&&card.dataset.category!==category;if(!card.hidden)count++;});
  $('.filter-count').textContent=count+' '+text(count===1?'lavoro':'lavori',count===1?'project':'projects');
 }
 filterButtons.forEach(button=>button.addEventListener('click',()=>{
  const category=button.dataset.filter;filterProjects(category);
  const url=new URL(location.href);
  if(category==='all')url.searchParams.delete('settore');else url.searchParams.set('settore',category);
  if(url.href!==location.href)history.pushState(null,'',url);
  syncFilterLanguage(category);
 }));
 function syncFilterLanguage(category){
  const link=$('.language-switch'),url=new URL(link.href);
  if(category==='all')url.searchParams.delete('settore');else url.searchParams.set('settore',category);
  link.href=url.href;
 }
 if(filterButtons.length)filterProjects(new URLSearchParams(location.search).get('settore')||'all');
 if(filterButtons.length){
  syncFilterLanguage(new URLSearchParams(location.search).get('settore')||'all');
  addEventListener('popstate',()=>{const category=new URLSearchParams(location.search).get('settore')||'all';filterProjects(category);syncFilterLanguage(category);});
 }
 const dialog=$('.lightbox');let lastImageButton;
 function openImage(button,src,title,description=''){
  lastImageButton=button;const photo=$('img',dialog);photo.src=src;photo.alt=title;
  photo.onload=()=>{photo.width=photo.naturalWidth;photo.height=photo.naturalHeight;};
  $('h2',dialog).textContent=title;$('p',dialog).textContent=description;$('p',dialog).hidden=!description;
  dialog.showModal();document.body.style.overflow='hidden';$('.lightbox-close').focus();
 }
 $$('.project-image,.image-zoom,.model-image').forEach(button=>button.addEventListener('click',()=>openImage(button,button.dataset.image,button.dataset.title,button.dataset.description)));
 $('[data-open-hero]')?.addEventListener('click',event=>{
  const image=$('.hero-picture');openImage(event.currentTarget,image.currentSrc||image.src,$('.hero-caption').textContent);
 });
 $('.lightbox-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{document.body.style.overflow='';lastImageButton?.focus();});
 const form=$('.brief-form');
 if(form){
  const selectedService=new URLSearchParams(location.search).get('servizio');
  if(selectedService&&[...form.elements.service.options].some(o=>o.value===selectedService))form.elements.service.value=selectedService;
  form.addEventListener('submit',event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const d=new FormData(form);const greeting=text('Ciao Michele,','Hi Michele,');
   const brief=`${greeting}\n\n${text('Vorrei confrontarmi su','I would like to discuss')}: ${d.get('service')}\n\n${d.get('message')}\n\n${d.get('name')}${d.get('company')?'\n'+d.get('company'):''}\n${d.get('email')}`;
   const result=$('.brief-result',form);result.hidden=false;$('textarea',result).value=brief;
   const subject=text('Richiesta progetto: ','Project enquiry: ')+d.get('service');
   $('[data-mail]',result).href='mailto:michele@cad3d.expert?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(brief);
   $('textarea',result).focus({preventScroll:true});
   result.scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'nearest'});
  });
  $('[data-copy]',form).addEventListener('click',async event=>{
   const output=$('.brief-result textarea',form);const button=event.currentTarget;
   try{await navigator.clipboard.writeText(output.value);button.textContent=text('Brief copiato','Brief copied');$('.brief-result [role="status"]',form).textContent=text('Brief copiato. Puoi incollarlo nella tua email.','Brief copied. You can paste it into your email.');}
   catch{output.focus();output.select();button.textContent=text('Selezionato: usa Copia','Selected: use Copy');$('.brief-result [role="status"]',form).textContent=text('Seleziona Copia nel tuo dispositivo per copiare la bozza.','Choose Copy on your device to copy the draft.');}
  });
 }
 // Native high-resolution panoramas are initialized by media-v5.js.
 if(window.gsap&&window.ScrollTrigger){
  gsap.registerPlugin(ScrollTrigger);
  const mm=gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',()=>{
   if($('.hero')){
    gsap.timeline({defaults:{ease:'power3.out'}})
     .from('.hero-picture',{scale:1.065,duration:1.8},0)
     .from('.hero-intro',{autoAlpha:0,y:14,duration:.65},.1)
     .from('.hero h1 span',{autoAlpha:0,y:38,duration:1,stagger:.13},.18)
     .from('.hero-description,.hero-actions',{autoAlpha:0,y:20,duration:.8,stagger:.1},.5)
     .from('.hero-bottom',{autoAlpha:0,duration:.8},.8);
    gsap.from('.intro-grid h2',{y:25,autoAlpha:.35,duration:.8,scrollTrigger:{trigger:'.intro',start:'top 78%',once:true}});
   }
   return()=>{};
  });
  mm.add('(min-width:821px) and (prefers-reduced-motion: no-preference)',()=>{
   if($('.hero'))gsap.to('.hero-content',{y:30,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom 20%',scrub:.5}});
  });
  document.fonts.ready.then(()=>ScrollTrigger.refresh());
 }
})();
