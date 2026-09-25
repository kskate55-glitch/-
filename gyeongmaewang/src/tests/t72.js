// 🙇 사정 끝까지 들어주기 · 이벤트 카드 빈도·개연성 · 무작위 점유자 일관성 · 엔딩 그림
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(800);
// 명도왕
await p.evaluate(()=>{localStorage.clear(); page='arena'; arenaTab='game'; gStart('p_grandpa'); renderArena();}); await p.waitForTimeout(300);
ok(!(await p.$('[data-gact="listen"]')), w+' 처음 만나기 전엔 "사정 듣기" 없음');
await p.click('[data-gact="visit"]'); await p.waitForTimeout(400); await p.evaluate(()=>{G.card=null; renderArena();}); await p.waitForTimeout(200);
ok(!!(await p.$('[data-gact="listen"]')), w+' 만난 뒤 "사정 끝까지 들어주기" 등장');
const wk0=await p.evaluate(()=>G.week);
await p.click('[data-gact="listen"]'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!document.querySelector('#mtTale .mt-say p')), w+' 사연 장면이 뜸');
const n=await p.evaluate(()=>MT.lines.length); let seen=[];
for(let i=0;i<n;i++){ seen.push(await p.evaluate(()=>document.querySelector('#mtTale .mt-say').innerText.slice(0,20))); await p.click('#mtTale .mt-card'); await p.waitForTimeout(120); }
ok(n>=5 && !(await p.$('#mtTale')), w+' 한 줄씩 넘겨서 끝까지 ('+n+'줄)');
if(w===1280) await p.screenshot({path:'mt_g.png'});
ok(await p.evaluate(w0=>G.week===w0+1 && G.heard===1, wk0), w+' 한 주가 지나고 1묶음 들음');
await p.evaluate(()=>{G.card=null; renderArena();}); await p.waitForTimeout(150); await p.click('[data-gact="listen"]'); await p.waitForTimeout(400);
ok(await p.evaluate(()=>MT && MT.lines.some(l=>l[0]==='할머니')), w+' 2묶음: 치매 초기 아내가 끼어든다');
await p.click('#mtTale [data-mtskip]'); await p.waitForTimeout(200);
await p.evaluate(()=>{G.card=null; renderArena();}); await p.waitForTimeout(150); await p.click('[data-gact="listen"]'); await p.waitForTimeout(400); await p.click('#mtTale [data-mtskip]');
ok(await p.evaluate(()=>G.heard===3 && G.hinted && !document.querySelector('[data-gact="listen"]')), w+' 다 들으면 속마음 힌트 · 버튼 사라짐');
await p.close();}
// 이벤트 카드 빈도(몬테카를로) · 개연성
const pg=await b.newPage(); await pg.goto('http://localhost:8765/rights-study.html#arena'); await pg.waitForTimeout(800);
const st=await pg.evaluate(()=>{ let tot=0, maxN=0, gaps=0, runs=200; for(let r=0;r<runs;r++){ gStart('p_phishing'); const P=personaById('p_phishing'); let n=0, last=-9; for(let wk=1;wk<=(runs===200?30:30);wk++){ G.week=wk; G.card=null; gMaybeCard(P); if(G.card){ if(!/crisis|arson|sabotage/.test(G.card.id)){ n++; if(wk-last<3) gaps++; last=wk; } } } tot+=n; maxN=Math.max(maxN,n);} return {avg:tot/runs, maxN, gaps}; });
ok(st.avg<=3 && st.maxN<=3 && st.gaps===0, '카드: 30주 평균 '+st.avg.toFixed(2)+'장 · 최대 '+st.maxN+' · 연달아 0');
const txt=await pg.evaluate(()=>{ gStart('p_grandpa'); const s1=G_CARDS.find(c=>c.id==='sns').s, h1=G_CARDS.find(c=>c.id==='hospital').s; gStart('p_phishing'); const s2=G_CARDS.find(c=>c.id==='sns').s; return [s1,h1,s2]; });
ok(!/애 있는/.test(txt[0]) && /애 있는/.test(txt[2]), '커뮤니티 글: 아이 있는 집만 "애 있는 집"');
ok(/집사람이 쓰러져/.test(txt[1]), '할아버지 댁 입원 카드 = "집사람" ('+txt[1].slice(0,14)+')');
const bad=await pg.evaluate(()=>{ let b=[]; for(let i=0;i<300;i++){ const o=occGen(); if(!mtOccOk(o)) b.push(o.name+' '+o.twist+' / '+o.house.map(h=>h.desc).join(',')); } return b; });
ok(bad.length===0, '무작위 점유자 300명 — 나이·사정·가족이 어긋난 사람 '+bad.length+'명 '+(bad[0]||''));
const tale=await pg.evaluate(()=>{ const o=occGen('poor'); return mtTaleOf(o).length; }); ok(tale>=2, '무작위 점유자도 사연 2묶음');
const allT=await pg.evaluate(()=>PERSONAS.filter(P=>(P.role||'occupant')==='occupant').map(P=>P.id+':'+mtTaleOf(P).length)); ok(allT.every(x=>+x.split(':')[1]>=2), '고정 점유자 전원 사연 있음 ('+allT.length+'명)');
// 본게임
await pg.evaluate(()=>{localStorage.clear(); cpUnlockAll(); lfNew('dohyun'); lfRec().intro=false; page='arena'; arenaTab='king'; kcStart('career'); K.intro=false; kBid(Math.round(KP.minBid*1.3)); K.revealing=false; K.step='move'; renderArena();}); await pg.waitForTimeout(500);
await pg.evaluate(()=>{const b=document.querySelector('[data-kmove="listen"]'); b && b.click();}); await pg.waitForTimeout(1900);
ok(await pg.evaluate(()=>!!document.querySelector('#mtTale') && MT.name.includes('최만식')), '본게임: 사정부터 듣는다 → 사연 장면');
await pg.screenshot({path:'mt_k.png'});
// 엔딩 그림
await pg.evaluate(()=>{ MT=null; mtPaint(); lfNew('jaehoon'); lfRec().intro=false; const L=lfRec(); cpFinish(null,null); CP_SHOW.sum.type='good'; cpPaint(); });
ok(await pg.evaluate(()=>{const i=document.querySelector('.cp-art img'); return !!i && i.src.includes('512cbdda');}), '재훈 GOOD 엔딩 그림');
console.log('errors',errs); await b.close();})();
