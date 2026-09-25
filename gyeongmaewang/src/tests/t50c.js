const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[];
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ hubRec().cleared['king:k1']=1; kcRec().cases=1; HUB_TOAST.length=0; arenaTab='home'; renderArena(); }); await p.waitForTimeout(400); await p.screenshot({path:`bc_home_${w}.png`});
await p.click('[data-ofgo="board"]'); await p.waitForTimeout(400); await p.screenshot({path:`bc_board_${w}.png`});
const d=await p.$('[data-bdread]'); if(d){ await d.click(); await p.waitForTimeout(300);} await p.screenshot({path:`bc_board2_${w}.png`});
await p.click('[data-ofspot="desk"]'); await p.waitForTimeout(300); await p.screenshot({path:`bc_desk_${w}.png`});
console.log(w, await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
}
console.log(errs); await b.close();})();
