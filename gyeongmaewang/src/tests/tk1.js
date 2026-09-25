const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const PID=process.env.PID||'p_phishing'; await p.evaluate(pid=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='game'; gStart(pid); if(G) G.intro=false; renderArena(); }, PID);
await p.waitForTimeout(1500);
const r=await p.evaluate(async()=>{ const imgs=[...document.querySelectorAll('img')].filter(i=>/238903fa|9a1712cc|9b4084e9|a8107a6e|ad47e028|7db34376|56e01d47|78673259|249bb94a|79346bfa|7f09c057|a673dc74|c2265f76|5d9a64f6|4b6b26c0|09b8d946|ede5c0eb|c959686f/.test(i.src)||/238903fa|9a1712cc|9b4084e9|a8107a6e|ad47e028|7db34376|56e01d47|78673259|249bb94a|79346bfa|7f09c057|a673dc74|c2265f76|5d9a64f6|4b6b26c0|09b8d946|ede5c0eb|c959686f/.test(i.currentSrc)); const bgs=[...document.querySelectorAll('[style*="background-image"]')].filter(e=>/238903fa|9a1712cc|9b4084e9|a8107a6e|ad47e028|7db34376|56e01d47|78673259|249bb94a|79346bfa|7f09c057|a673dc74|c2265f76|5d9a64f6|4b6b26c0|09b8d946|ede5c0eb|c959686f/.test(e.style.backgroundImage)); for(const i of imgs){ i.loading='eager'; await new Promise(r=>{ if(i.complete&&i.naturalWidth) r(); i.onload=r; i.onerror=r; setTimeout(r,3000);}); } return {img:imgs.map(i=>i.naturalWidth), bg:bgs.length}; });
ok(r.img.some(w=>w>0) || r.bg>0, '명도왕 — '+PID+' 전용 그림이 뜸 '+JSON.stringify(r));
await p.screenshot({path:'tk1_'+PID+'.png'});
console.log('errors',errs); await b.close();})();
