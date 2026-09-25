const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(w+' '+e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(800);
for(const [prop,bi] of [['k1',7]]){
 const r=await p.evaluate(async ([prop,bi])=>{ localStorage.clear(); arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=prop; KC_INTRO=false; kStart(5); K.intro=false;
   K.step='sell'; K.sale={list:16000, trueP:15600, weeks:2, offer:{amt:15500, buyer:K_BUYERS[bi]}, done:false}; K.repair=K.repair||{t:"B. 가성비",id:"part"}; renderArena(); await new Promise(r=>setTimeout(r,400));
   const im=document.querySelector('.by-sprite'); let nw=0; if(im){ await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; setTimeout(r,3000);}); nw=im.naturalWidth; }
   const nm=document.querySelector('.k-stage .vn-name'), box=document.querySelector('.k-stage .vn-box'); const ir=im&&im.getBoundingClientRect(), br=box.getBoundingClientRect();
   return {t:K_BUYERS[bi].t, sprite:nw, name:nm&&nm.innerText, headOk:!ir||ir.top>=br.bottom-5}; }, [prop,bi]);
 const want = true;
 ok((want ? r.sprite>0 && r.name==='매수자 · '+r.t : r.sprite===0) && r.headOk, `${w} ${prop} ${JSON.stringify(r)}`);
 if(bi===7){ await p.waitForTimeout(2500); await p.screenshot({path:`t_wheel_${prop}_${w}.png`}); }
}
const rv=await p.evaluate(async()=>{ localStorage.clear(); arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='k1'; KC_INTRO=false; kStart(5); K.intro=false; kBid(KP.minBid); K.revealing=true; K.revealMs=60000; renderArena(); await new Promise(r=>setTimeout(r,500));
  const im=document.querySelector('.ke-clerk'); if(im) await new Promise(r=>{ if(im.complete) r(); im.onload=r; setTimeout(r,3000);}); const t=document.querySelector('.ke-open-in'); const ir=im&&im.getBoundingClientRect(), tr=t&&t.getBoundingClientRect();
  return {clerk:im?im.naturalWidth:0, textVisible: !!tr && tr.height>0}; });
ok(rv.clerk>0 && rv.textVisible, w+' 개찰 화면 법원 직원 '+JSON.stringify(rv)); await p.waitForTimeout(5000); await p.screenshot({path:`t_clerk_${w}.png`});
await p.close();}
console.log('errors',errs); await b.close();})();
