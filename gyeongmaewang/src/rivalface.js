/* ================= 🥊 입찰장 라이벌 얼굴 (R 발주) =================
   입찰 결과표의 "초보 과입찰러 1억 2,390만원"이 글자뿐이었다 → 이름 옆에 얼굴.
   패찰이면 나를 이긴 1등이, 낙찰이면 아깝게 진 2등이 무대 오른쪽에 선다. 그림 없는 라이벌은 예전처럼 글자만. */
const RV_ART = {
  "초보 과입찰러":{normal:"5ec5b83242e4db171a25cef0ec85b806", angry:"3fdc36647041a013b01668ce1bf77588", worried:"8e7138a43f40f31a7a960e6576476717"},
  "지역 실수요자":{normal:"102d4e6dffa46039f517293677339b63", angry:"1813f4f1421a38b897f5e3696b3ea6ac", worried:"03bcdc3e0c34c9e5a9cd3be3b82984a4"},
  "전문 투자자":{normal:"b930f11739d799119d9a1279c208f79f", angry:"973a06271dd98009620fa90220b6a96b", worried:"700cbc89d75966a3fe29b0ae4f7a3d91"},
  "무조건 저가형":{normal:"b054f1cee39de51833b36a21c7938fae", angry:"7eeee4e30d9461c9f9d563e65002e2f0", worried:"e810cf31f307913f3ccd0d5057fd8dec"},
  "인테리어 업자":{normal:"31747cccee17105bf486ca6c633fd9ff", angry:"08a033f65f484278193445efce0f5ddb", worried:"062dc7253b28cd108ca85d0c035c7a2c"},
  "겉 마진 보고 온 투자자":{normal:"2f69b88847332a3319ec58b7cd92aef5", angry:"a811267c167ca184483c6c241b653462", worried:"a0dda3318d25caf052120fc0d1bcbd8b"},
  "감정가 맹신러":{normal:"ff92d972adb5d1163b3e43cb9279cbeb", angry:"9e359773a6e9ef9589e31edc1afc0e9b", worried:"7a1ef8158bbd32c8abdc0e398e39e865"},
  "이사철 실수요자":{normal:"e1e0f328bbae23196af5ce2635a1c152", angry:"372b50d15fcd4f2700a2aecfe4cb7f6b", worried:"afe46432b92ab1ba0e476ffacd580637", pair:true}};   // pair = 두 사람 그림(얼굴 동그라미를 덜 확대)
function rvUrl(who, ex){ const A = RV_ART[who]; if(!A) return null; const id = A[ex] || A.normal; return window.GMW_STANDALONE ? "assets/" + id + ".webp" : "/_blob/" + id; }
const _rv_table = kBidTable; kBidTable = function(){
  let h = _rv_table();
  (K.result.bids || []).forEach(b => { if(b.me) return; const u = rvUrl(b.who, "normal"); if(!u) return;
    h = h.replace(`<span>${esc(b.who)}</span>`, `<span><i class="rv-face${RV_ART[b.who].pair ? " pair" : ""}"><img src="${u}" alt=""></i>${esc(b.who)}</span>`); });
  return h;
};
const _rv_kStage = kStage; kStage = function(bg, who, ex, text, name){
  const h = _rv_kStage(bg, who, ex, text, name);
  if(!K || !K.result || !["won","lost"].includes(K.step)) return h;
  const R = K.step === "lost" ? K.result.other : (K.result.bids || []).find(b => !b.me);
  if(!R || !R.who) return h;
  const u = rvUrl(R.who, K.step === "lost" ? "angry" : "worried"); if(!u) return h;
  const tag = K.step === "lost" ? `🥇 1등 · ${esc(R.who)}` : `🥈 2등 · ${esc(R.who)}`;
  return h.replace(/<\/div>$/, `<img class="vn-sprite rv-sprite" src="${u}" alt="${esc(R.who)}"><span class="rv-tag">${tag}</span></div>`);
};
