const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const m=await b.newPage({viewport:{width:390,height:844}});
await m.goto('http://localhost:8765/rights-study.html#arena'); await m.waitForTimeout(500);
console.log(await m.evaluate(()=>{ K_PROP_NEXT='k2'; kStart(4242); K.intro=false; for(let d=1;d<=24;d++){ K.cal0=Date.UTC(2026,6,d); if(snNow().W.id==='monsoon') break; } arenaTab='king'; renderArena(); return [document.getElementById('kfsRoot')&&document.getElementById('kfsRoot').className, !!document.querySelector('.sn-chip'), document.documentElement.scrollWidth, innerWidth, snAmbKey()]; }));
await b.close();})();
