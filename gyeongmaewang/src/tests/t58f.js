const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} window._log=[]; const o=kResearch; kResearch=function(id){ o(id); window._log.push(['res',id,K._newEv,JSON.stringify(STG)]); }; const r=renderArena; renderArena=function(){ window._log.push(['render',K&&K._newEv,STG.fresh]); r(); }; }); await p.waitForTimeout(1200);
 for(const r of ['trade','docs']){ await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){ await el.click(); await p.waitForTimeout(900);} }
 console.log(await p.evaluate(()=>JSON.stringify(window._log)), await p.evaluate(()=>[keCards().filter(keHas).length, STG.fresh, !!document.querySelector('.stg-tab.new')]));
 await b.close(); })();
