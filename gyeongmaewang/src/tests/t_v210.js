// v210: 외전 화자별 색 · 조사노트가 사건파일을 다시 깜빡이지 않음 · 사건파일은 가운데(입찰표와 안 겹침)+드래그 · 명도대상자 말풍선 · 경쟁자 현실 보정
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
// 1) 외전: 주인공과 상대의 글자색이 다르다
const v=await p.evaluate(()=>{ localStorage.clear(); lfNew('mijeong'); ilStart('M01',{album:true}); ilCfgSet({speed:'instant'}); let me=null, other=null, g=0;
  while(ILR&&!ILR.done&&g++<400&&!(me&&other)){ const box=document.querySelector('.il-box'); const c=getComputedStyle(box.querySelector('.il-text')).color; if(box.classList.contains('il-v-me')) me=c; if(/il-v-o\d/.test(box.className)) other=c; if(ILR.panel) ilPanelClose(); if(ILR.choosing){ ilPick(ILR.choosing.opts[0].id); continue; } ILR.lastAdv=0; ilAdvance(); }
  ilClose(true); return {me, other}; });
ok(v.me && v.other && v.me!==v.other, `외전 대화: 주인공 ${v.me} / 상대 ${v.other} — 서로 다른 색`);
// 2) 조사 화면: 사건 파일 가운데 · 입찰표 그대로 · 주인공 안 가림 · 노트 눌러도 파일 등장 애니메이션 없음
await p.evaluate(()=>{localStorage.clear();kcRec().fr={full:true};page='arena';arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false;kStart(3);K.intro=false;renderArena();}); await p.waitForTimeout(3000);
await p.evaluate(()=>{ kResearch('docs'); renderArena(); }); await p.waitForTimeout(600);
await p.click('.stg-tab[data-stg="file"]'); await p.waitForTimeout(700);
const R=s=>p.evaluate(s=>{const e=document.querySelector(s); if(!e||e.hidden) return null; const r=e.getBoundingClientRect(); return (r.width&&getComputedStyle(e).visibility!=='hidden')?{l:r.left,r:r.right,t:r.top,b:r.bottom}:null;},s);
const over=(a,c)=>a&&c&&a.l<c.r-1&&c.l<a.r-1&&a.t<c.b-1&&c.t<a.b-1;
const f=await R('.stg-file'), sh=await R('.stg-sheet'), pl=await R('.vn-player'), vb=await R('.vn-box');
ok(f && sh && !over(f,sh), '사건 파일과 입찰표가 동시에 보이고 안 겹침');
ok(f && pl && f.l >= pl.r-1, '사건 파일이 주인공 그림을 안 가림');
ok(f && vb && f.t >= vb.b-1, '사건 파일이 대사창 아래에서 시작');
await p.click('.nx-notetab'); await p.waitForTimeout(40);
ok(await p.evaluate(()=>!document.getAnimations().some(a=>{const t=a.effect&&a.effect.target; return t&&t.closest&&t.closest('.stg-file')&&a.playState==='running';})), '조사 노트를 눌러도 사건 파일이 다시 깜빡이지 않음');
await p.click('.nx-notetab'); await p.waitForTimeout(300);
const f1=await R('.stg-file'); const g=await (await p.$('.stg-grip')).boundingBox(); await p.mouse.move(g.x+g.width/2,g.y+g.height/2); await p.mouse.down(); await p.mouse.move(g.x+g.width/2-80,g.y+g.height/2+50,{steps:6}); await p.mouse.up(); await p.waitForTimeout(200);
const f2=await R('.stg-file'); ok(f2 && Math.abs(f2.l-(f1.l-80))<6 && Math.abs(f2.t-(f1.t+50))<6, `사건 파일 끌어서 옮김 (${Math.round(f1.l)},${Math.round(f1.t)}→${Math.round(f2.l)},${Math.round(f2.t)})`);
await p.evaluate(()=>{ kResearch('neigh'); renderArena(); }); await p.waitForTimeout(500);
const f3=await R('.stg-file'); ok(f3 && Math.abs(f3.l-f2.l)<3 && Math.abs(f3.t-f2.t)<3, '다시 그려도 옮긴 자리 유지');
// 3) 명도: 상대 대사는 그 사람 가슴 높이 말풍선, 이름표가 무대 안에 보임
for(const [w,h] of [[1280,800],[390,844]]){ await p.setViewportSize({width:w,height:h});
  await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; cpUnlockAll(); page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f34'; KC_INTRO=false; kStart(4242); K.intro=false; K.step='move'; renderArena(); }); await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>{ const st=document.querySelector('.k-stage'), box=st&&st.querySelector('.vn-box'), sp=st&&st.querySelector('.vn-sprite'), nm=box&&box.querySelector('.vn-name'); if(!box||!sp||!nm) return null; const s=st.getBoundingClientRect(), b=box.getBoundingClientRect(), r=sp.getBoundingClientRect(), n=nm.getBoundingClientRect(); return {bub:box.classList.contains('vn-npcbub'), nameIn:n.top>=s.top-1 && n.bottom<=s.bottom, chest:b.top>=r.top+r.height*0.12 && b.top<=r.top+r.height*0.55, inside:b.left>=s.left-1&&b.right<=s.right+1, bg:getComputedStyle(box).backgroundColor}; });
  ok(m && m.bub && m.nameIn && m.chest && m.inside, `${w} 명도대상자 대사 = 가슴 높이 말풍선 · 이름표 안 잘림 ${JSON.stringify(m)}`);
}
// 4) 경쟁자 현실 보정: 평균 응찰자 · 단독 비율 · 서울 빌라 낙찰가율
const st=await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; kcRec().bids=5; cpUnlockAll(); const _r=renderArena; renderArena=function(){}; let n=0,sum=0,solo=0,rat=[]; for(let s=1;s<=300;s++){ K_PROP_NEXT='k1'; KC_MODE='career'; KC_INTRO=false; kStart(s*7919); K.intro=false; const k=K.rivals.length; sum+=k+1; if(!k) solo++; const r=kRng(s+3); let mx=KP.minBid; K.rivals.forEach(v=>{ const a=KP.minBid*(v.lo+(v.hi-v.lo)*r()); if(a>mx) mx=a; }); rat.push(mx/KP.appraisal); n++; } renderArena=_r; rat.sort((a,b)=>a-b); return {avg:sum/n, solo:solo/n, med:rat[Math.floor(n/2)]}; });
ok(st.avg>=3.6 && st.avg<=4.9, `평균 응찰자(나 포함) ${st.avg.toFixed(2)}명 — 실제 수도권 빌라 4.2~4.4명 근처`);
ok(st.solo>=0.1 && st.solo<=0.3, `단독 입찰 ${(st.solo*100).toFixed(0)}% — 가끔은 나 혼자`);
ok(st.med>=0.70 && st.med<=0.79, `서울 빌라 낙찰가율 중간값 ${(st.med*100).toFixed(1)}% — 실제 약 73~75%`);
const first=await p.evaluate(()=>{ localStorage.clear(); delete arenaRec().career; kcRec().fr={full:true}; const _r=renderArena; renderArena=function(){}; let bad=0; for(let s=1;s<=60;s++){ K_PROP_NEXT='k1'; KC_MODE='career'; KC_INTRO=false; kStart(s*31); if(K.rivals.length<1||K.rivals.length>3) bad++; } renderArena=_r; return bad; });
ok(first===0, '생애 첫 입찰은 경쟁자 1~3명(보통 판)');
await b.close(); console.log(errs.length?'FAIL '+errs.join(' | '):'ALL OK');})();
