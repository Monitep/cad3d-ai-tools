/* Shared desktop and mobile navigation for every IT/EN page. */
'use strict';
(() => {
 const $ = (selector, root=document) => root.querySelector(selector);
 const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
 const english = document.documentElement.lang === 'en';
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
  closeServices();
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
})();
