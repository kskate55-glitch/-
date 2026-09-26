const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:800}}); p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(700);
await p.evaluate(()=>{ localStorage.clear(); cpUnlockAll(); delete kcRec().life; lfNew('seoyun'); lfRec().intro=false; kcRec().fr={full:true}; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='f11'; KC_INTRO=false; kStart(3); K.intro=false; renderArena(); });
await p.mouse.click(5,400); await p.waitForTimeout(600);
// ── 환경음: 장면마다 bed·event 구성
const sc=async(fn)=>p.evaluate(fn).then(()=>p.waitForTimeout(300)).then(()=>p.evaluate(()=>({scene:AMB&&AMB.scene, beds:AMB?Object.keys(AMB.beds).sort():[], ev:AMB?Object.keys(AMB.ev).filter(k=>AMB.ev[k]>0).sort():[]})));
let r=await sc(()=>{ K.loc='home'; K.step='brief'; renderArena(); }); ok(r.scene==='home' && r.beds.includes('room'), '조사·집 = 방 공기 '+JSON.stringify(r));
r=await p.evaluate(()=>{ const a=ambHour, w=ambWx; ambHour=()=>22; ambWx=()=>({id:'clear',m:8}); K.loc='site'; AMB.key=''; ambSync(); const o={beds:Object.keys(AMB.beds), kids:AMB.ev.kids}; ambHour=a; ambWx=w; K.loc='home'; AMB.key=''; ambSync(); return o; }); ok(r.beds.includes('crickets') && !r.kids, '여름 밤 현장 = 풀벌레, 아이들 없음 '+JSON.stringify(r));
r=await sc(()=>{ window._ah=ambHour; window._aw=ambWx; ambHour=()=>14; ambWx=()=>({id:'clear',m:5}); K.loc='site'; AMB.key=''; renderArena(); }); ok(r.scene==='street' && r.beds.includes('traffic') && ['car','kids','bike'].every(k=>r.ev.includes(k)), '현장(맑은 낮) = 차·아이들·자전거 '+JSON.stringify(r));
r=await sc(()=>{ ambHour=window._ah; ambWx=window._aw; K.sealed={amt:KP.minBid+100,pred:{}}; renderArena(); }); ok(r.scene==='court' && r.beds.includes('murmur') && r.ev.includes('steps'), '입찰 = 법원 웅성 '+JSON.stringify(r));
r=await sc(()=>{ K.sealed=null; K.step='sell'; K.sale={list:1,trueP:1,weeks:1,offers:[],done:false}; renderArena(); }); ok(r.scene==='office' && r.ev.includes('phone'), '매도 = 중개사무소 '+JSON.stringify(r));
r=await sc(()=>{ K.step='defect'; K.defects=[]; renderArena(); }); ok(r.scene==='work' && r.ev.includes('hammer'), '수리 = 망치·드릴 '+JSON.stringify(r));
// 비 오는 날: 밖에선 빗소리 bed, 안에선 먹먹한 빗소리
r=await p.evaluate(()=>{ for(let d=1; d<400; d++){ K.day=d; if(snNow().W.id==='rain') break; } K.step='brief'; K.loc='site'; AMB.key=''; ambSync(); const a=AMB.beds.rain; K.loc='home'; AMB.key=''; ambSync(); const b2=AMB.beds.rain; return {wx:snNow().W.id, out:!!a&&!a.inside, inside:!!b2&&b2.inside}; });
ok(r.out && r.inside, '비 오는 날 빗소리(밖=크게, 안=먹먹하게) '+JSON.stringify(r));
// 매물마다 성격이 다르다
const tr=await p.evaluate(()=>{ const out={}; for(const id of ['f11','f31','f64','k1']){ KP=K_PROPS[id]; out[id]=ambTraits(); } return out; });
ok(tr.f64.machine>0 && tr.f64.kids<0.2 && tr.f31.market>0, '공장=기계 웅·아이들 없음 / 상가=사람 소리 '+JSON.stringify({f64:tr.f64.machine.toFixed(2), f31:tr.f31.market.toFixed(2)}));
// 모든 이벤트 소리가 오류 없이 난다 + 실제 신호가 나온다
const lv=await p.evaluate(async()=>{ const an=KA.ac.createAnalyser(); an.fftSize=2048; AMB.g.connect(an); const d=new Float32Array(2048); const res={}; for(const k of Object.keys(AMB_EV)){ AMB_EV[k](); await new Promise(r=>setTimeout(r,400)); an.getFloatTimeDomainData(d); res[k]=Math.sqrt(d.reduce((a,x)=>a+x*x,0)/d.length); } return {state:KA.ac.state, res}; });
console.log(JSON.stringify(lv)); ok(lv.state!=='running' || Object.values(lv.res).filter(v=>v>1e-4).length>=12, '이벤트 소리 '+Object.keys(lv.res).length+'종 신호 확인');
// 음소거 / 환경음 0이면 꺼진다
r=await p.evaluate(()=>{ const c=kaCfg(); c.amb=0; kaSave(c); ambSync(); const a=Object.keys(AMB.beds).length; c.amb=80; kaSave(c); AMB.key=''; ambSync(); return [a, Object.keys(AMB.beds).length]; });
ok(r[0]===0 && r[1]>0, '환경음 0 → 전부 꺼짐, 되돌리면 다시 '+r);
ok(await p.evaluate(()=>/환경음/.test(kcSfxBtn())), '소리 설정에 🌆 환경음 막대');
// ── 프렐류드: 서윤만
const pre=await p.evaluate(()=>[gxPreludeFirst('seoyun'), gxPreludeFirst('dohyun')]); ok(pre[0] && !pre[1], '"누군가는 집을…" 막간은 서윤만');
// ── 경쟁자: 빌라 평균 1~3명, 많아야 4명(나 포함 5)
const cm=await p.evaluate(()=>{ let n=0,c=0,mx=0; const ids=Object.keys(K_PROPS).filter(id=>{ K_PROP_NEXT=id; kStart(1); return rbKind()!=='apt'; }); for(const id of ids) for(let s=1;s<=40;s++){ K_PROP_NEXT=id; kStart(500+s); n+=K.rivals.length; c++; mx=Math.max(mx,K.rivals.length); } return {avg:n/c, mx}; });
ok(cm.avg>=0.8 && cm.avg<=2.0 && cm.mx<=4, '빌라·상가 경쟁자 평균 '+cm.avg.toFixed(2)+'명 · 최대 '+cm.mx+'명(나 제외)');
// ── 도현: 연차 3일 · 대리입찰 강제
const dh=await p.evaluate(()=>{ delete kcRec().life; lfNew('dohyun'); return lfRec().leave; }); ok(dh===3, '도현 연차 3일');
const mg=await p.evaluate(()=>{ const L=lfRec(); L.leave=15; L.leave3=false; dpLeaveFix(); return L.leave; }); ok(mg===3, '예전 저장(15일)도 3일로');
const fp=await p.evaluate(()=>{ const on=ilProxyOn; ilProxyOn=()=>true; kcRec().cash=9000; K_PROP_NEXT='f11'; kStart(7); K.intro=false; K.epStory={ch:'dohyun', i:2}; K.sealed={amt:KP.minBid+100,pred:{}}; K.ilAttend=null; const L=lfRec(); L.leave=3; renderArena();
  const a={mode:K.ilAttend, off:!!document.querySelector('[data-ilattend="direct"][disabled]'), why:(document.querySelector('.dp-why')||{}).innerText||''};
  ilProxyRec()['dohyun:1:x']={mode:'proxy'}; K.ilAttend=null; K.epStory.i=3; L.leave=3; renderArena(); const b={off:!!document.querySelector('[data-ilattend="direct"][disabled]')};
  L.leave=0; K.lf=K.lf||null; dpBidWeekday=()=>true; renderArena(); const c={off:!!document.querySelector('[data-ilattend="direct"][disabled]'), mode:K.ilAttend};
  ilProxyOn=on; return {a,b,c}; });
ok(fp.a.mode==='proxy' && fp.a.off && /결산/.test(fp.a.why), '도현 3번째 사건: 대리입찰 한 번도 안 썼으면 직접 참석 막힘 '+JSON.stringify(fp.a));
ok(!fp.b.off, '대리입찰을 한 번 썼고 연차 남으면 직접 참석 가능');
ok(fp.c.off && fp.c.mode==='proxy', '연차 0일 평일 → 대리입찰로');
await p.close();
console.log(errs.length?'FAIL\n'+errs.join('\n'):'ALL OK'); await b.close(); })();
