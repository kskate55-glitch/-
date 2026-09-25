const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(async()=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(5); K.intro=false; renderArena(); });
await p.waitForTimeout(3500);
await p.evaluate(()=>{ const i=document.getElementById('kBid'); if(i){ i.value=14000; i.dispatchEvent(new Event('input',{bubbles:true})); } document.querySelector('[data-kcseal]').click(); });
await p.waitForTimeout(2200);
const r=await p.evaluate(()=>{ const s=document.querySelector('.ke-slip'); if(!s) return null; const amt=s.querySelector('.ke-slip-amt b'); const c=getComputedStyle(amt).color; const st=s.querySelector('.ke-slip-stamp'); const sr=s.getBoundingClientRect(); return {txt:s.innerText.replace(/\n/g,' | '), color:c, stampOp:+getComputedStyle(st).opacity, inView:sr.top>=0&&sr.bottom<=innerHeight+400, w:Math.round(sr.width)}; });
console.log(w, JSON.stringify(r));
ok(r && /140,000,000/.test(r.txt) && /최저매각가격/.test(r.txt) && /입찰보증금/.test(r.txt), w+' 입찰표에 금액·최저가·보증금');
const rgb=r&&r.color.match(/\d+/g).map(Number); ok(rgb && rgb[0]<80 && rgb[1]<80, w+' 금액 글씨가 진한 색 '+(r&&r.color));
ok(r && r.stampOp>0.8, w+' 도장 찍힘');
const el=await p.$('.ke-env'); if(el){ await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await el.screenshot({path:`t_slip_${w}.png`}); }
}
console.log('errors',errs); await b.close();})();
