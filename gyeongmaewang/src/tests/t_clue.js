const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
for(const [w,h] of [[1280,900],[390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(async()=>{ localStorage.clear(); kcRec().fr={full:true}; arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false; kStart(5); K.intro=false; renderArena(); });
await p.waitForTimeout(600);
// 실제 버튼 클릭 — 첫 번째 가능한 조사(집·전화 메뉴 안)
const clicked=await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-kres]')].find(x=>!x.disabled); if(!b) return null; b.click(); return b.dataset.kres; });
await p.waitForTimeout(900);
const s1=await p.evaluate(()=>{ const f=document.querySelector(innerWidth>900?'#kfsRoot .cf-flash':'#cfToast .cf-flash'); if(!f) return null; const r=f.getBoundingClientRect(), bb=f.closest('.vn-box'), bx=bb?bb.getBoundingClientRect():{}; return {txt:f.innerText.slice(0,120), op:+getComputedStyle(f).opacity, inBox:bx.left==null?false:r.left>=bx.left-1&&r.right<=bx.right+1&&r.bottom<=bx.bottom+1, vis:r.top>=0&&r.bottom<=innerHeight, top:(()=>{ const e=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return !!(e&&e.closest('.cf-flash')); })()}; });
ok(clicked && s1 && s1.op>0.8 && (w>900 ? s1.inBox : true) && s1.vis && s1.top, `${w} 누르자 단서 카드 [${clicked}] ${JSON.stringify(s1)}`);
await p.screenshot({path:`t_clue_${w}_on.png`});
// 두 번째 조사 — 새 단서로 바뀌는지
const c2=await p.evaluate(()=>{ K.timeLeft=9999; const b=[...document.querySelectorAll('[data-kres]')].find(x=>!x.disabled && x.dataset.kres!==K.rlog[0].id); if(!b) return null; b.click(); return b.dataset.kres; });
await p.waitForTimeout(700);
const s2=await p.evaluate(()=>{ const f=document.querySelectorAll(innerWidth>900?'#kfsRoot .cf-flash':'#cfToast .cf-flash'); return {n:f.length, head:f[0]&&f[0].querySelector('.cf-head').innerText}; });
ok(c2 && s2.n===1, `${w} 다른 조사 누르면 새 카드 하나로 교체 [${c2}] ${JSON.stringify(s2)}`);
await p.waitForTimeout(6800);
const s3=await p.evaluate(()=>{ const f=[...document.querySelectorAll('.cf-flash')].find(x=>getComputedStyle(x).display!=='none'); return f? +getComputedStyle(f).opacity : 0; });
ok(s3<0.05, `${w} 6.5초 뒤 사라짐 opacity=${s3}`);
// 다시 그려도 안 되살아나야
await p.evaluate(()=>renderArena()); await p.waitForTimeout(300);
const s4=await p.evaluate(()=>[...document.querySelectorAll('.cf-flash')].some(f=>getComputedStyle(f).display!=='none'));
ok(!s4, `${w} 다시 그려도 되살아나지 않음`);
const note=await p.evaluate(()=>K.log.length);
ok(note>=2, `${w} 조사 노트에도 남음 (${note}줄)`);
}
console.log('errors',errs); await b.close();})();
