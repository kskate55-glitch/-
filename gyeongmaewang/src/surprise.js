/* ================= 🎲 예상 깨기 — 같은 버튼, 사건마다 다르게 굴러간다 (v217) =================
   지루함의 원인: "조사 전부 → 적당히 입찰 → 사정 듣기 → 지원 → 날짜 → 일부 수리 → 적정 호가"가 모든 사건에서 먹혔다.
   두 번째 사건부터는 정답을 아는 시험지를 다시 푸는 셈이었다. 개그 대사가 아니라 '상황' 자체가 예상을 깬다.
   ① 믿었던 출처가 이번엔 헛방이다 — 관리실·중개사·옆집이 "잘 모르겠는데요"(빈손)거나, 친절한데 옛날 얘기(시점 불명).
      → 다른 사람에게 한 번 더 확인하는 행동이 열린다. 배우는 것: 정보는 '누가·언제 기준으로' 말했는지가 중요하다.
   ② 사정 듣기가 안 통하는 사람이 있다 — "무슨 사정을 들어요. 법대로 하세요." 문이 닫힌다.
      인도명령을 넣으면 일주일쯤 뒤 먼저 전화가 온다: "나갈 생각은 있는데 이사 갈 집 계약금이 없어요."
      → 이사비 일부 선지급 + 퇴거일 확정 + 합의서라는 새 길이 열린다.
   ③ 개찰의 희비극 — 몇십만 원 차이 2등이면 옆자리 아저씨가 "아깝네요." [말 걸지 마세요]
   ⚠️ 게임 난수(K.r) 순서는 건드리지 않는다. 어느 출처가 헛방인지, 누가 문을 닫는지는 사건 시드로 정한 별도 난수다.
   첫 사건(★1)은 흔들지 않는다 — 기본을 배우는 판이라서. */
const SP_ON = true;
function spRng(salt){ return kRng((((K && K.seed) || 1) * 2246822519 ^ salt) >>> 0); }
/* ---------- ① 흔들리는 출처 ---------- */
const SP_SRC = [
  {re:/관리/, alt:["경비실 아저씨","같은 층 이웃","통장님"], loc:"site", who:"관리실(전화)", blank:"거기요? …잘 모르겠는데요.  (뚝)", stale:"아~ 그 집! 관리비 한 번도 안 밀렸죠. …어, 잠깐. 그건 전 주인 때 얘긴가?"},
  {re:/중개/, alt:["길 건너 다른 중개사","역 앞 중개사"], loc:"any", who:"동네 중개사", blank:"아~ 경매 물건요? 저흰 그런 건 잘 안 봐서요~ 호호.", stale:"그 동네요? 제가 거기 거래한 게… 한 3년 전인데, 그땐 괜찮았어요."},
  {re:/옆집|탐문|이웃|주민/, alt:["1층 슈퍼 사장님","건너편 세탁소 사장님","통장님"], loc:"site", who:"옆집(인터폰)", blank:"…누구세요? 안 사요.  (인터폰이 꺼진다)", stale:"그 집? 조용한 노부부 살잖아요. …네? 이사 간 지 2년 됐다고요?"},
  {re:/은행/, alt:["다른 은행 대출창구","대출상담사"], loc:"any", who:"은행 대출상담", blank:"담당자가 오늘 휴가라서요… 다음 주에 다시 전화 주시겠어요?", stale:"작년 기준으로는 대출 잘 나왔어요. 요즘 기준은… 한번 알아봐야겠네요."}];
function spSrcOf(a){ return SP_SRC.find(s => s.re.test(a.t || "")); }
function spPick(){
  if(!K || !KP || !KP.gen || !Array.isArray(KP.actions)) return;
  KP.actions = KP.actions.filter(a => !a.spx);                         // 지난 판에 붙였던 '다시 확인' 행동은 걷어 낸다(KP는 물건 원본이라 판마다 새로)
  K.spFlaky = {};
  if(!SP_ON || (KP.stars || 1) < 2) return;
  const cand = KP.actions.filter(a => a.loc !== "home" && spSrcOf(a) && (a.out || []).some(o => o.reveal));
  if(!cand.length) return;
  const r = spRng(0x5EED), n = Math.min(cand.length, (KP.stars || 1) >= 4 && r() < 0.5 ? 2 : 1);
  const pool = cand.slice(); for(let i = pool.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  pool.slice(0, n).forEach((a, k) => {
    const mode = r() < 0.5 ? "blank" : "stale", src = spSrcOf(a), alt = src.alt[Math.floor(r() * src.alt.length)];
    K.spFlaky[a.id] = {mode, alt};
    const reveals = [].concat(...(a.out || []).filter(o => o.reveal).map(o => [].concat(o.reveal)));
    const orig = (a.out || []).find(o => o.say), says = orig ? [].concat(orig.say.length && typeof orig.say[0] === "string" ? [orig.say] : orig.say) : [];
    KP.actions.push({spx:true, id:a.id + "_spx", ic:"🔁", t:`다른 사람에게 다시 확인 — ${alt}`, loc:src.loc, dur:[25, 45], rel:5, iv:a.iv || 3, pre:[a.id],
      d:`${src.who.replace(/\(.*\)/, "")} 말만 믿지 않기 — 같은 걸 다른 사람에게 한 번 더`,
      out:[{p:1, skill:false, reveal:reveals.length ? reveals : null, say:says.length ? says.map(([w, t]) => [alt, t]) : [[alt, "아, 그 집요? 요즘 사정은 이렇대요."]], text:"한 사람 말만 믿지 않고 다시 물었다."}]});
  });
}
if(typeof kStart === "function"){ const _sp_kStart = kStart; kStart = function(){ const o = _sp_kStart.apply(this, arguments); try{ spPick(); }catch(e){} return o; }; }
if(typeof kResearch === "function"){
  const _sp_kRes = kResearch;
  kResearch = function(id){
    const F = K && K.spFlaky && K.spFlaky[id], a = F && (KP.actions || []).find(x => x.id === id);
    if(!F || !a || K.done[id]) return _sp_kRes.apply(this, arguments);
    // 원래 조사를 그대로 돌린다(게임 난수 K.r 순서를 바꾸지 않으려고) — 그다음 이번에 알게 된 것만 되돌린다
    const f0 = Object.assign({}, K.found), s0 = K.says.length, h0 = Object.assign({}, K.hint || {}), c0 = K.occ && K.occ.coop, l0 = K.log.length, d0 = K.occ && K.occ.daughter;
    _sp_kRes.apply(this, arguments);
    if(!K.done[id]) return;                                            // 시간이 모자라 못 했다
    const src = spSrcOf(a);
    K.found = f0; K.says.length = s0; K.hint = h0; if(K.occ){ K.occ.coop = c0; K.occ.daughter = d0; }
    K.says.push({who:src.who, t:F.mode === "blank" ? src.blank : "⚠️(기준 시점 불명) " + src.stale, id:null});
    const last = K.rlog && K.rlog[K.rlog.length - 1]; if(last && last.id === id) last.useful = false;
    if(K.log.length > l0){ const head = (K.log[l0].match(/^\S+ \[[^\]]*\]/) || [a.ic])[0]; K.log.length = l0; kLog(`${head} ${src.who}: “${F.mode === "blank" ? src.blank : src.stale}”`); }
    kLog(F.mode === "blank" ? `🤷 헛방 — 이번엔 ${src.who.replace(/\(.*\)/, "")} 쪽이 아무것도 몰랐다. 다른 사람에게 물어봐야겠다.` : `🤔 언제 적 얘기지? 기준 시점이 불분명한 말은 그대로 믿으면 안 된다 — 다른 사람에게도 확인해 보자.`);
  };
}
/* ---------- ② 문을 닫는 점유자 ---------- */
const SP_SLAM_TYPES = {bully:0.7, fake:0.8, lien:0.7, greedy:0.5, angry:0.4};
function spSlamInit(){
  if(!K || !KP || !KP.gen || !K.occ || K.occ.spInit) return;
  K.occ.spInit = true;
  const P = typeof personaById === "function" ? personaById(KP.occ && KP.occ.pid) : null, pr = P && SP_SLAM_TYPES[P.type];
  if(pr && (KP.stars || 1) >= 2 && spRng(0xD00B)() < pr) K.occ.slam = true;
}
if(typeof K_MOVES !== "undefined" && !K_MOVES.some(m => m.id === "sp_bridge"))
  K_MOVES.push({id:"sp_bridge", s:"money", t:"💵 계약금 일부 선지급 + 퇴거일 확정 (합의서에 적는다)", day:2, need:o => !!o.spAsk && !o.spBridged});
if(typeof kMove === "function"){
  const _sp_kMove = kMove;
  kMove = function(id){
    if(!K || K.step !== "move" || !KP || !KP.gen) return _sp_kMove.apply(this, arguments);
    spSlamInit(); const o = K.occ;
    if(id === "sp_bridge"){
      if(!o.spAsk || o.spBridged) return;
      const amt = Math.max(50, Math.round((typeof kfOccNeed === "function" ? kfOccNeed() : 150) * 0.4 / 10) * 10);
      o.spBridged = true; o.turns++; K.cost.move += amt; o.coop += 18; o.resist -= 15; o.paper = true;
      kSay(`…진짜요? 그럼 이번 주에 계약하고, 적은 날짜에 나갈게요. 합의서에 다 쓰죠.`, "normal");
      kLog(`💵 계약금 일부 ${kMan(amt)} 선지급 — 합의서에 퇴거일과 '짐이 다 빠진 걸 확인한 뒤 나머지 지급'을 적었다.`);
      if(typeof kClampOcc === "function") kClampOcc(); if(typeof kfTick === "function") kfTick(2); else kTick(2); spCheckCall(); return;
    }
    if(id === "listen" && o.slam){
      const had = o.heard || 0, t0 = o.turns;
      _sp_kMove.apply(this, arguments);
      if(o.turns === t0) return;                                       // 이번 차례는 권리 다툼으로 쓰였다(듣기가 안 됐다)
      if(typeof MT_PENDING !== "undefined") MT_PENDING = null;          // 사연 대신 문이 닫힌다
      o.heard = had; o.coop = Math.round(o.coop - 20 - (o.pride || 0) * 6); o.resist = Math.round(o.resist + 8); o.spSlammed = (o.spSlammed || 0) + 1;
      kSay(o.spSlammed > 1 ? "또요? 말했잖아요. 법대로 하시라고요." : "무슨 사정을 들어요. 법대로 하세요.", "angry");
      kLog(o.spSlammed > 1 ? "🚪 또 문이 닫혔다." : "🚪 문이 닫혔다 — 이 사람에겐 사정 듣기가 안 통한다. 오히려 절차(인도명령)를 밟는 게 대화의 시작일 수 있다.");
      if(typeof kClampOcc === "function") kClampOcc(); return;
    }
    const r = _sp_kMove.apply(this, arguments);
    if(id === "order" && o.slam && o.order && !o.spCallAt) o.spCallAt = K.day + 7;
    try{ spCheckCall(); }catch(e){}
    return r;
  };
}
if(typeof kfOccNeed === "function"){ const _sp_need = kfOccNeed; kfOccNeed = function(){ const n = _sp_need.apply(this, arguments); return K && K.occ && K.occ.spBridged ? Math.round(n * 0.6 / 10) * 10 : n; }; }
function spCheckCall(){
  const o = K && K.occ; if(!o || !o.spCallAt || o.spCalled || K.step !== "move" || K.day < o.spCallAt) return;
  o.spCalled = true; o.spAsk = true; o.coop += 15; o.resist -= 12;
  kSay("…저기, 저도 나갈 생각은 있는데요. 이사 갈 집 계약금이 없습니다.", "worried");
  kLog("📞 인도명령을 넣고 일주일 — 먼저 전화가 왔다. 문제는 버티기가 아니라 계약금이었다.");
}
if(typeof kfTick === "function"){ const _sp_kfTick = kfTick; kfTick = function(){ const r = _sp_kfTick.apply(this, arguments); try{ spCheckCall(); }catch(e){} return r; }; }
if(typeof kTick === "function"){ const _sp_kTick = kTick; kTick = function(){ const r = _sp_kTick.apply(this, arguments); try{ spCheckCall(); }catch(e){} return r; }; }
/* ---------- ③ 개찰 희비극 ---------- */
function spGap(){
  const R = K && K.result; if(!R || !R.bids || R.bids.length < 2) return null;
  const me = R.bids.find(b => b.me); if(!me) return null;
  if(R.win){ const second = R.bids[1]; return second && !second.none ? {win:true, gap:me.amt - second.amt} : null; }
  return {win:false, gap:R.bids[0].amt - me.amt, rank:R.bids.indexOf(me) + 1};
}
function spCourtHTML(){
  const g = spGap(); if(!g) return "";
  if(!g.win && g.rank === 2 && g.gap <= 150){
    const said = K.spHush;
    return `<div class="panel sp-court"><p class="sp-line"><b>옆자리 아저씨</b> "…${kMan(g.gap)} 차이네. 아깝네요."</p>
      ${said ? `<p class="sp-line"><b>옆자리 아저씨</b> "…네." <small>(조용히 서류를 챙겨 나간다)</small></p>` : `<button type="button" class="btn sp-hush" data-sphush>🙅 말 걸지 마세요</button>`}
      <p class="note">💡 몇십만~몇백만 원 차이 2등은 경매에서 정말 흔하다. 끝자리를 '딱 떨어지지 않게'(예: 13,572만원) 쓰는 사람이 많은 이유다.</p></div>`;
  }
  if(g.win && g.gap <= 150) return `<div class="panel sp-court"><p class="sp-line">2등과 <b>${kMan(g.gap)}</b> 차이. 뒤에서 누군가 "아…" 하는 소리가 들렸다.</p><p class="note">💡 간발의 차 — 오늘은 끝자리가 이겼다.</p></div>`;
  return "";
}
if(typeof kingHTML === "function"){
  const _sp_kingHTML = kingHTML;
  kingHTML = function(){
    let h = _sp_kingHTML.apply(this, arguments);
    try{
      if(K && (K.step === "lost" || K.step === "won")){ const c = spCourtHTML(); if(c) h = h.replace(/(<div class="panel k-bidres (?:lose|win)">)/, c + "$1"); }
    }catch(e){}
    return h;
  };
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-sphush]"); if(!b || !K) return;
  e.preventDefault(); e.stopPropagation(); K.spHush = true; if(typeof kLog === "function") kLog("🙅 옆자리 아저씨에게 말 걸지 말라고 했다. 아저씨는 조용히 나갔다.");
  if(typeof renderArena === "function") renderArena();
}, true);
