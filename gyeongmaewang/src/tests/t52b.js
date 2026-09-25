const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(500);
await p.evaluate(()=>{ lfNew('seoyun'); arenaTab='life'; renderArena(); }); await p.waitForTimeout(5000); await p.screenshot({path:`lf_intro2_${w}.png`}); }
await b.close();})();
