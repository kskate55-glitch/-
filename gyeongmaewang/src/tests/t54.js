const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[], weird=new Set(), stuck=new Set(); const st={clicks:0, cases:0, ends:0};
const SEL='[data-lfspot],[data-lfdo]:not([disabled]),[data-lfbuy]:not([disabled]),[data-lfnext],[data-bdplay]:not([disabled]),[data-bdread],[data-bddecoy]:not([disabled]),[data-bdwait]:not([disabled]),[data-bdwatch],[data-bdnext]:not([disabled]),[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kintro],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2],.lf-after [data-atab="life"]';
for(const [w,h,ch,seed] of [[1280,800,'taesik',3],[390,844,'seoyun',4],[1280,800,'eunkyung',5],[390,844,'mijeong',6]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(ch+' '+e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(500);
 await p.evaluate(([ch,s])=>{ let x=s; Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647;}; lfNew(ch); lfRec().intro=false; hubRec().cleared['king:k1']=1; arenaTab='life'; renderArena(); }, [ch,seed]);
 for(let i=0;i<1200;i++){
  const r=await p.evaluate((SEL)=>{
    if(typeof K!=='undefined' && K && K.revealing){ K.revealing=false; renderArena(); }
    if(arenaTab==='king' && K && (K.step==='result'||K.step==='lost')){ const e=document.querySelector('.lf-after [data-atab="life"]'); if(e){ e.click(); return {end:1}; } }
    if(arenaTab!=='king' && arenaTab!=='life'){ arenaTab='life'; renderArena(); }
    const root=document.getElementById('kfsRoot')||document.getElementById('main'), t=root.innerText, bad=[];
    for(const re of [/undefined/,/NaN/,/\[object/,/Infinity/]) if(re.test(t)) bad.push(arenaTab+' '+(t.match(new RegExp('.{0,40}'+re.source+'.{0,20}'))||[''])[0]);
    const btns=[...root.querySelectorAll(SEL)].filter(e=>{const q=e.getBoundingClientRect(); return q.width>0&&q.height>0;});
    if(!btns.length) return {bad, stuck:arenaTab+'|'+(typeof K!=='undefined'&&K?K.step:'')+'|'+t.slice(0,80)};
    const bid=document.getElementById('kBid'); if(bid) bid.value=String(Math.round((KP.minBid+Math.random()*KP.minBid*0.3)/10)*10);
    const pl=btns.filter(e=>e.matches('[data-bdplay],[data-lfspot="board"]')); const el=(arenaTab==='life' && pl.length && Math.random()<0.3) ? pl[pl.length-1] : btns[Math.floor(Math.random()*btns.length)]; const a=[...el.attributes].map(a=>a.name).find(n=>n.startsWith('data-'));
    el.click(); return {bad, a};
  }, SEL);
  (r.bad||[]).forEach(x=>weird.add(x)); if(r.stuck) stuck.add(r.stuck); if(r.a) st.clicks++; if(r.a==='data-bdplay') st.cases++; if(r.end) st.ends++;
 }
 console.log(ch, await p.evaluate(()=>({clock:lfClock(), cash:kcRec().cash, sta:Math.round(lfRec().sta), stress:lfRec().stress, st:lfRec().st, titles:Object.keys(lfRec().titles), eq:Object.keys(lfRec().equip), rel:lfRec().rel})));
 await p.close();
}
console.log(st); console.log('weird',[...weird].slice(0,8)); console.log('stuck',[...stuck].slice(0,8)); console.log('errors',errs.slice(0,8)); await b.close();})();
