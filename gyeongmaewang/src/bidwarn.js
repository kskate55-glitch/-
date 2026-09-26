/* ============================== 🚨 입찰 직전 '모르는 비용' 경고 ==============================
   밸런스 봇(t_balance.js)에서 입문자 손실이 몰린 곳은 인수·유치권·통건물·큰 물건이었다(f53·f61·f62·f64).
   공통점: 사건 제목에 이미 위험이 적혀 있는데 그걸 확인하는 조사를 안 하고 썼다.
   ⚠️ 숨은 위험이 '몇 개 남았는지'는 절대 쓰지 않는다 — 그러면 이 칸이 만능 탐지기가 된다.
      플레이어가 볼 수 있는 것(사건 제목·안 해 본 조사 목록·물건 크기)만으로 판단한다. */
const BW_TITLE = [[/선순위|대항력/, "선순위 임차인(떠안을 보증금)"], [/당해세/, "당해세·배당 순서"], [/유치권/, "유치권 신고"], [/법정지상권/, "법정지상권"],
  [/통건물|다가구|\d세대/, "여러 세대 — 한 집씩 따로 확인"], [/기계|리스/, "남의 기계·리스"]];
const BW_LEGAL = /명세서|현황조사|전입|확정일자|배당|교부|계약서|세금계산서|관리대장|CCTV|리스|명판|임대 현황/;
function bwInfo(){
  if(!K || !KP || !KP.actions) return null;
  const txt = [KP.short, KP.tagline, KP.title].filter(Boolean).join(" ");
  const flags = BW_TITLE.filter(([re]) => re.test(txt)).map(x => x[1]);
  const undone = KP.actions.filter(a => /^h_/.test(a.id) && !(K.done || {})[a.id]);
  const legal = undone.filter(a => BW_LEGAL.test(a.t)), other = undone.filter(a => !BW_LEGAL.test(a.t));
  const band = typeof lfBand === "function" ? lfBand() : {lo:KP.trueMid * 0.9, hi:KP.trueMid * 1.1}, mid = (band.lo + band.hi) / 2;
  const big = mid >= 50000;
  // 모르는 비용 여유 — 권리 쪽 확인 하나당 매도가의 5%, 제목에 위험이 적혔으면 +5%, 큰 물건이면 그 밖의 확인 하나당 +2% (최대 25%)
  // 권리 쪽 확인이 남았을 때만 여유를 권한다 — 외관·주변 같은 조사까지 다 여유로 치면 입문자가 모든 경매에서 밀린다(봇으로 확인)
  const pct = Math.min(0.25, legal.length * 0.05 + (flags.length && legal.length ? 0.05 : 0) + (big && legal.length ? other.length * 0.02 : 0));
  const reserve = Math.round(mid * pct / 10) * 10;
  const level = flags.length && legal.length ? "danger" : legal.length || (big && undone.length) ? "warn" : undone.length ? "info" : "ok";
  return {flags, legal, other, mid, big, pct, reserve, level, err5:Math.round(mid * 0.05 / 10) * 10};
}
function bwHTML(where){
  const W = bwInfo(); if(!W || W.level === "ok") return "";
  const li = a => `<li>🔍 ${esc(a.t)}</li>`;
  const head = W.level === "danger" ? "🚨 사건 제목에 적힌 위험을 아직 확인 안 했어요" : W.level === "warn" ? "⚠️ 모르는 비용이 남아 있어요" : "ℹ️ 안 해 본 조사가 있어요";
  return `<div class="bw bw-${W.level}" data-bw="${where}"><b class="bw-h">${head}</b>
    ${W.flags.length ? `<p>이 사건 제목에 <b>${W.flags.map(esc).join(" · ")}</b>이(가) 적혀 있어요. 이런 건 낙찰된 뒤 <b>내 돈으로 떠안게 되는</b> 경우가 있어요.</p>` : ""}
    ${W.legal.length ? `<p>권리·인수 쪽 확인이 <b>${W.legal.length}개</b> 남았어요:</p><ul>${W.legal.map(li).join("")}</ul>` : ""}
    ${W.other.length ? `<p class="note">그 밖에 안 해 본 조사 ${W.other.length}개 (${W.other.map(a => esc(a.t)).join(" · ")})</p>` : ""}
    ${W.big ? `<p>큰 물건이라 매도가 예상이 <b>5%만 빗나가도 ${kMan(W.err5)}</b>이에요.</p>` : ""}
    ${W.reserve ? `<p>확인 안 한 채로 쓴다면 — 입찰가에서 <b>모르는 비용 여유 약 ${kMan(W.reserve)}</b>(매도가의 ${Math.round(W.pct * 100)}%)를 더 빼 두는 게 안전해요.</p>` : ""}
    ${where === "seal" && W.level === "danger" ? `<label class="bw-ok"><input type="checkbox" id="bwAck"> 위 항목을 모르는 채로 쓴다는 걸 알고 있어요</label>` : ""}</div>`;
}
if(typeof keBidSheet === "function"){
  const _bw_sheet = keBidSheet;
  keBidSheet = function(){ const h = _bw_sheet(), w = bwHTML("sheet"); return w ? h.replace('<div class="ke-err" id="kBidErr"', w + '<div class="ke-err" id="kBidErr"') : h; };
}
if(typeof keSealedHTML === "function"){
  const _bw_sealed = keSealedHTML;
  keSealedHTML = function(){
    const h = _bw_sealed(), W = bwInfo(), w = bwHTML("seal"); if(!w) return h;
    let out = h.replace('<p class="note">제출 후에는 변경할 수 없습니다.</p>', w + '<p class="note">제출 후에는 변경할 수 없습니다.</p>');
    if(W.level === "danger") out = out.replace('<button type="button" class="btn" data-kcunseal>✏️ 다시 쓰기</button>', '<button type="button" class="btn" data-kcunseal>🔍 조사하러 돌아가기</button>');
    return out;
  };
}
// 'danger'면 확인 체크 전에는 제출이 안 된다 — 캡처 단계에서 막아 다른 제출 처리보다 먼저 선다
document.addEventListener("click", e => {
  const btn = e.target.closest && e.target.closest("[data-kbid]"); if(!btn || !K || !K.sealed) return;
  const W = bwInfo(); if(!W || W.level !== "danger") return;
  const ack = document.getElementById("bwAck"); if(ack && ack.checked) { K.bwAcked = true; return; }
  e.preventDefault(); e.stopImmediatePropagation();
  const box = document.querySelector('.bw[data-bw="seal"]'); if(box){ box.classList.remove("bw-shake"); void box.offsetWidth; box.classList.add("bw-shake"); box.scrollIntoView({block:"center", behavior:"smooth"}); }
}, true);

/* ---------- 💼 자금 계획 한 줄 — 입찰표 금액을 바꿀 때마다 같이 바뀐다 ----------
   자금 흐름 봇(t_leverage.js)에서 '한도 끝까지 당기는' 쪽이 13판 만에 현금이 바닥났다.
   입찰할 때 잔금·대출·이자가 한 번도 숫자로 안 보였던 게 문제 — 입찰가 옆에 바로 붙인다.
   ⚠️ 실제 경매는 입찰보증금(보통 최저가의 10%)을 입찰 때 내야 해서, 그 돈이 없으면 입찰 자체를 못 한다. */
const BW_RATE = 5.0;   // 이자 가정 — loan.js 상호금융 표본(4.7~6.2%)의 가운데쯤. 실제 금리는 낙찰 뒤 상담에서 정해진다
function bwCash(amt){
  if(!K || !KP || !(amt > 0)) return null;
  const c = typeof kcRec === "function" ? kcRec() : {}, cash = +c.cash || 0, dep = Math.round(KP.minBid * 0.1 / 10) * 10;
  const acq = Math.round(amt * (typeof kAcqRate === "function" ? kAcqRate(amt) : 0.011) / 10) * 10;
  const bal = amt + acq;                                   // 보증금 포함 총액(보증금은 잔금에서 빠진다)
  const loan = Math.max(0, bal - cash), month = Math.round(loan * BW_RATE / 100 / 12 / 10) * 10;
  return {cash, dep, acq, bal, loan, month, noDep:cash < dep, share:bal ? loan / bal : 0};
}
function bwCashHTML(amt){
  const C = bwCash(amt); if(!C) return "";
  const lv = C.noDep ? "danger" : C.share > 0.8 ? "warn" : "ok";
  return `<div class="bw-cash bw-cash-${lv}"><b>💼 자금 계획</b>
    <span>입찰보증금 <b>${kMan(C.dep)}</b></span><span>낙찰되면 필요한 돈 <b>${kMan(C.bal)}</b> <small>(입찰가+취득세 등)</small></span><span>지금 현금 <b>${C.cash < 0 ? "대출 " + kMan(-C.cash) : kMan(C.cash)}</b></span>
    ${C.loan ? `<span>→ 대출 약 <b>${kMan(C.loan)}</b> 필요 · 연 ${BW_RATE}%면 한 달 이자 약 <b>${kMan(C.month)}</b></span>` : `<span class="up">→ 대출 없이 살 수 있어요</span>`}
    ${C.noDep ? `<p class="down">⚠️ 입찰보증금(${kMan(C.dep)})도 현금에 없어요. 실제 경매에선 입찰 때 보증금을 내야 해서 <b>입찰 자체를 못 해요</b> — 게임에선 빚으로 처리해 줄 뿐이에요.</p>` : C.share > 0.8 ? `<p class="note">필요한 돈의 ${Math.round(C.share * 100)}%를 빌리게 돼요 — 매도가 늦어질수록 이자가 수익을 깎아요.</p>` : ""}</div>`;
}
if(typeof qaBidLine === "function"){
  const _bw_line = qaBidLine;
  qaBidLine = function(amt){ return _bw_line(amt) + bwCashHTML(amt); };
}
if(typeof keSealedHTML === "function"){
  const _bw_sealed2 = keSealedHTML;
  keSealedHTML = function(){ const h = _bw_sealed2(), c = bwCashHTML(K && K.sealed && K.sealed.amt); return c ? h.replace('<p class="note">제출 후에는 변경할 수 없습니다.</p>', c + '<p class="note">제출 후에는 변경할 수 없습니다.</p>') : h; };
}
