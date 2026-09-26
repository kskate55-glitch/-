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
// 서윤 오프닝 전용 그림 3장
const o=await p.evaluate(async()=>{ const ks=['op_seoyun_1','op_seoyun_2','op_seoyun_1_2','op_seoyun_2_3','op_seoyun_2_4','op_seoyun_3','op_dohyun_1','op_dohyun_1_2','op_dohyun_2','op_dohyun_3','op_dohyun_3_2','op_dohyun_4','op_dohyun_5','op_dohyun_5_2','op_mijeong_1','op_mijeong_2','op_mijeong_2_3','op_mijeong_3','op_mijeong_4','op_jaehoon_1','op_jaehoon_1_4','op_jaehoon_2','op_jaehoon_3','op_jaehoon_4','op_eunkyung_1','op_eunkyung_1_4','op_eunkyung_2']; const us=ks.map(k=>artUrl(k));
  const loads=await Promise.all(us.map(s=>new Promise(r=>{ if(!s) return r(false); const i=new Image(); i.onload=()=>r(i.naturalWidth>1000); i.onerror=()=>r(false); i.src=s; })));
  return {all:loads.every(Boolean), distinct:new Set(us).size, other:!!artRec()['op_taesik_1'] || (ART_DEFAULT['op_taesik_1']||null)}; });
ok(o.all && o.distinct===27, '오프닝 27장(서윤 6·도현 8·미정 5·재훈 5·은경 3)이 로드됨');
ok(!o.other, '다른 주인공 오프닝 칸은 비어 있어 원래 배경 그대로');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음');
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
