const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); for(const [w,h] of [[1280,800],[900,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}});
await p.goto('http://localhost:8765/rights-study.html'); await p.waitForTimeout(600);
await p.evaluate(()=>{kcRec().fr={full:true};page='arena';arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false;kStart(3);K.intro=false;K.says=[{who:'김사장',t:'테스트 한마디'}];renderArena();}); await p.waitForTimeout(3500);
await p.screenshot({path:`brief_${w}.png`}); await p.close();} await b.close();})();
