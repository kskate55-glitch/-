// 패찰 뒤 "다른 물건" 버튼 → 같은 물건 재시작이 아니라 경매 게시판으로 · 한 화면(조사 행동 버튼 줄이 그림 위)
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const life of [true,false]){const p=await b.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(800);
await p.evaluate((life)=>{localStorage.clear(); cpUnlockAll(); if(life){lfNew('dohyun'); lfRec().intro=false;} else {const c=kcRec(); delete c.life;} arenaTab='king'; kcStart('career'); K.intro=false; K.rivals=[{t:'고수',lo:1.5,hi:1.6,p:1}]; renderArena(); kBid(Math.round(KP.minBid*1.01)); K.revealing=false; renderArena();},life);
await p.waitForTimeout(600);
ok(await p.evaluate(()=>K.step==='lost' && /경매 게시판/.test(document.querySelector('[data-kstart]').innerText)), (life?'거점':'기본')+' 패찰 버튼 = 게시판으로');
await p.click('[data-kstart]'); await p.waitForTimeout(600);
ok(await p.evaluate(()=>K===null && !!document.querySelector('[data-bdnext]')), (life?'거점':'기본')+' 누르면 같은 물건이 아니라 게시판');
await p.close();}
for(const [w,h] of [[1280,800],[1366,768],[1440,900]]){const p=await b.newPage({viewport:{width:w,height:h}});
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(800);
await p.evaluate(()=>{localStorage.clear(); cpUnlockAll(); lfNew('dohyun'); lfRec().intro=false; arenaTab='king'; kcStart('career'); K.intro=false; renderArena();}); await p.waitForTimeout(700);
const m=await p.evaluate(()=>{const P=document.querySelector('.kfs-panel');return {bar:document.querySelectorAll('.kfs-stage .nx-bar > details').length, psh:P.scrollHeight, pch:P.clientHeight}});
ok(m.bar>=3, w+' 조사 행동 버튼 줄이 그림 위 ('+m.bar+')'); ok(m.psh<=m.pch+2, w+'x'+h+' 오른쪽 패널 스크롤 없음 ('+m.psh+'/'+m.pch+')');
await p.close();}
console.log('errors',errs); await b.close();})();
