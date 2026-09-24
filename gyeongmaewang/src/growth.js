/* ================= 🌱 명도왕 성장 — 스킬 트리 · 점유자 소개 카드 · 결과 집계 연출 =================
   arena.js의 함수를 감싸서(원본은 그대로) 효과를 얹는다. 효과는 언제나 로그에 한 줄로 드러낸다. */
const SK_TREE = [
  {id:"rel", name:"🤝 관계", skills:[
    {id:"talk",   t:"공감 대화",   d:lv=>`방문·문자로 얻는 신뢰 +${lv*15}%`},
    {id:"notice", t:"안내문 장인", d:lv=>`내용증명의 신뢰 손실 −${lv*30}%`}]},
  {id:"law", name:"⚖️ 조사·절차", skills:[
    {id:"survey", t:"탐문 달인",   d:lv=>`점유자 조사 때 버티기 −${lv*4} · 속마음 힌트가 신뢰 ${55-lv*5}부터`},
    {id:"court",  t:"절차 숙련",   d:lv=>`인도명령 결정 ${lv>=3?2:lv>=2?1:0}주 빨라짐${lv===1?" (2단계부터)":""}`}]},
  {id:"money", name:"💸 돈", skills:[
    {id:"calc",   t:"숫자 협상",   d:lv=>`점유자가 원하는 이사비 −${lv*6}%`},
    {id:"fund",   t:"자금 관리",   d:lv=>`매주 이자·관리비 −${lv*8}%`}]}
];
const SK_MAX = 3, SK_GAIN = {S:3, A:2, B:1, C:1, F:0};
function skRec(){ const R = arenaRec(); if(!R.skills) R.skills = {}; if(typeof R.sp !== "number") R.sp = 0; return R; }
function sk(id){ return (skRec().skills[id]||0); }
function skSpent(){ const s = skRec().skills; return Object.values(s).reduce((a,b)=>a+b,0); }
function skFree(){ return skRec().sp - skSpent(); }
function skCanUp(bi, si){ const B = SK_TREE[bi], S = B.skills[si]; if(sk(S.id) >= SK_MAX || skFree() <= 0) return false; return si === 0 || sk(B.skills[0].id) >= 1; }

/* ---- 효과: 원본 함수를 감싼다 ---- */
const _gNeed0 = gNeed;
gNeed = function(P){ return _gNeed0(P) * (1 - 0.06*sk("calc")); };
const _gAct0 = gAct;
gAct = function(id, amt){
  if(!G) return _gAct0(id, amt);
  const P = personaById(G.pid), m0 = G.mood, r0 = G.resist, w0 = G.week, hinted0 = G.hinted;
  const tl = sk("survey");
  // 탐문 달인: 힌트 문턱을 낮추려면 방문 직전에 신뢰를 잠깐 올려 본 뒤 되돌리지 않고, 방문 뒤에 따로 판정한다
  _gAct0(id, amt);
  if(!G) return;
  const notes = [];
  const lvT = sk("talk"), lvN = sk("notice"), lvC = sk("court"), lvF = sk("fund");
  if((id==="visit" || id==="msg") && lvT && G.mood > m0){ const add = Math.round((G.mood - m0) * 0.15 * lvT); if(add){ G.mood = clamp(G.mood + add); notes.push(`공감 대화 → 신뢰 +${add}`); } }
  if(id==="notice" && lvN && G.mood < m0){ const back = Math.round((m0 - G.mood) * 0.3 * lvN); if(back){ G.mood = clamp(G.mood + back); notes.push(`안내문 장인 → 신뢰 손실 ${back} 줄임`); } }
  if(id==="survey" && tl){ G.resist = clamp(G.resist - 4*tl); notes.push(`탐문 달인 → 버티기 −${4*tl}`); }
  if(id==="visit" && tl && !hinted0 && !G.hinted && G.mood >= 55 - tl*5){ G.hinted = true; gLog("sys", `속마음 힌트(탐문 달인): 대략 ${man0(Math.round(gNeed(P)/10)*10 || 0)} 안팎이면 움직일 것 같다.`); }
  if(id==="order" && G.order && lvC >= 2){ const cut = lvC >= 3 ? 2 : 1, nd = Math.max(G.week + 1, G.order.due - cut); if(nd < G.order.due){ notes.push(`절차 숙련 → 결정 ${G.order.due - nd}주 앞당김`); G.order.due = nd; } }
  if(lvF && G.week > w0){ const save = Math.round(P.weekly * 0.08 * lvF * (G.week - w0)); if(save){ G.spent = Math.max(0, G.spent - save); notes.push(`자금 관리 → 이번 주 비용 ${man0(save)} 절약`); } }
  if(notes.length) gLog("sys", "🌱 스킬: " + notes.join(" · "));
};
const _gEnd0 = gEnd;
gEnd = function(P){
  _gEnd0(P);
  const R = skRec(), g = (G.over && G.over.grade) || "F", gain = SK_GAIN[g] || 0;
  R.sp += gain; G.spGain = gain; G.tallyNew = true;
  if(typeof save === "function") save();
};
const _gStart0 = gStart;
gStart = function(pid){ _gStart0(pid); if(G) G.intro = true; };

/* ---- 화면: 스킬 트리 ---- */
function skTreeHTML(){
  const R = skRec(), free = skFree();
  return `<details class="panel sk-tree"${free>0?" open":""}><summary>🌱 협상 스킬 트리 <span class="sk-sp${free>0?" on":""}">남은 포인트 ${free}</span> <small class="note">명도를 끝낼 때마다 S 3 · A 2 · B·C 1점</small></summary>
   <div class="sk-branches">${SK_TREE.map((B,bi)=>`<div class="sk-branch"><b class="sk-bname">${B.name}</b>${B.skills.map((S,si)=>{ const lv = sk(S.id), can = skCanUp(bi,si), locked = si>0 && sk(B.skills[0].id)<1;
      return `<div class="sk-node${lv?" on":""}${locked?" locked":""}"><div class="sk-head"><span>${esc(S.t)}</span><span class="sk-pips">${Array.from({length:SK_MAX},(_,i)=>`<i class="${i<lv?"on":""}"></i>`).join("")}</span></div>
        <div class="note">${lv ? esc(S.d(lv)) : (locked ? `🔒 ${esc(B.skills[0].t)}을(를) 먼저 1단계 이상` : `1단계: ${esc(S.d(1))}`)}</div>
        ${lv && lv<SK_MAX ? `<div class="note sk-next">다음: ${esc(S.d(lv+1))}</div>` : ""}
        <button type="button" class="btn sk-up" data-skup="${bi}:${si}" ${can?"":"disabled"}>${lv>=SK_MAX?"최대":"＋ 올리기"}</button></div>`; }).join("")}</div>`).join("")}</div>
   <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center"><button type="button" class="btn" data-skreset ${skSpent()?"":"disabled"}>포인트 되돌리기</button><span class="note">얻은 포인트 ${R.sp} · 사용 ${skSpent()} — 스킬 효과는 게임 로그에 '🌱 스킬'로 표시돼요</span></div></details>`;
}

/* ---- 화면: 점유자 소개 카드 ---- */
function gIntroHTML(P){
  const T = occType(P.type), idx = typeof STAGES!=="undefined" ? STAGES.indexOf(P.id) : -1;
  const face = artNpc(P.id, "normal");
  return `<div class="gi-card" data-gintro role="dialog" aria-label="점유자 소개"><div class="gi-inner">
    <span class="gi-stage">${idx>=0?`STAGE ${idx+1}`:"자유 플레이"}</span>
    ${face?`<img class="gi-face" src="${face}" alt="">`:`<div class="gi-face vec">${avatarHTML(P,96)}</div>`}
    <h3 class="gi-name">${esc(P.name)}</h3><div class="gi-type">${esc(T.name)} · ${esc(P.who)}</div>
    <div class="gi-chips"><span>⚖️ ${esc(P.legal)}</span><span>💸 매주 ${man0(P.weekly)}</span><span>🎯 목표 ${man0(P.par)} 이하</span></div>
    ${P.style?`<p class="gi-style">“${esc(P.style)}”</p>`:""}
    <span class="gi-go">▶ 눌러서 시작</span></div></div>`;
}

/* ---- 화면: 결과 집계 ---- */
function gTallyHTML(P){
  const anim = !!G.tallyNew, w = G.week, c = Math.round(gTotal()), par = P.par, pct = Math.round(c / Math.max(1,par) * 100);
  const row = (i, label, v, unit, cls) => `<div class="gt-row" style="animation-delay:${anim?i*0.45:0}s"><span>${label}</span><b class="${cls||""}" data-count="${v}" data-unit="${unit}">${anim?0:v.toLocaleString()}${anim?"":unit}</b></div>`;
  return `<div class="panel gt${anim?" anim":""}">${row(0,"📅 걸린 기간", w, "주")}${row(1,"💸 총비용", c, "만원")}${row(2,"🎯 목표 대비", pct, "%", pct<=100?"good":pct<=130?"":"bad")}
    ${G.spGain?`<div class="gt-row gt-sp" style="animation-delay:${anim?1.5:0}s"><span>🌱 스킬 포인트</span><b>+${G.spGain}</b></div>`:""}</div>`;
}
function gTallyRun(){
  if(!G || !G.tallyNew) return;
  G.tallyNew = false;
  const els = document.querySelectorAll(".gt [data-count]"); if(!els.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  els.forEach((el,i)=>{ const v = +el.dataset.count, u = el.dataset.unit, delay = i*450, dur = 700;
    if(reduce){ el.textContent = v.toLocaleString() + u; return; }
    const t0 = performance.now() + delay;
    const step = now => { if(!document.body.contains(el)) return; const k = Math.max(0, Math.min(1, (now - t0)/dur)); el.textContent = Math.round(v * (1 - Math.pow(1-k,3))).toLocaleString() + u; if(k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step); });
}

/* ---- 끼워 넣기 ---- */
const _gameHTML0 = gameHTML;
gameHTML = function(){
  let h = _gameHTML0();
  if(!G) return h.replace('<p class="lead">', skTreeHTML() + '<p class="lead">');
  const P = personaById(G.pid);
  if(G.over){
    const i = h.indexOf('<div class="panel" style="padding:14px 16px;margin-top:10px"><b>돌아보기');
    if(G.over.win && i > 0) h = h.slice(0,i) + gTallyHTML(P) + h.slice(i);
    else if(i > 0 && G.spGain) h = h.slice(0,i) + gTallyHTML(P) + h.slice(i);
    if(G.tallyNew) h = h.replace('class="panel ag-end"', 'class="panel ag-end gt-stamp"');
    return h;
  }
  if(G.intro && G.week === 0) h = h.replace('<div class="vn-box', gIntroHTML(P) + '<div class="vn-box');
  return h;
};
const _vnType0 = vnType;
vnType = function(){ _vnType0(); gTallyRun(); };
document.addEventListener("click", e => {
  let b;
  if((b = e.target.closest("[data-skup]"))){ const [bi,si] = b.dataset.skup.split(":").map(Number); if(skCanUp(bi,si)){ const R = skRec(), id = SK_TREE[bi].skills[si].id; R.skills[id] = (R.skills[id]||0) + 1; if(typeof save==="function") save(); renderArena(); } return; }
  if(e.target.closest("[data-skreset]")){ skRec().skills = {}; if(typeof save==="function") save(); renderArena(); return; }
  if(e.target.closest("[data-gintro]") && G){ e.stopPropagation(); G.intro = false; renderArena(); return; }
}, true);
