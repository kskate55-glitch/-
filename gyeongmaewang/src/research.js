/* ================= ⏱️ 임장 = 시간 예산 (조사 1개 = 하루 방식 폐기) =================
   입찰까지 남은 조사 가능 시간을 자원으로 쓴다. 행동마다 소요시간·정보가치·신뢰도·위험이 다르다.
   - 집(any): 짧고 넓지만 얕다(전화·서류·검색). 어디서든 가능.
   - 현장(site): 길지만 깊다. 현장에 없으면 이동시간이 붙는다. 현장에 온 김에 연달아 하면 이동 없음.
   - 서류 검토(home): 집 컴퓨터에서만 — 현장에 있다가 하면 집에 돌아가는 시간이 든다(동선 퍼즐).
   - 재방문(야간·출퇴근): 따로 다시 와야 해서 늘 이동이 붙는다.
   깊은 정보는 '확률'이다 — 시간을 많이 쓸수록, '탐문 달인' 스킬이 높을수록 잘 나온다. */
const KR_BUDGET = 330;                  // 5시간 30분 — 퇴근 후·주말에 쪼개 쓸 수 있는 시간. 다 할 수는 없게 잡았다
const KR_LOC = {any:"📱 어디서든", home:"🏠 집(컴퓨터)", site:"🏚️ 현장"};
function krFmt(m){ m = Math.max(0, Math.round(m)); const h = Math.floor(m/60), mm = m % 60; return h ? `${h}시간${mm ? ` ${mm}분` : ""}` : `${mm}분`; }
function krSkill(){ return typeof sk === "function" ? sk("survey") : 0; }
function krDur(a){ return Array.isArray(a.dur) ? a.dur : [a.dur, a.dur]; }
function krTravel(a){
  if(a.trip) return KP.travel || 60;                        // 재방문 — 늘 새로 온다
  if(a.loc === "site" && K.loc !== "site") return KP.travel || 60;
  if(a.loc === "home" && K.loc === "site") return KP.travel || 60;
  return 0;
}
function krCan(a){ if(K.done[a.id]) return false; if(a.pre && !a.pre.every(p => K.done[p])) return false; return krDur(a)[0] + krTravel(a) <= K.timeLeft; }
function krInit(){ if(K.timeLeft == null){ K.timeLeft = KR_BUDGET; K.loc = "home"; K.rlog = []; K.hint = {}; } }
/* 결과 한 개 뽑기 — outcomes: [{p, reveal, say:[who,t], text, hint, occ, rumor}] 앞에서부터 확률로 시도, 모두 빗나가면 base */
function krRoll(a){
  const bonus = krSkill() * 0.12 + (a.depth ? 0 : 0);
  for(const o of (a.out || [])){ if(K.r() < Math.min(0.97, o.p + (o.skill === false ? 0 : bonus))) return o; }
  return a.base || {text:"특별한 건 없었다."};
}
const _kr_kResearch = kResearch; kResearch = function(id){
  const a = (KP.actions || []).find(x => x.id === id);
  if(!a) return _kr_kResearch(id);
  krInit(); if(!krCan(a)) return;
  const tr = krTravel(a), [d0, d1] = krDur(a), dur = Math.min(K.timeLeft - tr, d0 + Math.round(K.r() * (d1 - d0)));
  K.timeLeft -= tr + dur; K.done[id] = true; K.style.research++;
  if(tr){ K.loc = a.loc === "home" ? "home" : "site"; }
  if(a.trip) K.loc = "site";
  const o = krRoll(a), before = Object.keys(K.found).length;
  if(o.reveal) [].concat(o.reveal).forEach(h => { K.found[h] = true; if(h === "flip") K.occ.daughter = true; });
  if(o.say) [].concat(o.say.length && typeof o.say[0] === "string" ? [o.say] : o.say).forEach(([w, t]) => { if(!K.says.some(s => s.t === t)) K.says.push({who:w, t, id:o.reveal || null}); });
  if(o.hint) K.hint[o.hint] = true;
  if(o.occ) K.occ.coop = Math.max(5, K.occ.coop + o.occ);
  if(o.rumor && K.r() < o.rumor) { K.rivals.push({t:"소문 듣고 온 입찰자", lo:1.10, hi:1.18}); K.hint.rumor = true; }
  const useful = Object.keys(K.found).length > before || !!o.hint || !!o.useful;
  K.rlog.push({id, t:a.t, min:dur, travel:tr, useful, rel:a.rel});
  const head = `${a.ic} [${krFmt(tr + dur)}${tr ? ` · 이동 ${krFmt(tr)} 포함` : ""}]`;
  kLog(`${head} ${o.text || ""}${o.say ? " " + [].concat(o.say.length && typeof o.say[0] === "string" ? [o.say] : o.say).map(([w,t]) => `${w}: “${t}”`).join(" / ") : ""}`.trim());
  K._krNew = {tr, dur, useful};
};
// 이 판에서 시간을 다 쓰면 '입찰까지 0'으로 보이게 — 예전 daysLeft 문구는 쓰지 않는다
function krActionsHTML(){
  krInit();
  const pct = Math.round(K.timeLeft / KR_BUDGET * 100), groups = [["any","📱 집·전화로 — 짧고 넓게, 대신 얕게"], ["home","🏠 집 컴퓨터로 — 서류는 정확하다"], ["site","🏚️ 현장에서 — 길지만 깊게"]];
  const row = a => { const [d0, d1] = krDur(a), tr = krTravel(a), can = krCan(a), done = K.done[a.id];
    const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
    return `<button type="button" class="ag-act kr-act${done ? " done" : ""}" data-kres="${a.id}" ${can ? "" : "disabled"}><span class="ag-ai">${a.ic}</span><span class="kr-main"><b>${esc(a.t)}</b>
      <span class="kr-meta"><em>⏱ ${d0 === d1 ? krFmt(d0) : `${krFmt(d0)}~${krFmt(d1)}`}${tr ? ` <i>+이동 ${krFmt(tr)}</i>` : ""}</em><em title="정보가치">🔎 ${stars(a.iv)}</em><em title="신뢰도">🎯 ${a.rel ? stars(a.rel) : "??"}</em>${a.risk ? `<em class="kr-risk" title="위험">⚠️ ${"●".repeat(a.risk)}</em>` : ""}</span>
      <span class="note kr-state">${done ? "✅ 했음" : !can && (a.pre && !a.pre.every(p=>K.done[p])) ? `🔒 먼저: ${a.pre.map(p => (KP.actions.find(x=>x.id===p)||{}).t).join(", ")}` : !can ? "⌛ 시간이 모자라요" : esc(a.d || "")}</span></span></button>`; };
  return `<div class="panel kr-clock"><div class="kr-clock-top"><b>⏱ 입찰까지 조사 가능 시간</b><span class="kr-left ${K.timeLeft < 120 ? "low" : ""}">${krFmt(K.timeLeft)}</span></div>
    <div class="ke-bar kr-bar"><i style="width:${pct}%"></i></div>
    <div class="note">지금 위치: <b>${K.loc === "site" ? "🏚️ 현장" : "🏠 집"}</b> · 현장에 온 김에 연달아 하면 이동시간이 없어요. 집으로 돌아갔다 다시 오면 또 ${krFmt(KP.travel || 60)}.</div></div>
    ${groups.map(([loc, title]) => { const list = KP.actions.filter(a => a.loc === loc); return list.length ? `<h4 class="kr-grp">${title}</h4><div class="ag-acts vn-acts kr-acts">${list.map(row).join("")}</div>` : ""; }).join("")}`;
}
/* 결과: 조사 효율 */
function krEfficiency(){
  if(!K.rlog) return null;
  const used = KR_BUDGET - K.timeLeft, travel = K.rlog.reduce((s,r)=>s+r.travel, 0), trips = K.rlog.filter(r=>r.travel > 0 && (KP.actions.find(a=>a.id===r.id)||{}).loc !== "home").length;
  const useless = K.rlog.filter(r=>!r.useful).length, hid = KP.hidden.length, found = KP.hidden.filter(h=>K.found[h.id]).length;
  const sc = Math.round(found/hid*55 + (1 - used/KR_BUDGET)*20 + (used ? (1 - travel/used) : 1)*15 + Math.max(0, 10 - useless*3));
  const g = sc >= 85 ? "S" : sc >= 70 ? "A" : sc >= 55 ? "B" : sc >= 40 ? "C" : "D";
  const route = trips <= 1 ? "A" : trips === 2 ? "B" : "C";
  return {used, travel, trips, useless, found, hid, sc, g, route, n:K.rlog.length};
}
function krEffHTML(){
  const E = krEfficiency(); if(!E || !E.n) return "";
  return `<div class="panel kr-eff"><b>🧭 당신의 조사 효율</b><div class="kr-eff-grid">
    <span>총 조사시간</span><b>${krFmt(E.used)} <small>/ ${krFmt(KR_BUDGET)}</small></b>
    <span>숨은 위험 발견</span><b>${E.found} / ${E.hid}</b>
    <span>헛걸음(새 정보 없음)</span><b>${E.useless}회</b>
    <span>현장 이동</span><b>${E.trips}회 · 이동에 ${krFmt(E.travel)}</b>
    <span>동선 효율</span><b class="k-g g${E.route}">${E.route}</b>
    <span>조사 효율</span><b class="k-g g${E.g === "D" ? "C" : E.g}">${E.g}</b></div>
    <small class="note">많이 찾았다고 S가 아니에요 — 적은 시간으로 중요한 걸 찾을수록 높아요.</small></div>`;
}
const _kr_kingHTML = kingHTML; kingHTML = function(){
  let h = _kr_kingHTML();
  if(!K || !KP.actions || K.intro || K.revealing) return h;
  if(K.step === "brief" && !K.sealed){
    // 시계·조사 버튼을 사건파일보다 위로 — 제일 자주 누르는 곳이라서
    h = h.replace(/<h3 class="vn-q">입찰까지[\s\S]*?<\/h3>\s*<div class="ag-acts vn-acts">[\s\S]*?<\/button><\/div>/, "");
    const at = h.indexOf('<div class="panel ke-case">');
    h = at >= 0 ? h.slice(0, at) + krActionsHTML() + h.slice(at) : h + krActionsHTML();
  }
  if(K.step === "result" && K.final) h = h.replace('<div class="panel k-style">', krEffHTML() + '<div class="panel k-style">');
  return h;
};
// 무대 배경 = 지금 있는 곳(집 책상 / 현장)
const _kr_kStage = kStage; kStage = function(bg, who, ex, text, name){
  if(K && K.step === "brief" && KP.actions && bg === "bg_villa_day" && K.loc !== "site" && artUrl("bg_office_1")) bg = "bg_office_1";
  return _kr_kStage(bg, who, ex, text, name);
};
// 조사 시간이 캘린더 날짜를 쓰지 않는다 — 대신 머리 위 HUD가 남은 시간을 보여 준다
const _kr_kStart = kStart; kStart = function(seed){ _kr_kStart(seed); if(KP.actions) krInit(); };
// 결과에 쓰는 '조사 효율'을 판단 등급에도 조금 반영(10%)
const _kr_kFinish = kFinish; kFinish = function(){
  _kr_kFinish();
  if(!K || !K.final || !K.final.judge) return;
  const E = krEfficiency(); if(!E || !E.n) return;
  K.final.eff = E;
  const j = K.final.judge; j.score = Math.round(j.score * 0.9 + E.sc * 0.1); j.g = j.score >= 85 ? "S" : j.score >= 70 ? "A" : j.score >= 55 ? "B" : j.score >= 40 ? "C" : "F";
  j.notes = j.notes.concat([`조사 효율 ${E.g} (${krFmt(E.used)} · 헛걸음 ${E.useless}회)`]);
};

/* ================= 물건별 조사 행동표 ================= */
KP1.travel = 60;
KP1.actions = [
  {id:"trade",  loc:"any",  ic:"📈", t:"실거래가 조회", dur:20, iv:3, rel:4, d:"숫자는 정확, 맥락은 없음",
    out:[{p:0.2, hint:"price", text:"4건 중 비싼 2건이 전부 큰길 쪽 동호수다. …골목 안은 좀 다를 수도.", useful:true}], base:{text:"최근 1년 4건 — 1억 5,500~1억 6,200. 숫자만 보면 1.6은 무난해 보인다."}},
  {id:"docs",   loc:"home", ic:"📄", t:"매각물건명세서·등기부 검토", dur:20, iv:3, rel:5, d:"권리는 여기서 확정",
    base:{text:"대항력 없는 월세 세입자, 배당요구 없음 — 서류상 깔끔하다.", useful:true}},
  {id:"bldg",   loc:"home", ic:"🏢", t:"건축물대장 검토", dur:15, iv:2, rel:5,
    base:{text:"1992년 사용승인 · 지상 4층 · 승강기 없음 · 위반건축물 표시 없음."}},
  {id:"call1",  loc:"any",  ic:"📞", t:"중개사 1곳에 전화", dur:15, iv:2, rel:2, d:"빠르지만 허풍일 수 있음",
    out:[{p:0.12, hint:"price", say:["중개사(전화)","근데 그 골목 안쪽은 좀 덜 나가요."]}], base:{say:["중개사(전화)","1억 6천이면 충분할 것 같아요."]}},
  {id:"call3",  loc:"any",  ic:"☎️", t:"중개사 3곳 전화 돌리기", dur:45, iv:3, rel:3,
    out:[{p:0.45, reveal:"price", say:[["중개사 A","1.6은 충분해요."],["중개사 B","큰길 쪽만 그 정도예요."]]}], base:{say:[["중개사 A","1.6 가능하죠."],["중개사 B","요즘 문의는 좀 있어요."]]}},
  {id:"mgmtcall",loc:"any", ic:"☎️", t:"관리사무소 전화", dur:10, iv:2, rel:3,
    out:[{p:0.45, reveal:"fee", say:["관리실(전화)","체납이… 좀 있긴 해요. 정확한 건 와서 보셔야."]}], base:{say:["관리실(전화)","전화로는 말씀드리기 어려워요."]}},
  {id:"map",    loc:"any",  ic:"🗺️", t:"지도·로드뷰로 골목 보기", dur:20, iv:2, rel:3,
    out:[{p:0.25, hint:"price", text:"로드뷰로 보니 큰길 쪽 빌라들은 신축 라인이다. 이 골목은 경사 끝 구축들.", useful:true}], base:{text:"역까지 도보 9분, 골목 경사가 좀 있다."}},
  {id:"court",  loc:"any",  ic:"⚖️", t:"사건 조회수 확인", dur:10, iv:2, rel:4,
    base:{reveal:"rivals", text:"조회수가 꽤 높다.", useful:true}},
  {id:"ext",    loc:"site", ic:"🏚️", t:"외관·골목·주차 확인", dur:20, iv:2, rel:4,
    out:[{p:0.3, hint:"elec", text:"1층 계량기함 문이 살짝 열려 있다. 안쪽에 검은 테이프가 보인다.", useful:true}], base:{text:"외벽은 멀쩡하고, 주차는 골목에 두세 대가 전부다."}},
  {id:"meter",  loc:"site", ic:"⚡", t:"계량기·차단기 흔적 확인", dur:15, iv:4, rel:4,
    out:[{p:0.85, reveal:"elec", text:"차단기에 검은 테이프가 칭칭 감겨 있다. 사진을 찍어 아는 전기기사에게 보냈다.", say:["전기기사 박기사","테이프로 감아 둔 건 보통 누전 때문이에요. 들어가서 재 봐야 확실한데, 배선 일부 교체면 백만 원대는 잡으세요."]}], base:{text:"계량기함이 잠겨 있어 못 봤다."}},
  {id:"mgmt",   loc:"site", ic:"🏢", t:"관리실 직접 방문", dur:[40,90], iv:4, rel:4, d:"체납·민원·건물 이력",
    out:[{p:0.4, reveal:["fee","flip"], say:["관리인 할아버지","38만원 밀렸어요. 그 양반 착한데 약속을 잘 바꿔 — 딸이 가끔 와서 정리해 줘."]}], base:{reveal:"fee", say:["관리인 할아버지","공용 관리비 38만원 밀렸어요."]}},
  {id:"neigh",  loc:"site", ic:"👵", t:"옆집 탐문", dur:[20,60], iv:4, rel:3, risk:1,
    out:[{p:0.65, reveal:"flip", rumor:0.1, say:["옆집 할머니","그 집 할아버지? 요즘 딸이 자주 드나들더라고. 짐 정리 얘기도 하는 것 같던데… 혼자 지내시느라 고생 많으셨지."]}], base:{text:"옆집은 문을 열어 주지 않았다.", rumor:0.1}},
  {id:"occ",    loc:"site", ic:"🚪", t:"점유자 접촉 시도", dur:[30,120], iv:5, rel:3, risk:4, d:"정보는 크지만 관계가 틀어질 수 있음",
    out:[{p:0.45, reveal:"flip", say:["최만식 할아버지","…딸한테 물어봐야 돼. 난 모르겠소."], occ:-6}], base:{say:["최만식 할아버지","(문 너머) 누구요? 낙찰도 안 됐는데 왜 와!"], occ:-12}},
  {id:"brokers",loc:"site", ic:"🚶", t:"동네 중개업소 3곳 직접 방문", dur:120, iv:5, rel:4, d:"시간은 크지만 시세가 확실해진다",
    out:[{p:0.95, reveal:"price", say:[["중개사 A","1.6 충분해요."],["중개사 B","큰길 쪽만 그 정도죠."],["중개사 C","이 골목은 최근 1.55에도 오래 걸렸어요."]]}]},
  {id:"night",  loc:"site", trip:true, ic:"🌙", t:"밤에 다시 와 보기", dur:120, iv:2, rel:4,
    out:[{p:0.35, hint:"occ", text:"할아버지 집 불이 밤 11시에 켜진다 — 현장 일 나간 날은 늦게 들어온다. 낮엔 만나기 어렵겠다.", useful:true}], base:{text:"조용하다. 주차는 밤에 빡빡하다."}},
  {id:"rush",   loc:"site", trip:true, ic:"🚗", t:"출퇴근 시간에 다시 와 보기", dur:120, iv:1, rel:4,
    base:{text:"아침 8시, 골목이 차 한 대로 꽉 막힌다. 매수자가 싫어할 수 있다."}}
];
KP2.travel = 50;
KP2.actions = [
  {id:"trade",  loc:"any",  ic:"📈", t:"실거래가 조회", dur:20, iv:2, rel:3,
    out:[{p:0.2, hint:"price", text:"1.7~1.8 거래 3건 중 2건은 큰길 신축 라인이다.", useful:true}], base:{text:"최근 1년 1억 7,000~1억 8,000. 겉으로는 마진이 커 보인다."}},
  {id:"docs",   loc:"home", ic:"📄", t:"매각물건명세서·등기부 검토", dur:20, iv:3, rel:5, base:{text:"전 소유자 정은주 씨 거주 — 채무자라 배당 없음, 인도명령 대상.", useful:true}},
  {id:"bldg",   loc:"home", ic:"🏢", t:"건축물대장 검토", dur:15, iv:2, rel:5, base:{text:"1995년 사용승인 · 지상 4층 · 승강기 없음."}},
  {id:"kim",    loc:"any",  ic:"📞", t:"단골 중개사 김사장에게 전화", dur:15, iv:1, rel:1, d:"빠르지만 허풍일 수 있음", base:{say:["김사장","1억 7천은 무조건 됩니다. 요즘 투룸 없어서 난리예요."], useful:true}},
  {id:"call3",  loc:"any",  ic:"☎️", t:"중개사 3곳 전화 돌리기", dur:45, iv:3, rel:3,
    out:[{p:0.4, reveal:"price", say:[["중개사 A","1.7 되죠."],["중개사 B","그 라인은 1.5 후반이에요."]]}], base:{say:[["중개사 A","1.7 되죠."],["중개사 B","글쎄요, 요즘 좀 조용해요."]]}},
  {id:"listing",loc:"any",  ic:"📱", t:"같은 건물 매물 검색", dur:20, iv:4, rel:4, out:[{p:0.9, reveal:"dump", skill:false}], base:{text:"검색이 잘 안 된다. 같은 건물은 안 보인다."}},
  {id:"bank",   loc:"any",  ic:"🏦", t:"은행에 매수자 대출 한도 문의", dur:30, iv:4, rel:4, out:[{p:0.9, reveal:"loan", say:["은행 대출상담","이 라인은 감정이 낮게 나와서 매수자 대출이 적게 나옵니다."], skill:false}]},
  {id:"mgmtcall",loc:"any", ic:"☎️", t:"관리사무소 전화", dur:10, iv:2, rel:2, out:[{p:0.2, hint:"leak", say:["관리실(전화)","예전에 민원이 좀 있긴 했는데… 와서 보세요."]}], base:{say:["관리실(전화)","특이사항 없습니다."]}},
  {id:"court",  loc:"any",  ic:"⚖️", t:"사건 조회수 확인", dur:10, iv:2, rel:4, base:{reveal:"rivals", text:"조회수가 엄청 높다. 다들 겉 마진을 봤다.", useful:true}},
  {id:"ext",    loc:"site", ic:"🏚️", t:"외관·옥상·배관 확인", dur:20, iv:3, rel:4, out:[{p:0.35, hint:"leak", text:"4층 창 아래 외벽에 물 흐른 자국이 있다.", useful:true}], base:{text:"외벽은 오래됐지만 금 간 곳은 없다."}},
  {id:"mgmt",   loc:"site", ic:"🏢", t:"관리실 직접 방문", dur:[40,90], iv:5, rel:4, d:"체납·민원·건물 이력",
    out:[{p:0.7, reveal:"leak", say:["관리인","그 집 작년에 누수 민원 두 번 들어왔어요. 아래층에서요."]}], base:{say:["관리인","관리비 밀린 건 없어요."]}},
  {id:"down",   loc:"site", ic:"👩", t:"아래층 주민 탐문", dur:[20,60], iv:5, rel:3, risk:1,
    out:[{p:0.75, reveal:"leak", say:["아래층 아주머니","작년에도 물 샜어요. 고쳤다고는 했는데…"], rumor:0.1}], base:{text:"아래층은 집에 아무도 없었다.", rumor:0.1}},
  {id:"park",   loc:"site", ic:"🏢", t:"박 중개사 사무실 방문", dur:[30,60], iv:4, rel:4, out:[{p:0.9, reveal:"price", say:["박 중개사","1억 5천 후반이 현실적이에요. 1.7은 큰길 얘기고요."]}]},
  {id:"brokers",loc:"site", ic:"🚶", t:"동네 중개업소 3곳 직접 방문", dur:120, iv:5, rel:4,
    out:[{p:0.9, reveal:["price","dump"], say:[["중개사 A","1.7 충분하죠."],["박 중개사","1.5 후반이 현실적이에요."],["중개사 C","같은 건물 3층이 1.62 급매로 나와 있어요."]]}], base:{reveal:"price", say:["박 중개사","1.5 후반이 현실적이에요."]}},
  {id:"occ",    loc:"site", ic:"🚪", t:"정은주 씨 접촉 시도", dur:[30,120], iv:3, rel:2, risk:2,
    out:[{p:0.6, say:["정은주 씨","네, 집은… 괜찮아요. 누수요? 처음 듣는데요."], occ:-3}], base:{text:"집에 아무도 없었다.", occ:-3}},
  {id:"night",  loc:"site", trip:true, ic:"🌙", t:"밤에 다시 와 보기", dur:120, iv:1, rel:4, base:{text:"조용하고 주차도 여유 있다. …이 물건의 문제는 이게 아닌 것 같다."}}
];
