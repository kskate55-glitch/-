/* ================= 🗂️ 조사 화면 정리 — 서류는 그림 위에, 행동은 접어서 =================
   오른쪽 패널이 한없이 길어지던 걸 줄인다: 사건 파일·입찰표는 왼쪽 그림 위 종이로 겹쳐 띄우고,
   조사 행동은 묶음별로 접는다. 렌더 뒤 DOM만 옮기므로 계산·클릭 처리(문서 위임)는 그대로다. */
// 📝 내 판단 기록 — 게임에 안 맞는 입력칸이라 뺐다(결과 비교표도 같이)
kcPredInputs = function(){ return ""; };
kcPredTable = function(){ return ""; };
let STG = {seed:null, file:false, grp:{}, fresh:false};
function stgActive(){ return typeof page !== "undefined" && page === "arena" && arenaTab === "king" && K && !K.intro && K.step === "brief" && !K.sealed && !K.revealing; }
function stgGrpKey(t){ return t.replace(/\s+/g, " ").trim().slice(0, 12); }
function stgApply(){
  const root = document.getElementById("kfsRoot"); if(!root || !stgActive()) return;
  const stage = root.querySelector(".kfs-stage"), panel = root.querySelector(".kfs-panel"); if(!stage || !panel) return;
  const nOn = typeof keCards === "function" ? keCards().filter(keHas).length : 0;
  if(STG.seed !== K.seed){ STG = {seed:K.seed, file:false, grp:{}, fresh:false, n:nOn}; }
  if(nOn > (STG.n || 0) && !STG.file) STG.fresh = true;   // 새로 드러난 조사 결과 — 사건 파일을 열 때까지 표시
  STG.n = nOn;
  // 1) 사건 파일 · 입찰표 → 그림 위로
  const kcase = panel.querySelector(".ke-case"), sheet = panel.querySelector(".ke-sheet");
  if(kcase || sheet){
    stage.querySelectorAll(".stg-dock").forEach(x => x.remove());
    const dock = document.createElement("div"); dock.className = "stg-dock";
    const n = typeof keCards === "function" ? keCards().filter(keHas).length : 0, tot = typeof keCards === "function" ? keCards().length : 0;
    const fresh = STG.fresh && !STG.file;
    dock.innerHTML = `<div class="stg-col"><div class="stg-tabs"><button type="button" class="stg-tab ${STG.file ? "on" : ""} ${fresh ? "new" : ""}" data-stg="file" aria-expanded="${STG.file}">📁 사건 파일 <small>조사 ${n}/${tot}</small>${fresh ? `<i>NEW</i>` : ""}</button></div></div>`;
    if(kcase){ const w = document.createElement("div"); w.className = "stg-paper stg-file"; w.hidden = !STG.file; w.innerHTML = `<button type="button" class="stg-x" data-stg="file" aria-label="사건 파일 닫기">✕</button>`; w.appendChild(kcase); dock.appendChild(w); }
    if(sheet){ sheet.classList.add("stg-sheet"); dock.querySelector(".stg-col").appendChild(sheet); }
    stage.appendChild(dock);
  }
  // 2) 조사 행동 묶음 → 접기
  const heads = [...panel.querySelectorAll(":scope > h4.kr-grp")];
  heads.forEach((h, i) => {
    const key = stgGrpKey(h.textContent), site = /현장/.test(h.textContent);
    const want = STG.grp[key] != null ? STG.grp[key] : (K.loc === "site" ? site : !site);
    const d = document.createElement("details"); d.className = "stg-grp"; d.open = !!want; d.dataset.grp = key;
    const s = document.createElement("summary"); s.innerHTML = h.innerHTML;
    let cnt = 0, nx = h.nextElementSibling; const move = [];
    while(nx && !(nx.matches && (nx.matches("h4.kr-grp") || nx.matches(".panel, details.panel")))){ move.push(nx); if(nx.querySelectorAll) cnt += nx.querySelectorAll("[data-kres]:not([disabled])").length; nx = nx.nextElementSibling; }
    if(cnt) s.insertAdjacentHTML("beforeend", ` <small class="stg-cnt">${cnt}</small>`);
    d.appendChild(s); h.replaceWith(d); move.forEach(m => d.appendChild(m));
  });
  // 3) 이번 판 도전 → 접기(진행 상황만 보이게)
  const goals = panel.querySelector(":scope > .kc-goals");
  if(goals && !goals.closest("details")){
    const d = document.createElement("details"); d.className = "panel stg-goals"; d.open = !!STG.grp.__goals;
    const done = goals.querySelectorAll(".done, .ok").length, tot = Math.max(1, (goals.textContent.match(/⬜|✅/g) || []).length);
    d.innerHTML = `<summary>🎯 이번 판 도전 <small>(${done}/${tot})</small></summary>`; goals.replaceWith(d); d.appendChild(goals); goals.classList.remove("panel");
  }
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-stg]"); if(!b || !stgActive()) return;
  STG.file = !STG.file; if(STG.file) STG.fresh = false;
  const dock = document.querySelector(".stg-dock"); if(!dock) return;
  const f = dock.querySelector(".stg-file"); if(f) f.hidden = !STG.file;
  const t = dock.querySelector(".stg-tab"); if(t){ t.classList.toggle("on", STG.file); t.classList.remove("new"); const i = t.querySelector("i"); if(i) i.remove(); t.setAttribute("aria-expanded", STG.file); }
  if(typeof kcSfx === "function") kcSfx("paper");
});
document.addEventListener("toggle", e => { const d = e.target; if(!d || !d.classList) return; if(d.classList.contains("stg-grp")) STG.grp[d.dataset.grp] = d.open; if(d.classList.contains("stg-goals")) STG.grp.__goals = d.open; }, true);
document.addEventListener("keydown", e => { if(e.key === "Escape" && STG.file && stgActive()){ const b = document.querySelector(".stg-x"); if(b) b.click(); } });
const _stg_render = renderArena; renderArena = function(){ _stg_render(); queueMicrotask(stgApply); };
