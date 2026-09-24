const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext();const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
await p.evaluate(()=>{ K_PROP_NEXT='k1'; KC_MODE='career'; kStart(4242); K.intro=false; ['docs','site','neigh','broker'].forEach(kResearch); kBid(12650); K.step='move'; let g=0; while(K.step==='move'&&g++<60){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){kTick(1);continue;} kMove(['listen','daughter','center','date'][g%4]); } kRepair('part'); kList(15500); g=0; while(K.step==='sell'&&g++<40){ if(K.sale.offer) kSaleAnswer('accept'); else kSaleAnswer('wait'); } });
const before=await p.evaluate(()=>[kcRec().cash, kcRec().cases, hubRec().xp, localStorage.length]);
await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(1200);
const after=await p.evaluate(()=>[kcRec().cash, kcRec().cases, hubRec().xp, localStorage.length]);
console.log('before',before,'after',after); console.log('errors',errs); await b.close();})();
