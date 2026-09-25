const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:390,height:844}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const dates={moving:[2,10],monsoon:[6,3],vacation:[7,5],chuseok:[8,25],seollal:[1,15],yearend:[11,20],offseason:[0,20]};
for(const [id,[m,d]] of Object.entries(dates)){
  const r=await p.evaluate(([m,d])=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(3); K.intro=false; K.cal0=Date.UTC(2026,m,d); K.day=0; renderArena(); return snNow().P.map(x=>x.id); },[m,d]);
  await p.waitForTimeout(700);
  const w=await p.evaluate(async()=>{ const e=document.querySelector('.kfs-panel .stg-wx'); if(!e) return null; const u=e.style.backgroundImage.match(/url\("?(.*?)"?\)/)[1]; const im=new Image(); im.src=u; await new Promise(r=>{im.onload=r;im.onerror=r;}); return {u:u.slice(-32), w:im.naturalWidth, tag:(e.querySelector('.stg-pd-tag')||{}).innerText||''}; });
  const want=await p.evaluate(id=>SH_ART['pd_'+id],id);
  ok(r.includes(id) && w && w.u===want && w.w>0 && w.tag, `${id}: ${JSON.stringify(r)} → ${w && w.tag}`);
}
await p.evaluate(()=>{ K=null; arenaTab='home'; kcRec().fr={full:true}; renderArena(); }); await p.waitForTimeout(700);
const t=await p.evaluate(async()=>{ const out={}; for(const tab of ['game','chat','sell','guess']){ const e=document.querySelector(`.hub-tile.hub-prac[data-atab="${tab}"] .hub-thumb`); if(!e){ out[tab]=0; continue; } const u=e.style.backgroundImage.match(/url\("?(.*?)"?\)/)[1]; const im=new Image(); im.src=u; await new Promise(r=>{im.onload=r;im.onerror=r;}); out[tab]=im.naturalWidth; } return out; });
ok(Object.values(t).every(v=>v>=768), '연습실 타일 4개 그림 '+JSON.stringify(t));
const el=await p.$('#kcPractice'); if(el){ await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); const bx=await el.boundingBox(); await p.screenshot({path:'tgh_m.png',clip:{x:0,y:bx.y-10,width:390,height:420}}); }
const sw=await p.evaluate(()=>document.documentElement.scrollWidth); ok(sw<=390,'모바일 가로 스크롤 없음 '+sw);
console.log('errors',errs); await b.close();})();
