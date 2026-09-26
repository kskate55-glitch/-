const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const start=(id,seed,cash)=>p.evaluate(([id,seed,cash])=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; const c=kcRec(); delete c.life; c.fr={full:true}; c.cash=cash; c.credit=[]; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; renderArena(); },[id,seed,cash]);
// 1) 모든 물건에 중개사 시세 전화
const miss=await p.evaluate(()=>{ const m=[]; for(const s of KF_SPECS){ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=s.id; kStart(3); K.intro=false; if(!KP.actions.some(a=>/중개/.test(a.t))) m.push(s.id); } return m; });
ok(miss.length===0, '22개 물건 전부 "중개사 전화" 조사가 있음 '+miss.join(','));
ok(await p.evaluate(()=>KF_SPECS.every(s=>s.hidden.filter(h=>h.k==='price').length<=1 && !s.hidden.some(h=>h.act&&h.act.t==='중개사 3곳 전화(시세)'))), '명세 원본은 건드리지 않음(물건을 여러 번 열어도 조사가 늘지 않음)');
// 2) 도현 f22: 전화하면 시세 감이 좁아짐
await start('f22',4,900000); let r=await p.evaluate(()=>{ const w0=lfBand().w; const a=KP.actions.find(x=>/중개/.test(x.t)); let n=0; while(!K.found.price && n++<10){ delete K.done[a.id]; K.timeLeft=9999; kResearch(a.id); } return {w0, w1:lfBand().w, found:!!K.found.price, log:K.log.slice(-4).join(' | ')}; });
ok(r.found && r.w1<r.w0, '도현 f22: 중개사 전화로 시세 범위가 좁아짐 ('+(r.w0*100).toFixed(1)+'% → '+(r.w1*100).toFixed(1)+'%)');
ok(/중개사/.test(r.log), '중개사 세 명의 말이 조사 기록에 남음');
r=await p.evaluate(()=>{ const c=keCards().find(c=>c.id==='price'); const e=evInfo(c); return e&&e.kind; }); ok(r==='claim', '중개사 시세 카드 = 🗣️ 당사자 주장');
// 3) f13: 다른 조사로 나오는 시세도 중개사 전화로 얻을 수 있음
await start('f13',4,900000); r=await p.evaluate(()=>{ const a=KP.actions.find(x=>x.id==='h_broker'); let n=0; while(!K.found.price && n++<20){ delete K.done[a.id]; K.timeLeft=9999; kResearch(a.id); } return !!K.found.price; });
ok(r, 'f13: 중개사 전화로도 시세 단서를 얻을 수 있음');
// 4) 보증금 모자라면 신용대출
await start('f12',6,100); await p.waitForTimeout(200);
r=await p.evaluate(()=>({box:!!document.getElementById('crBox'), gap:crGap(), dep:crDep()}));
ok(r.box && r.gap>0, '현금 100만원 < 보증금 '+r.dep+' → 신용대출 칸이 뜸 (모자란 돈 '+r.gap+')');
await p.evaluate(()=>{ document.getElementById('kBid').value=String(KP.minBid); document.querySelectorAll('details[open]').forEach(o=>o.open=false); });
await p.click('[data-kcseal]'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!K.sealed && /보증금이 모자라요/.test(document.getElementById('kBidErr').textContent)), '보증금 없이는 봉투에 못 넣음');
await p.click('[data-crtake="bank"]'); await p.waitForTimeout(300);
r=await p.evaluate(()=>({cash:kcRec().cash, dep:crDep(), credit:crOwed(), gap:crGap(), box:!!document.getElementById('crBox'), t:K.log.slice(-1)[0]}));
ok(r.gap===0 && r.credit>0 && r.cash>=r.dep && !r.box, '은행 신용대출로 보증금 마련 ('+r.t+')');
await p.evaluate(()=>{ document.getElementById('kBid').value=String(KP.minBid); }); await p.click('[data-kcseal]'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!!K.sealed), '이제 봉투에 넣을 수 있음');
// 5) 패찰 → 보증금 돌려받고 바로 갚기
r=await p.evaluate(()=>{ K.sealed=null; K.rivals=[{t:'x',lo:1.5,hi:1.6,p:1}]; kBid(KP.minBid); K.revealing=false; renderArena(); return {step:K.step, btn:!!document.querySelector('[data-crpay]')}; });
if(r.step==='lost'){ ok(r.btn, '패찰 화면에 "바로 갚기"'); await p.evaluate(()=>{ kcRec().cash+=50; renderArena(); }); await p.click('[data-crpay]'); await p.waitForTimeout(200); ok(await p.evaluate(()=>crOwed()===0), '바로 갚기 → 빚 0 (한 주치 이자만)'); }
else ok(false, '패찰 재현 실패 '+r.step);
// 6) 한도를 다 쓰면 빌릴 곳 없음
await start('f63',6,0); r=await p.evaluate(()=>({gap:crGap(), none:/빌릴 수 있는 곳이 없어요/.test(document.body.innerText)}));
ok(r.gap>4000 ? r.none : true, '보증금이 신용대출 한도보다 크면 "빌릴 곳 없음 — 이 물건은 넘기세요" (필요 '+r.gap+')');
// 7) 주간 모드에선 안 막음
r=await p.evaluate(()=>{ localStorage.clear(); const c=kcRec(); c.fr={full:true}; c.cash=0; KC_MODE='weekly'; K_PROP_NEXT='f12'; kStart(9); K.intro=false; return crOn(); }); ok(!r, '주간 도전 모드는 보증금 제한 없음');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
