const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(900);
await p.evaluate(()=>{arenaTab='home';renderArena();}); await p.waitForTimeout(300);
await p.screenshot({path:`kc1_${w}.png`});
await p.click('[data-kcnew="career"]'); await p.waitForTimeout(3800); await p.screenshot({path:`kc2_${w}.png`});
await p.click('[data-kintro]'); await p.waitForTimeout(300);
for(const r of ['docs','site','neigh','broker']) { await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){await el.click(); await p.waitForTimeout(100);} }
await p.fill('#kPredSale','15500'); await p.fill('#kPredRepair','400'); await p.fill('#kPredMove','14');
if(w===1280) await p.screenshot({path:'kc3.png',fullPage:true});
await p.fill('#kBid','12650'); await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-kcseal]'); await p.waitForTimeout(300); await p.click('[data-kbid]'); await p.waitForTimeout(6000); await p.waitForTimeout(700);
if(w===1280) await p.screenshot({path:'kc4.png'});
const rev=await p.evaluate(()=>!!document.querySelector('.kc-reveal'));
await p.waitForTimeout(1600);
const st=await p.evaluate(()=>[K.step,!!document.querySelector('.kc-reveal'),JSON.stringify(K.pred)]); console.log(w,'reveal',rev,st);
if(st[0]!=="won"){ continue; }
await p.evaluate(()=>{ K.step='move'; let g=0; while(K.step==='move'&&g++<60){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){kTick(1);continue;} kMove(['listen','daughter','center','date'][g%4]); } kRepair('part'); kList(15500); renderArena();});
await p.waitForTimeout(300); if(w===1280) await p.screenshot({path:'kc5.png',fullPage:true});
for(let i=0;i<30 && await p.evaluate(()=>K.step==="sell");i++){ const a=await p.$('[data-ksale="accept"]'); if(a && i>0) await a.click(); else await p.click('[data-ksale="wait"]'); await p.waitForTimeout(60);}
await p.waitForTimeout(800); await p.screenshot({path:`kc6_${w}.png`,fullPage:true});
console.log(w, await p.evaluate(()=>[K.step, K.final.biz, K.final.judge.g, K.final.cashBefore, K.final.cashAfter, JSON.stringify(K.final.goals), kcRec().cases, document.documentElement.scrollWidth]));
await p.click('[data-kshare]'); await p.waitForTimeout(200);
await p.click('[data-kstart]'); await p.waitForTimeout(300); console.log(w,'next', await p.evaluate(()=>[K.mode,K.caseNo,K.intro]));
await p.evaluate(()=>{arenaTab='rec';renderArena();}); await p.waitForTimeout(300); await p.screenshot({path:`kc7_${w}.png`,fullPage:true});
await p.evaluate(()=>{arenaTab='home';renderArena();}); await p.click('[data-kcnew="weekly"]'); await p.waitForTimeout(200);
console.log(w,'weekly', await p.evaluate(()=>[K.mode,K.week,K.seed, K.rivals.map(r=>r.t).join(',')]));
console.log(w,'sw',await p.evaluate(()=>document.documentElement.scrollWidth));
}
console.log('errors',errs);await b.close();})();
