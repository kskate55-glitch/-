/* ================= 🎬 캐릭터 오프닝(감정형·장편) + 엔딩 에필로그 연결 =================
   · 오프닝: OE_DATA.<캐릭터>.opening 이 LF_OPENINGS 를 통째로 대신한다(같은 연출기 cine.js — SKIP·자동 넘김 그대로).
     장면마다 art 후보(새 슬롯 oe_* → 기존 op_* 그림 → bg 배경 순)로 그림이 없어도 끊기지 않는다.
   · 엔딩: 네 번째 사건 뒤 epFinish 가 원래대로 엔딩을 확정·저장·다음 단계 해금하고 엔딩 카드를 그린 다음,
     그 위에 에필로그(공통부 + 판정별 마무리)를 덮어 튼다. 끝나거나 SKIP 하면 밑의 엔딩 카드가 드러난다.
     → 점수·자금·세금·해금·플레이 순서는 한 줄도 바뀌지 않는다(에필로그는 보여 주기만 한다).
   · 새 그림 슬롯(캐릭터당 4장: 오프닝 3 + 엔딩 1)은 그림 목록에 등록만 한다 — 그림을 넣으면 바로 쓰인다. */
let OE_EPILOGUE = true;   // 테스트·디버그에서 끌 수 있게
(function(){
  for(const ch of Object.keys(OE_DATA)){
    const D = OE_DATA[ch];
    if(D.opening && D.opening.length && typeof LF_OPENINGS !== "undefined") LF_OPENINGS[ch] = D.opening;
    if(typeof A_ === "function") (D.art || []).forEach(a => { try{ A_(a.id, "cut", a.title, a.scene, a.use === "ending" ? "엔딩" : "오프닝"); }catch(e){} });
  }
})();
function oeEpilogue(ch, type){
  const D = OE_DATA[ch]; if(!D || !D.ending) return null;
  const tail = D.ending[type] || D.ending.normal || [];
  return (D.ending.core || []).concat(tail);
}
function oePlayEnding(ch, type){
  const scenes = oeEpilogue(ch, type); if(!scenes || !scenes.length || typeof gxOpStart !== "function") return false;
  const E = (typeof CP_ENDINGS !== "undefined" && CP_ENDINGS[ch] && CP_ENDINGS[ch][type]) || ["그 후"];
  gxOpStart(ch, {mode:"end", scenes, type, title:E[0]});
  return true;
}
if(typeof epFinish === "function"){
  const _oe_finish = epFinish;
  epFinish = function(){
    const ch = typeof EP !== "undefined" && EP ? EP.ch : null;
    const type = ch && typeof epEnding === "function" ? epEnding(epOf(ch).res) : null;
    const out = _oe_finish.apply(this, arguments);
    if(OE_EPILOGUE && ch && type) try{ oePlayEnding(ch, type); }catch(e){}
    return out;
  };
}
// 엔딩 카드에서 에필로그 다시 보기
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-oereplay]"); if(!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const [ch, type] = b.dataset.oereplay.split(":"); oePlayEnding(ch, type);
}, true);
if(typeof cpEndHTML === "function"){
  const _oe_end = cpEndHTML;
  cpEndHTML = function(){
    const h = _oe_end.apply(this, arguments);
    try{ const S = CP_SHOW, s = S && S.sum; if(S && S.step === "end" && s && oeEpilogue(s.char, s.type)) return h.replace('<div class="cp-btns">', `<div class="cp-btns"><button type="button" class="btn" data-oereplay="${s.char}:${s.type}">🎬 에필로그 다시 보기</button>`); }catch(e){}
    return h;
  };
}

/* ---------- 새로 받은 오프닝·엔딩 그림 (사용자 제작) ---------- */
// 슬롯 이름 → 자산 id. 여기 없는 슬롯은 대본의 art 후보 뒤쪽(기존 그림·배경)이 대신 나온다.
const OE_ART = {
  oe_seoyun_op1:"7e30113a5ce89f464d13fa9e4b2488df",   // 채용 결과 앞에서 멈춘 오후
  oe_seoyun_op2:"1cf4cbcf34402f6d904ac9cba997b93a",   // 엄마와 통화하며 괜찮다고 말하는 저녁
  oe_seoyun_op3:"9c15b54bfda87802e9ec060b8adf6103",   // 비 오는 밤, 경매를 처음 알아보는 책상
  oe_seoyun_end1:"00debb02c89e091626597df99f794995"   // 숨지 않고 자신의 판단을 설명하는 얼굴
};
if(typeof ART_DEFAULT !== "undefined") Object.assign(ART_DEFAULT, OE_ART);
