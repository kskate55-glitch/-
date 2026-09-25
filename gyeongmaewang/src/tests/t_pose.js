const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); p.on('pageerror',e=>errs.push(w+' '+e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
 for(const id of ['seoyun','dohyun','mijeong','jaehoon','taesik','eunkyung']) for(const hi of [true,false]){
  const r=await p.evaluate(async ([id,hi])=>{ localStorage.clear(); try{cpUnlockAll()}catch(e){} lfNew(id); lfRec().intro=false; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='k1'; KC_INTRO=false; kStart(5); K.intro=false; K.timeLeft=9999;
    kBid(hi ? Math.round(KP.minBid*1.8/10)*10 : KP.minBid); K.revealing=false; renderArena(); await new Promise(r=>setTimeout(r,500));
    const im=document.querySelector('.lfv-pose'); let nw=0; if(im){ await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; setTimeout(r,3000);}); nw=im.naturalWidth; }
    const pl=document.querySelector('.k-stage .vn-player'), s=document.querySelector('.lfv-say.stage'); const box=document.querySelector('.k-stage .vn-box');
    const ir=im&&im.getBoundingClientRect(), br=box&&box.getBoundingClientRect(), sr=s&&s.getBoundingClientRect();
    return {step:K.step, pose:nw, playerHidden: !pl || getComputedStyle(pl).display==='none', say:s&&s.innerText, headOk: !ir || ir.top >= br.bottom-5, sayOk: !sr || (sr.top>=br.bottom-5 && sr.right<=innerWidth)}; }, [id,hi]);
  const want = id!=='eunkyung';
  ok((want ? r.pose>0 && r.playerHidden : r.pose===0 && !r.playerHidden) && r.say && r.headOk && r.sayOk, `${w} ${id} ${r.step}: ${JSON.stringify(r)}`);
  if(id==='jaehoon'||id==='taesik'){ await p.waitForTimeout(2500); await p.screenshot({path:`t_pose_${id}_${r.step}_${w}.png`}); }
 }
 await p.close();}
console.log('errors',errs); await b.close();})();
