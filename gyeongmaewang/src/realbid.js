/* ================= ⚖️ 경쟁자 수·낙찰가를 실제 통계에 맞춘다 =================
   예전: 거의 모든 물건에 경쟁자 5명 이상, 단독입찰 0%, 입찰가는 '최저가 × 1.00~1.25' 중 가장 높은 값이
   거의 매번 나와서 낙찰가율이 77~91%로 현실(빌라 70~77%)보다 높고, 낙찰받기가 지나치게 어려웠다.
   이제: ① 경쟁자 수는 지역 평균 응찰자 수에 맞춘 분포에서 뽑는다(단독도, 가끔 몰리는 날도 있다).
        ② 경쟁자 금액은 '그 지역 평균 낙찰가율 × 성향 계수'로 정한다(최저가 밑으로는 못 쓴다).
        ③ 선순위·유치권처럼 최저가가 60% 밑으로 떨어진 특수 물건은 퍼즐이 설계된 판이라 금액은 건드리지 않는다.
   근거(교육용 참고값, 날짜 표기): 2026년 상반기 공개 보도에 인용된 경매정보업체 집계 — 수도권 빌라 낙찰가율
   경기 약 77% · 인천 약 70% · 서울(일반 응찰자) 약 73~75%, 평균 응찰자 수 경기 4.4명 · 인천 4.2명.
   동 단위 평균은 한 동의 한 해 빌라 경매가 몇 건 안 돼 표본이 너무 작아서 쓰지 않는다(시·도 평균만). */
const RB_REGION = {
  서울:{rate:0.745, bidders:4.3}, 경기:{rate:0.77, bidders:4.4}, 인천:{rate:0.70, bidders:4.2}, 기타:{rate:0.74, bidders:4.0}};
const RB_KIND = {villa:{rateAdd:0, bidMul:1}, apt:{rateAdd:0.06, bidMul:1.35}, comm:{rateAdd:-0.06, bidMul:0.6}};
// 성향 계수: 지역 평균 낙찰가율에 곱한다(한 명만 봤을 때 대략 이 범위를 쓴다)
const RB_STYLE = [[/저가/, 0.83, 0.90], [/전문|투자/, 0.88, 0.96], [/실수요|이사철|소문/, 0.90, 0.99], [/인테리어|업자|운영자/, 0.91, 1.00], [/초보|과입찰|아는/, 0.94, 1.03], [/맹신/, 0.99, 1.08]];
function rbRegion(){ const s = String((KP && (KP.addr || "")) + " " + (KP && (KP.title || ""))); return /^\s*서울|서울 /.test(s) ? "서울" : /인천/.test(s) ? "인천" : /경기|수원|부천|고양|남양주|의정부|안산|평택|화성|성남|용인/.test(s) ? "경기" : "기타"; }
function rbKind(){ const s = String((KP.title || "") + " " + (KP.short || "")); return /아파트/.test(s) ? "apt" : /상가|근린|모텔|공장|미용실|식당|중식당|빌딩/.test(s) ? "comm" : "villa"; }
// 경쟁자 수(나 제외) — 평균이 (평균 응찰자 수 − 1) 근처가 되는 치우친 분포: 한두 명이 흔하고, 가끔 많이 몰린다
function rbCount(r, mean){
  const u = r(); if(u < 0.14) return 0;
  const k = mean / 0.86; let n = 0, t = r(); while(t > Math.exp(-k) && n < 12){ n++; t *= r(); }   // 포아송(평균 k) 뽑기
  return Math.max(1, n);
}
function rbStyle(name){ for(const [re, lo, hi] of RB_STYLE) if(re.test(name)) return [lo, hi]; return [0.89, 0.98]; }
function rbApply(){
  if(!K || !KP || !K.r || K.rbDone) return; K.rbDone = true;
  const m = KP.minBid / KP.appraisal; if(!(m > 0)) return;
  const reg = RB_REGION[rbRegion()], kind = RB_KIND[rbKind()];
  const firstBid = typeof kcRec === "function" && (kcRec().bids || 0) === 0 && typeof KC_MODE !== "undefined" && KC_MODE !== "weekly";
  // ① 인원
  const pool = (KP.rivals && KP.rivals.length ? KP.rivals : K_RIVALS);
  let want = K.crowd === "quiet" ? 0 : rbCount(K.r, Math.max(0.6, (reg.bidders - 1) * kind.bidMul));
  if(K.crowd === "surge") want = Math.max(want, 5 + Math.floor(K.r() * 4));          // 몰리는 날은 그대로 몰린다(다만 5~8명)
  if(firstBid) want = Math.min(3, Math.max(1, want));                                 // 생애 첫 입찰은 '보통' 판
  const cur = K.rivals.slice(); for(let i = cur.length - 1; i > 0; i--){ const j = Math.floor(K.r() * (i + 1)); [cur[i], cur[j]] = [cur[j], cur[i]]; }
  while(cur.length < want){ const v = pool[Math.floor(K.r() * pool.length)]; cur.push({t:v.t, lo:v.lo, hi:v.hi, p:v.p}); }
  K.rivals = cur.slice(0, want);
  // ② 금액 — 최저가가 60% 밑인 특수 물건은 설계된 금액 그대로
  if(m < 0.6) return;
  const heat = 1 + ((KP.rivalMul || 1) - 1) * 0.5;
  const rate = Math.min(0.97, (reg.rate + kind.rateAdd) * heat);
  K.rivals = K.rivals.map(v => { const [a, b] = rbStyle(v.t || ""); const lo = Math.max(1, rate * a / m), hi = Math.max(lo + 0.004, rate * b / m); return Object.assign({}, v, {lo, hi, rb:1}); });
}
function rbStat(){ const reg = rbRegion(), k = rbKind(); const R = RB_REGION[reg], D = RB_KIND[k]; return {reg, kind:k, rate:Math.min(0.97, R.rate + D.rateAdd), bidders:+(R.bidders * D.bidMul).toFixed(1)}; }
if(typeof kStart === "function"){ const _rb_kStart = kStart; kStart = function(seed){ const out = _rb_kStart.apply(this, arguments); try{ rbApply(); }catch(e){} return out; }; }
// 사건 파일 '경쟁 분위기' 줄 아래에 지역 평균(참고)을 한 줄 — 내 입찰가가 평균보다 높은지 낮은지 가늠하게
if(typeof keCaseHTML === "function"){
  const _rb_case = keCaseHTML;
  keCaseHTML = function(){
    const h = _rb_case.apply(this, arguments);
    try{
      const s = rbStat(), K2 = {villa:"빌라", apt:"아파트", comm:"상가·수익형"}[s.kind];
      const row = `<span>지역 평균(참고)</span><b>${s.reg === "기타" ? "수도권" : s.reg} ${K2} 낙찰가율 약 ${Math.round(s.rate * 100)}% · 응찰 ${s.bidders}명 <small class="note">2026 상반기 공개 집계 기준 · 물건마다 다름</small></b>`;
      return h.replace(/(<span>경쟁 분위기<\/span>[\s\S]*?)(<\/div>\s*<div class="ke-rate">)/, `$1${row}$2`);
    }catch(e){ return h; }
  };
}
