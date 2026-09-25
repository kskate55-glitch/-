const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const vp of [{width:1280,height:900},{width:390,height:844}]){
const p=await b.newPage({viewport:vp}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const tag=vp.width;
const r=await p.evaluate(async()=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(5); K.intro=false; K.timeLeft=9999;
  for(let t=0;t<15;t++){ K.done={site:true,out:true,look:true}; K.says=[]; K.found={}; K._nfSay=null; kResearch('meter'); if(K._nfSay) break; }
  renderArena(); await new Promise(r=>setTimeout(r,300));
  const im=document.querySelector('.nf-sprite'); let w=0; if(im){ await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,3000);}); w=im.naturalWidth; }
  const nm=document.querySelector('.k-stage .vn-name'); return {say:K._nfSay&&K._nfSay.who, found:!!K.found.elec, sprite:w, name:nm?nm.innerText:''}; });
ok(r.say==='전기기사 박기사' && r.found && r.sprite>0 && r.name===r.say, `${tag} 조사: ${JSON.stringify(r)}`);
await p.waitForTimeout(2500); await p.screenshot({path:`t_l6_brief_${tag}.png`});
for(const known of [true,false]){
 const d=await p.evaluate(async known=>{ K.found.elec=known; K._nfSay=null; kMoved(); renderArena(); await new Promise(r=>setTimeout(r,300));
  const im=document.querySelector('.nf-sprite'); let w=0; if(im){ await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,3000);}); w=im.naturalWidth; }
  const box=document.querySelector('.k-stage .nf-box'); return {step:K.step, sprite:w, src:im&&im.getAttribute('src'), text:box?box.innerText:''}; }, known);
 ok(d.step==='defect' && d.sprite>0 && /박기사/.test(d.text) && (known? /말씀드린/.test(d.text): /몰랐으면/.test(d.text)), `${tag} 하자(${known?'알았음':'몰랐음'}): ${d.text.slice(0,50)}`);
 await p.waitForTimeout(1500); await p.screenshot({path:`t_l6_defect_${known}_${tag}.png`});
}
await p.close();}
console.log('errors',errs); await b.close();})();
