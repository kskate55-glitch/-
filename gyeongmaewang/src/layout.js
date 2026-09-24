/* ================= 🖥️ 전체 화면 게임 레이아웃 — 페이지 스크롤 없이 한 화면에 (프린세스메이커식) =================
   경매왕 한 판·홈 화면을 화면 전체를 덮는 '게임 창'으로 띄운다.
   왼쪽(모바일은 위) = 무대 그림, 오른쪽(모바일은 아래) = 커맨드 패널(여기만 안쪽 스크롤).
   마크업은 그대로 두고 렌더가 끝난 뒤 노드만 옮긴다 — 클릭은 전부 document 위임이라 그대로 동작한다. */
let KFS_SCROLL = {key:"", top:0};
function kfsWanted(){ return typeof page !== "undefined" && page === "arena" && (arenaTab === "home" || (arenaTab === "king" && !!K) || (arenaTab === "story" && typeof ST !== "undefined" && !!ST) || (arenaTab === "game" && typeof G !== "undefined" && !!G)); }
function kfsOff(){ const r = document.getElementById("kfsRoot"); if(r) r.remove(); document.documentElement.classList.remove("kfs-on"); }
function kfsHeader(){
  const c = kcRec(), p = hubRec(), L = hubLevel(p.xp);
  let mid = `🏆 <b>경매왕</b> <span class="kfs-sub">LV.${L.lv} · 보유 ${kMan(c.cash)}</span>`;
  if(arenaTab === "king" && K){
    const n = String((KP && KP.no) || 1).padStart(3, "0"), stepName = {brief:"조사", won:"낙찰", lost:"패찰", cross:"갈림길", move:"명도", defect:"하자", list:"호가", sell:"매도", result:"결과"}[K.step] || "";
    mid = `📁 <b>CASE ${n}</b> <span class="kfs-sub">${K.mode==="weekly"?"이번 주 경매 · ":""}${stepName}${K.step!=="brief"?` · DAY ${K.day}`:""}${K.mode==="career"?(()=>{ const v = K.cashStart - (typeof keSpent==="function" ? keSpent() : 0); return v >= 0 ? ` · 보유 ${kMan(v)}` : ` · 대출 ${kMan(-v)}`; })():""}</span>`;
  }
  if(arenaTab === "story") mid = `🎬 <b>스토리</b>`;
  if(arenaTab === "game") mid = `🎮 <b>명도왕</b> <span class="kfs-sub">연습실</span>`;
  return `<div class="kfs-head"><button type="button" class="kfs-btn" data-atab="home" title="홈">🏠</button><div class="kfs-title">${mid}</div>
    <div class="kfs-tools">${kcSfxBtn()}<button type="button" class="kfs-btn" data-kfsmenu title="메뉴">☰</button></div></div>
    <div class="kfs-menu" hidden><button type="button" data-atab="home">🏠 홈</button><button type="button" data-atab="king">🏆 경매왕</button><button type="button" data-atab="rec">📊 기록</button><button type="button" data-atab="story">🎬 스토리</button><button type="button" data-atab="dexall">📖 도감</button><button type="button" data-atab="ach">🏅 업적</button><button type="button" data-atab="game">🧪 연습실</button><button type="button" data-kfsexit>↩ 게임 창 닫기</button></div>`;
}
function kfsBuild(){
  const main = document.getElementById("main"); if(!main) return;
  const sec = main.querySelector("section.page"); if(!sec) return;
  kfsOff();
  const root = document.createElement("div"); root.id = "kfsRoot"; root.setAttribute("role", "application"); root.setAttribute("aria-label", "경매왕 게임 화면");
  root.innerHTML = kfsHeader() + `<div class="kfs-body"><div class="kfs-stage"></div><div class="kfs-panel" tabindex="-1"></div></div>`;
  const stageBox = root.querySelector(".kfs-stage"), panel = root.querySelector(".kfs-panel");
  // 페이지 머리말·탭 줄·원래 소리 버튼은 게임 창 머리로 대신한다
  sec.querySelectorAll(":scope > .eyebrow, :scope > h2, :scope > .hub-tabs, .kc-topbar").forEach(n => n.remove());
  const stage = sec.querySelector(".kc-title, .vn.k-stage, .kc-intro, .ke-open, .vn");
  const nodes = [...sec.childNodes];
  if(stage && !stage.matches(".kc-intro, .ke-open")){
    stageBox.appendChild(stage);
    nodes.forEach(n => { if(n !== stage) panel.appendChild(n); });
    root.classList.add("split"); if(arenaTab === "home") root.classList.add("home");
  } else {
    root.classList.add("solo");
    nodes.forEach(n => panel.appendChild(n));
  }
  // 무대에 딸린 소리 버튼(홈 타이틀 안)은 머리에 이미 있으니 치운다
  stageBox.querySelectorAll(".kc-audio").forEach(n => n.remove());
  document.body.appendChild(root);
  document.documentElement.classList.add("kfs-on");
  // 같은 장면에서 버튼을 눌러 다시 그려져도 패널 스크롤 위치를 지킨다
  const key = arenaTab + "|" + (K ? K.seed + "|" + K.step + "|" + !!K.sealed + "|" + !!K.revealing + "|" + !!K.intro : "");
  panel.scrollTop = key === KFS_SCROLL.key ? KFS_SCROLL.top : 0;
  KFS_SCROLL.key = key;
  panel.addEventListener("scroll", () => { KFS_SCROLL.top = panel.scrollTop; }, {passive:true});
}
const _kfs_render = renderArena;
renderArena = function(){
  _kfs_render();
  if(kfsWanted()) kfsBuild(); else kfsOff();
};
document.addEventListener("click", e => {
  const root = document.getElementById("kfsRoot"); if(!root) return;
  if(e.target.closest("[data-kfsmenu]")){ const m = root.querySelector(".kfs-menu"); if(m) m.hidden = !m.hidden; return; }
  if(e.target.closest("[data-kfsexit]")){ kfsOff(); arenaTab = "rec"; renderArena(); window.scrollTo(0,0); return; }
  const m = root.querySelector(".kfs-menu"); if(m && !m.hidden && !e.target.closest(".kfs-menu")) m.hidden = true;
});
// 다른 페이지(노트·퀴즈 등)로 가면 게임 창을 걷는다
setInterval(() => { if(document.getElementById("kfsRoot") && !kfsWanted()) kfsOff(); }, 400);
