const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,860],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
// 4편 끝까지 읽기
for(const id of ['J01','J03','T01','T03']){
  const r=await p.evaluate(id=>{ ilStart(id,{album:true}); ilCfgSet({speed:'instant'}); const seen=[], sheets=[]; let g=0;
    while(ILR && !ILR.done && g++<3000){ if(ILR.choosing){ ilPick(ILR.choosing.opts[0].id); continue; }
      if(ILR.panel==='sheet'){ sheets.push(ILR.sheetId+':'+ILR.def.sheets[ILR.sheetId].type); const sh=ILR.def.sheets[ILR.sheetId]; if(sh.type==='mark'){ ILR.sheetSt.sel={}; sh.ans.forEach(i=>ILR.sheetSt.sel[i]=true); ilSheetAct('check'); } ilSheetAct('done'); continue; }
      if(ILR.panel){ ilPanelClose(); continue; } seen.push(document.querySelector('.il-text').textContent); ILR.lastAdv=0; ilAdvance(); }
    const done=!ILR||ILR.done; ilClose(true); return {done, n:seen.length, sheets}; }, id);
  ok(r.done && r.n>20, `${w} ${id} 끝까지 읽힘 (대사 ${r.n}줄, 시트 ${r.sheets.join(',')})`);
}
// J01 계산표 3칸
await p.evaluate(()=>{ ilStart('J01',{album:true}); const i=ILR.def.prog.findIndex(n=>n.k==='sheet'); ILR.pc=i; ilRun(); }); await p.waitForTimeout(250);
const c=await p.evaluate(()=>({head:[...document.querySelectorAll('.il-calc tr.head td')].map(x=>x.textContent), cols:document.querySelector('.il-calc tr:nth-child(2)').children.length, txt:document.querySelector('.il-panel').innerText}));
ok(c.head.join()==='1채,3채,5채' && c.cols===4, w+' J01 계산표 1채·3채·5채 나란히 '+c.head.join('/'));
const before=c.txt; await p.click('[data-ilcalc^="rate:"] >> nth=2'); await p.waitForTimeout(150);
ok(await p.evaluate(b=>document.querySelector('.il-panel').innerText!==b, before), w+' 금리 바꾸면 표가 바뀜');
await p.screenshot({path:'v227_j01_'+w+'.png'}); await p.evaluate(()=>ilClose(true));
// 퀴즈 셋
for(const [id,ans] of [['J03',null],['T01',null],['T03',null]]){
  const q=await p.evaluate(id=>{ ilStart(id,{album:true}); const i=ILR.def.prog.findIndex(n=>n.k==='sheet'&&ILR.def.sheets[n.id].type==='mark'); if(i<0) return null; ILR.pc=i; ilRun(); const sh=ILR.def.sheets[ILR.sheetId]; return {ans:sh.ans[0], wrong:[0,1,2].find(x=>!sh.ans.includes(x)), t:sh.title}; }, id);
  ok(!!q, w+' '+id+' 쉬운 퀴즈 있음 '+(q&&q.t));
  if(!q) continue;
  await p.click(`[data-ilmark="${q.wrong}"]`); await p.click('[data-ilsheet="check"]'); await p.waitForTimeout(100);
  const bad=await p.evaluate(()=>!!document.querySelector('.il-mk-it.bad'));
  await p.click(`[data-ilmark="${q.ans}"]`); await p.click('[data-ilsheet="check"]'); await p.waitForTimeout(100);
  const good=await p.evaluate(()=>!!document.querySelector('.il-ok') && !!document.querySelector('[data-ilsheet="done"]'));
  ok(bad && good, w+' '+id+' 오답 표시 → 정답이면 계속 읽기');
  if(w===1280 && id==='J03') await p.screenshot({path:'v227_j03quiz.png'});
  await p.evaluate(()=>ilClose(true));
}
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), w+' 가로 스크롤 없음');
await p.close(); }
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.join('|'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
