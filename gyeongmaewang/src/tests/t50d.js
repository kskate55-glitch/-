const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
console.log(await p.evaluate(()=>{ OF_SPOT='board'; arenaTab='office'; renderArena(); return bdRec().items.map(i=>i.kind+':'+(i.prop||i.decoy)+':'+i.status); }));
await p.screenshot({path:'bd_m.png'}); await b.close();})();
