// v207 — ①상가 물건 수리 뒤 배경 ②외전 자동 시작 ③칸 나누기 퀴즈 제거 ④M01 이주비·단계표 ⑤하루 조사 최소 4시간 ⑥경고 글자 진하게
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
// ① 상가
const c=await p.evaluate(()=>{ const out={}; for(const id of ['f32','f31','f61','f63','f64','f11']){ localStorage.clear(); arenaTab='king';KC_MODE='career';K_PROP_NEXT=id;KC_INTRO=false; kStart(7); K.intro=false; K.repair={id:'good',t:'B. 매도용 가성비'}; K.step='list'; const h=kStage('bg_room_clean','narr',null,'수리 끝'); out[id]=h.includes(artUrl('bg_case_'+id+'_ext')); } return out; });
ok(c.f32&&c.f31&&c.f61&&c.f63&&c.f64, '상가·식당·모텔·공장은 수리 뒤 장면에 그 건물 외관 '+JSON.stringify(c));
ok(!c.f11, '빌라(f11)는 예전처럼 거실 그림');
// ⑤ 최소 4시간
const mn=await p.evaluate(()=>{ let m=1e9; for(const ch of LF_CHARS.map(x=>x.id)){ for(const path of [null].concat((LF_PATHS[ch]?LF_PATHS[ch].opts:[]).map(o=>o.id))){ localStorage.clear(); lfNew(ch); lfRec().path=path; for(let d=0;d<7;d++) m=Math.min(m,lfWindow(d)[1]); } } return m; });
ok(mn>=240, '모든 캐릭터·갈림길·요일 하루 조사 시간 ≥ 4시간 (최소 '+mn+'분)');
// ③ 퀴즈 제거
const srt=await p.evaluate(()=>IL_ORDER.reduce((n,id)=>n+IL[id].prog.filter(x=>x.k==='sheet'&&IL[id].sheets[x.id].type==='sort').length,0));
ok(srt===0, '칸 나누기(sort) 시트가 외전 어디에도 안 뜸');
// ④ M01 계산표
const m=await p.evaluate(()=>{ localStorage.clear(); lfNew('mijeong'); ilStart('M01',{album:true}); const i=ILR.def.prog.findIndex(n=>n.k==='sheet'&&n.id==='hold'); ILR.pc=i; ilRun(); const a=document.querySelector('.il-panel').innerText; ilSheetAct ? 0:0; document.querySelector('[data-ilcalc="stage:move"]').click(); document.querySelector('[data-ilcalc="mv:self"]').click(); const bb=document.querySelector('.il-panel').innerText; const side=document.querySelector('.il-calc-2col .il-side'); const r=side&&side.getBoundingClientRect(), t=document.querySelector('.il-calc-2col .il-tbl-wrap').getBoundingClientRect(); ilClose(true); return {a:/이주비/.test(a)&&/관리처분인가/.test(a), b:/60,000,000원 받음/.test(bb)&&/내가 부담/.test(bb)&&/곧 철거/.test(bb), beside:r&&r.left>t.right-5}; });
ok(m.a, 'M01 계산표에 이주비 줄 + 재개발·재건축 단계표');
ok(m.b, '이주·철거 가정 → 이주비 6천만원·이자·수리비 0원 반영');
ok(m.beside, 'PC에서는 단계표가 계산표 옆에 나란히');
// ② 자동 시작
const au=await p.evaluate(async()=>{ localStorage.clear(); IL_AUTOPLAY=true; const c=kcRec(); c.fr={full:true}; lfNew('seoyun'); const L=lfRec(); L.story=true; L.intro=false; K=null; page='arena'; arenaTab='life'; LF_SPOT='laptop'; epOf('seoyun').res=[{id:'k1',pct:80,full:true,profit:500}]; IL_LATER={}; cpRec().il=undefined; save(); renderArena(); await new Promise(r=>setTimeout(r,900)); const first=!!ILR&&ILR.id==='S01'; ilClose(true); renderArena(); await new Promise(r=>setTimeout(r,900)); const again=!!ILR; return {first, again, auto:ilState('S01').auto}; });
ok(au.first, '첫 사건 끝나고 방에 오면 외전 S01이 누르지 않아도 바로 시작');
ok(!au.again && au.auto, '한 번 뜬 뒤 닫으면 다시 강제로 뜨지 않음(알림·책장으로 이어 읽기)');
// ⑥ 글자
const col=await p.evaluate(()=>{ const d=document.createElement('div'); d.innerHTML='<div class="bw bw-info"><p class="note">x</p></div>'; document.body.appendChild(d); const col=getComputedStyle(d.querySelector('.note')).color; d.remove(); return col; });
ok(col==='rgb(31, 31, 31)', "'안 해 본 조사' 줄 글자 진하게 "+col);
ok(errs.filter(e=>e.startsWith('pageerror')).length===0, 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join('|'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
