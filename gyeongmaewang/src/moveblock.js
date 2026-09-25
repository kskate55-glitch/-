/* ============================== 🧩 사건마다 '막힌 곳'이 다르다 (첫 세 사건) ==============================
   협조도만 올리면 풀리던 명도를 셋으로 나눈다: 나갈 마음이 있나 / 실제로 나갈 준비가 됐나 / 법적 권리.
   - 1판 「담배는 주머니에만」: 믿음 — 낯선 사람을 못 믿는다. 신분·절차 설명 + 약속한 날 다시 연락(시간) 또는 가족 연결.
   - 2판 「서류 한 장과 이삿날」: 날짜 — 배당기일·새집 잔금·이삿날이 맞아야 한다. 기다려 맞추기(시간) 또는 이사비 일부 선지급(돈).
   - 3판 「스물한 살의 보증금 500」: 생활 — 갈 곳과 이삿짐 옮길 방법. 용달 예약(돈) 또는 주말에 직접 옮기기(시간).
   사정을 들으면(첫 '사정부터 듣는다') 무엇이 막혔는지 알게 된다 — 협조도만 오르는 게 아니라 '질문'이 풀린다. */
const MB = {
  k1:{kind:"trust", ic:"🤝", title:"믿음 — 낯선 사람이 와서 나가라는 말을 못 믿는다",
    hint:"…서류 들고 와서 나가라 카는 사람을 우째 믿노. 전에도 웬 사람이 와가 '법이 어쩌고' 카더니 딴소리만 하고 갔다.",
    items:[["explain","🪪 누구인지·무슨 절차인지 설명했다"],["kept","📞 약속한 날에 다시 연락했다"]], alt:"또는 가족(따님)이 함께하면 풀려요",
    solved:(B, o) => (B.explain && B.kept) || o.dInvolved},
  f11:{kind:"dates", ic:"📅", title:"날짜 — 배당금이 나와야 새집 잔금을 치르고, 그래야 나갈 수 있다",
    hint:"저 나가는 건 괜찮아요. 근데 배당금이 나와야 새집 잔금을 치르거든요. 그 전에 나가면 갈 데가 없어요.",
    items:[["dates","📅 배당기일·새집 잔금일 확인"],["cert","📄 이삿날 명도확인서 주기로 약속"]], alt:"날짜를 맞춰 기다리거나(시간), 이사비 일부를 먼저 줘 새집 계약에 보태게(돈)",
    solved:(B, o) => B.dates && (B.cert || o.dInvolved)},
  f12:{kind:"life", ic:"🧳", title:"생활 — 갈 곳도, 짐 옮길 차도 없다",
    hint:"나가고 싶죠. 근데 보증금 500 말고는 돈이 없어서 방을 못 구해요. 짐도… 차가 없어서 어떻게 옮길지 모르겠어요. 평일엔 알바라 시간도 없고요.",
    items:[["place","🏠 갈 곳(최우선변제·청년 주거지원)"],["truck","🚚 이삿짐 옮길 방법"]], alt:"용달을 잡아 주거나(돈), 주말에 같이 옮기거나(시간)",
    solved:(B, o) => !o.place && B.truck}};
function mbDef(){ return K && KP && MB[KP.id || (KP === (typeof KP1 !== "undefined" ? KP1 : null) ? "k1" : "")] || null; }
function mbKey(){ if(!K || !KP) return null; if(KP.id && MB[KP.id]) return KP.id; if(typeof KP1 !== "undefined" && KP === KP1) return "k1"; return null; }
function mbB(){ const k = mbKey(); if(!k) return null; K.blk = K.blk || {k}; if(K.blk.k !== k) K.blk = {k}; return K.blk; }
function mbSolved(){ const k = mbKey(), B = mbB(); return !k || MB[k].solved(B, K.occ); }
function mbItemOn(id){ const B = mbB(), o = K.occ; if(id === "place") return !o.place; if(id === "cert") return !!(B.cert || o.dInvolved); return !!B[id]; }
function mbKnow(why){ const B = mbB(); if(!B || B.known) return; B.known = true; const D = MB[B.k]; kLog(`🧩 막힌 곳을 알았다 — ${D.title.split(" — ")[0]}: ${D.title.split(" — ")[1]}`); }
// f11: 배당기일은 명도를 처음 시작하는 날 정해진다(대략 3주 뒤)
function mbInit(){ const B = mbB(); if(!B || B.init) return; B.init = true; if(B.k === "f11"){ B.divDay = K.day + 22; } }
Object.assign(K_MOVES.find(m => m.id === "date") || {}, {});
K_MOVES.push(
  {id:"mb_explain", s:"empathy", t:"🪪 명함·낙찰 영수증을 보여 주고, 앞으로 어떤 절차인지 차분히 설명한다", day:1, need:o => mbKey() === "k1" && !mbB().explain},
  {id:"mb_kept", s:"empathy", t:"📞 \"모레 오후 3시에 다시 전화드릴게요\" — 약속한 날에 연락한다", day:1, need:o => mbKey() === "k1" && mbB().explain && !mbB().kept},
  {id:"mb_dates", s:"", t:"📅 배당기일과 새집 잔금일을 같이 확인한다", day:1, need:o => mbKey() === "f11" && !mbB().dates},
  {id:"mb_cert", s:"empathy", t:"📄 \"이삿날 짐 빠진 거 확인하면 명도확인서 바로 드릴게요\" 약속한다", day:1, need:o => mbKey() === "f11" && mbB().dates && !mbB().cert && !o.dInvolved},
  {id:"mb_bridge", s:"money", t:"💵 이사비 100만원을 먼저 줘서 새집 계약금에 보태게 한다 (빨리 나갈 수 있음)", day:1, need:o => mbKey() === "f11" && mbB().dates && !mbB().bridge},
  {id:"mb_truck", s:"money", t:"🚚 용달을 예약해 준다 (35만원)", day:1, need:o => mbKey() === "f12" && !mbB().truck},
  {id:"mb_carry", s:"empathy", t:"🙋 주말에 직접 같이 짐을 옮겨 준다 (이틀, 돈 안 듦)", day:2, need:o => mbKey() === "f12" && !mbB().truck});
function mbRelease(){   // 막힌 곳이 풀리면, 이미 한 약속은 '진짜 날짜'로 당겨진다
  const o = K.occ, B = mbB(); if(!o.agreed || !mbSolved() || B.k === "f11") return;
  const nd = K.day + 6; if(o.agreed.day > nd){ o.agreed.day = nd; kLog(`🧩 막힌 곳이 풀려 이삿날이 ${nd}일째로 당겨졌다.`); }
}
const _mb_kMove = kMove;
kMove = function(id){
  const k = mbKey(); if(!k) return _mb_kMove(id);
  mbInit(); const B = mbB(), o = K.occ, D = MB[k];
  if(id.startsWith("mb_")){
    const m = K_MOVES.find(x => x.id === id); if(!m || (m.need && !m.need(o))) return;
    if(m.s) K.style[m.s]++; o.turns++; mbKnow();
    let days = m.day;
    if(id === "mb_explain"){ B.explain = true; B.promise = K.day + 2; o.coop += 4; kSay("…명함은 뭐 아무나 만드는 기고. 알았다, 모레 전화하믄 그때 들어 보께.", "worried"); kLog("🪪 신분과 절차를 설명했다 — 모레 다시 연락하기로 했다."); }
    if(id === "mb_kept"){ days = Math.max(1, B.promise - K.day); B.kept = true; o.coop += 10; o.resist -= 6; kSay("…진짜로 전화를 했네. 요새 사람들 약속을 우습게 알던데. 그라믄 이야기는 해 보자.", "normal"); kLog("📞 약속한 날에 다시 연락했다 — 믿음이 생겼다."); }
    if(id === "mb_dates"){ B.dates = true; kSay(`배당기일이 ${B.divDay}일째쯤이래요. 새집 잔금은 그다음 날이고요. 그 전엔 제 손에 돈이 없어요.`, "normal"); kLog(`📅 배당기일 ${B.divDay}일째 · 새집 잔금 ${B.divDay + 1}일째 — 이삿날은 그 뒤로 잡아야 한다(아니면 새집 계약금을 도와줘야 한다).`); }
    if(id === "mb_cert"){ B.cert = true; o.coop += 6; kSay("아, 이삿날 받아 가면 되는 거죠? 그럼 걱정 하나 덜었어요.", "normal"); kLog("📄 명도확인서 교환을 약속했다 — 이게 있어야 배당금을 받는다."); }
    if(id === "mb_bridge"){ B.bridge = true; K.cost.move += 100; o.coop += 8; kSay("정말요? 그럼 새집 계약금은 맞출 수 있어요. 잔금 전에도 들어가게 해 준대요.", "normal"); kLog("💵 이사비 100만원 선지급 — 배당기일을 안 기다려도 된다(합의서는 꼭)."); }
    if(id === "mb_truck"){ B.truck = true; K.cost.move += 35; o.coop += 4; kSay("용달까지요…? 감사합니다. 짐은 박스 열 개 정도예요.", "normal"); kLog("🚚 용달 예약(35만원) — 이삿짐 문제가 풀렸다."); }
    if(id === "mb_carry"){ B.truck = true; o.coop += 10; kSay("주말에 직접요? …이런 건 처음이에요. 라면 박스 몇 개만 있으면 돼요.", "normal"); kLog("🙋 주말에 같이 옮기기로 — 돈 대신 이틀을 썼다."); }
    kClampOcc(); mbRelease(); kTick(days); return;
  }
  // 날짜 이야기 — 믿음이 없으면 날짜 자체를 안 정한다(1판)
  if(id === "date" && D.kind === "trust" && !mbSolved() && !o.orderOk){
    const m = K_MOVES.find(x => x.id === "date"); o.turns++; mbKnow();
    o.coop -= 3; kSay("날짜? 니가 누군 줄 알고 날짜를 정하노. 법원에서 왔다 카는 사람도 딴말하더라.", "angry"); kLog("🧩 믿음이 없으니 날짜 얘기가 안 된다 — 누구인지 설명하고 약속을 지켜 보여야 한다.");
    kClampOcc(); kTick(m.day); return;
  }
  const t0 = o.turns; _mb_kMove(id);
  if(id === "listen" && o.turns > t0 && !B.known){ B.known = true; kSay(D.hint, "worried"); kLog(`🧩 사정을 들어 보니 — ${D.title}`); }
  if(id === "center" && k === "f12") mbRelease();
  if(id === "daughter") mbRelease();
};
// 합의가 되는 순간: 막힌 곳이 남아 있으면 날짜가 한참 뒤로 밀린다(3판) · 날짜 사건은 배당기일에 맞춘다(2판)
const _mb_kOffer = kOffer;
kOffer = function(amt){
  const k = mbKey(); if(!k) return _mb_kOffer(amt);
  mbInit(); const o = K.occ, B = mbB(), had = !!o.agreed; _mb_kOffer(amt);
  if(had || !o.agreed) return;
  if(k === "f12" && !mbSolved()){ mbKnow(); const miss = MB.f12.items.filter(([id]) => !mbItemOn(id)).map(([, t]) => t.replace(/^\S+\s/, "")); o.agreed.day = Math.max(o.agreed.day, K.day + 30); kLog(`🧩 "나가고는 싶은데요…" ${miss.join(" · ")}이 안 정해져서 이삿날이 ${o.agreed.day}일째로 밀렸다. 풀리면 당겨진다.`); }
  if(k === "f11" && B.dates){
    if(B.bridge){ if(o.agreed.day > K.day + 7){ o.agreed.day = K.day + 7; } kLog(`📅 새집 계약금을 도와줘서 ${o.agreed.day}일째에 나간다.`); }
    else if(o.agreed.day <= B.divDay){ o.agreed.day = B.divDay + 2; kLog(`📅 배당기일(${B.divDay}일째) 뒤로 이삿날을 맞췄다 — ${o.agreed.day}일째.`); }
  }
};
// 2판: 날짜를 확인 안 하고 배당기일 전으로 잡았다면 — 이삿날에 "아직 돈이 안 나와서 못 나가요"
const _mb_kTick = kTick;
kTick = function(n){
  const k = mbKey(), o = K && K.occ, B = k && mbB();
  if(k === "f11" && o && o.agreed && !B.bridge && !B.trapped && o.agreed.day <= B.divDay && K.day + n >= o.agreed.day){
    B.trapped = true; B.dates = true; mbKnow();
    o.agreed.day = B.divDay + 3; o.coop -= 8;
    const r = _mb_kTick(n);
    kSay(`죄송해요… 배당금이 ${B.divDay}일째에 나와서, 그 전엔 새집 잔금을 못 치러요. 오늘은 못 나가요.`, "worried");
    kLog(`🧩 이삿날 약속이 배당기일보다 빨랐다 — ${o.agreed.day}일째로 밀렸다(그동안 이자·관리비). 날짜를 먼저 확인했으면 피할 수 있었다.`);
    K.lessonKey = K.lessonKey || "mb_dates"; return r;
  }
  if(k === "f11" && o && o.agreed && !(B.cert || o.dInvolved) && !B.certWarn && K.day + n >= o.agreed.day && !K.pendingFlip){
    B.certWarn = true; B.cert = true; o.agreed.day += 2; kLog("📄 이삿날 아침 — '명도확인서 주시는 거죠?' 그 자리에서 약속하느라 이틀 밀렸다.");
  }
  return _mb_kTick(n);
};
if(typeof K_LESSONS !== "undefined") Object.assign(K_LESSONS, {mb_dates:"배당받는 세입자에게 이삿날은 '마음'이 아니라 '배당기일'이 정합니다. 날짜부터 맞추세요."});
// 명도 화면에 '막힌 곳' 판
function mbPanelHTML(){
  const k = mbKey(); if(!k || !K || K.step !== "move") return "";
  const B = mbB(), D = MB[k], ok = mbSolved();
  if(!B.known) return `<div class="panel k-card mb-card"><b>🧩 이 사람이 못 나가는 진짜 이유</b><div class="note">아직 몰라요 — 사정을 들어 보면 무엇이 막혀 있는지 알 수 있어요. 협조도만으로는 안 풀릴 수도 있어요.</div></div>`;
  return `<div class="panel k-card mb-card ${ok ? "mb-ok" : ""}"><b>${D.ic} 막힌 곳: ${esc(D.title)}</b>
    <ul class="mb-list">${D.items.map(([id, t]) => `<li class="${mbItemOn(id) ? "on" : ""}">${mbItemOn(id) ? "✅" : "⬜"} ${esc(t)}</li>`).join("")}</ul>
    <div class="note">${ok ? "풀렸어요 — 이제 날짜와 금액을 정하면 돼요." : esc(D.alt)}${k === "f11" && B.dates ? ` · 배당기일 ${B.divDay}일째` : ""}</div></div>`;
}
const _mb_kingHTML = kingHTML;
kingHTML = function(){
  let h = _mb_kingHTML();
  if(!K || K.step !== "move" || !mbKey()) return h;
  mbInit();
  // 이 사건만의 행동 버튼은 목록 맨 아래가 아니라 '사정부터 듣는다' 바로 다음에 — 안 보이면 없는 거나 같다
  const re = /<button type="button" class="ag-act[^"]*" data-kmove="mb_[^"]+">[\s\S]*?<\/button>/g, mbBtns = h.match(re) || [];
  if(mbBtns.length){ h = h.replace(re, ""); const li = h.search(/<button type="button" class="ag-act[^"]*" data-kmove="listen">[\s\S]*?<\/button>/);
    if(li >= 0){ const end = h.indexOf("</button>", li) + 9; h = h.slice(0, end) + mbBtns.map(x => x.replace('class="ag-act', 'class="ag-act mb-act')).join("") + h.slice(end); } else h = h.replace('<div class="ag-acts vn-acts">', '<div class="ag-acts vn-acts">' + mbBtns.join("")); }
  const i = h.indexOf('<div class="panel k-occ">'); if(i < 0) return h;
  return h.slice(0, i) + mbPanelHTML() + h.slice(i);
};
