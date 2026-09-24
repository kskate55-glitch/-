/* ================= 🏠 하나의 게임으로 묶기 — 공용 레벨 · 공용 업적 · 공용 도감 3종 · 메인 화면 =================
   경매왕이 본게임, 명도왕·협상·매도·시세는 '연습실'. 어느 모드를 해도 경험치·명성이 쌓인다. */
const HUB_XP = {
  king:{S:120, A:90, B:65, C:40, F:20}, mdo:{S:70, A:55, B:40, C:25, F:10}, story:{true:50, hidden:60, good:35, bad:15}};
const HUB_REP = {
  king:{S:50, A:35, B:25, C:15, F:5}, mdo:{S:20, A:15, B:10, C:5, F:0}, story:{true:10, hidden:15, good:8, bad:3}};
const HUB_TITLES = [[1,"경매 새내기"],[3,"현장 좀 다녀본 사람"],[5,"명도 해본 사람"],[8,"동네 경매인"],[12,"숨은 고수"],[16,"경매왕 후보"],[20,"경매왕"]];
const HUB_UNLOCK = [[0,"초보 물건"],[100,"중급 물건"],[300,"특수 점유자"],[600,"고난도 물건"],[1000,"악몽 사건"]];
function hubRec(){ const R = arenaRec(); if(!R.player) R.player = {xp:0, rep:0, cleared:{}, ends:{}, met:{}, events:{}, ach:{}, modes:{}}; const p = R.player; ["cleared","ends","met","events","ach","modes"].forEach(k=>{ if(!p[k]) p[k] = {}; }); return p; }
function hubNeed(lv){ return 100 + (lv - 1) * 40; }
function hubLevel(xp){ let lv = 1, left = xp; while(left >= hubNeed(lv) && lv < 99){ left -= hubNeed(lv); lv++; } return {lv, cur:left, need:hubNeed(lv)}; }
function hubTitle(lv){ let t = HUB_TITLES[0][1]; for(const [l, n] of HUB_TITLES) if(lv >= l) t = n; return t; }
let HUB_TOAST = [];
function hubAward(xp, rep, why){
  const p = hubRec(), before = hubLevel(p.xp).lv;
  p.xp += Math.round(xp); p.rep += Math.round(rep);
  const after = hubLevel(p.xp).lv;
  HUB_TOAST.push({t:`✨ ${why} · +${Math.round(xp)} XP${rep?` · 명성 +${Math.round(rep)}`:""}`});
  if(after > before) HUB_TOAST.push({t:`🎉 경매인 LV.${after} — ${hubTitle(after)}`, big:true});
  hubCheck();
  if(typeof save==="function") save();
}

/* ---------- 도감 데이터 ---------- */
function hubOccList(){ return PERSONAS.filter(P => roleOf(P)==="occupant"); }
function hubMeet(pid){ if(!pid) return; const p = hubRec(); if(!p.met[pid]){ p.met[pid] = Date.now(); if(personaById(pid)) HUB_TOAST.push({t:`📖 점유자 도감 등록 — ${personaById(pid).name}`}); } }
const HUB_EVENTS = (()=>{
  const ev = (typeof G_CARDS!=="undefined" ? G_CARDS : []).filter(c=>c.id!=="crisis").map(c=>({id:"g:"+c.id, t:c.t, where:"명도"}));
  const k = [{id:"k:elec", t:"⚡ 차단기 테이프의 정체(누전)", where:"수리"}, {id:"k:fee", t:"🧾 낙찰자에게 온 체납관리비", where:"잔금"},
    {id:"k:flip", t:"💸 이삿날 \"50만 더\"", where:"명도"}, {id:"k:cancel", t:"😱 계약 직전 대출 부족", where:"매도"}];
  (typeof K_EVENTS!=="undefined" ? K_EVENTS : []).forEach((e,i)=>k.push({id:"k:ev"+i, t:e.t.split("—")[0].trim(), where:"수리"}));
  return ev.concat(k);
})();
function hubSee(id){ const p = hubRec(); if(!p.events[id] && HUB_EVENTS.find(e=>e.id===id)){ p.events[id] = Date.now(); const e = HUB_EVENTS.find(x=>x.id===id); HUB_TOAST.push({t:`📜 사건 도감 등록 — ${e.t}`}); } }
const HUB_PROPS = [
  {id:"k1", t:"서울 오래된 빌라", stars:1, rep:0},
  {id:"k2", t:"은평구 투룸 — 멈출 줄 아는 사람", stars:2, rep:0}, {id:"k3", t:"반지하의 냄새", stars:2, rep:100},
  {id:"k4", t:"신축은 안전하다?", stars:3, rep:300}, {id:"k5", t:"내 집인데 왜 나가?", stars:3, rep:300},
  {id:"k6", t:"누구랑 협상해야 하지?", stars:4, rep:600}, {id:"k7", t:"월세방 세 개", stars:4, rep:600},
  {id:"k8", t:"싸게 받은 이유", stars:4, rep:600}, {id:"k9", t:"1억 차익?", stars:5, rep:1000}, {id:"k10", t:"경매왕", stars:5, rep:1000}];

/* ---------- 공용 업적 (일부는 숨김 ???) ---------- */
const HUB_ACH = [
  {id:"lv5", ic:"🎓", t:"명도 해본 사람", d:"경매인 LV.5 달성", ok:p=>hubLevel(p.xp).lv >= 5},
  {id:"lv10", ic:"🎖️", t:"동네 경매인", d:"경매인 LV.10 달성", ok:p=>hubLevel(p.xp).lv >= 10},
  {id:"triple", ic:"👑", t:"삼관왕", d:"경매왕·명도왕·스토리를 모두 한 번 이상 끝냄", ok:p=>p.modes.king && p.modes.mdo && p.modes.story},
  {id:"end10", ic:"🎬", t:"엔딩 수집가", d:"스토리 엔딩 10개", ok:p=>Object.keys(p.ends).length >= 10},
  {id:"end36", ic:"📚", t:"이야기꾼", d:"스토리 엔딩 36개", ok:p=>Object.keys(p.ends).length >= 36},
  {id:"met9", ic:"📖", t:"사람 보는 눈", d:"점유자 절반 이상 만남", ok:p=>Object.keys(p.met).length >= Math.ceil(hubOccList().length/2)},
  {id:"ev10", ic:"📜", t:"별일 다 겪어 봄", d:"사건 도감 10종", ok:p=>Object.keys(p.events).length >= 10},
  {id:"rep100", ic:"🏅", t:"소문난 새내기", d:"명성 100 — 중급 물건 해금", ok:p=>p.rep >= 100},
  {id:"end72", ic:"🌟", t:"모든 이야기의 끝", d:"스토리 엔딩 72개 전부", hidden:true, ok:p=>Object.keys(p.ends).length >= 72},
  {id:"firstbad", ic:"🥀", t:"그럴 수도 있지", d:"처음으로 BAD 엔딩을 봄", hidden:true, ok:p=>p.firstBad},
  {id:"illegal", ic:"🚓", t:"하면 안 되는 건 안 된다", d:"불법 자력구제로 실패해 봄", hidden:true, ok:p=>p.illegal},
  {id:"allmet", ic:"🗂️", t:"도감 완성", d:"점유자 전원 만남", hidden:true, ok:p=>Object.keys(p.met).length >= hubOccList().length}];
function hubCheck(){ const p = hubRec(); for(const a of HUB_ACH) if(!p.ach[a.id] && a.ok(p)){ p.ach[a.id] = Date.now(); HUB_TOAST.push({t:`🏆 업적 달성 — ${a.ic} ${a.t}`, big:true}); } }
// 예전 기록에서 한 번 채워 넣기(이미 플레이한 사람의 도감·엔딩이 비어 보이지 않게)
function hubBackfill(){
  const p = hubRec(), R = arenaRec(); if(p.backfilled) return; p.backfilled = true;
  Object.keys(R.best||{}).forEach(pid => { p.met[pid] = p.met[pid] || 1; p.modes.mdo = 1; });
  Object.keys(R.chats||{}).forEach(pid => { if(personaById(pid) && roleOf(personaById(pid))==="occupant") p.met[pid] = p.met[pid] || 1; });
  const E = R.endings || {}; Object.entries(E).forEach(([ep, ends]) => { const EP = STORY_EPS.find(x=>x.id===ep); if(EP && EP.pid) p.met[EP.pid] = p.met[EP.pid] || 1; Object.keys(ends).forEach(e => { p.ends[ep+":"+e] = 1; p.modes.story = 1; }); });
  if(R.king && R.king.plays){ p.modes.king = 1; p.met.p_grandpa = p.met.p_grandpa || 1; }
  HUB_TOAST = []; hubCheck(); HUB_TOAST = [];
}

/* ---------- 모드에 끼워 넣기(원본은 그대로 감싼다) ---------- */
const _hub_gStart = gStart; gStart = function(pid){ _hub_gStart(pid); if(G) hubMeet(G.pid); };
const _hub_gCardPick = gCardPick; gCardPick = function(i){ const id = G && G.card && G.card.id; _hub_gCardPick(i); if(id) hubSee("g:"+id); };
const _hub_gEnd = gEnd; gEnd = function(P){
  _hub_gEnd(P);
  const p = hubRec(), g = (G.over && G.over.grade) || "F", first = !p.cleared["mdo:"+P.id];
  if(G.over && !G.over.win && /자력구제/.test(G.over.why||"")) p.illegal = true;
  if(G.over && G.over.win){ p.cleared["mdo:"+P.id] = 1; p.modes.mdo = 1; }
  const k = first ? 1 : 0.3;
  hubAward(HUB_XP.mdo[g]*k, HUB_REP.mdo[g]*k, `명도왕 ${g}등급${first?"":" (재도전)"}`);
};
const _hub_stStart = stStart; stStart = function(id){ _hub_stStart(id); if(ST){ const E = STORY_EPS.find(e=>e.id===id); if(E) hubMeet(E.pid); } };
const _hub_stRun = stRun; stRun = function(){
  const before = ST && ST.end; _hub_stRun();
  if(!ST || before || !ST.end) return;
  const E = stEp(), en = E && E.endings[ST.end]; if(!en) return;
  const p = hubRec(), key = E.id + ":" + ST.end; p.modes.story = 1;
  if(en.grade==="bad") p.firstBad = true;
  if(p.ends[key]){ hubCheck(); return; }         // 같은 엔딩은 한 번만 경험치
  p.ends[key] = Date.now();
  hubAward(HUB_XP.story[en.grade]||20, HUB_REP.story[en.grade]||5, `스토리 ${({true:"TRUE",hidden:"HIDDEN",good:"GOOD",bad:"BAD"})[en.grade]} 엔딩`);
};
const _hub_kStart = kStart; kStart = function(seed){ _hub_kStart(seed); hubMeet(KP.occ.pid); };
const _hub_kBid = kBid; kBid = function(amt){ _hub_kBid(amt); if(K && K.step==="lost") hubAward(HUB_XP.king.F, HUB_REP.king.F, "경매왕 패찰 — 경험은 남는다"); };
const _hub_kFinish = kFinish; kFinish = function(){
  _hub_kFinish();
  const p = hubRec(); p.modes.king = 1; p.cleared["king:"+KP.id] = 1;
  (K.defects||[]).forEach(d => { if(/^⚡/.test(d.t)) hubSee("k:elec"); else if(/^🧾/.test(d.t)) hubSee("k:fee"); else { const i = K_EVENTS.findIndex(e=>e.t===d.t); if(i>=0) hubSee("k:ev"+i); } });
  if(K.found && K.found.fee) hubSee("k:fee");
  (K.events||[]).forEach(e => { if(/50만원 더/.test(e)) hubSee("k:flip"); if(/파기/.test(e)) hubSee("k:cancel"); });
  const sc = {S:4, A:3, B:2, C:1}, gs = Object.values(K.final.grades), avg = gs.reduce((a,g)=>a+(sc[g]||1),0)/gs.length;
  const g = avg >= 3.5 ? "S" : avg >= 2.75 ? "A" : avg >= 2 ? "B" : "C"; K.final.overall = g;
  hubAward(HUB_XP.king[g], HUB_REP.king[g], `경매왕 종합 ${g}`);
};
const _hub_chat = typeof chatSend==="function" ? chatSend : null;

/* ---------- 화면 ---------- */
function hubBar(){
  const p = hubRec(), L = hubLevel(p.xp), nextU = HUB_UNLOCK.find(u => u[0] > p.rep);
  return `<div class="hub-me"><div class="hub-lv"><small>경매인</small><b>LV.${L.lv}</b></div><div class="hub-xp"><div class="hub-title">${hubTitle(L.lv)}</div><div class="hub-xpbar"><i style="width:${Math.round(L.cur/L.need*100)}%"></i></div><small>${L.cur} / ${L.need} XP</small></div>
    <div class="hub-rep"><small>명성</small><b>${p.rep}</b><small>${nextU?`${nextU[0]-p.rep} 더 모으면 ${nextU[1]}`:"모든 등급 해금"}</small></div></div>`;
}
function homeHTML(){
  hubBackfill();
  const p = hubRec(), occ = hubOccList(), ends = STORY_EPS.reduce((n,E)=>n+Object.keys(E.endings).length,0);
  const allAch = HUB_ACH.length + Object.keys(K_ACH).length + BADGES.length, gotAch = Object.keys(p.ach).length + Object.keys(kRec().ach).length + Object.keys(arenaRec().badges||{}).length;
  const running = K && K.step && K.step!=="result" && K.step!=="lost";
  return `<div class="vn-title hub-hero">${vnBgHTML("bg_villa_night")}<div><h3>🏆 경매왕</h3><p>물건을 찾고, 사람을 읽고, 위험을 계산해서 — 마지막에 얼마가 남았나.</p>
     <div class="tt-btns">${running?`<button type="button" class="btn pri" data-atab="king">▶ 이어하기 (${K.day}일째)</button>`:""}<button type="button" class="btn ${running?"":"pri"}" data-hubnew>🆕 새 게임</button></div></div></div>
   ${hubBar()}
   <div class="hub-grid">
     <button type="button" class="panel hub-tile" data-atab="dexall"><span class="hub-ic">📖</span><b>도감</b><small>점유자 ${Object.keys(p.met).length}/${occ.length} · 사건 ${Object.keys(p.events).length}/${HUB_EVENTS.length} · 물건 ${Object.keys(p.cleared).filter(k=>k.startsWith("king:")).length}/${HUB_PROPS.length}</small></button>
     <button type="button" class="panel hub-tile" data-atab="ach"><span class="hub-ic">🏅</span><b>업적</b><small>${gotAch} / ${allAch}</small></button>
     <button type="button" class="panel hub-tile" data-atab="story"><span class="hub-ic">🎬</span><b>스토리</b><small>엔딩 ${Object.keys(p.ends).length} / ${ends}</small></button></div>
   <h3 class="ag-role">🧪 연습실 <small class="note">본게임 전에 감 잡기 — 여기서도 경험치가 쌓여요</small></h3>
   <div class="hub-grid sm">
     <button type="button" class="panel hub-tile" data-atab="game"><span class="hub-ic">🎮</span><b>명도왕</b><small>점유자 한 명과 주 단위 명도</small></button>
     <button type="button" class="panel hub-tile" data-atab="chat"><span class="hub-ic">💬</span><b>협상 연습</b><small>AI 점유자·중개사와 대화</small></button>
     <button type="button" class="panel hub-tile" data-atab="sell"><span class="hub-ic">🏷️</span><b>매도 연습</b><small>호가 정하기</small></button>
     <button type="button" class="panel hub-tile" data-atab="guess"><span class="hub-ic">🎯</span><b>시세 맞히기</b><small>실제 과거 거래로</small></button></div>`;
}
let DEX_SUB = "occ", DEX_SPOIL = false;
function dexAllHTML(){
  hubBackfill();
  const p = hubRec(), occ = hubOccList();
  const sub = `<div class="seg rtabs hub-sub" role="tablist"><button type="button" data-dexsub="occ" aria-pressed="${DEX_SUB==="occ"}">👤 점유자 ${Object.keys(p.met).length}/${occ.length}</button><button type="button" data-dexsub="ev" aria-pressed="${DEX_SUB==="ev"}">📜 사건 ${Object.keys(p.events).length}/${HUB_EVENTS.length}</button><button type="button" data-dexsub="prop" aria-pressed="${DEX_SUB==="prop"}">🏠 물건 ${Object.keys(p.cleared).filter(k=>k.startsWith("king:")).length}/${HUB_PROPS.length}</button></div>`;
  let body = "";
  if(DEX_SUB==="occ"){
    body = `<div class="dex-grid">${occ.map(P => { const on = p.met[P.id] || DEX_SPOIL, face = on && artNpc(P.id, "normal"), T = occType(P.type), cl = p.cleared["mdo:"+P.id];
      return `<div class="panel dex-card ${p.met[P.id]?"":"off"}">${on ? (face?`<img src="${face}" alt="">`:avatarHTML(P,64)) : `<span class="dex-q">?</span>`}<b>${on?esc(P.name):"???"}</b><small>${on?esc(T.name):"아직 만나지 않음"}</small>${cl?'<span class="dex-clear">명도 완료</span>':""}</div>`; }).join("")}</div>
      <label class="note" style="display:block;margin:8px 0"><input type="checkbox" data-dexspoil ${DEX_SPOIL?"checked":""}> 🔓 안 만난 사람도 보기 (공부용)</label>
      <details class="panel vn-more"><summary>📘 유형별 공략 노트</summary>${dexHTML()}</details>`;
  }
  if(DEX_SUB==="ev"){
    const by = {}; HUB_EVENTS.forEach(e => (by[e.where] = by[e.where]||[]).push(e));
    body = Object.entries(by).map(([w, list]) => `<h3 class="ag-role">${w} <small class="note">${list.filter(e=>p.events[e.id]).length}/${list.length}</small></h3><div class="dex-evs">${list.map(e => p.events[e.id] ? `<span class="dex-ev on">${esc(e.t)}</span>` : `<span class="dex-ev">??? <small>아직 만나지 않은 사건</small></span>`).join("")}</div>`).join("");
  }
  if(DEX_SUB==="prop"){
    body = `<div class="dex-grid wide">${HUB_PROPS.map(pr => { const open = p.rep >= pr.rep, done = p.cleared["king:"+pr.id], ready = typeof K_PROPS !== "undefined" && !!K_PROPS[pr.id];
      return `<div class="panel dex-prop ${open?"":"off"}"><span class="dex-stars">${"★".repeat(pr.stars)}${"☆".repeat(5-pr.stars)}</span><b>${open?esc(pr.t):"???"}</b><small>${!open?`명성 ${pr.rep} 필요`:done?"✅ 클리어":ready?"도전 가능":"🔨 제작 중"}</small></div>`; }).join("")}</div>`;
  }
  return `<p class="lead">만난 사람, 겪은 사건, 끝낸 물건이 여기에 모여요. <b>???</b>는 아직 못 본 것 — 다른 선택을 하면 열려요.</p>${sub}${body}`;
}
function achHTML(){
  hubBackfill();
  const p = hubRec(), kA = kRec().ach, bA = arenaRec().badges || {};
  const card = (on, ic, t, d, hidden) => `<span class="ag-badge ${on?"":"off"}">${on||!hidden?`${ic} ${esc(t)}<small>${esc(d)}</small>`:`❔ ???<small>숨겨진 업적</small>`}</span>`;
  return `<p class="lead">어느 모드에서 얻든 여기 모여요. <b>???</b>는 숨겨진 업적이에요.</p>
   <h3 class="ag-role">🌐 공용 <small class="note">${HUB_ACH.filter(a=>p.ach[a.id]).length}/${HUB_ACH.length}</small></h3><div class="ag-badgewall">${HUB_ACH.map(a=>card(p.ach[a.id], a.ic, a.t, a.d, a.hidden)).join("")}</div>
   <h3 class="ag-role">🏆 경매왕 <small class="note">${Object.keys(kA).length}/${Object.keys(K_ACH).length}</small></h3><div class="ag-badgewall">${Object.entries(K_ACH).map(([id,a])=>card(kA[id], a[0], a[1], a[2])).join("")}</div>
   <h3 class="ag-role">🎮 명도왕 <small class="note">${Object.keys(bA).length}/${BADGES.length}</small></h3><div class="ag-badgewall">${BADGES.map(b=>card(bA[b[0]], "", b[1], b[2])).join("")}</div>`;
}
/* 탭 줄 새로: 본게임 줄 + 연습실 줄 */
function hubTabs(){
  const b = (id, t) => `<button type="button" data-atab="${id}" aria-pressed="${arenaTab===id}">${t}</button>`;
  return `<div class="hub-tabs"><div class="seg rtabs hub-main" role="tablist" aria-label="경매왕 메뉴">${b("home","🏠 홈")}${b("king","🏆 경매왕")}${b("story","🎬 스토리")}${b("dexall","📖 도감")}${b("ach","🏅 업적")}</div>
   <div class="hub-practice"><span>🧪 연습실</span>${b("game","🎮 명도왕")}${b("chat","💬 협상")}${b("sell","🏷️ 매도")}${b("guess","🎯 시세")}${b("dex","📘 공략노트")}${b("art","🎨 그림")}</div></div>`;
}
const HUB_H2 = {home:"경매왕", dexall:"도감", ach:"업적"};
const _hub_render = renderArena;
renderArena = function(){
  if(page!=="arena") return;
  if(["home","dexall","ach"].includes(arenaTab)){
    const body = arenaTab==="home" ? homeHTML() : arenaTab==="dexall" ? dexAllHTML() : achHTML();
    $("#main").innerHTML = `<section class="page"><div class="eyebrow">경매 RPG</div><h2 style="font-size:26px;margin-top:4px">${HUB_H2[arenaTab]}</h2>${hubTabs()}${body}</section>`;
  } else {
    _hub_render();
    const old = document.querySelector("#main .rtabs:not(.hub-sub)"); if(old && !old.closest(".hub-tabs")) old.outerHTML = hubTabs();
  }
  hubToastShow();
};
function hubToastShow(){
  if(!HUB_TOAST.length) return;
  let box = document.getElementById("hubToasts"); if(!box){ box = document.createElement("div"); box.id = "hubToasts"; box.setAttribute("aria-live","polite"); document.body.appendChild(box); }
  // 한 번에 너무 많이 뜨면 정신없다 — 큰 소식 먼저 3개까지, 나머지는 한 줄로 묶는다
  let list = HUB_TOAST.filter(t=>t.big).concat(HUB_TOAST.filter(t=>!t.big));
  if(list.length > 3){ const rest = list.length - 2; list = list.slice(0, 2).concat([{t:`📌 그 밖에 ${rest}건 기록됨 — 도감·업적에서 확인`}]); }
  list.forEach((t,i) => { const el = document.createElement("div"); el.className = "hub-toast" + (t.big?" big":""); el.textContent = t.t; el.style.animationDelay = (i*0.25) + "s"; box.appendChild(el); setTimeout(()=>el.remove(), 4800 + i*250); });
  HUB_TOAST = [];
}
arenaTab = "home";
document.addEventListener("click", e => {
  if(page!=="arena") return;
  let b;
  if(e.target.closest("[data-hubnew]")){ arenaTab = "king"; kStart(); renderArena(); window.scrollTo(0,0); return; }
  if((b = e.target.closest("[data-dexsub]"))){ DEX_SUB = b.dataset.dexsub; renderArena(); return; }
});
document.addEventListener("change", e => { if(e.target.matches && e.target.matches("[data-dexspoil]")){ DEX_SPOIL = e.target.checked; renderArena(); } });
