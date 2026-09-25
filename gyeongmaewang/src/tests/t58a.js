const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} }); await p.waitForTimeout(1800);
 for(const r of ['trade','docs']){ await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){ await el.click(); await p.waitForTimeout(300);} }
 await p.waitForTimeout(1500);
 console.log(w, await p.evaluate(()=>{ const root=document.getElementById('kfsRoot'); return [document.documentElement.scrollHeight, [...(root||document.body).querySelectorAll('.panel, .ke-cards, .vn, .kfs-stage, section > div')].slice(0,40).map(e=>e.className.slice(0,40)+':'+Math.round(e.getBoundingClientRect().top)+'/'+Math.round(e.getBoundingClientRect().height)).join('\n')]; }));
 await p.screenshot({path:`brief_${w}.png`, fullPage:true}); await p.evaluate(()=>localStorage.clear()); await p.close(); }
await b.close();})();
