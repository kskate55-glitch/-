const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});
await p.goto('file://'+process.cwd()+'/rights-study.html');await p.waitForTimeout(500);
for(const id of ['w1-09','w1-15']){await p.evaluate(id=>startWB([WB.find(q=>q.id===id)],'practice','t'),id);
const q=await p.evaluate(id=>{const q=WB.find(x=>x.id===id);return {type:q.type,a:q.a,ans:q.ans&&q.ans[0],num:q.num}},id);
if(q.type==='mc')await p.click(`[data-wbo="${q.a}"]`);else{const i=p.locator('input:visible').first();await i.fill(String(q.type==='sa'?q.ans:q.num));await i.press('Enter');}
await p.waitForTimeout(100);console.log(id,q.type,(await p.evaluate(()=>document.body.innerText)).slice(0,500).replace(/\n+/g,' | '));}
await b.close();})();
