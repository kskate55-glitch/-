const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}});
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('dohyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='calendar'; renderArena(); }); await p.waitForTimeout(500);
 const el = await p.$('.kfs-panel'); await el.screenshot({path:`cal_${w}.png`}); await p.close(); }
await b.close();})();
