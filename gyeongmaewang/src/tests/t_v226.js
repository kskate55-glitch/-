const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,860],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.goto('http://localhost:8765/rights-study.html'); await p.waitForTimeout(700);
// 첫 화면 케이스 상자 없음
await p.evaluate(()=>{ localStorage.clear(); location.hash=''; }); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
ok(await p.evaluate(()=>{ const h=homeHTML(); return !/kc-box|케이스 상자/.test(h) && !/data-ofgo="board"|data-kcnew="weekly"/.test(h); }), w+' 첫 화면에 케이스 상자·게시판·이번 주 경매 없음');
const go=async(id,sid)=>{ await p.evaluate(([id,sid])=>{ ilStart(id,{album:true}); ilCfgSet({speed:'instant'}); const i=ILR.def.prog.findIndex(n=>n.k==='sheet'&&n.id===sid); ILR.pc=i; ilRun(); },[id,sid]); await p.waitForTimeout(200); };
const clk=async sel=>{ await p.click(sel); await p.waitForTimeout(120); };
// S03 준비물
await go('S03','attach');
ok(await p.$$eval('.il-mk-pencil .il-mk-it',x=>x.length)===9, w+' S03 준비물 카드 9장');
for(const i of [0,2,3,5,6,8]) await clk(`[data-ilmark="${i}"]`);
ok(await p.$$eval('.il-pencil',x=>x.length)===6, w+' 누른 카드에 빨간 색연필 동그라미');
await p.waitForTimeout(450); if(w===1280) await p.screenshot({path:'v226_pencil.png'}); else await p.screenshot({path:'v226_pencil_m.png'});
await clk('[data-ilsheet="check"]'); ok(await p.evaluate(()=>/완벽해요/.test(document.querySelector('.il-panel').innerText)), w+' 준비물 정답 확인');
await p.evaluate(()=>ilClose(true));
// S03 말소 — 개시결정 빼먹기
await go('S03','match');
for(const i of [1,2,3,5,6]) await clk(`tr[data-ilmark="${i}"]`);
ok(await p.$$eval('.il-mv-list li',x=>x.length)===5, w+' 줄을 누르면 오른쪽 목록으로 옮겨짐');
await clk('[data-ilsheet="check"]');
const mv=await p.evaluate(()=>document.querySelector('.il-panel').innerText);
ok(/꼭 넣어야 해요/.test(mv), w+' 개시결정 빼먹으면 빠졌다고 표시');
if(w===1280) await p.screenshot({path:'v226_malso_miss.png'}); else await p.screenshot({path:'v226_malso_m.png'});
await clk('[data-ilsheet="show"]'); await clk('[data-ilsheet="done"]');
// 다시 — 빼먹은 채로 설명 없이 진행할 수 없으니, 대신 miss 분기 검사: 직접 결과 주입
const br=await p.evaluate(()=>{ ILR.sheetRes={match:{right:false,own:true,sel:{1:1,2:1,3:1,5:1,6:1}}}; return {miss:ilTest('miss_match_4'), right:ilTest('right_match')}; });
ok(br.miss && !br.right, w+' 선배 확인 분기: 개시결정 빠짐 → miss_match_4');
await p.evaluate(()=>ilClose(true));
// 대본 흐름 끝까지: 정답 → 칭찬 대사
const lines=await p.evaluate(()=>{ ilStart('S03',{album:true}); ilCfgSet({speed:'instant'}); const seen=[]; let g=0;
  while(ILR && !ILR.done && g++<3000){ if(ILR.choosing){ ilPick(ILR.choosing.opts[0].id); continue; }
    if(ILR.panel==='sheet'){ const sh=ILR.def.sheets[ILR.sheetId]; if(sh.type==='mark'){ ILR.sheetSt.sel={}; sh.ans.forEach(i=>ILR.sheetSt.sel[i]=true); ilSheetAct('check'); ilSheetAct('done'); } else { ilSheetAct('show'); ilSheetAct('done'); } continue; }
    if(ILR.panel){ ilPanelClose(); continue; } seen.push(document.querySelector('.il-text').textContent); ILR.lastAdv=0; ilAdvance(); }
  ilClose(true); return seen.join('\n'); });
ok(/경매개시결정까지 넣었네요/.test(lines) && !/하나 빠졌어요/.test(lines), w+' 정답이면 선배가 "완벽" 확인');
// S01 영수증 퀴즈
await go('S01','axes'); await clk('[data-ilmark="2"]'); await clk('[data-ilsheet="check"]');
ok(await p.evaluate(()=>/가족 외식은 생활비/.test(document.querySelector('.il-panel').innerText)), w+' S01 비용 안 되는 영수증 퀴즈');
if(w===1280) await p.screenshot({path:'v226_receipt.png'});
await p.evaluate(()=>ilClose(true));
// D03 종소세
await go('D03','folder'); await clk('[data-ilmark="0"]'); await clk('[data-ilsheet="check"]');
ok(await p.evaluate(()=>/1월은 연말정산/.test(document.querySelector('.il-panel').innerText)), w+' D03 오답이면 이유');
await clk('[data-ilmark="1"]'); await clk('[data-ilsheet="check"]');
ok(await p.evaluate(()=>/매년 5월/.test(document.querySelector('.il-panel').innerText)), w+' D03 종합소득세 5월 정답');
if(w===1280) await p.screenshot({path:'v226_quiz.png'});
await p.evaluate(()=>ilClose(true));
// E03 공동입찰
await go('E03','memo'); await clk('[data-ilmark="0"]'); await clk('[data-ilsheet="check"]');
ok(await p.evaluate(()=>/위임장/.test(document.querySelector('.il-panel').innerText)), w+' E03 공동입찰 서류 퀴즈');
await p.evaluate(()=>ilClose(true));
const sw=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1); ok(sw, w+' 가로 스크롤 없음');
await p.close(); }
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.join('|'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
