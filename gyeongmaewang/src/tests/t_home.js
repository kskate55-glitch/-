const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:490,height:900}});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
console.log(await p.evaluate(()=>{ localStorage.clear(); page='arena'; lfNew('dohyun'); lfRec().intro=false; arenaTab='home'; renderArena(); return [...document.querySelectorAll('.kc-menu > *')].map(e=>e.outerHTML.slice(0,260)).join('\n'); }));
await p.waitForTimeout(500); await p.screenshot({path:'home_now.png'}); await b.close();})();
