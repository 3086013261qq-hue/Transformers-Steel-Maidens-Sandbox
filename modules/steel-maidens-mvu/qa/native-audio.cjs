// Native Chromium media validation against unchanged, locally downloaded frozen MP3 bytes.
// SM_MEDIA_DIR: <track id>.mp3, cover.png, inner.png. No audio prototype mocks.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.resolve(base,'../../mvu/music-manifest.v1.json')));
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><div id="chat"><div class="mes" mesid="0"><div class="mes_text">开场</div></div></div>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.SM_CHROMIUM||undefined}).catch(e=>{server.close();throw e});
 const page=await browser.newPage({viewport:{width:390,height:844}});const requests=[],results=[];page.setDefaultTimeout(15000);
 await page.route('https://raw.githubusercontent.com/**',route=>{
  const url=decodeURI(route.request().url()),t=manifest.tracks.find(t=>decodeURI(t.url)===url);
  const file=t?t.id+'.mp3':url.includes('MVU锁屏')?'cover.png':'inner.png';
  if(t)requests.push(t.id);
  const data=fs.readFileSync(path.join(process.env.SM_MEDIA_DIR,file)),range=route.request().headers().range;
  if(t&&range){const match=range.match(/bytes=(\d+)-(\d*)/);if(match){const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),data.length-1):data.length-1;return route.fulfill({status:206,body:data.subarray(start,end+1),contentType:'audio/mpeg',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${data.length}`}})}}
  return route.fulfill({body:data,contentType:t?'audio/mpeg':'image/png',headers:{'Accept-Ranges':'bytes'}});
 });
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{window.$=fn=>fn();window.getChatMessages=()=>[{message_id:0,message:''}];window.getLastMessageId=()=>0;window.eventOn=()=>({stop(){}});window.tavern_events={}});
  await page.addScriptTag({content:fs.readFileSync(path.join(base,'dist/steel-maidens-mvu.js'),'utf8')});assert.equal(requests.length,0);
  await page.locator('.sm-unlock').click();await page.waitForFunction(()=>document.querySelector('audio').currentTime>0.1);
  console.log('theme played');results.push({name:'native gesture play advances Crystal Heart time; only current MP3 requested',status:'PASS'});assert.ok(requests.every(id=>id==='crystal-heart'));
  const identity=await page.evaluate(()=>{window.nativeAudio=document.querySelector('audio');return nativeAudio.currentTime});
  await page.locator('.sm-lock').click();await page.waitForTimeout(150);await page.locator('.sm-unlock').click();await page.locator('.sm-gauge').first().click();await page.locator('.sm-detail-close').click();await page.evaluate(()=>__steelMaidensMvu.refresh());
  assert.ok(await page.evaluate(t=>document.querySelector('audio')===nativeAudio&&!nativeAudio.paused&&nativeAudio.currentTime>t,identity));results.push({name:'native audio survives lock/details/numeric render with advancing time',status:'PASS'});
  for(let i=0;i<manifest.tracks.length;i++){
   await page.locator('[data-music="library"]').click();await page.locator('[data-track="'+i+'"]').click();
   await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.readyState>=2&&!a.paused&&a.currentTime>0.05});
   const data=await page.evaluate(()=>{const a=document.querySelector('audio');return {duration:a.duration,src:a.currentSrc,audios:document.querySelectorAll('[data-steel-maidens-audio]').length}});
   assert.equal(data.audios,1);assert.ok(data.duration>100);assert.equal(data.src,manifest.tracks[i].url);
   console.log('decoded',manifest.tracks[i].id);results.push({name:'native decode/play '+manifest.tracks[i].id,status:'PASS',duration_seconds:data.duration});
  }
  await page.evaluate(()=>{const a=document.querySelector('audio');a.currentTime=a.duration-1});await page.waitForTimeout(2000);console.log('end-state',await page.evaluate(()=>{const a=document.querySelector('audio');return[a.currentTime,a.duration,a.paused,a.ended,a.error?.message,document.querySelector('.sm-status').textContent]}));await page.waitForFunction(()=>document.querySelector('[data-track="0"]').getAttribute('aria-current')==='true');
  results.push({name:'native last track ended event loops to theme',status:'PASS'});
 }finally{
  fs.writeFileSync(path.join(process.env.SM_QA_OUTPUT||__dirname,'native-audio-results.json'),JSON.stringify({environment:'Headless Chromium native HTMLAudioElement, frozen MP3 bytes via local interception; no speaker listening or Android test',requests,checks:results},null,2)+'\n');
  await browser.close();server.close();
 }
 console.log(results.length+' native media checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
