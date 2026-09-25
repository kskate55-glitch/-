const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[], bad=[];
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));p.on('response',r=>{if(r.status()>=400) bad.push(r.status()+' '+r.url());});
await p.goto('http://localhost:8790/'); await p.waitForTimeout(1500); await p.screenshot({path:`sa1_${w}.png`});
console.log(w, await p.evaluate(()=>[page, arenaTab, !!document.getElementById('kfsRoot'), document.title, getComputedStyle(document.querySelector('header.top')||document.body).display, [...document.images].filter(i=>i.complete&&i.naturalWidth>0).length, [...document.images].length]));
await p.evaluate(()=>{kcRec().fr={full:true}; renderArena();}); await p.waitForTimeout(200); await p.click('[data-kcnew="career"]'); await p.waitForTimeout(600); await p.click('[data-kintro]'); await p.waitForTimeout(400);
await p.evaluate(()=>{const b=document.querySelector('[data-kres="docs"]'); const d=b.closest('details'); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true;}); await p.click('[data-kres="docs"]'); await p.fill('#kBid','12650'); await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-kcseal]'); await p.waitForTimeout(300); await p.click('[data-kbid]'); await p.waitForTimeout(9000);
await p.screenshot({path:`sa2_${w}.png`}); console.log(w,'step', await p.evaluate(()=>K.step));
await p.reload(); await p.waitForTimeout(1200); console.log(w,'reload', await p.evaluate(()=>[page, kcRec().bids]));
await p.evaluate(()=>{location.hash='#quiz';}); await p.waitForTimeout(1200); console.log(w,'hash', await p.evaluate(()=>page));
}
console.log('bad',bad.slice(0,10)); console.log('errors',errs);await b.close();})();
