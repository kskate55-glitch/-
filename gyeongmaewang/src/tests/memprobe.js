// 긴 세션(한 페이지에서 사건 여러 개) 동안 메모리·타이머·오디오 노드·리스너가 계속 늘어나는지 본다
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--enable-precise-memory-info','--js-flags=--expose-gc','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ window.__iv=new Set(); const si=window.setInterval, ci=window.clearInterval; window.setInterval=function(f,t,...a){ const id=si(f,t,...a); window.__iv.add(id); return id; }; window.clearInterval=function(id){ window.__iv.delete(id); return ci(id); };
  window.__raf=0; const ra=window.requestAnimationFrame; window.requestAnimationFrame=function(f){ window.__raf++; return ra(f); };
  window.__nodes=0; const AN=window.AudioNode&&AudioNode.prototype; if(AN){ const c=AN.connect; AN.connect=function(){ window.__nodes++; return c.apply(this,arguments); }; }
  window.__lst=0; const ae=EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener=function(){ if(this===document||this===window) window.__lst++; return ae.apply(this,arguments); }; });
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(1000);
const stat=async tag=>{ const r=await p.evaluate(()=>{ if(window.gc) gc(); return {heap:Math.round(performance.memory.usedJSHeapSize/1048576), dom:document.getElementsByTagName('*').length, iv:window.__iv.size, lst:window.__lst, nodes:window.__nodes, ls:Math.round(JSON.stringify(localStorage).length/1024)}; }); r.raf0=await p.evaluate(()=>window.__raf); await p.waitForTimeout(1000); r.rafps=await p.evaluate(()=>window.__raf)-r.raf0; delete r.raf0; console.log(tag.padEnd(10), JSON.stringify(r)); };
await p.evaluate(()=>{ window.MT_SKIP_TALE=true; window.LN_FAST=true; });
await stat('start');
const ids=await p.evaluate(()=>Object.keys(K_PROPS));
for(let round=0; round<3; round++) for(const id of ids.slice(0,12)){
  await p.evaluate(id=>{ kcRec().fr={full:true}; kcRec().cash=500000; page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false; K_PROP_NEXT=id; kStart(9); K.intro=false; renderArena(); },id);
  for(const a of await p.evaluate(()=>(KP.actions||[]).map(a=>a.id))) await p.evaluate(a=>{ const e=document.querySelector(`[data-kres="${a}"]`); if(e) e.click(); },a);
  await p.evaluate(()=>{ let t=0,b=Math.round(KP.minBid*1.1); while(t++<12){ kBid(b); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; b=Math.round(b*1.08); } K.loan=K.loan||{none:true}; renderArena(); });
  // 명도: 버튼을 순서대로 눌러 끝낼 때까지
  for(let i=0;i<60;i++){ const st=await p.evaluate(()=>K.step); if(st!=='move') break; await p.evaluate(()=>{ const pref=['[data-kmove^="sp_bridge"]','[data-kmove^="mb"]','[data-kmove="listen"]','[data-kmove="date"]','[data-kmove="order"]','[data-kwait]','[data-kmove]']; for(const s of pref){ const e=[...document.querySelectorAll(s)].find(x=>!x.disabled&&x.getClientRects().length); if(e){ e.click(); return; } } if(typeof MT!=='undefined'&&MT) mtClose(); }); await p.waitForTimeout(40); }
  await p.evaluate(()=>{ for(let i=0;i<20 && K.step!=='result';i++){ const e=document.querySelector('[data-krep]')||document.querySelector('[data-klist]')||document.querySelector('[data-ksale="accept"]')||document.querySelector('[data-ksale]'); if(!e) break; e.click(); } });
  await p.waitForTimeout(150);
}
await stat('after36');
await p.evaluate(()=>{ arenaTab='home'; renderArena(); }); await p.waitForTimeout(3000); await stat('idle-home');
console.log('errors', errs.length, errs.slice(0,5));
await b.close(); })();
