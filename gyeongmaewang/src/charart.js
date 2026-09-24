/* ================= 🖼️ 캐릭터별 그림 — 고른 인생의 얼굴·뒷모습·방이 게임 전체에 들어간다 =================
   그림이 아직 없는 캐릭터는 예전 그림(공용 주인공)과 이모지를 그대로 쓴다. 한 명씩 채워 가면 된다. */
const LF_CHAR_ART = {
  seoyun:{face:{normal:"1c566d13d8960c9915dad1cbb8b3feb8", happy:"6fd30bc8295c83a97fba61c22e67dc0d", shocked:"e0891f9ee8d6ed107b3751fc34348477",
                worried:"4dbe6d8a4b9d28b69eee59b6ae1fd549", angry:"1713778c5f75972a617d6706b2224e72", tired:"34da9dccb585a20029ee6b6add14173c"},
          front:"ce46abcdcb5282ab782ebe27ac9867cb", back:"f2aa59258e202df3373f640fd354579c", select:"0f505ffb62f59a667fcb89e54ee1d3d9",
          found:"a6aa2aefe97342b2e6f47aeff0af5ec5", room:"6c5608542f69436fa41610b5486fb480"},
  dohyun:{face:{normal:"2c6dcfc46662cb715ae6a15bbcb25796", happy:"6ad1f3e3a51585e063731fc107434ba1", shocked:"20537e78fcf156713f9a98c031ee3b05",
                worried:"dea59f40e8e31a7876829a6909258f04", angry:"97343c701731a1677db55b0a34d4cc2b", tired:"d5e227dbe4e6c139a123621d0833a616"},
          front:"460763b38132f69631dd9afc8b97c96b", back:"36d71073cf13f01299b6f6fe40f591d4", select:"b9c749443dc4065d593447850e605cbc",
          commute:"3ff68bb122421084c31b3ab96ebbc1ea", room:"4e6edd4052a125094a0b506b7c91866e"},
  mijeong:{face:{normal:"32c523858c5681e224be52caca502f9a", happy:"07b53544fd6eb5e854a37666ebd60b07", shocked:"ae54bf011d86fe7d8828789b6a8e39e6",
                worried:"9f745640e94952c8a3167e2c152be3ea", angry:"6bc9e8d46f35a9f734bd19eda16d4ff3", tired:"8a469b739b8d34d2e81b8f257146eaa9"},
          front:"7908e88b677af08faafdfb68a56fe6dc", back:"3f5ff0ba1b1ee0e30979aa50d1fd5dae", select:"07908fc86a73109107d59cf8e4479263",
          shop:"80fa4024531bc6844278f4a1bec404ec", room:"3d69a0468b0060ad25ce8910b4093d4b"}};
const LF_FACE_ALIAS = {soft:"happy", neutral:"normal", troubled:"worried", furious:"angry"};
// 배경·컷 칸으로도 등록해 둔다(그림 관리 화면·오프닝이 같은 이름으로 찾게)
Object.assign(ART_DEFAULT, {bg_base_sillim:LF_CHAR_ART.seoyun.room, cut_seoyun_found:LF_CHAR_ART.seoyun.found,
  bg_base_hwagok:LF_CHAR_ART.dohyun.room, cut_dohyun_commute:LF_CHAR_ART.dohyun.commute,
  bg_base_yeongdeungpo:LF_CHAR_ART.mijeong.room, cut_mijeong_shop:LF_CHAR_ART.mijeong.shop});
if(LF_BASES.sillim) LF_BASES.sillim.bg = "bg_base_sillim";
if(LF_BASES.hwagok) LF_BASES.hwagok.bg = "bg_base_hwagok";
if(LF_BASES.yeongdeungpo) LF_BASES.yeongdeungpo.bg = "bg_base_yeongdeungpo";
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
// 도현: 화곡역 퇴근길 → (현관) → 자기 원룸
if(LF_OPENINGS.dohyun){ LF_OPENINGS.dohyun[0].bg = "cut_dohyun_commute"; [2,3,4].forEach(i => { if(LF_OPENINGS.dohyun[i]) LF_OPENINGS.dohyun[i].bg = "bg_base_hwagok"; }); }
// 미정: 가게 마감(그림 속 본인) → 집 거실 → 중개사무소(그대로)
if(LF_OPENINGS.mijeong){ LF_OPENINGS.mijeong[0].bg = "cut_mijeong_shop"; LF_OPENINGS.mijeong[0].uiPos = "low"; LF_OPENINGS.mijeong[0].pos = "58% 50%"; LF_OPENINGS.mijeong[1].pos = "58% 50%"; LF_OPENINGS.mijeong[1].bg = "cut_mijeong_shop"; LF_OPENINGS.mijeong[2].bg = "bg_base_yeongdeungpo"; }
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
