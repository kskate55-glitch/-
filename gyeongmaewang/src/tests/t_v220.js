const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const start=async(id,extra='')=>{ await p.evaluate(([id,extra])=>{ localStorage.clear(); kcRec().fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false; K_PROP_NEXT=id; kStart(9); K.intro=false; eval(extra); renderArena(); },[id,extra]); await p.waitForTimeout(500); };
// 처음 묻기
await start('f22'); ok(!(await p.$('#ezGoal')), w+' 기본은 꺼짐(묻기 전) — 화면 그대로');
await p.evaluate(()=>ezAsk()); await p.waitForTimeout(150); ok(/경매, 해 본 적/.test(await p.evaluate(()=>document.getElementById('ezAsk').innerText)), w+' "경매, 해 본 적 있어요?"');
await p.click('[data-ezpick="1"]'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>kcRec().ez===true && !!document.getElementById('ezGoal')), w+' 🐣 처음이에요 → 초보 모드 켜짐');
// 조사 단계
const g1=await p.evaluate(()=>document.getElementById('ezGoal').innerText); ok(/조사 단계/.test(g1) && /찾음 0\//.test(g1), w+' 🧭 지금 할 일: '+g1.replace(/\s+/g,' ').slice(0,60));
ok(await p.evaluate(()=>document.querySelectorAll('[data-kres].ez-rec').length>=1 && document.querySelectorAll('.ez-star').length>=1), w+' 조사 버튼에 ⭐ 추천');
ok(await p.evaluate(()=>{ const r=document.querySelector('[data-kres].ez-rec'); const d=r&&r.closest('details'); return !d || d.open || !!d.querySelector(':scope > summary .ez-grp-star'); }), w+' 접힌 묶음이면 묶음 제목에도 ⭐');
if(w===1280) await p.screenshot({path:'v220_brief.png'});
// 용어 풀이
const hasTerm=await p.evaluate(()=>!!document.querySelector('.ez-term'));
ok(hasTerm, w+' 어려운 단어에 점선 밑줄');
if(hasTerm){ const t=await p.evaluate(()=>{ const e=[...document.querySelectorAll('.ez-term')].find(x=>x.getClientRects().length); if(!e) return null; e.scrollIntoView({block:'center'}); return e.dataset.ez; });
  if(t){ await p.click(`.ez-term[data-ez="${t}"] >> nth=0`).catch(()=>{}); await p.waitForTimeout(150); ok(await p.evaluate(t=>{ const d=document.querySelector('.ez-tip'); return !!d && d.innerText.includes(t); },t), w+` "${t}" 누르면 📖 풀이`); if(w===390) await p.screenshot({path:'v220_term.png'}); } }
// 명도·하자·호가 추천
await p.evaluate(()=>{ K.step='move'; K.loan={none:true}; K.scene=null; K.occ.spInit=true; K.occ.slam=false; K.kfDisp=true; renderArena(); }); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!!document.querySelector('[data-kmove="listen"].ez-rec') && /마음을 여는/.test(document.getElementById('ezGoal').innerText)), w+' 명도: "사정부터 듣는다" ⭐ + 마음을 여는 단계');
if(w===390) await p.screenshot({path:'v220_move.png'});
await p.evaluate(()=>{ K.occ.coop=60; K.occ.heard=1; renderArena(); }); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!!document.querySelector('[data-kmove="date"].ez-rec')), w+' 협조도 오르면 "이사 날짜" ⭐');
await p.evaluate(()=>{ kMove('date'); renderArena(); }); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!K.offering || !!document.querySelector('[data-koffer].ez-rec')), w+' 이사비 제안: 원하는 금액 안팎 ⭐');
await p.evaluate(()=>{ K.step='defect'; kDefect(); renderArena(); }); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!!document.querySelector('[data-krep="part"].ez-rec')), w+' 수리: 전략적 일부 ⭐');
// 끄기
await p.evaluate(()=>{ document.querySelector('[data-kfsmenu]').click(); }); await p.waitForTimeout(150);
ok(/초보 모드 끄기/.test(await p.evaluate(()=>document.querySelector('[data-eztoggle]').textContent)), w+' ☰ 메뉴에 "초보 모드 끄기"');
await p.click('[data-eztoggle]'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!document.getElementById('ezGoal') && !document.querySelector('.ez-rec') && kcRec().ez===false), w+' 끄면 표시 전부 사라짐');
// ⭐만 따라 눌러서 한 사건 끝까지
if(w===1280){ for(const id of (process.env.EZIDS||'f11,f22,f34,f53').split(',')){
  await start(id, "kcRec().ez=true; K.loan={none:true};");
  let n=0, trail=[];
  while(n++<260){
    const st=await p.evaluate(()=>({step:K.step, sealed:!!K.sealed, rev:!!K.revealing, intro:!!K.intro})); if(st.step==='result') break;
    if(await p.$('#mtTale')){ await p.evaluate(()=>{ if(typeof mtClose==='function') mtClose(); }); continue; }
    if(await p.$('#hxRoot, #hxTalk, .hx-talk')){ await p.evaluate(()=>{ document.querySelectorAll('.hx-talk').forEach(x=>x.remove()); if(typeof hxClose==='function') hxClose(); }); continue; }
    if(st.rev){ await p.evaluate(()=>{ K.revealing=false; renderArena(); }); continue; }
    const did=await p.evaluate(()=>{ const inp=document.querySelector('#kBid.ez-rec'); if(inp && !K.sealed){ inp.value=String(Math.round(KP.minBid*1.12/10)*10); inp.dispatchEvent(new Event('input',{bubbles:true})); }
      const r=[...document.querySelectorAll('.ez-rec')].find(x=>x.tagName!=='INPUT' && !x.disabled); if(!r) return null; const d=r.closest('details'); if(d) d.open=true; r.click(); return (Object.keys(r.dataset)[0]||r.id)+'='+(Object.values(r.dataset)[0]||''); });
    if(!did){ const f=await p.evaluate(()=>{ const b=document.querySelector('[data-lfnext],[data-kgo],[data-knext]'); if(b){ b.click(); return 'fallback:'+Object.keys(b.dataset)[0]; } if(K.step==='lost'){ return 'lost'; } return null; }); trail.push(f||'stuck@'+st.step); if(!f || f==='lost') break; }
    else trail.push(did);
    await p.waitForTimeout(120);
  }
  const fin=await p.evaluate(()=>({step:K.step, profit:K.sale&&K.sale.price? K.sale.price-(K.cost.bid+K.cost.acq+K.cost.move+K.cost.repair+K.cost.hold+K.cost.fee+K.cost.broker+K.cost.legal):null}));
  ok(fin.step==='result' || fin.step==='lost', `${id} ⭐ 추천만 따라 눌러서 끝까지: ${fin.step}${fin.profit!=null?` (손익 ${fin.profit}만원)`:''} · ${trail.length}번 누름`);
  if(fin.step!=='result' && fin.step!=='lost') console.log(trail.slice(-12).join(' | '));
} }
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
