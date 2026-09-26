// v169 — 외전 12편 전부 브라우저에서 끝까지(흑자·적자·패찰 × 선택 첫/둘째), 시트 전부 직접 풀기, 돈·시간 불변
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const ids=await p.evaluate(()=>IL_ORDER.filter(i=>!IL[i].coda));
ok(ids.length===12 && ['S01','S03','D01','D03','M01','M03','J01','J03','E01','E03','T01','T03'].every(i=>ids.includes(i)), '외전 12편 등록 '+ids.join(','));
for(const id of ids){
  for(const [res,pick] of [[{profit:1234,full:true},0],[{profit:-567,full:true},1],[{profit:0,lost:true,full:true},0]]){
    const r=await p.evaluate(([id,res,pick])=>{ localStorage.clear(); const d=IL[id]; const c=kcRec(); c.cash=50000; lfNew(d.ch); const L=lfRec(); L.story=true; L.intro=false;
      const R=epOf(d.ch); R.res=[]; for(let i=0;i<=d.after;i++) R.res[i]=i===d.after?res:{profit:1,full:true}; cpRec().il=undefined; ilSync();
      const st0=ilState(id).st, cash0=c.cash, t0=L.t, cost0=JSON.stringify(typeof K!=='undefined'&&K?K.cost:null);
      ilStart(id); ilCfgSet({speed:'instant', auto:false}); let n=0, g=0, sheets=[], raw=0, empty=0, calcErr=0;
      while(ILR && !ILR.done && g++<5000){
        if(ILR.choosing){ const o=ILR.choosing.opts; ilPick(o[Math.min(pick,o.length-1)].id); continue; }
        if(ILR.panel==='sheet'){ const sh=ILR.def.sheets[ILR.sheetId]; sheets.push(ILR.sheetId+':'+sh.type); const pnl=document.querySelector('.il-panel').innerText; if(/계산 오류|NaN|undefined/.test(pnl)) calcErr++;
          if(sh.type==='calc'){ for(const inp of sh.inputs) for(const o of inp.opts){ ILR.sheetSt.vals[inp.id]=o.v; const rows=sh.rows(ILR.sheetSt.vals); if(rows.some(x=>/NaN|undefined|Infinity/.test(String(x[1])))) calcErr++; } }
          if(sh.type==='sort'){ sh.items.forEach((it,i)=>ILR.sheetSt.ans[i]=it.b); ilSheetAct('check'); if(!ILR.sheetSt.right) calcErr++; }
          else if(sh.type==='pick'){ sh.fields.forEach((f,i)=>ILR.sheetSt.ans[i]=f.ans); ilSheetAct('check'); if(!ILR.sheetSt.right) calcErr++; }
          ilSheetAct('done'); continue; }
        if(ILR.panel){ ilPanelClose(); continue; }
        const t=document.querySelector('.il-text').textContent; if(/\{\{|\}\}/.test(t)) raw++; if(!t.trim()) empty++; n++; ILR.lastAdv=0; ilAdvance(); }
      const done=!!(ILR&&ILR.done); if(ILR) ilClose(true);
      return {st0, done, n, sheets:[...new Set(sheets)].length, raw, empty, calcErr, st:ilState(id).st, notes:Object.keys(ilRec().notes).filter(k=>k.startsWith(id+':')).length, nNotes:(IL[id].notes||[]).length,
        money:c.cash===cash0 && lfRec().t===t0 && JSON.stringify(typeof K!=='undefined'&&K?K.cost:null)===cost0}; },[id,res,pick]);
    const tag=res.lost?'패찰':res.profit>0?'흑자':'적자';
    ok(r.st0==='available' && r.done && r.st==='read' && r.n>=100 && !r.raw && !r.empty && !r.calcErr && r.notes===r.nNotes && r.money,
      `${id} ${tag}/선택${pick+1} — ${r.n}줄 · 조작 ${r.sheets} · 노트 ${r.notes}/${r.nNotes}${r.raw?' 미치환':''}${r.calcErr?' 계산오류'+r.calcErr:''}${r.money?'':' 돈·시간 변함'}`);
  }
  // 해금 시점: 앞 사건만 끝났을 땐 잠김
  const lock=await p.evaluate(id=>{ localStorage.clear(); const d=IL[id]; lfNew(d.ch); const R=epOf(d.ch); R.res=[]; for(let i=0;i<d.after;i++) R.res[i]={profit:1,full:true}; cpRec().il=undefined; ilSync(); return ilState(id).st; },id);
  ok(lock==='locked', `${id} — 해당 사건 전엔 잠김`);
}
// 다른 캐릭터 방에는 안 뜬다
const cross=await p.evaluate(()=>{ localStorage.clear(); lfNew('seoyun'); const L=lfRec(); L.story=true; L.intro=false; page='arena'; arenaTab='life'; epOf('dohyun').res=[{profit:1,full:true}]; epOf('seoyun').res=[]; cpRec().il=undefined; IL_LATER={}; renderArena(); return !!document.querySelector('.il-alert'); });
ok(!cross, '서윤 방에는 도현 외전 알림이 안 뜸');
// BGM 트랙이 편마다 따로
const tr=await p.evaluate(()=>IL_ORDER.map(i=>JSON.stringify(KA_TRACKS['il_'+i]||null)));
ok(tr.every(x=>x!=='null') && new Set(tr).size===tr.length, '외전별 BGM 편곡 트랙 '+tr.length+'개(모두 다름)');
// 오버레이 여닫기 반복해도 리스너·노드 누적 없음
const leak=await p.evaluate(()=>{ for(let i=0;i<20;i++){ ilStart('D01',{album:true}); ilClose(true); } return document.querySelectorAll('#ilRoot').length; });
ok(leak===0, '20번 열고 닫아도 오버레이가 남지 않음');
console.log(errs.length?'FAIL '+errs.join(' | '):'ALL OK'); await b.close(); process.exit(errs.length?1:0);})();
