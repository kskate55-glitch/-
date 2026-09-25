/* ================= 🗣️ 조사에서 만난 사람 얼굴 — 누가 말하면 무대에 그 사람이 선다 =================
   조사 결과의 '들은 말'은 글로만 남았다. 말한 사람의 그림이 있으면 조사(brief) 무대에
   그 사람을 세우고 이름과 말을 띄운다. 그림이 없는 사람은 예전처럼 글로만(아무것도 안 바뀐다). */
const NF_WHO = {                         // 이름 → [그림 키 앞부분, 이 말에 어울리는 표정]
  "김사장":["npc_kim","normal"], "박 중개사":["npc_parkbk","angry"], "아래층 아주머니":["npc_downstairs","angry"],
  "은행 대출상담":["npc_banker","angry"], "최만식 할아버지":["npc_p_grandpa","worried"], "정은주 씨":["npc_p_coop","worried"],
  "전기기사 박기사":["npc_elec","angry"], "인테리어 박실장":["npc_interior","normal"],
  "관리인 할아버지":["npc_keeper","angry"], "관리인":["npc_keeper","angry"], "관리실(전화)":["npc_office","worried"],
  "중개사 A":["npc_brokerA","normal"], "중개사 B":["npc_brokerB","angry"]};
function nfArt(who, ex){ const m = NF_WHO[who]; if(!m || typeof artUrl !== "function") return null; return artUrl(`${m[0]}_${ex || m[1]}`) || artUrl(`${m[0]}_normal`); }
const _nf_kResearch = kResearch; kResearch = function(id){
  const n = K ? K.says.length : 0; _nf_kResearch(id);
  if(!K) return; const arts = K.says.slice(n).filter(x => nfArt(x.who)), s = arts.length ? arts[(K.rlog||[]).length % arts.length] : null;   // 여러 사람이 말하면 조사할 때마다 돌아가며 한 명씩(난수는 안 건드린다)
  K._nfSay = s && nfArt(s.who) ? {who:s.who, t:s.t, step:K.step, n:(K.rlog||[]).length} : null;
};
const _nf_kStage = kStage; kStage = function(bg, who, ex, text, name){
  // 집을 열었는데 누전 — 조사 때 봤든 못 봤든 박기사가 와서 재 본다
  if(K && K.step === "defect" && who === "narr" && (K.defects || []).some(d => /전기기사/.test(d.t))
     && !(typeof lfOn === "function" && lfOn() && typeof lfRelOf === "function" && lfRelOf("최 기사") >= 2)){   // 인생 모드에서 단골 최 기사가 와 준 판이면 비켜 준다
    const u = nfArt("전기기사 박기사", K.found && K.found.elec ? "normal" : "worried");
    if(u){ const t = K.found && K.found.elec ? "말씀드린 대로 누전이네요. 배선 일부만 바꾸면 됩니다." : "누전이에요. 몰랐으면 입찰가에 못 넣으셨겠네… 배선 일부 교체해야 합니다.";
      return _nf_kStage(bg, "narr", null, `“${t}”`, name).replace('<div class="vn-box narr">', `<img class="vn-sprite nf-sprite" src="${u}" alt="전기기사 박기사"><div class="vn-box nf-box"><div class="vn-name">전기기사 박기사</div>`); }
  }
  // CASE 002 — 벽지를 뜯자 물길. 박실장이 손을 들어 멈춰 세운다
  if(K && K.step === "defect" && who === "narr" && /물길/.test(text || "")){
    const early = !!(K.k2 && K.k2.leakEarly) || !!(K.found && K.found.leak);
    const u = nfArt("인테리어 박실장", early ? "normal" : "angry");
    if(u){ const t = early ? "들으신 대로네요. 열어 봐야 알지만, 배관이면 400~600 잡으시면 됩니다." : "잠깐, 더 뜯지 마세요! 열어 봐야 알아요 — 배관이면 400~600, 방수까지 가면 더 나와요.";
      return _nf_kStage(bg, "narr", null, `“${t}”`, name).replace('<div class="vn-box narr">', `<img class="vn-sprite nf-sprite" src="${u}" alt="인테리어 박실장"><div class="vn-box nf-box"><div class="vn-name">인테리어 박실장</div>`); }
  }
  const S = K && K._nfSay;
  if(!S || K.step !== "brief" || S.step !== "brief" || who === "occ") return _nf_kStage(bg, who, ex, text, name);
  let h = _nf_kStage(bg, "narr", null, `“${S.t}”`, name);
  const u = nfArt(S.who); if(!u) return h;
  h = h.replace('<div class="vn-box narr">', `<img class="vn-sprite nf-sprite" src="${u}" alt="${esc(S.who)}"><div class="vn-box nf-box"><div class="vn-name">${esc(S.who)}</div>`);
  return h;
};
