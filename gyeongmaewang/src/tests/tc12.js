const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const w of [1280,390]){ const p=await b.newPage({viewport:{width:w,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
// 누수 단계
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k2';KC_INTRO=false; kStart(5); K.intro=false; K.step='defect'; K.k2=K.k2||{}; renderArena(); });
await p.waitForTimeout(600);
const r=await p.evaluate(async()=>{ const im=document.querySelector('.gmw-scene[data-scene="k2leak"] img'); if(!im) return null; im.loading='eager'; im.scrollIntoView(); await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,4000); }); const card=im.closest('.k-card'); return {w:im.naturalWidth, inCard:!!card, first: card && card.querySelector('h3').nextElementSibling===im.closest('.gmw-scene')}; });
ok(r && r.w>1000 && r.inCard && r.first, w+' 누수 단계: 벽지 누수 그림이 카드 제목 바로 밑에 뜸 '+JSON.stringify(r));
await p.screenshot({path:`tc12_leak_${w}.png`});
// 게시판 썸네일
const u=await p.evaluate(()=>shUrl('ext_k2')); ok(/ed8ccd4a/.test(u), w+' 2번 물건 외관이 새 그림');
const nw=await p.evaluate(async u=>{ const im=new Image(); im.src=u; await new Promise(r=>{im.onload=r;im.onerror=r;}); return im.naturalWidth; }, u); ok(nw===960, w+' 외관 그림 불러옴 '+nw);
await p.close(); }
console.log('errors',errs); await b.close();})();
