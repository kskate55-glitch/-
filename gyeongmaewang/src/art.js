/* ================= 🎨 그림 자산: 발주서(슬롯 목록) + 업로드 + 불러오기 =================
   S.art = {슬롯id: 자산id}. 자산은 artifact assets에 올리고 "/_blob/"+id 로 모든 기기에서 보인다(S는 db로 동기화). */
const ART_STYLE = "16비트 픽셀아트, 한국 현실 빌라·다세대 디테일(현관 도어락, 계단 형광등, 전봇대 전선, 초록 방수 옥상, 우편함), 따뜻하지만 약간 칙칙한 색감, 외곽선 1px 어두운 색, 부드러운 그림자. 글자·간판 문구·로고·실존 인물 얼굴 금지.";
const ART_KINDS = {
  bg:  {name:"배경", size:"1920×1080", note:"16:9, 사람 없음, 가운데 60%가 중요(모바일은 가운데만 잘려 보임)"},
  npc: {name:"인물", size:"768×1024", note:"투명 배경 PNG, 무릎 위 정면~3/4, 발밑 기준 같은 위치·같은 크기, 표정만 다르게"},
  prop:{name:"소품", size:"512×512", note:"투명 배경 PNG, 물건 하나만 가운데"},
  cut: {name:"컷신", size:"1920×1080", note:"16:9, 한 장면 일러스트"}
};
const ART_SLOTS = [];
const A_ = (id, kind, title, desc, use) => ART_SLOTS.push({id, kind, title, desc, use});
// 배경 9
A_("bg_villa_day","bg","빌라 외관 — 낮","4~5층 적벽돌 다세대 빌라, 1층 필로티 주차장, 외벽 에어컨 실외기, 전봇대와 늘어진 전선, 맑은 하늘","게임 시작·평상시");
A_("bg_villa_night","bg","빌라 외관 — 밤","같은 빌라의 밤, 창문 몇 개만 불 켜짐, 가로등 주황빛","밤·긴장 장면");
A_("bg_stairs","bg","계단 복도","좁은 계단참, 깜빡이는 형광등, 벽에 붙은 전단지 자국, 계량기함","방문·찾아가기");
A_("bg_front_door","bg","현관문 앞","철제 현관문과 디지털 도어락, 문 앞 신발 두 켤레, 우유 투입구","문 두드리기·안내문");
A_("bg_room_clean","bg","거실 — 깔끔","짐이 빠진 깨끗한 거실, 장판·도배 새것, 창으로 햇빛","인도 확인·명도 성공");
A_("bg_room_messy","bg","거실 — 험함","짐과 박스가 쌓인 어수선한 거실, 누렇게 뜬 벽지, 곰팡이 자국","버티는 중·잔존물");
A_("bg_court","bg","법원 민원실 복도","대리석 바닥 법원 복도, 번호표 기계, 긴 의자(사람 없음)","인도명령·소송");
A_("bg_realtor","bg","부동산 사무소","동네 공인중개사 사무소 내부, 매물 벽보(글자 없이), 책상과 손님 의자","중개사 상담");
A_("bg_alley","bg","골목","언덕길 주택가 골목, 주차된 소형차, 빨간 고무대야 화분","이동·탐문");
// 인물 10명 × 표정 3
const ART_NPC = [
  ["p_grandpa","최만식 할아버지(68)","하루 벌어 사는 건설 일용직, 햇볕에 그을린 얼굴, 작업 조끼·목장갑, 마른 체형"],
  ["p_phishing","오태석·한미정 부부(40대)","부부 두 명이 한 그림에, 남편은 팔짱 낀 고압적 자세, 아내는 휴대폰을 든 날 선 표정, 깔끔한 옷차림"],
  ["p_hug","마동철 씨(54)","체격 큰 50대 남성, 민소매에 팔 문신, 반삭발, 무뚝뚝하고 비협조적 인상(험악하되 과장된 악당 표현은 X)"],
  ["p_5000","한정우·서지은 부부(40대)","평범한 40대 맞벌이 부부 두 명이 한 그림에, 초등생 자녀 가방이 발밑에"],
  ["p_youth","은하늘 씨(21)","보호종료 청년, 후드티, 앳되고 지친 표정, 배낭"],
  ["p_basic","구판석 할아버지(79)","기초생활수급 노인, 지팡이, 낡은 카디건, 굽은 등"],
  ["p_mind","장미자 씨(56)","정신건강에 어려움이 있는 중년 여성 — 조롱·과장 금지, 평범한 옷차림, 불안해 보이는 눈빛"],
  ["p_cn","왕신이 씨(24)","중국인 대학원생, 안경, 백팩과 전공서적 — 국적 고정관념 소품 금지"],
  ["p_pk","아메드 씨 외 3명","파키스탄 출신 공장 근로자 4명이 한 그림에, 작업복, 20~30대 — 고정관념 표현 금지"],
  ["p_coop","정은주 씨(52)","협조적인 전 소유자, 단정한 옷, 지쳤지만 예의 바른 인상"]
];
const ART_EXPR = [["normal","보통"],["angry","화남·거부"],["worried","곤란·걱정"]];
for(const [pid,nm,d] of ART_NPC) if(!/^p_(grandpa|basic|5000|phishing|mind|coop|hug|youth|senior)$/.test(pid)) for(const [ex,exn] of ART_EXPR) A_(`npc_${pid}_${ex}`,"npc",`${nm} — ${exn}`,`${d}. 표정: ${exn}`,"그 사람 전용(유형 그림보다 먼저 쓰임)");
A_("npc_bailiff_normal","npc","집행관","정장 차림 50대 법원 집행관, 서류판을 든 모습(실제 제복·휘장 재현 X)","강제집행·계고");
// 소품 15
[["prop_keys","열쇠 꾸러미"],["prop_doorlock","디지털 도어락"],["prop_letter","내용증명 봉투(글자 없음)"],["prop_order","법원 결정문 서류철"],["prop_confirm","명도확인서와 인감 도장"],["prop_boxes","이삿짐 박스 더미"],["prop_cash","흰 돈봉투"],["prop_notice","문에 붙은 안내문 종이(글자 없음)"],["prop_truck","작은 이삿짐 트럭"],["prop_phone","문자 알림이 뜬 휴대폰"],["prop_calendar","날짜에 빨간 동그라미 친 벽걸이 달력"],["prop_bill","관리비 고지서 봉투"],["prop_drink","음료수 한 박스"],["prop_toolbox","빨간 공구상자"],["prop_cat","의자에 앉은 고양이"]].forEach(([id,t])=>A_(id,"prop",t,t,"이벤트 카드·아이콘"));
// 컷신 5
A_("cut_notice","cut","계고","집행관이 현관문에 안내문을 붙이는 뒷모습, 복도 형광등","강제집행 계고");
A_("cut_moving","cut","이사 가는 날","빌라 앞 이삿짐 트럭에 짐을 싣는 장면, 아침 햇살","합의 이사");
A_("cut_keys","cut","열쇠 받는 순간","손에서 손으로 열쇠가 건네지는 클로즈업","명도 완료");
A_("cut_signing","cut","서류 서명","테이블 위 서류에 도장을 찍는 손, 커피 두 잔","합의서·명도확인서");
A_("cut_aftermath","cut","사건 뒤의 빈 집","불이 꺼진 빈 거실, 벽 한쪽에 그을음 흔적, 사람 없음, 차분한 톤(자극적 묘사 금지)","위기 이벤트 뒤");

// ── 지피티 1차 MVP 발주서(46장) 파일명을 그대로 받는 칸들 ──
const ART_TYPES = [["husband","40대 가장"],["worker","건설 일용직 60대"],["mind","50대 여성(불안)"],["owner","50대 전 집주인 여성"],["greedy","50대 약삭빠른 남성"],["foreman","인테리어 현장소장"],["student_cn","중국인 대학원생"],["couple_hw","화교 부부"],["worker_mn","몽골인 근로자"],["workers_pk","파키스탄 근로자 4명"],["oldman","노년 남성"],["ajumma","중년 아줌마"],["roughman","험한 인상 남성"],["youngman","자취 청년"],["youngwoman","젊은 여성 세입자"],["broker","공인중개사"],["mover","이사업체 직원"],["player","플레이어"]];
const ART_EXPR2 = [["neutral","보통"],["angry","화남"],["troubled","곤란"]];
for(const [t,tn] of ART_TYPES) for(const [e,en] of ART_EXPR2) A_(`npc_${t}_${e}`,"npc",`${tn} — ${en}`,`${tn}, 표정: ${en}`,"유형별 공용 인물");
// 점유자 → 유형 (그 사람 전용 그림이 없으면 유형 그림을 쓴다)
const ART_PTYPE = {p_grandpa:["worker","oldman"], p_basic:"oldman", p_5000:["husband","ajumma"], p_phishing:["husband","ajumma"], p_mind:["mind","ajumma"], p_coop:["owner","ajumma"], p_hug:"roughman", p_greedy:["greedy","roughman"], p_lien:["foreman","roughman"], p_cn:"student_cn", p_hwagyo:"couple_hw", p_mn:"worker_mn", p_pk:"workers_pk", p_youth:"youngman", p_ghost:["husband","youngman"], p_fake:"youngman", p_delay:["husband","youngman"], p_senior:"youngwoman"};
const ART_EXMAP = {normal:"neutral", angry:"angry", worried:"troubled"};
// 지피티 파일명 → 이 사이트 칸
const ART_ALIAS = {bg_villa_ext_day:"bg_villa_day", bg_villa_ext_night:"bg_villa_night", bg_stair_hall_old:"bg_stairs", bg_entryway_clutter:"bg_front_door", bg_living_clean_old:"bg_room_clean", bg_living_rough:"bg_room_messy", bg_court_hall:"bg_court", bg_broker_office:"bg_realtor",
  cut_notice_attach:"cut_notice", cut_empty_after:"cut_aftermath", cut_moving_truck:"cut_moving", cut_key_handover:"cut_keys", cut_sign_confirmation:"cut_signing",
  prop_keyring:"prop_keys", prop_document_set:"prop_confirm", prop_boxes_stack:"prop_boxes", prop_maintenance_bill:"prop_bill", prop_pet_small:"prop_cat"};
[["bg_banjiha","반지하 방"],["bg_oneroom","좁은 원룸"],["bg_factory_dorm","공장 컨테이너 숙소"],["bg_shop_closed","셔터 내린 상가"],["bg_warehouse","창고 내부"],["bg_rooftop","빌라 옥상"]].forEach(([id,t])=>A_(id,"bg",t,t,"2차 배경"));
[["cut_empty_after","사건 뒤의 빈 거실(대체 이름)"],["cut_court_order","결정문 우편 꺼내기"]].forEach(([id,t])=>A_(id,"cut",t,t,"2차 컷신"));
[["npc_bailiff_neutral","집행관"],["npc_locksmith_neutral","열쇠공"],["npc_manager_neutral","관리인 할아버지"],["npc_kid_neutral","초등학생 아이"],["npc_grandma_neutral","80대 할머니"]].forEach(([id,t])=>A_(id,"npc",t,t,"조연"));
[["prop_dog","강아지"]].forEach(([id,t])=>A_(id,"prop",t,t,"반려동물"));
[["prop_delivery_boxes","택배 상자 묶음"],["prop_trash_bags","쓰레기 봉투 더미"],["prop_mail_bundle","우편물·고지서 뭉치"],["prop_shoes_slippers","신발·슬리퍼"],["prop_safe_box","작은 금고"]].forEach(([id,t])=>A_(id,"prop",t,t,"이벤트 카드·아이콘"));

function artRec(){ if(!S.art) S.art = {}; return S.art; }
// 기본 그림(캐릭터 시트에서 잘라 미리 올려 둔 것) — 사용자가 같은 칸에 올리면 그걸 먼저 쓴다
const ART_DEFAULT = (()=>{ const B = {elder:"6f26b3c0c61d4e77cb54a467f8736af1", ajumma:"ded574924ac128388814a2aa829acdf5", tough:"a344adad162d95e3c0f5073b5e841609", youth:"47b7a363ebbb15e6c73587565c09feab", woman:"7ed006148dabc57355000a264abfcfc4", broker:"34e43deeadb98733074366183813e079", mover:"bbecef94959f4f0f0e6655237c887953", player:"a3e075a0d8123a722353f898cb1b1a8a"};
  return {npc_oldman_neutral:B.elder, npc_ajumma_neutral:B.ajumma, npc_youngman_neutral:B.youth, npc_broker_neutral:B.broker, npc_mover_neutral:B.mover, npc_player_neutral:B.player, bg_room_clean:"36ead17906e050e290f7aff4f10b740e", npc_youngman_troubled:"515e409e4ee52f0626d126d4e042a26e", npc_youngman_angry:"6508deda532abe1395545aba6a1b12aa", npc_roughman_neutral:"1bbf812a89d29816b090f682fdeab604", npc_roughman_angry:"e031f340366ec3c66e9e66b27df7b6ec", npc_ajumma_troubled:"e7c68a7d3d511b7b959edad5b8d3cb77", npc_youngwoman_neutral:"65e6565d2553321f06dc7e00407517ce", cut_moving:"bea6c141bcca5f6a1158c7372da62b34", bg_court:"8c21fbf1109b26531ca7fe7de1675f55", bg_stairs:"30b546af613470a372ac1304083eb83a", bg_villa_night:"b45b1eab23dc77ec7d3af22879b6c56e", npc_husband_neutral:"a109e81520c71193dc0b3f747d80b9a7", npc_husband_angry:"1c2741c4b9e3a8111ad5edcd1620da2d", npc_husband_troubled:"182830f402e8ecb5761b2bc233bfb626", bg_alley:"b3d7065bf16221f0b6c904c38b404f9b", bg_villa_day:"1bca75fe1bb28d36d8d23e19744cbc6f", npc_bailiff_neutral:"fd56cb22f8c97862a563cf1631f811f2", npc_couple_hw_angry:"79f43904a79676fae57d2433c89a4fb6", npc_couple_hw_neutral:"251b22a7c0094f6ecb0d9e4f30afd53c", npc_couple_hw_troubled:"5ca926d86d743b68e7d0baaa20932c02", npc_foreman_angry:"ed6ac7b63c6de1db45e8141143212786", npc_foreman_neutral:"92eb11a43fca3b1ce46031a155cf8196", npc_foreman_troubled:"780cda291c5a102e0e32ff0b43ddd985", npc_grandma_neutral:"bc155c093ffa3049a5f99dcdb5d34ba0", npc_greedy_angry:"f487378da3ae19c6f6e00c69abfe68e1", npc_greedy_neutral:"2348d20e44c374c8cabca32cf0a8d48c", npc_greedy_troubled:"07a829d1f890de4ee2618d332e6475fc", npc_kid_neutral:"0f0cc1358a4a50940edb733987e5e88a", npc_locksmith_neutral:"66035bf68cb95d583dbbd6f4b382e12e", npc_manager_neutral:"80649f2cd461677a8a9cb3b61454ea44", npc_mind_angry:"54d792f17788e28d21894f44c7327024", npc_mind_neutral:"0ca4887ec007b4b45c9e646482fa82fa", npc_mind_troubled:"082230152d226b75b01a97b38fb70000", npc_owner_angry:"c9a3b4eaefc058b2421539123adee2e0", npc_owner_neutral:"142314ae9a8010d4fb9e2b8d7d68f859", npc_owner_troubled:"92e15be7f462931eb1348c9767818a6c", npc_student_cn_angry:"4d239c5d773fa51beeec0d759a3a551e", npc_student_cn_neutral:"b867682d833f9c2e340b8e325c53c5d8", npc_student_cn_troubled:"131ec126d6bf33119a8c73f3887ebdf5", npc_worker_angry:"74c9890ef0b1c76b3122bfb9202016a8", npc_worker_mn_angry:"01f25469e3f18f6a985ac62677ffd6e2", npc_worker_mn_neutral:"e4e33e6a775f920030e7095b546aef90", npc_worker_mn_troubled:"79effc462cffd24ef30ad6b4ecef9ecb", npc_worker_neutral:"cb2578fc82c9d38be23ec9daa6e0eac5", npc_worker_troubled:"175e98d8c92982c425bc6b49b0446d65", npc_workers_pk_angry:"93aa294afbc35bb417aa8117e6b3ce27", npc_workers_pk_neutral:"76c2d1abc9550fe7d9a662f2024ba3c6", npc_workers_pk_troubled:"de2262144d03e3fd7a73cda59b98ef52", prop_cat:"079a1b94e32f580cf1309e4a77e93e6a", prop_dog:"2d0c2bd1334c518c1b990816a8798b06", bg_banjiha:"05dfb34b4ffcb121418e53aa1860a452", bg_factory_dorm:"37a5c6228867f55b545cc4a202c6bc18", bg_oneroom:"e093651fe8fd664bc86de833b456d1df", bg_realtor:"dc0a503db23faa89f473bec514cc4f6f", bg_rooftop:"3c2d861f913d226b1ca63ae7e3e90698", bg_room_messy:"102b655804e4b860a9fdaaf5e493e409", bg_shop_closed:"061b1be2fe03dbb1bed3f3036b86437e", bg_warehouse:"122726d17c8c251b82f55a0a8ce4940b", cut_aftermath:"4c9ee4eb006496f82f6f81b65d6c4b6d", cut_court_order:"1a4a1e8316b2b1ac31c853c6a5491b0d", cut_keys:"69afcd628fb43d03f3552cf6dc247ebd", cut_notice:"1b79fc7e06a1d15d762ba1d2cba24d1e", cut_signing:"5647330c5a82bf256b6449825847c4ec"}; })();
// v31: 새 인물 그림 — 여동생(장미숙), 정은주 씨, 최만식 할아버지
Object.assign(ART_DEFAULT, {
  bg_front_door:"f75514818f6ae785eef4793554996298",
  npc_sister_troubled:"e6aa2e5d4d99802e995d76fdcdda756c", npc_sister_neutral:"9384319772679151841e9f2a9c4437bd", npc_sister_angry:"29e1c9be8f620565969a251d545b2a12",
  npc_p_coop_worried:"b0dc2828f6446810b271a8fbab9bd0d2", npc_p_coop_normal:"9bb185db6f0c8c1cbef765aa8291b6ca", npc_p_coop_angry:"1d49de1bb6c421695f95c6cc23a87ea0",
  npc_p_grandpa_worried:"2dd83febb8dfac33231d661d2dc37612", npc_p_grandpa_normal:"f3755e1682096d38c61b44f6a163d642", npc_p_grandpa_angry:"ffa7e66285fd67cbca4bd047de4982b1",
  npc_p_grandpa_furious:"f1dcad0ce8e025684f065684a7313940", npc_p_phishing_normal:"632c7b6100130dc12a6eb98886add3b3", npc_p_phishing_angry:"a578b335cfa9b48e6b895ac17c8f93ab", npc_p_phishing_worried:"5cecbc8058ef56b58791e99e6241e5fa", npc_p_5000_normal:"addcfe619b6b757f397ed53dfdcf1397", npc_p_5000_angry:"2016fe0c37d5e676621c9e9c18467a61", npc_p_5000_worried:"5acbc29d084d873bc7d007d05ddd1dcb", npc_p_delay_normal:"2731cc0e10488ee5959f2ee35ce526ae", npc_p_delay_angry:"4cd4b98d249dcf7059c217e39abed09a", npc_p_delay_worried:"d2056bffcddeed8725db028d7f88f6c9", npc_p_youth_normal:"1fef97cfa37a4c919c3ec7ef5d91f906", npc_p_youth_angry:"805995e7cd3cee181125d39befe9d2e9", npc_p_youth_worried:"d4192f456daeba00ac3ce9e59c799270", npc_p_fake_normal:"944a775b4d4eaf4af4ea1f5ff841a309", npc_p_fake_angry:"0e4cac439837fc794b8bb4838048e292", npc_p_fake_worried:"f9ff22f321f35a5e7406729fb0741bc9", npc_p_ghost_normal:"0b96c3bf8bb48f5c57087b5ec36d612e", npc_p_ghost_angry:"8fba7bf712e435db819cdc99ff2dee2e", npc_p_ghost_worried:"fec5185432a752d5a1ed799e36b4efb5", npc_kim_normal:"e44b8f963dcc9eec0a56dc53c68338b2", npc_kim_angry:"209b628ef33a8f46a9b757cf109c36bd", npc_kim_worried:"ad9b0eb477ce04af94c87c010294afbb", npc_parkbk_normal:"d633596e8e6edf78d7f845692c614262", npc_parkbk_angry:"7add11cdaf7b8dc3756f6ad6640b6d1b", npc_parkbk_worried:"12956677f874357230c2065c5a09e388", npc_downstairs_normal:"ad9248ee1fe16fafa04e77d2f852aaa8", npc_downstairs_angry:"2def515e5b2afec3b2af28c6b4c24747", npc_downstairs_worried:"aeb457d0c75989e62b37971cd7c63500", npc_banker_normal:"54455f16b7d54ec62a45aed619bd28f5", npc_banker_angry:"1004c013a8979968cdda32e56ba7b942", npc_banker_worried:"8a319ca33e51912688db001b363f8707",npc_elec_normal:"1a7d18cc6e3db11455700e13a1f094ad",npc_elec_angry:"72d61a4e59923d1e8b7ab0f9cf8deb5a",npc_elec_worried:"4b0f5069920dce396b65e62e9e5a022d",npc_interior_normal:"25f70a23f22a477eabd91b7e8086556c",npc_interior_angry:"766e218a6ab5fe56b6668468fdf94002",npc_interior_worried:"836919a6327f47d67b4aa0fc8786fb3e",npc_keeper_normal:"6aba7fd9107a6ee905a0cdf2ad12f64a",npc_keeper_angry:"4f7b07cccfa110f29ab536c1d85d1731",npc_keeper_worried:"c5a8f253b681cbf2483a7a2a077d9a64",npc_office_normal:"9c108dea0b127279cb4b2627f7bca9cb",npc_office_angry:"74fec28a3a4ceff239383b888d6cc739",npc_office_worried:"b050d12be4d668ae0a02b36555cb17ea",npc_brokerA_normal:"0e4d78cb0ecc8bbce438b769409d12e7",npc_brokerA_angry:"50208e69c37d48d53b445c55d8e5ff54",npc_brokerA_worried:"6171a0f60e5c89a1520387144deaef47",npc_brokerB_normal:"16cdc291c98f2b924f1001093a878405",npc_brokerB_angry:"1d36d67d423a59b1023f28616859c8f3",npc_brokerB_worried:"3fdff8fea082b2b541d60452831bbfd7",npc_brokerC_normal:"33e77805ff75bf55901492e94b0f65ca",npc_brokerC_angry:"2efc47818f4e57480458698a3b0ad710",npc_brokerC_worried:"127177675d5f7bceb6e2c12a16995ea1",npc_neighbor_normal:"837689f53c655b7d132b29557e34b6c1",npc_neighbor_angry:"68e0395f546441e7db5e5df6739bead7",npc_neighbor_worried:"3a5b63b9f68fa997b1452bf1534c624e", prop_envelope:"4f145e8a8822f7645578f77a6ee95106",
  bg_office_2:"a0bd8a4f4b41ee8c599f33430f928206", bg_office_3:"20ca2f3daec72e213c1b685582800944",
  npc_playerf_normal:"0e5e0cf8e1eebce4614a7eb2b580eb3a", npc_playerf_happy:"21edbf20d7400a64cb512843f0f49e6c", npc_playerf_angry:"fc342f6c5ea6b5a52aef3845b9c31760",
  npc_playerf_worried:"e300bae619a62ec11a5a68cccb741529", npc_playerf_shocked:"a732cb9189a84c45a3ad4fdcf70fe55b", npc_playerf_soft:"29d4b8c7fc4acece5292aa00af42901f",
  cut_bid_open:"4f38b2ef9b76d0db9e96b67bd21736bd", bg_bid_room:"07b55a4385794f3235b2ff7e1f594bda", bg_room_after:"89311a983e8f64a7c6c9a9471afb3342", bg_office_1:"9de4f638fa8ff6a4f3f1e3a0f5adadde"});
["normal","happy","angry","worried","shocked","soft"].forEach(e=>A_("npc_playerf_"+e,"npc","주인공 앞모습 — "+e,"주인공 앞모습","경매왕 반응"));
[["bg_bid_room","입찰 법정"],["bg_room_after","수리 후 거실"]].forEach(([id,t])=>A_(id,"bg",t,t,"경매왕"));
[["cut_bid_open","개찰 — 봉투 여는 손"]].forEach(([id,t])=>A_(id,"cut",t,t,"경매왕"));
[["bg_office_1","사무실 1단계 — 원룸 책상"],["bg_office_2","사무실 2단계 — 작은 사무실"],["bg_office_3","사무실 3단계 — 경매 투자회사"]].forEach(([id,t])=>A_(id,"bg",t,t,"커리어 홈"));
[["prop_envelope","입찰봉투"]].forEach(([id,t])=>A_(id,"prop",t,t,"법원"));
[["npc_p_grandpa_furious","최만식 — 격분(주먹)"]].forEach(([id,t])=>A_(id,"npc",t,t,"경매왕 1번 물건"));
function artUrl(id){ const a = artRec()[id] || ART_DEFAULT[id]; return a ? "/_blob/" + a : null; }
// 인물 그림 찾기: 그 사람 전용(표정) → 전용(보통) → 유형(표정) → 유형(보통)
function artNpc(pid, ex){
  const e2 = ART_EXMAP[ex] || "neutral";
  let ts = ART_PTYPE[pid] || (["player","broker","mover"].includes(pid) ? pid : null); ts = ts ? [].concat(ts) : [];
  let u = artUrl(`npc_${pid}_${ex}`) || artUrl(`npc_${pid}_normal`); if(u) return u;
  for(const t of ts){ u = artUrl(`npc_${t}_${e2}`); if(u) return u; }          // 표정이 맞는 그림 우선
  for(const t of ts){ u = artUrl(`npc_${t}_neutral`); if(u) return u; }
  return null;
}

function artImg(id, cls, alt){ const u = artUrl(id); return u ? `<img class="${cls||""}" src="${u}" alt="${esc(alt||"")}" loading="lazy" decoding="async">` : ""; }

let assetsNs; (async()=>{ await null; try{ assetsNs = (window.claude && claude.use) ? await claude.use("assets") : null; }catch(e){ assetsNs = null; } if(typeof renderArena==="function" && page==="arena") renderArena(); })();
const ART_UI = {msg:"", busy:0};
function artBrief(){
  const L = [];
  L.push("# 명도 게임 이미지 발주서", "", "## 공통 스타일(모든 그림에 붙여 넣기)", ART_STYLE, "",
    "## 작업 순서", "1. 먼저 인물 10명을 한 장에 모은 '캐릭터 시트'를 만들어 그림체를 확정한다.", "2. 확정된 그림체로 같은 인물의 표정 3종을 **같은 포즈·같은 크기**로 뽑는다.", "3. 배경 → 소품 → 컷신 순서.", "4. 파일 이름은 아래 id 그대로(예: bg_villa_day.png). 사이트에 한꺼번에 올리면 이름으로 자동 배치된다. (지피티 46장 발주서 이름 — npc_oldman_neutral, bg_living_rough 등 — 도 그대로 받는다)", "");
  for(const k of Object.keys(ART_KINDS)){ const K = ART_KINDS[k];
    L.push(`## ${K.name} — ${K.size} · ${K.note}`, "", "| 파일 id | 제목 | 그릴 내용 | 쓰이는 곳 |", "|---|---|---|---|");
    for(const s of ART_SLOTS.filter(x=>x.kind===k)) L.push(`| ${s.id} | ${s.title} | ${s.desc} | ${s.use} |`);
    L.push(""); }
  return L.join("\n");
}
// 그림 AI가 투명 배경 대신 흰색·회색 체크무늬를 '그려서' 주는 경우가 많다 — 테두리에서 이어진 밝은 무채색만 지운다(외곽선에서 멈춤)
function artCutBg(cx, w, h){
  const im = cx.getImageData(0,0,w,h), d = im.data; let opaque = 0;
  for(let i=3;i<d.length;i+=4*97) if(d[i]>250) opaque++;
  if(opaque < (d.length/4/97)*0.98) return;          // 이미 진짜 투명 배경이면 손대지 않는다
  const bgl = i => { const r=d[i],g=d[i+1],b=d[i+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b); return mx-mn < 26 && (r+g+b)/3 > 150; };
  const seen = new Uint8Array(w*h), st = [];
  for(let x=0;x<w;x++){ st.push(x, (h-1)*w+x); } for(let y=0;y<h;y++){ st.push(y*w, y*w+w-1); }
  while(st.length){ const p = st.pop(); if(seen[p]) continue; seen[p]=1; const i=p*4; if(!bgl(i)) continue; d[i+3]=0;
    const x=p%w; if(x>0) st.push(p-1); if(x<w-1) st.push(p+1); if(p>=w) st.push(p-w); if(p<w*(h-1)) st.push(p+w); }
  cx.putImageData(im,0,0);
}
async function artShrink(file, kind){
  // 너무 큰 원본은 줄여서 올린다(배경 1920, 인물 1024, 소품 512). 투명도 유지 위해 webp.
  const max = kind==="npc" ? 1024 : kind==="prop" ? 512 : 1920;
  try{
    const bmp = await createImageBitmap(file); const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width*sc); cv.height = Math.round(bmp.height*sc);
    const cx = cv.getContext("2d"); cx.drawImage(bmp, 0, 0, cv.width, cv.height);
    if(kind==="npc" || kind==="prop") artCutBg(cx, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, "image/webp", 0.86));
    return blob && blob.size < file.size ? blob : file;
  }catch(e){ return file; }
}
async function artUpload(files, forced){
  if(!assetsNs){ ART_UI.msg = "업로드는 이 사이트 주인(편집 권한) 화면에서만 돼요."; renderArena(); return; }
  const list = [...files]; let ok = 0, skip = [];
  ART_UI.busy = list.length; renderArena();
  for(const f of list){
    let base = forced || f.name.replace(/\.[a-z0-9]+$/i,"").trim().toLowerCase().replace(/\s*\(\d+\)$/,"");
    base = ART_ALIAS[base] || base;
    const slot = ART_SLOTS.find(s=>s.id===base);
    if(!slot){ skip.push(f.name); ART_UI.busy--; continue; }
    try{
      const blob = await artShrink(f, slot.kind);
      const r = await assetsNs.upload(blob, blob.type ? {} : {type:"image/png"});
      const old = artRec()[slot.id]; artRec()[slot.id] = r.id; ok++;
      if(old && old!==r.id){ try{ await assetsNs.delete(old); }catch(e){} }
    }catch(e){ skip.push(f.name + (e && e.code ? `(${e.code})` : "")); }
    ART_UI.busy--; renderArena();
  }
  save();
  ART_UI.msg = `✅ ${ok}장 배치 완료` + (skip.length ? ` · ⚠️ 못 넣은 파일 ${skip.length}개: ${skip.slice(0,6).join(", ")}${skip.length>6?" …":""} — 파일 이름이 발주서 id와 같아야 해요.` : "");
  renderArena();
}
function artHTML(){
  const R = artRec(), done = ART_SLOTS.filter(s=>artUrl(s.id)).length;
  const groups = Object.keys(ART_KINDS).map(k=>{ const K = ART_KINDS[k], ss = ART_SLOTS.filter(s=>s.kind===k);
    return `<details class="panel sg-open"${k==="bg"?" open":""}><summary>${K.name} ${ss.filter(s=>artUrl(s.id)).length}/${ss.length} <span class="sg-note">${K.size}</span></summary><div class="art-grid">${ss.map(s=>`<div class="art-slot ${R[s.id]?"on":ART_DEFAULT[s.id]?"def":""}"><div class="art-prev k-${k}">${artUrl(s.id)?artImg(s.id,"",s.title):"<span>빈 칸</span>"}</div><b>${esc(s.title)}</b>${!R[s.id]&&ART_DEFAULT[s.id]?`<small class="sg-note">기본 그림(캐릭터 시트)</small>`:""}<code>${s.id}</code>${assetsNs?`<label class="btn art-up">${R[s.id]?"교체":"올리기"}<input type="file" accept="image/*" data-artslot="${s.id}" hidden></label>`:""}</div>`).join("")}</div></details>`; }).join("");
  return `<div class="panel ag-top"><b>🎨 게임 그림 넣기</b> <span class="ag-best">${done} / ${ART_SLOTS.length}장</span>
    <p class="sg-note" style="margin:0">① 아래 발주서를 복사해 그림 AI에 붙여 넣고 → ② 받은 그림 파일 이름을 id 그대로 저장한 뒤 → ③ 여러 장을 한꺼번에 올리면 자리를 찾아 들어가요. 빈 칸은 지금 그림으로 대신 보여요.</p>
    <div class="ag-chips"><button type="button" class="btn pri" data-artcopy>📋 발주서 복사</button>${assetsNs?`<label class="btn">📤 여러 장 한꺼번에 올리기<input type="file" accept="image/*" multiple id="artBulk" hidden></label>`:`<span class="sg-note">업로드는 이 사이트 주인 화면에서만 보여요.</span>`}</div>
    ${ART_UI.busy?`<p class="sg-note">⏳ 올리는 중… 남은 ${ART_UI.busy}장</p>`:""}${ART_UI.msg?`<p class="sg-note">${esc(ART_UI.msg)}</p>`:""}</div>${groups}
    <details class="panel sg-open"><summary>📄 발주서 미리보기</summary><pre class="art-brief">${esc(artBrief())}</pre></details>`;
}
document.addEventListener("click", async e => {
  if(!e.target.closest("[data-artcopy]")) return;
  try{ await navigator.clipboard.writeText(artBrief()); ART_UI.msg = "📋 발주서를 복사했어요. 그림 AI 대화창에 붙여 넣으세요."; }
  catch(err){ ART_UI.msg = "복사가 막혔어요 — 아래 ‘발주서 미리보기’를 펼쳐 직접 복사해 주세요."; }
  renderArena();
});
document.addEventListener("change", e => {
  if(e.target.id==="artBulk" && e.target.files && e.target.files.length) artUpload(e.target.files);
  const s = e.target.dataset && e.target.dataset.artslot; if(s && e.target.files && e.target.files[0]) artUpload([e.target.files[0]], s);
});
