/* ================= 📭 패찰 뒤 흐름 — "끝"이 아니라 "다음 물건으로" =================
   새 시스템을 만들지 않고 이미 있는 것만 다시 배치한다:
   개찰표·판단 평가(firstrun.js)·입찰표 수익 모델(qa1.js qaBidModel)·경험치(hub.js)·
   NPC 기억(week.js nmRec)·놓친 물건 후일담(deep.js)·경매 게시판(week.js).
   ① 패찰 화면 맨 위에 "이 가격이면 어떤 거래였나"를 숫자로(내 정보로 본 예상 수익 — 숨은 진짜 값은 안 쓴다)
   ② "이 판에서 남은 것" — 실제로 남는 것만(경험치·만난 사람·기록·나중에 올 소식)
   ③ 메인 버튼 = ▶ 다음 물건 보러 가기(게시판), 보조 = 🏠 오늘은 여기까지
   ④ 게시판 첫 도착 때 한 번만 "이번에는 당신이 고릅니다" */
let LW_TIP = false;
function lwOn(){ return K && K.step === "lost" && !K.revealing && (K.mode || "career") === "career" && K.result; }
function lwSummaryHTML(){
  const R = K.result, me = +K.bid || 0, win = R.other ? R.other.amt : (R.bids && R.bids[0] ? R.bids[0].amt : 0), gap = win - me;
  let M = null; try{ M = typeof qaBidModel === "function" ? qaBidModel() : null; }catch(e){ M = null; }
  const s = v => (v >= 0 ? "+" : "−") + kMan(Math.abs(Math.round(v / 10) * 10));
  const rng = amt => M ? `${s(M.net(M.band.lo, amt))} ~ ${s(M.net(M.band.hi, amt))}` : "—";
  const line = M ? (win > M.z.agg ? `1등 가격은 내 정보로 본 <b>남기기 어려운 선(${kMan(M.z.agg)})</b>을 넘었어요.` : `1등 가격도 내 정보로 본 남는 선(${kMan(M.z.agg)}) 안이었어요 — 따라가도 남았을 수 있어요.`) : "";
  const later = typeof dpRec === "function" && dpRec().after.some(x => x.kind === "lost" && !x.seen && x.my === me && x.win === win);
  return `<div class="lw-sum">
    <div class="lw-grid"><span>내 입찰가</span><b>${kMan(me)}</b><span>낙찰가(1등)</span><b>${kMan(win)}</b><span>차이</span><b class="down">+${kMan(gap)}</b>${M ? `<span>내 정보로 본 남는 선</span><b>${kMan(M.z.agg)}</b>` : ""}</div>
    ${M ? `<div class="lw-if"><div><small>내 가격(${kMan(me)})에 샀다면</small><b>${rng(me)}</b></div><div><small>1등 가격(${kMan(win)})에 샀다면</small><b>${rng(win)}</b></div></div>
    <p class="note">${line} <b>${kMan(gap)} 더 썼으면 이겼다</b>가 아니라, <b>그 돈을 더 쓰면 어떤 거래가 됐는지</b>를 보세요. (입찰표와 같은 계산 — 내가 조사한 정보 기준)</p>` : ""}
    ${later ? `<p class="lw-later">🔭 그 가격이 좋은 가격이었을까요? <b>결과는 며칠 뒤 알 수 있어요</b> — 그 집이 어떻게 됐는지 소식이 올 거예요.</p>` : ""}
  </div>`;
}
function lwKeptHTML(){
  const items = [];
  items.push(`⭐ 경험치·명성 — 패찰도 경험으로 쌓였어요`);
  const met = K._met ? Object.keys(K._met).length : 0; if(met) items.push(`🧠 이번에 만난 사람 ${met}명 — 다음에 만나면 알아봐요(몇 번째 만남인지·시세 적중 기록)`);
  items.push(`🗂️ 이 CASE는 지난 물건 기록에 남았어요`);
  if(typeof dpRec === "function" && dpRec().after.some(x => x.kind === "lost" && !x.seen)) items.push(`📱 놓친 집이 어떻게 됐는지 나중에 연락이 와요`);
  return `<div class="panel lw-kept"><b>이 판에서 남은 것</b><ul>${items.map(t => `<li>${t}</li>`).join("")}</ul></div>`;
}
const _lw_kingHTML = kingHTML; kingHTML = function(){
  let h = _lw_kingHTML();
  if(!lwOn()) return h;
  // ① 개찰 요약 — 패찰 칸 제목 바로 밑
  h = h.replace(/(<div class="panel k-bidres lose"><h3>[\s\S]*?<\/h3>)/, `$1${lwSummaryHTML()}`);
  // ③ 메인 버튼 바꾸기 — 인생 모드의 "집으로 돌아가기" 큰 버튼은 빼고 보조 버튼으로
  h = h.replace(/<div class="panel lf-after"><button type="button" class="btn pri" data-atab="life">[\s\S]*?<\/button><\/div>/, "");
  h = h.replace(/<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-kstart>[^<]*<\/button><button type="button" class="btn" data-kquit>목록<\/button><\/div>/,
    `${lwKeptHTML()}<div class="lw-cta"><button type="button" class="btn pri lw-go" data-kstart data-lwnext>▶ 다음 물건 보러 가기</button><button type="button" class="btn" data-lwrest>🏠 오늘은 여기까지</button><small class="note">보증금은 돌려받았어요. 경매는 보스를 다시 잡는 게 아니라, 다음 물건을 고르는 거예요.</small></div>`);
  return h;
};
// 다음 물건 → (career.js가 게시판으로 보낸다) + 처음 한 번은 안내
// window 캡처 — career.js의 document 캡처 핸들러가 전파를 끊기 전에 먼저 받는다
window.addEventListener("click", e => {
  if(e.target.closest && e.target.closest("[data-lwnext]")){ const c = kcRec(); c.fr = c.fr || {}; if(!c.fr.boardTip) LW_TIP = true; }
  if(e.target.closest && e.target.closest("[data-lwrest]")){
    e.stopImmediatePropagation(); K = null;
    if(typeof lfOn === "function" && lfOn()){ arenaTab = "life"; if(typeof LF_SPOT !== "undefined") LF_SPOT = null; }
    else arenaTab = "home";
    renderArena(); window.scrollTo(0, 0);
  }
}, true);
function lwBoardTip(){
  if(!LW_TIP) return;
  const head = document.querySelector(".bd-head"); if(!head) return;
  LW_TIP = false; const c = kcRec(); c.fr = c.fr || {}; c.fr.boardTip = 1; if(typeof save === "function") save();
  if(document.querySelector(".lw-tip")) return;
  head.insertAdjacentHTML("afterend", `<div class="panel lw-tip"><b>🎯 이번에는 당신이 고릅니다</b><p>첫 경매에서 무엇을 확인해야 하는지 배웠어요 — 서류, 현장, 사람, 그리고 남는 선.<br>이번에는 여러 물건 중에서 하나를 골라 보세요. 기다렸다 싸게 노려도 되고, 함정 같으면 포기해도 돼요.</p></div>`);
}
const _lw_render = renderArena; renderArena = function(){ _lw_render(); queueMicrotask(lwBoardTip); };
