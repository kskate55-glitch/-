const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ if(!c){ console.log('❌ '+m); errs.push(m);} };
const W=process.argv[2]==='m'?[390,844]:[1280,800];
const p=await b.newPage({viewport:{width:W[0],height:W[1]}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const ids=await p.evaluate(()=>Object.keys(K_PROPS));
const scan=async(tag)=>{ const r=await p.evaluate(()=>{ const t=document.body.innerText; const m=t.match(/undefined|NaN|\[object|null원|Infinity/); return {bad:m?t.slice(Math.max(0,m.index-40),m.index+30):null, sx:document.documentElement.scrollWidth>innerWidth+1}; }); ok(!r.bad, tag+' 화면에 이상한 글자: '+r.bad); ok(!r.sx, tag+' 가로 스크롤'); };
const click=async(sel)=>p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return false; e.click(); return true; },sel);
let played=0;
for(const id of ids){
  await p.evaluate((id)=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; kcRec().fr={full:true}; kcRec().cash=500000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(5000+id.length*7+id.charCodeAt(id.length-1)); K.intro=false; K.timeLeft=9999; renderArena(); },id);
  await p.waitForTimeout(500); await scan(id+' 조사 전');
  // 조사 — 실제 버튼 클릭
  const acts=await p.evaluate(()=>(KP.actions||KP.research||[]).map(a=>a.id));
  for(const a of acts){ await click(`[data-kres="${a}"]`); }
  await p.waitForTimeout(300); await scan(id+' 조사 후');
  // 사건파일·조사노트 열기
  await click('[data-stg="file"]'); await p.waitForTimeout(250); await scan(id+' 사건파일'); await click('[data-stg="file"]');
  await click('[data-nxnote]'); await p.waitForTimeout(250); await scan(id+' 조사노트'); await click('[data-nxnote]');
  // 입찰 — 엔진으로(봉투 연출 건너뜀), 이길 때까지
  const won=await p.evaluate(()=>{ let t=0,b=Math.round(KP.minBid*1.05); while(t++<12){ kBid(b); K.revealing=false; K.sealed=false; if(K.step==='won') return true; K.step='brief'; b=Math.round(b*1.06); } return false; });
  ok(won, id+' 낙찰 불가'); if(!won) continue;
  await p.evaluate(()=>renderArena()); await p.waitForTimeout(700);
  // 대출 오버레이 — 실제 버튼
  if(await p.evaluate(()=>!!document.getElementById('lnRoot'))){
    await click('[data-lnask="no"]'); await p.waitForTimeout(200);
    if(await p.evaluate(()=>!!document.querySelector('[data-lncard]'))){ await click('[data-lncard]'); await p.waitForTimeout(400); await scan(id+' 대출 카톡'); await click('[data-lntake]'); await p.waitForTimeout(200); await click('[data-lnclose]'); }
  }
  if(!(await p.evaluate(()=>!!K.loan))) await p.evaluate(()=>{ K.loan={none:true}; });
  await scan(id+' 낙찰');
  await click('[data-kgo="move"]'); await p.waitForTimeout(300); await scan(id+' 명도 시작');
  if(id==='k2'){   // CASE 002는 갈림길·자체 버튼으로 진행 — 도망·포기 말고 앞으로 가는 버튼만 눌러 끝까지
    let q=0; while(q++<120){ const step=await p.evaluate(()=>K.step); if(step==='result') break;
      const did=await p.evaluate(()=>{ const bs=[...document.querySelectorAll('[data-k2],[data-krep],[data-klist],[data-ksale],[data-koffer],[data-k2off]')].filter(b=>!b.disabled && !/exit|forfeit/.test(b.dataset.k2||'')); const pref=bs.find(b=>/cross:go|move:paper|move:wait|accept/.test((b.dataset.k2||'')+(b.dataset.ksale||''))) || bs[0]; if(pref){ pref.click(); return (pref.dataset.k2||pref.dataset.ksale||pref.dataset.krep||pref.dataset.klist||'?'); } return null; });
      if(!did) break; await p.waitForTimeout(60); if(q%8===0) await scan(id+' 진행 중 '+step);
    }
    const fin=await p.evaluate(()=>K.step); ok(fin==='result', id+' CASE 002 버튼으로 결과까지 못 감: '+fin); if(fin==='result'){ await scan(id+' 결과'); played++; } continue;
  }
  // 명도 — 실제 버튼 클릭
  let g=0; while(g++<90){
    const st=await p.evaluate(()=>({step:K.step, flip:!!K.pendingFlip, off:!!K.offering, agreed:!!(K.occ&&K.occ.agreed), paper:!!(K.occ&&K.occ.paper)})); if(st.step!=='move') break;
    if(st.flip){ await click('[data-kflip="0"]'); continue; }
    if(st.off){ const need=await p.evaluate(()=>K.askNeed); const has=await p.evaluate(n=>{ const bs=[...document.querySelectorAll('[data-koffer]')].map(b=>+b.dataset.koffer); const pick=bs.find(v=>v>=n) ?? bs[bs.length-1]; const e=document.querySelector(`[data-koffer="${pick}"]`); if(e){ e.click(); return true;} return false; },need); if(!has) await p.evaluate(()=>kOffer(K.askNeed)); continue; }
    if(st.agreed){ if(!st.paper) await click('[data-kmove="paper"]'); else { if(!(await click('[data-kwait]'))) await p.evaluate(()=>kTick(1)); } continue; }
    if(await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-kmove^="mb"]')].find(x=>x.dataset.kmove!=='mb_bridge'); if(b){ b.click(); return true; } return false; })) continue;
    const seq=['listen','daughter','center','listen','date','order']; const m=seq[g%seq.length];
    if(!(await click(`[data-kmove="${m}"]`))) await click('[data-kmove="date"]');
    if(g%6===0) await scan(id+' 명도 중');
  }
  const st=await p.evaluate(()=>K.step); ok(st==='defect', id+' 명도가 안 끝남: '+st); if(st!=='defect') continue;
  await p.waitForTimeout(300); await scan(id+' 하자');
  await click('[data-krep="part"]'); await p.waitForTimeout(300); await scan(id+' 호가');
  await click('[data-kftalk="broker"]'); await p.waitForTimeout(150);
  await p.evaluate(()=>{ const bs=[...document.querySelectorAll('[data-klist]')]; (bs[2]||bs[0]).click(); }); await p.waitForTimeout(300); await scan(id+' 매도');
  let s=0; while(s++<40){ const step=await p.evaluate(()=>K.step); if(step!=='sell') break;
    const of=await p.evaluate(()=>!!(K.sale&&K.sale.offer));
    if(of){ await click('[data-kftalk="buyer"]'); await click(s%3===0?'[data-ksale="counter"]':'[data-ksale="accept"]'); } else await click(s>5?'[data-ksale="lower"]':'[data-ksale="wait"]');
    await p.waitForTimeout(80);
  }
  const fin=await p.evaluate(()=>K.step); ok(fin==='result', id+' 결과까지 못 감: '+fin); if(fin!=='result') continue;
  await p.waitForTimeout(400); await scan(id+' 결과');
  const f=await p.evaluate(()=>[Math.round(K.final.profit), K.day]); ok(isFinite(f[0]) && f[1]>0, id+' 결과 숫자 이상 '+f);
  played++;
}
console.log(`${W[0]}px: ${played}/${ids.length}판 끝까지`);
console.log(errs.length?'FAIL '+errs.length+'\n'+[...new Set(errs)].slice(0,25).join('\n'):'ALL OK'); await b.close(); })();
