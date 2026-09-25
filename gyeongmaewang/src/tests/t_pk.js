const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ page='arena'; arenaTab='game'; gStart('p_pk'); G.met=true; renderArena(); }); await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{ const i=document.querySelector('img.vn-sprite'); if(!i) return 'none'; const s=i.parentElement.getBoundingClientRect(), q=i.getBoundingClientRect(); return {src:i.src.slice(-12), gap:Math.round(s.bottom-q.bottom), h:Math.round(q.height)}; });
console.log(w, JSON.stringify(r)); await p.screenshot({path:`pk_${w}.png`}); await p.close(); } await b.close();})();
