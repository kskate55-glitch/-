/* ================= 🏢 이도현 — 연차 3일 · 대리입찰은 최소 한두 번 (v215) =================
   스토리 사건은 4건인데 연차가 15일이라 대리입찰(외전 D01)을 쓸 일이 없었다.
   이제: 연차는 1년에 3일(반차면 6번). 그리고
     ① 세 번째 사건 입찰일은 회사 분기 결산 주간 — 아직 대리입찰을 한 번도 안 썼다면 직접 참석을 못 한다.
     ② 연차가 반차(0.5일)도 안 남은 평일 입찰은 직접 참석을 못 한다(예전엔 점심시간에 뛰어가 스트레스 +8).
   둘 다 대리입찰 이용료를 낼 돈이 있을 때만 강제한다 — 돈이 모자라면 예전처럼 직접 참석(보류도 가능).
   경쟁자·결과는 건드리지 않는다(K.r() 호출 없음). */
const DP_LEAVE_MAX = 3;
function dpLeaveFix(){ const L = typeof lfRec === "function" && lfRec(); if(L && L.char === "dohyun" && !L.leave3){ L.leave3 = true; if(L.leave > DP_LEAVE_MAX) L.leave = DP_LEAVE_MAX; } }
function dpProxyUsed(){ const b = typeof ilProxyRec === "function" ? ilProxyRec() : {}; return Object.keys(b).filter(k => /^dohyun:/.test(k) && b[k].mode === "proxy").length; }
function dpBidWeekday(){ if(!K || !K.lf || typeof lfDate !== "function") return true; const D = lfDate(K.lf.day0 + K.lf.nd * 1440); return D.dow >= 1 && D.dow <= 5; }
function dpForceReason(){
  if(typeof ilProxyOn !== "function" || !ilProxyOn() || !K.sealed) return null;
  const L = lfRec(); if(!L || L.char !== "dohyun" || L.path === "quit") return null;
  if(!ilProxyAfford()) return null;
  if(K.epStory.i >= 2 && dpProxyUsed() < 1) return "📅 이번 입찰일은 회사 분기 결산 주간 — 팀장이 반차를 안 받아 준다. 이번엔 대리입찰로 넣는다.";
  if(dpBidWeekday() && L.leave < 0.5) return `🏢 남은 연차 ${L.leave}일 — 반차도 못 쓴다. 평일 입찰은 대리입찰로 넣는다.`;
  return null;
}
if(typeof ilProxyPanel === "function"){
  const _dp_panel = ilProxyPanel;
  ilProxyPanel = function(){
    dpLeaveFix();
    const why = dpForceReason();
    if(why) K.ilAttend = "proxy";
    let h = _dp_panel.apply(this, arguments); if(!why || !h) return h;
    h = h.replace(/<button type="button" class="btn( pri)?" data-ilattend="direct"([^>]*)>/, '<button type="button" class="btn dp-off" data-ilattend="direct"$2 disabled>');
    return h.replace('<div class="il-proxy-opts">', `<p class="ke-warn dp-why">${esc(why)}</p><div class="il-proxy-opts">`);
  };
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest('[data-ilattend="direct"]'); if(b && K && K.sealed && dpForceReason()){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);
}
// 저장된 인생에도 적용(예전 15일 → 3일, 한 번만)
if(typeof renderArena === "function"){ const _dp_r = renderArena; renderArena = function(){ try{ dpLeaveFix(); }catch(e){} return _dp_r.apply(this, arguments); }; }
