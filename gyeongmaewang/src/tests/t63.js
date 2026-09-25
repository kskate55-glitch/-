// 마이크로 폴리시 — CASE OPEN · 과입찰 표정/땀 · 빈집 · CLOSED · 돈 움직임 · 진동 · 버튼 · 폰트 · 최소 연출
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ localStorage.clear(); const c=kcRec(); delete c.life; arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); }); await p.waitForTimeout(250);
 const open = await p.evaluate(()=>{ const e=document.querySelector('#pxCard.open'); return e && e.innerText; });
 ok(/CASE 001/.test(open||''), w+' CASE OPEN 카드'); await p.screenshot({path:`px_open_${w}.png`});
 await p.waitForTimeout(1400); ok(await p.evaluate(()=>!document.getElementById('pxCard')), w+' CASE OPEN 저절로 걷힘');
 // 과입찰 — 웃음 → 굳음 + 땀
 await p.evaluate(()=>{ kBid(Math.round(KP.appraisal*1.6)); K.revealing=true; renderArena(); });
 const rv = await p.evaluate(()=>K.revealMs); await p.waitForTimeout(rv+500);
 const st = await p.evaluate(()=>({step:K.step, gap:K.result.gap, solo:K.result.solo, img:(document.querySelector('.vn-face.me img')||document.querySelector('.vn-player')||{}).src||''}));
 console.log(w, st.step, st.gap, st.solo);
 await p.waitForTimeout(700); await p.screenshot({path:`px_over_${w}.png`});
 const fx = await p.evaluate(()=>({sweat:document.querySelectorAll('.px-sweat').length, bang:document.querySelectorAll('.px-shock').length, img:(document.querySelector('.vn-face.me img')||document.querySelector('.vn-player')||{}).src||''}));
 ok(st.step==='won' && fx.sweat>=1, w+' 낙찰 뒤 땀 방울 ('+fx.sweat+')');
 if(!st.solo) ok(fx.bang>=1 && await p.evaluate(u=>u===artUrl('npc_playerf_shocked')||u.endsWith(artUrl('npc_playerf_shocked')), fx.img), w+' 과입찰: 표정 바뀜 + "!"');
 // 빈집 — 명도 끝
 await p.waitForTimeout(1200);
 await p.evaluate(()=>{ K.step='move'; renderArena(); }); await p.waitForTimeout(200);
 await p.evaluate(()=>{ K.step='defect'; K.defects=K.defects||[]; renderArena(); }); await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/열쇠를 받았다/.test((document.querySelector('#pxCard.empty')||{}).innerText||'')), w+' 빈집 입장: 열쇠 + ……');
 await p.screenshot({path:`px_empty_${w}.png`});
 await p.click('#pxCard'); await p.waitForTimeout(300); ok(await p.evaluate(()=>!document.getElementById('pxCard')), w+' 누르면 바로 걷힘');
 await p.evaluate(()=>pxCaseClosed()); await p.waitForTimeout(900);
 ok(await p.evaluate(()=>/CLOSED/.test(document.querySelector('#pxCard.closed').innerText)), w+' CASE CLOSED 도장'); await p.screenshot({path:`px_closed_${w}.png`});
 await p.waitForTimeout(800);
 // 진동
 await p.evaluate(()=>kcSfx('message')); await p.waitForTimeout(80); ok(await p.evaluate(()=>document.getElementById('pxPhone').classList.contains('on')), w+' 문자 → 휴대폰 진동 표시');
 // 거점 돈 움직임
 await p.evaluate(()=>{ K=null; lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; renderArena(); }); await p.waitForTimeout(300);
 await p.evaluate(()=>{ kcRec().cash-=1200; renderArena(); }); await p.waitForTimeout(150);
 const cash = await p.evaluate(()=>({f:[...document.querySelectorAll('.ke-float.px-out')].map(x=>x.textContent), t:document.querySelector('.px-cash').textContent, v:kMan(kcRec().cash)}));
 console.log(w, cash);
 ok(cash.f.some(x=>/1,200만원/.test(x)) && cash.t!==cash.v, w+' 돈 빠질 때 −금액 떠오르고 숫자가 세어 내려감');
 await p.waitForTimeout(1300); ok(await p.evaluate(()=>document.querySelector('.px-cash').textContent===kMan(kcRec().cash)), w+' 다 세면 정확한 잔액');
 // 버튼 · 폰트 · 숨쉬기
 const css = await p.evaluate(()=>{ const bt=document.querySelector('#kfsRoot .btn'); const d=document.createElement('b'); d.className='px-disp'; document.body.appendChild(d); const f=getComputedStyle(d).fontFamily; d.remove(); return {tr:bt?getComputedStyle(bt).transitionProperty:'', font:f, me:getComputedStyle(document.querySelector('.lf-me')||document.body).animationName}; });
 console.log(w, css);
 ok(/transform/.test(css.tr), w+' 버튼 눌림 전환'); ok(/Do Hyeon/.test(css.font), w+' 큰 연출 글꼴'); ok(/pxBreath/.test(css.me), w+' 거점 캐릭터 숨쉬기');
 // 최소 연출
 await p.evaluate(()=>{ localStorage.setItem('gmw_fx', JSON.stringify({level:'min'})); pxCaseOpen(); }); await p.waitForTimeout(100);
 ok(await p.evaluate(()=>document.getElementById('pxCard').classList.contains('still')), w+' 최소 연출이면 움직임 없음');
 await p.waitForTimeout(800);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), w+' 가로 스크롤 없음');
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
