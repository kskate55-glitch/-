const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(400);
await p.evaluate(([pp,ac])=>{arenaTab='game';gStart(pp);G.mood=20;VN_ACT=ac;G.log.push({who:'them',t:'법대로 하시죠. 쉽게 안 나갈 겁니다.'});renderArena();},[process.argv[2]||'p_hug',process.argv[3]||'']);await p.waitForTimeout(1500);
await p.screenshot({path:'v3.png'});
console.log(await p.evaluate(()=>[vnExpr(), document.querySelector('.vn-sprite').src]), errs);await b.close();})();
