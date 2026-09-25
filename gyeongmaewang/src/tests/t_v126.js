const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const toMove=async(id,seed)=>{ await p.evaluate(([id,seed])=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; kcRec().fr={full:true}; kcRec().cash=500000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; K.timeLeft=9999; let bb=Math.round(KP.minBid*1.1),t=0; while(t++<12){ kBid(bb); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; bb=Math.round(bb*1.06);} K.loan={none:true}; K.step='move'; K.scene=null; renderArena(); },[id,seed]); await p.waitForTimeout(300); };
const txt=()=>p.evaluate(()=>document.body.innerText);
const mv=id=>p.evaluate(id=>kMove(id),id); const st=()=>p.evaluate(()=>({day:K.day, coop:Math.round(K.occ.coop), agreed:K.occ.agreed, blk:K.blk, off:K.offering, step:K.step}));
// ---- 1판 믿음
await toMove('k1',901);
let t=await txt(); ok(/못 나가는 진짜 이유/.test(t) && /아직 몰라요/.test(t), '1판: 처음엔 막힌 곳이 "아직 몰라요"');
await mv('listen'); await p.evaluate(()=>renderArena()); t=await txt(); ok(/막힌 곳: 믿음/.test(t), '사정을 들으니 막힌 곳(믿음)이 드러남');
let s=await st(); await mv('date'); let s2=await st(); ok(!s2.off && s2.coop<=s.coop, '믿음이 없으면 날짜 얘기 자체가 안 됨(협조도가 높아도)');
await p.evaluate(()=>{ K.occ.coop=95; }); await mv('date'); s2=await st(); ok(!s2.off, '협조도 95여도 믿음이 없으면 날짜가 안 정해짐 — 협조도만으로 안 풀림');
await mv('mb_explain'); s=await st(); await mv('mb_kept'); s2=await st(); ok(s2.blk.kept && s2.day>=s.blk.promise, '설명 → 약속한 날(모레)에 연락 — 시간을 쓰는 해결 '+s.day+'→'+s2.day);
await mv('date'); s2=await st(); ok(s2.off, '믿음이 생기니 날짜 이야기가 됨');
// 가족 경로
await toMove('k1',902); await p.evaluate(()=>{ K.found.flip=true; K.occ.daughter=true; }); await mv('daughter'); await p.waitForTimeout(100); await p.evaluate(()=>{ document.querySelectorAll('#mtRoot,.mt-root').forEach(x=>x.remove()); K.occ.coop=80; }); await mv('date'); s2=await st(); ok(s2.off, '1판 다른 길: 따님이 함께하면 믿음 문제가 풀림');
// ---- 2판 날짜
await toMove('f11',903); await mv('listen'); await p.evaluate(()=>renderArena()); t=await txt(); ok(/막힌 곳: 날짜/.test(t), '2판: 막힌 곳 = 날짜');
// 확인 없이 빨리 합의 → 이삿날 함정
await p.evaluate(()=>{ K.occ.coop=80; }); await mv('date'); await p.evaluate(()=>kOffer(K.askNeed)); await p.evaluate(()=>kMove('paper'));
s=await st(); const div=s.blk.divDay; ok(s.agreed && s.agreed.day<=div, '날짜 확인 없이 합의하면 배당기일 전 날짜로 잡힘 ('+s.agreed.day+' < '+div+')');
let g=0; while((await st()).step==='move' && g++<40) await p.evaluate(()=>kTick(1));
s=await st(); const trap=await p.evaluate(()=>K.blk.trapped); ok(trap && s.day>div, '이삿날에 "배당금이 아직이라 못 나가요" → 배당기일 뒤로 밀림(보유비) · 끝난 날 '+s.day);
const dayTrap=s.day;
// 먼저 확인 → 배당기일 맞춤
await toMove('f11',903); await mv('listen'); await mv('mb_dates'); await mv('mb_cert'); await p.evaluate(()=>{ K.occ.coop=80; }); await mv('date'); await p.evaluate(()=>kOffer(K.askNeed)); s=await st();
ok(s.agreed.day===s.blk.divDay+2 && !s.blk.trapped, '날짜를 먼저 확인하면 배당기일 뒤로 바로 맞춤(헛걸음 없음)');
// 돈으로 당기기
await toMove('f11',903); await mv('listen'); await mv('mb_dates'); await mv('mb_bridge'); await mv('mb_cert'); await p.evaluate(()=>{ K.occ.coop=80; }); await mv('date'); await p.evaluate(()=>kOffer(K.askNeed)); s=await st();
const mvCost=await p.evaluate(()=>K.cost.move); ok(s.agreed.day<s.blk.divDay && mvCost>=100, '이사비 선지급(돈)으로 배당기일 전에 나가게 할 수 있음 ('+s.agreed.day+'일째)');
// ---- 3판 생활
await toMove('f12',904); await mv('listen'); await p.evaluate(()=>renderArena()); t=await txt(); ok(/막힌 곳: 생활/.test(t), '3판: 막힌 곳 = 생활(갈 곳·이삿짐)');
await p.evaluate(()=>{ K.occ.coop=80; }); await mv('date'); await p.evaluate(()=>kOffer(K.askNeed)); s=await st(); ok(s.agreed && s.agreed.day>=s.day+25, '갈 곳·이삿짐이 안 정해지면 합의해도 이삿날이 한참 밀림 ('+s.agreed.day+'일째)');
await mv('center'); await mv('mb_carry'); s2=await st(); ok(s2.agreed.day<=s2.day+6, '갈 곳(주거지원) + 직접 옮기기(시간)로 풀면 이삿날이 당겨짐 ('+s2.agreed.day+')');
await toMove('f12',905); await mv('listen'); await mv('center'); const c0=await p.evaluate(()=>K.cost.move); await mv('mb_truck'); const c1=await p.evaluate(()=>K.cost.move); ok(c1-c0===35, '다른 길: 용달 예약(돈 35만원)');
await p.evaluate(()=>renderArena()); t=await txt(); ok(/풀렸어요/.test(t), '둘 다 풀리면 "풀렸어요" 표시');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
