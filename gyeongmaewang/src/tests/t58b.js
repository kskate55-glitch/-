const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}});
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; renderArena(); }); await p.waitForTimeout(400);
 const btns = await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>/소리/.test(e.textContent)&&e.children.length<3&&e.offsetParent&&e.getBoundingClientRect().top<60).map(e=>e.tagName+'.'+e.className+' '+JSON.stringify(e.getBoundingClientRect()).slice(0,80)));
 console.log(w, btns);
 const s = await p.$('summary:has-text("소리"), button:has-text("소리")'); if(s){ await s.click(); await p.waitForTimeout(400); }
 await p.screenshot({path:`snd_${w}.png`});
 console.log(await p.evaluate(()=>{ const m=document.querySelector('.kc-audio, .kc-sfx-menu, details[open]'); if(!m) return 'none'; const r=m.getBoundingClientRect(); const cs=getComputedStyle(m); return m.className+' '+JSON.stringify(r)+' z='+cs.zIndex+' pos='+cs.position; }));
 await p.close(); }
await b.close();})();
