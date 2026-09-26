const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
for(const [w,h] of [[1280,800],[390,844]]){ const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
const toList=async(n,bk)=>p.evaluate(([n,bk])=>{ localStorage.clear(); kcRec().fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career'; KC_INTRO=false; K_PROP_NEXT='f'+n; kStart(n); K.intro=false; if(bk) K.sfBk=bk; K.repair=Object.assign({},K_REPAIR.find(x=>x.id==='min')); K.step='list'; renderArena(); },[n,bk]);
if(w===1280){
  ok(await p.evaluate(()=>SF_BROKERS.length===6 && SF_BUYERS.length===5 && SF_BUYERS.every(x=>DP_BUYER_SAY[x.t]&&KF_BUYER_TALE[x.t]&&ST_TYPES[x.t])), '중개사 6 · 매수인 5 (대사·사연·조건 전부)');
  const txt=await p.evaluate(()=>JSON.stringify([SF_BROKERS,SF_BUYERS,SF_CARTEL_NOTE]));
  const ban=['평공','텐엑스','쌤','강사','카페','아카데미','수강생','유튜브','http','010-'].filter(x=>txt.includes(x)); ok(!ban.length,'금지어 없음 '+ban);
  // 본편 난수 순서를 안 건드린다
  const same=await p.evaluate(()=>{ const run=(on)=>{ K_PROP_NEXT='f11'; kStart(11); K.repair=Object.assign({},K_REPAIR.find(x=>x.id==='min')); K.step='list'; if(!on){ K.sfBk='kim'; } kList(KP.list[1]); for(let i=0;i<6&&!K.sale.done;i++) kSaleAnswer('wait'); return K.r(); }; return [run(true),run(true)]; });
  ok(same[0]===same[1], '같은 시드 = 같은 결과');
  const kr=await p.evaluate(()=>{ K_PROP_NEXT='f11'; kStart(11); K.repair=Object.assign({},K_REPAIR.find(x=>x.id==='min')); K.step='list'; let n=0; const o=K.r; K.r=()=>{n++; return o();}; K.sfBk='cut'; kList(KP.list[1]); const a=n; n=0; K.sale.sfW=-1; sfAdjust(); return [a,n]; });
  ok(kr[1]===0, 'sfAdjust는 K.r을 한 번도 안 부른다 '+kr);
}
for(const bk of ['kim','cut','doc','blunt','chat','excl']){
  await toList(11,bk); await p.waitForTimeout(250);
  const v=await p.evaluate(()=>{ const c=document.querySelector('.sf-bk'); return c? {t:c.innerText, img:!!(c.querySelector('img')&&c.querySelector('img').naturalWidth>0), talk:!!document.querySelector(K.sfBk==='kim'?'[data-kftalk="broker"]':'[data-sftalk]')}:null; });
  ok(v && v.img && v.talk, w+' '+bk+' 카드·얼굴·얘기 버튼 '+(v?v.t.slice(0,40).replace(/\n/g,' '):''));
  if(w===1280 && bk!=='kim'){ await p.click('[data-sftalk]'); await p.waitForTimeout(300); const t=await p.evaluate(()=>document.getElementById('mtTale')?.innerText||''); ok(t.length>10, bk+' 사연 뜸'); await p.evaluate(()=>{ const n=MT.lines.length; for(let i=0;i<n;i++) document.querySelector('#mtTale [data-mtnext]').click(); }); await p.waitForTimeout(200); ok(await p.evaluate(()=>!window.MT && K.brokerHeard),'사연 끝'); }
  if(['cut','doc','excl'].includes(bk)){ await p.click('[data-sfpick="yes"]'); await p.waitForTimeout(200); ok(await p.evaluate(()=>{ const c=SF_BROKERS.find(x=>x.id===K.sfBk).choice; return K['sf_'+c.key]==='yes' && /✔/.test(document.querySelector('.sf-bk').innerText); }), w+' '+bk+' 선택 반영'); }
  if(w===1280 && bk==='doc') await p.screenshot({path:'v214_broker.png'});
  await p.evaluate(()=>{ kList(KP.list[1]); renderArena(); }); await p.waitForTimeout(250);
  ok(await p.evaluate(()=>!!document.querySelector('.sf-week')), w+' '+bk+' 매도 중 주간 한마디');
}
// 부천 · 인천 컨설팅비
for(const n of [21,22,11]){
  await toList(n,'kim'); await p.waitForTimeout(250);
  const has=await p.evaluate(()=>!!document.querySelector('[data-sfcart]'));
  ok(has===(n!==11), w+' f'+n+' 컨설팅비 제안 '+(n!==11?'뜸':'안 뜸'));
  if(has && w===1280 && n===21) await p.screenshot({path:'v214_cartel.png'});
  if(has && w===390 && n===21) await p.screenshot({path:'v214_cartel_m.png',fullPage:false});
}
await toList(21,'kim'); await p.click('[data-sfcart="pay"]'); await p.waitForTimeout(200);
const res=await p.evaluate(()=>{ kList(KP.list[2]); let g=0; while(!K.sale.done && g++<40){ if(K.sale.offer){ K.sale.offer.buyer=Object.assign({},K.sale.offer.buyer,{cancel:0}); kSaleAnswer('accept'); } else kSaleAnswer('wait'); } if(K.step!=='result'){ K.step='result'; } renderArena(); return {b:K.cost.broker, paid:K.sfCartPaid, row:/컨설팅비 500/.test(document.body.innerText)}; });
ok(res.paid && res.b>=500 && res.row, w+' 컨설팅비 정산 반영 '+JSON.stringify(res));
await toList(22,'kim'); await p.click('[data-sfcart="no"]'); await p.evaluate(()=>{ kList(KP.list[1]); renderArena(); }); await p.waitForTimeout(200);
ok(await p.evaluate(()=>/컨설팅비를 안 줘서/.test(document.querySelector('.sf-week').innerText)), w+' 거절하면 초반 주간 안내');
// 미루다 말 바꾸는 매수자
const fl=await p.evaluate(()=>{ K_PROP_NEXT='f11'; kStart(11); K.repair=Object.assign({},K_REPAIR.find(x=>x.id==='min')); K.step='list'; kList(KP.list[3]); const b={t:SF_FLAKE,flex:0.006,cancel:1}; K.sale.offer={amt:KP.list[3],buyer:b}; kSaleAnswer('accept'); return K.sale.note||''; });
ok(/다른 집 하기로/.test(fl), w+' 말 바꾸는 매수자 문구: '+fl.slice(0,50));
// 매도 장면 매수자 대사 = 주인공 가슴에 안 붙는다, 무대 안에 들어온다
await p.evaluate(()=>{ K_PROP_NEXT='f11'; kStart(11); K.intro=false; K.repair=Object.assign({},K_REPAIR.find(x=>x.id==='min')); K.step='list'; kList(KP.list[0]); K.sale.offer={amt:KP.list[2],buyer:K_BUYERS[1]}; renderArena(); }); await p.waitForTimeout(3600);
const bub=await p.evaluate(()=>{ const st=document.querySelector('.k-stage'), bx=st&&st.querySelector(':scope > .vn-box'); if(!bx) return null; const a=st.getBoundingClientRect(), r=bx.getBoundingClientRect(); return {bub:bx.classList.contains('vn-npcbub'), inside:(()=>{ const sp=st.querySelector(':scope > .vn-sprite'); if(!sp) return true; const q=sp.getBoundingClientRect(); return r.bottom<=q.top+q.height*0.15 || r.right<=q.left || r.left>=q.right; })()}; });
ok(bub && !bub.bub && bub.inside, w+' 매도 대사 칸: 말풍선 아님 · 주인공과 안 겹침 '+JSON.stringify(bub));
if(w===1280) await p.screenshot({path:'v214_sell.png'});
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), w+' 가로 스크롤 없음');
await p.close(); }
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
