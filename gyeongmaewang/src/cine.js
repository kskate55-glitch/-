/* ================= 🎬 여섯 개의 인생 — 캐릭터 오프닝 · 전용 음악 · 인생 조건 이벤트 · 인생 갈림길 · 화면 전환 엔진 =================
   캐릭터 선택은 '스탯 고르기'가 아니라 '누구의 인생을 살 것인가'.
   화면이 "띡" 바뀌지 않게 — 전환 효과는 전부 겉모습(pointer-events 없음)이라 게임 로직·클릭 순서는 그대로다. */

/* ---------- ✋ 확인창 대신 '한 번 더 누르기' ----------
   아티팩트처럼 샌드박스 안에서는 브라우저가 confirm()을 막아 조용히 '취소'로 돌려준다(사람은 그렇게 빨리 누를 수 없다).
   그럴 때는 누른 버튼을 빨갛게 바꾸고 질문을 버튼 밑에 띄운 뒤, 6초 안에 한 번 더 누르면 '예'로 친다. */
let SC_ARM = null, SC_OBS = null;          // {msg, at, sel} — 질문 기준으로 기억한다(버튼은 다시 그려지면 새 요소가 되니까)
function scSel(btn){ for(const at of btn.attributes){ if(at.name.startsWith("data-")) return `[${at.name}="${String(at.value).replace(/"/g, '\\"')}"]`; } return null; }
function scPaint(){
  if(!SC_ARM) return; const btn = SC_ARM.sel ? document.querySelector(SC_ARM.sel) : null; if(!btn || btn.classList.contains("sc-armed")) return;
  btn._lab = btn.innerHTML; btn.innerHTML = "⚠ 한 번 더 누르면 진행"; btn.classList.add("sc-armed");
  const note = document.createElement("small"); note.className = "sc-note"; note.textContent = SC_ARM.msg; btn.insertAdjacentElement("afterend", note);
}
function scClear(){
  SC_ARM = null; if(SC_OBS){ SC_OBS.disconnect(); SC_OBS = null; }
  document.querySelectorAll(".sc-armed").forEach(b => { if(b._lab != null) b.innerHTML = b._lab; b.classList.remove("sc-armed"); });
  document.querySelectorAll(".sc-note").forEach(n => n.remove());
}
function safeAlert(msg){
  try{ const t = performance.now(); window.alert(msg); if(performance.now() - t > 60) return; }catch(e){}
  const old = document.getElementById("scToast"); if(old) old.remove();
  const el = document.createElement("div"); el.id = "scToast"; el.className = "sc-toast"; el.setAttribute("role", "alert"); el.textContent = "⚠ " + msg;
  document.body.appendChild(el); setTimeout(() => { if(el.parentNode) el.remove(); }, 4200);
}
function safeConfirm(msg){
  try{ const t = performance.now(), r = window.confirm(msg); if(r) return true; if(performance.now() - t > 60) return false; }catch(e){}
  if(SC_ARM && SC_ARM.msg === msg && Date.now() - SC_ARM.at < 350) return false;   // 더블클릭의 두 번째 누름은 확인으로 치지 않는다
  if(SC_ARM && SC_ARM.msg === msg && Date.now() - SC_ARM.at < 6000){ scClear(); return true; }
  const ev = window.event, btn = ev && ev.target && ev.target.closest ? ev.target.closest("button,a,[role=button]") : null;
  scClear(); SC_ARM = {msg, at:Date.now(), sel:btn ? scSel(btn) : null};
  scPaint(); queueMicrotask(scPaint); setTimeout(scPaint, 0);
  if(typeof MutationObserver === "function"){ SC_OBS = new MutationObserver(() => scPaint()); SC_OBS.observe(document.body, {childList:true, subtree:true}); }
  const at = SC_ARM.at; setTimeout(() => { if(SC_ARM && SC_ARM.at === at) scClear(); }, 6000);
  return false;
}

/* ---------- 🎵 캐릭터 전용 음악 (같은 엔진, 다른 편곡) ---------- */
Object.assign(KA_TRACKS, {
  select:     {bpm:78,  root:43, prog:[[0,"m7"],[5,"m7"],[10,"M7"],[3,"M7"]], bass:"1.......5.......", arp:"0...2...1...3...", arpOct:2, arpWave:"sine", lp:1600, kick:"", hat:"........1.......", snare:"", pad:0.05, arpV:0.06},
  op_seoyun:  {bpm:82,  root:46, prog:[[0,"M7"],[9,"m7"],[5,"M7"],[7,"sus"]], bass:"1..5..1...5.1...", arp:"02..13..20..31..", arpOct:2, arpWave:"triangle", lp:1500, kick:"1.......1.......", hat:"..1...1...1...1.", snare:"....1.......1...", pad:0.04, arpV:0.05, swing:0.14},   // 좁은 방의 시작 — 로파이
  op_dohyun:  {bpm:104, root:41, prog:[[0,"min"],[0,"min"],[8,"maj"],[10,"maj"],[5,"M7"],[0,"M7"],[8,"M7"],[7,"sus"]], bass:"1.1.1.1.1.1.1.1.", arp:"0.0.0.0.2.2.2.2.", arpOct:2, arpWave:"square", lp:1300, kick:"1...1...1...1...", hat:"1.1.1.1.1.1.1.1.", snare:"", pad:0.03, arpV:0.035},   // 퇴근 후 두 번째 인생 — 반복 리듬이 따뜻해진다
  op_mijeong: {bpm:116, root:48, prog:[[0,"maj"],[9,"min"],[5,"maj"],[7,"d7"]], bass:"1.5.1.5.1.5.1.5.", arp:"0.1.2.1.0.1.2.3.", arpOct:2, arpWave:"square", lp:2200, kick:"1...1...1...1...", hat:"..1...1...1...1.", snare:"....1.......1...", pad:0.025, arpV:0.05, swing:0.1},   // 장사 끝난 밤
  op_jaehoon: {bpm:88,  root:36, prog:[[0,"min"],[3,"maj"],[5,"min"],[7,"min"]], bass:"1.....1.1.....1.", arp:"0.......2.......", arpOct:2, arpWave:"sawtooth", lp:900, kick:"1.....1...1.....", hat:"....1.......1...", snare:"....1.......1...", pad:0.04, arpV:0.035},   // 현장은 거짓말하지 않는다
  op_eunkyung:{bpm:72,  root:50, prog:[[0,"m7"],[5,"m7"],[8,"M7"],[7,"d7"]], bass:"1.......1.......", arp:"0.1.2.3.2.1.0...", arpOct:2, arpWave:"sine", lp:3200, kick:"", hat:"", snare:"", pad:0.035, arpV:0.08},   // 숫자가 맞지 않는다 — 피아노
  op_taesik:  {bpm:84,  root:43, prog:[[0,"maj"],[4,"min"],[5,"maj"],[7,"d7"]], bass:"1...5...1...5...", arp:"2...1...0...1...", arpOct:2, arpWave:"triangle", lp:2000, kick:"1.......1.......", hat:"....1.......1...", snare:"", pad:0.05, arpV:0.07, swing:0.08},   // 오래 본 동네 — 옛날 드라마
  base_night: {bpm:80,  root:45, prog:[[0,"M7"],[5,"M7"],[9,"m7"],[7,"sus"]], bass:"1.......5.......", arp:"0...2...1.......", arpOct:2, arpWave:"sine", lp:1400, kick:"", hat:"....1.......1...", snare:"", pad:0.045, arpV:0.05}});
Object.assign(KA_NAME, {select:"BGM_SELECT", base_night:"BGM_BASE_NIGHT"});
// 캐릭터에 마우스를 올리면(터치하면) 3초짜리 테마 한 소절
const GX_MOTIF = {seoyun:[70,74,77,81,79], dohyun:[65,65,68,72,70], mijeong:[72,76,79,76,84], jaehoon:[48,55,51,53,48], eunkyung:[74,77,81,79,76], taesik:[67,71,74,72,67]};
let GX_MOTIF_T = 0;
function gxMotif(id){
  const now = Date.now(); if(now - GX_MOTIF_T < 700) return; GX_MOTIF_T = now;
  if(!kcSfxOn() || !KA_UNLOCKED) return; const A = kaCtx(); if(!A) return; if(A.ac.state === "suspended") A.ac.resume();
  const wave = {seoyun:"triangle", dohyun:"square", mijeong:"square", jaehoon:"sawtooth", eunkyung:"sine", taesik:"triangle"}[id] || "sine";
  (GX_MOTIF[id] || []).forEach((n, i) => kaTone(A.sfx, kaHz(n), A.ac.currentTime + 0.05 + i * 0.22, 0.34, wave, 0.12, null, 2400));
}

/* ---------- 🎭 인생 조건 이벤트 — 캐릭터마다 다른 달력 ---------- */
const LF_CHAR_EVENTS = {
  seoyun: [
    {w:4, t:"📱 단기 알바 제안 — 하루 행사 스태프. 하루를 쓰고 +12만원.", f:L => { kcRec().cash += 12; L.t += 480; lfTire(12); }},
    {w:2, t:"🥲 이번 달 생활비가 모자라다 — 편의점 도시락으로 버틴다. 현금 −20만원.", f:L => { kcRec().cash -= 20; lfStress(3); }}],
  dohyun: [
    {w:3, t:"🏢 팀장: \"오늘 야근 좀 합시다.\" 다음 조사 첫날 저녁 시간이 90분 줄어든다.", f:L => { L.fx.cutFirst = [90, "🏢 야근 — 첫날 조사 시간이 90분 줄었다."]; lfStress(4); }},
    {w:2, t:"🍺 회식 — 경매 얘기 하다 동료가 '나도 해 볼까' 한다. 스트레스 −3, 체력 −6.", f:L => { lfStress(-3); lfTire(6); }}],
  mijeong: [
    {w:3, t:"🍽️ 단체 예약 — 매출 +35만원! 대신 다음 조사 첫날 시간이 60분 줄어든다.", f:L => { kcRec().cash += 35; L.fx.cutFirst = [60, "🍽️ 가게 단체 예약 — 첫날 조사 시간이 60분 줄었다."]; }},
    {w:2, t:"📵 직원 결근 — 오늘 오후 가게를 직접 봐야 한다. 다음 조사 첫날 시간이 80분 줄어든다.", f:L => { L.fx.cutFirst = [80, "📵 직원 결근 — 첫날 조사 시간이 80분 줄었다."]; lfStress(4); }}],
  jaehoon: [
    {w:3, t:"🔧 예전 거래처에서 급한 현장 일 — 이틀 일하고 +80만원. 체력 −15.", f:L => { kcRec().cash += 80; L.t += 1440 * 2; lfTire(15); }},
    {w:2, t:"📞 설비 후배: \"형, 그 동네 배관 공사 싸게 하는 데 알아요.\" 박 실장 관계 +1.", f:L => { lfRel("박 실장", 1); }}],
  eunkyung: [
    {w:3, t:"🧘 건강관리 — 오전 요가·병원 정기검진. 반나절을 쓰고 체력 +15.", f:L => { L.t += 240; L.sta = Math.min(L.st.stamina, L.sta + 15); }},
    {w:2, t:"📈 예금 만기 — 이자 +18만원. \"이걸로는 물가도 못 따라가.\"", f:L => { kcRec().cash += 18; }}],
  taesik: [
    {w:3, t:"📞 오래 알던 중개사: \"형님, 이번에 괜찮은 게 하나 떴어요.\" 다음 사건 경쟁 분위기를 미리 안다.", f:L => { L.fx.tip = true; lfRel("김사장", 0.5); }},
    {w:2, t:"🏥 병원 정기검진 — 반나절을 쓴다. 체력 +10.", f:L => { L.t += 300; L.sta = Math.min(L.st.stamina, L.sta + 10); }},
    {w:1, t:"🎉 친구 손주 돌잔치 — 축의금 −20만원. 오래 못 본 얼굴들에 스트레스 −6.", f:L => { kcRec().cash -= 20; lfStress(-6); }}]};
const _gx_lfEvent = lfEvent; lfEvent = function(){
  const L = lfRec(); if(!L) return; L.fx = L.fx || {};
  if(L.t >= (L.nextEvt || 0) && Math.random() < 0.5 && LF_CHAR_EVENTS[L.char]){
    L.nextEvt = L.t + 1440 * (2 + Math.floor(Math.random() * 3));
    const pool = LF_CHAR_EVENTS[L.char], tot = pool.reduce((s, e) => s + e.w, 0); let r = Math.random() * tot, e = pool[0];
    for(const x of pool){ r -= x.w; if(r <= 0){ e = x; break; } }
    e.f(L); lfLog(e.t); if(typeof HUB_TOAST !== "undefined") HUB_TOAST.push({t:e.t}); return;
  }
  _gx_lfEvent();
};
// 이도현 — 입찰일은 평일이면 반차, 연차는 조사에 쓸 수 있다 / 윤미정 — 가게 일이 끼어든다
function lfBidDayWork(){
  const L = lfRec(); if(!L || !K || !K.lf) return;
  const D = lfDate(K.lf.day0 + K.lf.nd * 1440), weekday = D.dow >= 1 && D.dow <= 5;
  if(L.char === "dohyun" && L.path !== "quit" && weekday){ if(L.leave >= 0.5){ L.leave -= 0.5; kLog(`🏢 입찰 때문에 반차를 썼다 (남은 연차 ${L.leave}일).`); } else { lfStress(8); kLog("🏢 연차가 없어 점심시간에 법원으로 뛰었다 — 팀장 눈치에 스트레스 +8."); } }
  if(L.char === "mijeong" && L.path !== "manager" && Math.random() < 0.25){ lfStress(4); kLog("📞 입찰 도중 가게 전화 — \"사장님, 카드 단말기가 안 돼요!\" 스트레스 +4."); }
}
// 같은 CASE라도 들어온 입구가 다르다 + 캐릭터별 첫 정보(밸런스를 깨지 않는 '의심·힌트' 수준)
function lfEntryLine(){
  const L = lfRec(); if(!L || !K) return;
  const k1 = KP.id === "k1", n = kcRec().cases;
  const E = {
    seoyun:["📱 새벽까지 경매 사이트를 뒤지다 발견한 물건.", "실거래는 금방 다 찾았다 — 어느 게 진짜 비교사례인지는 아직 모르겠다."],
    dohyun:["🔎 퇴근길 지하철에서 관심지역 알림으로 본 물건.", null],
    mijeong:["☎️ 아는 중개사가 \"사장님 이런 거 관심 있으시면…\" 하고 알려 준 물건.", "말하는 사람 말투부터 본다 — 과장이 섞이면 티가 난다."],
    jaehoon:["🧰 고쳐서 팔 만한 물건을 찾다가 본 물건.", k1 ? "📸 사진 속 계량기함 — 차단기에 테이프가 감겨 있다. …의심만 해 둔다." : "📸 사진 속 안방 벽지 아래가 들떠 보인다. …의심만 해 둔다."],
    eunkyung:["📊 수익률 필터로 걸러낸 물건.", "예상 수익이 너무 좋아 보인다 — 좋은 숫자일수록 먼저 의심한다."],
    taesik:["📞 오래 아는 중개사의 전화로 알게 된 물건.", k1 ? "🗣️ \"형님, 그 건물 큰길 물건하고 비교하면 안 돼요.\"" : "🗣️ \"형님, 그 라인은 1.7 얘기 나오는데 큰길 신축 얘기예요.\""]}[L.char];
  if(!E) return;
  kLog(`${E[0]}${n === 0 ? " (첫 물건)" : ""}`); if(E[1]) kLog(E[1]);
  if(L.char === "jaehoon") K.hint[k1 ? "elec" : "leak"] = true;
  if(L.char === "taesik") K.hint.price = true;
}
// 윤미정 — 과장 말투 감지(김태식처럼 확신은 아니고 '냄새' 수준)
if(typeof nmTag === "function"){ const _gx_nmTag = nmTag; nmTag = function(who){ const h = _gx_nmTag(who); if(!lfIs("mijeong") || !K || !K._claim || K._claim[who] == null) return h; return K._claim[who] > KP.trueMid * 1.06 ? h + `<small class="nm-tag bad">🤨 말투가 과장</small>` : h; }; }
// 이도현 — 평일 조사일에 연차 쓰기
function lfCanLeave(){ const L = lfRec(); if(!L || L.char !== "dohyun" || L.path === "quit" || !K || !K.lf) return false; const d = K.lf.days[K.lf.rday]; return d && d.dow >= 1 && d.dow <= 5 && !d.leave && L.leave >= 1; }
const _gx_krActions = krActionsHTML; krActionsHTML = function(){
  let h = _gx_krActions(); if(!K || !K.lf) return h;
  const L = lfRec();
  if(lfCanLeave()) h = h.replace('<div class="lf-day-row">', `<div class="lf-day-row"><button type="button" class="btn pri" data-lfleave>🏖️ 오늘 연차 쓰기 — 오전 10시부터 5시간 (남은 연차 ${L.leave}일)</button>`);
  if(L.char === "dohyun" && L.path !== "quit") h = h.replace('<div class="lf-day-row">', `<div class="lf-day-row"><small class="note">🏢 남은 연차 ${L.leave}일 · 평일 입찰일엔 반차 0.5일을 쓴다</small>`);
  return h;
};
document.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena" || arenaTab !== "king" || !K || !K.lf) return;
  if(!e.target.closest("[data-lfleave]") || !lfCanLeave()) return;
  const L = lfRec(), d = K.lf.days[K.lf.rday], used = d.len - K.timeLeft;
  L.leave -= 1; d.leave = true; d.s = 600; d.len = 300; K.timeLeft = Math.max(0, d.len - used); K.lf.total = K.lf.days.reduce((s, x) => s + x.len, 0);
  kLog(`🏖️ 연차를 냈다 — 오늘은 오전 10시부터 움직인다 (남은 연차 ${L.leave}일).`); lfStress(-2); if(typeof kcSfx === "function") kcSfx("stamp"); renderArena();
});

/* ---------- 🧭 인생 갈림길 — 누적 수익 1억(또는 5건)에서 한 번 ---------- */
const LF_PATHS = {
  seoyun:{q:"통장이 조금씩 불었다. 부모님은 \"이제 취업은?\" 하고 물으신다.", opts:[
    {id:"job", t:"취업한다", d:"월급 300만원이 생긴다. 대신 평일은 퇴근 후 2시간만", econ:E => ({inc:[300, 300], incT:"월급(신입)"}), window:(dow, w) => dow === 0 || dow === 6 ? [600, 280] : [1170, 130]},
    {id:"fulltime", t:"전업투자에 도전한다", d:"시간은 그대로(조사 3일). 현금흐름은 계속 불안하다"}]},
  dohyun:{q:"누적 수익이 연봉을 넘었다. 사직서 양식을 한 번 열어 봤다.", opts:[
    {id:"stay", t:"회사를 계속 다닌다", d:"월급 유지 · 시간 제약 유지"},
    {id:"quit", t:"퇴사하고 전업", d:"월급 끝 · 퇴직금 +2,000만원 · 매일 10시부터 5시간 움직인다", once:L => { kcRec().cash += 2000; }, econ:E => ({inc:[0, 0], incT:"없음(전업)", fixed:E.fixed - 20}), window:() => [600, 300]}]},
  mijeong:{q:"가게보다 경매가 더 재밌어진다. 점장 후보가 한 명 있다.", opts:[
    {id:"keep", t:"사업장을 직접 지킨다", d:"현금흐름 유지 · 시간 소모 유지"},
    {id:"manager", t:"점장에게 맡긴다", d:"인건비로 고정비 +120만원 · 매일 10시부터 4시간 20분", econ:E => ({fixed:E.fixed + 120}), window:() => [600, 260]}]},
  jaehoon:{q:"현장 일과 경매, 둘 다 하자니 몸이 두 개였으면 좋겠다.", opts:[
    {id:"keep", t:"현장 일을 계속한다", d:"프로젝트 수입 유지 · 체력 소모"},
    {id:"fulltime", t:"경매 전업", d:"프로젝트 수입이 거의 끊긴다 · 매일 10시부터 5시간", econ:E => ({inc:[0, 80], incT:"가끔 들어오는 현장 일"}), window:() => [600, 300]}]},
  eunkyung:{q:"숫자가 맞기 시작했다. 비중을 늘릴까, 지금처럼 갈까.", opts:[
    {id:"safe", t:"보수적으로 운용한다", d:"입찰 계산기가 1,000만원 남는 선으로 더 깐깐해진다"},
    {id:"expand", t:"투자 비중을 늘린다", d:"입찰 계산기가 300만원 남는 선까지 허용한다 — 더 자주 낙찰"}]},
  taesik:{q:"아들이 걱정한다. \"아버지, 혼자 다니지 마세요.\"", opts:[
    {id:"small", t:"소형 물건 위주로 천천히", d:"체력 부담 그대로 — 전화와 핵심 임장 하나"},
    {id:"partner", t:"현장 파트너를 둔다", d:"고정비 +150만원 · 현장 조사 시간 −25% · 체력 소모 절반", econ:E => ({fixed:E.fixed + 150})}]}};
function lfPathDue(){ const L = lfRec(), c = kcRec(); return L && !L.path && !L.intro && (c.total >= 10000 || c.cases >= 5); }
const _gx_durMul = lfDurMul; lfDurMul = function(a){ let m = _gx_durMul(a); const L = lfRec(); if(L && L.path === "partner" && a.loc === "site") m *= 0.75; return m; };
const _gx_tire = lfTire; lfTire = function(n){ const L = lfRec(); return _gx_tire(L && L.path === "partner" && n > 0 ? n * 0.5 : n); };

/* ---------- 📜 후일담 해금 ---------- */
const LF_EPILOGUES = {
  seoyun:{t:"반지하 방의 첫 밤", need:"현금 1억 달성", ok:c => c.cash >= 10000, txt:"창문 높이로 지나가던 발목들. 그 밤 노트북 화면에 떠 있던 '1억 200만원'. 그때는 그게 세상에서 제일 큰 숫자였다."},
  dohyun:{t:"퇴근 후 두 번째 출근", need:"누적 수익 1억", ok:c => c.total >= 10000, txt:"새벽 2시까지 이어지던 검색창. 다음 날 회의 시간에 졸다가 들킨 적도 있다. 그래도 그 두 시간이 제일 나다운 시간이었다."},
  mijeong:{t:"단골이 된 중개사", need:"물건 5건 처리", ok:c => c.cases >= 5, txt:"\"경매는 그렇게 단순하지 않아요\"라던 중개사는 이제 물건이 뜨면 제일 먼저 전화를 한다. \"사장님, 이건 사장님 스타일이에요.\""},
  jaehoon:{t:"벽을 두드리던 손", need:"칭호 '하자탐정'", ok:(c, L) => !!L.titles.detective, txt:"톡톡. 소리가 비면 속도 빈 거다. 서류는 여전히 어렵다. 그래도 집은 거짓말을 안 한다."},
  eunkyung:{t:"엑셀 시트의 마지막 줄", need:"누적 수익 1억", ok:c => c.total >= 10000, txt:"예금 금리 화면을 보며 '이걸로는…' 하던 아침. 이제 시트 맨 아래 합계 칸은 초록색이다."},
  taesik:{t:"태식의 오래된 수첩", need:"누적 수익 2억", ok:c => c.total >= 20000, txt:"손때 묻은 수첩에는 삼십 년 동안 본 동네 시세가 연필로 적혀 있다. '싸다는 말이 제일 비싸다' — 첫 장에 쓴 문장은 아직 지우지 않았다."}};
function lfOpsSeen(){ const R = arenaRec(); if(!R.ops) R.ops = {}; return R.ops; }

/* ---------- 🎬 오프닝 — 60~120초, 언제든 SKIP ---------- */
const LF_EP0 = {seoyun:"돈은 없고 시간은 많다", dohyun:"퇴근 후 두 번째 출근", mijeong:"사장님, 이 집 얼마까지 돼요?", jaehoon:"집은 뜯어봐야 안다", eunkyung:"계산이 맞지 않는다", taesik:"싸다는 말이 제일 비싸다"};
const LF_EP0_SUB = {seoyun:"한서윤의 첫 번째 입찰", dohyun:"이도현의 첫 번째 입찰", mijeong:"윤미정의 첫 번째 입찰", jaehoon:"박재훈의 첫 번째 입찰", eunkyung:"최은경의 첫 번째 입찰", taesik:"김태식의 첫 번째 입찰"};
// 장면: bg(그림) · amb(환경음 키) · sfx · ui(화면 속 소품) · lines([말한 사람|null(나레이션), 대사])
const LF_OPENINGS = {
  seoyun:[
    {bg:"bg_banjiha", amb:"room|rain|in", lines:[[null,"비 오는 밤. 신림동 반지하 원룸."],[null,"창문 밖으로 자동차 바퀴가 물을 튀기며 지나간다."]]},
    {bg:"bg_banjiha", amb:"room|rain|in", ui:{type:"bank", t:"₩35,000,000", s:"입출금 통장 잔액"}, lines:[[null,"스물다섯. 취업 준비를 시작한 지도 벌써 1년이 넘었다."],[null,"통장에는 대학 때부터 모은 돈과 아르바이트로 모은 돈이 조금 있었다."],["서윤","회사 들어가서 월급 모으면…"],["서윤","…집은 언제 사지?"]]},
    {bg:"bg_banjiha", amb:"room|rain|in", sfx:"reveal", ui:{type:"listing", t:"서울 오래된 빌라 3층", a:"감정가 1억 4,500만원", b:"최저가 1억 200만원"}, lines:[["서윤","잠깐."],["서윤","이거 왜 이렇게 싸?"]]}],
  dohyun:[
    {bg:"bg_alley", amb:"site_night|clear|out", sfx:"door", lines:[[null,"저녁 8시 43분. 지하철 문이 닫힌다. 화곡역."],[null,"골목을 두 번 꺾으면 6평짜리 원룸."]]},
    {bg:"bg_front_door", amb:"site_night|clear|out", sfx:"key", lines:[[null,"도어락 — 띠리릭."]]},
    {bg:"bg_oneroom", amb:"room|clear|in", sfx:"message", ui:{type:"phone", rows:[["급여 입금","+3,900,000","up"],["월세","−750,000","down"],["관리비","−70,000","down"],["카드대금","−1,120,000","down"]]}, lines:[[null,"넥타이를 풀고 의자에 앉는다. 휴대폰이 연달아 울린다."],["도현","……."]]},
    {bg:"bg_oneroom", amb:"room|clear|in", lines:[[null,"점심때 동료가 한 말이 떠오른다."],["동료","내 친구가 경매로 빌라 하나 샀다던데."],["도현","경매…"]]},
    {bg:"bg_oneroom", amb:"room|clear|in", sfx:"reveal", ui:{type:"listing", t:"검색: 서울 빌라 경매", a:"감정가 1억 4,500만원", b:"최저가 1억 200만원"}, lines:[["도현","일단 공부만 해 보자."],[null,"그렇게 시작한 검색이 새벽 2시까지 이어졌다."]]}],
  mijeong:[
    {bg:"bg_shop_closed", amb:"office|clear|in", ui:{type:"pos", t:"오늘 매출 ₩1,237,000"}, lines:[[null,"밤 10시 17분. 가게 마감. 의자를 테이블 위에 올린다."],["미정","오늘은 좀 했네."]]},
    {bg:"bg_shop_closed", amb:"office|clear|in", lines:[["직원","사장님, 그 건물 주인 바뀐다면서요?"],["미정","응?"],["직원","경매 넘어갔다던데요."]]},
    {bg:"bg_living_rough", amb:"room|clear|in", lines:[[null,"집에 와서 검색창을 연다."],["미정","사람 장사나 집 장사나 — 결국 가격 맞추는 건 똑같은 거 아닌가?"]]},
    {bg:"bg_realtor", amb:"broker|clear|in", sfx:"chime", lines:[["중개사","경매는 그렇게 단순하지 않아요, 사장님."],["미정","그러니까 한번 해 보려고요."]]}],
  jaehoon:[
    {bg:"bg_stairs", amb:"empty|clear|in", sfx:"knock", lines:[[null,"낡은 빌라 수리 현장."],["전기기사","형님, 여기 선이 이상한데요."],["재훈","잠깐."],[null,"벽을 두드린다. 톡, 톡."],["재훈","여기도 비었네."]]},
    {bg:"bg_stairs", amb:"empty|clear|in", lines:[["집주인","그걸 어떻게 아셨어요?"],["재훈","이런 집을 몇 개를 봤는데요."]]},
    {bg:"bg_alley", amb:"site_night|clear|out", lines:[[null,"일 끝나고 국밥집."],["동료","형, 그거 알아? 경매로 집 받아서 고쳐 파는 사람 많대."],["재훈","얼마에 받아서?"]]},
    {bg:"bg_living_clean_old", amb:"room|clear|in", sfx:"reveal", ui:{type:"listing", t:"검색: 부동산 경매", a:"감정가 1억 4,500만원", b:"최저가 1억 200만원"}, lines:[[null,"마우스를 어색하게 움직인다. 독수리 타법."],["재훈","집은 괜찮은데."],["재훈","가격이 문제네."]]}],
  eunkyung:[
    {bg:"bg_room_clean", amb:"room|clear|in", ui:{type:"bank", t:"정기예금 연 2.9%", s:"은행 앱 · 금리 안내"}, lines:[[null,"마포 오피스텔. 아침 커피, 태블릿, 은행 앱."],["은경","이걸로는…"],[null,"계산기를 두드린다."],["은경","물가도 못 따라가겠네."]]},
    {bg:"bg_room_clean", amb:"room|clear|in", sfx:"message", lines:[["친구(전화)","너 퇴직했으니까 이제 좀 쉬어."],["은경","돈이 쉬면 안 되지."]]},
    {bg:"bg_room_clean", amb:"room|clear|in", sfx:"reveal", ui:{type:"sheet", rows:[["감정가","145,000,000"],["최저가","102,000,000"],["예상 매도가","155,000,000 ?"],["예상 수익률","38.4% ?!"]]}, lines:[[null,"우연히 본 경매 기사. 숫자를 옮겨 적는다."],["은경","잠깐…"],[null,"엑셀을 연다."]]}],
  taesik:[
    {bg:"bg_living_clean_old", amb:"house|clear|in", lines:[[null,"아침. 목동 오래된 아파트. TV 뉴스가 혼자 떠든다."],[null,"신문과 부동산 전단을 넘긴다."]]},
    {bg:"bg_living_clean_old", amb:"house|clear|in", sfx:"message", lines:[["중개사(전화)","형님, 요즘도 집 보세요?"],["태식","심심해서 보는 거지."],["중개사(전화)","그럼 경매 하나 있는데…"],["태식","경매?"],["중개사(전화)","싸긴 싸요."],["태식","싸다는 말이 제일 비싼 말인데."]]},
    {bg:"bg_living_clean_old", amb:"house|clear|in", ui:{type:"login", t:"비밀번호가 일치하지 않습니다 (5회 오류)"}, lines:[[null,"안경을 쓰고 컴퓨터를 켠다. 로그인 화면."],["태식","아니, 비밀번호가 또 뭐야."],["손녀(전화)","할아버지, 대문자요. 첫 글자 대문자!"]]},
    {bg:"bg_living_clean_old", amb:"house|clear|in", sfx:"reveal", ui:{type:"listing", t:"서울 오래된 빌라 3층", a:"감정가 1억 4,500만원", b:"최저가 1억 200만원"}, lines:[["태식","음…"],["태식","이 가격이면 한번 볼 만한데."]]}]};
const LF_PRELUDE = ["서울, 2026년.", "누군가는 집을 사려고 경매를 시작하고,", "누군가는 돈을 벌려고 시작한다.", "그리고 누군가는 — 그냥, 싸게 나온 집 하나를 발견했을 뿐이었다."];
let GX_OP = null;      // {id, i(장면), j(대사), el, t, done}
function gxUiHTML(ui){
  if(!ui) return "";
  if(ui.type === "bank") return `<div class="gx-ui gx-bank"><small>${esc(ui.s || "")}</small><b>${esc(ui.t)}</b></div>`;
  if(ui.type === "listing") return `<div class="gx-ui gx-listing"><small>🔨 법원 경매 정보</small><b>${esc(ui.t)}</b><span>${esc(ui.a)}</span><em>${esc(ui.b)}</em></div>`;
  if(ui.type === "phone") return `<div class="gx-ui gx-phone">${ui.rows.map(r => `<div><span>${esc(r[0])}</span><b class="${r[2]}">${esc(r[1])}</b></div>`).join("")}</div>`;
  if(ui.type === "pos") return `<div class="gx-ui gx-pos"><small>POS · 마감 정산</small><b>${esc(ui.t)}</b></div>`;
  if(ui.type === "sheet") return `<div class="gx-ui gx-sheet">${ui.rows.map(r => `<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join("")}</div>`;
  if(ui.type === "login") return `<div class="gx-ui gx-login"><small>로그인</small><span>●●●●●●</span><em>${esc(ui.t)}</em></div>`;
  return "";
}
function gxOpStart(id){
  gxOpEnd(true);
  const C = LF_CHARS.find(x => x.id === id); if(!C) return;
  const el = document.createElement("div"); el.id = "gxOp"; el.className = "gx-op"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `${C.name} 오프닝`);
  el.innerHTML = `<div class="gx-bg"></div><div class="gx-cine"></div><div class="gx-ui-slot"></div><div class="gx-box" hidden><div class="gx-who"></div><div class="gx-text"></div><span class="gx-next">▼</span></div>
    <button type="button" class="gx-skip" data-gxskip>SKIP ▶▶</button><div class="gx-title" hidden></div>`;
  document.body.appendChild(el);
  GX_OP = {id, i:-1, j:0, el, seq:[]};
  // 전용 음악: 선택 화면 곡을 낮추고 캐릭터 곡으로(크로스페이드)
  if(typeof kaWant === "function"){ KA_UNLOCKED = true; kaCtx(); kaWant("op_" + id); }
  gxPrelude(0);
}
function gxPrelude(k){
  const O = GX_OP; if(!O) return;
  const cine = O.el.querySelector(".gx-cine");
  if(k === 0){ cine.innerHTML = `<div class="gx-ep"><small>경매왕</small><b>EP.0</b><h2>「${esc(LF_EP0[O.id])}」</h2></div>`; O.t = setTimeout(() => gxPrelude(1), gxMs(2600)); return; }
  if(k <= LF_PRELUDE.length){ cine.innerHTML = `<p class="gx-line">${esc(LF_PRELUDE[k - 1])}</p>`; O.t = setTimeout(() => gxPrelude(k + 1), gxMs(k === LF_PRELUDE.length ? 2600 : 1800)); return; }
  cine.innerHTML = ""; gxScene(0);
}
function gxScene(i){
  const O = GX_OP; if(!O) return;
  const sc = LF_OPENINGS[O.id][i]; if(!sc) return gxOpFinale();
  O.i = i; O.j = 0;
  const bg = O.el.querySelector(".gx-bg"), u = artUrl(sc.bg) || artUrl("bg_office_1");
  const img = document.createElement("div"); img.className = "gx-bgimg"; img.style.backgroundImage = u ? `url("${u}")` : "none";
  bg.appendChild(img); requestAnimationFrame(() => img.classList.add("on"));
  [...bg.children].slice(0, -1).forEach(x => { x.classList.remove("on"); setTimeout(() => x.remove(), 900); });
  const slot = O.el.querySelector(".gx-ui-slot"); slot.innerHTML = gxUiHTML(sc.ui); slot.classList.toggle("low", sc.uiPos === "low"); slot.classList.toggle("right", sc.uiPos === "right"); img.style.backgroundPosition = sc.pos || "center";
  if(sc.amb && typeof snAmbWant === "function"){ GX_AMB = sc.amb; snAmbWant(kaCfg().mute ? null : sc.amb); }
  if(sc.sfx) setTimeout(() => { if(sc.sfx === "chime" && typeof snChime === "function") snChime(); else if(typeof kcSfx === "function") kcSfx(sc.sfx); }, 350);
  O.el.querySelector(".gx-box").hidden = true;
  O.t = setTimeout(() => gxLine(), gxMs(700));
}
let GX_AMB = null;
function gxLine(){
  const O = GX_OP; if(!O) return;
  const sc = LF_OPENINGS[O.id][O.i]; if(!sc) return;
  if(O.j >= sc.lines.length) return gxScene(O.i + 1);
  const [who, t] = sc.lines[O.j], box = O.el.querySelector(".gx-box"), tx = box.querySelector(".gx-text");
  box.hidden = false; box.classList.toggle("narr", !who); box.querySelector(".gx-who").textContent = who || "";
  box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
  clearTimeout(tx._t); let n = 0; tx.textContent = ""; O.typing = true;
  const tick = () => { if(GX_OP !== O) return; n += 2; tx.textContent = t.slice(0, n); if(n < t.length) tx._t = setTimeout(tick, gxLevel() === "min" ? 5 : 32); else { O.typing = false; O.t = setTimeout(gxAdvance, gxMs(1500 + t.length * 30)); } };
  tick();
  if(who && typeof snReact === "function" && kaCfg().react){ const kind = /\?|잠깐|응\?|예\?/.test(t) ? "surprise" : /…|\.\.\./.test(t) ? "doubt" : null; if(kind) snReact(kind, /서윤|미정|은경|손녀|친구/.test(who) ? "f" : "m"); }
}
function gxAdvance(){
  const O = GX_OP; if(!O) return; clearTimeout(O.t);
  const tx = O.el.querySelector(".gx-text"), sc = LF_OPENINGS[O.id][O.i];
  if(O.typing && sc){ clearTimeout(tx._t); tx.textContent = sc.lines[O.j][1]; O.typing = false; O.t = setTimeout(gxAdvance, gxMs(1800)); return; }
  if(O.i < 0) { clearTimeout(O.t); O.el.querySelector(".gx-cine").innerHTML = ""; return gxScene(0); }
  O.j++; gxLine();
}
function gxOpFinale(){
  const O = GX_OP; if(!O) return;
  const t = O.el.querySelector(".gx-title"), C = LF_CHARS.find(x => x.id === O.id);
  O.el.querySelector(".gx-box").hidden = true; O.el.querySelector(".gx-ui-slot").innerHTML = "";
  t.hidden = false; t.innerHTML = `<small>경매왕</small><h2>EP.0 「${esc(LF_EP0[O.id])}」</h2><p>${esc(LF_EP0_SUB[O.id])}</p>`;
  if(typeof kcSfx === "function") kcSfx("stamp");
  O.i = 999; O.t = setTimeout(() => gxOpEnd(false), gxMs(3200));
}
function gxOpEnd(silent){
  const O = GX_OP; if(!O) return; GX_OP = null; GX_AMB = null; clearTimeout(O.t);
  lfOpsSeen()[O.id] = Date.now();
  const L = lfRec(); if(L && L.char === O.id && L.intro){ L.intro = false; lfLog(`🌱 ${lfChar().name}의 경매 인생 시작 — ${lfBaseInfo().t}`); if(typeof save === "function") save(); }
  if(silent){ O.el.remove(); return; }
  // 오프닝 → 거점: 검은 화면으로 덮은 채 거점을 그리고 천천히 걷어 낸다(음악·환경음도 같이 넘어간다)
  O.el.classList.add("out");
  setTimeout(() => { O.el.remove(); }, 900);
  LF_SPOT = "laptop"; arenaTab = "life"; renderArena(); window.scrollTo(0, 0);
  gxBanner("place", {big:`${lfChar().emo} ${esc(lfBaseInfo().t)}`, sub:esc(lfClock())});
}
document.addEventListener("click", e => {
  if(!GX_OP) return;
  if(e.target.closest("[data-gxskip]")){ e.stopPropagation(); if(GX_OP.i === 999) return gxOpEnd(false); gxOpFinale(); return; }
  if(e.target.closest("#gxOp")){ if(GX_OP.i === 999) return; gxAdvance(); }
});
document.addEventListener("keydown", e => { if(!GX_OP) return; if(e.key === "Escape"){ gxOpFinale(); } else if(e.key === "Enter" || e.key === " "){ e.preventDefault(); if(GX_OP.i !== 999) gxAdvance(); } });
// 오프닝 도중엔 음악·환경음을 오프닝이 쥔다
const _gx_kaScene = kaScene; kaScene = function(){
  if(GX_OP) return "op_" + GX_OP.id;
  if(typeof page !== "undefined" && page === "arena" && arenaTab === "life"){ if(!lfOn()) return "select"; const h = lfDate().h; return h >= 20 || h < 6 ? "base_night" : "home"; }
  return _gx_kaScene();
};
if(typeof snAmbKey === "function"){ const _gx_ambKey = snAmbKey; snAmbKey = function(){ if(GX_OP && GX_AMB) return GX_AMB; if(typeof page !== "undefined" && page === "arena" && arenaTab === "life" && lfOn()){ const D = lfDate(), W = typeof snWeatherOf === "function" ? snWeatherOf(snDate(D.ms)).id : "clear"; return `room|${W}|in`; } return _gx_ambKey(); }; }

/* ---------- 🎭 캐릭터 선택 — 6개의 인생 ---------- */
const LF_STARS = {seoyun:{cash:1, time:5, sta:5, info:5, nego:2, field:2}, dohyun:{cash:2, time:2, sta:4, info:4, nego:3, field:3}, mijeong:{cash:3, time:3, sta:3, info:3, nego:5, field:3},
  jaehoon:{cash:3, time:3, sta:3, info:2, nego:3, field:5}, eunkyung:{cash:4, time:4, sta:2, info:3, nego:3, field:3}, taesik:{cash:5, time:4, sta:1, info:1, nego:5, field:5}};
const LF_STAR_NAMES = [["cash","자본"],["time","시간"],["sta","체력"],["info","조사"],["nego","협상"],["field","현장"]];
let LF_DETAIL = false;
lfSelectHTML = function(){
  const cur = LF_PICK, C = cur ? LF_CHARS.find(x => x.id === cur) : null;
  const stars = id => `<ul class="lf-stars">${LF_STAR_NAMES.map(([k, t]) => `<li><span>${t}</span><b>${"★".repeat(LF_STARS[id][k])}<i>${"★".repeat(5 - LF_STARS[id][k])}</i></b></li>`).join("")}</ul>`;
  const cards = LF_CHARS.map(x => `<button type="button" class="lf-card ${x.id === cur ? "on" : ""} ${cur && x.id !== cur ? "dim" : ""}" data-lfpick="${x.id}" data-lfhover="${x.id}"><span class="lf-emo">${x.emo}</span><b>${esc(x.name)}</b><small>${x.age}세 · ${esc(x.job)}</small><em>“${esc(LF_ECON[x.id].quote)}”</em>${stars(x.id)}${lfOpsSeen()[x.id] ? `<small class="lf-seen">🎬 오프닝 봄</small>` : ""}</button>`).join("");
  let detail = "";
  if(C){
    const E = LF_ECON[C.id], B = LF_BASES[C.base];
    detail = `<div class="lf-focus"><div class="lf-dhead"><span class="lf-emo big">${C.emo}</span><div><small>EP.0</small><b>「${esc(LF_EP0[C.id])}」</b><p class="lf-quote">“${esc(E.quote)}”</p></div></div>
      <div class="lf-life"><b>🧭 이 캐릭터의 삶</b><p>${esc(E.life)}</p></div>
      <div class="lf-cond"><span>🏠 ${esc(B.t)}</span><span>💰 시작 자본 ${kMan(C.cash)}</span><span>💳 수입 ${E.inc[0] === E.inc[1] ? kMan(E.inc[0]) : `${kMan(E.inc[0])}~${kMan(E.inc[1])}`}/월 · ${esc(E.incT)}</span><span>🧾 고정비 ${kMan(E.fixed)}/월 (${esc(E.housing)})</span><span>⛓️ ${esc(E.liabT)}</span></div>
      ${LF_DETAIL ? `<div class="lf-cols"><ul class="lf-stats">${Object.entries(C.st).map(([k, v]) => `<li><span>${LF_STAT_NAMES[k]}</span><i class="lf-bar"><i style="width:${v}%" class="${v >= 80 ? "hi" : v < 45 ? "low" : ""}"></i></i><b>${v}</b></li>`).join("")}</ul><div><b>✨ 패시브</b><ul>${C.passives.map(p=>`<li>${p[0]} <b>${esc(p[1])}</b> — ${esc(p[2])}</li>`).join("")}</ul><b>👍</b> ${C.pros.map(esc).join(" · ")}<br><b>👎</b> ${C.cons.map(esc).join(" · ")}</div></div>` : ""}
      <div class="lf-focus-btns"><button type="button" class="btn pri lf-go" data-lfstart="${C.id}">▶ 이 인생으로 시작</button><button type="button" class="btn" data-lfdetail>${LF_DETAIL ? "숫자 접기" : "📊 상세 보기(실제 수치)"}</button><button type="button" class="btn" data-lfpick="">↩ 다른 사람 보기</button></div>
      <label class="lf-opt"><input type="checkbox" data-gxopt="alwaysOp" ${gxCfg().alwaysOp || !lfOpsSeen()[C.id] ? "checked" : ""}> 오프닝 보기${lfOpsSeen()[C.id] ? "" : " (처음이라 자동으로 재생돼요)"}</label>
      ${kcRec().cases ? `<small class="note down">⚠ 지금 커리어(보유자금·경매 기록)는 새 인생으로 바뀌어요. 레벨·도감·업적은 그대로예요.</small>` : ""}</div>`;
  }
  return `<div class="lf-sel ${cur ? "picked" : ""}"><div class="lf-sel-bg">${vnBgHTML("bg_villa_night")}</div><div class="lf-sel-in"><h3>🎭 누구의 경매 인생을 시작할까요?</h3><p class="note">최강 캐릭터는 없어요 — 여섯 명은 <b>서로 다른 인생</b>을 살던 사람들이에요. 마우스를 올리면(터치하면) 그 사람의 음악이 잠깐 흘러요.</p>
    <div class="lf-cards">${cards}</div>${detail}</div></div>`;
};
document.addEventListener("pointerenter", e => { const b = e.target.closest && e.target.closest("[data-lfhover]"); if(b) gxMotif(b.dataset.lfhover); }, true);
document.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena" || arenaTab !== "life") return;
  let b;
  if((b = e.target.closest("[data-lfpick]"))){ e.stopImmediatePropagation(); LF_PICK = b.dataset.lfpick || null; LF_DETAIL = false; if(LF_PICK) gxMotif(LF_PICK); renderArena(); return; }
  if(e.target.closest("[data-lfdetail]")){ LF_DETAIL = !LF_DETAIL; renderArena(); return; }
  if((b = e.target.closest("[data-lfstart]"))){
    e.stopImmediatePropagation();
    const id = b.dataset.lfstart;
    if(kcRec().cases && !safeConfirm("지금 커리어(보유자금·경매 기록)를 새 인생으로 바꿀까요? 레벨·도감·업적은 남아요.")) return;
    const want = (document.querySelector("[data-gxopt=alwaysOp]") || {}).checked !== false;
    lfNew(id); K = null; LF_SPOT = "laptop"; LF_PICK = null;
    if(want || !lfOpsSeen()[id]){ gxOpStart(id); }
    else { lfRec().intro = false; arenaTab = "life"; renderArena(); gxBanner("place", {big:`${lfChar().emo} ${esc(lfBaseInfo().t)}`, sub:esc(lfClock())}); }
    return;
  }
}, true);
// 기존 인트로 패널(오프닝이 없을 때 대비)은 그대로 두되, 오프닝 다시 보기 버튼을 단다
const _gx_intro = lfIntroHTML; lfIntroHTML = function(){ return _gx_intro().replace('<button type="button" class="btn pri lf-go" data-lfbegin', `<button type="button" class="btn" data-gxreplay="${lfRec().char}">🎬 오프닝 보기</button><button type="button" class="btn pri lf-go" data-lfbegin`); };

/* ---------- 🧭 거점: 인생 갈림길 · 벽: 후일담·오프닝 갤러리 ---------- */
const _gx_basePanel = lfPanel; lfPanel = function(id){
  let h = _gx_basePanel(id); const L = lfRec();
  if(L && lfPathDue() && id !== "board"){ const P = LF_PATHS[L.char]; h = `<div class="panel lf-path"><b>🧭 인생의 갈림길</b>${lfPathArt(L.char)}<p>${esc(P.q)}</p><div class="lf-acts">${P.opts.map(o => `<button type="button" class="ag-act" data-lfpath="${o.id}"><span><b>${esc(o.t)}</b><span class="note" style="display:block">${esc(o.d)}</span></span></button>`).join("")}</div><small class="note">한 번 고르면 되돌릴 수 없어요 — 인생이니까요.</small></div>` + h; }
  if(id === "wall" && L){
    const c = kcRec(), seen = lfOpsSeen();
    const eps = LF_CHARS.map(C => { const E = LF_EPILOGUES[C.id], mine = C.id === L.char, open = mine && (L.epi || {})[C.id]; return `<li class="${open ? "" : "off"}"><b>${C.emo} ${esc(E.t)}</b> <small>${esc(E.need)}</small>${open ? `${lfEpiArt(C.id)}<p>${esc(E.txt)}</p>` : mine ? "" : `<small class="note"> — ${esc(C.name)}(으)로 플레이하면</small>`}</li>`; }).join("");
    const ops = LF_CHARS.filter(C => seen[C.id]).map(C => `<button type="button" class="btn" data-gxreplay="${C.id}">🎬 ${C.emo} EP.0 「${esc(LF_EP0[C.id])}」</button>`).join("");
    h += `<div class="panel"><b>🎞️ 오프닝 다시 보기</b><div class="lf-acts">${ops || `<small class="note">아직 본 오프닝이 없어요.</small>`}</div></div><div class="panel"><b>📜 후일담</b><ul class="lf-epi">${eps}</ul></div>
      <div class="panel"><b>⚙️ 연출</b><div class="lf-acts"><label>화면 전환 효과 <select data-gxopt="level"><option value="max" ${gxLevel()==="max"?"selected":""}>많음 — DAY 배너·몽타주·장소 이동 전부</option><option value="mid" ${gxLevel()==="mid"?"selected":""}>보통</option><option value="min" ${gxLevel()==="min"?"selected":""}>최소 — 짧은 페이드만</option></select></label><label><input type="checkbox" data-gxopt="alwaysOp" ${gxCfg().alwaysOp?"checked":""}> 새 게임 때 오프닝 항상 재생</label></div></div>`;
  }
  return h;
};
// 📜 후일담 그림(받은 것만 — 없으면 글만 나온다)
const LF_EPI_ART = {seoyun:"c3df39f3a36120ec5cf79e6211431a03", dohyun:"afbb2cd72cae47ae2f9083f088f3f424", mijeong:"b46ee9e6d7e460befd0ff135d8b6b100", jaehoon:"99f86598dcb8e03cbb03482e56f1fe74", eunkyung:"6afe731dc314968ceaffbbbeac6cdf95", taesik:"e0de2d65e9e8a4d12170fe2fd1057037"};
function lfEpiArt(id){ const a = LF_EPI_ART[id]; return a ? `<div class="lf-epi-art"><img src="${window.GMW_STANDALONE ? "assets/" + a + ".webp" : "/_blob/" + a}" alt="" loading="lazy"></div>` : ""; }
// 🧭 갈림길 그림(선택하기 직전의 한 장면 — 받은 것만)
const LF_PATH_ART = {seoyun:"ad0b9616be23554d9c7f33379aba8142", dohyun:"fed63df3aa0f18717cdf98f7e4e24b15", mijeong:"9668d079b4fd9e38179ee79dbe03eaf0", jaehoon:"0d749dade70a04fcbc90269967fc214a", eunkyung:"82b76888cd5518170a2c3f4d66ddc296", taesik:"5c27e9ea782b7ddc10065d26675bee87"};
/* 장면 그림 — 첫 경매·패찰·1년 결산·돌아보기·CASE 002 수리 완료 */
const GMW_SCENE_ART = {k2cover:"d8585bdaaac505eaa9c034c8b5059d69", k2leak:"2bf2c7447b56ac406d70f866359cbdec", first:"32c2c87c3cd96d0c0e3485a69b9bae27", lost:"98e3c5a454615340ac6e02ea9f29ecf9", settle:"1e98eb088d86682b20d380b2c34c1573", review:"121e337265bfcb0de0d59f9a55b9c7d4", k2fixed:"0f50655c0e2f89baef264e2d226f9f21", k2cross:"4cc71a3f08658b459ec7e3fa2b7a87dd", k2recur:"92aab5e56f1016ca0291b6374b1f2faa", k2claim:"3286aea865d6e6f20f558a3f244bff8b", k2rival:"bda28edd1da122b04afe20372f65ee5e", k2deal:"278afc367148f5d7cc2edf6b253eacc2", k2exit:"bb29f8efc426535974e173b2d473dc22", k2forfeit:"476ab476bcacee6022fc6fa8292e0ee3", k2honest:"6d65591fbfacabbafb0a0ea14f98daf7"};
/* 자산 등급 물건 그림 — KC_TIERS 순서  */
const KC_TIER_ART = ["febc232854a4dbad7083cf37390c73b5", "b6b3a4a90bc6c97b4d8bc086732b1c7c", "c627509e92c4ddcc893ebdcc0f7dd376", "df92584c05f9bc6d507b356657dfada6", "2a8dfdb772506c5c95f3cb52db0ace67"];
function gmwSceneArt(k){ const a = GMW_SCENE_ART[k]; return a ? `<div class="lf-epi-art gmw-scene" data-scene="${k}"><img src="${window.GMW_STANDALONE ? "assets/" + a + ".webp" : "/_blob/" + a}" alt="" loading="lazy"></div>` : ""; }
function lfPathArt(id){ const a = LF_PATH_ART[id]; return a ? `<div class="lf-epi-art lf-path-art"><img src="${window.GMW_STANDALONE ? "assets/" + a + ".webp" : "/_blob/" + a}" alt="" loading="lazy"></div>` : ""; }
function lfEpiCheck(){ const L = lfRec(); if(!L) return; L.epi = L.epi || {}; const E = LF_EPILOGUES[L.char]; if(E && !L.epi[L.char] && E.ok(kcRec(), L)){ L.epi[L.char] = L.t; if(typeof HUB_TOAST !== "undefined") HUB_TOAST.push({t:`📜 후일담 해금 — 「${E.t}」 (벽에서 읽기)`, big:true}); } }
const _gx_titles = lfTitles; lfTitles = function(){ _gx_titles(); lfEpiCheck(); };
document.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena") return;
  let b;
  if((b = e.target.closest("[data-gxreplay]"))){ e.stopImmediatePropagation(); const id = b.dataset.gxreplay; gxOpStart(id); return; }
  if(arenaTab !== "life" || !lfOn()) return;
  if((b = e.target.closest("[data-lfpath]"))){ const L = lfRec(), P = LF_PATHS[L.char], o = P.opts.find(x => x.id === b.dataset.lfpath); if(!o || L.path) return;
    L.path = o.id; if(o.once) o.once(L); lfLog(`🧭 인생의 갈림길 — ${o.t}`); gxBanner("big", {big:`🧭 ${esc(o.t)}`, sub:esc(o.d)}); if(typeof kcSfx === "function") kcSfx("stamp"); if(typeof save === "function") save(); renderArena(); }
});
document.addEventListener("change", e => {
  const t = e.target; if(!t || !t.matches || !t.matches("[data-gxopt]")) return;
  const c = gxCfg(); if(t.dataset.gxopt === "level") c.level = t.value; else c[t.dataset.gxopt] = t.checked; gxSave(c);
});

/* ---------- 🎞️ 화면 전환 엔진 ----------
   로직은 늘 즉시(동기) 그린다 — 전환은 그 위에 덮였다 걷히는 '겉모습'만. 그래서 클릭·테스트·저장 순서가 절대 꼬이지 않는다. */
function gxCfg(){ try{ return Object.assign({level:"mid", alwaysOp:false}, JSON.parse(localStorage.getItem("gmw_fx") || "{}")); }catch(e){ return {level:"mid", alwaysOp:false}; } }
function gxSave(c){ try{ localStorage.setItem("gmw_fx", JSON.stringify(c)); }catch(e){} }
function gxLevel(){ if(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return "min"; return gxCfg().level; }
function gxMs(ms){ return gxLevel() === "min" ? Math.round(ms * 0.35) : ms; }
let GX_VEIL = null;
// kinds: place(장소 이동) · day(날짜) · case(CASE 열기/닫기) · big(큰 사건) · montage(시간 경과)
function gxBanner(kind, o){
  const lv = gxLevel(); if(lv === "min") return;
  if(lv === "mid" && (kind === "montage" || kind === "move")) return;
  if(GX_VEIL) GX_VEIL.remove();
  const el = document.createElement("div"); el.className = `gx-veil k-${kind}`; el.setAttribute("aria-hidden", "true");
  if(kind === "montage") el.innerHTML = `<div class="gx-mont">${o.frames.map((f, i) => `<div class="gx-fr" style="animation-delay:${i * 0.32}s"><b>${f.b}</b><span>${f.s}</span></div>`).join("")}</div>`;
  else el.innerHTML = `<div class="gx-card">${o.top ? `<small>${o.top}</small>` : ""}<b>${o.big}</b>${o.sub ? `<span>${o.sub}</span>` : ""}</div>`;
  const dur = kind === "montage" ? 900 + o.frames.length * 320 : kind === "case" || kind === "big" ? 1500 : kind === "day" ? 1250 : 850;
  el.style.setProperty("--gxd", dur + "ms");
  document.body.appendChild(el); GX_VEIL = el;
  setTimeout(() => { if(el.parentNode) el.remove(); if(GX_VEIL === el) GX_VEIL = null; }, dur + 60);
}
function gxDateLine(ms){ const D = snDate(ms), W = snWeatherOf(D); return `${D.y}년 ${D.m}월 ${D.d}일 · ${SN_DOW[D.dow]}요일 · ${W.ic} ${W.t}`; }
let GX_LAST = {};
function gxSnap(){ return {page:typeof page !== "undefined" ? page : "", tab:arenaTab, spot:typeof LF_SPOT !== "undefined" ? LF_SPOT : "", life:lfOn() ? lfRec().t : null, seed:K ? K.seed : null, step:K ? K.step : null, intro:K ? !!K.intro : null, loc:K ? K.loc : null, rday:K && K.lf ? K.lf.rday : null, sealed:K ? !!K.sealed : null, day:K ? K.day : null, weeks:K && K.sale ? K.sale.weeks : null, rev:K ? !!K.revealing : null, bn:typeof bdRec === "function" && kcRec().board ? kcRec().board.n : null}; }
function gxAfterRender(){
  const P = GX_LAST, N = gxSnap(); GX_LAST = N;
  if(GX_OP || !P.tab || N.page !== "arena") return;
  const root = document.getElementById("kfsRoot"), lv = gxLevel();
  // A. 일반 이동 — 짧은 페이드(단계적 등장: 배경 → 인물 → 대화창)
  const soft = cls => { if(!root) return; root.classList.remove("gx-in", "gx-panel"); void root.offsetWidth; root.classList.add(cls); };
  if(P.tab !== N.tab || (N.tab === "king" && P.seed !== N.seed) || (N.tab === "king" && P.step !== N.step)) soft("gx-in");
  else if(P.spot !== N.spot || P.loc !== N.loc || P.rday !== N.rday) soft("gx-panel");
  if(lv === "min") return;
  // B. 거점: 자고 일어남·한 주 넘김 = 날짜 변화
  if(N.tab === "life" && P.tab === "life" && N.life != null && P.life != null && N.life - P.life >= 360) gxBanner("day", {top:"──── " + (N.bn && P.bn && N.bn > P.bn ? `${N.bn}주차` : "다음 날") + " ────", big:gxDateLine(LF_EPOCH + N.life * 60000), sub:esc(lfClock())});
  if(N.tab !== "king" || !K) return;
  // C. CASE 열기
  if(typeof pxCaseOpen !== "function" && N.seed !== P.seed && !N.intro) gxBanner("case", {top:"CASE FILE", big:`📁 CASE ${String(KP.no || 1).padStart(3, "0")}`, sub:esc(KP.title)});
  if(N.seed === P.seed){
    // D. 조사: 장소 이동 · 다음 날
    if(N.rday !== P.rday && N.rday != null) gxBanner("day", {top:`──── 조사 ${N.rday + 1}일차 ────`, big:gxDateLine(LF_EPOCH + (K.lf.day0 + N.rday * 1440) * 60000), sub:esc(bdClock().txt)});
    else if(N.loc !== P.loc && N.step === "brief") gxBanner("move", {big:N.loc === "site" ? `🚶 현장으로 이동 중…` : `🏠 집으로 돌아가는 중…`, sub:N.loc === "site" ? `이동 ${krFmt(krTravel({loc:"site"}) || KP.travel || 60)}` : ""});
    // E. 큰 사건
    if(N.sealed && !P.sealed) gxBanner("big", {top:"입찰기일", big:"⚖️ 법원 입찰법정", sub:K.cal0 ? gxDateLine(K.cal0) : ""});
    if(N.step !== P.step){
      if(N.step === "move" || (N.step === "cross" && KP.id !== "k2")) gxBanner("move", {big:"🚪 점유자를 만나러 간다", sub:""});
      if(typeof pxCaseOpen !== "function" && N.step === "defect") gxBanner("big", {top:"명도 완료", big:"🔑 드디어, 문을 연다", sub:`DAY ${K.day}`});
      if(N.step === "sell") gxBanner("move", {big:"🏢 중개사무소에 매물을 내놓았다", sub:""});
      if(typeof pxCaseOpen !== "function" && N.step === "result") gxBanner("case", {top:"CASE CLOSED", big:`📁 CASE ${String(KP.no || 1).padStart(3, "0")} 종료`, sub:K.final ? `${K.final.profit >= 0 ? "+" : "−"}${kMan(Math.abs(Math.round(K.final.profit)))}` : ""});
    }
    // F. 시간 경과 몽타주(많음) — 공사·명도 기다림·매도 기다림
    if(N.step === P.step && N.day != null && P.day != null && N.day - P.day >= 3 && ["move","defect","list","sell"].includes(N.step) && !N.rev){
      const frames = [], from = P.day, to = N.day, k = Math.min(4, to - from);
      for(let i = 1; i <= k; i++){ const d = Math.round(from + (to - from) * i / k), ms = (K.cal0 || 0) + d * 864e5, W = snWeatherOf(snDate(ms)); frames.push({b:`DAY ${d}`, s:`${W.ic} ${W.t} · ${N.step === "sell" ? "📞 문의 기다리는 중" : N.step === "move" ? "📦 이삿날을 기다린다" : "🔨 공사 중"}`}); }
      gxBanner("montage", {frames});
    }
  }
}
const _gx_render = renderArena; renderArena = function(){ _gx_render(); queueMicrotask(gxAfterRender); };
// '많음'에서는 몽타주가 DAY 배너를 대신한다(겹치지 않게)
if(typeof keDayBanner === "function"){ const _gx_dayB = keDayBanner; keDayBanner = function(a, b){ if(gxLevel() === "max" && b - a >= 3) return; if(gxLevel() === "min") return; return _gx_dayB(a, b); }; }
// 소리 메뉴에 연출 설정도 같이
const _gx_sfxBtn = kcSfxBtn; kcSfxBtn = function(){ return _gx_sfxBtn().replace('<div class="sn-test">', `<label class="kc-audio-mute">🎞️ 화면 전환 <select data-gxopt="level"><option value="max" ${gxLevel()==="max"?"selected":""}>많음</option><option value="mid" ${gxLevel()==="mid"?"selected":""}>보통</option><option value="min" ${gxLevel()==="min"?"selected":""}>최소</option></select></label><div class="sn-test">`); };
