const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); p.on('pageerror',e=>errs.push(w+' '+e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
 const seen={};
 for(const id of ['seoyun','dohyun','mijeong','jaehoon','eunkyung','taesik']){
  const r=await p.evaluate(async id=>{ localStorage.clear(); try{cpUnlockAll()}catch(e){} lfNew(id); const L=lfRec(); L.intro=false; K=null; arenaTab='life'; LF_SPOT=LFV_SIG_SPOT[id]; renderArena(); await new Promise(r=>setTimeout(r,500));
    const s=document.querySelector('.lfv-say.room'), sig=document.querySelector('[data-lfdo="sig_'+id+'"]');
    const r1=s&&s.getBoundingClientRect(); let grew=null; if(sig){ const before=JSON.stringify(L.st)+JSON.stringify(L.rel)+JSON.stringify(L.xp||{}); sig.click(); await new Promise(r=>setTimeout(r,300)); grew = L.t>0; }
    return {rect:r1&&[r1.top|0,r1.left|0,r1.right|0,r1.bottom|0],say:s&&s.innerText, sig:!!sig, grew, vis: r1? (r1.top>40 && r1.left>=0 && r1.right<=innerWidth+1):false}; }, id);
  ok(r.say && r.sig && r.grew && r.vis, `${w} ${id}: "${r.say}" ${JSON.stringify(r)}`);
  seen[r.say]=1;
  if(id==='mijeong'||id==='taesik'){ await p.evaluate(()=>{LF_SPOT='rest';renderArena();}); await p.waitForTimeout(700); await p.screenshot({path:`t_voice_${id}_${w}.png`}); }
 }
 ok(Object.keys(seen).length===6, w+' 여섯 명 대사가 다 다름');
 // 경매 무대: 낙찰 반응
 const k=await p.evaluate(async()=>{ localStorage.clear(); try{cpUnlockAll()}catch(e){} lfNew('jaehoon'); lfRec().intro=false; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='k1'; KC_INTRO=false; kStart(5); K.intro=false; K.timeLeft=9999; kBid(Math.round(KP.minBid*1.8/10)*10); K.revealing=false; renderArena(); await new Promise(r=>setTimeout(r,500)); const s=document.querySelector('.lfv-say.stage'); return s&&s.innerText; });
 ok(!!k && LF_VOICE_OK(k), w+' 낙찰 반응: '+k);
 await p.waitForTimeout(2500); await p.screenshot({path:`t_voice_won_${w}.png`});
 await p.close();}
console.log('errors',errs); await b.close();})();
function LF_VOICE_OK(t){ return /뜯어볼|수리비/.test(t); }
