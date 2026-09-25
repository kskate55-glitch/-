const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); p.on('pageerror',e=>errs.push(w+' '+e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
 for(const [ch,hi] of [['dohyun',false],['dohyun',true],[null,false],['taesik',2]]){
  const r=await p.evaluate(async ([ch,hi])=>{ localStorage.clear(); try{cpUnlockAll()}catch(e){} if(ch){ lfNew(ch); lfRec().intro=false; } arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='k1'; KC_INTRO=false; kStart(5); K.intro=false; K.timeLeft=9999;
    K.rivals= hi===2 ? [{t:"이사철 실수요자",lo:1.10,hi:1.16},{t:"겉 마진 보고 온 투자자",lo:1.06,hi:1.12},{t:"감정가 맹신러",lo:1.0,hi:1.01}] : [{t:"지역 실수요자",lo:1.10,hi:1.16},{t:"전문 투자자",lo:1.06,hi:1.12},{t:"감정가 맹신러",lo:1.0,hi:1.01}];
    kBid(hi===true ? Math.round(KP.minBid*1.8/10)*10 : KP.minBid); K.revealing=false; renderArena(); await new Promise(r=>setTimeout(r,600));
    const faces=[...document.querySelectorAll('.k-bids .rv-face img')]; await Promise.all(faces.map(i=>new Promise(r=>{ if(i.complete) r(); i.onload=r; i.onerror=r; setTimeout(r,3000);})));
    const sp=document.querySelector('.rv-sprite'), tag=document.querySelector('.rv-tag'), say=document.querySelector('.lfv-say'), box=document.querySelector('.k-stage .vn-box');
    if(sp) await new Promise(r=>{ if(sp.complete) r(); sp.onload=r; setTimeout(r,3000);});
    const R=e=>e&&e.getBoundingClientRect(); const sr=R(sp), yr=R(say), br=R(box);
    const overlap = sr&&yr ? !(yr.bottom<=sr.top+sr.height*0.12 || yr.right<=sr.left+sr.width*0.25 || yr.left>=sr.right-sr.width*0.25) : false;
    return {step:K.step, faces:faces.filter(i=>i.naturalWidth>0).length, rows:document.querySelectorAll('.k-bids li').length, tag:tag&&tag.innerText, sprite:sp?sp.naturalWidth:0, headOk: !sr || sr.top>=br.bottom-5, overlap, inView: !sr || sr.right<=innerWidth+2}; }, [ch,hi]);
  const nm = hi===2 ? '이사철 실수요자' : '지역 실수요자'; const exp = new RegExp((r.step==='lost'?'1등':'2등')+' · '+nm);
  ok(r.faces===2 && exp.test(r.tag||'') && r.sprite>0 && r.headOk && !r.overlap && r.inView, `${w} ${ch||'기본'} ${r.step}: ${JSON.stringify(r)}`);
  await p.waitForTimeout(2500); await p.screenshot({path:`t_rival_${ch||'base'}_${r.step}_${w}.png`});
 }
 await p.close();}
console.log('errors',errs); await b.close();})();
