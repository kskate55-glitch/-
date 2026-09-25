const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html');await p.waitForTimeout(500);await p.getByRole('button',{name:'퀴즈'}).last().click().catch(()=>p.getByText('퀴즈').last().click());await p.waitForTimeout(200);
const ids=await p.evaluate(()=>{const seen={};return WB.filter(q=>{seen[q.u]=(seen[q.u]||0)+1;return false}), WB.slice(100).map(q=>q.id)});
let fail=[];
for(const id of ids){
 await p.evaluate(id=>startWB([WB.find(q=>q.id===id)],'practice','t'),id);
 const q=await p.evaluate(id=>{const q=WB.find(x=>x.id===id);return {type:q.type,a:q.a,ans:q.ans&&q.ans[0],num:q.num}},id);
 if(q.type==='mc'){await p.click(`[data-wbo="${q.a}"]`);} else { const inp=p.locator('input:visible').first(); await inp.fill(String(q.type==='sa'?q.ans:q.num)); await inp.press('Enter'); }
 await p.waitForTimeout(30);
 const t=await p.evaluate(()=>document.body.innerText);
 if(!/정답 풀이/.test(t)||!/정답이에요|정답입니다/.test(t)) fail.push(id+':'+t.slice(0,0)+(/정답 풀이/.test(t)?'':'noSol')+(/정답이에요|정답입니다/.test(t)?'':'notCorrect'));
}
console.log('checked',ids.length,'fail',fail.length,fail.slice(0,10),'errors',errs);await b.close();})();
