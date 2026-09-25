const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('dialog',d=>d.accept()); p.on('pageerror',e=>errs.push(e.message));
 const broken=[]; p.on('response',r=>{ if(/_blob/.test(r.url()) && r.status()>=400) broken.push(r.url()); });
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('dohyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(700);
 const nb = await p.evaluate(()=>[document.querySelectorAll('.bd-card').length, document.querySelectorAll('.bd-thumb').length]); console.log(w,'board',nb);
 ok(nb[0]>0 && nb[0]===nb[1], w+' 게시판 카드마다 건물 사진');
 await p.screenshot({path:`sh_board_${w}.png`});
 await p.click('[data-bdplay]:not([disabled])'); await p.waitForTimeout(500);
 await p.evaluate(()=>{ if(K.intro){K.intro=false;renderArena();} }); await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!!document.querySelector('.kfs-panel .stg-wx')), w+' 오늘 날씨 그림');
 for(const r of ['docs','trade']){ await p.evaluate(r=>{ const b=document.querySelector(`[data-kres="${r}"]`); const d=b&&b.closest("details"); document.querySelectorAll('.nx-bar details[open]').forEach(o=>{ if(o!==d) o.open=false; }); if(d) d.open=true; }, r); const el=await p.$(`[data-kres="${r}"]:not([disabled])`); if(el){ await el.click(); await p.waitForTimeout(700);} }
 await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false)); await p.click('[data-stg="file"]'); await p.waitForTimeout(500);
 ok(await p.evaluate(()=>document.querySelectorAll('.stg-file .ke-card.on .ke-photo').length>=1), w+' 조사 파일에 증거 사진');
 await p.screenshot({path:`sh_file_${w}.png`});
 ok(broken.length===0, w+' 깨진 그림 없음 '+broken.slice(0,3).join(','));
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
