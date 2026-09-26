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
