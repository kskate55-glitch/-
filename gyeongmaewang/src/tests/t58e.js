const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('dialog',d=>d.accept()); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} }); await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!document.querySelector('.kfs-panel .kc-pred') && !document.querySelector('.kfs-panel .ke-case') && !!document.querySelector('.kfs-stage .ke-sheet #kBid')), w+' 판단기록 없음 · 사건파일/입찰표는 그림 위로');
 ok(await p.evaluate(()=>document.querySelectorAll('.kfs-panel details.stg-grp').length===3 && document.querySelectorAll('.kfs-panel details.stg-grp[open]').length>=1), w+' 조사 행동 3묶음 접기');
 for(const r of ['trade','docs']){ await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){ await el.click(); await p.waitForTimeout(700);} }
 ok(await p.evaluate(()=>!!document.querySelector('.stg-tab.new')), w+' 새 조사 결과 → 사건 파일 탭 NEW');
 ok(await p.evaluate(()=>document.querySelector('details.stg-grp').open), w+' 다시 그려져도 펼친 묶음 유지');
 await p.click('[data-stg="file"]'); await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!document.querySelector('.stg-file').hidden && !!document.querySelector('.stg-file .ke-card.on')), w+' 사건 파일 열림 · 드러난 카드');
 await p.screenshot({path:`stg_file_${w}.png`});
 await p.click('.stg-x'); await p.waitForTimeout(200);
 ok(await p.evaluate(()=>document.querySelector('.stg-file').hidden), w+' 닫기');
 await p.fill('#kBid', String(await p.evaluate(()=>KP.minBid+2000))); ok(await p.evaluate(()=>/원/.test(document.getElementById('kHangul').textContent)), w+' 입찰금액 입력 동작');
 const sb = await p.$('.kfs-tools .kc-audio summary'); await sb.click(); await p.waitForTimeout(300);
 const top = await p.evaluate(()=>{ const m=document.querySelector('.kc-audio-in'); const r=m.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return !!el && !!el.closest('.kc-audio-in'); });
 ok(top, w+' 소리 메뉴가 맨 위에 보임'); await p.screenshot({path:`stg_snd_${w}.png`}); await sb.click();
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
