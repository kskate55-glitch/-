/* ================= 🐣 초보 모드 (v220) =================
   피드백: "초보자한테는 너무 어렵다 — 뭘 눌러야 할지 모르겠고, 내용(용어)도 어렵다."
   세 가지만 한다. 게임 규칙·숫자·난수는 하나도 안 바꾼다(보이는 것만 바꾼다).
   ① 🧭 지금 할 일 — 화면 위에 한 줄
   ② ⭐ 추천 — 지금 눌러 보면 좋은 버튼 1~2개에 표시(접힌 묶음이면 그 묶음 제목에도)
   ③ 📖 용어 풀이 — 어려운 단어에 점선 밑줄, 누르면 한 줄 설명
   처음 한 번 "처음이에요 / 해 봤어요"를 묻고, ☰ 메뉴에서 언제든 켜고 끈다. */
function ezOn(){ return !!kcRec().ez; }
function ezSet(v){ const c = kcRec(); c.ez = !!v; c.ezAsked = true; try{ save(); }catch(e){} }
/* ---------- 용어 ---------- */
const EZ_TERMS = [
  ["말소기준권리", "낙찰되면 지워지는 권리들의 기준선이에요. 이보다 늦게 생긴 권리는 대부분 사라지고, 먼저 생긴 건 낙찰자가 떠안을 수 있어요."],
  ["대항력", "세입자가 새 주인에게도 '계속 살 권리가 있다'고 주장할 수 있는 힘이에요. 전입과 실제 거주를 말소기준권리보다 먼저 갖춰야 생겨요."],
  ["배당요구", "세입자 등이 '낙찰 대금에서 내 돈을 돌려받겠다'고 법원에 신청하는 거예요."],
  ["배당", "낙찰 대금을 채권자·세입자에게 순서대로 나눠 주는 거예요."],
  ["인도명령", "잔금을 낸 뒤 점유자에게 '집을 넘겨 달라'고 법원에 신청하는 간단한 절차예요(잔금 낸 뒤 6개월 안)."],
  ["강제집행", "법원 결정을 근거로 집행관이 짐을 들어내는 절차예요. 돈과 시간이 들어서 보통 마지막 수단이에요."],
  ["명도", "지금 사는 사람이 나가고 집을 넘겨받는 과정이에요."],
  ["점유자", "지금 그 집에 살고 있는(쓰고 있는) 사람이에요."],
  ["유치권", "공사비를 못 받았다며 건물을 붙잡고 있는 권리 주장이에요. 진짜인 경우는 드물지만 꼭 확인해야 해요."],
  ["가장임차인", "실제 세입자가 아닌데 세입자인 척하는 사람이에요."],
  ["임차인", "집을 빌려 사는 사람(세입자)이에요."],
  ["최저매각가격", "이번 입찰에서 이 금액 아래로는 쓸 수 없는 선이에요."],
  ["입찰보증금", "입찰할 때 함께 내는 돈이에요(보통 최저가의 10%). 떨어지면 그 자리에서 돌려받아요."],
  ["감정가", "법원이 감정평가로 정한 기준 가격이에요. 실제 시세와 다를 수 있어요."],
  ["유찰", "아무도 입찰하지 않아 다음 기일로 넘어가는 거예요. 다음엔 최저가가 내려가요."],
  ["낙찰가율", "감정가에 비해 몇 %에 낙찰됐는지예요."],
  ["낙찰", "가장 높은 금액을 써서 이긴 거예요."],
  ["패찰", "입찰에서 진 거예요. 보증금은 돌려받아요."],
  ["확정일자", "임대차계약서에 받는 날짜 도장이에요. 배당받는 순서를 정할 때 쓰여요."],
  ["전입", "주민등록 주소를 그 집으로 옮긴 거예요."],
  ["선순위", "말소기준권리보다 먼저 생긴 권리예요. 낙찰자가 떠안을 가능성이 커요."],
  ["인수", "낙찰자가 대신 떠안아야 하는 돈이나 권리예요. 입찰가와 따로 더 드는 돈이에요."],
  ["체납관리비", "밀린 관리비예요. 공용부분은 낙찰자가 내야 할 수 있어요."],
  ["내용증명", "어떤 편지를 보냈는지 우체국이 증명해 주는 우편이에요. 그 자체로 강제력은 없어요."],
  ["합의서", "이사 날짜·금액·조건을 적어 서로 서명한 종이예요. 말 바꾸기를 막아 줘요."],
  ["잔금", "낙찰가에서 보증금을 뺀 나머지 돈이에요. 이걸 내는 날 소유권을 얻어요."],
  ["호가", "팔겠다고 내건 가격이에요. 실제로 팔린 가격(실거래가)과는 달라요."],
  ["실거래가", "실제로 계약된 가격이에요. 국토교통부에 신고된 기록이에요."],
  ["갭", "매매가와 전세가의 차이예요."]];
const EZ_RE = new RegExp(EZ_TERMS.map(t => t[0]).sort((a, b) => b.length - a.length).join("|"), "g");
function ezGloss(root){
  if(!root) return;
  const seen = new Set([...root.querySelectorAll(".ez-term")].map(x => x.dataset.ez));
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode(n){
    const p = n.parentElement; if(!p || !n.nodeValue || !EZ_RE.test(n.nodeValue)){ EZ_RE.lastIndex = 0; return NodeFilter.FILTER_REJECT; }
    EZ_RE.lastIndex = 0;
    if(p.closest("button, a, input, textarea, select, summary, script, style, .ez-term, .ez-goal, .ez-tip, [data-kres], [data-kmove], .hx-root, .hx-talk, #mtTale, .vn-box")) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT; }});
  const nodes = []; while(walk.nextNode()) nodes.push(walk.currentNode);
  nodes.forEach(n => {
    const s = n.nodeValue; let last = 0, out = [], m; EZ_RE.lastIndex = 0;
    while((m = EZ_RE.exec(s))){ if(seen.has(m[0])) continue; seen.add(m[0]); out.push(s.slice(last, m.index)); out.push(m[0]); last = m.index + m[0].length; }
    if(!out.length) return; out.push(s.slice(last));
    const f = document.createDocumentFragment();
    out.forEach((t, i) => { if(i % 2){ const sp = document.createElement("span"); sp.className = "ez-term"; sp.dataset.ez = t; sp.tabIndex = 0; sp.textContent = t; f.appendChild(sp); } else if(t) f.appendChild(document.createTextNode(t)); });
    n.parentNode.replaceChild(f, n);
  });
}
function ezTip(el){
  document.querySelectorAll(".ez-tip").forEach(x => x.remove());
  const t = EZ_TERMS.find(x => x[0] === el.dataset.ez); if(!t) return;
  const d = document.createElement("div"); d.className = "ez-tip"; d.innerHTML = `<b>📖 ${t[0]}</b><span>${t[1]}</span>`;
  document.body.appendChild(d);
  const r = el.getBoundingClientRect(), w = Math.min(300, innerWidth - 20);
  d.style.width = w + "px"; d.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left + r.width / 2 - w / 2)) + "px";
  const below = r.bottom + 8 + d.offsetHeight < innerHeight; d.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - d.offsetHeight - 8)) + "px";
}
/* ---------- 지금 할 일 + 추천 ---------- */
function ezMoveRec(){
  const o = K.occ, can = id => { const m = K_MOVES.find(x => x.id === id); return m && (!m.need || m.need(o)) && document.querySelector(`[data-kmove="${id}"]`); };
  if(K.pendingFlip) return {goal:"점유자가 이삿날 말을 바꿨어요. 더 줄지, 합의서를 쓰자고 할지 골라요.", sel:["[data-kflip]"]};
  if(K.offering){ const need = K.askNeed || 0, bs = [...document.querySelectorAll("[data-koffer]")].map(b => +b.dataset.koffer), pick = bs.find(v => v >= need) ?? bs[bs.length - 1];
    return {goal:`이사비를 제안하는 단계예요. 원하는 금액(${kMan(need)}) 안팎을 고르면 합의가 잘 돼요.`, sel:[`[data-koffer="${pick}"]`]}; }
  if(o.agreed) return o.paper ? {goal:"합의 완료! 이삿날까지 기다리면 돼요.", sel:["[data-kwait]"]} : {goal:"합의했어요. 말 바꾸기를 막으려면 합의서부터 써요.", sel:['[data-kmove="paper"]']};
  const r = [];
  if(o.spAsk && can("sp_bridge")) r.push("sp_bridge");
  // 🧩 막힌 곳(믿음·날짜·생활·권한 …)을 푸는 전용 버튼이 떠 있으면 그게 먼저 — 풀리기 전엔 날짜 얘기가 안 된다
  const blk = [...document.querySelectorAll('#kfsRoot [data-kmove^="mb"]')].filter(b => !b.disabled).map(b => b.dataset.kmove);
  blk.forEach(id => r.push(id));
  if(o.coop >= 45 && can("date") && !blk.length) r.push("date");                  // 마음이 열렸으면 날짜가 먼저
  if(!o.slam && !(o.heard) && can("listen")) r.push("listen");
  if(o.place && can("center")) r.push("center");
  if(!o.dInvolved && can("daughter")) r.push("daughter");          // 한 번 부르면 됐다
  if(!r.length && !o.order && !o.orderOk && can("order")) r.push("order");
  if(!r.length && can("date")) r.push("date");
  if(!r.length && can("listen")) r.push("listen");
  const g = blk.length ? "🧩 이 사람이 못 나가는 진짜 이유가 있어요. ⭐ 표시한 걸로 그 문제부터 풀어 주면 날짜 얘기가 통해요."
    : o.slam && !o.order && !o.orderOk ? "대화가 안 통하는 사람이에요. 인도명령(법원 절차)을 넣어 두면 오히려 대화가 시작될 수 있어요."
    : o.coop < 45 ? `점유자 마음을 여는 단계예요(협조도 ${Math.round(o.coop)} → 45쯤 되면 날짜 얘기가 통해요). 사정을 듣고, 갈 곳을 같이 찾아 주세요.`
    : "마음이 좀 열렸어요. 이사 날짜를 같이 정하자고 해 보세요.";
  return {goal:g, sel:r.slice(0, 2).map(id => `[data-kmove="${id}"]`)};
}
function ezNow(){
  if(!K || typeof arenaTab === "undefined" || arenaTab !== "king" || !ezOn()) return null;
  if(K.intro) return {goal:"사건 소개예요. 읽고 나서 다음으로 넘어가세요.", sel:["[data-kintro]"]};
  if(K.revealing) return {goal:"개찰 중이에요. 결과를 기다려요.", sel:[]};
  if(K.step === "brief" && K.sealed) return {goal:"봉투에 적은 금액을 확인하고 제출하세요. 틀렸으면 '다시 쓰기'.", sel:["[data-kbid]"]};
  if(K.step === "brief"){
    const hid = (KP.hidden || []).length, found = (KP.hidden || []).filter(h => K.found[h.id]).length;
    const acts = (KP.actions || []).filter(a => typeof krCan === "function" && krCan(a)).sort((a, b) => (b.iv || 0) - (a.iv || 0) || (krDur(a)[0] + krTravel(a)) - (krDur(b)[0] + krTravel(b)));
    const left = typeof krFmt === "function" && K.timeLeft != null ? krFmt(K.timeLeft) : "";
    if(acts.length && found < hid) return {goal:`조사 단계 — 이 집에 숨은 위험(돈이 새는 곳)을 찾아요. 찾음 ${found}/${hid}${left ? ` · 남은 시간 ${left}` : ""}. ⭐ 표시부터 눌러 보세요.`, sel:acts.slice(0, 2).map(a => `[data-kres="${a.id}"]`)};
    return {goal:"조사는 충분해요. 입찰표에 금액을 적고 '봉투에 넣기'를 누르세요 — 판 가격에서 수리·세금·이사비를 빼고도 남는 금액까지만 쓰는 게 기본이에요.", sel:["#kBid", "[data-kcseal]"]};
  }
  if(K.step === "won") return {goal:"낙찰! 잔금을 내고 지금 사는 사람(점유자)을 만나러 가요.", sel:["[data-kgo]"]};
  if(K.step === "lost") return {goal:"이번엔 졌어요. 보증금은 돌려받아요. 다음 사건으로 넘어가요.", sel:["[data-kgo]", "[data-knext]"]};
  if(K.step === "move") return ezMoveRec();
  if(K.step === "defect") return {goal:"집을 열어 보니 고칠 곳이 있어요. 수리 수준을 고르세요 — 처음이면 'D. 전략적 일부'나 'B. 가성비'가 무난해요.", sel:['[data-krep="part"]', '[data-krep="good"]']};
  if(K.step === "list"){ const bs = [...document.querySelectorAll("[data-klist]")]; const pick = bs[Math.min(2, bs.length - 1)];
    return {goal:"얼마에 내놓을지(호가) 정해요. 너무 높으면 안 팔리고, 너무 낮으면 손해예요 — 처음이면 '시세 근처'.", sel:pick ? [`[data-klist="${pick.dataset.klist}"]`] : []}; }
  if(K.step === "sell"){ const S = K.sale, of = S && S.offer;
    if(of && of.amt >= S.list * 0.96) return {goal:`${kMan(of.amt)}에 사겠다는 사람이 왔어요. 내놓은 가격과 거의 같으니 받아도 좋아요.`, sel:['[data-ksale="accept"]']};
    if(of) return {goal:`${kMan(of.amt)}에 사겠대요. 내놓은 가격보다 꽤 낮아요 — 중간값으로 역제안하거나 기다려 볼 수 있어요.`, sel:['[data-ksale="counter"]']};
    return {goal:"아직 사겠다는 사람이 없어요. 한 주 더 기다리거나, 오래 안 팔리면 가격을 조금 내려요.", sel:['[data-ksale="wait"]']}; }
  if(K.step === "result") return {goal:"한 사건 끝! 얼마 벌었는지, 뭘 놓쳤는지 확인해 보세요.", sel:[]};
  return null;
}
function ezPaint(){
  document.querySelectorAll(".ez-rec").forEach(x => x.classList.remove("ez-rec"));
  document.querySelectorAll(".ez-star, .ez-grp-star").forEach(x => x.remove());
  const root = document.getElementById("kfsRoot"), old = document.getElementById("ezGoal");
  const N = root ? ezNow() : null;
  if(!N){ if(old) old.remove(); return; }
  let g = old; if(!g){ g = document.createElement("div"); g.id = "ezGoal"; g.className = "ez-goal"; }
  g.innerHTML = `<b>🧭 지금 할 일</b><span>${esc(N.goal)}</span>`;
  if(g.parentNode !== document.body) document.body.appendChild(g);
  const head = root.querySelector(".kfs-head"), hb = head ? head.getBoundingClientRect().bottom : 0; g.style.top = (hb + 6) + "px";
  (N.sel || []).forEach(s => document.querySelectorAll("#kfsRoot " + s).forEach(el => {
    if(el.disabled) return;
    el.classList.add("ez-rec");
    if(el.tagName !== "INPUT" && !el.querySelector(".ez-star")){ const st = document.createElement("em"); st.className = "ez-star"; st.textContent = "⭐ 추천"; el.prepend(st); }
    const d = el.closest("details"); if(d && !d.open){ const sm = d.querySelector(":scope > summary"); if(sm && !sm.querySelector(".ez-grp-star")){ const st = document.createElement("em"); st.className = "ez-grp-star"; st.textContent = "⭐"; sm.prepend(st); } }
  }));
  ezGloss(root.querySelector(".kfs-panel")); ezGloss(root.querySelector(".kfs-stage"));
}
/* ---------- 처음 한 번 묻기 + 메뉴 토글 ---------- */
function ezAsk(){
  if(document.getElementById("ezAsk")) return;
  const d = document.createElement("div"); d.id = "ezAsk"; d.className = "hx-talk ez-ask";
  d.innerHTML = `<div class="hx-talk-box"><p style="font-size:18px"><b>경매, 해 본 적 있어요?</b></p>
    <p class="note">처음이면 <b>초보 모드</b>로 시작해요 — 지금 할 일을 한 줄로 알려 주고, 눌러 볼 버튼에 ⭐를 달고, 어려운 말은 누르면 풀어 줘요. 게임 규칙·숫자는 똑같아요.</p>
    <div class="hx-talk-acts"><button type="button" class="btn primary" data-ezpick="1">🐣 처음이에요</button><button type="button" class="btn" data-ezpick="0">해 봤어요</button></div>
    <small class="note">☰ 메뉴에서 언제든 바꿀 수 있어요.</small></div>`;
  document.body.appendChild(d);
}
function ezMenu(){
  const m = document.querySelector("#kfsRoot .kfs-menu"); if(!m) return;
  let b = m.querySelector("[data-eztoggle]"); if(!b){ b = document.createElement("button"); b.type = "button"; b.dataset.eztoggle = "1"; m.appendChild(b); }
  b.textContent = ezOn() ? "🐣 초보 모드 끄기" : "🐣 초보 모드 켜기";
}
document.addEventListener("click", e => {
  let b;
  if((b = e.target.closest && e.target.closest("[data-ezpick]"))){ ezSet(b.dataset.ezpick === "1"); const d = document.getElementById("ezAsk"); if(d) d.remove(); try{ renderArena(); }catch(_){} return; }
  if((b = e.target.closest && e.target.closest("[data-eztoggle]"))){ e.preventDefault(); e.stopPropagation(); ezSet(!ezOn()); const m = document.querySelector(".kfs-menu"); if(m) m.hidden = true; try{ renderArena(); }catch(_){} return; }
  if((b = e.target.closest && e.target.closest(".ez-term"))){ e.preventDefault(); e.stopPropagation(); ezTip(b); return; }
  if(!e.target.closest || !e.target.closest(".ez-tip")) document.querySelectorAll(".ez-tip").forEach(x => x.remove());
}, true);
document.addEventListener("keydown", e => { if((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("ez-term")){ e.preventDefault(); ezTip(e.target); } });
if(typeof renderArena === "function"){
  const _ez_render = renderArena;
  renderArena = function(){
    const r = _ez_render.apply(this, arguments);
    try{
      ezMenu();
      if(K && arenaTab === "king" && !kcRec().ezAsked && !navigator.webdriver) ezAsk();   // 자동 테스트(브라우저 자동화)에서는 묻지 않는다
      ezPaint(); setTimeout(() => { try{ ezPaint(); ezMenu(); }catch(_){} }, 80);
    }catch(e){}
    return r;
  };
}
