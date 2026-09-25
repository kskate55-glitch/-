const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const seen=new Set();
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
for(let k=0;k<6;k++){ const r=await p.evaluate(async k=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(5); K.intro=false;
  let got=null; for(let t=0;t<30;t++){ K.timeLeft=9999; K.rlog=Array(k).fill({id:'x',min:0,travel:0}); K.done=Object.fromEntries(KP.actions.map(a=>[a.id,true])); delete K.done.brokers; K.says=[]; K._nfSay=null; kResearch('brokers'); if(K._nfSay && K.says.length>=3){ got=K._nfSay.who; break;} }
  renderArena(); await new Promise(r=>setTimeout(r,300)); const im=document.querySelector('.nf-sprite'); let w=0; if(im){ await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; setTimeout(r,3000);}); w=im.naturalWidth; } return {got,w}; }, k);
  console.log(JSON.stringify(r)); if(r.w>0) seen.add(r.got); if(r.got==='중개사 C'){ await p.waitForTimeout(2500); await p.screenshot({path:'t_m5.png'}); } }
console.log((seen.has('중개사 C')?'✅':'❌')+' 3곳 방문에서 본 사람: '+[...seen].join(', ')); console.log('errors',errs); await b.close();})();
