/* ================= 🏦 잔금 대출 — 대출상담사 명함 3장 → 카톡처럼 조건 듣기 → 고르기 =================
   낙찰 뒤 잔금(낙찰가 − 보증금 + 취득세 등)이 현금보다 크면 대출은 필수, 현금이 넉넉하면 "받을지" 묻는다.
   ⚠️ 아래 15개는 실제 상품이 아니라 게임용 '표본'이다. 지점 이름은 모두 가상이고, 숫자는 2026년 공개 자료에서
      보이는 범위(2금융권 경락잔금·매매사업자 대출 금리 대략 4.5~7%대, 매매사업자 LTV 70~80% 안팎,
      한도는 '감정가의 일정 비율'과 '낙찰가의 일정 비율' 중 낮은 쪽, 중도상환수수료는 보통 3년 안 상환 시)를
      참고해 게임 밸런스로 다듬었다. 캐피탈은 가끔 나오고, 한도는 거의 다 나오지만 금리가 두 자릿수다. */
const LN_PRODUCTS = [
  {id:"nh1", kind:"농협",     org:"한울지역농협",     who:"박상훈 과장", rate:4.7, ltvA:60, ltvB:80, fee:1.2, term:"거치 1년 · 만기 3년", cond:"매매사업자 등록 1년 이상이면 0.2%p 우대", tone:"calm"},
  {id:"nh2", kind:"농협",     org:"들녘지역농협",     who:"이미경 대리", rate:4.9, ltvA:65, ltvB:80, fee:0.9, term:"거치 1년 · 만기 5년", cond:"조합원 가입(출자금 소액) 조건", tone:"kind"},
  {id:"sh1", kind:"수협",     org:"바다마을수협",     who:"정대호 팀장", rate:5.1, ltvA:70, ltvB:80, fee:1.0, term:"만기 3년 · 원금 일부 분할", cond:"빌라는 준공 30년 넘으면 한도 5%p 차감", tone:"blunt"},
  {id:"sh2", kind:"수협",     org:"남항수협",         who:"김소라 대리", rate:5.4, ltvA:70, ltvB:85, fee:0.8, term:"거치 6개월 · 만기 3년", cond:"잔금일 7영업일 전까지 서류 완비", tone:"kind"},
  {id:"cu1", kind:"신협",     org:"푸른신협",         who:"최영민 차장", rate:4.8, ltvA:60, ltvB:80, fee:1.0, term:"만기 3년", cond:"신협 조합원 가입 필요", tone:"calm"},
  {id:"cu2", kind:"신협",     org:"새벽신협",         who:"한지우 과장", rate:5.3, ltvA:70, ltvB:85, fee:0.7, term:"거치 1년 · 만기 3년", cond:"사업자 통장 거래 6개월 이상 우대", tone:"fast"},
  {id:"cu3", kind:"신협",     org:"언덕신협",         who:"오세진 대리", rate:5.9, ltvA:75, ltvB:85, fee:0.5, term:"만기 2년", cond:"한도 높은 대신 금리가 조금 높아요", tone:"fast"},
  {id:"mg1", kind:"새마을금고", org:"동네새마을금고",   who:"윤경희 과장", rate:5.0, ltvA:65, ltvB:80, fee:1.0, term:"만기 3년", cond:"금고 회원 가입 필요", tone:"kind"},
  {id:"mg2", kind:"새마을금고", org:"골목새마을금고",   who:"장태민 과장", rate:5.6, ltvA:70, ltvB:85, fee:0.6, term:"거치 1년 · 만기 3년", cond:"임대 놓을 거면 임대차계약서 사본 제출", tone:"blunt"},
  {id:"mg3", kind:"새마을금고", org:"한강변새마을금고", who:"문수빈 대리", rate:6.2, ltvA:75, ltvB:85, fee:0.5, term:"만기 2년", cond:"심사 빠름 — 잔금 날짜가 촉박해도 가능", tone:"fast"},
  {id:"sb1", kind:"저축은행", org:"참빛저축은행",     who:"서동욱 팀장", rate:6.9, ltvA:75, ltvB:85, fee:1.5, term:"만기 2년", cond:"다른 곳에서 한도가 안 나올 때 많이 찾아요", tone:"calm"},
  {id:"sb2", kind:"저축은행", org:"모아저축은행",     who:"권나래 대리", rate:7.4, ltvA:80, ltvB:90, fee:1.4, term:"만기 2년", cond:"신용점수 따라 금리 ±1%p", tone:"kind"},
  {id:"cp1", kind:"캐피탈",   org:"번개캐피탈",       who:"강민철 실장", rate:11.9, ltvA:85, ltvB:95, fee:2.0, term:"만기 1년 · 연장 가능", cond:"서류 간단, 한도 거의 다 나옵니다", tone:"hype", cap:true},
  {id:"cp2", kind:"캐피탈",   org:"도토리캐피탈",     who:"배상철 실장", rate:13.5, ltvA:90, ltvB:100, fee:2.5, term:"만기 1년", cond:"낙찰가 전액까지도 검토해 드려요", tone:"hype", cap:true},
  {id:"cp3", kind:"캐피탈",   org:"하늘땅캐피탈",     who:"유재원 팀장", rate:10.8, ltvA:85, ltvB:95, fee:1.8, term:"만기 1년 6개월", cond:"오늘 신청하면 내일 승인", tone:"hype", cap:true}];
const LN_FALLBACK_RATE = 12.0;   // 그래도 모자라면 남는 금액은 신용대출(높은 금리)로 메운 것으로 친다

let LN = null;   // {need, must, cards:[id], heard:{id:offer}, chat:id|null, msgs:[], typing, pick}
function lnSeedRng(){ return kRng(((K && K.seed) || 7) * 7919 + 13); }
function lnPickCards(){
  // 명함은 주로 농협·수협·신협·새마을금고(상호금융)에서, 저축은행은 가끔, 캐피탈은 더 가끔. 같은 종류는 겹치지 않게.
  const r = lnSeedRng(), W = {"농협":3, "수협":3, "신협":3, "새마을금고":3, "저축은행":1};
  const out = [], used = {};
  const withCap = r() < 0.3;
  while(out.length < (withCap ? 2 : 3)){
    const pool = LN_PRODUCTS.filter(p => !p.cap && !used[p.kind] && !out.includes(p.id)), tot = pool.reduce((s, p) => s + W[p.kind], 0);
    let x = r() * tot; const p = pool.find(q => (x -= W[q.kind]) < 0) || pool[0];
    out.push(p.id); used[p.kind] = 1;
  }
  const caps = LN_PRODUCTS.filter(p => p.cap);
  if(withCap) out.splice(Math.floor(r() * 3), 0, caps[Math.floor(r() * caps.length)].id);
  return out;
}
function lnNeed(){ const c = kcRec(), cash = +c.cash || 0, bal = (K.cost.bid || 0) + (K.cost.acq || 0) + (K.cost.fee || 0); return {bal, cash, short:Math.max(0, bal - cash)}; }
function lnOffer(p){
  const r = kRng(((K.seed || 7) * 131 + p.id.charCodeAt(0) * 17 + p.id.charCodeAt(2)) >>> 0);
  const rate = Math.round((p.rate + (r() - 0.5) * 0.4) * 100) / 100;
  let a = p.ltvA; if(p.id === "sh1" && /19[0-8]\d|199[0-5]/.test(KP.addr || "")) a -= 5;
  const limit = Math.floor(Math.min(KP.appraisal * a / 100, K.cost.bid * p.ltvB / 100) / 10) * 10;
  return {id:p.id, rate, limit, fee:p.fee, a, b:p.ltvB};
}
function lnAmountFor(o){ const N = lnNeed(); return LN.must ? Math.min(o.limit, N.short) : Math.min(o.limit, Math.round(K.cost.bid * 0.6 / 10) * 10); }
function lnYear(amt, rate){ return Math.round(amt * rate / 100); }
function lnOpen(must){
  const N = lnNeed();
  LN = {need:N.short, must, cards:lnPickCards(), heard:{}, chat:null, msgs:[], typing:false, step: must ? "cards" : "ask"};
  lnPaint();
  if(typeof kcSfx === "function") kcSfx("paper");
}
function lnClose(){ LN = null; lnPaint(); if(typeof renderArena === "function") try{ renderArena(); }catch(e){} }

/* ---------- 카톡 대화 ---------- */
function lnScript(p, o){
  const N = lnNeed(), amt = lnAmountFor(o), y = lnYear(amt, o.rate);
  const hi = {calm:"네, 반갑습니다. 사건번호랑 낙찰가 먼저 알려 주시겠어요?", kind:"안녕하세요~ 낙찰 축하드려요 😊 물건 정보 한번 볼게요!", blunt:"네. 감정가, 낙찰가, 잔금일 알려 주세요.", fast:"네네 바로 볼게요! 잔금일이 언제예요?", hype:"사장님 축하드립니다!! 🎉 저희는 웬만하면 다 나옵니다. 물건 정보만 주세요~"}[p.tone];
  const me1 = `안녕하세요. 경매로 낙찰받은 물건 잔금 대출 문의드려요. ${KP.short || KP.title} · 감정가 ${kMan(KP.appraisal)} · 낙찰가 ${kMan(K.cost.bid)}이고, 매매사업자로 받으려고요.`;
  const calc = `감정가 ${o.a}%, 낙찰가 ${o.b}% 중에 낮은 쪽으로 보면 한도는 최대 ${kMan(o.limit)}까지 가능해요.`;
  const rateLine = p.cap ? `금리는 연 ${o.rate}%예요. 조금 높긴 한데 대신 한도는 확실하게 나옵니다 👍` : `금리는 현재 연 ${o.rate}% 정도로 나와요. (${esc(p.term)})`;
  const feeLine = `중도상환수수료는 3년 안에 갚으시면 ${o.fee}%예요. 단기 매도 계획이면 이것도 비용으로 잡으세요.`;
  const condLine = `참고로 ${p.cond}.`;
  const sum = `${LN.must ? `모자란 ${kMan(N.short)} 기준이면` : `${kMan(amt)}를 빌리시면`} 연이자 약 ${kMan(y)}, 한 달에 약 ${kMan(Math.round(y / 12))}이에요.`;
  const warn = p.cap ? "(속으로) …금리 두 자리. 한도가 다 나오는 데는 이유가 있다." : (o.limit < N.short && LN.must ? `(속으로) 한도가 ${kMan(N.short - o.limit)} 모자라다.` : "");
  const L = [["me", me1], ["them", hi], ["them", calc], ["them", rateLine], ["them", feeLine], ["them", condLine], ["them", sum]];
  if(warn) L.push(["think", warn]);
  return L;
}
function lnStartChat(id){
  const p = LN_PRODUCTS.find(x => x.id === id), o = lnOffer(p);
  LN.chat = id; LN.step = "chat"; LN.msgs = []; LN.queue = lnScript(p, o); LN.offer = o;
  lnPaint(); lnPump();
}
function lnPump(){
  if(!LN || LN.step !== "chat" || !LN.queue) return;
  if(!LN.queue.length){ LN.heard[LN.chat] = LN.offer; LN.typing = false; LN.queue = null; lnPaint(); return; }
  const nx = LN.queue[0];
  if(nx[0] === "them"){ LN.typing = true; lnPaint(); }
  const wait = nx[0] === "me" ? 350 : Math.min(1400, 450 + nx[1].length * 12);
  clearTimeout(LN.t); LN.t = setTimeout(() => {
    if(!LN || LN.step !== "chat") return;
    LN.typing = false; LN.msgs.push(LN.queue.shift());
    lnPaint(); if(nx[0] === "them" && typeof pxSyn === "function") try{ pxSyn("tap"); }catch(_){}
    lnPump();
  }, window.LN_FAST ? 5 : wait);
}

/* ---------- 확정 ---------- */
function lnTake(id){
  const p = LN_PRODUCTS.find(x => x.id === id), o = LN.heard[id]; if(!p || !o) return;
  const N = lnNeed(), amt = lnAmountFor(o), gap = LN.must ? Math.max(0, N.short - amt) : 0;
  K.loan = {id, org:p.org, kind:p.kind, rate:o.rate, fee:o.fee, amt, extra:gap, extraRate:LN_FALLBACK_RATE, cap:!!p.cap, feeDone:false};
  kLog(`🏦 ${p.org} 잔금 대출 ${kMan(amt)} · 연 ${o.rate}% · 연이자 약 ${kMan(lnYear(amt, o.rate))}${gap ? ` + 부족분 ${kMan(gap)}은 신용대출(연 ${LN_FALLBACK_RATE}%)` : ""}`);
  LN.step = "done"; LN.taken = id; lnPaint();
  if(typeof kcSfx === "function") kcSfx("stamp");
}
function lnSkip(){ K.loan = {none:true}; kLog("💵 대출 없이 현금으로 잔금을 냈다."); lnClose(); }
/* 하루 보유비: 원래 '이자+관리비' 뭉뚱그린 값 대신, 대출이 있으면 실제 이자 + 관리비(30%)로 바꾼다 */
if(typeof kDay === "function"){
  const _ln_kDay = kDay;
  kDay = function(n){
    _ln_kDay(n);
    const L = K && K.loan; if(!L || L.none || !L.amt) return;
    const base = KP.dailyHold * n, mine = KP.dailyHold * 0.3 * n + (L.amt * L.rate / 100 + (L.extra || 0) * L.extraRate / 100) / 365 * n;
    K.cost.hold += Math.round((mine - base) * 10) / 10;
  };
}
if(typeof kFinish === "function"){
  const _ln_kFinish = kFinish;
  kFinish = function(){
    const L = K && K.loan;
    if(L && !L.none && L.amt && !L.feeDone){ L.feeDone = true; const f = Math.round((L.amt + (L.extra || 0)) * L.fee / 100); if(f > 0){ K.cost.hold += f; kLog(`🏦 매도하며 대출을 갚았다 — 중도상환수수료 ${kMan(f)}(${L.fee}%)`); } }
    return _ln_kFinish.apply(this, arguments);
  };
}

/* ---------- 그리기 ---------- */
function lnCard(p, heard){
  const o = LN.heard[p.id];
  return `<button type="button" class="ln-card ${p.cap ? "cap" : ""} ${heard ? "heard" : ""}" data-lncard="${p.id}">
    <span class="ln-kind">${esc(p.kind)}</span><b class="ln-org">${esc(p.org)}</b><span class="ln-who">여신 상담 · ${esc(p.who)}</span>
    <span class="ln-tel">📞 상담 전화하기</span>${o ? `<span class="ln-got">연 ${o.rate}% · 한도 ${kMan(o.limit)}</span>` : ""}</button>`;
}
function lnCompare(){
  const ids = Object.keys(LN.heard); if(!ids.length) return "";
  const N = lnNeed();
  return `<div class="ln-cmp"><b>📋 들은 조건 비교</b><table><thead><tr><th>곳</th><th>금리</th><th>한도</th><th>빌릴 돈</th><th>연이자</th><th>중도상환</th><th></th></tr></thead><tbody>
    ${ids.map(id => { const p = LN_PRODUCTS.find(x => x.id === id), o = LN.heard[id], amt = lnAmountFor(o), short = LN.must && o.limit < N.short;
      return `<tr class="${p.cap ? "cap" : ""}"><td>${esc(p.org)}</td><td><b>${o.rate}%</b></td><td>${kMan(o.limit)}${short ? ` <em class="down">부족</em>` : ""}</td><td>${kMan(amt)}</td><td><b>${kMan(lnYear(amt, o.rate))}</b><small>월 ${kMan(Math.round(lnYear(amt, o.rate) / 12))}</small></td><td>${o.fee}%</td><td><button type="button" class="btn pri" data-lntake="${id}">이걸로</button></td></tr>`; }).join("")}
    </tbody></table>${LN.must && ids.every(id => LN.heard[id].limit < N.short) ? `<p class="note down">어느 곳도 한도가 다 안 나와요 — 고르면 남는 금액은 신용대출(연 ${LN_FALLBACK_RATE}%)로 메운 걸로 계산돼요.</p>` : ""}</div>`;
}
function lnHTML(){
  const N = lnNeed();
  if(LN.step === "ask") return `<div class="ln-box"><h3>🏦 잔금 대출, 받으시겠어요?</h3>
    <p>잔금 <b>${kMan(N.bal)}</b>은 지금 현금 <b>${kMan(N.cash)}</b>으로 낼 수 있어요.</p>
    <p class="note">대출을 받으면 현금이 남아 다음 입찰에 쓸 수 있지만, 이자와 중도상환수수료가 수익에서 빠져요.</p>
    <div class="ln-btns"><button type="button" class="btn pri" data-lnask="yes">예 — 대출상담사 명함 보기</button><button type="button" class="btn" data-lnask="no">아니오 — 현금으로 낸다</button></div></div>`;
  if(LN.step === "done"){ const L = K.loan, p = LN_PRODUCTS.find(x => x.id === L.id), y = lnYear(L.amt, L.rate) + lnYear(L.extra || 0, L.extraRate);
    return `<div class="ln-box ln-done"><div class="ln-stamp">승인</div><h3>🏦 ${esc(p.org)} 대출 확정</h3>
      <dl class="ln-dl"><div><dt>대출금</dt><dd>${kMan(L.amt)}${L.extra ? ` + 신용대출 ${kMan(L.extra)}` : ""}</dd></div><div><dt>금리</dt><dd>연 ${L.rate}%${L.extra ? ` / ${L.extraRate}%` : ""}</dd></div><div><dt>연이자</dt><dd>약 ${kMan(y)}</dd></div><div><dt>월이자</dt><dd>약 ${kMan(Math.round(y / 12))}</dd></div><div><dt>중도상환수수료</dt><dd>${L.fee}% (팔 때 약 ${kMan(Math.round((L.amt + (L.extra || 0)) * L.fee / 100))})</dd></div></dl>
      <p class="note">이자는 보유하는 날수만큼 '보유 이자·관리비'에 쌓이고, 매도할 때 중도상환수수료가 한 번 빠져요.</p>
      <div class="ln-btns"><button type="button" class="btn pri" data-lnclose>잔금 내러 가기 →</button></div></div>`; }
  const cards = LN.cards.map(id => lnCard(LN_PRODUCTS.find(x => x.id === id), !!LN.heard[id])).join("");
  if(LN.step === "chat"){
    const p = LN_PRODUCTS.find(x => x.id === LN.chat);
    const bub = LN.msgs.map(m => lnRowHTML(p, m)).join("");
    return `<div class="ln-box ln-chatbox" data-chat="${p.id}"><div class="kt-head"><button type="button" class="kt-back" data-lnback title="명함으로">‹</button><b>${esc(p.who)}</b><small>${esc(p.org)} ${p.cap ? "· 캐피탈" : "· 2금융권"}</small></div>
      <div class="kt-body" id="ktBody">${bub}${LN.typing ? `<div class="kt-row them kt-typrow"><span class="kt-av">${p.cap ? "💳" : "🏦"}</span><span class="kt-b kt-typing"><i></i><i></i><i></i></span></div>` : ""}</div>
      <div class="kt-foot" data-st="${LN.queue ? "q" : "d"}">${lnFootHTML(p)}</div></div>`;
  }
  return `<div class="ln-box"><h3>🏦 잔금 대출 — 대출상담사 명함 ${LN.cards.length}장</h3>
    <p>${LN.must ? `잔금 <b>${kMan(N.bal)}</b> 중 현금 ${kMan(N.cash)}을 빼면 <b class="down">${kMan(N.short)}</b>이 모자라요. 잔금일 전에 대출을 정해야 해요.` : `잔금은 현금으로도 되지만, 대출을 받으면 현금을 남겨 둘 수 있어요.`}</p>
    <p class="note">경매 잔금은 보통 농협·수협·신협·새마을금고 같은 2금융권에서 많이 받아요. 한 곳만 듣지 말고 두세 곳 조건을 비교하세요.</p>
    <div class="ln-cards">${cards}</div>${lnCompare()}
    <p class="note ln-disc">※ 게임용 예시 조건이에요. 실제 금리·한도는 시기·지역·신용·소득·규제에 따라 달라지니 실제 대출은 금융기관 상담으로 확인하세요.</p>
    ${LN.must ? "" : `<div class="ln-btns"><button type="button" class="btn" data-lnask="no">그냥 현금으로 낸다</button></div>`}</div>`;
}
function lnRowHTML(p, [w, t]){
  return w === "me" ? `<div class="kt-row me"><span class="kt-b">${esc(t)}</span></div>`
    : w === "think" ? `<div class="kt-row think"><span>${esc(t)}</span></div>`
    : `<div class="kt-row them"><span class="kt-av">${p.cap ? "💳" : "🏦"}</span><div><small class="kt-nm">${esc(p.who)} · ${esc(p.org)}</small><span class="kt-b">${esc(t)}</span></div></div>`;
}
/* 카톡처럼 — 새 말풍선만 아래에 붙인다. 화면 전체를 다시 그리면 모든 말풍선이 매번 다시 나타나 깜빡였다 */
function lnChatSync(el){
  const box = el.querySelector(".ln-chatbox"), body = el.querySelector("#ktBody");
  if(LN.step !== "chat" || !box || !body || box.dataset.chat !== LN.chat) return false;
  const p = LN_PRODUCTS.find(x => x.id === LN.chat), have = body.querySelectorAll(".kt-row:not(.kt-typrow)").length;
  const ty = body.querySelector(".kt-typrow");
  if(LN.msgs.length > have){ if(ty) ty.remove(); LN.msgs.slice(have).forEach(m => body.insertAdjacentHTML("beforeend", lnRowHTML(p, m))); }
  const ty2 = body.querySelector(".kt-typrow");
  if(LN.typing && !ty2) body.insertAdjacentHTML("beforeend", `<div class="kt-row them kt-typrow"><span class="kt-av">${p.cap ? "💳" : "🏦"}</span><span class="kt-b kt-typing"><i></i><i></i><i></i></span></div>`);
  if(!LN.typing && ty2) ty2.remove();
  const foot = box.querySelector(".kt-foot"), want = LN.queue ? "q" : "d";
  if(foot && foot.dataset.st !== want){ foot.dataset.st = want; foot.innerHTML = lnFootHTML(p); }
  body.scrollTop = body.scrollHeight;
  return true;
}
function lnFootHTML(p){ return LN.queue ? `<span class="note">상담 중…</span>` : `<button type="button" class="btn pri" data-lntake="${p.id}">이 조건으로 진행</button><button type="button" class="btn" data-lnback>다른 곳도 들어 볼게요</button>`; }
function lnPaint(){
  let el = document.getElementById("lnRoot");
  if(LN && el && lnChatSync(el)) return;
  if(!LN){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement("div"); el.id = "lnRoot"; el.className = "ln-root"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "잔금 대출"); document.body.appendChild(el); }
  el.innerHTML = `<div class="ln-veil"></div><div class="ln-scroll">${lnHTML()}</div>`;
  const b = document.getElementById("ktBody"); if(b) b.scrollTop = b.scrollHeight;
}
document.addEventListener("click", e => {
  if(!LN) return;
  const b = e.target.closest && e.target.closest("[data-lncard],[data-lnback],[data-lntake],[data-lnask],[data-lnclose]"); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  if(b.dataset.lncard){ lnStartChat(b.dataset.lncard); return; }
  if(b.hasAttribute("data-lnback")){ clearTimeout(LN.t); if(LN.queue){ LN.heard[LN.chat] = LN.offer; LN.queue = null; } LN.step = "cards"; LN.chat = null; lnPaint(); return; }
  if(b.dataset.lntake){ lnTake(b.dataset.lntake); return; }
  if(b.dataset.lnask === "yes"){ LN.step = "cards"; lnPaint(); return; }
  if(b.dataset.lnask === "no"){ lnSkip(); return; }
  if(b.hasAttribute("data-lnclose")){ lnClose(); return; }
}, true);

/* 낙찰 확정 화면이 뜨면(발표 연출이 끝난 뒤) 한 번 연다 */
function lnCheck(){
  if(LN || typeof K === "undefined" || !K || K.step !== "won" || K.loan || K.revealing || K.sealed) return;
  if(typeof page !== "undefined" && page !== "arena") return;
  if(!K.cost || !K.cost.bid) return;
  const N = lnNeed(); lnOpen(N.short > 0);
}
setInterval(lnCheck, 500);
