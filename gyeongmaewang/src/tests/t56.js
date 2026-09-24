const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 const broken=[]; p.on('response',r=>{ if(/_blob/.test(r.url()) && r.status()>=400) broken.push(r.url()); });
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; K=null; arenaTab='life'; LF_PICK='seoyun'; renderArena(); }); await p.waitForTimeout(900);
 ok(await p.evaluate(()=>!!document.querySelector('.lf-focus-art') && document.querySelectorAll('.lf-card .lf-face img').length===1), w+' 선택: 서윤 얼굴·세로 일러스트');
 await p.screenshot({path:`ca_sel_${w}.png`});
 await p.click('[data-lfstart="seoyun"]'); await p.waitForTimeout(9500); await p.screenshot({path:`ca_op_${w}.png`});
 await p.click('[data-gxskip]'); await p.waitForTimeout(300); await p.click('[data-gxskip]'); await p.waitForTimeout(1300);
 ok(await p.evaluate(()=>!!document.querySelector('.lf-me') && /6c5608542f/.test(document.body.innerHTML)), w+' 거점: 방 배경 + 서 있는 서윤');
 await p.screenshot({path:`ca_base_${w}.png`});
 ok(await p.evaluate(()=>artUrl('npc_playerf_soft')==='/_blob/6fd30bc8295c83a97fba61c22e67dc0d' && artUrl('npc_player_neutral')==='/_blob/fb967929266348b78f10a1365f06409d'), w+' 얼굴·뒷모습 슬롯이 서윤으로');
 await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('dohyun'); lfRec().intro=false; renderArena(); });
 ok(await p.evaluate(()=>artUrl('npc_player_neutral')!=='/_blob/fb967929266348b78f10a1365f06409d' && !document.querySelector('.lf-me')), w+' 도현은 공용 그림(서윤 그림 안 섞임)');
 ok(broken.length===0, w+' 깨진 그림 없음 '+broken.join(','));
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
 await p.evaluate(()=>localStorage.clear()); await p.close(); }
console.log('errors',errs); await b.close();})();
