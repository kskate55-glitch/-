const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
const go=async(ep,label,i,f)=>{await p.evaluate(([ep,label,i])=>{arenaTab='story';stStart(ep);ST.label=label;ST.i=i;stRun();renderArena();},[ep,label,i]);await p.waitForTimeout(1500);await p.screenshot({path:f,clip:{x:160,y:245,width:960,height:540}});};
await go('ep_mind','start',2,'q1.png'); await go('ep_youth','explain',1,'q2.png');
console.log('errors',errs);await b.close();})();
