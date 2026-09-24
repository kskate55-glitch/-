// 점검 반영 — CASE OPEN 한 번만 · 인생 바꿀 때 잔액 안 셈 · 알림 위치 · 저장/새로고침 유지 · 모바일 터치 영역
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ localStorage.clear(); delete S.arena; const c=kcRec(); delete c.life; arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); }); await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!document.getElementById('pxCard')), w+' CASE OPEN 처음 한 번');
 await p.evaluate(()=>{ const x=document.getElementById('pxCard'); if(x) x.remove(); arenaTab='home'; renderArena(); }); await p.waitForTimeout(200);
 await p.evaluate(()=>{ arenaTab='king'; renderArena(); }); await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!document.getElementById('pxCard')), w+' 탭 오갔다 돌아와도 다시 안 뜸');
 // 알림 위치
 await p.evaluate(()=>{ HUB_TOAST.push({t:'테스트 알림'}); hubToastShow(); }); await p.waitForTimeout(300);
 const tr = await p.evaluate(()=>{ const r=document.querySelector('#hubToasts .hub-toast').getBoundingClientRect(); return {top:r.top, bottom:r.bottom, h:innerHeight}; });
 ok(tr.top > tr.h*0.5, w+' 알림은 화면 아래쪽 (top '+Math.round(tr.top)+')');
 // 인생 바꿀 때 잔액 안 셈
 await p.evaluate(()=>{ K=null; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; renderArena(); }); await p.waitForTimeout(300);
 await p.evaluate(()=>{ cpUnlockAll(); lfNew('dohyun'); lfRec().intro=false; renderArena(); }); await p.waitForTimeout(150);
 ok(await p.evaluate(()=>!document.querySelector('.ke-float.px-out,.ke-float.px-in')), w+' 다른 인생으로 바꾸면 잔액이 떠오르지 않음');
 // 저장·새로고침
 await p.evaluate(()=>{ cpUnlockAll(false); const P=cpRec(); P.cleared.seoyun={ending:'good',at:1}; P.unlocked.dohyun=true; dpRec().after.push({kind:'dodge',title:'x',text:'y',due:99}); save(); });
 await p.reload(); await p.waitForTimeout(900);
 const per = await p.evaluate(()=>({clr:cpCleared('seoyun'), un:cpUnlocked('dohyun'), lock:cpUnlocked('mijeong'), aft:dpRec().after.length, life:lfRec() && lfRec().char}));
 console.log(w, per);
 ok(per.clr && per.un && !per.lock && per.aft===1 && per.life==='dohyun', w+' 새로고침 후에도 캠페인·후일담·인생 유지');
 if(w<640){ await p.evaluate(()=>{ arenaTab='rec'; renderArena(); }); await p.waitForTimeout(300);
   ok(await p.evaluate(()=>[...document.querySelectorAll('.hub-tabs button')].every(x=>x.getBoundingClientRect().height>=43)), w+' 메뉴 탭 버튼 44px'); }
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
