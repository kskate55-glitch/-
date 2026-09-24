// 몽키 테스트: 게임 창 안의 아무 버튼이나 무작위로 누르며 오류·이상 문자열·막힌 화면을 찾는다
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[], weird=new Map(), stuck=[];
for(const [w,h,seed] of [[1280,800,1],[390,844,2],[1280,800,3],[390,844,4]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(w+' '+e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(s=>{ Math.random=(()=>{let x=s*9301+49297;return()=>{x=(x*9301+49297)%233280;return x/233280;};})(); hubRec().cleared['king:k1']=1; kcRec().cases=1; arenaTab='home'; renderArena(); }, seed);
 let last='', same=0;
 for(let i=0;i<700;i++){
   const info=await p.evaluate(()=>{
     const root=document.getElementById('kfsRoot')||document.getElementById('main');
     const t=root.innerText; const bad=[];
     for(const re of [/undefined/,/NaN/,/\[object/,/null만원/,/-\d+억 -/,/Infinity/]) if(re.test(t)) bad.push(re.source+' :: '+(t.match(new RegExp('.{0,30}'+re.source+'.{0,30}'))||[''])[0]);
     const btns=[...root.querySelectorAll('button:not([disabled]), .ag-act:not([disabled]), [data-kintro], .chip')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && !e.closest('.kfs-menu[hidden]') && !e.matches('[data-kfsexit],[data-kcreset],[data-kshare],[data-kfsmenu]');});
     return {bad, n:btns.length, sig:(window.K?K.step+'|'+K.day+'|'+(K.sale&&K.sale.weeks):'')+'|'+arenaTab};
   });
   info.bad.forEach(x=>weird.set(x,(weird.get(x)||0)+1));
   if(info.n===0){ stuck.push(w+' '+info.sig); await p.evaluate(()=>{arenaTab='home';renderArena();}); continue; }
   const k=Math.floor(Math.random()*info.n);
   await p.evaluate(k=>{ const root=document.getElementById('kfsRoot')||document.getElementById('main');
     const btns=[...root.querySelectorAll('button:not([disabled]), .ag-act:not([disabled]), [data-kintro], .chip')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && !e.closest('.kfs-menu[hidden]') && !e.matches('[data-kfsexit],[data-kcreset],[data-kshare],[data-kfsmenu]');});
     const el=btns[k]; if(el){ if(el.id==='kBid'){} el.click(); }
     const bid=document.getElementById('kBid'); if(bid && bid.type==='number' && Math.random()<0.3) bid.value=String(11000+Math.floor(Math.random()*5000));
     if(window.K && K.revealing){ K.revealing=false; renderArena(); }
   }, k);
   await p.waitForTimeout(25);
 }
 console.log(w,seed,'done', await p.evaluate(()=>[kcRec().cases, kcRec().history.length, hubRec().xp]));
}
console.log('stuck',stuck.slice(0,10)); console.log('weird',[...weird.entries()].slice(0,20)); console.log('errors',errs.slice(0,20));await b.close();})();
