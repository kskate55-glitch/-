const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(600);
await p.evaluate(()=>{arenaTab='king'; kcStart('career','k1'); K.intro=false; renderArena();}); await p.waitForTimeout(500); await p.screenshot({path:`kr1_${w}.png`});
for(const id of ['docs','court','call3','meter','mgmt','neigh','brokers']){ const el=await p.$(`[data-kres="${id}"]:not([disabled])`); if(el){ await el.click(); await p.waitForTimeout(150);} }
await p.screenshot({path:`kr2_${w}.png`,fullPage:false});
console.log(w, await p.evaluate(()=>[K.timeLeft, K.loc, Object.keys(K.found).join(','), K.rlog.map(r=>r.id+':'+(r.min+r.travel)+(r.useful?'✓':'✗')).join(' '), document.querySelectorAll('[data-kres]:not([disabled])').length]));
await p.evaluate(()=>{ kBid(12650); K.revealing=false; if(K.step==='won'){ K.step='move'; let g=0; while(K.step==='move'&&g++<60){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){kTick(1);continue;} kMove(['listen','daughter','center','date'][g%4]); } kRepair('part'); kList(15500); g=0; while(K.step==='sell'&&g++<40){ if(K.sale.offer) kSaleAnswer('accept'); else kSaleAnswer('wait'); } } renderArena(); });
await p.waitForTimeout(800); const txt=await p.evaluate(()=>{const e=document.querySelector('.kr-eff'); return e?e.innerText.replace(/\n/g,' | '):'none';}); console.log(w,'eff',txt);
await p.evaluate(()=>{ K_PROP_NEXT='k2'; kcStart('career','k2'); K.intro=false; ['kim','listing','bank','down','park'].forEach(kResearch); renderArena(); }); await p.waitForTimeout(400); await p.screenshot({path:`kr3_${w}.png`});
console.log(w,'k2', await p.evaluate(()=>[K.timeLeft, Object.keys(K.found).join(','), K.says.length]));
}
console.log('errors',errs);await b.close();})();
