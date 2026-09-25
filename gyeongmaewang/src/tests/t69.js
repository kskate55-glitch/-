// 박은경 그림 — 선택 카드 얼굴 · 포커스 세로 일러스트 · 거점 방/전신 · 대화 뒷모습 · 표정 · 오프닝 현장 컷
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[], bad=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message)); p.on('response',r=>{ if(r.status()>=400) bad.push(r.status()+' '+r.url()); });
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 const A = await p.evaluate(()=>LF_CHAR_ART.eunkyung);
 await p.evaluate(()=>{ localStorage.clear(); cpUnlockAll(); const c=kcRec(); delete c.life; K=null; arenaTab='life'; LF_PICK='eunkyung'; renderArena(); }); await p.waitForTimeout(700);
 const sel = await p.evaluate(()=>[...document.querySelectorAll('img')].map(i=>i.getAttribute('src')||'').join(' ') + ' ' + [...document.querySelectorAll('[style*="background"]')].map(e=>e.getAttribute('style')).join(' '));
 ok(sel.includes(A.face.normal), w+' 선택 카드 얼굴'); ok(sel.includes(A.select), w+' 포커스 세로 일러스트'); await p.screenshot({path:`ek_sel_${w}.png`});
 await p.evaluate(()=>{ lfNew('eunkyung'); lfRec().intro=false; LF_SPOT='laptop'; renderArena(); }); await p.waitForTimeout(600);
 const base = await p.evaluate(()=>({me:(document.querySelector('.lf-me')||{}).getAttribute?.('src')||'', html:document.querySelector('.lf-stage').outerHTML.slice(0,3000)}));
 ok(base.me.includes(A.front), w+' 거점에 은경 전신'); ok(base.html.includes(A.room), w+' 마포 오피스텔 배경'); await p.screenshot({path:`ek_base_${w}.png`});
 await p.evaluate(()=>{ arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); document.getElementById('pxCard')?.remove(); }); await p.waitForTimeout(600);
 ok(await p.evaluate(b=>(document.querySelector('.vn-player')||{}).getAttribute?.('src')?.includes(b), A.back), w+' 대화 장면 뒷모습');
 await p.evaluate(()=>{ K.rivals=[{t:'x',lo:1.0,hi:1.01,p:1}]; kBid(Math.round(KP.minBid*1.3)); K.revealing=false; renderArena(); }); await p.waitForTimeout(500);
 ok(await p.evaluate(A=>{ const s=(document.querySelector('.vn-face.me img')||{}).getAttribute?.('src')||''; return Object.values(A.face).some(f=>s.includes(f)); }, A), w+' 낙찰 표정 얼굴(대사창 초상)'); ok(await p.evaluate(b=>{ const v=document.querySelector('.vn-player'); return !!v && v.getAttribute('src').includes(b) && !v.classList.contains('front'); }, A.back), w+' 무대의 나는 뒷모습 그대로(표정 그림을 크게 세우지 않음)');
 await p.screenshot({path:`ek_won_${w}.png`});
 await p.evaluate(()=>{ K=null; gxOpStart('eunkyung'); }); let hit=false;
 for(let i=0;i<30 && !hit;i++){ await p.waitForTimeout(500); hit = await p.evaluate(u=>[...document.querySelectorAll('.gx-bgimg')].some(e=>e.style.backgroundImage.includes(u)), A.morning); if(i===4) await p.keyboard.press('Space'); }
 ok(hit, w+' 오프닝 첫 장면 = 아침 커피 컷');
 await p.screenshot({path:`ek_op_${w}.png`});
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('bad', bad.slice(0,5)); console.log('errors',errs); await b.close();})();
