const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const start=async(id,step,extra='')=>{ await p.evaluate(([id,step,extra])=>{ page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false; K_PROP_NEXT=id; kStart(9); K.intro=false; K.step=step; K.loan={none:true}; K.scene=null; K.occ.spInit=true; K.occ.slam=false; eval(extra); renderArena(); },[id,step,extra]); await p.waitForTimeout(400); };
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; delete kRec().hx; });
// 기록 없는 옛 저장 → 기본값 · 메뉴에 도감 없음
await start('f22','move');
ok(await p.evaluate(()=>{ const H=hxRec(); return Object.keys(H.g).length===6 && H.g.omok.plays===0; }), w+' 옛 저장에도 기본값 자동 생성');
await p.click('[data-kfsmenu]'); await p.waitForTimeout(150);
ok(!(await p.$('[data-hxdex]')), w+' 첫 발견 전엔 도감 메뉴 없음'); await p.click('[data-kfsmenu]');
// 사건별 무장 분포
const dist=await p.evaluate(()=>{ const c={}; let max=0, n=0; for(const id of Object.keys(K_PROPS)){ for(const s of [1,2,3,4,5,6,7,8]){ K_PROP_NEXT=id; kStart(s); if(!KP.gen) continue; n++; const a=Object.keys(K.hx.arm); max=Math.max(max,a.length); a.forEach(k=>c[k]=(c[k]||0)+1); } } return {c,max,n}; });
ok(dist.max<=2, w+` 한 사건에 숨은 놀이 최대 2개 (표본 ${dist.n}판: ${JSON.stringify(dist.c)})`);
// ① 오목
await start('f22','move',"K.occ.turns=1; K.hx.arm={omok:true};");
ok(!!(await p.$('[data-hxgo="omok"]')), w+' 명도 중 "먼지 쌓인 바둑판" 숨은 입구');
await p.click('[data-hxgo="omok"]'); await p.waitForTimeout(150); await p.click('[data-hxyes]'); await p.waitForTimeout(150); await p.click('[data-hxyes]');
await p.waitForTimeout(250); ok(await p.evaluate(()=>/五目勝負/.test(document.getElementById('hxRoot').innerText)), w+' 암전 → 「五目勝負」');
await p.waitForTimeout(1300); ok((await p.$$('.hx-pt')).length===81, w+' 9×9 오목판');
if(w===1280) await p.screenshot({path:'v219_omok.png'});
// AI는 내가 바로 이길 자리를 막는다: 0,1,2,3 줄 세우기
for(const i of [0,1,2,3]){ const e=await p.$(`[data-hxpt="${i}"]:not([disabled])`); if(e){ await e.click(); await p.waitForTimeout(350);} }
await p.waitForTimeout(1300);
ok(await p.evaluate(()=>{ const t=document.getElementById('hxRoot').innerText; return !/PERFECT|GOOD/.test(t) && (/영 아니네|무승부/.test(t) || [0,1,2,3,4].some(i=>document.querySelector(`[data-hxpt="${i}"]`).classList.contains('w'))); }), w+' 오목 AI: 내 한 줄 완성을 막거나 먼저 이긴다');
if(await p.evaluate(()=>/영 아니네|무승부/.test(document.getElementById('hxRoot').innerText))){ ok(await p.evaluate(()=>hxRec().g.omok.plays===1 && !hxRec().g.omok.win), w+' 오목 패배 기록(불이익 없음)'); await p.evaluate(()=>{ hxRec().g.omok.plays=0; HX.after=null; }); await p.click('[data-hxok]'); await p.evaluate(()=>{ K.hx.done={}; hxOmok(); }); await p.waitForTimeout(150); await p.click('[data-hxyes]'); await p.waitForTimeout(150); await p.click('[data-hxyes]'); await p.waitForTimeout(1500); }
await p.evaluate(()=>hxOmokWin()); await p.waitForTimeout(200);
ok(await p.evaluate(()=>/PERFECT/.test(document.getElementById('hxRoot').innerText) && /……졌네/.test(document.getElementById('hxRoot').innerText)), w+' PERFECT + "……졌네."');
const need0=await p.evaluate(()=>kfOccNeed()); await p.click('[data-hxok]'); await p.waitForTimeout(200);
const om=await p.evaluate(()=>({ag:K.occ.agreed, day:K.day, paper:K.occ.paper, ach:!!hxRec().ach.omok, rec:hxRec().g.omok}));
ok(om.ag && om.ag.day-om.day===3 && om.ag.amt<need0*0.5 && om.paper, w+` 특별 합의: 3일 뒤·이사비 ${om.ag&&om.ag.amt}(원래 ${need0})·합의서`);
ok(om.ach && om.rec.found && om.rec.perfect && om.rec.plays===1, w+' 업적 「오목으로 시작된 합의」·도감 기록');
await p.click('[data-kfsmenu]'); await p.waitForTimeout(150); ok(/숨겨진 놀이 1\/6/.test(await p.evaluate(()=>(document.querySelector('[data-hxdex]')||{}).textContent||'')), w+' 발견 후 메뉴에 "숨겨진 놀이 1/6"');
await p.click('[data-hxdex]'); await p.waitForTimeout(150);
const dex=await p.evaluate(()=>document.getElementById('hxDex').innerText); ok(/五目勝負/.test(dex) && (dex.match(/\? \? \?/g)||[]).length===5, w+' 도감: 찾은 것만 이름, 나머지 ? ? ?');
if(w===390) await p.screenshot({path:'v219_dex.png'}); await p.click('[data-hxdexclose]');
// ② 승부차기
await start('f22','move',"K.occ.turns=1; K.hx.arm={pk:true};");
await p.click('[data-hxgo="pk"]'); await p.waitForTimeout(150); await p.click('[data-hxyes]'); await p.waitForTimeout(1500);
for(let i=0;i<5;i++){ await p.click(`[data-hxz="${i%6}"]`); await p.waitForTimeout(850); }
ok(await p.evaluate(()=>/GOOD|PERFECT|…/.test(document.getElementById('hxRoot').innerText) && hxRec().g.pk.plays===1), w+' 승부차기 5번 → 결과');
if(w===1280) await p.screenshot({path:'v219_pk.png'});
await p.click('[data-hxok]');
// ③ 이삿짐 테트리스
await start('f22','move',"K.occ.turns=1; K.hx.arm={truck:true}; K.occ.agreed={amt:120,day:K.day}; K.occ.paper=true;");
await p.evaluate(()=>{ kTick(1); renderArena(); }); await p.waitForTimeout(300);
const mv0=await p.evaluate(()=>({s:K.step,m:K.cost.move}));
ok(mv0.s==='defect' && !!(await p.$('[data-hxgo="truck"]')), w+` 이삿날 트럭 앞 숨은 입구 (이사비 ${mv0.m} 지급됨)`);
await p.click('[data-hxgo="truck"]'); await p.waitForTimeout(150); await p.click('[data-hxyes]'); await p.waitForTimeout(1500);
const W=5, plan=[[0,0,0],[1,0,2],[2,2,0],[3,2,1],[4,3,1],[5,3,2],[6,4,2],[7,2,3],[8,3,3],[9,4,3]];
for(const [pi,x,y] of plan){ await p.click(`[data-hxp="${pi}"]`); if(pi===2){} await p.click(`[data-hxc="${y*W+x}"]`); await p.waitForTimeout(60); }
await p.waitForTimeout(700);
ok(await p.evaluate(()=>/PERFECT/.test(document.getElementById('hxRoot').innerText) && /안 받을게요/.test(document.getElementById('hxRoot').innerText)), w+' 트럭 한 번에 → PERFECT "됐어요. 안 받을게요."');
if(w===390) await p.screenshot({path:'v219_truck.png'});
await p.click('[data-hxok]'); await p.waitForTimeout(150);
ok(await p.evaluate(m=>K.cost.move===m-120 && !!hxRec().ach.truck, mv0.m), w+' 이사비 120만원 100% 돌려받음 · 업적');
// ④ 하자 탐정
await start('f22','brief',"K.hx.arm={detect:true}; K.loc='site';");
ok(await p.evaluate(()=>{ const e=document.querySelector('[data-hxgo="detect"]'); return !!e && e.getClientRects().length>0; }), w+' 현장조사 중 "벽지가 들떠 있다" 숨은 입구');
await p.click('[data-hxgo="detect"]'); await p.waitForTimeout(1500);
const spots=await p.evaluate(()=>{ const r=document.querySelector('[data-hxroom]').getBoundingClientRect(); return HX_SPOTS.map(s=>[r.left+r.width*s[1]/100, r.top+r.height*s[2]/100]); });
for(const [x,y] of spots){ await p.mouse.click(x,y); await p.waitForTimeout(80); }
await p.waitForTimeout(600);
ok(await p.evaluate(()=>/숨겨진 하자를 모두/.test(document.getElementById('hxRoot').innerText)), w+' 하자 6곳 → PERFECT');
await p.click('[data-hxok]');
ok(await p.evaluate(()=>KP.hidden.filter(h=>h.k==='defect').every(h=>K.found[h.id])), w+' 숨은 하자 정보가 입찰 전에 전부 드러남');
// ⑤ 입찰 악마 — 실패/스킵해도 금액 그대로
await start('f22','brief',"K.hx.arm={devil:true};");
const amt=await p.evaluate(()=>{ const a=Math.round(KP.minBid*1.1/10)*10; K.sealed={amt:a}; renderArena(); return a; }); await p.waitForTimeout(300);
const kb=await p.$('[data-kbid]'); ok(!!kb, w+' 입찰 봉투 제출 버튼');
if(kb){ await kb.click(); await p.waitForTimeout(1500);
  ok(await p.evaluate(()=>/500만 더 쓰자/.test(document.getElementById('hxRoot').innerText)), w+' 제출 직전 악마 "500만 더 쓰자."');
  if(w===1280) await p.screenshot({path:'v219_devil.png'});
  await p.click('[data-hxstop]'); await p.waitForTimeout(200); await p.click('[data-hxok]'); await p.waitForTimeout(700);
  const br=await p.evaluate(()=>({bid:K.bid, res:!!K.result}));
  ok(br.res && br.bid===amt, w+` 악마 뒤에도 입찰가 그대로 (${br.bid}/${amt})`);
}
// ⑥ 자판기
await start('f22','brief',""); await p.evaluate(()=>{ K.sealed={amt:Math.round(KP.minBid*1.1/10)*10}; renderArena(); }); await p.waitForTimeout(400);
const vend=await p.$('#hxVend'); ok(!!vend && await p.evaluate(()=>!document.getElementById('hxVend').innerText.trim() && getComputedStyle(document.getElementById('hxVend')).cursor==='default'), w+' 법원에 자판기 — 글자·표시·포인터 없음');
if(vend){ await vend.click(); await p.waitForTimeout(1500); await p.click('[data-hxcan="율무차"]'); await p.waitForTimeout(1300);
  ok(await p.evaluate(()=>/따뜻하다|그냥 캔|두 개/.test(document.getElementById('hxRoot').innerText)), w+' 율무차 → "따뜻하다."'); await p.click('[data-hxok]'); }
// 잭팟 → 효과는 안 알리고, 매도 시작 때 대박
const vj=await p.evaluate(()=>{ K.vendingLuck=true; K.hxVendEvt=null; K.step='list'; K.repair=Object.assign({},K_REPAIR.find(x=>x.id==='min')); kList(KP.list[0]); return {of:K.sale.offer, ev:K.hxVendEvt, note:K.sale.note}; });
ok(vj.ev && vj.of && vj.of.buyer.cancel===0, w+` 자판기 행운 → 매도 시작 대박 이벤트 ${vj.ev} (${vj.of&&vj.of.buyer.t})`);
await p.waitForTimeout(2900); ok(await p.evaluate(()=>!!hxRec().ach.vend), w+' 이벤트가 터진 뒤에야 「두 개가 나오는 날」');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
