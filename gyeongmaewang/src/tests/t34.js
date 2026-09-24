const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(1500);
await p.screenshot({path:`hb1_${w}.png`,fullPage:true});
// 스토리 엔딩 하나, 명도왕 한 판, 경매왕 한 판
await p.evaluate(()=>{arenaTab='story';stStart('ep_senior');ST.intro=false;stPick&&0;renderArena();});
await p.evaluate(()=>{ ST.label='blind'; ST.i=0; stRun(); renderArena(); });
await p.waitForTimeout(300);
await p.evaluate(()=>{ arenaTab='game'; gStart('p_coop'); G.intro=false; renderArena(); });
for(let i=0;i<30 && !(await p.evaluate(()=>!!(G&&G.over)));i++){ const c=await p.$('[data-gcard]'); if(c){await c.click();continue;} const h=await p.$('[data-gact="hand_full"]'); if(h){await h.click();continue;} const o=await p.$('[data-goffer="800"]'); if(o&&i>0) await o.click(); else await (await p.$('[data-gact="visit"]')||await p.$('[data-gact="wait"]')).click(); await p.waitForTimeout(60);}
await p.evaluate(()=>{ arenaTab='king'; kStart(4242); ['docs','site','neigh','broker'].forEach(kResearch); kBid(12650); K.step='move';
  let g=0; while(K.step==='move'&&g++<60){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){kTick(1);continue;} kMove(['listen','daughter','center','date'][g%4]); }
  kRepair('part'); kList(15500); g=0; while(K.step==='sell'&&g++<40){ if(K.sale.offer) kSaleAnswer('accept'); else kSaleAnswer('wait'); } renderArena(); });
await p.waitForTimeout(500); if(w===1280) await p.screenshot({path:'hb2.png'});
await p.evaluate(()=>{arenaTab='home';renderArena();}); await p.waitForTimeout(800); await p.screenshot({path:`hb3_${w}.png`,fullPage:true});
await p.evaluate(()=>{arenaTab='dexall';renderArena();}); await p.waitForTimeout(300); if(w===1280) await p.screenshot({path:'hb4.png',fullPage:true});
await p.click('[data-dexsub="ev"]'); await p.waitForTimeout(200); if(w===1280) await p.screenshot({path:'hb5.png',fullPage:true});
await p.evaluate(()=>{arenaTab='ach';renderArena();}); await p.waitForTimeout(200); if(w===1280) await p.screenshot({path:'hb6.png',fullPage:true});
console.log(w, await p.evaluate(()=>{const P=hubRec(); return [P.xp,P.rep,hubLevel(P.xp).lv,Object.keys(P.met).length,Object.keys(P.events).length,Object.keys(P.ends).length,Object.keys(P.ach).join(','), document.documentElement.scrollWidth];}));}
console.log('errors',errs);await b.close();})();
