/* ================= 🖼️ 캐릭터별 그림 — 고른 인생의 얼굴·뒷모습·방이 게임 전체에 들어간다 =================
   그림이 아직 없는 캐릭터는 예전 그림(공용 주인공)과 이모지를 그대로 쓴다. 한 명씩 채워 가면 된다. */
const LF_CHAR_ART = {
  seoyun:{face:{normal:"1c566d13d8960c9915dad1cbb8b3feb8", happy:"6fd30bc8295c83a97fba61c22e67dc0d", shocked:"e0891f9ee8d6ed107b3751fc34348477",
                worried:"4dbe6d8a4b9d28b69eee59b6ae1fd549", angry:"1713778c5f75972a617d6706b2224e72", tired:"34da9dccb585a20029ee6b6add14173c"},
          front:"62cae5e03a2a8cafb6b597fdd46a10be", back:"fb967929266348b78f10a1365f06409d", select:"0f505ffb62f59a667fcb89e54ee1d3d9",
          found:"a6aa2aefe97342b2e6f47aeff0af5ec5", room:"6c5608542f69436fa41610b5486fb480"}};
const LF_FACE_ALIAS = {soft:"happy", neutral:"normal", troubled:"worried", furious:"angry"};
// 배경·컷 칸으로도 등록해 둔다(그림 관리 화면·오프닝이 같은 이름으로 찾게)
Object.assign(ART_DEFAULT, {bg_base_sillim:LF_CHAR_ART.seoyun.room, cut_seoyun_found:LF_CHAR_ART.seoyun.found});
if(LF_BASES.sillim) LF_BASES.sillim.bg = "bg_base_sillim";
function lfArt(id){ id = id || (lfOn() ? lfRec().char : null); return id ? LF_CHAR_ART[id] || null : null; }
function lfBlob(a){ return window.GMW_STANDALONE ? "assets/" + a + ".webp" : "/_blob/" + a; }
function lfArtUrl(id, k){ const A = lfArt(id); return A && A[k] ? lfBlob(A[k]) : null; }
const _ca_artUrl = artUrl; artUrl = function(id){
  const A = lfOn() ? lfArt() : null;
  if(A && id && !(artRec()[id])){      // 사용자가 직접 올린 그림이 있으면 그걸 먼저
    let m = /^npc_playerf_(\w+)$/.exec(id);
    if(m && A.face){ const k = A.face[m[1]] ? m[1] : LF_FACE_ALIAS[m[1]]; if(k && A.face[k]) return lfBlob(A.face[k]); }
    if(/^npc_player_\w+$/.test(id) && A.back) return lfBlob(A.back);
  }
  return _ca_artUrl(id);
};
// 지치면 지친 얼굴 — 체력이 바닥이면 다른 표정보다 먼저
if(typeof keMyFace === "function"){ const _ca_face = keMyFace; keMyFace = function(){ const f = _ca_face(), A = lfArt(), L = lfRec(); if(A && A.face.tired && L && L.sta < 20 && K && ["brief","research"].includes(K.step)) return "tired"; return f; }; }
// 오프닝: 서윤 첫 두 장면은 자기 방, 세 번째(발견)는 발견 컷
if(LF_OPENINGS.seoyun){ LF_OPENINGS.seoyun[0].bg = "bg_base_sillim"; LF_OPENINGS.seoyun[1].bg = "bg_base_sillim"; LF_OPENINGS.seoyun[2].bg = "cut_seoyun_found"; }
// 거점: 방 안에 내가 서 있다
const _ca_base = lfBaseHTML; lfBaseHTML = function(){
  const h = _ca_base(), u = lfArtUrl(null, "front"); if(!u) return h;
  return h.replace('<div class="lf-top">', `<img class="lf-me" src="${u}" alt="" aria-hidden="true"><div class="lf-top">`);
};
// 선택 화면: 이모지 대신 얼굴, 포커스엔 세로 일러스트
const _ca_sel = lfSelectHTML; lfSelectHTML = function(){
  let h = _ca_sel();
  for(const C of LF_CHARS){
    const A = LF_CHAR_ART[C.id]; if(!A) continue;
    h = h.replace(new RegExp(`(data-lfpick="${C.id}"[^>]*>)<span class="lf-emo">[^<]*</span>`), `$1<span class="lf-emo lf-face"><img src="${lfBlob(A.face.normal)}" alt=""></span>`);
    if(LF_PICK === C.id && A.select) h = h.replace('<div class="lf-focus">', `<div class="lf-focus has-art"><img class="lf-focus-art" src="${lfBlob(A.select)}" alt="${esc(C.name)}">`).replace(/<span class="lf-emo big">[^<]*<\/span>/, `<span class="lf-emo big lf-face"><img src="${lfBlob(A.face.happy)}" alt=""></span>`);
  }
  return h;
};
