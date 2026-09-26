// v192 — 외전 장면 그림: 장면에 cg=가 붙어 있고 그림이 등록된 칸은 그 장면에서 실제로 뜨는지(모든 편 자동 순회)
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const list=await p.evaluate(()=>{ const out=[]; IL_ORDER.forEach(id=>{ const d=IL[id]; (d.scenes||[]).forEach(sc=>{ const n=d.prog[sc.pc]; if(n&&n.cg&&artUrl(n.cg)) out.push({id,sid:sc.id,cg:n.cg}); }); }); return out; });
ok(['cg_il_s01_a','cg_il_s01_b','cg_il_s01_c','cg_il_d01_a','cg_il_d01_b','cg_il_s03_c','cg_il_d01_c','cg_il_d03_a','cg_il_s03_a','cg_il_s03_b','cg_il_m01_a','cg_il_m01_b','cg_il_m01_c','cg_il_d03_c','cg_il_d03_b','cg_il_m03_a','cg_il_m03_b','cg_il_m03_c','cg_il_j01_a','cg_il_j01_b','cg_il_j01_c','cg_il_j03_a','cg_il_j03_b','cg_il_j03_c','cg_il_e01_a','cg_il_e01_b','cg_il_e01_c','cg_il_e03_a','cg_il_e03_c','cg_il_t01_a','cg_il_t01_b','cg_il_t01_c','cg_il_t03_a','cg_il_t03_b'].every(c=>list.some(x=>x.cg===c)), '장면 그림 등록 ('+list.length+'칸)');
const clash=await p.evaluate(()=>{ const bad=[]; IL_ORDER.forEach(id=>{ const d=IL[id]; const sc=d.scenes||[]; sc.forEach((x,i)=>{ const n=d.prog[x.pc]; if(!n||!n.cg||!artUrl(n.cg)) return; const end=i+1<sc.length?sc[i+1].pc:d.prog.length; for(let k=x.pc+1;k<end;k++){ const m=d.prog[k]; if(m&&m.k==='cg'&&m.id!=='off'&&m.id!==n.cg) bad.push(id+' '+x.id+' '+m.id); } }); }); return bad; });
ok(clash.length===0, '장면 그림을 대사 중 @cg가 다른 그림으로 덮지 않음 '+clash.join('|'));
for(const x of list){
  const r=await p.evaluate(async x=>{ localStorage.clear(); const d=IL[x.id]; lfNew(d.ch); ilStart(x.id,{album:true}); ilCfgSet({speed:'instant'}); ilGoScene(x.sid);
    const img=document.querySelector('.il-cg img'); if(!img) return {shown:false};
    const w=await new Promise(r=>{ if(img.complete&&img.naturalWidth) return r(img.naturalWidth); img.onload=()=>r(img.naturalWidth); img.onerror=()=>r(0); });
    const box=document.querySelector('.il-cg'); const shown=!box.hidden && img.getAttribute('src')===artUrl(x.cg); ilClose(true); return {shown,w}; }, x);
  ok(r.shown && r.w>1000, `${x.id} ${x.sid} → ${x.cg} 화면에 뜸`);
}
const end=await p.evaluate(async()=>{ localStorage.clear(); lfNew('seoyun'); ilStart('S01',{album:true}); ilFinish(); const i=document.querySelector('.il-end-cg'); const s=i&&i.getAttribute('src'); ilClose(true); return s===artUrl('cg_il_s01_a'); });
ok(end, 'S01 끝 화면 대표 그림 = 영수증 더미(a)');
ok(errs.filter(e=>e.startsWith('pageerror')).length===0, 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join('|'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
