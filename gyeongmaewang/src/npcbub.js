/* ================= 💬 명도대상자 대사 = 그 사람 가슴 옆 말풍선 =================
   예전엔 상대 대사가 무대 맨 위 어두운 대사창에 떠서, 이름표(분홍)가 상단바 밑으로 잘리고
   한 줄짜리 대사에도 파란 칸이 크게 자리를 차지했다. 이제 상대가 무대에 서 있으면
   그 사람 가슴 높이 옆에 흰 말풍선으로 띄운다(오른쪽에 자리가 없으면 가슴팍 위에 걸친다).
   나레이션(상대 이름 없는 줄)은 맨 위 칸 그대로 두되, 무대 안으로 내리고 높이는 글 길이만큼만. */
function npbPlace(){
  document.querySelectorAll(".k-stage").forEach(st => {
    const box = st.querySelector(":scope > .vn-box"), spr = st.querySelector(":scope > .vn-sprite:not(.lfv-pose)");
    if(!box) return;
    // 조사 단계(사건 파일·입찰표가 떠 있는 판)는 예전 맨 위 칸 그대로 — 말풍선이 입찰표 밑에 깔리고 파일 자리를 밀어낸다
    const busy = st.querySelector(".stg-dock") || (typeof K !== "undefined" && K && K.step === "brief");
    const talk = !busy && spr && box.querySelector(".vn-name") && !box.classList.contains("narr");
    box.classList.toggle("vn-npcbub", !!talk);
    if(!talk){ ["left","top","width","right"].forEach(k => box.style.removeProperty(k)); box.classList.remove("npb-over"); return; }
    const sr = st.getBoundingClientRect(), r = spr.getBoundingClientRect();
    if(!r.width || !sr.width) return;
    const sprL = r.left - sr.left, sprR = r.right - sr.left, sprT = r.top - sr.top, sprH = Math.min(r.height, sr.height - sprT);
    const chest = sprT + sprH * 0.26;                        // 가슴 높이
    const W = Math.min(360, sr.width - 24);
    let left, over = false;
    if(sr.width - (sprR - sprW(r) * 0.18) - 12 >= Math.min(W, 250)){ left = sprR - sprW(r) * 0.18; }   // 오른쪽 옆
    else { left = Math.max(12, Math.min(sr.width - W - 12, sprL + sprW(r) * 0.32)); over = true; }       // 가슴팍 위
    const w = Math.min(W, sr.width - left - 12);
    box.style.left = Math.round(left) + "px"; box.style.width = Math.round(w) + "px"; box.style.right = "auto";
    box.style.top = Math.round(Math.max(12, Math.min(sr.height - 140, chest))) + "px";
    box.classList.toggle("npb-over", over);
  });
}
function sprW(r){ return r.width; }
if(typeof renderArena === "function"){ const _npb_render = renderArena; renderArena = function(){ _npb_render(); queueMicrotask(npbPlace); requestAnimationFrame(npbPlace); }; }
window.addEventListener("resize", npbPlace);
document.addEventListener("load", e => { if(e.target && e.target.classList && e.target.classList.contains("vn-sprite")) npbPlace(); }, true);
