// 캠페인 — 잠금/해금 · 엔딩 · 해금 연출 · 커리어 · 마이그레이션 · 파산/1년
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{ window.confirm=()=>true; });
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ localStorage.clear(); delete S.arena; const c=kcRec(); delete c.life; c.cases=0; K=null; arenaTab='life'; LF_PICK=null; renderArena(); }); await p.waitForTimeout(400);
 const sel = await p.evaluate(()=>({cards:document.querySelectorAll('.lf-card').length, locked:[...document.querySelectorAll('.lf-card.locked')].map(x=>x.dataset.cplock), open:[...document.querySelectorAll('[data-lfpick]')].map(x=>x.dataset.lfpick).filter(Boolean), dots:(document.querySelector('.cp-dots')||{}).innerText, msg:(document.querySelector('.lf-card.locked .cp-lock')||{}).innerText}));
 console.log(w, sel);
 ok(sel.cards===6 && sel.locked.length===5 && sel.open.join()==='seoyun', w+' 처음엔 서윤만 열림 · 여섯 명 다 보임');
 ok(/한서윤의 엔딩/.test(sel.msg||''), w+' 잠긴 카드: "한서윤의 엔딩을 보세요"');
 ok((sel.dots||'').replace(/\s/g,'')==='◉○○○○○', w+' 진행 표시 ◉○○○○○');
 await p.screenshot({path:`cp_sel_${w}.png`, fullPage:false});
 await p.click('[data-cplock="dohyun"]',{force:true}); await p.waitForTimeout(250);
 ok(await p.evaluate(()=>!LF_PICK && !!document.querySelector('.sc-toast')), w+' 잠긴 카드 클릭 → 안내만, 선택 안 됨');
 // 서윤 시작 → 갈림길 → 엔딩
 await p.evaluate(()=>{ lfNew('seoyun'); lfRec().intro=false; K=null; const c=kcRec(); c.total=12000; c.cases=5; c.wins=5; c.fails=0; c.cash=15000; LF_SPOT='laptop'; renderArena(); }); await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/ACT 4\/4/.test(document.querySelector('.kfs-head, #kfsRoot')?.innerText||document.body.innerText)), w+' 머리줄 ACT 칩');
 const hasPath = await p.$('[data-lfpath]'); ok(!!hasPath, w+' 갈림길(마지막 선택) 표시');
 await p.click('[data-lfpath="job"]'); await p.waitForTimeout(700);
 ok(await p.evaluate(()=>!document.getElementById('cpEnd') && lfRec().path==='job' && lfRec().mode!=='career'), w+' 갈림길을 골라도 바로 엔딩이 나지 않는다');
 ok(await p.evaluate(()=>/결산 D-\d+/.test(document.body.innerText)), w+' 머리줄에 1년 결산 D-day');
 await p.evaluate(()=>{ LF_SPOT='wall'; renderArena(); }); await p.waitForTimeout(300);
 ok(!!(await p.$('[data-cpsettle]')), w+' 벽: 지금 결산하기 버튼');
 await p.evaluate(()=>{ lfRec().t=CP_YEAR_MIN; K=null; LF_SPOT='laptop'; renderArena(); }); await p.waitForTimeout(700);
 const end = await p.evaluate(()=>({card:!!document.querySelector('#cpEnd .cp-card'), txt:(document.querySelector('#cpEnd')||{}).innerText||'', unl:cpUnlocked('dohyun'), clr:cpCleared('seoyun'), mode:lfRec().mode}));
 ok(end.card && /END/.test(end.txt) && /마지막 선택/.test(end.txt), w+' 엔딩 요약 화면');
 ok(end.unl && end.clr && end.mode==='career', w+' 서윤 클리어 → 도현 해금 · 커리어 전환');
 console.log(w, end.txt.slice(0,160).replace(/\n/g,' / '));
 await p.screenshot({path:`cp_end_${w}.png`});
 await p.click('[data-cp="go"]'); await p.waitForTimeout(700);
 ok(await p.evaluate(()=>/새로운 인생이 열렸습니다/.test(document.querySelector('#cpEnd').innerText) && /이도현/.test(document.querySelector('#cpEnd').innerText)), w+' "새로운 인생이 열렸습니다" — 이도현');
 await p.screenshot({path:`cp_reveal_${w}.png`});
 await p.click('[data-cp="new"]'); await p.waitForTimeout(500);
 const sel2 = await p.evaluate(()=>({end:!!document.getElementById('cpEnd'), pick:LF_PICK, locked:document.querySelectorAll('.lf-card.locked').length, badge:!!document.querySelector('[data-lfpick="seoyun"] .cp-clear'), dots:(document.querySelector('.cp-dots')||{}).innerText, stash:!!cpRec().stash.seoyun}));
 console.log(w, sel2);
 ok(!sel2.end && sel2.pick==='dohyun' && sel2.locked===4 && sel2.badge && sel2.stash, w+' 인생 고르기: 도현 선택됨 · 잠김 4 · 서윤 CAREER 배지 · 커리어 세이브 보관');
 ok((sel2.dots||'').replace(/\s/g,'')==='●◉○○○○', w+' 진행 표시 ●◉○○○○');
 await p.screenshot({path:`cp_sel2_${w}.png`});
 // 서윤 커리어 이어하기
 await p.click('[data-lfpick="seoyun"]'); await p.waitForTimeout(300);
 ok(!!(await p.$('[data-cpcareer="seoyun"]')), w+' 클리어 캐릭터에 커리어 버튼');
 await p.click('[data-cpcareer="seoyun"]'); await p.waitForTimeout(500);
 ok(await p.evaluate(()=>lfOn() && lfRec().char==='seoyun' && lfRec().mode==='career' && kcRec().total===12000 && !document.querySelector('[data-lfpath]')), w+' 커리어 — 지난 기록 그대로 · 엔딩/갈림길 없음');
 ok(await p.evaluate(()=>/CAREER/.test(document.body.innerText)), w+' CAREER 칩');
 // 파산 = BAD, 진행은 막지 않음
 await p.evaluate(()=>{ const c=kcRec(); cpStashNow(); delete c.life; lfNew('dohyun'); lfRec().intro=false; K=null; kcRec().cash=-12000; renderArena(); }); await p.waitForTimeout(700);
 ok(await p.evaluate(()=>/BAD END/.test((document.querySelector('#cpEnd')||{}).innerText||'') && cpUnlocked('mijeong')), w+' 파산 → BAD 엔딩이어도 다음(미정) 해금');
 await p.click('[data-cp="go"]'); await p.waitForTimeout(300); await p.click('[data-cp="menu"]'); await p.waitForTimeout(300);
 // 1년 경과 → 갈림길 강제
 ok(await p.evaluate(()=>{ lfNew('mijeong'); lfRec().intro=false; lfRec().t=CP_YEAR_MIN; return lfPathDue(); }), w+' 1년 지나면 갈림길 강제');
 // 마이그레이션
 const mig = await p.evaluate(()=>{ delete arenaRec().campaign; const c=kcRec(); lfNew('jaehoon'); lfRec().path='keep'; const P=cpRec(); return {u:Object.keys(P.unlocked).sort().join(), cl:Object.keys(P.cleared).join(), mode:lfRec().mode}; });
 console.log(w, mig);
 ok(mig.u==='dohyun,eunkyung,jaehoon,mijeong,seoyun' && mig.cl==='jaehoon' && mig.mode==='career', w+' 옛 세이브 마이그레이션(재훈 갈림길 지남 → 클리어 · 은경 해금)');
 ok(await p.evaluate(()=>{ delete arenaRec().campaign; const c=kcRec(); lfNew('mijeong'); const P=cpRec(); return !!P.unlocked.mijeong && !P.cleared.mijeong && !P.unlocked.jaehoon; }), w+' 진행 중 세이브(미정) — 그 캐릭터까지만 열림');
 // 가로 스크롤
 await p.evaluate(()=>{ delete arenaRec().campaign; const c=kcRec(); delete c.life; K=null; LF_PICK=null; renderArena(); }); await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), w+' 가로 스크롤 없음');
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
