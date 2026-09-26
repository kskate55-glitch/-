const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
await p.evaluate(()=>{ localStorage.clear(); RD.clear(); });
// ② 사연
const L=[["","첫 줄 테스트 사연입니다 A","normal"],["","둘째 줄 테스트 사연 B","normal"],["","셋째 줄 C","normal"]];
await p.evaluate(L=>{ window.MT_SKIP_TALE=false; mtPlay(L,{name:"테스트"}); },L); await p.waitForTimeout(150);
ok(await p.evaluate(()=>!document.querySelector('[data-mtrd]')), '처음 보는 사연엔 "읽은 대사 넘기기"가 없음(새 정보는 못 건너뜀)');
for(let i=0;i<3;i++){ await p.click('.mt-card'); await p.waitForTimeout(80); }
ok(await p.evaluate(()=>!MT), '끝까지 넘기면 닫힘');
// 절반만 읽은 사연 + 새 줄
const L2=[L[0],L[1],["","새로 추가된 넷째 줄 D","normal"]];
await p.evaluate(L=>mtPlay(L,{name:"테스트"}),L2); await p.waitForTimeout(150);
let t=await p.evaluate(()=>{ const b=document.querySelector('[data-mtrd]'); return b?b.textContent:''; }); ok(/3번째 줄부터 새 내용/.test(t), '다시 보면 "⏩ 읽은 대사 넘기기 (3번째 줄부터 새 내용)" · '+t);
ok(await p.evaluate(()=>/읽음/.test(document.querySelector('.mt-top').innerText)), '읽은 줄엔 "읽음" 표시');
await p.click('[data-mtrd]'); await p.waitForTimeout(100); ok(await p.evaluate(()=>MT && MT.i===2 && !document.querySelector('[data-mtrd]')), '넘기면 새 줄에서 멈춤(새 줄은 넘기기 버튼 없음)');
await p.click('.mt-card'); await p.waitForTimeout(80);
await p.evaluate(L=>mtPlay(L,{name:"테스트"}),L2); await p.waitForTimeout(100);
t=await p.evaluate(()=>document.querySelector('[data-mtrd]').textContent); ok(/다 읽은 사연/.test(t), '전부 읽은 사연이면 "⏩ 다 읽은 사연 — 끝으로"');
await p.click('[data-mtrd]'); await p.waitForTimeout(80); ok(await p.evaluate(()=>!MT), '한 번에 끝남');
// ① 대사창 타자 효과
const typ=await p.evaluate(async()=>{ page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f11'; KC_INTRO=false; window.MT_SKIP_TALE=true; kcRec().fr={full:true}; kStart(3); K.intro=false; K.step='move'; K.scene={who:'occ', t:'타자 효과 확인용 아주 긴 문장입니다 — 여러 글자가 한 글자씩 찍혀야 합니다.', ex:'normal'}; VN_SHOWN=''; renderArena(); await new Promise(r=>setTimeout(r,30)); const a=document.getElementById('vnText').textContent.length; VN_SHOWN=''; renderArena(); await new Promise(r=>setTimeout(r,30)); const b2=document.getElementById('vnText').textContent.length; return {a,b:b2,full:document.getElementById('vnText').dataset.full.length}; });
ok(typ.a<typ.full && typ.b===typ.full, '처음 대사는 한 글자씩, 이미 읽은 대사는 한 번에 ('+typ.a+'/'+typ.full+' → '+typ.b+'/'+typ.full+')');
// 저장 유지
await p.waitForTimeout(600); await p.reload(); await p.waitForTimeout(800);
ok(await p.evaluate(()=>rdHas('셋째 줄 C')), '읽은 기록은 새로고침해도 남음');
// ③ 대출: 들어 본 상담사
const loanRun=async()=>{ await p.evaluate(()=>{ LN=null; document.querySelectorAll('#lnRoot').forEach(x=>x.remove()); window.LN_FAST=false; window.MT_SKIP_TALE=true; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f11'; KC_INTRO=false; kcRec().cash=5000; kStart(3); K.intro=false; let bb=Math.round(KP.minBid*1.1),t=0; while(t++<12){ kBid(bb); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; bb=Math.round(bb*1.06);} renderArena(); }); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const x=document.querySelector('[data-lnask="no"]'); if(x) x.click(); }); await p.waitForTimeout(300);
  const id=await p.evaluate(()=>{ const c=document.querySelector('[data-lncard]'); if(!c) return null; c.click(); return c.dataset.lncard; });
  const t0=Date.now(); let n=0; while(n++<100){ const done=await p.evaluate(()=>!!(LN && !LN.queue)); if(done) break; await p.waitForTimeout(100); } return {id, ms:Date.now()-t0}; };
const r1=await loanRun(); const r2=await loanRun();
const ln = r1.id===r2.id && r2.ms < 800 && r1.ms > r2.ms*2; console.log('   첫 상담 '+r1.ms+'ms · 다시 들을 때 '+r2.ms+'ms ('+r1.id+'/'+r2.id+')', await p.evaluate(()=>JSON.stringify({heard:kcRec().lnHeard, q:LN&&LN.queue, step:LN&&LN.step, msgs:LN&&LN.msgs&&LN.msgs.length})));
ok(ln, '전에 들어 본 대출 상담사는 카톡이 한 번에 뜸');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
