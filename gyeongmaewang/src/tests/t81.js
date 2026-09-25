// 안정성 ②: 더블클릭·연타 — 돈·경험치·기록이 한 번만 반영되는지, 확인 버튼이 더블클릭 한 번에 넘어가지 않는지
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const GAME='[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kintro],[data-kreveal],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2],[data-kstart]';
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(()=>{ localStorage.clear(); delete kcRec().life; kcRec().fr={full:true}; save(); });
// 1) 입찰 제출 더블클릭 → 입찰 1번
await p.evaluate(()=>{ arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(21); K.intro=false; renderArena(); }); await p.waitForTimeout(2600);
const bids0=await p.evaluate(()=>kcRec().bids), xp0=await p.evaluate(()=>hubRec().xp);
await p.fill('#kBid', String(await p.evaluate(()=>Math.round(KP.minBid*1.3/10)*10)));
if(await p.$('[data-kcseal]')){ await p.dblclick('[data-kcseal]'); await p.waitForTimeout(400); }
await p.dblclick('[data-kbid]'); await p.waitForTimeout(1500);
ok(await p.evaluate(b0=>kcRec().bids===b0+1 && !!K.result, bids0), '입찰 제출 더블클릭 → 입찰은 한 번만');
// 2) 여러 판을 모든 버튼 더블클릭으로 끝까지 — 장부가 맞는지
let played=0; const ends=[];
for(let s=0;s<8;s++){
  await p.evaluate(s=>{ arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(700+s); K.intro=false; renderArena(); }, s); await p.waitForTimeout(300);
  for(let i=0;i<220;i++){
    const st=await p.evaluate(()=>K?K.step:'none'); if(st==='result'||st==='lost'||st==='none'){ if(st==='result') played++; ends.push(st); break; } if(i===219) ends.push('stuck:'+st);
    const box=await p.evaluate((GAME)=>{ if(K.revealing){K.revealing=false;renderArena();} document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false);
      const root=document.getElementById('kfsRoot')||document; const bid=document.getElementById('kBid'); if(bid) bid.value=String(Math.round(KP.trueMid*0.9/10)*10);
      const btns=[...root.querySelectorAll(GAME)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&true;}); if(btns.length){} 
      const pick=btns.find(e=>e.matches('[data-kbid],[data-kcseal]'))||btns.find(e=>/list:15900|fix:fix|cross:go/.test(e.getAttribute('data-k2')||''))||btns[Math.floor(Math.random()*btns.length)]; if(!pick) return null;
      pick.scrollIntoView({block:'center'}); const r=pick.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2};},GAME);
    if(!box){ await p.evaluate(()=>{ const r=document.getElementById('kfsRoot')||document; const el=[...r.querySelectorAll('[data-kres]:not([disabled]),[data-kmove],[data-krep],[data-klist],[data-ksale],[data-kgo],[data-kwait]')][0]; if(el) el.click(); }); await p.waitForTimeout(80); continue; }
    await p.mouse.dblclick(box.x, box.y); await p.waitForTimeout(120);
  }
}
const led=await p.evaluate(()=>{ const c=kcRec(), H=c.history.filter(h=>h.mode==='career'); const seeds=H.map(h=>h.seed);
  return {cases:c.cases, hist:H.length, dupSeed:seeds.length-new Set(seeds).size, total:c.total, sumAfter:H.reduce((s,h)=>s+h.after,0), cash:c.cash, start:c.start, fin:[c.cash,c.total,hubRec().xp].every(v=>isFinite(v))}; });
console.log('판 끝:',ends.join(',')); ok(played>=2, `더블클릭으로 끝까지 간 판 ${played}개`);
ok(led.cases===led.hist && !led.dupSeed, `같은 판이 두 번 기록되지 않음 (처리 ${led.cases}건 · 기록 ${led.hist}건 · 중복 ${led.dupSeed})`);
ok(led.total===led.sumAfter && led.cash===led.start+led.total && led.fin, `돈 장부 일치 (누적 ${led.total} = 기록 합 ${led.sumAfter}, 현금 ${led.cash} = 시작 ${led.start} + 누적)`);
// 3) 확인 버튼 — 더블클릭 한 번으로 넘어가지 않는다
await p.evaluate(()=>{ delete kcRec().fr; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(31); K.intro=false; renderArena(); }); await p.waitForTimeout(1500);
if(await p.$('[data-frskip]')){ await p.dblclick('[data-frskip]'); await p.waitForTimeout(300); ok(await p.evaluate(()=>!!K), '"입찰하지 않기" 더블클릭 → 넘어가지 않고 확인 대기'); await p.waitForTimeout(400); await p.click('[data-frskip]'); await p.waitForTimeout(300); ok(await p.evaluate(()=>!K), '"입찰하지 않기" 한 번 더(천천히) → 넘어감'); }
else ok(false,'입찰하지 않기 버튼 없음');
await p.evaluate(()=>{ kcRec().fr={full:true}; cpUnlockAll(); lfNew('seoyun'); lfRec().intro=false; K=null; const c=kcRec(); c.total=12000; c.cases=5; arenaTab='life'; LF_SPOT='laptop'; renderArena(); }); await p.waitForTimeout(400);
await p.evaluate(()=>{ const d=document.getElementById('dpCard'); if(d) d.remove(); document.querySelector('[data-lfpath]').click(); }); await p.waitForTimeout(400);
await p.evaluate(()=>{ LF_SPOT='wall'; renderArena(); }); await p.waitForTimeout(300);
await p.dblclick('[data-cpsettle]'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>!document.getElementById('cpEnd')), '"지금 결산" 더블클릭 → 엔딩으로 안 넘어감');
await p.click('[data-cpsettle]'); await p.waitForTimeout(600);
ok(await p.evaluate(()=>!!document.getElementById('cpEnd')), '"지금 결산" 한 번 더(천천히) → 엔딩');
console.log('errors',errs); await b.close();})();
