const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const ids=process.argv.slice(2);
for(const id of ids){
  const r=await p.evaluate(async id=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k2';KC_INTRO=false; kStart(5); K.intro=false; K.timeLeft=9999;
    // 확률 결과라 말이 나올 때까지 몇 번 시도
    for(let t=0;t<12;t++){ K.done={}; K.says=[]; K._nfSay=null; kResearch(id); if(K._nfSay) break; }
    renderArena(); await new Promise(r=>setTimeout(r,300));
    const im=document.querySelector('.nf-sprite'); let w=0; if(im){ await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,3000);}); w=im.naturalWidth; }
    const nm=document.querySelector('.k-stage .vn-name'); return {say:K._nfSay&&K._nfSay.who, sprite:w, name:nm?nm.innerText:''}; }, id);
  ok(r.say && r.sprite>0 && r.name===r.say, `${id}: ${JSON.stringify(r)}`);
  await p.waitForTimeout(3000); await p.screenshot({path:`tnf_${id}.png`});
}
// 다음 단계로 넘어가면 사라지는지
const g=await p.evaluate(()=>{ kBid(Math.round(KP.minBid*1.6/10)*10); K.revealing=false; renderArena(); return !document.querySelector('.nf-sprite') && K.step!=='brief'; }); ok(g,'브리핑이 끝나면 조사 인물 그림은 사라짐');
console.log('errors',errs); await b.close();})();
