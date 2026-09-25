const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://'+process.cwd()+'/rights-study.html#note');
 console.log(await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('rights-notes-v1')||'{}')).map(n=>n.body.includes('가장 빠른 돈')+' '+n.body.includes('건물철거')).join()));
 await b.close(); })();
