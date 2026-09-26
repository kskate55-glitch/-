const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const start=(id,seed)=>p.evaluate(([id,seed])=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; const c=kcRec(); delete c.life; c.fr={full:true}; c.cash=900000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; ['docs','trade','court'].forEach(x=>kResearch(x)); renderArena(); return KP.short; },[id,seed]);
// 1) 선순위가 제목에 적힌 f53 — 입찰표에 🚨
let s=await start('f53',5); await p.waitForTimeout(200);
let r=await p.evaluate(()=>{ const W=bwInfo(); const el=document.querySelector('.bw[data-bw="sheet"]'); return {lv:W.level, flags:W.flags, legal:W.legal.map(a=>a.t), txt:el?el.innerText:''}; });
ok(r.lv==='danger' && /선순위/.test(r.txt) && /명세서/.test(r.txt), '제목에 선순위 + 명세서 정독 안 함 → 입찰표에 🚨 ('+r.legal.join('/')+')');
ok(/모르는 비용 여유/.test(r.txt), '확인 안 하고 쓸 때 뺄 여유 금액을 알려 줌');
// 2) 숨은 위험 정보를 쓰지 않는다 — found를 바꿔도 결과가 같아야
r=await p.evaluate(()=>{ const pick=W=>JSON.stringify([W.level,W.flags,W.legal.map(a=>a.id),W.other.map(a=>a.id),W.pct]); const a=pick(bwInfo()); const f=Object.assign({},K.found); KP.hidden.forEach(h=>K.found[h.id]=true); const b=pick(bwInfo()); K.found=f; return a===b; });
ok(r, '숨은 위험 목록은 경고 판정·여유 비율에 영향 없음(탐지기가 되지 않음)');
// 3) 봉투에 넣은 뒤: 체크 전엔 제출 안 됨, 체크하면 제출
await p.evaluate(()=>{ document.getElementById('kBid').value=String(Math.round(KP.minBid*1.2/10)*10); document.querySelectorAll('details[open]').forEach(o=>o.open=false); });
await p.click('[data-kcseal]'); await p.waitForTimeout(1500);
ok(await p.evaluate(()=>!!document.getElementById('bwAck') && /조사하러 돌아가기/.test(document.body.innerText)), '봉투 화면에 확인 체크 + "조사하러 돌아가기"');
await p.click('[data-kbid]'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>!K.result && !!K.sealed), '체크 안 하면 제출이 막힘');
await p.check('#bwAck'); await p.click('[data-kbid]'); await p.waitForTimeout(600);
ok(await p.evaluate(()=>!!K.result && K.bwAcked), '체크하면 제출됨');
// 4) 권리 확인을 하면 🚨가 내려감
await start('f53',6); r=await p.evaluate(()=>{ bwInfo().legal.forEach(a=>kResearch(a.id)); renderArena(); return bwInfo().level; });
ok(r!=='danger', '명세서 정독을 하고 나면 🚨가 사라짐 ('+r+')');
// 5) 위험 제목이 없는 물건은 🚨 없음, 제출 게이트 없음
await start('f31',7); r=await p.evaluate(()=>({lv:bwInfo().level, res:bwInfo().reserve}));
ok(r.lv!=='danger', '평범한 물건엔 🚨 없음 ('+r.lv+')');
// 6) 은경 계산기가 숨은 위험 개수를 말하지 않음
r=await p.evaluate(()=>{ const c=kcRec(); lfNew('eunkyung'); lfRec().intro=false; KC_MODE='career'; K_PROP_NEXT='f53'; kStart(8); K.intro=false; renderArena(); return document.body.innerText; });
ok(!/모르는 위험 \d/.test(r), '은경 계산기: "모르는 위험 N개"(숨은 정보) 대신 안 해 본 조사 수');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
