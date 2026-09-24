/* ================= 🏠 딥 이머전 — 세계가 '사는 곳'처럼 느껴지는 작은 흔적들 =================
   ① 안 산·놓친 물건 후일담  ② 거점 소품이 시간 따라 바뀜(젖은 우산 포함)  ③ NPC 전화 받는 습관
   ④ 매수자가 집을 보러 오는 짧은 몽타주  ⑤ 지난 실수를 기억하는 혼잣말
   전부 '기록을 읽어서 보여주기만' 한다 — 가격·확률·결과 계산은 한 줄도 바꾸지 않는다. */
function dpRec(){ const R = arenaRec(); if(!R.deep) R.deep = {}; const D = R.deep; if(!D.after) D.after = []; if(!D.mem) D.mem = {}; if(!D.news) D.news = []; return D; }
function dpSeed(s){ return typeof kRng === "function" ? kRng((s >>> 0) || 1) : Math.random; }
function dpDayNo(){ const L = typeof lfRec === "function" && lfRec(); return L ? Math.floor(L.t / 1440) : null; }
function dpBusy(){ return !!(document.getElementById("cpEnd") || document.getElementById("pxCard") || document.getElementById("gxOp") || document.getElementById("dpCard")); }

/* ================= ① 후일담 — 놓친 물건 · 포기한 물건이 나중에 어떻게 됐나 =================
   다음 CASE를 한 건 끝내고 나면 알림이 온다. 결과는 그 물건의 '숨은 진짜 값'과 숨은 하자로 정해진다(시드 고정 — 다시 봐도 같다). */
function dpAfterLost(){
  if(!K || !K.result || K.result.win || K.mode !== "career" || K._dpLost) return; K._dpLost = 1;
  const R = K.result, W = R.other.amt, r = dpSeed(K.seed ^ 0x5eed);
  const sale = Math.round((KP.trueMid + (r() * 2 - 1) * (KP.trueSpread || 250)) / 10) * 10;
  const surprise = (KP.hidden || []).filter(h => h.cost && r() < 0.7);
  const big = surprise.find(h => h.id === "elec") && r() < 0.4 ? 320 : 0;             // 누전이 '전체 배선'으로 커지는 경우
  const repair = (KP.estRepair || 300) + surprise.reduce((s, h) => s + h.cost, 0) + big;
  const months = 2 + Math.floor(r() * 4), hold = Math.round((KP.dailyHold || 1.7) * months * 30);
  const profit = Math.round(sale - W * 1.017 - repair - hold - sale * 0.005);
  dpRec().after.push({kind:"lost", title:KP.title, my:K.bid, win:W, gap:R.gap, sale, repair, big, surprise:surprise.map(h => h.t), months, profit, due:kcRec().cases + 1, at:Date.now()});
  if(typeof save === "function") save();
}
function dpAfterDrop(it){
  if(!it) return; const r = dpSeed((it.seed || 7) ^ 0xd20b);
  let e;
  if(it.kind === "decoy"){ const d = (typeof BD_DECOYS !== "undefined" ? BD_DECOYS : []).find(x => x.id === it.decoy); if(!d) return;
    e = {kind:"dodge", title:d.t, text:d.sold || "다른 사람이 낙찰받았다. 그 뒤로 한동안 매물로 나오지 않았다.", trap:true, read:!!it.read};
  } else { const P = K_PROPS[it.prop]; if(!P) return;
    const W = Math.round(bdMin(it) * (1.08 + r() * 0.14) / 10) * 10, sale = Math.round((P.trueMid + (r() * 2 - 1) * (P.trueSpread || 250)) / 10) * 10, repair = (P.estRepair || 300) + (P.hidden || []).reduce((s, h) => s + (h.cost && r() < 0.6 ? h.cost : 0), 0), months = 2 + Math.floor(r() * 4);
    e = {kind:"drop", title:P.title, win:W, sale, repair, months, profit:Math.round(sale - W * 1.017 - repair - (P.dailyHold || 1.7) * months * 30 - sale * 0.005)}; }
  e.due = kcRec().cases + 1; e.at = Date.now(); dpRec().after.push(e); if(typeof save === "function") save();
}
function dpAfterText(e){
  if(e.kind === "dodge") return {head:`포기했던 「${e.title}」`, lines:[e.text, e.read ? "그때 서류를 열어 본 게 다행이었다." : "이유도 모르고 지나쳤는데… 결과적으로 피한 셈이다."], tone:"relief"};
  const won = e.profit > 0;
  const lines = [];
  if(e.kind === "lost") lines.push(`${kMan(e.gap)} 차이로 놓쳤던 집. 낙찰가는 ${kMan(e.win)}이었다.`);
  else lines.push(`지나쳤던 집. 다른 사람이 ${kMan(e.win)}에 가져갔다.`);
  if(e.big) lines.push(`전체 배선 공사가 나와 수리비가 ${kMan(e.repair)}까지 늘었다고 한다.`);
  else if(e.surprise && e.surprise.length) lines.push(`${e.surprise.join("·")} 때문에 수리비가 ${kMan(e.repair)} 들었다고 한다.`);
  lines.push(`${e.months}개월 뒤 ${kMan(e.sale)}에 팔렸다 — 낙찰자는 대략 ${e.profit >= 0 ? "+" : "−"}${kMan(Math.abs(e.profit))} 남긴 셈이다.`);
  lines.push(won ? (e.kind === "lost" && e.gap <= 50 ? "…십만원 단위로 놓친 게 아까운 집이었다." : "놓친 게 아까운 집이었다.") : "안 산 게 번 거다.");
  return {head:`그때 그 물건 — 「${e.title}」`, lines, tone:won ? "regret" : "relief"};
}
function dpAfterDeliver(){
  if(dpBusy()) return;
  const D = dpRec(), c = kcRec(), e = D.after.find(x => !x.seen && c.cases >= x.due); if(!e) return;
  e.seen = Date.now(); D.news.unshift(Object.assign({}, dpAfterText(e), {at:e.seen})); D.news = D.news.slice(0, 20);
  if(typeof save === "function") save();
  const T = dpAfterText(e);
  dpCard(`<div class="dp-news ${T.tone}"><small class="dp-kick">📰 소식 하나</small><b>${esc(T.head)}</b>${T.lines.map(l => `<p>${esc(l)}</p>`).join("")}<button type="button" class="btn" data-dpclose>닫기</button></div>`);
  if(typeof kcSfx === "function") kcSfx("message");
}
function dpCard(html){
  const el = document.createElement("div"); el.id = "dpCard"; el.className = "dp-card"; el.innerHTML = `<div class="dp-card-in">${html}</div>`;
  el.addEventListener("click", e => { if(e.target === el || e.target.closest("[data-dpclose]")) el.remove(); });
  document.body.appendChild(el);
}

/* ================= ⑤ 지난 실수 기억 — 새 CASE를 열면 혼잣말 한 줄 ================= */
function dpMemNote(key){ const M = dpRec().mem; M[key] = (M[key] || 0) + 1; M.last = key; M.lastAt = Date.now(); }
function dpMemAfterBid(){
  if(!K || !K.result || K._dpBid) return; K._dpBid = 1; const R = K.result;
  if(!R.win && R.gap <= 10) dpMemNote("tenman");
  else if(R.win && R.solo) dpMemNote("solo");
  else if(R.win && R.gap >= Math.max(300, K.bid * 0.05)) dpMemNote("overbid");
}
function dpMemAfterFinish(){
  if(!K || !K.final || K._dpFin) return; K._dpFin = 1; const F = K.final;
  (KP.hidden || []).forEach(h => { if(!K.found[h.id] && h.cost) dpMemNote("miss_" + h.id); });
  if(F.profit < 0) dpMemNote("loss");
  if(K.sale && K.sale.weeks >= 8) dpMemNote("slow");
}
const DP_MEM_LINES = {
  tenman:["십만원… 이번엔 끝자리까지 생각하자.", "그때 십만원만 더 썼으면."],
  overbid:["이번엔 2등가를 생각하고 쓰자.", "욕심 내면 2등이랑 억 단위로 벌어진다."],
  solo:["아무도 안 오면… 최저가만 써도 되는 거였지.", "왜 아무도 안 왔는지부터 보자."],
  loss:["지난번처럼 들어가면 안 된다. 숫자부터 다시.", "다음엔 이것부터 본다 — 손익표."],
  slow:["호가를 처음부터 맞추자. 지난번엔 두 달을 버렸다."],
  miss_elec:["이번엔 계량기·차단기부터 보자.", "테이프 감긴 차단기… 그거 또 놓치면 안 돼."],
  miss_fee:["관리실에 체납부터 물어보자."],
  miss_leak:["이번엔 천장부터 보자."]};
function dpMemLine(){
  const M = dpRec().mem, c = kcRec(), keys = Object.keys(DP_MEM_LINES).filter(k => M[k]);
  if(!keys.length){
    const h = (c.history || []).filter(x => x.found != null && x.hid).slice(0, 5);   // 버릇 — 최근 조사량
    if(h.length >= 3){ const rate = h.reduce((s, x) => s + x.found / x.hid, 0) / h.length; if(rate >= 0.8) return "또 다 확인하고 들어가야 마음이 놓이지."; if(rate <= 0.35) return "이번에도 느낌으로 간다…? 한 번만 더 보자."; }
    return null;
  }
  const k = M.last && M[M.last] ? M.last : keys.sort((a, b) => M[b] - M[a])[0], arr = DP_MEM_LINES[k];
  return arr[(M[k] + (K ? K.seed : 0)) % arr.length];
}
function dpThought(text, ms){
  const who = document.querySelector(".vn-player") || document.querySelector(".lf-me"), host = document.querySelector("#kfsRoot .kfs-stage") || document.body;
  const el = document.createElement("div"); el.className = "dp-thought"; el.innerHTML = `<i>💭</i>${esc(text)}`;
  if(who && host !== document.body){ const a = who.getBoundingClientRect(), b = host.getBoundingClientRect(); el.style.left = Math.max(8, a.left - b.left + a.width * 0.2) + "px"; el.style.top = Math.max(56, a.top - b.top - 8) + "px"; host.appendChild(el); }
  else { el.classList.add("fixed"); document.body.appendChild(el); }
  el.addEventListener("click", () => el.remove()); setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, ms || 4200);
}

/* ================= ③ NPC 전화 받는 습관 ================= */
const DP_CALLS = {
  kim:{who:"김사장", rings:1, bg:"사무실 전화벨", lines:r => r >= 3 ? `"${dpHonor()} 사장님~ 또 좋은 거 찾으셨어요? 제 생각에는요…"` : r >= 1 ? `"네 김사장입니다! 아 그 물건요? 제 생각에는요…"` : `"네~ 김사장입니다. 누구시라고요?"`},
  call1:{who:"동네 중개사", rings:2, bg:"프린터 소리", lines:() => `"…네, 중개사무소입니다. 아 그 경매 물건요? 음…"`},
  call3:{who:"중개사 3곳", rings:3, bg:"통화 세 번", lines:() => `첫 곳은 바로 받고, 두 번째는 "지금 손님 계셔서요", 세 번째는 "아 그 골목이요? 거기가 좀…"`},
  mgmtcall:{who:"관리사무소", rings:3, bg:"형광등 윙윙", lines:() => `"관리사무소입니다. 잠시만요, 서류 좀 찾고요… (종이 넘기는 소리)"`},
  bank:{who:"은행 대출 창구", rings:2, bg:"대기 음악", lines:() => `"고객님, 대기가 있어서요… 네, 매수자 소득 기준으로 보면요—"`}};
function dpHonor(){ const C = typeof lfChar === "function" && lfChar(); return C ? C.name.slice(0, 1) : ""; }
function dpCall(id){
  const P = DP_CALLS[id]; if(!P || dpBusy()) return;
  const rel = typeof lfRelOf === "function" ? lfRelOf(P.who) : 0;
  const quick = id === "kim" && rel >= 2;                              // 친한 김사장은 첫 신호에 받는다
  const rings = quick ? 1 : P.rings;
  const el = document.createElement("div"); el.className = "dp-call"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="dp-call-top"><b>📞 ${esc(P.who)}</b><small>연결 중…</small></div><p class="dp-ring">${"뚜— ".repeat(rings).trim()}</p><p class="dp-say"></p><small class="dp-bg">${esc(P.bg)}</small>`;
  document.body.appendChild(el);
  const ringMs = typeof pxMin === "function" && pxMin() ? 150 : 380;
  if(typeof pxSyn === "function") for(let i = 0; i < rings; i++) setTimeout(() => pxSyn("bzz"), i * ringMs);
  setTimeout(() => { if(!el.isConnected) return; el.querySelector("small").textContent = "통화 중"; el.querySelector(".dp-say").textContent = P.lines(rel); el.classList.add("on"); }, rings * ringMs);
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 240); };
  el.addEventListener("pointerdown", close); setTimeout(close, rings * ringMs + 2200);
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-kres]"); if(!b || b.disabled) return;
  const id = b.dataset.kres; if(DP_CALLS[id]) setTimeout(() => dpCall(id), 30);
});

/* ================= ④ 매수자 방문 몽타주 ================= */
const DP_BUYER_SAY = {
  "신혼부부":["\"여기 햇빛 들어오는 거 좋다…\"", "둘이 한참 창가에 서 있었다."],
  "대출 최대한도형":["\"대출이 얼마나 나오는지가 관건이라서요.\"", "휴대폰 계산기를 계속 두드렸다."],
  "가격 깎기형":["\"화장실이 좀… 손봐야겠네요.\"", "벽을 손가락으로 두 번 두드렸다."],
  "부모 지원형":["\"부모님이랑 한 번 더 와 봐도 되죠?\"", "사진을 여러 장 찍었다."],
  "급하게 이사해야 하는 사람":["\"언제 들어갈 수 있어요? 다음 달 초면 좋겠는데.\"", "10분 만에 결정했다."]};
function dpVisit(){
  const S = K && K.sale; if(!S || !S.offer || dpBusy()) return;
  const of = S.offer, t = of.buyer.t, say = DP_BUYER_SAY[t] || ["\"생각보다 괜찮네요.\"", "방을 한 바퀴 둘러봤다."];
  const keen = of.amt >= S.list * 0.985, rep = K.repair ? K.repair.id : null;
  const room = rep === "full" ? "새로 한 욕실을 한참 들여다봤다" : rep === "min" || !rep ? "욕실 문을 열었다 금방 닫았다" : "욕실을 둘러보고 고개를 끄덕였다";
  const frames = ["🚪 현관 — 신발을 벗고 들어온다", "🪟 거실 — 창문을 열어 본다", `🚿 ${room}`];
  if(typeof pxCard !== "function") return;
  pxCard(`<div class="dp-visit"><small class="dp-kick">🏠 매수자가 집을 보러 왔다 · ${esc(t)}</small><ol>${frames.map((f, i) => `<li style="animation-delay:${0.15 + i * 0.55}s">${esc(f)}</li>`).join("")}</ol><p class="dp-react" style="animation-delay:${0.15 + frames.length * 0.55}s">${esc(say[0])}<small>${esc(keen ? say[1] : "오래 머물진 않았다.")}</small></p></div>`, 3400, "visit");
}

/* ================= ② 거점 소품 — 시간이 지나면 조금씩 달라진다 ================= */
function dpProps(){
  const L = lfRec(), c = kcRec(), day = dpDayNo(), U = L.umb, items = [];
  const nightOwl = (L.stats && L.stats.late) || 0;
  if(U != null){ if(U === day) items.push(["umb_wet", "☂️", "젖은 우산", "오늘 비 맞고 다녔다. 현관이 축축하다.", "wet"]); else items.push(["umb", "🌂", "마른 우산", "어제는 비가 왔었지.", ""]); }
  if(c.wins >= 1) items.push(["frame", "🖼️", "첫 낙찰 서류", "첫 낙찰. 그날 손이 떨렸다.", ""]);
  if((+c.fails || 0) >= 1){ const m = dpMemLine(); items.push(["memo", "📝", "메모", m ? `포스트잇: "${m}"` : "포스트잇: \"다음엔 이것부터 본다.\"", ""]); }
  const papers = Math.min(3, Math.floor(((c.cases || 0) + (c.bids || 0)) / 2));
  if(papers) items.push(["papers", "🗂️".repeat(papers), "경매 서류", papers >= 3 ? "이거 언제 다 보지…" : "서류가 조금씩 쌓인다.", ""]);
  const own = {seoyun:[["ramen", "🍜", "컵라면", "…오늘도 컵라면."]], dohyun:[["coffee", "🥫", "커피캔", "야근한 날마다 하나씩 늘어난다."], ["tie", "👔", "넥타이", "퇴근하자마자 의자에 걸어 둔 넥타이."]],
    mijeong:[["ledger", "📒", "장부", "가게 장부랑 경매 서류가 섞여 있다."]], jaehoon:[["tape", "📏", "줄자", "습관처럼 챙기는 줄자."]], eunkyung:[["calc", "🧮", "계산기", "숫자는 거짓말을 안 한다. 계산이 틀릴 뿐."]], taesik:[["notebook", "📓", "수첩", "삼십 년치 시세가 연필로 적힌 수첩."]]}[L.char] || [];
  own.forEach(o => { if(o[0] === "tie"){ const D = lfDate(); if(D.dow === 0 || D.dow === 6 || D.h < 18) return; } if(o[0] === "coffee" && nightOwl < 1) return; if(o[0] === "ramen" && (c.cases || 0) + day % 3 < 1) return; items.push(o.concat([""])); });
  return items;
}
function dpPropsMount(){
  const st = document.querySelector(".lf-stage"); if(!st || st.querySelector(".dp-props")) return;
  const items = dpProps(); if(!items.length) return;
  const box = document.createElement("div"); box.className = "dp-props";
  box.innerHTML = items.map(([id, ic, t, line, cls]) => `<button type="button" class="dp-prop ${cls}" data-dpprop="${id}" data-line="${esc(line)}" title="${esc(t)}" aria-label="${esc(t)}">${ic}</button>`).join("");
  st.appendChild(box);
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-dpprop]"); if(!b) return;
  e.stopPropagation();
  const old = document.querySelector(".dp-say-bubble"); if(old) old.remove();
  const s = document.createElement("div"); s.className = "dp-say-bubble"; s.textContent = b.dataset.line; b.parentNode.appendChild(s);
  s.style.left = Math.min(b.offsetLeft, b.parentNode.clientWidth - 40) + "px";
  if(b.dataset.dpprop === "umb_wet" && typeof pxSyn === "function") pxSyn("tap");
  setTimeout(() => s.remove(), 2600);
}, true);
function dpTrackLife(){
  const L = lfRec(); if(!L) return;
  if(K && K.loc === "site" && K.rain){ L.umb = dpDayNo(); }                       // 비 오는 날 현장에 나가면 우산이 젖는다
  const D = lfDate(); if(K && (D.h >= 23 || D.h < 4)){ L.stats = L.stats || {}; if(L.stats.lateDay !== dpDayNo()){ L.stats.late = (L.stats.late || 0) + 1; L.stats.lateDay = dpDayNo(); } }
}

/* ================= 렌더 훅 ================= */
let DP_SIG = {};
const _dp_kBid = kBid; kBid = function(a){ _dp_kBid(a); try{ dpMemAfterBid(); dpAfterLost(); }catch(e){} };
const _dp_kFinish = kFinish; kFinish = function(){ _dp_kFinish(); try{ dpMemAfterFinish(); }catch(e){} };
if(typeof bdDrop === "function"){ const _dp_drop = bdDrop; bdDrop = function(it){ const was = it && it.status; _dp_drop(it); try{ if(was !== "drop") dpAfterDrop(it); }catch(e){} }; }
const _dp_render = renderArena;
renderArena = function(){
  _dp_render();
  queueMicrotask(() => { try{
    if(typeof page === "undefined" || page !== "arena") return;
    const lf = typeof lfOn === "function" && lfOn();
    if(lf) dpTrackLife();
    if(arenaTab === "life" && lf) dpPropsMount();
    const s = {seed:K && K.seed, step:K && K.step, off:K && K.sale && K.sale.offer ? K.sale.offer.amt + ":" + K.sale.weeks : null, rev:!!(K && K.revealing)};
    if(arenaTab === "king" && K){
      if(s.step === "brief" && !K.intro && s.seed !== DP_SIG.seed){ const m = dpMemLine(); if(m) setTimeout(() => { if(K && K.seed === s.seed) dpThought(m); }, typeof pxMin === "function" && pxMin() ? 600 : 1500); }
      if(s.off && s.off !== DP_SIG.off && s.seed === DP_SIG.seed) setTimeout(dpVisit, 150);
    }
    DP_SIG = s;
    if(arenaTab === "life" || arenaTab === "home" || (arenaTab === "king" && K && K.step === "brief")) setTimeout(dpAfterDeliver, 700);
  }catch(e){} });
};
// 벽에 '지난 소식' 모음
if(typeof lfPanel === "function"){ const _dp_panel = lfPanel; lfPanel = function(id){ let h = _dp_panel(id); if(id === "wall"){ const N = dpRec().news; if(N.length) h = `<div class="panel"><b>📰 그때 그 물건들</b><ul class="dp-newslist">${N.map(n => `<li class="${n.tone}"><b>${esc(n.head)}</b><small>${esc(n.lines[n.lines.length - 2] || "")} ${esc(n.lines[n.lines.length - 1])}</small></li>`).join("")}</ul></div>` + h; } return h; }; }
