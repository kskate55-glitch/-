// 🌦️ 날씨·시기·소리 — 수치 영향 · 장면별 환경음 · 설정 저장
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
// 1) 달력
const cal = await p.evaluate(()=>{ kStart(777); const out={}; for(const [k,m,d] of [["spring",4,10],["monsoon",7,3],["vac",8,5],["chuseok",9,24],["winter",1,20],["yearend",12,24]]){ K.cal0=Date.UTC(2026,m-1,d); K.day=0; out[k]=snLine(); } return out; });
console.log(cal);
ok(/봄.*이사철/.test(cal.spring), '봄 이사철 표시'); ok(/장마 10일차/.test(cal.monsoon), '장마 N일차 표시'); ok(/휴가철/.test(cal.vac), '휴가철'); ok(/추석/.test(cal.chuseok), '추석'); ok(/겨울/.test(cal.winter), '겨울'); ok(/연말/.test(cal.yearend), '연말');
// 날씨 분포 — 장마철엔 비가 대부분, 겨울엔 눈·한파가 나온다
const wx = await p.evaluate(()=>{ const c={mon:{}, win:{}, spr:{}}; for(let i=0;i<30;i++){ const a=snWeatherOf(snDate(Date.UTC(2026,6,1+i%24))).id, w=snWeatherOf(snDate(Date.UTC(2026,0,1+i))).id, s=snWeatherOf(snDate(Date.UTC(2026,3,1+i))).id; c.mon[a]=(c.mon[a]||0)+1; c.win[w]=(c.win[w]||0)+1; c.spr[s]=(c.spr[s]||0)+1; } return c; });
console.log(wx); ok((wx.mon.monsoon||0) >= 12, '장마철엔 장마 날씨가 많다'); ok(((wx.win.snow||0)+(wx.win.cold||0)) >= 5, '겨울엔 눈·한파'); ok(!wx.spr.snow && !wx.spr.heat, '봄엔 눈·폭염 없음');
// 2) 조사 시간·누수 단서
const dur = await p.evaluate(()=>{ kStart(12345); const a = KP.actions.find(x=>x.loc==='site'); const set=(m,d)=>{ K.cal0=Date.UTC(2026,m-1,d); K.day=0; K.rain = ['rain','monsoon'].includes(snNow().W.id); };
  const find=(m, want)=>{ for(let d=1; d<=28; d++){ set(m,d); if(snNow().W.id===want) return krDur(a)[0]; } return null; };
  return {clear:find(4,'clear'), rain:find(4,'rain'), monsoon:find(7,'monsoon'), cold:find(1,'cold')}; });
console.log(dur); ok(dur.rain > dur.clear && dur.monsoon > dur.rain && dur.cold > dur.clear, '현장 조사 시간: 맑음 < 비 < 장마 · 한파도 증가');
const leak = await p.evaluate(()=>{ K_PROP_NEXT='k2'; kStart(999); const a = KP.actions.find(x=>x.id==='down'); const rate=(m,want)=>{ for(let d=1;d<=28;d++){ K.cal0=Date.UTC(2026,m-1,d); K.day=0; if(snNow().W.id===want) break; } let n=0; for(let i=0;i<3000;i++){ const o=krRoll(a); if([].concat(o.reveal||[]).includes('leak')) n++; } return n/3000; }; return {clear:rate(4,'clear'), monsoon:rate(7,'monsoon')}; });
console.log(leak); ok(leak.monsoon > leak.clear + 0.1, '장마엔 누수 단서가 더 잘 보인다');
// 3) 수리: 겨울·장마·휴가철·이사철
const rep = await p.evaluate(()=>{ const run=(m,d)=>{ K_PROP_NEXT='k1'; kStart(55); K.cal0=Date.UTC(2026,m-1,d); K.day=0; const c0=K.cost.repair, d0=K.day; K.step='defect'; kRepair('good'); return [K.cost.repair-c0, K.day-d0, (K._snRepair||[]).length]; }; return {fall:run(10,20), winter:run(1,20), monsoon:run(7,1), vac:run(8,5), spring:run(4,1)}; });
console.log(rep); ok(rep.winter[0] > rep.fall[0], '겨울 수리비↑'); ok(rep.monsoon[1] > rep.fall[1], '장마 공사 지연'); ok(rep.vac[1] >= rep.fall[1] + 3, '휴가철 업자 지연 +3일'); ok(rep.spring[0] > rep.fall[0], '이사철 비용↑'); ok(rep.fall[2] === 0, '가을엔 추가 없음');
// 4) 매도 문의: 이사철 vs 휴가철
const sale = await p.evaluate(()=>{ const run=(m,d)=>{ let offers=0, weeks=0; for(let s=1;s<=60;s++){ K_PROP_NEXT='k1'; kStart(1000+s); K.repair=K_REPAIR[1]; K.cal0=Date.UTC(2026,m-1,d); K.day=0; K.sale={list:15800, trueP:16000, weeks:1, offers:[], done:false}; for(let w=0;w<3;w++){ K.day=0; kWeek(); weeks++; if(K.sale.offer) offers++; } } return +(offers/weeks).toFixed(3); }; return {moving:run(4,1), fall:run(11,10), vacation:run(8,1)}; });
console.log(sale); ok(sale.moving > sale.fall && sale.vacation < sale.fall, '문의: 이사철 > 평소 > 휴가철');
// 5) 명도 지연(장마)
const mv = await p.evaluate(()=>{ K_PROP_NEXT='k1'; kStart(4242); K.cal0=Date.UTC(2026,6,5); K.day=0; K.step='move'; const d0=K.day; kMove('listen'); const d1=K.day; kMove('date'); return [d1-d0, K.day-d1, K._snMoveNote]; });
console.log(mv); ok(mv[0] >= 4 && /장마/.test(mv[2]||''), '장마 명도 지연 한 번'); ok(mv[1] < mv[0], '지연은 한 판에 한 번만');
// 6) 입찰 경쟁: 이사철 +1, 비수기 -1
const riv = await p.evaluate(()=>{ const n=(bn)=>{ const B=bdRec(); B.n=bn; const it={key:9999, kind:'case', prop:'k1', seed:31337, extra:0, status:'open'}; B.items.push(it); BD_NEXT=it; K_PROP_NEXT='k1'; kStart(31337); const r=K.rivals.length, notes=K.snNotes.slice(); B.items=B.items.filter(x=>x.key!==9999); return [r, notes.join('/')]; }; return {spring:n(3), fall:n(33), winter:n(46)}; });
console.log(riv);
// 7) 소리: 장면별 환경음이 하나씩만
await p.mouse.click(5,5); await p.waitForTimeout(300);
const amb = await p.evaluate(async ()=>{ const seen=[]; const go=async (f)=>{ f(); renderArena(); await new Promise(r=>setTimeout(r,250)); seen.push(SN_AMB && SN_AMB.key); };
  K_PROP_NEXT='k1'; kStart(4242); K.intro=false; K.cal0=Date.UTC(2026,6,5); arenaTab='king';
  await go(()=>{ K.loc='home'; }); await go(()=>{ K.loc='site'; }); await go(()=>{ K.sealed={amt:12000}; }); await go(()=>{ K.sealed=null; K.step='move'; K.scene={who:'occ', t:'못 나가요!', ex:'angry'}; });
  await go(()=>{ K.step='defect'; K.defects=[]; }); await go(()=>{ K.step='sell'; K.sale={list:15800,trueP:16000,weeks:1,offers:[],done:false}; }); await go(()=>{ arenaTab='office'; OF_SPOT='desk'; });
  return {seen, unlocked:KA_UNLOCKED, ctx:!!(KA&&KA.amb), state:KA&&KA.ac.state}; });
console.log(amb); ok(amb.ctx, '오디오 레이어 생성(마스터·환경음·음성)');
ok(amb.seen[0].startsWith('room') && amb.seen[1].startsWith('site_') && amb.seen[1].endsWith('|out') && amb.seen[2].startsWith('court') && amb.seen[3].startsWith('house') && amb.seen[4].startsWith('empty') && amb.seen[5].startsWith('broker') && amb.seen[6].startsWith('office'), '장면별 환경음 전환: '+amb.seen.join(' → '));
ok(/monsoon|clear|heat|cloudy/.test(amb.seen[1]), '7월 현장엔 날씨 레이어');
// 8) 설정 저장 · 대사 읽기 버튼
await p.evaluate(()=>{ arenaTab='king'; K.step='move'; K.scene={who:'occ',t:'안녕하세요',ex:'normal'}; renderArena(); });
await p.evaluate(()=>{ const c=kaCfg(); c.amb=33; c.voice=44; c.master=77; c.tts=true; kaSave(c); renderArena(); }); await p.waitForTimeout(200);
ok(await p.evaluate(()=>!!document.querySelector('.sn-tts') || !window.speechSynthesis), '대사 읽기 버튼');
await p.reload(); await p.waitForTimeout(600);
ok(await p.evaluate(()=>{ const c=kaCfg(); return c.amb===33 && c.voice===44 && c.master===77 && c.tts===true; }), '볼륨·음성 설정이 새로고침 뒤에도 유지');
const sliders = await p.evaluate(()=>{ arenaTab='home'; renderArena(); return [...document.querySelectorAll('[data-kaset]')].map(x=>x.dataset.kaset).join(','); });
ok(/master.*bgm.*amb.*sfx.*voice/.test(sliders), '소리 설정 5개 슬라이더: '+sliders);
// 9) 비 오는 날 화면 · 모바일
const m = await b.newPage({viewport:{width:390,height:844}}); m.on('pageerror',e=>errs.push('m '+e.message));
await m.goto('http://localhost:8765/rights-study.html#arena'); await m.waitForTimeout(500);
await m.evaluate(()=>{ K_PROP_NEXT='k2'; kStart(4242); K.intro=false; for(let d=1;d<=24;d++){ K.cal0=Date.UTC(2026,6,d); if(snNow().W.id==='monsoon') break; } K.rain=true; arenaTab='king'; renderArena(); }); await m.waitForTimeout(400);
await m.screenshot({path:'sn_brief_390.png'}); ok(await m.evaluate(()=>document.getElementById('kfsRoot').classList.contains('sn-rain') && !!document.querySelector('.sn-chip') && document.documentElement.scrollWidth<=innerWidth), '비 오는 날 화면(빗줄기·날짜 줄) · 가로 스크롤 없음');
await p.evaluate(()=>{ K_PROP_NEXT='k1'; kStart(4242); K.intro=false; K.cal0=Date.UTC(2026,0,12); K.loc='site'; arenaTab='king'; renderArena(); }); await p.waitForTimeout(300); await p.screenshot({path:'sn_brief_1280.png'});
console.log('errors', errs); await b.close();})();
