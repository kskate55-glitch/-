/* ================= 🎭 경매 투자자의 삶 — 6명 캐릭터 · 생활 거점 · 하루 시간 · 체력/스트레스 · 장비 · 인맥 · 거점 이사 · 커리어 =================
   원칙: 경매가 주인공이다. 생활은 경매 판단을 흔드는 보조 시스템일 뿐 — 노가다가 되지 않게.
   캐릭터를 고르지 않은 기존 플레이어는 예전과 똑같이 돈다(모든 효과는 lfOn()일 때만). */

/* ---------- 1. 캐릭터 6명 — 성별이 아니라 경력·생활이 차이를 만든다 ---------- */
const LF_STAT_NAMES = {stamina:"체력", info:"정보탐색", nego:"협상", law:"법률", market:"시세감각", field:"현장감각", interior:"인테리어", broker:"중개사 친화", repair:"수리감각", sell:"매도감각"};
const LF_CHARS = [
  {id:"seoyun", name:"한서윤", sex:"여", age:25, emo:"👩‍💻", tag:"시간 많은 정보수집형 초보", job:"취업 준비생(과외·알바)", base:"sillim", cash:3500,
   st:{stamina:92, info:88, nego:38, law:30, market:42, field:48, interior:68, broker:58, repair:40, sell:52},
   pros:["검색이 빠르고 온라인 조사가 강하다","하루에 쓸 수 있는 시간이 길다","성장이 빠르다"], cons:["자본이 아주 적다(대출 이자)","협상 경험 부족","처음엔 중개사들이 초보 취급"],
   passives:[["🔍","검색창을 닫지 않는다","온라인 조사 시간 −20%"],["📈","흡수력","경험치 +15%"]],
   intro:["신림동 반지하 원룸. 창문 높이로 사람들 발목이 지나간다.","노트북을 켠다. 즐겨찾기 맨 위 — 법원 경매정보.","'돈은 없어도 시간은 있다. 발품은 내가 제일 많이 판다.'"], time:"21:40"},
  {id:"dohyun", name:"이도현", sex:"남", age:32, emo:"👨‍💼", tag:"균형형 직장인", job:"대기업 사무직", base:"hwagok", cash:7000,
   st:{stamina:78, info:72, nego:56, law:47, market:60, field:52, interior:48, broker:55, repair:45, sell:60},
   pros:["능력치가 고르다","매달 월급이 들어온다"], cons:["평일 낮엔 회사 — 퇴근 후에만 움직인다","압도적인 강점은 없다"],
   passives:[["🌙","퇴근 후 두 시간","저녁 7시 이후 조사 효율 +15%"],["💳","월급날","매달 월급 입금"]],
   intro:["화곡동 6평 원룸. 퇴근하고 넥타이를 푼다. 밤 8시.","책상 위엔 어제 뽑아 둔 사건 목록.","'무리하지 말자. 대신 꾸준히.'"], time:"20:00"},
  {id:"mijeong", name:"윤미정", sex:"여", age:41, emo:"👩‍🍳", tag:"사람 잘 다루는 자영업자", job:"서비스업 사장 15년", base:"yeongdeungpo", cash:9500,
   st:{stamina:67, info:52, nego:84, law:42, market:64, field:66, interior:70, broker:86, repair:55, sell:73},
   pros:["명도·업자·매수자 협상","중개사와 금방 친해진다","말투로 사람을 읽는다"], cons:["온라인 조사가 느리다","법률이 복잡한 물건에 약하다","가게 때문에 오후 브레이크에만 움직인다"],
   passives:[["🗣️","사장님, 잠깐만요","매도 역제안 성공률 +15%"],["☕","단골 만들기","같은 사람을 다시 만날수록 관계가 빨리 오른다"]],
   intro:["영등포구 오래된 투룸. 가게 마감 전화를 끊고 서류를 펼친다.","'집도 결국 사람이 사고파는 거야.'"], time:"22:10"},
  {id:"jaehoon", name:"박재훈", sex:"남", age:49, emo:"👷", tag:"현장파 베테랑", job:"건설·설비 경력", base:"bulgwang", cash:14000,
   st:{stamina:62, info:42, nego:69, law:55, market:76, field:92, interior:77, broker:72, repair:90, sell:65},
   pros:["숨은 하자를 잘 찾는다","공사 견적을 정확히 본다","과한 리모델링을 안 한다"], cons:["온라인 조사가 느리다","현장을 여러 번 돌면 금방 지친다"],
   passives:[["👀","딱 보면 안다","현장 조사에서 숨은 위험 발견 확률 ↑"],["🧰","이거 얼마 안 들어","수리비 −8%"]],
   intro:["불광동 구축 아파트. 작업복을 벗고 물건 사진을 확대한다.","'외벽 크랙, 창틀 곰팡이… 사진만 봐도 절반은 보여.'"], time:"19:30"},
  {id:"eunkyung", name:"최은경", sex:"여", age:57, emo:"👩‍💼", tag:"금융·회계형 투자자", job:"금융·회계 은퇴", base:"mapo", cash:17000,
   st:{stamina:52, info:60, nego:58, law:78, market:88, field:57, interior:42, broker:52, repair:40, sell:75},
   pros:["손익·세금 계산","입찰 상한을 지킨다","손절 판단이 빠르다"], cons:["체력이 낮다","인테리어 판단이 약하다","감정적인 점유자는 조금 버겁다"],
   passives:[["🧮","계산기부터 켠다","입찰표에 예상 순이익·입찰 상한 표시"],["🛑","손절도 수익이다","손실이 커지면 먼저 경고"]],
   intro:["마포 소형 오피스텔. 계산기와 엑셀을 켠다.","'크게 벌 필요는 없어. 크게 잃지만 않으면 돼.'"], time:"09:10"},
  {id:"taesik", name:"김태식", sex:"남", age:68, emo:"👴", tag:"노련한 부동산 노장", job:"제조업 관리직 은퇴", base:"mokdong", cash:22000,
   st:{stamina:38, info:30, nego:87, law:67, market:91, field:88, interior:45, broker:94, repair:61, sell:82},
   pros:["시세 감이 정확하다","중개사 인맥","거짓말을 잘 알아챈다"], cons:["체력이 매우 낮다","온라인 조사가 느리다","임장을 여러 번 못 돈다"],
   passives:[["🏘️","내가 이 동네를 몇 년 봤는데","주민·중개사에게서 정보가 더 나온다"],["🧐","사람 얼굴 보면 안다","허풍을 바로 알아챈다"],["🪑","오늘은 여기까지","체력이 떨어지면 현장 조사가 확 느려진다"]],
   intro:["목동 오래된 아파트 거실. 안경을 고쳐 쓰고 서류를 본다.","전화를 건다. '어이 김사장, 나야. 은평 쪽 그거 말이야…'"], time:"10:30"}];
// 거점 — 이름이 곧 인생. 성장하면 이사한다(월 고정비와 효율이 같이 오른다)
const LF_BASES = {
  sillim:      {t:"신림동 반지하 원룸", tier:0, rent:75, rest:0.85, focus:0.95, bg:"bg_office_1"},
  hwagok:      {t:"화곡동 6평 원룸", tier:0, rent:110, rest:0.9, focus:1, bg:"bg_office_1"},
  yeongdeungpo:{t:"영등포구 오래된 투룸", tier:1, rent:130, rest:0.95, focus:1, bg:"bg_office_1"},
  bulgwang:    {t:"불광동 구축 아파트", tier:1, rent:140, rest:1, focus:1, bg:"bg_office_1"},
  mapo:        {t:"마포 소형 오피스텔", tier:1, rent:150, rest:1, focus:1.05, bg:"bg_office_1"},
  mokdong:     {t:"목동 오래된 자가 아파트", tier:1, rent:200, rest:1.05, focus:1, bg:"bg_office_1"},
  ydp_office:  {t:"영등포 소형 사무실", tier:2, rent:230, rest:1, focus:1.1, bg:"bg_office_2", need:25000},
  mapo_share:  {t:"마포 공유오피스", tier:2, rent:260, rest:1, focus:1.12, bg:"bg_office_2", need:35000},
  yeouido:     {t:"여의도 소형 사무실", tier:3, rent:420, rest:1.05, focus:1.18, bg:"bg_office_2", need:60000},
  gangnam:     {t:"강남 소형 개인사무실", tier:3, rent:560, rest:1.1, focus:1.22, bg:"bg_office_3", need:80000},
  mine:        {t:"내 경매 사무실", tier:4, rent:700, rest:1.15, focus:1.3, bg:"bg_office_3", need:100000}};
// 매달 들어오는 돈(생활비·월세 빼기 전) — 캐릭터 생활 그대로
const LF_INCOME = {seoyun:230, dohyun:240, mijeong:180, jaehoon:150, eunkyung:120, taesik:150};   // (구버전 저장 호환용 — 지금은 LF_ECON을 쓴다)
// 인생 조건 — 돈이 어디서 들어오고 어디로 나가는지, 무엇이 발목을 잡는지
const LF_ECON = {
  seoyun:  {inc:[130, 280], incT:"과외·단기 알바(들쭉날쭉)", fixed:85, housing:"보증금 500 · 월세 42 · 관리비 7 · 생활비", liab:["low_capital"], liabT:"자본이 가장 적다 — 대출 이자와 보증금이 늘 발목", life:"돈은 없다. 대신 하루 종일 움직일 수 있다.", quote:"시간은 많아. 돈이 없어서 그렇지."},
  dohyun:  {inc:[390, 390], incT:"월급(세후)", fixed:210, housing:"월세 75 · 관리비 7", liab:["workday_block"], liabT:"평일 09~18시는 회사 — 연차·반차를 아껴 써야 한다", life:"월급은 들어온다. 대신 평일 오후 2시에 임장은 못 간다.", quote:"회사 다니면서도 할 수 있겠지."},
  mijeong: {inc:[250, 650], incT:"가게 수입(달마다 다름)", fixed:360, housing:"전세대출 이자·관리비 · 가게 임대료·보험", liab:["business_interruptions"], liabT:"가게에 일이 터지면 오늘 임장은 취소", life:"사람 상대는 자신 있다. 가게만 조용하면.", quote:"사람 상대하는 건 내가 해봤지."},
  jaehoon: {inc:[150, 400], incT:"현장·설비 프로젝트(변동)", fixed:260, housing:"대출 이자 · 관리비", liab:["slow_online_research"], liabT:"컴퓨터 앞에선 느리다 — 서류·온라인이 약하다", life:"눈으로 보면 다 안다. 컴퓨터가 문제지.", quote:"사진 말고 직접 봐야 알아."},
  eunkyung:{inc:[170, 190], incT:"퇴직연금·금융소득", fixed:190, housing:"오피스텔 관리비 · 보험", liab:["field_fatigue"], liabT:"하루에 현장 여러 곳은 무리 — 체력이 먼저 바닥난다", life:"계산은 누구보다 정확하다. 발이 못 따라올 뿐.", quote:"일단 숫자부터 맞춰보죠."},
  taesik:  {inc:[200, 230], incT:"연금 + 임대수입", fixed:200, housing:"자가 — 관리비·병원비·경조사", liab:["low_stamina"], liabT:"몸으로 때울 수 없다 — 전화와 핵심 임장 하나로 승부", life:"돈도 있고 인맥도 있다. 하지만 몸으로 때울 수는 없다.", quote:"싸다고 좋은 물건이면 다 부자 됐지."}};
const LF_LEAVE_PER_YEAR = 15;
// 조사할 수 있는 시간대(요일별) — 분 단위 [시작, 길이]
const LF_WINDOW = {
  seoyun:  () => [600, 260],
  dohyun:  dow => dow === 0 || dow === 6 ? [600, 280] : [1170, 130],
  mijeong: dow => dow === 0 ? [600, 280] : [840, 160],
  jaehoon: () => [600, 210],
  eunkyung:() => [600, 230],
  taesik:  () => [540, 220]};
function lfEkTarget(){ const L = lfRec(); return L && L.path === "safe" ? 1000 : L && L.path === "expand" ? 300 : 600; }   // 최은경 계산기 기준선(인생 갈림길로 바뀐다)
const LF_RESEARCH_DAYS = 2;       // 입찰 이틀 전부터 조사 — 입찰 당일은 법원
function lfResearchDayCount(){ const L = lfRec(); return L && (L.char === "seoyun" || (L.path === "fulltime")) ? 3 : LF_RESEARCH_DAYS; }   // 시간 많은 사람은 하루 더 판다
// 요일별 조사 가능 시간 — 같은 시간대인 요일끼리 묶어 표로
function lfWindowTable(){
  const hm = m => `${String(Math.floor(m / 60) % 24).padStart(2,"0")}:${String(m % 60).padStart(2,"0")}`;
  const rows = []; [1,2,3,4,5,6,0].forEach(d => { const [s, len] = lfWindow(d), k = s + "|" + len, last = rows[rows.length - 1]; if(last && last.k === k) last.d.push(d); else rows.push({k, s, len, d:[d]}); });
  const name = ds => ds.length === 5 && ds[0] === 1 && ds[4] === 5 ? "평일(월~금)" : ds.length === 2 && ds[0] === 6 && ds[1] === 0 ? "주말(토·일)" : ds.length === 7 ? "매일" : ds.length > 2 ? `${SN_DOW[ds[0]]}~${SN_DOW[ds[ds.length - 1]]}` : ds.map(d => SN_DOW[d]).join("·");
  const L = lfRec(), note = L && L.char === "dohyun" && L.path !== "quit" ? `<small class="note">🏢 평일 입찰일엔 반차(0.5일)를 써요 · 남은 연차 ${L.leave}일</small>` : "";
  return `<table class="lf-wtab">${rows.map(r => `<tr><th>${name(r.d)}</th><td>${hm(r.s)} ~ ${hm(r.s + r.len)}</td><td class="note">${krFmt(r.len)}</td></tr>`).join("")}</table>${note}`;
}
function lfWindow(dow){
  const L = lfRec(); let w = LF_WINDOW[L.char](dow);
  const P = LF_PATHS[L.char] && L.path ? LF_PATHS[L.char].opts.find(o => o.id === L.path) : null;
  if(P && P.window) w = P.window(dow, w);
  return w;
}

/* ---------- 상태 ---------- */
function lfRec(){ const c = kcRec(); return c.life || null; }
function lfOn(){ return !!lfRec(); }
function lfChar(){ const L = lfRec(); return L ? LF_CHARS.find(x => x.id === L.char) : null; }
function lfSt(k){ const L = lfRec(); return L ? (L.st[k] || 50) : 55; }
function lfIs(id){ const L = lfRec(); return !!L && L.char === id; }
const LF_EPOCH = Date.UTC(2026, 2, 2);         // 2026.03.02(월) 00:00 = 인생 1일차
function lfDate(min){ const L = lfRec(); min = min == null ? (L ? L.t : 0) : min; const ms = LF_EPOCH + min * 60000, d = new Date(ms); return {ms, y:d.getUTCFullYear(), m:d.getUTCMonth()+1, d:d.getUTCDate(), dow:d.getUTCDay(), h:d.getUTCHours(), mi:d.getUTCMinutes()}; }
function lfClock(min){ const D = lfDate(min); return `${D.m}/${D.d}(${SN_DOW[D.dow]}) ${String(D.h).padStart(2,"0")}:${String(D.mi).padStart(2,"0")}`; }
function lfNew(id){
  const C = LF_CHARS.find(x => x.id === id); if(!C) return;
  const c = kcRec();
  delete c.board; c.cash = C.cash; c.start = C.cash; c.total = 0; c.cases = 0; c.wins = 0; c.fails = 0; c.bids = 0; c.lostBids = 0; c.best = null; c.worst = null; c.streak = 0; c.history = [];
  const [h, mi] = C.time.split(":").map(Number);
  c.life = {char:id, leave:(id === "dohyun" ? LF_LEAVE_PER_YEAR : 0), path:null, t:h * 60 + mi, st:Object.assign({}, C.st), sta:C.st.stamina, stress:10, base:C.base, equip:{}, rel:{}, month:"2026-03", log:[], xp:{}, titles:{}, stats:{solo:0, loss:0}, born:Date.now(), intro:true, nextEvt:0};
  if(typeof save === "function") save();
}
function lfLog(t){ const L = lfRec(); if(!L) return; L.log.unshift({t, at:L.t}); L.log = L.log.slice(0, 30); }

/* ---------- 2. 시간 흐름 · 달 바뀜(월급·월세·이자) · 생활 이벤트 ---------- */
function lfBaseInfo(){ const L = lfRec(); return LF_BASES[L.base] || LF_BASES.hwagok; }
function lfEcon(){ const L = lfRec(), E = Object.assign({}, LF_ECON[L.char]); const P = LF_PATHS[L.char] && L.path ? LF_PATHS[L.char].opts.find(o => o.id === L.path) : null; if(P && P.econ) Object.assign(E, P.econ(E)); return E; }
function lfMonthly(roll){
  const L = lfRec(), C = lfChar(), B = lfBaseInfo(), E = lfEcon(), eq = Object.keys(L.equip).reduce((s, k) => s + ((LF_EQUIP.find(e => e.id === k) || {}).upkeep || 0), 0);
  const debt = Math.max(0, -kcRec().cash), interest = Math.round(debt * 0.055 / 12);
  const income = roll != null ? Math.round((E.inc[0] + (E.inc[1] - E.inc[0]) * roll) / 10) * 10 : Math.round((E.inc[0] + E.inc[1]) / 2);
  const rent = E.fixed + Math.max(0, B.rent - LF_BASES[C.base].rent);
  return {income, rent, upkeep:eq, interest, net:income - rent - eq - interest, range:E.inc};
}
function lfAdvance(min, why){
  const L = lfRec(); if(!L || !(min > 0)) return;
  const before = lfDate(L.t); L.t += Math.round(min);
  const after = lfDate(L.t);
  // 달이 바뀔 때마다 정산
  let y = before.y, m = before.m, guard = 0;
  while((y < after.y || (y === after.y && m < after.m)) && guard++ < 60){
    m++; if(m > 12){ m = 1; y++; }
    const M = lfMonthly(kRng((y * 100 + m) * 7919 + (L.born % 9973))()), c = kcRec(); c.cash = Math.round(c.cash + M.net); if(m === 1 && L.char === "dohyun") L.leave = LF_LEAVE_PER_YEAR;
    lfLog(`📆 ${y}.${String(m).padStart(2,"0")} 정산 — ${M.income ? `수입 +${kMan(M.income)} · ` : ""}생활비·고정비 −${kMan(M.rent)}${M.upkeep ? ` · 장비 유지 −${kMan(M.upkeep)}` : ""}${M.interest ? ` · 대출 이자 −${kMan(M.interest)}` : ""}`);
  }
  // 하루가 넘어가면 잠으로 체력 회복(너무 늦게 자면 덜 회복 + 스트레스)
  const days = Math.floor((L.t + 300) / 1440) - Math.floor((L.t - min + 300) / 1440);   // 새벽 5시 기준
  if(days > 0){ const B = lfBaseInfo(); L.sta = Math.min(L.st.stamina, L.sta + Math.round(L.st.stamina * 0.7 * B.rest) * days); L.stress = Math.max(0, L.stress - 3 * days); }
  lfEvent();
}
function lfTire(n){ const L = lfRec(); if(!L) return; L.sta = Math.max(0, Math.min(L.st.stamina, L.sta - n)); }
function lfStress(n){ const L = lfRec(); if(!L) return; L.stress = Math.max(0, Math.min(100, L.stress + n)); }
// 생활 이벤트 — 작지만 시간·돈·정보에 실제로 닿는다
const LF_EVENTS = [
  {id:"update", w:3, t:"💻 노트북 업데이트가 시작됐다 — \"끄지 마십시오\". 다음 조사 시간이 30분 줄어든다.", f:L => { L.fx.updatePenalty = 30; }},
  {id:"broker", w:3, t:"📞 김사장: \"사장님, 전에 보던 거 있잖아요 — 그 동네에 싼 거 하나 나왔어요.\" 게시판 물건 하나의 관심도가 보인다.", f:L => { L.fx.tip = true; lfRel("김사장", 1); }},
  {id:"sleep", w:3, t:"😵 계약 생각에 잠을 설쳤다. 체력 −10.", f:L => { lfTire(10); }},
  {id:"book", w:2, t:"📦 주문한 경매책이 도착했다. 다음 공부 효율 +50%.", f:L => { L.fx.book = true; }},
  {id:"thanks", w:2, need:L => kcRec().cases >= 1, t:"💌 예전 점유자에게서 문자: \"그때 잘 해결해 주셔서 감사했어요.\" 스트레스 −5 · 명성 +3.", f:L => { lfStress(-5); if(typeof hubAward === "function") hubAward(5, 3, "💌 예전 점유자의 감사 문자"); }},
  {id:"friend", w:2, t:"🍻 친구: \"요즘 뭐 해? 경매? 오 ㅋㅋ\" 수다 떨고 왔다. 스트레스 −6, 대신 2시간이 갔다.", f:L => { lfStress(-6); L.t += 120; }},
  {id:"card", w:1, t:"💳 카드 명세서 — 이번 달 생활비가 예상보다 30만원 더 나갔다.", f:L => { kcRec().cash -= 30; }},
  {id:"quiet", w:4, t:null, f:()=>{}}];
function lfEvent(){
  const L = lfRec(); if(!L) return; L.fx = L.fx || {};
  if(L.t < (L.nextEvt || 0)) return;
  L.nextEvt = L.t + 1440 * (2 + Math.floor(Math.random() * 3));
  const pool = LF_EVENTS.filter(e => !e.need || e.need(L)), tot = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * tot, e = pool[0]; for(const x of pool){ r -= x.w; if(r <= 0){ e = x; break; } }
  if(!e.t) return; e.f(L); lfLog(e.t); if(typeof HUB_TOAST !== "undefined") HUB_TOAST.push({t:e.t});
}

/* ---------- 3. 장비 · 인맥 ---------- */
const LF_EQUIP = [
  {id:"laptop", ic:"💻", t:"고급 노트북", cost:250, d:"온라인 조사 시간 −12%"},
  {id:"dual",   ic:"🖥️", t:"듀얼 모니터", cost:45, d:"실거래·매물 비교 시간 −20%"},
  {id:"printer",ic:"🖨️", t:"레이저 프린터", cost:35, d:"서류 검토 시간 −15%"},
  {id:"car",    ic:"🚗", t:"중고차", cost:1300, upkeep:25, d:"현장 이동 시간 −35% · 매달 유지비 25만원"}];
function lfHas(id){ const L = lfRec(); return !!(L && L.equip[id]); }
// 인맥: 이름 있는 사람과의 관계(0~5). 관계가 오르면 실제로 돕는다
const LF_PEOPLE = {
  "김사장":{ic:"🏠", role:"중개사", perk:"관계 3↑ — 새 물건 귀띔(게시판 관심도 공개)"},
  "박 중개사":{ic:"🏢", role:"중개사", perk:"관계 2↑ — 시세 조사 정확도 ↑"},
  "박 실장":{ic:"🛠️", role:"인테리어", perk:"관계 2↑ — 수리비 −5% · 공사 2일 단축"},
  "최 기사":{ic:"⚡", role:"전기기사", perk:"관계 2↑ — 전기 하자 수리비 −30%"},
  "법무사 사무실":{ic:"⚖️", role:"법무사", perk:"관계 2↑ — 인도명령 결정이 5일 빨라진다"},
  "이삿짐 사장":{ic:"🚚", role:"이삿짐", perk:"관계 2↑ — 명도 이사비 요구 −10%"}};
function lfRel(name, n){ const L = lfRec(); if(!L) return 0; const cur = L.rel[name] || 0; const mul = lfIs("mijeong") && cur >= 1 ? 1.5 : 1; L.rel[name] = Math.min(5, +(cur + n * mul).toFixed(1)); return L.rel[name]; }
function lfRelOf(name){ const L = lfRec(); return L ? (L.rel[name] || 0) : 0; }

/* ---------- 4. 경매 엔진에 들어가는 캐릭터 효과 ---------- */
const LF_BROKER_ACTS = /^(call1|call3|brokers|kim|park|listing)$/;
const LF_LAW_ACTS = /^(docs|court|bank|bldg)$/;
const LF_PEOPLE_ACTS = /^(neigh|down|mgmt|mgmtcall|occ|brokers|park|kim|call1|call3)$/;
function lfDurMul(a){
  if(!lfOn() || !K) return 1;
  let m = 1;
  if(a.loc === "site"){ m *= 1.15 - lfSt("field") / 400; const L = lfRec(), r = L.sta / L.st.stamina; if(lfIs("taesik") && r < 0.4) m *= 1.6; else if(r < 0.3) m *= 1.25; }
  else { m *= 1.2 - lfSt("info") / 250; if(lfIs("seoyun")) m *= 0.8; if(lfHas("laptop")) m *= 0.88; if(a.id === "docs" && lfHas("printer")) m *= 0.85; if(/^(trade|listing)$/.test(a.id) && lfHas("dual")) m *= 0.8; }
  if(lfIs("dohyun") && typeof bdClock === "function" && bdClock().h >= 19) m *= 0.87;
  m *= 1 / (lfBaseInfo().focus || 1) ** (a.loc === "site" ? 0 : 1);
  return m;
}
function lfRevealBonus(a){
  if(!lfOn()) return 0;
  let b = 0;
  if(a.loc === "site") b += (lfSt("field") - 55) / 400; else b += (lfSt("info") - 55) / 500;
  if(LF_BROKER_ACTS.test(a.id)) b += (lfSt("broker") - 55) / 350;
  if(LF_LAW_ACTS.test(a.id)) b += (lfSt("law") - 55) / 400;
  if(lfIs("jaehoon") && a.loc === "site") b += 0.06;
  if(lfIs("taesik") && LF_PEOPLE_ACTS.test(a.id)) b += 0.08;
  // 젊은 초보를 얕보는 중개사 — 두 번째 만남부터는 사라진다(관계로 뒤집는다)
  if(lfIs("seoyun") && LF_BROKER_ACTS.test(a.id) && (typeof nmRec === "function" ? ((nmRec()["김사장"]||{}).met || 0) + ((nmRec()["박 중개사"]||{}).met || 0) : 0) < 2) b -= 0.08;
  if(/^(park|brokers)$/.test(a.id) && lfRelOf("박 중개사") >= 2) b += 0.08;
  b -= lfRec().stress / 800;
  return b;
}
const _lf_krDur = krDur; krDur = function(a){ const d = _lf_krDur(a), m = lfDurMul(a); return m === 1 ? d : d.map(x => Math.max(5, Math.round(x * m))); };
const _lf_krTravel = krTravel; krTravel = function(a){ const t = _lf_krTravel(a); return t && lfOn() && lfHas("car") ? Math.round(t * 0.65) : t; };
const _lf_krRoll = krRoll; krRoll = function(a){
  const b = lfRevealBonus(a); if(!b || !a.out) return _lf_krRoll(a);
  return _lf_krRoll(Object.assign({}, a, {out:a.out.map(o => o.skill === false ? o : Object.assign({}, o, {p:Math.max(0.02, Math.min(0.97, o.p + b))}))}));
};
const _lf_kOccNeed = kOccNeed; kOccNeed = function(){ const n = _lf_kOccNeed(); if(!lfOn()) return n; let m = 1.2 - lfSt("nego") / 300; if(lfRelOf("이삿짐 사장") >= 2) m *= 0.9; if(lfRec().stress > 60) m *= 1.05; return Math.round(n * m / 10) * 10; };
// 협상력 = 이사 날짜를 당기는 힘(말이 통하면 빨리 나간다)
function lfSoonerDays(){ return Math.max(-2, Math.round((lfSt("nego") - 55) / 9)); }
const _lf_kOffer = kOffer; kOffer = function(a){ const had = K.occ.agreed; _lf_kOffer(a); if(lfOn() && !had && K.occ.agreed){ const d = lfSoonerDays(); if(d){ K.occ.agreed.day = Math.max(K.day + 3, K.occ.agreed.day - d); if(d > 0) kLog(`🤝 말이 잘 통했다 — 이사 날짜가 ${d}일 당겨졌다.`); } } };
if(typeof k2Offer === "function"){ const _lf_k2Offer = k2Offer; k2Offer = function(a){ _lf_k2Offer(a); if(lfOn() && K.occ.agreed){ const d = lfSoonerDays(); if(d) K.occ.agreed.day = Math.max(K.day + 3, K.occ.agreed.day - d); } }; }
// 수리비: 수리감각·박재훈·박 실장
function lfRepairAdjust(delta, rid){
  if(!lfOn() || !(delta > 0)) return;
  let m = 1.12 - lfSt("repair") / 400; if(lfIs("jaehoon")) m *= 0.92; if(lfRelOf("박 실장") >= 2) m *= 0.95;
  const diff = Math.round(delta * m) - delta; K.cost.repair += diff;
  if(lfRelOf("박 실장") >= 2) K.day = Math.max(0, K.day - 2);
  lfRel("박 실장", 0.5);
}
const _lf_kRepair = kRepair; kRepair = function(id){ const c0 = K.cost.repair; _lf_kRepair(id); lfRepairAdjust(K.cost.repair - c0, id); };
if(typeof k2Fix === "function"){ const _lf_k2Fix = k2Fix; k2Fix = function(id){ const c0 = K.cost.repair; _lf_k2Fix(id); if(K && K.step !== "result") lfRepairAdjust(K.cost.repair - c0, id); }; }
// 전기 하자: 최 기사
const _lf_kDefect = kDefect; kDefect = function(){ _lf_kDefect(); if(lfOn() && lfRelOf("최 기사") >= 2 && K.defects && K.defects[0] && /누전/.test(K.defects[0].t)){ const cut = Math.round(K.defects[0].cost * 0.3); K.defects[0].cost -= cut; K.cost.repair -= cut; kLog(`⚡ 최 기사가 먼저 와 줬다 — 누전 수리비 ${kMan(cut)} 절약`); } if(lfOn()) lfRel("최 기사", 0.5); };
// 인도명령: 법무사
const _lf_kMove = kMove; kMove = function(id){ _lf_kMove(id); if(lfOn() && id === "order" && K.occ.order && lfRelOf("법무사 사무실") >= 2){ K.occ.order = Math.max(K.day + 3, K.occ.order - 5); kLog("⚖️ 법무사 사무실이 서류를 서둘러 줬다 — 결정이 5일 빨라진다."); } if(lfOn() && id === "order") lfRel("법무사 사무실", 0.7); };
// 매도: 매도감각이 실제 거래 가격에 붙는다 · 윤미정 역제안
function lfSellAdjust(){ if(!lfOn() || !K.sale || K._lfSell) return; K._lfSell = true; K.sale.trueP = Math.round(K.sale.trueP * (1 + (lfSt("sell") - 60) / 800)); }
const _lf_kList = kList; kList = function(p){ _lf_kList(p); lfSellAdjust(); };
if(typeof k2List === "function"){ const _lf_k2List = k2List; k2List = function(p){ _lf_k2List(p); lfSellAdjust(); }; }
function lfBiasFirstRoll(fn){ const r0 = K.r; let first = true; K.r = () => { const v = r0(); if(first){ first = false; return Math.max(0, v - 0.15); } return v; }; try{ return fn(); } finally { if(K) K.r = r0; } }
const _lf_kSale = kSaleAnswer; kSaleAnswer = function(kind){ if(kind === "counter" && lfIs("mijeong")) return lfBiasFirstRoll(() => _lf_kSale(kind)); return _lf_kSale(kind); };
if(typeof k2Answer === "function"){ const _lf_k2A = k2Answer; k2Answer = function(kind){ if(kind === "counter" && lfIs("mijeong")) return lfBiasFirstRoll(() => _lf_k2A(kind)); return _lf_k2A(kind); }; }
// 경험치: 한서윤 +15%
const _lf_hubAward = hubAward; hubAward = function(xp, rep, why){ return _lf_hubAward(lfIs("seoyun") ? xp * 1.15 : xp, rep, why); };

/* ---------- 5. 조사 기간 = 입찰 전 이틀 · 캐릭터마다 다른 시간대 · 체력 ---------- */
function lfResearchDays(){
  const L = lfRec(), out = [];
  for(let i = 0; i < lfResearchDayCount(); i++){ const D = lfDate(K.lf.day0 + i * 1440), [s, len] = lfWindow(D.dow); out.push({dow:D.dow, s, len}); }
  return out;
}
const _lf_kStart = kStart; kStart = function(seed){
  _lf_kStart(seed); if(!K) return;
  K.lf = null;
  if(!lfOn() || K.mode === "free") return;
  const L = lfRec(); L.fx = L.fx || {};
  // 조사 1일차 = 지금 시각 기준 다음 날(오늘이 이미 늦었으면)
  const today = Math.floor(L.t / 1440) * 1440, day0 = L.t % 1440 < 20 * 60 ? today : today + 1440;
  K.lf = {day0, rday:0};
  const days = lfResearchDays(); K.lf.days = days;
  // 생활 사정 — 예약돼 있던 일이 조사 첫날 시간을 깎는다
  if(L.fx.cutFirst){ days[0].len = Math.max(40, days[0].len - L.fx.cutFirst[0]); kLog(L.fx.cutFirst[1]); L.fx.cutFirst = null; }
  K.lf.total = days.reduce((s, d) => s + d.len, 0);
  if(typeof lfEntryLine === "function") lfEntryLine();
  K.timeLeft = days[0].len - (L.fx.updatePenalty || 0); if(L.fx.updatePenalty){ kLog(`💻 노트북 업데이트 — 첫날 조사 시간 ${L.fx.updatePenalty}분이 날아갔다.`); L.fx.updatePenalty = 0; }
  K.loc = "home"; K.rlog = K.rlog || []; K.hint = K.hint || {};
  K.lf.nd = lfResearchDayCount(); K.cal0 = LF_EPOCH + (day0 + K.lf.nd * 1440) * 60000;     // 입찰일
  const N = typeof snNow === "function" ? snNow() : null; if(N){ K.rain = N.W.id === "rain" || N.W.id === "monsoon"; }
  if(lfIs("taesik")) K.occ.coop = Math.min(100, K.occ.coop + 8);                 // 연장자 말을 더 믿는 점유자
  if(lfIs("mijeong")) K.occ.coop = Math.min(100, K.occ.coop + 6);
  if(L.fx.tip){ L.fx.tip = false; K.found.rivals = true; kLog("📞 김사장 귀띔 — 이 사건 조회수가 꽤 된다더라. (경쟁 분위기 공개)"); }
};
// 날짜: 조사 중엔 조사 날짜, 낙찰 뒤엔 입찰일 + 경과일
if(typeof snNow === "function"){
  const _lf_snNow = snNow;
  snNow = function(){ if(!K || !K.lf || K.step !== "brief") return _lf_snNow(); const save0 = K.cal0, save1 = K.day; K.cal0 = LF_EPOCH + (K.lf.day0 + K.lf.rday * 1440) * 60000; K.day = 0; try{ return _lf_snNow(); } finally { K.cal0 = save0; K.day = save1; } };
}
// 시계
if(typeof bdClock === "function"){
  const _lf_bdClock = bdClock;
  bdClock = function(){ if(!K || !K.lf || !K.lf.days) return _lf_bdClock(); const d = K.lf.days[K.lf.rday], m = d.s + (d.len - K.timeLeft), h = Math.floor(m / 60) % 24, mm = m % 60; return {h, mm, txt:`${h < 12 ? "오전" : "오후"} ${((h + 11) % 12) + 1}:${String(mm).padStart(2,"0")}`, ic: h >= 18 ? "🌆" : h >= 12 ? "☀️" : "🌤️"}; };
}
// 조사 행동 → 체력 소모(폭염이면 더)
const _lf_kResearch = kResearch; kResearch = function(id){
  const t0 = K ? K.timeLeft : 0, a = K && KP.actions ? KP.actions.find(x => x.id === id) : null;
  _lf_kResearch(id);
  if(!K || !K.lf || !a || K.timeLeft == null) return;
  const used = t0 - K.timeLeft; if(!(used > 0)) return;
  const heat = typeof snNow === "function" && snNow().W.id === "heat" ? 1.3 : 1;
  lfTire(used * (a.loc === "site" ? 0.1 : 0.03) * heat);
  if(LF_BROKER_ACTS.test(id)) lfRel(id === "park" ? "박 중개사" : "김사장", 0.3);
};
function lfNextDay(){
  if(!K || !K.lf || K.lf.rday >= K.lf.days.length - 1) return false;
  const L = lfRec(); K.lf.rday++; K.loc = "home";
  K.timeLeft = K.lf.days[K.lf.rday].len;
  L.sta = Math.min(L.st.stamina, L.sta + Math.round(L.st.stamina * 0.6 * lfBaseInfo().rest)); lfStress(-2);
  const N = typeof snNow === "function" ? snNow() : null; if(N) K.rain = N.W.id === "rain" || N.W.id === "monsoon";
  kLog(`🛏️ 하루가 지났다 — ${lfClock(K.lf.day0 + K.lf.rday * 1440 + K.lf.days[K.lf.rday].s)}부터 ${krFmt(K.timeLeft)}.`);
  return true;
}
// 조사 효율: 이 캐릭터가 쓸 수 있던 시간 전체 기준
if(typeof krEfficiency === "function"){
  const _lf_krEff = krEfficiency;
  krEfficiency = function(){
    if(!K || !K.lf) return _lf_krEff();
    const total = K.lf.total, used = K.rlog.reduce((s, r) => s + r.min + r.travel, 0), travel = K.rlog.reduce((s,r)=>s+r.travel, 0);
    const trips = K.rlog.filter(r => r.travel > 0 && (KP.actions.find(a=>a.id===r.id)||{}).loc !== "home").length, useless = K.rlog.filter(r=>!r.useful).length;
    const hid = KP.hidden.length, found = KP.hidden.filter(h=>K.found[h.id]).length;
    const sc = Math.round(found/hid*55 + (1 - used/total)*20 + (used ? (1 - travel/used) : 1)*15 + Math.max(0, 10 - useless*3));
    const g = sc >= 85 ? "S" : sc >= 70 ? "A" : sc >= 55 ? "B" : sc >= 40 ? "C" : "D", route = trips <= 1 ? "A" : trips === 2 ? "B" : "C";
    return {used, travel, trips, useless, found, hid, sc, g, route, n:K.rlog.length, total};
  };
  const _lf_effHTML = krEffHTML; krEffHTML = function(){ const h = _lf_effHTML(); return K && K.lf ? h.replace(`<small>/ ${krFmt(KR_BUDGET)}</small>`, `<small>/ ${krFmt(K.lf.total)}</small>`) : h; };
}
// 조사 화면: 체력·스트레스·"오늘은 여기까지" · 시세 감 · (은경) 입찰 상한
function lfBand(){       // 내 시세 감 — 시세감각이 높을수록 좁고 정확하다(판마다 고정)
  // 조사로 시세 단서(중개사 여럿·실거래 맥락)를 잡으면 감이 확 좁아진다 — 발품이 곧 정확도
  const clue = K.found && K.found.price ? 0.45 : 1;
  const w = Math.max(3, 22 - lfSt("market") / 5) / 100 * clue, r = kRng((K.seed ^ 0xa11ce) >>> 0); r();
  const mid = KP.trueMid * (1 + (r() * 2 - 1) * w * 0.6);
  return {lo:Math.round(mid * (1 - w) / 10) * 10, hi:Math.round(mid * (1 + w) / 10) * 10, w};
}
function lfMeterHTML(){
  const L = lfRec(), sr = L.sta / L.st.stamina;
  return `<div class="lf-meters"><span title="체력">⚡ 체력 <b>${Math.round(L.sta)}</b>/${L.st.stamina}<i class="lf-bar"><i style="width:${Math.round(sr*100)}%" class="${sr < 0.3 ? "low" : ""}"></i></i></span>
    <span title="스트레스">😣 스트레스 <b>${Math.round(L.stress)}</b><i class="lf-bar st"><i style="width:${Math.round(L.stress)}%"></i></i></span></div>`;
}
const _lf_krActions = krActionsHTML; krActionsHTML = function(){
  let h = _lf_krActions();
  if(!K || !K.lf) return h;
  const L = lfRec(), C = lfChar(), d = K.lf.days[K.lf.rday], last = K.lf.rday >= K.lf.days.length - 1;
  const pct = Math.round(K.timeLeft / d.len * 100);
  h = h.replace(/(<div class="ke-bar kr-bar"><i style="width:)\d+%/, `$1${Math.max(0, Math.min(100, pct))}%`);
  h = h.replace('<b>⏱ 입찰까지 조사 가능 시간</b>', `<b>⏱ 조사 ${K.lf.rday + 1}/${K.lf.days.length}일차 · 오늘 남은 시간</b>`);
  const fat = sr => sr < (lfIs("taesik") ? 0.4 : 0.3);
  const next = !last ? K.lf.days[K.lf.rday + 1] : null;
  const box = `<div class="panel lf-day">${lfMeterHTML()}
     ${fat(L.sta / L.st.stamina) ? `<p class="note down">😮‍💨 지쳤어요 — 현장 조사가 ${lfIs("taesik") ? "60%" : "25%"} 더 걸려요. 오늘은 쉬는 게 나을 수도.</p>` : ""}
     <div class="lf-day-row"><small class="note">${esc(C.name)}의 조사 시간: ${K.lf.days.map((x, i) => `${i + 1}일차 ${SN_DOW[x.dow]} ${String(Math.floor(x.s/60)).padStart(2,"0")}:${String(x.s%60).padStart(2,"0")}부터 ${krFmt(x.len)}`).join(" · ")}</small>
     ${next ? `<button type="button" class="btn" data-lfnext>🛏️ 오늘은 여기까지 → ${K.lf.rday + 2}일차 (${SN_DOW[next.dow]} ${String(Math.floor(next.s/60)).padStart(2,"0")}:${String(next.s%60).padStart(2,"0")}부터 ${krFmt(next.len)})</button>` : `<small class="note">마지막 조사일이에요 — 남은 시간을 다 쓰면 입찰표를 쓰러 가요.</small>`}</div></div>`;
  const band = lfBand();
  const feel = `<div class="panel lf-feel"><b>🧠 ${esc(C.name)}의 시세 감</b> — 이 물건, 제대로 팔면 <b>${kMan(band.lo)} ~ ${kMan(band.hi)}</b> <small class="note">(시세감각 ${lfSt("market")}${K.found && K.found.price ? " · 🔍 시세 단서를 잡아 폭이 좁아졌어요" : " — 시세 단서를 조사로 잡으면 폭이 확 좁아져요"} · 틀릴 수도 있어요)</small></div>`;
  return box + feel + h;
};
// 최은경: 입찰표에 상한·예상 순이익
if(typeof keBidSheet === "function"){
  const _lf_sheet = keBidSheet;
  keBidSheet = function(){
    const h = _lf_sheet(); if(!lfIs("eunkyung") || !K) return h;
    const band = lfBand(), mid = (band.lo + band.hi) / 2, known = KP.hidden.filter(x => K.found[x.id]).length;
    const cost = mid * 0.08 + 500 + (KP.estRepair || 250), tgt = lfEkTarget(), cap = Math.round((mid - cost - tgt) / 1.017 / 10) * 10;
    return h.replace('<button type="button" class="btn pri" data-kcseal>', `<div class="lf-calc">🧮 <b>계산기부터 켠다</b> — 예상 매도 ${kMan(Math.round(mid))} · 비용(수리·명도·세금·이자) 약 ${kMan(Math.round(cost))}<br>${kMan(tgt)} 남기려면 <b>입찰 상한 ${kMan(cap)}</b>${known < KP.hidden.length ? ` <small class="down">(아직 모르는 위험 ${KP.hidden.length - known}개 — 상한을 더 낮춰도 돼요)</small>` : ""}</div><button type="button" class="btn pri" data-kcseal>`);
  };
}
// 김태식: 허풍 감지 — 시세를 크게 부풀린 말에 바로 표시
if(typeof nmTag === "function"){
  const _lf_nmTag = nmTag;
  nmTag = function(who){ const h = _lf_nmTag(who); if(!lfIs("taesik") || !K || !K._claim || K._claim[who] == null) return h; const v = K._claim[who]; return v > KP.trueMid * 1.05 ? h + `<small class="nm-tag bad">🧐 허풍 냄새</small>` : h + `<small class="nm-tag good">🧐 말이 맞아 보임</small>`; };
}

/* ---------- 6. 한 판이 끝나면: 인생 시계·스트레스·성장·커리어 기록 ---------- */
const _lf_kBid = kBid; kBid = function(amt){
  _lf_kBid(amt);
  if(!K || !K.lf || !K.result) return;
  const L = lfRec();
  L.t = Math.max(L.t, K.lf.day0 + K.lf.nd * 1440 + 11 * 60);        // 입찰일 오전 11시 법원
  lfBidDayWork();
  if(!K.result.win){ lfStress(10); lfLog(`🔨 패찰 — ${KP.short || KP.title}. 1등 ${kMan(K.result.bids[0].amt)}.`); lfAdvance(360); }
  else { if(K.result.solo) L.stats.solo++; lfLog(`🏆 낙찰 — ${KP.short || KP.title} ${kMan(K.bid)}${K.result.solo ? " (단독)" : ""}`); }
  if(typeof save === "function") save();
};
function lfGrow(k, n){ const L = lfRec(); if(!L) return 0; const add = n * (lfIs("seoyun") ? 1.15 : 1); L.xp[k] = (L.xp[k] || 0) + add; let up = 0; while(L.xp[k] >= 4 && L.st[k] < 99){ L.xp[k] -= 4; L.st[k]++; up++; } return up; }
const _lf_kFinish = kFinish; kFinish = function(){
  _lf_kFinish();
  if(!K || !K.lf || K._lfDone) return; K._lfDone = true;
  const L = lfRec(), F = K.final || {}, c = kcRec();
  // 시간: 입찰일 + 이 판이 걸린 날
  lfAdvance(Math.max(0, (K.lf.day0 + K.lf.nd * 1440 + ((K.day || 0) + 1) * 1440 + 9 * 60) - L.t));
  if(F.profit < 0){ lfStress(12); L.stats.loss++; } else lfStress(-10);
  if(K.events && K.events.includes("계약 파기")) lfStress(5);
  // 성장: 이번 판에 쓴 능력이 조금씩 는다
  const ups = [];
  if(K.rlog && K.rlog.some(r => (KP.actions.find(a=>a.id===r.id)||{}).loc === "site")) ups.push(["field", lfGrow("field", 1.5)]);
  if(K.rlog && K.rlog.some(r => (KP.actions.find(a=>a.id===r.id)||{}).loc !== "site")) ups.push(["info", lfGrow("info", 1.5)]);
  if(K.moveDays) ups.push(["nego", lfGrow("nego", 1.5)]);
  ups.push(["market", lfGrow("market", 2)]); if(K.repair && K.repair.id !== "none") ups.push(["repair", lfGrow("repair", 1)]); if(K.sale && K.sale.price) ups.push(["sell", lfGrow("sell", 1)]);
  const upTxt = ups.filter(u => u[1]).map(u => `${LF_STAT_NAMES[u[0]]} +${u[1]}`);
  if(upTxt.length) lfLog(`📈 성장 — ${upTxt.join(" · ")}`);
  K._lfUps = upTxt;
  // 커리어 기록 보강(평균 낙찰가율·이사비·수리비 등)
  const e = c.history[0]; if(e && e.seed === K.seed){ Object.assign(e, {apr:KP.appraisal, move:K.cost.move, repair:K.cost.repair, char:L.char, solo:!!(K.result && K.result.solo), date:lfClock(L.t)}); }
  lfTitles();
  if(typeof save === "function") save();
};
// 칭호 — 레벨 숫자가 아니라 실제 기록으로
const LF_TITLES = [
  {id:"first", t:"첫 낙찰", d:"첫 물건을 끝까지 처리", ok:(c,L)=>c.cases >= 1},
  {id:"solo", t:"단독낙찰러", d:"단독낙찰 경험", ok:(c,L)=>L.stats.solo >= 1},
  {id:"detective", t:"하자탐정", d:"숨은 위험을 전부 찾고 입찰한 판 3번", ok:(c,L)=>c.history.filter(e=>e.hid && e.found === e.hid).length >= 3},
  {id:"negotiator", t:"명도협상가", d:"명도 14일 이내 3번", ok:(c,L)=>c.history.filter(e=>e.moveDays && e.moveDays <= 14).length >= 3},
  {id:"hunter", t:"급매사냥꾼", d:"감정가 70% 이하 낙찰 3번", ok:(c,L)=>c.history.filter(e=>e.apr && e.bid <= e.apr * 0.7).length >= 3},
  {id:"cutter", t:"손절의 달인", d:"손실을 −400만원 안에서 끊은 판 2번", ok:(c,L)=>c.history.filter(e=>e.profit < 0 && e.profit >= -400).length >= 2},
  {id:"local", t:"지역전문가", d:"한 사람을 5번 이상 만났다", ok:(c,L)=>typeof nmRec === "function" && Object.values(nmRec()).some(n=>n.met >= 5)},
  {id:"pro", t:"전업투자자", d:"물건 10건 처리", ok:(c,L)=>c.cases >= 10},
  {id:"king", t:"경매왕", d:"자산 10억", ok:(c,L)=>c.cash >= 100000}];
function lfTitles(){ const L = lfRec(), c = kcRec(); if(!L) return; LF_TITLES.forEach(T => { if(!L.titles[T.id] && T.ok(c, L)){ L.titles[T.id] = L.t; if(typeof HUB_TOAST !== "undefined") HUB_TOAST.push({t:`🎖️ 새 칭호 — ${T.t}`, big:true}); if(typeof kcSfx === "function") kcSfx("achievement"); } }); }
// 게시판 주 넘김 = 인생 7일
if(typeof bdAdvance === "function"){ const _lf_bdAdv = bdAdvance; bdAdvance = function(){ const before = bdRec().n; _lf_bdAdv(); if(lfOn() && bdRec().n > before){ const L = lfRec(); const nextMon = Math.floor(L.t / 1440 / 7 + 1) * 7 * 1440 + 8 * 60; lfAdvance(Math.max(1440, nextMon - L.t)); } }; }
// 게시판 날짜 = 인생 날짜
if(typeof snStartMs === "function"){ const _lf_snStart = snStartMs; snStartMs = function(){ if(K && K.lf) return K.cal0 || _lf_snStart(); if(lfOn()) return LF_EPOCH + lfRec().t * 60000; return _lf_snStart(); }; }
// 김사장 귀띔(관계 3↑): 게시판 관심도 대신 '진짜 분위기'
if(typeof bdHeat === "function"){ const _lf_heat = bdHeat; bdHeat = function(it){ const h = _lf_heat(it); return lfOn() && lfRelOf("김사장") >= 3 ? h + " · 김사장 귀띔" : h; }; }

/* ---------- 7. 거점 화면 — 프린세스메이커식 ---------- */
let LF_SPOT = "laptop", LF_MSG = null, LF_PICK = null;
const LF_SPOTS = [["laptop","💻","노트북","경매 검색·분석"],["phone","📱","휴대폰","연락처·안부"],["calendar","📅","달력","일정·시기"],["shelf","📚","책장","공부"],["bed","🛏️","침대","쉬기"],["fridge","🍳","냉장고","밥 먹기"],["out","🚪","외출","동네 임장·사람"],["bank","📒","통장","돈·거점 이사"],["file","📁","CASE 파일","진행·지난 물건"],["wall","🏆","벽","칭호·커리어"]];
// 생활 행동 — 시간을 어디에 쓸지가 고민이 되게(노가다 금지: 효과는 작고, 다음 판에 닿는다)
const LF_ACTS = {
  study_law:{spot:"shelf", ic:"⚖️", t:"권리분석 공부", min:120, sta:6, stress:2, grow:["law", 2], note:"법률 경험치"},
  study_nego:{spot:"shelf", ic:"🗣️", t:"명도 사례·협상 공부", min:120, sta:6, stress:2, grow:["nego", 2], note:"협상 경험치"},
  study_market:{spot:"laptop", ic:"📊", t:"실거래 분석", min:90, sta:4, stress:1, grow:["market", 2], note:"시세감각 경험치"},
  study_repair:{spot:"phone", ic:"🛠️", t:"인테리어 견적 비교", min:90, sta:4, stress:1, grow:["repair", 1.5], rel:["박 실장", 0.7], note:"수리감각 경험치 · 박 실장 관계"},
  walk:{spot:"out", ic:"🚶", t:"동네 임장(그냥 걸어 보기)", min:150, sta:14, stress:-3, grow:["field", 2], note:"현장감각 경험치"},
  visit:{spot:"out", ic:"🏠", t:"중개사무소 인사 다니기", min:90, sta:8, stress:0, grow:["broker", 2], rel:["김사장", 0.8], note:"중개사 친화 · 김사장 관계"},
  friend:{spot:"out", ic:"🍻", t:"친구·지인 만나기", min:150, sta:6, stress:-15, note:"스트레스 −15 · 가끔 정보"},
  call:{spot:"phone", ic:"☎️", t:"아는 사람들에게 안부 전화", min:30, sta:1, stress:-2, relAll:0.3, note:"만난 사람 모두 관계 조금 ↑"},
  meal:{spot:"fridge", ic:"🍚", t:"밥 챙겨 먹기", min:40, sta:-12, stress:-2, note:"체력 +12"},
  nap:{spot:"bed", ic:"😴", t:"낮잠", min:60, sta:-18, stress:-3, note:"체력 +18"},
  sleep:{spot:"bed", ic:"🛏️", t:"자고 일어나기(다음 날 아침 8시)", sleep:true, note:"체력 회복 · 스트레스 −8"}};
function lfDo(id){
  const A = LF_ACTS[id], L = lfRec(); if(!A || !L) return;
  L.fx = L.fx || {};
  if(A.sleep){ const nextMorning = (Math.floor((L.t - 5 * 60) / 1440) + 1) * 1440 + 8 * 60; const late = L.t % 1440 >= 23 * 60 || L.t % 1440 < 5 * 60; lfAdvance(nextMorning - L.t); L.sta = L.st.stamina * (late ? 0.85 : 1); lfStress(late ? 0 : -8); LF_MSG = `🛏️ ${late ? "늦게 잠들었다 — 개운하진 않다." : "푹 잤다."} ${lfClock()}`; if(typeof kcSfx === "function") kcSfx("click"); return; }
  if(A.sta > 0 && L.sta < A.sta){ LF_MSG = "😮‍💨 너무 지쳤어요 — 먼저 쉬거나 밥을 먹어요."; return; }
  lfAdvance(A.min);
  lfTire(A.sta); lfStress(A.stress || 0);
  const out = [];
  if(A.grow){ const mul = A.spot === "shelf" && L.fx.book ? 1.5 : 1; if(A.spot === "shelf") L.fx.book = false; const up = lfGrow(A.grow[0], A.grow[1] * mul * (lfBaseInfo().focus || 1)); out.push(up ? `${LF_STAT_NAMES[A.grow[0]]} +${up}!` : `${LF_STAT_NAMES[A.grow[0]]} 경험치 ↑`); }
  if(A.rel) out.push(`${A.rel[0]} 관계 ${lfRel(A.rel[0], A.rel[1]).toFixed(1)}`);
  if(A.relAll){ Object.keys(L.rel).forEach(n => lfRel(n, A.relAll)); if(typeof nmRec === "function") Object.keys(nmRec()).forEach(n => { if(LF_PEOPLE[n]) lfRel(n, A.relAll); }); out.push("아는 사람들 관계 ↑"); }
  if(id === "friend" && Math.random() < 0.35){ L.fx.tip = true; out.push("친구 삼촌이 중개사래 — 다음 사건 경쟁 분위기를 미리 알 수 있다"); }
  const late = L.t % 1440 >= 24 * 60 - 60 || L.t % 1440 < 5 * 60; if(late){ lfStress(3); out.push("밤이 깊었다 — 스트레스 +3"); }
  LF_MSG = `${A.ic} ${A.t} — ${out.join(" · ") || "끝."} (${lfClock()})`;
  if(typeof kcSfx === "function") kcSfx(A.spot === "shelf" ? "paper" : "click");
  lfTitles(); if(typeof save === "function") save();
}
function lfBaseHTML(){
  const L = lfRec(), C = lfChar(), B = lfBaseInfo(), c = kcRec(), D = lfDate();
  const N = (typeof snPeriods === "function") ? snPeriods(snDate(D.ms)) : [], W = typeof snWeatherOf === "function" ? snWeatherOf(snDate(D.ms)) : {ic:"", t:""};
  const night = D.h >= 19 || D.h < 6;
  const stage = `<div class="vn of-stage lf-stage ${night ? "night" : ""}">${vnBgHTML(B.bg)}<div class="lf-top"><b>${C.emo} ${esc(C.name)} · ${esc(B.t)}</b><span>📅 ${D.y}.${String(D.m).padStart(2,"0")}.${String(D.d).padStart(2,"0")} ${SN_DOW[D.dow]} ${String(D.h).padStart(2,"0")}:${String(D.mi).padStart(2,"0")} · ${W.ic} ${esc(W.t)}${N.length ? " · " + N.map(p=>p.t).join("·") : ""}</span>${lfMeterHTML()}<span>💰 ${c.cash < 0 ? `대출 ${kMan(-c.cash)}` : kMan(c.cash)}</span></div>
     <div class="of-spots lf-spots">${LF_SPOTS.map(([id, ic, t, s]) => `<button type="button" class="of-spot ${LF_SPOT===id?"on":""}" data-lfspot="${id}"><span>${ic}</span><b>${t}</b><small>${s}</small></button>`).join("")}</div></div>`;
  const msg = LF_MSG; LF_MSG = null;
  return stage + `<div class="of-panel">${msg ? `<div class="panel bd-msg">${esc(msg)}</div>` : ""}${lfPanel(LF_SPOT)}</div>`;
}
function lfActBtns(spot){ const L = lfRec(); return `<div class="lf-acts">${Object.entries(LF_ACTS).filter(([,A]) => A.spot === spot).map(([id, A]) => `<button type="button" class="ag-act" data-lfdo="${id}" ${A.sta > 0 && L.sta < A.sta ? "disabled" : ""}><span class="ag-ai">${A.ic}</span><span><b>${esc(A.t)}</b><span class="note" style="display:block">${A.sleep ? "" : `⏱ ${krFmt(A.min)} · `}${esc(A.note)}${A.sta > 0 ? ` · 체력 −${A.sta}` : ""}</span></span></button>`).join("")}</div>`; }
function lfPanel(id){
  const L = lfRec(), C = lfChar(), c = kcRec(), running = bdRunning();
  if(id === "laptop") return `<h3>💻 노트북</h3>${running ? `<div class="panel">▶ 진행 중인 CASE — <button type="button" class="btn pri" data-atab="king">이어하기</button></div>` : ""}
    <div class="panel"><b>🔎 경매 검색</b> — 이번 주 법원에 나온 물건들<br><button type="button" class="btn pri" data-lfspot="board">📋 경매 게시판 열기</button> <button type="button" class="btn" data-kcnew="weekly">📅 이번 주 경매(모두 같은 물건)</button></div>
    ${lfActBtns("laptop")}
    <div class="panel"><b>🛒 장비</b> <small class="note">장식이 아니라 시간을 줄여 준다</small><div class="lf-acts">${LF_EQUIP.map(e => `<button type="button" class="ag-act" data-lfbuy="${e.id}" ${L.equip[e.id] || c.cash < e.cost ? "disabled" : ""}><span class="ag-ai">${e.ic}</span><span><b>${e.t} — ${L.equip[e.id] ? "✅ 있음" : kMan(e.cost)}</b><span class="note" style="display:block">${esc(e.d)}</span></span></button>`).join("")}</div></div>`;
  if(id === "board") return (typeof boardHTML === "function" ? boardHTML() : "");
  if(id === "phone"){
    const met = typeof nmRec === "function" ? nmRec() : {};
    const names = [...new Set(Object.keys(LF_PEOPLE).filter(n => L.rel[n] || met[n]).concat(Object.keys(met)))];
    return `<h3>📱 휴대폰</h3>${lfActBtns("phone")}<ul class="of-contacts">${names.map(n => { const P = LF_PEOPLE[n], r = lfRelOf(n), m = met[n]; return `<li><b>${P ? P.ic + " " : ""}${esc(n)}</b>${P ? ` <small>${esc(P.role)}</small>` : ""} ${P ? `<em class="lf-rel">${"❤".repeat(Math.floor(r))}${"♡".repeat(5 - Math.floor(r))}</em>` : ""}${m ? ` <small>만남 ${m.met}번${m.claims ? ` · 시세 적중 ${m.hits}/${m.claims}` : ""}</small>` : ""}${P ? `<small class="note" style="display:block">${esc(P.perk)}${r >= (n === "김사장" ? 3 : 2) ? " ✅" : ""}</small>` : ""}</li>`; }).join("") || `<li class="note">아직 연락처가 비어 있어요. 조사·외출·견적 비교로 사람을 만나요.</li>`}</ul>`;
  }
  if(id === "calendar"){
    const D = lfDate(), rows = [];
    for(let i = 0; i < 28; i += 7){ const d = snDate(D.ms + i * 864e5), P = snPeriods(d); rows.push(`<li><b>${d.m}/${d.d}</b> ${P.map(p=>`${p.ic} ${p.t}`).join(" · ") || "특별한 시기 없음"} <small class="note">${snWeatherOf(d).ic}</small></li>`); }
    const M = lfMonthly();
    return `<h3>📅 달력</h3><ul class="of-contacts">${rows.join("")}</ul>
      <div class="panel"><b>매달 1일</b> — ${M.income ? `수입 +${kMan(M.income)} · ` : ""}생활비·고정비 −${kMan(M.rent)}${M.upkeep ? ` · 장비 −${kMan(M.upkeep)}` : ""}${M.interest ? ` · 대출 이자 −${kMan(M.interest)}` : ""} = <b class="${M.net >= 0 ? "up" : "down"}">${kcSigned(M.net)}</b></div>
      <div class="panel"><b>🕒 ${esc(C.name)}가 조사할 수 있는 시간</b>${lfWindowTable()}</div>`;
  }
  if(id === "shelf") return `<h3>📚 책장</h3>${L.fx && L.fx.book ? `<p class="note">📦 새로 온 경매책 — 다음 공부 효율 +50%</p>` : ""}${lfActBtns("shelf")}`;
  if(id === "bed") return `<h3>🛏️ 침대</h3>${lfActBtns("bed")}`;
  if(id === "fridge") return `<h3>🍳 냉장고</h3>${lfActBtns("fridge")}`;
  if(id === "out") return `<h3>🚪 외출</h3>${lfActBtns("out")}`;
  if(id === "bank"){
    const M = lfMonthly(), B = lfBaseInfo();
    const moves = Object.entries(LF_BASES).filter(([k, b]) => b.need && k !== L.base);
    return `<h3>📒 통장</h3><div class="panel kc-cstats"><span>현금 <b class="${c.cash>=0?"up":"down"}">${c.cash >= 0 ? kMan(c.cash) : "대출 " + kMan(-c.cash)}</b></span><span>시작 자본 <b>${kMan(C.cash)}</b></span><span>누적 세후 <b class="${c.total>=0?"up":"down"}">${kcSigned(c.total)}</b></span><span>매달 <b class="${M.net>=0?"up":"down"}">${kcSigned(M.net)}</b></span></div>
      ${c.cash < 0 ? `<p class="note down">🏦 대출 이자 연 5.5% — 이번 달 ${kMan(M.interest)}. 대출이 길어질수록 수익이 깎여요.</p>` : ""}
      <div class="panel"><b>🏠 거점 옮기기</b> <small class="note">지금: ${esc(B.t)} (월 ${kMan(B.rent)})</small><div class="lf-acts">${moves.map(([k, b]) => `<button type="button" class="ag-act" data-lfmove="${k}" ${c.cash >= b.need ? "" : "disabled"}><span class="ag-ai">${b.tier >= 3 ? "🏢" : "🏬"}</span><span><b>${esc(b.t)} — 월 ${kMan(b.rent)}</b><span class="note" style="display:block">자산 ${kMan(b.need)} 이상 · 집중 ×${b.focus} · 회복 ×${b.rest} · 이사비 ${kMan(Math.round(b.rent * 2))}</span></span></button>`).join("")}</div></div>
      <details class="panel"><summary>📜 최근 기록</summary><ul class="note">${L.log.map(x => `<li>${esc(lfClock(x.at))} — ${esc(x.t)}</li>`).join("")}</ul></details>`;
  }
  if(id === "file") return (typeof ofPanel === "function" ? `${running ? `<div class="panel">▶ 진행 중 — <button type="button" class="btn pri" data-atab="king">CASE 이어하기</button></div>` : ""}` + ofPanel("cabinet") : "");
  if(id === "wall") return lfCareerHTML();
  return "";
}
function lfCareerHTML(){
  const L = lfRec(), C = lfChar(), c = kcRec(), H = c.history.filter(e => e.mode !== "quick"), won = H.filter(e => e.bid);
  const avg = (arr, f) => arr.length ? arr.reduce((s, e) => s + f(e), 0) / arr.length : null;
  const ratio = avg(won.filter(e=>e.apr), e => e.bid / e.apr * 100), md = avg(won.filter(e=>e.moveDays), e => e.moveDays), mv = avg(won.filter(e=>e.move != null), e => e.move), rp = avg(won.filter(e=>e.repair != null), e => e.repair), hd = avg(won, e => e.days || 0);
  const hidAll = won.reduce((s, e) => s + (e.hid || 0), 0), hidF = won.reduce((s, e) => s + (e.found || 0), 0);
  const max = H.length ? H.reduce((a, e) => e.profit > a.profit ? e : a) : null, min = H.length ? H.reduce((a, e) => e.profit < a.profit ? e : a) : null;
  const titles = LF_TITLES.map(T => `<span class="ag-badge ${L.titles[T.id] ? "" : "off"}" title="${esc(T.d)}">${L.titles[T.id] ? "🎖️" : "🔒"} ${esc(T.t)}<small>${esc(T.d)}</small></span>`).join("");
  const stats = Object.entries(L.st).map(([k, v]) => `<li><span>${LF_STAT_NAMES[k]}</span><i class="lf-bar"><i style="width:${v}%"></i></i><b>${v}</b>${v > C.st[k] ? `<small class="up">+${v - C.st[k]}</small>` : ""}</li>`).join("");
  return `<h3>🏆 ${esc(C.name)}의 커리어</h3><div class="of-ach lf-titles">${titles}</div>
    <div class="panel kc-cstats"><span>총 입찰 <b>${c.bids}</b></span><span>낙찰 <b>${c.bids - c.lostBids}</b></span><span>패찰 <b>${c.lostBids}</b></span><span>단독낙찰 <b>${L.stats.solo}</b></span>
      <span>평균 낙찰가율 <b>${ratio ? ratio.toFixed(1) + "%" : "—"}</b></span><span>평균 명도 <b>${md ? Math.round(md) + "일" : "—"}</b></span><span>평균 이사비 <b>${mv != null ? kMan(Math.round(mv)) : "—"}</b></span><span>평균 수리비 <b>${rp != null ? kMan(Math.round(rp)) : "—"}</b></span>
      <span>평균 보유 <b>${hd ? Math.round(hd) + "일" : "—"}</b></span><span>누적 세후 <b class="${c.total>=0?"up":"down"}">${kcSigned(c.total)}</b></span><span>최대 수익 <b class="up">${max ? kcSigned(max.profit) : "—"}</b></span><span>최대 손실 <b class="down">${min && min.profit < 0 ? kcSigned(min.profit) : "—"}</b></span>
      <span>숨은 위험 사전발견 <b>${hidAll ? Math.round(hidF / hidAll * 100) + "%" : "—"}</b></span></div>
    <div class="panel"><b>📊 능력치</b> <small class="note">판을 치르고 공부하면 조금씩 오른다</small><ul class="lf-stats">${stats}</ul></div>
    <div class="panel"><b>✨ ${esc(C.name)}의 패시브</b><ul>${C.passives.map(p => `<li>${p[0]} <b>${esc(p[1])}</b> — ${esc(p[2])}</li>`).join("")}</ul></div>
    <details class="panel"><summary>🎭 다른 투자자로 새 인생</summary><p class="note">지금 인생(자금·기록·능력치·인맥)이 사라지고 캐릭터 고르기로 돌아가요. 레벨·도감·업적은 남아요.</p><button type="button" class="btn" data-lfreset>새 인생 시작하기</button></details>`;
}

/* ---------- 8. 캐릭터 선택 · 시작 연출 ---------- */
function lfSelectHTML(){
  const cur = LF_PICK || "dohyun", C = LF_CHARS.find(x => x.id === cur), B = LF_BASES[C.base];
  const bars = Object.entries(C.st).map(([k, v]) => `<li><span>${LF_STAT_NAMES[k]}</span><i class="lf-bar"><i style="width:${v}%" class="${v >= 80 ? "hi" : v < 45 ? "low" : ""}"></i></i><b>${v}</b></li>`).join("");
  return `<div class="lf-select"><h3>🎭 어떤 투자자로 살아 볼까요?</h3><p class="note">최강 캐릭터는 없어요 — <b>다른 방식으로 푸는</b> 여섯 명이에요. 돈·시간·체력·사람·서류 중 무엇으로 이길지가 다를 뿐.</p>
    <div class="lf-cards">${LF_CHARS.map(x => `<button type="button" class="lf-card ${x.id === cur ? "on" : ""}" data-lfpick="${x.id}"><span class="lf-emo">${x.emo}</span><b>${esc(x.name)}</b><small>${x.sex} · ${x.age}세</small><em>${esc(x.tag)}</em><small>💰 ${kMan(x.cash)}</small></button>`).join("")}</div>
    <div class="panel lf-detail"><div class="lf-dhead"><span class="lf-emo big">${C.emo}</span><div><b>${esc(C.name)} · ${C.age}세</b><small>${esc(C.job)} · 시작 거점 <b>${esc(B.t)}</b> · 시작 자본 <b>${kMan(C.cash)}</b></small></div></div>
      <div class="lf-cols"><ul class="lf-stats">${bars}</ul><div><b>👍 강점</b><ul>${C.pros.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><b>👎 약점</b><ul>${C.cons.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><b>✨ 패시브</b><ul>${C.passives.map(p=>`<li>${p[0]} <b>${esc(p[1])}</b> — ${esc(p[2])}</li>`).join("")}</ul>
        <small class="note">매달: 수입 ${kMan(LF_ECON[C.id].inc[0])}~${kMan(LF_ECON[C.id].inc[1])} · 고정비 −${kMan(LF_ECON[C.id].fixed)}</small></div></div>
      <button type="button" class="btn pri lf-go" data-lfstart="${C.id}">${C.emo} ${esc(C.name)}(으)로 시작하기</button>
      ${kcRec().cases ? `<small class="note down">⚠ 지금 커리어(보유자금·경매 기록)는 새 인생으로 바뀌어요. 레벨·도감·업적은 그대로예요.</small>` : ""}</div></div>`;
}
function lfIntroHTML(){
  const C = lfChar(), B = lfBaseInfo();
  return `<div class="vn lf-intro">${vnBgHTML(B.bg)}</div><div class="panel lf-intro-in"><small>${esc(B.t)} · ${lfClock()}</small><h3><span class="lf-emo big">${C.emo}</span> ${esc(C.name)}, ${C.age}세</h3>${C.intro.map((t, i) => `<p style="animation-delay:${0.3 + i * 0.9}s">${esc(t)}</p>`).join("")}
    <div class="lf-intro-card"><b>${esc(C.tag)}</b> · 시작 자본 ${kMan(C.cash)}<br>${C.passives.map(p=>`${p[0]} ${esc(p[1])}`).join(" · ")}</div>
    <button type="button" class="btn pri lf-go" data-lfbegin style="animation-delay:${0.4 + C.intro.length * 0.9}s">▶ 시작</button></div>`;
}
/* ---------- 화면 연결 ---------- */
const _lf_render = renderArena; renderArena = function(){
  // 캐릭터가 있으면 '사무실' 탭 = 거점 — 같은 렌더 안에서 바로 바꾼다(다시 renderArena를 부르면 게임 창이 두 번 만들어져 빈 화면이 된다)
  if(typeof page !== "undefined" && page === "arena" && arenaTab === "office" && lfOn() && !lfRec().intro){ if(typeof OF_SPOT !== "undefined" && OF_SPOT === "board") LF_SPOT = "board"; arenaTab = "life"; }
  if(typeof page !== "undefined" && page === "arena" && arenaTab === "life"){
    const L = lfRec();
    const body = !L ? lfSelectHTML() : L.intro ? lfIntroHTML() : lfBaseHTML();
    $("#main").innerHTML = `<section class="page"><div class="eyebrow">경매 RPG</div><h2 style="font-size:26px;margin-top:4px">${L ? "거점" : "투자자 고르기"}</h2>${hubTabs()}${body}</section>`;
    if(typeof hubToastShow === "function") hubToastShow();
    return;
  }
  _lf_render();
};
const _lf_kfsWanted = kfsWanted; kfsWanted = function(){ return _lf_kfsWanted() || (typeof page !== "undefined" && page === "arena" && arenaTab === "life"); };
const _lf_kfsHeader = kfsHeader; kfsHeader = function(){
  let h = _lf_kfsHeader();
  if(arenaTab === "life" && lfOn()){ const C = lfChar(), c = kcRec(); h = h.replace(/(🏆|🏢) <b>(경매왕|사무실)<\/b> <span class="kfs-sub">[^<]*<\/span>/, `${C.emo} <b>${esc(C.name)}</b> <span class="kfs-sub">${esc(lfBaseInfo().t)} · ${lfClock()} · ${c.cash < 0 ? "대출 " + kMan(-c.cash) : kMan(c.cash)}</span>`); }
  return h.replace('<button type="button" data-atab="office">🏢 사무실</button>', lfOn() ? '<button type="button" data-atab="life">🏠 거점</button>' : '<button type="button" data-atab="life">🎭 투자자 고르기</button><button type="button" data-atab="office">🏢 사무실</button>');
};
// 조사 창 머리에 캐릭터
const _lf_kfsHeader2 = kfsHeader; kfsHeader = function(){ let h = _lf_kfsHeader2(); if(arenaTab === "king" && K && K.lf && lfOn()) h = h.replace('📁 <b>CASE', `${lfChar().emo} 📁 <b>CASE`); return h; };
const _lf_hubTabs = hubTabs; hubTabs = function(){ const h = _lf_hubTabs(); return h.replace(/<button type="button" data-atab="office"[^>]*>🏢 사무실<\/button>/, lfOn() ? `<button type="button" data-atab="life" aria-pressed="${arenaTab==="life"}">🏠 거점</button>` : `$&<button type="button" data-atab="life" aria-pressed="${arenaTab==="life"}">🎭 투자자</button>`); };
const _lf_home = homeHTML; homeHTML = function(){
  let h = _lf_home();
  if(!lfOn()){
    const btn = `<button type="button" class="btn pri lf-home-go" data-lfgo>🎭 투자자 고르고 인생 시작 <small>6명 중 한 명 — 서울의 작은 방에서 시작</small></button>`;
    h = h.replace('<div class="kc-menu">', `<div class="kc-menu">${btn}`).replace(/class="btn pri" data-kcnew/g, 'class="btn" data-kcnew').replace(/(data-kcnew="career"[^>]*) class="btn pri"/g, '$1 class="btn"');
  } else {
    const C = lfChar(), c = kcRec();
    const btn = `<button type="button" class="btn ${bdRunning() ? "" : "pri"} lf-home-go" data-atab="life">🏠 ${esc(lfBaseInfo().t)}로 <small>${C.emo} ${esc(C.name)} · ${lfClock()} · ${c.cash < 0 ? "대출 " + kMan(-c.cash) : kMan(c.cash)}</small></button>`;
    h = h.replace('<div class="kc-menu">', `<div class="kc-menu">${btn}`).replace(/class="btn pri" data-ofgo="board"/, 'class="btn" data-ofgo="board"');
  }
  return h;
};
document.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena") return;
  let b;
  if(e.target.closest("[data-lfgo]")){ e.stopImmediatePropagation(); arenaTab = "life"; renderArena(); window.scrollTo(0,0); return; }
  if((b = e.target.closest("[data-lfpick]"))){ LF_PICK = b.dataset.lfpick; if(typeof kcSfx === "function") kcSfx("click"); renderArena(); return; }
  if((b = e.target.closest("[data-lfstart]"))){
    if(kcRec().cases && !safeConfirm("지금 커리어(보유자금·경매 기록)를 새 인생으로 바꿀까요? 레벨·도감·업적은 남아요.")) return;
    lfNew(b.dataset.lfstart); K = null; LF_SPOT = "laptop"; arenaTab = "life"; if(typeof kcSfx === "function") kcSfx("fanfare"); renderArena(); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-lfbegin]")){ const L = lfRec(); if(L){ L.intro = false; lfLog(`🌱 ${lfChar().name}의 경매 인생 시작 — ${lfBaseInfo().t}`); if(typeof save === "function") save(); } renderArena(); return; }
  if(arenaTab !== "life" || !lfOn()) return;
  if(e.target.closest("[data-lfreset]")){ if(safeConfirm("지금 인생을 끝내고 새 캐릭터를 고를까요?")){ const c = kcRec(); delete c.life; delete c.board; K = null; LF_PICK = null; if(typeof save==="function") save(); } renderArena(); return; }
  if((b = e.target.closest("[data-lfspot]"))){ LF_SPOT = b.dataset.lfspot; if(typeof kcSfx === "function") kcSfx("click"); renderArena(); return; }
  if((b = e.target.closest("[data-lfdo]"))){ lfDo(b.dataset.lfdo); renderArena(); return; }
  if((b = e.target.closest("[data-lfbuy]"))){ const E = LF_EQUIP.find(x => x.id === b.dataset.lfbuy), c = kcRec(), L = lfRec(); if(E && !L.equip[E.id] && c.cash >= E.cost){ c.cash -= E.cost; L.equip[E.id] = L.t; LF_MSG = `${E.ic} ${E.t} 구입 — ${E.d}`; lfLog(LF_MSG); if(typeof kcSfx === "function") kcSfx("money_out"); if(typeof save==="function") save(); } renderArena(); return; }
  if((b = e.target.closest("[data-lfmove]"))){ const k = b.dataset.lfmove, Bn = LF_BASES[k], c = kcRec(), L = lfRec(); if(Bn && c.cash >= Bn.need && safeConfirm(`${Bn.t}(으)로 옮길까요? 이사비 ${kMan(Math.round(Bn.rent * 2))} · 월 ${kMan(Bn.rent)}`)){ c.cash -= Math.round(Bn.rent * 2); L.base = k; lfAdvance(240); LF_MSG = `🚚 ${Bn.t}(으)로 이사했다. 공간이 넓어지니 일이 잘 된다.`; lfLog(LF_MSG); if(typeof kcSfx === "function") kcSfx("fanfare"); if(typeof save==="function") save(); } renderArena(); return; }
});
// 게시판 버튼은 거점 안에서도 그대로 — week.js 핸들러는 office 탭에서만 듣는다
document.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena" || arenaTab !== "life" || !lfOn()) return;
  if(e.target.closest("[data-bdplay],[data-bdread],[data-bddecoy],[data-bdwait],[data-bdwatch],[data-bddrop],[data-bdnext]")){
    arenaTab = "office"; OF_SPOT = "board";            // week.js 핸들러가 이어서 처리하고, 렌더가 다시 거점으로 돌려놓는다
    setTimeout(() => { if(arenaTab === "office" && lfOn()) arenaTab = "life"; }, 0);   // 렌더 없이 끝난 경우(확인 대기 등)에도 거점으로
  }
}, true);
// 조사 화면: "오늘은 여기까지"
document.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena" || arenaTab !== "king" || !K) return;
  if(e.target.closest("[data-lfnext]")){ if(lfNextDay() && typeof kcSfx === "function") kcSfx("click"); renderArena(); window.scrollTo(0,0); }
});
// 결과 화면에 성장·인생 한 줄
const _lf_kingHTML = kingHTML; kingHTML = function(){
  let h = _lf_kingHTML();
  if(K && K.lf && K.step === "result" && !K.revealing){ const L = lfRec(); h += `<div class="panel lf-after"><b>${lfChar().emo} ${esc(lfChar().name)}의 인생 — ${esc(lfClock())}</b>${K._lfUps && K._lfUps.length ? `<p>📈 ${esc(K._lfUps.join(" · "))}</p>` : ""}${lfMeterHTML()}<button type="button" class="btn pri" data-atab="life">🏠 ${esc(lfBaseInfo().t)}로 돌아가기</button></div>`; }
  if(K && K.lf && K.step === "lost" && !K.revealing) h += `<div class="panel lf-after"><button type="button" class="btn pri" data-atab="life">🏠 ${esc(lfBaseInfo().t)}로 돌아가기</button></div>`;
  return h;
};
