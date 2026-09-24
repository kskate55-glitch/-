// 전 화면 점검 — 오류 · 가로 넘침 · 화면 밖 버튼 · 작은 터치영역 · 이상 문구 · 너무 작은 글씨 · 잘린 글자
const { chromium } = require('playwright');
const CHECK = (label) => {
  const out = {label, issues:[]}; const vw = innerWidth, vh = innerHeight, mob = vw < 640;
  const root = document.getElementById('kfsRoot') || document.getElementById('main');
  if(document.documentElement.scrollWidth > vw + 1) out.issues.push('가로 넘침 '+document.documentElement.scrollWidth);
  const t = (root||document.body).innerText;
  for(const re of [/undefined/,/NaN/,/\[object/,/null만원/,/Infinity/,/\$\{/]) if(re.test(t)) out.issues.push('이상문구 '+re.source+' :: '+(t.match(new RegExp('.{0,25}'+re.source+'.{0,15}'))||[''])[0].replace(/\n/g,' '));
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const btns = [...document.querySelectorAll('button, a.btn, [role=button], summary, input, select')].filter(vis);
  const small = [], off = [], wide = [];
  btns.forEach(b => { const r = b.getBoundingClientRect(); const name = (b.innerText||b.value||b.getAttribute('aria-label')||b.className||'').trim().slice(0,22).replace(/\n/g,' ');
    if(b.closest('.of-spots, .kfs-head')) {} 
    if(mob && (r.height < 36 || r.width < 36) && b.tagName !== 'INPUT' && !b.closest('.lf-stars')) small.push(name+' '+Math.round(r.width)+'x'+Math.round(r.height));
    if(r.right > vw + 2 || r.left < -2) off.push(name+' x'+Math.round(r.left)+'..'+Math.round(r.right));
    if(b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).overflow !== 'visible') wide.push(name); });
  if(small.length) out.issues.push('작은 버튼('+small.length+') '+[...new Set(small)].slice(0,6).join(' / '));
  if(off.length) out.issues.push('화면 밖 버튼 '+[...new Set(off)].slice(0,5).join(' / '));
  if(wide.length) out.issues.push('글자 잘림 버튼 '+[...new Set(wide)].slice(0,5).join(' / '));
  // 너무 작은 글씨
  const tiny = new Set(); document.querySelectorAll('#kfsRoot *, #main *').forEach(e => { if(e.children.length || !e.textContent.trim() || !vis(e)) return; const f = parseFloat(getComputedStyle(e).fontSize); if(f < 11) tiny.add(e.textContent.trim().slice(0,18)+'('+f+')'); });
  if(tiny.size) out.issues.push('11px 미만 글씨('+tiny.size+') '+[...tiny].slice(0,5).join(' / '));
  // 고정 오버레이가 화면을 덮고 있나
  const fixed = [...document.querySelectorAll('body > *')].filter(e => { const s = getComputedStyle(e); return s.position === 'fixed' && vis(e) && e.id !== 'kfsRoot' && e.getBoundingClientRect().width * e.getBoundingClientRect().height > vw * vh * 0.5; }).map(e => e.id || e.className);
  if(fixed.length) out.issues.push('큰 덮개 남아 있음 '+fixed.join(','));
  return out;
};
(async()=>{ const b = await chromium.launch(); const report = []; const errs = [];
for(const [w,h] of [[1280,800],[390,844]]){
  const p = await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror', e => errs.push(w+' '+e.message)); p.on('console', m => { if(m.type()==='error' && !/Failed to load resource|fonts\.g/.test(m.text())) errs.push(w+' console '+m.text().slice(0,150)); });
  await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ localStorage.clear(); try{ cpUnlockAll(); }catch(e){} const c=kcRec(); delete c.life; K=null; });
  const shot = async (label, fn, wait=500) => { await p.evaluate(fn); await p.waitForTimeout(wait); await p.evaluate(()=>{ ['cpEnd','pxCard','dpCard'].forEach(i=>{ const e=document.getElementById(i); if(e) e.remove(); }); document.querySelectorAll('.dp-call,.dp-thought,.gx-veil,.gx-banner').forEach(e=>e.remove()); document.querySelectorAll('details').forEach(d=>d.open=true); }); await p.waitForTimeout(80);
    const r = await p.evaluate(CHECK, label); r.w = w; report.push(r); await p.screenshot({path:`au_${w}_${label}.png`, fullPage:true}); };
  for(const tab of (process.env.TABS||'home,rec,story,dexall,ach,game,chat,sell,guess,dex,art').split(',')) await shot('tab_'+tab, `arenaTab='${tab}'; renderArena();`);
  await shot('office_board', `OF_SPOT='board'; arenaTab='office'; renderArena();`);
  await shot('life_select', `arenaTab='life'; LF_PICK=null; renderArena();`);
  await shot('life_select_pick', `LF_PICK='mijeong'; renderArena();`);
  await shot('life_intro', `lfNew('seoyun'); arenaTab='life'; renderArena();`);
  for(const s of ['laptop','phone','calendar','shelf','bed','fridge','out','bank','file','wall']) await shot('life_'+s, `lfRec().intro=false; LF_SPOT='${s}'; arenaTab='life'; renderArena();`, 350);
  await shot('life_board', `LF_SPOT='board'; renderArena();`);
  // 한 판을 끝까지 — 첫 번째 진행 버튼을 계속 눌러 단계마다 점검
  await p.evaluate(()=>{ arenaTab='king'; kcStart('career'); K.intro=false; renderArena(); });
  const seen = new Set(); 
  for(let i=0;i<120;i++){
    const st = await p.evaluate(()=>K ? K.step : 'none'); if(st==='none') break;
    if(!seen.has(st)){ seen.add(st); await shot('king_'+st, `renderArena();`, 400); }
    if(st==='result') break;
    const did = await p.evaluate(()=>{ if(K.revealing){ K.revealing=false; renderArena(); return 'rev'; }
      if(K.step==='brief'){ const a=[...document.querySelectorAll('[data-kres]:not([disabled])')]; if(a.length && Object.keys(K.done||{}).length<4){ a[0].click(); return 'res'; } const bid=document.getElementById('kBid'); if(bid) bid.value=String(Math.round(KP.minBid*1.35/10)*10); const s=document.querySelector('[data-kcseal],[data-kbid]'); if(s){ s.click(); return 'seal'; } }
      const pick=['[data-kgo]','[data-kmove]','[data-koffer]','[data-kwait]','[data-krep]','[data-klist]','[data-ksale]','[data-k2]','[data-kflip]','[data-kintro]','[data-kreveal]'];
      for(const q of pick){ const e=[...document.querySelectorAll(q)].find(x=>!x.disabled && x.getBoundingClientRect().width); if(e){ e.click(); return q; } } return 'none'; });
    if(did==='none'){ report.push({w, label:'king_stuck_'+st, issues:['진행 버튼 없음']}); break; }
    await p.waitForTimeout(60);
  }
  await p.close(); }
console.log('ERRORS', JSON.stringify([...new Set(errs)].slice(0,20),null,1));
report.filter(r=>r.issues.length).forEach(r=>console.log(r.w, r.label, '\n   - '+r.issues.join('\n   - ')));
console.log('screens', report.length); await b.close(); })();
