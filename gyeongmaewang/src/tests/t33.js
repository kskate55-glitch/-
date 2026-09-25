const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});await p.addInitScript(()=>{window.MT_SKIP_TALE=true});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
await p.evaluate(()=>{arenaTab='king';renderArena();}); await p.waitForTimeout(1200); if(w===1280) await p.screenshot({path:'k1.png'});
await p.evaluate(()=>{kStart(4242);renderArena();}); await p.waitForTimeout(300);
for(const r of ['docs','site','neigh','broker']) { await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){await el.click(); await p.waitForTimeout(120);} }
if(w===1280) await p.screenshot({path:'k2.png',fullPage:true});
await p.fill('#kBid','12650'); await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-kcseal]'); await p.waitForTimeout(300); await p.click('[data-kbid]'); await p.waitForTimeout(6000); await p.waitForTimeout(2300);
if(w===1280) await p.screenshot({path:'k3.png',fullPage:true});
const st=await p.evaluate(()=>K.step); if(st!=="won"){ console.log(w,'lost'); continue; }
await p.click('[data-kgo="move"]'); await p.waitForTimeout(500);
const plan=['listen','daughter','center','date'];
for(let i=0;i<30 && await p.evaluate(()=>K.step==="move");i++){
  if(await p.$('[data-kflip]')){ await p.click('[data-kflip="0"]'); await p.waitForTimeout(80); continue;}
  if(await p.$('[data-koffer]')){ const need=await p.evaluate(()=>K.askNeed); const bt=await p.$(`[data-koffer="${[0,50,100,150,200,300].find(v=>v>=need)||300}"]`); await bt.click(); await p.waitForTimeout(80); continue;}
  if(await p.$('[data-kwait]')){ if(i===5 && w===1280) await p.screenshot({path:'k4.png',fullPage:true}); const pp=await p.$('[data-kmove="paper"]'); if(pp){await pp.click();} else await p.click('[data-kwait]'); await p.waitForTimeout(80); continue;}
  const m=plan[i%plan.length]; const el=await p.$(`[data-kmove="${m}"]`)||await p.$('[data-kmove="date"]'); await el.click(); await p.waitForTimeout(80);
  if(i===1 && w===1280) await p.screenshot({path:'k4.png',fullPage:false});
}
await p.waitForTimeout(400); if(w===1280) await p.screenshot({path:'k5.png',fullPage:true});
await p.click('[data-krep="part"]'); await p.waitForTimeout(300); await p.click('[data-klist="15800"]'); await p.waitForTimeout(300);
if(w===1280) await p.screenshot({path:'k6.png',fullPage:true});
for(let i=0;i<30 && await p.evaluate(()=>K.step==="sell");i++){ const a=await p.$('[data-ksale="accept"]'); if(a && i>1) await a.click(); else await p.click('[data-ksale="wait"]'); await p.waitForTimeout(80);}
await p.waitForTimeout(1500); await p.screenshot({path:`k7_${w}.png`,fullPage:true});
console.log(w, await p.evaluate(()=>[K.step, K.final&&Math.round(K.final.profit), K.day, document.documentElement.scrollWidth]));}
console.log('errors',errs);await b.close();})();
