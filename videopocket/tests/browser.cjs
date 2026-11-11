/* Run from the repository root:
 * npm install --no-save playwright
 * npx playwright install chromium
 * APP_PYTHON=/path/to/venv/bin/python node videopocket/tests/browser.cjs
 * Optional BROWSER_EXECUTABLE for an already-installed Chromium.
 * Starts a temporary local backend. Search/download responses are fixtures;
 * auth, session revocation and static files use the real service.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-browser-'));
const base = 'http://127.0.0.1:8787';
const password = 'browser-fixture-password-only';
const server = spawn(process.env.APP_PYTHON || 'python', ['-m','uvicorn','app:app','--app-dir',path.join(root,'nas-services/videopocket'),'--host','127.0.0.1','--port','8787','--no-access-log'], {
  cwd:root, env:{...process.env, APP_PASSWORD:password, DATA_DIR:data}, stdio:['ignore','ignore','pipe']
});
let serverError=''; server.stderr.on('data', d=>{serverError+=d.toString();});

async function main() {
  for(let i=0;i<60;i++) { try {const response=await fetch(base+'/api/health');if(response.ok)break;}catch{} await new Promise(r=>setTimeout(r,100));if(i===59)throw new Error('Backend failed: '+serverError); }
  const browser=await chromium.launch({headless:true, ...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  try {
    const errors=[];
    const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    let jobs=[], sequence=0;
    await context.route('**/api/jobs**',async route=>{
      const request=route.request(),url=new URL(request.url()),parts=url.pathname.split('/');
      if(request.method()==='POST' && parts[3]){
        const job=jobs.find(j=>j.id===parts[3]);
        if(parts[4]==='cancel')job.status='cancelled';
        await route.fulfill({json:parts[4]==='ticket'?{path:'/api/files/test-ticket'}:{ok:true}});return;
      }
      if(request.method()==='DELETE'){jobs=jobs.filter(j=>j.id!==parts[3]);await route.fulfill({json:{ok:true}});return;}
      if(request.method()==='POST'){const body=request.postDataJSON();const job={...body,id:'fixture'+(++sequence),status:'queued',progress:0,error:''};jobs.unshift(job);await route.fulfill({json:job});return;}
      await route.fulfill({json:{jobs}});
    });
    const video={title:'Fiori al sole · video di prova CC0',url:'https://example.com/video.mp4',thumbnail:'',channel:'Video di prova',duration:30,live:false};
    await context.route('**/api/info',r=>r.fulfill({json:{results:[video]}}));
    await context.route('**/api/search?*',r=>r.fulfill({json:{results:[video,{...video,title:'<img src=x onerror="window.xss=true">'}]}}));
    await page.goto(base);
    assert.match(await page.title(),/VideoPocket/);
    await page.locator('[data-view="settings"]').click();
    await page.locator('#api-url').fill(base);
    await page.locator('#password').fill(password);
    await page.locator('#connect-button').click();
    await page.waitForFunction(()=>document.querySelector('#connection-state').textContent==='NAS collegato');
    assert.equal(await page.locator('#password').inputValue(),'');
    assert.equal(await page.evaluate(()=>localStorage.getItem('vp-token')),null);
    await page.locator('#video-url').fill(video.url);
    await page.locator('#analyze').click();
    await page.locator('#video-preview .primary').waitFor();
    await page.locator('#quality').selectOption('audio');
    await page.locator('#video-preview .primary').click();
    await page.locator('.job').waitFor();
    assert.equal(jobs[0].quality,'audio');
    await page.getByRole('button',{name:'Annulla',exact:true}).click();
    await page.getByRole('button',{name:'Riprova',exact:true}).waitFor();
    await page.getByRole('button',{name:'Riprova',exact:true}).click();
    assert.equal(jobs.length,2);
    await page.locator('[data-view="search"]').click();
    await page.locator('#query').fill('architettura');
    await page.locator('.search-submit').click();
    await page.locator('.result').first().waitFor();
    assert.equal(await page.locator('.result').count(),2);
    assert.equal(await page.evaluate(()=>Boolean(window.xss)),false);
    await page.locator('.result .primary').first().click();
    assert.equal(await page.locator('#video-url').inputValue(),video.url);
    await page.locator('#quality').selectOption('1080');
    assert.equal(await page.locator('#quality').inputValue(),'1080');
    await page.evaluate(()=>{document.getElementById('toast').hidden=true;document.querySelectorAll('.view').forEach(e=>e.style.animation='none');});
    await page.screenshot({path:path.join(__dirname,'preview-mobile.png'),fullPage:false});
    for(const width of [320,360,384,412,480,768,1280]) {
      await page.setViewportSize({width,height:915});
      for(const view of ['download','search','sites','settings']) {
        await page.locator(`[data-view="${view}"]`).click();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${view} overflows at ${width}px`);
        const nav=await page.locator('.bottom-nav').boundingBox();assert(nav.y+nav.height<=916,'Navigation clipped');
      }
    }
    await page.setViewportSize({width:412,height:915});
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');
    for(const view of ['download','search','sites','settings']) {
      await page.locator(`[data-view="${view}"]`).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${view} overflows at 200% text`);
    }
    await page.evaluate(()=>document.documentElement.style.fontSize='16px');
    await page.locator('[data-view="settings"]').click();
    await page.locator('#logout').click();
    await page.waitForFunction(()=>!sessionStorage.getItem('vp-token'));
    await page.goto(base+'/?text='+encodeURIComponent('Guarda '+video.url));
    assert.equal(await page.locator('#video-url').inputValue(),video.url);
    assert.equal(await page.evaluate(()=>location.search),'');
    assert.deepEqual(errors,[],'Browser JavaScript errors');
    console.log('UI passed: auth, links, queue, cancel/retry, search, XSS, share target, 7 widths × 4 views, 200% text.');
    await context.close();
    const swContext=await browser.newContext();const swPage=await swContext.newPage();await swPage.goto(base);
    await swPage.evaluate(()=>navigator.serviceWorker.ready);
    assert((await swPage.evaluate(()=>caches.keys())).includes('videopocket-v1'));
    console.log('PWA service worker and offline shell cache passed.');
    await swContext.close();
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server.kill('SIGTERM');fs.rmSync(data,{recursive:true,force:true});});
