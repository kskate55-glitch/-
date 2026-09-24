// 딥 이머전 — 후일담 · 기억 혼잣말 · 전화 습관 · 매수자 방문 · 거점 소품/젖은 우산
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ localStorage.clear(); const c=kcRec(); delete c.life; arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); }); await p.waitForTimeout(1300);
 // 패찰 → 후일담 예약
 const lost = await p.evaluate(()=>{ kBid(KP.minBid); K.revealing=false; renderArena(); return {step:K.step, n:dpRec().after.length, due:(dpRec().after[0]||{}).due, cases:kcRec().cases}; });
 console.log(w, lost);
 ok(lost.step==='lost' && lost.n===1 && lost.due===lost.cases+1, w+' 패찰한 물건 후일담 예약(다음 CASE 뒤)');
 await p.evaluate(()=>{ kcRec().cases+=1; K=null; arenaTab='home'; renderArena(); }); await p.waitForTimeout(1100);
 const nw = await p.evaluate(()=>(document.querySelector('#dpCard')||{}).innerText||'');
 console.log(w, nw.replace(/\n/g,' / ').slice(0,220));
 ok(/그때 그 물건/.test(nw) && /팔렸다/.test(nw) && /(아까운|번 거다)/.test(nw), w+' 후일담 카드: 몇 달 뒤 얼마에 팔렸고 낙찰자 손익');
 await p.screenshot({path:`dp_news_${w}.png`});
 await p.click('[data-dpclose]'); await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!document.getElementById('dpCard') && dpRec().after[0].seen>0), w+' 한 번만 온다');
 // 지난 실수 기억
 await p.evaluate(()=>{ dpMemNote('miss_elec'); arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); }); await p.waitForTimeout(1900);
 const th = await p.evaluate(()=>(document.querySelector('.dp-thought')||{}).innerText||'');
 ok(/계량기|차단기/.test(th), w+' 새 CASE — 지난 실수 혼잣말: '+th);
 await p.screenshot({path:`dp_thought_${w}.png`});
 // 전화 습관
 await p.evaluate(()=>{ document.querySelectorAll('details').forEach(d=>d.open=true); });
 const callBtn = await p.$('[data-kres="call1"]:not([disabled])') || await p.$('[data-kres="mgmtcall"]:not([disabled])');
 if(callBtn){ await callBtn.click(); await p.waitForTimeout(150);
   ok(await p.evaluate(()=>/연결 중/.test((document.querySelector('.dp-call')||{}).innerText||'')), w+' 전화: 연결 중… 뚜—');
   await p.waitForTimeout(1300); const say = await p.evaluate(()=>(document.querySelector('.dp-call .dp-say')||{}).textContent||'');
   ok(say.length>5, w+' 전화 받는 말투: '+say.slice(0,40)); await p.screenshot({path:`dp_call_${w}.png`}); }
 else ok(false, w+' 전화 버튼 없음');
 await p.waitForTimeout(2500);
 // 매수자 방문
 await p.evaluate(()=>{ K.step='sell'; K.sale={list:15500, trueP:15300, weeks:1, offers:[], buyer:null, done:false}; K.repair=K.repair||{id:'good',speed:0.1}; renderArena(); }); await p.waitForTimeout(300);
 await p.evaluate(()=>{ const x=document.getElementById('pxCard'); if(x) x.remove(); K.sale.offer={amt:15400, buyer:K_BUYERS[0]}; K.sale.weeks=2; renderArena(); }); await p.waitForTimeout(2600);
 const vis = await p.evaluate(()=>(document.querySelector('#pxCard.visit')||{}).innerText||'');
 ok(/집을 보러 왔다/.test(vis) && /신혼부부/.test(vis) && /욕실/.test(vis), w+' 매수자 방문 몽타주');
 await p.screenshot({path:`dp_visit_${w}.png`});
 await p.waitForTimeout(1200);
 // 거점 소품
 await p.evaluate(()=>{ K=null; lfNew('seoyun'); lfRec().intro=false; const c=kcRec(); c.wins=1; c.fails=1; c.cases=3; lfRec().umb=dpDayNo(); arenaTab='life'; renderArena(); }); await p.waitForTimeout(500);
 const props = await p.evaluate(()=>[...document.querySelectorAll('[data-dpprop]')].map(x=>x.dataset.dpprop));
 console.log(w, props);
 ok(props.includes('umb_wet') && props.includes('frame') && props.includes('memo'), w+' 거점 소품: 젖은 우산·첫 낙찰 액자·메모');
 await p.click('[data-dpprop="umb_wet"]'); await p.waitForTimeout(200);
 ok(await p.evaluate(()=>/비 맞고/.test((document.querySelector('.dp-say-bubble')||{}).textContent||'')), w+' 소품 누르면 한마디');
 await p.screenshot({path:`dp_props_${w}.png`});
 await p.evaluate(()=>{ lfRec().t += 1440; renderArena(); }); await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!document.querySelector('[data-dpprop="umb"]') && !document.querySelector('[data-dpprop="umb_wet"]')), w+' 다음 날엔 마른 우산');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), w+' 가로 스크롤 없음');
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
