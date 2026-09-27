/* ================= 🖼️ 캐릭터별 그림 — 고른 인생의 얼굴·뒷모습·방이 게임 전체에 들어간다 =================
   그림이 아직 없는 캐릭터는 예전 그림(공용 주인공)과 이모지를 그대로 쓴다. 한 명씩 채워 가면 된다. */
const LF_CHAR_ART = {
  seoyun:{face:{normal:"78733444597a62cf103ec27fd803b6de", happy:"d04f05e1e2f8a4a45fead8ae4215dbdf", shocked:"29c5797dfa925e7d482e4015b9abc315",
                worried:"73fc84e1b42b53db3a711888224fae1b", angry:"94dfb0296c74da9c2cdf98d4563ce90f", tired:"b5fcbc1f1b42803197dccf103c516772"},
          front:"2dccd41f5da5f23d5b514899e37e178e", back:"7ba3f8b513d089c37c9cb7fdb2d2a9b4", select:"0f505ffb62f59a667fcb89e54ee1d3d9",
          found:"a6aa2aefe97342b2e6f47aeff0af5ec5", room:"6c5608542f69436fa41610b5486fb480"},
  dohyun:{face:{normal:"8bff04cc92463bd999186ce88f40e014", happy:"1efab84ae4cb4ad8c4154dfec74bb027", shocked:"29648529c6d0390f75cb4a61d823c926",
                worried:"21da674a078aaeedda8aea68de7d9245", angry:"bc456db36ce5b330a434796bc5522ab7", tired:"3f3393979e3254e0e9a3199201849e8d"},
          front:"85c098f4eb5fc471642861fe3a1a4fb7", back:"552875b1013bb3a79b616152823cf4e0", select:"b9c749443dc4065d593447850e605cbc",
          commute:"3ff68bb122421084c31b3ab96ebbc1ea", room:"4e6edd4052a125094a0b506b7c91866e"},
  mijeong:{face:{normal:"0558cb08697c64f6d90edfe9c11421fe", happy:"1edebb1341dae810b7891b92f51c7720", shocked:"69da716269af6a4d9e59c8f19e62edba",
                worried:"186a40dc3fed2534bb2d11f54644cfe2", angry:"dd9818813ef57770316a4eabb66dab5f", tired:"3720969a458fb910c658bf8098a6df10"},
          front:"2b9707d0696eb87ad780b03eb2f735d4", back:"f8f67a82adee0fc8f4e89c7c34e41418", select:"07908fc86a73109107d59cf8e4479263",
          shop:"80fa4024531bc6844278f4a1bec404ec", room:"3d69a0468b0060ad25ce8910b4093d4b"},
  // 박재훈 — 표정: 기본 · 멋쩍게 웃음(happy) · 놀람 · 턱 만지며 의심(worried) · 팔짱 결심(angry) · 수건으로 땀(tired)
  jaehoon:{face:{normal:"aac17185ff66d0ba558654631b48ea61", happy:"0508934dd1538bacd9da12ddd1901761", shocked:"6c4f898ae5dc9811ed2eb3a18358828e",
                worried:"3b42144bea6f2bcb41cfedaeb908ef9b", angry:"2a3b31c9ebc51276fc97982dbbb01088", tired:"d97883a728b786c9900329c3af30ab8b"},
          front:"ff2d0d70ff680c71ab459f66d74342cb", back:"94dc9c6dca99a47210f27a27d1470b03", select:"0fb410d2a57eed863e40f7ea7f1ac3dc",
          site:"38752f63e0013680ff416faa69ffc6da", room:"28a1cf1a44efbf9ef7e0e889e481f058"},
  // 최은경 — 표정: 기본 · 옅은 미소(happy) · 놀람 · 계산기 보며 걱정(worried) · 안경 올리며 결심(angry) · 관자놀이 누름(tired)
  eunkyung:{face:{normal:"e519571359d4a8fc899c8b785579b7af", happy:"04259f9be4e59791e3bbf3ca53942daf", shocked:"5c4c76e093f1a4b201b51749b5b224d0",
                worried:"209d56970c868166389174693ed17244", angry:"1ccf3e3db1f6f6eb924a7d063c1ac3c0", tired:"b9654a9b3e5fb7eb0d95adc726df8fc7"},
          front:"3c47174fb79a9c114e588457e8c3cdea", back:"0218b495efd05ee9e1a619ec56e1e369", select:"21337f6463a3fe6b47f7499ff4954b39",
          morning:"e484c60840c93b1948e7870ab73d4d19", room:"75d039a099fc0a99a7efba48f6d09783"},
  // 김태식 — 표정: 기본 · 허허 웃음(happy) · 놀람 · 서류 보며 걱정(worried) · 안경 벗어 들고 단호(angry) · 뒷목 주무름(tired)
  taesik:{face:{normal:"7243d39dc2b907ba5b2a5b9a12b23768", happy:"0bd478c9736454722af6a80c45b3fa11", shocked:"29448460c5754d211a4941f8393704c6",
                worried:"ccbbd30a01d205cc92c5c92ba0bfa7b7", angry:"27d0d0bdc31410469e1430b76bdf769e", tired:"628cc3f41aa2e3dc60e65924d5b4edf1"},
          front:"d65a6efdada09189e9b21e111526c199", back:"45af6a95e25e248647beb35e1dd6e873", select:"2452f4871394a4843ed2e61f2a74d9cc",
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
  npc_oldman_angry:"0a0b4be4110093c7a2aab1c49c841475", npc_oldman_troubled:"731bc530757280f674f77303e06e9c6e",
  npc_ajumma_angry:"c7ba8d7c1246aef920d1243a7b2e591c", npc_roughman_troubled:"34aca9df4431899385b3db53640b27a8",
  npc_youngwoman_angry:"c86e874cb298b8f96542d9342c5501c4", npc_youngwoman_troubled:"afc65fcbc0bc9701580227cf571868d9",
  npc_broker_angry:"459fc4b946699b978a06088ddbca9c42", npc_broker_troubled:"848e8bb8d604da42d3e170789b1e20c5",
  npc_mover_angry:"8f4333dcd0678ba37463628586b8424c", npc_mover_troubled:"935c8742eac2086a41cee4e3526e1f84",
  npc_bailiff_normal:"580e0bc82278c3c11afb57963fc8257a"});

// 소품 시트 1
Object.assign(ART_DEFAULT, { prop_keys:"1dec16bd8a6acfaba2533fddde5dbb44", prop_doorlock:"c4f92d364746346833a4b55d6aaead6c", prop_letter:"b2281c57aad6ac86a87859dc861c6ed0", prop_order:"b6750cac30b5bfe735eef0128ae16daf", prop_confirm:"9d65195ebfe4fcec0669fbe5ce53a56f", prop_boxes:"beb210bc4a5617530e69617a41923a78", prop_cash:"dba6864c843485b6c3622aed56e13bb2", prop_notice:"4dd36113a80ac4e08ade22dcc148b1ec", prop_truck:"8258758d43538665526fc4a54876fa6b"});

// 소품 시트 2·3 + 사건 뒤 빈 거실 컷
Object.assign(ART_DEFAULT, { prop_phone:"4595d8d28c8011c600942eb4892cdcb1", prop_calendar:"b7aa83a85dc9576f3088fd15f6b6aa34", prop_bill:"fe178400373bf5686f15bff967f8f9ac", prop_drink:"835c29e0504b6c7f81b545be298b21d9", prop_toolbox:"c11b5c7120c4bd5016e4ce06f597a28c", prop_delivery_boxes:"ffe3cef883f1ebbfc575ce9658810c94", prop_trash_bags:"e59c39078561481755ee176c15854381", prop_mail_bundle:"cccc3406e57affdd54f883247431f172", prop_shoes_slippers:"96c5127b5a2c59f3afb6a1615b6232bb", prop_safe_box:"e5e50fe05c450464022deb80bafad79c", cut_empty_after:"ebb5e6cf420574784e9e1aad5dbc7bfa", bg_room_empty:"5961986acf90e000dd87644d50e24d72"});
