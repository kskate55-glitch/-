const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
for(const [w,h] of [[1280,800],[390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(w+' pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const scan=async(tag)=>{ const r=await p.evaluate(()=>{ const t=document.body.innerText; const m=t.match(/undefined|NaN|\[object|Infinity/); return {bad:m?t.slice(Math.max(0,m.index-40),m.index+30):null, sx:document.documentElement.scrollWidth>innerWidth+1, len:t.length}; }); ok(!r.bad && !r.sx && r.len>50, `${w} ${tag}${r.bad?' 이상한 글자: '+r.bad:''}${r.sx?' 가로스크롤':''}`); };
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; kcRec().cases=3; page='arena'; }); 
for(const tab of ['home','rec','dexall','ach','story','game','chat','sell','guess','board']){
  await p.evaluate(t=>{ arenaTab=t; K=null; renderArena(); },tab); await p.waitForTimeout(500); await scan('탭 '+tab);
}
// 이번 주 경매 시작
await p.evaluate(()=>{ arenaTab='home'; renderArena(); }); await p.waitForTimeout(300);
await p.evaluate(()=>{ const b=document.querySelector('[data-kcnew="weekly"]'); b&&b.click(); }); await p.waitForTimeout(1500); await scan('이번 주 경매 시작');
// 스토리: 6명 모두 방 입장 → EP1 알림 → 풀 경매 시작
for(const ch of ['seoyun','dohyun','mijeong','jaehoon','eunkyung','taesik']){
  const r=await p.evaluate(ch=>{ try{ localStorage.clear(); kcRec().fr={full:true}; window.MT_SKIP_TALE=true; cpRec().unlocked[ch]=true; K=null; epEnter(ch); return 'ok'; }catch(e){ return e.message; } },ch);
  await p.waitForTimeout(1300); for(let k=0;k<4;k++){ await p.evaluate(()=>{const s=document.querySelector('[data-gxskip]'); if(s) s.click();}); await p.waitForTimeout(350); }
  await p.waitForTimeout(400);
  const a=await p.evaluate(ch=>({life:arenaTab==='life', char:lfRec()&&lfRec().char, alert:!!document.querySelector('.ep-alert [data-epgo]')}),ch);
  ok(r==='ok' && a.life && a.char===ch && a.alert, `${w} ${ch} 방 입장·EP1 알림 ${r} ${JSON.stringify(a)}`);
  await scan(ch+' 방');
  await p.evaluate(()=>document.querySelector('.ep-alert [data-epgo]').click()); await p.waitForTimeout(900);
  const k=await p.evaluate(ch=>({tab:arenaTab, kp:KP&&KP.id, want:EP_PLAN[ch].eps[0].k}),ch); ok(k.tab==='king' && k.kp===k.want, `${w} ${ch} EP1 = ${k.want} 풀 경매 (${k.kp})`);
  await p.evaluate(()=>{ K.intro=false; renderArena(); }); await p.waitForTimeout(600); await scan(ch+' EP1 조사 화면');
}
await p.close(); }
// 취득세
const p=await b.newPage(); await p.goto('http://localhost:8765/rights-study.html'); await p.waitForTimeout(500);
const t=await p.evaluate(()=>({h1:kAcqPct(30000,{}), h2:kAcqPct(60000,{}), h3:kAcqPct(75000,{}), h4:kAcqPct(120000,{}), big:kAcqPct(30000,{over85:true}), com:kAcqPct(150000,{use:'commercial'}), f61:kAcqPct(120000,K_PROPS.f61), f44:kAcqPct(30000,K_PROPS.f44), f11:kAcqPct(10000,K_PROPS.f11)}));
ok(t.h1===1.1 && t.h2===1.1 && t.h4===3.3 && t.h3>1.1 && t.h3<3.3 && t.big===1.3 && t.com===4.6 && t.f61===4.6 && t.f44===1.3 && t.f11===1.1, '취득세: 6억 이하 1.1% · 6~9억 사이 · 9억 초과 3.3% · 85㎡ 초과 1.3% · 상가 4.6% '+JSON.stringify(t));
console.log(errs.length?'FAIL '+errs.length+'\n'+[...new Set(errs)].slice(0,20).join('\n'):'ALL OK'); await b.close(); })();
