const { chromium } = require('playwright');
(async()=>{const TESTP=process.argv[2]||'p_hug';const b=await chromium.launch();const errs=[];const out=[];
for(const w of [390,1280]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
await p.click('[data-atab="game"]'); await p.evaluate((t)=>{gStart(t);renderArena();},TESTP); await p.waitForTimeout(800);
await p.screenshot({path:`v1_${w}.png`});
for(const a of ['visit','order','msg']){ const el=await p.$(`[data-gact="${a}"]`); if(el){await el.click(); await p.waitForTimeout(700);} const c=await p.$('[data-gcard]'); if(c){await c.click();await p.waitForTimeout(300);} }
await p.screenshot({path:`v2_${w}.png`});
out.push(w+' '+(await p.textContent('.vn-box')).slice(0,80)+' sw '+await p.evaluate(()=>document.documentElement.scrollWidth));
await p.click('[data-atab="art"]'); await p.waitForTimeout(200); out.push(w+' art '+(await p.textContent('.ag-best')));
}
console.log(out.join('\n'));console.log('errors',errs);await b.close();})();
