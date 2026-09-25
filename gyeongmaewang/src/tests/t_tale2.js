const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const r=await p.evaluate(()=>{ const t=id=>mtTaleOf(PERSONAS.find(x=>x.id===id)); const h=t('p_hawaii'), j=t('p_tojuk'), d=t('p_delay');
  const all=h.flat().map(x=>x[1]).join(' ');
  return {h:h.map(c=>c.length), j:j.map(c=>c.length), d:d.length, tl:/Tlqkf/.test(all), dog:/🐶/.test(all), raw:/씨발|개새|개놈/.test(all), basic:t('p_basic').length}; });
ok(r.h.length===3 && r.h[0]>=7, '황금철 사연 3장, 첫 장 길게 '+r.h); ok(r.tl && r.dog && !r.raw, '욕은 순화 표기만(Tlqkf·🐶)');
ok(r.j.length===3, '염복순 사연 3장 '+r.j); ok(r.d===3, '김대기 사연 3장으로 늘어남'); ok(r.basic===2, '다른 캐릭터는 그대로(모두가 길진 않음)');
await p.evaluate(()=>{ kStart(7); K.occ.daughter=true; kMove('daughter'); }); await p.waitForTimeout(400);
const t1=await p.evaluate(()=>document.querySelector('#mtTale') && document.querySelector('#mtTale').innerText);
ok(t1 && /1\/17/.test(t1), '따님 통화가 17줄 장면으로 열림');
for(let i=0;i<6;i++){ await p.click('#mtTale .mt-card'); await p.waitForTimeout(80); }
const t2=await p.evaluate(()=>document.querySelector('#mtTale').innerText); ok(/업고|담배/.test(t2), '어린 시절 에피소드 '+t2.slice(0,60));
await p.screenshot({path:'tale_call.png'});
ok(await p.evaluate(()=>K.occ.dInvolved && K.occ.coop>=60), '효과(협조도·말바꾸기 방지)는 그대로');
console.log('errors',errs); await b.close();})();
