const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [390,1280]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html#real');await p.waitForTimeout(400);
const r=await p.evaluate(async()=>{const bad=[];const sleep=t=>new Promise(r=>setTimeout(r,t));
 for(const c of CASES){ const card=document.querySelector(`[data-case="${c.id}"]`); if(!card){bad.push('nocard '+c.id);continue;} card.click(); await sleep(5);
  for(let s=0;s<c.steps.length;s++){ const bi=c.steps[s].o.findIndex(o=>o.g===2); const b=document.querySelector(`[data-cpick="${s}:${bi}"]`); if(!b){bad.push('nopick '+c.id+' '+s);break;} b.click(); await sleep(2);
   if(s<c.steps.length-1){const n=document.querySelector('#cNext'); if(!n){bad.push('nonext '+c.id+' '+s);break;} n.click(); await sleep(2);} }
  const h=document.querySelector('.score h3'); if(!h||!/100%/.test(h.textContent)) bad.push('score '+c.id+' '+(h&&h.textContent));
  const l=document.querySelector('#cList'); if(l) l.click(); await sleep(3); }
 return {bad, n:CASES.length, sw:document.documentElement.scrollWidth};});
console.log(w, JSON.stringify(r));}
console.log('errors',errs);await b.close();})();
