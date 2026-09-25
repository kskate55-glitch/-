// 안정성 ①: 두 탭 덮어쓰기 방어 · 옛/손상 저장본 복구 · 단계마다 새로고침
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const URL='http://localhost:8765/rights-study.html#arena';
const GAME='[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kintro],[data-kreveal],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2]';
const inv=p=>p.evaluate(()=>{ const c=kcRec(), P=hubRec(), fin=v=>typeof v==='number'&&isFinite(v); const bad=[];
  ['cash','start','total','cases','wins','fails','bids','lostBids'].forEach(k=>{ if(!fin(c[k])) bad.push('career.'+k+'='+c[k]); });
  if(!fin(P.xp)) bad.push('xp'); const L=c.life; if(L){ if(!fin(L.t)) bad.push('life.t'); if(!fin(L.sta)||L.sta<0) bad.push('sta'); if(!fin(L.stress)||L.stress<0||L.stress>100) bad.push('stress'); }
  if(c.board && c.board.items.filter(x=>x.status==='playing').length>1) bad.push('2 playing');
  const t=(document.getElementById('kfsRoot')||document.getElementById('main')||document.body).innerText; if(/NaN|undefined|\[object Object\]/.test(t)) bad.push('text:'+t.match(/.{0,20}(NaN|undefined|\[object Object\]).{0,10}/)[0]);
  return bad; });
// ---------- A. 두 탭 ----------
{ const ctx=await b.newContext(); const A=await ctx.newPage(), B=await ctx.newPage(); [A,B].forEach(p=>{p.on('pageerror',e=>errs.push('2tab '+e.message)); p.addInitScript(()=>{window.MT_SKIP_TALE=true});});
  await A.goto(URL); await A.waitForTimeout(800); await A.evaluate(()=>{localStorage.clear(); kcRec().cash=15000; S.updated=0; save();}); 
  await B.goto(URL); await B.waitForTimeout(800);
  await A.evaluate(()=>{ kcRec().cash=22222; save(); }); await A.waitForTimeout(300);
  ok(await B.evaluate(()=>!!document.querySelector('#stSave [data-streload]')), '두 탭: 다른 탭이 저장하면 오래된 탭에 바로 알림');
  await B.evaluate(()=>{ kcRec().cash=11111; save(); }); await B.waitForTimeout(200);
  ok(await A.evaluate(()=>JSON.parse(localStorage.getItem(LS_KEY)).arena.career.cash===22222), '두 탭: 오래된 탭의 저장이 최신 기록을 덮어쓰지 않음');
  await B.reload(); await B.waitForTimeout(900);
  ok(await B.evaluate(()=>kcRec().cash===22222 && !document.querySelector('#stSave [data-streload]')), '두 탭: 새로고침하면 최신 기록으로 이어짐');
  await B.evaluate(()=>{ kcRec().cash=33333; save(); }); await B.waitForTimeout(200);
  ok(await B.evaluate(()=>JSON.parse(localStorage.getItem(LS_KEY)).arena.career.cash===33333), '두 탭: 새로고침 뒤엔 정상 저장');
  await A.evaluate(()=>{ S.updated = 0; }); // A는 이제 오래된 탭
  await A.evaluate(()=>{ kcRec().cash=1; save(); });
  ok(await A.evaluate(()=>JSON.parse(localStorage.getItem(LS_KEY)).arena.career.cash===33333), '두 탭: 반대 방향도 막힘');
  await ctx.close(); }
// ---------- B. 옛·손상 저장본 ----------
const FIX = {
  'v64 모양(칸 빠짐)': {q:{},drill:{n:0},known:{},check:{},updated:1,arena:{best:{},chats:{},custom:[],career:{cash:18000,start:15000,total:3000,cases:2,wins:2,fails:0},player:{xp:140,rep:20}}},
  '손상 값': {q:{},drill:{n:0},known:{},check:{},updated:1,arena:{best:{},chats:{},custom:[],career:{cash:"abc",start:null,total:null,cases:"3",wins:-2,fails:null,bids:null,lostBids:"x",history:"none",weekly:null,board:{n:null,items:[{kind:"case",prop:"k999",status:"open",seed:5},{kind:"case",prop:"k1",status:5,extra:"9",seed:null},null],log:null,lastDone:null},
      life:{char:"seoyun",t:"x",sta:null,stress:900,st:{stamina:92},log:null,rel:null}},player:{xp:"NaN",rep:null,ach:[]},deep:{after:null,news:{},mem:null}}},
  '없는 캐릭터': {q:{},drill:{n:0},known:{},check:{},updated:1,arena:{best:{},chats:{},custom:[],career:{cash:15000,start:15000,total:0,cases:0,wins:0,fails:0,life:{char:"ghost",t:0}}}},
  '아예 깨진 JSON': '{"arena":{"career":{"cash":15000,'
};
for(const [name,fx] of Object.entries(FIX)){
  const p=await b.newPage({viewport:{width:1280,height:800}}); const pe=[]; p.on('pageerror',e=>pe.push(e.message)); await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
  await p.goto(URL); await p.waitForTimeout(500);
  await p.evaluate(fx=>{ localStorage.clear(); localStorage.setItem(LS_KEY, typeof fx==='string'?fx:JSON.stringify(fx)); }, fx);
  await p.reload(); await p.waitForTimeout(1200);
  const views=[]; for(const [tab,spot] of [['home',null],['rec',null],['life',null],['life','board']]){ await p.evaluate(([t,s])=>{ arenaTab=t; if(typeof LF_SPOT!=='undefined') LF_SPOT=s; renderArena(); },[tab,spot]); await p.waitForTimeout(250); const bad=await inv(p); if(bad.length) views.push(tab+(spot?'/'+spot:'')+': '+bad.join(',')); }
  await p.evaluate(()=>{ kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(3); K.intro=false; renderArena(); kBid(Math.round(KP.minBid*1.3/10)*10); K.revealing=false; renderArena(); }); await p.waitForTimeout(400);
  const bad2=await inv(p);
  ok(!pe.length && !views.length && !bad2.length, `옛 저장본 [${name}]: 오류 없이 열리고 입찰까지 — ${[...pe,...views,...bad2].join(' | ')}`);
  await p.close(); }
// ---------- C. 단계마다 새로고침 ----------
{ const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('reload '+e.message)); p.on('dialog',d=>d.accept()); await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
  await p.goto(URL); await p.waitForTimeout(800);
  const seen={}; let fails=[];
  for(let run=0; run<16 && Object.keys(seen).length<9; run++){
    await p.evaluate(r=>{ localStorage.clear(); kcRec().fr={full:true}; if(r%2){ lfNew('seoyun'); lfRec().intro=false; } arenaTab= r%2?'life':'king'; if(r%2){ LF_SPOT='board'; renderArena(); const it=bdRec().items.find(x=>x.kind==='case'); bdPlay(it);} else { KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(400+r);} K.intro=false; arenaTab='king'; renderArena(); }, run);
    for(let i=0;i<260;i++){
      const st=await p.evaluate(()=>K?K.step:'none');
      if(st==='none') break;
      if(!seen[st]){ seen[st]=1;
        const before=await p.evaluate(()=>({cash:kcRec().cash, xp:hubRec().xp, cases:kcRec().cases, t:lfRec()?lfRec().t:null, ts:+localStorage.getItem(LS_KEY+':ts')}));
        const snap=await p.evaluate(()=>localStorage.getItem(LS_KEY));
        await p.reload(); await p.waitForTimeout(900);
        const after=await p.evaluate(()=>({cash:kcRec().cash, xp:hubRec().xp, cases:kcRec().cases, K:!!K, playing:(kcRec().board?kcRec().board.items:[]).filter(x=>x.status==='playing').length}));
        const bad=await inv(p);
        if(after.cash!==before.cash || after.xp!==before.xp || after.cases!==before.cases || after.K || after.playing || bad.length) fails.push(st+' '+JSON.stringify({before,after,bad}));
        // 같은 판을 다시 이어가기 위해 저장본을 되돌리고 새 판으로 계속(새로고침은 진행 중 CASE를 내려놓는 게 정상)
        break;
      }
      if(st==='lost'||st==='result') break;
      await p.evaluate((GAME)=>{ if(K.revealing){K.revealing=false;renderArena();} const root=document.getElementById('kfsRoot')||document; const btns=[...root.querySelectorAll(GAME)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;}); const bid=document.getElementById('kBid'); if(bid) bid.value=String(Math.round(KP.minBid*1.4/10)*10); const pick=btns.find(e=>e.matches('[data-kbid],[data-kcseal]'))||btns.find(e=>/list:15900|fix:fix|cross:go/.test(e.getAttribute('data-k2')||''))||btns[Math.floor(Math.random()*btns.length)]; if(pick) pick.click(); if(K&&K.revealing){K.revealing=false;renderArena();} },GAME);
    }
  }
  // 단계를 모두 보려고: 한 판을 끝까지 진행하며 각 단계 첫 등장 때 새로고침 대신 저장본만 비교
  ok(!fails.length, `단계마다 새로고침: 돈·경험치·처리 건수 그대로, 진행 중 CASE는 깔끔히 내려놓음 (본 단계 ${Object.keys(seen).join(',')}) ${fails.join(' / ')}`);
  // 갈림길·1년 결산
  await p.evaluate(()=>{ localStorage.clear(); cpUnlockAll(); lfNew('seoyun'); lfRec().intro=false; K=null; const c=kcRec(); c.total=12000; c.cases=5; arenaTab='life'; LF_SPOT='laptop'; save(); renderArena(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const d=document.getElementById('dpCard'); if(d) d.remove(); document.querySelector('[data-lfpath]').click(); }); await p.waitForTimeout(400);
  const path=await p.evaluate(()=>lfRec().path); await p.reload(); await p.waitForTimeout(900);
  ok(!!path && await p.evaluate(p0=>lfRec().path===p0 && !document.getElementById('cpEnd'), path) && !(await inv(p)).length, '갈림길 고른 뒤 새로고침: 고른 길 유지, 엔딩 안 뜸');
  await p.evaluate(()=>{ arenaTab='life'; LF_SPOT='wall'; renderArena(); }); await p.waitForTimeout(300);
  await p.click('[data-cpsettle]'); await p.waitForTimeout(400); await p.click('[data-cpsettle]'); await p.waitForTimeout(600);
  const ends0=await p.evaluate(()=>JSON.stringify(hubRec().ends)); await p.reload(); await p.waitForTimeout(900);
  ok(await p.evaluate(e0=>JSON.stringify(hubRec().ends)===e0, ends0) && !(await inv(p)).length, '1년 결산 엔딩 뒤 새로고침: 엔딩 기록 한 번만');
  await p.close(); }
console.log('errors',errs); await b.close();})();
