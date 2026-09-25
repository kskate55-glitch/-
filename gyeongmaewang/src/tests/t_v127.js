const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const toMove=async(id,seed)=>{ await p.evaluate(([id,seed])=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; kcRec().fr={full:true}; kcRec().cash=5000000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; K.timeLeft=9999; let bb=Math.round(KP.minBid*1.1),t=0; while(t++<12){ kBid(bb); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; bb=Math.round(bb*1.06);} K.loan={none:true}; K.step='move'; K.scene=null; renderArena(); },[id,seed]); await p.waitForTimeout(250); };
const btns=()=>p.evaluate(()=>{ renderArena(); return [...document.querySelectorAll('[data-kmove]')].map(x=>x.dataset.kmove); });
const mv=id=>p.evaluate(id=>kMove(id),id);
const cases=['f13','f21','f22','f23','f31','f32','f33','f34','f42','f43','f44','f62','f63'];
for(const c of cases){
  await toMove(c,1234);
  let bs=await btns(); ok(!bs.some(x=>x.startsWith('mbg_')), c+': 막힌 곳을 모를 땐 전용 버튼이 안 보임');
  await mv('listen'); bs=await btns(); const mine=bs.filter(x=>x.startsWith('mbg_'));
  const t=await p.evaluate(()=>document.body.innerText);
  ok(/막힌 곳:/.test(t) && mine.length>=1 && bs.indexOf(mine[0])===bs.indexOf('listen')+1, c+': 사정을 들으면 막힌 곳과 전용 버튼('+mine.length+'개)이 "사정부터 듣는다" 바로 밑에');
  // 합의 먼저 → 밀림 → 풀면 당겨짐
  const r=await p.evaluate(()=>{ K.occ.coop=85; kMove('date'); if(!K.offering) return {gate:true}; kOffer(K.askNeed); const a=K.occ.agreed&&K.occ.agreed.day, d0=K.day; return {a, d0}; });
  if(r.gate){ ok(true, c+': (gate) 막힌 곳이 풀리기 전엔 날짜 얘기 자체가 안 됨'); }
  else { ok(r.a>=r.d0+20, c+': 안 풀고 합의하면 이삿날이 한참 밀림 ('+r.a+'일째)');
    const r2=await p.evaluate(()=>{ let g=0; while(!K.blk || !MB[K.blk.k].solved(K.blk,K.occ)){ const m=K_MOVES.find(x=>x.id.startsWith('mbg_')&&x.need(K.occ)); if(!m||g++>8) break; kMove(m.id); } return {a:K.occ.agreed&&K.occ.agreed.day, d:K.day, step:K.step}; });
    ok(r2.step!=='move' || r2.a<=r2.d+7, c+': 풀면 이삿날이 당겨짐 ('+r2.a+' / 오늘 '+r2.d+')'); }
}
// 두 갈래(시간 vs 돈)
const two=await p.evaluate(()=>Object.keys(MBG).filter(k=>MBG[k].items.some(it=>it[2].length>=2 && it[2].some(o=>o.cost) && it[2].some(o=>!o.cost))).length);
ok(two>=12, '대부분 사건에 ⏳시간 길과 💵돈 길이 둘 다 있음 ('+two+'/13)');
// 500의 출처: 내역을 풀면 요구액이 줄어듦
await toMove('f21',55); await mv('listen'); const n0=await p.evaluate(()=>kfOccNeed()); await mv('mbg_f21_breakdown_0'); const n1=await p.evaluate(()=>kfOccNeed());
ok(n1<n0*0.8, '500의 출처: 내역을 같이 적으면 요구액이 줄어듦 '+n0+'→'+n1);
// 사연 끝까지: 협조도 보너스 없음, 대신 힌트
await toMove('f22',77); const tl=await p.evaluate(()=>{ const P=typeof personaById==='function'?personaById(KP.occ.pid):null; return ((KP&&KP.tale)||mtTaleOf(P||{id:KP.occ.pid})).length; });
const res=await p.evaluate(tl=>{ K.occ.heard=tl-1; const c0=K.occ.coop, t0=K.occ.turns; K.occ.turns++; mtAfterListen(t0); return {c0, c1:K.occ.coop, tip:!!(K.blk&&K.blk.tip), log:K.log.slice(-1)[0]}; },tl);
ok(res.c1===res.c0 && res.tip && /💡/.test(res.log), '사연을 끝까지 들으면 협조도 일괄 +6 없이 "💡 어디를 풀지" 힌트 · '+res.log);
await p.evaluate(()=>renderArena()); ok(/💡/.test(await p.evaluate(()=>(document.querySelector('.mb-card')||{}).innerText||'')), '힌트가 막힌 곳 판에 표시됨');
// 막힌 곳 없는 사건(유치권 등)은 그대로
await toMove('f61',9); await mv('listen'); ok(!(await btns()).some(x=>x.startsWith('mb')) && await p.evaluate(()=>!document.querySelector('.mb-card')), '유치권 사건 등은 막힌 곳 없이 기존대로(입찰 전 판단이 핵심)');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
