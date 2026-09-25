// 🎬 6인 오프닝 · 선택 화면 · 전환 · 인생 조건
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const IDS=['seoyun','dohyun','mijeong','jaehoon','eunkyung','taesik'];
for(const [w,h] of [[1280,800],[390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(w+' pageerror '+e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(300); await p.evaluate(()=>{try{cpUnlockAll()}catch(e){}}); await p.waitForTimeout(700);
 const bad = async tag => { const t = await p.evaluate(()=>document.body.innerText); const m=t.match(/undefined|NaN|\[object|Infinity/); if(m) errs.push(w+' '+tag+' '+m[0]+' :: '+t.slice(Math.max(0,t.indexOf(m[0])-50), t.indexOf(m[0])+20)); };
 for(const id of IDS){
  await p.evaluate(()=>{ const c=kcRec(); delete c.life; K=null; arenaTab='life'; LF_PICK=null; renderArena(); });
  await p.waitForTimeout(200); await bad('select');
  ok((await p.$$('.lf-stars')).length===6, w+' '+id+' 별점 6장');
  await p.hover(`[data-lfpick="${id}"]`); await p.click(`[data-lfpick="${id}"]`); await p.waitForTimeout(250);
  ok(await p.evaluate(()=>document.querySelectorAll('.lf-card.dim').length===5 && !!document.querySelector('.lf-quote') && !!document.querySelector('.lf-life')), w+' '+id+' 포커스(다른 카드 흐림·대사·이 캐릭터의 삶)');
  await p.click('[data-lfdetail]'); await p.waitForTimeout(150); ok(!!(await p.$('.lf-focus .lf-stats')), w+' '+id+' 상세 수치'); await bad('detail');
  if(id==='seoyun' && w===1280) await p.screenshot({path:`gx_select_${w}.png`});
  await p.click(`[data-lfstart="${id}"]`); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>!!document.getElementById('gxOp') && lfOn()), w+' '+id+' 오프닝 시작');
  ok(await p.evaluate(id=>kaScene()==='op_'+id, id), w+' '+id+' 오프닝 BGM');
  await p.waitForTimeout(3000); await p.click('#gxOp'); await p.waitForTimeout(400);
  // 장면 몇 개 넘기기
  for(let i=0;i<5;i++){ await p.click('#gxOp .gx-box, #gxOp'); await p.waitForTimeout(250); }
  if(id==='dohyun') await p.screenshot({path:`gx_op_${w}.png`});
  await bad('op');
  await p.click('[data-gxskip]'); await p.waitForTimeout(400);
  ok(await p.evaluate(()=>/EP\.0/.test(document.querySelector('.gx-title').innerText)), w+' '+id+' SKIP → EP.0 타이틀');
  await p.click('[data-gxskip]'); await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>!document.getElementById('gxOp') && arenaTab==='life' && !lfRec().intro && !!document.querySelector('[data-lfspot]')), w+' '+id+' 거점 도착');
  ok(await p.evaluate(()=>document.querySelectorAll('.gx-op,.gx-veil').length<=1), w+' '+id+' 화면 겹침 없음');
  ok(await p.evaluate(()=>kaScene()!=='op_'+lfRec().char), w+' '+id+' 오프닝 BGM 해제');
  await bad('base');
 }
 // 인생 조건: 도현 월급·연차, 서윤 조사 3일
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('dohyun'); lfRec().intro=false; arenaTab='life'; renderArena(); });
 const m = await p.evaluate(()=>{ const M=lfMonthly(0.5); return [M.income, M.rent, lfRec().leave]; }); console.log(w,'dohyun month',m);
 ok(m[0]===390 && m[2]===15, w+' 도현 월급 390·연차 15');
 await p.evaluate(()=>{ kcRec().cash+=3000; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(200);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} }); await p.waitForTimeout(1600);
 const dd = await p.evaluate(()=>[K.lf.days.map(d=>d.dow), lfCanLeave(), !!document.querySelector('[data-lfleave]')]); console.log(w,'days',dd);
 if(dd[1]){ await p.click('[data-lfleave]'); await p.waitForTimeout(300); ok(await p.evaluate(()=>lfRec().leave===14 && K.timeLeft>150), w+' 연차 쓰면 시간이 늘어난다'); }
 await bad('research');
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; K=null; kcRec().cash+=500; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(200);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 ok(await p.evaluate(()=>K.lf.days.length===3), w+' 서윤 조사 3일');
 // 갈림길 · 벽
 await p.evaluate(()=>{ K=null; kcRec().total=12000; arenaTab='life'; LF_SPOT='wall'; renderArena(); }); await p.waitForTimeout(300);
 ok(!!(await p.$('[data-lfpath]')), w+' 인생 갈림길 뜸'); await bad('path');
 await p.click('[data-lfpath="job"]'); await p.waitForTimeout(1600);
 ok(await p.evaluate(()=>lfRec().path==='job' && lfMonthly().income===300 && lfWindow(2)[0]===1170), w+' 서윤 취업 → 월급 300·평일 저녁만');
 ok(!(await p.$('#cpEnd')), w+' 갈림길만으로는 엔딩 없음'); await p.evaluate(()=>{ LF_SPOT='wall'; renderArena(); }); await p.waitForTimeout(200); await p.click('[data-cpsettle]'); await p.click('[data-cpsettle]'); await p.waitForTimeout(500); ok(!!(await p.$('#cpEnd')), w+' 지금 결산하기 → 엔딩 화면'); await p.click('[data-cp="go"]'); await p.waitForTimeout(400); await p.click('[data-cp="career"]'); await p.waitForTimeout(500);
 ok(!!(await p.$('[data-gxreplay="seoyun"]')), w+' 벽: 오프닝 다시 보기');
 await p.screenshot({path:`gx_wall_${w}.png`});
 // 전환 배너: 자고 일어나기
 await p.evaluate(()=>{ LF_SPOT='bed'; renderArena(); }); await p.waitForTimeout(1000);
 await p.click('[data-lfdo="sleep"]'); await p.waitForTimeout(150);
 ok(await p.evaluate(()=>!!document.querySelector('.gx-veil')), w+' 자고 일어나면 날짜 전환');
 await p.waitForTimeout(1500); ok(await p.evaluate(()=>!document.querySelector('.gx-veil')), w+' 전환 배너 사라짐');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
 await p.evaluate(()=>localStorage.clear()); await p.close();
}
console.log('errors', errs); await b.close();})();
