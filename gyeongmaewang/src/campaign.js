/* ================= 🗺️ 캠페인 — 여섯 인생을 순서대로 여는 스토리 =================
   서윤 → 도현 → 미정 → 재훈 → 은경 → 태식. 처음엔 서윤만 열려 있고,
   한 사람의 엔딩(어떤 엔딩이든 — BAD도)을 보면 다음 사람이 열린다.
   ⚠ 뒤 캐릭터가 더 센 게 아니다 — 풀어야 할 '인생 문제'가 다를 뿐이다(능력치 표는 그대로).
   ⚠ 엔딩은 돈만으로 정하지 않는다 — 마지막 선택(갈림길) + 스트레스 + 손해 본 CASE + 인맥이 같이 본다. */
const CP_ORDER = ["seoyun", "dohyun", "mijeong", "jaehoon", "eunkyung", "taesik"];
const CP_THEME = {seoyun:"입문", dohyun:"시간", mijeong:"사람", jaehoon:"집", eunkyung:"돈", taesik:"경험"};
const CP_THEME_SUB = {seoyun:"경매가 뭔지 처음 배우는 인생", dohyun:"시간이 모자란 인생", mijeong:"사람 사이에서 버티는 인생", jaehoon:"집을 보는 눈으로 사는 인생", eunkyung:"숫자로 버티는 인생", taesik:"오래 본 것을 믿는 인생"};
const CP_YEAR_MIN = 365 * 1440;            // 인생 1년이 지나면 갈림길이 강제로 온다
const CP_BROKE = -10000;                   // 대출 1억을 넘기면 파산 — BAD 엔딩(진행은 막지 않는다)
const CP_ENDING_T = {normal:"NORMAL", good:"GOOD", bad:"BAD", special:"SPECIAL"};

function cpName(id){ const C = LF_CHARS.find(x => x.id === id); return C ? C.name : id; }
function cpNext(id){ const i = CP_ORDER.indexOf(id); return i >= 0 && i < CP_ORDER.length - 1 ? CP_ORDER[i + 1] : null; }
function cpPrev(id){ const i = CP_ORDER.indexOf(id); return i > 0 ? CP_ORDER[i - 1] : null; }

/* ---------- 저장 구조 + 옛 세이브 옮기기 ----------
   arenaRec().campaign = {v, unlocked:{id:true}, cleared:{id:{ending, at}}, endings:{id:{normal:ts,…}}, stash:{id:커리어 세이브}, fresh:다음 해금 연출 대기} */
function cpRec(){
  const R = arenaRec();
  if(!R.campaign || typeof R.campaign !== "object") R.campaign = {v:1};
  const P = R.campaign;
  ["unlocked", "cleared", "endings", "stash"].forEach(k => { if(!P[k] || typeof P[k] !== "object") P[k] = {}; });
  if(!P.migrated) cpMigrate(P);
  P.unlocked.seoyun = true;
  return P;
}
function cpMigrate(P){
  P.migrated = 1;
  const L = kcRec().life;
  if(L && L.char && CP_ORDER.includes(L.char)){
    // 이미 하고 있던 인생은 그대로 열어 둔다 — 세이브를 뺏지 않는다
    P.unlocked[L.char] = true;
    CP_ORDER.slice(0, CP_ORDER.indexOf(L.char)).forEach(id => { P.unlocked[id] = true; });
    // 갈림길을 이미 지난 인생 = 옛 규칙의 엔딩으로 보고 클리어 처리(NORMAL, 옛 세이브 표시)
    if(L.path){ P.cleared[L.char] = {ending:"normal", at:Date.now(), legacy:true}; (P.endings[L.char] = P.endings[L.char] || {}).normal = Date.now(); const n = cpNext(L.char); if(n) P.unlocked[n] = true; L.mode = "career"; }
  }
}
function cpUnlocked(id){ const P = cpRec(); return !!(P.debug || P.unlocked[id]); }
function cpCleared(id){ return !!cpRec().cleared[id]; }
function cpUnlockAll(on){ const P = cpRec(); P.debug = on !== false; if(typeof save === "function") save(); }   // 🐞 디버그 전용 — 화면엔 버튼이 없다(주소 끝 #debug일 때만)
function cpDebugOn(){ try{ return /[#&?]debug\b/.test(location.hash + location.search); }catch(e){ return false; } }

/* ---------- ACT n/4 ---------- */
function cpAct(){
  const L = lfRec(), c = kcRec(); if(!L) return 0;
  if(L.path || lfPathDue()) return 4;
  if(c.total >= 5000 || c.cases >= 3 || L.t >= 180 * 1440) return 3;
  if(c.cases >= 1) return 2;
  return 1;
}
function cpActChip(){
  const L = lfRec(); if(!L) return "";
  if(L.mode === "career") return `<span class="cp-act career" title="엔딩을 본 뒤 자유롭게 이어 가는 중">CAREER</span>`;
  const a = cpAct(), i = CP_ORDER.indexOf(L.char) + 1;
  return `<span class="cp-act" title="${esc(CP_THEME[L.char] || "")} — 스토리 진행">CH.${i} · ACT ${a}/4</span>`;
}
function cpDots(){
  const P = cpRec();
  const dots = CP_ORDER.map(id => P.cleared[id] ? `<i class="on" title="${esc(cpName(id))} 클리어">●</i>` : cpUnlocked(id) ? `<i class="cur" title="${esc(cpName(id))} 진행 가능">◉</i>` : `<i title="잠김">○</i>`).join("");
  const n = CP_ORDER.filter(id => P.cleared[id]).length;
  return `<div class="cp-prog"><span class="cp-dots">${dots}</span><b>스토리 ${n}/6 클리어</b><small>한 사람의 엔딩을 보면(어떤 엔딩이든) 다음 사람이 열려요</small></div>`;
}

/* ---------- 엔딩 ---------- */
const CP_SPECIAL = {
  seoyun:{need:"한 번도 손해 보지 않고 3건 이상", ok:(c, L) => c.cases >= 3 && (+c.fails || 0) === 0},
  dohyun:{need:"회사를 지키면서 연차를 5일 넘게 남긴다", ok:(c, L, o) => o && o.id === "stay" && L.leave > 5},
  mijeong:{need:"네 사람 이상과 깊은 인맥", ok:(c, L) => Object.values(L.rel || {}).filter(v => +v >= 4).length >= 4},
  jaehoon:{need:"'하자탐정'이 되고 현장을 떠나지 않는다", ok:(c, L, o) => !!(L.titles || {}).detective && o && o.id === "keep"},
  eunkyung:{need:"보수적으로 가면서 손해 본 CASE 0건", ok:(c, L, o) => o && o.id === "safe" && (+c.fails || 0) === 0 && c.cases >= 2},
  taesik:{need:"현장 파트너와 함께, 마음 편하게", ok:(c, L, o) => o && o.id === "partner" && L.stress < 40}};
const CP_ENDINGS = {
  seoyun:{
    normal:["반지하의 창문", "통장은 여전히 얇지만, 서류를 읽는 눈은 생겼다. 다음 입찰 공고를 넘기는 손이 더는 떨리지 않는다."],
    good:["처음 내 이름으로 된 집", "등기부 맨 아래 줄에 내 이름이 찍혔다. 엄마에게 사진을 보냈다. \"이게 네 거야?\" — 응, 이제 시작이야."],
    bad:["다시 편의점 알바", "욕심이 한 번, 계산 실수가 한 번. 빚을 갚느라 계절이 두 번 바뀌었다. 그래도 공부한 것은 남았다 — 다음엔 덜 서두를 것이다."],
    special:["손해 없는 첫 해", "한 건도 물리지 않았다. 운이 아니라 확인을 한 번 더 한 덕이다. 스터디 모임에서 사람들이 묻는다. \"어떻게 그렇게 조심해요?\""]},
  dohyun:{
    normal:["두 개의 명함", "회사 명함과, 아무도 모르는 두 번째 일. 시간은 여전히 모자라지만 퇴근길이 조금 덜 무겁다."],
    good:["내 시간을 산 사람", "수익이 월급을 넘은 날, 처음으로 반차를 '쉬려고' 썼다. 창밖을 오래 봤다."],
    bad:["번아웃", "밤을 새운 입찰, 회의에서 졸던 날들. 결국 둘 다 놓칠 뻔했다. 한동안 쉬기로 했다 — 경매는 도망가지 않는다."],
    special:["아무도 모르게", "회사는 그대로, 연차는 넉넉히. 팀장은 오늘도 모른다. 도현은 점심시간에 매각기일을 조용히 확인한다."]},
  mijeong:{
    normal:["가게와 경매 사이", "손님 응대와 명도 협상은 닮은 데가 있었다. 둘 다 결국 사람이 하는 일이다."],
    good:["사장님의 두 번째 사업", "가게 벽에 작은 액자 하나. 첫 낙찰 물건의 열쇠다. 단골들이 묻는다. \"사장님, 이것도 하세요?\""],
    bad:["문을 닫은 날", "가게도, 물건도 붙잡으려다 둘 다 흔들렸다. 셔터를 내리며 생각했다 — 한 번에 하나씩이었어야 했다."],
    special:["전화가 먼저 오는 사람", "중개사, 법무사, 인테리어 실장. 이제 좋은 물건이 뜨면 미정에게 먼저 전화가 온다. 사람을 남긴 한 해였다."]},
  jaehoon:{
    normal:["서류보다 벽", "등기부는 여전히 어렵다. 그래도 벽을 두드리면 안다. 이 집이 어떤 집인지."],
    good:["내가 고친 집", "직접 손본 집이 제값에 팔렸다. 새 주인이 '집이 따뜻하다'고 했다. 그 말이 수익보다 좋았다."],
    bad:["보이지 않던 하자", "벽만 보고 서류를 덜 봤다. 권리 하나가 발목을 잡았다. 공구함 옆에 민법 책을 한 권 뒀다."],
    special:["하자탐정", "현장 사람들이 재훈을 그렇게 부른다. 눈으로 본 것과 서류로 본 것이 겹치는 곳 — 거기에 답이 있었다."]},
  eunkyung:{
    normal:["초록색 합계 칸", "엑셀 시트의 맨 아래 줄이 초록색이다. 크지 않지만 틀리지 않았다."],
    good:["숫자가 말해 준 것", "예금 이자로는 못 샀을 시간을 샀다. 은경은 오늘도 시트를 연다 — 이번엔 설레는 마음으로."],
    bad:["계산 밖의 비용", "시트에 없는 칸이 있었다. 명도, 수리, 공실. 숫자는 맞았는데 현실이 틀렸다. 시트에 줄을 세 개 더 만들었다."],
    special:["한 번도 물리지 않은 시트", "깐깐하게 걸렀고, 한 건도 손해가 없다. 동호회 사람들이 은경의 시트를 빌려 간다."]},
  taesik:{
    normal:["오래된 수첩의 새 장", "삼십 년 본 동네 시세 위에 이제 경매 낙찰가가 적힌다. 천천히, 하지만 정확하게."],
    good:["아들에게 보낸 사진", "\"아버지, 이거 진짜 아버지가 하신 거예요?\" 태식은 웃으며 수첩을 덮었다."],
    bad:["무릎이 먼저 말했다", "계단 많은 빌라를 하루에 세 곳. 몸이 먼저 멈췄다. 이제 전화 조사를 먼저 하고, 꼭 필요한 곳만 간다."],
    special:["둘이 가는 길", "현장 파트너와 나눠 걸으니 발걸음이 가볍다. 태식은 경험을, 파트너는 발을 — 좋은 조합이었다."]}};

function cpDecide(forced, o){
  const L = lfRec(), c = kcRec();
  if(forced === "broke") return "bad";
  if(c.total < 0 || L.stress >= 85) return "bad";
  const S = CP_SPECIAL[L.char]; if(S && S.ok(c, L, o)) return "special";
  const fails = +c.fails || 0;
  if(c.total >= 15000 && L.stress < 60 && fails <= Math.max(1, c.cases / 3)) return "good";
  return "normal";
}
function cpSummary(type, o, forced){
  const L = lfRec(), c = kcRec(), C = lfChar(), E = (CP_ENDINGS[L.char] || {})[type] || ["엔딩", ""];
  const days = Math.max(1, Math.round(L.t / 1440)), rels = Object.values(L.rel || {}).filter(v => +v >= 4).length;
  const why = type === "bad" ? (forced === "broke" ? `대출이 ${kMan(-c.cash)}까지 불었어요.` : c.total < 0 ? "누적 수익이 마이너스로 끝났어요." : "스트레스가 한계를 넘었어요.")
    : type === "special" ? `숨은 조건 — ${CP_SPECIAL[L.char].need}`
    : type === "good" ? "수익·마음·실수 셋 다 균형이 좋았어요." : "무난하게 한 해를 버텼어요.";
  return {type, title:E[0], text:E[1], why, char:L.char, emo:C.emo, name:C.name, choice:o ? o.t : (forced === "broke" ? "파산" : ""),
    rows:[["지난 날", `${days}일`], ["처리한 CASE", `${c.cases}건 (손해 ${+c.fails || 0}건)`], ["누적 수익", kMan(c.total)], ["지금 자금", c.cash < 0 ? "대출 " + kMan(-c.cash) : kMan(c.cash)], ["스트레스", `${Math.round(L.stress)}/100`], ["깊은 인맥", `${rels}명`]]};
}
let CP_SHOW = null;       // 지금 떠 있는 엔딩 화면 {sum, step:"end"|"reveal", next, first}
function cpFinish(o, forced){
  const L = lfRec(); if(!L || L.mode === "career" || L.ended) return;
  const P = cpRec(), type = cpDecide(forced, o), sum = cpSummary(type, o, forced);
  const next = cpNext(L.char), first = next && !P.unlocked[next];
  (P.endings[L.char] = P.endings[L.char] || {})[type] = Date.now();
  P.cleared[L.char] = {ending:type, at:Date.now()};
  if(next) P.unlocked[next] = true;
  L.ended = type; L.mode = "career";
  lfLog(`🎬 ${CP_ENDING_T[type]} END — 「${sum.title}」`);
  if(typeof save === "function") save();
  CP_SHOW = {sum, step:"end", next, first};
  cpPaint();
  if(typeof kcSfx === "function") kcSfx(type === "bad" ? "warning" : "fanfare");
}
function cpEndHTML(){
  const S = CP_SHOW; if(!S) return "";
  const s = S.sum, got = cpRec().endings[s.char] || {};
  if(S.step === "end"){
    const slots = ["normal", "good", "bad", "special"].map(t => `<span class="cp-slot ${got[t] ? "got" : ""} ${t === s.type ? "now" : ""}">${got[t] ? CP_ENDING_T[t] : "?"}</span>`).join("");
    return `<div class="cp-card cp-${s.type}"><small class="cp-kick">${s.emo} ${esc(s.name)}의 인생 · ${CP_ENDING_T[s.type]} END</small><h2>「${esc(s.title)}」</h2><p class="cp-txt">${esc(s.text)}</p>
      ${s.choice ? `<p class="cp-choice">🧭 마지막 선택 — <b>${esc(s.choice)}</b></p>` : ""}<p class="cp-why">${esc(s.why)}</p>
      <dl class="cp-rows">${s.rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl>
      <div class="cp-slots"><small>엔딩 모으기</small>${slots}</div>
      <div class="cp-btns"><button type="button" class="btn pri" data-cp="go">${S.next ? "다음 ▶" : "확인"}</button></div></div>`;
  }
  const N = S.next ? LF_CHARS.find(x => x.id === S.next) : null;
  const art = N && typeof LF_CHAR_ART !== "undefined" && LF_CHAR_ART[N.id] && typeof lfBlob === "function" ? `<img src="${lfBlob(LF_CHAR_ART[N.id].face.normal)}" alt="">` : `<span>${N ? N.emo : "🏁"}</span>`;
  const head = N ? (S.first ? "새로운 인생이 열렸습니다" : `${esc(N.name)}의 인생은 이미 열려 있어요`) : "여섯 인생을 모두 지나왔습니다";
  return `<div class="cp-card cp-reveal"><div class="cp-face ${S.first ? "pop" : ""}">${art}</div><small class="cp-kick">${N ? `CHAPTER ${CP_ORDER.indexOf(N.id) + 1} · ${esc(CP_THEME[N.id])}` : "EPILOGUE"}</small><h2>${head}</h2>
    ${N ? `<p class="cp-txt"><b>${esc(N.name)}</b> · ${N.age}세 · ${esc(N.job)}<br>“${esc(LF_ECON[N.id].quote)}”<br><small>${esc(CP_THEME_SUB[N.id])}</small></p>` : `<p class="cp-txt">모든 인생의 엔딩을 봤어요. 네 가지 엔딩을 다 모으거나, 커리어 모드로 계속 이어 가세요.</p>`}
    ${cpDots()}
    <div class="cp-btns">${N ? `<button type="button" class="btn pri" data-cp="new">▶ 새로운 인생 시작</button>` : ""}<button type="button" class="btn" data-cp="career">🏢 커리어 모드로 계속</button><button type="button" class="btn" data-cp="menu">🎭 인생 고르기로</button></div>
    <small class="note">커리어 모드 — ${esc(s.name)}의 지금 자금·기록 그대로 엔딩 없이 계속해요. 나중에 인생 고르기에서 언제든 다시 이어 갈 수 있어요.</small></div>`;
}
function cpPaint(){
  let el = document.getElementById("cpEnd");
  if(!CP_SHOW){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement("div"); el.id = "cpEnd"; el.className = "cp-end"; document.body.appendChild(el); }
  el.innerHTML = `<div class="cp-veil"></div>${cpEndHTML()}`;
}

/* ---------- 커리어 세이브(캐릭터마다 따로 보관) ---------- */
const CP_KEEP = ["cash", "start", "total", "cases", "wins", "fails", "bids", "lostBids", "best", "worst", "streak", "history", "life", "board"];
function cpStashNow(){
  const c = kcRec(), L = c.life; if(!L || L.mode !== "career") return;
  const snap = {}; CP_KEEP.forEach(k => { if(c[k] !== undefined) snap[k] = c[k]; });
  try{ cpRec().stash[L.char] = JSON.parse(JSON.stringify(snap)); }catch(e){}
}
function cpResume(id){
  const P = cpRec(), snap = P.stash[id];
  cpStashNow();
  const c = kcRec(); CP_KEEP.forEach(k => { delete c[k]; });
  if(snap){ Object.assign(c, JSON.parse(JSON.stringify(snap))); }
  else { lfNew(id); }
  const L = c.life; L.mode = "career"; L.intro = false; if(!L.ended) L.ended = (P.cleared[id] || {}).ending || "normal";
  K = null; LF_PICK = null; LF_SPOT = "laptop"; arenaTab = "life";
  if(typeof save === "function") save();
  renderArena();
  if(typeof gxBanner === "function") gxBanner("place", {big:`🏢 CAREER · ${esc(cpName(id))}`, sub:snap ? "지난 기록 그대로 이어서" : "새 커리어"});
}

/* ---------- 강제 엔딩 조건: 1년 경과 → 갈림길 강제 / 파산 → BAD ---------- */
const _cp_pathDue = lfPathDue;
lfPathDue = function(){
  const L = lfRec(); if(!L || L.path || L.intro || L.mode === "career") return L && L.mode === "career" ? _cp_pathDue() : false;
  return _cp_pathDue() || L.t >= CP_YEAR_MIN;
};
function cpBrokeCheck(){
  const L = lfRec(); if(!L || L.mode === "career" || L.ended || L.intro) return;
  if(kcRec().cash <= CP_BROKE && arenaTab === "life" && (!K || K.step === "result")) cpFinish(null, "broke");
}
// 갈림길 선택 = 마지막 인생 선택 → 엔딩(cine.js 핸들러가 경로를 적용한 뒤에 본다)
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-lfpath]"); if(!b) return;
  setTimeout(() => { const L = lfRec(); if(!L || L.mode === "career" || L.ended || !L.path) return; const P = LF_PATHS[L.char], o = P && P.opts.find(x => x.id === L.path); cpFinish(o, null); }, 60);
});

/* ---------- 엔딩 화면 버튼 ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-cp]"); if(!b || !CP_SHOW) return;
  e.stopImmediatePropagation();
  const act = b.dataset.cp, S = CP_SHOW;
  if(act === "go"){ S.step = "reveal"; cpPaint(); if(S.first && typeof kcSfx === "function") kcSfx("level"); return; }
  CP_SHOW = null; cpPaint();
  if(act === "career"){ arenaTab = "life"; renderArena(); return; }
  cpStashNow();
  const c = kcRec(); delete c.life; delete c.board; K = null;
  LF_PICK = act === "new" ? S.next : null; arenaTab = "life";
  if(typeof save === "function") save(); renderArena(); window.scrollTo(0, 0);
}, true);

/* ---------- 인생 고르기: 잠금 · 진행 · CAREER ---------- */
const _cp_select = lfSelectHTML;
lfSelectHTML = function(){
  const P = cpRec();
  if(LF_PICK && !cpUnlocked(LF_PICK)) LF_PICK = null;
  let h = _cp_select();
  const parts = h.split('<button type="button" class="lf-card ');
  h = parts[0] + parts.slice(1).map(seg => {
    const m = seg.match(/data-lfpick="(\w+)"/), id = m && m[1]; if(!id) return '<button type="button" class="lf-card ' + seg;
    const i = CP_ORDER.indexOf(id) + 1, got = P.endings[id] || {}, nEnd = Object.keys(got).length;
    const tag = `<span class="cp-ch">CH.${i} · ${esc(CP_THEME[id])}</span>`;
    if(!cpUnlocked(id)){
      seg = seg.replace(/^([^"]*)"/, '$1 locked"').replace(`data-lfpick="${id}"`, `data-cplock="${id}" aria-disabled="true"`).replace(` data-lfhover="${id}"`, "");
      return '<button type="button" class="lf-card ' + seg.replace("</button>", `${tag}<span class="cp-lock"><b>🔒</b><small>${esc(cpName(cpPrev(id)))}의 엔딩을 보세요</small></span></button>`);
    }
    const badge = P.cleared[id] ? `<span class="cp-clear">✅ 엔딩 ${nEnd}/4 · <b>CAREER</b></span>` : "";
    return '<button type="button" class="lf-card ' + seg.replace("</button>", `${tag}${badge}</button>`);
  }).join("");
  h = h.replace(/(<h3>🎭 누구의 경매 인생을 시작할까요\?<\/h3>)/, `$1${cpDots()}`);
  // 클리어한 사람을 골랐으면 커리어 버튼(지난 기록 이어 하기)
  if(LF_PICK && P.cleared[LF_PICK]){
    const has = !!P.stash[LF_PICK];
    h = h.replace(`>▶ 이 인생으로 시작</button>`, `>▶ 스토리 다시 하기</button><button type="button" class="btn cp-career" data-cpcareer="${LF_PICK}">🏢 커리어 모드${has ? " — 이어서" : ""}</button>`);
  }
  if(cpDebugOn()) h = h.replace("</h3>", `</h3><button type="button" class="btn cp-dbg" data-cpdebug>🐞 DEBUG: ${P.debug ? "잠금 되돌리기" : "모두 열기"}</button>`);
  return h;
};
window.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena") return;
  let b;
  if((b = e.target.closest && e.target.closest("[data-cplock]"))){ e.stopImmediatePropagation(); e.preventDefault(); const id = b.dataset.cplock; safeAlert(`🔒 ${cpName(cpPrev(id))}의 엔딩을 보면 열려요 — 어떤 엔딩이든 괜찮아요.`); b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); return; }
  if((b = e.target.closest && e.target.closest("[data-lfstart]")) && !cpUnlocked(b.dataset.lfstart)){ e.stopImmediatePropagation(); e.preventDefault(); safeAlert("🔒 아직 열리지 않은 인생이에요."); return; }
  if((b = e.target.closest && e.target.closest("[data-lfstart]"))){ const L = lfRec(); if(L && L.mode === "career") cpStashNow(); }   // 커리어 중이던 인생은 보관해 두고 새로 시작
  if((b = e.target.closest && e.target.closest("[data-cpcareer]"))){ e.stopImmediatePropagation(); cpResume(b.dataset.cpcareer); return; }
  if(e.target.closest && e.target.closest("[data-cpdebug]")){ e.stopImmediatePropagation(); const P = cpRec(); cpUnlockAll(!P.debug); renderArena(); return; }
}, true);
// 스토리 인생 도중 '다른 투자자로 새 인생'을 누르면: 커리어 인생이면 보관
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-lfreset]")){ const L = lfRec(); if(L && L.mode === "career") cpStashNow(); } }, true);

/* ---------- 머리줄 ACT 칩 · 렌더 뒤 점검 ---------- */
const _cp_kfsHeader = kfsHeader;
kfsHeader = function(){ const h = _cp_kfsHeader(); return lfOn() ? h.replace(/(<span class="kfs-sub">[^<]*<\/span>)/, `$1${cpActChip()}`) : h; };
const _cp_render = renderArena;
renderArena = function(){ cpRec(); _cp_render(); queueMicrotask(() => { if(typeof page !== "undefined" && page === "arena") cpBrokeCheck(); if(CP_SHOW && !document.getElementById("cpEnd")) cpPaint(); }); };
// 거점 벽에 엔딩 모음
const _cp_panel = lfPanel;
lfPanel = function(id){
  let h = _cp_panel(id);
  if(id === "wall" && lfOn()){
    const P = cpRec();
    const rows = CP_ORDER.map(cid => { const got = P.endings[cid] || {}; return `<li class="${cpUnlocked(cid) ? "" : "off"}"><b>${esc(cpName(cid))}</b> ${["normal", "good", "bad", "special"].map(t => `<span class="cp-slot ${got[t] ? "got" : ""}">${got[t] ? CP_ENDING_T[t] : "?"}</span>`).join("")}${got.special ? "" : cpUnlocked(cid) ? ` <small class="note">SPECIAL 힌트 — ${esc(CP_SPECIAL[cid].need)}</small>` : ""}</li>`; }).join("");
    h = `<div class="panel"><b>🎬 엔딩 모음</b>${cpDots()}<ul class="cp-list">${rows}</ul></div>` + h;
  }
  if(lfOn() && lfRec().mode !== "career" && lfPathDue() && id !== "board") h = h.replace('<small class="note">한 번 고르면 되돌릴 수 없어요 — 인생이니까요.</small>', '<small class="note">한 번 고르면 되돌릴 수 없어요 — 이 선택으로 이 인생의 엔딩이 정해져요.</small>');
  return h;
};
