// 📋 게시판·사무실·NPC 기억 — 몽키 + 불변식
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[], weird=[], stuck=[]; const stats={weeks:0, plays:0, extraPlays:0, minOk:0, decoyBids:0, dodged:0, waits:0, results:0, nmTags:0, nmScored:0};
const GAME='[data-kres]:not([disabled]),[data-kcseal],[data-kbid],[data-kcunseal],[data-kintro],[data-kreveal],[data-kgo],[data-kmove],[data-koffer],[data-kflip],[data-kwait],[data-krep],[data-klist],[data-ksale],[data-k2]';
for(const [w,h,seed] of [[1280,800,21],[390,844,22]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(w+' '+e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 // 가격 파서 단위 검사
 const parse = await p.evaluate(()=>[nmPrice("1억 6천이면 충분할 것 같아요."), nmPrice("1.6은 충분해요."), nmPrice("1억 5천 후반이 현실적이에요."), nmPrice("1.5 후반이에요."), nmPrice("38만원 밀렸어요."), nmPrice("1억 7천은 무조건 됩니다."), nmPrice("같은 건물 3층이 1.62 급매로")]);
 const want=[16000,16000,15700,15700,null,17000,16200]; if(JSON.stringify(parse)!==JSON.stringify(want)) errs.push('nmPrice '+JSON.stringify(parse));
 await p.evaluate(s=>{ let x=s; Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647;}; hubRec().cleared['king:k1']=1; kcRec().cases=1; }, seed);
 await p.evaluate(()=>{ OF_SPOT='board'; arenaTab='office'; renderArena(); });
 for(let i=0;i<900;i++){
   const info=await p.evaluate((GAME)=>{
     const root=document.getElementById('kfsRoot')||document.getElementById('main'); const t=root.innerText, bad=[];
     for(const re of [/undefined/,/NaN/,/\[object/,/null만원/,/Infinity/]) if(re.test(t)) bad.push(arenaTab+' '+re.source+' :: '+(t.match(new RegExp('.{0,30}'+re.source+'.{0,20}'))||[''])[0]);
     if(!isFinite(kcRec().cash)) bad.push('cash '+kcRec().cash);
     const out={bad};
     if(arenaTab==='king'){
       if(K && K.revealing){ K.revealing=false; renderArena(); }
       if(!K || K.step==='result' || K.step==='lost'){ out.end=K?K.step:null; out.nmres=!!(K&&K._nmRes&&K._nmRes.length); OF_SPOT='board'; arenaTab='office'; renderArena(); return out; }
       if(K.board && K.board.extra && !K._chk){ K._chk=1; out.extra=true; out.minOk = KP.minBid < Object.getPrototypeOf(KP).minBid; }
       out.tags=document.querySelectorAll('.nm-tag').length;
       const btns=[...root.querySelectorAll(GAME)].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&r.height>0;});
       if(!btns.length){ out.stuck=KP.id+'|'+K.step+'|rev'+!!K.revealing+'|seal'+!!K.sealed+'|intro'+!!K.intro+'|'+(root.innerText.slice(0,160).replace(/\n/g,' ')); return out; }
       const bid=document.getElementById('kBid'); if(bid && bid.type==='number') bid.value=String(Math.round((KP.minBid+Math.random()*KP.minBid*0.35)/10)*10);
       btns[Math.floor(Math.random()*btns.length)].click(); if(window.K && K.revealing){ K.revealing=false; renderArena(); }
       return out;
     }
     // 사무실/게시판
     const B=[...root.querySelectorAll('[data-ofspot],[data-bdplay]:not([disabled]),[data-bdread],[data-bddecoy]:not([disabled]),[data-bdwait]:not([disabled]),[data-bdwatch],[data-bddrop],[data-bdnext]:not([disabled])')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0&&r.height>0;});
     if(!B.length){ out.stuck='office|'+OF_SPOT; return out; }
     // 게시판에서 입찰을 자주 누르도록 가중
     const play=B.filter(e=>e.matches('[data-bdplay]')); const el = play.length && Math.random()<0.35 ? play[0] : B[Math.floor(Math.random()*B.length)];
     out.act=[...el.attributes].map(a=>a.name).find(n=>n.startsWith('data-'));
     el.click(); return out;
   }, GAME);
   if(info.bad && info.bad.length) info.bad.forEach(x=>weird.push(x));
   if(info.stuck) stuck.push(info.stuck); stats.stuckN=(stats.stuckN||0)+(info.stuck?1:0);
   if(info.act==='data-bdnext') stats.weeks++; if(info.act==='data-bdplay') stats.plays++; if(info.act==='data-bddecoy') stats.decoyBids++; if(info.act==='data-bdwait') stats.waits++;
   if(info.extra){ stats.extraPlays++; if(info.minOk) stats.minOk++; }
   if(info.end) stats.results++; if(info.nmres) stats.nmScored++; if(info.tags) stats.nmTags++;
   if(i===120 && w===1280) await p.screenshot({path:'bd1.png'});
 }
 stats.dodged += await p.evaluate(()=>bdRec().dodged);
 await p.evaluate(()=>{ OF_SPOT='board'; arenaTab='office'; renderArena(); }); await p.waitForTimeout(300); await p.screenshot({path:`bd_board_${w}.png`});
 for(const s of ['desk','cabinet','phone','wall']){ await p.evaluate(s=>{ OF_SPOT=s; arenaTab='office'; renderArena(); }, s); await p.waitForTimeout(150); if(s==='phone'||s==='desk') await p.screenshot({path:`bd_${s}_${w}.png`}); }
 console.log(w, await p.evaluate(()=>({week:bdRec().n, cash:kcRec().cash, npc:Object.keys(nmRec()).length, contacts:JSON.stringify(nmRec()).slice(0,300), hscroll: document.documentElement.scrollWidth>innerWidth})));
 await p.reload(); await p.waitForTimeout(800); console.log(w,'reload', await p.evaluate(()=>[bdRec().n, bdRec().items.filter(i=>i.status==='playing').length]));
}
console.log(stats); console.log('weird', [...new Set(weird)].slice(0,10)); console.log('stuck', [...new Set(stuck)].slice(0,10)); console.log('errors', errs.slice(0,10)); await b.close();})();
