/* ================= 🏆 경매왕 — 한 판(조사 → 입찰 → 명도 → 하자 → 수리 → 매도 → 결과) =================
   원칙: 정보가 자원이다. 처음엔 다 안 보여 주고, 조사해야 숨은 변수가 드러난다.
   금액 단위는 만원. 시드가 있는 난수라 같은 판을 다시 재현할 수 있다. */
function kRng(seed){ let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const KP1 = {   // 1번 물건 — 서울 오래된 빌라(기획서 18절)
  id:"k1", no:1, short:"서울 오래된 빌라", stars:1, tagline:"사람을 읽는 명도전", title:"서울 오래된 빌라 3층", addr:"서울 ○○구 ○○동 · 1992년식 · 전용 49㎡(약 15평)",
  appraisal:14500, minBid:10200, recent:"1억 5,500 ~ 1억 6,200 (최근 1년 4건)", brokerSays:16000,
  trueMid:15350, trueSpread:250,               // 이 골목에서 실제로 체결되는 선(숨김)
  occ:{pid:"p_grandpa", name:"최만식 할아버지", age:68, legal:"대항력 없는 월세 세입자 · 배당 0원 · 인도명령 대상"},
  estRepair:350, dailyHold:1.7,                 // 하루 이자·관리비(만원)
  hidden:[   // 숨은 변수 — 조사로 드러낸다
    {id:"elec",  t:"누전", d:"계량기함 차단기에 테이프가 칭칭 감겨 있다. 누전일 수 있다.", cost:120},
    {id:"flip",  t:"점유자 말바꾸기", d:"옆집 할머니: '그 양반 약속을 두 번은 바꿔. 근데 딸 말은 들어.'"},
    {id:"price", t:"실거래 착시", d:"동네 중개사 셋 중 둘: '이 골목은 1억 5천 초중반이 현실이에요. 1.6은 큰길 쪽.'"},
    {id:"fee",   t:"체납관리비", d:"관리실: 공용부분 관리비 38만원 체납. 낙찰자가 떠안을 수 있다.", cost:38}]
};
const K_RESEARCH = [
  {id:"docs",   ic:"📄", t:"매각물건명세서·등기부 보기", day:0, cost:0, reveal:null, text:"대항력 없는 월세 세입자, 배당요구 없음 — 서류상으론 깔끔하다."},
  {id:"site",   ic:"🏚️", t:"현장 가서 계량기·외관 보기", day:1, cost:0, reveal:"elec"},
  {id:"neigh",  ic:"👵", t:"옆집 할머니와 이야기", day:1, cost:0, reveal:"flip"},
  {id:"broker", ic:"📞", t:"동네 중개사 3곳 전화", day:1, cost:0, reveal:"price"},
  {id:"office", ic:"🏢", t:"관리실에 관리비 확인", day:1, cost:0, reveal:"fee"},
  {id:"court",  ic:"⚖️", t:"사건 조회수·입찰 법정 분위기 보기", day:1, cost:0, reveal:"rivals"}
];
const K_DAYS = 3;   // 입찰일까지 남은 조사일
const K_RIVALS = [
  {t:"초보 과입찰러", lo:1.15, hi:1.22, p:0.45}, {t:"지역 실수요자", lo:1.10, hi:1.16, p:0.6},
  {t:"전문 투자자", lo:1.06, hi:1.12, p:0.8},  {t:"무조건 저가형", lo:1.00, hi:1.04, p:0.7},
  {t:"인테리어 업자", lo:1.12, hi:1.18, p:0.5}, {t:"감정가 맹신러", lo:1.19, hi:1.25, p:0.2}];
const K_REPAIR = [
  {id:"min",  t:"A. 최소 수리", d:"청소·필수 수리만", cost:90,  price:-0.025, speed:-0.10},
  {id:"good", t:"B. 매도용 가성비", d:"도배·장판·필름·조명", cost:470, price:0.035, speed:0.12},
  {id:"full", t:"C. 풀 리모델링", d:"욕실·주방까지 전부", cost:1500, price:0.06, speed:0.10},
  {id:"part", t:"D. 전략적 일부", d:"필름·조명·현관만", cost:210, price:0.022, speed:0.10}];
const K_LESSONS = {
  lose_close:"10만 원 차이 패찰은 경매인의 통과의례입니다. 다음엔 끝자리를 7로 적어 보세요.",
  lose_far:"감정가는 '감정'가였습니다. 시장은 감정이 없어요.",
  elec:"차단기에 감긴 테이프는 인테리어가 아니라 증거물입니다.",
  price:"중개사의 '1.6 충분합니다'는 슈뢰딩거의 매수자와 같이 옵니다.",
  flip:"'내일 나갑니다'의 내일은 달력에 없을 수 있습니다.",
  fee:"관리비는 사람보다 오래 버팁니다. 공용부분은 낙찰자에게 옵니다.",
  exec:"법대로는 이깁니다. 다만 법은 이자를 대신 내주지 않아요.",
  quick:"이사비 150에 7일 vs 0원에 50일 — 계산기는 감정이 없습니다.",
  greedy:"호가를 높게 걸면 기분은 좋고 달력은 넘어갑니다.",
  deal:"'오늘 계약'이라는 말엔 유통기한이 있습니다.",
  full:"싱크대 500만원은 매도가 200만원이 되어 돌아왔습니다. 마음은 따뜻했어요.",
  cancel:"대출은 '나올 것 같다'와 '나왔다' 사이에 강이 흐릅니다."
};
let KP = KP1;                         // 지금 하는 물건 — kStart가 바꾼다
const K_PROPS = {k1: KP1};            // 다른 물건 파일이 여기 등록한다
let K_PROP_NEXT = "k1";
let K = null;
function kRec(){ const R = arenaRec(); if(!R.king) R.king = {plays:0, best:null, ach:{}, dex:{}}; return R.king; }
function kLog(t){ K.log.push(t); }
function kStart(seed){
  seed = seed || (Date.now() % 1e9);
  KP = K_PROPS[K_PROP_NEXT] || KP1;
  const r = kRng(seed);
  const rivals = (KP.rivals || K_RIVALS).filter(()=> r() < 0.72).slice(0, 5); if(rivals.length < 2) rivals.push(K_RIVALS[1], K_RIVALS[2]);
  K = {seed, r, step:"brief", daysLeft:K_DAYS, done:{}, found:{}, rivals, bid:null, result:null,
       day:0, cost:{bid:0, acq:0, move:0, repair:0, hold:0, fee:0, broker:0, legal:0}, log:[],
       occ:{coop:40, resist:62, pride:0.8, cash:0.9, place:true, flip:true, daughter:false, agreed:null, paper:false, order:null, orderOk:false, exec:null, asked:0, turns:0},
       events:[], style:{empathy:0, money:0, law:0, pressure:0, research:0}, achNew:[], repair:null, sale:null, prop:KP.id, says:[]};
  if(KP.extraRivals) KP.extraRivals.forEach(v => { if(r() < 0.85) K.rivals.push(v); });
  if(KP.init) KP.init();
}
/* 취득세 등(취득세+지방교육세+농특세) — 매매사업자라도 주택 취득세 중과는 똑같이 따진다(주택 수로 판정).
   게임에서는 전 물건을 팔고 다음 물건을 사므로 늘 '무주택 → 1주택' 취득이다:
   6억 이하 1% + 지방교육세 0.1% = 1.1%, 6~9억은 (금액×2/3−3)% 사이, 9억 초과 3%(+교육세 0.3%), 전용 85㎡ 초과면 농특세 0.2% 추가.
   상가·숙박·공장 같은 주택 아닌 건물은 4% + 농특세 0.2% + 지방교육세 0.4% = 4.6%.
   ⚠️ 일반 원칙 요약 — 실제 세율은 주택 수·지역·면적·감면에 따라 달라지니 실제 거래는 세무 전문가와 확인. */
function kAcqRate(amt, P){
  P = P || (typeof KP !== "undefined" ? KP : null); amt = +amt || 0;
  if(P && P.use === "commercial") return 0.046;
  const r = amt <= 60000 ? 0.01 : amt <= 90000 ? (amt / 10000 * 2 / 3 - 3) / 100 : 0.03;
  return r + r * 0.1 + (P && P.over85 ? 0.002 : 0);
}
function kAcqPct(amt, P){ return Math.round(kAcqRate(amt, P) * 1000) / 10; }
function kDay(n){ K.day += n; K.cost.hold += Math.round(KP.dailyHold * n * 10) / 10; }
function kMan(v){ v = Math.round(v); if(v < 0) return "−" + kMan(-v); const e = Math.floor(v/10000), m = v % 10000; return e ? `${e}억${m?` ${m.toLocaleString()}만`:""}원` : `${m.toLocaleString()}만원`; }

/* ---------- 1. 조사 ---------- */
function kResearch(id){
  const a = (KP.research||K_RESEARCH).find(x=>x.id===id); if(!a || K.done[id] || K.daysLeft < a.day) return;
  K.done[id] = true; K.daysLeft -= a.day; K.style.research++;
  if(a.reveal==="rivals"){ K.found.rivals = true; kLog(`⚖️ 조회수가 꽤 높다. 입찰 법정엔 대략 ${K.rivals.length}명쯤 올 것 같다 — ${K.rivals.map(x=>x.t).join(", ")} 느낌.`); return; }
  if(a.reveal && a.say && !KP.hidden.find(x=>x.id===a.reveal)){ K.found[a.reveal] = true; K.says.push({who:a.who||"", t:a.say, id:a.reveal}); kLog(`${a.ic} ${a.who?a.who+": ":""}"${a.say}"`); return; }
  if(a.reveal){ const h = KP.hidden.find(x=>x.id===a.reveal); if(a.say) K.says.push({who:a.who||"", t:a.say, id:a.reveal}); K.found[h.id] = true; kLog(`${a.ic} ${h.d}`); if(h.id==="flip") K.occ.daughter = true; }
  else kLog(`${a.ic} ${a.text}`);
}
/* ---------- 2. 입찰 ---------- */
function kBid(amt){
  amt = Math.round(amt); if(!(amt >= KP.minBid)) return;
  K.bid = amt; K.style.bidRatio = amt / KP.appraisal;
  const bids = K.rivals.map(v => ({who:v.t, amt: Math.round(KP.minBid * (v.lo + (v.hi - v.lo) * K.r()) / 10) * 10}));
  bids.push({who:"나", amt, me:true}); bids.sort((a,b)=>b.amt - a.amt);
  const win = bids[0].me, other = win ? (bids[1] || {who:"(없음 — 단독)", amt:KP.minBid, none:true}) : bids[0];
  K.result = {win, bids, gap: Math.abs(amt - other.amt), other, solo: win && !bids[1]};
  if(win){ K.cost.bid = amt; K.cost.acq = Math.round(amt * kAcqRate(amt)); if(K.found.fee) K.cost.fee = 38; K.step = "won"; kAch(K.result.gap <= 30 ? "tight" : null); }
  else { K.step = "lost"; if(K.result.gap <= 10) kAch("tenman"); }
}
/* ---------- 3. 명도 (보스전) ---------- */
const K_MOVES = [
  {id:"listen",  s:"empathy",  t:"🙇 사정부터 듣는다 (존댓말, 끝까지)", day:2},
  {id:"center",  s:"empathy",  t:"🏛️ 행정복지센터 주거지원을 같이 알아본다", day:3},
  {id:"daughter",s:"empathy",  t:"📞 따님께 연락해 같이 이야기한다", day:2, need:o=>o.daughter},
  {id:"date",    s:"",    t:"📅 이사 날짜를 같이 정하자고 한다", day:1},
  {id:"paper",   s:"money",    t:"📝 합의서를 쓴다 (날짜·금액·지급 조건)", day:1, need:o=>o.agreed && !o.paper},
  {id:"notice",  s:"law",      t:"📮 내용증명을 보낸다", day:3},
  {id:"order",   s:"law",      t:"⚖️ 인도명령을 신청한다 (10만원)", day:1, need:o=>!o.order && !o.orderOk},
  {id:"threat",  s:"pressure", t:"😤 \"당장 안 나가시면 쫓아냅니다\" — 겁주기(법적 절차 아님)", day:1},
  {id:"exec",    s:"law",      t:"🚚 강제집행을 신청한다 (집행비 약 350만원)", day:1, need:o=>o.orderOk && !o.exec}];
const K_OFFERS = [0, 50, 100, 150, 200, 300];
function kOccNeed(){ const o = K.occ; let n = 100 * (0.6 + o.resist/100) * (o.place ? 1.25 : 0.8); if(o.daughter && o.dInvolved) n *= 0.6; if(o.orderOk) n *= 0.55; return Math.round(n/10)*10; }
function kSay(t, ex){ K.scene = {who:"occ", t, ex:ex||"normal"}; }
function kNarr(t){ K.scene = {who:"narr", t}; }
function kClampOcc(){ const o = K.occ; o.coop = Math.max(0, Math.min(100, o.coop)); o.resist = Math.max(0, Math.min(100, o.resist)); }
function kTick(n){
  kDay(n); const o = K.occ;
  if(o.order && K.day >= o.order){ o.order = null; o.orderOk = true; o.resist -= 25; K.events.push("인도명령 결정"); kLog("⚖️ 인도명령이 결정됐다. 이제 집행권원이 있다."); }
  if(o.exec && K.day >= o.exec.day){ K.cost.legal += 350; K.style.law += 2; kNarr("집행 날. 집행관과 노무 인력이 짐을 옮겼다. 할아버지는 계단에 한참 앉아 있었다."); kAch("byLaw"); K.lessonKey = "exec"; return kMoved(); }
  if(o.agreed && K.day >= o.agreed.day){
    if(o.flip && !o.paper && !o.dInvolved && !o.flipped){ o.flipped = true; o.agreed.amt += 50; K.events.push("이삿날 50만원 더"); kSay("…저기, 이삿짐 트럭이 생각보다 비싸더라꼬. 50만 더 줘야 되겠다.", "angry"); K.pendingFlip = true; K.lessonKey = K.lessonKey || "flip"; return; }
    K.cost.move += o.agreed.amt; kNarr(`이삿날. 짐이 빠졌다.${o.agreed.amt ? ` 이사비 ${kMan(o.agreed.amt)}은 짐이 다 빠진 걸 확인하고 건넸다.` : ""}`); return kMoved();
  }
  kClampOcc();
}

/* 📞 따님 통화 — 한 줄짜리였던 걸 사연이 있는 통화로. 모두 가상의 인물이다. */
const KD_CALL = [
 [null,"옆집 할머니가 적어 준 번호로 전화를 건다. 신호가 네 번쯤 가고 나서야 받는다.","normal"],
 ["따님 (전화)","여보세요? …아, 네. 저희 아버지 사시는 집 때문에요? 무슨 일 있으세요? 아버지 괜찮으세요?","worried"],
 ["나","네, 괜찮으세요. 이 집이 경매로 넘어가서 제가 낙찰받았는데요, 이사 문제로 아버님이랑 이야기가 잘 안 풀려서요.","normal"],
 ["따님 (전화)","…경매요? 아버지가 그런 말 한마디도 안 하셨어요. 지난주에 통화했을 때도 '별일 없다, 밥 잘 묵고 있다' 그러셨는데.","worried"],
 ["따님 (전화)","하아… 죄송해요. 저희 아버지가 원래 그래요. 힘든 일 있으면 혼자 끌어안고 계시다가, 다 터지고 나서야 아세요.","worried"],
 ["따님 (전화)","고집도 세세요. 한번 아니라고 하시면 동네 사람 다 와서 말려도 안 들으세요. 혹시 말씀 험하게 하셨으면 제가 대신 사과드릴게요.","worried"],
 ["따님 (전화)","근데요, 이상하게 제 말은 들으세요. 제가 초등학교 3학년 때 한밤중에 열이 펄펄 났는데, 비 오는데 저를 업고 병원까지 뛰어가셨대요. 우산도 없이.","normal"],
 ["따님 (전화)","그 뒤로 제가 '아빠 담배 끊어' 하니까 진짜로 끊으셨어요. 삼십 년 피운 걸요. 지금도 주머니에 넣고 다니시기만 하고 안 피우세요.","normal"],
 [null,"아까 계단에 앉아 담배를 꺼냈다가 도로 넣던 할아버지가 떠오른다.","normal"],
 ["따님 (전화)","엄마가 요새 깜빡깜빡하시는 것도 아시죠? 아버지는 그게 제일 걱정이실 거예요. 짐 싸는 거 보면 엄마가 불안해하시니까.","worried"],
 ["따님 (전화)","오빠는 부산에 있어서 자주 못 와요. 제가 차로 사십 분 거리라, 저희 동네 근처에 방을 같이 알아볼게요. 그래야 엄마 병원도 제가 모시고 다니죠.","normal"],
 ["따님 (전화)","그리고… 아버지가 이삿날 갑자기 돈 더 달라고 하실 수도 있어요. 예전에도 그러셨거든요. 그러면 그냥 저한테 바로 전화 주세요. 약속한 건 약속한 대로 하게 할게요.","normal"],
 ["나","그렇게 해 주시면 저도 날짜랑 이사비 맞춰서 서류로 깔끔하게 정리할게요.","normal"],
 ["따님 (전화)","네, 이번 주말에 제가 갈게요. 셋이 같이 앉아서 이야기해요. …그리고 전화 주셔서 고마워요. 그냥 문 잠그고 끝내실 수도 있었을 텐데.","normal"],
 [null,"통화가 끝났다. 잠시 뒤 할아버지 쪽에서 휴대폰 벨소리가 울린다.","normal"],
 ["","…은정이가? 니가 우째 알았노. …아이다, 화 안 났다. 알았다, 알았다 캐도. 주말에 온나.","worried"],
 ["","(전화를 끊고 한참 있다가) …우리 딸이 그러네, 젊은 양반 사람 괜찮다꼬. 내가 뭐라 캤노 — 딱 보니 알겠더라.","normal"]
];
function kMove(id){
  const m = K_MOVES.find(x=>x.id===id), o = K.occ; if(!m || (m.need && !m.need(o))) return;
  if(m.s) K.style[m.s]++; o.turns++;
  if(id==="listen"){ o.coop += 14 + o.pride*6; o.resist -= 6; kSay(o.turns<=2 ? "…내가 이 나이에 어데로 가겠노. 현장 일 끊기믄 방세도 몬 낸다." : "들어 줘서 고맙데이. 사람 대접은 해 주네.", "worried"); }
  if(id==="center"){ o.place = false; o.coop += 10; o.resist -= 12; kSay("주거급여? 공공임대? …그런 기 내 같은 사람도 되나?", "worried"); kLog("🏛️ 갈 곳 문제가 풀리기 시작했다 — 원하는 이사비가 줄어든다."); }
  if(id==="daughter"){ o.dInvolved = true; o.coop += 20; o.resist -= 20; kNarr("따님과 긴 통화를 했다. '이번 주말에 제가 갈게요. 아버지는 제 말은 들으세요.'"); kLog("📞 가족이 들어오니 말바꾸기 위험이 사라졌다."); if(typeof mtPlay === "function") setTimeout(() => mtPlay(KD_CALL, {name:KP.occ.name, pid:KP.occ.pid, title:"📞 따님과 통화 중"}), 60); }
  if(id==="date"){
    if(o.coop < 45){ o.coop -= 4; kSay("날짜? 아직 갈 데도 없는데 무슨 날짜를 정하노.", "angry"); }
    else { const need = kOccNeed(); K.askNeed = need; kSay(need ? `…한 3주믄 되겠제. 대신 이사비 ${kMan(need)}은 줘야 된다.` : "3주 뒤에 나가께. 돈은 됐다.", "normal"); K.offering = true; }
  }
  if(id==="paper"){ o.paper = true; o.coop += 3; kNarr("합의서. 이삿날, 금액, '짐이 다 빠진 것을 확인한 뒤 지급', 남은 짐은 포기한 것으로 본다."); kLog("📝 합의서를 썼다 — 번복 위험이 크게 줄었다."); }
  if(id==="notice"){ o.resist -= 10; o.coop -= 10 + o.pride*8; kSay("종이 쪼가리로 사람을 겁주나? 내도 알아볼 데 있다.", "angry"); }
  if(id==="order"){ K.cost.legal += 10; o.order = K.day + 16 + Math.floor(K.r()*6); o.resist -= 6; o.coop -= 4; kLog(`⚖️ 인도명령 신청. 결정까지 2~3주(약 ${o.order - K.day}일).`); kNarr("법원에 인도명령을 신청했다. 서류 한 장이지만 방 안 공기가 달라진다."); }
  if(id==="threat"){ if(o.orderOk){ o.resist -= 15; o.coop -= 8; kSay("…결정문까지 나왔으믄 우짜겠노. 얼마 줄 끼고.", "worried"); } else { o.coop -= 22; o.resist += 10; kSay("강제집행? 해 봐라! 내가 뭘 잘못했는데!", "angry"); kAch("hothead"); } }
  if(id==="exec"){ o.exec = {day: K.day + 28}; K.cost.legal += 20; kLog("🚚 강제집행 접수 — 계고 뒤 약 4주 뒤 집행."); kNarr("집행관 사무실에 강제집행을 접수했다. 비용 일부를 예납했다."); }
  kClampOcc(); kTick(m.day);
}
function kOffer(amt){
  const o = K.occ; K.style.money += 0.5; const need = kOccNeed();
  if(amt >= need || (amt >= need*0.8 && o.coop >= 70)){ o.agreed = {amt, day: K.day + (o.dInvolved ? 7 : 14)}; K.offering = false; kSay(amt ? `${kMan(amt)}이믄… 알았다. ${o.agreed.day - K.day}일 뒤에 나가께.` : "돈은 됐다. 날짜만 맞춰 주믄 나가께.", "normal"); kLog(`🤝 합의 — ${o.agreed.day - K.day}일 뒤 이사, 이사비 ${kMan(amt)}. 합의서를 쓰면 번복을 막을 수 있다.`); if(amt===0) kAch("word"); }
  else if(amt < need*0.5){ o.coop -= 10 + o.pride*6; kSay("그걸로 어데 가서 방을 구하노! 사람 우습게 보지 마소.", "angry"); }
  else { o.resist -= 4; kSay(`…${kMan(Math.ceil(need*1.05/10)*10)}은 있어야 움직이제.`, "worried"); }
  kClampOcc(); kTick(1);
}
function kFlipAnswer(pay){
  const o = K.occ; K.pendingFlip = false;
  if(pay){ K.cost.move += o.agreed.amt; kNarr(`50만원을 더 얹었다. 짐이 빠졌다. 총 이사비 ${kMan(o.agreed.amt)}.`); return kMoved(); }
  o.agreed.amt -= 50; o.coop -= 15; o.agreed.day = K.day + 5; o.paper = true;
  kSay("…알았다, 알았다 카이. 약속한 대로 하께.", "worried"); kLog("📝 이번엔 합의서를 썼다. 5일 뒤 이사."); kTick(1);
}
function kMoved(){ K.moveDays = K.day; K.step = "defect"; kDefect(); }
/* ---------- 4. 하자 ---------- */
const K_EVENTS = [
  {t:"🧊 냉장고만 남기고 이사 — 폐기물 스티커·운반", cost:15},
  {t:"🚿 싱크대 아래 배관이 새고 있다", cost:45},
  {t:"🐈 베란다에서 고양이 한 마리 발견 — 구조단체에 연락", cost:0},
  {t:"🔑 현관 비밀번호를 모른다 — 열쇠공 호출·도어락 교체", cost:18},
  {t:"🧱 도배지 뒤 곰팡이 — 방수 처리 추가", cost:60}];
function kDefect(){
  const h = KP.hidden[0];
  K.defects = [];
  K.defects.push({t:`⚡ 방 한쪽 전기가 안 들어온다 → 전기기사: 누전. 배선 일부 교체`, cost:h.cost, known:!!K.found.elec});
  const e = K_EVENTS[Math.floor(K.r()*K_EVENTS.length)]; K.defects.push({t:e.t, cost:e.cost, known:false});
  if(!K.found.fee){ K.defects.push({t:"🧾 관리실: 공용부분 체납관리비 38만원은 낙찰자가 내셔야 해요", cost:38, known:false}); }
  K.cost.repair += K.defects.reduce((a,d)=>a+d.cost, 0) - (K.found.fee ? 0 : 0);
  if(!K.found.elec) K.lessonKey = K.lessonKey || "elec";
  kDay(5);
}
function kRepair(id){ const p = K_REPAIR.find(x=>x.id===id); K.repair = p; K.cost.repair += p.cost; kDay(id==="full" ? 30 : id==="good" ? 12 : id==="part" ? 7 : 3); if(id==="full") K.lessonKey = K.lessonKey || "full"; K.step = "list"; }
/* ---------- 5. 매도 ---------- */
const K_LIST = [16200, 15800, 15500, 15200];
function kList(price){
  const trueP = Math.round(KP.trueMid * (1 + (K.repair ? K.repair.price : 0)));
  K.sale = {list:price, trueP, weeks:0, offers:[], buyer:null, done:false};
  if(price >= 16000) K.lessonKey = K.lessonKey || "greedy";
  K.step = "sell"; kWeek();
}
const K_BUYERS = [{t:"신혼부부", flex:0.012, cancel:0.05},{t:"대출 최대한도형", flex:0.004, cancel:0.35},{t:"가격 깎기형", flex:0.025, cancel:0.08},{t:"부모 지원형", flex:0.01, cancel:0.15},{t:"급하게 이사해야 하는 사람", flex:0.006, cancel:0.05}];
function kWeek(){
  const S = K.sale; if(S.done) return;
  S.weeks++; kDay(7);
  const over = (S.list - S.trueP) / S.trueP, speed = K.repair ? K.repair.speed : 0;
  const p = Math.max(0.08, Math.min(0.92, 0.45 - over*4 + speed));
  if(S.weeks === 1 && S.list > 15200){ S.offer = {amt:15200, buyer:K_BUYERS[1], script:true}; return; }   // 기획서: 1.52억 제안
  if(K.r() < p){ const b = K_BUYERS[Math.floor(K.r()*K_BUYERS.length)]; const amt = Math.min(S.list, Math.round(S.trueP * (1 - b.flex - K.r()*0.01) / 10) * 10); S.offer = {amt, buyer:b}; }
  else S.offer = null;
}
function kSaleAnswer(kind){
  const S = K.sale, of = S.offer;
  if(!of && kind!=="wait" && kind!=="lower") return;
  if(kind==="accept"){ return kClose(of.amt, of.buyer); }
  if(kind==="counter"){ const mid = Math.round((of.amt + S.list)/2/10)*10; if(K.r() < 0.5 - of.buyer.flex*8){ return kClose(mid, of.buyer); } S.note = `매수자가 ${kMan(mid)} 역제안을 거절했다. "생각해 볼게요" — 다시 연락은 오지 않았다.`; S.offer = null; return kWeek(); }
  if(kind==="lower"){ S.list = Math.round((S.list - 300)/10)*10; S.note = `호가를 ${kMan(S.list)}으로 내렸다.`; S.offer = null; return kWeek(); }
  S.note = "기다리기로 했다."; S.offer = null; kWeek();
}
function kClose(amt, buyer){
  const S = K.sale;
  if(K.r() < buyer.cancel){ S.note = `😱 ${buyer.t} 매수자 — 계약 직전 "대출이 덜 나와서요…" 계약이 깨졌다.`; K.events.push("계약 파기"); K.lessonKey = "cancel"; kAch("cancelled"); S.offer = null; return kWeek(); }
  S.done = true; S.price = amt; S.buyer = buyer; K.cost.broker = Math.min(90, Math.round(amt * 0.005)); kFinish();
}
/* ---------- 6. 결과 ---------- */
function kFinish(){
  if(KP.finish) return KP.finish();
  K.step = "result";
  const c = K.cost, total = c.bid + c.acq + c.move + c.repair + c.hold + c.fee + c.broker + c.legal, profit = K.sale.price - total;
  const hid = KP.hidden.length, found = KP.hidden.filter(h=>K.found[h.id]).length;
  const g = (v, a, b, cc) => v >= a ? "S" : v >= b ? "A" : v >= cc ? "B" : "C";
  const grades = {
    bid: g(-(K.bid - (KP.trueMid*0.78)) , 0, -300, -700),
    move: g(-(K.moveDays*1.7 + c.move + c.legal), -140, -220, -400),
    repair: K.repair.id==="good" || K.repair.id==="part" ? (K.found.elec ? "S" : "A") : K.repair.id==="min" ? "B" : "C",
    sell: g(K.sale.price - K.sale.trueP, 100, -100, -300)
  };
  const tips = [];
  if(!K.found.elec) tips.push(`누전을 입찰 전에 봤다면 수리비를 입찰가에 미리 넣어 ${kMan(120)}만큼 덜 쓸 수 있었어요.`);
  if(!K.found.price) tips.push(`중개사 셋에 전화했다면 '1.6억'이 큰길 기준이라는 걸 알고 호가를 처음부터 맞췄을 거예요.`);
  if(!K.found.flip && K.occ.flipped) tips.push(`옆집 할머니 한마디(딸 연락처)면 이삿날 50만원 번복이 없었어요.`);
  if(!K.found.fee) tips.push("관리실에 한 번만 물었어도 체납관리비 38만원은 예상된 비용이었어요.");
  // 플레이 스타일
  const s = K.style, top = Object.entries({empathy:s.empathy, money:s.money, law:s.law, pressure:s.pressure}).sort((a,b)=>b[1]-a[1])[0][0];
  const STY = {empathy:["공감형 명도마스터","점유자 사정을 먼저 듣고, 갈 곳부터 같이 찾는 타입"], money:["냉정한 숫자사냥꾼","감정보다 날짜와 금액으로 푸는 타입"], law:["법대로 갑니다형","절차를 먼저 깔고 움직이는 타입 — 확실하지만 달력이 넘어가요"], pressure:["직진 압박형","세게 나가면 풀린다고 믿는 타입 — 자존심 센 상대에겐 역효과"]};
  let style = STY[top]; if(K.style.research >= 4) style = ["현장조사 탐정","입찰 전에 발로 뛰어 숨은 위험을 먼저 찾는 타입"];
  K.final = {total, profit, rate: profit/total*100, found, hid, grades, tips, style, lesson: KP_LESSON()};
  // 기록·업적
  const R = kRec(); R.plays++; if(!R.best || profit > R.best.profit) R.best = {profit:Math.round(profit), seed:K.seed};
  R.dex.p_grandpa = Math.max(R.dex.p_grandpa||0, found >= 3 ? 3 : found >= 1 ? 2 : 1);
  if(found === hid) kAch("detective"); if(K.moveDays <= 10) kAch("lightning"); if(c.move >= 300) kAch("moneyfix"); if(K.occ.dInvolved) kAch("family"); if(K.sale.weeks >= 8) kAch("hodl"); if(profit > 3000) kAch("big");
  if(typeof save==="function") save();
}
// 💰 세금(대략) — 매매사업자: 사업소득 → 종합소득세 기본세율(6~45%) + 지방소득세 10%
//   다른 소득이 없다고 가정. 이자·관리비·이사비·수리비 등 사업 관련 비용은 필요경비로 뺀다.
//   개인(비사업자) 비교: 1년 미만 보유 주택 양도세 70% + 지방세, 기본공제 250만, 필요경비는 좁게(이자·관리비·이사비 제외).
const K_BRACKETS = [[1400,0.06,0],[5000,0.15,126],[8800,0.24,576],[15000,0.35,1544],[30000,0.38,1994],[50000,0.40,2594],[100000,0.42,3594],[Infinity,0.45,6594]];
function kIncomeTax(base){ if(base <= 0) return 0; const b = K_BRACKETS.find(x=>base <= x[0]); return Math.round((base*b[1] - b[2]) * 1.1); }
function kTaxes(){
  const c = K.cost, profit = K.final.profit;
  const biz = kIncomeTax(profit);
  const gain = K.sale.price - c.bid - c.acq - c.broker - c.repair;      // 양도세 필요경비는 좁다(이자·관리비·이사비 X, 수리비도 실제론 자본적지출만)
  const personal = Math.max(0, Math.round((gain - 250) * 0.70 * 1.1));
  return {biz, bizAfter: profit - biz, personal, personalAfter: profit - personal};
}
function KP_LESSON(){ return K_LESSONS[K.lessonKey] || K_LESSONS.quick; }
const K_ACH = {tenman:["💔","10만 원의 비극","10만 원 이내 차이로 패찰"], tight:["🎯","간발의 차","30만 원 이내 차이로 낙찰"], word:["🗣️","말 한마디로 천 냥","이사비 0원으로 합의"], moneyfix:["💸","돈으로 해결","이사비 300만원 이상"], byLaw:["⚖️","법대로 갑니다","강제집행으로 명도"],
  hothead:["😤","불난 집에 부채질","인도명령 없이 강제집행으로 겁주기"], detective:["🔍","숨은 위험 탐정","숨은 위험 전부 발견"], lightning:["⚡","번개 명도","10일 안에 명도"], family:["👨‍👧","가족의 힘","가족을 통해 협상"], hodl:["⏳","존버의 끝","매도에 8주 이상"], cancelled:["😱","슈뢰딩거의 매수자","계약 직전 파기 경험"], big:["🏆","한 방","순이익 3,000만원 초과"]};
function kAch(id){ if(!id) return; const R = kRec(); if(!R.ach[id]){ R.ach[id] = Date.now(); K.achNew.push(id); } }

/* ============================== 화면 ============================== */
function kStage(bg, who, ex, text, name){
  const u = who==="occ" ? artNpc(KP.occ.pid, ex||"normal") : null, pu = artNpc("player","normal");
  const key = "k|" + K.seed + "|" + K.step + "|" + K.day + "|" + (text||"").length;
  return `<div class="vn k-stage" data-vnkey="${esc(key)}"><div class="vn-bg">${vnBgHTML(bg)}</div>${u?`<img class="vn-sprite ex-${ex||"normal"}" src="${u}" alt="">`:""}${pu?`<img class="vn-player" src="${pu}" alt="">`:""}
   <div class="vn-box${who==="occ"?"":" narr"}">${who==="occ"?`<div class="vn-name">${esc(name||KP.occ.name)}</div>`:""}<div class="vn-text" id="vnText" data-full="${esc(text||"")}"></div><span class="vn-next" aria-hidden="true">▼</span></div></div>`;
}
function kHud(){
  const c = K.cost, spent = c.bid + c.acq + c.move + c.repair + c.hold + c.fee + c.legal;
  return `<div class="k-hud"><span>📅 ${K.day}일째</span><span>💸 들어간 돈 ${kMan(spent)}</span><span>🔍 찾아낸 위험 ${KP.hidden.filter(h=>K.found[h.id]).length}개</span></div>`;
}
function kLogHTML(){ return K.log.length ? `<details class="panel vn-more"${K.step==="brief"?" open":""}><summary>🗂️ 조사 노트 (${K.log.length})</summary><ul class="ag-tips">${K.log.map(l=>`<li>${esc(l)}</li>`).join("")}</ul></details>` : ""; }
function kingHTML(){
  const R = kRec();
  if(!K){
    const ach = Object.entries(K_ACH);
    return `<div class="vn-title">${vnBgHTML("bg_villa_day")}<div><h3>🏆 경매왕</h3><p>물건 조사 → 입찰 → 명도 → 하자 → 수리 → 매도. 한 판 15분, 손익은 진짜처럼.</p><div class="tt-btns"><button type="button" class="btn pri" data-kstart>▶ 1번 물건 시작</button></div></div></div>
    <p class="lead">정답을 맞히는 퀴즈가 아니에요. <b>정보를 모으고, 사람을 읽고, 위험을 계산해서</b> 마지막에 얼마가 남았는지로 평가받아요. 처음엔 다 안 보여요 — 조사해야 드러나요.</p>
    <div class="panel ag-prog"><span>🎮 ${R.plays}판</span><span>💰 최고 순이익 ${R.best?kMan(R.best.profit):"—"}</span><span>🏅 업적 ${Object.keys(R.ach).length}/${ach.length}</span></div>
    <div class="k-props"><div class="panel k-prop on"><b>1. ${esc(KP.title)}</b><div class="note">${esc(KP.addr)}</div><span class="chip">난이도 ★☆☆☆ — 쉬워 보이는 물건</span></div>
      ${["2. 임차인 있는 투룸 (중급)","3. 가족이 얽힌 빌라 (고급)","4. 전소유자+임차인+누수 (악몽)"].map(t=>`<div class="panel k-prop locked"><b>🔒 ${t}</b><div class="note">준비 중 — 1번 물건 먼저</div></div>`).join("")}</div>
    <details class="panel ag-brief" style="margin-top:10px"><summary>🏅 업적</summary><div class="ag-badgewall">${ach.map(([id,a])=>`<span class="ag-badge ${R.ach[id]?"":"off"}">${a[0]} ${a[1]}<small>${a[2]}</small></span>`).join("")}</div></details>`;
  }
  const quit = "";   // 그만두기 버튼은 없앴다 — 누르면 판이 통째로 꺼졌다. 나가려면 머리줄 🏠(판은 저장돼 이어하기로 돌아온다)
  if(K.step==="brief"){
    return kStage("bg_villa_day","narr",null,`${KP.title}. 감정가 ${kMan(KP.appraisal)}, 최저가 ${kMan(KP.minBid)}. ${KP.briefLine || "서류만 보면 쉬운 물건이다. …정말?"}`) + `
    <div class="panel k-card"><div class="k-grid"><span>감정가</span><b>${kMan(KP.appraisal)}</b><span>최저가</span><b>${kMan(KP.minBid)}</b><span>최근 실거래</span><b>${KP.recent}</b><span>중개사 한마디</span><b>"${kMan(KP.brokerSays)}이면 바로 나가요"</b><span>예상 수리비</span><b>${kMan(KP.estRepair)} (겉보기)</b><span>점유자</span><b>${esc(KP.occ.name)} (${KP.occ.age}) · ${esc(KP.occ.legal)}</b><span>경쟁자</span><b>${K.found.rivals?`약 ${K.rivals.length}명`:"??"}</b></div></div>
    <h3 class="vn-q">입찰까지 ${K.daysLeft}일 — 어디를 조사할까? <small class="note">하루에 한 곳. 다 볼 수는 없어요.</small></h3>
    <div class="ag-acts vn-acts">${(KP.research||K_RESEARCH).map(a=>`<button type="button" class="ag-act" data-kres="${a.id}" ${K.done[a.id] || K.daysLeft < a.day ? "disabled" : ""}><span class="ag-ai">${a.ic}</span><span><b>${a.t}</b><span class="note" style="display:block">${K.done[a.id]?"✅ 확인함":a.day?"하루 소모":"바로 가능"}</span></span></button>`).join("")}</div>
    ${kLogHTML()}
    <div class="panel k-bidbox"><b>🧾 입찰가 적기</b> <span class="note">최저가 ${kMan(KP.minBid)} 이상 · 입찰보증금은 최저가의 10%</span>
      <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><input type="number" id="kBid" min="${KP.minBid}" step="10" value="${KP.minBid + 1000}" style="width:160px;font-size:18px;padding:6px 10px"> <span>만원</span><button type="button" class="btn pri" data-kbid>입찰표 제출</button></div>
      <div class="note" style="margin-top:6px">팁: 낙찰가 = 내가 쓴 돈의 시작일 뿐. 명도·수리·보유 기간 이자·중개비까지 빼고도 남아야 해요.</div></div>` + quit;
  }
  if(K.step==="lost"){
    const r = K.result;
    return kStage("bg_court","narr",null, r.gap <= 10 ? `패찰. ${kMan(r.gap)} 차이. …${kMan(r.gap)}.` : `패찰. 낙찰가 ${kMan(r.other.amt)}.`) + `
    <div class="panel k-bidres lose"><h3>📭 패찰 <small class="note">이번엔 낙찰받지 못했어요</small></h3>${typeof gmwSceneArt==="function" ? gmwSceneArt("lost") : ""}${kBidTable()}<p class="k-lesson">📜 ${esc(r.gap <= 30 ? K_LESSONS.lose_close : K_LESSONS.lose_far)}</p></div>${kAchNew()}
    <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-kstart>↺ 같은 물건 다시 (다른 경쟁자)</button><button type="button" class="btn" data-kquit>목록</button></div>`;
  }
  if(K.step==="won"){
    return kStage("bg_court","narr",null,`낙찰! 2등과 ${kMan(K.result.gap)} 차이. …이제부터가 본게임이다.`) + `
    <div class="panel k-bidres win"><h3>🎉 낙찰 — 최고가매수신고인이 됐어요</h3>${kBidTable()}<ol class="k-proc"><li><b>매각허가결정</b> 약 1주 · 이의가 없으면 확정</li><li><b>대금 납부</b> 기한 안에 잔금을 내는 날 <b>소유권을 취득</b></li><li><b>인도명령</b> 대금을 낸 뒤 6개월 안에 신청할 수 있어요</li></ol><small class="note">게임에선 이 과정을 며칠로 줄여서 보여 줘요.</small><div class="note">잔금·등기: 취득세·법무비 등 약 ${kMan(K.cost.acq)}${K.found.fee?` · 체납관리비 ${kMan(38)} 미리 계산됨`:""}</div></div>${kAchNew()}
    <button type="button" class="btn pri" data-kgo="move" style="margin-top:12px">🔑 잔금 내고 점유자 만나러 가기 →</button>`;
  }
  if(K.step==="move"){
    const o = K.occ, sc = K.scene || {who:"occ", t:"(문이 반쯤 벌어진다) …낙찰자요? 내 보증금도 몬 받는다 카대. 내가 뭘 잘못했는데!", ex:"angry"};
    const acts = K.pendingFlip ? `<div class="ag-acts vn-acts"><button type="button" class="ag-act" data-kflip="1"><span class="ag-ai">💸</span><span><b>50만원 더 준다</b><span class="note" style="display:block">오늘 끝내기</span></span></button><button type="button" class="ag-act" data-kflip="0"><span class="ag-ai">📝</span><span><b>"약속은 약속입니다" — 이번엔 합의서</b><span class="note" style="display:block">며칠 더 걸릴 수 있음</span></span></button></div>`
      : K.offering ? `<div class="ag-acts vn-acts"><div class="ag-act ag-offer"><span class="ag-ai">💰</span><div><b>이사비 제안</b><div class="note">점유자가 원하는 건 ${kMan(K.askNeed)} 안팎</div><div class="ag-amts">${K_OFFERS.map(v=>`<button type="button" class="chip" data-koffer="${v}">${v?kMan(v):"0원(날짜만)"}</button>`).join("")}</div></div></div></div>`
      : `<div class="ag-acts vn-acts">${K_MOVES.filter(m=>!m.need || m.need(o)).map(m=>`<button type="button" class="ag-act${m.id==="threat"?" ag-bad":""}" data-kmove="${m.id}"><span><b>${m.t}</b><span class="note" style="display:block">${m.day}일 소요</span></span></button>`).join("")}</div>`;
    return kStage(o.agreed && !K.pendingFlip ? "bg_stairs" : "bg_front_door", sc.who, sc.ex, sc.t) + kHud() + `
     <div class="panel k-occ"><b>👴 ${esc(KP.occ.name)}</b> <small>협조도</small><span class="k-meter"><i style="width:${o.coop}%"></i></span><b>${Math.round(o.coop)}</b><span class="note"> · 버티기 ${o.orderOk?Math.round(o.resist):"??"} · 경제적 곤란 높음 · 법 이해도 낮음${K.found.flip?" · 🔍 약속을 잘 바꿈, 딸 말은 들음":""}</span>
     ${o.agreed?`<div class="note">🤝 ${o.agreed.day}일째 이사 약속 · 이사비 ${kMan(o.agreed.amt)} ${o.paper?"· 📝 합의서 있음":"· ⚠️ 말로만 한 약속"}</div>`:""}${o.order?`<div class="note">⚖️ 인도명령 결정 예정 ${o.order}일째</div>`:""}${o.exec?`<div class="note">🚚 집행 예정 ${o.exec.day}일째</div>`:""}</div>
     ${o.agreed && !K.pendingFlip ? `<div class="ag-acts vn-acts"><button type="button" class="ag-act" data-kwait><span><b>⏳ 이삿날까지 기다린다</b><span class="note" style="display:block">매일 ${KP.dailyHold}만원 이자·관리비</span></span></button>${!o.paper?`<button type="button" class="ag-act" data-kmove="paper"><span><b>📝 합의서를 쓴다</b><span class="note" style="display:block">1일</span></span></button>`:""}</div>` : acts}
     <div class="note" style="margin-top:6px">⏱️ 하루하루가 돈이에요 — 이사비 150만원에 7일 vs 0원에 50일, 어느 쪽이 싼지는 계산해 봐야 알아요.</div>${kLogHTML()}${kAchNew()}` + quit;
  }
  if(K.step==="defect"){
    return kStage("bg_room_messy","narr",null,"빈집. 불을 켰다. …한쪽 방 불이 안 들어온다.") + kHud() + `
    <div class="panel k-card"><h3>🔦 집을 열어 보니</h3><ul class="k-defects">${K.defects.map(d=>`<li class="${d.known?"known":""}"><span>${esc(d.t)}</span><b>${d.cost?kMan(d.cost):"비용 없음"}</b>${d.known?'<small>🔍 조사로 미리 알았음</small>':'<small>😱 몰랐음</small>'}</li>`).join("")}</ul>
    <div class="note">처음 예상 수리비 ${kMan(KP.estRepair)} → 필수 수리만 벌써 ${kMan(K.defects.reduce((a,d)=>a+d.cost,0))}</div></div>
    <h3 class="vn-q">인테리어는 어디까지? <small class="note">많이 쓴다고 무조건 남는 게 아니에요.</small></h3>
    <div class="ag-acts vn-acts">${K_REPAIR.map(p=>`<button type="button" class="ag-act" data-krep="${p.id}"><span><b>${p.t} — ${kMan(p.cost)}</b><span class="note" style="display:block">${p.d}</span></span></button>`).join("")}</div>${kAchNew()}` + quit;
  }
  if(K.step==="list"){
    return kStage("bg_room_clean","narr",null,`수리 끝. ${K.repair.t.slice(3)}. 이제 얼마에 내놓을까.`) + kHud() + `
    <div class="panel k-card"><div class="k-grid"><span>중개사</span><b>"${kMan(KP.brokerSays)} 충분합니다"</b><span>최근 실거래</span><b>${KP.recent}</b>${K.found.price?`<span>🔍 조사 노트</span><b>이 골목 현실가 1억 5천 초중반</b>`:""}</div></div>
    <h3 class="vn-q">호가를 정하세요</h3><div class="ag-acts vn-acts">${K_LIST.map(v=>`<button type="button" class="ag-act" data-klist="${v}"><span><b>${kMan(v)}</b><span class="note" style="display:block">${v>=16000?"호가 높게 시작":v>=15800?"살짝 높게":v>=15500?"적정가 느낌":"급매 — 빨리 팔기"}</span></span></button>`).join("")}</div>` + quit;
  }
  if(K.step==="sell"){
    const S = K.sale, of = S.offer;
    return kStage("bg_realtor","narr",null, of ? `${S.weeks}주차. 중개사 전화: "${of.buyer.t} 손님이요, ${kMan(of.amt)}이면 오늘 계약한대요."` : `${S.weeks}주차. 이번 주는 조용하다. 집 보러 온 사람 ${(S.weeks*7+K.seed)%3}팀, 연락은 없다.`) + kHud() + `
    <div class="panel k-card"><div class="k-grid"><span>현재 호가</span><b>${kMan(S.list)}</b><span>보유 비용</span><b>매주 약 ${kMan(KP.dailyHold*7)}</b></div>${S.note?`<div class="note" style="margin-top:6px">${esc(S.note)}</div>`:""}</div>
    ${of ? `<div class="ag-acts vn-acts"><button type="button" class="ag-act" data-ksale="accept"><span><b>✅ ${kMan(of.amt)} 수락</b></span></button><button type="button" class="ag-act" data-ksale="counter"><span><b>↔️ 중간(${kMan(Math.round((of.amt+S.list)/2/10)*10)}) 역제안</b></span></button><button type="button" class="ag-act" data-ksale="wait"><span><b>⏳ 거절하고 다른 매수자 기다림</b></span></button></div>`
      : `<div class="ag-acts vn-acts"><button type="button" class="ag-act" data-ksale="wait"><span><b>⏳ 한 주 더 기다린다</b></span></button><button type="button" class="ag-act" data-ksale="lower"><span><b>📉 호가 300만원 내린다</b></span></button></div>`}` + quit;
  }
  if(K.step==="result"){
    const F = K.final, c = K.cost, rows = [["낙찰가",c.bid],["취득세·등기비",c.acq],["명도비(이사비)",c.move],["법적 절차",c.legal],["수리·하자",c.repair],["체납관리비",c.fee],["보유 이자·관리비",Math.round(c.hold)],["매도 중개수수료",c.broker]];
    return (F.profit > 0 ? confettiHTML() : "") + kStage("cut_keys","narr",null, `${K.sale.buyer.t} 매수자와 ${kMan(K.sale.price)}에 계약. 한 판이 끝났다.`) + `
    <div class="panel k-result"><h3>📑 경매 완료</h3><div class="k-rows">${rows.map(([t,v],i)=>`<div class="gt-row" style="animation-delay:${i*0.12}s"><span>${t}</span><b>${kMan(v)}</b></div>`).join("")}
     <div class="gt-row k-total"><span>총 투입</span><b>${kMan(F.total)}</b></div><div class="gt-row"><span>매도가</span><b>${kMan(K.sale.price)}</b></div>
     <div class="gt-row k-profit ${F.profit>=0?"good":"bad"}"><span>세전 순이익</span><b>${F.profit>=0?"+":""}${kMan(F.profit)}</b></div>
     <div class="gt-row"><span>보유기간 · 명도기간</span><b>${K.day}일 · ${K.moveDays}일</b></div><div class="gt-row"><span>수익률(세전)</span><b>${F.rate.toFixed(1)}%</b></div></div>
     <div class="k-grades">${[["입찰",F.grades.bid],["명도",F.grades.move],["수리",F.grades.repair],["매도",F.grades.sell]].map(([t,gg])=>`<span class="k-g g${gg}"><small>${t}</small>${gg}</span>`).join("")}</div>
     <div class="note">🔍 숨은 위험 ${F.hid}개 중 ${F.found}개 발견</div></div>
    ${(()=>{ const T = kTaxes(); return `<div class="panel k-tax"><b>🧾 세금까지 빼면 (대략)</b>
      <div class="k-taxrow on"><span>🏢 <b>매매사업자</b> — 종합소득세(사업소득) + 지방소득세</span><span>세금 약 ${kMan(T.biz)} → <b>세후 ${kMan(T.bizAfter)}</b></span></div>
      <div class="k-taxrow"><span>🙋 개인이었다면 — 1년 안 보유 주택 양도세 70% + 지방세</span><span>세금 약 ${kMan(T.personal)} → 세후 ${kMan(T.personalAfter)}</span></div>
      <ul class="ag-tips note"><li>매매사업자는 단기에 팔아도 사업소득이라 <b>기본세율(6~45%)</b>로 가고, 이자·관리비·이사비·수리비를 필요경비로 뺄 수 있어요. 여기선 <b>다른 소득이 없다</b>고 가정했어요.</li>
      <li>⚠️ 다만 <b>조정대상지역 다주택 중과 대상 주택</b> 등은 '비교과세'라서 양도세로 계산한 것과 종소세 중 <b>큰 쪽</b>을 내요 — 지역 지정·중과 유예 여부는 시점마다 달라지니 세무사와 확인하세요.</li>
      <li>전용 85㎡ 이하 주택 매매는 부가세가 면세예요. 건강보험료·장부 방식(단순경비율 등)에 따라 실제 숫자는 달라져요.</li></ul></div>`; })()}
    ${F.tips.length?`<div class="panel st-tips"><b>💡 이렇게 했다면</b><ul class="ag-tips">${F.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`:""}
    <div class="panel k-style"><small>당신의 유형</small><b>${esc(F.style[0])}</b><div class="note">${esc(F.style[1])}</div></div>
    <div class="panel k-lesson-card"><small>[오늘의 교훈]</small><p>“${esc(F.lesson)}”</p></div>${kAchNew()}
    <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-kstart>↺ 한 판 더 (다른 경쟁자·다른 사건)</button><button type="button" class="btn" data-kquit>목록</button></div>`;
  }
  return quit;
}
function kBidTable(){ return `<ol class="k-bids">${K.result.bids.map(b=>`<li class="${b.me?"me":""}"><span>${b.me?"👉 나":esc(b.who)}</span><b>${kMan(b.amt)}</b></li>`).join("")}</ol>`; }
function kAchNew(){ if(!K || !K.achNew.length) return ""; const h = `<div class="panel ag-badges-new"><b>🏅 업적 달성!</b>${K.achNew.map(id=>`<span class="ag-badge">${K_ACH[id][0]} ${K_ACH[id][1]}<small>${K_ACH[id][2]}</small></span>`).join("")}</div>`; K.achNew = []; return h; }

document.addEventListener("click", e => {
  if(page!=="arena" || arenaTab!=="king") return;
  let b;
  if(e.target.closest("[data-kstart]")){ kStart(); renderArena(); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-kquit]")){ K = null; renderArena(); return; }
  if(!K) return;
  if((b = e.target.closest("[data-kres]"))){ kResearch(b.dataset.kres); renderArena(); return; }
  if(e.target.closest("[data-kbid]")){ const v = +((document.getElementById("kBid")||{}).value||0); if(v < KP.minBid){ safeAlert(`최저가 ${kMan(KP.minBid)} 이상 적어야 해요.`); return; } kBid(v); renderArena(); window.scrollTo(0,0); return; }
  if((b = e.target.closest("[data-kgo]"))){ K.step = b.dataset.kgo; K.scene = null; renderArena(); return; }
  if((b = e.target.closest("[data-kmove]"))){ kMove(b.dataset.kmove); renderArena(); return; }
  if((b = e.target.closest("[data-koffer]"))){ kOffer(+b.dataset.koffer); renderArena(); return; }
  if((b = e.target.closest("[data-kflip]"))){ kFlipAnswer(b.dataset.kflip==="1"); renderArena(); return; }
  if(e.target.closest("[data-kwait]")){ for(let i=0;i<40 && K.step==="move" && !K.pendingFlip;i++) kTick(1); renderArena(); return; }
  if((b = e.target.closest("[data-krep]"))){ kRepair(b.dataset.krep); renderArena(); return; }
  if((b = e.target.closest("[data-klist]"))){ kList(+b.dataset.klist); renderArena(); return; }
  if((b = e.target.closest("[data-ksale]"))){ kSaleAnswer(b.dataset.ksale); renderArena(); return; }
});
