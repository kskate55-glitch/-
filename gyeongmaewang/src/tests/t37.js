const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(700);
await p.evaluate(()=>{arenaTab='home';renderArena();}); await p.waitForTimeout(1200); await p.screenshot({path:`fs1_${w}.png`});
const info=()=>p.evaluate(()=>[document.documentElement.scrollHeight<=innerHeight+2, !!document.getElementById('kfsRoot'), document.querySelector('.kfs-panel')&&document.querySelector('.kfs-panel').scrollHeight]);
console.log(w,'home',await info());
await p.click('[data-kcnew="career"]'); await p.waitForTimeout(3800); await p.screenshot({path:`fs2_${w}.png`});
await p.click('.kc-open'); await p.waitForTimeout(500); await p.screenshot({path:`fs3_${w}.png`}); console.log(w,'brief',await info());
for(const r of ['docs','site','neigh']) { await p.click(`[data-kres="${r}"]`); await p.waitForTimeout(200);} 
console.log(w,'scrollkept',await p.evaluate(()=>document.querySelector('.kfs-panel').scrollTop));
await p.fill('#kBid','12650'); await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-kcseal]'); await p.waitForTimeout(1200); await p.screenshot({path:`fs4_${w}.png`});
await p.click('[data-kbid]'); await p.waitForTimeout(3000); await p.screenshot({path:`fs5_${w}.png`}); await p.waitForTimeout(4500);
if(await p.evaluate(()=>K.step)!=='won'){console.log('lost');continue;}
await p.screenshot({path:`fs6_${w}.png`});
await p.click('[data-kgo="move"]'); await p.waitForTimeout(1500); await p.screenshot({path:`fs7_${w}.png`}); console.log(w,'move',await info());
await p.evaluate(()=>{ let g=0; while(K.step==='move'&&g++<60){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){kTick(1);continue;} kMove(['listen','daughter','center','date'][g%4]); } kRepair('part'); kList(15500); let s=0; while(K.step==='sell'&&s++<30){ if(K.sale.offer) kSaleAnswer('accept'); else kSaleAnswer('wait'); } renderArena();});
await p.waitForTimeout(1500); await p.screenshot({path:`fs8_${w}.png`}); console.log(w,'result',await info());
await p.click('[data-kfsmenu]'); await p.waitForTimeout(200); await p.screenshot({path:`fs9_${w}.png`});
await p.click('.kfs-menu [data-atab="story"]'); await p.waitForTimeout(500); console.log(w,'storytab',await info());
await p.evaluate(()=>{stStart('ep_senior');ST.intro=false;renderArena();}); await p.waitForTimeout(800); await p.screenshot({path:`fs10_${w}.png`}); console.log(w,'story',await info());
await p.evaluate(()=>{page='notes'; }); await p.waitForTimeout(600); console.log(w,'left', await p.evaluate(()=>!!document.getElementById('kfsRoot')));
}
console.log('errors',errs);await b.close();})();
