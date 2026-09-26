// v209: 첫 화면 '↺ STAGE 1부터 처음부터 새로 하기' — 스토리·돈·인생·외전 진행만 지우고 레벨·업적·연습 기록·설정은 남긴다
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ localStorage.clear(); IL_AUTOPLAY=false; page='arena'; arenaTab='home'; renderArena(); }); await p.waitForTimeout(300);
ok(await p.$('[data-eprestart]')===null, w+' 새 게임 상태에서는 버튼 없음');
const setup=await p.evaluate(()=>{ const P=cpRec(); P.cleared.seoyun={ending:'normal',at:1}; P.cleared.dohyun={ending:'normal',at:2}; P.unlocked.mijeong=true; epOf('mijeong').res=[{profit:10,full:true},{profit:5,full:true}];
  kcRec().cash=99999; kcRec().cases=7; ilState('S01').st='read'; arenaRec().king={plays:5,best:1,ach:{a:1},dex:{d:1}}; arenaRec().badges={b1:1};
  S.q=S.q||{}; S.q.qTest={c:3,w:1}; kaSave(Object.assign(kaCfg(),{bgm:40})); save(); page='arena'; arenaTab='home'; renderArena(); return document.querySelector('.ep-home').innerText; });
ok(/STAGE 3/.test(setup), w+' 진행 중: '+setup.split('\n')[0]);
if(w===1280) await p.screenshot({path:'../v209a.png'});
const btn=await p.$('[data-eprestart]'); ok(!!btn, w+' 처음부터 새로 하기 버튼 보임');
const bb=await btn.boundingBox(), hb=await (await p.$('.ep-home')).boundingBox(); ok(bb.y>hb.y && bb.y-hb.y-hb.height<30, w+' 스토리 버튼 바로 아래');
await btn.click(); await p.waitForTimeout(500); if(w===1280) await p.screenshot({path:'../v209.png'});
const r=await p.evaluate(()=>({home:document.querySelector('.ep-home').innerText, cleared:Object.keys(cpRec().cleared).length, mi:epOf('mijeong').res.length, cash:kcRec().cash, cases:kcRec().cases, il:ilState('S01').st, unlocked:Object.keys(cpRec().unlocked),
  king:arenaRec().king&&arenaRec().king.plays, badges:!!(arenaRec().badges&&arenaRec().badges.b1), q:S.q.qTest&&S.q.qTest.c, bgm:kaCfg().bgm, btn:!!document.querySelector('[data-eprestart]'), saved:JSON.stringify(localStorage).includes('99999')}));
ok(/STAGE 1/.test(r.home) && /한서윤/.test(r.home), w+' 누르면 STAGE 1 · 한서윤: '+r.home.split('\n')[0]);
ok(r.cleared===0 && r.mi===0 && r.il!=='read' && r.unlocked.join()==='seoyun', w+' 스토리·에피소드·외전·해금 초기화');
ok(r.cash===15000 && r.cases===0, w+' 보유자금 1억 5천 · 처리 물건 0건');
ok(r.king===5 && r.badges && r.q===3 && r.bgm===40, w+' 레벨/도감·업적·연습 기록·소리 설정은 남음');
ok(!r.btn && !r.saved, w+' 초기화 뒤 버튼 사라지고 저장본에도 옛 자금 없음');
await p.click('.ep-home'); await p.waitForTimeout(1200);
ok(await p.evaluate(()=>{const L=lfRec(); return !!(L&&L.story&&L.char==='seoyun');}), w+' STAGE 1 누르면 서윤 스토리 시작');
await p.close(); }
await b.close(); console.log(errs.length?'FAIL '+errs.join(' | '):'ALL OK');})();
