const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
await p.goto('file://'+process.cwd()+'/rights-study.html#real');await p.waitForTimeout(400);
const f=async(l)=>console.log(l,await p.evaluate(()=>{const W=document.documentElement.clientWidth;return [document.documentElement.scrollWidth,[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>W+0.5).slice(0,4).map(e=>e.tagName+'.'+e.className+':'+Math.round(e.getBoundingClientRect().right))]}));
await f('list'); await p.click('[data-case="c02"]'); await f('play');
await b.close();})();
