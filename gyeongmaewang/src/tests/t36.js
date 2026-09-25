const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(700);
await p.evaluate(()=>{arenaTab='home';renderArena();});
await p.click('[data-kcnew="career"]'); await p.waitForTimeout(400);
console.log(w,'bgm',await p.evaluate(()=>[KA_UNLOCKED, KA_PLAY.filter(x=>!x.dead).map(x=>x.id).join(), KA&&KA.ac.state]));
await p.click('[data-kintro]'); await p.waitForTimeout(300);
for(const r of ['docs','site','neigh','broker']) { await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){await el.click(); await p.waitForTimeout(150);} }
await p.fill('#kPredSale','15500'); await p.fill('#kPredRepair','400'); await p.fill('#kPredMove','14');
await p.fill('#kBid','12650'); await p.waitForTimeout(100);
console.log(w,'hangul',await p.evaluate(()=>document.getElementById('kHangul').textContent));
const hs=await p.evaluate(()=>document.documentElement.scrollHeight);
await p.waitForTimeout(900); await p.evaluate(()=>{ window._clk=[]; document.addEventListener('click',e=>_clk.push(e.target.outerHTML.slice(0,60)),true); }); await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-kcseal]'); console.log(await p.evaluate(()=>_clk)); console.log(w,'sealed?',await p.evaluate(()=>JSON.stringify(K.sealed)), await p.evaluate(()=>document.getElementById('kBidErr')&&document.getElementById('kBidErr').textContent)); await p.waitForTimeout(1500); await p.screenshot({path:`ke2_${w}.png`});
await p.click('[data-kbid]'); await p.waitForTimeout(2600); await p.screenshot({path:`ke3_${w}.png`});
console.log(w,'bgm2',await p.evaluate(()=>KA_PLAY.filter(x=>!x.dead).map(x=>x.id).join()), await p.evaluate(()=>[K.revealMs, JSON.stringify(K.pred)]));
await p.waitForTimeout(4500); const st=await p.evaluate(()=>[K.step,K.revealing]); console.log(w,st);
if(st[0]!=='won') continue;
if(w===1280) await p.screenshot({path:'ke4.png',fullPage:true});
await p.click('[data-kgo="move"]'); await p.waitForTimeout(500);
await p.click('[data-kmove="listen"]'); await p.waitForTimeout(300); const sil=await p.evaluate(()=>document.getElementById('vnText').textContent); await p.waitForTimeout(1300);
console.log(w,'silence',sil, await p.evaluate(()=>[document.getElementById('vnText').textContent.slice(0,15), KA_PLAY.filter(x=>!x.dead).map(x=>x.id).join()]));
await p.click('.k-stage .vn-sprite',{force:true}); await p.waitForTimeout(200); if(w===1280) await p.screenshot({path:'ke5.png'});
await p.click('[data-kmove="notice"]'); await p.waitForTimeout(250); if(w===1280) await p.screenshot({path:'ke6.png'});
console.log(w,'tension',await p.evaluate(()=>[kaTensionNow(), K.occ.coop]));
await p.evaluate(()=>{ let g=0; while(K.step==='move'&&g++<60){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){kTick(1);continue;} kMove(['listen','daughter','center','date'][g%4]); } renderArena();});
await p.waitForTimeout(500); await p.click('[data-krep="part"]'); await p.waitForTimeout(300); await p.click('[data-klist="15500"]'); await p.waitForTimeout(600);
if(w===1280) await p.screenshot({path:'ke7.png'});
for(let i=0;i<30 && await p.evaluate(()=>K.step==="sell");i++){ const a=await p.$('[data-ksale="accept"]'); if(a && i>0) await a.click(); else await p.click('[data-ksale="wait"]'); await p.waitForTimeout(80);}
await p.waitForTimeout(2200); await p.screenshot({path:`ke8_${w}.png`,fullPage:true});
console.log(w,'end',await p.evaluate(()=>[K.step, KA_PLAY.filter(x=>!x.dead).map(x=>x.id).join(), document.documentElement.scrollWidth]));
await p.click('.kc-audio summary'); await p.waitForTimeout(100); await p.fill('[data-kaset="bgm"]','30'); await p.dispatchEvent('[data-kaset="bgm"]','input');
console.log(w,'cfg',await p.evaluate(()=>localStorage.getItem('kc_audio')));
}
console.log('errors',errs);await b.close();})();
