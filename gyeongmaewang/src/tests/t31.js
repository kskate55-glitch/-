const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
const r = await p.evaluate(()=>{
  const strat = {
    empathy: ["listen","daughter","center","date"], money: ["listen","date","paper"], law: ["order","notice","threat","exec"], pressure:["threat","threat","order","exec"]};
  const out=[];
  for(const [sn, moves] of Object.entries(strat)) for(const res of [[],["site","neigh","broker"],["broker","office","court"]]) for(const bidAdd of [800,1600,2400]) for(const rep of ["min","good","full","part"]) for(const lst of [16200,15500]){
    for(let seed=1; seed<=6; seed++){
      kStart(seed*7919); for(const x of ["docs",...res]) kResearch(x);
      kBid(10200+bidAdd); if(K.step!=="won"){ out.push({sn,st:"lost",gap:K.result.gap}); continue; }
      K.step="move"; let guard=0, mi=0;
      while(K.step==="move" && guard++<80){
        if(K.pendingFlip){ kFlipAnswer(false); continue; }
        if(K.offering){ const need=K.askNeed; kOffer(sn==="money"||sn==="empathy"? need : Math.max(0,need-100)); continue; }
        if(K.occ.agreed){ if(!K.occ.paper && sn==="money") kMove("paper"); else kTick(1); continue; }
        const m = moves[mi % moves.length]; mi++;
        const mv = K_MOVES.find(x=>x.id===m); if(mv.need && !mv.need(K.occ)){ kMove("date"); continue; }
        kMove(m);
      }
      if(K.step!=="defect"){ out.push({sn,st:"stuck-move",day:K.day}); continue; }
      kRepair(rep); kList(lst); guard=0;
      while(K.step==="sell" && guard++<60){ if(K.sale.offer) kSaleAnswer(K.sale.weeks>2?"accept":"counter"); else kSaleAnswer(K.sale.weeks>6?"lower":"wait"); }
      if(K.step!=="result"){ out.push({sn,st:"stuck-sell"}); continue; }
      out.push({sn,st:"done",profit:Math.round(K.final.profit),day:K.day,move:K.moveDays,g:Object.values(K.final.grades).join(""),style:K.final.style[0]});
    }
  }
  const done=out.filter(o=>o.st==="done"), by={};
  for(const o of done){ (by[o.sn]=by[o.sn]||[]).push(o); }
  const sum = Object.fromEntries(Object.entries(by).map(([k,v])=>[k,{n:v.length, avgProfit:Math.round(v.reduce((a,x)=>a+x.profit,0)/v.length), avgMove:Math.round(v.reduce((a,x)=>a+x.move,0)/v.length), min:Math.min(...v.map(x=>x.profit)), max:Math.max(...v.map(x=>x.profit)), styles:[...new Set(v.map(x=>x.style))].join('/')}]));
  return {total:out.length, lost:out.filter(o=>o.st==="lost").length, stuck:out.filter(o=>/stuck/.test(o.st)), sum, grades:[...new Set(done.map(d=>d.g))].slice(0,12)};
});
console.log(JSON.stringify(r,null,1).slice(0,2500)); console.log('errors',errs); await b.close();})();
