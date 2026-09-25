const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
await p.evaluate(()=>{ localStorage.clear(); page='arena'; const c=kcRec(); delete c.life; K=null; arenaTab='life'; LF_PICK='seoyun'; renderArena(); }); await p.waitForTimeout(700);
ok(await p.isVisible('[data-epopen="seoyun"]'), w+' 선택 화면에 스토리 에피소드 입구');
ok(await p.evaluate(()=>!cpUnlocked('dohyun')), w+' 도현은 잠김');
await p.click('[data-epopen="seoyun"]'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.querySelectorAll('#epRoot .ep-li').length===4), w+' 챕터 화면: 에피소드 4개');
if(w===1280) await p.screenshot({path:'ep_chapter.png'});
for(let e=0;e<4;e++){
  await p.click('[data-ep="intro"],[data-ep="nextep"]'); await p.waitForTimeout(300);
  if(w===1280 && e===0) await p.screenshot({path:'ep_intro.png'});
  await p.click('[data-ep="play"]'); await p.waitForTimeout(300);
  for(let s=0;s<10;s++){
    const best=await p.evaluate(()=>{ const c=epCase(EP_PLAN[EP.ch].eps[EP.i].c); const st=c.steps[EP.step]; return st.o.findIndex(o=>o.g===(EP.i===1&&EP.step===0?1:2)); });
    await p.click(`[data-epick="${best}"]`); await p.waitForTimeout(150);
    if(w===1280 && e===0 && s===0) await p.screenshot({path:'ep_play.png'});
    const nx=await p.$('[data-ep="next"]'); if(nx){ await nx.click(); await p.waitForTimeout(150); continue; }
    await p.click('[data-ep="recap"]'); await p.waitForTimeout(300); break;
  }
  if(w===1280 && e===0) await p.screenshot({path:'ep_recap.png'});
}
await p.click('[data-ep="end"]'); await p.waitForTimeout(700);
ok(await p.evaluate(()=>!!document.querySelector('#cpEnd .cp-card') && CP_SHOW && CP_SHOW.ep), w+' 엔딩 카드');
const t=await p.evaluate(()=>cpRec().cleared.seoyun && cpRec().cleared.seoyun.ending); ok(t==='special'||t==='good', w+' 엔딩 종류 '+t);
ok(await p.evaluate(()=>cpUnlocked('dohyun')), w+' 도현 해금');
if(w===1280) await p.screenshot({path:'ep_end.png'});
await p.click('#cpEnd [data-cp="go"]'); await p.waitForTimeout(500);
await p.click('#cpEnd [data-cp="new"]'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>EP && EP.ch==='dohyun'), w+' 다음 단계(도현) 에피소드로 바로 이어짐');
// 6단계 마지막 → 크레딧
await p.evaluate(()=>{ epClose(); const P=cpRec(); CP_ORDER.forEach(id=>P.unlocked[id]=true); const R=epOf('taesik'); const n=EP_PLAN.taesik.eps.length; R.res=[]; for(let i=0;i<n-1;i++) R.res.push({id:EP_PLAN.taesik.eps[i].c,pct:60,d:10,w:100,dBest:8,wBest:80,dExtra:2,wExtra:20,profit:5000}); epOpen('taesik'); });
await p.waitForTimeout(300);
ok(await p.evaluate(()=>EP.i===4 && document.querySelectorAll('#epRoot .ep-li').length===5), w+' 태식은 에피소드 5개(마지막 = 유치권 7세대)');
await p.evaluate(()=>{ const R=epOf('taesik'); R.res.push({id:'c100',pct:50,d:10,w:100,dBest:8,wBest:80,dExtra:2,wExtra:20,profit:5000}); EP.i=4; epFinish(); }); await p.waitForTimeout(500);
await p.click('#cpEnd [data-cp="go"]'); await p.waitForTimeout(1500);
ok(await p.evaluate(()=>!!document.querySelector('#crRoll') && /쥬루/.test(document.querySelector('#crRoll').innerText) && /가상/.test(document.querySelector('#crRoll').innerText)), w+' 엔딩 크레딧(쥬루·가상 사건 안내)');
ok(await p.evaluate(()=>!!CR_M), w+' 크레딧 BGM 재생 중');
await p.waitForTimeout(8000); await p.screenshot({path:`cr_${w}.png`});
await p.click('[data-crclose]'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>!document.querySelector('#crRoll') && !CR_M), w+' 크레딧 닫기');
await p.evaluate(()=>{ page='arena'; arenaTab='home'; renderArena(); }); await p.waitForTimeout(900);
ok(await p.evaluate(()=>!!document.querySelector('#madeBy') && /쥬루/.test(document.querySelector('#madeBy').textContent)), w+' 첫 화면 구석 made by 쥬루');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log('errors',errs); await b.close();})();
