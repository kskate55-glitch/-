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
