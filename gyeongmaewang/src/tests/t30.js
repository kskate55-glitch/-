const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
const go=async(ep,label,i,f,x)=>{await p.evaluate(([ep,label,i,x])=>{arenaTab='story';stStart(ep);ST.intro=false;if(x)Object.assign(ST,x);ST.label=label;ST.i=i;stRun();renderArena();},[ep,label,i,x]);await p.waitForTimeout(1300);await p.screenshot({path:f,clip:{x:160,y:245,width:960,height:540}});};
await go('ep_hwagyo','dog',0,'d1.png',{bg:'bg_realtor'}); await go('ep_grandpa','law',0,'d2.png'); await go('ep_coop','exam',0,'d3.png');
console.log('errors',errs);await b.close();})();
