/* ================= 📖 에피소드 스토리 — 단계마다 물건 네 개 → 엔딩 → 다음 사람 해금 =================
   서윤(1단계) → 도현 → 미정 → 재훈 → 은경 → 태식(6단계). 이미 있는 사건(CASES)을 난이도 순으로
   네 개씩(마지막 태식만 다섯 개) 골라 한 사람의 1~2년처럼 이어 붙였다. 사건·인물은 모두 가상이다.
   엔딩(NORMAL·GOOD·BAD·SPECIAL)은 네 물건의 판단 점수·시간·돈으로 정하고, 어떤 엔딩이든 보면
   다음 단계가 열린다(cpRec().unlocked를 캠페인과 같이 쓴다). 6단계까지 끝나면 엔딩 크레딧이 올라간다. */
const EP_PLAN = {
  seoyun:{stars:1, base:1500, hold:3, eps:[
    {k:"k1", when:"1년차 · 봄", lines:["노트북에 관심지역 알림이 떴다. 서울 오래된 빌라 3층, 대항력 없는 세입자.","'처음부터 끝까지 내 손으로. 조사하고, 입찰하고, 명도하고, 팔아 보자.'"]},
    {c:"c06", when:"1년차 · 여름", lines:["두 번째 물건은 대항력 없는 임차인이 사는 빌라.","'배당받는 세입자면 명도확인서가 열쇠라던데. 순서만 안 틀리면 돼.'"]},
    {c:"c54", when:"1년차 · 가을", lines:["명도는 끝났다. 이제 도배·장판 견적서가 세 장.","'제일 싼 데로 하면 되는 거 아니야? …아닌가?'"]},
    {c:"c14", when:"2년차 · 겨울", lines:["수리한 집을 팔 차례. 부동산 사장님이 사진부터 다시 찍자고 한다.","'첫 매도. 이것까지 끝나야 진짜 한 바퀴야.'"]}]},
  dohyun:{stars:2, base:2600, hold:4, eps:[
    {k:"k2", when:"1년차 · 봄", lines:["퇴근길 지하철에서 관심 물건 알림. 은평구 투룸, 겉 마진이 어마어마하다.","'싸 보이는 데는 이유가 있겠지. 멈출 줄 아는 것도 실력이다.'"]},
    {c:"c08", when:"1년차 · 여름", lines:["점심시간에 걸려 온 전화. '이사비 500은 주셔야죠.'","'회의 5분 전인데… 숫자부터 부르는 사람한테는 어떻게 하더라.'"]},
    {c:"c27", when:"1년차 · 가을", lines:["우편함이 넘치는 집. 사람은 없는데 짐은 그대로다.","'빈집이면 편할 줄 알았는데, 빈집이 제일 조심하라던데.'"]},
    {c:"c32", when:"2년차 · 봄", lines:["잔금 20일 전, 은행에서 전화가 왔다. 한도가 줄었단다.","'연차를 쓸 때가 왔다.'"]}]},
  mijeong:{stars:3, base:3600, hold:5, eps:[
    {c:"c30", when:"1년차 · 봄", lines:["가게 브레이크 타임에 낙찰받은 상가를 보러 갔다.","손님이 앉아 있는 미용실. '장사하는 사람 마음은 내가 알지.'"]},
    {c:"c19", when:"1년차 · 가을", lines:["다음 입찰은 상가. 감정가보다 월세가 먼저 보인다.","'장사 15년이면 상가 값은 월세로 거꾸로 보는 거야.'"]},
    {c:"c82", when:"2년차 · 봄", lines:["동네에서 30년 식당을 한 부부가 사는 집.","'말이 잘 안 통해도 밥 냄새는 통하지.'"]},
    {c:"c03", when:"2년차 · 가을", lines:["약속을 자꾸 미루는 부부. 둘 중 누가 결정하는지부터 안 보인다.","'사람 장사 15년, 진짜 결정권자는 따로 있더라.'"]}]},
  jaehoon:{stars:3, base:4800, hold:6, eps:[
    {c:"c57", when:"1년차 · 봄", lines:["철거 첫날. 천장을 뜯자 누렇게 번진 물 자국.","'봐라, 벽은 거짓말을 안 한다 아이가.'"]},
    {c:"c42", when:"1년차 · 가을", lines:["문을 열자 고양이 울음과 쓰레기 냄새.","'이건 공사보다 사람이 먼저다.'"]},
    {c:"c16", when:"2년차 · 봄", lines:["서류가 발목을 잡는다. 확정일자가 늦은 선순위 임차인.","'공구함 옆에 민법 책을 둔 이유가 이기라.'"]},
    {c:"c23", when:"2년차 · 겨울", lines:["아파트 지분을 낙찰받았다. 다른 공유자가 혼자 산다.","'집 반쪽을 샀는데, 문은 하나다.'"]}]},
  eunkyung:{stars:4, base:6800, hold:8, eps:[
    {c:"c18", when:"1년차 · 봄", lines:["배당표를 엑셀로 옮기다가 손이 멈췄다.","세금과 임금이 임차인보다 먼저. '숫자가 틀린 게 아니라 순서가 틀렸네.'"]},
    {c:"c34", when:"1년차 · 가을", lines:["보증금 '미상', 배당요구도 없는 선순위 임차인.","'모르는 칸이 있는 시트는 채우기 전엔 안 넘긴다.'"]},
    {c:"c36", when:"2년차 · 봄", lines:["지분 협상이 결국 안 됐다. 남은 길은 공유물분할.","'시간도 비용이다. 소송 기간을 시트에 넣자.'"]},
    {c:"c52", when:"2년차 · 가을", lines:["매도 직전, 중개사가 조용히 말한다. '계약서 금액은 좀 조정하시죠. 컨설팅비도 있고요.'","'이건 계산할 필요도 없는 문제야.'"]}]},
  taesik:{stars:5, base:12000, hold:14, eps:[
    {c:"c25", when:"1년차 · 봄", lines:["현관에 붙은 현수막. '유치권 행사 중'.","'삼십 년 동안 이런 현수막 많이 봤지. 진짜는 드물어.'"]},
    {c:"c31", when:"1년차 · 가을", lines:["여섯 세대가 사는 다가구 한 동을 통째로 낙찰받았다.","'한 집씩 따로 봐야 해. 사람마다 사정이 다르거든.'"]},
    {c:"c21", when:"2년차 · 봄", lines:["영업 중인 상가 임차인이 권리금 얘기를 꺼낸다.","'권리금이 누구한테 받는 돈인지부터 짚고 가자고.'"]},
    {c:"c73", when:"2년차 · 가을", lines:["공장 건물. 그런데 안에 있는 기계가 건물보다 비싸다.","'CNC 다섯 대, 주인이 따로 있으면 이야기가 완전히 달라지지.'"]},
    {c:"c100", when:"3년차 · 봄", lines:["마지막 물건. 유치권이 걸린 일곱 세대 — 여섯은 끝났고, TV 한 대가 남았다.","'끝까지 가 보자. 이게 마지막이야.'"]}]}};

/* ---------- 기록 ---------- */
function epRec(){ const P = cpRec(); if(!P.ep || typeof P.ep !== "object") P.ep = {}; return P.ep; }
function epOf(id){ const R = epRec(); if(!R[id] || !Array.isArray(R[id].res)) R[id] = {res:[]}; return R[id]; }
function epInfo(ep){
  if(ep.k){ const P = (typeof K_PROPS !== "undefined" && K_PROPS[ep.k]) || {}; return {title:P.title || ep.k, cat:"풀 경매 · 조사→입찰→명도→매도", lv:P.stars || 1, full:true}; }
  const c = epCase(ep.c); return c ? {title:c.title, cat:c.cat, lv:c.lv, full:false} : {title:"?", cat:"", lv:1};
}
function epCase(id){ return (typeof CASES !== "undefined" ? CASES : []).find(c => c.id === id) || null; }
function epShuffle(a){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function epTotals(c, picks){ const t = {d:0, w:0, m:0}; picks.forEach((p, i) => { const fx = c.steps[i] && c.steps[i].o[p] && c.steps[i].o[p].fx; if(fx){ t.d += fx.d || 0; t.w += fx.w || 0; t.m += fx.m || 0; } }); return t; }
function epBest(c){ return c.steps.map(s => { const i = s.o.findIndex(o => o.g === 2); return i < 0 ? 0 : i; }); }
/* 한 물건의 결과 → 판단 점수 + 최선 경로 대비 시간·돈 + 추정 수익(게임용 근사) */
function epScore(ch, c, picks){
  const Pl = EP_PLAN[ch], got = picks.reduce((s, p, i) => s + c.steps[i].o[p].g, 0), pct = Math.round(got / (c.steps.length * 2) * 100);
  const mine = epTotals(c, picks), best = epTotals(c, epBest(c));
  const dExtra = Math.max(0, mine.d - best.d), wExtra = Math.max(0, mine.w - best.w);
  const profit = Math.round(Pl.base * (0.55 + pct / 100 * 0.6) - wExtra - dExtra * Pl.hold);
  return {id:c.id, pct, d:mine.d, w:mine.w, dBest:best.d, wBest:best.w, dExtra, wExtra, profit};
}
function epEnding(res){
  if(!res.length) return "normal";
  const avg = res.reduce((s, r) => s + r.pct, 0) / res.length, min = Math.min(...res.map(r => r.pct));
  if(avg >= 88 && min >= 70) return "special";
  if(avg >= 70) return "good";
  if(avg >= 45) return "normal";
  return "bad";
}

/* ---------- 화면 상태 ---------- */
let EP = null;   // {ch, i, scr:"chapter"|"intro"|"play"|"recap", step, picks, ord}
function epOpen(ch){
  if(!ch || !EP_PLAN[ch]) return;
  if(typeof cpUnlocked === "function" && !cpUnlocked(ch)){ if(typeof safeAlert === "function") safeAlert(`🔒 ${cpName(cpPrev(ch))}의 엔딩을 보면 열려요.`); return; }
  const R = epOf(ch); if(R.res.length >= EP_PLAN[ch].eps.length) R.res = [];   // 다 끝낸 단계는 처음부터 다시
  EP = {ch, i:R.res.length, scr:"chapter"}; epPaint();
  if(typeof kcSfx === "function") kcSfx("paper");
}
function epClose(){ EP = null; epPaint(); if(typeof renderArena === "function" && typeof page !== "undefined" && page === "arena") try{ renderArena(); }catch(e){} }
function epStartCase(){
  const E = EP, ep = EP_PLAN[E.ch].eps[E.i], c = epCase(ep.c); if(!c) return;
  E.scr = "play"; E.step = 0; E.picks = []; E.ord = c.steps.map(s => epShuffle(s.o.map((_, i) => i)));
  epPaint(); epTop();
}
function epTop(){ const el = document.querySelector("#epRoot .ep-scroll"); if(el) el.scrollTop = 0; }

/* ---------- 그리기 ---------- */
function epFace(ch){ try{ if(typeof LF_CHAR_ART !== "undefined" && LF_CHAR_ART[ch] && typeof lfBlob === "function") return `<img src="${lfBlob(LF_CHAR_ART[ch].face.normal)}" alt="">`; }catch(e){} const C = LF_CHARS.find(x => x.id === ch); return `<span>${C ? C.emo : "👤"}</span>`; }
function epStars(n){ return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n)); }
function epChapterHTML(){
  const E = EP, C = LF_CHARS.find(x => x.id === E.ch), Pl = EP_PLAN[E.ch], R = epOf(E.ch), n = CP_ORDER.indexOf(E.ch) + 1;
  const list = Pl.eps.map((ep, i) => {
    const c = epInfo(ep), r = R.res[i], cur = i === R.res.length;
    return `<li class="ep-li ${r ? "done" : cur ? "cur" : "lock"}"><span class="ep-no">EP ${i + 1}</span><span class="ep-lt"><b>${r || cur ? esc(c.title) : "??? — 앞 에피소드를 끝내면 열려요"}</b><small>${esc(ep.when)}${r || cur ? ` · ${esc(c.cat)} · ${"★".repeat(c.lv)}` : ""}</small></span>${r ? `<em class="ep-pct">${r.pct}점</em>` : cur ? `<em class="ep-now">지금</em>` : `<em>🔒</em>`}</li>`;
  }).join("");
  const got = (cpRec().endings[E.ch]) || {};
  return `<div class="ep-card ep-chapter"><div class="ep-face">${epFace(E.ch)}</div>
    <small class="ep-kick">STAGE ${n} / 6 · ${esc(CP_THEME[E.ch] || "")} · 난이도 ${epStars(Pl.stars)}</small>
    <h2>${esc(C.name)}의 경매 이야기</h2>
    <p class="ep-sub">${C.age}세 · ${esc(C.job)} — “${esc((LF_ECON[E.ch] || {}).quote || "")}”</p>
    <ol class="ep-list">${list}</ol>
    <p class="note">물건 ${Pl.eps.length}개를 차례로 풀면 판단 점수·시간·돈으로 엔딩이 정해져요. 어떤 엔딩이 나와도 다음 단계가 열립니다. <br>모은 엔딩 ${["normal", "good", "bad", "special"].map(t => got[t] ? `<b>${CP_ENDING_T[t]}</b>` : "?").join(" · ")}</p>
    <div class="ep-btns"><button type="button" class="btn pri" data-ep="intro">▶ EP ${R.res.length + 1} 시작</button><button type="button" class="btn" data-ep="close">나가기</button></div></div>`;
}
function epIntroHTML(){
  const E = EP, ep = EP_PLAN[E.ch].eps[E.i], c = epInfo(ep), C = LF_CHARS.find(x => x.id === E.ch);
  return `<div class="ep-card ep-intro"><small class="ep-kick">EPISODE ${E.i + 1} / ${EP_PLAN[E.ch].eps.length} · ${esc(ep.when)}</small>
    <h2>${esc(c.title)}</h2><div class="ep-tags"><span>${esc(c.cat)}</span><span>${"★".repeat(c.lv)}</span></div>
    <div class="ep-mono"><div class="ep-face sm">${epFace(E.ch)}</div><div>${ep.lines.map((l, i) => `<p style="animation-delay:${0.15 + i * 0.5}s">${esc(l)}</p>`).join("")}<small>— ${esc(C.name)}</small></div></div>
    <div class="ep-btns"><button type="button" class="btn pri" data-ep="play">사건 파일 열기 →</button><button type="button" class="btn" data-ep="chapter">← 목록</button></div></div>`;
}
function epPlayHTML(){
  const E = EP, ep = EP_PLAN[E.ch].eps[E.i], c = epCase(ep.c);
  const lab = typeof G_LABEL !== "undefined" ? G_LABEL : ["아쉬운 선택", "괜찮은 선택", "가장 좋은 선택"], col = typeof G_COLOR !== "undefined" ? G_COLOR : ["#c0392b", "#d68910", "#1e8449"];
  const facts = c.facts && c.facts.length ? `<div class="ep-facts">${c.facts.map(f => `<span>${esc(f[0])} <b>${esc(f[1])}</b></span>`).join("")}</div>` : "";
  const art = typeof caseArt === "function" ? (() => { try{ return caseArt(c, "sc-hero"); }catch(e){ return ""; } })() : "";
  const s = c.steps[E.step], pick = E.picks[E.step], reveal = pick !== undefined;
  const opts = E.ord[E.step].map(oi => { const o = s.o[oi], chosen = pick === oi;
    const cls = reveal ? (chosen ? `chosen g${o.g}` : o.g === 2 ? "best" : "dim") : "";
    const fx = reveal && chosen && o.fx ? `<span class="ep-fx"><span>${o.fx.d > 0 ? "+" : ""}${o.fx.d || 0}일</span><span>${o.fx.w > 0 ? "+" : ""}${o.fx.w || 0}만원</span></span>` : "";
    return `<li><button type="button" class="ep-opt ${cls}" data-epick="${oi}" ${reveal ? "disabled" : ""}><span>${esc(o.t)}</span>${reveal && (chosen || o.g === 2) ? `<span class="ep-fb"><b style="color:${col[o.g]}">${chosen ? "내 선택 · " : ""}${lab[o.g]}</b> — ${esc(o.fb)}</span>` : ""}${fx}</button></li>`; }).join("");
  const chat = typeof caseChat === "function" && s.chat ? (() => { try{ return caseChat(s.chat, c); }catch(e){ return ""; } })() : "";
  const doc = typeof caseDoc === "function" && s.doc ? caseDoc(s.doc) : "";
  const last = E.step === c.steps.length - 1;
  const dots = c.steps.map((_, i) => `<i class="${i < E.step || (i === E.step && reveal) ? "on" : i === E.step ? "cur" : ""}"></i>`).join("");
  return `<div class="ep-card ep-play"><div class="ep-bar"><small>STAGE ${CP_ORDER.indexOf(E.ch) + 1} · EP ${E.i + 1} · ${esc(c.title)}</small><span class="ep-dots">${dots}</span><button type="button" class="ep-x" data-ep="chapter" title="목록으로">✕</button></div>
    ${E.step === 0 ? `<div class="ep-setup">${art}<p>${c.setup}</p>${facts}</div>` : ""}
    <div class="ep-scene"><div class="note ep-sno">장면 ${E.step + 1} / ${c.steps.length}</div><p class="ep-stxt">${esc(s.scene)}</p>${chat}${doc}
      <div class="ep-q">${esc(s.q || "당신이라면?")}</div><ul class="ep-opts">${opts}</ul>
      ${reveal && s.o[pick].after ? `<div class="ep-after">➜ ${esc(s.o[pick].after)}</div>` : ""}${reveal && s.why ? `<div class="ep-why">💡 ${esc(s.why)}</div>` : ""}</div>
    ${reveal ? `<div class="ep-btns"><button type="button" class="btn pri" data-ep="${last ? "recap" : "next"}">${last ? "결과 보기 →" : "다음 장면 →"}</button></div>` : ""}</div>`;
}
function epRecapHTML(){
  const E = EP, R = epOf(E.ch), r = R.res[E.i], c = epCase(r.id) || {lesson:r.lesson ? [r.lesson] : [], trap:null}, Pl = EP_PLAN[E.ch], lastEp = E.i === Pl.eps.length - 1;
  const head = r.pct >= 85 ? "깔끔하게 끝냈다" : r.pct >= 60 ? "그럭저럭 넘겼다" : "비싼 수업료를 냈다";
  const tot = R.res.reduce((s, x) => s + x.profit, 0);
  return `<div class="ep-card ep-recap"><small class="ep-kick">EP ${E.i + 1} 결과</small><h2>${head} — ${r.pct}점</h2>
    <div class="ep-stats"><div><small>⏱ 걸린 날</small><b>${r.d}일</b><em>${r.dExtra ? `최선보다 +${r.dExtra}일` : "최선만큼 빨랐다"}</em></div>
      <div><small>💸 쓴 돈</small><b>${kMan(r.w)}</b><em>${r.wExtra ? `최선보다 +${kMan(r.wExtra)}` : "최선만큼 아꼈다"}</em></div>
      <div><small>💰 이번 물건 추정 수익</small><b class="${r.profit >= 0 ? "up" : "down"}">${typeof kcSigned === "function" ? kcSigned(r.profit) : kMan(r.profit)}</b><em>지금까지 ${kMan(tot)}</em></div></div>
    ${c.lesson && c.lesson.length ? `<div class="ep-lesson"><b>📌 이 물건에서 배운 것</b><ul>${c.lesson.map(l => `<li>${esc(l)}</li>`).join("")}</ul>${c.trap ? `<p class="ep-trap">⚠️ ${esc(c.trap)}</p>` : ""}</div>` : ""}
    <p class="note">추정 수익은 게임용 근사치예요 — 판단 점수가 높을수록, 최선 경로보다 날짜·돈을 덜 쓸수록 커집니다.</p>
    <div class="ep-btns">${lastEp ? `<button type="button" class="btn pri" data-ep="end">🎬 엔딩 보기</button>` : `<button type="button" class="btn pri" data-ep="nextep">🏠 방으로 돌아가기 — 다음 에피소드 준비</button>`}</div></div>`;
}
function epPaint(){
  let el = document.getElementById("epRoot");
  if(!EP){ if(el) el.remove(); document.documentElement.classList.remove("ep-on"); return; }
  if(!el){ el = document.createElement("div"); el.id = "epRoot"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "에피소드"); document.body.appendChild(el); }
  document.documentElement.classList.add("ep-on");
  const body = EP.scr === "intro" ? epIntroHTML() : EP.scr === "play" ? epPlayHTML() : EP.scr === "recap" ? epRecapHTML() : epChapterHTML();
  el.className = "ep-root ep-" + EP.scr;
  el.innerHTML = `<div class="ep-veil"></div><div class="ep-scroll">${body}</div>`;
}

/* ---------- 엔딩 ---------- */
function epFinish(){
  const ch = EP.ch, R = epOf(ch), P = cpRec(), type = epEnding(R.res), C = LF_CHARS.find(x => x.id === ch);
  const E = (CP_ENDINGS[ch] || {})[type] || ["엔딩", ""];
  const avg = Math.round(R.res.reduce((s, r) => s + r.pct, 0) / R.res.length);
  const d = R.res.reduce((s, r) => s + r.d, 0), dx = R.res.reduce((s, r) => s + r.dExtra, 0), w = R.res.reduce((s, r) => s + r.w, 0), wx = R.res.reduce((s, r) => s + r.wExtra, 0), profit = R.res.reduce((s, r) => s + r.profit, 0);
  const why = type === "special" ? "네 번 모두 흔들리지 않았어요 — 거의 매번 가장 좋은 선택을 골랐습니다."
    : type === "good" ? "대부분 좋은 판단이었어요. 몇 번 돌아갔지만 크게 잃지 않았습니다."
    : type === "normal" ? "배운 게 많은 시기였어요. 절반쯤은 돌아가는 길을 골랐습니다."
    : "판단이 자주 엇나갔어요. 시간과 돈을 수업료로 냈지만, 다음엔 덜 흔들릴 거예요.";
  const next = cpNext(ch), first = next && !P.unlocked[next];
  P.cleared[ch] = {ending:type, at:Date.now(), via:"ep"};
  (P.endings[ch] = P.endings[ch] || {})[type] = Date.now();
  if(next) P.unlocked[next] = true;
  R.done = (R.done || 0) + 1; R.last = {type, avg, profit};
  if(typeof save === "function") save();
  const sum = {char:ch, type, emo:C.emo, name:C.name, title:E[0], text:E[1], why,
    rows:[["푼 물건", `${R.res.length}건`], ["평균 판단 점수", `${avg}점`], ["걸린 시간", `${d}일${dx ? ` (최선보다 +${dx}일)` : " (최선 그대로)"}`], ["쓴 돈", `${kMan(w)}${wx ? ` (최선보다 +${kMan(wx)})` : ""}`], ["추정 수익", kMan(profit)]]};
  EP = null; epPaint();
  CP_SHOW = {sum, step:"end", next, first, ep:true, finale:!next};
  cpPaint();
  if(typeof kcSfx === "function") kcSfx(type === "bad" ? "warning" : "fanfare");
}

/* ---------- 클릭 ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-ep],[data-epick],[data-epopen]");
  if(!b) return;
  if(b.dataset.epopen){ e.preventDefault(); e.stopImmediatePropagation(); epEnter(b.dataset.epopen); return; }
  if(!EP) return;
  e.preventDefault(); e.stopPropagation();
  const E = EP, a = b.dataset.ep;
  if(b.dataset.epick !== undefined){
    if(E.scr !== "play" || E.picks[E.step] !== undefined) return;
    E.picks[E.step] = +b.dataset.epick; epPaint();
    if(typeof pxSyn === "function") try{ pxSyn("tap"); }catch(_){}
    const c = epCase(EP_PLAN[E.ch].eps[E.i].c), g = c.steps[E.step].o[E.picks[E.step]].g;
    if(typeof kcSfx === "function") kcSfx(g === 2 ? "coin" : g === 1 ? "paper" : "warning");
    return;
  }
  if(a === "close"){ epClose(); return; }
  if(a === "chapter"){ E.scr = "chapter"; epPaint(); epTop(); return; }
  if(a === "intro"){ E.i = epOf(E.ch).res.length; if(E.i >= EP_PLAN[E.ch].eps.length){ epFinish(); return; } if(EP_PLAN[E.ch].eps[E.i].k){ epStartK(E.ch, E.i); return; } E.scr = "intro"; epPaint(); epTop(); return; }
  if(a === "play"){ epStartCase(); return; }
  if(a === "next"){ E.step++; epPaint(); epTop(); return; }
  if(a === "recap"){
    const c = epCase(EP_PLAN[E.ch].eps[E.i].c), R = epOf(E.ch);
    R.res[E.i] = epScore(E.ch, c, E.picks); R.res = R.res.slice(0, E.i + 1);
    if(typeof save === "function") save();
    E.scr = "recap"; epPaint(); epTop();
    if(typeof kcSfx === "function") kcSfx(R.res[E.i].pct >= 60 ? "fanfare" : "warning");
    return;
  }
  if(a === "nextep"){ epHome(E.ch); return; }
  if(a === "end"){ epFinish(); return; }
}, true);
document.addEventListener("keydown", e => { if(EP && e.key === "Escape"){ e.preventDefault(); epClose(); } });

/* 에피소드 엔딩 카드의 버튼 — 캠페인 카드를 그대로 쓰되, "다음 ▶/새 인생"은 다음 단계 에피소드로 잇는다 */
window.addEventListener("click", e => {
  if(!CP_SHOW || !CP_SHOW.ep) return;
  const b = e.target.closest && e.target.closest("[data-cp]"); if(!b) return;
  const a = b.dataset.cp;
  if(a === "go" && CP_SHOW.step === "end" && CP_SHOW.finale){ e.preventDefault(); e.stopImmediatePropagation(); CP_SHOW = null; cpPaint(); crOpen(); return; }
  if(a === "new"){ e.preventDefault(); e.stopImmediatePropagation(); const n = CP_SHOW.next; CP_SHOW = null; cpPaint(); epEnter(n); return; }
  if(a === "career" || a === "menu"){ e.preventDefault(); e.stopImmediatePropagation(); CP_SHOW = null; cpPaint(); if(typeof renderArena === "function") try{ renderArena(); }catch(_){} return; }
}, true);

/* ---------- 인생 고르기 화면에 '에피소드 스토리' 입구 ---------- */
if(typeof lfSelectHTML === "function"){
  const _ep_sel = lfSelectHTML;
  lfSelectHTML = function(){
    let h = _ep_sel();
    const id = LF_PICK || "seoyun";
    if(EP_PLAN[id] && (typeof cpUnlocked !== "function" || cpUnlocked(id))){
      const R = epOf(id), n = EP_PLAN[id].eps.length, doing = R.res.length && R.res.length < n;
      const btn = `<div class="ep-entry"><button type="button" class="btn pri ep-go" data-epopen="${id}">📖 스토리 에피소드 ${doing ? `이어하기 (EP ${R.res.length + 1}/${n})` : `시작 — 물건 ${n}개`}</button><small class="note">STAGE ${CP_ORDER.indexOf(id) + 1} · ${epStars(EP_PLAN[id].stars)} · 물건 ${n}개를 풀면 엔딩 → 다음 단계 해금</small></div>`;
      h = h.replace(/(<button type="button" class="btn pri lf-go")/, btn + "$1");
      if(h.indexOf("ep-entry") < 0) h = h.replace('<div class="lf-select">', '<div class="lf-select">' + btn);
    }
    return h;
  };
}

/* ================= 🎬 엔딩 크레딧 — 6단계까지 다 끝나면 영화처럼 올라간다 ================= */
const CR_ROLES = [["기획·시나리오","쥬루"],["게임 디자인","쥬루"],["프론트엔드","쥬루"],["백엔드·데이터","쥬루"],["캐릭터·배경 디자인","쥬루"],["UI·UX","쥬루"],["음악·효과음","쥬루"],["권리분석 자문","쥬루"],["명도 협상 시나리오","쥬루"],["밸런스·수치 조정","쥬루"],["QA·버그 사냥","쥬루"],["도시락·커피","쥬루"],["총감독","쥬루"]];
const CR_CAST = [["한서윤","STAGE 1 · 입문"],["이도현","STAGE 2 · 시간"],["윤미정","STAGE 3 · 사람"],["박재훈","STAGE 4 · 집"],["최은경","STAGE 5 · 돈"],["김태식","STAGE 6 · 경험"]];
const CR_NOTICE = [
  "이 게임에 나오는 모든 사건·인물·단체·장소는 가상이며, 실제와 비슷한 부분이 있더라도 우연입니다.",
  "게임 속 법률·절차 설명은 일반적인 정보일 뿐 법률 자문이 아닙니다. 실제 사건은 관련 법령과 최신 판례를 확인하고 변호사·법무사 등 전문가와 상담하세요.",
  "숫자(낙찰가·이사비·수익·기간)는 게임 밸런스를 위해 만든 값이며, 실제 결과를 보장하지 않습니다.",
  "점유자와의 협상은 언제나 법이 허용하는 범위 안에서, 상대를 존중하는 방식으로 해 주세요. 위급한 상황에서는 112·119에 먼저 연락하세요.",
  "게임 안에 나오는 기업·상표는 실제 기업과 관계가 없습니다."];
let CR = null;
function crOpen(){
  CR = {t0:Date.now()};
  let el = document.getElementById("crRoll"); if(el) el.remove();
  el = document.createElement("div"); el.id = "crRoll"; el.className = "cr-roll"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "엔딩 크레딧");
  const P = cpRec(), ends = CP_ORDER.map(id => { const c = P.cleared[id]; return c ? CP_ENDING_T[c.ending] + " END" : "진행 전"; });
  el.innerHTML = `<div class="cr-bg"></div><div class="cr-stars"></div><div class="cr-track">
    <div class="cr-title"><small>THE END</small><h1>🏆 경매왕</h1><p>여섯 사람의 경매 이야기</p></div>
    <section><h3>CAST</h3>${CR_CAST.map((c, i) => `<div class="cr-row"><span>${esc(c[1])}</span><b>${esc(c[0])}</b><em>${ends[i]}</em></div>`).join("")}</section>
    <section><h3>STAFF</h3>${CR_ROLES.map(r => `<div class="cr-row"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join("")}</section>
    <section><h3>SPECIAL THANKS</h3><div class="cr-center">끝까지 사정을 들어 준 모든 플레이어<br>그리고 오늘도 서류를 한 번 더 확인하는 당신</div></section>
    <section class="cr-notice"><h3>알려 드립니다</h3>${CR_NOTICE.map(t => `<p>${esc(t)}</p>`).join("")}</section>
    <div class="cr-fin"><p>MADE BY</p><h2>쥬루</h2><small>© ${new Date().getFullYear()} 쥬루. All rights reserved.</small></div>
  </div><button type="button" class="cr-skip" data-crclose>건너뛰기 ›</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("go"));
  crMusic(true);
  clearTimeout(crOpen._t); crOpen._t = setTimeout(() => { const f = el.querySelector(".cr-skip"); if(f){ f.textContent = "처음 화면으로 ›"; f.classList.add("end"); } }, 52000);
}
function crClose(){ CR = null; const el = document.getElementById("crRoll"); if(el) el.remove(); crMusic(false); if(typeof renderArena === "function") try{ renderArena(); }catch(e){} }
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-crclose]")){ e.preventDefault(); e.stopImmediatePropagation(); crClose(); } }, true);
document.addEventListener("keydown", e => { if(CR && e.key === "Escape") crClose(); });

/* 🎵 엔딩 크레딧 곡 — 밝은 장조, 128BPM. 멜로디·베이스·드럼을 WebAudio로 바로 합성한다(음원 파일 없음). */
let CR_M = null;
const CR_SONG = {bpm:128, root:62,   // D
  prog:[[0,"maj"],[7,"maj"],[9,"min"],[5,"maj"],[0,"maj"],[7,"maj"],[5,"maj"],[7,"maj"]],
  mel:[ "7.9.b.9.7...4.5.", "7.7.5.4.2...0...", "4.5.7.9.7.5.4.2.", "4.4.2.0.0...-...",
        "7.9.b.c.b.9.7.4.", "5.7.9.7.5.4.2.0.", "2.4.5.7.9.7.5.4.", "7...9...b...c..." ],
  bass:"1.1.5.1.1.1.5.5.", kick:"1...1...1...1...", snare:"....1.......1...", hat:"1.1.1.1.1.1.1.1." };
const CR_DEG = {"0":0,"1":2,"2":2,"3":4,"4":4,"5":5,"6":7,"7":7,"8":9,"9":9,"a":11,"b":11,"c":12};
function crMusic(on){
  if(CR_M){ CR_M.stop = true; try{ const A = KA, t = A.ac.currentTime; CR_M.g.gain.cancelScheduledValues(t); CR_M.g.gain.setTargetAtTime(0.0001, t, 0.5); }catch(e){} clearInterval(CR_M.timer); const g = CR_M.g; setTimeout(() => { try{ g.disconnect(); }catch(e){} }, 2500); CR_M = null; }
  if(!on) return;
  if(typeof kaCtx !== "function") return;
  try{
    if(typeof KA_UNLOCKED !== "undefined") KA_UNLOCKED = true;
    const A = kaCtx(); if(!A) return; if(A.ac.state === "suspended") A.ac.resume();
    if(typeof kaWant === "function") kaWant(null);
    const g = A.ac.createGain(); g.gain.value = 0.0001; g.connect(A.bgm); g.gain.exponentialRampToValueAtTime(1, A.ac.currentTime + 1.2);
    const M = {g, step:0, next:A.ac.currentTime + 0.1, stop:false};
    M.timer = setInterval(() => {
      if(M.stop) return; const ac = A.ac, sd = 60 / CR_SONG.bpm / 4, horizon = ac.currentTime + 0.35;
      while(M.next < horizon){
        const s = M.step % 16, bar = Math.floor(M.step / 16) % CR_SONG.prog.length, [deg, q] = CR_SONG.prog[bar], chord = KA_Q[q], t = M.next, root = CR_SONG.root + deg;
        const m = CR_SONG.mel[bar][s];
        if(m && m !== "." && m !== "-") kaTone(g, kaHz(CR_SONG.root + 12 + CR_DEG[m]), t, sd * 1.7, "square", 0.075, null, 3200);
        if(m && m !== "." && m !== "-") kaTone(g, kaHz(CR_SONG.root + 24 + CR_DEG[m]), t, sd * 1.2, "triangle", 0.035);
        const bs = CR_SONG.bass[s]; if(bs !== ".") kaTone(g, kaHz(root - 12 + (bs === "5" ? 7 : 0)), t, sd * 1.6, "triangle", 0.22);
        if(s % 4 === 2) chord.forEach(iv => kaTone(g, kaHz(root + 12 + iv), t, sd * 1.2, "square", 0.022, null, 2400));
        if(CR_SONG.kick[s] === "1") kaTone(g, 130, t, 0.15, "sine", 0.34, 45);
        if(CR_SONG.snare[s] === "1"){ kaNoise(g, t, 0.13, 0.12, 1900, 0.7); kaTone(g, 220, t, 0.08, "triangle", 0.08, 160); }
        if(CR_SONG.hat[s] === "1") kaNoise(g, t, 0.035, s % 4 === 2 ? 0.07 : 0.04, 8500, 1, "highpass");
        if(s === 0 && bar === 0 && M.step > 0) kaNoise(g, t, 0.9, 0.05, 6000, 0.6, "highpass");   // 한 바퀴마다 심벌
        M.next += sd; M.step++;
      }
    }, 70);
    CR_M = M;
  }catch(e){}
}
/* 크레딧이 떠 있는 동안엔 다른 BGM이 끼어들지 않게 */
if(typeof kaScene === "function"){ const _cr_scene = kaScene; kaScene = function(){ if(CR) return null; return _cr_scene(); }; }

/* ---------- 🖋️ 구석의 'made by 쥬루' — 첫 화면(홈)에서만 조용히 ---------- */
function mbSync(){
  let el = document.getElementById("madeBy");
  const show = !CR && !EP && typeof page !== "undefined" && (page === "home" || (page === "arena" && typeof arenaTab !== "undefined" && arenaTab === "home"));
  if(!show){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement("div"); el.id = "madeBy"; el.className = "made-by"; el.textContent = "made by 쥬루"; document.body.appendChild(el); }
}
setInterval(mbSync, 600); setTimeout(mbSync, 50);

/* ---------- 🏠 첫 화면 정리 ----------
   ① 맨 위는 '스토리 STAGE n'(아직 안 끝낸 가장 앞 단계) — 예전 세이브의 이도현 인생이 1순위로 떠서
      "1단계도 안 했는데 왜 도현이야?"가 되던 문제. 자유 인생(시뮬레이션)은 그 아래 보조 버튼으로.
   ② CASE 001·002·게시판·이번 주 경매는 '케이스 상자' 하나로 접는다(누르면 목록). */
function epStageNow(){
  const P = cpRec();
  const id = CP_ORDER.find(x => !P.cleared[x]) || null;
  return id;
}
if(typeof homeHTML === "function"){
  const _ep_home = homeHTML;
  homeHTML = function(){
    let h = _ep_home();
    try{
      const id = epStageNow(), P = cpRec();
      let top;
      if(id){
        const C = LF_CHARS.find(x => x.id === id), R = epOf(id), n = EP_PLAN[id].eps.length, doing = R.res.length > 0 && R.res.length < n;
        top = `<button type="button" class="btn pri ep-home" data-epopen="${id}">📖 스토리 STAGE ${CP_ORDER.indexOf(id) + 1} · ${esc(C.name)} <small>${doing ? `EP ${R.res.length + 1}/${n} 이어하기` : `물건 ${n}개 · ${epStars(EP_PLAN[id].stars)}`} · 클리어 ${CP_ORDER.filter(x => P.cleared[x]).length}/6</small></button>`;
      } else {
        top = `<button type="button" class="btn pri ep-home" data-crreplay>🎬 여섯 단계 모두 클리어 <small>엔딩 크레딧 다시 보기 · 스테이지는 인생 고르기에서 다시 할 수 있어요</small></button>`;
      }
      const box = [];
      h = h.replace(/<button type="button" class="btn[^"]*" data-(?:kcnew="career"[^>]*|ofgo="board"|kcnew="weekly")>[\s\S]*?<\/button>/g, m => { box.push(m.replace(/class="btn pri"/, 'class="btn"')); return ""; });
      h = h.replace(/<button type="button" class="btn pri lf-home-go"[^>]*>[\s\S]*?<\/button>/, "");   // 자유 인생 버튼은 없앤다 — 스토리가 곧 인생
      const boxHTML = box.length ? `<details class="kc-box"><summary>🗂️ 케이스 상자 <small>CASE ${box.filter(b => /data-kcnew="career"/.test(b)).length}개 · 게시판 · 이번 주 경매</small></summary><div class="kc-box-in">${box.join("")}</div></details>` : "";
      h = h.replace(/(<div class="kc-menu">)/, `$1${top}`);
      h = h.replace(/(<div class="kc-menu-row">)/, `${boxHTML}$1`);
    }catch(e){}
    return h;
  };
}
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-crreplay]")){ e.preventDefault(); e.stopImmediatePropagation(); crOpen(); } }, true);

/* ================= 🏠 스토리는 '그 사람의 방'에서 진행된다 =================
   스토리를 누르면 그 인물의 인생(방·시간·돈)이 시작되고, 방에 '📱 새 알림 — EP n'이 뜬다.
   · 풀 경매 에피소드(k1·k2): 진짜 한 판(조사→입찰→명도→수리→매도)을 그대로 한다.
   · 사건 에피소드: 방 위에 게임 화면처럼 뜬다(흰 퀴즈 카드가 아니라 어두운 무대 + 주인공 전신).
   한 에피소드가 끝나면 몇 달이 흐르고 방으로 돌아온다. 네 개를 끝내면 엔딩 → 다음 단계. */
const EP_GAP_DAYS = 110;   // 에피소드 사이에 흐르는 시간(네 개면 1년 남짓)
function epStoryLife(ch){ const L = typeof lfRec === "function" ? lfRec() : null; return !!(L && L.story && L.char === ch); }
function epEnter(ch){
  if(!ch || !EP_PLAN[ch]) return;
  if(typeof cpUnlocked === "function" && !cpUnlocked(ch)){ if(typeof safeAlert === "function") safeAlert(`🔒 ${cpName(cpPrev(ch))}의 엔딩을 보면 열려요.`); return; }
  EP = null; epPaint();
  const R = epOf(ch), done = R.res.length >= EP_PLAN[ch].eps.length;
  if(typeof page !== "undefined") page = "arena";
  if(epStoryLife(ch) && !done){
    if(typeof bdRunning === "function" && bdRunning()){ arenaTab = "king"; }
    else { K = null; arenaTab = "life"; LF_SPOT = "laptop"; }
    renderArena(); window.scrollTo(0, 0); return;
  }
  if(done) R.res = [];
  R.pendingK = null;
  const L0 = lfRec(); if(L0 && L0.mode === "career" && typeof cpStashNow === "function") cpStashNow();
  lfNew(ch); const L = lfRec(); L.story = true; L.intro = true; K = null; LF_SPOT = "laptop"; LF_PICK = null;
  if(typeof save === "function") save();
  if(typeof gxOpStart === "function"){ gxOpStart(ch); }
  else { L.intro = false; arenaTab = "life"; renderArena(); }
}
function epHome(ch){
  EP = null; epPaint();
  if(typeof lfAdvance === "function" && lfRec()) lfAdvance(EP_GAP_DAYS * 1440, "story");
  K = null; arenaTab = "life"; LF_SPOT = "laptop";
  if(typeof save === "function") save();
  renderArena(); window.scrollTo(0, 0);
  if(typeof gxBanner === "function") try{ gxBanner("place", {big:"📆 몇 달 뒤", sub:esc(lfClock())}); }catch(e){}
}
function epGo(ch){
  const R = epOf(ch), i = R.res.length, ep = EP_PLAN[ch].eps[i];
  if(!ep){ EP = {ch, i:EP_PLAN[ch].eps.length - 1, scr:"chapter"}; epFinish(); return; }
  if(ep.k){ epStartK(ch, i); return; }
  EP = {ch, i, scr:"intro"}; epPaint();
  if(typeof kcSfx === "function") kcSfx("paper");
}
function epStartK(ch, i){
  EP = null; epPaint();
  const R = epOf(ch), ep = EP_PLAN[ch].eps[i];
  R.pendingK = {i, k:ep.k};
  KC_MODE = "career"; K_PROP_NEXT = ep.k; KC_INTRO = true;
  kStart();
  K.epStory = {ch, i};
  arenaTab = "king"; if(typeof save === "function") save(); renderArena(); window.scrollTo(0, 0);
}
/* 풀 경매가 끝나면(결과·패찰) 화면 아래에 '에피소드 정리' 버튼 */
const EP_GRADE = {S:100, A:85, B:65, C:40, D:25};
function epKDone(){
  if(typeof K === "undefined" || !K || !K.epStory) return null;
  if(K.step === "result" && K.final) return "result";
  if(K.step === "lost") return "lost";
  return null;
}
function epKRecord(){
  const st = K.epStory, R = epOf(st.ch), kind = epKDone(); if(!kind) return;
  let rec;
  if(kind === "result"){
    const g = K.final.grades || {}, vals = Object.values(g).map(x => EP_GRADE[x] != null ? EP_GRADE[x] : 60);
    let pct = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 60;
    if(K.final.profit < 0) pct = Math.min(pct, 50);
    rec = {id:K.prop || KP.id, pct, d:K.day || 0, w:Math.round((K.cost.move || 0) + (K.cost.legal || 0) + (K.cost.repair || 0)), dBest:K.day || 0, wBest:0, dExtra:0, wExtra:0, profit:Math.round(K.final.profit), lesson:K.final.lesson || null, full:true};
  } else {
    rec = {id:K.prop || KP.id, pct:45, d:0, w:0, dBest:0, wBest:0, dExtra:0, wExtra:0, profit:0, lesson:"패찰했다 — 욕심내지 않은 값이면 괜찮다. 경매는 다음 물건이 또 온다.", full:true, lost:true};
  }
  R.res[st.i] = rec; R.res = R.res.slice(0, st.i + 1); R.pendingK = null;
  K.epStory = null;
  if(typeof save === "function") save();
  EP = {ch:st.ch, i:st.i, scr:"recap"}; epPaint();
}
function epKBar(){
  let el = document.getElementById("epKBar");
  const kind = epKDone(), show = kind && typeof page !== "undefined" && page === "arena" && arenaTab === "king" && !EP && !(typeof LN !== "undefined" && LN);
  if(!show){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement("div"); el.id = "epKBar"; el.className = "ep-kbar"; document.body.appendChild(el); }
  const st = K.epStory, h = `<span>📖 STAGE ${CP_ORDER.indexOf(st.ch) + 1} · EP ${st.i + 1} ${kind === "lost" ? "— 패찰" : "끝"}</span><button type="button" class="btn pri" data-epkdone>에피소드 정리하고 방으로 →</button>`;
  if(el.innerHTML !== h) el.innerHTML = h;
}
setInterval(epKBar, 500);
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-epkdone]")){ e.preventDefault(); e.stopImmediatePropagation(); const el = document.getElementById("epKBar"); if(el) el.remove(); epKRecord(); } }, true);
/* 스토리 인생은 1년 갈림길·1년 결산(자유 인생 규칙)을 쓰지 않는다 — 엔딩은 에피소드 네 개가 정한다 */
if(typeof lfPathDue === "function"){ const _ep_pathDue = lfPathDue; lfPathDue = function(){ const L = lfRec(); if(L && L.story) return false; return _ep_pathDue(); }; }
if(typeof cpSettleCheck === "function"){ const _ep_settle = cpSettleCheck; cpSettleCheck = function(){ const L = lfRec(); if(L && L.story) return; return _ep_settle(); }; }

/* ---------- 방 화면: '📱 새 알림 — EP n' ---------- */
if(typeof lfBaseHTML === "function"){
  const _ep_base = lfBaseHTML;
  lfBaseHTML = function(){
    let h = _ep_base();
    try{
      const L = lfRec(); if(!L || !L.story || !EP_PLAN[L.char]) return h;
      const R = epOf(L.char), Pl = EP_PLAN[L.char], i = R.res.length, n = Pl.eps.length;
      let card;
      if(R.pendingK && typeof bdRunning === "function" && bdRunning()) card = `<div class="ep-alert"><small>📖 STAGE ${CP_ORDER.indexOf(L.char) + 1} · EP ${R.pendingK.i + 1} 진행 중</small><b>${esc(epInfo(Pl.eps[R.pendingK.i]).title)}</b><div class="ep-alert-btns"><button type="button" class="btn pri" data-atab="king">▶ 이어하기</button></div></div>`;
      else if(i >= n) card = `<div class="ep-alert end"><small>📖 STAGE ${CP_ORDER.indexOf(L.char) + 1} · 네 물건을 모두 끝냈다</small><b>이 시기를 돌아볼 시간</b><div class="ep-alert-btns"><button type="button" class="btn pri" data-epfin="${L.char}">🎬 엔딩 보기</button></div></div>`;
      else { const ep = Pl.eps[i], c = epInfo(ep);
        card = `<div class="ep-alert"><small>📱 새 알림 · STAGE ${CP_ORDER.indexOf(L.char) + 1} · EP ${i + 1}/${n} · ${esc(ep.when)}</small><b>${esc(c.title)}</b><p>${esc(ep.lines[0])}</p><em>${esc(c.cat)} · ${"★".repeat(c.lv)}</em>
          <div class="ep-alert-btns"><button type="button" class="btn pri" data-epgo="${L.char}">📂 이 물건 보러 가기</button><button type="button" class="btn" data-eplist="${L.char}">📋 에피소드 목록</button></div></div>`; }
      h = h.replace(/(<div class="vn of-stage lf-stage[^"]*">)/, `$1${card}`);
    }catch(e){}
    return h;
  };
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-epgo],[data-eplist],[data-epfin]"); if(!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(b.dataset.epgo) epGo(b.dataset.epgo);
  else if(b.dataset.eplist) epOpen(b.dataset.eplist);
  else if(b.dataset.epfin){ EP = {ch:b.dataset.epfin, i:EP_PLAN[b.dataset.epfin].eps.length - 1, scr:"chapter"}; epFinish(); }
}, true);
/* 사건 에피소드 무대 — 방 그림 위에 주인공 전신을 세운다 */
function epHeroArt(ch){ try{ if(typeof LF_CHAR_ART !== "undefined" && LF_CHAR_ART[ch] && LF_CHAR_ART[ch].front && typeof lfBlob === "function") return lfBlob(LF_CHAR_ART[ch].front); }catch(e){} return null; }
function epBgArt(){ try{ const B = lfBaseInfo(); return typeof vnBgHTML === "function" ? vnBgHTML(B.bg) : ""; }catch(e){ return ""; } }
{
  const _ep_paint = epPaint;
  epPaint = function(){
    _ep_paint();
    const el = document.getElementById("epRoot"); if(!el || !EP) return;
    el.classList.add("ep-world");
    const hero = epHeroArt(EP.ch);
    const bg = document.createElement("div"); bg.className = "ep-bg"; bg.innerHTML = epBgArt(); el.insertBefore(bg, el.firstChild);
    if(hero && EP.scr !== "chapter"){ const im = document.createElement("img"); im.className = "ep-hero" + (EP._hero ? " still" : ""); im.src = hero; im.alt = ""; el.appendChild(im); EP._hero = true; }
  };
}

/* 머리 칩: 스토리 인생이면 CH·ACT 대신 STAGE·EP */
if(typeof cpActChip === "function"){
  const _ep_chip = cpActChip;
  cpActChip = function(){ const L = lfRec(); if(L && L.story && EP_PLAN[L.char]){ const R = epOf(L.char), n = EP_PLAN[L.char].eps.length; return `<span class="cp-act" title="스토리 진행">STAGE ${CP_ORDER.indexOf(L.char) + 1} · EP ${Math.min(n, R.res.length + 1)}/${n}</span>`; } return _ep_chip(); };
}
