/* ============================== 🏦 보증금이 모자라면 — 신용대출로 마련 ==============================
   실제 경매는 입찰할 때 입찰보증금(보통 최저가의 10%)을 현금·수표로 낸다 — 없으면 입찰 자체를 못 한다.
   예전엔 커리어 모드가 이걸 빚으로 조용히 처리해 줘서, 무리한 플레이가 현금이 바닥나도 계속 입찰할 수 있었다(t_leverage.js).
   이제 커리어 모드에선 보증금이 모자라면 봉투에 못 넣고, 대신 신용대출로 마련하는 길을 연다.
   ⚠️ 아래 셋은 실제 상품이 아니라 게임용 표본 — 금리는 2026년 공개 자료에서 보이는 범위(은행 신용대출 5~7%대,
      저축은행 10%대, 카드론 14~16%대, 법정 최고금리 20%)를 참고해 다듬었다. */
const CR_OFFERS = [
  {id:"bank", ic:"🏛️", t:"주거래은행 신용대출", rate:6.5, limit:1500, wait:60,  note:"소득·재직 확인 — 심사에 한 시간"},
  {id:"sav",  ic:"🏦", t:"저축은행 신용대출",   rate:13.9, limit:2500, wait:20, note:"심사 빠름 — 대신 금리가 두 배"},
  {id:"card", ic:"💳", t:"카드론",             rate:15.5, limit:1000, wait:0,  note:"바로 나옴 — 금리가 가장 높고 신용점수에 흔적이 남아요"}];
const CR_TOTAL_CAP = 4000;   // 신용대출은 합쳐서 이만큼까지(게임용 단순화 — 실제 한도는 소득·기존 빚에 따라 다르다)
function crRec(){ const c = kcRec(); if(!Array.isArray(c.credit)) c.credit = []; return c.credit; }
function crOwed(){ return crRec().reduce((s, x) => s + x.amt, 0); }
function crOn(){ return K && KP && (K.mode || KC_MODE) === "career" && K.step === "brief"; }
function crDep(){ return Math.round(KP.minBid * 0.1 / 10) * 10; }
function crGap(){ const cash = +kcRec().cash || 0, d = crDep() - cash; return d > 0 ? Math.ceil(d / 100) * 100 : 0; }
function crLeft(o){ const used = crRec().filter(x => x.id === o.id).reduce((s, x) => s + x.amt, 0); return Math.max(0, Math.min(o.limit - used, CR_TOTAL_CAP - crOwed())); }
function crTake(id){
  const o = CR_OFFERS.find(x => x.id === id), gap = crGap(); if(!o || !gap || !crOn()) return false;
  const amt = Math.min(crLeft(o), gap); if(amt < gap) return false;   // 모자란 만큼 다 안 나오면 못 빌린다(보증금은 한 번에 내야 한다)
  const c = kcRec(); c.cash = (+c.cash || 0) + amt;
  crRec().push({id:o.id, t:o.t, rate:o.rate, amt, at:K.caseNo || 0});
  if(o.wait && K.timeLeft != null) K.timeLeft = Math.max(0, K.timeLeft - o.wait);
  kLog(`🏦 ${o.t} ${kMan(amt)} · 연 ${o.rate}% — 입찰보증금을 마련했다. (한 달 이자 약 ${kMan(Math.round(amt * o.rate / 100 / 12))})`);
  if(typeof save === "function") save(); return true;
}
function crRepay(days){
  const c = kcRec(), L = crRec(); if(!L.length) return 0;
  const owed = crOwed(), intr = Math.max(1, Math.round(L.reduce((s, x) => s + x.amt * x.rate / 100 * (days || 7) / 365, 0)));
  if((+c.cash || 0) < owed + intr) return 0;
  c.cash -= owed + intr; c.credit = [];
  if(K) kLog(`🏦 신용대출 ${kMan(owed)} 상환 — 이자 ${kMan(intr)}`);
  if(typeof save === "function") save(); return owed + intr;
}
function crHTML(){
  if(!crOn()) return "";
  const gap = crGap(), L = crRec(), owed = crOwed(), cash = +kcRec().cash || 0;
  if(!gap && !owed) return "";
  if(!gap) return `<div class="cr cr-have"><b>🏦 갚지 않은 신용대출 ${kMan(owed)}</b> <small class="note">${L.map(x => `${esc(x.t)} 연 ${x.rate}%`).join(" · ")} — 매도로 현금이 생기면 갚을 수 있어요. 잔금 대출 심사 때 기존 빚으로 잡혀요.</small>${cash >= owed + 50 ? ` <button type="button" class="btn" data-crpay>지금 갚기</button>` : ""}</div>`;
  const rows = CR_OFFERS.map(o => { const left = crLeft(o), can = left >= gap, m = Math.round(gap * o.rate / 100 / 12);
    return `<button type="button" class="cr-opt" data-crtake="${o.id}" ${can ? "" : "disabled"}><span class="cr-ic">${o.ic}</span><span><b>${o.t} · 연 ${o.rate}%</b><small>${can ? `${kMan(gap)} 빌리면 한 달 이자 약 ${kMan(m)}` : `한도가 모자라요(남은 한도 ${kMan(left)})`} · ${o.note}</small></span></button>`; }).join("");
  const none = CR_OFFERS.every(o => crLeft(o) < gap);
  return `<div class="cr cr-need" id="crBox"><b class="cr-h">💼 입찰보증금 ${kMan(crDep())}이 현금(${cash < 0 ? "빚 " + kMan(-cash) : kMan(cash)})보다 많아요</b>
    <p>실제 경매에선 보증금이 없으면 입찰 자체를 못 해요. <b>${kMan(gap)}</b>을 빌리면 쓸 수 있어요.</p>
    <div class="cr-opts">${rows}</div>
    <p class="note">패찰하면 보증금은 그날 돌려받으니 바로 갚으면 이자가 거의 없어요. 낙찰되면 이 빚을 안고 잔금 대출까지 받게 돼요 — 신용대출이 많을수록 잔금 대출 심사에 불리해요.</p>
    ${none ? `<p class="down">빌릴 수 있는 곳이 없어요 (신용대출은 합쳐서 ${kMan(CR_TOTAL_CAP)}까지) — 이 물건은 넘기고 보증금이 작은 물건을 고르세요.</p>` : ""}</div>`;
}
if(typeof keBidSheet === "function"){
  const _cr_sheet = keBidSheet;
  keBidSheet = function(){ const h = _cr_sheet(), c = crHTML(); return c ? h.replace('<div class="ke-err" id="kBidErr"', c + '<div class="ke-err" id="kBidErr"') : h; };
}
// 보증금이 없으면 봉투에 못 넣는다 — feel.js 봉투 처리보다 먼저(캡처)
document.addEventListener("click", e => {
  if(!e.target.closest) return;
  const t = e.target.closest("[data-crtake]");
  if(t){ e.stopImmediatePropagation(); if(crTake(t.dataset.crtake)){ const el = document.getElementById("kBid"), v = el && el.value; renderArena(); const n = document.getElementById("kBid"); if(n && v){ n.value = v; n.dispatchEvent(new Event("input", {bubbles:true})); } } return; }
  if(e.target.closest("[data-crpay]")){ e.stopImmediatePropagation(); crRepay(7); renderArena(); return; }
  if(e.target.closest("[data-kcseal]") && crOn() && crGap() > 0){
    e.preventDefault(); e.stopImmediatePropagation();
    const box = document.getElementById("crBox"); if(box){ box.classList.remove("bw-shake"); void box.offsetWidth; box.classList.add("bw-shake"); box.scrollIntoView({block:"center", behavior:"smooth"}); }
    const err = document.getElementById("kBidErr"); if(err) err.textContent = "입찰보증금이 모자라요 — 위에서 마련하거나 이 물건은 넘기세요.";
  }
}, true);
// 낙찰 → 매도까지 걸린 날만큼 이자를 보유비에 넣는다
if(typeof kFinish === "function"){
  const _cr_kFinish = kFinish;
  kFinish = function(){
    if(K && K.cost && !K.crCharged && (K.mode || "career") === "career"){ const L = crRec(); if(L.length){ K.crCharged = true; const i = Math.round(L.reduce((s, x) => s + x.amt * x.rate / 100 * (K.day || 0) / 365, 0)); if(i > 0){ K.cost.hold += i; kLog(`🏦 신용대출 이자 ${kMan(i)}(${K.day}일)`); } } }
    return _cr_kFinish.apply(this, arguments);
  };
}
// 패찰하면 보증금이 돌아온다 — 바로 갚는 버튼
if(typeof kingHTML === "function"){
  const _cr_king = kingHTML;
  kingHTML = function(){
    const h = _cr_king(); if(!K || K.step !== "lost" || (K.mode || "career") !== "career" || !crOwed()) return h;
    const owed = crOwed(), intr = Math.max(1, Math.round(crRec().reduce((s, x) => s + x.amt * x.rate / 100 * 7 / 365, 0))), can = (+kcRec().cash || 0) >= owed + intr;
    const box = `<div class="cr cr-have"><b>🏦 보증금을 돌려받았어요 — 신용대출 ${kMan(owed)}</b> <small class="note">${can ? `지금 갚으면 이자는 한 주치 약 ${kMan(intr)}뿐이에요.` : "현금이 모자라 아직 못 갚아요."}</small>${can ? ` <button type="button" class="btn pri" data-crpay>바로 갚기</button>` : ""}</div>`;
    return h.replace(/(<div class="lw-cta">)/, box + "$1");
  };
}
