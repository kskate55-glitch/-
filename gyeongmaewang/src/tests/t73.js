// 첫 플레이 동선 · 입찰표 돈 계획 · 결과/판단 복기 · 갈림길≠엔딩
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const GAME='[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kintro],[data-kreveal],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2]';
for(const [w,h] of [[1280,800],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(w+' '+e.message));p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(900);
await p.evaluate(()=>{localStorage.clear(); location.reload();}); await p.waitForTimeout(1200);
// 첫 화면
const home=await p.evaluate(()=>({go:!!document.querySelector('[data-frgo]'), more:!!document.querySelector('.fr-more'), guide:!!document.querySelector('.fr-guide'), vis:[...document.querySelectorAll('.kc-menu button')].filter(b=>b.offsetParent&&!b.closest('.fr-more')).length}));
ok(home.go && home.more && home.guide && home.vis===1, w+' 첫 방문: 큰 버튼 하나 + 나머지는 접힘 + 흐름 안내');
await p.click('[data-frall]'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!document.querySelector('.fr-guide') && !!document.querySelector('[data-lfgo]')), w+' 전체 메뉴 보기 → 원래 첫 화면');
await p.evaluate(()=>{delete kcRec().fr; arenaTab='home'; renderArena();}); await p.waitForTimeout(300);
await p.click('[data-frgo]'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>arenaTab==='life' && LF_PICK==='seoyun'), w+' 첫 경매 시작하기 → 한서윤 선택 화면');
// 입찰표
await p.evaluate(()=>{arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false;kStart(3);K.intro=false;renderArena();}); await p.waitForTimeout(2600);
ok(await p.evaluate(()=>{const m=document.getElementById('frMoney'); return !!m && /본전/.test(m.innerText) && !!document.querySelector('[data-frskip]');}), w+' 입찰표: 묶이는 돈 · 본전 가격 · 입찰 안 하기');
await p.fill('#kBid','13000'); await p.waitForTimeout(150);
ok(await p.evaluate(()=>/1억 3,000만원/.test(document.getElementById('frMoney').innerText)), w+' 입찰가를 바꾸면 돈 계획도 바뀜');
ok(await p.evaluate(()=>{const s=document.querySelector('.stg-sheet'), d=document.querySelector('.nx-dock'); if(!s||!d||innerWidth<700) return true; return d.getBoundingClientRect().right <= s.getBoundingClientRect().left+1;}), w+' 버튼 줄이 입찰표를 덮지 않음');
await p.click('[data-frskip]'); await p.click('[data-frskip]'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>K===null), w+' 입찰하지 않기 → 물건 넘김');
// 끝까지 돌려서 패찰·낙찰 결과 화면
let seen={lost:0,result:0}, bad=[];
for(let run=0; run<14 && !(seen.lost&&seen.result); run++){
  await p.evaluate(r=>{arenaTab='king';KC_MODE='career';K_PROP_NEXT=r%2?'k1':'k1';KC_INTRO=false;kStart(100+r);K.intro=false;renderArena();}, run); await p.waitForTimeout(100);
  for(let i=0;i<260;i++){
    const st=await p.evaluate((GAME)=>{ if(!K) return 'none'; if(K.revealing){K.revealing=false;renderArena();}
      if(K.step==='lost'||K.step==='result') return K.step;
      document.querySelectorAll('.nx-bar details[open]').forEach(o=>o.open=false); if(typeof G!=='undefined'&&G) G.card=null;
      const root=document.getElementById('kfsRoot')||document; const btns=[...root.querySelectorAll(GAME)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;});
      const bid=document.getElementById('kBid'); if(bid&&bid.type==='number') bid.value=String(Math.round((KP.minBid*(1.05+Math.random()*0.35))/10)*10);
      const pref=btns.find(e=>e.matches('[data-kbid],[data-kcseal]'))||btns[Math.floor(Math.random()*btns.length)]; if(pref) pref.click(); else return 'stuck';
      if(K&&K.revealing){K.revealing=false;renderArena();} return 'go'; }, GAME);
    if(st==='lost'||st==='result'){ await p.waitForTimeout(150);
      const r=await p.evaluate(s=>{const t=(document.getElementById('kfsRoot')||document.body).innerText; return {has:!!document.querySelector(s==='lost'?'.fr-judge':'.fr-review'), bad:/undefined|NaN|\[object/.test(t)};}, st);
      if(!r.has||r.bad) bad.push(st+JSON.stringify(r)); seen[st]++; break; }
    if(st==='stuck'||st==='none') break;
  }
}
ok(seen.lost>0 && seen.result>0 && !bad.length, w+` 패찰 판단(${seen.lost}) · 돌아보기 4단계(${seen.result}) 표시 ${bad.join(',')}`);
await p.evaluate(()=>localStorage.clear()); await p.close();}
console.log('errors',errs); await b.close();})();
