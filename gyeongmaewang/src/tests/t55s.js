const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(300); await p.evaluate(()=>{try{cpUnlockAll()}catch(e){}}); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; K=null; arenaTab='life'; LF_PICK='taesik'; renderArena(); }); await p.waitForTimeout(500);
 await p.screenshot({path:`gx_sel2_${w}.png`});
 await p.click('[data-lfstart="taesik"]'); await p.waitForTimeout(9000); for(let i=0;i<4;i++){await p.click('#gxOp'); await p.waitForTimeout(300);} await p.waitForTimeout(1200);
 await p.screenshot({path:`gx_op2_${w}.png`}); await p.evaluate(()=>localStorage.clear()); await p.close(); }
await b.close();})();
