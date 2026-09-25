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

/* ============================== 두 탭 · 옛 저장본 방어 ==============================
   ① 같은 게임을 두 탭에서 열면, 오래된 탭이 저장할 때 최신 기록을 덮어썼다.
      → save()가 저장 시각(:ts)을 비교해, 다른 탭이 더 나중에 저장했으면 덮어쓰지 않고 이 막대를 띄운다.
   ② 예전 버전 저장본이나 손상된 값(NaN·문자열·빠진 칸)이 계산으로 번지지 않게, 불러온 직후 한 번 고친다. */
window.gmwSaveConflict = function(){
  stBar("stSave", `<b>⚠ 다른 탭(창)에서 이 게임을 더 최근에 진행했어요.</b> 최신 기록을 지키려고 이 탭의 진행은 저장하지 않았어요. <button type="button" class="btn" data-streload>최신 기록 불러오기</button>`);
};
window.addEventListener("storage", e => { if(e.key === LS_KEY + ":ts" && (+e.newValue || 0) > ((typeof S !== "undefined" && S.updated) || 0)) window.gmwSaveConflict(); });
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-streload]")) location.reload(); });

function stNum(o, k, d, lo, hi){
  if(!o || typeof o !== "object") return false;
  let v = o[k]; const bad = typeof v !== "number" || !isFinite(v);
  if(bad){ const n = typeof v === "string" && v.trim() !== "" ? Number(v) : NaN; v = isFinite(n) ? n : d; }
  if(lo != null && v < lo) v = lo; if(hi != null && v > hi) v = hi;
  if(v !== o[k]){ o[k] = v; return true; } return false;
}
function stObj(o, k, arr){ if(!o) return false; const ok = arr ? Array.isArray(o[k]) : (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])); if(ok) return false; o[k] = arr ? [] : {}; return true; }
function stSanitize(){
  if(typeof S === "undefined" || !S || typeof S !== "object") return false;
  let ch = false; const A = S.arena; if(!A || typeof A !== "object") return false;
  const c = A.career;
  if(c && typeof c === "object"){
    const base = typeof KC_START_CASH !== "undefined" ? KC_START_CASH : 15000;
    ch = stNum(c, "start", base) || ch;
    ch = stNum(c, "cash", c.start) || ch;
    ["total"].forEach(k => { ch = stNum(c, k, 0) || ch; });
    ["cases","wins","fails","bids","lostBids","streak"].forEach(k => { ch = stNum(c, k, 0, 0) || ch; });
    ch = stObj(c, "history", true) || ch; ch = stObj(c, "weekly") || ch;
    if(c.board != null){
      const b = c.board;
      if(typeof b !== "object" || Array.isArray(b)){ delete c.board; ch = true; }
      else {
        ch = stNum(b, "n", 1, 1) || ch; ch = stNum(b, "key", 1, 1) || ch; ch = stNum(b, "dodged", 0, 0) || ch;
        ch = stObj(b, "items", true) || ch; ch = stObj(b, "log", true) || ch; ch = stObj(b, "lastDone") || ch;
        const n0 = b.items.length; b.items = b.items.filter(it => it && typeof it === "object" && (it.kind === "case" ? (typeof K_PROPS === "undefined" || K_PROPS[it.prop]) : true));
        if(b.items.length !== n0) ch = true;
        b.items.forEach(it => { ch = stNum(it, "extra", 0, 0, 5) || ch; ch = stNum(it, "seed", 7, 1) || ch; if(typeof it.status !== "string"){ it.status = "watch"; ch = true; } });
      }
    }
    const L = c.life;
    if(L != null){
      if(typeof L !== "object" || Array.isArray(L) || (typeof LF_CHARS !== "undefined" && !LF_CHARS.some(x => x.id === L.char))){ delete c.life; ch = true; }
      else {
        const C = typeof LF_CHARS !== "undefined" ? LF_CHARS.find(x => x.id === L.char) : null;
        ch = stObj(L, "st") || ch; if(C) Object.keys(C.st).forEach(k => { ch = stNum(L.st, k, C.st[k], 0) || ch; });
        ch = stNum(L, "t", 0, 0) || ch; ch = stNum(L, "sta", (L.st && L.st.stamina) || 50, 0) || ch; ch = stNum(L, "stress", 10, 0, 100) || ch; ch = stNum(L, "leave", 0, 0) || ch; ch = stNum(L, "nextEvt", 0) || ch;
        if(L.st && isFinite(L.st.stamina) && L.sta > L.st.stamina){ L.sta = L.st.stamina; ch = true; }
        ["equip","rel","xp","titles","stats"].forEach(k => { ch = stObj(L, k) || ch; }); ch = stObj(L, "log", true) || ch;
      }
    }
  }
  const P = A.player;
  if(P && typeof P === "object"){ ch = stNum(P, "xp", 0, 0) || ch; ch = stNum(P, "rep", 0, 0) || ch; ["cleared","ends","met","events","ach","modes"].forEach(k => { ch = stObj(P, k) || ch; }); }
  const D = A.deep;
  if(D && typeof D === "object"){ ["after","news"].forEach(k => { ch = stObj(D, k, true) || ch; }); ch = stObj(D, "mem") || ch; }
  return ch;
}
// 첫 화면을 그리기 전에(이 파일은 저장본을 읽은 뒤·첫 render() 전에 실행된다) 바로 고친다
try{ if(stSanitize() && typeof save === "function") save(); }catch(e){ console.error("stSanitize", e); }
