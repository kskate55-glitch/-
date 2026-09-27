// v230: 사건 소개 버튼이 바로 보이고 빈 무대 띠 없음 · 거점 옮기기 삭제 · 새 외전 그림 4장 · 외전 대사 압축
const { chromium } = require('playwright');
let fail=0; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) fail++; };
(async()=>{const b=await chromium.launch(); const errs=[];
for(const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:(w>500?800:844)}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
await p.evaluate(()=>{localStorage.clear();kcRec().fr={full:true};page='arena';arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=true;kStart(3);renderArena();});
await p.waitForTimeout(1400);
const r=await p.evaluate(()=>{const b=document.querySelector('.kc-intro .kc-open'); const bb=b.getBoundingClientRect(); const st=document.querySelector('#kfsRoot .kfs-stage'); return {op:+getComputedStyle(b).opacity, txt:b.textContent, inView:bb.bottom<=innerHeight && bb.top>0, stageH:st?st.getBoundingClientRect().height:0, introTop:document.querySelector('.kc-intro').getBoundingClientRect().top};});
ok(r.op>0.9, w+' 사건 소개 버튼이 1.4초 안에 보인다');
ok(/조사하러 가기/.test(r.txt), w+' 버튼 이름에 "조사하러 가기"');
ok(r.inView, w+' 버튼이 화면 안에 있다');
ok(r.stageH<2 && r.introTop<80, w+' 위쪽 빈 검은 띠 없음 ('+Math.round(r.stageH)+','+Math.round(r.introTop)+')');
await p.click('.kc-intro .kc-open'); await p.waitForTimeout(500);
ok(await p.evaluate(()=>!K.intro), w+' 버튼을 누르면 조사로 넘어간다');
await p.close();}
const p=await b.newPage(); await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
ok(await p.evaluate(()=>{ const c=kcRec(); delete c.life; lfNew('seoyun'); lfRec().intro=false; const h=lfPanel('bank'); return !/거점 옮기기|data-lfmove/.test(h); }), '거점 옮기기 없음');
ok(await p.evaluate(()=>({j01:'27ac7555',j03:'afb30158',s03:'19657210',t03:'1b9c954d'}) && ['cg_il_j01_c','cg_il_j03_c','cg_il_s03_b','cg_il_t03_b'].every((k,i)=>artUrl(k).includes(['27ac7555','afb30158','19657210','1b9c954d'][i]))), '새 외전 그림 4장 연결');
const lens=await p.evaluate(()=>['D01','D03','S01','S03','M01','M03','E01','E03','J01','J03','T01','T03'].map(id=>IL[id]? IL[id].prog.filter(x=>x.k==='line').length : -1));
console.log('대사 줄 수', lens.join(','));
ok(lens.every(n=>n>0), '외전 12편 모두 로드');
ok(await p.evaluate(()=>IL_ORDER.every(id=>!IL[id].errs.length)), '외전 대본 문법 오류 없음 '+(await p.evaluate(()=>IL_ORDER.filter(id=>IL[id].errs.length).map(id=>id+':'+IL[id].errs[0]).join(' / '))));
await p.close();

// 초보 모드: 강조(ez-rec)가 붙어도 사건 소개 버튼이 보여야 한다 / ⭐추천은 버튼 위쪽 이름표
for(const w of [1280,390]){ const p2=await b.newPage({viewport:{width:w,height:844}}); p2.on('pageerror',e=>errs.push(e.message));
 await p2.goto('http://localhost:8765/rights-study.html#arena'); await p2.waitForTimeout(800);
 await p2.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; kcRec().ez=true; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='k1'; KC_INTRO=true; kStart(3); renderArena(); });
 await p2.waitForTimeout(1500);
 ok(await p2.evaluate(()=>{ const b=document.querySelector('.kc-intro .kc-open'); return !!b && b.classList.contains('ez-rec') && +getComputedStyle(b).opacity>0.9; }), w+' 초보 모드에서도 사건 소개 버튼이 보인다');
 await p2.click('.kc-intro .kc-open'); await p2.waitForTimeout(1000);
 await p2.evaluate(()=>{ const st=document.querySelector('.ez-rec .ez-star'); const d=st&&st.closest('details'); if(d) d.open=true; }); await p2.waitForTimeout(300);
 ok(await p2.evaluate(()=>{ const st=[...document.querySelectorAll('.ez-rec > .ez-star')].find(x=>x.offsetWidth); if(!st) return false; const b=st.parentElement.getBoundingClientRect(), s=st.getBoundingClientRect(); return getComputedStyle(st).position==='absolute' && s.top<b.top+4; }), w+' ⭐추천은 버튼 위쪽 테두리에 얹힌다(내용을 밀지 않음)');
 await p2.close(); }
ok(errs.length===0, '오류 없음 '+errs.slice(0,3).join(' | '));
await b.close(); console.log('fail='+fail); })();
