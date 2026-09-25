const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
const go=async(ep,label,i,f)=>{await p.evaluate(([ep,label,i])=>{arenaTab='story';stStart(ep);ST.label=label;ST.i=i;stRun();renderArena();},[ep,label,i]);await p.waitForTimeout(1500);await p.screenshot({path:f});};
await go('ep_mind','sister',1,'m1.png'); await go('ep_coop','start',2,'m2.png'); await go('ep_grandpa','start',2,'m3.png');
await p.evaluate(()=>{ST=null;G=null;arenaTab='game';gStart('p_coop');renderArena();}); await p.waitForTimeout(800); await p.screenshot({path:'m4.png'});
console.log(await p.evaluate(()=>[artNpc('p_coop','angry'),artNpc('p_grandpa','angry'),artNpc('p_grandpa','normal')]));
console.log('errors',errs);await b.close();})();
