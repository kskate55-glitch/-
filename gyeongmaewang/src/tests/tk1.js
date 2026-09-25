const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='game'; gStart('p_phishing'); if(G) G.intro=false; renderArena(); });
await p.waitForTimeout(1500);
const r=await p.evaluate(async()=>{ const imgs=[...document.querySelectorAll('img')].filter(i=>/1c6b3dce|f9a54944|7ce522d0/.test(i.src)||/1c6b3dce|f9a54944|7ce522d0/.test(i.currentSrc)); const bgs=[...document.querySelectorAll('[style*="background-image"]')].filter(e=>/1c6b3dce|f9a54944|7ce522d0/.test(e.style.backgroundImage)); for(const i of imgs){ i.loading='eager'; await new Promise(r=>{ if(i.complete&&i.naturalWidth) r(); i.onload=r; i.onerror=r; setTimeout(r,3000);}); } return {img:imgs.map(i=>i.naturalWidth), bg:bgs.length}; });
ok(r.img.some(w=>w>0) || r.bg>0, '명도왕 — 오태석·한미정 부부 전용 그림이 뜸 '+JSON.stringify(r));
await p.screenshot({path:'tk1.png'});
console.log('errors',errs); await b.close();})();
