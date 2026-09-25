const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 860 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.__c=[]; const f = async (input,o) => { window.__c.push([input,o]); const t='<reply>사장님 그 집 사진 좀 보내 주세요\n[사진: 이삿짐센터 견적서]\n저희도 급해요 ㅠㅠ</reply><mood>52</mood><status>진행중</status><coach>좋아요.</coach>'; await new Promise(r=>setTimeout(r,300)); if(o&&o.onText) o.onText({text:t,delta:t}); return {text:t}; }; f.limits = async()=>({maxPromptBytes:65536, images:{maxCount:1,maxInputBytes:1e7,mediaTypes:['image/png']}}); window.claude = { use: async n => n==='sample'? f : null }; });
  await pg.goto('file://' + process.cwd() + '/rights-study.html#arena'); await pg.waitForTimeout(300);
  await pg.click('[data-atab="chat"]');
  await pg.click('[data-chatwith="p_pk"]');
  await pg.setInputFiles('#chImg', 'face.png');
  await pg.fill('#chIn', '집 상태 사진 보내 드려요');
  await pg.click('#chForm button[type=submit]');
  await pg.waitForTimeout(80);
  const typing = await pg.$$eval('.ctyping', x=>x.length);
  const read = await pg.$$eval('.cread', x=>x.length);
  await pg.waitForTimeout(500);
  const photos = await pg.$$eval('.cphoto', x=>x.length);
  const bub = await pg.$$eval('.ag-chat .cbub', x=>x.length);
  const hadImg = await pg.evaluate(()=>!!(__c[0][1] && __c[0][1].images));
  await pg.screenshot({ path: 'chat3.png', fullPage: true });
  // game cards & stage
  await pg.click('[data-atab="game"]');
  const stages = await pg.$$eval('.ag-stage', x=>x.length), locked = await pg.$$eval('.ag-stage.locked', x=>x.length);
  await pg.click('[data-gstart="p_coop"]');
  let cards = 0; for (let k=0;k<30;k++){ const ov = await pg.evaluate(()=>!!(G&&G.over)); if(ov) break; if(await pg.$('[data-gcard]')){ cards++; await pg.click('[data-gcard="0"]'); continue; } const b2 = await pg.$('[data-gact="hand_full"]') || await pg.$('[data-gact="visit"]') ; if (await pg.$('[data-goffer="100"]') && k>1) { await pg.click('[data-goffer="100"]'); continue; } await b2.click(); }
  await pg.screenshot({ path: 'game3.png', fullPage: true });
  const end = await pg.evaluate(()=>G&&G.over);
  console.log({typing, read, photos, bub, hadImg, stages, locked, cards, end, errs, ov: await pg.evaluate(()=>document.documentElement.scrollWidth)});
  await b.close();
})();
