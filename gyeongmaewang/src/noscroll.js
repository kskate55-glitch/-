/* ================= 🖥️ 한 화면 게임 — 조사 행동을 그림 위로 =================
   오른쪽 패널에 세로로 쌓이던 "집·전화로 / 집 컴퓨터로 / 현장에서 / 조사 노트"를 대사창 아래
   그림의 빈 자리에 버튼 줄로 올린다. 누르면 그 묶음의 행동 목록이 그림 위 카드로 뜬다.
   패널에는 상태(체력·시간·시세 감)만 남겨 스크롤 없이 한 화면에 들어가게 한다.
   렌더 뒤 DOM만 옮기므로 계산·클릭 처리(문서 위임)는 그대로다. */
let NX = {note:false};
function nxShort(sum){
  const t = sum.cloneNode(true); t.querySelectorAll("small").forEach(s => s.remove());
  const full = t.textContent.replace(/\s+/g, " ").trim(), [head, sub] = full.split(" — ");
  const cnt = sum.querySelector(".stg-cnt"), m = full.match(/\((\d+)\)/);
  return {head:head.replace(/\s*\(\d+\)\s*$/, "").replace("집·전화로", "집·전화").replace("집 컴퓨터로", "집 컴퓨터"), sub:sub || "", n:cnt ? cnt.textContent : (m ? m[1] : "")};
}
function nxApply(){
  if(typeof stgActive !== "function" || !stgActive()) return;
  const root = document.getElementById("kfsRoot"); if(!root) return;
  const stage = root.querySelector(".kfs-stage"), panel = root.querySelector(".kfs-panel"); if(!stage || !panel) return;
  const grps = [...panel.querySelectorAll(":scope > details.stg-grp")]; if(!grps.length) return;
  const note = panel.querySelector(":scope > details.vn-more");
  const quit = panel.querySelector("[data-kquit]");
  stage.querySelectorAll(".nx-dock").forEach(x => x.remove());
  const dock = document.createElement("div"); dock.className = "nx-dock";
  const bar = document.createElement("div"); bar.className = "nx-bar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "조사 행동");
  const items = note ? grps.concat([note]) : grps;
  items.forEach(d => {
    const sum = d.querySelector(":scope > summary"); if(!sum) return;
    const s = nxShort(sum), isNote = d === note;
    if(isNote){ d.classList.add("nx-note"); d.open = !!NX.note; }
    const pop = document.createElement("div"); pop.className = "nx-pop";
    pop.innerHTML = `<div class="nx-pop-h"><b>${esc(s.head)}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ""}<button type="button" class="nx-x" aria-label="닫기">✕</button></div>`;
    [...d.children].filter(c => c !== sum).forEach(c => pop.appendChild(c));
    d.appendChild(pop);
    const sh = s.head.replace("집·전화", "전화").replace("집 컴퓨터", "컴퓨터").replace("현장에서", "현장").replace("조사 노트", "");
    sum.innerHTML = `<span class="nx-t">${esc(s.head)}</span><span class="nx-ts">${esc(sh)}</span>${s.n ? `<small class="nx-n">${esc(s.n)}</small>` : ""}`;
    sum.title = s.sub ? `${s.head} — ${s.sub}` : s.head;
    d.classList.add("nx-grp"); d.classList.remove("panel");
    bar.appendChild(d);
  });
  if(quit && !nxMobile()){ const box = quit.parentElement; quit.classList.add("nx-quit"); quit.innerHTML = `<span class="nx-t">그만두기</span><span class="nx-ts" aria-hidden="true">⏏</span>`; quit.setAttribute("aria-label", "그만두기"); quit.title = "그만두기"; bar.appendChild(quit); if(box && !box.children.length) box.remove(); }
  dock.appendChild(bar);
  if(nxMobile()){ dock.classList.add("mob"); panel.insertBefore(dock, panel.firstChild); }   // 좁은 화면: 그림 위가 입찰표로 꽉 차서, 패널 맨 위 한 줄로
  else stage.appendChild(dock);
  nxPlace();
}
// 대사창 바로 아래에 붙인다(대사창 높이는 대사마다 다르다)
function nxMobile(){ return window.matchMedia && matchMedia("(max-width:640px)").matches; }
function nxPlace(){
  const mob = document.querySelector("#kfsRoot .nx-dock.mob");
  if(mob){   // 버튼 줄 위(= 그림 자리)까지만 덮는다 — 다른 묶음으로 바로 옮겨 갈 수 있게
    const h = document.querySelector("#kfsRoot .kfs-head"), want = h ? Math.round(h.getBoundingClientRect().bottom) + 6 : 66;
    const bt = Math.round(mob.getBoundingClientRect().top), room = Math.max(180, (bt > want + 120 ? bt : innerHeight) - want - 8);
    // position:fixed 의 기준이 조상 상자일 수 있다 — 실제 위치를 재서 보정
    let cb = 0; const op = mob.querySelector(".nx-grp[open] .nx-pop");
    if(op){ cb = Math.round(op.getBoundingClientRect().top - (parseFloat(getComputedStyle(op).top) || 0)); }
    else { const pr = document.querySelector("#kfsRoot .kfs-body"); cb = pr && getComputedStyle(pr).transform !== "none" ? Math.round(pr.getBoundingClientRect().top) : 0; }
    mob.style.setProperty("--nx-top", (want - cb) + "px"); mob.style.setProperty("--nx-room", room + "px"); return; }
  const stage = document.querySelector("#kfsRoot .kfs-stage"), dock = stage && stage.querySelector(".nx-dock"); if(!dock) return;
  const box = stage.querySelector(".vn-box"), sr = stage.getBoundingClientRect();
  let top = 12;
  if(box){ const br = box.getBoundingClientRect(); if(br.bottom < sr.top + sr.height * 0.6) top = Math.round(br.bottom - sr.top + 10); }
  dock.style.top = top + "px";
  dock.style.setProperty("--nx-room", Math.max(160, Math.round(sr.height - top - 70)) + "px");
}
let NX_MOB = null;
window.addEventListener("resize", () => { if(!document.querySelector(".nx-dock")) return; const m = nxMobile(); if(NX_MOB !== null && m !== NX_MOB && typeof renderArena === "function"){ NX_MOB = m; renderArena(); return; } NX_MOB = m; nxPlace(); });
// 하나 열면 나머지는 닫힌다 · ✕ · 바깥 누르면 닫힘 · Esc
function nxCloseAll(except){
  document.querySelectorAll(".nx-bar > details[open]").forEach(o => { if(o === except) return; o.open = false; if(o.classList.contains("nx-note")) NX.note = false; else if(typeof STG !== "undefined") STG.grp[o.dataset.grp] = false; });
}
document.addEventListener("click", e => {
  const t = e.target; if(!t.closest) return;
  const x = t.closest(".nx-x"); if(x){ e.preventDefault(); nxCloseAll(null); return; }
  const sm = t.closest(".nx-bar > details > summary");
  if(sm){ const d = sm.parentElement; if(!d.open){ nxCloseAll(d); setTimeout(nxPlace, 0); } if(d.classList.contains("nx-note")) setTimeout(() => { NX.note = d.open; }, 0); return; }
  if(!t.closest(".nx-dock") && document.querySelector(".nx-bar > details[open]") && (t.closest(".kfs-stage") || t.closest(".kfs-panel"))) nxCloseAll(null);
}, true);
document.addEventListener("keydown", e => { if(e.key === "Escape" && document.querySelector(".nx-bar > details[open]")) nxCloseAll(null); });
const _nx_render = renderArena; renderArena = function(){ _nx_render(); queueMicrotask(() => queueMicrotask(nxApply)); };
