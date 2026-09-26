const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ localStorage.clear(); IL_AUTOPLAY=false; kcRec().fr={full:true}; page='arena'; arenaTab='home'; renderArena(); }); await p.waitForTimeout(600);
ok(await p.evaluate(()=>!document.querySelector('.lf-home-go')), w+' 첫 화면에 자유 인생 버튼 없음');
await p.click('.ep-home'); await p.waitForTimeout(1500);
for(let k=0;k<4;k++){ await p.evaluate(()=>{const s=document.querySelector('[data-gxskip]'); if(s) s.click();}); await p.waitForTimeout(500); }
await p.waitForTimeout(800);
ok(await p.evaluate(()=>lfRec() && lfRec().story && lfRec().char==='seoyun' && arenaTab==='life'), w+' 스토리 = 서윤의 방(인생 모드)');
ok(await p.isVisible('.ep-alert [data-epgo]'), w+' 방에 EP 1 알림');
if(w===1280) await p.screenshot({path:'epw_room.png'});
await p.click('.ep-alert [data-epgo]'); await p.waitForTimeout(800);
ok(await p.evaluate(()=>arenaTab==='king' && K && KP.id==='k1' && K.epStory), w+' EP1 = 풀 경매(k1)');
// 결과로 건너뛰기
await p.evaluate(()=>{ K.step='result'; K.final={profit:1234,grades:{bid:'A',move:'S',repair:'A',sell:'B'},lesson:'테스트 교훈'}; K.day=60; renderArena(); }); await p.waitForTimeout(900);
ok(await p.isVisible('#epKBar [data-epkdone]'), w+' 결과 화면에 "에피소드 정리하고 방으로"');
await p.click('#epKBar [data-epkdone]'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>EP && EP.scr==='recap' && epOf('seoyun').res[0].pct>=80), w+' EP1 기록(등급으로 점수) ');
const t0=await p.evaluate(()=>lfRec().t);
await p.click('[data-ep="nextep"]'); await p.waitForTimeout(900);
ok(await p.evaluate((t0)=>arenaTab==='life' && lfRec().t>t0+100*1440, t0), w+' 방으로 돌아오고 몇 달 흐름');
for(let e=1;e<4;e++){
  { const lt=await p.$('[data-illater]'); if(lt){ await lt.click(); await p.waitForTimeout(300); } }
  await p.click('.ep-alert [data-epgo]'); await p.waitForTimeout(700);
  const want=await p.evaluate((e)=>EP_PLAN.seoyun.eps[e].k,e);
  ok(await p.evaluate((want)=>arenaTab==='king' && K && KP.id===want && K.epStory && KP.gen, want), w+` EP${e+1} = 새 풀 경매(${want})`);
  if(e===1 && w===1280){ await p.evaluate(()=>{K.intro=false; renderArena();}); await p.waitForTimeout(700); await p.screenshot({path:'epw_full.png'}); }
  await p.evaluate(()=>{ K.intro=false; K.step='result'; K.final={profit:800,total:KP.trueMid-800,rate:5,grades:{bid:'A',move:'A',repair:'S',sell:'B'},lesson:KP.lesson,found:2,hid:4,tips:[],style:['a','b']}; K.day=50; K.moveDays=20; K.repair=K_REPAIR[3]; K.sale={price:KP.trueMid,trueP:KP.trueMid,buyer:{t:'신혼부부'}}; renderArena(); }); await p.waitForTimeout(700);
  await p.click('#epKBar [data-epkdone]'); await p.waitForTimeout(500);
  ok(await p.evaluate((e)=>epOf('seoyun').res[e] && epOf('seoyun').res[e].full, e), w+` EP${e+1} 기록`);
  if(e<3){ await p.click('[data-ep="nextep"]'); await p.waitForTimeout(700); }
}
await p.click('[data-ep="end"]'); await p.waitForTimeout(700);
ok(await p.evaluate(()=>CP_SHOW && CP_SHOW.ep && cpUnlocked('dohyun')), w+' 엔딩 → 도현 해금');
await p.click('#cpEnd [data-cp="go"]'); await p.waitForTimeout(400); await p.click('#cpEnd [data-cp="new"]'); await p.waitForTimeout(1500);
for(let k=0;k<4;k++){ await p.evaluate(()=>{const s=document.querySelector('[data-gxskip]'); if(s) s.click();}); await p.waitForTimeout(500); }
ok(await p.evaluate(()=>lfRec().char==='dohyun' && lfRec().story && arenaTab==='life'), w+' 다음 단계 = 도현의 방');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log('errors',errs); await b.close();})();
