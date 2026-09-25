/* ================= 🔎 단서 번쩍 — 조사하면 방금 얻은 걸 대화창에 6초 띄우고 스르르 사라진다 =================
   예전엔 조사 버튼을 누르면 '✅ 했음'만 뜨고 무엇을 알아냈는지는 조사 노트를 열어야 보였다.
   이제 누르자마자 대화창 여백에 결과 카드가 떴다가 사라지고, 기록은 조사 노트에 그대로 남는다. */
const CF_MS = 6500;
function cfStrip(line){
  let t = String(line || "").replace(/^.*?\[[^\]]*\d+\s*(분|시간)[^\]]*\]\s*/, "");   // "📊 [데이터] 📈 [11분 · 이동 …]" 머리 떼기
  (K.says || []).forEach(s => { t = t.split(`${s.who}: “${s.t}”`).join(""); });
  return t.replace(/\s*\/\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}
const _cf_kResearch = kResearch; kResearch = function(id){
  const n = K && K.rlog ? K.rlog.length : 0, ln = K && K.log ? K.log.length : 0, sn = K && K.says ? K.says.length : 0;
  const fb = K && K.found ? Object.keys(K.found).filter(k => K.found[k]) : [];
  _cf_kResearch(id);
  if(!K || !K.rlog || K.rlog.length === n) return;             // 시간이 모자라 못 한 경우
  const a = (KP.actions || []).find(x => x.id === id) || {}, r = K.rlog[K.rlog.length - 1];
  const says = (K.says || []).slice(sn), text = K.log.length > ln ? cfStrip(K.log[K.log.length - 1]) : "";
  const got = Object.keys(K.found || {}).filter(k => K.found[k] && !fb.includes(k)).map(k => ((KP.hidden || []).find(h => h.id === k) || {}).t).filter(Boolean);
  K._clue = {ic:a.ic || "🔎", title:a.t || "조사", text, says, got, useful:!!r.useful, at:Date.now(), n:K.rlog.length};
  cfToast();
};
// 폰 — 입찰표 종이가 무대를 덮으므로 무대 밖(문서 맨 위층)에 따로 띄운다
let _cfTimer = null;
function cfToast(){
  const old = document.getElementById("cfToast"); if(old) old.remove(); clearTimeout(_cfTimer);
  if(!window.matchMedia || !matchMedia("(max-width:900px)").matches) return;
  const h = cfHTML(); if(!h) return;
  const box = document.createElement("div"); box.id = "cfToast"; box.innerHTML = h;
  const f = box.firstElementChild; if(f) f.classList.add("cf-toast");
  document.body.appendChild(box);
  _cfTimer = setTimeout(() => { const t = document.getElementById("cfToast"); if(t) t.remove(); }, CF_MS + 100);
}
function cfHTML(){
  const c = K && K._clue; if(!c || K.step !== "brief") return "";
  const el = Date.now() - c.at; if(el >= CF_MS) return "";
  // 말한 사람이 무대에 서서 직접 말하고 있으면(조사 무대 얼굴) 그 말은 다시 적지 않는다
  const onStage = K._nfSay && K._nfSay.n === c.n ? K._nfSay.t : null;
  const said = c.says.filter(s => s.t !== onStage).map(s => `<span class="cf-say"><b>${esc(s.who)}</b> “${esc(s.t)}”</span>`).join("");
  const body = c.text ? `<span class="cf-text">${esc(c.text)}</span>` : "";
  const got = (c.got || []).map(t => `<span class="cf-got">🧩 숨은 위험 발견 — <b>${esc(t)}</b></span>`).join("");
  const empty = !body && !said ? `<span class="cf-text">${onStage ? "위에서 들은 말을 조사 노트에 적어 뒀다." : "특별한 건 없었다."}</span>` : "";
  return `<div class="cf-flash ${c.useful ? "good" : "dull"}" style="animation-delay:-${el}ms" role="status">
    <span class="cf-tag">${c.useful ? "🔎 새 단서" : "📝 조사 결과"}</span><span class="cf-head">${c.ic} ${esc(c.title)}</span>${got}${body}${said}${got ? "" : empty}
    <span class="cf-note">🗂️ 조사 노트에 적었어요</span></div>`;
}
const _cf_kStage = kStage; kStage = function(bg, who, ex, text, name){
  const h = _cf_kStage(bg, who, ex, text, name), f = cfHTML();
  return f ? h.replace('<span class="vn-next"', f + '<span class="vn-next"') : h;
};
