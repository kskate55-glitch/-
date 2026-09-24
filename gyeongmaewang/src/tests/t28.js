const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
await p.evaluate(()=>{const R=arenaRec();R.sp=5;R.skills={};arenaTab='game';G=null;renderArena();}); await p.waitForTimeout(300);
await p.click('[data-skup="2:0"]'); await p.click('[data-skup="2:0"]'); await p.click('[data-skup="0:0"]');
const t1=await p.evaluate(()=>[JSON.stringify(arenaRec().skills), skFree(), !!document.querySelector('[data-skup="0:1"]:not([disabled])'), !!document.querySelector('[data-skup="1:1"][disabled]')]);
if(w===1280) await p.screenshot({path:'g1.png',fullPage:false});
await p.click('[data-gstart="'+(await p.evaluate(()=>STAGES[0]))+'"]'); await p.waitForTimeout(900);
if(w===390) await p.screenshot({path:'g2.png'});
const intro=!!await p.$('.gi-card'); await p.click('.gi-card'); await p.waitForTimeout(300); const gone=!await p.$('.gi-card');
// 끝까지: 방문 → 큰 금액 제안 반복
for(let i=0;i<40 && !(await p.evaluate(()=>!!(G&&G.over)));i++){
  const c=await p.$('[data-gcard]'); if(c){await c.click();await p.waitForTimeout(100);continue;}
  const h=await p.$('[data-gact="hand_full"]'); if(h){await h.click();await p.waitForTimeout(150);continue;}
  const o=await p.$('[data-goffer="800"]'); if(o && i>0){await o.click();} else {const v=await p.$('[data-gact="visit"]'); if(v) await v.click(); else await (await p.$('[data-gact="wait"]')).click();}
  await p.waitForTimeout(120);}
await p.waitForTimeout(3200); if(w===1280) await p.screenshot({path:'g3.png',fullPage:true});
console.log(w, t1, 'intro',intro,gone, await p.evaluate(()=>[G.over&&G.over.grade, G.spGain, arenaRec().sp, [...document.querySelectorAll('.gt [data-count]')].map(e=>e.textContent).join('/'), G.log.filter(l=>/🌱/.test(l.t)).length]));
await p.evaluate(()=>{G=null;arenaTab='story';stStart('ep_senior');renderArena();}); await p.waitForTimeout(400);
const si=!!await p.$('.st-intro'); await p.click('.vn.story',{position:{x:30,y:30}}); await p.waitForTimeout(200);
console.log('story intro', si, await p.evaluate(()=>[ST.intro, ST.label, ST.i]));
}
console.log('errors',errs);await b.close();})();
