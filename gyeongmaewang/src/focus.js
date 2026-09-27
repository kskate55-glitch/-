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
/* ---------- v229 레벨·명성 카드는 구석 버튼으로, 빈 오른쪽 칸은 없앤다 ----------
   홈 화면 오른쪽 칸에 '경매인 LV·명성' 카드 하나만 남고 아래가 통째로 까맣게 비어 있었다.
   → 카드를 머리줄의 작은 🏅 버튼(누르면 뜸)으로 옮기고, 오른쪽 칸에 볼 게 없으면 칸 자체를 접어 그림이 꽉 차게 한다. */
function fxTidy(){
  const root = document.getElementById("kfsRoot"); if(!root) return;
  const panel = root.querySelector(".kfs-panel");
  if(panel) panel.querySelectorAll(":scope > .hub-me").forEach(x => x.remove());
  // v230: 자기 자신이 숨겨진 칸만 뺀다 — 부모(접힌 sf-slim 칸) 때문에 안 보이는 상황판을 빈 칸으로 오해해 통째로 숨기던 버그
  const visible = panel ? [...panel.children].filter(el => !el.classList.contains("hub-me") && getComputedStyle(el).display !== "none" && ((el.textContent || "").trim().length || el.querySelector("img,button,svg,canvas"))) : [];
  root.classList.toggle("fx-nopanel", !!panel && visible.length === 0);
  // v230: 사건 소개처럼 무대(stage)가 텅 빈 화면 — 위쪽 빈 검은 띠를 없앤다
  const stage = root.querySelector(".kfs-stage");
  const stageEmpty = !!stage && !stage.querySelector("img,svg,canvas,video,button") && !(stage.textContent || "").trim();
  root.classList.toggle("fx-nostage", stageEmpty && !root.classList.contains("fx-nopanel"));
  const tools = root.querySelector(".kfs-head .kfs-tools");
  if(tools && typeof hubBar === "function" && !tools.querySelector("[data-fxlv]")){
    let lv = ""; try{ lv = "LV." + hubLevel(hubRec().xp).lv; }catch(e){}
    const b = document.createElement("button"); b.type = "button"; b.className = "kfs-btn fx-lv"; b.dataset.fxlv = "1"; b.title = "경매인 레벨·명성"; b.textContent = "🏅 " + lv;
    tools.insertBefore(b, tools.firstChild);
  }
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-fxlv]");
  const pop = document.getElementById("fxLvPop");
  if(b){ e.preventDefault(); e.stopPropagation();
    if(pop){ pop.remove(); return; }
    const p = document.createElement("div"); p.id = "fxLvPop"; p.className = "fx-lv-pop"; p.innerHTML = hubBar();
    document.body.appendChild(p);
    const r = b.getBoundingClientRect(), w = p.offsetWidth;
    p.style.top = (r.bottom + 8) + "px"; p.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px";
    return; }
}, true);
// 바깥을 누르면 닫는다 — 다른 버튼이 클릭 전파를 막아도 닫히도록 pointerdown 단계에서
window.addEventListener("pointerdown", e => {
  const pop = document.getElementById("fxLvPop"); if(!pop) return;
  if(e.target.closest && (e.target.closest("#fxLvPop") || e.target.closest("[data-fxlv]"))) return;
  pop.remove();
}, true);
if(typeof renderArena === "function"){
  const _r2 = renderArena;
  renderArena = function(){ const out = _r2.apply(this, arguments); try{ fxTidy(); setTimeout(fxTidy, 0); }catch(e){} const pop = document.getElementById("fxLvPop"); if(pop) pop.remove(); return out; };
}
(function(){
  const css = document.createElement("style");
  css.textContent = `
    #kfsRoot.fx-nopanel .kfs-panel{display:none!important}
    #kfsRoot.fx-nopanel .kfs-body{grid-template-columns:1fr!important;grid-template-rows:minmax(0,1fr)!important}
    #kfsRoot.fx-nostage .kfs-stage{display:none!important}
    #kfsRoot.fx-nostage .kfs-body{grid-template-columns:1fr!important;grid-template-rows:minmax(0,1fr)!important}
    /* v230: 사건 소개의 '사건번호 열기' 버튼 — 늦게 떠서 없는 줄 알았다. 바로 보이게 */
    .kc-intro .kc-open{animation-delay:.5s!important;font-size:18px;padding:14px 28px;min-height:54px;box-shadow:0 6px 20px rgba(0,0,0,.35)}
    #kfsRoot .kfs-head .fx-lv{font-weight:800;white-space:nowrap;width:auto!important;min-width:0;padding:0 12px!important;margin-right:6px;flex:0 0 auto;border-radius:999px}
    .fx-lv-pop{position:fixed;z-index:2147481000;width:min(420px,calc(100vw - 16px));box-shadow:0 12px 32px rgba(0,0,0,.45);border-radius:14px}
    .fx-lv-pop .hub-me{margin:0}`;
  (document.head || document.documentElement).appendChild(css);
})();
