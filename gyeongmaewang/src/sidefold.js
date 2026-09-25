/* ================= 📋 조사 화면 오른쪽 칸 접기 (PC) =================
   조사(brief) 단계에서 오른쪽 칸은 상태 정보(도전·날짜·날씨·남은 시간·체력·연차·시세 감)뿐인데
   화면 1/3을 차지해서, 입찰표·사건 파일·행동 메뉴가 그림 위에서 서로 겹쳤다.
   → 머리줄 오른쪽에 작은 '상황판' 알약 하나로 접고, 누르면 그 칸이 드롭다운으로 열린다.
   → 그림 칸이 화면 전체를 쓰고, 입찰표·사건 파일은 오른쪽 한 줄(탭)로 겹치지 않게 번갈아 보인다.
   모바일(900px 이하)은 원래 배치 그대로. DOM은 옮기지 않고 클래스만 바꾼다(클릭 처리는 문서 위임 그대로). */
let SF = {open:false};
function sfOn(){ return typeof stgActive === "function" && stgActive() && window.matchMedia && matchMedia("(min-width: 901px)").matches; }
function sfSummary(panel){
  const left = panel.querySelector(".kr-left"), low = left && left.classList.contains("low");
  const goals = panel.querySelector(".stg-goals summary small");
  const wx = panel.querySelector(".sn-chip");
  const wxIc = wx ? ((wx.textContent.match(/[☀🌤⛅☁🌧🌦⛈🌨❄🥶🥵☔🌫]️?/u) || [""])[0]) : "";
  const act = !!panel.querySelector("[data-lfnext], [data-lfleave]");
  const bits = [];
  if(left) bits.push(`<span class="sf-time ${low ? "low" : ""}">⏱ ${left.textContent.trim()}</span>`);
  if(K && K.lf && typeof lfRec === "function"){ const L = lfRec(); if(L && L.st) bits.push(`<span class="${L.sta / L.st.stamina < 0.3 ? "sf-low" : ""}">⚡ ${Math.round(L.sta)}</span>`); }
  if(wxIc) bits.push(`<span>${wxIc}</span>`);
  if(goals) bits.push(`<span>🎯 ${goals.textContent.replace(/[()]/g, "").trim()}</span>`);
  return {html: bits.join(""), alert: low || (act && low), act};
}
function sfApply(){
  const root = document.getElementById("kfsRoot");
  if(!root) return;
  const on = sfOn();
  root.classList.toggle("sf-slim", on);
  root.querySelectorAll(".sf-pill").forEach(x => x.remove());
  if(!on){ root.classList.remove("sf-open"); return; }
  const panel = root.querySelector(".kfs-panel"), tools = root.querySelector(".kfs-tools"); if(!panel || !tools) return;
  const S = sfSummary(panel);
  const b = document.createElement("button"); b.type = "button"; b.className = "sf-pill" + (S.alert ? " alert" : ""); b.dataset.sfside = "";
  b.setAttribute("aria-expanded", SF.open); b.title = "상황판 — 도전·날씨·남은 시간" + (S.act ? "·다음 날/연차" : "") + " 보기";
  b.innerHTML = `<b>📋 상황판</b>${S.html}${S.act ? `<i class="sf-dot" title="누를 수 있는 버튼이 있어요"></i>` : ""}<span class="sf-car">${SF.open ? "▲" : "▼"}</span>`;
  tools.prepend(b);
  root.classList.toggle("sf-open", SF.open);
  const dock = root.querySelector(".stg-dock"); if(dock) dock.classList.toggle("sf-file", !!(typeof STG !== "undefined" && STG.file));
}
document.addEventListener("click", e => {
  const root = document.getElementById("kfsRoot"); if(!root || !root.classList.contains("sf-slim")) return;
  if(e.target.closest("[data-sfside]")){ SF.open = !SF.open; sfApply(); return; }
  if(e.target.closest("[data-stg]")) setTimeout(sfApply, 0);   // 사건 파일 탭을 누르면 입찰표와 자리를 바꾼다
  if(SF.open && !e.target.closest(".kfs-panel") && !e.target.closest("[data-sfside]")){ SF.open = false; sfApply(); }
});
document.addEventListener("keydown", e => { if(e.key === "Escape" && SF.open){ SF.open = false; sfApply(); } });
window.addEventListener("resize", () => { const r = document.getElementById("kfsRoot"); if(r && r.classList.contains("sf-slim") !== sfOn()) sfApply(); });
const _sf_render = renderArena; renderArena = function(){ _sf_render(); queueMicrotask(sfApply); };
