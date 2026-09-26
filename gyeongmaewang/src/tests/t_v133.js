const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const start=(id,seed,cash)=>p.evaluate(([id,seed,cash])=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; const c=kcRec(); delete c.life; c.fr={full:true}; c.cash=cash; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; ['docs','trade','court'].forEach(x=>kResearch(x)); renderArena(); },[id,seed,cash]);
// 1) 인수금액이 판정 기준선에서 빠진다
await start('f53',5,900000);
let r=await p.evaluate(()=>({ceil:frCeil(), raw:Math.round(KP.trueMid*0.78/10)*10, take:frTakeOver()}));
ok(r.take>=6000 && r.ceil===r.raw-r.take, '판정 기준선 = 시세×0.78 − 떠안는 돈 ('+r.raw+' − '+r.take+' = '+r.ceil+')');
// 2) 최저가에 쓰고 진 f53 → "조금 더 써도 남았다"가 아니라 "입찰 안 하는 게 정답"
r=await p.evaluate(()=>{ bwInfo().legal.forEach(a=>kResearch(a.id)); kBid(KP.minBid); K.revealing=false; renderArena(); return {step:K.step, t:document.body.innerText}; });
if(r.step==='lost'){ ok(!/조금 더 써도 남는 가격/.test(r.t) && /입찰하지 않는 게 정답/.test(r.t), '인수 6,000만 물건에서 진 사람에게 "더 써도 남았다"고 하지 않음');
  ok(/공격 구간|남기기 어려운 선/.test(r.t) && !/따라가도 남았을 수 있어요/.test(r.t), '1등 가격이 공격 구간이면 "운에 기대는 거래"로 설명');
} else ok(false,'f53 패찰 재현 실패 ('+r.step+')');
// 3) 인수 없는 물건은 기준선 그대로
await start('f11',5,900000); r=await p.evaluate(()=>({ceil:frCeil(), raw:Math.round(KP.trueMid*0.78/10)*10, take:frTakeOver()}));
ok(r.take>0 ? r.ceil<r.raw : r.ceil===r.raw, '떠안는 돈이 없으면 기준선 그대로 ('+r.ceil+' / '+r.raw+')');
// 4) 자금 계획 줄
await start('f12',6,3000); await p.waitForTimeout(200);
r=await p.evaluate(()=>{ const el=document.getElementById('kBid'); el.value=String(Math.round(KP.minBid*1.1/10)*10); el.dispatchEvent(new Event('input',{bubbles:true})); const t=(document.querySelector('.bw-cash')||{}).innerText||''; const C=bwCash(+el.value); return {t, C}; });
ok(/입찰보증금/.test(r.t) && /대출 약/.test(r.t) && /한 달 이자/.test(r.t), '입찰표에 보증금·필요한 돈·대출·한 달 이자 ('+r.t.replace(/\s+/g,' ').slice(0,120)+')');
ok(r.C.loan===Math.max(0,r.C.bal-r.C.cash), '대출 필요액 = 필요한 돈 − 현금');
r=await p.evaluate(()=>{ const el=document.getElementById('kBid'); el.value=String(KP.minBid*2); el.dispatchEvent(new Event('input',{bubbles:true})); return bwCash(+el.value).loan; });
const r2=await p.evaluate(()=>{ const el=document.getElementById('kBid'); el.value=String(KP.minBid); el.dispatchEvent(new Event('input',{bubbles:true})); return bwCash(+el.value).loan; });
ok(r>r2, '입찰가를 올리면 대출도 늘어남');
await start('f12',6,100); r=await p.evaluate(()=>{ const el=document.getElementById('kBid'); el.value=String(KP.minBid); el.dispatchEvent(new Event('input',{bubbles:true})); return (document.querySelector('.bw-cash')||{}).innerText||''; });
ok(/입찰 자체를 못 해요/.test(r), '현금이 보증금보다 적으면 "실제론 입찰 못 한다" 경고');
await start('f12',6,900000); r=await p.evaluate(()=>{ const el=document.getElementById('kBid'); el.value=String(KP.minBid); el.dispatchEvent(new Event('input',{bubbles:true})); return (document.querySelector('.bw-cash')||{}).innerText||''; });
ok(/대출 없이 살 수 있어요/.test(r), '현금이 넉넉하면 대출 없이');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
