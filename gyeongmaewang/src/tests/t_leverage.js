// 자금 흐름 리포트 — 현금 1억으로 시작해 물건 22개를 순서대로. 대출을 쓰는지·어떻게 쓰는지에 따라 자금이 버티는지 본다.
// 게임과 같은 규칙: 현금은 매도 뒤 세후 순익만큼 바뀐다(career.js). 잔금이 현금보다 크면 대출 필수(loan.js).
const { chromium } = require('playwright'); const fs=require('fs');
const START=+(process.env.LV_START||10000);
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const ids=await p.evaluate(()=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; kcRec().fr={full:true}; return KF_SPECS.map(s=>s.id); });
const BOTS={cash:'현금만 쓰는 신중파', loan:'대출 쓰는 신중파', lev:'대출 끝까지 당기는 무리파'};
const out={};
for(const mode of Object.keys(BOTS)){
  await p.evaluate((start)=>{ localStorage.clear(); const c=kcRec(); c.fr={full:true}; c.cash=start; delete c.life; },START);
  const log=[];
  for(const id of ids){
    const r=await p.evaluate(([id,mode])=>{
      const c=kcRec(); const cash0=c.cash;
      arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(1000+id.charCodeAt(1)*7+id.charCodeAt(2)); K.intro=false; K.timeLeft=9999;
      if(cash0 < KP.minBid*0.1) return {id, skip:'보증금도 없음', cash:cash0};
      if(mode==='lev') ['docs','trade','court'].forEach(x=>kResearch(x)); else KP.actions.forEach(a=>kResearch(a.id));
      const defKnown=KP.hidden.filter(h=>h.k==='defect'&&K.found[h.id]).reduce((s,h)=>s+(+h.cost||0),0);
      let bid = mode==='lev' ? Math.round(KP.minBid*1.3/10)*10 : Math.round((qaBidModel().z.bal-defKnown)/10)*10;
      if(bid<KP.minBid) return {id, skip:'포기', cash:cash0};
      if(mode==='cash' && bid*(1+kAcqRate(bid))+300 > cash0) return {id, skip:'현금 부족', cash:cash0};
      let tries=0; while(tries++<(mode==='lev'?4:3)){ kBid(bid); K.revealing=false; K.sealed=false; if(K.step==='won') break; if(mode!=='lev') return {id, skip:'패찰', cash:cash0}; bid=Math.round(bid*1.06/10)*10; K.step='brief'; }
      if(K.step!=='won') return {id, skip:'패찰', cash:cash0};
      // 대출
      const N=lnNeed(); const must=N.short>0; let debt=0, rate=0;
      if(mode==='cash' && !must){ K.loan={none:true}; }
      else { LN={need:N.short, must, cards:lnPickCards(), heard:{}, chat:null, msgs:[], step:'cards'};
        LN.cards.forEach(id=>{ LN.heard[id]=lnOffer(LN_PRODUCTS.find(x=>x.id===id)); });
        const pick = mode==='lev' ? LN.cards.slice().sort((a,b)=>LN.heard[b].limit-LN.heard[a].limit)[0] : LN.cards.slice().sort((a,b)=>LN.heard[a].rate-LN.heard[b].rate)[0];
        if(mode==='lev') LN.must=true, (function(){ const o=LN.heard[pick]; })();
        lnTake(pick); if(mode==='lev'){ K.loan.amt=Math.min(LN.heard[pick].limit, K.cost.bid); }   // 무리파: 필요 없어도 한도 끝까지
        LN=null; debt=(K.loan.amt||0)+(K.loan.extra||0); rate=K.loan.rate; }
      K.step='move'; K.scene=null;
      let g=0; while(K.step==='move'&&g++<140){
        if(K.pendingFlip){kFlipAnswer(mode==='lev');continue;}
        if(K.offering){kOffer(K.askNeed);continue;}
        if(K.occ.agreed){ if(!K.occ.paper && mode!=='lev') kMove('paper'); else kTick(1); continue;}
        if(mode!=='lev'){ const mb=K_MOVES.find(x=>/^mbg?_/.test(x.id)&&x.id!=='mb_bridge'&&x.id!=='mb_truck'&&(!x.need||x.need(K.occ))); if(mb){ kMove(mb.id); continue; } }
        const seq = mode==='lev' ? ['threat','notice','order','date','exec'] : ['listen','daughter','center','listen','date'];
        const m=seq[g%seq.length], d=K_MOVES.find(x=>x.id===m); if(d.need&&!d.need(K.occ)){ kMove(g>40?'order':'date'); if(K.occ.orderOk && !K.occ.exec) kMove('exec'); continue;} kMove(m);
      }
      if(K.step!=='defect') return {id, err:'move'};
      kRepair(mode==='lev'?'full':'part'); kList(mode==='lev'?KP.list[0]:KP.list[2]);
      let s=0; while(K.step==='sell'&&s++<60){ if(K.sale.offer) kSaleAnswer('accept'); else kSaleAnswer(s>6?'lower':'wait'); }
      if(K.step!=='result') return {id, err:'sell'};
      const need=Object.values(K.cost).reduce((a,v)=>a+(+v||0),0);
      return {id, profit:Math.round(K.final.profit), cash:kcRec().cash, debt, rate, need:Math.round(need), selfIn:Math.round(need-debt), days:K.day, hold:Math.round(K.cost.hold)};
    },[id,mode]);
    log.push(r);
  }
  out[mode]=log;
}
const man=v=>{ v=Math.round(v); const s=v<0?'−':''; v=Math.abs(v); const e=Math.floor(v/10000), m=v%10000; return s+(e?`${e}억${m?' '+m.toLocaleString()+'만':''}원`:`${m.toLocaleString()}만원`); };
let md=`# 자금 흐름 리포트 — 현금 ${man(START)}으로 시작, 물건 22개를 순서대로\n\n> 자동 생성(\`t_leverage.js\`). 게임과 같은 규칙 — 현금은 매도 뒤 **세후 순익**만큼 바뀌고, 잔금이 현금보다 크면 대출이 필수다. 대출 이자와 중도상환수수료는 보유비에 들어간다.\n>\n> - **현금만 쓰는 신중파**: 조사 다 하고 균형 구간에 쓴다. 현금으로 못 사는 물건은 건너뜀\n> - **대출 쓰는 신중파**: 같은 판단, 모자라면 명함 중 **금리가 가장 낮은** 곳\n> - **대출 끝까지 당기는 무리파**: 서류만 보고 최저가 +30%, **한도가 가장 큰** 곳(캐피탈 포함)에서 필요 없어도 한도 끝까지\n\n`;
md+='| 봇 | 입찰한 물건 | 낙찰 | 흑자 | 최종 현금 | 가장 바닥일 때 | 보증금도 없어 멈춘 판 | 최대 대출 | 이자·보유비 합계 |\n|---|---|---|---|---|---|---|---|---|\n';
for(const [m,n] of Object.entries(BOTS)){ const L=out[m], W=L.filter(r=>r.profit!=null), cs=L.map(r=>r.cash).filter(v=>v!=null);
  md+=`| ${n} | ${L.filter(r=>!r.skip||r.skip==='패찰').length} | ${W.length} | ${W.filter(r=>r.profit>0).length} | ${man(cs[cs.length-1])} | ${man(Math.min(START,...cs))} | ${L.filter(r=>r.skip==='보증금도 없음').length} | ${man(Math.max(0,...W.map(r=>r.debt||0)))} | ${man(W.reduce((s,r)=>s+(r.hold||0),0))} |\n`; }
md+='\n## 판마다 현금\n\n| 물건 | '+Object.values(BOTS).join(' | ')+' |\n|---|---|---|---|\n';
ids.forEach((id,i)=>{ md+=`| ${id} | `+Object.keys(BOTS).map(m=>{ const r=out[m][i]; return r.err?'오류':r.skip?`${r.skip} · ${man(r.cash)}`:`${r.profit>=0?'+':''}${man(r.profit)} → ${man(r.cash)}${r.debt?` (대출 ${man(r.debt)})`:''}`; }).join(' | ')+' |\n'; });
fs.writeFileSync('../leverage_report.md', md); fs.writeFileSync('../leverage_rows.json', JSON.stringify(out));
console.log(md.split('\n## 판마다')[0]); const errs=Object.values(out).flat().filter(r=>r.err); console.log(errs.length?'ERR '+errs.map(r=>r.id+r.err).join(','):'OK');
await b.close(); })();
