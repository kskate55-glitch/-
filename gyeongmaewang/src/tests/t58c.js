const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} }); await p.waitForTimeout(1500);
 console.log(await p.evaluate(()=>{ const pn=document.querySelector('.kfs-panel'); const out=[]; const walk=(el,d)=>{ for(const c of el.children){ const r=c.getBoundingClientRect(); out.push('  '.repeat(d)+c.tagName+'.'+(c.className||'').toString().slice(0,40)+' h='+Math.round(r.height)+' "'+(c.innerText||'').replace(/\s+/g,' ').slice(0,50)+'"'); if(d<1 && r.height>300) walk(c,d+1); } }; walk(pn,0); return out.join('\n'); }));
 console.log(await p.evaluate(()=>{ const s=document.querySelector('.kfs-stage'); return [...s.children].map(c=>c.tagName+'.'+c.className+' '+Math.round(c.getBoundingClientRect().height)).join('\n'); }));
 await b.close(); })();
