// v168 외전 엔진 + D01 + 도현 대리입찰
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const setup=async(res0)=>p.evaluate((res0)=>{ localStorage.clear(); const c=kcRec(); c.fr={full:true}; c.cash=90000; lfNew('dohyun'); const L=lfRec(); L.story=true; L.intro=false; K=null; page='arena'; arenaTab='life'; LF_SPOT='laptop';
  const R=epOf('dohyun'); R.res=res0?[res0]:[]; IL_LATER={}; IL_AUTOPLAY=false; cpRec().il=undefined; save(); renderArena(); },res0);
await setup(null);
ok(await p.$('.il-alert')===null, '첫 사건 전 — 외전 알림 없음');
await setup({profit:1234,full:true,pct:70});
ok(await p.$eval('.il-alert', e=>e.innerText.includes('입찰은 맡겨도')), '첫 사건 뒤 방에 "새 이야기" 알림');
ok(await p.$('#ilRoot')===null, '(자동 시작을 끈 상태) 알림 경로 확인');
await p.click('[data-illater]'); await p.waitForTimeout(150);
ok(await p.$('.il-alert')===null && await p.$('[data-ilshelf]')!==null, '나중에 읽기 → 알림 닫히고 📚 외전 버튼 남음');
const before=await p.evaluate(()=>({cash:kcRec().cash, t:lfRec().t, sta:lfRec().sta, stress:lfRec().stress}));
await p.click('[data-ilshelf]'); await p.click('[data-ilread="D01"]'); await p.waitForTimeout(200);
ok(await p.$('#ilRoot')!==null, '외전 열림');
// 타이핑: 첫 입력은 문장 완성, 다음 입력이 다음 줄
await p.evaluate(()=>ilCfgSet({speed:'slow', auto:false}));
await p.evaluate(()=>{ ilPanelClose(); ILR.pc=ILR.def.scenes[0].pc; ilRun(); });
await p.waitForTimeout(60);
const t1=await p.evaluate(()=>({pc:ILR.pc, typing:ILR.typing, len:document.querySelector('.il-text').textContent.length, full:ILR.full.length}));
await p.keyboard.press('Enter'); await p.waitForTimeout(160);
const t2=await p.evaluate(()=>({pc:ILR.pc, typing:ILR.typing, len:document.querySelector('.il-text').textContent.length}));
ok(t1.typing && t1.len<t1.full && t2.pc===t1.pc && t2.len===t1.full, '타이핑 중 첫 입력 = 문장 완성(다음 줄로 안 감)');
await p.keyboard.press('Enter'); await p.waitForTimeout(40);
ok(await p.evaluate(()=>ILR.pc)===t1.pc+1, '표시 완료 후 입력 = 다음 줄');
// 두 번 빠르게 눌러도 한 줄만
await p.evaluate(()=>ilCfgSet({speed:'instant'}));
const pc0=await p.evaluate(()=>{ ILR.lastAdv=0; return ILR.pc; });
await p.evaluate(()=>{ const b=document.querySelector('.il-box'); b.click(); b.click(); });
ok(await p.evaluate(()=>ILR.pc)-pc0<=1, '더블클릭에 두 줄이 넘어가지 않음');
// 버튼 클릭이 대사 진행으로 새지 않는다
const pc1=await p.evaluate(()=>ILR.pc); await p.click('[data-il="cfg"]'); await p.click('[data-il="panelx"]');
ok(await p.evaluate(()=>ILR.pc)===pc1, '설정 버튼 클릭이 진행으로 새지 않음');
// 백로그
await p.evaluate(()=>{ for(let i=0;i<12;i++){ ILR.lastAdv=0; ilAdvance(); } });
const pcB=await p.evaluate(()=>ILR.pc); await p.click('[data-il="log"]'); const nlog=await p.$$eval('.il-log li',x=>x.length); await p.click('[data-il="panelx"]');
ok(nlog>=10 && await p.evaluate(()=>ILR.pc)===pcB, `백로그 ${nlog}줄 · 닫아도 위치 그대로`);
// 나중에 계속 → 이어 읽기
await p.click('[data-il="later"]'); await p.waitForTimeout(100);
ok(await p.$('#ilRoot')===null && await p.evaluate(()=>ilState('D01').st)==='reading', '💾 나중에 계속 → 저장');
await p.evaluate(()=>{ save(); ILR=null; });
await p.click('[data-ilshelf]'); await p.click('[data-ilread="D01"]'); await p.waitForTimeout(100);
ok(await p.evaluate(()=>ILR.pc)===pcB, '이어 읽기 — 같은 줄에서 재개');
// 끝까지 읽기(선택은 첫 번째, 시트는 '설명 보고 진행')
const walk=await p.evaluate(()=>{ ilCfgSet({speed:'instant', auto:false}); const seen=[]; let g=0, sheets=0;
  while(ILR && !ILR.done && g++<4000){
    if(ILR.choosing){ ilPick(ILR.choosing.opts[0].id); continue; }
    if(ILR.panel==='sheet'){ sheets++; const sh=ILR.def.sheets[ILR.sheetId]; if(sh.type==='sort'||sh.type==='pick') ilSheetAct('show'); ilSheetAct('done'); continue; }
    if(ILR.panel){ ilPanelClose(); continue; }
    seen.push(document.querySelector('.il-text').textContent); ILR.lastAdv=0; ilAdvance(); }
  return {n:seen.length, done:!!(ILR&&ILR.done), sheets, profit:seen.some(t=>t.includes('1,234만원')), loss:seen.some(t=>t.includes('손실이 났어요')), end:document.querySelector('.il-end')!==null}; });
ok(walk.done && walk.end && walk.n>150, `끝까지 읽힘(${walk.n}줄, 실무 조작 ${walk.sheets}번)`);
ok(walk.profit && !walk.loss, '첫 사건 흑자 → 흑자 갈래 대사만(금액 1,234만원 치환)');
const after=await p.evaluate(()=>({cash:kcRec().cash, t:lfRec().t, sta:lfRec().sta, stress:lfRec().stress, st:ilState('D01').st, notes:Object.keys(ilRec().notes).length}));
ok(after.cash===before.cash && after.t===before.t && after.sta===before.sta && after.stress===before.stress, '외전을 읽어도 현금·날짜·체력·스트레스 그대로');
ok(after.st==='read' && after.notes>=3, '다 읽음 + 실무노트 3장 해금');
await p.click('[data-il="close"]'); await p.waitForTimeout(100);
// 앨범 다시보기는 읽기 전용
await p.click('[data-ilshelf]'); await p.click('[data-ilreplay="D01"]'); await p.waitForTimeout(100);
await p.evaluate(()=>{ for(let i=0;i<5;i++){ ILR.lastAdv=0; ilAdvance(); } }); await p.click('[data-il="skip"]'); await p.waitForTimeout(100);
ok(await p.evaluate(()=>ilState('D01').st)==='read', '다시보기·닫기는 상태를 바꾸지 않음');
// 적자 / 미거래 갈래
for(const [res,txt,name] of [[{profit:-800,full:true},'손실이 났어요','적자'],[{profit:0,lost:true,full:true},'거래를 진행하지 않았어요','패찰']]){
  const r=await p.evaluate(([res,txt])=>{ epOf('dohyun').res=[res]; cpRec().il=undefined; ilSync(); ilStart('D01'); ilCfgSet({speed:'instant'}); const seen=[]; let g=0;
    while(ILR && !ILR.done && g++<4000){ if(ILR.choosing){ ilPick(ILR.choosing.opts[1].id); continue; } if(ILR.panel==='sheet'){ ilSheetAct('show'); ilSheetAct('done'); continue; } if(ILR.panel){ ilPanelClose(); continue; } seen.push(document.querySelector('.il-text').textContent); ILR.lastAdv=0; ilAdvance(); }
    ilClose(true); return {hit:seen.some(t=>t.includes(txt)), money:seen.some(t=>t.includes('남은 걸로'))}; },[res,txt]);
  ok(r.hit && !r.money, `${name} 결과 → 맞는 도입 대사, 번 돈 언급 없음`);
}
// 건너뛰기 후에도 노트 열람
await p.evaluate(()=>{ epOf('dohyun').res=[{profit:100,full:true}]; cpRec().il=undefined; ilSync(); ilStart('D01'); });
await p.click('[data-il="skip"]'); await p.click('[data-il="skipyes"]'); await p.waitForTimeout(100);
await p.evaluate(()=>renderArena()); await p.click('[data-ilshelf]'); await p.click('[data-ilnotes="D01"]');
ok(await p.evaluate(()=>ilState('D01').st)==='skipped' && (await p.$$('.il-modal .il-note')).length===3, '건너뛰어도 실무노트 3장 열람');
await p.evaluate(()=>ilModalClose());
// 연습 체험 — 본편 입찰가와 무관
const pr=await p.evaluate(()=>{ ilStart('D01',{restart:true}); const sc=ILR.def.prog.findIndex(n=>n.k==='sheet'&&n.id==='check'); ILR.pc=sc; ilRun(); const html=document.querySelector('.il-panel').innerText; ilSheetAct('show'); const okTxt=document.querySelector('.il-panel').innerText; ilSheetAct('done'); ilClose(true);
  return {has:html.includes('연습사건 D01')&&html.includes('281,700,000원')&&html.includes('218,700,000원'), ok:okTxt.includes('일치'), kbid:typeof K!=='undefined'&&K?K.bid:null}; });
ok(pr.has && pr.ok && !pr.kbid, '연습사건 D01 대조(2번·218,700,000원) — 본편 입찰 상태는 없음');

// ---------- 본편 대리입찰 ----------
const run=async(mode,seed,amtMul)=>p.evaluate(([mode,seed,amtMul])=>{ localStorage.clear(); const c=kcRec(); c.fr={full:true}; c.cash=90000; lfNew('dohyun'); const L=lfRec(); L.story=true; L.intro=false; L.leave=5;
  epOf('dohyun').res=[{profit:500,full:true}]; cpRec().il=undefined; ilSync();
  page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f21'; KC_INTRO=false; kStart(seed); K.intro=false; K.epStory={ch:'dohyun',i:1};
  const amt=Math.round(KP.minBid*amtMul/10)*10; K.sealed={amt, pred:{}}; renderArena();
  const panel=!!document.querySelector('.il-proxy'); if(mode) document.querySelector(`[data-ilattend="${mode}"]`).click();
  const sum=document.querySelector('.il-proxy-sum')?document.querySelector('.il-proxy-sum').innerText:'';
  const cash0=kcRec().cash, legal0=K.cost.legal||0, leave0=L.leave;
  const _mr=Math.random; Math.random=()=>0.999;   // 패찰 뒤 인생 시계가 돌며 생기는 무작위 생활 사건을 두 실행에서 똑같이
  kBid(amt); const res={win:K.result.win, bids:K.result.bids.map(x=>x.amt).join(','), legal:(K.cost.legal||0)-legal0, cash:kcRec().cash-cash0, leave:leave0-L.leave, log:(K.log||[]).join(' ')};
  kBid(amt); res.legal2=(K.cost.legal||0)-legal0; res.cash2=kcRec().cash-cash0;
  Math.random=_mr; res.book=JSON.stringify(ilRec().proxy); res.dbg=JSON.stringify({q:res.cash,l:res.legal,log:res.log.slice(-300)}); res.panel=panel; res.sum=sum; return res; },[mode,seed,amtMul]);
for(const [seed,mul] of [[7,1.02],[7,1.6],[11,1.25]]){
  const d=await run('direct',seed,mul), q=await run('proxy',seed,mul);
  ok(d.panel && q.panel, `seed ${seed} — 봉투 확인 화면에 참석 방식 선택`);
  ok(d.bids===q.bids && d.win===q.win, `seed ${seed}×${mul} — 참석 방식이 경쟁자·결과를 바꾸지 않음(${q.win?'낙찰':'패찰'})`);
  ok(d.legal===0 && !/이용료/.test(d.log), `직접 참석 — 이용료 0`);
  ok(q.win ? (q.legal===15 && q.cash-d.cash===0) : (q.legal===0 && q.cash-d.cash===-15), `대리입찰 — ${q.win?'사건 비용 +15만원':'통장 −15만원'}(직접 참석 대비) d=${d.cash} q=${q.cash} ql=${q.legal} ${q.win!==d.win?'결과다름':''} || ${q.log.slice(-200)} || ${d.log.slice(-200)}`);
  ok(q.legal2===q.legal && q.cash2-q.cash===d.cash2-d.cash, '다시 제출해도 이용료 한 번만');
  ok(q.sum.includes('가상 이용료') && q.sum.includes('보증금'), '최종 검토표 — 가상 이용료·보증금 구분 표시');
}
const cancel=await p.evaluate(()=>{ localStorage.clear(); const c=kcRec(); c.cash=90000; lfNew('dohyun'); lfRec().story=true; epOf('dohyun').res=[{profit:1,full:true}]; cpRec().il=undefined;
  KC_MODE='career'; K_PROP_NEXT='f21'; KC_INTRO=false; kStart(3); K.intro=false; K.epStory={ch:'dohyun',i:1}; K.sealed={amt:KP.minBid+100,pred:{}}; renderArena();
  const c0=kcRec().cash; document.querySelector('[data-ilattend="proxy"]').click(); document.querySelector('[data-kcunseal]').click(); return {d:kcRec().cash-c0, att:K.ilAttend}; });
ok(cancel.d===0 && !cancel.att, '대리입찰 고른 뒤 다시 쓰기 → 0원·선택 초기화');
const poor=await p.evaluate(()=>{ localStorage.clear(); const c=kcRec(); lfNew('dohyun'); lfRec().story=true; epOf('dohyun').res=[{profit:1,full:true}]; cpRec().il=undefined;
  KC_MODE='career'; K_PROP_NEXT='f21'; KC_INTRO=false; kStart(3); K.intro=false; K.epStory={ch:'dohyun',i:1}; c.cash=Math.round(KP.minBid*0.1/10)*10+5; K.sealed={amt:KP.minBid+100,pred:{}}; renderArena();
  const b=document.querySelector('[data-ilattend="proxy"]'); return {dis:b.disabled, warn:document.querySelector('.il-proxy .ke-warn')!==null}; });
ok(poor.dis && poor.warn, '현금 부족 → 대리입찰 비활성 + 이유 안내(직접 참석 가능)');
const other=await p.evaluate(()=>{ localStorage.clear(); kcRec().cash=90000; KC_MODE='career'; K_PROP_NEXT='f21'; KC_INTRO=false; kStart(3); K.intro=false; K.epStory={ch:'dohyun',i:0}; K.sealed={amt:KP.minBid+100,pred:{}}; renderArena(); const a=!!document.querySelector('.il-proxy');
  K.epStory={ch:'seoyun',i:2}; renderArena(); const b2=!!document.querySelector('.il-proxy'); K.epStory=null; renderArena(); return [a,b2,!!document.querySelector('.il-proxy')]; });
ok(!other[0] && !other[1] && !other[2], '도현 첫 사건·다른 캐릭터·자유 플레이에는 선택지 없음');
// C01 후일담
for(const [mode,win,txt] of [['proxy',true,'낙찰…'],['proxy',false,'이번에는 못 샀네'],['direct',true,'직접 다녀왔어요']]){
  const r=await p.evaluate(([mode,win,txt])=>{ localStorage.clear(); lfNew('dohyun'); lfRec().story=true; cpRec().il=undefined; epOf('dohyun').res=[{profit:1,full:true}];
    ilProxyRec()['dohyun:1:f21']={mode, won:win, bid:21000, top:22000, title:'500이라는 숫자의 출처', i:1, at:1, charged:mode==='proxy'};
    ilSync(); const pre=ilState('D01C').st; epOf('dohyun').res[1]={profit:0,full:true,lost:!win}; ilSync(); const post=ilState('D01C').st;
    ilStart('D01C'); ilCfgSet({speed:'instant'}); const seen=[]; let g=0; while(ILR&&!ILR.done&&g++<200){ seen.push(document.querySelector('.il-text').textContent); ILR.lastAdv=0; ilAdvance(); } ilClose(true);
    return {pre, post, hit:seen.some(t=>t.includes(txt)), n:seen.length, raw:seen.some(t=>t.includes('{{'))}; },[mode,win,txt]);
  ok(r.pre==='locked' && r.post==='available' && r.hit && !r.raw, `후일담 ${mode}/${win?'낙찰':'패찰'} — 결과 확정 뒤에만 열리고 맞는 갈래`);
}
const oldSave=await p.evaluate(()=>{ localStorage.clear(); lfNew('dohyun'); cpRec().il=undefined; epOf('dohyun').res=[{profit:1,full:true},{profit:5,full:true}]; ilSync(); return ilState('D01C').st; });
ok(oldSave==='locked', '기록 없는 예전 세이브 — 후일담을 지어내지 않음');

// ---------- 모바일 360 ----------
const m=await b.newPage({viewport:{width:360,height:640}}); m.on('pageerror',e=>errs.push('m pageerror '+e.message)); m.on('dialog',d=>d.accept());
await m.goto('http://localhost:8765/rights-study.html#arena'); await m.waitForTimeout(700);
await m.evaluate(()=>{ localStorage.clear(); const c=kcRec(); c.fr={full:true}; lfNew('dohyun'); const L=lfRec(); L.story=true; L.intro=false; page='arena'; arenaTab='life'; epOf('dohyun').res=[{profit:1234,full:true}]; cpRec().il=undefined; IL_LATER={}; renderArena(); });
const al=await m.$eval('.il-alert',e=>{ const r=e.getBoundingClientRect(); return r.right<=361 && r.left>=-1; });
ok(al, '360px — 방 알림이 화면 안');
await m.click('[data-ilread="D01"]'); await m.evaluate(()=>ilCfgSet({speed:'instant'}));
const long=await m.evaluate(()=>{ let best=0,pc=0; ILR.def.prog.forEach((n,i)=>{ if(n.k==='line'&&n.t.length>best){best=n.t.length;pc=i;} }); ILR.pc=pc; ilRun(); const b=document.querySelector('.il-box').getBoundingClientRect(), t=document.querySelector('.il-text');
  return {inView:b.bottom<=640&&b.top>=0&&b.left>=0&&b.right<=360, fits:t.scrollHeight<=document.querySelector('.il-box').clientHeight+2 || getComputedStyle(document.querySelector('.il-box')).overflowY==='auto', hs:document.documentElement.scrollWidth<=360}; });
ok(long.inView && long.fits && long.hs, '360px — 가장 긴 대사도 대사창 안(잘림 없음·가로 스크롤 없음)');
const ch=await m.evaluate(()=>{ const i=ILR.def.prog.findIndex(n=>n.k==='choice'); ILR.pc=i; ilRun(); return [...document.querySelectorAll('.il-choice .btn')].map(x=>{const r=x.getBoundingClientRect(); return r.bottom<=640&&r.top>=0&&r.right<=360;}); });
ok(ch.length===2 && ch.every(Boolean), '360px — 선택지 버튼이 화면 안');
const sh=await m.evaluate(()=>{ ilPick(ILR.choosing.opts[0].id); const i=ILR.def.prog.findIndex(n=>n.k==='sheet'&&n.id==='check'); ILR.pc=i; ilRun(); const pnl=document.querySelector('.il-panel'); pnl.scrollTop=99999; const btn=[...pnl.querySelectorAll('[data-ilsheet]')].pop().getBoundingClientRect(); return {btn:btn.bottom<=640&&btn.right<=360, hs:pnl.scrollWidth<=pnl.clientWidth+1}; });
ok(sh.btn && sh.hs, '360px — 대조 화면 끝까지 스크롤해 버튼 누를 수 있음');
await m.screenshot({path:'il_mobile.png'});
await p.evaluate(()=>{ localStorage.clear(); lfNew('dohyun'); epOf('dohyun').res=[{profit:1234,full:true}]; cpRec().il=undefined; ilSync(); ilStart('D01'); ilCfgSet({speed:'instant'}); const i=ILR.def.prog.findIndex(n=>n.k==='line'&&n.who==='도현'); ILR.pc=i; ilRun(); });
await p.screenshot({path:'il_pc.png'});
console.log(errs.length?'FAIL '+errs.join(' | '):'ALL OK'); await b.close(); process.exit(errs.length?1:0);})();
