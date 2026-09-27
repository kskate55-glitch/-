const { chromium } = require('playwright'); const URL=process.env.URL||'http://localhost:8765/rights-study.html#arena';
(async()=>{const b=await chromium.launch(); const p=await b.newPage(); await p.goto(URL); await p.waitForTimeout(700);
const r=await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career';
 const rows=[]; const ids=Object.keys(K_PROPS).filter(k=>K_PROPS[k].gen);
 for(const li of [1,2]) for(const id of ids) for(let s=1;s<=8;s++){ K_PROP_NEXT=id; kStart(s*37); K.intro=false; K.loan={none:true}; K.repair=Object.assign({},K_REPAIR.find(x=>x.id==='part')); K.step='list'; K.cost.bid=Math.round(KP.minBid*1.1);
   try{ kList(KP.list[li]); }catch(e){ rows.push({id,err:e.message}); continue; }
   let cancels=0, ev0=(K.events||[]).length, w=0;
   while(K.step==='sell' && !K.sale.done && w<40){ w++; const S=K.sale, of=S.offer; if(of && of.amt>=S.list*0.97) kSaleAnswer('accept'); else if(of && !S._ctr){ S._ctr=1; kSaleAnswer('counter'); } else if(S.weeks>=8 && S.weeks%4===0) kSaleAnswer('lower'); else kSaleAnswer('wait'); if(K.sale && K.sale.note && /깨졌|파기|미루/.test(K.sale.note)) cancels++; if(K.pendingTerms||K.stPending) break; }
   rows.push({id, li, stars:KP.stars, weeks:K.sale.weeks, done:!!K.sale.done||K.step==='result', ratio:K.sale.price? K.sale.price/K.sale.trueP : null, cancels:(K.events||[]).filter(e=>/파기/.test(e)).length, step:K.step});
 }
 return rows; });
const g={}; for(const x of r){ if(x.err){ console.log('ERR',x.id,x.err); continue; } const k='li'+x.li+(x.stars>=4?' ★4-5':' ★1-3'); g[k]=g[k]||[]; g[k].push(x); }
for(const [k,a] of Object.entries(g)){ const d=a.filter(x=>x.done); const wk=d.map(x=>x.weeks).sort((a,b)=>a-b); console.log(k, 'n='+a.length, '팔림 '+Math.round(d.length/a.length*100)+'%', '주 중앙 '+wk[Math.floor(wk.length/2)], '최대 '+wk[wk.length-1], '파기 평균 '+(a.reduce((s,x)=>s+x.cancels,0)/a.length).toFixed(2), '가격/시세 '+(d.reduce((s,x)=>s+x.ratio,0)/d.length).toFixed(3), '8주+ '+Math.round(d.filter(x=>x.weeks>=8).length/a.length*100)+'%'); }
console.log('steps', [...new Set(r.map(x=>x.step))].join(','));
await b.close(); })();
