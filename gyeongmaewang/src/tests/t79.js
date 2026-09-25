// 첫 패찰 뒤 흐름: 개찰 요약 → 판단 → 남은 것 → ▶ 다음 물건(게시판·첫 안내 1회) / 🏠 오늘은 여기까지, 며칠 뒤 후일담 1회, 첫 경매 극단 운 제거
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
async function lose(p, life){
  await p.evaluate(life=>{ localStorage.clear(); kcRec().fr={full:true}; if(life){ lfNew('seoyun'); lfRec().intro=false; arenaTab='life'; LF_SPOT='board'; renderArena(); const it=bdRec().items.find(x=>x.kind==='case'); bdPlay(it); } else { delete kcRec().life; KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(11); } K.intro=false; arenaTab='king'; renderArena(); }, life);
  await p.waitForTimeout(600);
  await p.evaluate(()=>{ kBid(KP.minBid); if(K.revealing) K.revealing=false; renderArena(); }); await p.waitForTimeout(900);
}
for(const [w,h] of [[1280,824],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(w+' '+e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(900);
await lose(p,true);
const s=await p.evaluate(()=>({step:K&&K.step, sum:!!document.querySelector('.k-bidres.lose .lw-sum'), rows:document.querySelectorAll('.lw-grid b').length, ifs:document.querySelectorAll('.lw-if > div').length, judge:!!document.querySelector('.fr-judge'), kept:document.querySelectorAll('.lw-kept li').length, later:!!document.querySelector('.lw-later'), next:!!document.querySelector('.lw-cta .btn.pri[data-lwnext]'), rest:!!document.querySelector('[data-lwrest]'), homePri:!!document.querySelector('.lf-after .btn.pri'), txt:document.body.innerText}));
ok(s.step==='lost' && s.sum && s.rows===4 && s.ifs===2, w+' 패찰 맨 위: 내 입찰가·낙찰가·차이·남는 선 + 두 가격의 예상 수익');
ok(s.judge, w+' 판단 평가 그대로 표시');
ok(s.kept>=3 && s.later, w+' 이 판에서 남은 것 + 며칠 뒤 소식 예고');
ok(s.next && s.rest && !s.homePri, w+' 메인 = 다음 물건 보러 가기, 보조 = 오늘은 여기까지 (집으로 큰 버튼 없음)');
ok(!/undefined|NaN|\[object/.test(s.txt), w+' 이상한 글자 없음');
ok(await p.evaluate(()=>{const a=document.querySelector('[data-lwnext]').getBoundingClientRect(), c=document.querySelector('[data-lwrest]').getBoundingClientRect(); return a.width>0 && c.width>0 && (a.right<=c.left+1||c.right<=a.left+1||a.bottom<=c.top+1||c.bottom<=a.top+1);}), w+' 두 버튼 안 겹침');
const xp0=await p.evaluate(()=>hubRec().xp);
await p.evaluate(()=>document.querySelector('[data-lwnext]').click()); await p.waitForTimeout(700);
ok(await p.evaluate(()=>arenaTab==='life' && LF_SPOT==='board' && !K && !!document.querySelector('.lw-tip')), w+' 다음 물건 → 게시판 + "이번에는 당신이 고릅니다"');
await p.evaluate(()=>{ LF_SPOT=null; renderArena(); LF_SPOT='board'; renderArena(); }); await p.waitForTimeout(400);
ok(await p.evaluate(()=>!document.querySelector('.lw-tip')), w+' 안내는 한 번만');
ok(await p.evaluate(()=>bdRec().items.some(x=>x.status==='lost')), w+' 패찰한 물건은 게시판에서 "지난 물건"으로');
// 후일담: 게임 시간 3일 뒤 거점에서 1회
await p.evaluate(()=>{ LF_SPOT=null; renderArena(); }); await p.waitForTimeout(900);
ok(await p.evaluate(()=>!document.getElementById('dpCard')), w+' 바로는 소식 안 옴');
await p.evaluate(()=>{ lfRec().t += 3*1440 + 10; renderArena(); }); await p.waitForTimeout(1100);
ok(await p.evaluate(()=>{const d=document.getElementById('dpCard'); return !!d && /중개사에게서 연락/.test(d.innerText) && /팔렸다/.test(d.innerText);}), w+' 3일 뒤 거점에서 "동네 중개사에게서 연락" 후일담');
await p.evaluate(()=>{ const d=document.getElementById('dpCard'); if(d) d.remove(); renderArena(); }); await p.waitForTimeout(1000);
ok(await p.evaluate(()=>!document.getElementById('dpCard')), w+' 후일담은 한 번만');
// 새로고침 — 오류 없이, 경험치 중복 없음
await p.reload(); await p.waitForTimeout(1200);
ok(await p.evaluate(x=>hubRec().xp===x, xp0), w+' 새로고침해도 경험치 그대로(중복 보상 없음)');
// 오늘은 여기까지
await lose(p,true); await p.evaluate(()=>document.querySelector('[data-lwrest]').click()); await p.waitForTimeout(500);
ok(await p.evaluate(()=>arenaTab==='life' && !K && !LF_SPOT), w+' 오늘은 여기까지 → 거점');
// 인생 모드 밖(커리어)
await lose(p,false); await p.evaluate(()=>document.querySelector('[data-lwrest]').click()); await p.waitForTimeout(500);
ok(await p.evaluate(()=>arenaTab==='home' && !K), w+' 커리어 모드: 오늘은 여기까지 → 홈');
// 낙찰은 기존 흐름 그대로
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(11); K.intro=false; arenaTab='king'; kBid(Math.round(KP.trueMid*0.95/10)*10); K.revealing=false; renderArena(); }); await p.waitForTimeout(700);
ok(await p.evaluate(()=>K.step==='won' && !document.querySelector('.lw-sum,.lw-cta')), w+' 낙찰은 기존 흐름 그대로');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close();}
// 첫 경매 극단 운
const p=await b.newPage(); await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const cr=await p.evaluate(()=>{ const out={first:{}, later:{}, weekly:{}};
  for(const [k,bids,mode] of [['first',0,'career'],['later',3,'career'],['weekly',0,'weekly']]) for(let s=1;s<=150;s++){ localStorage.clear(); const c=kcRec(); c.bids=bids; KC_MODE=mode; K_PROP_NEXT='k1'; KC_INTRO=false; kStart(s); out[k][K.crowd]=(out[k][K.crowd]||0)+1; }
  return out; });
ok(!cr.first.quiet && !cr.first.surge, '생애 첫 경매: 텅 빈 법정·갑자기 몰림 없음 '+JSON.stringify(cr.first));
ok(cr.later.quiet>0 && cr.later.surge>0, '두 번째부터는 원래대로 '+JSON.stringify(cr.later));
ok(cr.weekly.quiet>0 || cr.weekly.surge>0, '주간 경매는 첫 판이어도 모두 같은 규칙 '+JSON.stringify(cr.weekly));
console.log('errors',errs); await b.close();})();
