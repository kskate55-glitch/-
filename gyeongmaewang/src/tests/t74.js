// 실패도 화면이다 — 저장 실패·그림 실패 안내 · 입찰 연타 · 연출/소리 설정과 결과 무관
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const GAME='[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kintro],[data-kreveal],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2]';
const newPage=async(w,h,fx)=>{const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(w+' '+e.message));p.on('dialog',d=>d.accept());
  await p.addInitScript(fx=>{window.MT_SKIP_TALE=true; let x=4242; Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647;}; if(fx) try{localStorage.setItem('gmw_fx',JSON.stringify(fx));}catch(e){}}, fx||null);
  await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(900); return p;};
for(const [w,h] of [[1280,800],[390,844]]){
  const p=await newPage(w,h);
  // 저장 실패
  await p.evaluate(()=>{ window._set=Storage.prototype.setItem; Storage.prototype.setItem=function(){ const e=new Error('full'); e.name='QuotaExceededError'; throw e; }; save(); });
  await p.waitForTimeout(150);
  ok(await p.evaluate(()=>{const b=document.getElementById('stSave'); return !!b && /저장하지 못했어요/.test(b.innerText) && /저장 공간/.test(b.innerText);}), w+' 저장 실패 → 사실대로 알림');
  await p.evaluate(()=>{ Storage.prototype.setItem=window._set; }); await p.click('[data-stretry]'); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>/저장됐어요/.test((document.getElementById('stSave')||{}).innerText||'')), w+' 다시 저장 → 저장됐어요');
  await p.waitForTimeout(2700); ok(!(await p.$('#stSave')), w+' 안내는 곧 사라짐');
  // 그림 실패
  await p.evaluate(()=>{ const i=document.createElement('img'); i.id='badImg'; i.src='/_blob/00000000000000000000000000000000'; document.body.appendChild(i); });
  await p.waitForTimeout(500);
  ok(await p.evaluate(()=>document.getElementById('badImg').classList.contains('st-img-fail')), w+' 그림 실패 → 깨진 아이콘 대신 자리만 비움');
  // 입찰 연타
  await p.evaluate(()=>{kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false;kStart(7);K.intro=false;renderArena();}); await p.waitForTimeout(2600);
  await p.evaluate(()=>document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false));
  await p.fill('#kBid','12500'); await p.click('[data-kcseal]'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const b=document.querySelector('[data-kbid]'); b.click(); b.click(); b.click(); });
  await p.waitForTimeout(400);
  ok(await p.evaluate(()=>K && K.result && K.result.bids.filter(b=>b.me).length===1), w+' 제출을 세 번 눌러도 입찰은 한 번');
  await p.close();
}
// 연출·소리 설정과 결과 무관: 같은 씨앗·같은 선택이면 같은 결과
const play=async(fx,mute)=>{const p=await newPage(1280,800,fx);
  await p.evaluate(m=>{ if(m) kaSave(Object.assign(kaCfg(),{mute:true})); else { kaSave(Object.assign(kaCfg(),{mute:false})); try{kaCtx()}catch(e){} }; kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false;kStart(11);K.intro=false;renderArena();}, mute); await p.waitForTimeout(300);
  for(let i=0;i<400;i++){ const st=await p.evaluate(GAME=>{ if(K.revealing){K.revealing=false;renderArena();} if(K.step==='lost'||K.step==='result') return K.step;
      document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false);
      const root=document.getElementById('kfsRoot')||document; const btns=[...root.querySelectorAll(GAME)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;});
      const bid=document.getElementById('kBid'); if(bid&&bid.type==='number') bid.value='13200';
      window._n=(window._n||0)+1; const pref=btns.find(e=>e.matches('[data-kbid],[data-kcseal]'))||btns[(window._n*7)%btns.length]; if(!pref) return 'stuck'; pref.click(); if(K&&K.revealing){K.revealing=false;renderArena();} return 'go'; }, GAME);
    if(st!=='go') break; }
  const r=await p.evaluate(()=>({mute:kaCfg().mute, fx:gxLevel(), step:K.step, profit:K.final?Math.round(K.final.profit):null, bids:K.result?K.result.bids.map(b=>b.amt).join(','):''}));
  await p.close(); return r; };
const a=await play({level:'max'},false), c=await play({level:'min'},true);
console.log('max+sound',a,'min+mute',c);
ok(a.step==='result' && a.mute===false && c.mute===true && a.fx==='max' && c.fx==='min' && a.step===c.step && a.profit===c.profit && a.bids===c.bids, '연출 많음+소리 켬 / 연출 최소+무음 — 결과가 완전히 같음');
console.log('errors',errs); await b.close();})();
