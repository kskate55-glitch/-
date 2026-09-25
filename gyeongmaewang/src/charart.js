/* ================= 🖼️ 캐릭터별 그림 — 고른 인생의 얼굴·뒷모습·방이 게임 전체에 들어간다 =================
   그림이 아직 없는 캐릭터는 예전 그림(공용 주인공)과 이모지를 그대로 쓴다. 한 명씩 채워 가면 된다. */
const LF_CHAR_ART = {
  seoyun:{face:{normal:"1c566d13d8960c9915dad1cbb8b3feb8", happy:"6fd30bc8295c83a97fba61c22e67dc0d", shocked:"e0891f9ee8d6ed107b3751fc34348477",
                worried:"4dbe6d8a4b9d28b69eee59b6ae1fd549", angry:"1713778c5f75972a617d6706b2224e72", tired:"34da9dccb585a20029ee6b6add14173c"},
          front:"93bf76af31b7e325498402ba9df7db05", back:"745e6d11267dd21a40e3204041188bf9", select:"0f505ffb62f59a667fcb89e54ee1d3d9",
          found:"a6aa2aefe97342b2e6f47aeff0af5ec5", room:"6c5608542f69436fa41610b5486fb480"},
  dohyun:{face:{normal:"2c6dcfc46662cb715ae6a15bbcb25796", happy:"62041faa17176f8a731222ebf46b6050", shocked:"20537e78fcf156713f9a98c031ee3b05",
                worried:"f92e0be6395575bc5e67e70b6884e9aa", angry:"97343c701731a1677db55b0a34d4cc2b", tired:"d5e227dbe4e6c139a123621d0833a616"},
          front:"4e6c8504ae07eded7732125103624cc5", back:"2a1d7d91d759fb0ad1a580c1083c623a", select:"b9c749443dc4065d593447850e605cbc",
          commute:"3ff68bb122421084c31b3ab96ebbc1ea", room:"4e6edd4052a125094a0b506b7c91866e"},
  mijeong:{face:{normal:"de2db819371c268760cde0f43bd2ab59", happy:"07b53544fd6eb5e854a37666ebd60b07", shocked:"3437e73c74f7f96d0a6fe5b063d7e891",
                worried:"b74e4bdb5c03ed904e4fbf3a9e1fa291", angry:"fefc77dcc2e67e527bf141e68fbd2401", tired:"5f8364d8be29ac0e3706ce935180ebc3"},
          front:"de23e0f0d5a92e041efbd9c81d7324a1", back:"f22e08926e3bda4d14e8b58626dd6d69", select:"07908fc86a73109107d59cf8e4479263",
          shop:"80fa4024531bc6844278f4a1bec404ec", room:"3d69a0468b0060ad25ce8910b4093d4b"},
  // 박재훈 — 표정: 기본 · 멋쩍게 웃음(happy) · 놀람 · 턱 만지며 의심(worried) · 팔짱 결심(angry) · 수건으로 땀(tired)
  jaehoon:{face:{normal:"57f8a7399c2b314071d8ed618a05652b", happy:"32edd6959f579b5be13566eb3e81cf5a", shocked:"e115ea1cd8e1acb71d25020554f8457f",
                worried:"29c601659301d95b1bf8c502e7a52838", angry:"c19ad3f85599464a1c93fb7d358e8387", tired:"b216b6ade96c0a156e308e81d6c09d4d"},
          front:"e876caa0b76a4f1bb174c47844da7c76", back:"c40ffb12739126df025442eab3e6a5b6", select:"0fb410d2a57eed863e40f7ea7f1ac3dc",
          site:"38752f63e0013680ff416faa69ffc6da", room:"28a1cf1a44efbf9ef7e0e889e481f058"},
  // 최은경 — 표정: 기본 · 옅은 미소(happy) · 놀람 · 계산기 보며 걱정(worried) · 안경 올리며 결심(angry) · 관자놀이 누름(tired)
  eunkyung:{face:{normal:"8336de9700e8867cef7780f9eb5100b8", happy:"2819d5a85a308b4aef80f6f992df8e4d", shocked:"6ac2ed5732b7577e826f0faa7fde89a0",
                worried:"9bc30ab83c619c296a59bb886e2cdccc", angry:"051cf9287aa3edef659dd6bcfd3ba3a9", tired:"37800e7039244c49f1057cb020a82930"},
          front:"0215373c26b5ef5c462d918cff0e805d", back:"a3c6638aa8d29d618dee4cfd84e0a233", select:"21337f6463a3fe6b47f7499ff4954b39",
          morning:"e484c60840c93b1948e7870ab73d4d19", room:"75d039a099fc0a99a7efba48f6d09783"},
  // 김태식 — 표정: 기본 · 허허 웃음(happy) · 놀람 · 서류 보며 걱정(worried) · 안경 벗어 들고 단호(angry) · 뒷목 주무름(tired)
  taesik:{face:{normal:"15c1b2126eed366fc28b475d5a53cf4d", happy:"5a9a05d1f40badfdc2451dc2c3ede869", shocked:"a2658ef567cb0ac710ef90a84aad80e1",
                worried:"668e464467eaa67e93bed94c1fad6adf", angry:"63e410a90be5f63f37ba67a7a325e30c", tired:"1bc95fd990dfd6e6cd98d2d1531181d5"},
          front:"ea53ae0c31f4d6dd906f927db721b12a", back:"77d6b61c414cfe5836348388ec794cde", select:"2452f4871394a4843ed2e61f2a74d9cc",
          morning:"3b86d1750b7daf85991c90dbccd52b74", room:"5590c2eb1aedda87ae1ffffc4c65752d"}};
const LF_FACE_ALIAS = {soft:"happy", neutral:"normal", troubled:"worried", furious:"angry"};
// 배경·컷 칸으로도 등록해 둔다(그림 관리 화면·오프닝이 같은 이름으로 찾게)
Object.assign(ART_DEFAULT, {bg_base_sillim:LF_CHAR_ART.seoyun.room, cut_seoyun_found:LF_CHAR_ART.seoyun.found,
  bg_base_hwagok:LF_CHAR_ART.dohyun.room, cut_dohyun_commute:LF_CHAR_ART.dohyun.commute,
  bg_base_yeongdeungpo:LF_CHAR_ART.mijeong.room, cut_mijeong_shop:LF_CHAR_ART.mijeong.shop,
  bg_base_bulgwang:LF_CHAR_ART.jaehoon.room, cut_jaehoon_site:LF_CHAR_ART.jaehoon.site,
  bg_base_mapo:LF_CHAR_ART.eunkyung.room, cut_eunkyung_morning:LF_CHAR_ART.eunkyung.morning,
  bg_base_mokdong:LF_CHAR_ART.taesik.room, cut_taesik_morning:LF_CHAR_ART.taesik.morning});
if(LF_BASES.sillim) LF_BASES.sillim.bg = "bg_base_sillim";
if(LF_BASES.hwagok) LF_BASES.hwagok.bg = "bg_base_hwagok";
if(LF_BASES.yeongdeungpo) LF_BASES.yeongdeungpo.bg = "bg_base_yeongdeungpo";
if(LF_BASES.bulgwang) LF_BASES.bulgwang.bg = "bg_base_bulgwang";
if(LF_BASES.mapo) LF_BASES.mapo.bg = "bg_base_mapo";
if(LF_BASES.mokdong) LF_BASES.mokdong.bg = "bg_base_mokdong";
function lfArt(id){ id = id || (lfOn() ? lfRec().char : null); return id ? LF_CHAR_ART[id] || null : null; }
function lfBlob(a){ return window.GMW_STANDALONE ? "assets/" + a + ".webp" : "/_blob/" + a; }
function lfArtUrl(id, k){ const A = lfArt(id); return A && A[k] ? lfBlob(A[k]) : null; }
const _ca_artUrl = artUrl; artUrl = function(id){
  // 주인공 그림은 여섯 인생 것만 쓴다 — 옛 주인공(노란 머리)은 더 이상 세우지 않는다.
  // 인생을 안 고르고 바로 시작한 판은 1번 인생(한서윤) 그림, 그림이 아직 없는 인생은 주인공을 아예 세우지 않는다.
  if(id && /^npc_player(f)?_/.test(id) && !(artRec()[id])){      // 사용자가 직접 올린 그림이 있으면 그걸 먼저
    const A = lfArt(lfOn() ? lfRec().char : "seoyun");
    if(!A) return null;
    let m = /^npc_playerf_(\w+)$/.exec(id);
    if(m){ if(!A.face) return null; const k = A.face[m[1]] ? m[1] : LF_FACE_ALIAS[m[1]]; return k && A.face[k] ? lfBlob(A.face[k]) : lfBlob(A.face.normal); }
    return A.back ? lfBlob(A.back) : null;
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
// 재훈: 수리 현장에서 벽 두드리기(그림 속 본인, 오른쪽) → 국밥집 골목(그대로) → 불광동 작업방
if(LF_OPENINGS.eunkyung){ [0,1].forEach(i => { LF_OPENINGS.eunkyung[i].bg = "cut_eunkyung_morning"; LF_OPENINGS.eunkyung[i].pos = "40% 45%"; }); LF_OPENINGS.eunkyung[0].uiPos = "right"; if(LF_OPENINGS.eunkyung[2]) LF_OPENINGS.eunkyung[2].bg = "bg_base_mapo"; }
if(LF_OPENINGS.taesik){ [0,1].forEach(i => { LF_OPENINGS.taesik[i].bg = "cut_taesik_morning"; LF_OPENINGS.taesik[i].pos = "30% 45%"; }); [2,3].forEach(i => { if(LF_OPENINGS.taesik[i]) LF_OPENINGS.taesik[i].bg = "bg_base_mokdong"; }); }
if(LF_OPENINGS.jaehoon){ [0,1].forEach(i => { LF_OPENINGS.jaehoon[i].bg = "cut_jaehoon_site"; LF_OPENINGS.jaehoon[i].pos = "72% 50%"; }); if(LF_OPENINGS.jaehoon[3]) LF_OPENINGS.jaehoon[3].bg = "bg_base_bulgwang"; }
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

// 표정 추가분(유형별 공용 인물) — 사용자가 받아온 그림을 잘라 넣은 것
Object.assign(ART_DEFAULT, {
  npc_oldman_angry:"144a322fd80e32681f70641e7e4fc024", npc_oldman_troubled:"893687515138e76c019a8959f48b3f01",
  npc_ajumma_angry:"418917e1fceea53717bf4ca48c5df592", npc_roughman_troubled:"cac08fac2fe3e58b2cda0c2e289ef935",
  npc_youngwoman_angry:"30f950b5283848dbd88bd2b269e4fc6d", npc_youngwoman_troubled:"19f5132d18ff5aea237feb4e72ed1415",
  npc_broker_angry:"f9c6bd97ecd060a5df237e134416877f", npc_broker_troubled:"00c79ef78a4e38cad84bab1118e7d037",
  npc_mover_angry:"7ef41728723c4636f4a2fbd25b858aa7", npc_mover_troubled:"da13db86052f7ab60f38f360eeb1431b",
  npc_bailiff_normal:"753d467e63d8e35d6e4242e88b9de720"});

// 소품 시트 1
Object.assign(ART_DEFAULT, { prop_keys:"1dec16bd8a6acfaba2533fddde5dbb44", prop_doorlock:"c4f92d364746346833a4b55d6aaead6c", prop_letter:"b2281c57aad6ac86a87859dc861c6ed0", prop_order:"b6750cac30b5bfe735eef0128ae16daf", prop_confirm:"9d65195ebfe4fcec0669fbe5ce53a56f", prop_boxes:"beb210bc4a5617530e69617a41923a78", prop_cash:"dba6864c843485b6c3622aed56e13bb2", prop_notice:"4dd36113a80ac4e08ade22dcc148b1ec", prop_truck:"8258758d43538665526fc4a54876fa6b"});

// 소품 시트 2·3 + 사건 뒤 빈 거실 컷
Object.assign(ART_DEFAULT, { prop_phone:"4595d8d28c8011c600942eb4892cdcb1", prop_calendar:"b7aa83a85dc9576f3088fd15f6b6aa34", prop_bill:"fe178400373bf5686f15bff967f8f9ac", prop_drink:"835c29e0504b6c7f81b545be298b21d9", prop_toolbox:"c11b5c7120c4bd5016e4ce06f597a28c", prop_delivery_boxes:"ffe3cef883f1ebbfc575ce9658810c94", prop_trash_bags:"e59c39078561481755ee176c15854381", prop_mail_bundle:"cccc3406e57affdd54f883247431f172", prop_shoes_slippers:"96c5127b5a2c59f3afb6a1615b6232bb", prop_safe_box:"e5e50fe05c450464022deb80bafad79c", cut_empty_after:"ebb5e6cf420574784e9e1aad5dbc7bfa", bg_room_empty:"5961986acf90e000dd87644d50e24d72"});
