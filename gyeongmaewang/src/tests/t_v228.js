const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(1000);
const vis=await p.evaluate(()=>[...document.querySelectorAll('#kfsRoot button, #kfsRoot summary')].filter(x=>x.getClientRects().length).map(x=>x.textContent.replace(/\s+/g,' ').trim()).join(' | '));
ok(!/연습실|📊 기록|사무실|업적|다른 방법으로 시작하기|전체 메뉴 보기|명도왕|시세 맞히기/.test(vis), w+' 첫 화면에 연습실·기록·사무실·업적 칸/버튼 없음');
ok(/스토리 STAGE/.test(vis), w+' 스토리 시작 버튼은 그대로');
await p.evaluate(()=>{ document.querySelector('.kfs-menu').hidden=false; });
const menu=await p.evaluate(()=>[...document.querySelectorAll('.kfs-menu button')].filter(x=>x.getClientRects().length).map(x=>x.textContent.trim()));
ok(!menu.some(t=>/기록|사무실|업적|연습실|도감|스토리/.test(t)), w+' ☰ 메뉴에서도 빠짐: '+menu.join('/'));
for(const t of ['rec','office','game','chat','sell','guess','story']){ await p.evaluate(t=>{ arenaTab=t; renderArena(); },t); }
ok(await p.evaluate(()=>arenaTab)==='home', w+' 예전 탭으로 가려 해도 홈으로');
await p.evaluate(()=>{ hxDevil(()=>{}); }); await p.waitForSelector('.hx-gauge .needle',{timeout:8000}); await p.waitForTimeout(200);
const a=await p.evaluate(()=>parseFloat(document.querySelector('.hx-gauge .needle').style.left)); await p.waitForTimeout(250); const c=await p.evaluate(()=>parseFloat(document.querySelector('.hx-gauge .needle').style.left));
ok(Math.abs(c-a)<25, w+' 입찰 악마 바늘이 느려짐(0.25초에 '+Math.abs(c-a).toFixed(1)+'%)');
await p.evaluate(()=>hxClose(true)); await p.close(); }
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.join('|'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
