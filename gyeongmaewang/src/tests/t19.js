const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const out=[];
for(const w of [390,1280]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html#arena');await p.waitForTimeout(400);
await p.evaluate(()=>{arenaTab='game';renderArena();}); await p.evaluate(()=>{gStart('p_hug');renderArena();}); await p.waitForTimeout(800);
await p.screenshot({path:`v1_${w}.png`});
for(const a of ['visit','order','msg']){ const el=await p.$(`[data-gact="${a}"]`); if(el){await el.click(); await p.waitForTimeout(700);} const c=await p.$('[data-gcard]'); if(c){await c.click();await p.waitForTimeout(300);} }
await p.screenshot({path:`v2_${w}.png`});
out.push(w+' '+(await p.textContent('.vn-box')).slice(0,80)+' sw '+await p.evaluate(()=>document.documentElement.scrollWidth));
await p.evaluate(()=>{arenaTab='art';renderArena();}); await p.waitForTimeout(200); out.push(w+' art '+(await p.textContent('.ag-best')));
}
console.log(out.join('\n'));console.log('errors',errs);await b.close();})();
