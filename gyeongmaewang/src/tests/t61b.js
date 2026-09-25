const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} }); await p.waitForTimeout(800);
 await p.evaluate(()=>{ kBid(KP.minBid+2600); K.revealing=false; let g=0; while(K.step!=='result' && K.step!=='lost' && g++<200){
    if(K.step==='won'){ K.step='move'; continue; }
    if(K.step==='move'){ if(K.pendingFlip) kFlipAnswer(false); else if(K.offering) kOffer(K.askNeed); else if(K.occ.agreed && !K.occ.paper) kMove('paper'); else if(K.occ.agreed) kMove('listen'); else kMove(K.occ.coop<45?'listen':(K.occ.dInvolved||!K.occ.daughter?'date':'daughter')); continue; }
    if(K.step==='defect'){ K.step='repair'; kRepair('good'); continue; }
    if(K.step==='repair'){ kRepair('good'); continue; }
    if(K.step==='list'){ kList(15800); continue; }
    if(K.step==='sell'){ kSaleAnswer(K.sale.offer?'accept':'wait'); continue; }
    break; } renderArena(); }); await p.waitForTimeout(1500);
 const src = await p.evaluate(()=>document.getElementById('qaShareImg').src);
 require('fs').writeFileSync('qa_card.png', Buffer.from(src.split(',')[1],'base64'));
 await b.close(); })();
