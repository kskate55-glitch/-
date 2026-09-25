const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const w of [390,1280]){ const p=await b.newPage({viewport:{width:w,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(()=>{ localStorage.clear(); K=null; arenaTab='home'; kcRec().fr={full:true}; renderArena(); }); await p.waitForTimeout(600);
const t=await p.evaluate(async()=>{ const out={}; for(const tab of ['story','dexall','rec']){ const e=document.querySelector(`.hub-tile.hub-prac[data-atab="${tab}"] .hub-thumb`); if(!e){ out[tab]=0; continue;} const u=e.style.backgroundImage.match(/url\("?(.*?)"?\)/)[1]; const im=new Image(); im.src=u; await new Promise(r=>{im.onload=r;im.onerror=r;}); out[tab]=im.naturalWidth; } return out; });
ok(Object.values(t).every(v=>v===816), w+' 홈 큰 타일 3개 그림 '+JSON.stringify(t));
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
if(w===390){ const el=await p.$('.hub-tile[data-atab="story"]'); await el.scrollIntoViewIfNeeded(); const bx=await el.boundingBox(); await p.screenshot({path:'tij_home.png',clip:{x:0,y:bx.y-8,width:390,height:bx.height+16}}); }
// 그때 그 물건 카드
for(const [profit,tone,want] of [[3000,'regret',true],[-2000,'relief',true]]){
  const r=await p.evaluate(async([profit])=>{ document.querySelectorAll('#dpCard').forEach(x=>x.remove()); const D=dpRec(); D.after=[{kind:'lost',title:'테스트빌라',my:10000,win:10100,gap:100,sale:15000,repair:500,big:false,surprise:[],months:4,profit,due:0,dueT:null,at:Date.now()}]; K=null; dpAfterDeliver();
    const card=document.getElementById('dpCard'); if(!card) return {card:false}; const im=card.querySelector('.gmw-scene img'); let nw=0; if(im){ im.loading='eager'; await new Promise(r=>{ if(im.complete&&im.naturalWidth) r(); im.onload=r; im.onerror=r; setTimeout(r,4000);}); nw=im.naturalWidth; }
    return {card:true, tone:card.querySelector('.dp-news').className, nw}; },[profit]);
  ok(r.card && (want ? r.nw>=816 : r.nw===0), `${w} 그때 그 물건(${tone}) → ${tone==='regret'?'J1 그림':'J2 그림'} ${JSON.stringify(r)}`);
  if(want && w===390){ await p.waitForTimeout(600); await p.screenshot({path:'tij_card.png'}); }
}
await p.close(); }
console.log('errors',errs); await b.close();})();
