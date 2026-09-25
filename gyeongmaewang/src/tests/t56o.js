const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); const bad=[]; p.on('response',r=>{ if(r.status()>=400) bad.push(r.status()+' '+r.url()); });
 await p.goto('http://localhost:8790/index.html'); await p.waitForTimeout(1500); console.log('bad', bad); await b.close(); })();
