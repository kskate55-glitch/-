// 글자 대비 검사 — 게임 창 안의 보이는 글자마다 실제 배경색을 찾아 대비를 잰다(4.5 미만, 큰 글씨 3 미만이면 표시)
const { chromium } = require('playwright');
const PROBE = (label) => {
  const parse = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const a = m[1].split(',').map(x => parseFloat(x)); return {r:a[0], g:a[1], b:a[2], a:a.length > 3 ? a[3] : 1}; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (top, bot) => ({r:top.r * top.a + bot.r * (1 - top.a), g:top.g * top.a + bot.g * (1 - top.a), b:top.b * top.a + bot.b * (1 - top.a), a:1});
  const bgOf = el => { const layers = []; let e = el; while(e && e.nodeType === 1){ const s = getComputedStyle(e); if(s.backgroundImage && s.backgroundImage !== 'none'){ if(/url\(/.test(s.backgroundImage)) return null; const g = s.backgroundImage.match(/rgba?\([^)]+\)/g); if(g){ const cs = g.map(parse); const avg = cs.reduce((a, c) => ({r:a.r + c.r / cs.length, g:a.g + c.g / cs.length, b:a.b + c.b / cs.length}), {r:0, g:0, b:0}); layers.push({...avg, a:Math.max(...cs.map(c => c.a))}); if(layers[layers.length-1].a >= 0.95) break; } }
      const c = parse(s.backgroundColor); if(c && c.a > 0){ layers.push(c); if(c.a >= 0.95) break; } if(e.tagName === 'IMG' || e.querySelector && e.classList.contains('vn')) return null; e = e.parentElement; }
    if(!layers.length) return null; let base = layers[layers.length - 1]; if(base.a < 0.95) return null; for(let i = layers.length - 2; i >= 0; i--) base = blend(layers[i], base); return base; };
  const bad = []; const root = document.getElementById('kfsRoot'); if(!root) return bad;
  root.querySelectorAll('*').forEach(el => {
    if(![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const r = el.getBoundingClientRect(); if(!r.width || !r.height) return; const s = getComputedStyle(el); if(s.visibility === 'hidden' || +s.opacity < 0.3) return;
    if(el.closest('.vn, .lf-stage .lf-top, .kfs-stage > .vn')) return;   // 그림 위 글자는 따로(그림자 처리)
    const fg = parse(s.color), bg = bgOf(el); if(!fg || !bg) return;
    const c = (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05), big = parseFloat(s.fontSize) >= 18 || (parseFloat(s.fontSize) >= 14 && +s.fontWeight >= 700);
    if(c < (big ? 3 : 4.5)) bad.push(`${label} ${c.toFixed(2)} "${[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').slice(0,26)}" ${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} fg=${s.color} bg=rgb(${[bg.r,bg.g,bg.b].map(Math.round)})`);
  });
  return bad;
};
(async()=>{ const b = await chromium.launch(); const all = [];
for(const [w,h] of [[1280,800],[390,844]]){
  const p = await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror', e => all.push('ERR '+e.message));
  await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
  await p.evaluate(()=>{ localStorage.clear(); try{ cpUnlockAll(); }catch(e){} const c=kcRec(); delete c.life; K=null; });
  const run = async (label, js, wait=600) => { const okr = await p.evaluate(`try{ ${js}; true }catch(e){ false }`); if(!okr) return; await p.waitForTimeout(wait); await p.evaluate(()=>{ ['cpEnd','pxCard','dpCard','hubToasts'].forEach(i=>{ const e=document.getElementById(i); if(e) e.remove(); }); document.querySelectorAll('.kfs-panel details').forEach(d=>d.open=true); }); await p.waitForTimeout(50); (await p.evaluate(PROBE, w+' '+label)).forEach(x => all.push(x)); };
  await run('home', `arenaTab='home'; renderArena();`);
  await run('select', `arenaTab='life'; LF_PICK='seoyun'; renderArena();`);
  for(const s of ['laptop','phone','calendar','shelf','bed','fridge','out','bank','file','wall','board']) await run('life_'+s, `if(!lfOn()){ lfNew('seoyun'); lfRec().intro=false; } LF_SPOT='${s}'; arenaTab='life'; renderArena();`, 350);
  await run('office', `OF_SPOT='board'; arenaTab='office'; renderArena();`);
  await run('brief', `arenaTab='king'; kcStart('career'); K.intro=false; renderArena();`, 900);
  await run('won', `kBid(Math.round(KP.minBid*1.3)); K.revealing=false; renderArena();`, 700);
  for(const st of ['move','defect','list','sell']) await run(st, `K.step='${st}'; if('${st}'==='sell' && !K.sale) K.sale={list:15500,trueP:15300,weeks:1,offers:[],buyer:null,done:false}; if('${st}'==='defect') K.defects=K.defects||[]; renderArena();`, 500);
  for(const t of ['rec','story','dexall','ach']) await run('tab_'+t, `arenaTab='${t}'; renderArena();`, 400);
  await p.close(); }
const uniq = [...new Set(all.map(x => x.replace(/^\d+ \S+ /, '')))];
console.log('총', all.length, '건 / 서로 다른', uniq.length); all.filter((x,i)=>all.findIndex(y=>y.replace(/^\d+ \S+ /,'')===x.replace(/^\d+ \S+ /,''))===i).slice(0,80).forEach(x=>console.log(x));
await b.close(); })();
