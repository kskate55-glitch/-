/* ================= 🥊 입찰장 라이벌 얼굴 (R 발주) =================
   입찰 결과표의 "초보 과입찰러 1억 2,390만원"이 글자뿐이었다 → 이름 옆에 얼굴.
   패찰이면 나를 이긴 1등이, 낙찰이면 아깝게 진 2등이 무대 오른쪽에 선다. 그림 없는 라이벌은 예전처럼 글자만. */
const RV_ART = {
  "초보 과입찰러":{normal:"2554c349faec4a4334d4642044ce56bb", angry:"a97de7c2b8d37096da1ae6b177fa8f67", worried:"d7b15bb5b920c3502da821f91c181a9f"},
  "지역 실수요자":{normal:"365f291c360b35630af92287ea3a7e9e", angry:"0e94711136a8069145a516e2cabd179f", worried:"8d15d6fbf11f46c28205619bb87bffdc"},
  "전문 투자자":{normal:"2671bce1d07bb9d2975116b968ae654f", angry:"f1ce94238f0e06a04eedf25b503c901d", worried:"9c72eb7a5f89deb39440d94ef20df66a"},
  "무조건 저가형":{normal:"9b70fb5980a2a4ee5cbfa3b5a332d039", angry:"1ea6af88728f02da511ebce94cad9cf6", worried:"3cb6a49b0a6eca64bbb45d9859e78053"},
  "인테리어 업자":{normal:"1b0bc65ebdc7f60b3709ce4ebb98e081", angry:"e9d15c8e3a41e8e5b8ed6a7f9100adf2", worried:"977ed007cef8be8c24618133bfd26db4"},
  "겉 마진 보고 온 투자자":{normal:"9078ffbb0cbaafd33416d918160e0a8d", angry:"ed47edb2b24e833d732dfdb1efa5d21b", worried:"9401d833d68e92d034c99819e95d6ac8"},
  "감정가 맹신러":{normal:"81c4b1409731ba5e69e42dfedc53c05d", angry:"9e359773a6e9ef9589e31edc1afc0e9b", worried:"a6b0fc29e11f795ba82bc4c43aded4f0"},
  "이사철 실수요자":{normal:"bf6ba1f104722f50cb938c08ea650c2f", angry:"b45169a22a9e7116dc8f70e58c6dede6", worried:"4351e5b9cc1ca8c27196bdc74ce81467", pair:true}};   // pair = 두 사람 그림(얼굴 동그라미를 덜 확대)
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
