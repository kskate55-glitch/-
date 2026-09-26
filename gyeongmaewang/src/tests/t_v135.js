const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
// 1) 도현 평일 조사 시간
let r=await p.evaluate(()=>{ localStorage.clear(); lfNew('dohyun'); return {wd:lfWindow(2), we:lfWindow(6)}; });
ok(r.wd[0]===1140 && r.wd[1]===210, '도현 평일: 19:00부터 210분(3시간 반) '+JSON.stringify(r.wd));
ok(r.we[1]===280, '주말은 그대로 280분');
// 2) 평일 하루로 조사 4개 이상 가능한지 — 도현 물건들
r=await p.evaluate(()=>{ const out=[]; for(const id of ['f21','f22','f23']){ const c=kcRec(); c.fr={full:true}; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; kStart(3); K.intro=false;
  const A=KP.actions.filter(a=>!['docs','trade','court'].includes(a.id)); const site=A.filter(a=>a.loc==='site').map(a=>krDur(a)[0]+krTravel(a)).sort((x,y)=>x-y); const oth=A.filter(a=>a.loc!=='site').map(a=>krDur(a)[0]).sort((x,y)=>x-y);
  const t=(site[0]||0)+oth.slice(0,3).reduce((s,v)=>s+v,0); out.push(id+':'+t); } return out; });
ok(r.every(x=>+x.split(':')[1]<=210), '평일 하루에 현장 1곳 + 조사 3개(총 4개)가 들어감 '+r.join(' '));
// 3) 그림 칸 등록
r=await p.evaluate(()=>({n:ART_SLOTS.filter(s=>/^(op_|npc_occ_|bg_case_)/.test(s.id)).length, op:ART_SLOTS.filter(s=>/^op_/.test(s.id)).length, ch:[...new Set(ART_SLOTS.filter(s=>/^op_/.test(s.id)).map(s=>s.id.split('_')[1]))].length}));
ok(r.n===141 && r.ch===6, '그림 칸 141개 등록(오프닝 '+r.op+' · 주인공 '+r.ch+'명)');
// 4) 물건 전용 배경·점유자: 올리면 바뀌고, 안 올리면 그대로
const FAKE='5961986acf90e000dd87644d50e24d72';
r=await p.evaluate((F)=>{ localStorage.clear(); const c=kcRec(); delete c.life; c.fr={full:true}; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f61'; kStart(4); K.intro=false;
  const before=vnBgPick('bg_front_door'), occ0=artNpc(KP.occ.pid,'normal');
  artRec()['bg_case_f61_door']=F; artRec()['npc_occ_f61_normal']=F;
  const after=vnBgPick('bg_front_door'), occ1=artNpc(KP.occ.pid,'angry'), stage=kStage('bg_front_door','occ','angry','테스트');
  // 다른 물건은 영향 없음
  K_PROP_NEXT='f21'; kStart(4); K.intro=false; const other=vnBgPick('bg_front_door');
  delete artRec()['bg_case_f61_door']; delete artRec()['npc_occ_f61_normal'];
  return {before, after, other, occ0, occ1, has:stage.includes(F)}; },FAKE);
ok(r.before!=='bg_case_f61_door' && r.after==='bg_case_f61_door', '물건 전용 현관 그림을 올리면 f61 명도 장면 배경이 바뀜');
ok(r.other!=='bg_case_f61_door', '다른 물건(f21)은 그대로');
ok(r.occ1 && r.occ1.includes(FAKE) && r.has, 'f61 점유자 그림(보통만 올려도 화난 표정 자리에 대신) 무대에 뜸');
ok(r.occ0 && !r.occ0.includes(FAKE), '올리기 전엔 기존 그림');
// 5) 자유 플레이에서 같은 인물(pid)은 물건 칸을 안 씀
r=await p.evaluate((F)=>{ artRec()['npc_occ_f31_normal']=F; const saveK=K; K=null; const u=artNpc('p_madam','normal'); K=saveK; delete artRec()['npc_occ_f31_normal']; return u && u.includes(F); },FAKE);
ok(!r, '물건 밖(자유 플레이)의 구혜란 씨는 원래 그림 그대로');
// 6) 오프닝 장면 전용 그림
r=await p.evaluate(async(F)=>{ artRec()['op_dohyun_1']=F; artRec()['op_dohyun_1_2']=F; window.GX_SPEED_TEST=1; gxOpStart('dohyun'); gxPrelude(99); await new Promise(r=>setTimeout(r,300)); const u1=[...document.querySelectorAll('#gxOp .gx-bgimg')].map(x=>x.style.backgroundImage).join(' ');
  GX_OP.j=1; GX_OP.i=0; gxLine(); await new Promise(r=>setTimeout(r,100)); const n=document.querySelectorAll('#gxOp .gx-bgimg').length; gxOpEnd(true); delete artRec()['op_dohyun_1']; delete artRec()['op_dohyun_1_2']; return {u1, n}; },FAKE);
ok(r.u1.includes(FAKE), '오프닝 장면 1에 전용 그림(op_dohyun_1)이 뜸');
ok(r.n>=2, '대사 중간 컷(op_dohyun_1_2)으로 그림이 한 번 더 바뀜');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
