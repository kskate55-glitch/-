/* ================= 🖼️ 시트 그림 — 게시판 건물 사진 · 조사 파일 증거 사진 · 오늘 날씨 · 다음 물건용 보관함 =================
   GPT 시트 5장에서 잘라 올린 그림. 지금 게임에 있는 자리에 바로 쓰고, 아직 없는 물건(상가·오피스텔·공장 등)
   그림은 그림 보관함에 칸으로만 등록해 둔다. */
const SH_ART = {
  ext_k1:"8da97d931981eacf7bc89f159d5ecc0d", ext_k2:"ed8ccd4a6e4ca92591c52d4103a7e58b", ext_tenant:"f8827b45287483e93de2935e8df096cb", ext_share:"b93fcb75df93465f28328ceda110434c",
  ext_lien:"f9c4caa71bf52b93182680a78ecd0f06", ext_land:"9d4666e0e392d8aaa647731fc97bef7f", ext_shop:"c0eec95cbb8b0f0a0637dd5bc4ac4872", ext_officetel:"e0c4425bf81ca76c4c1e56e744e60194",
  ext_factory:"0706878fb4c16a27c93627cd6adef425", ext_shopbldg:"8e6510a6bcb46a5af83db26b655d2010",
  wx_clear:"ed4df530449ca5cf199b65f0bb39480d", wx_cloud:"e1adf5935aa061063669da62172e5b1a", wx_rain:"49bf19d616f81c13bd10dfb515505bf7", wx_snow:"7e76e5eb47d99c38aeb5e78db6c695de", wx_dusk:"974fff7c9e566c2927ca8fc9fbe028cc",
  ev_docs:"ff767ac5dbbd9e93ee908da4474f9498", ev_lease:"0fe73324241a41ff7c0e5702bdca7f58", ev_resid:"d72d0ffa51e2c57d90b8fc7de8e7bf7a", ev_photos:"d6e4124a4b3292ff15a665a0af6bb4a0",
  ev_fee:"7d19fff0c3d81c25a3ad947461f35142", ev_chat:"43cf1d7ce9b432ba5f0b57932a55a8d2", ev_bank:"284ecb37976c0d22f247e0f294d5c6c5", ev_keys:"4f5ab57802a7f77c3d58b22e3ab0f4ed",
  ev_bill:"ffad517e701a58c9a04d730bf383e900", ev_contract:"15db3d3601fb92a4eef07aabe7dece30", ev_doorlock:"c044c3e55f9ad1f203de6b4813d4a21b", ev_chat2:"03077c03e0c9715f42cf86620d7f5d6e",
  ev_trash:"ef53f0164fbd19986dcf450ca13246a0", ev_meter:"0bf141a58cca11893beee9f6bd9548e1", ev_cctv:"581da2bc7bdf7e88f1ef9bef8bc39dbf", ev_note:"c552a317e593c940a8346faf5b1aee1f",
  ev_housekey:"4d922b74ee3dde167182fbcdf860c3e6", ev_bath:"ea838f451360127aa80b26f25e3d4de2",
  bg_int_hall:"4ccd049d6bb6b2a8fcd541deae04c4f9", bg_int_goshi:"2fe334e85e925e6921d705ddf9dc5264", bg_int_shop:"e389b67fabd84d1ae23d859989800b1d", bg_int_factory:"5439c1dfe058fea4ce8c8b97e6564bd2",
  npc_type_debtor:"cb71ca6cbb2f43d341d8138707dbde58", npc_type_family:"b7c23a356895afae4f1dca7edb911479", npc_type_lien:"194718427e4c2d014d0b6a3383389a4c", npc_type_haggler:"f872d3ba1d7353e59976099c497f688a", npc_type_absent:"b36f62e99666879e384fb58e7145bbb3",
  npc_granny_normal:"ab4678eaa26e2df4ae8f694dde4c8fd9", npc_granny_angry:"1f9f4f82c8ea695fd2a89d432801866c", npc_granny_worried:"d1a74be8163ba9efd08e71dd7b090ec3", npc_granny_happy:"d5f28a25f930d2806b9064c44f5049a7", npc_granny_shocked:"351ed791c1e8d018056f7bd41f4082d9", npc_granny_soft:"58473e34d9a4cb9479858fbaa87285ca",
  npc_hoodie_normal:"d8402b5cbf631eb7ec8bb6bbf466a6e4", npc_hoodie_happy:"206a2609f976cb60b219c847f68e2f3f", npc_hoodie_angry:"e6633297593bc8e4456a8a23c0b2cd10", npc_hoodie_worried:"463e594b119c8170f58048a646b68407", npc_hoodie_shocked:"04243175e040e6114ab5c34263f72c16", npc_hoodie_soft:"a4ac273fec5001000502a72e022ab049"};
Object.assign(ART_DEFAULT, SH_ART);
// 그림 보관함 목록(그림 탭)에도 올린다
[["ext_k1","bg","1번 물건 외관 — 오래된 빌라","게시판"],["ext_k2","bg","2번 물건 외관 — 은평구 빌라","게시판"],["ext_tenant","bg","투룸(선순위 임차인) 외관","게시판"],["ext_share","bg","지분 빌라 외관","게시판"],
 ["ext_lien","bg","유치권 신축 빌라 외관","게시판"],["ext_land","bg","대지권 미등기 빌라 외관","게시판"],["ext_shop","bg","상가 외관","다음 물건(준비)"],["ext_officetel","bg","오피스텔 외관","다음 물건(준비)"],
 ["ext_factory","bg","공장·창고 외관","다음 물건(준비)"],["ext_shopbldg","bg","상가 건물 외관","다음 물건(준비)"],["bg_int_hall","bg","다가구 복도","다음 물건(준비)"],["bg_int_goshi","bg","고시원형 방","다음 물건(준비)"],
 ["bg_int_shop","bg","폐업 상가 내부","다음 물건(준비)"],["bg_int_factory","bg","공장 내부","다음 물건(준비)"],["wx_clear","bg","골목 — 맑음","오늘 날씨"],["wx_cloud","bg","골목 — 흐림","오늘 날씨"],
 ["wx_rain","bg","골목 — 비","오늘 날씨"],["wx_snow","bg","골목 — 눈","오늘 날씨"],["wx_dusk","bg","골목 — 노을","오늘 날씨"]].forEach(([id,k,t,u]) => A_(id, k, t, t, u));
Object.keys(SH_ART).filter(k => /^ev_/.test(k)).forEach(k => A_(k, "prop", "증거 — " + k.slice(3), "증거 카드", "조사 파일"));
[["npc_type_debtor","채무자 본인(버티는 유형)"],["npc_type_family","아이 있는 가족"],["npc_type_lien","유치권 주장(공사대금)"],["npc_type_haggler","이사비 협상꾼"],["npc_type_absent","폐문부재·잠적"]].forEach(([id,t]) => A_(id, "npc", t, t, "다음 물건(준비)"));
["normal","angry","worried","happy","shocked","soft"].forEach(e => { A_("npc_granny_" + e, "npc", "고령 임차인 할머니 — " + e, "고령 임차인", "다음 물건(준비)"); A_("npc_hoodie_" + e, "npc", "후드티 청년 — " + e, "청년 점유자", "다음 물건(준비)"); });

function shUrl(k){ const a = SH_ART[k]; return a ? (window.GMW_STANDALONE ? "assets/" + a + ".webp" : "/_blob/" + a) : null; }
// 조사 파일 카드 id → 증거 사진
const SH_EV = {docs:"ev_docs", elec:"ev_meter", flip:"npc_granny_normal", price:"ev_chat", fee:"ev_fee", kim:"ev_chat2", leak:"ev_bath", dump:"ev_photos", loan:"ev_bank"};
function shEvKey(c){ if(c.id === "inside") return KP && KP.id === "k2" ? "ev_doorlock" : "ev_housekey"; return SH_EV[c.id] || null; }
// 게시판 물건 → 건물 사진
function shBoardKey(it){ if(!it) return null; if(it.kind === "case") return "ext_" + it.prop; return "ext_" + it.decoy; }
function shWxKey(){
  const N = typeof snNow === "function" ? snNow() : null, id = N && N.W ? N.W.id : "clear";
  if(id === "rain" || id === "monsoon") return "wx_rain"; if(id === "snow") return "wx_snow"; if(id === "cloudy") return "wx_cloud";
  if(K && K.lf){ const d = K.lf.days[K.lf.rday]; if(d){ const h = Math.floor((d.s + (d.len - (K.timeLeft || 0))) / 60); if(h >= 17) return "wx_dusk"; } }
  return "wx_clear";
}
function shApply(){
  // 게시판(거점·사무실 어디서 열든)
  document.querySelectorAll(".bd-card").forEach(card => {
    if(card.querySelector(".bd-thumb")) return;
    const b = card.querySelector("[data-bdplay],[data-bdread],[data-bddecoy],[data-bdwait],[data-bdwatch]"); if(!b || typeof bdRec !== "function") return;
    const key = b.dataset.bdplay || b.dataset.bdread || b.dataset.bddecoy || b.dataset.bdwait || b.dataset.bdwatch;
    const it = bdRec().items.find(x => String(x.key) === String(key)), u = shUrl(shBoardKey(it)); if(!u) return;
    const top = card.querySelector(".bd-top"); if(top) top.insertAdjacentHTML("beforebegin", `<div class="bd-thumb" style="background-image:url('${u}')" aria-hidden="true"></div>`);
  });
  if(typeof stgActive !== "function" || !stgActive()) return;
  // 조사 파일 카드
  const cards = typeof keCards === "function" ? keCards() : [];
  document.querySelectorAll(".ke-cards .ke-card").forEach((el, i) => {
    const c = cards[i]; if(!c || !el.classList.contains("on") || el.querySelector(".ke-photo")) return;
    const u = shUrl(shEvKey(c)); if(!u) return;
    const ic = el.querySelector(".ke-ic"); if(ic) ic.outerHTML = `<span class="ke-photo" style="background-image:url('${u}')" aria-hidden="true"></span>`;
  });
  // 오늘 날씨 그림 — 날짜 칩 위에
  const chip = document.querySelector(".kfs-panel .sn-chip");
  if(chip && !document.querySelector(".kfs-panel .stg-wx")){ const u = shUrl(shWxKey()); if(u) chip.insertAdjacentHTML("beforebegin", `<div class="stg-wx" style="background-image:url('${u}')" aria-hidden="true"></div>`); }
}
const _sh_render = renderArena; renderArena = function(){ _sh_render(); queueMicrotask(shApply); };
