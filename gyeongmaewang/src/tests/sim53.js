// 캐릭터 밸런스 — 봇이 인생(케이스 연속)을 자동으로 산다
const { chromium } = require('playwright');
const N_CAREERS = +(process.env.NC || 500), PER = +(process.env.PER || 365);
(async()=>{const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{
  Math.random = (function(){ let x=12345; return ()=>{ x=(x*16807)%2147483647; return x/2147483647; }; })();
  renderArena = function(){}; save = function(){};
  window.HUB_TOAST_PUSH = null;
  window.botCase = function(prop, seed){
    arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=prop; KC_INTRO=false; kStart(seed); K.intro=false;
    const L = lfRec();
    // 조사: 가치/시간 높은 순, 지치면 집에서 할 수 있는 것
    let g=0;
    while(g++<40){
      const cand = KP.actions.filter(a=>krCan(a)).map(a=>{ const tr=krTravel(a), d=krDur(a)[0]; const fat = a.loc==='site' && L.sta/L.st.stamina < 0.3; return {a, v:(a.iv*(a.rel||2)+(a.loc==='site'?2:0))/(d+tr)*(fat?0.4:1)}; }).sort((x,y)=>y.v-x.v);
      if(cand.length){ kResearch(cand[0].a.id); continue; }
      if(!lfNextDay()) break;
    }
    const band = lfBand(), est = (band.lo+band.hi)/2;
    const risk = prop==='k1' ? (K.found.elec?120:0)+(K.found.fee?38:0)+(K.found.flip?50:0) : (K.found.leak?420:0)+(K.found.dump?250:0)+(K.found.loan?150:0)+(K.found.price?0:0);
    let bid = Math.round((est*0.84 - risk)/10)*10;
    if(lfIs('eunkyung')){ const cost=est*0.08+500+(KP.estRepair||250); bid = Math.min(bid, Math.round((est-cost-600)/1.017/10)*10); }
    bid = Math.max(KP.minBid, bid);
    const hunger = kcRec().cash < -8000;   // 빚이 많으면 무리하지 않는다
    kBid(bid);
    const out = {prop, bid, won:K.step!=='lost', solo:!!(K.result&&K.result.solo), gap:K.result?K.result.gap:0, found:KP.hidden.filter(h=>K.found[h.id]).length, hid:KP.hidden.length};
    if(K.step==='lost'){ return out; }
    let s=0;
    if(prop==='k1'){
      K.step='move';
      while(K.step!=='result' && s++<300){
        if(K.step==='move'){ if(K.pendingFlip) kFlipAnswer(false); else if(K.offering) kOffer(K.askNeed); else if(K.occ.agreed && !K.occ.paper) kMove('paper'); else if(K.occ.agreed) kMove('listen'); else kMove(K.occ.coop<45?'listen':(K.occ.daughter && !K.occ.dInvolved?'daughter':(K.occ.place?'center':'date'))); continue; }
        if(K.step==='defect'){ kRepair('good'); continue; }
        if(K.step==='list'){ kList(Math.round(est*1.01/10)*10); continue; }
        if(K.step==='sell'){ const of=K.sale.offer; if(of && of.amt >= est*0.95) kSaleAnswer('accept'); else if(K.sale.weeks>=6 && of) kSaleAnswer('accept'); else kSaleAnswer(K.sale.weeks%4===3?'lower':'wait'); continue; }
        break;
      }
    } else {
      K.step='cross'; k2Cross('go');
      while(K.step!=='result' && s++<300){
        if(K.step==='move'){ if(!K.occ.paper){ k2Move('paper'); k2Offer(50); } else k2Move('wait'); continue; }
        if(K.step==='defect'){ k2Fix('fix'); continue; }
        if(K.step==='list'){ k2List(Math.round(est*1.0/10)*10); continue; }
        if(K.step==='sell'){ const of=K.sale.offer; if(K.sale.weeks>=12){ k2Exit(); continue; } if(of) k2Answer(K.found.loan?'check':'accept'); else k2Answer(K.sale.weeks%4===3?'lower':'wait'); continue; }
        break;
      }
      if(K.step!=='result') k2Exit();
    }
    Object.assign(out, {profit:Math.round(K.final.profit), grade:K.final.overall||(K.final.k2&&K.final.k2.og), moveDays:K.moveDays||0, repair:K.cost.repair, weeks:K.sale?K.sale.weeks:0, days:K.day});
    return out;
  };
  window.botCareer = function(ch, per, seed){
    const c = kcRec(); delete c.life; lfNew(ch); lfRec().intro=false; hubRec().cleared['king:k1']=1;
    const start = kcRec().cash, rows=[];
    for(let i=0;i<40 && lfRec().t/1440 < per;i++){
      const prop = i%2===0?'k1':'k2';
      rows.push(botCase(prop, seed*1000+i*7919+1));
      lfAdvance(7*1440);            // 다음 물건 찾기까지 한 주
    }
    const L = lfRec();
    return {gain:kcRec().cash-start, cash:kcRec().cash, rows, days:Math.round(L.t/1440), stress:L.stress};
  };
});
const chars=['seoyun','dohyun','mijeong','jaehoon','eunkyung','taesik'];
const out={};
for(const ch of chars){
  const t0=Date.now(); const all=[];
  for(let k=0;k<N_CAREERS;k+=50){ const part=await p.evaluate(([ch,per,k])=>{ const r=[]; for(let j=0;j<50;j++) r.push(botCareer(ch,per,k+j+1)); return r; },[ch,PER,k]); all.push(...part); }
  const cases=all.flatMap(c=>c.rows), won=cases.filter(r=>r.won), avg=(a,f)=>a.length?a.reduce((s,x)=>s+f(x),0)/a.length:0;
  out[ch]={careers:all.length, cases:cases.length, gain:Math.round(avg(all,c=>c.gain)), gainMed:all.map(c=>c.gain).sort((a,b)=>a-b)[Math.floor(all.length/2)], bankrupt:+(all.filter(c=>c.cash< -15000).length/all.length*100).toFixed(1),
    win:+(won.length/cases.length*100).toFixed(1), profit:Math.round(avg(won,r=>r.profit)), overbid:+(won.filter(r=>r.gap>=Math.max(300,r.bid*0.05)).length/Math.max(1,won.length)*100).toFixed(1),
    moveDays:+avg(won.filter(r=>r.moveDays),r=>r.moveDays).toFixed(1), found:+(avg(cases,r=>r.found/r.hid)*100).toFixed(1), repair:Math.round(avg(won,r=>r.repair)), weeks:+avg(won,r=>r.weeks).toFixed(1), S:+(won.filter(r=>r.grade==='S').length/Math.max(1,won.length)*100).toFixed(1), days:Math.round(avg(all,c=>c.days)), n:+avg(all,c=>c.rows.length).toFixed(1), sec:((Date.now()-t0)/1000).toFixed(0)};
  console.log(ch, JSON.stringify(out[ch]));
}
const gains=Object.values(out).map(o=>o.gain), mean=gains.reduce((a,b)=>a+b,0)/gains.length;
console.log('mean gain', Math.round(mean), 'spread %', Object.fromEntries(Object.entries(out).map(([k,o])=>[k, +((o.gain-mean)/Math.abs(mean)*100).toFixed(1)])));
console.log('errors', errs.slice(0,5)); await b.close();})();
