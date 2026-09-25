const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const pg = await b.newPage({ viewport: { width: w, height: 860 } });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.addInitScript(() => {
      window.__calls = [];
      window.claude = { use: async (n) => n === 'sample' ? Object.assign(async (input, o) => {
        window.__calls.push(input);
        const t = '<reply>아이고, 그래도 한 달은 줘야지. 갈 데가 없어.</reply><mood>48</mood><status>진행중</status><coach>공감으로 시작한 건 좋아요. 날짜를 구체적으로 제안해 보세요.</coach>';
        if (o && o.onText) o.onText({ text: t.slice(0, 20), delta: t.slice(0, 20) });
        await new Promise(r => setTimeout(r, 50));
        return { text: t, truncated: false, modelTierApplied: 'quick' };
      }, {}) : null };
    });
    await pg.goto('file://' + process.cwd() + '/rights-study.html#arena');
    await pg.waitForTimeout(300);
    const dex = await pg.$$eval('.ag-t', x => x.length);
    // open a dex item, click related case link
    await pg.click('.ag-t summary'); 
    const ov1 = await pg.evaluate(() => document.documentElement.scrollWidth);
    // game: play every persona with a sensible strategy
    const res = [];
    const ids = await pg.evaluate(() => PERSONAS.filter(p => p.p).map(p => p.id));
    for (const id of ids) {
      const r = await pg.evaluate((id) => {
        arenaTab = 'game'; gStart(id); const P = personaById(id);
        const plan = ['visit', 'order', 'pledge', 'visit', P.p.dividend ? 'lever' : P.p.fake ? 'proof' : P.p.lien ? 'lien' : 'msg'];
        let i = 0, guard = 0;
        while (!G.over && guard++ < 60) {
          if (i < plan.length) { const pid = plan[i++]; const a = G_ACTIONS.find(x => x.id === pid); if (gAvail(a, P)) gAct(a.id); continue; }
          if (G.handover) { gAct('hand_full'); continue; }
          if (G.deal && !G.contract) { gAct('contract'); continue; }
          if (!G.deal && !G.gone) { const need = gNeed(P); const amt = G_OFFERS.find(v => v >= need); if (amt !== undefined && amt <= P.execCost) { gAct('offer', amt); continue; } }
          if (G.orderOk && !G.exec && G.week > 10) { gAct('exec'); continue; }
          gAct(G.gone ? 'visit' : 'wait');
        }
        return { id, over: G.over, week: G.week, cost: Math.round(gTotal()), par: P.par };
      }, id);
      res.push(r);
    }
    await pg.evaluate(() => renderArena());
    await pg.screenshot({ path: `ag_game_${w}.png`, fullPage: true });
    // illegal
    const ill = await pg.evaluate(() => { gStart('p_grandpa'); gAct('illegal'); return G.over; });
    // random gen
    const gen = await pg.evaluate(() => { const out = []; for (let k = 0; k < 40; k++) { const P = occGen(); arenaRec().custom.unshift(P); gStart(P.id); let g = 0; while (!G.over && g++ < 80) { const need = gNeed(P); if (G.handover) gAct('hand_full'); else if (!G.orderOk && !G.order && G.week < 26) gAct('order'); else if (!G.deal && !G.gone && need <= 800) gAct('offer', G_OFFERS.find(v => v >= need)); else if (G.handover) gAct('hand_full'); else if (G.deal && !G.contract) gAct('contract'); else if (G.orderOk && !G.exec) gAct('exec'); else gAct('visit'); } out.push(G.over.grade); } arenaRec().custom = []; return out.join(''); });
    // UI game click path
    await pg.evaluate(() => { G = null; arenaTab = 'game'; renderArena(); });
    await pg.click('[data-gstart="p_phishing"]');
    await pg.click('[data-gact="visit"]');
    { const cd = await pg.$('[data-gcard]'); if(cd) await cd.click(); } await pg.click('[data-goffer="100"]');
    await pg.screenshot({ path: `ag_play_${w}.png`, fullPage: true });
    const ov2 = await pg.evaluate(() => document.documentElement.scrollWidth);
    // chat
    await pg.click('[data-atab="chat"]');
    await pg.click('[data-chatwith="p_hug"]');
    await pg.fill('#chIn', '할아버지, 갑자기 연락드려 놀라셨죠. 사정 먼저 들어 보고 싶어요.');
    await pg.click('#chForm button[type=submit]');
    await pg.waitForTimeout(300);
    const bubbles = await pg.$$eval('.ag-chat .cbub', x => x.map(e => e.textContent));
    const coach = await pg.$$eval('.ag-coach', x => x.length);
    const firstInput = await pg.evaluate(() => { const c = window.__calls[0]; return [c.length, c[0].role, c[c.length-1].role, c[0].content.length]; });
    await pg.screenshot({ path: `ag_chat_${w}.png`, fullPage: true });
    const ov3 = await pg.evaluate(() => document.documentElement.scrollWidth);
    await pg.click('[data-atab="dex"]'); 
    await pg.click('.ag-t summary');
    await pg.screenshot({ path: `ag_dex_${w}.png`, fullPage: true });
    const link = await pg.$('[data-opencase]');
    if (link) { await link.click(); }
    const incase = await pg.evaluate(() => [page, realTab, CS && CS.id]);
    console.log(w, { dex, ov: [ov1, ov2, ov3], res: res.map(r => `${r.id}:${r.over.grade||'-'}${r.over.win?'':'X'} w${r.week} ${r.cost}/${r.par}`), ill: ill.win, gen, bubbles: bubbles.length, last: bubbles[bubbles.length-1], coach, firstInput, incase, errs });
    await pg.close();
  }
  await b.close();
})();
