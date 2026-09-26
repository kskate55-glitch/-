const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const start=async(id)=>{ await p.evaluate(id=>{ localStorage.clear(); kcRec().fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false; K_PROP_NEXT=id; kStart(9); K.intro=false; K.step='move'; K.loan={none:true}; K.scene=null; K.occ.spInit=true; K.occ.slam=false; renderArena(); },id); await p.waitForTimeout(400); };
const listen=async()=>{ await p.evaluate(()=>{ const t=K.occ.turns; kMove('listen'); if(K.occ.turns===t) kMove('listen'); renderArena(); }); await p.waitForTimeout(1800); };
const advanceToChoice=async()=>{ for(let i=0;i<14;i++){ if(await p.$('.tt-card')) return true; const c=await p.$('#mtTale [data-mtnext]'); if(!c) return false; await p.click('#mtTale .mt-card'); await p.waitForTimeout(120); } return !!(await p.$('.tt-card')); };
// ① 형편 어려운 점유자(f12 청년): 공감이 먹힌다
await start('f12'); await listen();
ok(await advanceToChoice(), w+' f12 사연 중간에 "뭐라고 답할까?" 선택지');
const c0=await p.evaluate(()=>({n:document.querySelectorAll('[data-ttpick]').length, co:K.occ.coop, re:K.occ.resist}));
ok(c0.n===3, w+' 선택지 3개(공감·해결·원칙)');
if(w===1280) await p.screenshot({path:'v217_choice.png'});
// 선택 카드에서 아무 데나 눌러도 안 넘어간다
await p.click('#mtTale .mt-top small'); await p.waitForTimeout(150); ok(!!(await p.$('.tt-card')), w+' 선택 전엔 탭해도 안 넘어감');
await p.click('[data-ttpick="warm"]'); await p.waitForTimeout(200);
const c1=await p.evaluate(()=>({co:K.occ.coop, re:K.occ.resist, txt:document.getElementById('mtTale').innerText}));
ok(c1.co>c0.co && c1.re<c0.re, w+` f12 공감 → 협조 ${c0.co}→${c1.co}, 버팀 ${c0.re}→${c1.re}`);
ok(/나/.test(c1.txt), w+' 내 대답이 한 줄로 뜸');
let seen=''; for(let i=0;i<4;i++){ seen+=await p.evaluate(()=>document.getElementById('mtTale')?document.getElementById('mtTale').innerText:''); await p.click('#mtTale .mt-card').catch(()=>{}); await p.waitForTimeout(120); }
ok(/💡 먹혔다/.test(seen), w+' 💡 왜 먹혔는지 설명');
await p.evaluate(()=>{ if(typeof mtClose==='function' && MT) mtClose(); });
// ② 가장임차인(f51): 공감은 역효과, 원칙이 먹힌다
await start('f51'); await listen(); ok(await advanceToChoice(), w+' f51 선택지');
const d0=await p.evaluate(()=>({co:K.occ.coop, re:K.occ.resist}));
await p.click('[data-ttpick="warm"]'); await p.waitForTimeout(200);
const d1=await p.evaluate(()=>({co:K.occ.coop, re:K.occ.resist}));
ok(d1.re>d0.re, w+` 가장임차인에게 공감 → 버팀 ${d0.re}→${d1.re}(역효과)`);
await p.evaluate(()=>{ if(MT) mtClose(); });
// ③ 숫자키로도 고른다(원칙=3)
await start('f51'); await p.evaluate(()=>{ K.occ.heard=0; }); await listen(); await advanceToChoice();
const e0=await p.evaluate(()=>K.occ.resist); await p.keyboard.press('3'); await p.waitForTimeout(200); const e1=await p.evaluate(()=>K.occ.resist);
ok(e1<e0-5, w+` 키보드 3 = 원칙 → 버팀 ${e0}→${e1}`);
await p.evaluate(()=>{ if(MT) mtClose(); });
// ④ 건너뛰기: 선택 없이 닫힘, 효과 없음
await start('f12'); await listen(); await advanceToChoice(); const s0=await p.evaluate(()=>K.occ.coop); await p.click('[data-mtskip]'); await p.waitForTimeout(200);
ok(await p.evaluate(s0=>!document.getElementById('mtTale') && K.occ.coop===s0, s0), w+' 건너뛰기 → 효과 없이 닫힘');
// ⑤ 매수자: 원하는 걸 짚으면 flex↓
if(w===1280){
  const bz=await p.evaluate(()=>{ K_PROP_NEXT='f11'; kStart(3); K.intro=false; K.repair=Object.assign({},K_REPAIR.find(x=>x.id==='min')); K.step='list'; kList(KP.list[0]); K.sale.offer={amt:KP.list[2], buyer:Object.assign({},K_BUYERS.find(x=>x.t==='신혼부부'))}; renderArena(); return ST_TYPES['신혼부부'].give; });
  await p.waitForTimeout(3500); await p.click('[data-kftalk="buyer"]'); await p.waitForTimeout(300); ok(await advanceToChoice(), '매수자 사연 끝에 "무엇을 양보할까"');
  const f0=await p.evaluate(()=>K.sale.offer.buyer.flex); await p.click(`[data-ttpick="${bz}"]`); await p.waitForTimeout(200);
  const f1=await p.evaluate(()=>({f:K.sale.offer.buyer.flex, hit:K.sale.offer.ttHit})); ok(f1.hit && f1.f<f0, `신혼부부(원하는 것: ${bz}) 짚음 → 흥정 여지 ${f0.toFixed(3)}→${f1.f.toFixed(3)}`);
  await p.evaluate(()=>{ if(MT) mtClose(); });
}
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
