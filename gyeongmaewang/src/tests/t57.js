// 확인창이 막힌 환경(아티팩트 샌드박스) — 한 번 더 누르기로 진행되는지
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{ window.confirm = ()=>false; });   // 샌드박스처럼 즉시 '취소'
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; c.cases=3; K=null; arenaTab='life'; LF_PICK='seoyun'; renderArena(); }); await p.waitForTimeout(400);
 await p.screenshot({path:`sc_sel_${w}.png`});
 const col = await p.evaluate(()=>{ const x=document.querySelector('[data-lfdetail]'), s=getComputedStyle(x); return [s.color, s.backgroundColor]; }); console.log(w,col);
 ok(!/rgb\(255, 255, 255\)|rgba\(255, 255, 255, 1\)/.test(col[1]), w+' 상세 보기 버튼 배경이 흰색 아님');
 await p.click('[data-lfstart="seoyun"]'); await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.getElementById('gxOp') && !!document.querySelector('.sc-armed') && !!document.querySelector('.sc-note')), w+' 첫 클릭: 빨간 버튼 + 질문 표시(아직 시작 안 함)');
 await p.screenshot({path:`sc_armed_${w}.png`});
 await p.click('[data-lfstart="seoyun"]'); await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!!document.getElementById('gxOp') && lfOn() && lfRec().char==='seoyun'), w+' 두 번째 클릭: 인생 시작');
 await p.click('[data-gxskip]'); await p.waitForTimeout(300); await p.click('[data-gxskip]'); await p.waitForTimeout(1300);
 // 6초 지나면 원래대로
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; c.cases=3; K=null; arenaTab='life'; LF_PICK='dohyun'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-lfstart="dohyun"]'); await p.waitForTimeout(6400);
 ok(await p.evaluate(()=>!document.querySelector('.sc-armed') && !document.querySelector('.sc-note') && /이 인생으로 시작/.test(document.querySelector('[data-lfstart]').innerText)), w+' 6초 지나면 버튼 원래대로');
 // 게시판 포기(week.js)도
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('dohyun'); lfRec().intro=false; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(300);
 const drop = await p.$('[data-bddrop]'); if(drop){ const n0 = await p.evaluate(()=>document.querySelectorAll('[data-bddrop]').length); await drop.click(); await p.waitForTimeout(200); await p.click('.sc-armed'); await p.waitForTimeout(300); ok(await p.evaluate(n0=>document.querySelectorAll('[data-bddrop]').length<n0, n0), w+' 게시판 포기도 두 번 누르면 됨'); }
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
