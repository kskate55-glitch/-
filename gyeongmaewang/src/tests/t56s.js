const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); const bad=[]; p.on('response',r=>{ if(r.status()>=400) bad.push(r.status()+' '+r.url()); }); p.on('pageerror',e=>bad.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8790/index.html'); await p.waitForTimeout(900);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; renderArena(); }); await p.waitForTimeout(1200);
 console.log(await p.evaluate(()=>[document.querySelector('.lf-me')&&document.querySelector('.lf-me').complete&&document.querySelector('.lf-me').naturalWidth, artUrl('npc_playerf_happy'), artUrl('bg_base_sillim')]));
 console.log('bad', bad); await b.close(); })();
