const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
const go=async(ep,label,i,f)=>{await p.evaluate(([ep,label,i])=>{arenaTab='story';stStart(ep);ST.label=label;ST.i=i;stRun();renderArena();},[ep,label,i]);await p.waitForTimeout(1600);await p.screenshot({path:f});};
await go('ep_phishing','term',2,'n1.png'); await go('ep_pk','boss',0,'n2.png'); await go('ep_ghost','break',0,'n3.png');
await p.evaluate(()=>{ST=null;renderArena();}); await p.waitForTimeout(300); await p.screenshot({path:'n4.png',fullPage:true});
console.log('errors',errs);await b.close();})();
