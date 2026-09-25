const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:1200,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const U='file://'+process.cwd()+'/rights-study.html';
  await p.goto(U+'#quiz'); await p.waitForTimeout(400);
  // generator sanity
  const gen = await p.evaluate(()=>{ const bad=[]; let n=0; QUIZ.filter(q=>q.gen).forEach(q=>{ for(let i=0;i<300;i++){ const it=makeItem(q); n++; const x=it.q;
     if(x.k==="calc"){ if(!isFinite(x.num)||!x.q) bad.push(q.gen+':'+x.num); }
     else if(x.k==="mc"){ if(!x.o||x.a<0||x.a>=x.o.length||new Set(x.o).size!==x.o.length) bad.push(q.gen+':mc '+x.a); }
     else if(x.k==="ox"){ if(![0,1].includes(x.a)) bad.push(q.gen+':ox'); } } });
     const ids=QUIZ.map(q=>q.id); const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
     const lv={1:0,2:0,3:0}; QUIZ.forEach(q=>lv[levelOf(q)]++);
     const noTopic=QUIZ.filter(q=>!TOPICS[q.t]).map(q=>q.id);
     const badMc=QUIZ.filter(q=>q.k==="mc"&&!q.gen&&(q.a>=q.o.length)).map(q=>q.id);
     return {n, bad:bad.slice(0,10), dup, total:QUIZ.length, lv, noTopic, badMc, concepts:CONCEPTS.length}; });
  console.log(JSON.stringify(gen));
  // hard-only session
  await p.click('[data-ql="1"]'); await p.click('[data-ql="2"]'); await p.click('#qStart');
  for(let i=0;i<10;i++){ if(await p.$('[data-ans]')) await p.click('[data-ans]'); else { await p.fill('#saIn','1'); await p.press('#saIn','Enter'); } if(i===1) await p.screenshot({path:'hard.png'}); await p.click('#qNext'); }
  // bae drill
  await p.goto(U+'#drill'); await p.reload(); await p.waitForTimeout(300); await p.click('[data-dtab="bae"]');
  for(let i=0;i<5;i++){ await p.fill('#b_in1','100'); await p.fill('#b_in2','0'); await p.click('#baeForm button[type=submit]'); if(i===0) await p.screenshot({path:'bae.png',fullPage:true}); await p.click('#bNew'); }
  // calc
  await p.goto(U+'#calc'); await p.reload(); await p.waitForTimeout(300);
  await p.fill('#m_L','16800'); await p.fill('#m_T','9800'); await p.fill('#m_D','13200');
  console.log('insu:', (await p.textContent('#mo-insu')).replace(/\s+/g,' ').slice(0,120));
  await p.fill('#m_M','150'); await p.fill('#m_B','3000'); await p.fill('#m_P','33000');
  console.log('shop:', (await p.textContent('#mo-shop')).replace(/\s+/g,' ').slice(0,140));
  // notes
  await p.goto(U+'#notes'); await p.reload(); await p.waitForTimeout(300);
  await p.click('[data-noteof="malso"]'); await p.waitForTimeout(200);
  await p.click('#nBody'); await p.keyboard.type('말소기준 = 가장 빠른 돈 권리');
  await p.click('[data-ins="❗ 중요: "]'); await p.keyboard.type('건물철거 가처분 예외');
  await p.screenshot({path:'note.png'});
  await p.reload(); await p.waitForTimeout(300);
  const saved = await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('rights-notes-v1'))).map(n=>n.title+'|'+n.body.slice(-30)));
  console.log('notes saved:', JSON.stringify(saved));
  const m = await b.newPage({viewport:{width:390,height:900}}); m.on('pageerror',e=>errs.push('m:'+e.message));
  for (const pg of ['home','notes','quiz','drill','calc','note','cycle']){ await m.goto(U+'#'+pg); await m.reload(); await m.waitForTimeout(250); const w=await m.evaluate(()=>document.documentElement.scrollWidth); if(w>390) console.log('overflow',pg,w); }
  await m.goto(U+'#note'); await m.reload(); await m.waitForTimeout(250); await m.screenshot({path:'note-m.png'});
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
