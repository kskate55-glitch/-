const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('dialog',d=>d.accept()); p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} }); await p.waitForTimeout(800);
 console.log(await p.evaluate(()=>[typeof stgApply, typeof stgActive==='function'&&stgActive(), page, arenaTab, K.step, !!K.sealed, !!K.revealing, !!document.querySelector('.stg-dock')]));
 console.log(await p.evaluate(()=>{ try{ stgApply(); return !!document.querySelector('.stg-dock'); }catch(e){ return 'E '+e.message; } }));
 await b.close(); })();
