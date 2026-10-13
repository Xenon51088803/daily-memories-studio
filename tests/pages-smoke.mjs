import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root = path.resolve('.publish-build/site/out');
const config = JSON.parse(await fs.readFile('publish-config.json','utf8'));
const base = config.owner ? config.basePath : '/tomorrow-letters';
for (const forbidden of ['diary','api','studio','.diary-data','src']) {
  await assert.rejects(fs.access(path.join(root,forbidden)));
}
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith(base+'/')) {res.writeHead(404).end();return;}
    let target = path.resolve(root, '.'+decodeURIComponent(url.pathname.slice(base.length)));
    const relative = path.relative(root,target);
    if(relative.startsWith('..') || path.isAbsolute(relative)) throw new Error();
    if((await fs.stat(target)).isDirectory()) target=path.join(target,'index.html');
    const ext=path.extname(target);
    const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain'}[ext] || 'application/octet-stream';
    res.writeHead(200,{'Content-Type':type});res.end(await fs.readFile(target));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true,
  ...(process.env.PAGES_URL && process.env.HTTPS_PROXY ? {proxy:{server:process.env.HTTPS_PROXY}} : {})});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  const apiRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(new URL(r.url()).pathname.includes('/api/')) apiRequests.push(r.url());});
  const url=process.env.PAGES_URL || `http://127.0.0.1:${server.address().port}${base}/`;
  await page.goto(url);
  const mathFonts = await page.evaluate(async () => {
    const fonts = await document.fonts.load('16px KaTeX_Main', 'x');
    return fonts.map(font => font.status);
  });
  assert.ok(mathFonts.length > 0 && mathFonts.every(status => status === 'loaded'), 'Math font must load from the exported site, including its Pages base path');
  if(process.env.PAGES_URL) {
    const state=JSON.parse(await fs.readFile('.publish-state/pages.json','utf8'));
    assert.equal(await page.locator('meta[name="homepage-content-revision"]').getAttribute('content'),state.revision);
    for(const privateRoute of ['diary/','api/diary','studio/']) {
      const response=await page.request.get(new URL(privateRoute,url).href);
      assert.equal(response.status(),404);
    }
  }
  await page.locator('.today-letter .letter-content p').filter({hasNotText:'正在翻开'}).first().waitFor();
  const publishedContent=JSON.parse(await fs.readFile('.publish-build/site/src/content/site.json','utf8'));
  assert.equal((await page.locator('.hero-copy>p').textContent()).trim(),publishedContent.home.intro);
  assert.ok((await page.locator('.paper-brand').textContent()).includes(publishedContent.site.name));
  assert.equal((await page.locator('body').textContent()).includes('明日来信'),false);
  assert.equal(await page.locator('.archive-count small').evaluate(el=>getComputedStyle(el).fontSize),'10px');
  assert.equal(await page.getByRole('link',{name:'私人空间'}).count(),0);
  assert.equal(await page.getByRole('link',{name:'内容工作室'}).count(),0);
  await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));
  await fs.mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/pages-desktop.png',fullPage:true});
  for(const [label,route] of [['随笔','blog'],['摄影','gallery'],['关于我','about']]) {
    await page.getByRole('navigation').getByRole('link',{name:label,exact:true}).click();
    await page.waitForURL(`**${base}/${route}/`);
    assert.equal(await page.locator('h1').count(),1);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${route} must fit a mobile screen`);
    for (const picture of await page.locator('img').all()) await picture.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:`test-results/pages-${route}-mobile.png`,fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
  }
  await page.goto(url);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'test-results/pages-mobile.png',fullPage:true});
  assert.deepEqual(apiRequests,[]);
  assert.deepEqual(errors,[]);
  console.log('Pages check passed: public-only output, nested links, photos, mobile layout, zero API requests.');
} finally {await browser.close();server.close();}
