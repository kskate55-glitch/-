const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
console.log(await p.evaluate(()=>{
  kStart(7919); kResearch("docs"); kBid(12600); if(K.step!=="won") return "lost "+K.result.gap;
  K.step="move"; let g=0; const mv=["listen","daughter","center","date"]; let mi=0;
  while(K.step==="move"&&g++<80){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){kTick(1);continue;} const m=mv[mi++%4]; const d=K_MOVES.find(x=>x.id===m); if(d.need&&!d.need(K.occ)){kMove("date");continue;} kMove(m);}
  kRepair("good"); kList(16200); const trace=[];
  for(g=0; g<30 && K.step==="sell"; g++){ const o=K.sale.offer; trace.push(`${K.sale.weeks}w list${K.sale.list} ${o?o.amt+"/"+o.buyer.t:"-"} ${K.sale.done}`); if(o) kSaleAnswer(K.sale.weeks>2?"accept":"counter"); else kSaleAnswer(K.sale.weeks>6?"lower":"wait"); }
  return trace.join("\n")+"\nstep "+K.step;
}));await b.close();})();
