const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(700);
await p.evaluate(()=>{hubRec().cleared['king:k1']=1; kcRec().cases=1; arenaTab='home';renderArena();}); await p.waitForTimeout(1000); await p.screenshot({path:`c2_0_${w}.png`});
await p.click('[data-kcnew="career"][data-prop="k2"]'); await p.waitForTimeout(600); await p.click('[data-kintro]'); await p.waitForTimeout(500);
for(const r of ['docs','down','park','bank']){ await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){await el.click(); await p.waitForTimeout(150);} }
await p.screenshot({path:`c2_1_${w}.png`});
await p.fill('#kBid','14200'); await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-kcseal]'); await p.waitForTimeout(300); await p.click('[data-kbid]'); await p.waitForTimeout(9000);
const st=await p.evaluate(()=>K.step); console.log(w,'after bid',st); if(st!=='won'){ await p.screenshot({path:`c2_lost_${w}.png`}); continue; }
await p.click('[data-k2="go:cross"]'); await p.waitForTimeout(700); await p.screenshot({path:`c2_2_${w}.png`});
await p.click('[data-k2="cross:go"]'); await p.waitForTimeout(900); await p.click('[data-k2="move:ask"]'); await p.waitForTimeout(1500); await p.screenshot({path:`c2_3_${w}.png`});
await p.click('[data-k2="move:paper"]'); await p.waitForTimeout(400); await p.click('[data-k2="offer:50"]'); await p.waitForTimeout(400); await p.click('[data-k2="move:wait"]'); await p.waitForTimeout(900); await p.screenshot({path:`c2_4_${w}.png`});
await p.click('[data-k2="fix:fix"]'); await p.waitForTimeout(500); await p.click('[data-k2="list:15900"]'); await p.waitForTimeout(700); await p.screenshot({path:`c2_5_${w}.png`});
for(let i=0;i<25 && await p.evaluate(()=>K.step==='sell');i++){ const c=await p.$('[data-k2="sell:check"]')||await p.$('[data-k2="sell:accept"]'); if(c) await c.click(); else await p.click('[data-k2="sell:wait"]'); await p.waitForTimeout(120);}
await p.waitForTimeout(2500); await p.screenshot({path:`c2_6_${w}.png`});
console.log(w, await p.evaluate(()=>[K.step, Math.round(K.final.profit), K.final.k2.og, K.final.k2.otitle, K.final.biz, K.final.judge.g, kcRec().history[0].biz]));
}
console.log('errors',errs);await b.close();})();
