/* ============================== 첫 플레이 동선 · 입찰표 돈 계획 ============================== */
/* 처음 온 사람에게는 입구를 하나만 보여 준다. 나머지 메뉴는 없애지 않고 접어 두었다가,
   첫 CASE를 끝내거나 직접 "전체 메뉴 보기"를 누르면 원래대로 보인다.
   입찰표에는 "이 금액이면 무엇이 얼마나 묶이는지"와 "입찰 안 하기도 선택"을 붙인다. */

function frRec(){ const c = kcRec(); c.fr = c.fr || {}; return c.fr; }
function frFirst(){
  try{
    const c = kcRec(), P = typeof cpRec === "function" ? cpRec() : {cleared:{}};
    if(frRec().full) return false;
    return !lfOn() && !(+c.cases > 0) && !Object.keys(P.cleared || {}).length && !K;
  }catch(e){ return false; }
}
function frTip(id, t){ const r = frRec(); r.tips = r.tips || {}; if(r.tips[id]) return; r.tips[id] = Date.now(); if(typeof HUB_TOAST !== "undefined") HUB_TOAST.push({t, big:true}); if(typeof save === "function") save(); }

const FR_STEPS = [["🔍", "조사", "시간 안에서 서류·현장·사람을 알아봐요"], ["✉️", "입찰", "얼마까지 쓸지 정해서 봉투에 넣어요"], ["🔑", "명도", "살던 사람과 이사 날짜를 맞춰요"], ["🛠️", "수리", "고칠 만큼만 고쳐요"], ["🏷️", "매도", "팔릴 가격을 정해요"]];

function frHome(){
  const menu = document.querySelector(".kc-menu"); if(!menu || menu.dataset.fr) return;
  menu.dataset.fr = "1";
  const go = menu.querySelector("[data-lfgo]");
  if(go){
    go.removeAttribute("data-lfgo"); go.setAttribute("data-frgo", "");
    go.innerHTML = `▶ 첫 경매 시작하기 <small>한서윤(25)과 서울 빌라 한 채 — 조사부터 매도까지 한 바퀴</small>`;
  }
  const rest = [...menu.children].filter(el => el !== go);
  if(rest.length){
    const d = document.createElement("details"); d.className = "fr-more";
    d.innerHTML = `<summary>다른 방법으로 시작하기 <small>자유 모드 · 게시판 · 이번 주 경매 · 연습실</small></summary>`;
    const box = document.createElement("div"); box.className = "fr-more-in";
    rest.forEach(el => box.appendChild(el)); d.appendChild(box); menu.appendChild(d);
  }
  const panel = document.querySelector(".kfs-panel");
  if(panel && !panel.querySelector(".fr-guide")){
    panel.classList.add("fr-quiet");
    const g = document.createElement("div"); g.className = "panel fr-guide";
    g.innerHTML = (typeof gmwSceneArt==="function" ? gmwSceneArt("first") : "") + `<b>처음이세요? 한 판은 이렇게 흘러가요</b>
      <ol class="fr-steps">${FR_STEPS.map(([ic, t, d]) => `<li><span>${ic}</span><b>${t}</b><small>${d}</small></li>`).join("")}</ol>
      <p class="note">모르는 정보가 남아 있어도 괜찮아요 — 100% 알고 입찰하는 사람은 없어요. 대신 <b>입찰하지 않는 것도 선택</b>이에요.</p>
      <button type="button" class="btn fr-all" data-frall>전체 메뉴 보기</button>`;
    panel.prepend(g);
  }
}

/* ---------- 입찰표: 이 금액이면 묶이는 돈 ---------- */
const FR_HOLD_DAYS = 90;   // 명도 한 달 + 수리 몇 주 + 매도 한 달 — 대략 석 달로 본다
function frMoney(amt){
  amt = Math.max(+KP.minBid || 0, Math.round(+amt || 0));
  const acq = Math.round(amt * 0.017), rep = +KP.estRepair || 0, hold = Math.round((+KP.dailyHold || 0) * FR_HOLD_DAYS);
  const move = 150, feeRate = amt * 0.005, fee = Math.round(Math.min(90, feeRate));
  const total = amt + acq + rep + hold + move;
  return {amt, dep:Math.round(KP.minBid * 0.1), acq, rep, hold, move, fee, total, be:total + fee};
}
function frMoneyHTML(amt){
  const m = frMoney(amt), c = kcRec(), cash = +c.cash || 0, gap = cash - m.total;
  const first = !(+c.cases > 0);
  const rows = [["낙찰가", m.amt], ["취득세 등(약 1.7%)", m.acq], ["겉보기 수리비", m.rep], ["명도 예비비(이사비 등)", m.move], [`이자·관리비(약 ${FR_HOLD_DAYS}일)`, m.hold]];
  return `<details class="fr-money" ${first ? "open" : ""}><summary>💰 이 금액이면 묶이는 돈 <b>${kMan(m.total)}</b></summary>
    <ul>${rows.map(([t, v], i) => `<li><span>${t}</span><b>${kMan(v)}</b></li>`).join("")}</ul>
    <p class="note fr-dep">입찰 날엔 보증금 ${kMan(m.dep)}(최저가의 10%)만 먼저 내고, 나머지는 낙찰 뒤 잔금으로 내요.</p><p class="fr-be">최소 <b>${kMan(m.be)}</b> 이상에 팔려야 본전이에요 <small>(중개보수 포함)</small></p>
    <p class="note">${gap >= 0 ? `내 현금 ${kMan(cash)}으로 감당돼요 — 남는 현금 약 <b>${kMan(gap)}</b>.` : `내 현금 ${kMan(Math.max(0, cash))}으로는 <b>${kMan(-gap)}</b>이 모자라요 — 그만큼은 대출이고, 이자는 위 '이자·관리비'에 대략 들어 있어요.`} 수리비·명도비는 조사 결과에 따라 더 늘 수 있어요.</p></details>`;
}
if(typeof keBidSheet === "function"){
  const _fr_sheet = keBidSheet;
  keBidSheet = function(){
    let h = _fr_sheet();
    const add = `<div id="frMoney">${frMoneyHTML(KP.minBid + 1000)}</div>
      <div class="fr-skip"><small class="note">정보가 모자라거나 본전 가격이 불안하면 <b>입찰하지 않는 것도 좋은 선택</b>이에요.</small> <button type="button" class="btn" data-frskip>🚪 이번엔 입찰하지 않기</button></div>`;
    return h.replace(/<\/div>\s*$/, add + "</div>");
  };
}
document.addEventListener("input", e => {
  const t = e.target; if(!t || t.id !== "kBid" || !K || K.sealed) return;
  const box = document.getElementById("frMoney"); if(!box) return;
  const open = box.querySelector("details") ? box.querySelector("details").open : true;
  box.innerHTML = frMoneyHTML(t.value); const d = box.querySelector("details"); if(d) d.open = open;
});

/* ---------- 필요한 순간에 나머지 기능 소개 ---------- */
function frContext(){
  if(!K) return;
  if(K.step === "won") frTip("evict", "🔑 명도가 처음이면 — 🧪 연습실 → 명도왕에서 점유자 유형별로 따로 연습할 수 있어요.");
  if(K.step === "lost") frTip("lost", "📭 패찰도 경험이에요 — 조사해 둔 상한을 지켰다면 잘한 판단이에요. 게시판에서 다른 물건을 골라 보세요.");
  if(K.step === "result") frTip("result", "📊 첫 CASE 끝! 결과 화면의 '🧭 이번 판 돌아보기'를 보세요. 지난 CASE는 🏢 사무실 서류함과 📊 기록에 쌓여요.");
}

const _fr_render = renderArena;
renderArena = function(){
  _fr_render();
  queueMicrotask(() => {
    if(typeof page !== "undefined" && page !== "arena") return;
    if(arenaTab === "home" && frFirst()) frHome();
    frContext();
  });
};
document.addEventListener("click", e => {
  let b;
  if((b = e.target.closest && e.target.closest("[data-frgo]"))){ e.stopImmediatePropagation(); arenaTab = "life"; LF_PICK = "seoyun"; renderArena(); window.scrollTo(0, 0); return; }
  if((b = e.target.closest && e.target.closest("[data-frskip]"))){
    e.stopImmediatePropagation();
    if(!b.classList.contains("armed")){ b.classList.add("armed"); b.dataset.armAt = Date.now(); b.textContent = "한 번 더 누르면 이 물건은 넘겨요"; return; }
    if(Date.now() - (+b.dataset.armAt || 0) < 350) return;   // 더블클릭 한 번으로 확인까지 넘어가지 않게
    const life = K && K.lf && lfOn(); K = null;
    if(life){ arenaTab = "life"; LF_SPOT = "board"; } else if(typeof OF_SPOT !== "undefined"){ arenaTab = "office"; OF_SPOT = "board"; }
    if(typeof HUB_TOAST !== "undefined") HUB_TOAST.push({t:"🚪 이번 물건은 넘겼어요 — 모르는 채로 들어가지 않은 것도 판단이에요."});
    if(typeof save === "function") save(); renderArena(); return;
  }
  if((b = e.target.closest && e.target.closest("[data-frall]"))){ frRec().full = true; if(typeof save === "function") save(); renderArena(); }
});

/* ============================== 결과와 판단을 나눠 본다 ==============================
   이미 있는 것: 💰 사업 결과 / 🧠 투자 판단 두 등급(career.js), 정보 복기(qa1.js), 예상 vs 실제.
   여기서 더하는 것:
   ① 패찰했을 때도 판단을 평가한다 — 상한을 지킨 패찰은 '잘한 판단'이다.
   ② 낙찰 결과를 "당시 알 수 있던 것 → 내 판단 → 실제로 벌어진 일 → 다음에 볼 것" 순서로 한 장에.
   ③ 입찰 전엔 알 방법이 없던 일(무작위 사건·계약 파기)은 '운'으로 따로 표시하고 실수로 치지 않는다. */
function frCeil(){ return Math.round((+KP.trueMid || 0) * 0.78 / 10) * 10; }   // career.js kcJudge의 '입찰가 절제' 기준과 같은 선
function frLuck(){
  const out = [];
  (K.defects || []).forEach(d => { if(!d.known && +d.cost > 0 && !/누전|누수|관리비/.test(d.t)) out.push(d.t.replace(/^\S+\s/, "") + (d.cost ? ` (${kMan(d.cost)})` : "")); });
  if((K.events || []).includes("계약 파기")) out.push("매수자 대출이 덜 나와 계약이 깨짐");
  return out;
}
function frMissed(){ try{ return keCards().filter(c => !keHas(c) && c.id !== "inside"); }catch(e){ return []; } }
function frLostJudgeHTML(){
  const r = K.result, ceil = frCeil(), me = +K.bid || (r.bids.find(b => b.me) || {}).amt || 0, top = r.other ? r.other.amt : 0;
  const rate = typeof keRate === "function" ? keRate() : null;
  let good, line;
  if(me > ceil){ good = false; line = "내 가격도 이미 높았어요 — 이겼어도 남기기 어려웠을 수 있어요. 다음엔 상한을 먼저 정하고 쓰세요."; }
  else if(me >= ceil * 0.9){ good = true; line = top > ceil ? "원칙을 지킨 패찰이에요. 1등은 남기기 어려운 가격까지 올라갔어요 — 따라가지 않은 게 판단이에요." : "남는 선 안에서 제대로 썼어요. 이번엔 경쟁자가 조금 더 절박했을 뿐이에요."; }
  else { good = null; line = "조금 더 써도 남는 가격이었어요 — 너무 아낀 것도 다음엔 고칠 점이에요."; }
  if(good === true && rate != null && rate < 50){ good = null; line = `가격 선은 지켰지만, 정보 파악률 ${rate}%로는 그 선 자체를 믿기 어려워요 — 다음엔 서류·현장을 더 보고 상한을 정하세요.`; }
  const miss = frMissed();
  return `<div class="panel fr-judge"><div class="fr-jrow"><span>💰 결과</span><b>이번 물건은 못 샀어요</b></div>
    <div class="fr-jrow"><span>🧠 판단</span><b class="${good === true ? "up" : good === false ? "down" : ""}">${good === true ? "좋았어요" : good === false ? "위험했어요" : "아쉬워요"}</b></div>
    <p>${esc(line)}</p>
    ${rate != null ? `<p class="note">입찰할 때 정보 파악률 ${rate}%${miss.length ? ` · 못 본 정보 ${miss.length}개(${esc(miss.slice(0, 2).map(c => c.t).join(", "))})` : ""}</p>` : ""}
    <p class="note">패찰은 손해가 아니에요 — 보증금은 돌려받고, 남는 가격을 지킨 기록이 쌓여요.</p></div>`;
}
function frReviewHTML(){
  const F = K.final; if(!F) return "";
  const miss = frMissed(), luck = frLuck(), ceil = frCeil(), over = K.bid > ceil;
  const pred = K.pred && K.pred.sale > 0;
  const next = miss.length ? `${miss[0].ic || "🔎"} ${miss[0].t} — ${miss[0].d}` : over ? "상한을 먼저 정하고 입찰표를 쓰기" : !pred ? "입찰 전에 예상 매도가를 적어 두기(판단 기록이 쌓여요)" : "지금처럼 — 같은 순서로 한 번 더";
  return `<div class="panel fr-review"><b>🧭 이번 판 돌아보기</b>${typeof gmwSceneArt==="function" ? gmwSceneArt("review") : ""}<ol>
    <li><span>📂 입찰 전에 알 수 있던 것</span><p>숨은 위험 ${F.hid}개 중 <b>${F.found}개</b>를 입찰 전에 찾았어요.${miss.length ? ` 못 본 것: ${esc(miss.map(c => c.t).join(", "))}.` : " 전부 찾았어요."}</p></li>
    <li><span>🧠 내 판단</span><p>입찰가 <b>${kMan(K.bid)}</b> — ${over ? "남기기 빠듯한 선을 넘었어요" : "남는 선 안이었어요"}.${pred ? ` 예상 매도가 ${kMan(K.pred.sale)}를 적어 뒀어요.` : " 예상 매도가는 적지 않았어요."}</p></li>
    <li><span>🎲 실제로 벌어진 일</span><p>순익 <b class="${F.profit >= 0 ? "up" : "down"}">${kcSigned ? kcSigned(Math.round(F.profit)) : kMan(F.profit)}</b>.${luck.length ? ` 입찰 전엔 알 방법이 없던 일: ${esc(luck.join(" · "))} — <b>이건 판단 점수에 넣지 않았어요.</b>` : " 운이 크게 끼어든 일은 없었어요."}</p></li>
    <li><span>➡️ 다음에 확인할 것</span><p>${esc(next)}</p></li></ol>
    <p class="note">돈을 벌었어도 판단이 위험했으면, 같은 행동을 반복할 때 언젠가 잃어요. 반대로 못 벌어도 판단이 좋았으면 계속 그렇게 하면 돼요.</p></div>`;
}
const _fr_kingHTML = kingHTML;
kingHTML = function(){
  let h = _fr_kingHTML();
  if(!K || K.intro || K.revealing) return h;
  try{
    if(K.step === "lost" && K.result && !h.includes("fr-judge")) h = h.replace(/(<div class="panel k-bidres lose">[\s\S]*?<\/div>)/, `$1${frLostJudgeHTML()}`);
    if(K.step === "result" && K.final && !h.includes("fr-review")){ const i = h.indexOf('<div class="panel kc-dual">'); if(i >= 0) h = h.slice(0, i) + frReviewHTML() + h.slice(i); }
  }catch(e){}
  return h;
};
