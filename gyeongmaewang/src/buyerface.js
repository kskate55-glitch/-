/* ================= 🧑‍🤝‍🧑 매수자·법원 직원 얼굴 (N 발주) =================
   매도 단계 "○○ 손님이요, ○○만원이면 계약한대요" — 글로만 오던 매수자가 무대에 선다(유형마다 표정 하나).
   입찰표 제출 뒤 '개찰 중' 화면에는 법원 경매계 직원이 서류판을 들고 선다. 그림 없는 유형은 예전처럼 글만. */
const BY_ART = {
  "신혼부부":{art:{normal:"42ba34ca9096587590a17c50d97ee66e", angry:"f9b432598dcce3ba5c51121bd89bf265", worried:"7bdbbfb80b88c53520125aa54a655954"}, ex:"normal"},
  "대출 최대한도형":{art:{normal:"afe41bc6b965e7c08d28f4a45fb8dc6d", angry:"d60ff4027a09cd1792564d7f5ae1b36e", worried:"1d931496364e3680bcd1f3be013f91c7"}, ex:"worried"},
  "가격 깎기형":{art:{normal:"f45c055e05ec53a8dea385f8724158b0", angry:"435b42a4c01e296722ba06fd89dba26b", worried:"16fa7e5d65b3b0de3e4ec6a4730bfbeb"}, ex:"angry"},
  "부모 지원형":{art:{normal:"5a4c5f646deaacaf7f94b9bb026ecd3f", angry:"f2ad200297a815956d6dd23fca6f678d", worried:"03aef00ef60234a4721a3fe1198aa8ec"}, ex:"normal"},
  "급하게 이사해야 하는 사람":{art:{normal:"c0c33a76490bcc192af94fa1751e9f1d", angry:"ae90a4254520fb80edc2cce8e774fa16", worried:"9886834a9f0cdf3227de37ba3b5ae5ea"}, ex:"angry"}};
const BY_CLERK = {normal:"a5afb83a672e21ca2d83efae9e6abd06", angry:"cd585d3ffc6940277fcf41838c8e7328", worried:"5e338651ac3cd8f66b50192d29159bf0"};
function byUrl(id){ return window.GMW_STANDALONE ? "assets/" + id + ".webp" : "/_blob/" + id; }
const _by_kStage = kStage; kStage = function(bg, who, ex, text, name){
  const h = _by_kStage(bg, who, ex, text, name);
  const of = K && K.step === "sell" && K.sale && K.sale.offer; if(!of || !of.buyer || who !== "narr") return h;
  const B = BY_ART[of.buyer.t]; if(!B) return h;
  return h.replace('<div class="vn-box narr">', `<img class="vn-sprite nf-sprite by-sprite${B.seated?" by-seated":""}" src="${byUrl(B.art[B.ex])}" alt="${esc(of.buyer.t)}"><div class="vn-box nf-box"><div class="vn-name">매수자 · ${esc(of.buyer.t)}</div>`);
};
// 개찰 화면(순위가 한 줄씩 올라오는 그 화면) — 오른쪽에 경매계 직원이 서류판을 들고 서 있다
const _by_reveal = keRevealHTML; keRevealHTML = function(){
  return _by_reveal().replace('<div class="ke-open-in">', `<img class="ke-clerk" src="${byUrl(BY_CLERK.normal)}" alt="법원 경매계 직원"><div class="ke-open-in">`);
};
