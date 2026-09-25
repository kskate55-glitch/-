const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
// 유찰 1회 된 k2를 게시판에서 입찰
const r = await p.evaluate(()=>{ hubRec().cleared['king:k1']=1; kcRec().cases=1; const B=bdRec(); bdFill(B); const it=B.items.find(i=>i.prop==='k2')||B.items.find(i=>i.kind==='case'); it.extra=1; OF_SPOT='board'; arenaTab='office'; renderArena();
  const base=K_PROPS[it.prop].minBid; document.querySelector(`[data-bdplay="${it.key}"]`).click();
  return {prop:it.prop, base, now:KP.minBid, proto:Object.getPrototypeOf(KP)===K_PROPS[it.prop], rivals:K.rivals.length, tab:arenaTab, intro:K.intro, board:K.board}; });
console.log(r);
await p.evaluate(()=>{ K.intro=false; renderArena(); }); await p.waitForTimeout(300);
console.log('round banner', await p.evaluate(()=>!!document.querySelector('.bd-round') && document.querySelector('.bd-round').innerText));
console.log('clock', await p.evaluate(()=>document.querySelector('.bd-clock')&&document.querySelector('.bd-clock').innerText));
await p.screenshot({path:'bd_round.png'});
// stuck 재현: won 화면 버튼
await p.evaluate(()=>{ kBid(KP.minBid*2); renderArena(); if(K.revealing){K.revealing=false; renderArena();} });
console.log('won', await p.evaluate(()=>[K.step, [...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.outerHTML.slice(0,80)).slice(0,30)]));
console.log(errs); await b.close();})();
