const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const ok=(c,m)=>{ console.log((c?'✅ ':'❌ ')+m); if(!c) errs.push(m); };
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
const NEW={f53:'엥흐',f31:'배정숙',f51:'오승민',f54:'윤소라',f61:'새솔',f63:'탁만수',f64:'변재섭'}, OLD=/바트 씨|구혜란|이상훈|한정우|서지은|황금철|도강철|한빛/;
for(const [id,nm] of Object.entries(NEW)){
  const r=await p.evaluate(async([id,src])=>{ const re=new RegExp(src); const hits=new Set(); let seen='';
    const grab=()=>{ const t=document.body.innerText+'\n'+(K?K.log.join('\n'):'')+'\n'+(typeof HUB_TOAST!=='undefined'?HUB_TOAST.map(x=>x.t).join('\n'):''); seen+=t; t.split('\n').forEach(l=>{ if(re.test(l)) hits.add(l.trim().slice(0,120)); }); };
    localStorage.clear(); window.MT_SKIP_TALE=false; window.LN_FAST=true; const c=kcRec(); delete c.life; c.fr={full:true}; c.cash=900000; page='arena'; arenaTab='king'; KC_MODE='career'; K_PROP_NEXT=id; KC_INTRO=false; kStart(5); K.intro=false; renderArena(); grab();
    KP.actions.forEach(a=>{ K.timeLeft=9999; kResearch(a.id); renderArena(); grab(); });
    let bb=Math.round(KP.minBid*1.3); for(let t=0;t<12;t++){ kBid(bb); K.revealing=false; K.sealed=false; if(K.step==='won') break; K.step='brief'; bb=Math.round(bb*1.08); }
    K.loan={none:true}; K.step='move'; K.scene=null; renderArena(); grab();
    for(let g=0; g<30 && K.step==='move'; g++){ if(K.pendingFlip){kFlipAnswer(false);continue;} if(K.offering){kOffer(K.askNeed); renderArena(); grab(); continue;} try{ kMove(['listen','listen','date','paper'][g%4]);}catch(e){} renderArena(); grab(); }
    return {hits:[...hits], name:KP.occ.name, met:Object.keys(hubRec().met), pid:KP.occ.pid}; },[id,OLD.source]);
  ok(r.name.includes(nm) && r.hits.length===0, id+' '+r.name+' — 옛 이름이 화면·기록·알림에 안 나옴'+(r.hits.length?' ✗ '+r.hits.slice(0,3).join(' / '):''));
  ok(!r.met.includes(r.pid), id+' 자유 플레이 인물('+r.pid+')을 만났다고 도감에 안 올림');
}
// 이름이 같은 물건(f43 유리아)은 그대로 도감 등록
let r=await p.evaluate(()=>{ localStorage.clear(); const c=kcRec(); c.fr={full:true}; KC_MODE='career'; K_PROP_NEXT='f43'; kStart(5); K.intro=false; return Object.keys(hubRec().met).includes('p_live'); });
ok(r, '같은 사람(f43 유리아 씨)은 예전처럼 도감 등록');
// 자유 플레이 인물은 그대로
r=await p.evaluate(()=>['p_madam','p_fake','p_5000','p_lien','p_hawaii','p_chain'].map(id=>personaById(id).name).join(','));
ok(/구혜란/.test(r)&&/이상훈/.test(r)&&/한정우/.test(r)&&/한빛/.test(r)&&/황금철/.test(r)&&/도강철/.test(r), '자유 플레이·스토리 인물 이름은 그대로 ('+r+')');
ok(!errs.some(e=>e.startsWith('pageerror')), 'JS 오류 없음 '+errs.filter(e=>e.startsWith('pageerror')).join(';'));
console.log(errs.length?'FAIL':'ALL OK'); await b.close(); })();
