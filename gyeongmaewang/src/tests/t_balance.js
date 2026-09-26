// 밸런스 리포트 — 테스트 봇 4종 × 생성 물건 22개. 흑자 판 수만이 아니라 손실 합계·최악·하위 20%·포기까지 본다.
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const ids=await p.evaluate(()=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; kcRec().fr={full:true}; return KF_SPECS.map(s=>s.id); });
const MODES={novice:'합리적인 입문자', heeder:'경고를 따르는 입문자', skilled:'목적 있는 숙련자', full:'조사 완주형', reckless:'무리한 플레이'};
const rows=[];
for(const id of ids){ for(const mode of Object.keys(MODES)){
  const r=await p.evaluate(([id,mode])=>{
    arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(1000+id.charCodeAt(1)*7+id.charCodeAt(2)); K.intro=false; K.timeLeft=9999;
    const A=KP.actions, big=h=>(+h.cost||0)>=Math.max(300,KP.trueMid*0.03)||h.k==='price'||h.k==='assume';
    if(mode==='novice'||mode==='heeder') ['docs','trade','court'].forEach(x=>kResearch(x));
    let W0=null; if(mode==='heeder'){ W0=bwInfo(); if(W0&&W0.level==='danger') W0.legal.forEach(a=>kResearch(a.id)); }
    if(mode==='skilled'){ ['docs','trade'].forEach(x=>kResearch(x)); KP.hidden.filter(big).forEach(h=>kResearch('h_'+h.id)); }
    if(mode==='full') A.forEach(a=>kResearch(a.id));
    const B=lfBand(), mid=(B.lo+B.hi)/2, assume=KP.hidden.filter(h=>h.k==='assume'&&K.found[h.id]).reduce((s,h)=>s+h.cost,0), defKnown=KP.hidden.filter(h=>h.k==='defect'&&K.found[h.id]).reduce((s,h)=>s+(+h.cost||0),0);
    let bid;
    if(mode==='reckless') bid=Math.round(KP.minBid*1.45/10)*10;
    else { const M=qaBidModel(); bid=Math.round((M.z.bal - (mode==='novice'?0:defKnown) - (mode==='heeder'?(bwInfo()||{reserve:0}).reserve:0))/10)*10;   // 입찰표가 안내하는 '균형 구간' 끝(알아낸 인수·다툼 비용은 이미 빠져 있다) — 알아낸 하자 비용만 더 뺀다
      if(bid<KP.minBid){ if(mode==='novice') bid=KP.minBid; else return {pass:true, profit:0, warned:W0&&W0.level}; } }
    let tries=0; while(tries++<(mode==='reckless'?6:3)){ kBid(bid); K.revealing=false; K.sealed=false; if(K.step==='won') break; if(mode!=='reckless') return {lost:true, profit:0}; bid=Math.round(bid*1.06/10)*10; K.step='brief'; }
    if(K.step!=='won') return {lost:true, profit:0};
    const cashIn=K.bid+(K.cost.acq||0)+(K.cost.fee||0);
    K.loan={none:true}; K.step='move'; K.scene=null;
    let g=0; while(K.step==='move'&&g++<140){
      if(K.pendingFlip){kFlipAnswer(mode==='reckless');continue;}
      if(K.offering){kOffer(K.askNeed);continue;}
      if(K.occ.agreed){ if(!K.occ.paper && mode!=='reckless') kMove('paper'); else kTick(1); continue;}
      if(mode!=='reckless'){ const mb=K_MOVES.find(x=>/^mbg?_/.test(x.id)&&x.id!=='mb_bridge'&&x.id!=='mb_truck'&&(!x.need||x.need(K.occ))); if(mb){ kMove(mb.id); continue; } }
      const seq = mode==='reckless' ? ['threat','notice','order','date','exec'] : mode==='novice' ? ['listen','date','listen','date','order'] : ['listen','daughter','center','listen','date'];
      const m=seq[g%seq.length], d=K_MOVES.find(x=>x.id===m); if(d.need&&!d.need(K.occ)){ kMove(g>40?'order':'date'); if(K.occ.orderOk && !K.occ.exec) kMove('exec'); continue;} kMove(m);
    }
    if(K.step!=='defect') return {err:'move'};
    kRepair(mode==='reckless'?'full':mode==='novice'?'good':'part');
    kList(mode==='reckless'?KP.list[0]:mode==='novice'?KP.list[1]:KP.list[2]);
    let s=0; while(K.step==='sell'&&s++<60){ if(K.sale.offer) kSaleAnswer('accept'); else kSaleAnswer(s>6?'lower':'wait'); }
    if(K.step!=='result') return {err:'sell'};
    const spent=Object.values(K.cost||{}).reduce((a,v)=>a+(+v||0),0);
    return {profit:Math.round(K.final.profit), spent:Math.round(spent), warned:W0&&W0.level, days:K.day, cashIn:Math.round(cashIn), cost:JSON.stringify(K.cost), sale:K.sale.price, bidv:K.bid, trueMid:KP.trueMid};
  },[id,mode]);
  rows.push(Object.assign({id,mode},r));
}}
const man=v=>{ v=Math.round(v); const s=v<0?'−':''; v=Math.abs(v); const e=Math.floor(v/10000), m=v%10000; return s+(e?`${e}억${m?' '+m.toLocaleString()+'만':''}원`:`${m.toLocaleString()}만원`); };
let md='# 밸런스 리포트 — 테스트 봇 5종 × 생성 물건 22개\n\n> 자동 생성(`t_balance.js`). 신중한 봇 셋은 **입찰표가 안내하는 \'균형 구간\' 끝**에 쓴다(안내대로 하면 남는가를 본다). 입문자는 조사로 알아낸 하자 비용을 입찰가에 반영하지 못한다고 가정. 흑자 판 수만 보면 "19승 3패인데 합계는 마이너스" 같은 걸 놓친다 — 손실 합계·최악·하위 20%·포기를 같이 본다.\n\n**경고를 따르는 입문자** = 입문자와 같은 조사만 하다가, 입찰 직전 🚨 경고가 뜨면 거기 적힌 권리 확인만 하고, 권하는 \'모르는 비용 여유\'를 입찰가에서 뺀다. **투입 현금** = 낙찰가+세금·명도·수리·보유·중개·법률 비용(대출 없음 가정). 투입 대비 손실률이 크면 한 판에 자금이 바닥날 수 있다는 뜻.\n\n';
md+='| 봇 | 낙찰 | 흑자 | 손실 | 포기·패찰 | 합계 | 판당 평균 | 최악 | 하위 20% 평균 | 평균 기간 | 최대 투입 현금 | 투입 대비 최악 손실률 | 원금 10%↑ 날린 판 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
const summary={};
for(const [mode,name] of Object.entries(MODES)){
  const R=rows.filter(r=>r.mode===mode), done=R.filter(r=>r.days), P=done.map(r=>r.profit).sort((a,b)=>a-b);
  const tot=P.reduce((s,v)=>s+v,0), low=P.slice(0,Math.max(1,Math.round(P.length*0.2))), lowAvg=low.reduce((s,v)=>s+v,0)/low.length;
  summary[mode]={tot, worst:P[0], win:P.filter(v=>v>0).length, n:done.length};
  md+=`| ${name} | ${done.length} | ${P.filter(v=>v>0).length} | ${P.filter(v=>v<=0).length} | ${R.filter(r=>r.pass||r.lost).length} | ${man(tot)} | ${man(tot/Math.max(1,done.length))} | ${man(P[0]||0)} | ${man(lowAvg||0)} | ${Math.round(done.reduce((s,r)=>s+r.days,0)/Math.max(1,done.length))}일 | ${man(Math.max(0,...done.map(r=>r.spent||0)))} | ${(Math.max(0,...done.map(r=>-r.profit/(r.spent||1)))*100).toFixed(1)}% | ${done.filter(r=>r.profit<0&&-r.profit>=(r.spent||1)*0.1).length} |\n`;
}
md+='\n## 물건별\n\n| 물건 | 입문자 | 경고 따름 | 숙련자 | 완주형 | 무리 |\n|---|---|---|---|---|---|\n';
ids.forEach(id=>{ md+=`| ${id} | `+Object.keys(MODES).map(m=>{ const r=rows.find(x=>x.id===id&&x.mode===m); return r.err?'오류':r.pass?'포기':r.lost?'패찰':man(r.profit); }).join(' | ')+' |\n'; });
md+='\n포기 = 계산한 상한이 최저가보다 낮아 입찰 안 함 · 패찰 = 상한까지 써도 경쟁자에게 짐\n\n| 봇 | 포기 | 패찰 |\n|---|---|---|\n'+Object.entries(MODES).map(([m,n])=>`| ${n} | ${rows.filter(r=>r.mode===m&&r.pass).length} | ${rows.filter(r=>r.mode===m&&r.lost).length} |`).join('\n')+'\n';
md+='\n## 읽는 법\n- **숙련자가 완주형과 비슷하거나 낫다** → "다 조사하기"가 유일한 정답이 아니다(GPT 우려 점검).\n- **무리한 플레이의 최악**이 얼마나 깊은지 → 손실 원인이 납득되는지(단서가 있었는지)는 결과 화면의 \'당시 알 수 있던 것\'에서 확인.\n- 입문자 손실은 대부분 인수금액을 못 읽은 물건 — 첫 장에서 그걸 가르치는지 봐야 한다.\n';
fs.writeFileSync('../balance_report.md', md); fs.writeFileSync('../balance_rows.json', JSON.stringify(rows));
console.log(md.split('\n## 물건별')[0]);
const errs=rows.filter(r=>r.err); console.log(errs.length?'ERR '+errs.map(r=>r.id+r.mode+r.err).join(','):'OK');
await b.close(); })();
