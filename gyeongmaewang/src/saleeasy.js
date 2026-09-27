/* ================= 🏷️ 매도 난이도 낮추기 (v222) =================
   피드백: "게임이니까 매도도 좀 더 쉽게." 실측(사건 22개 × 8판)으로 제일 답답한 건 '계약 파기'였다 —
   팔릴 때까지 평균 0.5번, 즉 두 판에 한 번은 계약 직전에 깨졌다. 그래서 세 가지만 낮춘다.
   ① 계약 파기 확률 × SE_CANCEL (0.4) — 매수자 유형 자체의 파기율만. '대출 문제가 숨은 물건'의 추가 위험(+12%)은 교육용이라 그대로.
   ② 흥정 폭 × SE_FLEX (0.5) — 제안가가 호가·시세에 더 가깝고, 역제안(0.5 − 흥정폭×8)도 더 잘 통한다.
   ③ 제안이 없는 주에 SE_EXTRA(25%) 확률로 손님이 한 명 더(안 팔린 주가 길어질수록 최대 60%까지) — 별도 난수라 게임 난수(K.r) 순서는 그대로.
   원래 교훈(첫 주 낮은 제안, 대출 한도형 매수자, 호가 욕심)은 그대로 남는다 — 덜 자주, 덜 아프게 일어날 뿐이다. */
const SE_CANCEL = 0.4, SE_FLEX = 0.5, SE_EXTRA = 0.25;
[typeof K_BUYERS !== "undefined" ? K_BUYERS : [], typeof SF_BUYERS !== "undefined" ? SF_BUYERS : []].forEach(list => list.forEach(b => {
  if(b._se) return; b._se = true;
  if(typeof b.cancel === "number") b.cancel = Math.round(b.cancel * SE_CANCEL * 1000) / 1000;
  if(typeof b.flex === "number") b.flex = Math.round(b.flex * SE_FLEX * 10000) / 10000;
}));
if(typeof kWeek === "function"){
  const _se_kWeek = kWeek;
  kWeek = function(){
    const r = _se_kWeek.apply(this, arguments);
    try{
      const S = K && K.sale; if(!S || S.done || S.offer || K.step !== "sell") return r;
      const g = kRng((((K.seed || 1) * 131 + S.weeks * 7919) ^ 0x5A1E) >>> 0);
      const over = (S.list - S.trueP) / S.trueP, extra = Math.min(0.6, SE_EXTRA + Math.max(0, S.weeks - 3) * 0.05);   // 오래 안 팔릴수록 손님이 조금씩 더 온다
      if(g() < extra){
        if(over > 0.1) return r;             // 시세보다 10% 넘게 비싸게 내놓았으면 손님도 안 온다(호가 욕심의 교훈은 남긴다)
        const b = K_BUYERS[Math.floor(g() * K_BUYERS.length)];
        S.offer = {amt:Math.min(S.list, Math.round(S.trueP * (1 - b.flex - g() * 0.008) / 10) * 10), buyer:Object.assign({}, b), se:true};
      }
    }catch(e){}
    return r;
  };
}
