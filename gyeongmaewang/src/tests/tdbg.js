const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html#real');await p.waitForTimeout(400);
const r=await p.evaluate(()=>{const out=[];for(const c of CASES){const el=document.querySelector(`[data-case="${c.id}"]`);if(!el)out.push('nocard '+c.id+' '+c.cat);}return out;});
console.log(r.slice(0,20), errs);await b.close();})();
