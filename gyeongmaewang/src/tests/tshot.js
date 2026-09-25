const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
await p.goto('file://'+process.cwd()+'/rights-study.html#real');await p.waitForTimeout(400);
await p.click('[data-case="c100"]');await p.waitForTimeout(200);await p.screenshot({path:'n1.png'});
const k=await p.evaluate(()=>['c93','c96','c98','c99','c100','c102','c103','c105','c106'].map(id=>id+':'+caseKey(CASES.find(c=>c.id===id))));console.log(k.join(' '));
await b.close();})();
