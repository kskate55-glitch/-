/* ================= 🗣️ 조사에서 만난 사람 얼굴 — 누가 말하면 무대에 그 사람이 선다 =================
   조사 결과의 '들은 말'은 글로만 남았다. 말한 사람의 그림이 있으면 조사(brief) 무대에
   그 사람을 세우고 이름과 말을 띄운다. 그림이 없는 사람은 예전처럼 글로만(아무것도 안 바뀐다). */
const NF_WHO = {                         // 이름 → [그림 키 앞부분, 이 말에 어울리는 표정]
  "김사장":["npc_kim","normal"], "박 중개사":["npc_parkbk","angry"], "아래층 아주머니":["npc_downstairs","angry"],
  "은행 대출상담":["npc_banker","angry"], "최만식 할아버지":["npc_p_grandpa","worried"], "정은주 씨":["npc_p_coop","worried"]};
function nfArt(who, ex){ const m = NF_WHO[who]; if(!m || typeof artUrl !== "function") return null; return artUrl(`${m[0]}_${ex || m[1]}`) || artUrl(`${m[0]}_normal`); }
const _nf_kResearch = kResearch; kResearch = function(id){
  const n = K ? K.says.length : 0; _nf_kResearch(id);
  if(!K) return; const s = K.says.length > n ? K.says[K.says.length - 1] : null;
  K._nfSay = s && nfArt(s.who) ? {who:s.who, t:s.t, step:K.step, n:(K.rlog||[]).length} : null;
};
const _nf_kStage = kStage; kStage = function(bg, who, ex, text, name){
  const S = K && K._nfSay;
  if(!S || K.step !== "brief" || S.step !== "brief" || who === "occ") return _nf_kStage(bg, who, ex, text, name);
  let h = _nf_kStage(bg, "narr", null, `“${S.t}”`, name);
  const u = nfArt(S.who); if(!u) return h;
  h = h.replace('<div class="vn-box narr">', `<img class="vn-sprite nf-sprite" src="${u}" alt="${esc(S.who)}"><div class="vn-box nf-box"><div class="vn-name">${esc(S.who)}</div>`);
  return h;
};
