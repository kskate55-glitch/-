const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; kcRec().cases=1; page='arena'; arenaTab='home'; renderArena(); }); await p.waitForTimeout(500);
const box=await p.evaluate(()=>{ const d=document.querySelector('.kc-box'); if(d) d.open=true; return [...document.querySelectorAll('.kc-box [data-kcnew="career"]')].map(b=>b.innerText.replace(/\n/g,' '))[1]; });
ok(/「서류 한 장과 이삿날」/.test(box) && /배당받는 세입자/.test(box), w+' 케이스 상자에 에피소드 이름·부제: '+box.slice(0,70));
if(w===1280) await p.screenshot({path:'v121_box.png'});
await p.evaluate(()=>{ arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f11'; KC_INTRO=false; kStart(11); K.intro=false; K.timeLeft=9999; renderArena(); }); await p.waitForTimeout(1200);
if(w===1280){
  // v124: 머리줄에선 작아서 못 찾는다는 말에 그림 맨 아래로 옮겼다(계약 변경)
  ok(await p.evaluate(()=>!!document.querySelector('.kfs-stage .nx-dock.inbot .nx-grp')), w+' 조사 버튼 줄이 그림 맨 아래');
  ok(await p.evaluate(()=>!document.querySelector('.kfs-head .nx-dock')), w+' 머리줄엔 버튼 줄 없음');
  await p.click('.nx-dock.inbot .nx-grp > summary'); await p.waitForTimeout(400);
  const pop=await p.evaluate(()=>{ const e=document.querySelector('.nx-dock.inbot .nx-grp[open] .nx-pop'); if(!e) return null; const r=e.getBoundingClientRect(); return [r.top,r.bottom,r.height, e.querySelectorAll('button').length]; });
  ok(pop && pop[3]>0 && pop[2]>80 && pop[0]>=0 && pop[1]<=h, w+' 버튼 누르면 목록이 위로 펼쳐짐 '+JSON.stringify(pop));
  await p.screenshot({path:'v121_pop.png'});
  await p.click('.nx-dock.inbot .nx-grp[open] .nx-x').catch(()=>{}); await p.waitForTimeout(300);
  const hd=await p.evaluate(()=>{ const r=document.querySelector('.kfs-head').getBoundingClientRect(); return r.height; }); ok(hd<70, w+' 머리줄 한 줄 유지 h='+hd);
}
const seal=await p.evaluate(()=>{ const a=document.querySelector('[data-kcseal]'), s=document.querySelector('.fr-skipbtn'); if(!a||!s) return null; const ra=a.getBoundingClientRect(), rs=s.getBoundingClientRect(); return {same:Math.abs(ra.top-rs.top)<4, ca:getComputedStyle(a).backgroundColor, cs:getComputedStyle(s).backgroundColor}; });
ok(seal && seal.same && seal.ca!==seal.cs, w+' 봉투·유찰 버튼 한 줄 + 다른 색 '+JSON.stringify(seal));
const amt=await p.evaluate(()=>{ const l=document.querySelector('.ke-amt'), i=document.getElementById('kBid'); if(!l||!i) return null; const a=l.getBoundingClientRect(), r=i.getBoundingClientRect(); return r.top < a.top+12; });
ok(amt, w+' 입찰금액 글자와 금액 칸이 한 줄');
const pl=await p.evaluate(()=>{ const e=document.querySelector('.kfs-stage .vn-player'), st=document.querySelector('.kfs-stage'); if(!e||!st) return null; return Math.round(e.getBoundingClientRect().left - st.getBoundingClientRect().left); });
if(w===1280) ok(pl!==null && pl>=0, w+' 주인공 왼쪽 안 잘림 left='+pl);
if(w===1280) await p.screenshot({path:'v121_brief.png'}); else await p.screenshot({path:'v121_brief_m.png'});
// 대출 카톡 — 말풍선이 다시 그려지지 않는지
await p.evaluate(()=>{ let t=0; while(t++<8){ kBid(Math.round(KP.minBid*1.4)); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; } K.loan=null; kcRec().cash=1000; renderArena(); lnCheck(); });
await p.waitForTimeout(600);
await p.evaluate(()=>{ const c=document.querySelector('[data-lnask="yes"]'); if(c) c.click(); }); await p.waitForTimeout(300);
await p.click('[data-lncard]'); await p.waitForTimeout(2600);
const first=await p.evaluate(()=>{ const r=document.querySelector('#ktBody .kt-row'); window.__firstRow=r; return !!r; });
await p.waitForTimeout(3500);
const same=await p.evaluate(()=>{ const r=document.querySelector('#ktBody .kt-row'); return {same:r===window.__firstRow, n:document.querySelectorAll('#ktBody .kt-row').length, veilSame:true}; });
ok(first && same.same && same.n>2, w+' 카톡 말풍선: 기존 말풍선 그대로, 새 것만 추가 '+JSON.stringify(same));
if(w===1280) await p.screenshot({path:'v121_kt.png'});
await p.waitForTimeout(9000);
ok(await p.evaluate(()=>!!document.querySelector('.kt-foot [data-lntake]')), w+' 상담 끝나면 "이 조건으로 진행" 버튼');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
