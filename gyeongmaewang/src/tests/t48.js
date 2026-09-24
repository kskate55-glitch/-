const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(600);
const stats=await p.evaluate(()=>{ let solo=0,surge=0,rain=0,over=0,wins=0; for(let s=1;s<=300;s++){ K_PROP_NEXT='k1'; KC_MODE='free'; kStart(s*131); if(K.crowd==='quiet') solo++; if(K.crowd==='surge') surge++; if(K.rain) rain++; kBid(12650); if(K.result.win){wins++; if(K.result.gap>=Math.max(300,K.bid*0.05)) over++;} } return {solo,surge,rain,over,wins}; });
console.log(stats);
// 단독낙찰 화면
await p.evaluate(()=>{ arenaTab='king'; for(let s=1;s<300;s++){ K_PROP_NEXT='k1'; KC_MODE='career'; kStart(s*131); if(K.crowd==='quiet') break; } K.intro=false; ['docs','court','call3'].forEach(kResearch); renderArena(); });
await p.waitForTimeout(400); await p.screenshot({path:'kp1.png'});
await p.evaluate(()=>{ kBid(12650); K.revealing=false; renderArena(); }); await p.waitForTimeout(1500); await p.screenshot({path:'kp2.png'});
console.log(await p.evaluate(()=>[K.result.solo, KA_PLAY.filter(x=>!x.dead).map(x=>x.id).join()]));
await p.evaluate(()=>{ for(let s=1;s<300;s++){ K_PROP_NEXT='k1'; kStart(s*131); kBid(14200); if(K.result.win && K.result.gap>=710) break; } K.revealing=false; renderArena(); }); await p.waitForTimeout(1500); await p.screenshot({path:'kp3.png'});
console.log('errors',errs);await b.close();})();
