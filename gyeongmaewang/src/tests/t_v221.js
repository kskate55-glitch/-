const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{ window.EZ_TUT_FORCE=true; });
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const start=async(ch,cases,id)=>{ await p.evaluate(([ch,cases,id])=>{ localStorage.clear(); kcRec().fr={full:true}; lfNew(ch); kcRec().cases=cases; kcRec().ez=false; page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false; K_PROP_NEXT=id; kStart(9); K.intro=false; K.loan={none:true}; renderArena(); },[ch,cases,id]); await p.waitForTimeout(600); };
const coach=async()=>await p.evaluate(()=>{ const d=document.getElementById('ezCoach'); return d? d.innerText.replace(/\s+/g,' '):null; });
const okc=async()=>{ await p.click('[data-ezcoach]'); await p.waitForTimeout(200); };
// 서윤 첫 물건 → 튜토리얼
await start('seoyun',0,'f11');
let c=await coach(); ok(!!c && /조사/.test(c) && /모르는 비용/.test(c), w+' 서윤 첫 물건: 🎓 선배의 한마디(조사) — '+(c||'').slice(0,50));
if(w===390) await p.screenshot({path:'v221_coach.png'});
await okc(); ok(await p.evaluate(()=>!document.getElementById('ezCoach') && !!document.getElementById('ezGoal') && document.querySelectorAll('.ez-rec').length>0), w+' 알겠어요 → 초보 모드 자동(한 줄 안내·⭐) — 설정은 꺼져 있어도');
await p.evaluate(()=>renderArena()); await p.waitForTimeout(300); ok(!(await coach()), w+' 같은 단계에선 다시 안 뜸');
// ⭐ 따라가며 단계마다 한 번씩
const seen=new Set(['research']); let n=0;
while(n++<200){
  const cc=await coach(); if(cc){ const k=await p.evaluate(()=>Object.keys(K.tutSeen).slice(-1)[0]); seen.add(k); await okc(); continue; }
  const st=await p.evaluate(()=>K.step); if(st==='result' || st==='lost') { await p.waitForTimeout(300); const c2=await coach(); if(c2){ seen.add(st); await okc(); } break; }
  if(await p.$('#mtTale')){ await p.evaluate(()=>mtClose()); continue; }
  if(await p.$('#hxRoot, .hx-talk')){ await p.evaluate(()=>{ document.querySelectorAll('.hx-talk').forEach(x=>x.remove()); if(typeof hxClose==='function') hxClose(); }); continue; }
  if(await p.evaluate(()=>K.revealing)){ await p.evaluate(()=>{ K.revealing=false; renderArena(); }); await p.waitForTimeout(250); continue; }
  const did=await p.evaluate(()=>{ const inp=document.querySelector('#kBid.ez-rec'); if(inp && !K.sealed){ inp.value=String(Math.round(KP.minBid*1.15/10)*10); inp.dispatchEvent(new Event('input',{bubbles:true})); }
    const r=[...document.querySelectorAll('.ez-rec')].find(x=>x.tagName!=='INPUT' && !x.disabled); if(!r){ const f=document.querySelector('[data-lfnext],[data-kgo]'); if(f){ f.click(); return 'f'; } return null; } const d=r.closest('details'); if(d) d.open=true; r.click(); return 'r'; });
  if(!did) break; await p.waitForTimeout(250);
}
ok(['bid','won','move','defect','list','sell','result'].every(k=>seen.has(k)) || seen.has('lost'), w+' 단계마다 선배 설명: '+[...seen].join('→'));
// 두 번째 물건부터는 튜토리얼 없음
await start('seoyun',1,'f12'); ok(!(await coach()) && !(await p.$('#ezGoal')), w+' 서윤 두 번째 물건: 튜토리얼 없음(초보 모드 꺼져 있으면 표시 없음)');
// 다른 캐릭터 첫 물건도 없음
await start('dohyun',0,'f11'); ok(!(await coach()), w+' 다른 캐릭터 첫 물건엔 튜토리얼 없음');
// 그만 보기
await start('seoyun',0,'f11'); await okc(); await p.evaluate(()=>document.querySelector('[data-kfsmenu]').click()); await p.waitForTimeout(150);
ok(/튜토리얼 그만 보기/.test(await p.evaluate(()=>document.querySelector('[data-eztoggle]').textContent)), w+' ☰ "튜토리얼 그만 보기"');
await p.evaluate(()=>document.querySelector('[data-eztoggle]').click()); await p.waitForTimeout(250); ok(await p.evaluate(()=>!document.getElementById('ezGoal') && K.tut===false), w+' 그만 보기 → 표시 사라짐');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
