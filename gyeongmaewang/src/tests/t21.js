const { chromium } = require('playwright'); const MEM = process.argv[2]==='mem';
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(500);
// 1) 모든 경로 DFS — 막다른 길/없는 라벨/도달 못 하는 엔딩 찾기
const r = await p.evaluate((mem)=>{
  const out={}; const R=arenaRec(); R.endings={}; if(mem) for(const E of STORY_EPS){R.endings[E.id]={}; for(const k in E.endings) R.endings[E.id][k]=1;}
  for(const E of STORY_EPS){
    const labels=Object.keys(E.labels), bad=[];
    for(const l of labels) for(const n of E.labels[l]){ for(const g of [n.go].concat((n.menu||[]).map(c=>c.go))) if(g && !E.labels[g]) bad.push(l+'→'+g); if(n.end && !E.endings[n.end]) bad.push('end '+n.end); }
    const seen={}, visitedLabels=new Set(); let paths=0, stuck=0;
    const walk=(state, depth)=>{
      if(depth>60){ stuck++; return; }
      ST = JSON.parse(JSON.stringify(state)); ST.run=1;
      stRun(); visitedLabels.add(ST.label);
      // 대사 넘기기
      let guard=0; while(!ST.end && stNode() && !stNode().menu && guard++<200){ stAdvance(); visitedLabels.add(ST.label); }
      if(ST.end){ seen[ST.end]=(seen[ST.end]||0)+1; paths++; return; }
      const n=stNode(); if(!n || !n.menu){ stuck++; return; }
      const snap=JSON.parse(JSON.stringify(ST)); const k=n.menu.filter(c=>!c.cond||c.cond(ST.flags)).length;
      if(!k){ stuck++; return; }
      for(let i=0;i<k;i++){ ST=JSON.parse(JSON.stringify(snap)); stPick(i); const s2=JSON.parse(JSON.stringify(ST)); walk(s2, depth+1); }
    };
    ST=null; stStart(E.id); const s0=JSON.parse(JSON.stringify(ST)); s0.i=0; s0.label='start'; s0.hist=[]; s0.tips=[]; s0.end=null;
    walk(s0,0);
    out[E.id]={bad, paths, stuck, endings:seen, missing:Object.keys(E.endings).filter(k=>!seen[k]), unreached:labels.filter(l=>!visitedLabels.has(l))};
  }
  ST=null; const o2={}; for(const k in out){ const v=out[k]; o2[k]=[v.paths,v.stuck,v.bad.join(','),v.missing.join(','),v.unreached.join(',')].join(' | ');} return o2;
}, MEM);
console.log('mem='+MEM, JSON.stringify(r,null,1));
// 2) 실제 화면 — 클릭으로 한 편 끝까지
for(const w of [390,1280]){ await p.setViewportSize({width:w,height:900});
 await p.evaluate(()=>{ST=null;arenaTab='story';renderArena();}); await p.waitForTimeout(200);
 if(w===1280) await p.screenshot({path:'s1.png'});
 await p.click('[data-ststart="ep_youth"]'); await p.waitForTimeout(900); await p.screenshot({path:`s2_${w}.png`});
 for(let i=0;i<80;i++){ if(await p.$('.st-end')) break; const o=await p.$('[data-stpick]'); if(o){ await o.click(); await p.waitForTimeout(250); continue; }
   await p.click('.vn.story',{position:{x:100,y:60}}); await p.waitForTimeout(60); await p.click('.vn.story',{position:{x:100,y:60}}); await p.waitForTimeout(120);
   if(i===6) await p.screenshot({path:`s3_${w}.png`}); }
 await p.screenshot({path:`s4_${w}.png`,fullPage:false});
 console.log(w, await p.evaluate(()=>[ST&&ST.end, document.querySelector('.st-end h3')&&document.querySelector('.st-end h3').textContent, document.documentElement.scrollWidth]));
}
// 3) 명도왕 타이틀 + 연출 클래스
await p.evaluate(()=>{G=null;arenaTab='game';renderArena();}); await p.waitForTimeout(300); await p.screenshot({path:'s5.png'});
console.log('title', !!await p.$('.vn-title'), 'endings saved', await p.evaluate(()=>JSON.stringify(arenaRec().endings)));
await p.evaluate(()=>{gStart('p_greedy');renderArena();}); await p.waitForTimeout(200);
console.log('first', await p.evaluate(()=>document.querySelector('.vn-sprite').className));
await p.evaluate(()=>{renderArena();}); console.log('rerender', await p.evaluate(()=>document.querySelector('.vn-sprite').className+' | '+document.querySelectorAll('.vn-bg').length));
await p.click('[data-gact="visit"]').catch(()=>{}); await p.waitForTimeout(300);
console.log('after act', await p.evaluate(()=>(document.querySelector('.vn-sprite')||{}).className+' | bgs '+document.querySelectorAll('.vn-bg').length+' | narr '+!!document.querySelector('.vn-box.narr')));
console.log('errors',errs);await b.close();})();
