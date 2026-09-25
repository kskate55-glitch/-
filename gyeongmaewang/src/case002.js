/* ================= 📁 CASE 002 — 은평구 투룸: "낙찰받았다고 끝까지 들고 가는 게 아니다" =================
   1번이 "잘 풀면 번다"라면 2번은 정보를 팔수록 '손절해야 하나?'가 커지는 판.
   명도는 쉽다(협조적인 전 소유자). 대신 누수·같은 건물 급매·얇은 매수자층·엇갈리는 시세가 판을 흔든다.
   갈림길마다 "계속 간다 / 최소 수리 후 급매 / 손실 감수하고 즉시 정리"를 고른다 — 손절은 실패 버튼이 아니다.
   ⚠️ 모든 숫자는 게임 밸런스용 경험적 값이다. */
const KP2 = {
  id:"k2", no:2, short:"은평구 투룸 빌라", stars:2, tagline:"멈출 줄 아는 사람", title:"은평구 투룸 빌라 4층",
  addr:"서울 은평구 ○○동 · 1995년식 · 전용 59㎡(약 18평) · 승강기 없음",
  appraisal:18700, minBid:11970, recent:"1억 7,000 ~ 1억 8,000 (최근 1년 3건)", brokerSays:17000,
  trueMid:15800, trueSpread:300, estRepair:250, dailyHold:2.3,
  briefLine:"감정가 1억 8,700에 최저가 1억 1,970. 겉으로만 보면 마진이 어마어마하다. …그래서 다들 온다.",
  occ:{pid:"p_coop", name:"정은주 씨", age:52, legal:"전 소유자(채무자) 거주 · 배당 없음 · 인도명령 대상 · 협조적"},
  unlock:p => !!(p.cleared && p.cleared["king:k1"]) || (typeof kcRec === "function" && kcRec().cases >= 1),
  hidden:[
    {id:"leak",  t:"벽 뒤 누수", d:"아래층 주민: '그 집 작년에도 우리 천장으로 물 샜어요. 고쳤다고는 했는데…'"},
    {id:"price", t:"엇갈리는 시세", d:"박 중개사: '1억 7천은 큰길 신축 라인 얘기예요. 여긴 1억 5천 후반이 현실적입니다.'"},
    {id:"dump",  t:"같은 건물 급매", d:"같은 건물 3층이 1억 6,200만원 급매로 올라와 있다 — 내 물건의 첫 경쟁자."},
    {id:"loan",  t:"얇은 매수자층", d:"은행: '준공 30년 차라 감정이 낮게 나와요. 매수자 대출이 생각보다 적게 나옵니다.'"}],
  research:[
    {id:"docs",   ic:"📄", t:"매각물건명세서·등기부 보기", day:0, reveal:null, text:"전 소유자 정은주 씨 거주 — 채무자라 배당 없음, 인도명령 대상. 서류상은 깔끔하다."},
    {id:"kim",    ic:"📞", t:"단골 중개사 김사장에게 전화", day:1, reveal:"kim", who:"김사장", say:"1억 7천은 무조건 됩니다. 요즘 투룸 없어서 난리예요."},
    {id:"park",   ic:"🏢", t:"처음 가 보는 박 중개사 사무실 방문", day:1, reveal:"price", who:"박 중개사", say:"1억 5천 후반이 현실적이에요. 1.7은 큰길 얘기고요."},
    {id:"down",   ic:"👩", t:"아래층 주민에게 말 걸기", day:1, reveal:"leak", who:"아래층 아주머니", say:"작년에도 물 샜어요. 고쳤다고는 했는데…"},
    {id:"listing",ic:"📱", t:"같은 건물 매물 검색", day:1, reveal:"dump"},
    {id:"bank",   ic:"🏦", t:"은행에 매수자 대출 한도 문의", day:1, reveal:"loan", who:"은행 대출상담", say:"이 라인은 감정이 낮게 나와서 매수자 대출이 적게 나옵니다."},
    {id:"court",  ic:"⚖️", t:"사건 조회수·입찰 법정 분위기 보기", day:1, reveal:"rivals"}],
  // 겉 마진이 좋아 보여 사람은 몰리지만, 조사한 사람들은 선을 지킨다
  rivals:[{t:"초보 과입찰러", lo:1.12, hi:1.24}, {t:"겉 마진 보고 온 투자자", lo:1.10, hi:1.22}, {t:"지역 실수요자", lo:1.05, hi:1.14}, {t:"전문 투자자", lo:1.02, hi:1.10}, {t:"무조건 저가형", lo:1.00, hi:1.04}],
  cards:[
    {id:"docs",  src:"docs",   ic:"📄", t:"매각물건명세서", d:"채무자 거주 · 배당 없음", w:15},
    {id:"kim",   src:"kim",    byDone:true, ic:"🗣️", t:"김사장 통화", d:"\"1억 7천은 무조건 됩니다\"", w:4},
    {id:"price", src:"park",   ic:"📝", t:"박 중개사 의견", d:"1.7은 큰길 기준 · 여긴 1.5 후반", w:12},
    {id:"leak",  src:"down",   ic:"💧", t:"아래층 증언", d:"작년에도 천장으로 물이 샜다", w:14},
    {id:"dump",  src:"listing",ic:"🏷️", t:"같은 건물 급매", d:"3층 1억 6,200만원", w:12},
    {id:"loan",  src:"bank",   ic:"🏦", t:"은행 대출 상담", d:"매수자 대출 적게 나옴", w:12},
    {id:"rivals",src:"court",  ic:"📊", t:"사건 조회수", d:"경쟁자 많음", w:6},
    {id:"inside",src:null,     ic:"🧱", t:"???", d:"벽을 뜯어 봐야 안다", w:0}],
  init(){
    K.occ = {coop:62, resist:15, pride:0.3, cash:0.6, place:false, flip:false, daughter:false, agreed:null, paper:false, order:null, orderOk:false, exec:null, asked:0, turns:0};
    K.k2 = {leakEarly:false, cond:null, claim:false, recurred:false, exit:null, loanChecked:false, forfeited:false};
  },
  finish(){ k2Finish(); }
};
K_PROPS.k2 = KP2;
const K2_EXIT = {cross:14400, defect:13700};                    // 업자 '현황 그대로' 매입가
const K2_DEPOSIT = () => Math.round(KP2.minBid * 0.1);
function k2Found(){ return KP2.hidden.filter(h=>K.found[h.id]).length; }
function k2Say(who, t, id){ if(!K.says.some(s=>s.t===t)) K.says.push({who, t, id}); }
function k2ExitValue(){
  if(K.step === "cross") return K2_EXIT.cross;
  if(K.step === "defect" || K.step === "move") return K2_EXIT.defect;
  const S = K.sale; return Math.round(((S && S.trueP) || 15000) - 1000 - (S ? Math.max(0, S.weeks - 4) * 40 : 0));
}

/* ---------- 갈림길 1: 잔금 전 ---------- */
function k2Cross(ch){
  if(ch === "go"){ kDay(7); K.step = "move"; K.scene = {who:"occ", ex:"normal", t:"(문이 열린다) …아, 낙찰받으신 분이죠. 들어오세요. 저도 빨리 정리하고 싶었어요."}; kLog("💳 잔금을 냈다. 이제 이 집은 내 것이다 — 좋든 싫든."); return; }
  if(ch === "forfeit"){ K.k2.forfeited = true; K.cost = {bid:K2_DEPOSIT(), acq:0, move:0, repair:0, hold:0, fee:0, broker:0, legal:0}; K.sale = {price:0, buyer:{t:"(잔금 미납 — 재매각)", cancel:0}, weeks:0, trueP:0, done:true}; K.repair = {id:"none", t:"—. 없음", cost:0}; K.moveDays = 0; K.events.push("잔금 포기"); return kFinish(); }
  if(ch === "exit"){ kDay(7); return k2Exit(); }
}
/* ---------- 즉시 정리: 업자 현황 매입 ---------- */
function k2Exit(){
  const price = k2ExitValue(), stage = K.step;
  K.k2.exit = stage; K.events.push("업자 현황 매입으로 정리");
  K.sale = Object.assign(K.sale || {}, {price, buyer:{t:"업자(현황 그대로 매입)", cancel:0}, weeks:(K.sale && K.sale.weeks) || 0, trueP:price, done:true});
  K.cost.broker += 30; kDay(3);
  if(K.moveDays == null) K.moveDays = 0;
  if(!K.repair) K.repair = {id:"none", t:"—. 수리 없이 넘김", cost:0};
  kFinish();
}
/* ---------- 명도: 쉽다(하지만 말은 기록된다) ---------- */
function k2Move(id){
  const o = K.occ; o.turns++;
  if(id === "paper"){ K.style.empathy++; o.coop += 8; K.scene = {who:"occ", ex:"normal", t:"네, 명도확인서 없으면 저도 곤란하죠… 열흘이면 짐 뺄 수 있어요. 다만 이사비를 조금이라도 도와주실 수 있으면요."}; K.k2.asking = true; return; }
  if(id === "ask"){ K.style.research++; const lie = "누수요? 처음 듣는데요… 전 잘 모르겠어요."; k2Say("정은주 씨", lie, "leak");
    K.scene = {who:"occ", ex: K.found.leak ? "worried" : "normal", t: K.found.leak ? `(시선을 피한다) ${lie}` : lie}; return; }
  if(id === "look"){ kDay(1); K.k2.leakEarly = true; K.style.research++; K.scene = {who:"narr", t:"짐 빼는 날 같이 안방에 들어갔다. 벽지 아래쪽이 들떠 있다. 손으로 누르니 — 축축하다."}; kLog("🔦 안방 벽지 아래가 축축하다 — 벽 뒤 누수를 미리 봤다(견적을 여러 곳 받을 시간이 생긴다)."); return; }
  if(id === "wait"){ const a = o.agreed; if(!a) return; kDay(Math.max(0, a.day - K.day)); K.cost.move += a.amt; K.moveDays = K.day;
    K.scene = {who:"narr", t:`이삿날. 정은주 씨는 열쇠를 건네며 고개를 숙였다.${a.amt ? ` 이사비 ${kMan(a.amt)}은 짐이 다 빠진 걸 보고 건넸다.` : ""}`};
    K.defects = [{t:"🧱 안방 벽지를 뜯자 벽 뒤로 물길 자국과 곰팡이 — 누수", cost:0, known:!!(K.found.leak || K.k2.leakEarly)}];
    kDay(3); K.step = "defect"; hubSee && hubSee("k2:leak"); return; }
}
function k2Offer(amt){ const o = K.occ; o.agreed = {day:K.day + 10, amt}; o.paper = true; K.k2.asking = false; K.style[amt ? "money" : "empathy"]++; K.scene = {who:"occ", ex:"normal", t: amt ? `감사합니다. ${K.day + 10}일째까지 비워 드릴게요. 명도확인서는 그날 주세요.` : "…네, 알겠어요. 열흘 뒤에 나갈게요."}; }
/* ---------- 갈림길 2: 벽 뒤 누수 ---------- */
const K2_FIX = [
  {id:"fix",  ic:"🔧", t:"제대로 고친다 — 배관 교체·방수 + 도배·장판", d:"열어 봐야 정확한 금액이 나온다", cost:()=>K.k2.leakEarly ? 520 : 620, days:18, trueP:15800, rid:"good"},
  {id:"min",  ic:"🩹", t:"최소 수리 + 누수 사실 고지하고 급매", d:"싸게 팔지만 정직하다", cost:()=>150, days:5, trueP:14900, rid:"min"},
  {id:"hide", ic:"🙈", t:"도배로 덮고 아무 말 안 한다", d:"겉으론 멀쩡해 보인다…", cost:()=>120, days:4, trueP:15500, rid:"hide", bad:true}];
function k2Fix(id){
  if(id === "exit") return k2Exit();
  const f = K2_FIX.find(x=>x.id===id); let cost = f.cost(), note = "";
  if(id === "fix" && K.r() < 0.35){ cost += 180; note = " (열어 보니 욕실 배관까지 +180)"; K.events.push("수리 중 추가 배관"); }
  K.cost.repair += cost; kDay(f.days); K.k2.cond = id;
  K.repair = {id:f.rid, t:`${f.id==="fix"?"B":f.id==="min"?"A":"D"}. ${f.t}`, cost, price:0, speed:0};
  kLog(`${f.ic} ${f.t} — ${kMan(cost)}${note}`);
  K.k2.trueP = f.trueP; K.step = "list";
}
/* ---------- 매도: 얇은 매수자층 + 같은 건물 급매 ---------- */
const K2_LIST = [[17000,"김사장 가격 — \"무조건 됩니다\""],[16500,"살짝 높게"],[15900,"박 중개사 가격"],[15400,"급매 경쟁 이기기"]];
function k2List(price){ K.sale = {list:price, trueP:K.k2.trueP, weeks:0, offer:null, done:false}; K.step = "sell"; k2Week(); }
function k2Week(){
  const S = K.sale; if(S.done) return;
  S.weeks++; kDay(7); S.note = "";
  if(S.weeks === 4){ S.note = "📢 같은 건물 3층 급매가 1억 6,200만원에 팔렸다."; hubSee && hubSee("k2:dump"); }
  if(K.k2.cond === "hide" && S.weeks === 5 && !K.k2.recurred){ K.k2.recurred = true; K.cost.repair += 425; S.trueP = 14700; K.k2.cond = "exposed"; K.events.push("덮은 누수 재발"); S.note = "💧 아래층에서 전화 — 천장으로 또 물이 샌다. 배상 45만원 + 결국 제대로 재수리 380만원. 이제 누수는 모두가 안다."; }
  if(K.k2.cond === "min" && S.weeks === 7 && !K.k2.recurred){ K.k2.recurred = true; K.cost.repair += 45; S.note = "💧 아래층 천장에 작은 얼룩 — 배상 45만원."; }
  if(S.weeks > 6) S.trueP = Math.round(S.trueP * 0.996);
  const over = (S.list - S.trueP) / S.trueP, dump = S.weeks <= 3 && S.list > 16200;
  let p = Math.max(0.05, Math.min(0.9, 0.5 - over * 5 + (K.k2.cond === "fix" ? 0.05 : 0))); if(dump) p *= 0.35;
  if(K.r() < p){ const b = K_BUYERS[Math.floor(K.r() * K_BUYERS.length)]; S.offer = {amt:Math.min(S.list, Math.round(S.trueP * (1 - b.flex - K.r()*0.01) / 10) * 10), buyer:b}; }
  else S.offer = null;
}
function k2Answer(kind){
  const S = K.sale, of = S.offer;
  if(kind === "exit") return k2Exit();
  if(kind === "lower"){ S.list = Math.round((S.list - 300) / 10) * 10; S.offer = null; k2Week(); S.note = (S.note ? S.note + " " : "") + `호가를 ${kMan(S.list)}으로 내렸다.`; return; }
  if(kind === "wait" || !of){ S.offer = null; return k2Week(); }
  if(kind === "counter"){ const mid = Math.round((of.amt + S.list) / 2 / 10) * 10; if(K.r() < 0.45 - of.buyer.flex * 8) return k2Close(mid, of.buyer, false); S.offer = null; k2Week(); S.note = (S.note ? S.note + " " : "") + `${kMan(mid)} 역제안은 거절당했다.`; return; }
  if(kind === "check"){ kDay(7); return k2Close(of.amt, of.buyer, true); }
  if(kind === "accept") return k2Close(of.amt, of.buyer, false);
}
function k2Close(amt, buyer, checked){
  const S = K.sale, cancel = checked ? buyer.cancel * 0.5 : Math.min(0.7, buyer.cancel * 1.8);
  if(K.r() < cancel){ K.events.push("계약 파기"); kAch("cancelled"); S.offer = null; k2Week(); S.note = `😱 ${buyer.t} 매수자 — "대출이 생각보다 안 나와서요…" 계약이 깨졌다.${K.found.loan ? "" : " (이 라인은 매수자 대출이 원래 적게 나온다)"}` + (S.note ? " " + S.note : ""); return; }
  S.done = true; S.price = amt; S.buyer = buyer; K.cost.broker += Math.min(90, Math.round(amt * 0.005));
  if(K.k2.cond === "hide" && K.r() < 0.7){ K.k2.claim = true; K.cost.legal += 900; K.events.push("하자담보 청구"); }
  kFinish();
}
/* ---------- 결과 ---------- */
function k2Refs(){
  const b = K.bid || 14200, a = Math.round(b * 0.017), hold = d => Math.round(KP2.dailyHold * d);
  return {ideal: 15800 - b - a - 520 - hold(59) - 79 - 50, early: K2_EXIT.cross - b - a - hold(10) - 30, worst: 14300 - b - a - 120 - 425 - 900 - hold(180) - 72};
}
function k2Outcome(profit){
  const exit = !!K.k2.exit;
  if(K.k2.claim) return ["C", "덮으면 터진다", "숨긴 하자는 팔고 나서도 따라옵니다."];
  if(K.k2.forfeited) return profit >= k2Refs().early ? ["B","보증금을 버린 사람","보증금을 버리는 게 나을 때도 있다 — 다만 대개는 그 전에 멈췄어야 한다."] : ["C", "보증금을 버린 사람", "잔금을 포기하면 보증금은 돌아오지 않습니다."];
  if(exit) return profit >= -400 ? ["A", "살아서 돌아온 자", "수익을 못 내는 것과 큰돈을 잃는 것은 다른 문제다."] : profit >= -1000 ? ["B", "한 발 늦게 멈춘 사람", "멈춘 건 잘했다 — 다음엔 한 걸음 먼저."] : ["C", "너무 늦게 멈춘 사람", "손절도 타이밍이다."];
  if(K.k2.cond === "hide" || K.k2.cond === "exposed") return profit >= -900 ? ["B", "운이 좋았던 사람", "이번엔 안 터졌다. 다음에도 그럴까?"] : ["C", "덮으면 터진다", "숨긴 하자는 결국 비용으로 돌아온다."];
  if(profit >= 200) return ["S", "끝까지 판을 읽은 자", "정보를 끝까지 파고들고, 고칠 건 제대로 고쳤다."];
  if(profit >= -400) return ["A", exit ? "살아서 돌아온 자" : "손해 없이 빠져나온 자", "수익을 못 내는 것과 큰돈을 잃는 것은 다른 문제다."];
  if(profit >= -900) return ["B", "비싸게 배운 사람", "멈출 수 있던 순간이 두 번은 있었다."];
  if(profit >= -1300) return ["C", "버티다 다친 사람", "버티는 것도 비용이다 — 매주 이자는 나간다."];
  return ["F", "끝까지 버틴 자", "'언젠가 팔리겠지'는 전략이 아니다."];
}
function k2Finish(){
  K.step = "result";
  const c = K.cost, total = c.bid + c.acq + c.move + c.repair + c.hold + c.fee + c.broker + c.legal, profit = K.sale.price - total;
  const found = k2Found(), hid = KP2.hidden.length, g = (v, a, b2, cc) => v >= a ? "S" : v >= b2 ? "A" : v >= cc ? "B" : "C";
  const grades = {
    bid: K.k2.forfeited ? "C" : g(-(K.bid - 13800), 0, -500, -1000),
    move: K.moveDays ? g(-K.moveDays, -14, -20, -30) : "B",
    repair: K.k2.claim || K.k2.cond === "exposed" ? "C" : K.k2.cond === "fix" ? (K.k2.leakEarly || K.found.leak ? "S" : "A") : K.k2.cond === "min" ? "A" : "B",
    sell: K.k2.exit || K.k2.forfeited ? "B" : g(K.sale.price - (K.sale.trueP || 15000), 0, -300, -700)};
  const tips = [];
  if(!K.found.leak) tips.push("아래층에 한 번만 물어봤다면, 누수 수리비를 입찰가에서 미리 뺐을 거예요.");
  if(!K.found.price) tips.push("박 중개사를 만났다면 '1억 7천'이 이 라인의 현실가가 아니라는 걸 입찰 전에 알았어요.");
  if(!K.found.dump) tips.push("같은 건물 매물을 한 번만 검색했어도, 1억 6,200 급매가 첫 경쟁자라는 걸 알았어요.");
  if(!K.found.loan) tips.push("은행에 한 번 물었다면 매수자 대출이 적게 나와 계약이 깨질 수 있다는 걸 미리 알았어요.");
  if(K.bid > 14300) tips.push("조사한 대로라면 이 물건은 1억 4천 초반을 넘기면 남기기 어려운 물건이었어요 — 패찰이 정답이었을 수도 있어요.");
  if(K.k2.cond === "hide") tips.push("누수를 덮고 팔면 팔고 나서도 책임이 따라옵니다(하자담보책임). 고지하고 싸게 파는 쪽이 결국 쌉니다.");
  const [og, otitle, oquote] = k2Outcome(profit);
  const style = K.k2.exit ? ["냉정한 손절가", "숫자가 틀어지면 미련 없이 멈추는 타입"] : K.k2.forfeited ? ["보증금 버린 도망자", "잔금 앞에서 멈춘 타입 — 멈춘 건 맞지만 조금 늦었다"] : K.k2.cond === "hide" ? ["덮고 가는 도박사", "문제를 가리고 운에 맡기는 타입"] : K.sale.weeks >= 10 ? ["존버형", "'언젠가 팔린다'를 믿는 타입"] : K.k2.cond === "fix" ? ["끝까지 판을 읽는 해결사", "문제를 찾으면 제대로 고쳐서 제값을 받는 타입"] : ["정직한 급매꾼", "하자는 알리고 빨리 정리하는 타입"];
  K.final = {total, profit, rate: profit / total * 100, found, hid, grades, tips, style, lesson: oquote, k2:{og, otitle, oquote, refs:k2Refs()}};
  const R = kRec(); R.plays++; if(!R.best || profit > R.best.profit) R.best = {profit:Math.round(profit), seed:K.seed};
  R.dex.p_coop = Math.max(R.dex.p_coop || 0, found >= 3 ? 3 : found >= 1 ? 2 : 1);
  if(found === hid) kAch("detective"); if(K.k2.exit && profit >= -400) kAch("stoploss"); if(K.k2.cond === "min") kAch("honest"); if(K.k2.claim) kAch("hidebad"); if(profit > 3000) kAch("big");
  if(typeof save === "function") save();
}
Object.assign(K_ACH, {stoploss:["🛡️","살아서 돌아온 자","손실 400만원 이내로 즉시 정리"], walkaway:["🚶","안 사는 것도 판단","조사 끝에 패찰 — 낙찰자는 비싸게 썼다"], honest:["🧾","정직한 매도","누수를 고지하고 팔았다"], hidebad:["🙈","덮으면 터진다","숨긴 하자로 배상 청구를 받았다"]});
(typeof HUB_EVENTS !== "undefined") && HUB_EVENTS.push({id:"k2:leak", t:"💧 벽 뒤 누수", where:"수리"}, {id:"k2:dump", t:"🏷️ 같은 건물 급매", where:"매도"}, {id:"k2:claim", t:"🙈 하자담보 청구", where:"매도"}, {id:"k2:exit", t:"🏃 업자 현황 매입 정리", where:"매도"});

/* ---------- 화면 ---------- */
function k2SaysHTML(){
  if(!K.says.length) return "";
  return `<details class="panel k2-says"><summary>🗣️ 들은 말 (${K.says.length}) — 누구 말이 맞을까?</summary><ul>${K.says.map(s=>`<li><b>${esc(s.who)}</b> “${esc(s.t)}”</li>`).join("")}</ul></details>`;
}
function k2ExitBtn(label){ const v = k2ExitValue(); return `<button type="button" class="ag-act k2-exit" data-k2="exit"><span class="ag-ai">🏃</span><span><b>${label || "손실 감수하고 즉시 정리"} — 업자 현황 매입 ${kMan(v)}</b><span class="note" style="display:block">지금 넘기면 예상 손익 ${kcSigned(Math.round(v - k2Spent() - 30 - KP2.dailyHold*3))} · 더 이상의 위험은 끝</span></span></button>`; }
function k2Spent(){ const c = K.cost; return c.bid + c.acq + c.move + c.repair + c.hold + c.fee + c.broker + c.legal; }
function k2HTML(){
  const quit = `<div style="margin-top:12px"><button type="button" class="btn" data-kquit>그만두기</button></div>`;
  if(K.step === "cross"){
    const dep = K2_DEPOSIT(), knew = [K.found.leak && "💧 아래층이 말한 누수", K.found.price && "📝 박 중개사의 1.5 후반", K.found.loan && "🏦 얇은 매수자 대출"].filter(Boolean);
    return kStage("bg_realtor", "narr", null, `매각허가결정이 났다. 잔금 기한까지 한 달. 그런데 오늘 아침 — 같은 건물 3층이 1억 6,200만원 급매로 올라왔다.`) + kHud() + `
     <div class="panel k2-cross"><h3>⚖️ 갈림길 — 잔금을 낼까?</h3>${typeof gmwSceneArt==="function" ? gmwSceneArt("k2cross") : ""}<p class="note">낙찰가 ${kMan(K.bid)} · 보증금 ${kMan(dep)}은 이미 법원에 들어가 있다.</p>
      ${knew.length ? `<p>🔍 알고 있는 것: ${knew.join(" · ")}</p>` : `<p class="note">조사를 많이 못 했다. 이 급매가 무슨 뜻인지 아직 모른다.</p>`}</div>
     ${k2SaysHTML()}
     <div class="ag-acts vn-acts">
      <button type="button" class="ag-act" data-k2="cross:go"><span class="ag-ai">💳</span><span><b>잔금을 낸다 — 계속 간다</b><span class="note" style="display:block">명도·수리·매도까지 끝까지 간다</span></span></button>
      <button type="button" class="ag-act" data-k2="cross:exit"><span class="ag-ai">🏃</span><span><b>잔금 내고 바로 업자에게 넘긴다 — ${kMan(K2_EXIT.cross)}</b><span class="note" style="display:block">예상 손익 ${kcSigned(Math.round(K2_EXIT.cross - K.bid - K.cost.acq - KP2.dailyHold*10 - 30))} · 손실 확정, 위험 끝</span></span></button>
      <button type="button" class="ag-act ag-bad" data-k2="cross:forfeit"><span class="ag-ai">🚪</span><span><b>잔금을 포기한다</b><span class="note" style="display:block">보증금 ${kMan(dep)}은 돌려받지 못한다</span></span></button></div>` + quit;
  }
  if(K.step === "move"){
    const o = K.occ, sc = K.scene || {who:"occ", ex:"normal", t:"…"};
    const acts = K.k2.asking ? `<div class="ag-acts vn-acts"><div class="ag-act ag-offer"><span class="ag-ai">💰</span><div><b>이사비</b><div class="ag-amts">${[0,50,100].map(v=>`<button type="button" class="chip" data-k2="offer:${v}">${v?kMan(v):"0원"}</button>`).join("")}</div></div></div></div>`
      : `<div class="ag-acts vn-acts">${!o.agreed?`<button type="button" class="ag-act" data-k2="move:paper"><span><b>📄 명도확인서 얘기부터 한다</b><span class="note" style="display:block">나가시면 바로 드린다고</span></span></button>`:""}
        <button type="button" class="ag-act" data-k2="move:ask"><span><b>🗣️ 집에 문제 있던 곳이 없었는지 묻는다</b></span></button>
        ${!K.k2.leakEarly?`<button type="button" class="ag-act" data-k2="move:look"><span><b>🔦 집 안을 같이 둘러본다</b><span class="note" style="display:block">1일</span></span></button>`:""}
        ${o.agreed?`<button type="button" class="ag-act" data-k2="move:wait"><span><b>⏳ 이삿날까지 기다린다</b><span class="note" style="display:block">${o.agreed.day}일째 · 이사비 ${kMan(o.agreed.amt)}</span></span></button>`:""}</div>`;
    return kStage("bg_front_door", sc.who, sc.ex, sc.t) + kHud() + `<div class="panel k-occ"><b>🙂 ${esc(KP2.occ.name)}</b> <small>협조도</small><span class="k-meter"><i style="width:${o.coop}%"></i></span><b>${Math.round(o.coop)}</b><span class="note"> · 이번 명도는 어렵지 않다. 진짜 문제는 이 집 자체일지도.</span></div>` + acts + k2SaysHTML() + quit;
  }
  if(K.step === "defect"){
    const early = K.k2.leakEarly || K.found.leak;
    return kStage("bg_room_messy", "narr", null, "빈집. 안방 벽지를 뜯었다. …벽 뒤로 물길 자국이 번져 있다.") + kHud() + `
     <div class="panel k-card"><h3>🧱 벽 뒤 누수</h3><p>인테리어 박실장: <b>“열어 봐야 알아요. 배관이면 400~600, 방수까지 가면 더 나올 수도 있고요.”</b></p>
      ${early ? `<p class="note">🔍 미리 알고 있었다 — 견적을 두 곳에서 받아 둘 시간이 있었다(제대로 수리 520만원).</p>` : `<p class="note">😱 몰랐다 — 급하게 한 곳 견적만 받았다(제대로 수리 620만원).</p>`}
      <p class="note">⚖️ 알고도 숨기고 팔면, 팔고 나서도 매수자에게 책임을 질 수 있다(하자담보책임).</p></div>
     <h3 class="vn-q">어떻게 할까?</h3><div class="ag-acts vn-acts">${K2_FIX.map(f=>`<button type="button" class="ag-act${f.bad?" ag-bad":""}" data-k2="fix:${f.id}"><span class="ag-ai">${f.ic}</span><span><b>${f.t} — ${kMan(f.cost())}</b><span class="note" style="display:block">${f.d}</span></span></button>`).join("")}${k2ExitBtn()}</div>` + k2SaysHTML() + quit;
  }
  if(K.step === "list"){
    return kStage(K.k2.cond === "fix" ? "bg_room_clean" : "bg_room_messy", "narr", null, "이제 얼마에 내놓을까. 김사장과 박 중개사의 말이 다르다.") + kHud() + `
     <div class="panel k-card"><div class="k-grid"><span>김사장</span><b>"1억 7천 무조건 됩니다"</b><span>박 중개사</span><b>${K.found.price?`"1억 5천 후반이 현실적"`:"(만나 보지 못함)"}</b><span>같은 건물 급매</span><b>${K.found.dump?"3층 1억 6,200만원 — 아직 안 팔림":"??"}</b>${K.k2.cond==="min"?`<span>고지</span><b>누수 수리 이력 고지 → 가격 할인</b>`:""}</div></div>
     <h3 class="vn-q">호가를 정하세요</h3><div class="ag-acts vn-acts">${K2_LIST.map(([v,t])=>`<button type="button" class="ag-act" data-k2="list:${v}"><span><b>${kMan(v)}</b><span class="note" style="display:block">${t}</span></span></button>`).join("")}</div>` + k2SaysHTML() + quit;
  }
  if(K.step === "sell"){
    const S = K.sale, of = S.offer;
    const line = of ? `${S.weeks}주차. 중개사 전화: "${of.buyer.t} 손님이요, ${kMan(of.amt)}이면 계약한대요."` : `${S.weeks}주차. 집 보러 온 사람은 있었는데, 연락이 없다.${S.weeks <= 3 && S.list > 16200 ? " 다들 3층 급매부터 보고 간다." : ""}`;
    return kStage("bg_realtor", "narr", null, line) + kHud() + `
     <div class="panel k-card"><div class="k-grid"><span>현재 호가</span><b>${kMan(S.list)}</b><span>보유 비용</span><b>매주 약 ${kMan(KP2.dailyHold * 7)}</b>${S.weeks<=3?`<span>경쟁</span><b>같은 건물 3층 1억 6,200 급매</b>`:""}</div>${S.note?`<div class="note" style="margin-top:6px">${esc(S.note)}</div>`:""}${typeof gmwSceneArt!=="function" ? "" : /또 물이 샌다/.test(S.note||"") ? gmwSceneArt("k2recur") : /급매가 .*팔렸다/.test(S.note||"") ? gmwSceneArt("k2rival") : ""}</div>
     <div class="ag-acts vn-acts">${of ? `<button type="button" class="ag-act" data-k2="sell:accept"><span><b>✅ ${kMan(of.amt)} 수락</b>${K.found.loan?"":`<span class="note" style="display:block">⚠️ 대출 파기 위험 모름</span>`}</span></button>
       ${K.found.loan?`<button type="button" class="ag-act" data-k2="sell:check"><span><b>🏦 대출 사전승인 확인 후 계약</b><span class="note" style="display:block">1주 걸리지만 파기 위험이 크게 준다</span></span></button>`:""}
       <button type="button" class="ag-act" data-k2="sell:counter"><span><b>↔️ 중간(${kMan(Math.round((of.amt+S.list)/2/10)*10)}) 역제안</b></span></button>
       <button type="button" class="ag-act" data-k2="sell:wait"><span><b>⏳ 거절하고 기다린다</b></span></button>`
       : `<button type="button" class="ag-act" data-k2="sell:wait"><span><b>⏳ 한 주 더 기다린다</b></span></button><button type="button" class="ag-act" data-k2="sell:lower"><span><b>📉 호가 300만원 내린다</b></span></button>`}
       ${S.weeks >= 3 ? k2ExitBtn("버티지 않고 정리") : ""}</div>` + k2SaysHTML() + quit;
  }
  return null;
}
function k2ResultTop(){
  const F = K.final, X = F.k2, R = X.refs, me = Math.round(F.profit);
  const rows = [["🔧 제대로 고쳐 끝까지 갔다면", R.ideal], ["🏃 낙찰 직후 바로 정리했다면", R.early], ["🙈 덮고 버티다 터졌다면", R.worst]];
  const saved = me - R.worst;
  return `<div class="panel k2-verdict g${X.og}">${typeof gmwSceneArt!=="function" ? "" : K.k2.claim ? gmwSceneArt("k2claim") : K.k2.forfeited ? gmwSceneArt("k2forfeit") : K.k2.exit ? gmwSceneArt("k2exit") : K.k2.cond === "fix" ? gmwSceneArt("k2fixed") : !(K.sale && K.sale.done && K.sale.price > 0) ? "" : K.k2.cond === "min" ? gmwSceneArt("k2honest") : gmwSceneArt("k2deal")}<div class="k2-v-top"><span class="k-g g${X.og==="F"?"C":X.og}">${X.og}</span><div><small>이번 판의 판단</small><b>${esc(X.otitle)}</b><p>“${esc(X.oquote)}”</p></div></div>
    ${F.profit < 0 && X.og <= "B" && !K.k2.claim ? `<p class="k2-shield">🛡️ ${K.k2.exit ? "방어 성공 — 돈을 잃었지만, 더 큰 손실을 막았습니다." : "손실은 났지만, 최악보다는 멀리 있었습니다."}</p>` : ""}
    <table class="k2-if"><tbody>${rows.map(([t,v])=>`<tr><td>${t}</td><td class="${v>=0?"up":"down"}">≈ ${kcSigned(Math.round(v))}</td></tr>`).join("")}<tr class="me"><td>👉 당신</td><td class="${me>=0?"up":"down"}">${kcSigned(me)}</td></tr></tbody></table>
    <small class="note">같은 낙찰가(${kMan(K.bid)}) 기준 대략값이에요. 최악의 길보다 <b>${kcSigned(saved)}</b> 지켰습니다.</small></div>`;
}
const _k2_kingHTML = kingHTML; kingHTML = function(){
  if(K && KP.id === "k2" && !K.intro && !K.revealing && !K.sealed){
    const own = k2HTML(); if(own) return `<div class="kc-topbar">${kcSfxBtn()}</div>` + own;
  }
  let h = _k2_kingHTML();
  if(K && KP.id === "k2"){
    if(K.step === "won") h = h.replace('data-kgo="move"', 'data-k2="go:cross"').replace("🔑 잔금 내고 점유자 만나러 가기 →", "⚖️ 매각허가결정 기다리기 →");
    if(K.step === "lost" && k2Found() >= 2 && K.result.other.amt > 14300){
      kAch("walkaway");
      h = h.replace('<p class="k-lesson">', `<div class="panel k2-walk">🛡️ <b>안 산 것도 판단입니다.</b> 낙찰자는 ${kMan(K.result.other.amt)}을 썼어요. 당신이 조사한 대로라면, 그 가격이면 남기기 어렵습니다.</div><p class="k-lesson">`);
    }
    if(K.step === "result" && K.final && K.final.k2){
      h = h.replace(/(<div class="panel kc-cash|<div class="panel kc-dual">)/, m => k2ResultTop() + m);
      if(K.k2.exit || K.k2.forfeited) h = h.replace(/data-full="[^"]*한 판이 끝났다\.?"/, `data-full="${K.k2.forfeited ? "잔금을 내지 않았다. 보증금은 돌아오지 않는다. …그래도 판은 여기서 끝났다." : "업자에게 현황 그대로 넘겼다. 아쉽지만 — 더 잃을 일은 없다."}"`);
    }
  }
  return h;
};
// 커리어·판단 등급을 2번 물건 기준으로 덮어쓴다(원래 계산이 다 끝난 뒤)
const _k2_kFinish = kFinish; kFinish = function(){
  _k2_kFinish();
  if(!K || KP.id !== "k2" || !K.final || !K.final.k2) return;
  const F = K.final, X = F.k2, R = X.refs;
  F.biz = X.og; F.verdict = X.oquote;
  const span = Math.max(1, R.ideal - R.worst), dq = Math.max(0, Math.min(1, (F.profit - R.worst) / span));
  const sc = Math.round((F.found / F.hid) * 40 + dq * 40 + (K.k2.cond === "hide" ? 0 : 20));
  F.judge = {g: sc >= 85 ? "S" : sc >= 70 ? "A" : sc >= 55 ? "B" : sc >= 40 ? "C" : "F", score:sc, notes:[`숨은 위험 ${F.found}/${F.hid} 발견`, K.k2.exit ? "멈출 때 멈췄다" : K.k2.cond === "fix" ? "고칠 건 제대로 고쳤다" : K.k2.cond === "hide" ? "하자를 숨겼다" : "정직하게 급매", `최악 대비 ${kcSigned(Math.round(F.profit - R.worst))}`]};
  const h = kcRec().history[0]; if(h && h.seed === K.seed){ h.biz = F.biz; h.judge = F.judge.g; }
  if(K.k2.exit) hubSee("k2:exit"); if(K.k2.claim) hubSee("k2:claim");
  if(typeof save === "function") save();
};
// 결과 화면 연출(가장 잘한 판단·실수, 만난 사람들) — 2번 물건 버전
const _k2_bw = keBestWorst; keBestWorst = function(){
  if(KP.id !== "k2") return _k2_bw();
  const best = [], worst = [];
  if(K.found.leak) best.push("입찰 전에 아래층에 물어봤다"); if(K.k2.leakEarly) best.push("짐 빼는 날 집 안을 같이 봤다"); if(K.k2.exit && F2() >= -400) best.push("손실이 커지기 전에 멈췄다"); if(K.k2.cond === "min") best.push("누수를 고지하고 정직하게 팔았다"); if(K.k2.loanChecked) best.push("대출 사전승인을 확인했다");
  if(K.k2.claim) worst.push(["누수를 덮고 팔았다", 900]); if(K.k2.cond === "exposed") worst.push(["덮은 누수가 재발했다", 425]); if(!K.found.leak && !K.k2.leakEarly) worst.push(["누수를 끝까지 몰랐다", 100]); if(K.bid > 14300) worst.push(["겉 마진만 보고 높게 썼다", K.bid - 14300]); if(K.sale && K.sale.weeks >= 8) worst.push([`${K.sale.weeks}주를 버텼다 — 보유비용`, Math.round(KP2.dailyHold * 7 * (K.sale.weeks - 3))]); if(K.k2.forfeited) worst.push(["잔금 앞에서 보증금을 버렸다", K2_DEPOSIT()]);
  worst.sort((a,b)=>b[1]-a[1]);
  return `<div class="panel ke-bw"><div><small>🌟 가장 잘한 판단</small><b>${esc(best[0] || "끝까지 판을 마쳤다")}</b></div><div><small>💸 가장 비싼 실수</small><b>${worst[0] ? `${esc(worst[0][0])} <em>-${kMan(worst[0][1])}</em>` : "눈에 띄는 실수 없음"}</b></div></div>`;
};
function F2(){ return K.final ? K.final.profit : 0; }
const _k2_cred = keCredits; keCredits = function(){
  if(KP.id !== "k2") return _k2_cred();
  const truth = [["김사장", "“1억 7천은 무조건 됩니다”", false], ["박 중개사", "“1억 5천 후반이 현실적”", true], ["아래층 아주머니", "“작년에도 물 샜어요”", true], ["정은주 씨", "“누수요? 처음 듣는데요”", false]];
  const heard = s => K.says.some(x => x.who === s);
  const rows = truth.filter(t => heard(t[0]));
  return `<div class="panel ke-credits"><b>🗣️ 이번 사건에서 들은 말 — 진짜였을까?</b>${rows.length ? `<ul>${rows.map(([w,t,ok])=>`<li><span>${esc(w)} ${esc(t)}</span><small></small><b>${ok?"✅":"❌"}</b></li>`).join("")}</ul><p class="note" style="color:#c9d2e6">사실이었던 진술 ${rows.filter(r=>r[2]).length} / ${rows.length}</p>` : `<p class="note" style="color:#c9d2e6">이번엔 거의 아무 말도 듣지 않고 판을 끝냈다.</p>`}
    <p class="ke-epi">${K.k2.exit ? "며칠 뒤, 같은 건물 3층 급매가 팔렸다는 소식을 들었다. …그 사람도 쉽지 않았을 것이다." : K.k2.claim ? "석 달 뒤, 모르는 번호로 전화가 왔다. 새 집주인이었다." : "정은주 씨에게서 짧은 문자가 왔다. “그동안 감사했습니다. 좋은 분이 사시면 좋겠네요.”"}</p></div>`;
};
// 음악: 갈림길은 법원 곡
const _k2_scene = kaScene; kaScene = function(){ if(typeof page !== "undefined" && page === "arena" && arenaTab === "king" && K && K.step === "cross" && !K.revealing) return "court"; return _k2_scene(); };

/* ---------- 클릭 ---------- */
document.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena" || arenaTab !== "king" || !K || KP.id !== "k2") return;
  const b = e.target.closest("[data-k2]"); if(!b) return;
  const [kind, arg] = b.dataset.k2.split(":");
  if(kind === "go"){ K.step = "cross"; }
  if(kind === "cross") k2Cross(arg);
  if(kind === "move") k2Move(arg);
  if(kind === "offer"){ k2Offer(+arg); kcSfx("coin"); }
  if((kind === "move" || kind === "offer") && K.scene && K.scene.who === "occ") K._silence = 800;
  if(kind === "fix") k2Fix(arg);
  if(kind === "exit") k2Exit();
  if(kind === "list") k2List(+arg);
  if(kind === "sell"){ if(arg === "check") K.k2.loanChecked = true; k2Answer(arg); }
  renderArena(); if(["go","cross","fix","list"].includes(kind)) window.scrollTo(0,0);
});
