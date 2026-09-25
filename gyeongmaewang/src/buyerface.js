/* ================= 🧑‍🤝‍🧑 매수자·법원 직원 얼굴 (N 발주) =================
   매도 단계 "○○ 손님이요, ○○만원이면 계약한대요" — 글로만 오던 매수자가 무대에 선다(유형마다 표정 하나).
   입찰표 제출 뒤 '개찰 중' 화면에는 법원 경매계 직원이 서류판을 들고 선다. 그림 없는 유형은 예전처럼 글만. */
const BY_ART = {
  "신혼부부":{art:{normal:"e4a8946e4957bcb20dad860f8d60ca52", angry:"217a51ac1a722f8fbe5a6faf9154e9b1", worried:"2efa2b1fcb2a84248589c3acbfa64126"}, ex:"normal"},
  "대출 최대한도형":{art:{normal:"93e7017c81a2397cf745230bc2982135", angry:"69f4bc2bf604303ec5d4646a0b3c3833", worried:"dada1e64977b64d0083595612b42fca8"}, ex:"worried"},
  "가격 깎기형":{art:{normal:"9b7bf3f830ca53a1ca25f1f2f161cd41", angry:"b782f1d94910eeff54407a461ab688ca", worried:"9f3b984dfecd79b2948999dfe1075f67"}, ex:"angry"},
  "부모 지원형":{art:{normal:"9b16a6329341cb77d525c96dbeaaa6a7", angry:"1d852e168af9aa99f2daf357cd7b7b91", worried:"15b31970bb75d823e750a55164242026"}, ex:"normal"},
  "급하게 이사해야 하는 사람":{art:{normal:"887ffd7fa5a4257a3484dc54c2f1da20", angry:"36a8cb065e6fa65f16348c1f1abf1937", worried:"c0fac525d097068808cd46169838d481"}, ex:"angry"}};
const BY_CLERK = {normal:"e6795efccc22c19f86aa2aadcf8df4e9", angry:"ac13568abaff106913b04260642111bb", worried:"de875545fddd60d45996a6188e8cd81f"};
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
