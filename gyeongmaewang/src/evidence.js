/* ============================== 🗂️ 증거 카드에 '성격'을 붙인다 ==============================
   같은 한 줄이라도 무게가 다르다 — 서류에 적힌 것 / 근거는 있지만 금액·시점이 불확실한 것 / 누군가 그렇게 말한 것.
   카드마다 📄 자료상 확인 · 🔍 추정 · 🗣️ 당사자 주장 중 하나와, 출처 · 아직 모르는 점을 단다.
   당사자 주장은 '확인'이 아니다 — 같은 광고를 보고 한 말 두 개는 독립된 확인 두 번이 아니다. */
const EV_KIND = {doc:["📄","자료상 확인","ev-doc"], est:["🔍","추정","ev-est"], claim:["🗣️","당사자 주장","ev-claim"]};
const EV_K1 = {docs:["doc","매각물건명세서·등기부","점유자의 실제 사정(서류엔 안 나온다)"],
  elec:["est","현장 계량기함 — 내 눈으로 본 흔적","누전인지, 고치는 데 얼마인지(80~180만원 예상 — 뜯어 봐야 확정)"],
  flip:["claim","옆집 할머니","본인 말이 아니다 — 실제로 약속을 바꾸는지는 겪어 봐야 안다"],
  price:["claim","동네 중개사 3곳","중개사끼리 같은 매물 광고를 보고 한 말일 수 있다 — 실거래와 대조"],
  fee:["claim","관리사무소 청구","공용·전유 구분과 낙찰자가 넘겨받는 범위(공용부분만인지)는 따로 확인"],
  rivals:["doc","법원 사건 조회수","조회수가 곧 입찰자 수는 아니다"],
  kim:["claim","김사장(전화)","매수를 권하는 쪽의 말이다 — 이해관계를 감안"], leak:["claim","아래층 주민","원인이 이 집 배관인지 공용 배관인지"],
  dump:["doc","매물 사이트 — 같은 건물 급매 광고","광고가 실제 거래로 이어졌는지"], loan:["claim","은행 대출 상담","심사 뒤 실제 한도는 달라질 수 있다"]};
function evInfo(c){
  if(!c) return null;
  if(!KP || !KP.gen){ const e = EV_K1[c.id]; return e ? {kind:e[0], src:e[1], unk:e[2]} : null; }
  if(c.id === "docs") return {kind:"doc", src:"매각물건명세서·등기부·현황조사서", unk:"점유자의 실제 사정·집 안 상태"};
  if(c.id === "rivals") return {kind:"doc", src:"법원 사건 조회수", unk:"조회수가 곧 입찰자 수는 아니다"};
  const h = (KP.hidden || []).find(x => x.id === c.id), a = (KP.actions || []).find(x => x.id === c.src);
  if(!h) return null;
  const o = a && a.out && a.out[0], say = o && o.say && o.say.length ? o.say : null, who = say ? [...new Set(say.map(s => s[0]))].join(" · ") : null;
  const cost = +h.cost || 0, rng = cost ? `${kMan(Math.round(cost * 0.7 / 10) * 10)}~${kMan(Math.round(cost * 1.5 / 10) * 10)}` : "";
  if(h.k === "defect") return {kind:"est", src:who || (a ? a.t : "현장"), unk:cost ? `정확한 원인과 수리비(${rng} 예상 — 뜯어 봐야 확정)` : "원인·범위"};
  if(h.k === "fee") return {kind:"claim", src:who || "관리사무소", unk:"공용·전유 구분과 낙찰자가 넘겨받는 범위는 따로 확인"};
  if(h.k === "price") return {kind:"claim", src:who || "동네 중개사", unk:"같은 광고를 보고 한 말일 수 있다 — 실거래와 대조"};
  if(h.k === "assume" || h.k === "dispute" || h.k === "loan" || h.k === "dump") return say ? {kind:"claim", src:who, unk:"서류(현황조사서·등기부·배당표)로 다시 확인"} : {kind:"doc", src:a ? a.t : "서류", unk:h.k === "assume" ? "실제 인수 금액은 배당 결과에 따라 달라질 수 있다" : "상대의 반박 자료"};
  if(say) return {kind:"claim", src:who, unk:"말한 사람의 이해관계 — 다른 자료로 교차 확인"};
  if(a && a.loc === "home") return {kind:"doc", src:a.t, unk:h.k === "helper" ? "상대가 이 절차를 알고 있는지 — 직접 설명해야 한다" : "서류 밖의 실제 사정"};
  return {kind:"est", src:a ? a.t : "조사", unk:"확정은 아님 — 한 번 더 확인"};
}
function evTagHTML(c){
  const e = evInfo(c); if(!e) return "";
  const [ic, t, cls] = EV_KIND[e.kind];
  return `<em class="ev ${cls}">${ic} ${t}</em><small class="ev-meta">출처 · ${esc(e.src)}<br>아직 모름 · ${esc(e.unk)}</small>`;
}
const _ev_case = keCaseHTML;
keCaseHTML = function(){
  let h = _ev_case();
  if(!K || !KP) return h;
  keCards().forEach(c => {
    if(!keHas(c)) return;
    const key = `<b>${esc(c.t)}</b><small>${esc(c.d)}</small>`, i = h.indexOf(key); if(i < 0) return;
    h = h.slice(0, i + key.length) + evTagHTML(c) + h.slice(i + key.length);
  });
  const legend = `<div class="ev-legend"><em class="ev ev-doc">📄 자료상 확인</em> 서류에 적혀 있음 · <em class="ev ev-est">🔍 추정</em> 근거는 있지만 금액·시점이 불확실 · <em class="ev ev-claim">🗣️ 당사자 주장</em> 누가 그렇게 말함</div>`;
  return h.replace(/(<div class="ke-cards-head">[\s\S]*?<\/div>)/, `$1${legend}`);
};

// 예전 [확정]/[추정] 표시(qa1.js)는 이 세 갈래로 대체한다 — 조사 안 한 칸의 '❔ 미확인'만 남긴다
if(typeof qaTagCards === "function"){
  qaTagCards = function(){ document.querySelectorAll(".ke-cards .ke-card").forEach(el => { if(el.classList.contains("on") || el.querySelector(".qa-tier")) return; el.insertAdjacentHTML("afterbegin", `<span class="qa-tier t-미확인">❔ 미확인</span>`); }); };
}
