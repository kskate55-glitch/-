const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
if(w===1280){
  const bad=await p.evaluate(()=>Object.values(K_PROPS).filter(P=>P.rate!=null).map(P=>{ const exp=Math.round(P.appraisal*Math.pow(1-P.rate,P.fails)); return [P.id,P.court,P.rate,P.fails,P.appraisal,P.minBid,exp,(P.minBid/P.trueMid).toFixed(2)]; }));
  const wrong=bad.filter(r=>Math.abs(r[5]-r[6])>1 || (+r[7]>0.70 && r[0]!=='k2'));   // k2는 '감정가가 부풀려진 함정' 물건이라 일부러 76%
  ok(bad.length===24 && !wrong.length, '24개 물건 최저가 = 감정가×(1−저감률)^유찰 · 시세 70% 이하 '+JSON.stringify(wrong));
  ok(bad.filter(r=>/인천지방법원|부천|고양|안산/.test(r[1])).every(r=>r[2]===0.3) && bad.filter(r=>/서울|남양주|의정부지방법원$|수원지방법원$|평택/.test(r[1])).every(r=>r[2]===0.2), '법원별 저감률(서울·의정부·수원·평택 20%, 인천·부천·고양·안산 30%)');
}
await p.evaluate(()=>{ localStorage.clear(); kcRec().fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f11'; KC_INTRO=false; kStart(11); K.intro=false; K.timeLeft=9999; KP.actions.slice(0,4).forEach(a=>kResearch(a.id)); renderArena(); }); await p.waitForTimeout(1100);
ok(await p.evaluate(()=>![...document.querySelectorAll('button')].some(b=>/그만두기/.test(b.innerText))), w+' 그만두기 버튼 없음');
await p.evaluate(()=>{ STG.file=false; renderArena(); }); await p.waitForTimeout(500); let ft=await p.evaluate(()=>document.body.innerText); await p.evaluate(()=>{ STG.file=true; renderArena(); }); await p.waitForTimeout(500); ft+=await p.evaluate(()=>document.body.innerText); await p.evaluate(()=>{ STG.file=false; renderArena(); }); await p.waitForTimeout(300); ok(/의정부지방법원 남양주지원에서는 유찰될 때마다 최저가가 20%씩/.test(ft), w+' 입찰표 안내 = 이 법원 저감률');
if(w===1280){
  ok(/2회 유찰 · 감정가의 64%/.test(ft), w+' 사건파일 최저가 옆 "2회 유찰 · 감정가의 64%"');
  await p.click('[data-nxnote]'); await p.waitForTimeout(500);
  const np=await p.evaluate(()=>{ const n=document.querySelector('.nx-notepaper.nx-float'), pl=document.querySelector('.kfs-stage .vn-player'); if(!n) return null; const r=n.getBoundingClientRect(), q=pl.getBoundingClientRect(); return {nl:Math.round(r.left), pr:Math.round(q.right), fam:getComputedStyle(n.querySelector('.nx-book')).fontFamily, t:n.querySelector('.nx-grip').innerText}; });
  ok(np && Math.abs(np.nl-np.pr)<80 && /Gaegu|cursive/.test(np.fam), w+' 조사 노트가 주인공 바로 옆 + 손글씨 '+JSON.stringify(np));
  await p.screenshot({path:'v122_note.png'});
  const g=await (await p.$('.nx-notepaper .nx-grip')).boundingBox();
  await p.mouse.move(g.x+60,g.y+10); await p.mouse.down(); await p.mouse.move(g.x+360,g.y+120,{steps:8}); await p.mouse.up(); await p.waitForTimeout(200);
  const g2=await (await p.$('.nx-notepaper .nx-grip')).boundingBox(); ok(g2.x-g.x>200 && g2.y-g.y>80, w+' 노트 끌어서 옮김');
  await p.evaluate(()=>renderArena()); await p.waitForTimeout(400); const g3=await (await p.$('.nx-notepaper .nx-grip')).boundingBox(); ok(Math.abs(g3.x-g2.x)<10, w+' 다시 그려도 옮긴 자리');
}
// 명도: 사정 듣기 → 이 물건 전용 사연
await p.evaluate(()=>{ let t=0; while(t++<8){ kBid(Math.round(KP.minBid*1.4)); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; } K.loan={none:true}; K.step='move'; K.scene=null; renderArena(); kMove('listen'); renderArena(); });
await p.waitForTimeout(2200);
const tale=await p.evaluate(()=>{ const e=document.getElementById('mtTale'); return e? e.innerText:''; });
ok(/배당기일/.test(tale), w+' f11 사정 듣기 = 윤서연 전용 사연: '+tale.slice(0,60).replace(/\n/g,' '));
if(w===1280) await p.screenshot({path:'v122_tale.png'});
await p.evaluate(()=>{ mtClose(); });
// 중개사·매수자
await p.evaluate(()=>{ let g=0; while(K.step==='move'&&g++<80){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed);continue;} if(K.occ.agreed){ if(!K.occ.paper) kMove('paper'); else kTick(1); continue;} kMove(['center','date'][g%2]); } if(typeof mtClose==='function') mtClose(); kRepair('part'); renderArena(); });
await p.waitForTimeout(700);
ok(await p.isVisible('[data-kftalk="broker"]'), w+' 호가 단계에 "김사장 얘기 들어 보기"');
await p.click('[data-kftalk="broker"]'); await p.waitForTimeout(500);
const bt=await p.evaluate(()=>document.getElementById('mtTale')?document.getElementById('mtTale').innerText:''); ok(/김사장/.test(bt), w+' 중개사 사연 뜸');
await p.evaluate(()=>{ mtClose(); kList(KP.list[1]); let s=0; while(K.step==='sell' && !K.sale.offer && s++<20) kSaleAnswer('wait'); renderArena(); }); await p.waitForTimeout(600);
if(await p.evaluate(()=>K.step==='sell' && !!K.sale.offer)){
  ok(await p.isVisible('[data-kftalk="buyer"]'), w+' 매도 제안에 "매수자 사정 들어 보기"');
  await p.click('[data-kftalk="buyer"]'); await p.waitForTimeout(500);
  const by=await p.evaluate(()=>document.getElementById('mtTale')?document.getElementById('mtTale').innerText:''); ok(/매수자/.test(by), w+' 매수자 사연 뜸');
  if(w===1280) await p.screenshot({path:'v122_buyer.png'});
  await p.evaluate(()=>mtClose());
}
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
const v=await b.newPage(); await v.goto('http://localhost:8765/rights-study.html'); await v.waitForTimeout(500);
ok(await v.evaluate(()=>Object.values(LF_VOICE).every(V=>V.idle.length>=8 && V.move && V.move.length>=3 && V.defect && V.sell)), '혼잣말: 캐릭터마다 평소 8줄+, 명도·하자·매도 대사');
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
