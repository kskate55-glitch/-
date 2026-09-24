// 게임 몽키: 경매왕 안의 게임 버튼만 무작위로 누른다. 판이 끝나면 다른 물건·모드로 새 판.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[], weird=new Map(), stuck=new Map(); let games=0; const res=[];
const SEL='[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kcunseal],[data-kintro],[data-kreveal],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2]';
for(const [w,h,seed] of [[1280,800,11],[390,844,12],[1280,800,13],[390,844,14]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(w+' '+e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(s=>{ let x=s; Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647;}; hubRec().cleared['king:k1']=1; kcRec().cases=1; }, seed);
 for(let i=0;i<500;i++){
   const info=await p.evaluate((SEL)=>{
     if(!K || K.step==='result' || K.step==='lost'){
       if(K && (K.step==='result'||K.step==='lost')) window._res=(window._res||[]).concat([[KP.id,K.mode,K.step,K.final?Math.round(K.final.profit):null,K.final&&K.final.k2?K.final.k2.og:(K.final&&K.final.overall)]]);
       const props=['k1','k2']; arenaTab='king'; kcStart(Math.random()<0.2?'weekly':'career', props[Math.floor(Math.random()*2)]); renderArena(); return {n:-1};
     }
     if(K.revealing){ K.revealing=false; renderArena(); }
     const root=document.getElementById('kfsRoot')||document.getElementById('main'); const t=root.innerText, bad=[];
     for(const re of [/undefined/,/NaN/,/\[object/,/null만원/,/-\d+억 -/,/Infinity/]) if(re.test(t)) bad.push(K.step+' '+re.source+' :: '+(t.match(new RegExp('.{0,30}'+re.source+'.{0,20}'))||[''])[0]);
     const btns=[...root.querySelectorAll(SEL)].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&r.height>0;});
     if(btns.length===0) return {n:0, sig:KP.id+'|'+K.step+'|'+!!K.sealed+'|'+!!K.intro+'|'+!!K.pendingFlip+'|'+!!K.offering};
     const el=btns[Math.floor(Math.random()*btns.length)];
     const bid=document.getElementById('kBid'); if(bid && bid.type==='number') bid.value=String(Math.round((KP.minBid+Math.random()*KP.minBid*0.35)/10)*10);
     el.click(); if(window.K && K.revealing){ K.revealing=false; renderArena(); }
     return {n:btns.length, bad};
   }, SEL);
   if(info.n===0) stuck.set(info.sig,(stuck.get(info.sig)||0)+1);
   (info.bad||[]).forEach(x=>weird.set(x,(weird.get(x)||0)+1));
 }
 const r=await p.evaluate(()=>window._res||[]); res.push(...r);
}
const by={}; res.forEach(([id,m,st,pf,g])=>{const k=id+'/'+st; (by[k]=by[k]||[]).push(pf);});
for(const [k,v] of Object.entries(by)){ const ps=v.filter(x=>x!=null); console.log(k, v.length, ps.length?('avg '+Math.round(ps.reduce((a,b)=>a+b,0)/ps.length)+' min '+Math.min(...ps)+' max '+Math.max(...ps)):''); }
console.log('stuck',[...stuck.entries()]); console.log('weird',[...weird.entries()].slice(0,15)); console.log('errors',[...new Set(errs)].slice(0,15));await b.close();})();
