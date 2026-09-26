/* ============================== ⏩ 읽은 대사는 빠르게 ==============================
   같은 사연·같은 상담을 두 번째 볼 때부터 지루해지지 않게 — 읽은 문장은 한 번에 찍고, 안 읽은 곳까지 건너뛸 수 있게.
   새 정보(처음 보는 문장)는 절대 건너뛰지 않는다: '⏩ 읽은 대사 넘기기'는 다음 '안 읽은 줄'에서 멈춘다. */
const RD_KEY = "rd_read_v1", RD_MAX = 6000;
let RD = new Set(); try{ RD = new Set(JSON.parse(localStorage.getItem(RD_KEY) || "[]")); }catch(e){}
let RD_T = null;
function rdHash(t){ t = String(t || ""); let h = 5381; for(let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + t.length.toString(36); }
function rdHas(t){ return !!t && RD.has(rdHash(t)); }
function rdMark(t){ if(!t) return; const k = rdHash(t); if(RD.has(k)) return; RD.add(k);
  clearTimeout(RD_T); RD_T = setTimeout(() => { try{ let a = [...RD]; if(a.length > RD_MAX) a = a.slice(a.length - RD_MAX); RD = new Set(a); localStorage.setItem(RD_KEY, JSON.stringify(a)); }catch(e){} }, 400); }
// ① 대사창 — 읽은 문장은 타자 효과 없이 한 번에
if(typeof vnType === "function"){
  const _rd_vnType = vnType;
  vnType = function(){
    const el = document.getElementById("vnText"), full = el ? (el.dataset.full || "") : "", seen = rdHas(full);
    _rd_vnType();
    if(el && full){
      if(seen){ clearTimeout(el._t); el.textContent = full; const box = document.querySelector(".vn"); if(box) box.classList.remove("typing"); }
      rdMark(full);
    }
  };
}
// ② 사연 듣기 — 줄마다 읽음 표시, 읽은 줄이면 '⏩ 읽은 대사 넘기기'
if(typeof mtPaint === "function"){
  const _rd_mtPaint = mtPaint;
  mtPaint = function(){
    if(MT && !MT.rdSeen) MT.rdSeen = MT.lines.map(l => rdHas(l[1]));
    _rd_mtPaint();
    if(!MT) return;
    const el = document.getElementById("mtTale"); if(!el) return;
    const seen = MT.rdSeen[MT.i], nextNew = MT.rdSeen.findIndex((s, j) => j > MT.i && !s);
    rdMark(MT.lines[MT.i][1]);
    if(seen){
      const top = el.querySelector(".mt-top"), btn = document.createElement("button");
      btn.type = "button"; btn.className = "mt-skip mt-rdskip"; btn.dataset.mtrd = "";
      btn.textContent = nextNew >= 0 ? `⏩ 읽은 대사 넘기기 (${nextNew + 1}번째 줄부터 새 내용)` : "⏩ 다 읽은 사연 — 끝으로";
      if(top) top.insertBefore(btn, top.querySelector("[data-mtskip]"));
      const sm = top && top.querySelector("small"); if(sm) sm.insertAdjacentHTML("beforeend", ` <span class="rd-tag">읽음</span>`);
    }
  };
  document.addEventListener("click", e => {
    if(!MT || !(e.target.closest && e.target.closest("[data-mtrd]"))) return;
    e.stopPropagation(); e.preventDefault();
    const nx = MT.rdSeen.findIndex((s, j) => j > MT.i && !s);
    if(nx >= 0){ MT.i = nx; mtPaint(); } else mtClose();
  }, true);
}
// ③ 대출 상담 카톡 — 전에 끝까지 들어 본 상담사는 대화가 한 번에(비교표를 먼저 보게)
if(typeof lnPump === "function"){
  const _rd_lnPump = lnPump;
  lnPump = function(){
    let heard = false; try{ heard = !!(LN && LN.chat && kcRec().lnHeard && kcRec().lnHeard[LN.chat]); }catch(e){}
    const prev = window.LN_FAST; if(heard) window.LN_FAST = true;
    try{ _rd_lnPump.apply(this, arguments); } finally { window.LN_FAST = prev; }
    try{ if(LN && LN.chat && LN.heard && LN.heard[LN.chat] && !LN.queue){ const c = kcRec(); c.lnHeard = c.lnHeard || {}; if(!c.lnHeard[LN.chat]){ c.lnHeard[LN.chat] = 1; if(typeof save === "function") save(); } } }catch(e){}
  };
}
