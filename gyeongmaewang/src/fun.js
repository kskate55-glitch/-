
/* ============================== 명도왕 재미 요소: 이벤트 카드 · 스테이지 · 뱃지 · 연출 ============================== */
const hasKids = P => houseOf(P).some(h => !h.adult && /아이|딸|아들|아기|자녀/.test(h.rel||h.desc));
const hasPets = P => !!(P.pets || houseOf(P).some(h => h.pet));
const petName = P => P.pets || (houseOf(P).find(h=>h.pet)||{}).desc || "반려동물";
const hasElder = P => houseOf(P).some(h => h.old || /노모|아버지|할머니/.test(h.rel||""));
const isForeign = P => !!P.foreign;
const G_CARDS = [
 {id:"crisis", t:"🆘 걱정되는 문자", s:"새벽에 점유자에게서 문자가 왔다. \"다 끝났어요. 더는 못 버티겠어요. 그동안 미안했어요.\"", cond:()=>G.mood<18 && G.week>=3 && (G.used.notice||0)+(G.used.exec?1:0)>=1,
  o:[{t:"즉시 112·119에 신고해 안전 확인을 요청하고, 가족·행정복지센터에 알린다. 명도 일정은 잠시 멈춘다", fx:{weeks:2, mood:15, resist:-10}, g:2, r:"사람의 생명이 어떤 기한보다 먼저다. 구조는 경찰·소방이 한다(내가 문을 따고 들어가지 않는다). 자살예방 상담전화 109(24시간)도 안내할 수 있다."},
     {t:"내가 직접 가서 문을 따고 들어가 본다", fx:{mood:-5, cost:30}, g:0, r:"위급 상황의 진입과 구조는 경찰·소방의 몫이다. 혼자 들어가면 나도 위험하고 법적 문제도 생길 수 있다."},
     {t:"협박성 문자로 보고 무시한다", fx:{resist:5}, g:0, r:"위험 신호를 절대 가볍게 넘기지 않는다. 판단은 전문기관에 맡기고 먼저 신고한다."}]},
 {id:"arson", t:"🔥 \"불 질러 버릴 거야\"", s:"통화 끝에 점유자가 소리친다. \"이 집 그냥 불 질러 버리고 나갈 거야!\"", cond:()=>G.mood<30 && G.resist>50,
  o:[{t:"녹음을 보관하고 112에 신고, 관리사무소에 안전을 공유, 내 명의 화재보험을 확인하고 이후엔 2인 이상·공개된 곳에서만 만난다", fx:{cost:15, weeks:1}, g:2, r:"협박은 기록과 신고로 대응한다. 이웃 안전이 걸린 문제라 관리사무소 공유도 필요하다. 대금납부 뒤엔 내 이름으로 화재보험을 들어 두자."},
     {t:"겁나서 이사비를 두 배로 올려 준다", fx:{cost:200, resist:-10}, g:0, r:"협박에 돈으로 굴복하면 요구가 더 커진다."},
     {t:"맞받아 소리치고 전화를 끊는다", fx:{mood:-15, resist:10}, g:0, r:"감정을 키우면 위험도 커진다."}]},
 {id:"sabotage", t:"🚽 이삿날의 복수", s:"짐이 빠진 집에 들어가 보니 세면대·변기·배수구가 휴지와 이물질로 막혀 있고, 벽엔 낙서가 있다.", cond:()=>G.handover && G.mood<40,
  o:[{t:"사진·영상으로 남기고 배관 업체 견적을 받는다. 합의서의 '설비 정상 확인 후 이사비 지급' 조항대로 처리하고, 재물손괴 고소·손해배상도 검토한다", fx:{cost:40}, g:2, r:"인도 때 수도·배수·보일러·전기를 직접 확인하는 체크리스트가 답이다. 이사비는 인도·설비 확인 뒤에 준다."},
     {t:"그냥 내 돈으로 고치고 잊는다", fx:{cost:90}, g:1, r:"빠르긴 하지만 증거도, 청구도 없이 끝났다."},
     {t:"점유자 새 집을 찾아가 따진다", fx:{cost:90, weeks:1}, g:0, r:"감정싸움은 더 큰 분쟁을 부른다. 기록과 절차로 간다."}]},
 {id:"truck", t:"🚚 밤 11시, 점유자 전화", s:"\"사장님… 이삿짐센터가 갑자기 취소됐어요. 이번 주에 못 나갈 것 같아요.\"", cond:()=>!!G.deal,
  o:[{t:"다른 이삿짐센터 두세 곳 연락처를 보내 주고, 날짜는 합의서대로 간다", fx:{mood:6, resist:-4}, g:2, r:"도와주되 원칙(합의 날짜)은 지켰다. 점유자가 스스로 다른 업체를 잡았다."},
     {t:"그럼 2주 미뤄 드릴게요", fx:{weeks:2}, g:1, r:"관계는 지켰지만 2주치 이자가 더 나간다. 연기해 줄 땐 '마지막 연기'라고 서면으로 남기자."},
     {t:"이사비 절반을 먼저 보내 줄 테니 알아서 하세요", fx:{cost:50, resist:6}, g:0, r:"선지급은 명도 협상에서 가장 흔한 실수다. 돈만 받고 날짜를 또 미루는 빌미가 된다."}]},
 {id:"mgmt", t:"🏢 관리사무소에서 온 문자", s:"\"○○호 미납 관리비가 280만원입니다. 새 소유자분이 정리해 주셔야 합니다.\"", cond:()=>G.week>=1,
  o:[{t:"공용부분·전유부분 내역과 연체료를 나눠 달라고 한 뒤, 공용부분만 정리한다", fx:{cost:120}, g:2, r:"매수인이 떠안는 건 원칙적으로 공용부분 관리비(연체료 제외)다. 내역부터 받는 게 맞다."},
     {t:"달라는 대로 280만원 전액 납부", fx:{cost:280}, g:0, r:"전유부분·연체료까지 낼 의무는 없다. 확인 없이 내면 160만원을 그냥 쓴 셈."},
     {t:"무시한다", fx:{cost:0, mood:0, weeks:1}, g:1, r:"당장 돈은 안 나갔지만 관리사무소와 틀어지면 이사·단전 문제로 발목을 잡힐 수 있다."}]},
 {id:"kid", t:"🧒 문 앞에서 우는 아이", s:"방문했더니 점유자의 아이가 \"우리 집 뺏어 가는 사람이에요?\" 하며 울기 시작한다.", cond:P=>hasKids(P),
  o:[{t:"아이에겐 다정하게, 부모와는 따로 학기 끝나는 날짜를 기준으로 이야기한다", fx:{mood:10, resist:-8}, g:2, r:"아이 앞에서 명도 이야기를 하지 않는 게 기본. 학교 일정은 좋은 합의 기준점이 된다."},
     {t:"마음이 약해져서 이사비를 두 배로 올려 준다", fx:{cost:100, mood:6}, g:0, r:"감정으로 돈을 올리면 '더 버티면 더 준다'는 신호가 된다."},
     {t:"아이가 있든 없든 정해진 일정대로 한다고 딱 잘라 말한다", fx:{mood:-10, resist:6}, g:1, r:"원칙은 맞지만 방식이 거칠었다. 감정을 건드리면 버티기가 세진다."}]},
 {id:"pet", t:"🐾 반려동물 문제", s:"점유자: \"{PET}은 데려가기 어려워요… 두고 가도 되죠? 새 주인이 알아서 해 주세요.\"", cond:P=>hasPets(P),
  o:[{t:"동물은 소유자가 책임져야 한다고 분명히 하고, 동물보호 상담처·임시보호 단체를 안내한다", fx:{mood:4, resist:-3}, g:2, r:"남은 동물을 임의로 처분하거나 방치하면 문제가 커진다. 소유자 책임 원칙 + 정보 제공이 정답."},
     {t:"알겠다고 하고 이사 후에 보호소에 보낸다", fx:{cost:40, weeks:1}, g:0, r:"남의 동물을 임의로 처리하면 분쟁·법적 문제가 생길 수 있다. 원상복구 비용도 늘어난다."},
     {t:"동물 얘기는 나중에 하자고 넘긴다", fx:{weeks:1}, g:1, r:"미뤄 두면 이삿날 '데려갈 수 없다'로 터진다. 미리 정리해야 한다."}]},
 {id:"petdmg", t:"🐶 원상복구 견적", s:"사진을 보니 반려동물이 걸레받이·몰딩·문틀을 다 긁어 놨다. 도배·걸레받이 교체 견적 150만원.", cond:P=>hasPets(P),
  o:[{t:"명도 후 소액 수리로 월세·매도 세팅, 비용은 입찰 때 넣은 수리비 안에서 처리", fx:{cost:100}, g:2, r:"낙찰 전에 수리비를 잡아 뒀다면 흔들릴 일 없다. 걸레받이·도배만 해도 인상이 확 바뀐다."},
     {t:"점유자에게 수리비 150만원을 물어내라고 요구한다", fx:{mood:-15, resist:10}, g:0, r:"점유자에게 받아 내기는 현실적으로 어렵고, 명도만 늦어진다."},
     {t:"수리 없이 그대로 내놓는다", fx:{cost:0, weeks:3}, g:1, r:"사진발이 안 나와 매도·임대가 늦어진다. 보유비가 더 든다."}]},
 {id:"sns", t:"📱 동네 커뮤니티 글", s:"\"낙찰자가 애 있는 집을 쫓아내려 한다\"는 글이 동네 커뮤니티에 올라왔다.", cond:()=>G.week>=2,
  o:[{t:"댓글 싸움 없이, 점유자에게 차분한 문자로 일정과 도울 수 있는 부분을 다시 정리해 보낸다", fx:{mood:6, resist:-4}, g:2, r:"감정전에 휘말리지 않고 기록을 남기는 게 최선. 대부분 며칠이면 잠잠해진다."},
     {t:"직접 댓글로 사실관계를 반박한다", fx:{mood:-10, resist:8}, g:0, r:"싸움이 커지고 점유자는 체면 때문에 더 버틴다."},
     {t:"무시한다", fx:{}, g:1, r:"나쁘진 않지만 점유자와의 소통 창구는 계속 열어 둬야 한다."}]},
 {id:"aircon", t:"❄️ 에어컨·붙박이장", s:"점유자: \"벽걸이 에어컨이랑 붙박이장 제가 설치한 거니까 떼 갈게요.\"", cond:()=>G.week>=1,
  o:[{t:"건물에 붙어 떼면 훼손되는 부합물(붙박이장 등)은 매수인 소유라 두고 가시라, 이동식 가전은 가져가셔도 된다고 구분해 설명", fx:{mood:2, resist:-2}, g:2, r:"부합물·종물은 경매로 함께 넘어오는 게 원칙, 독립된 동산은 점유자 것. 구분해서 말하면 다툼이 줄어든다."},
     {t:"전부 다 두고 가라고 한다", fx:{mood:-8, resist:6}, g:0, r:"점유자 소유 동산까지 달라고 하면 무리한 요구가 된다."},
     {t:"알아서 하시라고 한다", fx:{cost:60}, g:1, r:"붙박이장을 뜯어 가 벽이 다 상했다. 원상복구비가 나간다."}]},
 {id:"cash", t:"💵 \"이사비 현금으로 먼저요\"", s:"\"이사비를 먼저 주셔야 트럭 계약금을 넣죠. 오늘 현금으로 주세요.\"", cond:()=>!!G.deal && G.deal.amt>0,
  o:[{t:"이사 당일, 짐이 다 빠지고 열쇠를 받는 자리에서 전액 지급한다고 합의서에 적는다", fx:{resist:-3}, g:2, r:"이사비는 '인도 확인 후 지급'이 원칙이다."},
     {t:"계약금 명목으로 30%만 먼저 준다", fx:{cost:30}, g:1, r:"소액이라 치명적이진 않지만 전례가 된다. 영수증과 합의서 조항을 꼭 남기자."},
     {t:"달라는 대로 전부 먼저 준다", fx:{cost:0, resist:10, flip:1}, g:0, r:"돈을 먼저 받으면 날짜를 지킬 이유가 약해진다. 번복 위험이 크게 오른다."}]},
 {id:"hospital", t:"🏥 가족 입원 소식", s:"\"어머니가 쓰러지셔서 병원에 계세요. 이사 날짜를 좀…\"", cond:P=>hasElder(P),
  o:[{t:"위로하고, 퇴원 예정일 기준으로 새 날짜를 합의서에 다시 쓰자고 한다", fx:{weeks:1, mood:10, resist:-6}, g:2, r:"사정은 존중하되 날짜는 서면으로 다시 고정했다."},
     {t:"사정은 알겠지만 일정은 그대로라고 한다", fx:{mood:-12, resist:8}, g:0, r:"가족 위급 상황에 원칙만 내세우면 관계가 끝난다. 결국 더 늦어진다."},
     {t:"날짜는 나중에 정하자고 무기한 미룬다", fx:{weeks:3}, g:1, r:"친절했지만 기한 없는 연기는 명도를 흐지부지 만든다."}]},
 {id:"translate", t:"🌏 번역기로 온 긴 문자", s:"번역기로 쓴 듯한 긴 문자가 왔다. \"나 계약금 주인 줬다 6개월 돈 이미 냈다 나 어떻게 해야 합니까 경찰 부릅니까\"", cond:P=>isForeign(P),
  o:[{t:"짧고 쉬운 한국어 + 번역본을 함께 보내고, 외국인 지원센터 같은 통역 창구를 안내한다", fx:{mood:12, resist:-10}, g:2, r:"말이 안 통해서 생기는 불안이 버티기의 원인인 경우가 많다. 정확히 이해시키면 빨라진다."},
     {t:"법률 용어로 길게 설명한다", fx:{mood:-4, resist:4}, g:0, r:"이해를 못 하면 공포만 커진다."},
     {t:"답장하지 않는다", fx:{weeks:1, resist:4}, g:1, r:"오해가 쌓인다. 외국인 점유자는 첫 소통이 특히 중요하다."}]},
 {id:"boss", t:"🏭 고용주의 전화", s:"\"제가 이 친구들 사장인데요, 제가 책임지고 내보낼 테니 두 달만 주세요.\"", cond:P=>P.id==="p_pk",
  o:[{t:"고용주를 창구로 삼되, 기숙사 마련 일정에 맞춘 4주 안 날짜와 점유자 전원 서명을 받는다", fx:{resist:-15, mood:8}, g:2, r:"결정권자(고용주)를 협상 파트너로 쓰는 게 핵심. 다만 점유자 전원의 서명으로 확정한다."},
     {t:"두 달 그대로 준다", fx:{weeks:4, mood:8}, g:1, r:"편하지만 이자 두 달이 나간다."},
     {t:"회사는 상관없다며 점유자와만 이야기한다", fx:{resist:8}, g:0, r:"실제 결정권자를 빼면 협상이 겉돈다."}]},
 {id:"showing", t:"🏠 집 보고 싶다는 매수 희망자", s:"부동산에서 연락: \"명도 전인데 집 내부 좀 볼 수 있을까요? 매수 희망자가 있어요.\"", cond:()=>G.week>=2,
  o:[{t:"점유자에게 정중히 양해를 구하고 짧은 방문 시간을 약속받는다(작은 사례 포함)", fx:{cost:10, mood:3}, g:2, r:"점유자의 동의가 있어야 들어갈 수 있다. 협조를 얻으면 명도·매도가 같이 빨라진다."},
     {t:"소유자니까 비밀번호 알아내서 낮에 들어가 보여 준다", fx:{mood:-25, resist:20, cost:30}, g:0, r:"점유 중인 집에 무단으로 들어가면 주거침입 문제가 될 수 있다."},
     {t:"명도 끝난 뒤에 보여 주겠다고 한다", fx:{weeks:1}, g:1, r:"안전하지만 매수 희망자를 놓칠 수 있다."}]},
 {id:"stuff", t:"📦 \"짐 좀 두고 가도 돼요?\"", s:"\"새 집이 좁아서 장롱이랑 소파는 두고 갈게요. 버리셔도 돼요.\"", cond:()=>G.week>=1,
  o:[{t:"두고 갈 물건 목록을 적은 소유권 포기서에 서명을 받는다", fx:{cost:30}, g:2, r:"포기서가 있어야 나중에 '내 물건 버렸다'는 분쟁이 없다. 처분비는 들지만 깔끔하다."},
     {t:"말로 오케이 하고 이사 후 버린다", fx:{cost:30, resist:0}, g:1, r:"대부분 문제없지만, 나중에 물건값을 요구하는 경우가 실제로 있다."},
     {t:"하나도 두고 가면 안 된다고 거절한다", fx:{mood:-6, weeks:1}, g:1, r:"원칙은 맞지만 이사가 늦어진다."}]},
 {id:"early", t:"🔨 인테리어 업자의 제안", s:"\"사장님, 어차피 곧 나간다면서요? 다음 주부터 베란다 공사 들어가도 되죠?\"", cond:()=>!!G.deal,
  o:[{t:"인도 확인 전엔 절대 착수하지 않고, 공사 일정은 인도일 다음 날로 잡는다", fx:{}, g:2, r:"점유자가 있는 집에서 공사를 시작하면 분쟁과 손해배상의 씨앗이 된다."},
     {t:"점유자에게 양해를 구하고 베란다만 먼저 한다", fx:{mood:-6, cost:20}, g:1, r:"동의를 받았어도 소음·파손 다툼이 생기기 쉽다."},
     {t:"그냥 들어가라고 한다", fx:{mood:-20, resist:15, cost:50}, g:0, r:"점유 중인 공간에 무단으로 공사 인력이 들어가면 문제가 커진다."}]},
 {id:"night", t:"🌙 야간 확인", s:"낮에는 늘 빈집 같던 집에 밤 10시쯤 불이 켜져 있다.", cond:P=>P.type==="ghost"||isForeign(P),
  o:[{t:"실제 사는 사람이 있다는 걸 기록(사진·일시)해 두고, 점유자 특정에 활용한다", fx:{resist:-6}, g:2, r:"교대 근무자·야간 거주자는 낮 방문만으로는 못 찾는다. 기록이 인도명령·집행의 근거가 된다."},
     {t:"초인종을 계속 누르며 나오라고 한다", fx:{mood:-10, resist:6}, g:0, r:"밤늦은 방문은 역효과. 민원으로 번질 수 있다."},
     {t:"그냥 돌아간다", fx:{}, g:1, r:"아무 일도 일어나지 않았다."}]}
];
function gMaybeCard(P){
  if(G.over || G.card || G.week < 1) return;
  if(G.handover){ if(G.mood < 40 && !(G.cardsUsed||[]).includes("sabotage") && Math.random() < 0.5){ (G.cardsUsed = G.cardsUsed||[]).push("sabotage"); G.card = {id:"sabotage", ord: shuffle([0,1,2])}; } return; }
  const crisis = G_CARDS.filter(c => (c.id==="crisis"||c.id==="arson") && !(G.cardsUsed||[]).includes(c.id) && c.cond(personaById(G.pid)));
  if(crisis.length && Math.random() < 0.3){ const c = pick(crisis); (G.cardsUsed = G.cardsUsed||[]).push(c.id); G.card = {id:c.id, ord: shuffle(c.o.map((_,i)=>i))}; return; }
  if(Math.random() > 0.42) return;
  G.cardsUsed = G.cardsUsed || [];
  const pool = G_CARDS.filter(c => !G.cardsUsed.includes(c.id) && !/^(crisis|arson|sabotage)$/.test(c.id) && c.cond(P));
  if(!pool.length) return;
  const c = pick(pool); G.cardsUsed.push(c.id);
  G.card = {id:c.id, ord: shuffle(c.o.map((_,i)=>i))};
}
function gApplyFx(P, fx){
  if(!fx) return;
  if(fx.mood) G.mood = clamp(G.mood + fx.mood);
  if(fx.resist) G.resist = clamp(G.resist + fx.resist);
  if(fx.cost) G.fees += fx.cost;
  if(fx.weeks){ G.week += fx.weeks; G.spent += fx.weeks * P.weekly; if(G.deal) G.deal.week += fx.weeks; }
  if(fx.flip && G.deal){ G.contract = false; P.p.greed = Math.max(P.p.greed||1, 1.4); }
}
function gCardPick(i){
  const P = personaById(G.pid), c = G_CARDS.find(x=>x.id===G.card.id), o = c.o[i];
  gApplyFx(P, o.fx);
  G.cardGood = (G.cardGood||0) + (o.g===2?1:0);
  gLog("me", `🃏 ${c.t.replace(/^\S+\s/,"")} → ${o.t}`);
  gLog("sys", `${["😣","🤔","👍"][o.g]} ${o.r}`);
  G.card = null;
}
const CARD_SCENE = {truck:"moving_truck", mgmt:"money", kid:"support", pet:"pets", petdmg:"interior", sns:"phone_chat", aircon:"inspection", cash:"money", hospital:"support", translate:"foreign_home", boss:"factory_containers", showing:"buyer_couple", stuff:"moving_truck", early:"interior", night:"inspection", crisis:"support", arson:"fire_safety", sabotage:"plumbing"};
function cardHTML(P){
  const c = G_CARDS.find(x=>x.id===G.card.id);
  return `<div class="panel ag-card-ev">${typeof sceneImg==="function"?sceneImg(CARD_SCENE[c.id],"sc-card"):""}<div class="ag-ev-tag">🃏 이벤트 카드</div><h3>${c.t}</h3><p class="ag-ev-s">${esc(c.s.replace("{PET}", petName(P)))}</p>
   <div class="ag-ev-o">${G.card.ord.map(i => `<button type="button" class="ag-act" data-gcard="${i}"><span>${esc(c.o[i].t)}</span></button>`).join("")}</div></div>`;
}
/* ---------- 스테이지 ---------- */
const STAGES = ["p_coop","p_senior","p_youth","p_grandpa","p_basic","p_cn","p_ghost","p_delay","p_mn","p_mind","p_greedy","p_hwagyo","p_5000","p_pk","p_fake","p_lien","p_phishing","p_hug"];
const STARS = {S:3, A:2, B:1};
function stageOpen(i){ if(i===0) return true; const prev = arenaRec().best[STAGES[i-1]]; return !!(prev && STARS[prev.grade]); }
const BADGES = [
 ["nopay","🕊️ 무혈 명도","이사비 0원·강제집행 없이 끝냈다"],
 ["fast","⚡ 번개 명도","6주 안에 열쇠를 받았다"],
 ["paper","✍️ 합의서 장인","합의서로 약속을 지켜 냈다"],
 ["guard","🛡️ 함정 회피","점유 조사·가처분을 하고 선의의 함정도 피했다"],
 ["clean","🔑 완벽 인도","내부 확인·잔존물 확인서·도어락까지 챙겼다"],
 ["sgrade","🏆 S등급","목표 비용 안에서 합의로 끝냈다"],
 ["cards","🃏 카드 마스터","한 판에 이벤트 카드 3장 이상 최선의 선택"],
 ["patience","🐢 끝까지 간다","20주가 넘는 장기전을 끝내 이겼다"],
 ["foreign","🌏 글로벌 명도","외국인 점유자와 합의로 끝냈다"]
];
function gAwardBadges(P){
  const R = arenaRec(); if(!R.badges) R.badges = {};
  const got = [], add = id => { if(!R.badges[id]) got.push(id); R.badges[id] = true; };
  if(!G.over || !G.over.win) return got;
  if(G.paid===0 && G.over.how!=="exec") add("nopay");
  if(G.week<=6) add("fast");
  if(G.contract && G.over.how==="deal") add("paper");
  if(G.mapped && G.pledge && !G.newTitle) add("guard");
  if(G.used.hand_full) add("clean");
  if(G.over.grade==="S") add("sgrade");
  if((G.cardGood||0)>=3) add("cards");
  if(G.week>=20) add("patience");
  if(isForeign(P) && G.over.how==="deal") add("foreign");
  return got;
}
function gFxChips(before){
  if(!before || !G) return "";
  const d = [];
  const dm = Math.round(G.mood - before.mood), dr = Math.round(G.resist - before.resist), dc = Math.round(gTotal() - before.cost), dw = G.week - before.week;
  if(dm) d.push(`<span class="fx ${dm>0?"up":"down"}">관계 ${dm>0?"+":""}${dm}</span>`);
  if(dr) d.push(`<span class="fx ${dr<0?"up":"down"}">버티기 ${dr>0?"+":""}${dr}</span>`);
  if(dc) d.push(`<span class="fx ${dc>0?"down":"up"}">💸 ${dc>0?"+":""}${man0(dc)}</span>`);
  if(dw>1) d.push(`<span class="fx down">⏳ +${dw}주</span>`);
  return d.length ? `<div class="ag-fxrow">${d.join("")}</div>` : "";
}
function confettiHTML(){ const e = ["🎉","🔑","🏠","✨","🎊"]; let s = ""; for(let i=0;i<28;i++) s += `<span style="left:${Math.round(Math.random()*100)}%;animation-delay:${(Math.random()*0.8).toFixed(2)}s;font-size:${14+Math.round(Math.random()*14)}px">${e[i%e.length]}</span>`; return `<div class="confetti" aria-hidden="true">${s}</div>`; }
