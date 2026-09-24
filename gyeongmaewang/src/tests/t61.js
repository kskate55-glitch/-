// 베타 1차: 카드 등급·출처 · 입찰가 감 · 복기 · 실패 도감 · 공유 카드
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('dialog',d=>d.accept()); p.on('pageerror',e=>errs.push(w+' '+e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 const bad = async tag => { const t = await p.evaluate(()=>document.body.innerText); const m=t.match(/undefined|NaN|\[object|Infinity/); if(m) errs.push(w+' '+tag+' '+m[0]+' :: '+t.slice(Math.max(0,t.indexOf(m[0])-60), t.indexOf(m[0])+20)); };
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('jaehoon'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} }); await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>document.querySelectorAll('.ke-card .qa-tier').length===keCards().length), w+' 카드마다 확정/추정/미확인');
 ok(await p.evaluate(()=>!!document.querySelector('#qaBid .qa-zones')), w+' 입찰표: 예상 수익·구간');
 const r1 = await p.evaluate(()=>document.querySelector('#qaBid').innerText);
 await p.fill('#kBid', String(await p.evaluate(()=>KP.minBid+6000))); await p.waitForTimeout(100);
 const r2 = await p.evaluate(()=>document.querySelector('#qaBid').innerText); ok(r1!==r2, w+' 입력하면 수익 범위가 바뀜'); console.log(w, r2.replace(/\s+/g,' '));
 for(const r of ['docs','call3','mgmtcall']){ await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest('details'); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){ await el.click(); await p.waitForTimeout(500);} }
 ok(await p.evaluate(()=>document.querySelectorAll('.ke-card.on .qa-who').length>=1), w+' 드러난 카드에 출처');
 await bad('brief');
 // 끝까지 봇
 await p.fill('#kBid', String(await p.evaluate(()=>KP.minBid+2600))); await p.click('[data-kcseal]'); await p.waitForTimeout(300); await p.click('[data-kbid]'); await p.waitForTimeout(8500);
 await p.evaluate(()=>{ if(K.revealing){ K.revealing=false; renderArena(); } let g=0; while(K.step!=='result' && K.step!=='lost' && g++<200){
    if(K.step==='won'){ K.step='move'; continue; }
    if(K.step==='move'){ if(K.pendingFlip) kFlipAnswer(false); else if(K.offering) kOffer(K.askNeed); else if(K.occ.agreed && !K.occ.paper) kMove('paper'); else if(K.occ.agreed) kMove('listen'); else kMove(K.occ.coop<45?'listen':(K.occ.dInvolved||!K.occ.daughter?'date':'daughter')); continue; }
    if(K.step==='defect'){ K.step='repair'; kRepair('good'); continue; }
    if(K.step==='repair'){ kRepair('good'); continue; }
    if(K.step==='list'){ kList(15800); continue; }
    if(K.step==='sell'){ kSaleAnswer(K.sale.offer?'accept':'wait'); continue; }
    break; } renderArena(); }); await p.waitForTimeout(1200);
 const st = await p.evaluate(()=>K.step); console.log(w,'end',st);
 if(st==='result'){
  ok(await p.evaluate(()=>!!document.querySelector('.qa-review li')), w+' CASE 복기');
  ok(await p.evaluate(()=>{ const i=document.getElementById('qaShareImg'); return !!i && /^data:image\/png/.test(i.src); }), w+' 결과 공유 카드 이미지');
  await p.screenshot({path:`qa_result_${w}.png`, fullPage:false});
  const el = await p.$('.qa-review'); if(el) await el.screenshot({path:`qa_review_${w}.png`});
 }
 ok(await p.evaluate(()=>{ qaFailRec(); return typeof kcRec().fails==='number' && !!arenaRec().failDex; }), w+' 실패 도감은 따로(적자 CASE 수와 안 겹침)');
 await bad('result');
 await p.evaluate(()=>{ K=null; arenaTab='life'; LF_SPOT='wall'; renderArena(); }); await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!!document.querySelector('.qa-fails')), w+' 벽: 실패 도감');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
