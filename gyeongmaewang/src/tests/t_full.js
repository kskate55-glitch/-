const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const ids=await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; return KF_SPECS.map(s=>s.id); });
ok(ids.length===22, '생성 물건 22개');
const plan=await p.evaluate(()=>Object.entries(EP_PLAN).map(([c,P])=>[c,P.eps.map(e=>e.k).join(',')]));
ok(plan.every(([c,s])=>s.split(',').length===4 && !s.includes('undefined')), '6명 × 에피소드 4개 전부 풀 경매: '+plan.map(x=>x[0]+'='+x[1]).join(' | '));
const rows=[];
for(const id of ids){ for(const mode of ['careful','careless']){
  const r=await p.evaluate(async([id,mode])=>{
    const bad=[], LEAK=/누전|딸 말은|따님께|카대|하노|몬 |1억 5천 초중반|체납관리비 38/;
    const snap=()=>{ renderArena(); const t=document.getElementById('arenaBody')?document.getElementById('arenaBody').innerText:document.body.innerText; const m=t.match(LEAK); if(m) bad.push(K.step+':'+m[0]); };
    arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(1000+id.charCodeAt(1)*7+id.charCodeAt(2)); K.intro=false; K.timeLeft=9999;
    if(KP.id!==id) return {err:'KP '+KP.id};
    snap();
    if(mode==='careful') KP.actions.forEach(a=>kResearch(a.id));
    snap();
    const assume=KP.hidden.filter(h=>h.k==='assume'&&K.found[h.id]).reduce((s,h)=>s+h.cost,0);
    let bid = mode==='careful' ? Math.max(KP.minBid, Math.round((KP.trueMid*0.80 - assume - KP.estRepair)/(1+kAcqRate(KP.trueMid*0.7)+0.017-0.011)/10)*10) : Math.round(KP.minBid*1.45/10)*10;
    let tries=0; while(tries++<6){ kBid(bid); K.revealing=false; K.sealed=false; if(K.step==='won') break; bid=Math.round(bid*1.06/10)*10; K.step='brief'; }
    if(K.step!=='won') return {err:'never won'};
    K.loan={none:true}; snap();
    K.step='move'; K.scene=null; snap();
    let g=0; while(K.step==='move'&&g++<120){
      if(K.pendingFlip){kFlipAnswer(false);continue;}
      if(K.offering){kOffer(K.askNeed);continue;}
      if(K.occ.agreed){ if(!K.occ.paper) kMove('paper'); else kTick(1); continue;}
      const seq = mode==='careful' ? ['listen','daughter','center','listen','date'] : ['threat','notice','order','date','exec'];
      const m=seq[g%seq.length], d=K_MOVES.find(x=>x.id===m); if(d.need&&!d.need(K.occ)){ kMove(g>40?'order':'date'); if(K.occ.orderOk && !K.occ.exec) kMove('exec'); continue;} kMove(m);
      if(g%7===0) snap();
    }
    if(K.step!=='defect') return {err:'stuck move '+K.step+' day'+K.day};
    snap();
    kRepair(mode==='careful'?'part':'full'); snap();
    kList(mode==='careful'?KP.list[2]:KP.list[0]); snap();
    let s=0; while(K.step==='sell'&&s++<60){ if(K.sale.offer) kSaleAnswer('accept'); else kSaleAnswer(s>6?'lower':'wait'); }
    if(K.step!=='result') return {err:'stuck sell'};
    snap();
    return {bad, profit:Math.round(K.final.profit), days:K.day, found:K.final.found+'/'+K.final.hid, g:Object.values(K.final.grades).join(''), fee:K.cost.fee, legal:K.cost.legal, move:K.cost.move};
  },[id,mode]);
  if(r.err) ok(false, id+' '+mode+' '+r.err);
  else { if(r.bad.length) ok(false, id+' '+mode+' 옛 물건 대사 누출: '+r.bad.slice(0,3).join(',')); rows.push([id,mode,r.profit,r.days,r.found,r.g,r.fee,r.legal,r.move]); }
}}
console.log('id mode 순이익 일수 발견 등급 인수/관리비 법적 이사비');
rows.forEach(r=>console.log(r.join('\t')));
const careful=rows.filter(r=>r[1]==='careful'), careless=rows.filter(r=>r[1]==='careless');
ok(careful.length===22 && careless.length===22, '44판 전부 결과까지 도달');
const beat=ids.filter(id=>{ const a=careful.find(r=>r[0]===id), c=careless.find(r=>r[0]===id); return a&&c&&a[2]>c[2]; });
ok(beat.length>=20, `꼼꼼한 플레이가 대충 플레이보다 더 남긴 물건 ${beat.length}/22`);
ok(careful.filter(r=>r[2]>0).length>=18, `꼼꼼히 하면 흑자 ${careful.filter(r=>r[2]>0).length}/22`);
console.log(errs.length?'FAIL '+errs.length+'\n'+errs.slice(0,10).join('\n'):'ALL OK'); await b.close(); })();
