const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const start=async(ch,id,seed)=>p.evaluate(([ch,id,seed])=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; const c=kcRec(); delete c.life; c.fr={full:true}; lfNew(ch); lfRec().intro=false; c.cash=50000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; renderArena(); return {who:caWho()&&caWho().id, lf:!!K.lf}; },[ch,id,seed]);
const txt=()=>p.evaluate(()=>document.body.innerText);
// 서윤
let s=await start('seoyun','f11',11); ok(s.who==='seoyun', '서윤으로 시작 ('+JSON.stringify(s)+')');
await p.waitForTimeout(300); ok(await p.evaluate(()=>[...document.querySelectorAll('.nx-grp>summary, .stg-grp>summary')].some(x=>/한 수/.test(x.textContent))), '조사 버튼 줄에 "🎒 서윤의 한 수" 묶음이 생김');
const siteDur=await p.evaluate(()=>{ const a=KP.actions.find(x=>x.loc==='site'); const w=krDur(a)[0]; const cw=caWho; caWho=()=>null; const wo=krDur(a)[0]; caWho=cw; return [w, wo]; }); ok(siteDur[0]===siteDur[1]+20, '서윤 약점: 현장 조사 +20분 ('+siteDur.join(' vs ')+')');
await p.evaluate(()=>{ caUse(); }); ok(await p.evaluate(()=>!K.caUsed && /두 가지는 먼저/.test(K.log.slice(-1)[0])), '자료가 없으면 못 씀("두 가지는 먼저 보고 오자")');
await p.evaluate(()=>{ const as=KP.actions.filter(a=>a.loc!=='site').slice(0,2); as.forEach(a=>kResearch(a.id)); caUse(); renderArena(); });
let r=await p.evaluate(()=>({used:K.caUsed, hint:K.syHint, log:K.log.slice(-1)[0], mark:!!document.querySelector('.ca-hint')})); ok(r.used && r.hint && r.mark, '자료 엮기 → 확인할 곳을 짚어 줌(사실은 안 알려 줌) · '+r.log);
ok(await p.evaluate(()=>{ caUse(); return K.log.filter(l=>/앞뒤가 안 맞는|어긋나는 데가/.test(l)).length===1; }), '한 판에 한 번만');
// 도현
await start('dohyun','f11',12); r=await p.evaluate(()=>{ const a=KP.actions.find(x=>x.loc==='any'&&!K.done[x.id]); const d0=krDur(a)[0]; caUse(); const d1=krDur(a)[0]; const t0=K.timeLeft; kResearch(a.id); const b2=KP.actions.find(x=>x.loc==='site'); return {d0,d1,left:K.dhLeft, tr:krTravel(b2), base:KP.travel||60}; });
ok(r.d1===Math.round(r.d0/2) && r.left===1, '도현 묶어서 예약: 다음 전화·온라인 조사 절반 시간 ('+r.d0+'→'+r.d1+'분, 남은 '+r.left+'건)');
ok(r.tr===r.base+30, '도현 약점: 현장 이동 +30분 ('+r.tr+')');
// 은경
await start('eunkyung','f11',13); await p.evaluate(()=>{ caUse(); renderArena(); }); await p.waitForTimeout(200);
r=await p.evaluate(()=>({t:(document.querySelector('.ca-ek')||{}).innerText||''})); ok(/12개월/.test(r.t) && /남는 현금/.test(r.t), '은경 자금 버티기 표: 3/6/9/12개월 이자·관리비와 남는 현금');
// 태식
await start('taesik','f11',14); r=await p.evaluate(()=>{ const h=KP.hidden.find(x=>x.k==='price'); const t0=K.timeLeft; caUse(); return {found:!!K.found[h.id], dt:t0-K.timeLeft, fee:K.cost.legal, log:K.log.slice(-1)[0]}; });
ok(r.found && r.dt===60 && r.fee>=10 && /확인해 두자/.test(r.log), '태식 옛 인맥: 실제 거래선 이야기 + 60분·10만원 + "자료로 확인"');
// 미정
await start('mijeong','f12',15); r=await p.evaluate(()=>{ let bb=Math.round(KP.minBid*1.1),t=0; while(t++<12){ kBid(bb); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; bb=Math.round(bb*1.06);} K.loan={none:true}; K.step='move'; K.scene=null; renderArena(); const card=!!document.querySelector('.ca-panel'); const n0=kfOccNeed(), c0=K.occ.coop; caUse(); return {card, n0, n1:kfOccNeed(), dc:K.occ.coop-c0}; });
ok(r.card && r.n1<r.n0 && r.dc>=12, '미정 조건 묶음: 명도 화면에서 쓰고 요구액↓ 협조도↑ ('+r.n0+'→'+r.n1+')');
r=await p.evaluate(()=>{ K.occ.coop=90; K.blk=K.blk||{}; K.blk.known=true; K.blk.place=true; K.occ.place=false; K.blk.truck=true; kMove('date'); kOffer(K.askNeed); const c0=K.occ.coop; for(let i=0;i<5;i++) kTick(1); return {c0, c1:K.occ.coop, warn:K.mjWarned}; });
ok(r.warn && r.c1<=r.c0-15, '미정 약점: 합의서 없이 나흘 → 신뢰 −15');
// 재훈
await start('jaehoon','f11',16); r=await p.evaluate(()=>{ let bb=Math.round(KP.minBid*1.1),t=0; while(t++<12){ kBid(bb); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; bb=Math.round(bb*1.06);} K.loan={none:true}; K.step='defect'; kDefect(); renderArena(); const card=!!document.querySelector('.ca-panel'); const r0=K.cost.repair, d0=K.day; caUse(); return {card, saved:r0-K.cost.repair, days:K.day-d0}; });
ok(r.card && r.saved>0 && r.days===3, '재훈 직접 손보기: 하자 화면에서 수리비 절반 절약, 사흘 소요 (−'+r.saved+'만원)');
// 인생 모드 밖(커리어만)에선 안 뜸
await p.evaluate(()=>{ const c=kcRec(); delete c.life; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f11'; kStart(3); K.intro=false; renderArena(); }); ok(await p.evaluate(()=>!caWho() && !document.querySelector('[data-cause]')), '캐릭터 없는 모드에선 한 수가 안 뜸');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
