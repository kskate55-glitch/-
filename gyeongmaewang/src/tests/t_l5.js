const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const vp of [{width:1280,height:900},{width:390,height:844}]){
const p=await b.newPage({viewport:vp}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
for(const early of [true,false]){
 const d=await p.evaluate(async early=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k2';KC_INTRO=false; kStart(7); K.intro=false;
  K.k2.leakEarly=early; K.found.leak=early; K.step='defect'; renderArena(); await new Promise(r=>setTimeout(r,300));
  const im=document.querySelector('.nf-sprite'); let w=0; if(im){ await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,3000);}); w=im.naturalWidth; }
  const box=document.querySelector('.k-stage .nf-box'); return {sprite:w, text:box?box.innerText:'', card:!!document.querySelector('.k-card')}; }, early);
 ok(d.sprite>0 && d.card && /박실장/.test(d.text) && (early?/들으신/.test(d.text):/더 뜯지/.test(d.text)), `${vp.width} ${early?'알았음':'몰랐음'}: ${d.text.replace(/\n/g,' ').slice(0,60)}`);
 await p.waitForTimeout(2000); await p.screenshot({path:`t_l5_${early}_${vp.width}.png`});
}
await p.close();}
console.log('errors',errs); await b.close();})();
