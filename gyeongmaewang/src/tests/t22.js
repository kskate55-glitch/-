const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
await p.evaluate(()=>{arenaTab='story';ST=null;renderArena();}); await p.waitForTimeout(300); await p.screenshot({path:`k1_${w}.png`,fullPage:true});
await p.evaluate(()=>{stStart(process_ep='ep_greedy');renderArena();}).catch(async()=>{await p.evaluate(()=>{stStart('ep_greedy');renderArena();});});
await p.waitForTimeout(1500); await p.screenshot({path:`k2_${w}.png`});
for(let i=0;i<6 && !(await p.$('[data-stpick]'));i++){ await p.keyboard.press('Space'); await p.waitForTimeout(80); await p.keyboard.press('Space'); await p.waitForTimeout(900);} 
await p.waitForTimeout(900); await p.screenshot({path:`k3_${w}.png`});
}
console.log('errors',errs);await b.close();})();
