/* ================= 🧑‍🤝‍🧑 매수자·법원 직원 얼굴 (N 발주) =================
   매도 단계 "○○ 손님이요, ○○만원이면 계약한대요" — 글로만 오던 매수자가 무대에 선다(유형마다 표정 하나).
   입찰표 제출 뒤 '개찰 중' 화면에는 법원 경매계 직원이 서류판을 들고 선다. 그림 없는 유형은 예전처럼 글만. */
const BY_ART = {
  "신혼부부":{art:{normal:"d9177f3923b999d5f2ae35d5f1f68bbe", angry:"ee4227132272447d43e59871fce32bab", worried:"ac502ab43fe50d5749a7df7d9e013c76"}, ex:"normal"},
  "대출 최대한도형":{art:{normal:"4700c1d0bd1dd4ba83837e21f0d99078", angry:"ab38b0ee5d280c240cf95d69e16221f9", worried:"33d51b8cc87df77c5eabee829b46a516"}, ex:"worried"},
  "가격 깎기형":{art:{normal:"f91524a5d4035821436c77184eb174d7", angry:"3a143882ac50a16621afb475e786aa86", worried:"b6a3ba914bef3b33172227a5c21d99a2"}, ex:"angry"},
  "부모 지원형":{art:{normal:"da3ef3ec7c68fab3654590505c1e8b2c", angry:"9c773d9df8ad39d9ae5f0b07854c2940", worried:"ae1194d483c047703170831047707212"}, ex:"normal"},
  "급하게 이사해야 하는 사람":{art:{normal:"82f36da0e934d8fc223a06a99091948e", angry:"22990b894d7206d9c39c43c2a2d253f8", worried:"97c71ea71285a65debcf1e3ab568834e"}, ex:"angry"}};
const BY_CLERK = {normal:"834785dd37bfee545c3f562d7b1683a4", angry:"f7bdd800cb49a927c2de920c64688572", worried:"af6c2ef392e222839c656c179ed40566"};
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
