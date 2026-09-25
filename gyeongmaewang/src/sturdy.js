/* ============================== 실패도 화면이다 — 저장 실패 · 그림 실패 ==============================
   예전엔 브라우저 저장이 실패해도(저장 공간 꽉 참·비공개 모드 등) 조용히 넘어가서, 사용자는 저장된 줄 알았다.
   그림 하나를 못 불러와도 깨진 그림 아이콘이 그대로 떴다. 둘 다 "실패를 성공처럼 보이지 않게" 한다. */
let ST_SAVE_FAILED = false;
function stBar(id, html){
  let el = document.getElementById(id);
  if(!html){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement("div"); el.id = id; el.className = "st-bar"; el.setAttribute("role", "alert"); document.body.appendChild(el); }
  el.innerHTML = html;
}
window.gmwSaveFail = function(e){
  ST_SAVE_FAILED = true;
  const why = e && /quota/i.test(String(e.name || e.message || "")) ? "이 브라우저의 저장 공간이 꽉 찼어요." : "브라우저가 저장을 막았어요(비공개 모드이거나 사이트 데이터 저장이 꺼져 있을 수 있어요).";
  stBar("stSave", `<b>⚠ 진행 상황을 저장하지 못했어요.</b> ${why} 지금 화면은 그대로 두고 <button type="button" class="btn" data-stretry>다시 저장</button>`);
};
window.gmwSaveOk = function(){ if(ST_SAVE_FAILED){ ST_SAVE_FAILED = false; stBar("stSave", "<b>✅ 저장됐어요.</b>"); setTimeout(() => stBar("stSave", ""), 2500); } };
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-stretry]") && typeof save === "function") save(); });

// 그림 실패: 깨진 아이콘 대신 자리만 비워 두고, 한 번만 알린다(내용·진행은 그대로).
let ST_IMG_TOLD = false;
document.addEventListener("error", e => {
  const t = e.target; if(!t || t.tagName !== "IMG" || t.dataset.stFail) return;
  t.dataset.stFail = "1"; t.classList.add("st-img-fail");
  if(!ST_IMG_TOLD && typeof HUB_TOAST !== "undefined"){ ST_IMG_TOLD = true; HUB_TOAST.push({t:"🖼️ 그림 일부를 불러오지 못했어요 — 내용과 진행은 그대로 볼 수 있어요."}); }
}, true);
