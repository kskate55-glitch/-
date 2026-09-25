const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:390,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html#real');await p.waitForTimeout(500);
await p.screenshot({path:'r1.png',fullPage:true});
// engine sanity over 3000 generated cases
const st=await p.evaluate(()=>{let bad=[];const sc={};for(let n=0;n<3000;n++){const c=realGen();const a=realAnalyze(c);
 const paid=a.table.reduce((s,r)=>s+r.got,0)+a.rest; if(Math.abs(paid-c.sale)>2) bad.push('pool '+paid+' '+c.sale);
 a.table.forEach(r=>{if(r.got>r.amt+1||r.got<0) bad.push('over '+r.name)});
 if(a.insu<0) bad.push('neg'); if(!a.base) bad.push('nobase');
 const k=(a.base?a.base.cat:'none')+'/'+a.danger.length; sc[k]=(sc[k]||0)+1;}
 return {bad:bad.slice(0,5),nbad:bad.length,sc}});
console.log(JSON.stringify(st));
// solve one case correctly via UI answers
for(let k=0;k<5;k++){
 const ans=await p.evaluate(()=>{const a=realAnalyze(RC);return {base:a.base&&a.base.i,f:a.rights.filter(r=>r.cat!=='own').map(r=>[r.i,a.fates[r.i].f]),t:a.tenants.map(t=>[t.j,t.dh?1:0,Math.round(t.got)]),insu:Math.round(a.insu)}});
 for(const [i,f] of ans.f) await p.click(`[data-rfate="${i}:${f}"]`);
 if(ans.base!=null) await p.click(`[data-rbase="${ans.base}"]`);
 for(const [j,d,g] of ans.t){ await p.click(`[data-rdh="${j}:${d}"]`); await p.fill(`[data-rgot="${j}"]`,String(g)); }
 await p.fill('#rInsu',String(ans.insu)); await p.click('#rGrade');
 const h=await p.textContent('.score h3'); console.log('grade',h);
 if(k==0) await p.screenshot({path:'r2.png',fullPage:true});
 await p.click('#rNew');
}
// paste flow
await p.click('[data-rtab="paste"]'); await p.click('#rSample');
const parsed=await p.evaluate(()=>JSON.stringify({r:RP.parsed.rights,t:RP.parsed.tenants,sale:RP.parsed.sale,ap:RP.parsed.appraisal,no:RP.parsed.caseNo}));
console.log(parsed);
await p.click('#rReport'); await p.screenshot({path:'r3.png',fullPage:true});
console.log('report', (await p.textContent('#main')).replace(/\s+/g,' ').slice(0,700));
await p.click('#rSolveThis'); await p.waitForTimeout(100);
console.log('solve has grade btn', await p.$('#rGrade')!==null, 'scrollW', await p.evaluate(()=>document.documentElement.scrollWidth));
console.log('errors',errs);await b.close();})();
