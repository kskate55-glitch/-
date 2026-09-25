const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k2';KC_INTRO=false; kStart(5); K.intro=false; renderArena(); });
await p.waitForTimeout(2200);
// 아래층에 묻는 조사 실행
const did=await p.evaluate(()=>{ const c=keCards(); const i=c.findIndex(x=>x.id==='leak'); if(typeof kResearch==='function'){ try{ kResearch('leak'); }catch(e){} } K.found.leak=true; renderArena(); return {i, n:c.length}; });
await p.waitForTimeout(1200);
const r=await p.evaluate(()=>{ const cards=keCards(); const i=cards.findIndex(x=>x.id==='leak'); const el=document.querySelectorAll('.ke-cards .ke-card')[i]; const ph=el&&el.querySelector('.ke-photo'); return {i, on:el&&el.classList.contains('on'), bg: ph ? ph.style.backgroundImage : null}; });
console.log(JSON.stringify(did), JSON.stringify(r));
await p.click('.stg-tab[data-stg="file"]'); await p.waitForTimeout(700); const el=await p.$('.ke-photo[style*="648e4f36"]'); if(el){ await el.scrollIntoViewIfNeeded(); const box=await el.boundingBox(); await p.screenshot({path:'tevleak.png', clip:{x:Math.max(0,box.x-20),y:Math.max(0,box.y-20),width:320,height:200}}); }
console.log('errors',errs); await b.close();})();
