/* ================= 📋 경매 게시판 · ⏳ 유찰 노리기 · 📇 NPC 기억 · 🏢 사무실 · 🕙 시계 =================
   "한 물건을 끝까지"에서 "여러 물건 중 어디에 돈을 걸지"로. 게시판은 게임 안의 주(週) 단위로 넘어가고,
   물건마다 이번 기일 입찰 / 다음 유찰 노리기 / 관심 / 포기를 고른다. */

/* ---------- 함정 물건(서류만 보면 피할 수 있는 물건) ----------
   법률 설명은 일반적인 원칙만 — 실제 물건은 반드시 서류와 전문가로 확인. */
const BD_DECOYS = [
  {id:"tenant", ic:"🧾", t:"선순위 임차인이 있는 투룸", tag:"감정가 대비 유난히 싸다", apr:21000, min:10750, stars:2,
   trap:"전입일이 말소기준권리보다 빠른 임차인이 있고, 배당요구를 하지 않았어요. 이런 임차인(대항력 있는 임차인)의 보증금은 낙찰자가 물어줘야 합니다 — 서류상 보증금 1억 2천만원.",
   bid:{kind:"lose", t:"낙찰은 됐다. 잔금 대출을 알아보다가 은행에서 먼저 짚었다 — 선순위 임차인 보증금 1억 2천을 떠안아야 한다. 잔금을 포기했다. 입찰보증금은 돌려받지 못한다."},
   sold:"다른 사람이 낙찰받았다가 잔금을 못 내 재매각 공고가 났다. 앞 사람의 입찰보증금은 몰수됐다."},
  {id:"share", ic:"➗", t:"빌라 1/2 지분만 나온 물건", tag:"최저가가 절반 이하", apr:16000, min:5240, stars:3,
   trap:"건물 전체가 아니라 절반 지분만 파는 경매예요. 다른 공유자가 매각기일에 '우선매수'를 신고하면 같은 값에 그 사람에게 넘어가고, 지분만으로는 대출도 잘 나오지 않습니다.",
   bid:{kind:"void", t:"최고가를 썼지만, 공유자가 우선매수를 신고해 그 사람에게 넘어갔다. 보증금은 돌려받았다 — 하루와 교통비만 날렸다."},
   sold:"공유자가 우선매수로 가져갔다."},
  {id:"lien", ic:"🔧", t:"유치권 신고가 들어온 신축 빌라", tag:"신축인데 2회 유찰", apr:26000, min:16640, stars:4,
   trap:"공사업체가 공사대금을 못 받았다며 유치권을 신고했어요. 유치권이 성립하면 그 돈을 떠안을 수 있고, 다툼이 끝날 때까지 대출과 입주가 막힙니다. 성립하려면 적법한 '점유'가 이어지고 있어야 해서, 현장 확인이 핵심이에요.",
   bid:{kind:"gamble", p:0.4, good:[1800,"현장에 아무도 점유하고 있지 않았다는 사실이 확인돼 유치권이 인정되지 않았다. 싸게 산 값을 했다."], bad:[-2600,"업체가 실제로 점유하고 있었다. 소송이 1년 넘게 이어졌고, 이자와 소송비가 쌓였다."]},
   sold:"낙찰자와 공사업체의 소송이 시작됐다는 소문이 돈다."},
  {id:"land", ic:"🗺️", t:"대지권 미등기 빌라", tag:"준신축인데 싸다", apr:19000, min:12160, stars:3,
   trap:"대지권(땅에 대한 권리)이 등기되어 있지 않아요. 감정평가에 땅값이 포함됐는지, 나중에 대지권을 넘겨받을 수 있는지를 서류로 확인해야 합니다. 확인이 안 되면 매수자 대출이 막혀 되팔기가 어렵습니다.",
   bid:{kind:"gamble", p:0.55, good:[1400,"감정서에 대지권 가격이 포함돼 있었고, 분양자 쪽 서류로 대지권 등기를 넘겨받았다."], bad:[-1900,"대지권을 넘겨받지 못했다. 매수자 대출이 안 나와서 한참 싸게 팔았다."]},
   sold:"누군가 가져갔다. 매수자 대출이 안 나와 매물로 오래 떠 있다는 얘기가 들린다."}
];
const BD_STEP = 0.8;          // 한 번 유찰될 때마다 최저가 20% 내림(법원마다 20~30% — 게임은 20%)
function bdRng(a, b){ return kRng(((a * 2654435761) ^ (b * 40503) ^ 0x5bd1e995) >>> 0); }
function bdRec(){
  const c = kcRec();
  if(!c.board) c.board = {n:1, items:[], log:[], dodged:0, key:1, lastDone:{}};
  const b = c.board;
  // 새로고침 등으로 진행 중이던 판이 사라졌으면 다시 '관심'으로 돌려놓는다
  b.items.forEach(it => { if(it.status === "playing" && !(typeof K !== "undefined" && K && K.board && K.board.key === it.key)) it.status = "watch"; });
  return b;
}
const BD_ACTIVE = s => s === "open" || s === "watch" || s === "wait" || s === "playing";
function bdOpenProps(){ const p = hubRec(); return Object.values(K_PROPS).filter(P => !P.unlock || P.unlock(p)).sort((a,b)=>a.no-b.no); }
function bdFill(b){
  const r = bdRng(b.n, 77);
  bdOpenProps().forEach(P => {
    if(b.items.some(it => it.prop === P.id && BD_ACTIVE(it.status))) return;
    const ld = b.lastDone[P.id]; if(ld != null && b.n - ld < 2) return;
    b.items.push({key:b.key++, kind:"case", prop:P.id, seed:(Math.floor(r() * 9e8) + 1), extra:0, status:"open", since:b.n});
  });
  const activeD = b.items.filter(it => it.kind === "decoy" && BD_ACTIVE(it.status)).map(it => it.decoy);
  const pool = BD_DECOYS.filter(d => !activeD.includes(d.id));
  while(b.items.filter(it => it.kind === "decoy" && BD_ACTIVE(it.status)).length < 2 && pool.length){
    const d = pool.splice(Math.floor(r() * pool.length), 1)[0];
    b.items.push({key:b.key++, kind:"decoy", decoy:d.id, seed:(Math.floor(r() * 9e8) + 1), extra:0, status:"open", since:b.n});
  }
}
function bdBase(it){ if(it.kind === "case"){ const P = K_PROPS[it.prop]; return {apr:P.appraisal, min:P.minBid}; } const d = BD_DECOYS.find(x=>x.id===it.decoy); return {apr:d.apr, min:d.min}; }
function bdMin(it){ return Math.round(bdBase(it).min * Math.pow(BD_STEP, it.extra) / 10) * 10; }
function bdRounds(it){ const B = bdBase(it); return Math.max(0, Math.round(Math.log(B.min / B.apr) / Math.log(BD_STEP))) + it.extra; }
function bdDeposit(it){ return Math.round(bdMin(it) * 0.1 / 10) * 10; }
function bdNeed(it){ return Math.round(bdMin(it) * 1.1 + 1500); }     // 최저가 근처 낙찰 + 취득세 + 수리·명도 여유(대략)
function bdRunning(){ return typeof K !== "undefined" && K && K.step && K.step !== "result" && K.step !== "lost"; }
// 관심도 신호(정확한 숫자는 안 준다) — 유찰될수록 사람이 몰린다
function bdHeat(it){ const r = bdRng(it.seed, it.extra + 3)(); const x = 1 + it.extra * 1.6 + r * 2.2; return x < 2 ? "낮음" : x < 3.4 ? "보통" : x < 4.6 ? "높음" : "매우 높음"; }

/* ---------- 주 넘기기 — 손대지 않은 물건은 유찰되거나 남에게 넘어간다 ---------- */
function bdAdvance(){
  const b = bdRec(); if(bdRunning()) return;
  const lines = [];
  b.items.forEach(it => {
    if(!(it.status === "open" || it.status === "watch" || it.status === "wait")) return;
    const r = bdRng(it.seed, b.n * 13 + it.extra)();
    const pFail = Math.max(0.15, 0.58 - it.extra * 0.14);       // 쌀수록 누군가 들어온다
    const name = bdName(it);
    if(it.extra < 2 && r < pFail){ const before = bdMin(it); it.extra++; lines.push(`⏳ ${name} — 유찰. 최저가 ${kMan(before)} → ${kMan(bdMin(it))}`); if(it.status === "open") it.status = "watch"; }
    else {
      it.status = "sold"; it.res = it.kind === "decoy" ? BD_DECOYS.find(d=>d.id===it.decoy).sold : `다른 사람이 약 ${kMan(Math.round(bdMin(it) * (1.08 + r * 0.14) / 10) * 10)}에 낙찰받았다.`;
      lines.push(`🔨 ${name} — ${it.res}`);
    }
  });
  b.items = b.items.filter(it => BD_ACTIVE(it.status) || b.n - (it.endN || b.n) < 2);
  b.items.forEach(it => { if(!BD_ACTIVE(it.status) && it.endN == null) it.endN = b.n; });
  b.log.unshift({n:b.n, lines}); b.log = b.log.slice(0, 12);
  b.n++; bdFill(b);
  if(typeof save === "function") save();
}
function bdName(it){ if(it.kind === "case"){ const P = K_PROPS[it.prop]; return `CASE ${String(P.no).padStart(3,"0")} ${P.short || P.title}`; } return BD_DECOYS.find(d=>d.id===it.decoy).t; }

/* ---------- 게시판에서 시작한 판: 유찰 회차만큼 최저가·경쟁을 바꾼다 ---------- */
let BD_NEXT = null;
function bdPlay(it){
  if(bdRunning()) return;
  it.status = "playing"; BD_NEXT = it;
  KC_MODE = "career"; K_PROP_NEXT = it.prop; KC_INTRO = true;
  kStart(it.seed);
}
const _bd_kStart = kStart; kStart = function(seed){
  const it = BD_NEXT; BD_NEXT = null;
  _bd_kStart(seed);
  if(!K) return;
  K.board = null;
  if(!it) return;
  K.board = {key:it.key, extra:it.extra, rounds:bdRounds(it)};
  if(it.extra){
    const base = KP, f = Math.pow(BD_STEP, it.extra);
    KP = Object.create(base); KP.minBid = Math.round(base.minBid * f / 10) * 10;
    // 경쟁자는 물건값을 보고 쓴다 — 최저가가 내려간 만큼 따라 내려가진 않는다(대신 사람이 몰린다)
    const s = Math.pow(0.94, it.extra) / f;
    K.rivals.forEach(v => { v.lo *= s; v.hi *= s; });
    const pool = (base.rivals || K_RIVALS);
    for(let i = 0; i < it.extra * 2 + Math.floor(K.r() * 3); i++){ const v = pool[Math.floor(K.r() * pool.length)]; K.rivals.push({t:v.t, lo:v.lo * s, hi:v.hi * s}); }
  }
};
function bdItem(){ if(!K || !K.board) return null; return bdRec().items.find(x => x.key === K.board.key) || null; }
const _bd_kBid = kBid; kBid = function(amt){
  _bd_kBid(amt);
  const it = bdItem(); if(!it || !K.result) return;
  if(!K.result.win){ it.status = "lost"; it.res = `패찰 — 1등 ${kMan(K.result.bids[0].amt)}`; if(typeof save === "function") save(); }
};
const _bd_kFinish = kFinish; kFinish = function(){
  _bd_kFinish();
  const it = bdItem();
  if(it){ const b = bdRec(); it.status = "done"; it.res = `내가 처리 — 세전 ${kcSigned(Math.round(K.final.profit))}`; b.lastDone[it.prop] = b.n; }
  nmScore();
  if(typeof save === "function") save();
};

/* ---------- 함정 물건 처리(서류 열람 · 입찰 · 포기) ---------- */
function bdDecoyRead(it){ if(it.read) return; it.read = true; if(it.status === "open") it.status = "watch"; if(typeof hubAward === "function") hubAward(10, 0, "📄 서류부터 봤다"); }
function bdDecoyBid(it){
  const d = BD_DECOYS.find(x => x.id === it.decoy), c = kcRec(), dep = bdDeposit(it);
  let amt = 0, t = d.bid.t || "";
  if(d.bid.kind === "lose") amt = -dep;
  else if(d.bid.kind === "gamble"){ const good = bdRng(it.seed, 999)() < d.bid.p; const o = good ? d.bid.good : d.bid.bad; amt = Math.round(o[0] * Math.pow(BD_STEP, -it.extra * 0.5) / 10) * 10; t = o[1]; if(good) amt = Math.round(amt); }
  c.cash = Math.round(c.cash + amt); c.total = Math.round(c.total + amt);
  c.history.unshift({n:"함정", mode:"quick", at:Date.now(), title:d.t, bid:bdMin(it), sale:bdMin(it) + Math.max(0, amt), profit:amt, after:amt, days:1, biz:amt >= 1000 ? "A" : amt >= 0 ? "C" : "F", judge:it.read ? "B" : "F"});
  c.history = c.history.slice(0, 40);
  it.status = "done"; it.res = `${t} (${kcSigned(amt)}${it.read ? "" : " · 서류를 안 보고 들어갔다"})`;
  const R = kRec(); if(!it.read && !R.ach.blind){ R.ach.blind = Date.now(); }
  if(typeof save === "function") save();
  return {amt, t};
}
function bdDrop(it){
  it.status = "drop"; it.res = "포기";
  if(it.kind === "decoy" && it.read){ const b = bdRec(); b.dodged++; it.res = "서류 보고 피했다 ✅"; if(typeof hubAward === "function") hubAward(25, 3, "🛡️ 함정 물건을 피했다"); }
  if(typeof save === "function") save();
}
Object.assign(K_ACH, {blind:["🙈","서류는 나중에","함정 물건에 서류도 안 보고 입찰했다"], waited:["⏳","한 번 더 기다렸다","유찰을 노려 더 싸게 낙찰"]});

/* ---------- 게시판 화면 ---------- */
let BD_MSG = null;
function boardHTML(){
  const b = bdRec(); if(!b.items.length) bdFill(b);
  const c = kcRec(), running = bdRunning();
  const act = b.items.filter(it => BD_ACTIVE(it.status)), past = b.items.filter(it => !BD_ACTIVE(it.status));
  const card = it => {
    const isCase = it.kind === "case", P = isCase ? K_PROPS[it.prop] : null, d = isCase ? null : BD_DECOYS.find(x=>x.id===it.decoy);
    const B = bdBase(it), min = bdMin(it), dep = bdDeposit(it), need = bdNeed(it), rounds = bdRounds(it);
    const canDep = c.cash >= dep, loan = Math.max(0, need - c.cash);
    const st = {open:"", watch:"⭐ 관심", wait:"⏳ 유찰 대기", playing:"▶ 진행 중"}[it.status];
    return `<div class="panel bd-card ${it.status}"><div class="bd-top"><span class="bd-ic">${isCase ? "📁" : d.ic}</span><div class="bd-tt"><b>${esc(isCase ? bdName(it) : d.t)}</b>
       <small>${isCase ? esc(P.tagline || "") : esc(d.tag)} · ${"★".repeat(isCase ? (P.stars||1) : d.stars)}</small></div>${st?`<em class="bd-st">${st}</em>`:""}</div>
     <div class="bd-nums"><span>감정가</span><b>${kMan(B.apr)}</b><span>최저가</span><b>${kMan(min)} <small>(${rounds ? `${rounds}회 유찰` : "신건"} · ${Math.round(min / B.apr * 100)}%)</small></b>
       <span>입찰보증금</span><b class="${canDep?"":"down"}">${kMan(dep)}</b><span>필요 자금(대략)</span><b>${kMan(need)}${loan ? ` <small class="down">대출 ${kMan(loan)}</small>` : ""}</b>
       <span>관심도</span><b class="kp-sig"><em class="lv-${bdHeat(it).replace(/\s/g,"")}">🔥 <b>${bdHeat(it)}</b></em></b></div>
     ${!isCase ? (it.read ? `<div class="bd-trap">📄 ${esc(d.trap)}</div>` : `<div class="note">📄 아직 서류를 안 봤어요 — 싸 보이는 데는 이유가 있을 수도.</div>`) : ""}
     <div class="bd-acts">${isCase
        ? `<button type="button" class="btn ${canDep && !running ? "pri" : ""}" data-bdplay="${it.key}" ${canDep && !running && it.status !== "playing" ? "" : "disabled"}>🔨 이번 기일 입찰</button>`
        : `${it.read ? "" : `<button type="button" class="btn pri" data-bdread="${it.key}">📄 서류 열람</button>`}<button type="button" class="btn" data-bddecoy="${it.key}" ${canDep ? "" : "disabled"}>🔨 입찰</button>`}
       ${it.status !== "playing" ? `<button type="button" class="btn" data-bdwait="${it.key}" ${it.extra >= 2 ? "disabled" : ""}>⏳ 유찰 노리기</button>
       <button type="button" class="btn" data-bdwatch="${it.key}">${it.status === "watch" ? "☆ 관심 해제" : "⭐ 관심"}</button><button type="button" class="btn" data-bddrop="${it.key}">✖ 포기</button>` : ""}</div>
     ${it.status === "wait" ? `<small class="note">다음 주에 유찰되면 최저가 ${kMan(Math.round(min * BD_STEP / 10) * 10)} — 대신 사람이 더 몰리고, 그 전에 누가 가져갈 수도 있어요.</small>` : ""}
     ${!canDep ? `<small class="note down">보증금(최저가의 10%)이 모자라요.</small>` : ""}</div>`;
  };
  const pastLi = past.map(it => `<li><b>${esc(bdName(it))}</b> — ${esc(it.res || it.status)}</li>`).join("");
  const msg = BD_MSG; BD_MSG = null;
  return `<div class="bd-head"><div><b>📋 경매 게시판 · ${b.n}주차</b><small class="note">보유 ${kMan(c.cash)} · 함정 피함 ${b.dodged}번</small></div>
      <button type="button" class="btn" data-bdnext ${running ? "disabled" : ""}>다음 주로 ▶</button></div>
    <p class="lead">이번 주 법원에 나온 물건들이에요. <b>돈은 한정돼 있고, 기다리면 싸지지만 누가 먼저 가져갈 수도 있어요.</b></p>
    ${running ? `<div class="panel note">▶ 진행 중인 CASE가 있어요 — 끝내야 다른 물건에 입찰하거나 주를 넘길 수 있어요. <button type="button" class="btn pri" data-atab="king">이어하기</button></div>` : ""}
    ${msg ? `<div class="panel bd-msg">${msg}</div>` : ""}
    ${act.length ? `<div class="bd-grid">${act.map(card).join("")}</div>` : `<div class="panel note">이번 주 남은 물건이 없어요 — <b>다음 주로 ▶</b>를 누르면 새 물건이 올라와요.</div>`}
    ${pastLi ? `<details class="panel"><summary>🗂️ 지난 물건</summary><ul class="note">${pastLi}</ul></details>` : ""}
    ${b.log.length ? `<details class="panel"><summary>📰 지난주 소식</summary>${b.log.slice(0,4).map(L=>`<div class="note"><b>${L.n}주차</b><ul>${L.lines.map(x=>`<li>${esc(x)}</li>`).join("")||"<li>특별한 일 없음</li>"}</ul></div>`).join("")}</details>` : ""}
    <small class="note">⚠ 함정 물건 설명은 일반적인 원칙이에요. 실제 물건은 등기부·매각물건명세서·현황조사서를 직접 확인하고, 필요하면 전문가와 상의하세요.</small>`;
}
// 게시판 판 표시 — 조사 화면 맨 위 한 줄
const _bd_kingHTML = kingHTML; kingHTML = function(){
  let h = _bd_kingHTML();
  if(!K || K.intro || K.revealing) return h;
  if(K.board && K.board.extra && K.step === "brief"){
    const at = h.indexOf('<div class="panel kr-clock">');
    const line = `<div class="panel bd-round">⏳ <b>${K.board.rounds}회 유찰 뒤 기일</b> — 최저가 ${kMan(KP.minBid)} (기다린 덕에 ${kMan(Object.getPrototypeOf(KP).minBid - KP.minBid)} 내려갔어요). 대신 관심이 몰렸어요.</div>`;
    h = at >= 0 ? h.slice(0, at) + line + h.slice(at) : line + h;
  }
  if(K.step === "result"){ h += nmResultHTML(); if(K.board && K.board.extra && K.final && K.final.profit > 0) kAch("waited"); }
  return h;
};

/* ---------- 📇 NPC 기억 — 누가 몇 번 만났고, 시세를 얼마나 맞혔나 ---------- */
function nmRec(){ const R = arenaRec(); if(!R.npc) R.npc = {}; return R.npc; }
const NM_SKIP = /^중개사 [A-Z]$|\(전화\)|대출상담/;
function nmPrice(t){
  let m;
  if((m = /(\d)억\s*(\d)천(?:\s*(\d)백)?(\s*후반|\s*초반|\s*중반)?/.exec(t))) return +m[1]*10000 + +m[2]*1000 + (m[3] ? +m[3]*100 : 0) + (m[4] ? ({"후반":700,"초반":200,"중반":500}[m[4].trim()]) : 0);
  if((m = /(^|[^\d.])(1\.\d{1,2})(\s*후반|\s*초반|\s*중반)?/.exec(t))){ const v = Math.round(parseFloat(m[2]) * 10000); return v + (m[3] && m[2].length === 3 ? ({"후반":700,"초반":200,"중반":500}[m[3].trim()]) : 0); }
  return null;
}
const _nm_kResearch = kResearch; kResearch = function(id){
  const n0 = K ? K.says.length : 0;
  _nm_kResearch(id);
  if(!K || !K.says) return;
  const M = nmRec(); K._met = K._met || {}; K._claim = K._claim || {};
  K.says.slice(n0).forEach(s => {
    if(NM_SKIP.test(s.who)) return;
    const n = M[s.who] || (M[s.who] = {met:0, claims:0, hits:0});
    if(!K._met[s.who]){ K._met[s.who] = 1; n.met++; n.last = Date.now(); }
    s.nth = n.met;
    const v = nmPrice(s.t); if(v && K._claim[s.who] == null) K._claim[s.who] = v;
  });
};
function nmScore(){
  if(!K || !K._claim || !K.sale || !K.sale.price || K._scored) return;
  K._scored = true; const M = nmRec(), sale = K.sale.price; K._nmRes = [];
  for(const [who, v] of Object.entries(K._claim)){ const n = M[who]; if(!n) continue; const hit = Math.abs(v - sale) / sale <= 0.04; n.claims++; if(hit) n.hits++; K._nmRes.push({who, v, hit}); }
}
function nmTrust(n){ if(!n || n.claims < 2) return ""; const r = n.hits / n.claims; return r >= 0.6 ? "믿을 만함" : r <= 0.34 ? "허풍 주의" : "반반"; }
function nmTag(who){
  const n = nmRec()[who]; if(!n) return "";
  const bits = []; if(n.met >= 2) bits.push(`${n.met}번째 만남`); if(n.claims) bits.push(`시세 적중 ${n.hits}/${n.claims}`); const tr = nmTrust(n); if(tr) bits.push(tr);
  return bits.length ? `<small class="nm-tag ${tr === "허풍 주의" ? "bad" : tr === "믿을 만함" ? "good" : ""}">🧠 ${bits.join(" · ")}</small>` : "";
}
function nmResultHTML(){
  if(!K._nmRes || !K._nmRes.length) return "";
  return `<div class="panel nm-res"><b>📇 이번 판, 누구 말이 맞았나</b> <small class="note">실제 매도가 ${kMan(K.sale.price)} 기준 ±4%</small><ul>${K._nmRes.map(r=>`<li>${r.hit?"✅":"❌"} <b>${esc(r.who)}</b> “${kMan(r.v)}” ${nmTag(r.who)}</li>`).join("")}</ul><small class="note">사무실 ☎️ 연락처에 쌓여요 — 다음 판에 같은 사람이 같은 말을 하면, 얼마나 믿을지 여기서 정하세요.</small></div>`;
}
// 들은 말 목록에 기억 태그를 단다(출처 배지 옆)
kpSaysBoard = function(){
  if(!K.says.length) return "";
  return `<div class="panel kp-board"><b>🗣️ 들은 말 — 출처를 보세요</b> <small class="note">정답 시세는 아무도 알려 주지 않아요. 말끼리 부딪히면, 누구 말이 더 믿을 만한지 직접 정하세요.</small>
    <ul>${K.says.map(s => `<li>${kpSrcBadge(s.src)}<b>${esc(s.who)}</b> ${nmTag(s.who)} “${esc(s.t)}”</li>`).join("")}</ul></div>`;
};
if(typeof k2SaysHTML === "function"){ k2SaysHTML = function(){ return K.says.length ? `<details class="panel k2-says"><summary>🗣️ 들은 말 (${K.says.length}) — 누구 말이 맞을까?</summary><ul>${K.says.map(s=>`<li>${kpSrcBadge(s.src)}<b>${esc(s.who)}</b> ${nmTag(s.who)} “${esc(s.t)}”</li>`).join("")}</ul></details>` : ""; }; }

/* ---------- 🕙 조사 시계 — 같은 곳도 시간대마다 다르다 ---------- */
const BD_DAY0 = 10 * 60;     // 조사일은 오전 10시에 시작
function bdClock(){ const used = KR_BUDGET - (K.timeLeft == null ? KR_BUDGET : K.timeLeft), m = BD_DAY0 + used, h = Math.floor(m / 60), mm = m % 60; return {h, mm, txt:`${h < 12 ? "오전" : "오후"} ${((h + 11) % 12) + 1}:${String(mm).padStart(2,"0")}`, ic: h >= 18 ? "🌆" : h >= 12 ? "☀️" : "🌤️"}; }
const _bd_krActions = krActionsHTML; krActionsHTML = function(){
  const h = _bd_krActions(), c = bdClock();
  return h.replace('<b>⏱ 입찰까지 조사 가능 시간</b>', `<b>⏱ 입찰까지 조사 가능 시간</b> <em class="bd-clock">${c.ic} 지금 ${c.txt}</em>`)
          .replace('<h4 class="kr-grp">🏚️ 현장에서', `<p class="note bd-tod">🌙 밤·🚗 출퇴근 시간 방문은 <b>그 시간대에 다시 가는 것</b>이라 따로 오가요 — 낮에는 조용한 골목이 저녁엔 주차 전쟁일 수도 있어요.</p><h4 class="kr-grp">🏚️ 현장에서`);
};

/* ---------- 🏢 사무실 — 홈 기지 ---------- */
let OF_SPOT = "desk";
const OF_SPOTS = [["desk","🖥️","책상","지금 할 일"],["board","📋","게시판","이번 주 물건"],["cabinet","🗄️","서류함","지난 CASE 파일"],["phone","☎️","연락처","만난 사람들"],["wall","🏆","벽","트로피·기록"]];
function officeHTML(){
  const o = keOffice(), bg = o ? o.id : "bg_office_1", c = kcRec(), p = hubRec(), L = hubLevel(p.xp);
  const stage = `<div class="vn of-stage">${vnBgHTML(bg)}<div class="of-spots">${OF_SPOTS.map(([id, ic, t, s]) => `<button type="button" class="of-spot of-${id} ${OF_SPOT===id?"on":""}" data-ofspot="${id}"><span>${ic}</span><b>${t}</b><small>${s}</small></button>`).join("")}</div>
     <div class="of-name">🏢 ${esc(o ? o.t : "원룸 책상")} · 경매인 LV.${L.lv} · 보유 ${kMan(c.cash)}</div></div>`;
  return stage + `<div class="of-panel">${OF_SPOT === "board" ? boardHTML() : ofPanel(OF_SPOT)}</div>`;
}
function ofPanel(id){
  const c = kcRec(), p = hubRec(), b = bdRec(), running = bdRunning();
  if(id === "desk"){
    const act = b.items.filter(it => BD_ACTIVE(it.status));
    return `<h3>🖥️ 책상</h3>${running ? `<div class="panel"><b>▶ 진행 중: ${K.mode==="weekly"?"이번 주 경매":`CASE ${String(KP.no).padStart(3,"0")}`}</b> · ${K.day}일째<br><button type="button" class="btn pri" data-atab="king">이어하기</button></div>` : ""}
      <div class="panel"><b>📋 게시판 ${b.n}주차</b> — 물건 ${act.length}건 ${act.filter(i=>i.status==="watch").length ? `· ⭐ 관심 ${act.filter(i=>i.status==="watch").length}` : ""}<br><button type="button" class="btn ${running?"":"pri"}" data-ofspot="board">게시판 보기</button></div>
      <div class="panel"><b>📅 이번 주 경매 (${kcWeek()})</b> — 모두가 같은 물건으로 겨루는 판<br><button type="button" class="btn" data-kcnew="weekly">도전하기</button></div>
      <p class="ke-tip">💡 ${esc(typeof keTip === "function" ? keTip() : "")}</p>`;
  }
  if(id === "cabinet"){
    const h = c.history.slice(0, 20);
    return `<h3>🗄️ 서류함</h3>${h.length ? h.map(e => `<details class="panel of-file"><summary>📁 ${e.mode==="weekly"?`주간 ${esc(e.week)}`:e.mode==="quick"?"함정 물건":`${e.n}호`} ${esc(e.title||"")} <b class="${e.profit>=0?"up":"down"}">${kcSigned(e.profit)}</b></summary>
       <div class="note">낙찰 ${kMan(e.bid)} → 매도 ${kMan(e.sale)} · ${e.days}일 · 사업 ${e.biz} / 판단 ${e.judge}${e.hid ? ` · 숨은 위험 ${e.found}/${e.hid}` : ""}${e.style ? ` · ${esc(e.style)}` : ""}</div></details>`).join("") : `<p class="note">아직 서류함이 비어 있어요. 첫 CASE를 끝내면 여기 파일이 쌓여요.</p>`}`;
  }
  if(id === "phone"){
    const list = Object.entries(nmRec()).sort((a,b)=>b[1].met - a[1].met);
    return `<h3>☎️ 연락처</h3><p class="note">한 번 만난 사람은 기억해요. 시세를 말한 사람은 실제 매도가와 비교해 적중률이 쌓여요(±4%).</p>
      ${list.length ? `<ul class="of-contacts">${list.map(([who, n]) => `<li><b>${esc(who)}</b> <small>만남 ${n.met}번</small>${n.claims ? ` <small>시세 적중 ${n.hits}/${n.claims}</small>` : ""} ${nmTrust(n) ? `<em class="${nmTrust(n)==="허풍 주의"?"down":nmTrust(n)==="믿을 만함"?"up":""}">${nmTrust(n)}</em>` : ""}</li>`).join("")}</ul>` : `<p class="note">아직 연락처가 없어요. 조사하면서 만난 사람이 여기 저장돼요.</p>`}`;
  }
  if(id === "wall"){
    const R = kRec(), ach = Object.keys(R.ach || {}).filter(k => K_ACH[k]);
    const weeks = Object.entries(c.weekly).sort((a,b)=>b[1].profit - a[1].profit).slice(0, 3);
    return `<h3>🏆 벽</h3><div class="panel kc-cstats"><span>명성 <b>${esc(kcRepName(p.rep))}</b></span><span>처리 물건 <b>${c.cases}</b></span><span>누적 세후 <b class="${c.total>=0?"up":"down"}">${kcSigned(c.total)}</b></span><span>함정 피함 <b>${b.dodged}</b></span></div>
      ${c.best ? `<div class="panel">🏅 최고 거래 — ${c.best.n}호 ${esc(c.best.title||"")} ${kcSigned(c.best.after)} (세후)</div>` : ""}
      ${weeks.length ? `<div class="panel">📅 주간 경매 명예의 전당<ul>${weeks.map(([w,e])=>`<li>${esc(w)} ${kcSigned(e.profit)} · ${e.biz}/${e.judge}</li>`).join("")}</ul></div>` : ""}
      <div class="panel"><b>🏅 업적 ${ach.length}/${Object.keys(K_ACH).length}</b><div class="of-ach">${ach.map(k => `<span class="ag-badge">${K_ACH[k][0]} ${esc(K_ACH[k][1])}</span>`).join("") || `<small class="note">아직 없어요</small>`}</div></div>`;
  }
  return "";
}

/* ---------- 화면 연결 ---------- */
const _bd_render = renderArena; renderArena = function(){
  if(page === "arena" && (arenaTab === "office" || arenaTab === "board")){
    if(arenaTab === "board"){ OF_SPOT = "board"; arenaTab = "office"; }
    $("#main").innerHTML = `<section class="page"><div class="eyebrow">경매 RPG</div><h2 style="font-size:26px;margin-top:4px">사무실</h2>${hubTabs()}${officeHTML()}</section>`;
    if(typeof hubToastShow === "function") hubToastShow();
    return;
  }
  _bd_render();
};
const _bd_kfsWanted = kfsWanted; kfsWanted = function(){ return _bd_kfsWanted() || (typeof page !== "undefined" && page === "arena" && arenaTab === "office"); };
const _bd_kfsHeader = kfsHeader; kfsHeader = function(){
  let h = _bd_kfsHeader();
  if(arenaTab === "office") h = h.replace(/🏆 <b>경매왕<\/b>/, "🏢 <b>사무실</b>");
  return h.replace('<button type="button" data-atab="king">', '<button type="button" data-atab="office">🏢 사무실</button><button type="button" data-atab="king">');
};
const _bd_hubTabs = hubTabs; hubTabs = function(){ return _bd_hubTabs().replace('>🏠 홈</button>', '>🏠 홈</button><button type="button" data-atab="office" aria-pressed="' + (arenaTab === "office") + '">🏢 사무실</button>'); };
// 홈: 첫 판 뒤로는 게시판이 주 메뉴
const _bd_home = homeHTML; homeHTML = function(){
  const h = _bd_home(), c = kcRec();
  const btn = `<button type="button" class="btn ${c.cases && !bdRunning() ? "pri" : ""}" data-ofgo="board">📋 경매 게시판 <small>${bdRec().n}주차 · 여러 물건 중 어디에 걸지</small></button>`;
  let out = h.replace('<button type="button" class="btn" data-kcnew="weekly">', btn + '<button type="button" class="btn" data-kcnew="weekly">');
  out = out.replace('<button type="button" class="btn" data-atab="dexall">📖 도감</button>', '<button type="button" class="btn" data-ofgo="desk">🏢 사무실</button>');
  if(c.cases) out = out.replace(/(data-kcnew="career" data-prop="[^"]*") class="btn pri"/g, '$1 class="btn"').replace(/class="btn pri" (data-kcnew="career")/g, 'class="btn" $1');
  return out;
};
document.addEventListener("click", e => {
  if(page !== "arena") return;
  let b;
  if((b = e.target.closest("[data-ofgo]"))){ OF_SPOT = b.dataset.ofgo; arenaTab = "office"; renderArena(); window.scrollTo(0,0); return; }
  if((b = e.target.closest("[data-ofspot]"))){ OF_SPOT = b.dataset.ofspot; if(typeof kcSfx === "function") kcSfx("paper"); arenaTab = "office"; renderArena(); return; }
  if(arenaTab !== "office") return;
  const find = k => bdRec().items.find(x => String(x.key) === String(k));
  if((b = e.target.closest("[data-bdplay]"))){ const it = find(b.dataset.bdplay); if(!it || bdRunning()) return; if(kcRec().cash < bdDeposit(it)){ safeAlert("입찰보증금이 모자라요."); return; } bdPlay(it); arenaTab = "king"; renderArena(); window.scrollTo(0,0); return; }
  if((b = e.target.closest("[data-bdread]"))){ const it = find(b.dataset.bdread); if(it){ bdDecoyRead(it); if(typeof kcSfx === "function") kcSfx("paper"); if(typeof save==="function") save(); } renderArena(); return; }
  if((b = e.target.closest("[data-bddecoy]"))){ const it = find(b.dataset.bddecoy); if(!it) return;
    if(!it.read && !safeConfirm("서류를 아직 안 봤어요. 그래도 입찰할까요?")) return;
    const r = bdDecoyBid(it); BD_MSG = `<b>${r.amt >= 0 ? "🔨" : "💸"} ${esc(bdName(it))}</b><br>${esc(r.t)} <b class="${r.amt>=0?"up":"down"}">${kcSigned(r.amt)}</b>`;
    if(typeof kcSfx === "function") kcSfx(r.amt >= 0 ? "coin" : "shock"); renderArena(); return; }
  if((b = e.target.closest("[data-bdwait]"))){ const it = find(b.dataset.bdwait); if(it && it.extra < 2){ it.status = "wait"; if(typeof save==="function") save(); } renderArena(); return; }
  if((b = e.target.closest("[data-bdwatch]"))){ const it = find(b.dataset.bdwatch); if(it){ it.status = it.status === "watch" ? "open" : "watch"; if(typeof save==="function") save(); } renderArena(); return; }
  if((b = e.target.closest("[data-bddrop]"))){ const it = find(b.dataset.bddrop); if(it && safeConfirm(`${bdName(it)} — 포기할까요?`)){ bdDrop(it); } renderArena(); return; }
  if(e.target.closest("[data-bdnext]")){ if(bdRunning()) return; bdAdvance(); const L = bdRec().log[0]; BD_MSG = `<b>📰 ${L.n}주차가 지났어요</b><ul>${L.lines.map(x=>`<li>${esc(x)}</li>`).join("") || "<li>손대지 않은 물건이 없었어요.</li>"}</ul>`; if(typeof kcSfx === "function") kcSfx("paper"); renderArena(); return; }
});
