const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h] of [[1280,800],[390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const r=await p.evaluate(()=>{ arenaTab="chat"; CH.pid=null; if(typeof renderArena==="function"){ const box=document.querySelector('#arenaRoot')||document.body; } 
  const html = document.createElement('div'); return null; });
// 목록 HTML을 직접 만들어 검사
const res=await p.evaluate(()=>{ const occ=chatOrder(allPersonas().filter(P=>roleOf(P)==="occupant"),"occupant");
  const ids=occ.map(P=>P.id); const idx=ids.map(id=>STAGES.indexOf(id)).filter(i=>i>=0);
  const sorted=idx.every((v,i)=>i===0||v>idx[i-1]); const first=ids[0], stagesFirst=ids.slice(0,STAGES.length).every(id=>STAGES.includes(id));
  const stars=occ.map(chatStars); const mono=stars.slice(0,STAGES.length).every((v,i,a)=>i===0||v>=a[i-1]);
  return {n:ids.length, first, sorted, stagesFirst, mono, s:stars.join('')}; });
console.log(w, JSON.stringify(res)); if(!(res.sorted&&res.stagesFirst&&res.mono&&res.first==="p_coop")) errs.push('order '+w);
// 실제 화면 렌더
await p.evaluate(()=>{ sampleFn = async()=>({text:""}); arenaTab="chat"; CH.pid=null; renderArena(); });
await p.waitForTimeout(300);
const vis=await p.evaluate(()=>{ const cards=[...document.querySelectorAll('.ag-card[data-chatwith]')]; const d=cards.map(c=>c.querySelector('.ag-diff')); const withD=d.filter(Boolean);
  const first=withD[0]; if(!first) return {cards:cards.length,withD:0};
  const r=first.getBoundingClientRect(), cr=first.closest('.ag-card').getBoundingClientRect(), nm=first.closest('.ag-card').querySelector('.ag-nm').getBoundingClientRect();
  const overlap=!(r.bottom<=nm.top||r.top>=nm.bottom||r.right<=nm.left||r.left>=nm.right);
  return {cards:cards.length, withD:withD.length, txt:first.textContent, inside:r.right<=cr.right+1&&r.left>=cr.left, overlap}; });
console.log(w, JSON.stringify(vis)); if(!vis.withD||!vis.inside) errs.push('vis '+w);
const el=await p.$('.ag-card[data-chatwith]'); if(el){ await el.scrollIntoViewIfNeeded(); await p.screenshot({path:`t_chatorder_${w}.png`}); }
}
console.log('errors',errs); await b.close();})();
