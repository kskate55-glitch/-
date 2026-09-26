// v211: 캐릭터 감정형 오프닝(장편) + 엔딩 에필로그 — 여섯 명 전부 끝까지 재생 · 에필로그는 엔딩 판정·저장·해금을 바꾸지 않는다
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(w+' '+e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const IDS=['seoyun','dohyun','mijeong','jaehoon','eunkyung','taesik'];
if(w===1280){
  const d=await p.evaluate(IDS=>IDS.map(id=>{ const O=OE_DATA[id]; const n=a=>a.reduce((s,x)=>s+x.lines.length,0);
    return {id, same:LF_OPENINGS[id]===O.opening, op:n(O.opening), core:n(O.ending.core), slots:O.art.filter(a=>ART_SLOTS.some(s=>s.id===a.id)).length}; }),IDS);
  d.forEach(x=>ok(x.same && x.op>=28 && x.op<=42 && x.core>=20 && x.slots===4, `${x.id}: 새 오프닝 연결 · ${x.op}줄 · 에필로그 공통 ${x.core}줄 · 새 그림 슬롯 ${x.slots}/4 등록`));
}
// 1) 오프닝을 처음부터 끝까지 — 장면마다 그림이 비지 않고, 화면 소품(ui)이 뜨고, 끝나면 거점으로 넘어간다
for(const id of (w===1280?IDS:['mijeong'])){
  const r=await p.evaluate(async id=>{ localStorage.clear(); lfNew(id); page='arena'; arenaTab='life'; gxOpStart(id);
    const O=GX_OP, sc=LF_OPENINGS[id]; let emptyArt=0, ui=0, uiWant=sc.filter(s=>s.ui).length, seenScene=new Set(), g=0;
    await new Promise(r=>setTimeout(r,50)); gxAdvance();
    while(GX_OP===O && O.i<sc.length && g++<2000){
      if(!seenScene.has(O.i)){ seenScene.add(O.i); const im=[...O.el.querySelectorAll('.gx-bgimg')].pop(); if(!im||!/url\(/.test(im.style.backgroundImage)) emptyArt++; if(sc[O.i].ui && O.el.querySelector('.gx-ui-slot').innerHTML.trim()) ui++; }
      gxAdvance(); gxAdvance(); }
    const finale = GX_OP===O && O.i===999; gxOpEnd(false); await new Promise(r=>setTimeout(r,100));
    return {scenes:seenScene.size, want:sc.length, emptyArt, ui, uiWant, finale, gone:!GX_OP, base:arenaTab==='life'}; }, id);
  ok(r.scenes===r.want && r.emptyArt===0 && r.ui===r.uiWant && r.finale && r.gone && r.base, `${w} ${id} 오프닝 ${r.scenes}/${r.want}장면 끝까지 · 그림 빈 장면 ${r.emptyArt} · 화면 소품 ${r.ui}/${r.uiWant} · 타이틀 후 거점`);
}
// 2) 엔딩: 에필로그 켬/끔 모두 저장 결과가 똑같다
const snap=async(on,id,pct)=>p.evaluate(({on,id,pct})=>{ localStorage.clear(); OE_EPILOGUE=on; cpUnlockAll&&cpUnlockAll(); const P=cpRec(); P.cleared={}; P.endings={}; const R=epOf(id); R.res=[0,1,2,3].map(i=>({pct,d:30,dExtra:0,w:100,wExtra:0,profit:500})); EP={ch:id,i:4,scr:'recap'}; epFinish();
  const P2=cpRec(); return {ending:P2.cleared[id]&&P2.cleared[id].ending, endings:Object.keys(P2.endings[id]||{}), next:CP_SHOW&&CP_SHOW.next, unlocked:!!(CP_SHOW&&CP_SHOW.next&&P2.unlocked[CP_SHOW.next]), card:!!document.querySelector('.cp-end'), epi:!!document.querySelector('.gx-op.gx-end'), mode:GX_OP&&GX_OP.mode, type:GX_OP&&GX_OP.type}; },{on,id,pct});
for(const [id,pct,t] of [['seoyun',80,'good'],['mijeong',50,'normal'],['taesik',95,'special'],['dohyun',20,'bad']]){
  const a=await snap(false,id,pct); await p.evaluate(()=>{ if(GX_OP) gxOpEnd(true); CP_SHOW=null; cpPaint(); });
  const bb=await snap(true,id,pct);
  ok(a.ending===t && bb.ending===t && JSON.stringify({...a,epi:0,mode:0,type:0})===JSON.stringify({...bb,epi:0,mode:0,type:0}), `${w} ${id} ${t}: 에필로그 켜도 엔딩·해금·다음 단계 동일 (${JSON.stringify({e:bb.ending,next:bb.next,unl:bb.unlocked})})`);
  ok(!a.epi && bb.epi && bb.mode==='end' && bb.type===t && bb.card, `${w} ${id}: 엔딩 카드 위에 ${t} 에필로그가 덮여 재생`);
  if(id==='seoyun'){
    const z=await p.evaluate(()=>{ const e=document.querySelector('.gx-op.gx-end'), c=document.querySelector('.cp-end'); const r=e.getBoundingClientRect(); const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return {above:+getComputedStyle(e).zIndex>+getComputedStyle(c).zIndex, cover:e.contains(top)}; });
    ok(z.above && z.cover, `${w} 에필로그가 엔딩 카드보다 위 (${JSON.stringify(z)})`);
    // 끝까지 재생 — 마지막 장면은 기존 엔딩 그림
    const L=await p.evaluate(async()=>{ const O=GX_OP, sc=O.scenes; let g=0, lastArt='', lastWant=''; while(GX_OP===O && O.i<sc.length && g++<2000){ if(O.i===sc.length-1&&!lastArt){ const im=[...O.el.querySelectorAll('.gx-bgimg')].pop(); lastArt=(im&&im.style.backgroundImage)||''; lastWant=cpEndArt(O.id,O.type)||''; } gxAdvance(); gxAdvance(); }
      const t=O.el.querySelector('.gx-title'); const title=t&&!t.hidden?t.innerText:''; gxOpEnd(false); await new Promise(r=>setTimeout(r,1000)); return {lastArt:!!lastWant && lastArt.includes(lastWant.slice(-40)), title, gone:!document.querySelector('.gx-op'), card:!!document.querySelector('.cp-end'), btn:!!document.querySelector('[data-oereplay]')}; });
    ok(L.lastArt && /GOOD END/.test(L.title) && L.gone && L.card && L.btn, `${w} 에필로그 끝 → 「제목」 GOOD END → 사라지고 엔딩 카드·다시 보기 버튼 남음 (${L.title.replace(/\n/g,' ')})`);
    await p.click('[data-oereplay]'); await p.waitForTimeout(300);
    ok(await p.evaluate(()=>!!(GX_OP&&GX_OP.mode==='end'&&GX_OP.type==='good')), `${w} 🎬 에필로그 다시 보기 재생`);
    await p.click('[data-gxskip]'); await p.waitForTimeout(200); await p.click('[data-gxskip]'); await p.waitForTimeout(1100);
    ok(await p.evaluate(()=>!document.querySelector('.gx-op') && !!document.querySelector('.cp-end')), `${w} SKIP 두 번이면 바로 엔딩 카드로`);
  }
  await p.evaluate(()=>{ if(GX_OP) gxOpEnd(true); CP_SHOW=null; cpPaint(); });
}
const hs=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1); ok(hs, `${w} 가로 스크롤 없음`);
await p.close(); }
ok(!errs.filter(e=>!/^(✅|❌)/.test(e)).some(e=>/Error|error|undefined/.test(e)) , 'JS 오류 없음');
console.log(errs.length?`\n실패 ${errs.length}: `+errs.join(' | '):'\n전부 통과'); await b.close(); process.exit(errs.length?1:0);})();
