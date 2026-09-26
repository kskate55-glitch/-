/* ================= 🗂️ 사건 파일 ↔ 입찰표 — 겹치지 않게, 주인공·말풍선도 가리지 않게 =================
   예전엔 넓은 화면에서도 사건 파일이 입찰표 자리(오른쪽 칸)에 그대로 덮여 떠서, 파일을 열면 입찰표가 사라졌다.
   넓은 화면에서 입찰표가 떠 있으면 사건 파일은 '가운데 빈 곳'에 띄운다:
     왼쪽 경계 = 주인공 그림 오른쪽 끝, 오른쪽 경계 = 입찰표 칸 왼쪽, 위 = 대사창 아래, 아래 = 조사하기 바 위.
   위쪽 손잡이를 잡고 끌면 옮겨지고(자리 기억), 손잡이를 두 번 누르면 제자리로 돌아간다.
   조사 노트와 겹치면 마지막으로 누른 쪽이 앞으로 온다. 좁은 화면은 예전 그대로(한 장씩). */
const STGM_KEY = "stg_file_pos";
function stgmOn(){ return typeof stgActive === "function" && stgActive() && window.innerWidth >= 1100; }
function stgmBox(stage){
  const sr = stage.getBoundingClientRect(), col = stage.querySelector(".stg-col"), sheet = col && col.querySelector(".stg-sheet");
  if(!col || !sheet || !sheet.getBoundingClientRect().width) return null;
  const cr = col.getBoundingClientRect(), pl = stage.querySelector(".vn-player:not(.lfv-hide), .lfv-pose"), box = stage.querySelector(".vn-box"), bar = stage.querySelector(".nx-dock");
  const L = pl ? pl.getBoundingClientRect().right - sr.left + 10 : sr.width * 0.26;
  const R = cr.left - sr.left - 10;
  const T = box ? Math.max(12, box.getBoundingClientRect().bottom - sr.top + 10) : 72;
  let B = sr.height - 14; if(bar){ const br = bar.getBoundingClientRect(); if(br.height && br.top - sr.top > T + 200) B = br.top - sr.top - 10; }
  return {sr, L, R, T, B};
}
function stgmPlace(){
  const root = document.getElementById("kfsRoot"), stage = root && root.querySelector(".kfs-stage"), dock = stage && stage.querySelector(".stg-dock");
  const f = dock && dock.querySelector(".stg-file");
  if(!f) return;
  const g = stgmOn() ? stgmBox(stage) : null;
  if(!g || g.R - g.L < 340){ dock.classList.remove("stg-mid"); f.classList.remove("stg-mid-file"); ["left","top","width","height"].forEach(k => f.style.removeProperty(k)); return; }
  dock.classList.add("stg-mid"); f.classList.add("stg-mid-file");
  if(!f.querySelector(".stg-grip")) f.insertAdjacentHTML("afterbegin", `<div class="stg-grip" title="끌어서 옮기기 · 두 번 누르면 제자리">⠿ 잡고 끌면 옮겨져요</div>`);
  const w = Math.min(470, g.R - g.L), h = Math.max(240, g.B - g.T);
  let x = g.R - w, y = g.T;   // 기본: 입찰표 바로 왼쪽에 붙인다 — 주인공 쪽 공간은 최대한 비워 둔다
  let P = null; try{ P = JSON.parse(localStorage.getItem(STGM_KEY) || "null"); }catch(e){}
  if(P && isFinite(P.x) && isFinite(P.y)){ x = P.x * g.sr.width; y = P.y * g.sr.height; }
  x = Math.max(6, Math.min(g.sr.width - w - 6, x)); y = Math.max(6, Math.min(g.sr.height - 160, y));
  f.style.left = Math.round(x) + "px"; f.style.top = Math.round(y) + "px"; f.style.width = Math.round(w) + "px";
  f.style.height = Math.round(Math.min(h, g.sr.height - y - 10)) + "px";
}
function stgmSoon(){ queueMicrotask(() => queueMicrotask(() => queueMicrotask(stgmPlace))); requestAnimationFrame(stgmPlace); }
if(typeof renderArena === "function"){ const _stgm_render = renderArena; renderArena = function(){ _stgm_render(); stgmSoon(); }; }
window.addEventListener("resize", () => { if(document.querySelector(".stg-dock")) stgmPlace(); });
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-stg]")) setTimeout(() => { stgmPlace(); const d = document.querySelector("#kfsRoot .stg-dock"); if(d) d.classList.toggle("stg-front", !!(typeof STG !== "undefined" && STG.file)); }, 0); });
// 앞으로 가져오기: 파일을 누르면 파일이, 노트를 누르면 노트가 위로
document.addEventListener("pointerdown", e => {
  if(!e.target.closest) return;
  const dock = document.querySelector("#kfsRoot .stg-dock.stg-mid"); if(!dock) return;
  if(e.target.closest(".stg-mid-file")) dock.classList.add("stg-front");
  else if(e.target.closest(".nx-notepaper")) dock.classList.remove("stg-front");
}, true);
// 끌어서 옮기기
(function(){
  let D = null;
  document.addEventListener("pointerdown", e => {
    const g = e.target.closest && e.target.closest(".stg-mid-file .stg-grip"); if(!g) return;
    const f = g.closest(".stg-file"), stage = f.closest(".kfs-stage"); if(!stage) return;
    e.preventDefault(); const sr = stage.getBoundingClientRect(), fr = f.getBoundingClientRect();
    D = {f, sr, dx:e.clientX - fr.left, dy:e.clientY - fr.top, x:null, y:null}; f.classList.add("dragging");
    try{ g.setPointerCapture(e.pointerId); }catch(_){}
  });
  document.addEventListener("pointermove", e => {
    if(!D) return;
    const w = D.f.offsetWidth; let x = e.clientX - D.sr.left - D.dx, y = e.clientY - D.sr.top - D.dy;
    x = Math.max(6, Math.min(D.sr.width - w - 6, x)); y = Math.max(6, Math.min(D.sr.height - 160, y));
    D.f.style.left = Math.round(x) + "px"; D.f.style.top = Math.round(y) + "px"; D.x = x; D.y = y;
    D.f.style.height = Math.round(Math.min(parseFloat(D.f.style.height) || 400, D.sr.height - y - 10)) + "px";
  });
  const end = () => { if(!D) return; D.f.classList.remove("dragging"); if(D.x != null){ try{ localStorage.setItem(STGM_KEY, JSON.stringify({x:D.x / D.sr.width, y:D.y / D.sr.height})); }catch(_){} } D = null; stgmPlace(); };
  document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
  document.addEventListener("dblclick", e => { if(!(e.target.closest && e.target.closest(".stg-mid-file .stg-grip"))) return; try{ localStorage.removeItem(STGM_KEY); }catch(_){} stgmPlace(); });
})();
