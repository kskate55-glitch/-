/* ============================== 💼 매도 제안 = 가격 + 잔금일 + 조건 한 묶음 ==============================
   "최고 가격"이 아니라 "최선의 거래 조건"을 고르게 한다. 같은 가격이라도 잔금이 늦으면 그만큼 이자·관리비가
   더 나가고, 수리 요구가 붙으면 그 돈이 빠지고, 대출 조건이 남아 있으면 깨질 수 있다.
   역제안도 "200만원 더"만이 아니라 "잔금일 앞당기기", "수리 대신 가격 조정"을 할 수 있다.
   사정을 들으면 그 매수자가 '무엇을 양보할 수 있는지'를 알게 된다(그 역제안이 잘 통한다). */
const ST_TYPES = {
  "급하게 이사해야 하는 사람":{w:2, give:"price", hint:"이사 날짜가 급해서 가격을 조금 더 맞춰 줄 수 있대요"},
  "야간 근무 마친 간호사":{w:2, give:"price", hint:"병원과 가까운 집이 급해 가격은 조금 더 낼 수 있대요"},
  "신혼부부":{w:4, give:"speed", hint:"전셋집 만기를 앞당길 수 있어서 잔금일은 당길 수 있대요"},
  "대출 최대한도형":{w:5, cond:{kind:"loan", t:"대출 승인 조건부 — 한도가 덜 나오면 깨질 수 있어요"}, hint:"대출 심사가 끝나야 해서 날짜는 못 당긴대요"},
  "가격 깎기형":{w:3, cond:{kind:"repair", t:"욕실 실리콘·문짝 수리 요구", cost:[120, 200]}, give:"repair", hint:"수리 요구는 가격으로 대신 정리해도 된대요"},
  "부모 지원형":{w:4, cond:{kind:"parent", t:"부모님이 집을 보고 나서 확정"}, give:"speed", hint:"부모님이 이번 주말에 오실 수 있어 잔금은 당길 수 있대요"},
  "은퇴한 선생님":{w:6, give:"speed", hint:"지금 집이 이미 팔려서 잔금은 당겨도 된대요"},
  "꼼꼼한 외국인 연구원":{w:3, cond:{kind:"docs", t:"등기부·건축물대장 확인 후 확정"}, give:"speed", hint:"서류만 확인되면 날짜는 맞출 수 있대요"},
  "휠체어를 쓰는 실수요자":{w:3, cond:{kind:"repair", t:"현관 턱 낮추기 공사 요구", cost:[70, 110]}, give:"repair", hint:"턱 공사 대신 그만큼 가격을 빼 줘도 괜찮대요"},
  "아이 학교 가까운 집 찾는 식당 사장님":{w:3, give:"speed", hint:"개학 전에 들어오고 싶어서 잔금은 당길 수 있대요"}};
function stTerms(of){
  if(!of || !of.buyer) return null;
  if(of.terms) return of.terms;
  const T = ST_TYPES[of.buyer.t] || {w:3}, r = kRng(((K.seed || 1) * 31 + (K.sale ? K.sale.weeks : 0) * 7 + of.amt) >>> 0);
  const w = Math.max(2, T.w + (r() < 0.3 ? 1 : 0)), c = T.cond ? Object.assign({}, T.cond) : null;
  if(c && c.cost){ const [lo, hi] = c.cost, scale = Math.max(1, (KP.trueMid || 15000) / 15000); c.cost = Math.round((lo + r() * (hi - lo)) * Math.min(3, scale) / 10) * 10; }
  of.terms = {w, cond:c, give:T.give || null, hint:T.hint || ""};
  return of.terms;
}
function stHoldPerWeek(){ return (+KP.dailyHold || 1.7) * 7; }
function stNet(of){ const t = stTerms(of); return of.amt - Math.round(stHoldPerWeek() * t.w) - (t.cond && t.cond.cost ? t.cond.cost : 0); }
function stCardHTML(of){
  const t = stTerms(of); if(!t) return "";
  const hold = Math.round(stHoldPerWeek() * t.w), rc = t.cond && t.cond.cost ? t.cond.cost : 0;
  const warn = t.cond && t.cond.kind === "loan" ? " st-warn" : "";
  const hint = of.heard && t.hint ? `<div class="st-hint">💡 사정을 들어 보니 — ${esc(t.hint)}</div>` : "";
  const btn = [];
  if(t.w > 2 && !of.triedSpeed) btn.push(`<button type="button" class="ag-act" data-kterm="speed"><span><b>📅 가격은 그대로, 잔금일을 2주 뒤로 당기자</b><span class="note" style="display:block">보유비 약 ${kMan(Math.round(stHoldPerWeek() * (t.w - 2)))} 절약</span></span></button>`);
  if(rc && !of.triedRepair) btn.push(`<button type="button" class="ag-act" data-kterm="repair"><span><b>🔧 수리는 안 하고 가격에서 빼 주자</b><span class="note" style="display:block">내 손으로 공사할 일정·하자 시비가 사라짐</span></span></button>`);
  return `<div class="panel k-card st-card${warn}"><div class="st-h">💼 이 제안의 조건</div>
    <div class="st-grid"><span>제안 가격</span><b>${kMan(of.amt)}</b><span>예상 잔금일</span><b>${t.w}주 뒤 <small>(그때까지 보유비 약 ${kMan(hold)})</small></b>
    <span>확인할 조건</span><b>${t.cond ? esc(t.cond.t) + (rc ? ` <small>(약 ${kMan(rc)})</small>` : "") : "특별한 조건 없음"}</b>
    <span>실제로 남는 쪽으로 보면</span><b class="st-net">${kMan(stNet(of))} <small>= 가격 − 잔금까지 보유비${rc ? " − 수리 요구" : ""}</small></b></div>
    ${hint}${btn.length ? `<div class="ag-acts vn-acts st-acts">${btn.join("")}</div>` : ""}</div>`;
}
const _st_kingHTML = kingHTML;
kingHTML = function(){
  let h = _st_kingHTML();
  if(!K || K.step !== "sell" || !K.sale || !K.sale.offer || K.k2) return h;
  const of = K.sale.offer, key = '<div class="ag-acts vn-acts"><button type="button" class="ag-act" data-ksale="accept">';
  const i = h.indexOf(key); if(i < 0) return h;
  return h.slice(0, i) + stCardHTML(of) + h.slice(i);
};
function stAnswer(kind){
  const S = K.sale, of = S && S.offer; if(!of) return;
  const t = stTerms(of), good = of.heard && t.give === kind, r = K.r();
  if(kind === "speed"){
    of.triedSpeed = true;
    const p = t.cond && t.cond.kind === "loan" ? 0.1 : good ? 0.9 : 0.45;
    if(r < p){ const save = Math.round(stHoldPerWeek() * (t.w - 2)); t.w = 2; S.note = `📅 "그럼 2주 뒤로 할게요." 잔금일을 당겼다 — 보유비 약 ${kMan(save)}가 줄었다.`; kLog("📅 잔금일 앞당기기 성공"); }
    else S.note = t.cond && t.cond.kind === "loan" ? "📅 \"대출 심사가 끝나야 해서요…\" 날짜는 못 당긴대요. 제안은 그대로 살아 있어요." : "📅 \"그 날짜는 어려워요.\" 잔금일은 그대로. 제안은 살아 있어요.";
  }
  if(kind === "repair" && t.cond && t.cond.cost){
    of.triedRepair = true;
    const p = good ? 0.95 : 0.7;
    if(r < p){ const cut = Math.round(t.cond.cost * 0.8 / 10) * 10; of.amt -= cut; S.note = `🔧 수리 요구 대신 ${kMan(cut)}을 빼기로 했다. 공사 일정도, 나중에 하자 시비도 없다.`; t.cond = null; kLog("🔧 수리 요구 → 가격 조정"); }
    else S.note = "🔧 \"그래도 고쳐 주셨으면 해요.\" 수리 조건은 그대로예요.";
  }
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-kterm]"); if(!b || !K) return;
  e.preventDefault(); e.stopPropagation(); stAnswer(b.dataset.kterm); if(typeof save === "function") save(); renderArena();
}, true);
// 수락하면: 잔금일까지 보유비가 붙고, 수리 요구는 내 돈으로, 대출·부모님 조건은 깨질 수 있다
const _st_kClose = kClose;
kClose = function(amt, buyer){
  const S = K && K.sale, of = S && S.offer, t = of && of.terms;
  if(!t || K.k2) return _st_kClose(amt, buyer);
  const add = t.cond && t.cond.kind === "loan" ? 0.05 : t.cond && t.cond.kind === "parent" ? 0.04 : 0;
  const hold0 = K.cost.hold, day0 = K.day, rc = t.cond && t.cond.cost ? t.cond.cost : 0;
  kDay(t.w * 7); if(rc) K.cost.repair += rc;
  const b2 = add ? Object.assign({}, buyer, {cancel:Math.min(0.7, (buyer.cancel || 0) + add)}) : buyer;
  const r = _st_kClose(amt, b2);
  if(!S.done){   // 계약이 깨졌다 — 수리비는 안 썼고, 기다린 시간은 절반쯤 흘렀다
    if(rc) K.cost.repair -= rc; const half = Math.round(t.w * 7 / 2); K.day = day0 + half; K.cost.hold = hold0 + Math.round(KP.dailyHold * half * 10) / 10;
  } else { S.terms = t; }
  return r;
};
