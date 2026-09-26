/* ============================== 🖼️ v135 그림 칸 — 오프닝 장면 · 물건 전용 점유자 · 물건 전용 배경 ==============================
   칸 목록과 설명은 gen_prompts.py가 만든 artslots_data.js(ART_SLOTS_V135) 하나에서 온다 — 발주 문서와 같은 이름이다.
   그림이 올라온 칸만 바뀌고, 없는 칸은 지금 그림 그대로다. */
(typeof ART_SLOTS_V135 !== "undefined" ? ART_SLOTS_V135 : []).forEach(s => { if(!ART_SLOTS.some(x => x.id === s.id)) A_(s.id, s.kind, s.title, s.desc, s.use); });
// 물건 전용 배경 — 22개 물건이 같은 빌라 외관·현관·계단을 돌려쓰던 것을 물건마다 바꾼다
const AS_BG_MAP = {bg_villa_day:"ext", bg_villa_night:"ext", bg_front_door:"door", bg_stairs:"door", bg_room_messy:"in", bg_room_empty:"in"};
const _as_bgPick = vnBgPick;
vnBgPick = function(slot){
  const k = AS_BG_MAP[slot];
  // 명도가 끝나 수리에 들어간 뒤의 빈집은 점유자 살림이 그려진 전용 실내 그림으로 덮지 않는다
  if(k === "in" && typeof K !== "undefined" && K && K.repair) return _as_bgPick(slot);
  if(k && typeof K !== "undefined" && K && typeof KP !== "undefined" && KP && KP.gen && KP.id){ const id = `bg_case_${KP.id}_${k}`; if(artUrl(id)) return id; }
  return _as_bgPick(slot);
};
// 물건 전용 점유자 — 같은 인물 코드(pid)가 자유 플레이·문자 협상에서 다른 이야기로 쓰일 수 있어, 물건 칸을 먼저 본다
const _as_artNpc = artNpc;
artNpc = function(pid, ex){
  if(typeof K !== "undefined" && K && typeof KP !== "undefined" && KP && KP.gen && KP.occ && pid === KP.occ.pid){
    const e = ex === "furious" ? "angry" : ex, u = artUrl(`npc_occ_${KP.id}_${e}`) || artUrl(`npc_occ_${KP.id}_normal`); if(u) return u;
  }
  return _as_artNpc(pid, ex);
};
// 물건 속 인물이 자유 플레이 인물과 이름이 다르면(= 다른 사람) 그 자유 플레이 인물을 '만났다'고 도감에 올리지 않는다
//   예: f63 모텔의 탁만수 사장은 자유 플레이의 황금철 씨(노래방)와 다른 사람이다 — 예전엔 "도감 등록 — 황금철 씨"가 떴다
function asOtherPerson(pid){
  if(typeof K === "undefined" || !K || typeof KP === "undefined" || !KP || !KP.gen || !KP.occ || pid !== KP.occ.pid) return false;
  const P = typeof personaById === "function" ? personaById(pid) : null; if(!P) return false;
  const base = n => String(n || "").replace(/\s*\(.*\)\s*$/, "").replace(/\s*(씨|사장|원장|할아버지|할머니)$/, "").trim();
  return base(P.name) !== base(KP.occ.name);
}
if(typeof hubMeet === "function"){ const _as_hubMeet = hubMeet; hubMeet = function(pid){ if(asOtherPerson(pid)) return; return _as_hubMeet(pid); }; }

// 받은 그림 — 물건 전용 점유자(v137: f11 윤서연 · f21 강성필 · f22 마동철 · f23 왕신이 · f31 배정숙)
const AS_OCC_ART = {"npc_occ_f11_normal": "f9e6e9393de49940073eafae3ce5d1c7", "npc_occ_f11_angry": "50a33883e5b35f53c9bcfb8a6396487b", "npc_occ_f11_worried": "1addcef7f1b473f5f9ea726ce0e00590", "npc_occ_f21_normal": "4dbb25d3cd7caf30809e18752c3db3c4", "npc_occ_f21_angry": "f3d5b233687a79b6d596e3b20714bb35", "npc_occ_f21_worried": "5ab000834b1d79ab7d04ee93e3c67a9b", "npc_occ_f22_normal": "90abeacdcd5e726bc37a97b03df9629a", "npc_occ_f22_angry": "bf0b2feb78c5b236fd333f1b1669170c", "npc_occ_f22_worried": "4604160d424ddaa1c5b0d18001df5a62", "npc_occ_f23_normal": "f0a1c684493d6fb2c7099b7877f1fddd", "npc_occ_f23_angry": "100279b3b3bcea4fe635ba29b237578f", "npc_occ_f23_worried": "5903f8ddf7de5380136928c0bd591017", "npc_occ_f31_normal": "9c88e370386c0beae8c8d6980c1cc6a3", "npc_occ_f31_angry": "c0424fb90df720bd42e77500b6e2d705", "npc_occ_f31_worried": "5556d43c0307c5eebf98ad47e9de6a09"};
Object.assign(ART_DEFAULT, AS_OCC_ART);

// 받은 그림 2차(v138: f32 곽씨 부부 · f41 구판석 · f42 장미자 · f51 오승민 · f54 정민재·윤소라)
Object.assign(AS_OCC_ART, {"npc_occ_f51_normal": "9ce6f69124a16aa8cadb9f6c34abdb65", "npc_occ_f51_angry": "c506c8310335012eeace64e51cabc2db", "npc_occ_f51_worried": "ebb1bd31285c2fa57cd7b0002a856546", "npc_occ_f42_normal": "c4caaae9d1f2a29a76e566097a48d0cd", "npc_occ_f42_angry": "e7549087f47070613aab59af57068e6e", "npc_occ_f42_worried": "5f113e5f4f8a7b9a85fb3bdcd9583e80", "npc_occ_f41_normal": "271fdac6a9465b87ae03fedd946f1da2", "npc_occ_f41_angry": "9cd32ce44455a8405cab57f827e426ad", "npc_occ_f41_worried": "ff8a60502663328446a1a2db6b1ad268", "npc_occ_f32_normal": "94db1eb719e9ef73e9588918cc208939", "npc_occ_f32_angry": "de1601301e41bd263be99ad1b6d382eb", "npc_occ_f32_worried": "28150b1a1c6cc8b76c97776600c9ba5b", "npc_occ_f54_normal": "360695f324afbb4102798ae268531355", "npc_occ_f54_angry": "f97b47abd1cb8927db22356cdfb905f4", "npc_occ_f54_worried": "7e8d9d39f17903184888aef896d82adf"});
Object.assign(ART_DEFAULT, AS_OCC_ART);

// 받은 그림 3차(v139: f61 새솔인테리어 현장소장 · f63 탁만수 사장) + 서윤 오프닝 3장
Object.assign(AS_OCC_ART, {
  npc_occ_f63_normal: "648c80e6378e2c135076880c097cf08b", npc_occ_f63_angry: "7505ccde92045a7c46e5e3e94fcea006", npc_occ_f63_worried: "ecfc5186fe6ac0ad29488906b99ebc02",
  npc_occ_f61_normal: "c5752cb0d670daaa019c278f886482cc", npc_occ_f61_angry: "adda3d27123edbc33523f34748bba164", npc_occ_f61_worried: "20e15ee0876330f74485bfefea30b5ca",
});
const AS_OP_ART = {
  op_seoyun_1:   "6673b097946d789c82896ee89ed332e3",   // 비 오는 밤 반지하 방
  op_seoyun_1_2: "5fd07f7bbf1bbb905456eee5e64feaa5",   // 창밖 물 튀기는 바퀴
  op_seoyun_2_3: "4e0c4c235a8a9f4c6c030d310b9a7f31",   // 생각 구름
};
Object.assign(ART_DEFAULT, AS_OCC_ART, AS_OP_ART);

// 받은 그림 4차(v140: f53 엥흐 씨 · f64 변재섭 씨 — 점유자 22명 전원 전용 그림 완료) + 서윤 생각 구름 새 판
Object.assign(AS_OCC_ART, {
  npc_occ_f64_normal: "bbc4b0ea8054db568fa47c1fd627c2af", npc_occ_f64_angry: "a527fc4d3121af26f66d3852f875893f", npc_occ_f64_worried: "f052e812072150f7ff3d08fd5326f73d",
  npc_occ_f53_normal: "b3194611f50c7c0d59eece8a6b32b686", npc_occ_f53_angry: "b421111ead0e86775d95a964c562e872", npc_occ_f53_worried: "d5ac02615dfa87b7db9549b34e544542",
});
AS_OP_ART.op_seoyun_2_3 = "cd14a57881176ee586c6cb138fcb4cfc";   // 창밖 비까지 보이는 새 판으로 교체
Object.assign(ART_DEFAULT, AS_OCC_ART, AS_OP_ART);

// 받은 오프닝 2차(v141): 서윤 발견 장면 + 도현 승강장·골목(편의점 간판 줄무늬는 특정 브랜드처럼 보이지 않게 무채색으로)
Object.assign(AS_OP_ART, {
  op_seoyun_3:   "16c01c32741dffb9beaaaeca962ec5cc",
  op_dohyun_1:   "a810dee8b1ae0db9c5b941f46b4f9d1e",
  op_dohyun_1_2: "b731ddefed2edadf29932375749b9052",
});
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 3차(v142): 도현 현관 도어락 · 원룸 넥타이 · 월급 스쳐 가는 알림
Object.assign(AS_OP_ART, {
  op_dohyun_2:   "7f2d48e7ef12da9d67a9b4a797db7f10",
  op_dohyun_3:   "6b6360bc5c4d5e75210c5604d52ea4a1",
  op_dohyun_3_2: "3730caad0c5232f4b3e98f3ff77261f1",
});
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 4차(v143): 도현 새벽 2시·불 켜진 창 / 미정 마감·알바생
Object.assign(AS_OP_ART, {
  op_dohyun_5:   "fcf061e3a7da7de5dbfdb7bad5b72bc2",
  op_dohyun_5_2: "00872ec25a2d0bc32828d2258e640aad",
  op_mijeong_1:  "29002eb8040577685f2ea2f334e2e93d",
  op_mijeong_2:  "bd2d30b27fc1e8a680d213884981d6a2",
});
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 5차(v144): 미정 — 유리창 너머 불 꺼진 상가
AS_OP_ART.op_mijeong_2_3 = "c55461f714f4a7aee259fd8914c675f4";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 6차(v145): 도현 회상 — 구내식당(도현 오프닝 8칸 완료)
AS_OP_ART.op_dohyun_4 = "3e43e434aef97b631af367f4833175fd";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 7차(v146): 미정 — 동네 부동산 사무실
AS_OP_ART.op_mijeong_4 = "0a7a0b769418acadcbddc6ad6c572027";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 8차(v147): 재훈 — 수리 현장 계단참
AS_OP_ART.op_jaehoon_1 = "3255a0b5d3c1b0ba1da770840281fde6";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 9차(v148): 재훈 — 벽 두드리는 손 클로즈업
AS_OP_ART.op_jaehoon_1_4 = "3f4387c162e1ba02c44937fa53af6fe0";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 10차(v149): 서윤 — 반지하 방에서 은행 앱
AS_OP_ART.op_seoyun_2 = "b6dca34b68f22486df37de13ed89eab8";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 11차(v150): 서윤 — 생각 구름이 톡 터지고 천장 곰팡이(서윤 6칸 완료)
AS_OP_ART.op_seoyun_2_4 = "c330c35a5f9547d42271e028b0fd2f22";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 12차(v151): 미정 — 투룸 식탁에서 검색(미정 5칸 완료)
AS_OP_ART.op_mijeong_3 = "1fe217f2a8d0df9bc203a7d91f9c7f8e";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 13차(v152): 재훈 — 집주인이 놀라는 장면 + 벽 두드리기 새 판(방이 더 보이는 쪽으로 교체, 이전 판 3f4387c1…)
AS_OP_ART.op_jaehoon_2   = "c7807fa0ddacdb3e2ab6e096df3baa54";
AS_OP_ART.op_jaehoon_1_4 = "b59d857ea63382edca565becd2e0d150";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 14차(v153): 재훈 — 국밥집 · 독수리 타법(재훈 5칸 완료, 두 판 중 믹스커피가 보이는 쪽)
AS_OP_ART.op_jaehoon_3 = "4398ca33ae4b2e2f656e07ced89dbdef";
AS_OP_ART.op_jaehoon_4 = "710e881e099adf0607b91760986dcd36";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 15차(v154): 은경 — 아침 마포 오피스텔, 한강
AS_OP_ART.op_eunkyung_1 = "45c78447f3897aa60587e5a8b68db32e";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 16차(v155): 은경 — 계산기 클로즈업 · 소파 통화(시든 퇴직 꽃다발)
AS_OP_ART.op_eunkyung_1_4 = "fa6054e0a12f81c0643d475601b7ba9b";
AS_OP_ART.op_eunkyung_2   = "e71076aefff0af507b450be3e0b3108a";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 17차(v156): 은경 — 밤 스프레드시트 · 안경알 클로즈업(은경 5칸 완료)
AS_OP_ART.op_eunkyung_3   = "028c799d51e4936237ca9f7702e6a95e";
AS_OP_ART.op_eunkyung_3_3 = "ff4a44f0262eae5b3b45e832d1fd970f";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 오프닝 18차(v157): 태식 — 목동 거실 신문 · 통화 · 서재 로그인
AS_OP_ART.op_taesik_1 = "b6267514fd943b8a93b95599f2900221";
AS_OP_ART.op_taesik_2 = "b62b05032d65fdf57f254b165038b186";
AS_OP_ART.op_taesik_3 = "d2bef68e2b2431214517a4d2f04f5138";
Object.assign(ART_DEFAULT, AS_OP_ART);

// 받은 그림 19차(v158): 태식 서재 빌라 사진(오프닝 33장 완료) + 첫 물건 배경 f11 남양주 화도읍(외관·현관·빈집)
AS_OP_ART.op_taesik_4 = "0d766b486ed2ddf29bed68150943cf97";
const AS_BG_ART = {
  bg_case_f11_ext:  "fc03b1660dc5d99eb6b2d61882fd1aac",
  bg_case_f11_door: "933abeeb1dad1ee88f7ec86fed71d1f1",
  bg_case_f11_in:   "b547ef27dcd47e0e7b7b85deef1bee6b",
};
Object.assign(ART_DEFAULT, AS_OP_ART, AS_BG_ART);

// 받은 배경 2차(v159): f12 의정부 가능동 원룸 — 외관(경전철 고가)·3층 복도(빈집은 아직 → 공용 배경)
Object.assign(AS_BG_ART, {
  bg_case_f12_ext:  "560d004349d82572f08c0b2c9cf3b01e",
  bg_case_f12_door: "a7432f865b29701a311d1c1d5cf55166",
});
Object.assign(ART_DEFAULT, AS_BG_ART);

// 받은 배경 3차(v160): f12 빈 원룸(창밖 서울 타워는 의정부에서 안 보여서 지움) — f12 3장 완료
AS_BG_ART.bg_case_f12_in = "f0925c0f238138101f9b9c2ce8a3d41b";
Object.assign(ART_DEFAULT, AS_BG_ART);

// 받은 배경 4차(v161): f13 고양 화정동 복도식 아파트 — 단지 외관(서울 타워 지움)·체인 걸린 7층 현관
Object.assign(AS_BG_ART, {
  bg_case_f13_ext:  "5300732b59c0561a684931fd43b490af",
  bg_case_f13_door: "8d764ff86127f258db0a3da718941d7c",
});
Object.assign(ART_DEFAULT, AS_BG_ART);

// 받은 배경 5차(v162): f13 커튼 친 게이밍 방(f13 완료) + f21 부천 심곡동 — 먹자골목 외관·골프백 놓인 3층 현관
Object.assign(AS_BG_ART, {
  bg_case_f13_in:   "8ac485bfddfb401d4169383e5a73195b",
  bg_case_f21_ext:  "7948d919ad241c6138191a59a3ae1117",
  bg_case_f21_door: "0c11cb383f78a3adbffbb075a5b21b2b",
});
Object.assign(ART_DEFAULT, AS_BG_ART);

// 받은 배경 6차(v163): f22 인천 부평 — 새벽 택배 화물차 외관
AS_BG_ART.bg_case_f22_ext = "d1a709e75bb64c5da3e7358a79180664";
Object.assign(ART_DEFAULT, AS_BG_ART);

// 받은 배경 7차(v164): f22 부평 — 고양이 내다보는 2층 현관·캣타워 거실(f22 완료)
Object.assign(AS_BG_ART, {
  bg_case_f22_door: "2784e3bf8a5eab6377f314d22fadc1f1",
  bg_case_f22_in:   "1f980f71e6f131d6f379db818ba391b6",
});
Object.assign(ART_DEFAULT, AS_BG_ART);

// 받은 배경 8차(v165): f23 수원 율전동 — 벚꽃 핀 대학가 원룸촌 외관
AS_BG_ART.bg_case_f23_ext = "cdef05543c0e09045ac327e43f8ff9c6";
Object.assign(ART_DEFAULT, AS_BG_ART);

// 받은 배경 9차(v166): f23 율전동 — 에코백 걸린 4층 복도(슬리퍼 세 줄 무늬는 브랜드처럼 보여 지움)·이층 침대 원룸(f23 완료)
Object.assign(AS_BG_ART, {
  bg_case_f23_door: "2c835ac5a88aafcdbdddb52b2bcc1205",
  bg_case_f23_in:   "3ac8478cec45edd3e3f960dede06550a",
});
Object.assign(ART_DEFAULT, AS_BG_ART);

// 받은 배경 10차(v167): f31 영등포 상가주택 — 1층 미용실 외관·미용실 안쪽 입구
Object.assign(AS_BG_ART, {
  bg_case_f31_ext:  "5075818ed0341aec9714fdc18e0ac399",
  bg_case_f31_door: "d0d3f4f5affb30eb51e53e01afd3743c",
});
Object.assign(ART_DEFAULT, AS_BG_ART);
// 받은 배경 11차(v170): f32 30년 중식당 — 가게 외관·홀(입구 쪽)·주방
Object.assign(AS_BG_ART, {
  bg_case_f32_ext:  "43d9983708207e0e40a501b06d231c7f",
  bg_case_f32_door: "b499f21825169d63597e0a4a474a7ea3",
  bg_case_f32_in:   "e48b6ec33c1a6fd8cdd5ab3500afbf25",
});
Object.assign(ART_DEFAULT, AS_BG_ART);
// 받은 배경 12차(v171): f33 신림동 — 사다리차 대기 골목(트럭 앞 엠블럼 지움)·짐 싸다 만 현관·거실 / f34 망원동 — 빵집·꽃집 골목·아이 신발 현관
Object.assign(AS_BG_ART, {
  bg_case_f33_ext:  "a99c5577004e89bbdcdce7404906677a",
  bg_case_f33_door: "90ac51d8fbc037fbdc4cb5c5b3c33185",
  bg_case_f33_in:   "8a329490a6745ac5d7026a080ab22dca",
  bg_case_f34_ext:  "192fbbad1109c1a5525ab7685829b3bf",
  bg_case_f34_door: "d56c8f19929fa8eea4c4797b8d9b987b",
});
Object.assign(ART_DEFAULT, AS_BG_ART);
