const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
for(const id of ['hide','min','fix']){
  await p.evaluate(id=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k2';KC_INTRO=false; kStart(5); K.intro=false; K.step='defect'; renderArena(); k2Fix(id); renderArena(); }, id);
  await p.waitForTimeout(500);
  const r=await p.evaluate(async()=>{ const im=document.querySelector('.gmw-scene[data-scene="k2cover"] img'); if(!im) return {step:K.step, has:false}; im.loading='eager'; await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,4000); }); return {step:K.step, has:true, w:im.naturalWidth}; });
  if(id==='hide') ok(r.step==='list' && r.has && r.w>1000, '도배로 덮기 → 호가 정하는 화면에 도배 그림 '+JSON.stringify(r));
  else ok(r.step==='list' && !r.has, id+' → 도배 그림 안 뜸');
}
console.log('errors',errs); await b.close();})();
