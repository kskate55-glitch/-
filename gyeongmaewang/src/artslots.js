/* ============================== 🖼️ v135 그림 칸 — 오프닝 장면 · 물건 전용 점유자 · 물건 전용 배경 ==============================
   칸 목록과 설명은 gen_prompts.py가 만든 artslots_data.js(ART_SLOTS_V135) 하나에서 온다 — 발주 문서와 같은 이름이다.
   그림이 올라온 칸만 바뀌고, 없는 칸은 지금 그림 그대로다. */
(typeof ART_SLOTS_V135 !== "undefined" ? ART_SLOTS_V135 : []).forEach(s => { if(!ART_SLOTS.some(x => x.id === s.id)) A_(s.id, s.kind, s.title, s.desc, s.use); });
// 물건 전용 배경 — 22개 물건이 같은 빌라 외관·현관·계단을 돌려쓰던 것을 물건마다 바꾼다
const AS_BG_MAP = {bg_villa_day:"ext", bg_villa_night:"ext", bg_front_door:"door", bg_stairs:"door", bg_room_messy:"in", bg_room_empty:"in"};
const _as_bgPick = vnBgPick;
vnBgPick = function(slot){
  const k = AS_BG_MAP[slot];
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
