// 옛 주인공(노란 머리)이 더 이상 안 나오는지 — 인생 없이 시작하면 서윤, 그림 없는 인생은 주인공 없음
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 const OLD = await p.evaluate(()=>Object.entries(ART_DEFAULT).filter(([k])=>/^npc_player/.test(k)).map(([,v])=>v));
 const ART = await p.evaluate(()=>LF_CHAR_ART);
 const imgs = () => p.evaluate(()=>[...document.querySelectorAll('.vn-player, .lf-me, .vn-face.me img')].map(i=>i.getAttribute('src')));
 const hasOld = srcs => srcs.some(s => OLD.some(o => s && s.includes(o)));
 await p.evaluate(()=>{ localStorage.clear(); const c=kcRec(); delete c.life; arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); }); await p.waitForTimeout(500);
 let s = await imgs(); ok(s.length && !hasOld(s) && s.every(x=>x.includes(ART.seoyun.back)||Object.values(ART.seoyun.face).some(f=>x.includes(f))), w+' 인생 없이 시작 → 서윤 뒷모습');
 await p.evaluate(()=>{ kBid(Math.round(KP.minBid*1.3)); K.revealing=false; renderArena(); }); await p.waitForTimeout(400);
 s = await imgs(); ok(!hasOld(s), w+' 낙찰 얼굴도 옛 주인공 아님');
 await p.evaluate(()=>{ cpUnlockAll(); lfNew('taesik'); lfRec().intro=false; arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); }); await p.waitForTimeout(500);
 s = await imgs(); ok(!hasOld(s), w+' 그림 없는 은경 → 옛 주인공 안 나옴 ('+s.length+'장)');
 await p.evaluate(()=>{ lfNew('dohyun'); lfRec().intro=false; arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); }); await p.waitForTimeout(500);
 s = await imgs(); ok(s.length && s.every(x=>x.includes(ART.dohyun.back)), w+' 도현은 도현 뒷모습');
 await p.close(); }
console.log('errors',errs); await b.close();})();
