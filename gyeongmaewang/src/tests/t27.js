const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
await p.evaluate(()=>{arenaTab='game';gStart('p_greedy');renderArena();}); await p.waitForTimeout(700);
const r=[];
for(const a of ['visit','order','msg','survey']){ const el=await p.$(`[data-gact="${a}"]`); if(!el) continue; await el.click(); await p.waitForTimeout(250);
  r.push(await p.evaluate(()=>{const v=document.querySelector('.vn');return v.className+' | '+[...document.querySelectorAll('.vn-pop')].map(x=>x.textContent).join(',');}));
  if(w===1280 && r.length===1) await p.screenshot({path:'fx1.png',clip:{x:160,y:245,width:960,height:540}});
  const c=await p.$('[data-gcard]'); if(c){await c.click();await p.waitForTimeout(250);} }
console.log(w, r);
await p.click('.vn-fx summary'); await p.fill('[data-vnfx="shake"]','12').catch(()=>{});
await p.evaluate(()=>{const i=document.querySelector('[data-vnfx="shake"]');i.value=12;i.dispatchEvent(new Event('input',{bubbles:true}));});
console.log('var', await p.evaluate(()=>[getComputedStyle(document.documentElement).getPropertyValue('--fx-shake'),localStorage.getItem('vnfx')]));
if(w===390) await p.screenshot({path:'fx2.png',fullPage:false});
await p.evaluate(()=>{G=null;arenaTab='story';stStart('ep_phishing');renderArena();}); await p.waitForTimeout(300);
console.log('story', await p.evaluate(()=>document.querySelector('.vn').className));
}
console.log('errors',errs);await b.close();})();
