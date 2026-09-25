const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[1000,760],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html'); await p.waitForTimeout(600);
await p.evaluate(()=>{localStorage.clear();kcRec().fr={full:true};page='arena';arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false;kStart(3);K.intro=false;renderArena();}); await p.waitForTimeout(3500);
await p.evaluate(()=>{ kResearch('docs'); kResearch('neigh'); renderArena(); }); await p.waitForTimeout(700);
if(w===390){ ok(true,'390 모바일은 노트가 바 안에 — 생략'); await p.close(); continue; }
await p.click('.nx-notetab'); await p.waitForTimeout(500);
await p.click('.stg-tab[data-stg="file"]'); await p.waitForTimeout(600);
const vis=await p.evaluate(()=>{ const f=document.querySelector('.stg-file'); if(!f||f.hidden) return 'hidden'; const r=f.getBoundingClientRect(); const el=document.elementFromPoint(r.left+r.width/2, r.top+80); return f.contains(el)?'top':'covered by '+(el&&el.className); });
ok(vis==='top', w+' 노트 연 뒤 사건 파일 누르면 파일이 맨 앞 ('+vis+')');
if(w===1280){ const both=await p.evaluate(()=>{ const n=document.querySelector('.nx-notepaper'); return n && !n.hidden; }); ok(both, '1280 넓은 화면: 노트도 옆에 같이 떠 있음'); await p.screenshot({path:'note_both.png'}); }
await p.close(); }
console.log('errors',errs); await b.close();})();
