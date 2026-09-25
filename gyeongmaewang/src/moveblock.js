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
    <div class="note">${ok ? "풀렸어요 — 이제 날짜와 금액을 정하면 돼요." : esc(D.alt)}${k === "f11" && B.dates ? ` · 배당기일 ${B.divDay}일째` : ""}</div>${B.tip && D.tip ? `<div class="note mb-tip">💡 ${esc(D.tip)}</div>` : !ok ? `<div class="note">사연을 끝까지 들으면 어디부터 풀어야 할지 힌트가 나와요.</div>` : ""}</div>`;
}
const _mb_kingHTML = kingHTML;
kingHTML = function(){
  let h = _mb_kingHTML();
  if(!K || K.step !== "move" || !mbKey()) return h;
  mbInit();
  // 이 사건만의 행동 버튼은 목록 맨 아래가 아니라 '사정부터 듣는다' 바로 다음에 — 안 보이면 없는 거나 같다
  const re = /<button type="button" class="ag-act[^"]*" data-kmove="mbg?_[^"]+">[\s\S]*?<\/button>/g, mbBtns = h.match(re) || [];
  if(mbBtns.length){ h = h.replace(re, ""); const li = h.search(/<button type="button" class="ag-act[^"]*" data-kmove="listen">[\s\S]*?<\/button>/);
    if(li >= 0){ const end = h.indexOf("</button>", li) + 9; h = h.slice(0, end) + mbBtns.map(x => x.replace('class="ag-act', 'class="ag-act mb-act')).join("") + h.slice(end); } else h = h.replace('<div class="ag-acts vn-acts">', '<div class="ag-acts vn-acts">' + mbBtns.join("")); }
  const i = h.indexOf('<div class="panel k-occ">'); if(i < 0) return h;
  return h.slice(0, i) + mbPanelHTML() + h.slice(i);
};

/* ============================== 🧩 나머지 사건 — 같은 틀, 사건마다 다른 막힌 곳 ==============================
   각 막힌 곳은 두 갈래로 풀린다: ⏳ 시간을 쓰는 길 / 💵 돈을 쓰는 길(또는 추가 확인). 정답 버튼 하나가 아니다.
   풀지 않고 합의하면 '나가고는 싶은데…'로 이삿날이 한참 밀리고, 풀면 당겨진다.
   gate:true 인 사건은 막힌 곳이 풀리기 전엔 날짜 이야기 자체가 안 된다(연락이 안 닿거나, 결정권자가 아니거나). */
const MBG = {
  f13:{ic:"📨", title:"연락 — 문을 두드리는 방식으론 닿지 않는다", gate:true,
    hint:"(문틈으로 쪽지가 밀려 나온다) '문 두드리지 마세요. 할 말 있으면 문자로.'",
    tip:"사연을 끝까지 들어 보니 — 부모님 얘기를 꺼내면 오히려 닫힌다. 문자로, 그가 고를 수 있게.",
    items:[["contact","📨 닿는 연락 방법", [{t:"📨 방문 가능한 시간 세 개를 문자로 보내고 고르게 한다", day:2, coop:10, say:"(문자) …목요일 저녁 7시요. 문 앞 말고 1층 편의점 앞에서요."}, {t:"📞 부모님께 먼저 연락해 대신 전해 달라고 한다", day:1, coop:-6, say:"(문자) 엄마한테 왜 말했어요. …알았어요, 만나요. 짧게요."}]],
           ["room","🏠 나가서 지낼 곳", [{t:"🧭 청년 임대·고시원 시세를 같이 찾아 문자로 보낸다", day:2, coop:6}, {t:"💵 첫 달 방값을 보태 준다", cost:60, day:1, coop:8}]]]},
  f21:{ic:"🧾", title:"숫자 — 500이 무엇으로 이뤄졌는지 모른다",
    hint:"500은 주셔야죠. 그게 상식이에요. 이사 가려면 돈이 한두 푼 드는 줄 알아요?",
    tip:"사연을 끝까지 들어 보니 — 500 중 제일 큰 건 짐 맡길 곳이다. 그걸 풀면 나머지는 줄어든다.",
    items:[["breakdown","🧾 500의 내역", [{t:"🧾 '500이 어디에 들어가는지 하나씩 적어 봐요' — 내역을 같이 쓴다", day:2, cut:0.72, say:"…이사 150, 짐 맡길 창고 100, 나머지는… 급한 카드값이오."}, {t:"💵 짐 맡길 창고비 100만원은 내가 직접 낸다", cost:100, day:1, cut:0.7}]],
           ["when","📆 원하는 날짜", [{t:"📆 '언제까지면 되세요?' 날짜부터 묻는다", day:1, coop:4, say:"다음 달 10일이면 돼요. 그 전엔 갈 데가 없어요."}, {t:"🚚 이삿짐센터를 내가 예약해 날짜를 박는다", cost:80, day:1}]]]},
  f22:{ic:"🐈", title:"동물 — 고양이 셋을 받아 주는 방이 없다",
    hint:"나가라면 나가요. 근데 고양이 셋 받아 주는 방이 어딨어요. 얘들 버리고는 못 가요.",
    tip:"사연을 끝까지 들어 보니 — 돈보다 '고양이랑 같이'가 먼저다. 방만 찾으면 요구액이 확 준다.",
    items:[["pets","🐈 반려동물 가능한 방", [{t:"🔎 반려동물 가능한 방을 같이 찾아본다", day:3, coop:8, cut:0.85}, {t:"🏠 반려동물 가능 방 중개수수료를 내 준다", cost:50, day:1, cut:0.85}]],
           ["carry","🚐 고양이 이동 방법", [{t:"🙋 이삿날 케이지 들고 같이 옮긴다", day:2, coop:6}, {t:"🚐 반려동물 이동 택시를 예약해 준다", cost:20, day:1}]]]},
  f23:{ic:"🗣️", title:"말 — 서로 이해한 금액·날짜가 같은지 모른다",
    hint:"(번역기 문자) '네 알겠습니다. 다음 달 나가요. 돈은 얼마예요?' …앞 문자에선 '이번 달'이라고 했다.",
    tip:"사연을 끝까지 들어 보니 — 모르는 단어가 나오면 '네'라고 먼저 답하는 습관이 있다. 되물어 확인해야 한다.",
    items:[["same","🗣️ 같은 금액·날짜로 이해했는지", [{t:"✍️ 쉬운 문장으로 쓰고 '제가 쓴 날짜를 다시 말해 줄래요?' 되묻는다", day:2, coop:6}, {t:"🧑‍🏫 학교 국제처 통역 도움을 받는다(통역비)", cost:15, day:1, coop:4}]],
           ["room","🏠 갈 곳", [{t:"🏫 학교 기숙사 빈자리를 같이 알아본다", day:3, coop:6}, {t:"💵 첫 달 고시원비를 보태 준다", cost:40, day:1}]]]},
  f31:{ic:"✂️", title:"영업 — 예약 손님과 설비가 걸려 있다",
    hint:"당장 문을 닫으라고요? 예약 손님이 다음 달까지 잡혀 있어요. 의자랑 샴푸대는 어떡하고요.",
    tip:"사연을 끝까지 들어 보니 — 마지막 영업일만 정해지면 스스로 정리할 사람이다.",
    items:[["book","📒 예약 손님 정리", [{t:"📅 마지막 영업일을 정하고 그날까지만 예약을 받게 한다", day:4, coop:8}, {t:"💵 남은 예약 손님 위약금을 보태 준다", cost:80, day:1, coop:6}]],
           ["equip","💺 의자·샴푸대 옮기기", [{t:"🧰 설비 옮길 날을 따로 하루 잡는다", day:2}, {t:"🚚 설비 이전 업체를 예약해 준다", cost:120, day:1}]]]},
  f32:{ic:"🥡", title:"동네 — 당사자와 동네에 전달되는 이야기가 다르다",
    hint:"(가게 앞에 손님들이 모여 있다) '30년 된 가게를 내쫓는다며?' …부부는 아무 말도 하지 않는다.",
    tip:"사연을 끝까지 들어 보니 — 부부는 나가는 것보다 '쫓겨났다'는 말이 더 무섭다.",
    items:[["story","🏘️ 동네에 전해질 설명", [{t:"📝 부부 동의를 얻어 '30년 감사했습니다' 안내문을 같이 쓴다", day:2, coop:10}, {t:"🤫 공개하지 않고 서면으로만 조용히 진행한다", day:1, coop:2}]],
           ["kitchen","🍳 주방 설비 처분", [{t:"🔧 중고 주방업자와 날짜를 잡아 준다", day:3}, {t:"🚚 폐기·운반비를 내 준다", cost:70, day:1}]]]},
  f33:{ic:"📦", title:"약속 — '이번 주예요'가 말뿐인지 모른다",
    hint:"진짜로 이번 주예요. 이번엔 진짜라니까요. …지난주에도 그렇게 말했다.",
    tip:"사연을 끝까지 들어 보니 — 이삿짐센터 계약금이 없어서 날짜를 못 박고 있었다.",
    items:[["proof","📦 실제 이사 준비(계약서)", [{t:"📸 이삿짐센터·새집 계약서를 보여 달라고 하고 확인한다", day:1, coop:-2, say:"…새집은 계약했어요. 이삿짐센터는 아직이고요."}, {t:"🚚 내가 이삿짐센터 계약금을 내고 날짜를 박는다", cost:60, day:1, coop:4}]]]},
  f34:{ic:"🗝️", title:"권한 — 목소리 큰 사람이 결정권자가 아니다", gate:true,
    hint:"(남편이 소리친다) '내가 안 나간다면 안 나가는 거요!' …아내는 부엌에서 나오지 않는다.",
    tip:"사연을 끝까지 들어 보니 — 집 명의도, 돈 관리도 아내 쪽이다. 아내가 걱정하는 건 아이 전학이다.",
    items:[["who","🗝️ 실제로 결정할 권한", [{t:"📋 등기·계약 서류로 누가 결정권자인지 확인한다", day:1}]],
           ["both","👫 두 사람 모두의 동의", [{t:"☕ 두 사람이 다 있는 자리를 따로 잡는다", day:2, coop:8}, {t:"💵 아내가 걱정하는 아이 전학 비용을 따로 챙긴다", cost:50, day:1, coop:10}]]]},
  f42:{ic:"📦", title:"짐 — 집 전체를 한 번에 비울 수 없다",
    hint:"이건 버리는 게 아니에요. 다 쓸 데가 있는 거예요. 누가 함부로 만지면 안 돼요.",
    tip:"사연을 끝까지 들어 보니 — '버린다'는 말이 제일 아프다. '맡긴다·옮긴다'로 나누면 움직인다.",
    items:[["zones","🏷️ 보관·이동·처분 구역 나누기", [{t:"🏷️ 당사자와 같이 방마다 '보관·이동·처분' 스티커를 붙인다", day:4, coop:10}, {t:"📦 창고 보관 한 달을 잡아 준다", cost:90, day:1, coop:6}]],
           ["hands","🤝 정리 도와줄 손", [{t:"🏛️ 구청 정리 지원 서비스를 연결한다", day:3, coop:4}, {t:"🧹 정리 업체 반나절을 불러 준다", cost:60, day:1}]]]},
  f43:{ic:"🎥", title:"기록 — 모든 대화가 방송·녹화된다",
    hint:"(휴대폰 카메라가 나를 향한다) '지금 방송 중이에요. 하실 말씀 여기서 하세요.'",
    tip:"사연을 끝까지 들어 보니 — 방송이 목적이 아니라, 배당금을 못 받을까 봐 증거를 남기는 중이다.",
    items:[["record","🎥 기록과 공개 범위", [{t:"📝 제안은 전부 서면으로 보내고, 답도 서면으로 받는다", day:2, coop:4}, {t:"🧑‍💼 중개사를 대리인으로 세워 그쪽으로만 소통한다", cost:40, day:1, coop:2}]],
           ["div","💰 배당금 걱정", [{t:"📅 배당기일을 확인하고 명도확인서 교환을 약속한다", day:1, coop:10}]]]},
  f44:{ic:"🌳", title:"가족 — 친족 여럿의 감정과 실제 권한이 엇갈린다",
    hint:"이 집은 우리 형제들이 다 같이 큰 집이야. 나 혼자 정할 수 있는 게 아니라고.",
    tip:"사연을 끝까지 들어 보니 — 동생들 전화 한 통이면 할머니 마음이 바뀐다. 대표를 정하는 게 먼저다.",
    items:[["rep","👵 합의할 대표자와 범위", [{t:"📋 친족 중 대표자와 합의 범위를 서면으로 정한다", day:3, coop:6}]],
           ["memory","🌳 물건·기억을 남기는 방법", [{t:"📸 장독·마당 나무 옮길 날을 따로 잡아 준다", day:2, coop:12}, {t:"🚚 장독·가구 보관 이전비를 내 준다", cost:70, day:1, coop:8}]]]},
  f62:{ic:"🔔", title:"세대 — 여섯 세대의 권리와 일정이 다 다르다",
    hint:"(대표 세 명이 동시에 말한다) '우린 다음 달이요.' '우린 애들 방학 끝나고.' '우린 보증금 받아야 나가요.'",
    tip:"사연을 끝까지 들어 보니 — 한 세대는 대항력이 있다. 그 집은 '나가 달라'가 아니라 '보증금 이야기'부터다.",
    items:[["sched","📅 세대별 이삿날", [{t:"📋 세대마다 날짜표를 따로 받아 정리한다", day:4, coop:6}, {t:"🚚 세대별 이사를 한 업체로 묶어 예약한다", cost:200, day:1, coop:6}]],
           ["rights","⚖️ 세대별 권리 확인", [{t:"📂 세대마다 전입·확정일자를 하나씩 대조한다", day:2}]]]},
  f63:{ic:"🏨", title:"운영 — 건물 인도와 영업 정리는 다른 일이다",
    hint:"손님 예약이 석 달 치 잡혀 있어요. 직원들 월급날도 있고. 건물만 넘기면 끝나는 줄 알아요?",
    tip:"사연을 끝까지 들어 보니 — 예약 마감일만 정해지면 운영자는 스스로 문을 닫을 생각이 있다.",
    items:[["book","📖 예약 장부 정리", [{t:"📅 예약 마감일을 정하고 그 뒤 예약을 막는다", day:5, coop:6}, {t:"💵 남은 예약 환불금을 보태 준다", cost:250, day:1, coop:8}]],
           ["staff","🧹 직원·운영 정리", [{t:"🤝 직원 퇴직 일정을 운영자와 같이 정한다", day:3, coop:4}, {t:"💵 직원 마지막 달 급여 일부를 부담한다", cost:150, day:1, coop:8}]]]}};
// 첫 세 사건 팁(사연을 끝까지 들으면)
Object.assign(MB.k1, {tip:"사연을 끝까지 들어 보니 — 전에 '법'을 앞세운 사람한테 속은 적이 있다. 약속을 지켜 보이는 게 먼저다."});
Object.assign(MB.f11, {tip:"사연을 끝까지 들어 보니 — 새집 계약금이 모자라서 조급하다. 날짜만 맞으면 순순히 나간다."});
Object.assign(MB.f12, {tip:"사연을 끝까지 들어 보니 — 보증금 500이 최우선변제로 돌아온다는 걸 모른다. 그걸 알면 갈 곳 걱정이 풀린다."});
Object.keys(MBG).forEach(k => {
  const G = MBG[k];
  MB[k] = {kind:"gen", ic:G.ic, title:G.title, hint:G.hint, tip:G.tip, gate:!!G.gate,
    items:G.items.map(([id, t]) => [id, t]), alt:"⏳ 시간을 쓰거나 💵 돈을 쓰는 두 갈래가 있어요",
    solved:B => G.items.every(([id]) => B[id])};
  G.items.forEach(([iid, , opts]) => opts.forEach((op, i) => K_MOVES.push({id:`mbg_${k}_${iid}_${i}`, s:op.cost ? "money" : "empathy", t:op.t + (op.cost ? ` (${kMan(op.cost)})` : ""), day:op.day || 1,
    need:o => mbKey() === k && mbB().known && !mbB()[iid]})));
});
// 첫 세 사건 행동도 '막힌 곳을 안 뒤'에만 보인다(1판 믿음은 부딪혀도 알게 된다)
K_MOVES.filter(m => m.id.startsWith("mb_")).forEach(m => { const n0 = m.need; m.need = o => n0(o) && mbB() && mbB().known; });
const _mbg_kMove = kMove;
kMove = function(id){
  const k = mbKey();
  if(!k || !MBG[k]) return _mbg_kMove(id);
  mbInit(); const B = mbB(), o = K.occ, D = MB[k], G = MBG[k];
  if(id.startsWith("mbg_")){
    const m = K_MOVES.find(x => x.id === id); if(!m || (m.need && !m.need(o))) return;
    const [, , iid, idx] = id.match(/^mbg_(\w+?)_(\w+)_(\d+)$/) || [], item = G.items.find(x => x[0] === iid), op = item && item[2][+idx]; if(!op) return;
    if(m.s) K.style[m.s]++; o.turns++;
    B[iid] = true; if(op.cost) K.cost.move += op.cost; if(op.coop) o.coop += op.coop; if(op.cut) B.cut = (B.cut || 1) * op.cut;
    if(op.say) kSay(op.say, op.coop < 0 ? "angry" : "normal"); else kNarr(op.t.replace(/^\S+\s/, "") + " — " + item[1].replace(/^\S+\s/, "") + " 문제가 풀렸다.");
    kLog(`🧩 ${item[1]} 해결 — ${op.cost ? `${kMan(op.cost)} 썼다` : `${op.day || 1}일 썼다`}${op.cut ? " · 요구액이 줄어든다" : ""}`);
    kClampOcc(); mbRelease(); kTick(m.day * (KP.units ? 2 : 1)); return;
  }
  if(id === "date" && D.gate && !mbSolved() && !o.orderOk){
    const m = K_MOVES.find(x => x.id === "date"); o.turns++; B.known = true;
    o.coop -= 3; kSay(k === "f13" ? "(문 너머 조용하다. 한참 뒤 문틈으로 쪽지) '날짜 얘기 할 사이 아니잖아요.'" : "(남편) 날짜는 내가 정해요! …(아내는 끝내 대답하지 않는다)", "angry");
    kLog(`🧩 ${D.title} — 이게 풀리기 전엔 날짜 이야기가 안 된다.`); kClampOcc(); kTick(m.day); return;
  }
  const t0 = o.turns; _mbg_kMove(id);
  if(id === "listen" && o.turns > t0 && !B.known){ B.known = true; kSay(D.hint, "worried"); kLog(`🧩 사정을 들어 보니 — ${D.title}`); }
};
// 요구액: 내역을 풀면 줄어든다(500의 출처 등)
if(typeof kfOccNeed === "function"){ const _mbg_need = kfOccNeed; kfOccNeed = function(){ const n = _mbg_need(), B = mbKey() && MBG[mbKey()] ? mbB() : null; return B && B.cut ? Math.round(n * B.cut / 10) * 10 : n; }; }
// 합의 순간: 막힌 곳이 남아 있으면 이삿날이 밀린다
const _mbg_kOffer = kOffer;
kOffer = function(amt){
  const k = mbKey(); if(!k || !MBG[k]) return _mbg_kOffer(amt);
  mbInit(); const o = K.occ, had = !!o.agreed; _mbg_kOffer(amt);
  if(had || !o.agreed || mbSolved()) return;
  mbB().known = true; const miss = MB[k].items.filter(([id]) => !mbB()[id]).map(([, t]) => t.replace(/^\S+\s/, ""));
  o.agreed.day = Math.max(o.agreed.day, K.day + 21 + (KP.units ? 10 : 0));
  kLog(`🧩 "나가고는 싶은데요…" ${miss.join(" · ")}이(가) 안 풀려서 이삿날이 ${o.agreed.day}일째로 밀렸다. 풀면 당겨진다.`);
};
// 사연을 끝까지 들으면 — 협조도 일괄 보너스 대신 '어디를 풀어야 하는지' 힌트
if(typeof mtAfterListen === "function"){
  const _mt_after = mtAfterListen;
  mtAfterListen = function(had){
    const c0 = K && K.occ ? K.occ.coop : 0, h0 = K && K.occ ? K.occ.heard || 0 : 0;
    _mt_after(had);
    if(!K || !K.occ) return;
    const P = typeof personaById === "function" ? personaById(KP.occ.pid) : null, tale = (KP && KP.tale) || mtTaleOf(P || {id:KP.occ.pid});
    if(K.occ.heard >= tale.length && h0 < tale.length){
      K.occ.coop = c0;   // 일괄 +6 제거 — 끝까지 들은 보상은 정보다
      if(typeof K.log !== "undefined" && K.log.length && /협조도가 더 올랐다/.test(K.log[K.log.length - 1] && (K.log[K.log.length - 1].t || K.log[K.log.length - 1]))) K.log.pop();
      const k = mbKey();
      if(k && MB[k].tip){ const B = mbB(); B.known = true; B.tip = true; kLog("💡 " + MB[k].tip); }
      else kLog("🙇 사연을 끝까지 들었다 — 이 사람이 무엇을 걱정하는지 알게 됐다.");
    }
  };
}
