// 안정성 ⑥: 몽키 테스트 — 무작위 클릭 + 새로고침 + 뒤로가기를 섞어 N걸음, 매 걸음 불변식 검사
const {chromium}=require('playwright');(async()=>{const STEPS=+(process.argv[2]||300), SEED=+(process.argv[3]||7);
let r=SEED; const rnd=()=>{r=(r*1103515245+12345)%2147483648; return r/2147483648;};
const b=await chromium.launch();const errs=[];const bad=[];
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message.slice(0,160))); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; save(); arenaTab='home'; renderArena(); });
const INV=()=>{ const out=[]; let S0; try{ S0=JSON.parse(localStorage.getItem('rights-study-v1')||'{}'); }catch(e){ return ['저장본 JSON 깨짐']; }
  const c=(S0.arena||{}).career||{}, pl=(S0.arena||{}).player||{};
  for(const k of ['cash','total','cases','bids','start']) if(c[k]!=null && !Number.isFinite(c[k])) out.push(`career.${k}=${c[k]}`);
  for(const k of ['xp','rep']) if(pl[k]!=null && !Number.isFinite(pl[k])) out.push(`player.${k}=${pl[k]}`);
  const L=c.life; if(L){ if(!Number.isFinite(L.sta)||L.sta<0||(L.st&&L.sta>L.st.stamina+0.001)) out.push(`체력 ${L.sta}`); if(!Number.isFinite(L.stress)||L.stress<0||L.stress>100) out.push(`스트레스 ${L.stress}`); if(!Number.isFinite(L.t)) out.push(`시각 ${L.t}`); if(typeof LF_CHARS!=='undefined' && !LF_CHARS.some(x=>x.id===L.char)) out.push('모르는 인물 '+L.char); }
  const H=c.history||[]; const ids=H.map(h=>h.mode+'|'+h.seed+'|'+h.at); if(ids.length!==new Set(ids).size) out.push('같은 판 결과가 두 번 기록됨');
  const cr=H.filter(h=>h.mode==='career'); if(c.cases!=null && cr.length<40 && c.cases!==cr.length) out.push(`처리 ${c.cases} ≠ 기록 ${cr.length}`);
  if(H.length<40 && c.total!=null && c.total!==H.filter(h=>h.mode==='career'||h.mode==='quick').reduce((s,h)=>s+h.after,0)) out.push(`누적 ${c.total} ≠ 기록 합`);
  if(c.start!=null && c.cash!=null && c.total!=null && cr.length<40 && c.cash!==c.start+c.total && !(c.spent)) {/* 현금은 생활비 등으로 달라질 수 있어 경고만 */}
  const items=((c.board||{}).items)||[]; const done=new Set(items.filter(i=>i.status==='done').map(i=>i.key)); for(const i of items) if(i.status==='playing' && done.has(i.key)) out.push('끝난 물건이 진행 중으로도 남음 '+i.key);
  if(typeof K!=='undefined' && K){ const okSteps=['brief','won','lost','move','defect','list','sell','result','cross']; if(!okSteps.includes(K.step)) out.push('알 수 없는 단계 '+K.step); if(K.step==='result' && !K.final) out.push('결과 단계인데 결산 없음'); }
  return out; };
const CLICK='button:not([disabled]), [data-atab], [role=button]';
let clicks=0, reloads=0, backs=0, stuck=0;
for(let s=0;s<STEPS;s++){
  const x=rnd();
  try{
    if(x<0.03){ await p.evaluate(u=>{ if(!K){ arenaTab='king'; KC_MODE= u<0.5?'career':'weekly'; K_PROP_NEXT= u<0.25?'k2':'k1'; KC_INTRO=false; kStart(Math.floor(u*1e6)); K.intro=false; renderArena(); } }, rnd()); }
    else if(x<0.045){ await p.evaluate(u=>{ if(!kcRec().life){ const ids=LF_CHARS.map(c=>c.id); lfNew(ids[Math.floor(u*ids.length)]); lfRec().intro=false; arenaTab='life'; renderArena(); } }, rnd()); }
    else if(x<0.08){ await p.reload(); await p.waitForTimeout(500); reloads++; }
    else if(x<0.10){ await p.goBack().catch(()=>{}); await p.waitForTimeout(300); if(!/rights-study/.test(p.url())) { await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(500); } backs++; }
    else {
      const n=await p.evaluate(([CLICK,u])=>{ if(typeof K!=='undefined'&&K&&K.revealing){K.revealing=false;renderArena();}
        const bid=document.getElementById('kBid'); if(bid&&typeof KP!=='undefined'&&KP) bid.value=String(Math.round(KP.minBid*(1.1+u*0.4)/10)*10);
        const G='[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2],[data-kstart]';
        const gm=(typeof K!=='undefined'&&K&&u<0.85)?[...document.querySelectorAll(G)].filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&q.height>0;}):[];
        if(gm.length){ const el=gm.find(e=>e.matches('[data-kbid],[data-kcseal]'))||gm[Math.floor(u*97)%gm.length]; el.scrollIntoView({block:'center'}); el.click(); return gm.length; }
        const els=[...document.querySelectorAll(CLICK)].filter(e=>{ if(e.closest('a[href^="http"]')) return false; const t=(e.innerText||'')+(e.getAttribute('aria-label')||''); if(/로그아웃|초기화|전부 지우|삭제|reset/i.test(t)) return false; const q=e.getBoundingClientRect(); return q.width>0&&q.height>0&&getComputedStyle(e).visibility!=='hidden'; });
        if(!els.length) return -1; const el=els[Math.floor(u*els.length)%els.length]; el.scrollIntoView({block:'center'}); el.click(); return els.length; },[CLICK,rnd()]);
      if(n<0){ stuck++; await p.evaluate(()=>{ arenaTab='home'; K=null; renderArena(); }); } else clicks++;
      await p.waitForTimeout(60);
    }
    await p.evaluate(()=>{ try{ if(typeof save==='function') save(); }catch(e){} });
    const v=await p.evaluate(INV); if(v.length){ bad.push(`걸음 ${s}: ${v.join(' / ')}`); if(bad.length>6) break; }
  }catch(e){ bad.push(`걸음 ${s}: 예외 ${e.message.slice(0,120)}`); if(bad.length>6) break; }
}
const summary=await p.evaluate(()=>{ const c=kcRec(); return {cases:c.cases, bids:c.bids, hist:(c.history||[]).length, life:!!c.life, tab:arenaTab}; });
console.log(`걸음 ${STEPS} · 클릭 ${clicks} · 새로고침 ${reloads} · 뒤로 ${backs} · 막힘 ${stuck}`, JSON.stringify(summary));
const uniqErr=[...new Set(errs)];
console.log(bad.length? '❌ 불변식 위반\n'+bad.join('\n') : '✅ 불변식 위반 없음');
console.log(uniqErr.length? '❌ 페이지 오류\n'+uniqErr.join('\n') : '✅ 페이지 오류 없음');
await b.close();})();
