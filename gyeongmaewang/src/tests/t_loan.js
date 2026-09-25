const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ localStorage.clear(); window.LN_FAST=1; kcRec().fr={full:true}; kcRec().cash=5835; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='k1'; KC_INTRO=false; kStart(11); K.intro=false; K.rivals=[]; kBid(12000); K.revealing=false; K.sealed=false; renderArena(); });
await p.waitForTimeout(1300);
ok(await p.evaluate(()=>!!document.querySelector('#lnRoot') && LN.must), w+' 현금 부족 → 대출 필수 화면');
ok(await p.evaluate(()=>document.querySelectorAll('.ln-card').length===3), w+' 명함 3장');
if(w===1280) await p.screenshot({path:'ln_cards.png'});
const ids=await p.evaluate(()=>LN.cards);
await p.click(`[data-lncard="${ids[0]}"]`); await p.waitForTimeout(300);
if(w===1280) await p.screenshot({path:'ln_chat_mid.png'});
await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.querySelectorAll('.kt-row.them').length>=5 && document.querySelectorAll('.kt-row.me').length===1), w+' 카톡 말풍선(내 말 노랑·상담사 흰색)');
if(w===1280||w===390) await p.screenshot({path:`ln_chat_${w}.png`});
await p.click('.kt-foot [data-lnback]'); await p.waitForTimeout(200);
await p.click(`[data-lncard="${ids[1]}"]`); await p.waitForTimeout(600); await p.click('.kt-foot [data-lnback]'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>document.querySelectorAll('.ln-cmp tbody tr').length===2), w+' 두 곳 조건 비교표');
if(w===1280) await p.screenshot({path:'ln_cmp.png'});
await p.click('.ln-cmp [data-lntake]'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>K.loan && K.loan.amt>0 && K.loan.rate>0), w+' 대출 확정 '+await p.evaluate(()=>JSON.stringify(K.loan)));
if(w===1280) await p.screenshot({path:'ln_done.png'});
const d=await p.evaluate(()=>{ const a=K.cost.hold; kDay(30); return K.cost.hold-a; }); ok(d>0, w+' 30일 보유비(이자 반영) '+d.toFixed(1));
await p.click('[data-lnclose]'); await p.waitForTimeout(300); ok(await p.evaluate(()=>!document.querySelector('#lnRoot')), w+' 닫힘');
// 현금 충분 → 물어보기
await p.evaluate(()=>{ kcRec().cash=50000; kStart(12); K.intro=false; K.rivals=[]; kBid(11000); K.revealing=false; K.sealed=false; renderArena(); }); await p.waitForTimeout(1200);
ok(await p.evaluate(()=>LN && LN.step==='ask' && !!document.querySelector('[data-lnask="no"]')), w+' 현금 충분 → 받을지 묻기(예/아니오)');
await p.click('[data-lnask="no"]'); await p.waitForTimeout(200); ok(await p.evaluate(()=>K.loan && K.loan.none), w+' 아니오 → 현금으로');
// 캐피탈 빈도
const cap=await p.evaluate(()=>{ let n=0; for(let s=1;s<=300;s++){ K.seed=s; if(lnPickCards().some(id=>LN_PRODUCTS.find(x=>x.id===id).cap)) n++; } return n; }); ok(cap>60&&cap<150, w+' 캐피탈 명함 가끔(300판 중 '+cap+')');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log('errors',errs); await b.close();})();
