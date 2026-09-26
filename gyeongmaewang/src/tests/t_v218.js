const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const boot=()=>p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false; });
await boot();
// ① 흔들리는 출처
const scan=await p.evaluate(()=>{ const out=[]; for(const pid of Object.keys(K_PROPS)){ K_PROP_NEXT=pid; kStart(9); if(!KP.gen) continue; out.push({id:pid, stars:KP.stars||1, n:Object.keys(K.spFlaky||{}).length, modes:Object.values(K.spFlaky||{}).map(x=>x.mode)}); } return out; });
const f1=scan.filter(x=>x.stars===1), fl=scan.filter(x=>x.n>0);
ok(f1.every(x=>x.n===0), w+` ★1 사건은 안 흔든다 (${f1.length}건)`);
ok(fl.length>=scan.length*0.5, w+` ★2+ 사건 대부분에 헛방 출처 (${fl.length}/${scan.length})`);
ok(fl.some(x=>x.modes.includes('blank')) && fl.some(x=>x.modes.includes('stale')), w+' 빈손·옛날얘기 둘 다 나온다');
const det=await p.evaluate(id=>{ K_PROP_NEXT=id; kStart(9); const a=JSON.stringify(K.spFlaky); K_PROP_NEXT=id; kStart(9); return a===JSON.stringify(K.spFlaky); }, fl[0].id);
ok(det, w+' 같은 시드면 같은 출처가 헛방(재현성)');
const r=await p.evaluate(id=>{ K_PROP_NEXT=id; kStart(9); K.intro=false; K.step='research'; renderArena();
  const fid=Object.keys(K.spFlaky)[0], a=KP.actions.find(x=>x.id===fid), rev=[].concat(...a.out.filter(o=>o.reveal).map(o=>[].concat(o.reveal)));
  const seed=K.seed; // 난수 순서 비교용: 같은 시드로 헛방 끈 채 같은 조사
  const f0=Object.keys(K.found).length; kResearch(fid); const nxA=K.r();
  const got=rev.filter(h=>K.found[h]).length, say=K.says[K.says.length-1], log=K.log.slice(-2).join(' | ');
  const x=KP.actions.find(q=>q.id===fid+'_spx'); const xcan=krCan(x); kResearch(x.id); const got2=rev.filter(h=>K.found[h]).length;
  K_PROP_NEXT=id; kStart(9); K.intro=false; K.step='research'; K.spFlaky={}; kResearch(fid); const nxB=K.r();
  return {fid, got, got2, rev:rev.length, say, log, xcan, same:nxA===nxB, mode:null};
}, fl[0].id);
ok(r.got===0, w+` 헛방이면 숨은 정보를 못 얻는다 (${r.fid})`);
ok(/잘 모르|안 사요|휴가|호호|기준 시점|전 주인|3년 전|2년|작년/.test(r.say.t), w+' 헛방 대사: '+r.say.who+' “'+r.say.t+'”');
ok(/헛방|언제 적/.test(r.log), w+' 조사 노트에 왜 헛방인지 적힘');
ok(r.xcan && r.got2===r.rev, w+` '다른 사람에게 다시 확인'으로 정보 획득 (${r.got2}/${r.rev})`);
ok(r.same, w+' 게임 난수(K.r) 순서는 그대로');
if(w===1280){ await p.evaluate(id=>{ K_PROP_NEXT=id; kStart(9); K.intro=false; K.step='research'; renderArena(); },fl[0].id); await p.waitForTimeout(400); await p.screenshot({path:'v218_research.png'}); }
// ② 문 닫는 점유자
const s=await p.evaluate(id=>{ K_PROP_NEXT=id; kStart(9); K.intro=false; K.step='move'; K.loan={none:true}; K.scene=null; K.kfDisp=true; K.occ.spInit=true; K.occ.slam=true; renderArena();
  const c0=K.occ.coop, l0=K.log.length; kMove('listen'); const c1=K.occ.coop, say=K.log.slice(l0).join(' ')+document.body.innerText.slice(0,0), heard=K.occ.heard||0, pend=typeof MT_PENDING!=='undefined'?MT_PENDING:null;
  const bridge0=K_MOVES.find(m=>m.id==='sp_bridge').need(K.occ);
  kMove('order'); const call=K.occ.spCallAt; const need0=kfOccNeed();
  kfTick(8);
  const asked=!!K.occ.spAsk, bridge1=K_MOVES.find(m=>m.id==='sp_bridge').need(K.occ), mv0=K.cost.move;
  kMove('sp_bridge'); const need1=kfOccNeed();
  return {c0,c1,say,heard,pend:!!pend,bridge0,call,asked,bridge1,paid:K.cost.move-mv0,need0,need1,bridged:K.occ.spBridged, logs:K.log.slice(-6).join(' | ')};
}, scan.find(x=>x.stars>=2).id);
ok(s.c1<s.c0 && !s.pend && s.heard===0, w+` 사정 듣기 → 문 닫힘 (협조 ${s.c0}→${s.c1}, 사연 장면 없음)`);
ok(/문이 닫혔다/.test(s.say), w+' "법대로 하세요"');
ok(!s.bridge0 && s.call>0, w+' 인도명령 전엔 선지급 선택지 없음, 신청하면 전화 예약');
ok(s.asked && s.bridge1, w+' 일주일 뒤 "계약금이 없습니다" 전화 → 선지급 선택지 열림');
ok(s.bridged && s.paid>0 && s.need1<s.need0, w+` 선지급 ${s.paid}만원 → 남은 이사비 ${s.need0}→${s.need1}`);
// ③ 개찰 희비극
const cz=await p.evaluate(()=>{ K.step='lost'; K.bid=32810; K.result={win:false, gap:20, bids:[{who:'가',amt:32830},{who:'나',amt:32810,me:true},{who:'다',amt:30100}], other:{amt:32830}}; renderArena(); return !!document.querySelector('.sp-court'); });
ok(cz, w+' 20만원 차 2등 → 옆자리 아저씨 "아깝네요."');
if(w===390) await p.screenshot({path:'v218_court.png'});
await p.click('[data-sphush]'); await p.waitForTimeout(200);
ok(await p.evaluate(()=>/…네\./.test(document.querySelector('.sp-court').innerText) && !document.querySelector('[data-sphush]')), w+' [말 걸지 마세요] → "…네."');
const far=await p.evaluate(()=>{ K.spHush=false; K.result={win:false,gap:900,bids:[{who:'가',amt:33710},{who:'나',amt:32810,me:true}],other:{amt:33710}}; renderArena(); return !document.querySelector('.sp-court'); });
ok(far, w+' 크게 지면 아저씨 안 나옴');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
