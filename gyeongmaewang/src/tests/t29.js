const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
// 호감: 은하늘 visit → 첫 선택(설명) trust +2
await p.evaluate(()=>{arenaTab='story';stStart('ep_youth');ST.intro=false;ST.label='visit';ST.i=0;stRun();renderArena();}); await p.waitForTimeout(300);
for(let i=0;i<6 && !(await p.$('[data-stpick]'));i++){ await p.keyboard.press('Space'); await p.waitForTimeout(50); await p.keyboard.press('Space'); await p.waitForTimeout(100);}
await p.click('[data-stpick="0"]'); await p.waitForTimeout(500);
const pop=await p.evaluate(()=>[document.querySelector('.vn-pop')&&document.querySelector('.vn-pop').textContent, document.querySelectorAll('.st-hearts i.on').length]);
if(w===1280) await p.screenshot({path:'h1.png',clip:{x:160,y:245,width:960,height:540}});
// 두 사람 무대: 장미자 sister
await p.evaluate(()=>{stStart('ep_mind');ST.intro=false;ST.mainEx='worried';ST.label='sister';ST.i=0;stRun();renderArena();}); await p.waitForTimeout(1300);
const pair=await p.evaluate(()=>[...document.querySelectorAll('.vn.story .vn-sprite')].map(e=>e.className));
await p.screenshot({path:`h2_${w}.png`});
// 오토
await p.evaluate(()=>{stStart('ep_senior');renderArena();}); await p.click('[data-stauto]'); const i0=await p.evaluate(()=>ST.i);
await p.waitForTimeout(9000); const i1=await p.evaluate(()=>[ST.label,ST.i]);
await p.click('[data-stauto]');
// 스킵: 방금 읽은 대사 다시
await p.evaluate(()=>{stStart('ep_senior');ST.intro=false;renderArena();}); await p.waitForTimeout(200);
const sk0=await p.evaluate(()=>[ST.label,ST.i, !document.querySelector('[data-stskip]').disabled]);
await p.click('[data-stskip]'); const sk1=await p.evaluate(()=>[ST.label,ST.i,!!(stNode()||{}).menu]);
console.log(w,'pop',pop,'pair',pair,'auto',i0,i1,'skip',sk0,sk1);}
console.log('errors',errs);await b.close();})();
