import test from 'node:test';
import assert from 'node:assert/strict';
import { latestCausality, parseBlock, stage } from '../src/causality.mjs';
import { createPlayer } from '../src/player.mjs';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync(new URL('../../../mvu/music-manifest.v1.json',import.meta.url)));
const body=(a=43,b=-20,delta='+3',reason='已协助救援')=>`汽车人好感: ${a}/100｜本回合: ${delta}｜原因: ${reason}\n霸天虎好感: ${b}/100｜本回合: -5｜原因: 任务受阻`;
const block=(...args)=>`<causality>\n${body(...args)}\n</causality>`;
test('latest complete block and missing-role compatibility; user/system/tool excluded',()=>{
 const data=latestCausality([{message:block()},{role:'user',message:block(99)},{is_user:true,message:block(98)},{is_system:true,message:block(97)},{role:'tool',message:block(96)}]);
 assert.equal(data.factions[0].value,43);
});
test('invalid whole blocks fall back together, never inherit half',()=>{
 for(const invalid of [body(101),body(0,0,'+2'),body(0,0,'1.5'),body(0,0,'+3','<b>坏</b>'),body().split('\n')[0],body()+'\n额外一行']) {
  assert.equal(parseBlock(invalid),null);
  const d=latestCausality([{message:block()},{message:`<causality>${invalid}</causality>`}]);
  assert.deepEqual(d.factions.map(f=>f.value),[43,-20]);
 }
});
test('last block within message, active native swipe, edit, deletion and no legal history',()=>{
 assert.equal(latestCausality([{message:block(1)+block(20)}]).factions[0].value,20);
 const m={mes:block(1),swipe_id:1,swipes:[block(1),block(60)]};
 assert.equal(latestCausality([m]).factions[0].value,60);
 m.swipe_id=0;assert.equal(latestCausality([m]).factions[0].value,1);
 assert.deepEqual(latestCausality([]).factions.map(f=>f.value),[0,0]);
});
test('all stage boundaries and extremes',()=>{
 const cases=[[-100,'不死不休'],[-80,'不死不休'],[-79,'敌视'],[-50,'敌视'],[-49,'对立'],[-20,'对立'],[-19,'警戒'],[-1,'警戒'],[0,'中立'],[19,'中立'],[20,'友善'],[39,'友善'],[40,'认可'],[59,'认可'],[60,'信赖'],[79,'信赖'],[80,'同盟'],[99,'同盟'],[100,'生死与共']];
 cases.forEach(([n,label])=>assert.equal(stage(n),label));
});
class Audio extends EventTarget {
 paused=true;src='';currentTime=0;error=null;playCalls=0;loadCalls=0;rejected=false;
 play(){this.playCalls++;if(this.rejected)return Promise.reject(new Error('NotAllowedError'));this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 load(){this.loadCalls++;this.currentTime=0;}
 removeAttribute(){this.src='';} remove(){this.removed=true;}
}
test('gesture starts theme, reentry preserves source/time and selected track',()=>{
 const a=new Audio(),p=createPlayer(a,manifest);assert.equal(a.src,'');p.enter();assert.equal(p.snapshot().track.id,'crystal-heart');a.currentTime=52;p.enter();assert.equal(a.currentTime,52);assert.equal(a.playCalls,1);p.choose(3);a.currentTime=18;p.enter();assert.equal(p.snapshot().current,3);assert.equal(a.currentTime,18);
});
test('autoplay rejection contained, user retry, no rebuild',async()=>{
 const a=new Audio();a.rejected=true;const p=createPlayer(a,manifest);p.enter();await new Promise(r=>setImmediate(r));assert.equal(p.snapshot().status,'点击播放');a.dispatchEvent(new Event('canplay'));assert.equal(p.snapshot().status,'点击播放');a.dispatchEvent(new Event('loadedmetadata'));assert.equal(p.snapshot().status,'点击播放');a.rejected=false;p.toggle();assert.equal(a.paused,false);assert.equal(a.loadCalls,1);
});
test('six-track loop in both directions and ended auto-next',()=>{
 const a=new Audio(),p=createPlayer(a,manifest);p.enter();p.step(-1);assert.equal(p.snapshot().current,5);a.dispatchEvent(new Event('ended'));assert.equal(p.snapshot().current,0);for(let i=1;i<=6;i++){p.step(1);assert.equal(p.snapshot().current,i%6);}
});
test('error is isolated; manual retry and next selection remain usable',()=>{
 const a=new Audio(),p=createPlayer(a,manifest);p.enter();a.error={code:4};a.dispatchEvent(new Event('error'));assert.deepEqual(p.snapshot().failures,[0]);p.step(1);assert.equal(p.snapshot().current,1);assert.match(p.snapshot().status,/播放中/);p.choose(0);assert.equal(p.snapshot().current,0);
});
test('stale play rejection cannot overwrite new song or pause; destroy removes listeners',async()=>{
 const a=new Audio();a.play=()=>new Promise((_,reject)=>{a.reject=reject;});const p=createPlayer(a,manifest);p.enter();const reject=a.reject;p.choose(1);reject(new Error());await new Promise(r=>setImmediate(r));assert.notEqual(p.snapshot().status,'点击播放');p.destroy();assert.equal(a.src,'');assert.equal(a.removed,true);const n=a.playCalls;a.dispatchEvent(new Event('ended'));assert.equal(a.playCalls,n);
});
test('manifest identity, order, titles and frozen URL mapping',()=>{
 assert.equal(manifest.default_track_id,'crystal-heart');assert.equal(manifest.tracks.length,6);
 assert.deepEqual(manifest.tracks.map(t=>t.order),[1,2,3,4,5,6]);assert.deepEqual(manifest.tracks.map(t=>t.theme),[true,false,false,false,false,false]);
 for(const t of manifest.tracks)assert.equal(decodeURI(t.url.split('/e5c9d07b12e8429f3a221e9f7eee12d899b12a40/')[1]),t.file);
});
