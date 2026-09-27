const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(1000);
// 첫 실행 안내가 이미 끝난 사람처럼: 오른쪽 칸 비우기
await p.evaluate(()=>{ document.querySelectorAll('.fr-guide').forEach(x=>x.remove()); renderArena(); }); await p.waitForTimeout(300);
const st=await p.evaluate(()=>({hubme:!!document.querySelector('#kfsRoot .kfs-panel .hub-me'), lv:!!document.querySelector('[data-fxlv]'), txt:(document.querySelector('[data-fxlv]')||{}).textContent}));
ok(!st.hubme && st.lv, w+' LV·명성 카드는 오른쪽 칸에서 빠지고 머리줄 버튼으로 ('+st.txt+')');
await p.click('[data-fxlv]'); await p.waitForTimeout(150);
ok(await p.evaluate(()=>!!document.querySelector('#fxLvPop .hub-me')), w+' 버튼 누르면 LV·명성 카드가 뜸');
await p.mouse.click(w/2, h/2); await p.waitForTimeout(150);
ok(await p.evaluate(()=>!document.querySelector('#fxLvPop')), w+' 바깥을 누르면 닫힘');
if(w===1280) await p.screenshot({path:'v229_home.png'}); else await p.screenshot({path:'v229_home_m.png'});
const np=await p.evaluate(()=>{ const r=document.getElementById('kfsRoot'); const pan=r.querySelector('.kfs-panel'); return {cls:r.classList.contains('fx-nopanel'), vis:pan?pan.getClientRects().length:0}; });
ok(np.cls && !np.vis, w+' 볼 게 없는 오른쪽 칸은 접힘');
await p.close(); }
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.join('|'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
