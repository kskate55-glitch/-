const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const start=(id,seed)=>p.evaluate(([id,seed])=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; const c=kcRec(); delete c.life; c.fr={full:true}; c.cash=50000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; renderArena(); return !!KP; },[id,seed]);
// 1) 생성 물건: 조사한 카드마다 세 갈래 중 하나 + 출처 + 아직 모름
const ids=['f11','f12','f13','f21','f31','f34','f43','f53','f61','f64'];
let miss=[], kinds={doc:0,est:0,claim:0};
for(const id of ids){ await start(id,7);
  const r=await p.evaluate(()=>{ KP.actions.forEach(a=>{ K.timeLeft=9999; try{kResearch(a.id);}catch(e){} }); const cs=keCards().filter(c=>keHas(c)); const out=cs.map(c=>({id:c.id, e:evInfo(c)})); const h=keCaseHTML(); return {out, legend:/ev-legend/.test(h), chips:(h.match(/class="ev ev-/g)||[]).length, meta:(h.match(/아직 모름 ·/g)||[]).length}; });
  r.out.forEach(o=>{ if(!o.e||!o.e.src||!o.e.unk) miss.push(id+':'+o.id); else kinds[o.e.kind]++; });
  if(!r.legend||r.meta<1) miss.push(id+':legend/meta');
}
ok(miss.length===0, '조사로 연 카드 전부에 성격·출처·아직 모르는 점이 붙음 '+miss.join(','));
ok(kinds.doc>0&&kinds.est>0&&kinds.claim>0, '세 갈래가 다 쓰임 '+JSON.stringify(kinds));
// 2) 규칙: 하자는 추정(범위), 관리비는 당사자 주장
const rule=await p.evaluate(()=>{ const f=(k)=>{ const h=KP.hidden.find(x=>x.k===k); return h?evInfo({id:h.id, src:(KP.actions.find(a=>(a.out||[]).length)||{}).id}):null; }; return {defect:f('defect'), fee:f('fee'), price:f('price')}; });
if(rule.defect) ok(rule.defect.kind==='est' && /~/.test(rule.defect.unk), '하자 = 추정, 수리비는 범위로 ('+rule.defect.unk+')');
if(rule.fee) ok(rule.fee.kind==='claim', '관리비 = 당사자 주장');
if(rule.price) ok(rule.price.kind==='claim' && /같은 광고/.test(rule.price.unk), '시세 = 당사자 주장, 같은 광고 주의');
// 3) 안 연 카드는 '미확인'만, 예전 확정/추정 층은 없음
await start('f12',9); await p.evaluate(()=>{ renderArena(); }); await p.waitForTimeout(200);
const tiers=await p.evaluate(()=>{ if(typeof qaTagCards==='function') qaTagCards(); return [...document.querySelectorAll('.qa-tier')].map(x=>x.textContent.trim()); });
ok(tiers.every(t=>/미확인/.test(t)), '예전 ✅확정/🟡추정 표시는 사라지고 ❔미확인만 ('+[...new Set(tiers)].join('/')+')');
// 4) 입찰표 구간이 가격에 비례 (고정 마진 버그 회귀)
const z=await p.evaluate(()=>{ const r=[]; for(const id of ['f11','f63']){ localStorage.clear(); const c=kcRec(); delete c.life; c.fr={full:true}; KC_MODE='career'; K_PROP_NEXT=id; kStart(3); K.intro=false; const M=qaBidModel(); r.push({id, mid:(M.band.lo+M.band.hi)/2, safe:M.z.safe, bal:M.z.bal, agg:M.z.agg}); } return r; });
ok(z.every(x=>x.safe<x.bal && x.bal<x.agg), '안전 < 균형 < 공격 순서 유지');
const gap=z.map(x=>(x.mid-x.bal)/x.mid); ok(Math.abs(gap[0]-gap[1])<0.08, '균형 구간 여유가 물건 가격에 비례 ('+gap.map(g=>(g*100).toFixed(1)+'%').join(' vs ')+')');
// 5) k1 튜토리얼 카드
await start('k1',1); const k1=await p.evaluate(()=>{ const cs=keCards(); return cs.map(c=>evInfo(c)).filter(Boolean).length; }); ok(k1>=5, 'k1 튜토리얼 카드에도 성격 표시 ('+k1+'장)');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
