const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(300); await p.evaluate(()=>{try{cpUnlockAll()}catch(e){}}); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; K=null; arenaTab='life'; LF_PICK='mijeong'; renderArena(); }); await p.waitForTimeout(600);
 await p.screenshot({path:`mj_sel_${w}.png`});
 await p.click('[data-lfstart="mijeong"]'); await p.waitForTimeout(1500); await p.click('#gxOp'); await p.waitForTimeout(2600); await p.screenshot({path:`mj_op_${w}.png`});
 await p.click('[data-gxskip]'); await p.waitForTimeout(300); await p.click('[data-gxskip]'); await p.waitForTimeout(1300); await p.screenshot({path:`mj_base_${w}.png`});
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
await b.close();})();
