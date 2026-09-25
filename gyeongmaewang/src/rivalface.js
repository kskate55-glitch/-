/* ================= 🥊 입찰장 라이벌 얼굴 (R 발주) =================
   입찰 결과표의 "초보 과입찰러 1억 2,390만원"이 글자뿐이었다 → 이름 옆에 얼굴.
   패찰이면 나를 이긴 1등이, 낙찰이면 아깝게 진 2등이 무대 오른쪽에 선다. 그림 없는 라이벌은 예전처럼 글자만. */
const RV_ART = {
  "초보 과입찰러":{normal:"77e942337a7e494092b3bacb72f03c21", angry:"f660c9c18dec9ea81c03848340c66afc", worried:"38492b411658f21f5df868884a8c6af3"},
  "지역 실수요자":{normal:"28f7bf47ecfa43a14bd0693dccda310c", angry:"fee3c6665d618126951c1af54d8bdfac", worried:"e8f193670a4c3fe84b4d12fe9351eb99"},
  "전문 투자자":{normal:"105bfde0b4123a3f47fcf3330ea6c078", angry:"669560ce4a942783786cc2849590fe29", worried:"0ac926fb407841f2b7b312e8c59867b8"},
  "무조건 저가형":{normal:"0bf5acafb678833ee2cd6d5bdb9fc76d", angry:"9d29b5c4c4aa8183ddfb7657bbb8e770", worried:"df7dea18a945dc879b0b46abb16a32dc"},
  "인테리어 업자":{normal:"ac5e8c9f581c8c0e733c4a108559fb71", angry:"7e22f7758b4da31a4242f3b7441f94eb", worried:"c723786892a84375c22e26694fd45188"}};
function rvUrl(who, ex){ const A = RV_ART[who]; if(!A) return null; const id = A[ex] || A.normal; return window.GMW_STANDALONE ? "assets/" + id + ".webp" : "/_blob/" + id; }
const _rv_table = kBidTable; kBidTable = function(){
  let h = _rv_table();
  (K.result.bids || []).forEach(b => { if(b.me) return; const u = rvUrl(b.who, "normal"); if(!u) return;
    h = h.replace(`<span>${esc(b.who)}</span>`, `<span><i class="rv-face"><img src="${u}" alt=""></i>${esc(b.who)}</span>`); });
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
