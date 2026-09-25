const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const cases=[["k1","call3",/중개사 [AB]/],["k1","mgmtcall",/관리실/],["k1","mgmt",/관리인/],["k1","brokers",/중개사 [AB]/],["k2","call3",/중개사 [AB]/],["k2","mgmt",/관리인/],["k2","brokers",/중개사|박 중개사/]];
for(const [prop,id,re] of cases){
  const r=await p.evaluate(async ([prop,id])=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT=prop;KC_INTRO=false; kStart(5); K.intro=false;
    K.rlog=K.rlog||[]; K.rlog.push(...Array(window._rl=(window._rl||0)+1).fill({id:'x',min:0,travel:0})); for(let t=0;t<20;t++){ K.timeLeft=9999; K.done=Object.fromEntries(KP.actions.map(a=>[a.id,true])); delete K.done[id]; K.says=[]; K._nfSay=null; kResearch(id); if(K._nfSay) break; }
    renderArena(); await new Promise(r=>setTimeout(r,300));
    const im=document.querySelector('.nf-sprite'); let w=0; if(im){ await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,3000);}); w=im.naturalWidth; }
    const nm=document.querySelector('.k-stage .vn-name'); return {say:K._nfSay&&K._nfSay.who, sprite:w, name:nm?nm.innerText:''}; }, [prop,id]);
  ok(r.say && re.test(r.say) && r.sprite>0 && r.name===r.say, `${prop} ${id}: ${JSON.stringify(r)}`);
  await p.waitForTimeout(2500); await p.screenshot({path:`t_m_${prop}_${id}.png`});
}
console.log('errors',errs); await b.close();})();
