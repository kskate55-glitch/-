const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
await p.click('[data-atab="game"]'); await p.waitForTimeout(1800); await p.screenshot({path:`k5_${w}.png`,clip:{x:0,y:200,width:w,height:w<500?420:480}});
console.log(w, await p.evaluate(()=>getComputedStyle(document.querySelector('.vn-title h3')).color));
await p.click('.vn-title [data-atab="story"]'); await p.waitForTimeout(200); console.log('story tab', await p.evaluate(()=>arenaTab));}
console.log('errors',errs);await b.close();})();
