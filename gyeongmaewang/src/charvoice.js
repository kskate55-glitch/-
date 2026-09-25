/* ================= 🎭 캐릭터 개성 — 말투·말버릇·전용 행동 =================
   능력치만 다르면 여섯 명이 다 같은 사람처럼 느껴진다. 그래서 ① 방에 들어오면 그 사람 말투로 한마디
   ② 낙찰·패찰·조사 순간 반응 ③ 그 사람만 할 수 있는 전용 행동 하나씩. 상황(피곤·밤·빚·연승)에 따라 대사가 바뀐다. */
const LF_VOICE = {
  seoyun:{tic:"메모 완료!", color:"#ff8fb1",
    idle:["오케이, 오늘도 법원경매 새로고침부터! 🔄","돈은 없어도 탭은 많다. 현재 열린 탭 47개.","유튜브 경매 강의 1.5배속 정주행 중… 메모 완료!","반지하에서 시작해도 끝은 모르는 거잖아요?"],
    tired:["눈이 뻑뻑해… 커피 세 잔째인데 효과 없음.","잠깐만 누울게요. 진짜 5분만."],
    night:["새벽 감성으로 입찰가 쓰면 안 된다. 메모 완료.","밤엔 검색이 잘 돼요. 사람들이 다 자니까!"],
    broke:["통장 잔고 보고 눈 감았다 뜸. 여전히 마이너스.","대출 이자… 이게 내 월세보다 비싸면 안 되는데."],
    won:["헐 대박, 제가요?! 캡처해 둬야지 📸","낙찰!! 엄마한테 전화… 아니다, 명도부터."],
    lost:["아 진짜 10만원 차이?! 다음엔 끝자리 7로 간다.","괜찮아요, 오답노트 쓰면 돼요. 메모 완료."],
    good:["찾았다! 이거 아무도 모를걸요?","검색 한 번에 이게 나오네. 역시 인터넷."],
    bad:["헛걸음… 그래도 경험치는 쌓였다고 믿어요."]},
  dohyun:{tic:"보고서감이다.", color:"#7fb2ff",
    idle:["퇴근 완료. 지금부터 두 시간이 진짜 내 인생.","넥타이 풀고 엑셀 켠다. 회사보다 이게 더 재밌네.","월급은 들어오는데 통장은 왜 이렇게 조용하냐.","오늘 부장님보다 경매 물건을 더 오래 봤다."],
    tired:["내일 9시 출근인데… 딱 한 건만 더.","눈 감으면 엑셀 셀이 보인다."],
    night:["자정 넘으면 판단력 떨어진다. 결재는 내일.","야근 수당 없는 야근 중."],
    broke:["카드값 날이 다가온다… 이번 달은 긴축 예산.","월급날까지 D-며칠이더라."],
    won:["낙찰. …이건 진짜 보고서감이다.","좋아, 일정표에 '명도' 칸부터 만들자."],
    lost:["패찰. 원인 분석 들어간다. 입찰가 산정 로직부터.","괜찮아, 분기 실적은 아직 남았어."],
    good:["이거 정리하면 보고서감이다.","데이터가 맞아떨어진다. 기분 좋네."],
    bad:["시간 대비 효율이 안 나왔다. 기록해 둔다."]},
  mijeong:{tic:"밑지고 파는 장사 없어~", color:"#ffb45a",
    idle:["가게 마감하고 왔어. 오늘 손님보다 이게 더 재밌네!","집도 결국 사람이 사고파는 거야, 그치?","사장님들이랑 커피 한 잔이면 정보가 줄줄 나와~","밑지고 파는 장사 없어. 사는 것도 마찬가지고!"],
    tired:["아이고 허리야… 서서 15년 장사한 몸이야.","오늘은 가게 문 일찍 닫을걸."],
    night:["이 시간엔 전화 돌리면 욕먹어. 내일 아침에!","밤엔 장부 정리나 하자."],
    broke:["장사하다 보면 이런 달도 있지 뭐.","외상은 안 돼, 대출도 적당히!"],
    won:["어머 됐다! 떡 돌려야 하나? 😆","낙찰이다~ 이제 사람 만나는 건 내 전문이지."],
    lost:["어휴, 아깝다. 그 사람 얼마나 급했길래.","괜찮아, 좋은 물건은 또 나와. 장사가 그래."],
    good:["거봐, 사람한테 물어보면 다 나온다니까!","역시 동네 사람 말이 제일 정확해."],
    bad:["말이 안 통하는 날도 있어. 다음에 또 가 보지 뭐."]},
  jaehoon:{tic:"딱 보면 알아.", color:"#9ad07a",
    idle:["사진만 봐도 절반은 보여. 딱 보면 알아.","작업복 벗고 앉으니 이제 좀 살겠네.","도배로 덮은 집이 제일 무서워.","견적은 부르는 대로 주는 거 아니야."],
    tired:["무릎이 먼저 알아. 오늘은 그만.","현장 세 군데 돌았더니 허리가 끊어지겠네."],
    night:["밤엔 벽 상태가 안 보여. 내일 낮에 간다.","공구 정리하고 자자."],
    broke:["자재값도 올랐는데 통장까지 이러냐.","돈 없을 땐 손으로 때운다."],
    won:["됐네. 이제 뜯어볼 차례다.","낙찰. 수리비는 내가 제일 잘 알지."],
    lost:["아깝네. 근데 그 집 배관 좀 수상했어.","떨어진 집에 미련 두지 마. 다음 현장."],
    good:["봐, 여기 물 샌 자국. 딱 보면 알아.","이건 전문가 아니면 못 찾는다."],
    bad:["뜯어봐야 아는 건 뜯어봐야 알아."]},
  eunkyung:{tic:"숫자는 거짓말 안 해요.", color:"#c7a6ff",
    idle:["계산기부터 켤게요. 숫자는 거짓말 안 해요.","크게 벌 필요는 없어요. 크게 잃지만 않으면 돼요.","세후 수익률로 말해 주세요. 세전은 숫자가 아니에요.","오늘 가계부 정리 끝. 이제 물건 볼 시간이에요."],
    tired:["체력도 자산이에요. 오늘은 여기까지 하죠.","눈이 침침하네요. 안경 도수 또 바꿔야겠어요."],
    night:["늦은 시간의 판단은 할인해서 들어야 해요.","내일 아침에 다시 계산하죠."],
    broke:["마이너스 잔고는 빨간색이 제일 잘 어울려요. 싫지만.","이자 비용부터 줄여야 해요."],
    won:["낙찰. 상한선 안에서 샀으니 됐어요.","좋아요. 이제 보유 비용 시계가 돌아가요."],
    lost:["패찰도 결과예요. 상한을 지킨 건 잘한 거예요.","더 썼으면 이겼겠죠. 그럼 손해였을 거고요."],
    good:["이 숫자, 맞아떨어지네요.","근거가 하나 더 생겼어요."],
    bad:["비용만 들고 정보는 없었네요. 기록해 둘게요."]},
  taesik:{tic:"내가 왕년에 말이야…", color:"#e8c27a",
    idle:["허허, 내가 이 동네를 몇 년 봤는데.","어이 김사장, 나야. …아직 안 받네.","요즘 젊은 사람들은 핸드폰으로 다 찾더구먼.","내가 왕년에 말이야… 아, 이 얘기 했던가?"],
    tired:["오늘은 여기까지. 무리하면 내일이 없어.","이 나이엔 계단이 제일 무서워."],
    night:["이 시간엔 자야지. 새벽에 일어나면 되니까.","밤늦게 결정한 건 아침에 후회하더라고."],
    broke:["허허, 내 인생에 이런 잔고는 처음이네.","돈은 돌고 도는 거야. 조급해하지 마."],
    won:["허허, 됐구먼. 운보다 감이야.","이 값이면 됐어. 내 눈은 안 속아."],
    lost:["욕심부린 사람이 가져갔구먼. 두고 봐.","허허, 그 값엔 안 사. 내가 맞을 거야."],
    good:["거봐, 사람 얼굴 보면 다 나와.","내가 이 동네를 몇 년 봤는데."],
    bad:["요즘은 사람들이 문도 안 열어 줘."]}};
function lfvPick(arr, salt){ if(!arr || !arr.length) return ""; const L = lfRec(); const n = Math.floor(((L && L.t) || 0) / 30) + (salt || 0); return arr[((n % arr.length) + arr.length) % arr.length]; }
function lfvMood(){
  const L = lfRec(), c = kcRec(), D = lfDate();
  if(L.sta / (L.st.stamina || 1) < 0.35) return "tired";
  if(c.cash < 0) return "broke";
  if(D.h >= 23 || D.h < 5) return "night";
  return "idle";
}
function lfvLine(kind, salt){ const L = lfRec(); const V = L && LF_VOICE[L.char]; if(!V) return null; return lfvPick(V[kind] || V.idle, salt); }
function lfvBubble(text, cls){ const V = LF_VOICE[lfRec().char] || {}; return `<div class="lfv-say ${cls || ""}" style="--lfv:${V.color || "#fff"}">${esc(text)}</div>`; }

// ① 방: 캐릭터 머리 위 말풍선
const _lfv_base = lfBaseHTML; lfBaseHTML = function(){
  const h = _lfv_base(); const L = lfRec(); if(!L || !LF_VOICE[L.char]) return h;
  const t = lfvLine(lfvMood()); if(!t) return h;
  return h.replace('<div class="lf-top">', lfvBubble(t, "room") + '<div class="lf-top">');
};
// ② 경매 무대: 조사 결과·낙찰·패찰 때 내 한마디
const _lfv_kStage = kStage; kStage = function(bg, who, ex, text, name){
  const h = _lfv_kStage(bg, who, ex, text, name);
  if(!K || !K.lf || typeof lfOn !== "function" || !lfOn()) return h;
  const L = lfRec(); if(!LF_VOICE[L.char]) return h;
  let kind = null;
  if(K.step === "won") kind = "won"; else if(K.step === "lost") kind = "lost";
  else if(K.step === "brief" && K._krNew && K.rlog && K.rlog.length){ kind = K._krNew.useful ? "good" : "bad"; }
  if(!kind) return h;
  const t = lfvPick(LF_VOICE[L.char][kind], (K.rlog || []).length + (K.seed || 0));
  const pid = (LFV_POSE[L.char] || {})[kind];
  if(pid && typeof lfBlob === "function"){   // 낙찰·패찰 포즈 그림이 있으면 뒷모습 대신 정면 포즈로 크게
    const out = h.replace(/class="vn-player/g, 'class="vn-player lfv-hide').replace(/<\/div>$/, `<img class="vn-sprite lfv-pose lfv-${kind}" src="${lfBlob(pid)}" alt="${esc(lfChar().name)}">` + lfvBubble(t, "stage pose") + "</div>");
    return out;
  }
  return h.replace(/<\/div>$/, lfvBubble(t, "stage") + "</div>");
};
// 낙찰·패찰 포즈 그림 (P 발주 — 받은 사람부터)
const LFV_POSE = {
  seoyun:{won:"fd7621303deddef2407af8c6816bfc6b", lost:"1e15acf99ad9a0140ebf19a753980995"},
  dohyun:{won:"fd6fb8caad85ae763decc8233251573d", lost:"955649be6263b2d8847016c23a881e6a"},
  mijeong:{won:"7f96fe2cbb81901934b84742468b9ac3", lost:"4354fe023f539f86bf6cb86a3d466e51"},
  jaehoon:{won:"9cdf4145912fd973573da6946753d10e", lost:"a6195809a9b5389746ce2ebb7d9b81e0"},
  taesik:{won:"8ee5fea1e13e88f114fdbf2a1b510d5a", lost:"90e7328687e4fdaa42e7e5e5d0da4c3d"}};
// ③ 그 사람만 하는 행동 (능력치 성장·관계에 조금씩)
Object.assign(LF_ACTS, {
  sig_seoyun:{spot:"sig_seoyun", ic:"📱", t:"경매 카페·커뮤니티 눈팅", min:60, sta:2, stress:-3, grow:["info", 2], note:"정보 경험치 · 서윤 전용"},
  sig_dohyun:{spot:"sig_dohyun", ic:"📊", t:"엑셀로 이번 주 물건 정리", min:60, sta:3, stress:-1, grow:["market", 1.8], note:"시세감각 경험치 · 도현 전용"},
  sig_mijeong:{spot:"sig_mijeong", ic:"☕", t:"가게 단골들한테 동네 소문 듣기", min:90, sta:3, stress:-6, grow:["broker", 1.8], note:"중개사 친화 경험치 · 스트레스 −6 · 미정 전용"},
  sig_jaehoon:{spot:"sig_jaehoon", ic:"🔧", t:"공구 정비하며 현장 동료와 통화", min:60, sta:3, stress:-4, grow:["repair", 1.8], note:"수리감각 경험치 · 재훈 전용"},
  sig_eunkyung:{spot:"sig_eunkyung", ic:"🧮", t:"가계부·세금 시뮬레이션", min:60, sta:2, stress:-3, grow:["law", 1.8], note:"법률 경험치 · 은경 전용"},
  sig_taesik:{spot:"sig_taesik", ic:"☎️", t:"\"어이 김사장, 나야\" — 옛 인맥에 전화", min:30, sta:1, stress:-3, rel:["김사장", 1.0], note:"김사장 관계 ↑ · 태식 전용"}});
const LFV_SIG_SPOT = {seoyun:"desk", dohyun:"desk", mijeong:"out", jaehoon:"out", eunkyung:"desk", taesik:"phone"};
const _lfv_panel = lfPanel; lfPanel = function(id){
  const h = _lfv_panel(id), L = lfRec(); if(!L) return h;
  const k = (typeof RH_ALIAS !== "undefined" && RH_ALIAS[id]) || id;
  if(LFV_SIG_SPOT[L.char] !== k) return h;
  const V = LF_VOICE[L.char];
  const sig = `<div class="panel lfv-sig" style="--lfv:${V.color}"><b>✨ ${esc(lfChar().name)}만 하는 것</b> <small class="note">“${esc(V.tic)}”</small>${lfActBtns("sig_" + L.char)}</div>`;
  return h.replace(/(<\/h3>)/, `$1${sig}`);
};
