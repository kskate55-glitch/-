// 독립 버전: 직접 쓰는 그림 경로(엔딩·후일담·갈림길·장면·자산 등급)가 assets/로 바뀌어 뜨는지
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[],bad=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errs.push(e.message));p.on('response',r=>{if(r.status()>=400) bad.push(r.status()+' '+r.url());});
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8790/');await p.waitForTimeout(1200);
const chk=async(sel)=>p.evaluate(async s=>{const i=document.querySelector(s); if(!i) return 'none'; i.scrollIntoView(); for(let t=0;t<30&&!(i.complete&&i.naturalWidth);t++) await new Promise(r=>setTimeout(r,100)); return i.getAttribute('src').startsWith('assets/') && i.naturalWidth>0;},sel);
ok(await chk('.fr-guide .gmw-scene img')===true,'첫 화면 그림 assets/');
await p.evaluate(()=>{kcRec().fr={full:true}; kcRec().cash=60000; arenaTab='rec'; renderArena();}); await p.waitForTimeout(400);
ok(await chk('.kc-tiers .kc-tier-art')===true,'자산 등급 그림 assets/');
await p.evaluate(()=>{ cpUnlockAll(); lfNew('eunkyung'); const L=lfRec(); L.intro=false; L.epi={eunkyung:1}; K=null; arenaTab='life'; LF_SPOT='wall'; renderArena(); }); await p.waitForTimeout(500);
ok(await chk('.lf-epi-art img')===true,'후일담 그림 assets/');
ok(await p.evaluate(()=>cpEndArt('seoyun','good').startsWith('assets/')),'엔딩 그림 경로 assets/');
console.log('bad',bad); console.log('errors',errs); ok(!bad.length,'404 없음'); await b.close();})();
