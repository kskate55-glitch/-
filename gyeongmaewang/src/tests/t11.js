const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [390,1280]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html#real');await p.waitForTimeout(400);
if(w===390) await p.screenshot({path:'k1.png'});
const ids=await p.evaluate(()=>CASES.map(c=>c.id));
for(const id of ids){ try{await p.click(`[data-case="${id}"]`,{timeout:4000});}catch(e){console.log("FAIL",id,e.message.split("\n")[0]);break;}
  const n=await p.evaluate(id=>CASES.find(c=>c.id===id).steps.length,id);
  for(let s=0;s<n;s++){ const best=await p.evaluate(([id,s])=>CASES.find(c=>c.id===id).steps[s].o.findIndex(o=>o.g===2),[id,s]);
    await p.click(`[data-cpick="${s}:${best}"]`); if(s<n-1) await p.click('#cNext'); }
  const h=await p.textContent('.score h3'); if(!/100%/.test(h)) console.log('bad',id,h);
  if(w===390&&id==='c02') await p.screenshot({path:'k2.png',fullPage:true});
  await p.click('#cList >> nth=0'); }
console.log(w,'done',ids.length,'scrollW',await p.evaluate(()=>document.documentElement.scrollWidth), 'rec',await p.evaluate(()=>Object.keys(S.cases).length));}
// regression: other real tabs still work
console.log('errors',errs);await b.close();})();
