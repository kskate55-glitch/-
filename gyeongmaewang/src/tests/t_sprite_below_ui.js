const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const bad=[];
for(const vp of [{width:1280,height:900},{width:900,height:900},{width:1440,height:800},{width:1920,height:1080},{width:1100,height:700},{width:390,height:844}]){
const p=await b.newPage({viewport:vp});
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const res=await p.evaluate(async()=>{ const out=[]; const R=e=>e.getBoundingClientRect();
 const meas=(tag)=>{ const st=document.querySelector('.k-stage'); if(!st) return; const box=st.querySelector('.vn-box'); const tabs=[...document.querySelectorAll('#kfsRoot [class*=kfs-tab],#kfsRoot .kr-tabs,#kfsRoot .kfs-acts')].filter(e=>e.offsetParent);
   const cover=Math.max(box?R(box).bottom:0,...tabs.map(t=>R(t).bottom));
   document.querySelectorAll('.k-stage .vn-sprite').forEach(s=>{ const r=R(s), sr=R(st); out.push({tag, top:Math.round(r.top), cover:Math.round(cover), bottom:Math.round(sr.bottom-r.bottom), h:Math.round(r.height)}); }); };
 localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k2';KC_INTRO=false; kStart(5); K.intro=false; K.timeLeft=9999;
 for(let t=0;t<12;t++){ K.done={}; K.says=[]; K._nfSay=null; kResearch('kim'); if(K._nfSay) break; }
 renderArena(); await new Promise(r=>setTimeout(r,3500)); meas('brief');
 K._nfSay=null; renderArena(); await new Promise(r=>setTimeout(r,800)); meas('brief-plain');
 kBid(Math.round(KP.minBid*1.6/10)*10); K.revealing=false; renderArena(); await new Promise(r=>setTimeout(r,800)); meas(K.step);
 if(K.step==='won'){ K.step='move'; renderArena(); await new Promise(r=>setTimeout(r,800)); meas('move'); }
 K.step='defect'; renderArena(); await new Promise(r=>setTimeout(r,800)); meas('defect');
 return out;});
for(const r of res){ const okk=r.top>=r.cover-5; if(!okk) bad.push(vp.width+' '+JSON.stringify(r)); console.log((okk?'✅':'❌'),vp.width+'x'+vp.height,JSON.stringify(r)); }
await p.screenshot({path:`m_spr2_${vp.width}.png`}); await p.close();}
console.log('bad',bad.length); await b.close();})();
