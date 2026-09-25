/* ================= 🏠 거점 방 정리 — 10칸 → 6칸 + 오른쪽 위 휴대폰·달력 =================
   침대·냉장고 = 쉬기, 노트북·책장 = 책상. 휴대폰·달력은 늘 손에 있는 거라 화면 위 작은 버튼으로.
   칸마다 '지금 상태'(체력·현금·진행 중 CASE…)를 보여 주고, 지금 하면 좋은 칸에 추천 표시.
   예전 칸 이름(laptop·shelf·bed·fridge)은 그대로 받아서 새 칸으로 넘긴다 — 다른 화면·테스트가 그 이름을 쓴다. */
const RH_ALIAS = {laptop:"desk", shelf:"desk", bed:"rest", fridge:"rest"};
const RH_SPOTS = [["desk","🖥️","책상"],["rest","🛋️","쉬기"],["out","🚪","외출"],["bank","📒","통장"],["file","📁","CASE 파일"],["wall","🏆","벽"]];
function rhSpot(){ return RH_ALIAS[LF_SPOT] || LF_SPOT; }
function rhState(){
  const L = lfRec(), c = kcRec(), D = lfDate(), max = L.st.stamina || 1, r = L.sta / max;
  const running = typeof bdRunning === "function" && bdRunning();
  const night = D.h >= 21 || D.h < 7, day = D.h >= 9 && D.h < 18;
  const titles = Object.keys(L.titles || {}).length, allT = (typeof LF_TITLES !== "undefined" ? LF_TITLES.length : 0);
  const past = (c.history || []).filter(e => e.mode !== "quick").length;
  const S = {
    desk: {sub: L.fx && L.fx.book ? "📦 새 책 도착 — 공부 효율 ↑" : "경매 검색 · 공부", dot: !!(L.fx && L.fx.book)},
    rest: {sub: `체력 ${Math.round(L.sta)}/${max}`, warn: r < 0.35, dot: r < 0.35},
    out:  {sub: night ? "밤이라 임장은 내일" : day ? "임장하기 좋은 시간" : "동네 임장 · 사람", dim: night},
    bank: {sub: c.cash < 0 ? `대출 ${kMan(-c.cash)}` : kMan(c.cash), warn: c.cash < 0},
    file: {sub: running ? "▶ 진행 중인 물건" : past ? `지난 물건 ${past}건` : "아직 비어 있음", dot: !!running},
    wall: {sub: allT ? `칭호 ${titles}/${allT}` : "칭호 · 커리어"}};
  // 지금 제일 먼저 할 일 한 칸
  S.rec = r < 0.35 ? "rest" : running ? "file" : night ? "rest" : L.fx && L.fx.book ? "desk" : day ? "out" : "desk";
  return S;
}
function rhDockHTML(){
  const S = rhState(), cur = rhSpot();
  return `<div class="of-spots lf-spots rh-dock">${RH_SPOTS.map(([id, ic, t]) => { const s = S[id];
    return `<button type="button" class="of-spot rh-spot ${cur === id ? "on" : ""} ${s.warn ? "warn" : ""} ${s.dim ? "dim" : ""}" data-lfspot="${id}">${S.rec === id && cur !== id ? `<i class="rh-rec">추천</i>` : ""}${s.dot ? `<i class="rh-dot"></i>` : ""}<span>${ic}</span><b>${t}</b><small>${esc(s.sub)}</small></button>`; }).join("")}</div>`;
}
function rhQuickHTML(){
  const L = lfRec(), D = lfDate(), cur = rhSpot();
  const met = typeof nmRec === "function" ? Object.keys(nmRec()).length : 0, known = Object.keys(L.rel || {}).length, n = Math.max(met, known);
  return `<div class="rh-quick"><button type="button" class="rh-q rh-cal ${cur === "calendar" ? "on" : ""}" data-lfspot="calendar" title="달력 — 일정·시기"><em>${D.m}월</em><b>${D.d}</b><small>${SN_DOW[D.dow]}</small></button>
    <button type="button" class="rh-q rh-phone ${cur === "phone" ? "on" : ""}" data-lfspot="phone" title="휴대폰 — 연락처·안부"><span>📱</span><small>연락처</small>${n ? `<i class="rh-badge">${n}</i>` : ""}</button></div>`;
}
const _rh_base = lfBaseHTML; lfBaseHTML = function(){
  let h = _rh_base();
  h = h.replace(/<div class="of-spots lf-spots">[\s\S]*?<\/div>/, rhDockHTML());
  h = h.replace('<div class="lf-top">', rhQuickHTML() + '<div class="lf-top">');
  return h.replace('class="vn of-stage lf-stage', 'class="vn of-stage lf-stage rh-room');
};
const _rh_panel = lfPanel; lfPanel = function(id){
  const k = RH_ALIAS[id] || id;
  if(k === "desk") return _rh_panel("laptop").replace("<h3>💻 노트북</h3>", "<h3>🖥️ 책상</h3>") + `<h4 class="rh-sub">📚 공부</h4>${_rh_panel("shelf").replace(/<h3>[^<]*<\/h3>/, "")}`;
  if(k === "rest") return `<h3>🛋️ 쉬기</h3><p class="note">밥은 체력을 조금, 잠은 많이 채워요. 밤늦게 자면 덜 개운해요.</p>${lfActBtns("fridge")}${lfActBtns("bed")}`;
  return _rh_panel(id);
};
