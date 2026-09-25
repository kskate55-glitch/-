const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const pg = await b.newPage({ viewport: { width: w, height: 860 } });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.addInitScript(() => { window.__calls=[]; window.claude = { use: async n => n === 'sample' ? async (input,o) => { window.__calls.push(input); const t='<reply>사장님 그 가격엔 어렵죠.</reply><mood>40</mood><status>진행중</status><coach>근거를 대세요.</coach>'; if(o&&o.onText) o.onText({text:t,delta:t}); return {text:t}; } : null }; });
    await pg.goto('file://' + process.cwd() + '/rights-study.html#calc');
    await pg.waitForTimeout(200);
    const outs = await pg.$$eval('[id^=v_out]', x => x.map(e => e.innerText.replace(/\s+/g,' ').slice(0,90)));
    await pg.fill('#v_gongsi', '12000'); const tax = await pg.$eval('#v_out4', e=>e.innerText.slice(0,30));
    await pg.fill('#v_apt', '35000'); await pg.fill('#v_villa','18000'); const gap = await pg.$eval('#v_out3', e=>e.innerText.slice(0,40));
    await pg.screenshot({ path: `vc_${w}.png`, fullPage: true });
    const ov1 = await pg.evaluate(() => document.documentElement.scrollWidth);
    await pg.evaluate(()=>go('arena')); await pg.waitForTimeout(200);
    await pg.click('[data-atab="chat"]');
    const groups = await pg.$$eval('.ag-role', x => x.map(e => e.textContent));
    await pg.screenshot({ path: `chatlist_${w}.png`, fullPage: true });
    await pg.click('[data-chatwith="b_mgm"]');
    await pg.fill('#chIn', '업계약은 불법이라 안 됩니다. 법정 보수 안에서만 가능해요.');
    await pg.click('#chForm button[type=submit]'); await pg.waitForTimeout(200);
    const rules = await pg.evaluate(() => window.__calls[0][0].content);
    const mission = await pg.$eval('.ag-mission', e => e.textContent);
    await pg.screenshot({ path: `chatb_${w}.png`, fullPage: true });
    const ov2 = await pg.evaluate(() => document.documentElement.scrollWidth);
    await pg.click('[data-atab="game"]'); const gameCards = await pg.$$eval('[data-gstart]', x=>x.length);
    await pg.click('[data-atab="dex"]'); const dex = await pg.$$eval('.ag-t', x=>x.length);
    console.log(w, {outs, tax, gap, ov:[ov1,ov2], groups, mission: mission.slice(0,40), rulesHas: [/중개보수/.test(rules), /업계약/.test(rules), /점유자/.test(rules.slice(0,60))], gameCards, dex, errs});
    await pg.close();
  }
  await b.close();
})();
