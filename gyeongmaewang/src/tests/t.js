const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:390,height:1100}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+process.cwd()+'/rights-study.html#quiz');
  await p.waitForTimeout(500);
  // only 주관식+계산
  await p.click('[data-qk="ox"]'); await p.click('[data-qk="mc"]');
  await p.click('#qStart');
  let seen=[];
  for(let i=0;i<10;i++){
    const tag = await p.textContent('.qtag');
    await p.fill('#saIn','3'); await p.press('#saIn','Enter');
    await p.waitForSelector('#qNext');
    seen.push(tag.trim());
    if(i===2) await p.screenshot({path:'quiz.png'});
    await p.click('#qNext');
  }
  console.log(seen.join(' | '));
  console.log('result', await p.textContent('.big'));
  console.log('errors', JSON.stringify(errs), 'scrollW', await p.evaluate(()=>document.documentElement.scrollWidth));
  await b.close();
})();
