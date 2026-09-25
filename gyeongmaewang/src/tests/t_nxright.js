const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const [w,h] of [[1280,800],[1600,900],[390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(async()=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(5); K.intro=false; kResearch('trade'); kResearch('call1'); renderArena(); });
await p.waitForTimeout(700);
const r=await p.evaluate(()=>{ const st=document.querySelector('#kfsRoot .kfs-stage').getBoundingClientRect(); const bar=document.querySelector('#kfsRoot .nx-bar'); const br=bar&&bar.getBoundingClientRect();
  const tab=document.querySelector('.nx-notetab'); const inBar=!!document.querySelector('.nx-bar .nx-note');
  return {stageW:Math.round(st.width), barL:br&&Math.round(br.left-st.left), barR:br&&Math.round(st.right-br.right), tab:tab&&tab.innerText, inBar, mob:!!document.querySelector('.nx-dock.mob')}; });
console.log(w, JSON.stringify(r));
if(w>640){ ok(r.barL > r.barR*0.5 && r.barL > 200, w+' 조사 버튼 줄이 오른쪽에(입찰표 바로 왼쪽)'); ok(r.tab && !r.inBar, w+' 조사 노트는 탭으로 (버튼 줄에서 빠짐)'); }
else ok(r.mob, w+' 폰은 기존 한 줄 그대로');
// 메뉴 열기
await p.evaluate(()=>{ const s=[...document.querySelectorAll('.nx-bar > details > summary')].find(x=>/현장/.test(x.textContent)); s&&s.click(); });
await p.waitForTimeout(400);
const pop=await p.evaluate(()=>{ const q=document.querySelector('.nx-bar > details[open] .nx-pop'); if(!q) return null; const r=q.getBoundingClientRect(), st=document.querySelector('#kfsRoot .kfs-stage').getBoundingClientRect(); const pl=document.querySelector('#kfsRoot .vn-player'); const plr=pl&&pl.getBoundingClientRect(); return {L:Math.round(r.left-st.left), R:Math.round(r.right-st.left), inView:r.left>=0&&r.right<=innerWidth, playerR:plr&&Math.round(plr.right-st.left)}; });
console.log(w,'pop',JSON.stringify(pop));
if(w>640) ok(pop && pop.inView && (!pop.playerR || pop.L > pop.playerR - 40), w+' 목록이 주인공을 가리지 않음');
await p.screenshot({path:`t_nx_${w}_menu.png`});
if(w>640){
  await p.evaluate(()=>document.querySelector('.nx-x')&&document.querySelector('.nx-x').click());
  await p.click('.nx-notetab'); await p.waitForTimeout(500);
  const n=await p.evaluate(()=>{ const q=document.querySelector('.nx-notepaper'); return q && !q.hidden ? {li:q.querySelectorAll('li').length, vis:q.getBoundingClientRect().width>100} : null; });
  ok(n && n.li>=2 && n.vis, w+' 노트 탭 누르면 공책이 열림 '+JSON.stringify(n));
  await p.screenshot({path:`t_nx_${w}_note.png`});
  await p.click('.nx-notepaper .stg-x'); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>{ const q=document.querySelector('.nx-notepaper'); return !q || q.hidden; }), w+' ✕로 닫힘');
}
}
console.log('errors',errs); await b.close();})();
