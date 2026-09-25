const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
for(const [note,want] of [['😱 신혼부부 매수자 — "대출이 생각보다 안 나와서요…" 계약이 깨졌다.','k2loan'],['💧 아래층에서 또 물이 샌다','k2recur'],['조용한 한 주','']]){
  const r=await p.evaluate(async([note])=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k2';KC_INTRO=false; kStart(5); K.intro=false; K.step='defect'; renderArena(); k2Fix('fix'); k2List(15900); K.sale.note=note; renderArena();
    const e=document.querySelector('.gmw-scene'); if(!e) return ''; const im=e.querySelector('img'); im.loading='eager'; await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,4000);}); return e.dataset.scene+':'+im.naturalWidth; },[note]);
  ok(want ? r.startsWith(want+':') && !r.endsWith(':0') : r==='', `"${note.slice(0,18)}…" → ${r||'그림 없음'}`);
}
console.log('errors',errs); await b.close();})();
