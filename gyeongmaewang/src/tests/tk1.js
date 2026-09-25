const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const PID=process.env.PID||'p_phishing'; await p.evaluate(pid=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='game'; gStart(pid); if(G) G.intro=false; renderArena(); }, PID);
await p.waitForTimeout(1500);
const r=await p.evaluate(async()=>{ const imgs=[...document.querySelectorAll('img')].filter(i=>/1c6b3dce|f9a54944|7ce522d0|a25aee10|8411f75d|fcf378d2|98c781ac|5f19cdba|05db0607|1f3f7d1a|78650e51|67d15b12|085e7385|f7b0d382|975782de|5850d9bd|124fa84c|a2f55809/.test(i.src)||/1c6b3dce|f9a54944|7ce522d0|a25aee10|8411f75d|fcf378d2|98c781ac|5f19cdba|05db0607|1f3f7d1a|78650e51|67d15b12|085e7385|f7b0d382|975782de|5850d9bd|124fa84c|a2f55809/.test(i.currentSrc)); const bgs=[...document.querySelectorAll('[style*="background-image"]')].filter(e=>/1c6b3dce|f9a54944|7ce522d0|a25aee10|8411f75d|fcf378d2|98c781ac|5f19cdba|05db0607|1f3f7d1a|78650e51|67d15b12|085e7385|f7b0d382|975782de|5850d9bd|124fa84c|a2f55809/.test(e.style.backgroundImage)); for(const i of imgs){ i.loading='eager'; await new Promise(r=>{ if(i.complete&&i.naturalWidth) r(); i.onload=r; i.onerror=r; setTimeout(r,3000);}); } return {img:imgs.map(i=>i.naturalWidth), bg:bgs.length}; });
ok(r.img.some(w=>w>0) || r.bg>0, '명도왕 — '+PID+' 전용 그림이 뜸 '+JSON.stringify(r));
await p.screenshot({path:'tk1_'+PID+'.png'});
console.log('errors',errs); await b.close();})();
