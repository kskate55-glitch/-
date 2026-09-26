/* ============================== 🛡️ 한 번만 · ▶ 이어하기 ==============================
   ① 같은 행동이 두 번 처리되지 않게 — 수락 버튼을 빠르게 두 번 누르면 매각대금이 두 번 들어오던 버그가 있었다(실측).
      돈이 오가는 행동은 '그 단계일 때만, 한 번만' 처리한다.
   ② 사건 도중 창을 닫거나 새로고침해도 그 자리에서 이어한다. 저장은 판마다 고정된 난수열의 '몇 번째까지 썼는지'를 같이
      적어서, 다시 열어도 앞으로 벌어질 일이 바뀌지 않는다(새로고침으로 운을 다시 굴릴 수 없다). */
const _rs_kFinish = kFinish; kFinish = function(){ if(!K || K._fin) return; K._fin = true; return _rs_kFinish.apply(this, arguments); };
const _rs_kClose = kClose; kClose = function(){ if(!K || !K.sale || K.sale.done || K._fin) return; return _rs_kClose.apply(this, arguments); };
const _rs_kSale = kSaleAnswer; kSaleAnswer = function(){ if(!K || K.step !== "sell" || !K.sale || K.sale.done) return; return _rs_kSale.apply(this, arguments); };
const _rs_kRepair = kRepair; kRepair = function(){ if(!K || K.step !== "defect") return; return _rs_kRepair.apply(this, arguments); };
const _rs_kList = kList; kList = function(){ if(!K || K.step !== "list") return; return _rs_kList.apply(this, arguments); };
const _rs_kMove = kMove; kMove = function(){ if(!K || K.step !== "move") return; return _rs_kMove.apply(this, arguments); };
const _rs_kOffer = kOffer; kOffer = function(){ if(!K || K.step !== "move" || !K.offering) return; return _rs_kOffer.apply(this, arguments); };
const _rs_kBid = kBid; kBid = function(){ if(!K || K.step !== "brief") return; return _rs_kBid.apply(this, arguments); };
// 난수를 몇 번 썼는지 센다(이어하기 때 같은 자리로 되감기 위해)
const _rs_kStart = kStart; kStart = function(seed){
  _rs_kStart(seed); if(!K || typeof K.r !== "function") return;
  const base = K.r; K.rn = 0; K.r = function(){ K.rn++; return base(); };
};
const RS_SKIP = new Set(["r", "goals"]);
function rsProp(){ if(!KP) return null; if(KP.id && K_PROPS[KP.id] === KP) return KP.id; return Object.keys(K_PROPS).find(id => K_PROPS[id] === KP) || KP.id || null; }
function rsSnap(){
  if(!K || !KP) return null;
  const k = {}; Object.keys(K).forEach(key => { const v = K[key]; if(RS_SKIP.has(key) || typeof v === "function") return; k[key] = v; });
  try{ return JSON.parse(JSON.stringify({v:1, prop:rsProp(), seed:K.seed, rn:K.rn || 0, tab:typeof arenaTab !== "undefined" ? arenaTab : "king", at:Date.now(), step:K.step, title:(KP && KP.title) || "", k})); }catch(e){ return null; }
}
let RS_LAST = "", RS_ASKED = false, RS_HADK = false;
function rsLiveStep(){ return K && K.step && !["result", "lost"].includes(K.step) && !K._fin; }
function rsPersist(){
  let c; try{ c = kcRec(); }catch(e){ return; }
  if(rsLiveStep() && K.mode !== "free"){
    const s = rsSnap(); if(!s) return; const j = JSON.stringify(s.k) + s.rn + s.tab;
    if(j === RS_LAST) return; RS_LAST = j; c.live = s; if(typeof save === "function") save();
  } else if(c.live && !(RS_ASKED === "open")){ if(K || RS_ASKED === "done"){ delete c.live; RS_LAST = ""; if(typeof save === "function") save(); } }
}
function rsResume(){
  const c = kcRec(), s = c.live; if(!s) return false;
  try{
    KC_MODE = s.k.mode || "career"; K_PROP_NEXT = s.prop; KC_INTRO = false; if(typeof BD_NEXT !== "undefined") BD_NEXT = null;
    kStart(s.seed); if(!K) return false;
    for(let i = 0; i < s.rn; i++) K.r();
    Object.assign(K, s.k); K.intro = false; K.revealing = false;
    if(typeof arenaTab !== "undefined") arenaTab = s.tab || "king";
    if(typeof page !== "undefined") page = "arena";
    RS_LAST = ""; return true;
  }catch(e){ K = null; delete c.live; return false; }
}
function rsCardHTML(s){
  const stepT = {brief:"조사·입찰 전", won:"낙찰 직후", move:"명도 중", defect:"하자 확인", list:"호가 정하기", sell:"매도 중"}[s.step] || s.step;
  return `<div id="rsCard" class="fr-pass" role="dialog" aria-label="이어하기"><div class="fr-pass-in" style="border-top:5px solid #2e7d5b">
    <small>하던 사건이 있어요</small><h3>▶ ${esc(s.title || "진행 중인 사건")}</h3><p>${esc(stepT)} 단계에서 멈췄어요. 그 자리에서 이어할 수 있어요 — 앞으로 벌어질 일은 닫기 전과 똑같아요.</p>
    <button type="button" class="btn pri" data-rsgo="yes">▶ 이어하기</button>
    ${s.step === "brief" ? `<button type="button" class="btn" data-rsgo="no" style="margin-top:8px;width:100%">이 사건은 접기(입찰 전이라 기록 없이)</button>` : `<p class="note" style="margin-top:8px">이미 낙찰받은 물건이라 접을 수 없어요 — 실제 경매에서도 잔금을 안 내면 입찰보증금을 잃어요.</p>`}</div></div>`;
}
const _rs_render = renderArena;
renderArena = function(){
  const r = _rs_render.apply(this, arguments);
  try{
    const c = kcRec();
    if(K) RS_HADK = true;
    if(!K && c.live && RS_HADK){ delete c.live; RS_LAST = ""; if(typeof save === "function") save(); }   // 이번 접속에서 사건을 끝냈거나 넘겼다 — 저장본은 필요 없다
    else if(!K && c.live && !RS_ASKED && typeof page !== "undefined" && page === "arena"){ RS_ASKED = "open"; if(!document.getElementById("rsCard")) document.body.insertAdjacentHTML("beforeend", rsCardHTML(c.live)); }
    else { if(K && RS_ASKED === "open"){ const el = document.getElementById("rsCard"); if(el) el.remove(); RS_ASKED = "done"; } rsPersist(); }
  }catch(e){}
  return r;
};
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-rsgo]"); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const el = document.getElementById("rsCard"); if(el) el.remove();
  if(b.dataset.rsgo === "yes" && rsResume()){ RS_ASKED = "done"; renderArena(); return; }
  RS_ASKED = "done"; const c = kcRec(); delete c.live; if(typeof save === "function") save(); renderArena();
}, true);
