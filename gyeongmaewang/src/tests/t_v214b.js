const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ localStorage.clear(); cpUnlockAll(); delete kcRec().life; lfNew('dohyun'); lfRec().intro=false; kcRec().fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='k1'; KC_INTRO=false; kStart(3); K.intro=false; renderArena(); });
await p.waitForTimeout(2500);
await p.evaluate(()=>{ if(document.querySelector('.sf-slim') && !document.querySelector('.sf-open')){ const b=document.querySelector('[data-sfside]'); if(b) b.click(); } }); await p.waitForTimeout(400);
const d=await p.evaluate(()=>{ const d=document.querySelector('.lf-dash'); if(!d) return null; const nb=d.querySelector('[data-lfnext]'); const r=nb&&nb.getBoundingClientRect(); return {pips:d.querySelectorAll('.lfd-pip').length, now:d.querySelectorAll('.lfd-pip.now').length, clock:!!d.querySelector('.lfd-now'), left:!!d.querySelector('.kr-left'), nextH:r?Math.round(r.height):0, nextW:r?Math.round(r.width):0, old:!!document.querySelector('.lf-day'), feel:!!document.querySelector('.lf-feel'), inClock:!!document.querySelector('.kfs-panel .kr-clock, .kr-clock'), leave:!!d.querySelector('[data-lfleave]')||/연차/.test(d.innerText)}; });
console.log(w+' '+JSON.stringify(d));
ok(d && d.pips>=2 && d.now===1 && d.clock && d.left && !d.old && d.feel && d.inClock, w+' 상황판: 일차 칸·시계·남은 시간 한 카드, 예전 줄글 칸 없음');
ok(d && d.nextH>=44 && d.nextW>=200, w+' 다음 날로 버튼 크게 ('+(d&&d.nextW)+'×'+(d&&d.nextH)+')');
ok(d && d.leave, w+' 도현 연차 표시');
const r0=await p.evaluate(()=>K.lf.rday); await p.click('.lf-dash [data-lfnext]'); await p.waitForTimeout(400);
ok(await p.evaluate(r0=>K.lf.rday===r0+1,r0), w+' 다음 날로 누르면 하루 넘어감');
ok(await p.evaluate(()=>!!document.querySelector('.lf-dash .lfd-pip.past')), w+' 지난 날은 ✓ 칸');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
