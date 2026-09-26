/* ================= 📋 조사 상황판 — 한 장짜리 대시보드 =================
   예전엔 체력·일정 줄글·"오늘은 여기까지"·시세 감·남은 시간이 세 조각으로 따로 붙어 글만 길었다.
   이제 한 카드: 일차 칸(●○○) · 지금 시각 · 오늘 남은 시간(큰 숫자+막대) · 체력/스트레스 · [다음 날로] 큰 버튼 · 시세 감 한 줄.
   카드는 스크롤해도 위에 붙어 있다(sticky). 계산·시간·버튼 동작은 기존 그대로(data-lfnext / data-lfleave). */
function dbHM(m){ const h = Math.floor(m / 60), mm = m % 60; return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`; }
function dbDashHTML(){
  const L = lfRec(), C = lfChar(), days = K.lf.days, rd = K.lf.rday, d = days[rd], last = rd >= days.length - 1, next = !last ? days[rd + 1] : null;
  const pct = Math.max(0, Math.min(100, Math.round(K.timeLeft / d.len * 100))), c = typeof bdClock === "function" ? bdClock() : {ic:"🕙", txt:dbHM(d.s)};
  const sr = L.sta / L.st.stamina, tired = sr < (lfIs("taesik") ? 0.4 : 0.3), band = lfBand(), low = K.timeLeft < 120;
  const pip = (x, i) => `<span class="lfd-pip ${i < rd ? "past" : i === rd ? "now" : ""}" title="${i + 1}일차 ${SN_DOW[x.dow]} ${dbHM(x.s)}부터 ${krFmt(x.len)}"><b>${i < rd ? "✓" : i + 1}</b><small>${SN_DOW[x.dow]}</small></span>`;
  const meter = (ic, t, v, max, cls) => `<div class="lfd-meter ${cls}"><span>${ic} ${t}</span><i class="lf-bar${cls === "st" ? " st" : ""}"><i style="width:${Math.round(v / max * 100)}%" class="${cls === "sta" && v / max < 0.3 ? "low" : ""}"></i></i><b>${Math.round(v)}</b></div>`;
  const leave = typeof lfCanLeave === "function" && lfCanLeave() ? `<button type="button" class="btn lfd-leave" data-lfleave>🏖️ 연차 쓰기 <small>오전 10시부터 5시간 · 남은 ${L.leave}일</small></button>` : (L.char === "dohyun" && L.path !== "quit" ? `<small class="lfd-sub">🏢 남은 연차 ${L.leave}일</small>` : "");
  return `<div class="panel kr-clock lf-dash">
    <div class="lfd-head"><div class="lfd-pips">${days.map(pip).join('<i class="lfd-line"></i>')}</div><span class="lfd-now">${c.ic} ${esc(c.txt)}</span></div>
    <div class="lfd-left"><small>오늘 남은 조사 시간</small><span class="kr-left${low ? " low" : ""}">${krFmt(K.timeLeft)}</span></div>
    <div class="ke-bar kr-bar"><i style="width:${pct}%"></i></div>
    <div class="lfd-meters">${meter("⚡", "체력", L.sta, L.st.stamina, "sta")}${meter("😣", "스트레스", L.stress, 100, "st")}</div>
    ${tired ? `<p class="lfd-warn">😮‍💨 지쳤어요 — 현장 조사가 ${lfIs("taesik") ? "60%" : "25%"} 더 걸려요</p>` : ""}
    ${next ? `<button type="button" class="btn pri lfd-next" data-lfnext><span>🛏️ 다음 날로</span><small>${rd + 2}일차 · ${SN_DOW[next.dow]} ${dbHM(next.s)}부터 ${krFmt(next.len)}</small></button>`
           : `<p class="lfd-last">🏁 마지막 조사일 — 시간을 다 쓰면 입찰표를 쓰러 가요</p>`}
    ${leave}
    <div class="lfd-foot"><span>📍 ${K.loc === "site" ? "🏚️ 현장" : "🏠 집"}</span><span title="시세감각 ${lfSt("market")}">🧠 시세 감 <b>${kMan(band.lo)}~${kMan(band.hi)}</b>${K.found && K.found.price ? " 🔍" : ""}</span></div>
  </div><div class="lf-feel lfd-feelnote"><small>${K.found && K.found.price ? "🔍 시세 단서를 잡아 시세 감 폭이 좁아졌어요" : "시세 단서를 조사로 잡으면 시세 감 폭이 확 좁아져요"} · 틀릴 수도 있어요 · 현장에서 연달아 조사하면 이동시간 0</small></div>`;
}
if(typeof krActionsHTML === "function"){
  const _db_krA = krActionsHTML;
  krActionsHTML = function(){
    let h = _db_krA.apply(this, arguments);
    if(!K || !K.lf || typeof lfRec !== "function" || !lfRec()) return h;
    try{
      const i = h.indexOf('<div class="panel lf-day">'), j = h.indexOf('<div class="panel kr-clock">');
      if(i < 0 || j < i) return h;
      const n = h.indexOf('<div class="note">', j), e = n < 0 ? -1 : h.indexOf("</div></div>", n);
      if(e < 0) return h;
      return h.slice(0, i) + dbDashHTML() + h.slice(e + 12);
    }catch(err){ return h; }
  };
}
