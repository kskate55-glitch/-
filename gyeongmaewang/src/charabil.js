/* ============================== 🎒 캐릭터마다 '한 수' 하나 + 약점 하나 ==============================
   능력치 숫자 차이보다 '이 사람이라서 가능한 선택'이 기억에 남는다. 한 판에 한 번, 쓰면 무엇이 달라졌는지 문장으로 보여 준다.
   약점은 나이·성별이 아니라 그 사람의 생활·방식에서 나온다. */
const CA = {
  seoyun:{ic:"🔗", t:"자료 엮기", step:"brief", cost:"20분",
    d:"찾은 자료들 사이의 모순을 엮어, 아직 안 본 곳 중 '확인할 게 남은 곳'을 짚는다(사실을 알려 주진 않는다).",
    weak:"온라인에 없는 건 직접 가 봐야 한다 — 현장 조사가 20분씩 더 걸린다."},
  dohyun:{ic:"🗓️", t:"묶어서 예약", step:"brief", cost:"바로",
    d:"점심시간에 전화·온라인 조사 두 건을 미리 예약해 둔다 — 다음 두 건은 절반 시간에 끝난다.",
    weak:"평일엔 회사 — 현장까지 가는 이동이 30분씩 더 걸린다."},
  mijeong:{ic:"🤝", t:"조건 묶음 제안", step:"move", cost:"1일",
    d:"돈만이 아니라 날짜·짐 정리·연락 방법을 한 묶음으로 제안한다 — 협조도가 오르고 요구액이 준다.",
    weak:"묶음으로 약속한 건 지켜야 한다 — 합의하고 나흘 안에 합의서를 안 쓰면 신뢰가 크게 깎인다."},
  jaehoon:{ic:"🔧", t:"직접 손보기", step:"defect", cost:"3일",
    d:"가장 큰 하자 하나를 업자 대신 직접 고친다 — 그 수리비가 절반으로 준다.",
    weak:"돈 대신 시간과 몸을 쓴다 — 사흘이 지나고, 그만큼 이자·관리비가 붙는다."},
  eunkyung:{ic:"📊", t:"자금 버티기 표", step:"brief", cost:"40분",
    d:"이 가격에 낙찰받으면 몇 달째에 현금이 바닥나는지, 보유기간별로 계산한다.",
    weak:"검토에 시간을 쓴다 — 조사 시간 40분이 줄어든다."},
  taesik:{ic:"☎️", t:"옛 인맥 소개", step:"brief", cost:"60분 · 10만원",
    d:"옛 거래처에 전화해 이 동네를 아는 사람을 소개받는다 — 실제 거래선 이야기를 듣는다.",
    weak:"소개받은 말도 결국 한 사람 의견이다 — 밥값이 들고, 자료로 다시 확인해야 한다."}};
function caWho(){ try{ if(typeof lfOn === "function" && lfOn() && K && K.lf){ const C = lfChar(); if(C && CA[C.id]) return C; } }catch(e){} return null; }
function caUsed(){ return !!(K && K.caUsed); }
// 약점: 시간 계산에 반영
const _ca_krDur = krDur; krDur = function(a){
  let [d0, d1] = _ca_krDur(a); const C = caWho();
  if(C && C.id === "seoyun" && a.loc === "site"){ d0 += 20; d1 += 20; }
  if(C && C.id === "dohyun" && K && K.dhLeft > 0 && (a.loc === "any" || a.loc === "home")){ d0 = Math.round(d0 / 2); d1 = Math.round(d1 / 2); }
  return [d0, d1];
};
const _ca_krTravel = krTravel; krTravel = function(a){ const t = _ca_krTravel(a), C = caWho(); return C && C.id === "dohyun" && t > 0 && (a.loc === "site" || a.trip) ? t + 30 : t; };
const _ca_kRes = kResearch; kResearch = function(id){
  const C = caWho(), a = (KP.actions || []).find(x => x.id === id), before = K && K.done[id];
  _ca_kRes(id);
  if(C && C.id === "dohyun" && K && !before && K.done[id] && K.dhLeft > 0 && a && (a.loc === "any" || a.loc === "home")){ K.dhLeft--; kLog(`🗓️ 도현이 점심시간에 미리 예약해 둔 덕분에 '${a.t}'을(를) 절반 시간에 끝냈다.`); }
};
function caUse(){
  const C = caWho(); if(!C || caUsed()) return;
  const A = CA[C.id], who = C.name.slice(1);
  if(C.id === "seoyun"){
    const acts = (KP.actions || []).filter(a => !K.done[a.id]);
    const target = acts.find(a => (a.out || []).some(o => o.reveal && KP.hidden.some(h => h.id === o.reveal && !K.found[h.id] && (+h.cost || 0) > 0))) || acts.find(a => (a.out || []).some(o => o.reveal));
    if(Object.keys(K.done).length < 2){ kLog("🔗 서윤: '엮을 자료가 아직 없어. 두 가지는 먼저 보고 오자.'"); return; }
    K.caUsed = true; K.timeLeft = Math.max(0, K.timeLeft - 20);
    if(target){ K.syHint = target.id; kLog(`🔗 서윤이 찾은 자료들을 엮어 보니 앞뒤가 안 맞는 데가 있다 — '${target.t}' 쪽을 확인해 볼 만하다.`); }
    else kLog("🔗 서윤이 자료를 엮어 봤다 — 지금까지 본 것들끼리는 서로 어긋나는 데가 없다.");
  }
  if(C.id === "dohyun"){ K.caUsed = true; K.dhLeft = 2; kLog("🗓️ 도현이 점심시간에 전화 두 건을 미리 예약해 뒀다 — 다음 전화·온라인 조사 두 건은 절반 시간에 끝난다."); }
  if(C.id === "eunkyung"){
    K.caUsed = true; K.timeLeft = Math.max(0, K.timeLeft - 40); K.ekPlan = true;
    kLog("📊 은경이 보유기간별 자금표를 만들었다 — 입찰표 아래에서 확인할 수 있다.");
  }
  if(C.id === "taesik"){
    K.caUsed = true; K.timeLeft = Math.max(0, K.timeLeft - 60); K.cost.legal = (K.cost.legal || 0) + 10;
    const h = KP.hidden.find(x => x.k === "price" && !K.found[x.id]) || KP.hidden.find(x => x.k === "helper" && !K.found[x.id]);
    if(h){ K.found[h.id] = true; if(h.k === "helper") K.occ.daughter = true;
      kLog(`☎️ 태식이 옛 거래처 소개로 동네 사람과 통화했다 — "${h.d}" (소개받은 한 사람의 말이다 — 자료로도 확인해 두자.) · 밥값 10만원`); }
    else kLog("☎️ 태식이 옛 인맥에 물어봤지만, 이미 아는 이야기뿐이었다. 밥값 10만원.");
  }
  if(C.id === "mijeong"){
    const o = K.occ; K.caUsed = true; K.mjBundle = K.day; o.coop = Math.min(100, o.coop + 12); K.mjCut = 0.85;
    kSay("…돈만 얘기하는 줄 알았는데, 날짜랑 짐까지 같이 봐 주시네요. 그럼 저도 좀 맞춰 볼게요.", "normal");
    kLog("🤝 미정이 돈·날짜·짐 정리·연락 방법을 한 묶음으로 제안했다 — 협조도가 오르고 요구액이 15% 줄었다. (약속한 건 서류로 남겨야 한다)");
    kTick(1);
  }
  if(C.id === "jaehoon"){
    const d = (K.defects || []).filter(x => +x.cost > 0).sort((a, b) => b.cost - a.cost)[0];
    if(!d){ kLog("🔧 재훈: '내가 손볼 만한 게 없네. 업자한테 맡길 것도 없고.'"); return; }
    K.caUsed = true; const save = Math.round(d.cost / 2 / 10) * 10; K.cost.repair -= save; kDay(3);
    kLog(`🔧 재훈이 '${d.t.replace(/^\S+\s/, "").split("→")[0].trim()}'를 직접 고쳤다 — 수리비 ${kMan(save)} 절약, 대신 사흘이 지났다.`);
  }
  if(typeof kcSfx === "function") try{ kcSfx("paper"); }catch(e){}
}
// 요구액(미정): 생성 물건은 kfOccNeed, CASE 001은 kOccNeed
if(typeof kfOccNeed === "function"){ const _ca_kfNeed = kfOccNeed; kfOccNeed = function(){ const n = _ca_kfNeed.apply(this, arguments); return K && K.mjCut ? Math.round(n * K.mjCut / 10) * 10 : n; }; }
if(typeof kOccNeed === "function"){ const _ca_kNeed = kOccNeed; kOccNeed = function(){ const n = _ca_kNeed.apply(this, arguments); return K && K.mjCut ? Math.round(n * K.mjCut / 10) * 10 : n; }; }
// 미정의 약점: 묶음 약속 뒤 나흘 안에 합의서가 없으면
const _ca_kTick = kTick; kTick = function(n){
  const r = _ca_kTick(n);
  if(K && K.mjBundle != null && !K.mjWarned && K.occ && K.occ.agreed && !K.occ.paper && K.step === "move" && K.day >= (K.occ.agreedAt || K.mjBundle) + 4){
    K.mjWarned = true; K.occ.coop = Math.max(0, K.occ.coop - 15); kLog("🤝 묶음으로 약속해 놓고 서류가 없다 — '말로만 하시는 거였어요?' 신뢰가 크게 깎였다(협조도 −15).");
  }
  return r;
};
const _ca_kOffer = kOffer; kOffer = function(){ const had = K && K.occ && K.occ.agreed; const r = _ca_kOffer.apply(this, arguments); if(K && K.occ && K.occ.agreed && !had) K.occ.agreedAt = K.day; return r; };
// 화면: 조사 단계 — 조사 버튼 줄에 '🎒 ○○의 한 수' 묶음이 하나 더
function caCardHTML(C, inDock){
  const A = CA[C.id], used = caUsed();
  const body = `<div class="ca-card"><p><b>${A.ic} ${esc(A.t)}</b> <small>· ${esc(A.cost)} · 판마다 한 번</small></p><p class="note">${esc(A.d)}</p><p class="note ca-weak">⚠️ 약점: ${esc(A.weak)}</p>
    <button type="button" class="btn pri" data-cause ${used ? "disabled" : ""}>${used ? "이번 판엔 이미 썼어요" : `${A.ic} ${esc(A.t)} 쓰기`}</button></div>`;
  return inDock ? `<h4 class="kr-grp">🎒 ${esc(C.name.slice(1))}의 한 수 — ${esc(A.t)}</h4>${body}` : `<div class="panel k-card ca-panel"><b>🎒 ${esc(C.name.slice(1))}의 한 수</b>${body}</div>`;
}
if(typeof krActionsHTML === "function"){
  const _ca_krA = krActionsHTML;
  krActionsHTML = function(){
    let h = _ca_krA.apply(this, arguments); const C = caWho();
    if(K && K.syHint) h = h.replace(new RegExp(`(data-kres="${K.syHint}"[^>]*>)`), `$1<span class="ca-hint">🔗 서윤: 여기 확인할 게 남아 보여요</span>`);
    if(!C || CA[C.id].step !== "brief") return h;
    const i = h.indexOf('<h4 class="kr-grp">'); return i < 0 ? h + caCardHTML(C, true) : h.slice(0, i) + caCardHTML(C, true) + h.slice(i);
  };
}
function caEkHTML(){
  if(!K || !K.ekPlan) return "";
  const amt = +((document.getElementById("kBid") || {}).value) || KP.minBid, acq = Math.round(amt * kAcqRate(amt));
  const cash = (typeof kcRec === "function" ? +kcRec().cash || 0 : 0), need = amt + acq + 300;
  const loan = Math.max(0, need - cash), mRate = 0.055 / 12, mHold = (+KP.dailyHold || 1.5) * 30;
  const rows = [3, 6, 9, 12].map(m => { const cost = Math.round(loan * mRate * m + mHold * m), left = Math.round(cash - Math.min(cash, need) - cost + (loan > 0 ? 0 : 0)); return `<tr><td>${m}개월</td><td>${kMan(cost)}</td><td class="${left < 0 ? "down" : ""}">${kMan(left)}</td></tr>`; }).join("");
  return `<div class="panel k-card ca-ek"><b>📊 은경의 자금 버티기 표</b> <small>(입찰가 ${kMan(amt)} 기준 · 대출 금리 5.5% 가정)</small>
    <table class="ca-tbl"><tr><th>보유 기간</th><th>이자·관리비 누적</th><th>남는 현금</th></tr>${rows}</table>
    <p class="note">남는 현금이 빨개지는 달이 오기 전에 팔아야 해요 — 매도가 길어질 걸 대비해 입찰가를 정하세요.</p></div>`;
}
const _ca_kingHTML = kingHTML;
kingHTML = function(){
  let h = _ca_kingHTML(); const C = caWho(); if(!K || !C) return h;
  const A = CA[C.id];
  if(K.step === "move" && A.step === "move"){ const i = h.indexOf('<div class="panel k-occ">'); if(i >= 0) h = h.slice(0, i) + caCardHTML(C, false) + h.slice(i); }
  if(K.step === "defect" && A.step === "defect"){ const i = h.search(/<div class="ag-acts[^"]*">\s*<button[^>]*data-krep/); if(i >= 0) h = h.slice(0, i) + caCardHTML(C, false) + h.slice(i); else h += caCardHTML(C, false); }
  if(K.step === "brief" && K.ekPlan){ h += caEkHTML(); }
  return h;
};
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-cause]"); if(!b || !K) return;
  e.preventDefault(); e.stopPropagation(); caUse(); if(typeof save === "function") save(); renderArena();
}, true);
