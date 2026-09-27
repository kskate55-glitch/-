/* ---------- 🎯 v228 게임만 남기기 ----------
   사용자 요청: "연습실·기록·사무실·업적… 과거의 잔재 같은 칸과 버튼은 다 없애고, 게임 자체에만 집중".
   코드(연습실 화면 등)는 지우지 않고 '들어가는 문'만 닫는다 — 다시 필요하면 FOCUS_HIDE_TABS에서 빼면 된다.
   도감·업적은 🔔 알림 창(bellnote.js)에서만 열린다(v223 요청 — 구석 아이콘 하나로). */
const FOCUS_HIDE_TABS = ["office", "rec", "story", "game", "chat", "sell", "guess", "dex"];
const FOCUS_MENU_HIDE = FOCUS_HIDE_TABS.concat(["dexall", "ach"]);
(function(){
  const css = document.createElement("style");
  css.textContent = `
    #kfsRoot .fr-more, #kfsRoot [data-frall], #kfsRoot .kc-menu-row,
    #kfsRoot .kfs-panel > .hub-grid, #kfsRoot .kfs-panel > .ag-role, #kfsRoot .hub-grid, #kfsRoot h3.ag-role#kcPractice,
    #kfsRoot .hub-practice, #kfsRoot .hub-tabs{display:none!important}
    ${FOCUS_MENU_HIDE.map(t => `.kfs-menu [data-atab="${t}"]`).join(",")}{display:none!important}`;
  (document.head || document.documentElement).appendChild(css);
  // 막힌 탭으로 가는 길(예전 세이브·예전 버튼)은 홈으로 돌린다
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-atab]");
    if(!b || !FOCUS_HIDE_TABS.includes(b.dataset.atab)) return;
    e.preventDefault(); e.stopPropagation();
    arenaTab = "home"; if(typeof renderArena === "function") renderArena();
  }, true);
  if(typeof renderArena === "function"){
    const _r = renderArena;
    renderArena = function(){ if(typeof arenaTab !== "undefined" && FOCUS_HIDE_TABS.includes(arenaTab)) arenaTab = "home"; return _r.apply(this, arguments); };
  }
})();
