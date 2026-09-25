// 장면 그림 5장: 첫 경매 입구 · 패찰 · 돌아보기 · 1년 결산 · CASE 002 제대로 고친 방
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const GAME='[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kintro],[data-kreveal],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2]';
const imgOk=(p,sel)=>p.evaluate(s=>{const i=document.querySelector(s); return !!i && i.complete && i.naturalWidth>0;},sel);
async function run(p,prop,seed,prefer){
  await p.evaluate(([prop,seed])=>{arenaTab='king';KC_MODE='career';K_PROP_NEXT=prop;KC_INTRO=false;kStart(seed);K.intro=false;renderArena();},[prop,seed]); await p.waitForTimeout(100);
  for(let i=0;i<300;i++){
    const st=await p.evaluate(([GAME,prefer])=>{ if(!K) return 'none'; if(K.revealing){K.revealing=false;renderArena();}
      if(K.step==='lost'||K.step==='result') return K.step;
      document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false); if(typeof G!=='undefined'&&G) G.card=null;
      const root=document.getElementById('kfsRoot')||document; const btns=[...root.querySelectorAll(GAME)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;});
      const bid=document.getElementById('kBid'); if(bid&&bid.type==='number') bid.value=String(Math.round((KP.minBid*(prefer==='lose'?1.0:1.4))/10)*10);
      const pick0=btns.find(e=>prefer && prefer!=='lose' && e.matches(prefer))||btns.find(e=>e.matches('[data-kbid],[data-kcseal]'));const safe=btns.filter(e=>!/exit|forfeit|dump|quit|hide/.test(e.getAttribute('data-k2')||'')); const pick2=pick0||(safe.length?safe:btns)[Math.floor(Math.random()*(safe.length?safe:btns).length)]; const pick=pick2;
      if(pick) pick.click(); else return 'stuck'; if(K&&K.revealing){K.revealing=false;renderArena();} return 'go'; },[GAME,prefer]);
    if(st==='lost'||st==='result'||st==='stuck'||st==='none'){ await p.waitForTimeout(400); return st; }
  }
  return 'timeout';
}
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(w+' '+e.message));p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(900);
await p.evaluate(()=>{localStorage.clear(); location.reload();}); await p.waitForTimeout(1400);
ok(await imgOk(p,'.fr-guide .gmw-scene[data-scene=first] img'), w+' 첫 화면 안내에 첫 경매 그림');
await p.evaluate(()=>{kcRec().fr={full:true};});
// 패찰·돌아보기
let lost=false, res=false;
for(let s=0;s<16 && !(lost&&res);s++){ const st=await run(p,'k1',300+s, lost?null:'lose');
  if(st==='lost'){ lost = await imgOk(p,'.k-bidres.lose .gmw-scene[data-scene=lost] img'); }
  if(st==='result'){ res = await imgOk(p,'.fr-review .gmw-scene[data-scene=review] img'); } }
ok(lost, w+' 패찰 화면에 돌려받은 봉투 그림'); ok(res, w+' 이번 판 돌아보기에 코르크 보드 그림');
// CASE 002
let fixed=null, hidden=null;
for(let s=0;s<12 && (fixed===null||hidden===null);s++){ const want = fixed===null ? 'fix' : 'hide';
  const st=await run(p,'k2',500+s,`[data-k2="fix:${want}"],[data-k2^="cross:go"],[data-k2^="list:15900"]`);
  if(st==='result'){ const c=await p.evaluate(()=>K.k2.cond); const has=await p.evaluate(()=>!!document.querySelector('.k2-verdict .gmw-scene[data-scene=k2fixed]'));
    if(c==='fix' && fixed===null) fixed = has && await imgOk(p,'.k2-verdict .gmw-scene img');
    else if(c!=='fix' && hidden===null) hidden = !has; } }
ok(fixed===true, w+' CASE 002 제대로 고쳤을 때 결과에 고친 방 그림'); ok(hidden!==false, w+' 덮거나 최소 수리면 그 그림 없음');
let claim=null, sold=null;
for(let s=0;s<14 && (claim===null||sold===null);s++){ const st=await run(p,'k2',800+s,`[data-k2="fix:hide"],[data-k2^="cross:go"],[data-k2^="list:15900"]`);
  if(st==='result' && sold===null && await p.evaluate(()=>!K.k2.claim && K.sale && K.sale.done && K.sale.price>0)) sold = await imgOk(p,'.k2-verdict .gmw-scene[data-scene=k2deal] img');
  if(st==='result' && await p.evaluate(()=>K.k2.claim)) claim = await imgOk(p,'.k2-verdict .gmw-scene[data-scene=k2claim] img') && await p.evaluate(()=>!document.querySelector('[data-scene=k2fixed]')); }
ok(claim===true, w+' 하자담보 청구가 오면 결과에 청구서 그림'); ok(sold!==false, w+' 덮었는데 청구 없이 팔리면 계약 성사 그림');
for(const [ch,sc,msg] of [['exit','k2exit','업자에게 넘기면 열쇠 건네는 그림'],['forfeit','k2forfeit','잔금 포기하면 정류장 그림']]){ let got=null;
  for(let s=0;s<4 && got===null;s++){ const st=await run(p,'k2',1000+s,`[data-k2="cross:${ch}"]`); if(st==='result') got = await imgOk(p,`.k2-verdict .gmw-scene[data-scene=${sc}] img`); }
  ok(got===true, w+' '+msg); }
let deal=null;
for(let s=0;s<8 && deal===null;s++){ const st=await run(p,'k2',900+s,`[data-k2="fix:min"],[data-k2^="cross:go"],[data-k2^="list:15400"]`);
  if(st==='result' && await p.evaluate(()=>K.k2.cond!=='fix' && !K.k2.claim && K.sale && K.sale.done && K.sale.price>0 && !K.k2.exit)) deal = await imgOk(p,'.k2-verdict .gmw-scene[data-scene=k2honest] img'); }
ok(deal===true, w+' 최소 수리 + 고지하고 팔면 정직한 매도 그림');
// CASE 002 나머지 장면 — 상태를 직접 세팅해 화면만 확인
await p.evaluate(()=>{arenaTab='king';KC_MODE='career';K_PROP_NEXT='k2';KC_INTRO=false;kStart(700);K.intro=false;K.step='cross';renderArena();}); await p.waitForTimeout(500);
ok(await imgOk(p,'.k2-cross .gmw-scene[data-scene=k2cross] img'), w+' 잔금 갈림길 그림');
await p.evaluate(()=>{K.sale={list:16500,trueP:15800,weeks:4,offer:null,done:false,note:'📢 같은 건물 3층 급매가 1억 6,200만원에 팔렸다.'}; K.step='sell'; renderArena();}); await p.waitForTimeout(500);
ok(await imgOk(p,'.gmw-scene[data-scene=k2rival] img'), w+' 같은 건물 급매 소식에 급매 그림');
await p.evaluate(()=>{K.sale.weeks=5; K.sale.note='💧 아래층에서 전화 — 천장으로 또 물이 샌다.'; renderArena();}); await p.waitForTimeout(500);
ok(await imgOk(p,'.gmw-scene[data-scene=k2recur] img'), w+' 덮은 누수 재발 그림');
await p.evaluate(()=>{K.sale.weeks=6; K.sale.note=''; renderArena();}); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!document.querySelector('.gmw-scene[data-scene=k2recur],.gmw-scene[data-scene=k2rival]')), w+' 소식 없는 주에는 그림 없음');
// 1년 결산
await p.evaluate(()=>{ localStorage.clear(); cpUnlockAll&&cpUnlockAll(); lfNew('seoyun'); lfRec().intro=false; K=null; const c=kcRec(); c.total=12000; c.cases=5; arenaTab='life'; LF_SPOT='laptop'; renderArena(); }); await p.waitForTimeout(400);
await p.evaluate(()=>{const d=document.getElementById('dpCard'); if(d) d.remove(); document.querySelector('[data-lfpath]').click();}); await p.waitForTimeout(500);
await p.evaluate(()=>{ LF_SPOT='wall'; renderArena(); }); await p.waitForTimeout(500);
ok(await imgOk(p,'.cp-settle .gmw-scene[data-scene=settle] img'), w+' 1년 결산 패널에 결산 날 그림');
await p.evaluate(()=>{ K=null; kcRec().cash=60000; arenaTab='rec'; renderArena(); }); await p.waitForTimeout(600);
const tiers=await p.evaluate(async()=>{const imgs=[...document.querySelectorAll('.kc-tiers .kc-tier-art')]; for(const i of imgs){ i.scrollIntoView(); for(let t=0;t<30&&!(i.complete&&i.naturalWidth);t++) await new Promise(r=>setTimeout(r,100)); }
  return {n:imgs.length, loaded:imgs.every(i=>i.naturalWidth>0), onArt:imgs.filter(i=>i.closest('li.on')).length, gray:imgs.filter(i=>!i.closest('li.on')).every(i=>getComputedStyle(i).filter.includes('grayscale'))};});
ok(tiers.n===5 && tiers.loaded && tiers.onArt===3 && tiers.gray, w+' 자산 등급 물건 그림 5장 · 열린 것만 컬러 '+JSON.stringify(tiers));
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.evaluate(()=>localStorage.clear()); await p.close();}
console.log('errors',errs); await b.close();})();
