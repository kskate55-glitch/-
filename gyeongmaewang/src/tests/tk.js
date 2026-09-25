const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+process.cwd()+'/rights-study.html#real');await p.waitForTimeout(300);
console.log(await p.evaluate(()=>{const c={};CASES.forEach(x=>{const k=caseKey(x);c[k]=(c[k]||0)+1});return JSON.stringify(Object.entries(c).sort((a,b)=>b[1]-a[1]))}));
console.log(await p.evaluate(()=>Object.keys(SCENES).length));await b.close();})();
