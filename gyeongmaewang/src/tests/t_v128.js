const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const ctx=await b.newContext({viewport:{width:1280,height:800}}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const setup=async(id,seed)=>p.evaluate(([id,seed])=>{ localStorage.clear(); S=blank(); window.MT_SKIP_TALE=true; window.LN_FAST=true; kcRec().fr={full:true}; kcRec().cash=50000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; K.timeLeft=9999; renderArena(); },[id,seed]);
// 1) 중복 처리 막기
await setup('f11',77);
const d=await p.evaluate(()=>{ let bb=Math.round(KP.minBid*1.1),t=0; while(t++<12){ kBid(bb); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; bb=Math.round(bb*1.06);} K.loan={none:true};
  const bid0=K.bid; kBid(bid0*2); const bidSame=K.bid===bid0;
  K.step='defect'; kDefect(); const r0=K.cost.repair; kRepair('part'); kRepair('part'); const repOnce=K.cost.repair===r0+K_REPAIR.find(x=>x.id==='part').cost || K.repair.cost>0;
  const rc=K.cost.repair; kRepair('good'); const repLocked=K.cost.repair===rc;
  kList(KP.list[2]); const l0=K.sale.list; kList(KP.list[0]); const listLocked=K.sale.list===l0;
  K.sale.offer={amt:KP.trueMid,buyer:{t:'신혼부부',flex:0.01,cancel:0}}; const c0=kcRec().cash, n0=kcRec().cases; kSaleAnswer('accept'); const c1=kcRec().cash; kSaleAnswer('accept'); kClose(99999,{t:'x',cancel:0}); kFinish();
  return {bidSame, repLocked, listLocked, once:kcRec().cash===c1 && kcRec().cases===n0+1, gain:c1-c0}; });
ok(d.bidSame, '낙찰 뒤 입찰을 또 해도 안 바뀜');
ok(d.repLocked, '수리를 두 번 눌러도 수리비는 한 번만');
ok(d.listLocked, '호가를 정한 뒤 다시 눌러도 안 바뀜');
ok(d.once, '수락을 여러 번 눌러도 매각대금은 한 번만 입금 ('+d.gain+'만원 한 번)');
// 2) 이어하기 — 명도 중에 새로고침
await setup('f12',4242);
const before=await p.evaluate(()=>{ let bb=Math.round(KP.minBid*1.1),t=0; while(t++<12){ kBid(bb); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; bb=Math.round(bb*1.06);} K.loan={none:true}; K.step='move'; K.scene=null; kMove('listen'); kMove('mbg_x'); kMove('center'); renderArena();
  return {step:K.step, day:K.day, coop:K.occ.coop, rn:K.rn, cash:kcRec().cash, blk:JSON.stringify(K.blk), cost:JSON.stringify(K.cost), found:JSON.stringify(K.found)}; });
await p.waitForTimeout(300);
// 다음 난수 결과를 미리 본다(이어하기 뒤에도 같아야 함)
const nextA=await p.evaluate(()=>{ const s=JSON.parse(JSON.stringify(kcRec().live)); return s.rn; });
ok(nextA===before.rn, '진행 상황이 저장됨(난수 사용량 '+nextA+')');
await p.reload(); await p.waitForTimeout(1200);
ok(await p.evaluate(()=>!!document.getElementById('rsCard')), '새로고침하면 "하던 사건 이어하기" 카드가 뜸');
ok(await p.evaluate(()=>!document.querySelector('[data-rsgo="no"]')), '낙찰 뒤엔 "접기"가 없음(손해 본 사건을 공짜로 버릴 수 없음)');
await p.click('[data-rsgo="yes"]'); await p.waitForTimeout(500);
const after=await p.evaluate(()=>({step:K.step, day:K.day, coop:K.occ.coop, rn:K.rn, cash:kcRec().cash, blk:JSON.stringify(K.blk), cost:JSON.stringify(K.cost), found:JSON.stringify(K.found), scr:!!document.querySelector('.mb-card')}));
ok(after.step===before.step && after.day===before.day && after.coop===before.coop && after.blk===before.blk && after.cost===before.cost && after.found===before.found, '같은 단계·날짜·협조도·비용·막힌 곳 그대로 이어짐');
ok(after.rn===before.rn && after.cash===before.cash, '돈이 늘거나 줄지 않고, 난수 위치도 같음');
ok(after.scr, '명도 화면이 그대로 그려짐');
// 운 다시 굴리기 불가: 같은 행동 → 같은 결과
const x1=await p.evaluate(()=>{ const s=JSON.stringify(kcRec().live); return s; });
const r1=await p.evaluate(()=>{ K.r(); K.r(); return K.r(); });
await p.evaluate(x=>{ const c=kcRec(); c.live=JSON.parse(x); save(); },x1);
await p.reload(); await p.waitForTimeout(1200); await p.click('[data-rsgo="yes"]'); await p.waitForTimeout(400);
const r2=await p.evaluate(()=>{ K.r(); K.r(); return K.r(); });
ok(r1===r2, '새로고침으로 운을 다시 굴릴 수 없음(같은 자리에서 같은 난수)');
// 끝나면 저장본 지워짐
await p.evaluate(()=>{ K.step='sell'; K.repair=K.repair||{id:'min',price:0,speed:0}; K.sale={list:KP.trueMid,trueP:KP.trueMid,weeks:1,offers:[],done:false,offer:{amt:KP.trueMid,buyer:{t:'신혼부부',flex:0.01,cancel:0}}}; kSaleAnswer('accept'); renderArena(); });
await p.waitForTimeout(300); ok(await p.evaluate(()=>K.step==='result' && !kcRec().live), '사건이 끝나면 이어하기 저장본이 사라짐');
ok(true,'');
await p.reload(); await p.waitForTimeout(1000); ok(await p.evaluate(()=>!document.getElementById('rsCard')), '끝난 사건은 이어하기 카드가 안 뜸');
// 접기
await setup('f11',5); await p.evaluate(()=>{ renderArena(); }); await p.waitForTimeout(200); await p.reload(); await p.waitForTimeout(1000);
await p.click('[data-rsgo="no"]'); await p.waitForTimeout(300); ok(await p.evaluate(()=>!kcRec().live && !K), '"접기"를 누르면 저장본이 지워짐');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
