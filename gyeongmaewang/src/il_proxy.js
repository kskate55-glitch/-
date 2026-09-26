/* ================= 🤝 본편 연결 — 이도현의 '직접 참석 / 대리입찰' (외전 D01) =================
   범위: 이도현 스토리 에피소드의 2번째 사건부터(K.epStory.ch === "dohyun" && i >= 1), D01이 열린 뒤.
   다른 캐릭터·자유 모드·주간 도전에는 아무것도 바뀌지 않는다.
   · 봉투 확인 화면(keSealedHTML)에 참석 방식 선택 + 최종 검토표를 붙인다. 고르는 것만으로는 돈이 안 나간다.
   · 📮 제출(kBid) 순간에만 한 번 확정한다. 입찰 실행 id(tx)마다 한 번 — 두 번 눌러도, 새로고침해도 중복 없음.
     - 낙찰: 사건 비용 K.cost.legal에 15만원을 더한다(정산표 '법무·수수료' 줄) — 보증금·낙찰대금과 섞지 않는다.
     - 패찰: 통장(kcRec().cash)에서 15만원을 바로 뺀다. 보증금 반환과 별개.
   · 경쟁자 금액·낙찰 결과는 건드리지 않는다(K.r() 호출 없음). 바뀌는 건 입찰일 반차·스트레스뿐.
   · 15만원은 밸런스용 가상 이용료 — 실제 서비스 요금이 아니다. */
const IL_PROXY_FEE = 15;   // 만원 · 가상값
function ilProxyRec(){ const R = ilRec(); if(!R.proxy || typeof R.proxy !== "object") R.proxy = {}; return R.proxy; }
function ilProxyOn(){
  if(typeof K === "undefined" || !K || !K.epStory || K.epStory.ch !== "dohyun" || !(K.epStory.i >= 1)) return false;
  if(!IL.D01) return false;
  ilSync();
  return ilState("D01").st !== "locked";
}
function ilProxyTx(){ return `dohyun:${K.epStory.i}:${(typeof KP !== "undefined" && KP && KP.id) || K.prop || "?"}`; }
function ilProxyMode(){ return K && K.ilAttend === "proxy" ? "proxy" : "direct"; }
function ilProxyCash(){ return typeof kcRec === "function" ? (+kcRec().cash || 0) : 0; }
function ilProxyDep(){ return typeof KP !== "undefined" && KP ? Math.round(KP.minBid * 0.1 / 10) * 10 : 0; }
function ilProxyAfford(){ return ilProxyCash() - ilProxyDep() >= IL_PROXY_FEE; }
function ilProxyPanel(){
  if(!ilProxyOn() || !K.sealed) return "";
  const mode = ilProxyMode(), ok = ilProxyAfford(), L = typeof lfRec === "function" ? lfRec() : null;
  const leaveTxt = L && L.char === "dohyun" ? (L.path === "quit" ? "회사를 그만둔 뒤라 반차는 필요 없다" : `평일이면 반차 0.5일(남은 연차 ${L.leave}일)${L.leave < 0.5 ? " — 연차가 없으면 점심시간에 뛰어가 스트레스 +8" : ""}`) : "평일이면 반차";
  const amt = K.sealed.amt;
  return `<div class="il-proxy" data-ilproxy-box>
    <b>🤝 입찰 참석 방식</b> <small class="note">외전 「입찰은 맡겨도, 판단은 내가」에서 알아본 방법</small>
    <div class="il-proxy-opts">
      <button type="button" class="btn${mode === "direct" ? " pri" : ""}" data-ilattend="direct" aria-pressed="${mode === "direct"}">🏛️ 직접 참석<small>${esc(leaveTxt)} · 이용료 없음</small></button>
      <button type="button" class="btn${mode === "proxy" ? " pri" : ""}" data-ilattend="proxy" aria-pressed="${mode === "proxy"}" ${ok ? "" : "disabled"}>🤝 대리입찰<small>이용료 ${kMan(IL_PROXY_FEE)} · 반차 안 씀</small></button>
    </div>
    ${ok ? "" : `<p class="ke-warn">통장 ${kMan(ilProxyCash())}에서 입찰보증금 ${kMan(ilProxyDep())}을 빼면 대리입찰 이용료 ${kMan(IL_PROXY_FEE)}이 모자라요 — 직접 참석하거나, 다시 쓰기로 돌아가 보류할 수 있어요. 추가 대출로 끌어 쓰지 않아요.</p>`}
    ${mode === "proxy" ? `<table class="il-proxy-sum"><tr><th>사건</th><td>${esc(KP.title)}</td></tr><tr><th>입찰금액</th><td>${kMan(amt)} <small>(내가 정한 금액 그대로 전달)</small></td></tr>
      <tr><th>입찰보증금</th><td>${kMan(ilProxyDep())} — 지금처럼 보증금으로 따로 묶이고, 패찰이면 돌려받는다</td></tr>
      <tr><th>대리입찰 이용료</th><td><b>${kMan(IL_PROXY_FEE)}</b> — 밸런스용 가상 이용료·실제 서비스 요금 아님 · 보증금처럼 돌려받지 않음</td></tr>
      <tr><th>맡기는 범위</th><td>법원 출석과 입찰표 제출만. 조사·금액 결정·대출·명도·수리는 그대로 도현 몫</td></tr>
      <tr><th>게임상 취소 규칙</th><td>📮 제출 전(다시 쓰기·입찰 포기)은 0원. 제출하면 낙찰·패찰과 상관없이 한 번 청구</td></tr>
      <tr><th>결과에 주는 영향</th><td>없음 — 경쟁자 금액과 낙찰 여부는 직접 참석과 같다</td></tr></table>` : ""}
  </div>`;
}
if(typeof keSealedHTML === "function"){
  const _ilp_sealed = keSealedHTML;
  keSealedHTML = function(){
    const h = _ilp_sealed(), p = ilProxyPanel(); if(!p) return h;
    return h.replace('<p class="note">제출 후에는 변경할 수 없습니다.</p>', p + '<p class="note">제출 후에는 변경할 수 없습니다.</p>');
  };
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-ilattend]"); if(!b || !K || !K.sealed) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const m = b.dataset.ilattend;
  if(m === "proxy" && !ilProxyAfford()) return;
  K.ilAttend = m;
  if(typeof renderArena === "function") renderArena();
}, true);
// 다시 쓰기로 돌아가면 선택도 초기화(확정 전 이탈 = 0원)
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-kcunseal]") && K) K.ilAttend = null; }, true);

// 입찰일 반차는 직접 참석일 때만
if(typeof lfBidDayWork === "function"){
  const _ilp_day = lfBidDayWork;
  lfBidDayWork = function(){
    if(K && K.ilProxy && K.ilProxy.mode === "proxy" && typeof lfRec === "function" && lfRec() && lfRec().char === "dohyun"){ kLog("🤝 대리인이 법원에 출석해 입찰표를 냈다 — 도현은 회의를 그대로 들어갔다(반차 안 씀)."); return; }
    return _ilp_day();
  };
}
// 제출 = 확정. 원래 kBid(경쟁자·결과·반차 처리)를 그대로 돌리고, 그 뒤 이용료를 한 번만 청구한다.
if(typeof kBid === "function"){
  const _ilp_kBid = kBid;
  kBid = function(amt){
    const on = ilProxyOn() && K && K.step !== "won" && K.step !== "lost";
    let tx = null;
    if(on){ tx = ilProxyTx(); const mode = ilProxyMode(); if(!K.ilProxy || K.ilProxy.tx !== tx) K.ilProxy = {tx, mode, fee:mode === "proxy" ? IL_PROXY_FEE : 0, charged:false}; }
    _ilp_kBid(amt);
    if(!on || !K || !K.result || !K.ilProxy) return;
    const P = K.ilProxy, book = ilProxyRec(), prev = book[tx];
    if(P.mode === "proxy" && !P.charged && !(prev && prev.charged)){
      if(K.result.win){ K.cost.legal = (K.cost.legal || 0) + P.fee; kLog(`🤝 대리입찰 이용료 ${kMan(P.fee)} — 사건 비용(법무·수수료)에 기록(가상 이용료).`); }
      else { const c = kcRec(); c.cash = (+c.cash || 0) - P.fee; kLog(`🤝 대리입찰 이용료 ${kMan(P.fee)} — 패찰이어도 이용료는 남는다. 보증금 ${kMan(ilProxyDep())}은 반환.`); }
      P.charged = true;
    }
    book[tx] = {mode:P.mode, fee:P.mode === "proxy" ? P.fee : 0, charged:P.mode === "proxy", won:!!K.result.win, bid:K.bid, top:K.result.bids[0].amt, title:KP.title, i:K.epStory.i, at:Date.now()};
    if(typeof save === "function") save();
  };
}
// 도현 스토리에서 '입찰 안 하고 넘기기' → 후일담 D 갈래
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-frskip]"); if(!b || !b.classList.contains("armed")) return;
  try{ if(ilProxyOn()){ const tx = ilProxyTx(), book = ilProxyRec(); if(!book[tx]) book[tx] = {mode:"none", fee:0, charged:false, i:K.epStory.i, title:KP.title, at:Date.now()}; } }catch(err){}
}, true);

/* ---------- C01 후일담 — 도현 2번째 사건의 실제 기록이 있을 때만 ---------- */
function ilProxyCase(){ const book = ilProxyRec(); return Object.values(book).filter(r => r.i === 1).sort((a, b) => b.at - a.at)[0] || null; }
Object.assign(ilCond, {
  proxyWin:() => { const r = ilProxyCase(); return !!(r && r.mode === "proxy" && r.won); },
  proxyLost:() => { const r = ilProxyCase(); return !!(r && r.mode === "proxy" && !r.won); },
  direct:() => { const r = ilProxyCase(); return !!(r && r.mode === "direct"); }});
Object.assign(ilVars, {
  caseTitle:() => { const r = ilProxyCase(); return r ? `「${r.title}」` : ""; },
  winBid:() => { const r = ilProxyCase(); return r && r.bid ? ilWon(r.bid) : ""; },
  topBid:() => { const r = ilProxyCase(); return r && r.top ? ilWon(r.top) : ""; }});
if(IL.D01C){
  IL.D01C.open = () => {
    const r = ilProxyCase(); if(!r) return false;                         // 기록 없는 예전 세이브는 열지 않는다
    if(r.mode === "none") return true;                                    // 넘긴 건 바로 D 갈래
    try{ return !!epOf("dohyun").res[1]; }catch(e){ return false; }      // 입찰했으면 에피소드 정리까지 끝난 뒤
  };
}
