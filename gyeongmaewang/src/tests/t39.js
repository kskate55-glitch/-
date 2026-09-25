const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(700);
await p.evaluate(()=>{arenaTab='home';renderArena();}); await p.waitForTimeout(1200); await p.screenshot({path:`nv1_${w}.png`});
await p.evaluate(()=>{arenaTab='king';kcStart('career');renderArena();}); await p.waitForTimeout(4200); await p.screenshot({path:`nv2_${w}.png`});
await p.evaluate(()=>{K.intro=false; ['docs','site'].forEach(kResearch); kBid(12650); K.revealing=true; renderArena();}); await p.waitForTimeout(2500); await p.screenshot({path:`nv3_${w}.png`});
await p.evaluate(()=>{K.revealing=false; renderArena();}); await p.waitForTimeout(600); await p.screenshot({path:`nv4_${w}.png`}); const st=await p.evaluate(()=>K.step);
if(st==='won'){
await p.evaluate(()=>{K.step='move'; let g=0; while(K.step==='move'&&g++<60){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){kTick(1);continue;} kMove(['listen','daughter','center','date'][g%4]); } renderArena();}); await p.waitForTimeout(900); await p.screenshot({path:`nv5_${w}.png`});
await p.evaluate(()=>{kRepair('good'); renderArena();}); await p.waitForTimeout(900); await p.screenshot({path:`nv6_${w}.png`});
await p.evaluate(()=>{kList(15500); let s=0; while(K.step==='sell'&&s++<30){ if(K.sale.offer) kSaleAnswer('accept'); else kSaleAnswer('wait'); } renderArena();}); await p.waitForTimeout(1200); await p.screenshot({path:`nv7_${w}.png`});
}
console.log(w,st);}
console.log('errors',errs);await b.close();})();
