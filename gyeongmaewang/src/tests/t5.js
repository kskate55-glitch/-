const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs=[];
  const p = await b.newPage({viewport:{width:1200,height:1000}}); p.on('pageerror',e=>errs.push(e.message));
  const U='file://'+process.cwd()+'/rights-study.html';
  await p.goto(U+'#quiz'); await p.waitForTimeout(400);
  const chk = await p.evaluate(()=>{ const bad=[]; WB.forEach(q=>{ if(q.type==="mc"){ if(q.o.length!==5) bad.push(q.id+' opts '+q.o.length); if(q.a<0||q.a>4) bad.push(q.id+' a'); if(q.opt && q.opt.length!==5) bad.push(q.id+' optexp '+q.opt.length); if(q.box){ /* combos refer only to existing letters */ const L=G5.slice(0,q.box.length); q.o.forEach(o=>{ (o.match(/[ㄱ-ㅎ]/g)||[]).forEach(ch=>{ if(!L.includes(ch)) bad.push(q.id+' letter '+ch); }); }); } } if(!q.sol) bad.push(q.id+' nosol'); if(!q.lv) bad.push(q.id+' nolv'); if(q.type==="sa" && !q.ans) bad.push(q.id+' noans'); if(q.type==="calc" && !isFinite(q.num)) bad.push(q.id+' num'); }); const perU=UNITS.map(u=>WB.filter(q=>q.u===u.u).length); const ids=WB.map(q=>q.id); return {n:WB.length, perU, bad, dup:ids.filter((x,i)=>ids.indexOf(x)!==i)}; });
  console.log(JSON.stringify(chk));
  await p.screenshot({path:'wbhome.png'});
  await p.click('[data-wbu="6"][data-wbm="practice"]');
  await p.click('[data-wbo="1"]'); await p.screenshot({path:'wbq.png',fullPage:true});
  await p.click('#wbNext'); await p.click('[data-wbo="2"]'); await p.screenshot({path:'wbq2.png',fullPage:true});
  await p.click('#wbQuit'); await p.click('#wbExam');
  for(let i=0;i<20;i++){ if(await p.$('[data-wbo]')) await p.click('[data-wbo="0"]'); else { await p.fill('#wbIn','1'); await p.press('#wbIn','Enter'); } if(i<19 && await p.$('[data-wbo]')) await p.click(`[data-wbgo="${i+1}"]`); }
  await p.click('#wbSubmit'); await p.click('#wbSubmit'); await p.screenshot({path:'wbres.png',fullPage:true});
  await p.click('[data-wbrev="0"]'); await p.click('[data-wbrev="1"]');
  await p.click("#wbBackRes"); await p.click("#wbHome"); await p.click(`[data-qtab="speed"]`);
  const m = await b.newPage({viewport:{width:390,height:900}}); m.on('pageerror',e=>errs.push('m:'+e.message));
  await m.goto(U+'#quiz'); await m.waitForTimeout(300); await m.click('[data-wbu="2"][data-wbm="practice"]'); await m.click('#wbNext').catch(()=>{});
  for(let i=0;i<3;i++){ await m.click('[data-wbo="0"]'); await m.click('#wbNext'); }
  await m.click('[data-wbo="0"]'); await m.screenshot({path:'wbm.png',fullPage:true});
  console.log('scrollW', await m.evaluate(()=>document.documentElement.scrollWidth), 'errors', JSON.stringify(errs));
  await b.close();
})();
