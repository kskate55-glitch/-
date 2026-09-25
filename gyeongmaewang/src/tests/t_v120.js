const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
ok(await p.evaluate(()=>{ localStorage.clear(); const c=kaCfg(); return c.bgm===100&&c.sfx===100&&c.amb===100&&c.voice===100&&c.master===100; }), w+' 소리 기본값 전부 100');
await p.evaluate(()=>{ kcRec().fr={full:true}; kcRec().cases=1; page='arena'; arenaTab='home'; renderArena(); }); await p.waitForTimeout(600);
const box=await p.evaluate(()=>{ const d=document.querySelector('.kc-box'); if(d) d.open=true; return [...document.querySelectorAll('.kc-box [data-kcnew="career"]')].map(b=>b.innerText.split('\n')[0]); });
ok(box.length>=4 && box.some(t=>/서류 한 장과 이삿날/.test(t)), w+' 케이스 상자 1단계 물건 4개: '+box.join(' / '));
if(w===1280){ await p.screenshot({path:'v120_box.png'}); }
await p.click('.ep-home'); await p.waitForTimeout(1500);
for(let k=0;k<4;k++){ await p.evaluate(()=>{const s=document.querySelector('[data-gxskip]'); if(s) s.click();}); await p.waitForTimeout(450); }
await p.evaluate(()=>{ epOf('seoyun').res=[{id:'k1',pct:80,full:true}]; lfRec().t+=100; renderArena(); }); await p.waitForTimeout(800);
const al=await p.$('.lf-stage .ep-alert'); ok(!!al, w+' 알림 카드');
const t=await p.evaluate(()=>document.querySelector('.lf-stage .ep-alert').innerText);
ok(/남양주/.test(t) && /의정부지방법원 남양주지원/.test(t), w+' EP2 알림 = 남양주 빌라 · 법원 · 풀 경매');
const bb=await al.boundingBox(); if(w===1280) ok(bb.x+bb.width > 780, w+' 기본 위치 오른쪽 구석 x='+Math.round(bb.x));
await p.mouse.move(bb.x+40,bb.y+30); await p.mouse.down(); await p.mouse.move(bb.x-120,bb.y+160,{steps:8}); await p.mouse.up(); await p.waitForTimeout(200);
const bb2=await (await p.$('.lf-stage .ep-alert')).boundingBox();
ok(bb2.y-bb.y>40, w+` 끌어서 옮김 (${Math.round(bb.y)}→${Math.round(bb2.y)})`);
await p.evaluate(()=>renderArena()); await p.waitForTimeout(500);
const bb3=await (await p.$('.lf-stage .ep-alert')).boundingBox(); ok(Math.abs(bb3.y-bb2.y)<8, w+' 다시 그려도 옮긴 자리 유지');
if(w===1280) await p.screenshot({path:'v120_alert.png'});
await p.click('.ep-alert [data-epgo]'); await p.waitForTimeout(900);
ok(await p.evaluate(()=>KP.id==='f11' && arenaTab==='king'), w+' 누르면 풀 경매 f11');
await p.evaluate(()=>{ if(K.intro){ K.intro=true; } renderArena(); }); await p.waitForTimeout(3500);
const intro=await p.evaluate(()=>document.body.innerText); ok(/의정부지방법원 남양주지원/.test(intro), w+' 입찰 법정 도입부에 법원 이름');
if(w===1280) await p.screenshot({path:'v120_intro.png'});
await p.evaluate(()=>{ K.intro=false; renderArena(); }); await p.waitForTimeout(800);
const brief=await p.evaluate(()=>document.body.innerText); ok(/2026타경 3117/.test(brief), w+' 사건파일·입찰표에 사건번호');
if(w===1280) await p.screenshot({path:'v120_brief.png'});
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
