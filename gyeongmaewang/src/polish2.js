/* ================= 🎲 입찰의 공포 — 흐린 경쟁도 · 단독낙찰 · "내가 너무 많이 썼나?" · 정보 출처 · 비 오는 날 =================
   낙찰 = 승리라는 공식을 깬다. 경쟁자 수는 끝까지 숫자로 안 보여 주고, 신호만 흐리게 준다. */
// 1. 경쟁 분위기에 변동을 — 가끔은 텅 비고(단독낙찰), 가끔은 몰린다
const _kp_kStart = kStart; kStart = function(seed){
  _kp_kStart(seed);
  // 생애 첫 경매만: 텅 빈 법정(단독낙찰)·갑자기 몰림 같은 극단 운은 빼고 '보통' 분위기로 — 평균 승률을 올리는 보정은 아니다.
  // (주간 경매는 모두가 같은 물건·같은 판이어야 하므로 제외)
  const firstBid = typeof kcRec === "function" && (kcRec().bids || 0) === 0 && typeof KC_MODE !== "undefined" && KC_MODE !== "weekly";
  const u0 = K.r(), u = firstBid ? 0.5 : u0, pool = KP.rivals || K_RIVALS;
  if(u < 0.10){ K.rivals = []; K.crowd = "quiet"; }
  else if(u < 0.18){ const n = 5 + Math.floor(K.r() * 7); for(let i = 0; i < n; i++){ const v = pool[Math.floor(K.r() * pool.length)]; K.rivals.push({t:v.t, lo:v.lo, hi:v.hi}); } K.crowd = "surge"; }
  else K.crowd = "normal";
  K.rain = K.r() < 0.25;
};
function kpLevel(x){ return x <= 1 ? "낮음" : x <= 3 ? "보통" : x <= 5 ? "높음" : "매우 높음"; }
function kpNoise(salt, amp){ const r = kRng((K.seed ^ (salt * 2654435761)) >>> 0); r(); return Math.round((r() * 2 - 1) * amp); }
function kpInterestHTML(){
  const n = K.rivals.length, d = K.done, sig = [];
  const any = ids => ids.some(i => d[i]);
  if(K.found.rivals) sig.push(["⚖️ 법정 관심도", kpLevel(n + kpNoise(1, 2))], ["⭐ 즐겨찾기 추정", kpLevel(Math.round(n * 1.4) + kpNoise(2, 3))]);
  if(any(["ext","meter","mgmt","neigh","down","occ","night","rush"])) sig.push(["👣 현장 방문 흔적", kpLevel(n + kpNoise(3, 3))]);
  if(any(["call1","call3","brokers","kim","park"])) sig.push(["📞 중개업소 문의", kpLevel(n + kpNoise(4, 3))]);
  return sig.length ? `<span class="kp-sig">${sig.map(([t, l]) => `<em class="lv-${l.replace(/\s/g,"")}">${t} <b>${l}</b></em>`).join("")}</span>` : "?? <small class=\"note\">조사하면 분위기가 보여요 — 정확한 숫자는 개찰 때까지 아무도 몰라요</small>";
}
// 2. 비 오는 날 — 현장 조사 +15%
const _kp_krDur = krDur; krDur = function(a){ const d = _kp_krDur(a); return K && K.rain && a.loc === "site" ? d.map(x => Math.round(x * 1.15)) : d; };
// 3. 정보 출처 — 같은 말이라도 누가 했느냐
const KP_SRC = {docs:"official", bldg:"official", mgmt:"official", bank:"official", court:"data", trade:"data", map:"data", listing:"data", ext:"observe", meter:"observe", night:"observe", rush:"observe",
  neigh:"witness", down:"witness", occ:"witness", call1:"broker", call3:"broker", brokers:"broker", kim:"broker", park:"broker", mgmtcall:"phone"};
const KP_SRC_LABEL = {official:["📑","공식기록 확인됨","off"], data:["📊","데이터","dat"], observe:["👀","직접 확인","obs"], witness:["🗣️","개인 증언","wit"], broker:["💬","중개 의견 · 신뢰도 ???","brk"], phone:["☎️","전화 답변","phn"]};
function kpSrcBadge(src){ const L = KP_SRC_LABEL[src]; return L ? `<span class="kp-src ${L[2]}">${L[0]} ${L[1]}</span>` : ""; }
const _kp_kResearch = kResearch; kResearch = function(id){
  const nSay = K ? K.says.length : 0, nLog = K ? K.log.length : 0;
  _kp_kResearch(id);
  if(!K) return; const src = KP_SRC[id]; if(!src) return;
  K.says.slice(nSay).forEach(s => { s.src = src; });
  if(K.log.length > nLog){ const L = KP_SRC_LABEL[src]; K.log[K.log.length - 1] = `${L[0]} [${L[1]}] ` + K.log[K.log.length - 1]; }
};
function kpSaysBoard(){
  if(!K.says.length) return "";
  return `<div class="panel kp-board"><b>🗣️ 들은 말 — 출처를 보세요</b> <small class="note">정답 시세는 아무도 알려 주지 않아요. 말끼리 부딪히면, 누구 말이 더 믿을 만한지 직접 정하세요.</small>
    <ul>${K.says.map(s => `<li>${kpSrcBadge(s.src)}<b>${esc(s.who)}</b> “${esc(s.t)}”</li>`).join("")}</ul></div>`;
}
if(typeof k2SaysHTML === "function"){ k2SaysHTML = function(){ return K.says.length ? `<details class="panel k2-says"><summary>🗣️ 들은 말 (${K.says.length}) — 누구 말이 맞을까?</summary><ul>${K.says.map(s=>`<li>${kpSrcBadge(s.src)}<b>${esc(s.who)}</b> “${esc(s.t)}”</li>`).join("")}</ul></details>` : ""; }; }
// 4. 단독낙찰 공포 · 5. 내가 너무 많이 썼나
Object.assign(K_ACH, {solo:["🫥","단독낙찰","2등이 없었다 — 나만 모르는 게 있나?"], overbid:["💸","내가 너무 많이 썼나","2등과 입찰가의 5% 넘게 차이"]});
const _kp_kBid = kBid; kBid = function(amt){
  _kp_kBid(amt);
  if(!K || !K.result || !K.result.win) return;
  if(K.result.solo) kAch("solo");
  else if(K.result.gap >= Math.max(300, K.bid * 0.05)) kAch("overbid");
};
let KP_HUSH = null;
const _kp_kingHTML = kingHTML; kingHTML = function(){
  let h = _kp_kingHTML();
  if(!K || K.intro || K.revealing || K.sealed) return h;
  if(K.step === "brief"){
    if(K.rain) h = h.replace('<div class="note">지금 위치:', '<div class="note kp-rain">☔ 오늘은 비 — 현장 조사가 15% 더 걸려요.</div><div class="note">지금 위치:');
    const at = h.indexOf('<div class="panel ke-case">'); if(at >= 0) h = h.slice(0, at) + kpSaysBoard() + h.slice(at);
  }
  if(K.step === "won"){
    const R = K.result;
    if(R.solo){
      h = h.replace(/data-full="낙찰! 2등과[^"]*"/, 'data-full="단독낙찰. 2등이 없다. …다들 왜 안 왔지?"');
      h = h.replace('<div class="panel k-bidres win">', `<div class="panel kp-solo"><b>🏆 단독낙찰</b><div class="kp-cmp"><span>입찰가</span><b>₩ ${keWon(K.bid)}</b><span>최저가</span><b>₩ ${keWon(KP.minBid)}</b><span>2등</span><b>없음</b></div><p class="kp-fear">……<br>“혹시 나만 모르는 게 있는 건 아닐까?”</p><small class="note">최저가보다 ${kMan(K.bid - KP.minBid)} 더 썼어요. 아무도 안 왔다면, 최저가만 써도 됐다는 뜻이에요.</small></div><div class="panel k-bidres win">`);
    } else if(R.gap >= Math.max(300, K.bid * 0.05)){
      h = h.replace('<div class="panel k-bidres win">', `<div class="panel kp-over"><div class="kp-cmp"><span>나</span><b>₩ ${keWon(K.bid)}</b><span>2등</span><b>₩ ${keWon(R.other.amt)}</b><span></span><b class="down">+ ₩ ${keWon(R.gap)}</b></div><p class="kp-lesson">📜 오늘의 교훈 — “경쟁자가 없었던 게 아니라, 경쟁자는 ${kMan(R.other.amt)}에 있었습니다.”</p></div><div class="panel k-bidres win">`);
    }
  }
  return h;
};
const _kp_render = renderArena; renderArena = function(){
  _kp_render();
  // 단독낙찰 첫 화면 — 음악이 잠깐 멈춘다
  if(typeof page !== "undefined" && page === "arena" && arenaTab === "king" && K && K.step === "won" && !K.revealing && K.result && K.result.solo && KP_HUSH !== K.seed){
    KP_HUSH = K.seed; if(typeof kaWant === "function"){ kaWant(null); setTimeout(() => { if(typeof kaSync === "function") kaSync(); }, 4200); }
  }
};
// 표정: 단독낙찰이면 기쁨보다 불안, 크게 더 썼으면 놀람
const _kp_face = keMyFace; keMyFace = function(){ if(K && K.step === "won" && K.result){ if(K.result.solo) return "worried"; if(K.result.gap >= Math.max(300, K.bid * 0.05)) return "shocked"; } return _kp_face(); };
