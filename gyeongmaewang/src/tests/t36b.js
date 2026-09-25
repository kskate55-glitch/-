const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(700);
await p.evaluate(()=>{arenaTab='home';renderArena();});
await p.click('[data-kcnew="career"]'); await p.waitForTimeout(400); await p.click('[data-kintro]'); await p.waitForTimeout(300);
for(const r of ['docs','site','neigh','broker']) { await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){await el.click(); await p.waitForTimeout(150);} }
await p.evaluate(()=>{ window._clk=[]; document.addEventListener('click',e=>_clk.push(e.target.outerHTML.slice(0,80)),true); });
await p.fill('#kPredSale','15500'); await p.fill('#kPredRepair','400'); await p.fill('#kPredMove','14'); await p.fill('#kBid','12650'); await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-kcseal]'); await p.waitForTimeout(300);
console.log(await p.evaluate(()=>[JSON.stringify(K&&K.sealed), _clk, arenaTab, K.step]));
await b.close();})();
