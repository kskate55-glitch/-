/* ================= 💬 사연을 '대화'로 — 듣는 중간에 내가 한마디 한다 (v217) =================
   예전: 사정 듣기 = 독백을 탭으로 넘기기만(사건당 평균 36줄). 읽기만 하고 끼어들 틈이 없어 지루했다.
   이제: 사연 한 토막 중간에 "뭐라고 답할까?" — 공감 / 해결 / 원칙 세 갈래.
     · 점유자 유형마다 통하는 답이 다르다(형편이 어려운 사람엔 공감·해결, 가장임차인·유치권엔 원칙,
       시간 끄는 사람에게 공감은 역효과). 그래서 "매번 같은 정답"이 사라진다.
     · 고르면 상대 반응 한 줄 + 협조도/버팀 변화 + 💡 왜 그랬는지 한 줄.
     · 매수자 사연 끝엔 "무엇을 양보할까" — 그 사람이 원하던 걸 짚으면 역제안이 잘 통한다.
   건너뛰기(SKIP)하면 선택도 효과도 없다(예전과 같음). 자동 테스트(MT_SKIP_TALE)에도 영향 없다.
   ⚠️ 게임 난수(K.r)는 쓰지 않는다 — 문장 고르기만 Math.random. */
const TT_ON = true;
const TT_OPT = {
  warm:{ic:"🤝", name:"공감", t:{worried:"많이 불안하셨겠어요. 천천히 말씀하세요.", angry:"화나실 만해요. 끝까지 들을게요.", normal:"그랬군요. 계속 말씀해 주세요."}},
  fix:{ic:"🧭", name:"해결", t:{worried:"지금 제일 급한 게 뭐예요? 같이 방법 찾아봐요.", angry:"뭐가 풀리면 마음이 좀 놓이시겠어요?", normal:"언제, 어디로 가실 수 있을지 같이 따져 봐요."}},
  firm:{ic:"📏", name:"원칙", t:{worried:"사정은 알겠어요. 그래도 날짜는 정해야 해요.", angry:"목소리 높이지 말고, 서류대로 얘기하죠.", normal:"제 입장도 있어요. 조건은 분명히 정하죠."}}};
// 유형별 [협조도 변화, 버팀 변화] — 좋은 답은 협조↑·버팀↓, 나쁜 답은 반대
const TT_FX = {
  poor:{warm:[8,-3], fix:[7,-5], firm:[-6,2]},     senior:{warm:[8,-3], fix:[9,-4], firm:[-5,2]},
  care:{warm:[10,-3], fix:[8,-4], firm:[-10,5]},   coop:{warm:[5,-2], fix:[7,-4], firm:[3,-3]},
  angry:{warm:[10,-4], fix:[3,-1], firm:[-10,6]},  greedy:{warm:[1,4], fix:[3,-2], firm:[3,-9]},
  bully:{warm:[-1,5], fix:[1,0], firm:[4,-10]},    fake:{warm:[-2,6], fix:[2,-4], firm:[2,-12]},
  lien:{warm:[1,3], fix:[4,-4], firm:[2,-10]},     ghost:{warm:[3,-1], fix:[8,-5], firm:[-4,4]},
  short:{warm:[5,-2], fix:[8,-5], firm:[-3,2]},    delay:{warm:[-2,6], fix:[0,2], firm:[4,-9]}};
const TT_REPLY = {
  poor:{warm:["worried","…이런 얘기, 처음 해 봐요. 들어 줘서 고마워요."], fix:["normal","갈 데만 있으면요. 주거지원 같은 거, 저도 되나요?"], firm:["angry","날짜요? …그러니까 결국 나가라는 거잖아요."]},
  senior:{warm:["normal","고마워요. 나이 드니 말할 데가 없어서…"], fix:["normal","딸한테 연락해 줄 수 있소? 걔가 알아서 할 거요."], firm:["worried","…알겠소. 알겠는데, 너무 몰아세우진 마시오."]},
  care:{warm:["normal","…화 안 내시네요. 다들 화부터 내던데."], fix:["worried","가족한테… 전화해 주실 수 있어요?"], firm:["worried","(말이 끊긴다. 손끝이 떨린다.) …잘 모르겠어요."]},
  coop:{warm:["normal","저도 빨리 정리하고 싶어요. 조건만 맞으면요."], fix:["normal","좋아요. 날짜랑 이사비만 정하면 바로 움직일게요."], firm:["normal","네, 그렇게 분명히 해 주시는 게 저도 편해요."]},
  angry:{warm:["worried","…그래요, 나도 이러고 싶어서 이러는 거 아니에요."], fix:["angry","해결? 누가 해결해 준대요. …뭐, 얘기는 해 봐요."], firm:["angry","서류? 서류 좋아하시네. 나도 알아볼 데 있어요!"]},
  greedy:{warm:["normal","역시 말이 통하네. 그럼 이사비 얘기부터 다시 하죠."], fix:["normal","구체적으로 얼마까지 되는데요? 숫자로 말해 봐요."], firm:["worried","…법대로 하면 나한테 남는 게 별로 없다는 거죠? 흠."]},
  bully:{warm:["angry","그렇지? 내가 억울한 거 알면 돈으로 보여 줘."], fix:["normal","방법? 돈이 방법이지. …얼마 생각하는데?"], firm:["worried","…법대로 가자고? 쯧, 알았어. 얘기나 해 봐."]},
  fake:{warm:["normal","그렇죠, 저도 보증금 받을 권리가 있다니까요."], fix:["worried","계약서요? …그건 좀 찾아봐야 하는데."], firm:["worried","전입일이랑 계약서… 법원에서 그걸 다 본다고요?"]},
  lien:{warm:["normal","공사대금만 받으면 조용히 나갑니다. 억울한 건 억울한 거고."], fix:["normal","정산서 보여 드릴까요? 금액은 협의할 수 있어요."], firm:["worried","점유를 언제부터 했냐고요? …그건, 좀 복잡한데."]},
  ghost:{warm:["normal","(답장이 한참 뒤에 온다.) …네. 듣고는 있어요."], fix:["normal","날짜 정해 주시면 그날 짐 뺄게요. 연락은 문자로 주세요."], firm:["worried","(한동안 답이 없다.) 연락 끊지 말라고요? …알겠어요."]},
  short:{warm:["worried","고마워요. 여기 법은 너무 어려워서…"], fix:["normal","어디로, 언제까지인지 적어 주면 그대로 할게요."], firm:["worried","날짜만… 날짜만 조금 더 주세요."]},
  delay:{warm:["normal","그럼요, 천천히 하시죠. 서두를 거 없잖아요?"], fix:["normal","이사 갈 데요? 알아보고는 있는데, 봄쯤이면 어떨까…"], firm:["worried","…날짜를 박자고요? 음, 그럼 그 날짜로 하죠."]}};
const TT_WHY = {
  poor:"갈 곳이 막막한 사람에겐 먼저 들어 주고, 갈 곳을 같이 찾는 게 가장 빠르다.",
  senior:"어르신은 몰아세우기보다 가족·주거지원처럼 기댈 곳을 이어 주는 게 빠르다.",
  short:"사정이 급한 사람에겐 '언제까지·어디로'를 구체적으로 정해 주는 게 제일 잘 통한다.",
  care:"마음이 흔들리는 사람을 다그치면 대화가 끊긴다. 가족·기관 연결이 먼저다.",
  coop:"협조적인 사람에겐 조건을 분명히 정해 주는 게 서로 편하다.",
  angry:"화가 난 사람은 먼저 털어놓게 해야 숫자 얘기가 들어간다.",
  greedy:"더 받아 내려는 사람에게 공감만 하면 '더 불러도 되겠다'로 읽힌다. 법적 선을 먼저 보여 줘야 한다.",
  bully:"세게 나오는 사람에게 맞장구는 약점으로 읽힌다. 인도명령 같은 절차가 있다는 걸 담담히 알리는 게 낫다.",
  fake:"권리를 주장하는 사람에겐 공감보다 전입일·계약서처럼 날짜와 서류로 확인하는 게 답이다.",
  lien:"유치권 주장은 '언제부터 점유했는지'와 서류가 핵심이다. 감정보다 사실을 짚어야 한다.",
  ghost:"연락을 피하는 사람에겐 구체적인 날짜와 연락 방법을 정해 주는 게 낫다.",
  delay:"시간을 끄는 사람에게 '천천히 하세요'는 선물이다. 날짜부터 정해야 한다."};
function ttType(pid){
  if(pid === "p_delay") return "delay";
  const P = typeof personaById === "function" ? personaById(pid) : null;
  return P && TT_FX[P.type] ? P.type : "coop";
}
function ttChoiceNode(kind, type, ex){ return {tt:true, kind, type, ex:ex || "normal"}; }
// 사연 토막에 선택지 하나를 끼운다 — 상대가 말한 줄 뒤, 가운데쯤
function ttInject(lines, node){
  if(!Array.isArray(lines) || lines.length < 2 || lines.some(l => l && l.tt)) return lines;
  const idx = []; lines.forEach((l, i) => { if(Array.isArray(l) && l[0] === "" && i < lines.length - 1) idx.push(i); });
  const at = idx.length ? idx[Math.floor((idx.length - 1) / 2)] : Math.floor(lines.length / 2) - 1;
  node.ex = (lines[at] && lines[at][2]) || "normal";
  return [...lines.slice(0, at + 1), node, ...lines.slice(at + 1)];
}
function ttCtx(o){
  if(!o) return null;
  if(typeof K !== "undefined" && K && K.step === "move" && o.pid && KP && KP.occ && KP.occ.pid === o.pid) return {kind:"occ", type:ttType(o.pid)};
  if(typeof G !== "undefined" && G && o.pid && G.pid === o.pid && !(typeof arenaTab !== "undefined" && arenaTab === "king")) return {kind:"arena", type:ttType(o.pid)};
  if(typeof K !== "undefined" && K && K.step === "sell" && K.sale && K.sale.offer && /^매수자 · /.test(o.name || "")) return {kind:"buyer"};
  return null;
}
if(TT_ON && typeof mtPlay === "function"){
  const _tt_play = mtPlay;
  mtPlay = function(lines, o){
    try{
      const c = ttCtx(o);
      if(c && c.kind === "buyer" && Array.isArray(lines) && lines.length) lines = [...lines, {tt:true, kind:"buyer"}];
      else if(c) lines = ttInject(lines, ttChoiceNode(c.kind, c.type));
    }catch(e){}
    return _tt_play.call(this, lines, o);
  };
}
function ttBuyerOpts(){ return [["price", "💰", "가격은 조금 맞춰 드릴 수 있어요."], ["speed", "📅", "잔금 날짜는 편하신 대로 맞춰 볼게요."], ["repair", "🔧", "고칠 데는 가격으로 정리하면 어떨까요?"]]; }
function ttPrevHTML(){ const pv = MT && MT.lines[MT.i - 1]; if(!Array.isArray(pv) || !pv[1]) return ""; const who = pv[0] === "" ? MT.name : pv[0]; return `<p class="tt-prev">${who ? `<b>${esc(who)}</b> ` : ""}“${esc(pv[1])}”</p>`; }
function ttCardHTML(node){
  const opts = node.kind === "buyer"
    ? ttBuyerOpts().map(([k, ic, t], i) => `<button type="button" class="tt-opt" data-ttpick="${k}"><b>${i + 1}</b> ${ic} ${esc(t)}</button>`).join("")
    : ["warm", "fix", "firm"].map((k, i) => `<button type="button" class="tt-opt tt-${k}" data-ttpick="${k}"><b>${i + 1}</b> ${TT_OPT[k].ic} <small>${TT_OPT[k].name}</small> ${esc(TT_OPT[k].t[node.ex] || TT_OPT[k].t.normal)}</button>`).join("");
  return `<div class="mt-veil"></div><div class="mt-card tt-card">
    <div class="mt-top"><small>${MT.title ? esc(MT.title) : "🙇 사정 듣는 중"} · 💬 내 차례</small><button type="button" class="mt-skip" data-mtskip>건너뛰기 ›</button></div>
    <div class="mt-body"><div class="mt-say">${ttPrevHTML()}<b class="mt-nm">뭐라고 답할까?</b><div class="tt-opts">${opts}</div></div></div></div>`;
}
if(TT_ON && typeof mtPaint === "function"){
  const _tt_paint = mtPaint;
  mtPaint = function(){
    const node = MT && MT.lines[MT.i];
    if(!node || !node.tt) return _tt_paint.apply(this, arguments);
    let el = document.getElementById("mtTale");
    if(!el){ el = document.createElement("div"); el.id = "mtTale"; el.className = "mt-tale"; el.setAttribute("role", "dialog"); document.body.appendChild(el); }
    el.innerHTML = ttCardHTML(node);
  };
}
function ttApply(node, pick){
  let out = [], fxTxt = "";
  if(node.kind === "buyer"){
    const of = K.sale && K.sale.offer, T = of && typeof ST_TYPES !== "undefined" ? ST_TYPES[of.buyer.t] : null, want = T && T.give;
    const hit = want && want === pick;
    if(of && hit){ of.buyer = Object.assign({}, of.buyer, {flex:Math.max(-0.03, of.buyer.flex - 0.015)}); of.ttHit = true; }
    out.push(["", hit ? {price:"정말요? 그럼 저도 오늘 결정할게요.", speed:"날짜 맞춰 주시면 저희는 그게 제일 커요.", repair:"수리 대신 가격이면 저도 깔끔하고 좋아요."}[pick] : "음… 그것보다는, 다른 게 더 걱정이긴 해요.", hit ? "normal" : "worried"]);
    out.push([null, hit ? `💡 이 매수자가 제일 원하던 걸 짚었다 — 역제안이 더 잘 통한다.` : `💡 이 사람한텐 그게 제일 중요하진 않았다. 사정 속에 힌트가 있다${T && T.hint ? " (" + T.hint + ")" : ""}.`, "normal"]);
    if(typeof kLog === "function") kLog(hit ? "💬 매수자가 원하는 조건을 짚었다 — 역제안 성공률↑" : "💬 매수자에게 엉뚱한 조건을 제시했다");
    return out;
  }
  const fx = (TT_FX[node.type] || TT_FX.coop)[pick], rp = (TT_REPLY[node.type] || TT_REPLY.coop)[pick];
  const [dc, dr] = fx, good = dc >= 5 || dr <= -8, bad = dc < 0 || dr > 0;
  if(node.kind === "occ" && K && K.occ){ K.occ.coop += dc; K.occ.resist += dr; K.occ.tt = (K.occ.tt || 0) + (good ? 1 : 0); }
  if(node.kind === "arena" && typeof G !== "undefined" && G){ const cl = v => Math.max(0, Math.min(100, v)); G.mood = cl((G.mood || 0) + dc); G.resist = cl((G.resist || 0) + dr); }
  fxTxt = `협조 ${dc >= 0 ? "+" : ""}${dc} · 버팀 ${dr >= 0 ? "+" : ""}${dr}`;
  out.push(["", rp[1], rp[0]]);
  out.push([null, `${good ? "💡 먹혔다" : bad ? "💡 역효과" : "💡 그저 그렇다"} (${fxTxt}) — ${TT_WHY[node.type] || TT_WHY.coop}`, "normal"]);
  if(typeof kLog === "function") kLog(`💬 ${TT_OPT[pick].name}으로 답했다 → ${fxTxt}`);
  return out;
}
function ttPick(pick){
  const node = MT && MT.lines[MT.i]; if(!node || !node.tt || node.done) return;
  node.done = true;
  let add = [];
  try{ add = ttApply(node, pick); }catch(e){}
  const mine = node.kind === "buyer" ? (ttBuyerOpts().find(x => x[0] === pick) || [])[2] : TT_OPT[pick].t[node.ex] || TT_OPT[pick].t.normal;
  MT.lines = [...MT.lines.slice(0, MT.i), ["나", mine || "…", "normal"], ...add, ...MT.lines.slice(MT.i + 1)];
  if(typeof kcSfx === "function") try{ kcSfx("tap"); }catch(e){}
  mtPaint();
  if(typeof save === "function") try{ save(); }catch(e){}
}
// 선택 카드에선 '계속 듣기' 탭·엔터가 다음 줄로 넘기지 않게 — mdtale보다 먼저(창 단계에서) 잡는다
window.addEventListener("click", e => {
  if(!TT_ON || typeof MT === "undefined" || !MT) return;
  const node = MT.lines[MT.i]; if(!node || !node.tt) return;
  const b = e.target.closest && e.target.closest("[data-ttpick]");
  if(e.target.closest && e.target.closest("[data-mtskip]")) return;
  e.stopPropagation(); e.preventDefault();
  if(b) ttPick(b.dataset.ttpick);
}, true);
window.addEventListener("keydown", e => {
  if(!TT_ON || typeof MT === "undefined" || !MT) return;
  const node = MT.lines[MT.i]; if(!node || !node.tt) return;
  if(e.key === "Escape") return;
  e.stopPropagation(); e.preventDefault();
  const n = +e.key; if(n >= 1 && n <= 3){ const keys = node.kind === "buyer" ? ttBuyerOpts().map(x => x[0]) : ["warm", "fix", "firm"]; ttPick(keys[n - 1]); }
}, true);
