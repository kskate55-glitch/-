// 🎭 캐릭터 선택 → 시작 연출 → 거점 → 생활 행동 → 게시판 → 조사(이틀·체력) → 입찰 → 결과 → 거점 복귀
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); p.on('pageerror',e=>errs.push(w+' pageerror '+e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(300); await p.evaluate(()=>{try{cpUnlockAll()}catch(e){}}); await p.waitForTimeout(700);
 const bad = async tag => { const t = await p.evaluate(()=>(document.getElementById('kfsRoot')||document.getElementById('main')).innerText); const m=t.match(/undefined|NaN|\[object|Infinity/); if(m) errs.push(w+' '+tag+' '+m[0]+' :: '+t.slice(Math.max(0,t.indexOf(m[0])-40), t.indexOf(m[0])+20)); };
 await p.evaluate(()=>{ arenaTab='home'; renderArena(); }); await p.waitForTimeout(300);
 ok(!!(await p.$('[data-lfgo]')), w+' 홈: 투자자 고르기 버튼');
 await p.click('[data-lfgo]'); await p.waitForTimeout(300); await bad('select');
 ok((await p.$$('[data-lfpick]')).length===6, w+' 캐릭터 6명');
 await p.click('[data-lfpick="taesik"]'); await p.waitForTimeout(200); await p.screenshot({path:`lf_select_${w}.png`});
 ok(/목동 오래된 자가 아파트/.test(await p.textContent('.lf-focus')), w+' 김태식 상세 — 시작 거점 표시');
 await p.click('[data-lfpick="dohyun"]'); await p.waitForTimeout(150); await p.click('[data-lfstart="dohyun"]'); await p.waitForTimeout(400);
 ok(await p.evaluate(()=>lfOn() && lfChar().id==='dohyun' && kcRec().cash===7000), w+' 이도현 시작 — 자본 7,000만');
 ok(!!(await p.$('#gxOp')), w+' 오프닝 재생'); await p.click('[data-gxskip]'); await p.waitForTimeout(300); await p.click('[data-gxskip]'); await p.waitForTimeout(1200); await bad('base');
 ok(/화곡동 6평 원룸/.test(await p.evaluate(()=>document.body.innerText)), w+' 거점 = 화곡동 6평 원룸');
 await p.screenshot({path:`lf_base_${w}.png`});
 // 생활 행동
 for(const s of ['shelf','fridge','out','phone','calendar','bank','wall','file','bed','laptop']){ await p.click(`[data-lfspot="${s}"]`); await p.waitForTimeout(120); await bad('spot '+s); }
 const t0 = await p.evaluate(()=>lfRec().t);
 await p.click('[data-lfspot="shelf"]'); await p.click('[data-lfdo="study_law"]'); await p.waitForTimeout(150);
 ok(await p.evaluate(t0=>lfRec().t - t0 >= 120 && (lfRec().xp.law||0) > 0, t0), w+' 공부 — 2시간 흐르고 법률 경험치');
 await p.click('[data-lfspot="bed"]'); await p.click('[data-lfdo="sleep"]'); await p.waitForTimeout(150);
 ok(await p.evaluate(()=>{ const D=lfDate(); return D.h===8 && D.mi===0; }), w+' 자고 일어나면 아침 8시');
 await p.evaluate(()=>{ kcRec().cash += 2000; renderArena(); });
 await p.click('[data-lfspot="laptop"]'); await p.waitForTimeout(100); await p.click('[data-lfbuy="dual"]'); await p.waitForTimeout(150);
 ok(await p.evaluate(()=>lfHas('dual')), w+' 장비 구입(듀얼 모니터)');
 // 게시판 → 입찰
 await p.click('[data-lfspot="board"]'); await p.waitForTimeout(200); await bad('board');
 const playBtn = await p.$('[data-bdplay]:not([disabled])'); ok(!!playBtn, w+' 거점 안 게시판에서 입찰 버튼');
 await playBtn.click(); await p.waitForTimeout(500);
 ok(await p.evaluate(()=>arenaTab==='king' && K && K.lf && K.lf.days.length===2), w+' CASE 시작 — 조사 이틀');
 await p.evaluate(()=>{ if(K.intro){ K.intro=false; renderArena(); } }); await p.waitForTimeout(300); await bad('brief');
 const day1 = await p.evaluate(()=>[K.timeLeft, K.lf.days.map(d=>d.len), bdClock().txt, !!document.querySelector('.lf-feel'), !!document.querySelector('[data-lfnext]')]);
 console.log(w, 'day1', day1); ok(day1[3] && day1[4], w+' 조사 화면: 시세 감 · 오늘은 여기까지 버튼');
 await p.screenshot({path:`lf_brief_${w}.png`});
 const sta0 = await p.evaluate(()=>lfRec().sta);
 for(const r of ['trade','docs','call1']){ await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest('details'); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){ await el.click(); await p.waitForTimeout(120);} }
 ok(await p.evaluate(s=>lfRec().sta < s, sta0), w+' 조사하면 체력이 준다');
 await p.click('[data-lfnext]'); await p.waitForTimeout(250);
 ok(await p.evaluate(()=>K.lf.rday===1 && !document.querySelector('[data-lfnext]')), w+' 2일차로 넘어감(마지막 날엔 버튼 없음)');
 for(const r of ['ext','meter','neigh']){ await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest('details'); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){ await el.click(); await p.waitForTimeout(120);} }
 await p.fill('#kBid', String(await p.evaluate(()=>KP.minBid+2600))); await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-kcseal]'); await p.waitForTimeout(300); await p.click('[data-kbid]'); await p.waitForTimeout(8500);
 await p.evaluate(()=>{ if(K.revealing){ K.revealing=false; renderArena(); } });
 const st = await p.evaluate(()=>[K.step, lfClock()]); console.log(w,'bid',st);
 // 봇으로 끝까지
 await p.evaluate(()=>{ let g=0; while(K.step!=='result' && K.step!=='lost' && g++<200){
    if(K.step==='won'){ K.step='move'; continue; }
    if(K.step==='move'){ if(K.pendingFlip) kFlipAnswer(false); else if(K.offering) kOffer(K.askNeed); else if(K.occ.agreed && !K.occ.paper) kMove('paper'); else if(K.occ.agreed) kMove('listen'); else kMove(K.occ.coop<45?'listen':(K.occ.dInvolved||!K.occ.daughter?'date':'daughter')); continue; }
    if(K.step==='defect'){ K.step='repair'; kRepair('good'); continue; }
    if(K.step==='repair'){ kRepair('good'); continue; }
    if(K.step==='list'){ kList(15800); continue; }
    if(K.step==='sell'){ kSaleAnswer(K.sale.offer?'accept':'wait'); continue; }
    break; } renderArena(); });
 await p.waitForTimeout(400); await bad('result');
 const res = await p.evaluate(()=>[K.step, lfClock(), kcRec().history[0] && kcRec().history[0].char, !!document.querySelector('.lf-after'), Object.keys(lfRec().titles)]);
 console.log(w,'end',res); ok((res[0]==='result'||res[0]==='lost') && res[3], w+' 결과 화면: 거점으로 돌아가기');
 await p.screenshot({path:`lf_result_${w}.png`});
 await p.click('.lf-after [data-atab="life"]'); await p.waitForTimeout(300); await bad('back');
 ok(await p.evaluate(()=>arenaTab==='life'), w+' 거점 복귀');
 await p.click('[data-lfspot="wall"]'); await p.waitForTimeout(150); await p.screenshot({path:`lf_wall_${w}.png`}); await bad('wall');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
 await p.reload(); await p.waitForTimeout(600); ok(await p.evaluate(()=>lfOn() && lfChar().id==='dohyun'), w+' 새로고침 뒤 인생 유지');
 await p.evaluate(()=>{ localStorage.clear(); }); await p.close();
}
console.log('errors', errs); await b.close();})();
