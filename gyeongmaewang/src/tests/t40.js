const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(700);
const out=await p.evaluate(()=>{
  const res={};
  const run=(name,seed,opts)=>{
    arenaTab='king'; K_PROP_NEXT='k2'; KC_MODE='free'; kStart(seed); K.intro=false;
    (opts.res||[]).forEach(kResearch); kBid(opts.bid);
    if(K.step!=='won') return {lost:true, other:K.result.other.amt};
    K.step='cross'; k2Cross(opts.cross);
    if(K.step==='result') return {p:Math.round(K.final.profit), og:K.final.k2.og, t:K.final.k2.otitle};
    k2Move('paper'); if(opts.look) k2Move('look'); k2Offer(opts.fee||0); k2Move('wait');
    k2Fix(opts.fix); if(K.step==='result') return {p:Math.round(K.final.profit), og:K.final.k2.og, t:K.final.k2.otitle};
    k2List(opts.list); let g=0;
    while(K.step==='sell' && g++<40){ const S=K.sale; if(opts.exitWeek && S.weeks>=opts.exitWeek){ k2Exit(); break; } if(S.offer) k2Answer(opts.check&&K.found.loan?'check':'accept'); else k2Answer(opts.lowerEvery && S.weeks%opts.lowerEvery===0?'lower':'wait'); }
    if(K.step==='sell') k2Exit();
    renderArena();
    return {p:Math.round(K.final.profit), og:K.final.k2.og, t:K.final.k2.otitle, w:K.sale.weeks};
  };
  const plans={
    early:{res:['down','park','bank'],bid:14300,cross:'exit'},
    fix_good:{res:['down','park','bank'],bid:14300,cross:'go',fix:'fix',list:15900,check:true},
    min_honest:{res:['down','park'],bid:14300,cross:'go',fix:'min',list:15400},
    hide:{res:[],bid:14300,cross:'go',fix:'hide',list:16500,lowerEvery:4},
    stubborn:{res:['kim'],bid:14300,cross:'go',fix:'min',list:17000},
    forfeit:{res:[],bid:14300,cross:'forfeit'},
    exit_defect:{res:[],bid:14300,cross:'go',fix:'exit'},
    sell_exit6:{res:['kim'],bid:14300,cross:'go',fix:'fix',list:17000,exitWeek:6},
  };
  for(const [n,o] of Object.entries(plans)){ const arr=[]; for(let s=1;s<=40;s++){ arr.push(run(n,s*7919,o)); } res[n]=arr; }
  return res;
});
for(const [n,arr] of Object.entries(out)){ const w=arr.filter(x=>!x.lost); const ps=w.map(x=>x.p).sort((a,b)=>a-b); const avg=ps.reduce((a,b)=>a+b,0)/Math.max(1,ps.length);
 const g={}; w.forEach(x=>g[x.og]=(g[x.og]||0)+1);
 console.log(n.padEnd(12), 'won',w.length+'/'+arr.length,'avg',Math.round(avg),'min',ps[0],'max',ps[ps.length-1],JSON.stringify(g), w[0]&&w[0].t);}
console.log('errors',errs);await b.close();})();
