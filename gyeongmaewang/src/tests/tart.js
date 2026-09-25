const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [390,1280]){const p=await b.newPage({viewport:{width:w,height:1000}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html#real');await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelectorAll('.ccard')[40].scrollIntoView());await p.waitForTimeout(200);
await p.screenshot({path:`a${w}.png`});
console.log(w, await p.evaluate(()=>[document.querySelectorAll('.cart').length, document.querySelectorAll('.cart-bub').length, document.documentElement.scrollWidth]));}
console.log(errs);await b.close();})();
