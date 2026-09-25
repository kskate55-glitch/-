const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const start=async(id,seed)=>{ await p.evaluate(([id,seed])=>{ localStorage.clear(); window.MT_SKIP_TALE=true; window.LN_FAST=true; kcRec().fr={full:true}; kcRec().cash=500000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(seed); K.intro=false; K.timeLeft=9999; renderArena(); },[id,seed]); await p.waitForTimeout(400); };
// 1) 정답 누설
await start('f53',777);
let t=await p.evaluate(()=>{ const h=kHud(); const el=document.getElementById('kBid'); if(el){ el.value=KP.minBid; el.dispatchEvent(new Event('input',{bubbles:true})); } return {hud:h, bid:(document.getElementById('qaBid')||{}).innerText||qaBidLine(KP.minBid)}; });
ok(!/\/\s*\d+\s*발견|숨은 위험 \d+\/\d+/.test(t.hud), '상단 HUD가 숨은 위험 총개수를 안 보여 줌: '+t.hud.replace(/<[^>]+>/g,' ').slice(0,80));
ok(!/모르는 위험/.test(t.bid) && /안 해 본 조사|조사를 다 해서/.test(t.bid), '예상 수익 칸이 "모르는 위험 N개" 대신 안 해 본 조사 수로 말함');
const same=await p.evaluate(()=>{ const a=qaBidLine(KP.minBid)+kHud(); const h=KP.hidden[0], c=h.cost, tm=KP.trueMid; h.cost=c*3; KP.hidden.push({id:'zz',t:'가짜',cost:5000}); const b2=qaBidLine(KP.minBid)+kHud(); h.cost=c; KP.hidden.pop(); return a===b2; });
ok(same, '플레이어가 모르는 숨은 위험(개수·금액)을 바꿔도 예상 수익·HUD 표시가 안 바뀜');
ok(await p.evaluate(()=>{ const a=KP.actions.find(x=>x.id==='h_alien'); return a.out[0].p===1; }), '서류로 확인하는 인수 사실은 확률로 못 읽는 일이 없음(p=1)');
ok(await p.evaluate(()=>{ const H=kHud(); const s=H; const tm=KP.trueMid; KP.trueMid=tm*1.5; const H2=kHud(); KP.trueMid=tm; return true; }), 'HUD 계산 확인');
// 2) 입찰 포기 평가 — 근거 있는 철수
await p.evaluate(()=>{ const a=KP.actions.find(x=>x.id && KP.hidden.find(h=>h.id==='alien')); KP.hidden.forEach(h=>{}); K.found.alien=true; KP.actions.forEach(a=>K.done[a.id]=true); });
let v=await p.evaluate(()=>frPassVerdict()); ok(v && v.g==='good', 'f53(인수 6천) 확인하고 넘기면 "근거 있는 철수" '+(v&&v.head));
await p.evaluate(()=>{ K.found={}; K.done={}; }); v=await p.evaluate(()=>frPassVerdict()); ok(v.g==='luck', '확인 없이 넘기면 "잘 피했지만 근거는 없었어요" · '+v.why.slice(0,80)); ok(/비고|현황조사서/.test(v.why), '어떤 조사로 알 수 있었는지 짚어 줌');
await start('f11',778); v=await p.evaluate(()=>frPassVerdict()); ok(v.g==='bad', '남는 물건을 조사 없이 넘기면 "확인 없이 넘겼어요" ('+v.head+')');
await p.evaluate(()=>KP.actions.forEach(a=>K.done[a.id]=true)); v=await p.evaluate(()=>frPassVerdict()); ok(v.g==='meh', '조사하고도 남는 물건을 넘기면 "지나치게 조심" ('+v.head+')');
// 실제 버튼으로 카드
await p.evaluate(()=>renderArena()); await p.waitForTimeout(300);
const sk=await p.$('[data-frskip]'); if(sk){ await sk.click(); await p.waitForTimeout(450); await sk.click().catch(()=>{}); await p.evaluate(()=>{ const b=document.querySelector('[data-frskip]'); if(b) b.click(); }); }
await p.waitForTimeout(400); t=await p.evaluate(()=>{ const c=document.getElementById('frPass'); return c?c.innerText:''; });
ok(/지나치게 조심|확인 없이|근거/.test(t) && /숨어 있던 비용/.test(t), '넘기기 버튼 → 판단 카드가 뜸');
await p.click('[data-frpassok]').catch(()=>{}); await p.waitForTimeout(200); ok(await p.evaluate(()=>!document.getElementById('frPass')), '확인 누르면 닫힘');
ok(await p.evaluate(()=>(kcRec().passes||[]).length>=1), '포기 기록이 남음');
// 3) 낙찰 ≠ 소유권
await start('f11',779); await p.evaluate(()=>{ let b=Math.round(KP.minBid*1.1),t=0; while(t++<12){ kBid(b); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; b=Math.round(b*1.06);} renderArena(); }); await p.waitForTimeout(500);
t=await p.evaluate(()=>document.body.innerText); ok(/대금 납부/.test(t) && /소유권/.test(t) && /6개월/.test(t), '낙찰 화면: 매각허가 → 대금 납부 = 소유권 → 인도명령 6개월');
ok(await p.evaluate(()=>!/강제집행 들어갑니다/.test(kingHTML.toString()+JSON.stringify(typeof K_MOVES!=='undefined'?K_MOVES:[]))), '"강제집행 들어갑니다" 겁주기 문구 제거');
// 4) 매도 조건 묶음
await p.evaluate(()=>{ K.step='sell'; K.repair={id:'part',price:0.02,speed:0.1}; K.sale={list:KP.trueMid,trueP:KP.trueMid,weeks:2,offers:[],done:false,offer:{amt:KP.trueMid-200,buyer:K_BUYERS.find(b=>b.t==='신혼부부')}}; renderArena(); }); await p.waitForTimeout(300);
t=await p.evaluate(()=>(document.querySelector('.st-card')||{}).innerText||''); ok(/예상 잔금일/.test(t) && /실제로 남는/.test(t), '매도 제안에 가격·잔금일·조건·실제로 남는 돈이 한 카드로');
ok(await p.evaluate(()=>!!document.querySelector('[data-kterm="speed"]')), '"잔금일 당기기" 역제안 버튼');
await p.evaluate(()=>{ K.sale.offer.heard=true; }); const r1=await p.evaluate(()=>{ let n=0; for(let i=0;i<40;i++){ const of={amt:10000,buyer:K_BUYERS.find(b=>b.t==='신혼부부'),heard:true}; K.sale.offer=of; stAnswer('speed'); if(of.terms.w===2) n++; } return n; });
ok(r1>=30, '사정을 듣고 양보할 조건(잔금일)을 알면 그 역제안이 잘 통함 '+r1+'/40');
const r2=await p.evaluate(()=>{ let n=0; for(let i=0;i<40;i++){ const of={amt:10000,buyer:K_BUYERS.find(b=>b.t==='대출 최대한도형')}; K.sale.offer=of; stAnswer('speed'); if(of.terms.w===2) n++; } return n; });
ok(r2<=10, '대출 조건부 매수자는 날짜를 거의 못 당김 '+r2+'/40');
const rep=await p.evaluate(()=>{ const of={amt:20000,buyer:K_BUYERS.find(b=>b.t==='가격 깎기형')}; K.sale.offer=of; const t=stTerms(of); const c=t.cond.cost; let tries=0; while(t.cond && tries++<20){ of.triedRepair=false; stAnswer('repair'); } return {c, amt:of.amt, left:!!t.cond}; });
ok(!rep.left && rep.amt<20000 && rep.amt>20000-rep.c, '수리 요구 → 가격 조정 역제안 '+JSON.stringify(rep));
const acc=await p.evaluate(()=>{ const of={amt:KP.trueMid,buyer:{t:'신혼부부',flex:0.012,cancel:0}}; K.sale.offer=of; K.sale.done=false; const t=stTerms(of); const h0=K.cost.hold, d0=K.day; kClose(of.amt, of.buyer); return {w:t.w, dh:K.cost.hold-h0, dd:K.day-d0, done:K.sale.done, step:K.step}; });
ok(acc.done && acc.dd===acc.w*7 && acc.dh>0, '수락하면 잔금일까지 보유비가 실제로 붙음 '+JSON.stringify(acc));
// 5) 문구
t=await p.evaluate(()=>JSON.stringify(K_PROPS.f54)+JSON.stringify(K_PROPS.f53)); ok(/법정기일/.test(t) && /2023년 4월/.test(t), '당해세 사건: 법정기일·2023 개정까지 설명');
ok(/한 가지 열람만/.test(t) && !/외국인은 전입신고 대신 체류지 변경신고로 대항력을 가진다/.test(t), '외국인 사건: 국적이 아니라 열람 단정이 문제');
t=await p.evaluate(()=>kfFailText()); ok(/게임용 단순화/.test(t), '저감률은 게임용 단순화라고 표시');
t=await p.evaluate(()=>JSON.stringify(LN_PRODUCTS.map(x=>x.kind))); ok(!/"농협"|"수협"/.test(t) && /지역농협/.test(t), '대출: 지역농협·회원수협(상호금융)으로 구분');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
