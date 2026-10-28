/* Run: NODE_PATH=$CODEX_PRIMARY_RUNTIME_NODE_MODULES node qa/browser.cjs
 * Chromium contract fixture, not a claim of real Android/SillyTavern validation.
 * SM_MEDIA_DIR optionally points to read-only downloaded official cover.png/inner.png.
 */
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');const assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),out=process.env.SM_QA_OUTPUT||__dirname;
const bundle=fs.readFileSync(path.join(base,'dist/steel-maidens-mvu.js'),'utf8');
const checks=[];
const fixture=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:QA-CJK;src:url('/qa-font')}body,.sm-mvu{font-family:QA-CJK,system-ui!important}body{margin:0;background:#26292d;color:white}#chat{width:100%}.mes_text{width:100%;box-sizing:border-box}.mes{margin:0}</style><div id="sheld"><div id="chat"><div class="mes" mesid="0"><div class="mes_text">开场</div></div></div></div><script>
window.rows=[{message_id:0,message:''}];window.handlers=new Map();window.rejected=false;window.playCount=0;window.loadCount=0;
window.$=fn=>fn();window.getLastMessageId=()=>rows.length-1;window.getChatMessages=()=>rows;
window.tavern_events=Object.fromEntries(['CHARACTER_MESSAGE_RENDERED','MESSAGE_RECEIVED','MESSAGE_UPDATED','MESSAGE_SWIPED','MESSAGE_DELETED','CHAT_CHANGED'].map(x=>[x,x]));
window.Mvu={events:{VARIABLE_INITIALIZED:'mag_variable_initiailized',VARIABLE_UPDATE_ENDED:'mag_variable_update_ended'}};
window.eventOn=(name,fn)=>{if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);return{stop(){handlers.get(name).delete(fn)}}};
window.emit=name=>[...(handlers.get(name)||[])].forEach(fn=>fn());
Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{get(){return this._time||0},set(value){this._time=value}});
Object.defineProperty(HTMLMediaElement.prototype,'paused',{get(){return this._paused!==false}});
HTMLMediaElement.prototype.play=function(){window.playCount++;if(window.rejected)return Promise.reject(new DOMException('Blocked','NotAllowedError'));this._paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve()};
HTMLMediaElement.prototype.pause=function(){this._paused=true;this.dispatchEvent(new Event('pause'))};
HTMLMediaElement.prototype.load=function(){window.loadCount++;this.currentTime=0};
window.block=(a=43,b=-20,delta='+3',reason='已协助救援')=>'<causality>\\n汽车人好感: '+a+'/100｜本回合: '+delta+'｜原因: '+reason+'\\n霸天虎好感: '+b+'/100｜本回合: -5｜原因: 任务受阻\\n</causality>';
window.paint=()=>{document.querySelector('#chat').innerHTML=rows.map((m,i)=>'<div class="mes" mesid="'+i+'"><div class="mes_text">正文</div></div>').join('')};
<\/script>`;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{if(req.url==='/qa-font'){const p=process.env.SM_MEDIA_DIR&&path.join(process.env.SM_MEDIA_DIR,'cjk.otf');if(p&&fs.existsSync(p)){res.setHeader('Content-Type','font/otf');return res.end(fs.readFileSync(p))}res.statusCode=404;return res.end()}res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fixture)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.SM_CHROMIUM||undefined}).catch(error=>{server.close();throw error});
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://raw.githubusercontent.com/**',route=>{
  const url=decodeURI(route.request().url());let file=url.includes('MVU锁屏')?'cover.png':url.includes('MVU内页')?'inner.png':null;
  const asset=file&&process.env.SM_MEDIA_DIR&&path.join(process.env.SM_MEDIA_DIR,file);
  if(asset&&fs.existsSync(asset))return route.fulfill({path:asset,contentType:'image/png'});
  if(url.endsWith('.mp3')) {
   const wav=Buffer.alloc(8044);wav.write('RIFF');wav.writeUInt32LE(8036,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(8000,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(8000,40);wav.fill(128,44);
   return route.fulfill({body:wav,contentType:'audio/wav'});
  }
  return route.abort();
 });
 const check=async(name,fn)=>{await fn();checks.push({name,status:'PASS'})};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({content:bundle});
  const evalState=()=>page.evaluate(()=>({roots:document.querySelectorAll('.sm-mvu').length,audios:document.querySelectorAll('[data-steel-maidens-audio]').length,values:[...document.querySelectorAll('.sm-value')].map(e=>e.textContent),songs:document.querySelectorAll('.sm-song').length}));
  await check('official images load or failure leaves gradient and operable controls',async()=>{await page.waitForFunction(()=>[...document.querySelectorAll('.sm-art')].every(i=>i.complete));assert.ok(await page.locator('.sm-art').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth>0||i.hidden)))});
  await check('first-floor mount, single root/audio, zero state, no startup media preload',async()=>{assert.deepEqual(await evalState(),{roots:1,audios:1,values:['0','0'],songs:6});assert.equal(await page.locator('audio').getAttribute('src'),null)});
  await check('unlock theme, denied play remains usable, manual retry',async()=>{
   await page.evaluate(()=>window.rejected=true);await page.locator('.sm-unlock').click();await page.waitForTimeout(20);
   assert.equal(await page.locator('.sm-inner').isVisible(),true);assert.equal(await page.locator('.sm-status').textContent(),'点击播放');assert.match(await page.locator('audio').getAttribute('src'),/Crystal%20Heart/);
   await page.evaluate(()=>window.rejected=false);await page.locator('[data-music="play"]').click();assert.equal(await page.locator('.sm-status').textContent(),'播放中');
  });
  await check('new message and role missing, two gauges from complete block',async()=>{
   await page.evaluate(()=>{rows.push({message_id:1,message:block()});paint();emit('CHARACTER_MESSAGE_RENDERED')});await page.waitForTimeout(30);assert.deepEqual((await evalState()).values,['43','-20']);
   const fill=await page.locator('.sm-fill').evaluateAll(es=>es.map(e=>[e.style.top,e.style.height]));assert.deepEqual(fill,[['28.5%','21.5%'],['50%','10%']]);
  });
  await check('return/reenter, details and redraw preserve audio identity/time/play state',async()=>{
   await page.evaluate(()=>{window.savedAudio=document.querySelector('audio');savedAudio.currentTime=37;window.savedPlays=playCount});
   await page.locator('.sm-gauge').first().click();assert.equal(await page.locator('.sm-detail-title').textContent(),'汽车人');await page.locator('.sm-gauge').nth(1).click();assert.equal(await page.locator('.sm-detail-title').textContent(),'霸天虎');
   await page.locator('.sm-lock').click();assert.equal(await page.locator('.sm-detail').isVisible(),false);await page.locator('.sm-unlock').click();
   await page.evaluate(()=>{paint();emit('MESSAGE_UPDATED');emit('mag_variable_initialized')});await page.waitForTimeout(30);
   assert.deepEqual(await page.evaluate(()=>[savedAudio===document.querySelector('audio'),savedAudio.currentTime,playCount===savedPlays]),[true,37,true]);
  });
  await check('malformed/latest fallback, edit/swipe/delete, extremes',async()=>{
   await page.evaluate(()=>{rows.push({message_id:2,message:block(101)});paint();emit('MESSAGE_UPDATED')});await page.waitForTimeout(30);assert.deepEqual((await evalState()).values,['43','-20']);
   await page.evaluate(()=>{rows[2].message=block(-100,100);emit('MESSAGE_SWIPED')});await page.waitForTimeout(30);assert.deepEqual((await evalState()).values,['-100','100']);
   assert.deepEqual(await page.locator('.sm-stage').allTextContents(),['不死不休','生死与共']);
   await page.evaluate(()=>{rows[2].message=block(1,1,'1.5');emit('MESSAGE_UPDATED')});await page.waitForTimeout(30);assert.deepEqual((await evalState()).values,['43','-20']);
   await page.evaluate(()=>{rows.pop();paint();emit('MESSAGE_DELETED')});await page.waitForTimeout(30);assert.deepEqual((await evalState()).values,['43','-20']);
  });
  await check('library scroll, select/highlight, cyclic prev/next, ended and network error',async()=>{
   await page.locator('[data-music="library"]').click();assert.equal(await page.locator('.sm-library').evaluate(e=>getComputedStyle(e).overflowY),'auto');await page.locator('[data-track="5"]').click();assert.equal(await page.locator('[data-track="5"]').getAttribute('aria-current'),'true');
   await page.locator('[data-music="next"]').click();assert.equal(await page.locator('[data-track="0"]').getAttribute('aria-current'),'true');await page.locator('[data-music="prev"]').click();assert.equal(await page.locator('[data-track="5"]').getAttribute('aria-current'),'true');
   await page.evaluate(()=>document.querySelector('audio').dispatchEvent(new Event('ended')));assert.equal(await page.locator('[data-track="0"]').getAttribute('aria-current'),'true');
   await page.evaluate(()=>document.querySelector('audio').dispatchEvent(new Event('error')));assert.match(await page.locator('.sm-status').textContent(),/加载失败/);await page.locator('[data-music="next"]').click();assert.equal((await evalState()).audios,1);
  });
  for(const width of [248,278,320,360,390,412,430,560,690,860]){
   await page.setViewportSize({width,height:800});
   await check('layout/touch/drawer no gauge overlap at '+width+'px',async()=>{
    await page.locator('[data-music="library"]').click();
    const metrics=await page.evaluate(()=>{const root=document.querySelector('.sm-mvu'),dock=root.querySelector('.sm-dock').getBoundingClientRect(),gauges=root.querySelector('.sm-gauges').getBoundingClientRect();return {width:root.clientWidth,scroll:root.scrollWidth,doc:document.documentElement.scrollWidth,view:innerWidth,overlap:gauges.bottom>dock.top,targets:[...root.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return[r.width,r.height]})}});
    assert.ok(metrics.scroll<=metrics.width);assert.ok(metrics.doc<=metrics.view);assert.equal(metrics.overlap,false);assert.ok(metrics.targets.every(([w,h])=>w>=44&&h>=44));
    if(width===360)await page.screenshot({path:path.join(out,'narrow-inner.png'),fullPage:true});
    await page.locator('[data-music="library"]').click();
   });
  }
  await page.setViewportSize({width:360,height:800});await page.locator('.sm-lock').click();await page.screenshot({path:path.join(out,'narrow-cover.png'),fullPage:true});await page.locator('.sm-unlock').click();
  await check('observer only fallback refreshes edited native data, singleton after many redraws',async()=>{
   await page.evaluate(()=>{rows[1].message=block(20,40);paint()});await page.waitForTimeout(50);assert.deepEqual((await evalState()).values,['20','40']);
   for(let i=0;i<5;i++)await page.evaluate(()=>{paint();emit('MESSAGE_UPDATED')});await page.waitForTimeout(50);assert.equal((await evalState()).roots,1);assert.equal((await evalState()).audios,1);
  });
  await check('chat change disposes old audio, resets context, retains one subscription set',async()=>{
   await page.evaluate(()=>{window.oldAudio=document.querySelector('audio');rows=[{message_id:0,message:''}];emit('CHAT_CHANGED');paint()});await page.waitForTimeout(550);
   assert.deepEqual(await page.evaluate(()=>[oldAudio.isConnected,oldAudio.getAttribute('src'),document.querySelectorAll('audio').length]),[false,null,1]);assert.deepEqual((await evalState()).values,['0','0']);assert.equal(await page.locator('.sm-cover').isVisible(),true);
  });
  await check('script reload replaces singleton/listeners; pagehide clears all owned resources',async()=>{
   await page.addScriptTag({content:bundle});assert.equal((await evalState()).roots,1);assert.equal((await evalState()).audios,1);assert.ok(await page.evaluate(()=>[...handlers.values()].every(s=>s.size===1)));
   await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal((await evalState()).roots,0);assert.equal((await evalState()).audios,0);assert.ok(await page.evaluate(()=>[...handlers.values()].every(s=>s.size===0)));
  });
  assert.deepEqual(errors,[]);checks.push({name:'no unhandled page errors',status:'PASS'});
 }catch(e){checks.push({name:'browser suite',status:'FAIL',error:e.stack});throw e}
 finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({environment:'Headless Chromium, emulated mobile/touch, fixture host APIs and media events',real_android_sillytavern_tested:false,checks},null,2)+'\n');await browser.close();server.close();}
 console.log(checks.length+' browser checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
