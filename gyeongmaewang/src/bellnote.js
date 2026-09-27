/* ================= 🔔 알림은 구석 이모티콘 하나로 (v223) =================
   피드백: 왼쪽 아래에 쌓이던 "📖 점유자 도감 등록 — ○○ 씨", "📌 그 밖에 N건 기록됨 — 도감·업적에서 확인" 카드들이
   화면을 가린다 → 구석에 🔔 하나만 두고, 새 소식은 개수 뱃지로. 누르면 최근 소식 목록이 펼쳐진다.
   hubToastShow()만 갈아 끼운다 — 소식을 만드는 쪽(HUB_TOAST에 넣는 코드)은 그대로다. */
let NT_LOG = [], NT_UNREAD = 0;
function ntBell(){
  let b = document.getElementById("ntBell");
  if(!b){ b = document.createElement("button"); b.type = "button"; b.id = "ntBell"; b.className = "nt-bell"; b.setAttribute("aria-label", "새 소식"); document.body.appendChild(b); }
  b.innerHTML = `🔔${NT_UNREAD ? `<b class="nt-n">${NT_UNREAD > 99 ? "99+" : NT_UNREAD}</b>` : ""}`;
  b.hidden = !NT_LOG.length;
  return b;
}
hubToastShow = function(){
  if(typeof HUB_TOAST === "undefined" || !HUB_TOAST.length) return;
  const list = HUB_TOAST.filter(t => t.big).concat(HUB_TOAST.filter(t => !t.big));
  HUB_TOAST = [];
  list.forEach(t => NT_LOG.unshift({t:t.t, big:!!t.big, at:Date.now()}));
  NT_LOG = NT_LOG.slice(0, 30); NT_UNREAD += list.length;
  const b = ntBell(); b.classList.remove("ring"); void b.offsetWidth; b.classList.add("ring");
  const p = document.getElementById("ntPop"); if(p) ntOpen();
};
function ntOpen(){
  let p = document.getElementById("ntPop");
  if(!p){ p = document.createElement("div"); p.id = "ntPop"; p.className = "nt-pop"; document.body.appendChild(p); }
  p.innerHTML = `<div class="nt-h"><b>🔔 새 소식</b><button type="button" class="nt-x" data-ntclose aria-label="닫기">✕</button></div>
    <ul>${NT_LOG.map((x, i) => `<li class="${i < NT_UNREAD ? "new" : ""}${x.big ? " big" : ""}">${esc(x.t)}</li>`).join("") || `<li>아직 없어요</li>`}</ul>
    <div class="nt-acts"><button type="button" class="btn" data-atab="dexall" data-ntclose>📖 도감</button><button type="button" class="btn" data-atab="ach" data-ntclose>🏅 업적</button></div>`;
  NT_UNREAD = 0; ntBell();
}
document.addEventListener("click", e => {
  if(!e.target.closest) return;
  if(e.target.closest("#ntBell")){ e.preventDefault(); const p = document.getElementById("ntPop"); if(p) p.remove(); else ntOpen(); return; }
  if(e.target.closest("[data-ntclose]")){ const p = document.getElementById("ntPop"); if(p) setTimeout(() => p.remove(), 0); return; }
  if(!e.target.closest("#ntPop")){ const p = document.getElementById("ntPop"); if(p) p.remove(); }
}, true);
