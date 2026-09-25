// 조사 묶음 아코디언 — 처음엔 접힘 · 하나 열면 나머지 접힘 · 행동 뒤에도 연 묶음 유지
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>{ localStorage.clear(); const c=kcRec(); delete c.life; arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); document.getElementById('pxCard')?.remove(); }); await p.waitForTimeout(500);
 const st = () => p.evaluate(()=>[...document.querySelectorAll('.stg-grp')].map(d=>d.open?1:0).join(''));
 const s0 = await st(); ok(/^0+$/.test(s0) && s0.length>=2, w+' 처음엔 전부 접힘 ('+s0+')');
 const sums = await p.$$('.stg-grp > summary');
 await sums[0].click(); await p.waitForTimeout(250); ok((await st()).startsWith('1') && !(await st()).slice(1).includes('1'), w+' 첫 묶음만 열림');
 await (await p.$$('.stg-grp > summary'))[1].click(); await p.waitForTimeout(250); const s2 = await st(); ok(s2[0]==='0' && s2[1]==='1' && s2.split('1').length===2, w+' 다른 묶음 열면 앞 묶음 접힘 ('+s2+')');
 const act = await p.$('.stg-grp[open] [data-kres]:not([disabled])'); await act.click(); await p.waitForTimeout(500);
 const s3 = await st(); ok(s3[1]==='1', w+' 조사한 뒤에도 연 묶음 그대로 ('+s3+')');
 await p.click('.stg-grp[open] > summary'); await p.waitForTimeout(250); ok(/^0+$/.test(await st()), w+' 다시 누르면 접힘');
 const hgt = await p.evaluate(()=>document.querySelector('.kfs-panel').scrollHeight); console.log(w,'패널 높이', hgt);
 await p.screenshot({path:`acc_${w}.png`});
 await p.close(); }
console.log('errors',errs); await b.close();})();
