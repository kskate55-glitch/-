const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const w of [390,1280]){ const p=await b.newPage({viewport:{width:w,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
for(const [mo,label,want] of [[2,'3월(이사철)',true],[4,'5월(시기 없음)',false]]){
  await p.evaluate(mo=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(3); K.intro=false; K.cal0=Date.UTC(2026,mo,10); K.day=0; renderArena(); }, mo);
  await p.waitForTimeout(1600);
  const r=await p.evaluate(async()=>{ const wx=document.querySelector('.kfs-panel .stg-wx'); const det=document.querySelector('.sn-fx'); let img=null;
    if(det){ det.open=true; img=det.querySelector('.sn-pd-art img'); if(img){ img.loading='eager'; await new Promise(r=>{ if(img.complete&&img.naturalWidth) r(); img.onload=r; img.onerror=r; setTimeout(r,4000);}); } }
    const vis=e=>!!e && getComputedStyle(e).display!=='none' && e.getBoundingClientRect().width>0 || (e && e.closest('.kfs-panel') && getComputedStyle(e).display!=='none');
    return {wxPd: !!(wx && wx.classList.contains('stg-pd')), wxBg: wx? wx.style.backgroundImage.slice(0,40):null, wxShown: wx ? getComputedStyle(wx).display!=='none' : false, tag: wx&&wx.querySelector('.stg-pd-tag') ? wx.querySelector('.stg-pd-tag').innerText : '', detImg: img ? img.naturalWidth : 0, detShown: img ? getComputedStyle(img.parentElement).display!=='none' : false}; });
  if(want){
    if(w<900) ok(r.wxPd && r.wxShown && /이사철/.test(r.tag) && !r.detShown, `${w} ${label}: 날씨 칸에 이사철 그림+이름표, 펼침 안엔 중복 안 뜸 ${JSON.stringify(r)}`);
    else ok(r.detImg===1280 && r.detShown, `${w} ${label}: 시기 영향 펼치면 이사철 그림 ${JSON.stringify(r)}`);
  } else ok(!r.wxPd && !r.detImg, `${w} ${label}: 시기 그림 없음 — 날씨 그림 그대로 ${JSON.stringify(r)}`);
  if(want) await p.screenshot({path:`tg1_${w}.png`});
}
await p.close(); }
console.log('errors',errs); await b.close();})();
