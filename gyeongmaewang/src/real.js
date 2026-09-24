/* ============================== 실전 — 사건 분석 연습 · 내 물건 분석 ============================== */
/* 규칙 요약(사이트 전체와 동일)
   - 말소기준 후보: 근저당·저당·가압류·압류·담보가등기·강제경매개시결정, 배당요구(또는 경매신청)한 선순위 전세권
   - 기준보다 먼저 = 인수, 뒤 = 소멸. 예외: 건물철거·토지인도 가처분은 순위와 무관하게 인수
   - 임차인 대항력 = 전입 다음 날 0시 → 전입일이 기준 등기일보다 '앞'이어야 있음
   - 우선변제 순위일 = max(전입 다음 날 0시, 확정일자), 배당요구 필수
   - 배당: 경매비용 → 최우선변제(입력 시) → 당해세 → 날짜순. 가압류·강제경매 채권은 안분 후 흡수 */

const REAL_TYPES = [
  ["소유권","own"],["근저당","mort"],["저당","mort"],["가압류","gaap"],["압류","ap"],
  ["담보가등기","gdam"],["가등기","gbo"],["가처분","gproc"],["전세권","jeonse"],["지상권","jisang"],
  ["지역권","jiyeok"],["임차권","imcha"],["임의경매","auction"],["강제경매","gangje"],["기타","etc"]
];
const REAL_TYPE_NAMES = REAL_TYPES.map(t=>t[0]);
function realCat(type){
  const t = String(type||"");
  if(/소유권/.test(t) && !/가등기|청구권/.test(t)) return "own";
  if(/근저당|저당/.test(t)) return "mort";
  if(/가압류/.test(t)) return "gaap";
  if(/압류/.test(t)) return "ap";
  if(/담보가등기/.test(t)) return "gdam";
  if(/가등기/.test(t)) return "gbo";
  if(/가처분/.test(t)) return "gproc";
  if(/전세권/.test(t)) return "jeonse";
  if(/지상권/.test(t)) return "jisang";
  if(/지역권/.test(t)) return "jiyeok";
  if(/임차권/.test(t)) return "imcha";
  if(/강제경매/.test(t)) return "gangje";
  if(/임의경매|경매개시/.test(t)) return "auction";
  return "etc";
}
const REAL_UNSECURED = {gaap:1, gangje:1};
const realD = s => { if(!s) return null; if(s instanceof Date) return s; const m = String(s).match(/(\d{4})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/); if(!m) return null; const d = new Date(+m[1], +m[2]-1, +m[3]); return isNaN(d) ? null : d; };
const realFmt = d => d ? fmt(d) : "—";

/* ---------- 분석 엔진 ---------- */
function realAnalyze(c){
  const rights = c.rights.filter(r=>realD(r.date)).map((r,i)=>Object.assign({}, r, {i, d:realD(r.date), cat:realCat(r.type), amt:+r.amt||0}))
    .sort((a,b)=> a.d-b.d || (+a.no||0)-(+b.no||0) || a.i-b.i);
  const isBaseCand = r => ["mort","gaap","ap","gdam","gangje"].includes(r.cat) || (r.cat==="jeonse" && r.demand);
  const base = rights.find(isBaseCand) || null;
  const fates = {};
  rights.forEach(r => {
    let f, why;
    if(r.cat==="own"){ f="-"; why="소유권 — 판정 대상 아님"; }
    else if(base && r===base){ f="소멸"; why = r.cat==="jeonse" ? "말소기준권리 — 선순위 전세권자가 배당요구(또는 경매신청)해서 기준이 됨(건물 전부 전세권일 때)" : "말소기준권리 — 가장 먼저 등기된, 돈이 목적인 권리"; }
    else if(r.cat==="auction"){ f="소멸"; why="경매개시결정 등기 — 매각으로 말소"; }
    else if(r.cat==="gproc" && /철거|인도/.test(r.note||"")){ f="인수"; why="건물철거·토지인도 가처분 — 순위와 상관없이 인수(건물을 잃을 수 있음)"; }
    else if(!base){ f="인수"; why="말소기준권리가 없어 전부 인수로 봐야 한다 — 매각물건명세서 확인 필수"; }
    else if(r.d < base.d || (+r.d===+base.d && (+r.no||0) < (+base.no||0))){
      f="인수";
      why = {gbo:"기준보다 먼저인 보전가등기 — 본등기되면 소유권을 잃을 수 있다", gproc:"기준보다 먼저인 가처분 — 본안에서 지면 소유권을 잃을 수 있다",
             jeonse:"기준보다 먼저인 전세권 — 배당요구를 안 해서 낙찰자가 보증금을 떠안는다", jisang:"기준보다 먼저인 지상권 — 낙찰자가 떠안는다",
             jiyeok:"기준보다 먼저인 지역권 — 낙찰자가 떠안는다", imcha:"기준보다 먼저인 임차권등기 — 보증금 인수 가능성(임차인 표 확인)"}[r.cat] || "말소기준보다 먼저 등기 → 인수";
    } else { f="소멸"; why="말소기준 이후 등기 → 매각으로 소멸"; }
    fates[r.i] = {f, why};
  });
  const baseD = base ? base.d : null;
  const tenants = c.tenants.map((t,j)=>{
    const move = realD(t.move), fix = realD(t.fix), dep = +t.dep||0, prio = Math.min(+t.prio||0, dep);
    const dh = !!move && (!baseD || move < baseD);
    let eff = null, effFromMove = false;
    if(move && fix && t.demand){ const e1 = addDays(move,1); if(fix > e1){ eff = fix; } else { eff = e1; effFromMove = true; } }
    return {j, name:t.name||`임차인 ${j+1}`, move, fix, demand:!!t.demand, dep, prio: t.demand ? prio : 0, dh, eff, effFromMove, got:0};
  });

  /* 배당 */
  const sale = +c.sale||0, cost = +c.cost||0, tax = +c.tax||0;
  let pool = sale; const table = [];
  const pay = (name, amt, why, ref) => { const g = Math.max(0, Math.min(amt, pool)); pool -= g; table.push({name, amt, got:g, why}); if(ref) ref.got += g; return g; };
  pay("경매비용", cost, "0순위");
  tenants.filter(t=>t.prio>0).forEach(t => pay(`${t.name} (최우선변제)`, t.prio, "소액임차인 최우선변제 — 입력한 금액", t));
  if(tax) pay("당해세", tax, "3순위 — 그 집에 매겨진 세금(2023.4 이후 규정 변경은 별도 확인)");
  const claims = [];
  rights.forEach(r => {
    if(["mort","gdam","ap"].includes(r.cat) && r.amt) claims.push({name:`${r.type}${r.holder?` (${r.holder})`:""}`, amt:r.amt, d:r.d, tie:1, no:+r.no||0, sec:true, why:`접수일 ${fmt(r.d)}`});
    else if(r.cat==="jeonse" && r.amt && (r.demand || r===base)) claims.push({name:`전세권${r.holder?` (${r.holder})`:""}`, amt:r.amt, d:r.d, tie:1, no:+r.no||0, sec:true, why:`접수일 ${fmt(r.d)} · 배당요구`});
    else if(REAL_UNSECURED[r.cat] && r.amt) claims.push({name:`${r.type}${r.holder?` (${r.holder})`:""}`, amt:r.amt, d:r.d, tie:1, no:+r.no||0, sec:false, why:`접수일 ${fmt(r.d)} · 우선변제권 없음 → 안분`});
  });
  tenants.forEach(t => { if(t.eff) claims.push({name:`${t.name} (우선변제)`, amt:t.dep - t.got, d:t.eff, tie: t.effFromMove?0:2, no:0, sec:true, tenant:t, why:`전입 다음 날 0시와 확정일자 중 늦은 날 ${fmt(t.eff)}${t.effFromMove?" 0시":""}`}); });
  claims.sort((a,b)=> a.d-b.d || a.tie-b.tie || a.no-b.no);
  let k = 0, anbun = false;
  while(k < claims.length){
    const c1 = claims[k];
    if(c1.sec){ pay(c1.name, c1.amt, c1.why, c1.tenant); k++; continue; }
    /* 안분: 이 채권과 뒤의 모든 채권이 남은 돈을 금액 비율로 나눈 뒤, 뒤의 우선변제권자가 자기보다 뒤 채권의 몫을 흡수 */
    anbun = true;
    const grp = claims.slice(k), sum = grp.reduce((s,x)=>s+x.amt,0);
    const share = grp.map(x => sum ? pool * x.amt / sum : 0);
    grp.forEach((x,gi) => { if(!x.sec) return; let need = x.amt - share[gi];
      for(let z = grp.length-1; z > gi && need > 0; z--){ const take = Math.min(need, share[z]); share[z] -= take; share[gi] += take; need -= take; } });
    grp.forEach((x,gi) => { const g = Math.round(share[gi]); table.push({name:x.name, amt:x.amt, got:g, why: x.sec ? x.why + " · 안분 후 뒤 채권에서 흡수" : x.why}); if(x.tenant) x.tenant.got += g; });
    pool = Math.max(0, pool - grp.reduce((s,x,gi)=>s+Math.round(share[gi]),0));
    break;
  }
  /* 인수액 */
  const insuItems = [];
  tenants.forEach(t => { if(t.dh){ const left = t.dep - t.got; if(left>0) insuItems.push({name:t.name, amt:left, why: !t.demand ? "대항력 있음 + 배당요구 안 함 → 보증금 전액 인수" : `대항력 있음 → 못 받은 ${man(left)} 인수`}); } });
  rights.forEach(r => { if(fates[r.i] && fates[r.i].f==="인수"){ if(r.cat==="jeonse" && r.amt) insuItems.push({name:`선순위 전세권`, amt:r.amt, why:"배당요구 안 한 선순위 전세권 → 보증금 인수"}); } });
  const danger = rights.filter(r => fates[r.i] && fates[r.i].f==="인수" && ["gbo","gproc","jisang","jiyeok","imcha","etc"].includes(r.cat));
  const insu = insuItems.reduce((s,x)=>s+x.amt,0);
  return {rights, base, fates, tenants, table, rest:pool, insu, insuItems, danger, anbun, sale, cost, tax};
}

/* 최대 입찰가: 입찰가×(1+취득비율) + 인수 + 기타비용 + 목표수익 = 예상 매도가 */
function realMaxBid(a, c){
  const sell = +c.sellPrice||0; if(!sell) return null;
  const rate = (+c.acqRate||0)/100, extra = +c.extra||0, profit = +c.profit||0;
  const v = (sell - a.insu - extra - profit) / (1 + rate);
  return Math.floor(v/10)*10;
}

/* ---------- 연습 사건 생성기 ---------- */
function realGen(){
  const y0 = 2016 + rnd(0,4);
  const d0 = new Date(y0, rnd(0,11), rnd(1,28));
  const own = {type:"소유권이전", holder:"소유자", date:fmt(d0), amt:""};
  const rights = [own]; const tenants = [];
  const scen = pick(["basic","basic","gaap","jeonseIn","jeonseBase","danger","demolish","tax"]);
  let t1 = addDays(d0, rnd(10,200));
  const add = (type, d, holder, amt, extra) => { const r = Object.assign({type, date:fmt(d), holder, amt: amt||""}, extra||{}); rights.push(r); return r; };
  let baseD;
  if(scen==="gaap"){ add("가압류", t1, "B카드", r100(rnd(20,80)*100)); baseD = t1; add("근저당권설정", addDays(t1, rnd(30,300)), "C은행", r100(rnd(60,200)*100)); }
  else if(scen==="jeonseIn"){ add("전세권설정", t1, "D(전세권자)", r100(rnd(80,200)*100)); baseD = addDays(t1, rnd(40,300)); add("근저당권설정", baseD, "A은행", r100(rnd(60,180)*100)); }
  else if(scen==="jeonseBase"){ add("전세권설정", t1, "D(전세권자)", r100(rnd(80,200)*100), {demand:true}); baseD = t1; add("근저당권설정", addDays(t1, rnd(40,300)), "A은행", r100(rnd(40,120)*100)); }
  else if(scen==="danger"){ add(pick(["소유권이전청구권가등기","처분금지가처분"]), t1, "E", ""); baseD = addDays(t1, rnd(30,300)); add("근저당권설정", baseD, "A은행", r100(rnd(60,180)*100)); }
  else { add("근저당권설정", t1, "A은행", r100(rnd(60,200)*100)); baseD = t1; }
  let last = rights[rights.length-1]; let ld = realD(last.date);
  if(Math.random()<0.6){ ld = addDays(ld, rnd(60,400)); add("근저당권설정", ld, "F캐피탈", r100(rnd(20,80)*100)); }
  if(scen==="tax" || Math.random()<0.25){ ld = addDays(ld, rnd(30,300)); add("압류", ld, "OO구청", r100(rnd(3,20)*100)); }
  if(Math.random()<0.45){ ld = addDays(ld, rnd(30,300)); add("가압류", ld, "G상사", r100(rnd(10,60)*100)); }
  if(scen==="demolish"){ ld = addDays(ld, rnd(20,200)); add("가처분", ld, "H(토지 소유자)", "", {note:"건물철거 및 토지인도 청구권"}); }
  ld = addDays(ld, rnd(30,300));
  add(Math.random()<0.8 ? "임의경매개시결정" : "강제경매개시결정", ld, "", "");
  const nT = pick([0,1,1,1,2]);
  for(let j=0;j<nT;j++){
    const mv = addDays(baseD, pick([-400,-120,-20,-1,0,30,200]));
    const hasFix = Math.random()<0.8, fx = hasFix ? addDays(mv, pick([0,0,3,60,300])) : null;
    tenants.push({name:`임차인 ${String.fromCharCode(0x3131 + j*2)}`, move:fmt(mv), fix: fx?fmt(fx):"", demand: Math.random()<0.75, dep: r100(rnd(30,200)*100), prio:0});
  }
  const appraisal = r100(rnd(180,450)*100);
  const sale = r100(appraisal * rnd(68,92)/100);
  return {src:"gen", title:"연습 사건", appraisal, sale, cost: rnd(20,45)*10, tax: Math.random()<0.3 ? r100(rnd(3,12)*100) : 0,
          rights, tenants, sellPrice: r100(appraisal*rnd(95,110)/100), acqRate:1.1, extra:300, profit:1000};
}

/* ---------- 탱크옥션 등 붙여넣기 파서 (관대하게) ---------- */
function realMoney(s){
  if(!s) return 0; s = String(s);
  let m = s.match(/(\d+)\s*억\s*([\d,]*)\s*(만)?/);
  if(m){ const eok = +m[1], rest = +(m[2]||"0").replace(/,/g,""); return eok*10000 + (m[3] ? rest : (rest>=10000 ? Math.round(rest/10000) : rest)); }
  m = s.match(/([\d,]{4,})\s*원/); if(m) return Math.round(+m[1].replace(/,/g,"")/10000);
  m = s.match(/([\d,]+)\s*만/); if(m) return +m[1].replace(/,/g,"");
  m = s.match(/([\d,]{7,})/); if(m) return Math.round(+m[1].replace(/,/g,"")/10000);
  return 0;
}
function realParse(text){
  const out = {src:"paste", title:"붙여넣은 물건", rights:[], tenants:[], cost:300, tax:0, acqRate:1.1, extra:300, profit:1000, warn:[]};
  const T = String(text||"").replace(/\r/g,"").replace(/ /g," ");
  let m = T.match(/(\d{4})\s*타경\s*(\d+)/); if(m) out.caseNo = `${m[1]}타경${m[2]}`;
  m = T.match(/감정가[^\d\n]{0,12}([\d,]+\s*원|\d+\s*억[\d,\s]*만?)/); if(m) out.appraisal = realMoney(m[1]);
  m = T.match(/최저(?:매각)?가[^\d\n]{0,12}([\d,]+\s*원|\d+\s*억[\d,\s]*만?)/); if(m) out.minBid = realMoney(m[1]);
  out.sale = out.minBid || (out.appraisal ? r100(out.appraisal*0.8) : 0);
  out.sellPrice = out.appraisal || 0;
  const DATE = /(\d{4})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/;
  /* 임차인: '전입'이 나오는 곳마다 앞뒤 구간을 잘라 읽는다 */
  const tenantSpans = [];
  const re = /전입/g; let mm; const idxs = [];
  while((mm = re.exec(T))) idxs.push(mm.index);
  const noMove = /전입\s*(일자?)?\s*[:：]?\s*(미상|없음|-)/;
  idxs.forEach((ix, n) => {
    if(n>0 && ix - idxs[n-1] < 25) return; /* 한 칸 안의 '전입' 중복 */
    const st = Math.max(0, ix - 60), en = Math.min(T.length, (idxs.find(v=>v>ix+25) || ix+220));
    const w = T.slice(st, en); tenantSpans.push([st,en]);
    const after = (kw) => { const p = w.search(kw); if(p<0) return null; const d = w.slice(p).match(DATE); return d ? `${d[1]}.${d[2].padStart(2,"0")}.${d[3].padStart(2,"0")}` : null; };
    const move = noMove.test(w) ? "" : (after(/전입/) || "");
    const fix = after(/확정/) || "";
    const demand = /배당\s*(요구)?\s*[:：]?\s*(\d{4}|있음|O|○|함)/.test(w) && !/배당\s*(요구)?\s*[:：]?\s*(없음|X|×|안\s*함|미신청)/.test(w);
    let dep = 0; const dm = w.match(/보(?:증금)?\s*[:：]?\s*([\d,]+\s*원|\d+\s*억[\d,\s]*만?|[\d,]+\s*만)/); if(dm) dep = realMoney(dm[1]);
    if(!dep){ const am = w.match(/([\d,]{7,}\s*원|\d+\s*억[\d,\s]*만?)/); if(am) dep = realMoney(am[1]); }
    out.tenants.push({name:`임차인 ${out.tenants.length+1}`, move, fix, demand, dep, prio:0});
  });
  /* 등기: 날짜와 권리 키워드가 같이 있는 줄(또는 바로 다음 줄) */
  const KW = /(소유권\s*이전|소유권\s*보존|근저당|저당권|가압류|압류|담보가등기|가등기|가처분|전세권|지상권|지역권|임차권|임의경매|강제경매|경매개시)/;
  const lines = T.split("\n"); let pos = 0; const seen = new Set();
  lines.forEach((ln, li) => {
    const start = pos; pos += ln.length + 1;
    if(tenantSpans.some(([a,b]) => start >= a && start < b && /전입|확정|배당/.test(ln))) return;
    let seg = ln; let d = seg.match(DATE), kw = seg.match(KW);
    if(d && !kw && lines[li+1]){ seg = ln + " " + lines[li+1]; kw = seg.match(KW); }
    if(!d && kw && li>0){ const prev = lines[li-1]; const pd = prev.match(DATE); if(pd && !prev.match(KW)){ seg = prev + " " + ln; d = pd; } }
    if(!d || !kw) return;
    const date = `${d[1]}.${d[2].padStart(2,"0")}.${d[3].padStart(2,"0")}`;
    const key = date + kw[1].replace(/\s/g,"");
    if(seen.has(key)) return; seen.add(key);
    let type = kw[1].replace(/\s/g,"");
    if(/가등기/.test(type) && /담보/.test(seg)) type = "담보가등기";
    const noM = seg.match(/제\s*(\d+)\s*호/);
    const amt = realMoney(seg.replace(DATE, " "));
    const note = /철거|인도/.test(seg) ? "건물철거·토지인도" : (/말소기준/.test(seg) ? "사이트 표시: 말소기준" : "");
    const demand = /전세권/.test(type) && /배당요구|경매신청|신청채권자/.test(seg);
    out.rights.push({type, date, no: noM ? +noM[1] : "", holder:"", amt: amt || "", note, demand});
  });
  if(!out.rights.length) out.warn.push("등기 권리를 한 줄도 못 읽었어요. 아래 표에 직접 넣거나, 등기부(등기권리) 부분을 포함해서 다시 복사해 주세요.");
  if(!out.tenants.length) out.warn.push("임차인 정보를 못 찾았어요. 임차인이 없는 물건이면 그대로 두고, 있으면 직접 추가하세요.");
  if(!out.sale) out.warn.push("감정가·최저가를 못 찾았어요. 예상 낙찰가를 직접 넣어 주세요.");
  return out;
}

/* ---------- 화면 ---------- */
let realTab = "case", RC = null, RA = null;   /* RC: 지금 보고 있는 사건, RA: 내 답 */
function realNewCase(c){ RC = c; RA = {base:null, fate:{}, dh:{}, got:{}, insu:"", graded:false, mode:"solve"}; }
function realShort(){ return {n:0, ok:0}; }

function renderReal(){
  if(!S.real) S.real = realShort();
  const tabs = `<div class="seg" role="tablist" aria-label="실전 종류" style="margin-bottom:14px"><button type="button" data-rtab="case" aria-pressed="${realTab==="case"}">사건 분석 연습</button><button type="button" data-rtab="paste" aria-pressed="${realTab==="paste"}">내 물건 분석 (붙여넣기)</button></div>`;
  let body = "";
  if(realTab==="case"){
    if(!RC || RC.src!=="gen") realNewCase(realGen());
    body = `<p class="lead">등기부·임차인·금액이 한 세트로 나옵니다. <b>말소기준 → 인수·소멸 → 대항력 → 배당·인수액</b>을 차례로 판단하고 채점하세요. 매번 새 가상 사건이 나와요.</p>
      <div class="row" style="justify-content:flex-start;gap:8px;margin-bottom:10px;font-size:13.5px;color:var(--muted)">지금까지 ${S.real.n}건 · 만점 ${S.real.ok}건</div>` + realSolveHTML();
  } else {
    body = realPasteHTML();
  }
  $("#main").innerHTML = `<section class="page"><div class="eyebrow">실전</div><h2 style="font-size:26px;margin-top:4px">${realTab==="case"?"사건 한 건 끝까지 분석하기":"내가 보는 물건 분석하기"}</h2>${tabs}${body}</section>`;
}

function realFactsHTML(c){
  return `<div class="facts" style="display:flex;flex-wrap:wrap;gap:6px 18px;font-size:14.5px">
    ${c.caseNo?`<span>사건 <b>${esc(c.caseNo)}</b></span>`:""}
    ${c.appraisal?`<span>감정가 <b class="mono">${man(c.appraisal)}</b></span>`:""}
    <span>${c.src==="gen"?"낙찰가":"예상 낙찰가"} <b class="mono">${man(+c.sale||0)}</b></span>
    <span>경매비용 <b class="mono">${man(+c.cost||0)}</b></span>
    <span>당해세 <b class="mono">${+c.tax?man(+c.tax):"없음"}</b></span></div>`;
}
function realRegHTML(a, withPick, graded){
  const rows = a.rights.map(r => {
    const f = a.fates[r.i]; const isOwn = r.cat==="own";
    let ctrl = "";
    if(withPick && !isOwn){
      const pickedBase = RA.base===r.i, fv = RA.fate[r.i];
      const mark = (ok) => graded ? (ok ? ' <span style="color:var(--ok);font-weight:700">✓</span>' : ' <span style="color:var(--seal);font-weight:700">✗</span>') : "";
      ctrl = `<div class="row" style="gap:6px;justify-content:flex-start;flex-wrap:wrap">
        <button type="button" class="btn${pickedBase?" pri":""}" data-rbase="${r.i}" ${graded?"disabled":""} style="padding:4px 9px;font-size:13px">기준</button>
        <span class="seg"><button type="button" data-rfate="${r.i}:인수" aria-pressed="${fv==="인수"}" ${graded?"disabled":""}>인수</button><button type="button" data-rfate="${r.i}:소멸" aria-pressed="${fv==="소멸"}" ${graded?"disabled":""}>소멸</button></span>
        ${graded ? `${(a.base===r) ? `<b style="color:var(--blue)">← 말소기준</b>${mark(pickedBase)}` : (pickedBase?mark(false):"")} <span>정답 <b>${f.f}</b>${mark(fv===f.f)}</span>` : ""}</div>
        ${graded?`<div class="note" style="margin-top:3px">${f.why}</div>`:""}`;
    } else if(!withPick){
      ctrl = isOwn ? `<span class="note">—</span>` : `<b style="color:${f.f==="인수"?"var(--seal)":"var(--ok)"}">${a.base===r?"말소기준 · ":""}${f.f}</b><div class="note">${f.why}</div>`;
    }
    return `<tr><td class="mono">${fmt(r.d)}${r.no?`<div class="note">제${r.no}호</div>`:""}</td><td><b>${esc(r.type)}</b>${r.holder?`<div class="note">${esc(r.holder)}</div>`:""}${r.note?`<div class="note">${esc(r.note)}</div>`:""}${r.demand?`<div class="note">배당요구·경매신청</div>`:""}</td><td class="mono">${r.amt?man(r.amt):""}</td><td>${ctrl}</td></tr>`;
  }).join("");
  return `<div class="reg"><table style="min-width:0"><caption>등기부 (갑구·을구 통합, 접수일순)<span>${RC.src==="gen"?"연습용 가상 물건":"붙여넣은 내용 기준"}</span></caption>
    <thead><tr><th>접수</th><th>권리</th><th>금액</th><th>${withPick?"판단":"결과"}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function realTenantHTML(a, withPick, graded){
  if(!a.tenants.length) return `<div class="panel pad" style="margin:0"><b>임차인</b> <span class="note">없음(또는 소유자 점유)</span></div>`;
  return a.tenants.map(t => {
    const dv = RA.dh[t.j];
    const mk = ok => graded ? (ok?' <span style="color:var(--ok);font-weight:700">✓</span>':' <span style="color:var(--seal);font-weight:700">✗</span>') : "";
    const info = `<div class="facts" style="display:flex;flex-wrap:wrap;gap:4px 16px;font-size:14px"><b>${esc(t.name)}</b><span>전입 <b class="mono">${realFmt(t.move)}</b></span><span>확정일자 <b class="mono">${realFmt(t.fix)}</b></span><span>배당요구 <b>${t.demand?"함":"안 함"}</b></span><span>보증금 <b class="mono">${man(t.dep)}</b></span>${t.prio?`<span>최우선변제(입력) <b class="mono">${man(t.prio)}</b></span>`:""}</div>`;
    let ctrl = "";
    if(withPick){
      ctrl = `<div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;margin-top:6px">대항력
        <span class="seg"><button type="button" data-rdh="${t.j}:1" aria-pressed="${dv===1}" ${graded?"disabled":""}>있음</button><button type="button" data-rdh="${t.j}:0" aria-pressed="${dv===0}" ${graded?"disabled":""}>없음</button></span>${graded?`정답 <b>${t.dh?"있음":"없음"}</b>${mk(dv===(t.dh?1:0))}`:""}
        <label style="display:flex;align-items:center;gap:6px">배당액 <input class="rin" data-rgot="${t.j}" inputmode="numeric" value="${esc(RA.got[t.j]??"")}" ${graded?"disabled":""} style="width:110px" placeholder="만원"></label>${graded?`정답 <b class="mono">${man(t.got)}</b>${mk(+RA.got[t.j]===Math.round(t.got))}`:""}</div>`;
    } else {
      ctrl = `<div class="note" style="margin-top:4px">대항력 <b>${t.dh?"있음":"없음"}</b> — 전입 다음 날 0시(${t.move?fmt(addDays(t.move,1)):"—"})가 말소기준(${RA&&RC&&realAnalyze(RC).base?fmt(realAnalyze(RC).base.d):"없음"})보다 ${t.dh?"빠름":"늦음"} · 배당 <b class="mono">${man(t.got)}</b></div>`;
    }
    return `<div class="panel pad" style="margin:0">${info}${ctrl}</div>`;
  }).join("");
}
function realBaeTable(a){
  return `<div class="reg"><table style="min-width:0"><caption>배당표<span>위에서부터 순서대로 받는다</span></caption>
    <thead><tr><th>받는 사람</th><th>청구액</th><th>배당액</th><th>이유</th></tr></thead>
    <tbody>${a.table.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td class="mono">${man(r.amt)}</td><td class="mono" style="font-weight:700">${man(r.got)}</td><td class="note">${r.why}</td></tr>`).join("")}
    ${a.rest>0?`<tr><td><b>전 소유자(잉여)</b></td><td></td><td class="mono">${man(a.rest)}</td><td class="note">다 주고 남은 돈</td></tr>`:""}</tbody></table></div>`;
}
function realSummaryHTML(a, c){
  const mb = realMaxBid(a, c);
  const baseTxt = a.base ? `<b>${fmt(a.base.d)} ${esc(a.base.type)}</b>` : `<b style="color:var(--seal)">못 찾음</b> — 돈이 목적인 권리가 없어 전부 인수로 봐야 해요`;
  return `<div class="panel pad" style="margin:0;display:grid;gap:8px">
    <div style="font-weight:800;font-size:16px">📋 분석 요약</div>
    <ul style="margin:0;padding-left:18px;display:grid;gap:4px">
      <li>말소기준권리: ${baseTxt}</li>
      <li>낙찰자가 떠안는 돈(인수액): <b class="mono" style="font-size:16px">${man(a.insu)}</b>${a.insuItems.length?` <span class="note">(${a.insuItems.map(x=>`${esc(x.name)} ${man(x.amt)} — ${x.why}`).join(" / ")})</span>`:""}</li>
      ${a.danger.length?`<li style="color:var(--seal)"><b>⚠️ 돈으로 끝나지 않는 인수 권리</b>: ${a.danger.map(r=>`${fmt(r.d)} ${esc(r.type)}`).join(", ")} — 소유권을 잃거나 사용이 막힐 수 있어 초보는 피하는 게 원칙이에요.</li>`:""}
      ${a.anbun?`<li class="note">가압류(또는 강제경매 채권)가 끼어 있어 그 뒤 채권들은 <b>안분 후 흡수</b>로 계산했어요(간이 계산).</li>`:""}
      ${mb!==null?`<li>최대 입찰가 참고: <b class="mono" style="font-size:16px">${man(mb)}</b> <span class="note">= (예상 매도가 ${man(+c.sellPrice)} − 인수 ${man(a.insu)} − 기타비용 ${man(+c.extra||0)} − 목표수익 ${man(+c.profit||0)}) ÷ (1 + 취득 부대비용 ${c.acqRate}%)</span></li>`:""}
    </ul>
    <p class="note" style="margin:0">간이 분석이에요. 유치권·법정지상권·위반건축물·대지권미등기·토지별도등기처럼 등기부 밖 위험은 매각물건명세서·현장에서 꼭 확인하세요. 최우선변제 금액·당해세 규칙·취득세율은 시점과 지역마다 달라서 최신 기준으로 넣어야 해요.</p></div>`;
}

function realSolveHTML(){
  const c = RC, a = realAnalyze(c), g = RA.graded;
  let res = "";
  if(g){
    const tOk = a.tenants.every(t => RA.dh[t.j]===(t.dh?1:0) && +RA.got[t.j]===Math.round(t.got));
    const baseOk = a.base ? RA.base===a.base.i : RA.base===null;
    const fateOk = a.rights.filter(r=>r.cat!=="own").every(r => RA.fate[r.i]===a.fates[r.i].f);
    const insuOk = +RA.insu === Math.round(a.insu);
    const parts = [["말소기준", baseOk],["인수·소멸", fateOk],["임차인", tOk],["인수액", insuOk]];
    const okN = parts.filter(p=>p[1]).length;
    res = `<div class="panel score" style="margin-top:4px"><h3>${okN===4?"완벽해요 — 4/4":`${okN}/4 맞았어요`}</h3>
      <div class="row" style="justify-content:flex-start;gap:14px;flex-wrap:wrap">${parts.map(p=>`<span>${p[0]} ${p[1]?"✓":"✗"}</span>`).join("")}</div>
      <div style="margin-top:10px;display:grid;gap:10px">${realBaeTable(a)}${realSummaryHTML(a, c)}</div>
      <div class="row" style="justify-content:flex-start;margin-top:10px;gap:8px">${c.src==="gen"?`<button type="button" class="btn seal" id="rNew">새 사건</button>`:`<button type="button" class="btn" id="rBackEdit">← 입력 표로</button>`}</div></div>`;
  }
  return `<div style="display:grid;gap:12px">
    ${realFactsHTML(c)}
    <div class="note">① 말소기준이라고 생각하는 권리에 <b>기준</b>을 누르고 ② 각 권리를 <b>인수/소멸</b>로 나눈 뒤 ③ 임차인의 대항력과 배당액을 적고 ④ 낙찰자 인수액을 적으세요.</div>
    ${realRegHTML(a, true, g)}
    ${realTenantHTML(a, true, g)}
    <div class="panel pad" style="margin:0"><label style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b>낙찰자 인수액 합계</b> <input class="rin" id="rInsu" inputmode="numeric" value="${esc(RA.insu)}" ${g?"disabled":""} style="width:120px" placeholder="만원"> 만원 ${g?`정답 <b class="mono">${man(a.insu)}</b>`:""}</label>
      <p class="note" style="margin:6px 0 0">대항력 있는 임차인이 못 받은 보증금 + 배당요구 안 한 선순위 전세권 보증금. 없으면 0.</p></div>
    ${g?"":`<div class="row" style="justify-content:flex-start;gap:8px"><button type="button" class="btn seal" id="rGrade">채점하기</button>${c.src==="gen"?`<button type="button" class="btn" id="rNew">다른 사건</button>`:`<button type="button" class="btn" id="rBackEdit">← 입력 표로</button>`}</div>`}
    ${res}</div>`;
}

let RP = {text:"", parsed:null, view:"input"};  /* 붙여넣기 상태 — 저장하지 않는다 */
function realPasteHTML(){
  if(RP.view==="solve" && RC && RC.src==="paste") return realSolveHTML();
  if(RP.view==="report" && RC && RC.src==="paste"){
    const a = realAnalyze(RC);
    return `<div style="display:grid;gap:12px">${realFactsHTML(RC)}${realSummaryHTML(a, RC)}${realRegHTML(a, false, true)}${realTenantHTML(a, false, true)}${realBaeTable(a)}
      <div class="row" style="justify-content:flex-start;gap:8px"><button type="button" class="btn" id="rBackEdit">← 입력 표 고치기</button><button type="button" class="btn pri" id="rSolveThis">이 물건으로 직접 풀어보기</button></div></div>`;
  }
  const p = RP.parsed;
  const typeOpts = sel => REAL_TYPE_NAMES.map(n=>`<option${realCat(sel)===realCat(n)&&(sel===n||!REAL_TYPE_NAMES.includes(sel)&&realCat(sel)===realCat(n))?" selected":""}>${n}</option>`).join("");
  const table = p ? `
    <div class="panel pad" style="margin:0;display:grid;gap:8px">
      <div style="font-weight:800">② 읽어 온 내용 확인·수정</div>
      ${p.warn.length?`<ul class="note" style="margin:0;padding-left:18px;color:var(--seal)">${p.warn.map(w=>`<li>${w}</li>`).join("")}</ul>`:""}
      <p class="note" style="margin:0">자동으로 읽은 값이라 틀릴 수 있어요. 등기부 원본과 한 번 대조하고 고쳐 주세요. 금액은 <b>만원</b> 단위예요.</p>
      <div class="rgrid">
        <label>사건번호<input class="rin" data-rf="caseNo" value="${esc(p.caseNo||"")}"></label>
        <label>감정가<input class="rin" data-rf="appraisal" inputmode="numeric" value="${esc(p.appraisal||"")}"></label>
        <label>예상 낙찰가<input class="rin" data-rf="sale" inputmode="numeric" value="${esc(p.sale||"")}"></label>
        <label>경매비용(추정)<input class="rin" data-rf="cost" inputmode="numeric" value="${esc(p.cost)}"></label>
        <label>당해세(알면)<input class="rin" data-rf="tax" inputmode="numeric" value="${esc(p.tax)}"></label>
        <label>예상 매도가<input class="rin" data-rf="sellPrice" inputmode="numeric" value="${esc(p.sellPrice||"")}"></label>
        <label>취득 부대비용 %<input class="rin" data-rf="acqRate" inputmode="decimal" value="${esc(p.acqRate)}"></label>
        <label>명도·수리 등<input class="rin" data-rf="extra" inputmode="numeric" value="${esc(p.extra)}"></label>
        <label>목표 수익<input class="rin" data-rf="profit" inputmode="numeric" value="${esc(p.profit)}"></label>
      </div>
      <div style="font-weight:700;margin-top:4px">등기 권리</div>
      <div class="redit">${p.rights.map((r,i)=>`<div class="rrow">
        <input class="rin" data-rr="${i}:date" value="${esc(r.date)}" placeholder="2020.01.31" style="width:112px">
        <select class="rin" data-rr="${i}:type">${typeOpts(r.type)}</select>
        <input class="rin" data-rr="${i}:amt" value="${esc(r.amt)}" inputmode="numeric" placeholder="금액(만원)" style="width:104px">
        <input class="rin" data-rr="${i}:note" value="${esc(r.note||"")}" placeholder="비고(예: 건물철거)" style="width:140px">
        <label class="note" style="display:flex;align-items:center;gap:4px"><input type="checkbox" data-rr="${i}:demand" ${r.demand?"checked":""}>배당요구</label>
        <button type="button" class="btn" data-rrdel="${i}" style="padding:3px 9px">삭제</button></div>`).join("")}</div>
      <div><button type="button" class="btn" id="rAddRight">+ 권리 추가</button></div>
      <div style="font-weight:700;margin-top:4px">임차인</div>
      <div class="redit">${p.tenants.map((t,i)=>`<div class="rrow">
        <b style="min-width:58px">${esc(t.name)}</b>
        <label class="note">전입<input class="rin" data-rt="${i}:move" value="${esc(t.move)}" placeholder="2020.01.31" style="width:112px"></label>
        <label class="note">확정<input class="rin" data-rt="${i}:fix" value="${esc(t.fix)}" placeholder="없으면 비움" style="width:112px"></label>
        <label class="note">보증금<input class="rin" data-rt="${i}:dep" value="${esc(t.dep)}" inputmode="numeric" style="width:96px"></label>
        <label class="note">최우선<input class="rin" data-rt="${i}:prio" value="${esc(t.prio)}" inputmode="numeric" style="width:76px" title="소액임차인이면 그 지역·시점 기준 금액"></label>
        <label class="note" style="display:flex;align-items:center;gap:4px"><input type="checkbox" data-rt="${i}:demand" ${t.demand?"checked":""}>배당요구</label>
        <button type="button" class="btn" data-rtdel="${i}" style="padding:3px 9px">삭제</button></div>`).join("")}</div>
      <div><button type="button" class="btn" id="rAddTenant">+ 임차인 추가</button></div>
      <div class="row" style="justify-content:flex-start;gap:8px;margin-top:6px"><button type="button" class="btn pri" id="rSolveThis">✏️ 먼저 내가 풀어보기</button><button type="button" class="btn seal" id="rReport">📋 바로 분석 보기</button></div>
    </div>` : "";
  return `<div style="display:grid;gap:12px">
    <p class="lead">탱크옥션 같은 경매 사이트의 물건 상세 화면에서 <b>전체 선택(Ctrl+A) → 복사(Ctrl+C)</b>한 내용을 붙여넣으면, 등기 권리와 임차인을 읽어서 말소기준·인수액·배당표·최대 입찰가까지 계산해 드려요. 그 물건으로 직접 풀어볼 수도 있어요.</p>
    <div class="panel pad" style="margin:0;display:grid;gap:8px">
      <div style="font-weight:800">① 붙여넣기</div>
      <textarea id="rPaste" rows="7" style="width:100%;font:inherit;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--sheet2);color:var(--ink)" placeholder="여기에 붙여넣기 (Ctrl+V)">${esc(RP.text)}</textarea>
      <div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap"><button type="button" class="btn pri" id="rParse">읽어오기</button><button type="button" class="btn" id="rClip">📋 클립보드에서</button><button type="button" class="btn" id="rManual">직접 입력으로 시작</button><button type="button" class="btn" id="rSample">예시로 해보기</button></div>
      <p class="note" style="margin:0">🔒 붙여넣은 내용은 이 화면 안에서만 계산하고 <b>어디에도 저장하지 않아요</b>. 임차인 이름도 '임차인 1'처럼 바꿔서 보여줘요. 사이트에 자동으로 접속해서 긁어오지 않고, 직접 복사한 글만 읽어요.</p>
    </div>
    ${table}</div>`;
}
const REAL_SAMPLE = `2024타경10000  서울특별시 OO구 OO동 000-00 OO빌라 3층 301호
감정가 250,000,000원   최저가 200,000,000원
임차인현황
홍OO  주거용 전부  전입일자: 2019.04.02  확정일자: 2019.04.02  배당요구: 2024.03.05  보40,000,000원
등기권리
2018.03.10  소유권이전  김OO
2019.05.20  근저당  OO은행  120,000,000원  말소기준등기
2021.07.01  가압류  OO카드  15,000,000원
2023.11.20  임의경매  OO은행`;

function realReadForm(){
  const p = RP.parsed; if(!p) return;
  document.querySelectorAll("[data-rf]").forEach(el => { p[el.dataset.rf] = el.value; });
  document.querySelectorAll("[data-rr]").forEach(el => { const [i,k] = el.dataset.rr.split(":"); p.rights[+i][k] = el.type==="checkbox" ? el.checked : el.value; });
  document.querySelectorAll("[data-rt]").forEach(el => { const [i,k] = el.dataset.rt.split(":"); p.tenants[+i][k] = el.type==="checkbox" ? el.checked : el.value; });
  const ta = $("#rPaste"); if(ta) RP.text = ta.value;
}
function realToCase(p){
  const num = v => +String(v||"").replace(/[^\d.]/g,"") || 0;
  return {src:"paste", title:p.title, caseNo:p.caseNo, appraisal:num(p.appraisal), sale:num(p.sale), cost:num(p.cost), tax:num(p.tax),
    sellPrice:num(p.sellPrice), acqRate:+p.acqRate||0, extra:num(p.extra), profit:num(p.profit),
    rights:p.rights.map(r=>Object.assign({}, r, {amt:num(r.amt)})), tenants:p.tenants.map(t=>Object.assign({}, t, {dep:num(t.dep), prio:num(t.prio)}))};
}

document.addEventListener("click", e => {
  if(page!=="real") return;
  let b;
  if((b = e.target.closest("[data-rtab]"))){ if(RP.parsed) realReadForm(); realTab = b.dataset.rtab; if(realTab==="case" && RC && RC.src!=="gen") RC = null; if(realTab==="paste" && RP.view!=="input" && (!RC||RC.src!=="paste")) RP.view="input"; renderReal(); return; }
  if((b = e.target.closest("[data-rbase]")) && RA && !RA.graded){ const i = +b.dataset.rbase; RA.base = RA.base===i ? null : i; if(RA.base===i) RA.fate[i] = "소멸"; realKeepInputs(); renderReal(); return; }
  if((b = e.target.closest("[data-rfate]")) && RA && !RA.graded){ const [i,f] = b.dataset.rfate.split(":"); RA.fate[+i] = f; realKeepInputs(); renderReal(); return; }
  if((b = e.target.closest("[data-rdh]")) && RA && !RA.graded){ const [j,v] = b.dataset.rdh.split(":"); RA.dh[+j] = +v; realKeepInputs(); renderReal(); return; }
  if(e.target.closest("#rGrade")){ realKeepInputs(); RA.graded = true; const a = realAnalyze(RC);
    const all = (a.base ? RA.base===a.base.i : RA.base===null) && a.rights.filter(r=>r.cat!=="own").every(r=>RA.fate[r.i]===a.fates[r.i].f) && a.tenants.every(t=>RA.dh[t.j]===(t.dh?1:0) && +RA.got[t.j]===Math.round(t.got)) && +RA.insu===Math.round(a.insu);
    if(RC.src==="gen"){ S.real.n++; if(all) S.real.ok++; save(); }
    renderReal(); return; }
  if(e.target.closest("#rNew")){ realNewCase(realGen()); renderReal(); window.scrollTo(0,0); return; }
  if(e.target.closest("#rParse")){ const t = ($("#rPaste")||{}).value||""; RP.text = t; RP.parsed = realParse(t); RP.view="input"; renderReal(); return; }
  if(e.target.closest("#rSample")){ RP.text = REAL_SAMPLE; RP.parsed = realParse(REAL_SAMPLE); RP.view="input"; renderReal(); return; }
  if(e.target.closest("#rManual")){ RP.parsed = {src:"paste", title:"직접 입력", rights:[{type:"근저당",date:"",amt:"",note:"",demand:false}], tenants:[], cost:300, tax:0, sale:"", sellPrice:"", acqRate:1.1, extra:300, profit:1000, warn:[]}; RP.view="input"; renderReal(); return; }
  if(e.target.closest("#rClip")){ if(navigator.clipboard && navigator.clipboard.readText){ navigator.clipboard.readText().then(t => { RP.text = t; RP.parsed = realParse(t); RP.view="input"; renderReal(); }).catch(()=>{ alert("클립보드를 읽을 수 없어요. 칸에 직접 Ctrl+V 해 주세요."); }); } else alert("이 브라우저는 클립보드 읽기를 지원하지 않아요. 칸에 직접 Ctrl+V 해 주세요."); return; }
  if(e.target.closest("#rAddRight")){ realReadForm(); RP.parsed.rights.push({type:"근저당",date:"",amt:"",note:"",demand:false}); renderReal(); return; }
  if(e.target.closest("#rAddTenant")){ realReadForm(); RP.parsed.tenants.push({name:`임차인 ${RP.parsed.tenants.length+1}`, move:"", fix:"", demand:true, dep:"", prio:0}); renderReal(); return; }
  if((b = e.target.closest("[data-rrdel]"))){ realReadForm(); RP.parsed.rights.splice(+b.dataset.rrdel,1); renderReal(); return; }
  if((b = e.target.closest("[data-rtdel]"))){ realReadForm(); RP.parsed.tenants.splice(+b.dataset.rtdel,1); RP.parsed.tenants.forEach((t,i)=>t.name=`임차인 ${i+1}`); renderReal(); return; }
  if(e.target.closest("#rReport") || (e.target.closest("#rSolveThis"))){
    const solve = !!e.target.closest("#rSolveThis");
    if(RP.view==="input"){ realReadForm(); RC = realToCase(RP.parsed); }
    const bad = RC.rights.filter(r=>!realD(r.date)).length;
    if(RP.view==="input" && bad && !safeConfirm(`날짜를 못 읽은 권리 ${bad}건은 빼고 계산해요. 계속할까요?`)) return;
    realNewCase(RC); RP.view = solve ? "solve" : "report"; renderReal(); window.scrollTo(0,0); return;
  }
  if(e.target.closest("#rBackEdit")){ RP.view="input"; if(realTab!=="paste") realTab="paste"; renderReal(); return; }
});
function realKeepInputs(){ if(!RA) return; document.querySelectorAll("[data-rgot]").forEach(el => RA.got[+el.dataset.rgot] = el.value.replace(/[^\d]/g,"")); const i = $("#rInsu"); if(i) RA.insu = i.value.replace(/[^\d]/g,""); }
document.addEventListener("input", e => { if(page!=="real") return; if(e.target.matches("[data-rgot],#rInsu")) realKeepInputs(); if(e.target.id==="rPaste") RP.text = e.target.value; });
