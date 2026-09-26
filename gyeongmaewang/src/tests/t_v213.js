// v213: 브금 다채롭게 — 캐릭터별 편곡·사건마다 다른 진행·멜로디·엔딩 4종·미리듣기. 게임 수치는 불변.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const cur=()=>p.evaluate(()=>{ const x=KA_PLAY.filter(x=>!x.dead).pop(); return x?x.id:null; });
await p.evaluate(()=>{ KA_UNLOCKED=true; kaCtx(); });
// 1) 모든 변주 곡 생성·멜로디 음역
const s1=await p.evaluate(()=>{ let n=0,bad=0; for(const ch of Object.keys(BV_CHAR)){ for(const sc of BV_SCENES) for(const ck of [null,'a','b','c']){ const tr=KA_TRACKS[bvScene(sc,ch,ck)]; n++; const ns=tr.mel.filter(Boolean); if(!ns.length||ns.some(x=>x[0]<60||x[0]>90)) bad++; } for(const t of ['normal','good','bad','special']){ n++; if(!KA_TRACKS[bvEnding(ch,t)].mel.some(Boolean)) bad++; } } return {n,bad}; });
ok(s1.bad===0, `변주 곡 ${s1.n}개 생성 · 멜로디 음역 이상 ${s1.bad}`);
// 2) 캐릭터 인생 중 사건: 캐릭터·사건에 맞는 곡, 사건이 바뀌면 진행도 바뀐다
const s2=await p.evaluate(()=>{ const out={}; for(const ch of ['seoyun','eunkyung']){ localStorage.clear(); delete kcRec().life; lfNew(ch); const _r=renderArena; renderArena=function(){}; page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false;
  const ids=[]; for(const k of ['k1','k2']){ K_PROP_NEXT=k; kStart(7); K.intro=false; K.step='brief'; kaWant(kaScene()); ids.push(KA_PLAY.filter(x=>!x.dead).pop().id); } renderArena=_r; out[ch]=ids; }
  const pr=id=>JSON.stringify(KA_TRACKS[id].prog); return {out, diffCase: pr(out.seoyun[0])!==pr(out.seoyun[1]), diffChar: KA_TRACKS[out.seoyun[0]].root!==KA_TRACKS[out.eunkyung[0]].root}; });
ok(/^research@seoyun#/.test(s2.out.seoyun[0]) && /^research@eunkyung#/.test(s2.out.eunkyung[0]), `사건 조사 곡 = 캐릭터 변주 (${s2.out.seoyun[0]} / ${s2.out.eunkyung[0]})`);
ok(s2.diffCase, '같은 캐릭터라도 사건이 다르면 화음 진행이 다르다');
ok(s2.diffChar, '같은 장면이라도 캐릭터가 다르면 조성이 다르다');
// 3) 명도 긴장 레이어가 변주 곡에서도 켜진다
const s3=await p.evaluate(async()=>{ kaWant(null); await new Promise(r=>setTimeout(r,50)); const id=bvScene('tenant','jaehoon','k1'); BV_PREVIEW=0; kaWant(null); const _=KA_PLAY.forEach(x=>x.dead=true); kaStartTrack(id); kaSetTension(true); await new Promise(r=>setTimeout(r,500)); const x=KA_PLAY.find(x=>x.id===id&&!x.dead); return {has:!!x, t:x?x.tr.tension:false, g:x?x.tg.gain.value:0}; });
ok(s3.has && s3.t && s3.g>0.05, `명도 변주 곡에서도 긴장 레이어 작동 (gain ${s3.g.toFixed(2)})`);
// 4) 오프닝 = 멜로디 얹은 캐릭터 곡, 에필로그 = 판정별 엔딩 곡
await p.evaluate(()=>{ localStorage.clear(); delete kcRec().life; lfNew('mijeong'); gxOpStart('mijeong'); });
await p.waitForTimeout(200); ok((await cur())==='op_mijeong@mel', `오프닝 곡 = ${await cur()}`);
await p.evaluate(()=>gxOpEnd(true));
for(const [pct,t] of [[95,'special'],[80,'good'],[50,'normal'],[20,'bad']]){
  await p.evaluate(pct=>{ localStorage.clear(); cpUnlockAll&&cpUnlockAll(); const R=epOf('taesik'); R.res=[0,1,2,3].map(()=>({pct,d:30,dExtra:0,w:100,wExtra:0,profit:500})); EP={ch:'taesik',i:4,scr:'recap'}; epFinish(); },pct);
  await p.waitForTimeout(150); const id=await cur(); ok(id===`end_taesik_${t}`, `엔딩 ${t} → ${id}`);
  await p.evaluate(()=>{ if(GX_OP) gxOpEnd(true); CP_SHOW=null; cpPaint(); });
}
// 5) 외전 곡은 그대로 외전 전용
await p.evaluate(()=>{ localStorage.clear(); lfNew('mijeong'); ilStart('M01',{album:true}); }); await p.waitForTimeout(200);
ok(/^il_M01/.test(await cur()||''), `외전 곡 그대로 (${await cur()})`); await p.evaluate(()=>ilClose(true));
// 6) 미리듣기: 설정 칸에서 캐릭터·장면 골라 재생 → 화면이 바뀌어도 유지 → ■ 로 원래 곡
await p.evaluate(()=>{ localStorage.clear(); page='arena'; arenaTab='home'; renderArena(); });
await p.waitForTimeout(300);
const has=await p.$('.kc-audio'); ok(!!has, '소리 설정 칸 있음');
if(has){ await p.evaluate(()=>document.querySelector('.kc-audio').open=true); await p.waitForTimeout(100);
  const box=await p.$('.bv-prev'); ok(!!box, '🎧 브금 들어보기 줄 있음');
  if(box){ await p.selectOption('[data-bvch]','dohyun'); await p.selectOption('[data-bvwhat]','end:special'); await p.click('[data-bvplay]'); await p.waitForTimeout(200);
    ok((await cur())==='end_dohyun_special', `미리듣기 재생 (${await cur()})`);
    await p.evaluate(()=>{ kaSync(); }); await p.waitForTimeout(100); ok((await cur())==='end_dohyun_special', '미리듣기 중엔 화면이 바뀌어도 곡 유지');
    await p.selectOption('[data-bvwhat]','court'); await p.click('[data-bvplay]'); await p.waitForTimeout(100); const a=await cur(); await p.click('[data-bvnext]'); await p.waitForTimeout(100); const b2=await cur();
    ok(a!==b2 && /^court@dohyun#/.test(b2), `🔀 다른 사건 버전 (${a} → ${b2})`);
    await p.click('[data-bvstop]'); await p.waitForTimeout(100); ok(!/^court@|end_/.test(await cur()||''), `■ 누르면 원래 장면 곡 (${await cur()})`);
    const r=await p.evaluate(()=>{ const e=document.querySelector('.bv-prev').getBoundingClientRect(); return e.width>0; }); ok(r,'미리듣기 줄 표시');
  }
}
for(const [w,h] of [[390,844]]){ await p.setViewportSize({width:w,height:h}); await p.evaluate(()=>{ page='arena'; arenaTab='home'; renderArena(); document.querySelector('.kc-audio')&&(document.querySelector('.kc-audio').open=true); }); await p.waitForTimeout(200); ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), `${w} 가로 스크롤 없음`); await p.screenshot({path:'../oe/v213_prev_390.png'}); }
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?`\n실패 ${errs.length}`:'\n전부 통과'); await b.close(); process.exit(errs.length?1:0);})();
