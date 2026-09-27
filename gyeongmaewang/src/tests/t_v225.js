const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; kcRec().ez=true; page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false; K_PROP_NEXT='f22'; kStart(9); K.intro=false; renderArena(); }); await p.waitForTimeout(500);
const pos=await p.evaluate(()=>{ const g=document.getElementById('ezGoal'), hd=document.querySelector('#kfsRoot .kfs-head'); return g&&hd?{gt:g.getBoundingClientRect().top, hb:hd.getBoundingClientRect().bottom}:null; });
ok(pos && pos.gt>=pos.hb+40, w+' 지금 할 일 줄이 상단바에서 40px 이상 아래 '+JSON.stringify(pos));
if(w===1280) await p.screenshot({path:'v225_goal.png'});
await p.click('#ezGoal'); await p.waitForTimeout(150);
ok(!(await p.$('#ezGoal')), w+' 누르면 닫힘');
// 조사 한 번 해서 숫자만 바뀌어도 다시 안 뜸
await p.evaluate(()=>{ K.found=K.found||{}; renderArena(); }); await p.waitForTimeout(150);
ok(!(await p.$('#ezGoal')), w+' 같은 단계에서는 다시 안 뜸');
await p.evaluate(()=>{ K.step='move'; K.loan={none:true}; K.scene=null; K.occ.spInit=true; K.kfDisp=true; renderArena(); }); await p.waitForTimeout(250);
ok(!!(await p.$('#ezGoal')), w+' 다음 단계로 가면 다시 뜸');
// 선택지 글씨
const st=await p.evaluate(()=>{ const d=document.createElement('button'); d.className='tt-opt'; d.textContent='x'; document.body.appendChild(d); const c=getComputedStyle(d); const r={c:c.color,w:c.fontWeight,s:c.fontSize}; d.remove(); return r; });
ok(st.c==='rgb(0, 0, 0)' && +st.w>=700 && parseFloat(st.s)>=16, w+' 대화 선택지 검정·굵게·16px '+JSON.stringify(st));
await p.close(); }
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.join('|'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
