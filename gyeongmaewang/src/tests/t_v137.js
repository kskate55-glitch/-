const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
for(const id of ['f11','f21','f22','f23','f31','f32','f41','f42','f51','f54','f61','f63','f53','f64']){
  const r=await p.evaluate(async(id)=>{ localStorage.clear(); const c=kcRec(); delete c.life; c.fr={full:true}; c.cash=900000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(5); K.intro=false;
    const u={}; for(const e of ['normal','angry','worried']) u[e]=artNpc(KP.occ.pid,e);
    const own=['normal','angry','worried'].every(e=>u[e]===artUrl('npc_occ_'+id+'_'+e));
    const loads=await Promise.all(Object.values(u).map(s=>new Promise(r=>{ const i=new Image(); i.onload=()=>r(i.naturalWidth>100); i.onerror=()=>r(false); i.src=s; })));
    const distinct=new Set(Object.values(u)).size;
    return {own, loads:loads.every(Boolean), distinct, name:KP.occ.name}; },id);
  ok(r.own && r.loads && r.distinct===3, id+' '+r.name+' — 전용 그림 3표정이 무대에 뜸');
}
// 자유 플레이 같은 pid는 원래 그림
const r=await p.evaluate(()=>{ K=null; return [artNpc('p_madam','normal'), artNpc('p_greedy','normal')].map(u=>Object.values(AS_OCC_ART).some(id=>u&&u.includes(id))); });
ok(!r[0] && !r[1], '물건 밖(자유 플레이)은 원래 그림 그대로');
// 오프닝 전용 그림 — 33칸 전부
const o=await p.evaluate(async()=>{ const ks=ART_SLOTS_V135.filter(x=>x.id.startsWith('op_')).map(x=>x.id); const us=ks.map(k=>artUrl(k));
  const loads=await Promise.all(us.map(s=>new Promise(r=>{ if(!s) return r(false); const i=new Image(); i.onload=()=>r(i.naturalWidth>1000); i.onerror=()=>r(false); i.src=s; })));
  return {n:ks.length, ok:loads.filter(Boolean).length, distinct:new Set(us).size, miss:ks.filter((k,i)=>!loads[i])}; });
ok(o.n===33 && o.ok===33 && o.distinct===33, '오프닝 33칸 전부 전용 그림이 로드됨 (빠진 칸: '+o.miss.join(',')+')');
// 물건 전용 배경 — f11 첫 세트
const g=await p.evaluate(async()=>{ localStorage.clear(); const c=kcRec(); delete c.life; c.fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f11'; KC_INTRO=false; kStart(5); K.intro=false;
  const pick=['bg_villa_day','bg_front_door','bg_room_empty'].map(s=>vnBgPick(s));
  const loads=await Promise.all(pick.map(k=>new Promise(r=>{ const u=artUrl(k); if(!u) return r(false); const i=new Image(); i.onload=()=>r(i.naturalWidth>1000); i.onerror=()=>r(false); i.src=u; })));
  K_PROP_NEXT='f23'; kStart(5); K.intro=false; const other=vnBgPick('bg_front_door');
  return {pick, loads, other}; });
ok(g.pick.join()==='bg_case_f11_ext,bg_case_f11_door,bg_case_f11_in' && g.loads.every(Boolean), 'f11 조사·명도·빈집 장면이 전용 배경 3장으로 바뀜');
ok(g.other==='bg_front_door', '배경이 아직 없는 물건(f23)은 원래 공용 배경 그대로');
const g2=await p.evaluate(()=>{ K_PROP_NEXT='f12'; kStart(5); K.intro=false; return ['bg_villa_day','bg_front_door','bg_room_empty'].map(s=>vnBgPick(s)); });
ok(g2.join()==='bg_case_f12_ext,bg_case_f12_door,bg_case_f12_in', 'f12 외관·복도·빈 원룸 전용 배경 3장');
const g3=await p.evaluate(()=>{ K_PROP_NEXT='f13'; kStart(5); K.intro=false; return ['bg_villa_day','bg_front_door','bg_room_empty'].map(s=>vnBgPick(s)); });
ok(g3.join()==='bg_case_f13_ext,bg_case_f13_door,bg_case_f13_in', 'f13 전용 배경 3장');
const g4=await p.evaluate(()=>{ K_PROP_NEXT='f21'; kStart(5); K.intro=false; return ['bg_villa_day','bg_front_door','bg_room_empty'].map(s=>vnBgPick(s)); });
ok(g4.join()==='bg_case_f21_ext,bg_case_f21_door,bg_room_empty', 'f21 외관·현관 전용, 거실 칸은 아직 공용 배경');
const g5=await p.evaluate(()=>{ K_PROP_NEXT='f22'; kStart(5); K.intro=false; return ['bg_villa_day','bg_front_door','bg_room_empty'].map(s=>vnBgPick(s)); });
ok(g5.join()==='bg_case_f22_ext,bg_front_door,bg_room_empty', 'f22 외관만 전용, 나머지는 공용 배경');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음');
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
