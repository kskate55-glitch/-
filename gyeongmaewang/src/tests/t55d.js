const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}}); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(300); await p.evaluate(()=>{try{cpUnlockAll()}catch(e){}}); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; K=null; arenaTab='life'; LF_PICK='taesik'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-lfstart="taesik"]'); await p.waitForTimeout(9000);
 console.log(await p.evaluate(()=>{ const out=[]; let e=document.querySelector('.gx-text'); while(e){ const s=getComputedStyle(e); out.push(e.tagName+'.'+e.className+' op='+s.opacity+' f='+s.filter+' col='+s.color); e=e.parentElement;} const t=document.elementFromPoint(195,750); out.push('top@box: '+t.tagName+'.'+t.className); return out.join('\n'); }));
 await b.close();})();
