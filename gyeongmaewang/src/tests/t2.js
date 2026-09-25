const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:1100,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+process.cwd()+'/rights-study.html#quiz');
  await p.waitForTimeout(400);
  await p.selectOption('#qLen','30'); await p.click('#qStart');
  const kinds={};
  for(let i=0;i<30;i++){
    const tag=(await p.textContent('.qtag')).split('·').pop().trim(); kinds[tag]=(kinds[tag]||0)+1;
    if(await p.$('[data-ans]')) await p.click('[data-ans]'); else { await p.fill('#saIn','x1'); await p.press('#saIn','Enter'); }
    await p.click('#qNext');
  }
  await p.goto('file://'+process.cwd()+'/rights-study.html#notes'); await p.waitForTimeout(300);
  await p.goto('file://'+process.cwd()+'/rights-study.html#home'); await p.reload(); await p.waitForTimeout(300);
  console.log(JSON.stringify(kinds), await p.textContent('.stats'), 'errors', JSON.stringify(errs));
  await b.close();
})();
