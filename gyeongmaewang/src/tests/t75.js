// 후일담 그림 — 열린 후일담에만, 그림 있는 캐릭터만
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(800);
for(const [ch,id] of [['eunkyung','6afe731d'],['taesik','6a6847e0'],['seoyun',null]]){
  await p.evaluate(ch=>{ localStorage.clear(); cpUnlockAll(); lfNew(ch); const L=lfRec(); L.intro=false; K=null; arenaTab='life'; LF_SPOT='wall'; renderArena(); }, ch); await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!document.querySelector('.lf-epi-art')), w+' '+ch+' 후일담 잠겨 있으면 그림 없음');
  await p.evaluate(ch=>{ const L=lfRec(); L.epi={[ch]:1}; renderArena(); }, ch); await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{const i=document.querySelector('.lf-epi-art img'); return i?{src:i.src, ok:i.complete&&i.naturalWidth>0}:null;});
  ok(id ? (r && r.src.includes(id) && r.ok) : !r, w+' '+ch+(id?' 후일담 열리면 그림 표시':' 그림 없는 캐릭터는 글만'));
}
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close();}
console.log('errors',errs); await b.close();})();
