
/* ============================== 명도 아레나 (도감 · 명도왕 게임 · 점유자 채팅) ============================== */
/* 모든 인물은 가상이다. 실제 사건·인물과 무관하다. */
const OCC_TYPES = [
 {id:"coop", emoji:"🤝", name:"협조형 전 소유자", lv:1,
  line:"집을 잃은 건 속상하지만 현실을 받아들이는 사람",
  who:"채무자(전 소유자)", law:"인도명령 대상. 대금납부 후 6개월 안에 신청할 수 있다.",
  signs:["첫 연락에 바로 답이 온다","이사 날짜부터 묻는다","짐 정리·아이 학교 같은 현실 문제를 이야기한다"],
  inner:"창피하고 지쳐 있다. 빨리 끝내고 싶지만 갈 곳과 이삿짐 비용이 걱정이다.",
  doit:["첫 만남에서 '고생 많으셨다'는 말부터","날짜를 먼저 합의하고 이사비는 날짜를 당기는 도구로","합의 내용을 짧은 합의서로 남기기"],
  dont:["첫 문자부터 법 조항 나열","낙찰 사실을 자랑하듯 말하기"],
  cases:["c01","c10"]},
 {id:"angry", emoji:"😠", name:"분노형 전 소유자", lv:2,
  line:"'내 집을 뺏어 간 사람'으로 나를 대하는 사람",
  who:"채무자(전 소유자)", law:"인도명령 대상. 감정과 무관하게 절차는 그대로 진행된다.",
  signs:["첫 통화에서 목소리가 높다","'헐값에 가져갔다'는 말을 반복한다","내용증명을 받으면 더 화를 낸다"],
  inner:"분노 밑에는 수치심과 억울함이 있다. 존중받는다고 느끼면 의외로 빨리 누그러진다.",
  doit:["감정을 먼저 받아 주고 원칙은 부드럽게 반복","인도명령은 '보험'이라고 설명하며 조용히 병행","대화는 기록으로 남기기"],
  dont:["맞받아 화내기","'법대로 하자'로 대화를 끊기"],
  cases:["c02","c03"]},
 {id:"ghost", emoji:"👻", name:"잠수형(연락두절)", lv:2,
  line:"문자·전화·방문 전부 무응답인 사람",
  who:"채무자 또는 대항력 없는 점유자", law:"인도명령 → 강제집행으로 간다. 짐만 남았으면 집행관 절차로 처리한다(임의로 버리면 안 된다).",
  signs:["우편물이 쌓여 있다","관리비가 몇 달째 밀려 있다","전기 계량기가 거의 안 돈다"],
  inner:"피하면 시간이 벌린다고 믿거나, 이미 다른 곳에 살고 있다.",
  doit:["낙찰 직후 인도명령부터 신청","문 앞 쪽지·관리사무소로 연락 경로 확보","계고 단계에서 연락이 오는 경우가 많다"],
  dont:["빈집 같다고 문 따고 들어가기(주거침입)","남은 짐을 마음대로 처분하기"],
  cases:["c04","c12"]},
 {id:"poor", emoji:"🧓", name:"생계 곤란 무대항력 임차인", lv:2,
  line:"보증금을 거의 못 받고 당장 이사 갈 돈도 없는 세입자",
  who:"대항력 없는 임차인", law:"매수인에게 대항하지 못하므로 인도명령 대상이다. 소액임차인 최우선변제로 일부를 배당받을 수도 있으니 배당표부터 확인한다.",
  signs:["보증금이 작고 월세 비중이 크다","전입일이 근저당·경매개시보다 늦다","'나도 피해자'라는 말을 한다"],
  inner:"억울하고 막막하다. 돈보다 '어디로 가야 하나'가 더 급하다.",
  doit:["배당을 받는지 먼저 확인(받는다면 명도확인서가 열쇠)","현실적인 이사 날짜와 소액 이사비","주거급여·공공임대 같은 공적 지원 안내"],
  dont:["'법적으로 나가야 한다'만 반복하기","약속 없이 동정만 하다 기한을 넘기기"],
  cases:["c07","c09"]},
 {id:"greedy", emoji:"💸", name:"이사비 과다요구형", lv:2,
  line:"'○○만원 안 주면 못 나간다'로 시작하는 사람",
  who:"채무자 또는 대항력 없는 점유자", law:"이사비는 법적 의무가 아니다. 협상의 상한선은 강제집행 비용 + 그 기간의 이자다.",
  signs:["첫 대화부터 금액을 부른다","주변에서 '많이 받았다'는 이야기를 들었다고 한다","날짜 이야기는 피한다"],
  inner:"받을 수 있는 만큼 받아 보려는 것. 버티는 비용이 자기에게도 든다는 걸 알면 내려온다.",
  doit:["인도명령을 먼저 걸고 협상 시작","내 상한선(집행비+이자)을 계산해 두고 그 아래에서","금액보다 날짜를 먼저 확정"],
  dont:["첫 제안을 바로 수락","상대가 부른 금액에서 반값 흥정부터 시작"],
  cases:["c08"]},
 {id:"bully", emoji:"🦹", name:"갑질·버티기형", lv:3,
  line:"사연을 무기로 오히려 큰소리치는 사람",
  who:"대개 채무자(전 소유자)", law:"사연과 법적 지위는 별개다. 인도명령 대상이면 절차대로 진행된다. 협박·폭언은 기록해 둔다.",
  signs:["'우리가 피해자인데'로 요구를 정당화한다","연락을 한밤중에 한다","제3자(가족·지인)가 대신 나선다"],
  inner:"잃은 게 너무 커서 무엇이든 붙잡으려 한다. 절차가 실제로 굴러가는 걸 보면 태도가 바뀐다.",
  doit:["공감은 하되 책임 소재는 분명히 분리","모든 대화 기록, 혼자 방문하지 않기","인도명령·강제집행 절차를 담담하게 진행"],
  dont:["사연에 휘말려 기한 약속 없이 미루기","같이 언성 높이기"],
  cases:["c03","c08"]},
 {id:"fake", emoji:"🎭", name:"가장임차인", lv:3,
  line:"전입만 해 둔 '서류상 세입자'",
  who:"주장상 임차인(실제로는 채무자 가족·지인)", law:"실제 임대차가 아니면 대항력이 없어 인도명령 대상이다. 계약 경위·보증금 지급 흔적이 핵심 증거다.",
  signs:["보증금 흐름(계좌이체)이 없다","채무자와 성이 같거나 가족","전입 직후 대출·경매가 이어졌다"],
  inner:"들통나지 않기를 바란다. 증거가 쌓이면 급격히 협조적이 된다.",
  doit:["전입 경위·금융거래 자료 확인","인도명령 신청서에 가장임차인 사유 정리","점유이전금지가처분으로 사람 바꿔치기 차단"],
  dont:["선순위 임차인이라고 겁먹고 보증금을 물어주기"],
  cases:["c16","c17"]},
 {id:"senior", emoji:"🏦", name:"배당받는 임차인", lv:1,
  line:"보증금을 배당으로 돌려받는 세입자",
  who:"임차인(대항력 유무 무관, 배당금 수령)", law:"배당금을 받으려면 매수인의 명도확인서가 필요하다. 명도확인서는 이사를 마친 뒤 내 주는 것이 원칙이다.",
  signs:["배당표에 이름과 금액이 있다","배당기일을 물어본다","이사 갈 집을 이미 알아보고 있다"],
  inner:"돈만 제때 받으면 나간다. 배당기일과 이사 날짜를 맞추고 싶어 한다.",
  doit:["배당기일에 맞춰 이사 날짜 조율","'이사 확인 후 명도확인서' 원칙을 친절하게 설명"],
  dont:["이사 전에 명도확인서부터 써 주기","괜히 이사비를 먼저 제안하기"],
  cases:["c05","c06"]},
 {id:"lien", emoji:"🧱", name:"유치권 주장형", lv:3,
  line:"'공사대금 못 받았다'며 버티는 사람",
  who:"유치권 주장자", law:"유치권은 점유가 계속돼야 하고, 경매개시 후 점유를 시작했거나 공사대금 채권이 없으면 인정되지 않는다.",
  signs:["현관에 '유치권 행사 중' 현수막","실제로는 사람이 살지 않는다","공사 계약서·세금계산서가 부실하다"],
  inner:"돈을 받아 내려는 압박 수단. 실제 점유와 채권을 증명하지 못하면 물러선다.",
  doit:["현장 사진으로 실제 점유 여부 기록","공사 시기·금액 증빙 요구","인도명령 또는 유치권 부존재 다툼"],
  dont:["현수막을 임의로 떼어 내기","증빙 없이 공사대금을 흥정하기"],
  cases:["c21"]},
 {id:"short", emoji:"🧳", name:"깔세·단기 점유자", lv:3,
  line:"월세를 몇 달 치 선불로 내고 들어온 단기 세입자",
  who:"대항력 없는 점유자(대개 임차권등기·경매개시 뒤 전입)", law:"말소기준권리 뒤에 들어왔으면 인도명령 대상이다. 임차권등기가 된 집에 그 뒤 들어온 임차인은 소액임차인 최우선변제도 못 받는다. 선불로 낸 남은 월세는 돈을 받은 임대인에게 청구할 문제이지 매수인의 책임이 아니다.",
  signs:["전입일이 임차권등기(HUG 등) 뒤다","계약서가 짧고 보증금이 거의 없다","'몇 달 치 미리 냈다'는 말을 한다","사람이 자주 바뀐다"],
  inner:"낸 돈을 날렸다는 억울함을 눈앞의 매수인에게 풀려 한다. 버티면 이사비가 나온다고 믿는다.",
  doit:["인도명령과 점유이전금지가처분을 바로 함께","선불 월세는 임대인 상대 청구라고 선을 긋고, 계약서·이체내역을 챙기라고 안내","혼자 방문하지 말고 대화는 녹음·기록"],
  dont:["겁먹은 티를 내거나 즉석에서 돈 약속","인신공격·조롱으로 맞서기"],
  cases:["c26","c27"]},
 {id:"care", emoji:"🫶", name:"대화가 잘 안 통하는 점유자(돌봄 필요)", lv:3,
  line:"정신건강 어려움·치매 등으로 약속과 대화가 이어지지 않는 사람",
  who:"채무자 또는 대항력 없는 점유자", law:"법적 위치는 다른 점유자와 같다(인도명령 대상 여부도 같다). 다만 의사소통이 어려우면 가족·보호자를 찾고, 필요하면 행정복지센터·정신건강복지센터와 연계한다. 판단 능력이 부족하면 가족이 성년후견 같은 제도를 검토할 수 있다.",
  signs:["어제 한 약속을 기억하지 못한다","대화 주제가 자꾸 바뀌거나 나를 다른 사람으로 착각한다","집 안 관리가 되지 않고 이웃 민원이 있다"],
  inner:"불안하고 겁이 많다. 몰아붙이면 더 닫히고, 믿을 만한 사람이 옆에 있으면 훨씬 수월해진다.",
  doit:["진단을 단정하거나 조롱하지 않기","가족·보호자, 행정복지센터 사회복지 담당과 먼저 연결","짧고 쉬운 말, 같은 내용 반복, 서면으로도 남기기","집행이 필요하면 집행관·경찰과 안전 계획"],
  dont:["혼자 밀어붙여 서명받기(나중에 효력 다툼)","'정신병'처럼 낙인 찍는 말"],
  cases:[]},
 {id:"shop", emoji:"🏪", name:"영업 중인 상가 임차인", lv:3,
  line:"장사를 이어 가야 하는 가게 주인",
  who:"상가 임차인", law:"대항력(사업자등록 등)이 없으면 인도명령 대상이다. 권리금은 매수인이 줄 의무가 없다.",
  signs:["단골과 시설에 들인 돈 이야기","'권리금 받아야 나간다'","재계약을 원한다"],
  inner:"가게를 잃는 게 곧 생계를 잃는 것. 새 계약으로 계속 장사할 수 있으면 오히려 좋은 세입자가 된다.",
  doit:["재임대(새 계약) 가능성을 먼저 검토","내보낸다면 영업 정리 기간을 넉넉히","원상복구 범위를 문서로"],
  dont:["권리금을 법적 의무처럼 받아들이기","영업시간에 손님 앞에서 이야기하기"],
  cases:["c11","c21"]}
];

/* ---------- 가상 인물 (프리셋) ---------- */
const PERSONAS = [
 {id:"p_grandpa", type:"poor", emoji:"👴", name:"최만식 할아버지 (68)", who:"대항력 없는 월세 세입자",
  story:"건설 현장 일용직으로 하루 벌어 하루 산다. 보증금 300만원에 월세 25만원. 경매개시 뒤에 들어와서 최우선변제도 못 받고 배당 0원.",
  legal:"대항력 없음 · 배당 0원 · 인도명령 대상", style:"경상도 사투리로 말하는 투박한 반말(…아이가, …카대, …하노, 몬 한다, …하믄). 억울하면 목소리가 커진다. '내가 뭘 잘못했는데'가 입버릇. 사투리는 어미 위주로 가볍게, 읽기 쉽게.",
  goal:"당장 옮길 방 보증금이 없다. 한 달 정도 시간과 방 보증금에 보탤 150만원쯤이면 나갈 생각이 있다.",
  soft:"존댓말과 사람 대접, 구체적인 날짜, 주거급여·공공임대 같은 현실적 도움 이야기",
  hard:"'법적으로 나가야 한다'만 반복하기, 강제집행 협박, 무시하는 말투",
  opener:"누구요? 경매로 샀다꼬? 나는 아무것도 모른다. 돈 300 넣고 월세 꼬박꼬박 냈는데 내보고 우짜라꼬.",
  minPay:150, execCost:350, weekly:30, par:380,
  p:{resist:62, emo:1.6, legal:0.7, vanish:0.05, transfer:0.02, dividend:false}},
 {id:"p_phishing", type:"bully", emoji:"🧑‍🤝‍🧑", name:"오태석·한미정 부부 (40대)", who:"전 소유자(채무자) 부부",
  story:"보이스피싱으로 모은 돈을 날리고 그 빚을 막으려 집을 담보로 대출을 돌리다 경매로 넘어갔다. 초등학생 아이가 둘.",
  legal:"채무자(전 소유자) · 인도명령 대상 · 배당 없음", style:"남편은 언성을 높이고 '우리가 사기 피해자인데 사람이 할 짓이냐'를 반복한다. 아내는 울다가도 갑자기 날카로워진다.",
  goal:"최대한 시간을 끌고 이사비 1,000만원을 받아 내려 한다. 인도명령이 결정되고 강제집행 계고가 오면 400만원 선에서 합의할 생각.",
  soft:"아이들 학기에 맞춘 날짜 제안, 피해 사실에 대한 공감(하지만 책임은 분리), 절차가 실제로 진행된다는 담담한 설명",
  hard:"피해를 비웃는 말, 맞받아 소리치기, 약속 없는 동정",
  opener:"낙찰받으셨다고요? 저희 보이스피싱 당해서 이렇게 된 거 알고나 오신 거예요? 피해자 집을 헐값에 가져가 놓고 나가라고요?",
  minPay:400, execCost:550, weekly:45, par:700,
  p:{resist:85, emo:0.8, legal:1.3, vanish:0.1, transfer:0.12, dividend:false, greed:1.4, couple:true}},
 {id:"p_coop", type:"coop", emoji:"🙂", name:"정은주 씨 (52)", who:"전 소유자(채무자)",
  story:"식당을 하다 빚이 쌓여 집이 넘어갔다. 딸이 고3이라 수능 전 이사는 피하고 싶어 한다.",
  legal:"채무자(전 소유자) · 인도명령 대상", style:"조용하고 예의 바르지만 지쳐 있다. 짧게 답한다.",
  goal:"수능 끝나는 날까지만 있게 해 주면 이사비 없이도 나갈 수 있다. 날짜를 당기려면 100만원 정도는 받고 싶다.",
  soft:"딸 수험 사정에 대한 배려, 날짜를 문서로 확정", hard:"독촉 문자 연발, 딸 이야기를 무시",
  opener:"네, 연락 기다리고 있었어요. 죄송해요… 저희 딸이 고3이라서요, 언제까지 나가면 될까요?",
  minPay:80, execCost:320, weekly:35, par:250,
  p:{resist:35, emo:1.4, legal:0.6, vanish:0.02, transfer:0.02, dividend:false}},
 {id:"p_ghost", type:"ghost", emoji:"🚪", name:"박준호 씨 (45)", who:"전 소유자(채무자)",
  story:"사업 실패 뒤 연락을 끊고 지방에 가 있다. 집에는 짐 일부만 남아 있다.",
  legal:"채무자 · 인도명령 대상 · 실제 거주 여부 불분명", style:"연락이 닿으면 짜증 섞인 단답. '알아서 하세요'.",
  goal:"귀찮은 일을 피하고 싶다. 강제집행 계고가 붙으면 짐을 빼 가겠다고 연락한다. 50만원이면 바로 정리한다.",
  soft:"연락 경로 확보, 짐 정리 날짜만 정해 주기", hard:"집에 무단으로 들어간 흔적, 짐을 버리겠다는 말",
  opener:"(부재중 3통 뒤에 문자) 누구세요. 집 일은 알아서 하세요.",
  minPay:50, execCost:300, weekly:35, par:300,
  p:{resist:60, emo:0.6, legal:1.2, vanish:0.55, transfer:0.05, dividend:false}},
 {id:"p_greedy", type:"greedy", emoji:"💰", name:"강성필 씨 (57)", who:"전 소유자(채무자)",
  story:"동네 부동산에서 '이사비 천만원 받은 사람도 있다'는 이야기를 들었다.",
  legal:"채무자 · 인도명령 대상", style:"여유로운 척 느긋하다. 숫자를 먼저 던진다.",
  goal:"1,000만원을 부르지만 인도명령이 결정되면 300만원, 계고가 붙으면 200만원까지 내려온다.",
  soft:"집행비용과 비교한 논리, 날짜 먼저 확정", hard:"첫 제안 즉시 수락, 감정적 흥정",
  opener:"아 그 집이요. 나가 드려야죠, 당연히. 근데 이사비는 천만원은 주셔야 됩니다. 다들 그 정도 받던데요?",
  minPay:250, execCost:450, weekly:40, par:490,
  p:{resist:70, emo:0.7, legal:1.4, vanish:0.05, transfer:0.05, dividend:false, greed:1.6}},
 {id:"p_senior", type:"senior", emoji:"🧾", name:"윤서연 씨 (34)", who:"배당받는 전세 세입자",
  story:"보증금 1억 2천을 배당으로 전액 받는다. 새 전셋집을 이미 계약해 두었다.",
  legal:"임차인 · 배당 전액 · 명도확인서 필요", style:"차분하고 계산이 빠르다. 서류 이야기를 좋아한다.",
  goal:"배당기일에 돈을 받고 그날 이사하고 싶다. 명도확인서만 제때 받으면 된다. 이사비 욕심은 크지 않다.",
  soft:"배당기일·이사일 맞추기, 명도확인서 절차 설명", hard:"명도확인서를 볼모로 무리한 요구",
  opener:"안녕하세요. 저 배당 전액 받는 걸로 알고 있어요. 명도확인서는 언제 써 주실 수 있으세요?",
  minPay:0, execCost:320, weekly:40, par:210,
  p:{resist:40, emo:1.0, legal:1.0, vanish:0.02, transfer:0.01, dividend:true}},
 {id:"p_fake", type:"fake", emoji:"🎭", name:"이상훈 씨 (38)", who:"자칭 선순위 임차인",
  story:"채무자의 처남. 근저당 전날 전입했고 '보증금 2억'이라는 계약서를 내밀지만 이체 기록이 없다.",
  legal:"주장상 선순위 임차인(가장임차인 의심) · 인도명령 다툼", style:"처음엔 당당하다가 증빙 이야기에 말을 돌린다.",
  goal:"보증금 일부라도 뜯어낼 수 있을지 떠 보는 중. 금융거래 자료 이야기가 나오면 급격히 약해진다.",
  soft:"증빙을 차분히 요구, 절차를 담담히 안내", hard:"겁먹고 보증금 이야기를 받아 주기",
  opener:"저 선순위 임차인입니다. 보증금 2억 물어 주셔야 나갈 수 있어요. 계약서도 있고요.",
  minPay:100, execCost:380, weekly:40, par:470,
  p:{resist:80, emo:0.5, legal:1.6, vanish:0.1, transfer:0.25, dividend:false, fake:true}},
 {id:"p_lien", type:"lien", emoji:"🏗️", name:"㈜한빛인테리어 현장소장 (49)", who:"유치권 주장자",
  story:"전 소유자와 리모델링 공사를 했다며 공사대금 4,800만원 유치권을 신고했다. 현관에 현수막만 붙어 있다.",
  legal:"유치권 주장 · 실제 점유 불분명", style:"업자 말투. '받을 돈 받아야죠'.",
  goal:"합의금 몇백이라도 받으면 빠질 생각. 실제 점유 사진과 공사 증빙 요구에 약하다.",
  soft:"증빙·점유 사실 확인 요구", hard:"현수막 임의 철거, 욕설",
  opener:"공사대금 4,800 못 받았습니다. 유치권 행사 중이니까 그 돈 해결 전엔 못 들어가십니다.",
  minPay:150, execCost:400, weekly:45, par:480,
  p:{resist:78, emo:0.5, legal:1.5, vanish:0.2, transfer:0.05, dividend:false, lien:true}},
 {id:"p_hug", type:"short", emoji:"🧔", name:"마동철 씨 (54)", who:"HUG 물건의 깔세 점유자",
  story:"전세사기로 전 세입자가 나간 뒤, HUG(주택도시보증공사)가 보증금을 대신 돌려주고 임차권등기를 해 둔 빌라다. 그 뒤 집주인이 이 집을 깔세로 놓았고, 마동철 씨가 6개월 치 월세 360만원을 선불로 내고 들어왔다. 팔에 문신이 가득하고 덩치가 크다. 들어온 지 두 달밖에 안 됐다.",
  legal:"대항력 없음(임차권등기 뒤 전입) · 최우선변제 대상 아님 · 배당 0원 · 인도명령 대상", style:"굵고 낮은 목소리, 처음부터 반말. 말을 끊고 '그래서 내 돈은?'을 반복한다. 겁을 주려고 일부러 험하게 말하지만 선은 넘지 않는다.",
  goal:"남은 넉 달 치 240만원을 누구한테든 받아 내려 한다. 버티면 이사비가 나온다고 들었다. 인도명령 결정과 점유이전금지가처분이 붙고 강제집행 계고까지 오면 200만원 선에서 나간다. 매수인이 겁먹은 티를 내면 요구액을 올린다.",
  soft:"흥분하지 않는 담담한 태도, '선불 월세는 돈 받은 집주인에게 청구할 문제'라는 분명한 선 긋기와 계약서·이체내역을 챙기라는 안내, 구체적인 이사 날짜",
  hard:"겁먹은 티, 즉석 돈 약속, 조롱·반말로 맞서기, 외모 언급, 밤에 혼자 찾아오기",
  opener:"뭐요, 낙찰자? 나 여섯 달 치 360 선불로 다 내고 들어왔어. 그 돈 당신이 줄 거 아니면 문 두드리지 마쇼.",
  minPay:200, execCost:450, weekly:40, par:620,
  p:{resist:92, emo:0.4, legal:1.3, vanish:0.12, transfer:0.35, dividend:false, greed:1.5}},
 {id:"p_5000", type:"greedy", emoji:"👫", name:"한정우·서지은 부부 (40대)", who:"대항력 없는 전세 세입자 부부",
  story:"보증금 4,000만원에 들어왔지만 근저당보다 전입이 늦어 대항력이 없다. 배당으로 받는 돈은 500만원 정도. 초등학생 딸이 하나 있다.",
  legal:"대항력 없음 · 배당 약 500만원(명도확인서 필요) · 인도명령 대상", style:"남편은 논리적인 척 조목조목 따지고, 아내는 억울함에 목이 멘다. '보증금 날린 걸 새 주인이 책임져야 도리 아니냐'가 핵심 주장.",
  goal:"보증금 손해 3,500만원을 메우려고 이사비 5,000만원을 부른다. 배당금 500만원을 받으려면 매수인의 명도확인서가 필요하다는 걸 알게 되면 태도가 확 바뀐다. 인도명령까지 걸리면 200만원 정도에 딸 학기 끝나는 날 이사할 생각.",
  soft:"딸 학교 일정에 맞춘 날짜, 배당금 수령 절차를 친절히 알려 주기, 감정은 받아 주되 책임 소재는 차분히 분리",
  hard:"비웃거나 '법대로'만 반복, 명도확인서를 볼모로 협박하듯 말하기",
  opener:"보증금 4천이 거의 다 날아갔어요. 새 주인이면 5천은 주셔야 우리도 나가죠. 그게 사람 도리 아닙니까?",
  minPay:200, execCost:500, weekly:45, par:350,
  p:{resist:88, emo:0.9, legal:1.2, vanish:0.05, transfer:0.08, dividend:true, greed:1.6, couple:true}},
 {id:"p_delay", type:"coop", emoji:"📅", name:"노경수 씨 (48)", who:"전 소유자(채무자)",
  story:"겉으로는 협조적이다. '다음 달 초엔 꼭 나간다'를 벌써 세 번째 했다. 새 집 잔금 대출이 밀리고, 이삿짐센터 날짜가 안 잡히고, 아이 방학이 겹친다는 핑계가 계속 바뀐다.",
  legal:"채무자 · 인도명령 대상", style:"늘 미안하다며 부드럽게 말하지만 날짜 이야기만 나오면 말끝을 흐린다.",
  goal:"최대한 늦게 나가고 싶다. 날짜와 위약 조건이 적힌 합의서, 이사비를 '날짜 지키면 지급'으로 걸면 지킨다. 강제집행 계고가 붙으면 바로 움직인다.",
  soft:"날짜별 단계 합의(짐 빼기·열쇠 인도), 이사비는 기한 준수 조건, 이해하되 단호한 톤", hard:"또 구두로 믿어 주기, 반대로 거친 협박",
  opener:"아이고 죄송합니다, 이번엔 진짜예요. 잔금 대출이 좀 밀려서… 다음 달 중순까지만 봐주시면 안 될까요?",
  minPay:100, execCost:380, weekly:40, par:390,
  p:{resist:55, emo:1.0, legal:1.2, vanish:0.05, transfer:0.03, dividend:false, greed:1.35}},
 {id:"p_youth", type:"poor", emoji:"🧑", name:"은하늘 씨 (21)", who:"대항력 없는 월세 세입자(보호종료 청년)",
  story:"보육원을 나와 자립정착금으로 보증금 500만원짜리 원룸에 산다. 소액임차인 최우선변제로 보증금 대부분을 배당받지만, 경매가 뭔지 잘 모르고 혼자라 겁에 질려 있다.",
  legal:"대항력 없음 · 최우선변제로 배당(명도확인서 필요) · 인도명령 대상", style:"말수가 적고 존댓말. 무서우면 답장을 안 한다.",
  goal:"보증금이 다 날아간 줄 알고 버티고 있다. 배당 절차와 명도확인서를 알려 주고 청년 주거지원(공공임대 등) 창구를 안내하면 바로 협조한다. 이사비는 50만원이면 충분.",
  soft:"천천히 쉬운 말로 절차 설명, 배당받을 수 있다는 사실, 행정복지센터·청년 주거지원 안내", hard:"다그치는 말, 한꺼번에 법률 용어 폭탄",
  opener:"...죄송한데 저 여기서 나가면 갈 데가 없어요. 보증금도 못 받는 거죠?",
  minPay:50, execCost:280, weekly:30, par:245,
  p:{resist:60, emo:1.8, legal:0.6, vanish:0.3, transfer:0.01, dividend:true}},
 {id:"p_basic", type:"poor", emoji:"🧓", name:"구판석 할아버지 (79)", who:"대항력 없는 무보증 월세 세입자(기초생활수급)",
  story:"기초생활수급으로 혼자 산다. 보증금 없이 월세 20만원이라 배당받을 돈이 없다. 무릎이 안 좋아 계단을 겨우 오르내린다. 자식과는 연락이 끊겼다.",
  legal:"대항력 없음 · 배당 없음 · 인도명령 대상", style:"느리고 정중하다가 서러우면 옛날 이야기를 한참 한다.",
  goal:"당장 옮길 곳이 없어 막막하다. 행정복지센터 사회복지 담당이 주거급여·긴급주거·공공임대를 알아봐 주고, 이사 도움과 100만원 정도 보태 주면 두 달 안에 옮길 수 있다.",
  soft:"행정복지센터와 함께 이사 갈 곳을 찾는 구체적 도움, 여유 있는 날짜, 존중", hard:"빨리 나가라는 독촉, 강제집행 이야기부터 꺼내기",
  opener:"내가 이 나이에 어디로 가겠소. 나라에서 나오는 돈으로 겨우 사는데… 좀 봐주시오.",
  minPay:100, execCost:320, weekly:30, par:265,
  p:{resist:58, emo:1.9, legal:0.5, vanish:0.02, transfer:0.01, dividend:false}},
 {id:"p_mind", type:"care", emoji:"🫶", name:"장미자 씨 (56)", who:"전 소유자(채무자)",
  story:"몇 년 전부터 정신건강이 나빠졌다는 이야기가 이웃에게서 나온다. 혼자 살고, 대화 주제가 자꾸 바뀌며 매수인을 예전 은행 직원으로 착각하기도 한다. 멀리 사는 여동생이 있다.",
  legal:"채무자 · 인도명령 대상", style:"말이 빨라졌다 느려졌다 하고, 같은 질문을 되풀이한다. 겁이 나면 문을 닫아 버린다. 공격적이지는 않다.",
  goal:"무슨 일이 일어나는지 이해하지 못해 불안하다. 여동생과 행정복지센터 담당자가 함께하면 이사를 받아들인다. 돈보다 '믿을 사람'이 필요하다.",
  soft:"짧고 쉬운 말, 같은 말을 차분히 반복, 여동생·행정복지센터 연결 제안, 서면 안내문", hard:"빠른 말로 몰아붙이기, 혼자 서명받으려 하기, 낙인 찍는 말",
  opener:"은행에서 또 왔어요? 나 돈 다 갚았다니까. 우리 집 앞에서 뭐 하는 거예요?",
  minPay:80, execCost:420, weekly:35, par:295,
  p:{resist:70, emo:1.3, legal:0.5, vanish:0.12, transfer:0.02, dividend:false}},
 {id:"p_cn", type:"short", foreign:true, emoji:"🧑‍🎓", name:"왕신이 씨 (24)", who:"중국인 유학생 깔세 세입자",
  story:"서울의 한 대학 대학원생. 전 집주인에게 6개월 치 월세 420만원을 선불(깔세)로 내고 들어왔다. 경매개시 뒤 입주라 대항력이 없다. 기말고사와 비자 연장 서류, 방학 귀국 비행기표가 한꺼번에 걸려 있다.",
  legal:"대항력 없음 · 배당 없음 · 인도명령 대상 (외국인도 같다)", style:"번역기를 거친 듯 어색하지만 공손한 한국어. 가끔 중요한 단어를 영어로 쓴다(\"deposit\", \"visa\"). 겁이 나면 '경찰 불러야 합니까?'라고 묻는다.",
  goal:"낸 돈을 날렸다는 불안이 크다. 남은 월세는 돈 받은 전 집주인에게 청구하는 거라는 걸 쉬운 말로 알려 주고, 기말고사 끝나는 3주 뒤 귀국 날짜에 맞추면 30만원 정도로 깔끔하게 나간다.",
  soft:"짧고 쉬운 문장, 번역 안내, 학교 일정 존중, 외국인 지원 창구 안내", hard:"어려운 법률 용어 폭탄, 비자·출입국 문제로 겁주기",
  opener:"안녕하세요. 저는 여기 살고 있는 학생입니다. 집주인에게 6개월 돈 이미 줬어요. 왜 나가야 합니까? 잘 이해 안 됩니다.",
  minPay:30, execCost:300, weekly:40, par:260,
  p:{resist:62, emo:1.5, legal:0.8, vanish:0.1, transfer:0.1, dividend:false}},
 {id:"p_hwagyo", type:"short", foreign:true, emoji:"🥟", name:"곽씨 부부 (50대)", who:"화교 부부 깔세 세입자",
  story:"한국에서 나고 자란 화교 부부. 근처에서 작은 중국 음식점을 한다. 1년 치 월세 일부를 선불로 냈고, 가게와 가까워야 해서 동네를 떠나기 싫어한다. 고등학생 아들과 강아지 한 마리.",
  legal:"대항력 없음 · 배당 없음 · 인도명령 대상", style:"남편은 한국어가 완벽하고 계산이 빠른 장사꾼 말투. 아내는 가끔 중국어로 남편에게 뭐라고 하고, 남편이 '집사람이 걱정이 많아서요'라고 전한다.",
  goal:"같은 동네 새 집을 구할 시간 6주와 이사비 150만원. 가게 영업시간을 피해 연락하고, 동네 부동산 매물 정보를 같이 알아봐 주면 빨리 협조한다.",
  soft:"가게 영업 존중(바쁜 시간 피하기), 동네 매물 정보 공유, 명확한 날짜", hard:"가게로 찾아가 손님 앞에서 이야기하기, 무시하는 말투",
  opener:"아, 낙찰받으신 분이구나. 저희도 장사하는 사람이라 대충 압니다. 근데 우리가 1년 치를 반이나 미리 냈거든요. 이거 어떻게 정리하실 거예요?",
  minPay:150, execCost:420, weekly:45, par:430,
  p:{resist:75, emo:0.9, legal:1.1, vanish:0.02, transfer:0.05, dividend:false, greed:1.2}},
 {id:"p_mn", type:"short", foreign:true, emoji:"🧑‍🏭", name:"바트 씨 (33)", who:"몽골인 공장 근로자 깔세 세입자",
  story:"공장에서 주야 교대 근무를 한다. 지인 소개로 깔세로 들어왔다. 아내는 한국어를 거의 못 하고 네 살 딸이 있다. 야간 근무 주에는 낮에 자느라 전화를 못 받는다.",
  legal:"대항력 없음 · 배당 없음 · 인도명령 대상", style:"짧고 솔직한 한국어. '사장님', '괜찮아요'를 자주 쓴다. 급하면 '월급 나오면'을 반복한다.",
  goal:"월말 급여일 뒤에 이사하고 싶다. 보증금 없는 새 방을 구하려면 50만원 정도가 필요하다. 교대 근무 시간에 맞춰 연락해 주면 협조적.",
  soft:"근무 시간 맞춘 연락, 쉬운 한국어, 급여일 기준 날짜", hard:"낮에 계속 초인종 누르기, 아이 앞에서 큰소리",
  opener:"사장님 안녕하세요. 저 밤에 일해요. 전화 못 받았어요 미안해요. 월급 나오면 이사 가요. 괜찮아요?",
  minPay:50, execCost:320, weekly:35, par:290,
  p:{resist:55, emo:1.4, legal:0.8, vanish:0.35, transfer:0.12, dividend:false}},
 {id:"p_pk", type:"short", foreign:true, emoji:"👷", name:"아메드 씨 외 3명 (20~30대)", who:"파키스탄 공장 근로자 4명 공동 깔세",
  story:"공장 근처 빌라에 네 명이 같이 산다. 계약서는 아메드 씨 이름 하나지만 월세는 넷이 나눠 냈다. 한국인 사장(고용주)이 중간에서 통역과 연락을 도와준다. 교대 근무라 늘 누군가는 자고 있다.",
  legal:"대항력 없음 · 배당 없음 · 성인 4명 모두 점유자 → 전원 특정 필요 · 인도명령 대상", style:"예의 바르고 짧은 한국어에 영어 단어를 섞는다(\"boss\", \"company\"). 중요한 결정은 '사장님한테 물어볼게요'.",
  goal:"회사가 새 숙소를 구해 줄 때까지 4주가 필요하다. 고용주를 통해 이야기하고 네 명 모두 서명하는 합의서를 쓰면 이사비 없이도 나간다.",
  soft:"고용주와 삼자 소통, 네 명 모두에게 같은 안내문, 존중하는 태도", hard:"한 명과만 약속하기, 고용주를 무시하기",
  opener:"Hello 사장님. 우리 네 명 여기 살아요. boss가 곧 새 집 찾아요. 조금만 기다려 주세요, please.",
  minPay:0, execCost:450, weekly:40, par:330,
  p:{resist:60, emo:1.1, legal:1.0, vanish:0.08, transfer:0.2, dividend:false}},
 {id:"b_old", role:"broker", type:"r_broker", emoji:"🏢", name:"김사장님 (63) · 동네 30년 부동산", who:"동네 토박이 공인중개사",
  story:"동네에서 30년 영업한 중개사무소 사장님. 급매 위주로 빨리 돌리는 스타일이라 '가격 1천만 내리면 바로 팔아 준다'가 입버릇이고, 자기한테만 맡기라고(전속) 한다.",
  legal:"공인중개사 — 중개보수는 법정 상한 요율 이내에서 협의", style:"충청도 사투리가 섞인 느긋하고 친근한 사장님 말투(…유, …쥬, …혀, …니께, 그려). '내가 이 동네 다 알아'가 입버릇. 사투리는 어미 위주로 가볍게, 읽기 쉽게.",
  goal:"빨리 팔아서 수수료를 받고 싶다. 매도인이 거래량·경쟁 매물 데이터로 근거를 대면 호가를 존중한다. 전속 대신 '2주간 우선 광고 + 사진 요청' 정도로 타협 가능. 중개보수는 상한 요율보다 조금 낮게 합의할 수 있다.",
  soft:"동네 시세·거래량을 아는 티, 사장님 경험 존중, 명확한 최저선과 기한", hard:"무조건 내 가격 고집, 무시하는 태도",
  opener:"이 집? 1억 7,800은 좀 세유. 1억 6,800이면 내가 이번 주에 바로 팔아 줄게. 딴 데 내놓지 말고 나한테만 맡겨유.",
  mission:"호가 1억 7,800만원, 최저선 1억 7,000만원. 근거 없이 가격을 내리지 말고, 광고 조건·중개보수를 미리 합의해 매물을 맡기세요."},
 {id:"b_mgm", role:"broker", type:"r_broker", emoji:"🕴️", name:"이실장 (40대) · 관외 컨설팅", who:"다른 지역에서 연락 온 '컨설팅' 업자",
  story:"물건을 보고 먼저 연락해 왔다. 자기 쪽 매수자 네트워크가 있다며 법정 중개보수 외 '컨설팅비' 300만원, 대출이 잘 나오게 계약서를 실제보다 높게 쓰는 '업계약'을 은근히 권한다.",
  legal:"법정 상한 초과 보수·허위 거래신고(업계약) 요구는 불법", style:"매끄럽고 빠른 말투. '다들 이렇게 해요', '사장님만 손해 봐요'.",
  goal:"컨설팅비를 받아 내고 싶다. 매도인이 불법 요소를 정확히 짚고 정상 중개보수만 가능하다고 하면 발을 빼거나 정상 조건으로 소개한다.",
  soft:"법 테두리 안 조건을 분명히 제시", hard:"애매하게 '생각해 볼게요'로 여지 주기",
  opener:"사장님 물건 제가 바로 소화해 드릴 수 있어요. 컨설팅비로 300만 따로 주시고, 계약서는 1억 9천으로 쓰면 매수자 대출도 잘 나옵니다. 다들 이렇게 해요.",
  mission:"불법 제안(업계약·법정 상한 초과 보수)을 분명히 거절하고, 정상 조건으로만 거래할지 결정하세요."},
 {id:"b_young", role:"broker", type:"r_broker", emoji:"👩‍💼", name:"박소장 (31) · 새내기 중개사", who:"개업 1년 차 공인중개사",
  story:"열정적이고 온라인 광고를 잘한다. 좋은 사진과 집 보여줄 시간 협조를 원하고, 대신 중개보수는 상한 요율로 받고 싶어 한다.",
  legal:"공인중개사 — 중개보수 법정 상한 이내", style:"예의 바르고 꼼꼼한 존댓말. 질문이 많다.",
  goal:"사진·비밀번호·방문 협조를 얻고 싶다. 매도인이 빠른 방문 협조와 사진을 약속하면 중개보수 소폭 조정(예: 0.1%p)에 응한다.",
  soft:"구체적인 방문 가능 시간, 수리 내역 정리, 사진 제공", hard:"협조 없이 수수료만 깎기",
  opener:"안녕하세요! 매물 맡겨 주셔서 감사해요. 사진이랑 수리 내역 정리해 주실 수 있을까요? 집 보여 드릴 때 비밀번호도 여쭤봐도 될까요?",
  mission:"집 보여주기·광고 조건을 정하고, 중개보수를 서로 납득하는 선에서 서면으로 합의하세요."},
 {id:"i_add", role:"contractor", type:"r_contractor", emoji:"🧰", name:"오반장 (58) · 인테리어", who:"기본 정리(도배·장판·욕실) 공사 중인 업자",
  story:"계약 금액 650만원으로 공사 중. 욕실 타일을 뜯다가 방수층이 깨진 걸 발견했다며 방수 공사 400만원을 추가로 요구한다. 공사 기간도 5일 늘어난다고 한다.",
  legal:"추가 공사는 원래 계약 밖 — 근거 확인 후 서면 합의", style:"현장 사람 말투. '안 하면 나중에 아랫집 물 새요'.",
  goal:"추가 공사로 매출을 올리고 싶다. 사진·범위·자재 근거를 요구받으면 실제 필요한 부분만 250만원 정도로 조정한다. 서면으로 추가 계약을 쓰면 일정도 약속한다.",
  soft:"현장 사진·범위 확인, 다른 업체 단가 언급, 서면 추가 계약", hard:"무조건 거절(정말 새면 더 큰 손해), 확인 없이 바로 승낙",
  opener:"사장님, 욕실 타일 뜯어 보니 방수가 다 깨져 있어요. 이거 안 하면 아랫집 물 샙니다. 방수 400 추가하고 5일 더 걸려요.",
  mission:"추가 공사가 정말 필요한지 확인하고, 합리적인 금액·일정으로 서면 합의하세요. 공사가 길어질수록 이자가 나간다는 점도 잊지 마세요."},
 {id:"i_cheap", role:"contractor", type:"r_contractor", emoji:"🪚", name:"최사장 (45) · 최저가 견적", who:"견적이 유난히 싼 업자",
  story:"다른 두 곳이 900~1,000만원을 부른 공사를 600만원에 해 준다고 한다. 견적서는 '도배·장판·욕실 일식'처럼 항목이 뭉뚱그려져 있고, 계약금 50%를 먼저 달라고 한다.",
  legal:"견적·계약서에 항목·자재·공정·지급 조건을 명시해야 분쟁을 막는다", style:"시원시원하고 자신만만하다. '제가 다 알아서 해요'.",
  goal:"계약금을 빨리 받고 싶다. 항목별 견적·자재 등급·공정표·잔금은 완공 후 지급을 요구받으면 700만원으로 올리되 명시하는 데 동의한다.",
  soft:"다른 견적과 항목별 비교, 지급 조건 제시", hard:"싸다고 바로 계약, 계약금 선지급",
  opener:"다른 데 900 불렀죠? 저는 600에 해 드려요. 계약금 반만 먼저 주시면 내일부터 들어갑니다.",
  mission:"항목·자재·공정표·지급 조건(잔금은 완공 확인 후)을 받아 내고, 싼 견적의 함정을 피하세요."},
 {id:"k_newlywed", role:"buyer", type:"r_buyer", emoji:"💑", name:"매수 희망 신혼부부 (30대)", who:"첫 집을 찾는 신혼부부",
  story:"호가 1억 7,800만원 빌라를 마음에 들어 한다. 1억 6,500만원으로 깎아 달라고 하고, 도배 다시·에어컨 설치·잔금 3개월 뒤를 원한다.",
  legal:"매매 계약 — 특약은 범위·기간을 숫자로", style:"조심스럽지만 가격 이야기는 집요하다. 인터넷 시세를 계속 들이민다.",
  goal:"최대한 싸게 사고 싶다. 조건을 주고받으면(잔금일 조정·도배 대신 가격 조금) 1억 7,200만원까지 올 수 있다.",
  soft:"집의 장점과 수리 내역을 근거로, 가격 대신 조건 교환", hard:"한 푼도 안 깎는 태도, 반대로 바로 크게 깎아 주기",
  opener:"집은 너무 좋은데요… 저희 예산이 1억 6,500이라서요. 도배만 새로 해 주시고 잔금은 3개월 뒤로 해 주실 수 있을까요?",
  mission:"1억 7,200만원 이상으로, 조건(잔금일·수리)을 주고받아 계약하세요."}
];

/* ---------- 가상 점유자 만들기 ---------- */
const OCC_SURNAME = ["김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황","안","송","전","홍"];
const OCC_GIVEN = ["만수","순자","영철","미숙","동훈","정희","상철","경자","준영","혜진","성호","민정","덕배","옥자","태호","지연","병철","수진","광수","은희"];
const OCC_TWISTS = [
 {t:"아이가 기말고사 기간이라 이사를 미루고 싶어 한다", d:{emo:0.2}, pay:0},
 {t:"반려견 세 마리 때문에 새 집 구하기가 어렵다", d:{resist:6}, pay:30},
 {t:"허리 수술 뒤 회복 중이라 짐을 못 옮긴다", d:{emo:0.3}, pay:40},
 {t:"새 집 잔금일이 한 달 뒤로 잡혀 있다", d:{resist:-10}, pay:-20},
 {t:"동네 부동산에서 이사비를 많이 받는다고 들었다", d:{resist:8, greed:0.3}, pay:80},
 {t:"월세가 6개월째 밀려 있어 모든 게 막막하다", d:{emo:0.2}, pay:40},
 {t:"짐이 많아 이사 비용만 200만원 넘게 나온다", d:{}, pay:70},
 {t:"친척이 '버티면 돈 준다'고 부추기고 있다", d:{resist:10, legal:-0.2}, pay:60},
 {t:"법률구조공단에 상담을 받아 절차를 대충 안다", d:{legal:0.3}, pay:-20},
 {t:"치매 초기인 어머니와 함께 산다", d:{emo:0.3}, pay:30}
];
const GEN_OPENERS = {
 coop:["네, 연락 주셨네요. 언제까지 비워 드리면 될까요?","아… 낙찰받으신 분이구나. 저희도 정리하려고는 하고 있어요."],
 angry:["당신이 내 집 가져간 사람이야? 할 말 있으면 해 봐요.","연락하지 말라니까요. 헐값에 가져가 놓고 무슨 얘기를 해요."],
 ghost:["(한참 뒤 짧은 문자) 누구세요.","(부재중 여러 통 뒤) 바빠요. 용건만."],
 poor:["나보고 어쩌라고. 돈도 못 받고 쫓겨나게 생겼는데.","젊은 양반, 나 갈 데가 없어. 보증금도 못 받았다는데."],
 greedy:["나가 드려야죠. 근데 이사비는 넉넉히 주셔야 합니다.","얼마 주실 건데요? 금액부터 들어 봅시다."],
 bully:["우리가 무슨 일을 당했는지 알고 이러는 거예요? 사람이 양심이 있어야지.","애들 있는 집에서 나가라고요? 법이 그렇게 돼 있어도 사람이 그러면 안 되지."],
 fake:["저 여기 정식 임차인이에요. 보증금 받기 전엔 못 나갑니다.","계약서 있어요. 보증금 돌려주시면 바로 나가죠."],
 senior:["안녕하세요, 배당은 언제 나오나요? 명도확인서도 필요하다던데.","저 이사 갈 집은 구해 놨어요. 날짜만 맞추면 돼요."],
 lien:["공사대금 못 받았습니다. 그거 해결 전엔 못 들어가요.","유치권 신고 보셨죠? 돈 얘기부터 하시죠."],
 short:["돈 다 내고 들어왔는데 뭘 나가라 마라야.","선불로 낸 월세 돌려주면 생각해 보지. 아니면 연락하지 마쇼."],
 shop:["장사하는 사람한테 나가라는 건 죽으라는 거예요. 권리금은요?","손님 계시니까 이따 얘기해요. 재계약은 되는 거죠?"]
};
function occGen(typeId){
  const t = typeId ? OCC_TYPES.find(x=>x.id===typeId) : pick(OCC_TYPES);
  const base = PERSONAS.find(x=>x.type===t.id) || PERSONAS[0];
  const tw = pick(OCC_TWISTS);
  const age = rnd(t.id==="poor"?60:30, t.id==="poor"?78:62);
  const nm = pick(OCC_SURNAME) + pick(OCC_GIVEN);
  const p = Object.assign({}, base.p);
  Object.keys(tw.d).forEach(k => { p[k] = (p[k]||(k==="greed"?1:0)) + tw.d[k]; });
  p.resist = Math.max(20, Math.min(95, (p.resist||50) + rnd(-8,8)));
  const minPay = Math.max(0, Math.round(((base.minPay||0) + tw.pay + rnd(-4,4)*10)/10)*10);
  const id = "g" + Date.now().toString(36) + rnd(10,99);
  const openers = GEN_OPENERS[t.id] || ["…누구세요?"];
  const goal = `${t.inner} 마지노선은 ${minPay>0?`대략 ${man0(minPay)} 안팎의 이사비`:"이사비 없이 날짜만 맞으면"}인데, 처음엔 더 부르거나 버틸 수 있다.`;
  const house = JSON.parse(JSON.stringify(pick(HOUSE_POOL))).filter(h=>h.rel);
  return {id, gen:true, house, type:t.id, emoji:t.emoji, name:`${nm} 씨 (${age})`, who:base.who,
    story:`${t.line}. ${tw.t}. (가상의 인물)`,
    legal:base.legal, style:base.style, goal,
    soft:base.soft, hard:base.hard, opener:pick(openers), minPay, execCost:base.execCost, weekly:base.weekly,
    par: Math.round(base.par*0.9 + (minPay-(base.minPay||0))*0.8), p, twist:tw.t};
}
const man0 = n => n.toLocaleString("ko-KR") + "만원";
function arenaRec(){ if(!S.arena) S.arena = {best:{}, chats:{}, custom:[]}; ["best","chats"].forEach(k=>{ if(!S.arena[k]) S.arena[k]={}; }); if(!S.arena.custom) S.arena.custom=[]; return S.arena; }

/* ---------- 함께 사는 사람 (명도는 대개 혼자가 아니다) ---------- */
const HOUSEHOLD = {
 p_grandpa:[{desc:"치매 초기인 아내 (74)", rel:"할머니", adult:1, av:{g:"f", age:"old", hair:"perm", hc:"#cfcfcf", skin:"#d9a27a", brow:"sad", mouth:"flat", top:"#8a6d3b", bg:"#e9dcc7", wrinkle:1}}],
 p_phishing:[{desc:"초등학생 아들·딸", rel:"아이", adult:0},{desc:"진돗개 한 마리", rel:"개", adult:0, pet:1}],
 p_coop:[{desc:"지방 현장 근무로 주말에만 오는 남편", rel:"남편", adult:1, av:{g:"m", hair:"short", hc:"#2a2320", skin:"#d9a27a", brow:"flat", mouth:"flat", top:"#39424e", bg:"#dcebe0"}},{desc:"수능을 앞둔 고3 딸", rel:"딸", adult:0}],
 p_ghost:[{desc:"가끔 드나드는 사실혼 관계 여성", rel:"동거녀", adult:1, av:{g:"f", hair:"long", hc:"#6b4a35", skin:"#f0c6a0", brow:"flat", mouth:"flat", top:"#6b7280", bg:"#dfe3e8"}}],
 p_greedy:[{desc:"아내", rel:"아내", adult:1, av:{g:"f", age:"old", hair:"perm", hc:"#4a2f22", skin:"#f0c6a0", brow:"flat", mouth:"smile", top:"#c9587a", bg:"#e3e8f2"}},{desc:"취업 준비 중인 30대 아들", rel:"아들", adult:1, av:{g:"m", hair:"short", hc:"#1f1a18", skin:"#e8b98f", brow:"flat", mouth:"flat", top:"#6b7280", bg:"#e3e8f2"}}],
 p_senior:[{desc:"월세를 나눠 내는 대학 동기 룸메이트", rel:"룸메이트", adult:1, av:{g:"f", hair:"bun", hc:"#3b2a20", skin:"#f3cfae", brow:"flat", mouth:"smile", top:"#4f7ea8", bg:"#efe6d6"}}],
 p_fake:[{desc:"실제로 여기 사는 채무자 누나", rel:"누나", adult:1, av:{g:"f", hair:"long", hc:"#2a1d17", skin:"#e8b98f", brow:"sad", mouth:"flat", top:"#7a4b8f", bg:"#e7dcef"}}],
 p_lien:[{desc:"교대로 상주하는 직원 두 명", rel:"직원", adult:1, av:{g:"m", hair:"cap", cap:"#e07b24", hc:"#2a2320", skin:"#c68b5e", brow:"flat", mouth:"flat", top:"#39424e", bg:"#f5e3cc"}}],
 p_hug:[{desc:"고양이 세 마리", rel:"고양이", adult:0, pet:1},{desc:"같이 사는 덩치 큰 '형님' 친구", rel:"형님", adult:1, av:{g:"m", hair:"buzz", hc:"#1e1e1e", skin:"#e2b48c", brow:"angry", mouth:"flat", top:"#222", bg:"#e2d6d6", fat:1, shades:1}}],
 p_5000:[{desc:"초등학생 딸 (10)", rel:"딸", adult:0}],
 p_delay:[{desc:"말티즈 두 마리", rel:"강아지", adult:0, pet:1},{desc:"아내", rel:"아내", adult:1, av:{g:"f", hair:"bun", hc:"#3b2a20", skin:"#f0c6a0", brow:"sad", mouth:"flat", top:"#b5523b", bg:"#efe6d6"}},{desc:"중학생 아들 둘", rel:"아이들", adult:0}],
 p_youth:[{desc:"같은 보육원 출신 룸메이트 친구", rel:"친구", adult:1, av:{g:"m", hair:"buzz", hc:"#1f1a18", skin:"#e8b98f", brow:"flat", mouth:"flat", top:"#4f7ea8", bg:"#dcebe0"}}],
 p_basic:[{desc:"혼자 산다 — 주 3회 요양보호사가 다녀간다", rel:"요양보호사", adult:0},{desc:"늙은 발바리 한 마리", rel:"개", adult:0, pet:1}],
 p_cn:[{desc:"같은 학교 유학생 룸메이트", rel:"룸메이트", adult:1, av:{g:"f", hair:"long", hc:"#1a1410", skin:"#f3cfae", brow:"flat", mouth:"flat", top:"#4f7ea8", bg:"#e3e8f2", glasses:1}},{desc:"고양이 한 마리", rel:"고양이", adult:0, pet:1}],
 p_hwagyo:[{desc:"고등학생 아들", rel:"아들", adult:0},{desc:"푸들 한 마리", rel:"강아지", adult:0, pet:1}],
 p_mn:[{desc:"한국어가 서툰 아내", rel:"아내", adult:1, av:{g:"f", hair:"long", hc:"#161210", skin:"#d9a27a", brow:"sad", mouth:"flat", top:"#b5523b", bg:"#efe6d6"}},{desc:"네 살 딸", rel:"딸", adult:0}],
 p_pk:[{desc:"같은 공장 동료 3명", rel:"동료", adult:1, av:{g:"m", hair:"short", hc:"#111", skin:"#b27a52", brow:"flat", mouth:"smile", top:"#5f8f6e", bg:"#dcebe0", beard:1}},{desc:"동료", rel:"동료", adult:1, av:{g:"m", hair:"buzz", hc:"#111", skin:"#a86f48", brow:"flat", mouth:"flat", top:"#39424e", bg:"#dcebe0"}}],
 p_mind:[{desc:"모시고 사는 80대 노모", rel:"노모", adult:1, av:{g:"f", age:"old", hair:"perm", hc:"#e0e0e0", skin:"#d9a27a", brow:"sad", mouth:"flat", top:"#5f8f6e", bg:"#e7dcef", wrinkle:1}}]
};
const HOUSE_POOL = [
 [{desc:"배우자", rel:"배우자", adult:1}],
 [{desc:"배우자", rel:"배우자", adult:1},{desc:"초등학생 아이 둘", rel:"아이들", adult:0}],
 [{desc:"배우자", rel:"배우자", adult:1},{desc:"고등학생 자녀", rel:"자녀", adult:0}],
 [{desc:"모시고 사는 80대 노모", rel:"노모", adult:1, old:1}],
 [{desc:"거동이 불편한 아버지", rel:"아버지", adult:1, old:1},{desc:"배우자", rel:"배우자", adult:1}],
 [{desc:"월세를 나눠 내는 친구", rel:"친구", adult:1}],
 [{desc:"사실혼 관계 동거인", rel:"동거인", adult:1}],
 [{desc:"독립 못 한 30대 자녀", rel:"성인 자녀", adult:1}],
 [{desc:"배우자", rel:"배우자", adult:1},{desc:"백일 된 아기", rel:"아기", adult:0}],
 [{desc:"혼자 산다", rel:"", adult:0}],
 [{desc:"배우자", rel:"배우자", adult:1},{desc:"고양이 두 마리", rel:"고양이", adult:0, pet:1}],
 [{desc:"대형견 한 마리", rel:"개", adult:0, pet:1}],
 [{desc:"배우자", rel:"배우자", adult:1},{desc:"초등학생 아이", rel:"아이", adult:0},{desc:"강아지 한 마리", rel:"강아지", adult:0, pet:1}]
];
function houseOf(P){ return P.house || HOUSEHOLD[P.id] || []; }
function houseAdults(P){ return houseOf(P).filter(h=>h.adult).length; }
function houseText(P){ const h = houseOf(P); return h.length ? h.map(x=>x.desc).join(" · ") : "혼자 산다"; }
function allPersonas(){ return PERSONAS.concat(arenaRec().custom); }
function personaById(id){ return allPersonas().find(p=>p.id===id); }
const ROLE_TYPES = {
 r_broker:{id:"r_broker", name:"부동산 사장님", lv:2, line:"내 물건을 팔아 줄 중개사", doit:["거래량·경쟁 매물 데이터로 가격 이야기","중개보수는 법정 상한 이내에서 미리 서면 합의","불법 제안(업계약·허위신고)은 단호히 거절"]},
 r_contractor:{id:"r_contractor", name:"인테리어 업자", lv:2, line:"수리를 맡길 업자", doit:["항목·자재·수량이 적힌 견적","공정표·지급 조건(잔금은 완공 확인 후)","추가 공사는 사진·서면 합의 뒤에"]},
 r_buyer:{id:"r_buyer", name:"매수 희망자", lv:2, line:"내 집을 사려는 사람", doit:["가격을 깎아 주면 조건을 받아 오기","하자 특약은 범위·기간을 숫자로","잔금일·계약금 비율을 먼저 확정"]}
};
const ROLE_LABEL = {occupant:"🏚️ 명도 — 점유자", broker:"🏢 매도 — 부동산 사장님", contractor:"🔨 인테리어 업자", buyer:"🤝 매수 희망자"};
function occType(id){ return OCC_TYPES.find(t=>t.id===id) || ROLE_TYPES[id] || OCC_TYPES[0]; }
const roleOf = P => P.role || "occupant";

/* ============================== 명도왕 게임 ============================== */
const G_DEADLINE = 26, G_MAXWEEK = 52;
let G = null;
const clamp = (v,a=0,b=100) => Math.max(a, Math.min(b, v));
function gStart(pid){
  const P = personaById(pid);
  if(!P || !P.p){ G = null; return; }
  G = {pid, week:0, mood:40, resist:P.p.resist, spent:0, fees:0, paid:0, met:false, visits:0, notices:0,
       order:null, orderOk:false, suit:false, pledge:false, gone:false, silent:0,
       deal:null, contract:false, exec:null, lever:false, proof:false, lienDone:false,
       log:[{who:"sys", t:`${P.name} — ${P.who}. 대금납부를 마쳤다. 이제부터 1주일에 한 번씩 행동한다. 매주 대출이자·관리비로 ${P.weekly}만원이 나간다.`}],
       over:null, used:{}};
}
function gNeed(P){
  const g = P.p.greed || 1;
  let n = P.minPay * g * (0.55 + G.resist/100) * (1.25 - G.mood/200);
  if(G.lever) n *= 0.15;
  if(G.exec && G.exec.warned) n *= 0.6;
  return Math.max(0, n);
}
const G_LINES = {
 greet:{coop:"와 주셔서 감사해요. 날짜만 정해 주시면 맞춰 볼게요.", angry:"얼굴 보니 더 화가 나네요. …그래도 이야기는 들어 볼게요.", ghost:"(문이 열리지 않는다. 우편함에 고지서가 가득하다)", poor:"들어와요, 누추해도. 나도 답답해서 그래.", greedy:"오셨어요? 차 한잔 하시죠. 근데 이사비 얘기는 하고 가셔야죠.", bully:"여기가 어디라고 찾아와요? 애들 있는데!", fake:"계약서 보여 드려요? 저 정식 임차인이에요.", senior:"오셨어요? 배당기일이 언제인지 아세요?", short:"(문을 반쯤 열고 팔짱) 할 말 있으면 거기서 해요.", lien:"(현관엔 현수막만. 전화하자 소장이 받는다) 현장 오셔 봤자 돈 얘기밖에 없습니다.", shop:"손님 있을 때는 곤란하고요, 마감 후에 뵙죠."},
 soft:"…그렇게까지 말씀하시니 좀 생각해 볼게요.",
 insult:"그 돈 받고 나가라고요? 사람 우습게 보시네.",
 counter:n=>`${man0(n)}이면 생각해 볼게요.`,
 notice:{hi:"내용증명이요? 벌써 이렇게 나오신다고요?", lo:"(내용증명 수령 확인)"},
 order:"인도명령 결정문을 받았다. 상대의 목소리가 한결 작아졌다.",
 warn:"집행관이 계고를 붙이고 갔다. '○일까지 자진해서 나가지 않으면 강제집행합니다.'",
 agree:"알겠어요. 그 날짜에 나갈게요.",
 flip:"생각해 보니 억울해서 안 되겠어요. 그 돈으론 못 나가요.",
 gone:"연락이 끊겼다. 문자도 전화도 받지 않는다.",
 back:"연락이 다시 닿았다.",
 transfer:"⚠️ NEW OCCUPANT — 집행관이 문을 두드리자 처음 보는 사람이 나왔다. '저 아는 사람한테 방 빌렸는데요?' — 점유자가 바뀌어 기존 인도명령만으로는 집행이 어려워졌다."
};
const G_ACTIONS = [
 {id:"visit", ic:"🚪", t:"찾아가서 인사·대화", d:"관계가 오르고 속마음을 들을 수 있다"},
 {id:"msg", ic:"💬", t:"문자로 날짜 제안", d:"부담 없이 관계를 조금 올린다"},
 {id:"notice", ic:"📮", t:"내용증명 발송", d:"법적 압박. 감정적인 상대는 상처받는다", cost:1},
 {id:"order", ic:"⚖️", t:"인도명령 신청", d:"대금납부 후 6개월(26주) 안에만 가능. 결정까지 2~4주", cost:5},
 {id:"suit", ic:"🏛️", t:"명도소송 제기", d:"인도명령 기한을 놓쳤을 때. 판결까지 약 4개월", cost:300},
 {id:"offer", ic:"💵", t:"이사비 제안", d:"금액을 고르면 상대가 답한다"},
 {id:"contract", ic:"✍️", t:"이사 합의서 작성", d:"합의 뒤 번복을 막는다. 잔금은 이사 확인 후 지급", cost:0},
 {id:"lever", ic:"🧾", t:"명도확인서 원칙 안내", d:"배당받는 임차인에게: 이사 확인 뒤에 써 준다", only:"dividend"},
 {id:"proof", ic:"🔎", t:"가장임차인 자료 수집", d:"전입 경위·보증금 이체 흔적 확인", only:"fake", cost:10},
 {id:"lien", ic:"📸", t:"점유·공사 사실 확인", d:"유치권 부존재 증거 확보", only:"lien", cost:30},
 {id:"pledge", ic:"🔒", t:"점유이전금지가처분", d:"사람이 바뀌는 걸 막는다", cost:60},
 {id:"exec", ic:"🚚", t:"강제집행 신청", d:"인도명령(또는 판결)이 있어야 한다. 계고 후 집행"},
 {id:"survey", ic:"🗺️", t:"점유관계 조사", d:"전입세대 열람·야간 현장 확인으로 실제 점유자 전원 파악", cost:1},
 {id:"lease", ic:"❤️", t:"월세 받고 한 달 더 살게 해 주기", d:"착해 보이는 선택… 괜찮을까?"},
 {id:"hand_full", ic:"🔑", t:"인도 확인 제대로 하기", d:"내부 전체 확인·잔존물 확인서·도어락 교체까지", cost:20},
 {id:"hand_quick", ic:"🗝️", t:"열쇠만 받고 끝내기", d:"빠르고 편하다"},
 {id:"wait", ic:"⏳", t:"이번 주는 기다린다", d:"아무것도 하지 않는다"},
 {id:"illegal", ic:"⚡", t:"단전·단수로 압박하기", d:"빨리 끝날 것 같지만…", bad:true}
];
const G_OFFERS = [0, 50, 100, 200, 300, 500, 800];
function gLog(who, t){ G.log.push({who, t}); }
function gAvail(a, P){
  if(G.over) return false;
  if(G.handover) return a.id==="hand_full" || a.id==="hand_quick";
  if(a.id==="hand_full"||a.id==="hand_quick") return false;
  if(a.id==="survey") return !G.mapped;
  if(a.id==="lease") return !G.newTitle && !G.deal;
  if(a.only && !P.p[a.only]) return false;
  if(a.id==="order") return !G.order && !G.orderOk && !G.suit && G.week < G_DEADLINE && !G.newTitle;
  if(a.id==="suit") return !G.order && !G.orderOk && !G.suit && (G.week >= G_DEADLINE || G.newTitle);
  if(a.id==="contract") return G.deal && !G.contract;
  if(a.id==="offer") return !G.deal;
  if(a.id==="lever") return !G.lever;
  if(a.id==="proof") return !G.proof;
  if(a.id==="lien") return !G.lienDone;
  if(a.id==="pledge") return !G.pledge;
  if(a.id==="exec") return G.orderOk && !G.exec;
  return true;
}
function gAct(id, amt){
  const P = personaById(G.pid), T = occType(P.type), pr = P.p;
  const a = G_ACTIONS.find(x=>x.id===id);
  if(!a || !gAvail(a, P)) return;
  G.used[id] = (G.used[id]||0) + 1;
  if(a.cost) G.fees += a.cost;
  if(id==="illegal"){
    gLog("me","단전·단수로 압박했다.");
    gLog("sys","점유자가 경찰에 신고했다. 매수인이라도 점유자를 스스로 내쫓는 '자력구제'는 허용되지 않는다. 단전·단수, 문 따고 들어가기, 짐 빼기는 형사 문제(업무방해·주거침입·재물손괴 등)와 손해배상으로 번질 수 있다.");
    G.over = {win:false, why:"불법 자력구제로 형사 고소를 당했다"}; return gEnd(P);
  }
  const contact = !G.gone;
  if(id==="visit"){
    G.visits++; G.silent = 0;
    if(G.gone){ if(Math.random()<0.5){ G.gone=false; gLog("sys","문 앞에 연락처 쪽지를 남겼더니 " + G_LINES.back); } else gLog("sys","아무도 없다. 문 앞에 연락처 쪽지를 남겼다."); }
    else {
      gLog("me","직접 찾아가 인사하고 이야기를 나눴다.");
      if(!G.met){ G.met = true; gLog("them", G_LINES.greet[T.id] || "…네."); gLog("sys", "알게 된 사정: " + P.story); }
      G.mood = clamp(G.mood + 10*pr.emo); G.resist = clamp(G.resist - 3*pr.emo);
      if(G.mood >= 55 && !G.hinted){ G.hinted = true; gLog("sys", `속마음 힌트: 대략 ${man0(Math.round(gNeed(P)/10)*10 || 0)} 안팎이면 움직일 것 같다. 지금 조건 기준이라 상황이 바뀌면 달라진다.`); }
    }
  }
  if(id==="msg"){ G.silent = 0; if(G.gone) gLog("sys","답이 없다."); else { gLog("me","문자로 정중하게 이사 일정을 제안했다."); G.mood = clamp(G.mood + 4*pr.emo); G.resist = clamp(G.resist - 2); gLog("them", G.mood>55?"네, 날짜 한번 맞춰 봐요.":"…생각해 볼게요."); } }
  if(id==="notice"){
    G.notices++; const eff = G.notices===1 ? 1 : 0.4;
    gLog("me","내용증명을 보냈다 (인도 요청 · 법적 절차 안내).");
    G.resist = clamp(G.resist - 11*pr.legal*eff); G.mood = clamp(G.mood - 7*pr.emo*eff);
    gLog("them", pr.emo > 1 ? G_LINES.notice.hi : G_LINES.notice.lo);
  }
  if(id==="order"){ G.order = {due: G.week + rnd(2,4)}; gLog("me","법원에 인도명령을 신청했다."); G.resist = clamp(G.resist - 6*pr.legal); G.mood = clamp(G.mood - 4*pr.emo); if(pr.fake && G.proof) G.order.due = G.week + 2; }
  if(id==="suit"){ G.suit = {due: G.week + rnd(15,19)}; gLog("me","인도명령 기한을 넘겨 명도소송을 냈다. 판결까지 오래 걸린다."); }
  if(id==="offer"){
    if(!contact){ gLog("sys","연락이 닿지 않아 제안을 전할 수 없었다."); }
    else {
      const need = gNeed(P);
      gLog("me", amt ? `이사비 ${man0(amt)}을 제안했다.` : "이사비 없이 이사 날짜만 조율하자고 했다.");
      if(amt >= need){ G.deal = {amt, week: G.week + rnd(2,4)}; gLog("them", G_LINES.agree); gLog("sys", `합의! ${G.deal.week}주차에 이사하기로 했다. 합의서를 써 두면 번복을 막을 수 있다.`); }
      else if(amt < need*0.45){ G.mood = clamp(G.mood - 8*pr.emo); gLog("them", G_LINES.insult); }
      else { G.resist = clamp(G.resist - 4); const c = Math.ceil(need*1.08/10)*10; gLog("them", G_LINES.counter(c)); }
    }
  }
  if(id==="contract"){ G.contract = true; gLog("me","이사일·이사비 지급 조건(이사 확인 후 잔금)을 적은 합의서를 함께 썼다."); G.mood = clamp(G.mood + 3); }
  if(id==="lever"){ G.lever = true; gLog("me","'배당금을 받으려면 명도확인서가 필요하고, 이사를 확인한 뒤 써 드린다'고 설명했다."); G.resist = clamp(G.resist - 40); gLog("them","아… 그럼 배당기일 맞춰서 이사할게요."); }
  if(id==="proof"){ G.proof = true; gLog("me","전입 경위와 보증금 이체 기록을 확인했다. 이체 흔적이 없다."); G.resist = clamp(G.resist - 30*pr.legal/1.5); gLog("them","…그건 가족끼리라 현금으로 줬다니까요."); }
  if(id==="lien"){ G.lienDone = true; gLog("me","현장 사진으로 실제 점유가 없다는 걸 기록하고, 공사 시기·금액 증빙을 요구했다."); G.resist = clamp(G.resist - 32); gLog("them","서류야 뭐… 찾아보면 있겠죠."); }
  if(id==="pledge"){ G.pledge = true; gLog("me","점유이전금지가처분을 신청해 집행했다. 이제 사람을 바꿔 치기 어렵다."); }
  if(id==="exec"){ G.exec = {warn: G.week + 2, run: G.week + rnd(5,7), warned:false}; G.fees += 20; gLog("me","강제집행을 신청하고 비용 일부를 예납했다."); G.mood = clamp(G.mood - 10*pr.emo); }
  if(id==="survey"){ G.mapped = true; gLog("me","전입세대 열람을 떼고 밤·주말에도 현장을 확인해 실제로 사는 사람을 전부 파악했다."); gLog("sys", houseAdults(P) ? `함께 사는 사람: ${houseText(P)}. 성인은 모두 인도명령 상대방으로 적어 둔다.` : `함께 사는 사람: ${houseText(P)}. 숨은 성인 점유자는 없어 보인다.`); }
  if(id==="lease"){ G.newTitle = true; G.leaseWeek = G.week + 4; G.mood = clamp(G.mood + 20); G.fees -= 50; gLog("me","'월세 50만원 내시고 한 달만 더 사세요'라고 허락했다."); gLog("them","아이고 감사합니다! 정말 한 달만요."); if(G.order || G.orderOk){ gLog("sys","⚠️ 대금납부 뒤 매수인이 스스로 새 사용관계(점유권원)를 만들어 줬다. 이제 기존 인도명령으로 단순하게 처리하기 어려워질 수 있다(판례 취지)."); } G.order = null; G.orderOk = false; G.exec = null; }
  if(id==="hand_full"){ G.fees += 0; gLog("me","방·베란다·창고까지 다 열어 보고, 남은 물건이 없다는 확인서를 받고, 그 자리에서 도어락 비밀번호를 바꿨다."); G.handover = false; G.over = {win:true, how:G.handHow||"deal"}; return gEnd(P); }
  if(id==="hand_quick"){ gLog("me","열쇠만 받고 '고생하셨어요' 하고 헤어졌다."); G.handover = false; const r = Math.random();
    if(r < 0.25){ gLog("sys","다음 날 가 보니 작은 방에 짐이 가득하다. '동생 물건이라 제가 못 버려요 — 동생은 해외에 있어요.' 남의 물건은 함부로 버릴 수 없어 포기서를 받고 치우는 데 3주와 80만원이 더 들었다."); G.week += 3; G.spent += 3*P.weekly; G.fees += 80; G.over = {win:true, how:"messy"}; return gEnd(P); }
    if(r < 0.45){ gLog("sys","⚠️ MISSION FAILED: RE-OCCUPATION — 인테리어 업자 전화: '사장님, 여기 사람 있는데요?' 전 점유자가 예비 열쇠로 다시 들어왔다. 한번 인도받은 뒤의 새 점유는 기존 인도명령으로 처리되지 않는 게 원칙이라 소송과 형사 고소를 함께 진행해야 했다(+16주, +300만원)."); G.week += 16; G.spent += 16*P.weekly; G.fees += 300; G.over = {win:true, how:"reoccupied"}; return gEnd(P); }
    G.over = {win:true, how:G.handHow||"deal"}; return gEnd(P); }
  if(id==="wait"){ gLog("me","이번 주는 지켜보기로 했다."); G.silent++; }
  if(id!=="visit" && id!=="msg") G.silent++;
  gWeek(P);
}
function gWeek(P){
  const pr = P.p;
  G.week++; G.spent += P.weekly;
  if(G.order && !G.orderOk && G.week >= G.order.due){ G.orderOk = true; G.order = null; G.resist = clamp(G.resist - 14*pr.legal); gLog("sys", G_LINES.order); if(G.gone && Math.random()<0.6){ G.gone=false; gLog("sys", G_LINES.back); } }
  if(G.suit && G.week >= G.suit.due){ G.suit = null; G.orderOk = true; G.resist = clamp(G.resist - 18*pr.legal); gLog("sys","명도소송에서 이겼다. 판결로 강제집행을 할 수 있다."); }
  if(G.exec && !G.exec.warned && G.week >= G.exec.warn){ G.exec.warned = true; G.gone = false; G.resist = clamp(G.resist - 30); gLog("sys", G_LINES.warn);
    const need = gNeed(P);
    if(G.resist < 30 && need <= P.minPay*0.8){ const pay = Math.round(need/10)*10; G.deal = {amt: pay, week: G.week + 1}; G.contract = true; gLog("them", pay ? `…${man0(pay)}만 주세요. 다음 주에 나갈게요.` : "알았어요, 다음 주에 나갈게요."); gLog("sys","계고를 받고 자진해서 나가기로 했다. 집행 신청은 취하한다(예납금 일부만 들었다)."); G.exec = null; }
  }
  if(G.exec && G.exec.warned && G.week >= G.exec.run){ G.fees += P.execCost; gLog("sys", `강제집행을 했다. 집행비·보관비로 ${man0(P.execCost)}이 들었다.`); G.over = {win:true, how:"exec"}; return gEnd(P); }
  if(G.deal && G.week >= G.deal.week){ G.paid += G.deal.amt; gLog("sys", `이삿날이다! 짐이 빠졌고 점유자가 열쇠를 내민다.${G.deal.amt?` 이사비 ${man0(G.deal.amt)}은 인도 확인 뒤 지급한다.`:""} 마지막으로 어떻게 넘겨받을까?`); G.deal = null; G.handover = true; G.handHow = "deal"; gMaybeCard(P); return; }
  if(G.deal && !G.contract && (pr.greed||1) > 1 && Math.random() < 0.35){ gLog("them", G_LINES.flip); gLog("sys","합의서 없이 말로만 한 약속이라 번복됐다."); G.resist = clamp(G.resist + 8); G.deal = null; }
  if(G.newTitle && G.leaseWeek && G.week >= G.leaseWeek){ G.leaseWeek = null; G.resist = clamp(G.resist + 18); gLog("them","생각해 보니 계속 살아야겠어요. 월세 꼬박꼬박 낼게요."); gLog("sys","내가 허락한 사용관계 때문에 인도명령이 막혔다. 이제는 명도소송으로 가야 한다."); }
  const coAdult = houseOf(P).find(h=>h.adult);
  if((pr.couple || coAdult) && !G.mapped && G.exec && G.exec.warned && !G.coupleHit && Math.random() < 0.6){ G.coupleHit = true; G.exec = null; G.orderOk = false; G.fees += 5; gLog("sys",`⚠️ 집행 현장에서 ${coAdult?coAdult.rel:"배우자"}가 '나는 인도명령 받은 적 없다, 나도 여기 사는 사람이다'라고 나섰다. 함께 사는 성인 점유자를 빠뜨렸다 — 그 사람을 상대로도 인도명령을 신청해야 한다(독립 점유인지 점유보조자인지는 사안마다 다르다).`); if(G.week < G_DEADLINE) G.order = {due: G.week + 3}; else gLog("sys","6개월이 지나 명도소송으로 가야 한다."); }
  if(!G.gone && !G.deal && Math.random() < (pr.vanish||0)*0.3){ G.gone = true; gLog("sys", G_LINES.gone); }
  if(!G.pledge && (G.orderOk || G.order) && Math.random() < (pr.transfer||0)*(G.mapped?0.12:0.25)){ gLog("sys", G_LINES.transfer); G.orderOk = false; G.order = null; G.exec = null; G.resist = clamp(G.resist + 10); G.fees += 10; gLog("sys","새 점유자를 상대로 다시 인도명령을 신청해야 한다. 점유이전금지가처분을 했다면 막을 수 있었다."); }
  if(G.silent >= 3){ G.mood = clamp(G.mood - 3); }
  if((G.order || G.suit) && !G.deal) G.resist = clamp(G.resist - 1.5);
  if(G.week >= G_DEADLINE && G.week-1 < G_DEADLINE && !G.orderOk && !G.order){ gLog("sys","⚠️ 대금납부 후 6개월이 지났다. 이제 인도명령은 못 쓰고 명도소송으로 가야 한다."); }
  if(G.week >= G_MAXWEEK){ G.over = {win:false, why:"1년이 지나도록 집을 비우지 못했다"}; return gEnd(P); }
  gMaybeCard(P);
}
function gTotal(){ return G.spent + G.fees + G.paid; }
function gGrade(P){
  if(!G.over.win) return "F";
  const r = gTotal() / Math.max(1, P.par);
  if(r <= 1.0 && G.over.how==="deal") return "S";
  if(G.over.how==="reoccupied") return r <= 1.3 ? "B" : "C";
  if(r <= 1.3) return "A";
  if(r <= 1.7) return "B";
  return "C";
}
function gEnd(P){
  const g = gGrade(P), R = arenaRec(), prev = R.best[P.id];
  G.over.grade = g;
  G.newBadges = gAwardBadges(P);
  const order = "SABCF";
  if(!prev || order.indexOf(g) < order.indexOf(prev.grade) || (g===prev.grade && gTotal() < prev.cost)) R.best[P.id] = {grade:g, cost:Math.round(gTotal()), weeks:G.week};
  R.last = {grade:g, how:(G.over&&G.over.how)||"", pid:P.id};
  save();
}
function gTips(P){
  const T = occType(P.type), tips = [];
  if(!G.used.visit) tips.push("한 번도 직접 찾아가지 않았다. 첫 만남이 관계와 속마음 정보를 연다.");
  if(!G.used.order && !G.used.suit && P.type!=="senior") tips.push("인도명령을 걸지 않았다. 협상 중에도 '보험'으로 먼저 걸어 두는 게 원칙이다.");
  if(G.used.suit) tips.push("6개월 기한을 놓쳐 명도소송으로 갔다. 인도명령은 대금납부 직후에 신청한다.");
  if(G.deal===null && G.log.some(l=>l.t===G_LINES.flip)) tips.push("말로 한 합의가 번복됐다. 합의서에 '이사 확인 후 잔금'을 넣는다.");
  if(P.p.dividend && !G.used.lever) tips.push("배당받는 임차인에겐 명도확인서가 가장 강한 카드다.");
  if(P.p.fake && !G.used.proof) tips.push("가장임차인이 의심되면 보증금 이체 흔적부터 확인한다.");
  if(P.p.lien && !G.used.lien) tips.push("유치권은 실제 점유와 공사대금 증빙이 핵심이다.");
  if(P.p.transfer >= 0.1 && !G.used.pledge) tips.push("사람을 바꿔 칠 위험이 있는 유형은 점유이전금지가처분을 먼저 한다.");
  if(G.over && G.over.how==="exec") tips.push(`강제집행까지 갔다. 집행비 ${man0(P.execCost)}에 기다린 기간의 이자까지 합치면 적당한 이사비 합의보다 비싸기 쉽다.`);
  if(G.newTitle) tips.push("'한 달만 더 살게' 허락이 새 점유권원이 돼 인도명령이 막혔다. 선의도 서면 기한과 한계를 알고 베풀어야 한다.");
  if(G.over && G.over.how==="reoccupied") tips.push("열쇠만 받고 끝내서 재점유를 당했다. 인도 때 내부 전체 확인·잔존물 확인서·도어락 교체는 필수다.");
  if(G.over && G.over.how==="messy") tips.push("남은 짐 확인 없이 열쇠를 받았다. 제3자 물건은 임의로 버릴 수 없어 시간과 돈이 더 든다.");
  if(G.coupleHit) tips.push("함께 사는 성인 점유자를 빠뜨렸다. 전입세대 열람과 현장 확인으로 점유자 전원을 특정한다.");
  tips.push("이 유형의 핵심: " + T.doit[0]);
  return tips.slice(0,5);
}
function meterHTML(label, v, color, note){ return `<div class="ag-m"><div class="ag-mh"><span>${label}</span><b>${Math.round(v)}</b></div><div class="bar"><span style="width:${clamp(v)}%;background:${color}"></span></div>${note?`<div class="note">${note}</div>`:""}</div>`; }
function gameHTML(){
  if(!G){
    const R = arenaRec(); const badges = R.badges||{};
    const stageCards = STAGES.map((id,i)=>{ const P = personaById(id); if(!P) return ""; const open = stageOpen(i), b = R.best[id], T = occType(P.type);
      return `<button type="button" class="panel ag-card ag-stage ${open?"":"locked"}" ${open?`data-gstart="${id}"`:"disabled"}><span class="ag-stno">STAGE ${i+1}</span>${open?avatarHTML(P,52):`<span class="ag-lock">🔒</span>`}<span class="ag-nm">${open?esc(P.name):"???"}</span><span class="note">${open?esc(T.name):"이전 스테이지 B등급 이상 클리어"}</span>${b?`<span class="ag-best g${b.grade}">${"⭐".repeat(STARS[b.grade]||0)||b.grade} · ${man0(b.cost)}</span>`:""}</button>`; }).join("");
    const stars = STAGES.reduce((n,id)=> n + (STARS[(R.best[id]||{}).grade]||0), 0);
    const nextSt = STAGES.find((id,i)=> stageOpen(i) && !R.best[id]) || STAGES.find((id,i)=>stageOpen(i));
    const tbg = typeof vnBgHTML==="function" ? vnBgHTML("bg_villa_night") : "";
    const title = `<div class="vn-title">${tbg}<div><h3>🔑 명도왕</h3><p>열쇠를 받을 때까지 — 1턴 = 1주, 불법 없이 빨리, 적게</p><div class="tt-btns">${nextSt?`<button type="button" class="btn pri" data-gstart="${nextSt}">▶ ${R.best[nextSt]?"다시 하기":"새 게임"}</button>`:""}<button type="button" class="btn" data-atab="story">📚 스토리 모드</button></div><span class="tt-press">아래에서 인물을 골라도 돼요 ▼</span></div></div>`;
    return title + `<p class="lead">점유자를 골라 명도를 끝내 보세요. 1턴 = 1주, 버티는 동안에도 이자·관리비가 나가요. 중간중간 <b>🃏 이벤트 카드</b>가 튀어나오고, 이삿날엔 <b>인도 확인</b>까지 해야 진짜 클리어! <b>적은 비용으로 빨리, 불법 없이</b> 끝낼수록 ⭐이 늘어요.</p>
    <div class="panel ag-prog"><span>⭐ ${stars} / ${STAGES.length*3}</span><span>🎖️ 뱃지 ${Object.keys(badges).length} / ${BADGES.length}</span></div>
    <details class="ag-brief" style="margin:6px 0 12px"><summary>🎖️ 뱃지 도감</summary><div class="ag-badgewall">${BADGES.map(b=>`<span class="ag-badge ${badges[b[0]]?"":"off"}">${b[1]}<small>${b[2]}</small></span>`).join("")}</div></details>
    <h3 class="ag-role">🗺️ 스테이지 모드</h3><div class="ag-grid">${stageCards}</div>
    <h3 class="ag-role">🎲 자유 플레이</h3><div class="ag-grid">${allPersonas().filter(P=>roleOf(P)==="occupant" && !STAGES.includes(P.id)).map(P=>{ const b = R.best[P.id], T = occType(P.type); return `<button type="button" class="panel ag-card" data-gstart="${P.id}">${avatarHTML(P,52)}<span class="ag-nm">${esc(P.name)}</span><span class="note">${esc(T.name)}</span>${b?`<span class="ag-best g${b.grade}">최고 ${b.grade}</span>`:""}</button>`; }).join("")}
    <button type="button" class="panel ag-card ag-new" data-gnew><span class="ag-emo">🎲</span><span class="ag-nm">무작위 점유자</span><span class="note">유형·가족·사정이 랜덤으로 섞인 가상 인물</span></button></div>`;
  }
  const P = personaById(G.pid), T = occType(P.type);
  const st = [];
  st.push(G.orderOk ? `<span class="chip on">⚖️ 집행권원 있음</span>` : G.order ? `<span class="chip">⚖️ 인도명령 심리 중 (${G.order.due}주차 결정)</span>` : G.suit ? `<span class="chip">🏛️ 명도소송 중 (${G.suit.due}주차 판결)</span>` : `<span class="chip warn">⚖️ 집행권원 없음</span>`);
  if(G.pledge) st.push(`<span class="chip on">🔒 점유이전금지</span>`);
  if(G.deal) st.push(`<span class="chip on">🤝 ${G.deal.week}주차 이사 · ${man0(G.deal.amt)}${G.contract?" · 합의서":" · 구두"}</span>`);
  if(G.exec) st.push(`<span class="chip">🚚 강제집행 진행 (${G.exec.warned?"계고 완료":"계고 "+G.exec.warn+"주차"})</span>`);
  if(G.gone) st.push(`<span class="chip warn">📵 연락두절</span>`);
  if(G.handover) st.unshift(`<span class="chip on" style="font-weight:700">🔑 이삿날 — 인도 확인 단계</span>`);
  const dl = G_DEADLINE - G.week;
  if(!G.orderOk && !G.order && !G.suit && dl > 0 && dl <= 6) st.unshift(`<span class="chip warn" style="font-weight:700">⏰ 인도명령 신청 D-${dl}주</span>`);
  if(G.newTitle) st.push(`<span class="chip warn">❤️ 내가 허락한 사용관계</span>`);
  if(G.mapped) st.push(`<span class="chip on">🗺️ 점유자 파악 완료</span>`);
  const head = `<div class="panel ag-top"><div class="ag-who">${avatarHTML(P,60)}<div><b>${esc(P.name)}</b><div class="note">${esc(T.name)} · ${esc(P.legal)}</div><div class="ag-house">🏠 ${esc(houseText(P))}</div></div></div>
   <div class="ag-meters">${meterHTML("관계", G.mood, "var(--ok)")}${meterHTML("버티기", G.resist, "var(--seal)")}
   <div class="ag-m"><div class="ag-mh"><span>경과</span><b>${G.week}주</b></div><div class="note">${dl>0?`인도명령 기한 ${dl}주 남음`:"인도명령 기한 지남"}</div></div>
   <div class="ag-m"><div class="ag-mh"><span>누적 비용</span><b>${man0(Math.round(gTotal()))}</b></div><div class="note">이자 ${man0(G.spent)} · 절차 ${man0(G.fees)}${G.paid?` · 이사비 ${man0(G.paid)}`:""}</div></div></div>
   <div class="ag-chips">${st.join("")}</div>${G.fxHTML||""}</div>`;
  const log = `<div class="panel ag-log" id="gLog">${G.log.slice(-40).map(l => l.who==="sys" ? `<div class="ag-sys">${esc(l.t)}</div>` : (l.who==="me" ? `<div class="cmsg me"><span class="cbub">${esc(l.t)}</span></div>` : `<div class="cmsg av-row">${avatarHTML(P,30)}<span class="cbub">${esc(l.t)}</span></div>`)).join("")}</div>`;
  if(G.over){
    const g = G.over.grade;
    const nb = (G.newBadges||[]).map(id=>BADGES.find(b=>b[0]===id)).filter(Boolean);
    return (G.over.win?confettiHTML():"") + vnStage(P) + `<details class="panel vn-more"><summary>📊 자세한 상태 · 지난 대화</summary>${head}${log}</details>` + `${G.over.win&&STARS[g]?`<div class="ag-stars">${"⭐".repeat(STARS[g])}${"☆".repeat(3-STARS[g])}</div>`:""}${nb.length?`<div class="panel ag-badges-new"><b>🎖️ 새 뱃지!</b>${nb.map(b=>`<span class="ag-badge">${b[1]}<small>${b[2]}</small></span>`).join("")}</div>`:""}<div class="panel ag-end"><div class="ag-grade g${g}">${g}</div><div><b style="font-size:18px">${G.over.win ? ({exec:"강제집행으로 명도 완료",reoccupied:"재점유 끝에 겨우 명도",messy:"잔존물 정리까지 겨우 명도"}[G.over.how]||"합의로 명도 완료") : "명도 실패"}</b>
      <div class="note">${G.over.win?`${G.week}주 · 총 ${man0(Math.round(gTotal()))} (이 인물 목표 ${man0(P.par)} 이하면 S)`:esc(G.over.why)}</div></div></div>
      <div class="panel" style="padding:14px 16px;margin-top:10px"><b>돌아보기</b><ul class="ag-tips">${gTips(P).map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><button type="button" class="btn pri" data-gstart="${P.id}">같은 인물 다시</button><button type="button" class="btn" data-gquit>다른 인물 고르기</button>${sampleFn?`<button type="button" class="btn" data-chatwith="${P.id}">이 인물과 채팅해 보기</button>`:""}</div>`;
  }
  const acts = G_ACTIONS.filter(a => gAvail(a, P)).map(a => a.id==="offer"
    ? `<div class="ag-act ag-offer"><span class="ag-ai">${a.ic}</span><div><b>${a.t}</b><div class="note">${G.gone?"연락두절이라 전달이 안 된다":a.d}</div><div class="ag-amts">${G_OFFERS.map(v=>`<button type="button" class="chip" data-goffer="${v}" ${G.gone?"disabled":""}>${v?man0(v):"0원(날짜만)"}</button>`).join("")}</div></div></div>`
    : `<button type="button" class="ag-act ${a.bad?"ag-bad":""}" data-gact="${a.id}"><span class="ag-ai">${a.ic}</span><span><b>${a.t}</b>${a.cost?` <small class="note">${man0(a.cost)}</small>`:""}<span class="note" style="display:block">${a.d}</span></span></button>`).join("");
  const more = `<details class="panel vn-more"><summary>📊 자세한 상태 · 지난 대화</summary>${head}${log}</details>`;
  return vnStage(P) + vnFxPanel() + `<div class="ag-chips vn-chips">${st.join("")}</div>${G.fxHTML||""}` + (G.card ? cardHTML(P) : `<h3 class="vn-q">이번 주(${G.week+1}주차) 무엇을 할까?</h3><div class="ag-acts vn-acts">${acts}</div>`) + more + `<div style="margin-top:12px"><button type="button" class="btn" data-gquit>그만두기</button></div>`;
}

/* ============================== 점유자 채팅 (Claude) ============================== */
let sampleFn;            /* undefined: 확인 중, null: 사용 불가 */
let CH = {pid:null, busy:false, ctl:null, live:"", err:"", review:null, reviewBusy:false};
(async () => {
  await null;
  try{ sampleFn = (window.claude && claude.use) ? await claude.use("sample") : null; }catch(e){ sampleFn = null; }
  try{ if(sampleFn && sampleFn.limits){ const lim = await sampleFn.limits(); CH.imgOk = !!(lim && lim.images); } }catch(e){ CH.imgOk = false; }
  if(page==="arena") renderArena();
})();
function chatRec(pid){ const R = arenaRec(); if(!R.chats[pid]) R.chats[pid] = {turns:[], mood:null, status:"진행중", coach:[]}; return R.chats[pid]; }
const ROLE_SCENE = {
 occupant:{me:"매수인", them:"점유자", intro:"한국 부동산 경매의 '명도' 협상 연습", user:"이 집을 경매로 낙찰받아 대금까지 낸 매수인", deal:"합의가 되면 이사 날짜를 분명히 말한다",
  law:"인도명령은 대금납부 후 6개월 안에 신청, 대항력 없는 임차인·채무자는 인도명령 대상, 이사비는 법적 의무가 아님(협상 상한은 강제집행 비용+기간 이자), 단전·단수·무단 진입·짐 처분은 불법 자력구제, 배당받는 임차인은 명도확인서(인감증명 첨부)가 있어야 배당금을 받으며 명도확인서는 이사 확인 후 발급, 합의는 이사일·위약·지급조건을 적은 합의서로 남김, 임차권등기 뒤 들어온 임차인은 최우선변제 대상이 아님, 선불 월세·깔세는 돈 받은 임대인에게 청구할 문제, 취약한 점유자에게는 행정복지센터(주거급여·긴급주거·공공임대)·정신건강복지센터·가족 연계를 권함. 상대가 위협적이면 혼자 방문하지 말고 녹음하며, 위협이 실제로 있으면 경찰에 신고하라고 짚어 준다",
  hardRule:"무례, 협박, 불법 암시(단전·단수, 문 따고 들어가기, 짐 빼기)에는 크게 반발한다"},
 broker:{me:"매도인", them:"중개사", intro:"낙찰받아 수리한 빌라를 파는 매도인과 공인중개사의 협상 연습", user:"경매로 낙찰받아 수리한 빌라를 팔려는 매도인(집주인)", deal:"합의가 되면 맡기는 조건(가격·광고·보수)을 정리해서 말한다",
  law:"중개보수는 거래금액별 법정 상한 요율 이내에서 협의하며 상한을 넘겨 받으면 불법, 법정 보수 외 '컨설팅비' 명목 추가 수수도 문제될 수 있음, 실제보다 높거나 낮게 쓰는 계약서·거래신고(업계약·다운계약)는 불법, 전속중개계약은 한 곳에 독점으로 맡기는 대신 중개사의 정보공개·보고 의무가 생김(장단점 비교), 가격 조정은 동네 거래량·경쟁 매물·인근 아파트 대비 가격으로 판단, 가격을 깎을 땐 잔금일·옵션 같은 조건과 교환, 약속은 문자·서면으로 남김",
  hardRule:"무시하거나 막무가내로 요구하면 비협조적으로 변한다"},
 contractor:{me:"집주인", them:"인테리어 업자", intro:"낙찰받은 빌라 수리를 맡긴 집주인과 인테리어 업자의 협상 연습", user:"경매로 낙찰받은 빌라를 수리해 팔려는 집주인", deal:"합의가 되면 금액·범위·일정을 정리해서 말한다",
  law:"견적은 항목·자재 등급·수량·단가를 명시, 계약서에 공정표와 지급 조건(계약금·중도금·잔금, 잔금은 완공 확인 후), 추가 공사는 현장 사진·범위 확인 후 서면 합의, 하자보수 기간 명시, 누수 같은 숨은 하자는 원인·범위를 확인(아래층 피해 가능성), 공사 기간이 늘면 대출이자·관리비 등 보유비용이 늘어남, 수리 범위는 상태별 매도가 차이(험한 집·기본·올수리)와 공사비를 비교해 결정",
  hardRule:"근거 없이 깎거나 무시하면 공사 품질·일정으로 은근히 되갚으려 한다"},
 buyer:{me:"매도인", them:"매수 희망자", intro:"낙찰받아 수리한 빌라를 파는 매도인과 매수 희망자의 가격 협상 연습", user:"경매로 낙찰받아 수리한 빌라를 팔려는 매도인", deal:"합의가 되면 가격과 조건(잔금일·수리·특약)을 정리해서 말한다",
  law:"가격을 깎아 줄 땐 잔금일·계약금 비율·수리 같은 조건과 교환, 하자 특약은 범위와 기간을 숫자로 명시, 계약금은 보통 매매가의 10% 안팎(해약금 성격), 중개사를 통해 계약서와 거래신고를 정확히 함, 인근 아파트·빌라 실거래와 경쟁 매물로 가격 근거를 제시",
  hardRule:"매도인이 거만하거나 근거 없이 버티면 다른 매물을 보러 가겠다고 한다"}
};
function chatRules(P){
  const T = occType(P.type), R = ROLE_SCENE[roleOf(P)];
  return `너는 ${R.intro}용 롤플레이에서 '${R.them}' 역할을 맡는다. 대화 상대(사용자)는 ${R.user}이다. 모든 인물과 사건은 가상이다.

[너의 캐릭터]
이름: ${P.name}
처지: ${P.who}
유형: ${T.name} — ${T.line}
사정: ${P.story}
법적 위치(캐릭터 본인은 정확히 모를 수 있음): ${P.legal}
말투: ${P.style}
${roleOf(P)==="occupant"?`함께 사는 사람: ${houseText(P)}
`:""}숨은 목표와 마지노선(절대 먼저 털어놓지 말 것): ${P.goal}
마음이 누그러지는 것: ${P.soft}
크게 반발하는 것: ${P.hard}
${P.mission?`사용자의 미션(너는 모르는 척한다): ${P.mission}\n`:""}대화 시작 때 네가 이미 한 첫마디: "${P.opener}"

[연기 규칙]
1. 오직 이 캐릭터로만 말한다. 카톡·대면 대화처럼 1~3문장, 구어체, 캐릭터 말투. 설명·해설·괄호 속 속마음은 쓰지 않는다(행동 묘사는 짧게 괄호 한 번까지만).
2. 쉽게 굴복하지 않는다. ${R.me}이 공감·구체적 제안·근거·담담한 원칙을 잘 섞을 때만 조금씩 누그러진다. ${R.hardRule}.
3. 마지노선보다 좋은 조건이 나오면 받아들일 수 있다. ${R.deal}.
4. 캐릭터는 법을 잘못 알고 우길 수 있다(그럴듯한 오해는 괜찮다). 하지만 실존 인물, 실제 연락처, 실제 업체명, 실제 사건번호는 만들지 않는다.
7. 실제 메신저처럼 쓴다: 한 번에 1~3개의 짧은 말풍선을 보낸다(줄바꿈 = 말풍선 하나). "ㅠㅠ", "...", "네?" 같은 짧은 반응도 괜찮다. 사진을 보여 주는 상황이면 따로 한 줄에 [사진: 찍힌 내용 짧게] 형식으로 쓴다(예: [사진: 곰팡이 핀 욕실 천장], [사진: 이삿짐센터 견적서]). 필요하면 상대에게 사진을 요청한다(부동산은 집 내부·수리 사진, 매수자는 욕실·창틀 사진, 업자는 현장 사진). 반려동물이 있으면 자연스럽게 등장시킨다(짖는 소리, 고양이 이야기 등). 사용자가 보낸 사진이 있으면 보고 반응한다.
8. 외국인 캐릭터는 그 사람의 한국어 수준대로 쓰되(서툰 존댓말, 영어·모국어 단어 한두 개), 과장하거나 희화화하지 않는다. 문화적 고정관념을 쓰지 않는다.
6. 함께 사는 사람이 있으면 가끔(3~4번에 한 번 정도) 옆에서 끼어들 수 있다. 그럴 땐 <reply> 안에서 줄을 바꿔 "(아내) ..."처럼 괄호로 누가 말하는지 표시한다. 가족 사정(아이 학교, 노모 병원 등)은 협상 카드로 자연스럽게 쓴다.
5. 욕설이나 혐오 표현은 쓰지 않는다. 험하게 굴더라도 폭력·신체 위협을 구체적으로 말하지는 않는다. 정신건강 어려움이 있는 캐릭터는 조롱거리가 아니라 존중받아야 할 사람으로, 과장 없이 현실적으로 연기한다.

[코치 규칙]
<coach>에는 ${R.me}의 '방금 발언'만 평가해 1~2문장으로 쓴다. 잘한 점과 아쉬운 점, 그리고 더 나은 한 마디를 제안한다. 법적 사실은 정확히 쓴다: ${R.law}.

[출력 형식 — 반드시 이 태그 그대로, 다른 글은 쓰지 않는다]
<reply>${R.them}의 대사</reply>
<mood>0~100 사이 숫자 하나 (상대의 현재 협조도)</mood>
<status>진행중 또는 합의 또는 결렬</status>
<coach>코치 한마디</coach>`;
}
function chatParse(txt){
  const g = tag => { const m = txt.match(new RegExp("<"+tag+">([\\s\\S]*?)(?:</"+tag+">|$)")); return m ? m[1].trim() : ""; };
  let reply = g("reply"); if(!reply && !/<reply>/.test(txt)) reply = txt.replace(/<[^>]+>/g,"").trim();
  const mood = parseInt(g("mood"),10);
  const st = g("status");
  return {reply, mood: isNaN(mood)?null:clamp(mood), status: /합의/.test(st)?"합의":/결렬/.test(st)?"결렬":"진행중", coach: g("coach")};
}
function chatErrText(code){
  return ({not_granted:"Claude 사용을 허용하지 않아서 채팅을 쓸 수 없어요.", sampling_disabled:"이 계정에서는 Claude 호출을 쓸 수 없어요.", rate_limited:"요청이 너무 잦아요. 잠시 뒤 다시 보내 주세요.", session_expired:"로그인이 만료됐어요. 다시 로그인해 주세요.", refused:"이 문장에는 답할 수 없대요. 표현을 바꿔 보세요.", prompt_too_large:"대화가 너무 길어요. '새로 시작'을 눌러 주세요."})[code] || "잠깐 연결이 끊겼어요. 다시 보내 주세요.";
}
const chatClock = () => { const d = new Date(); const h = d.getHours(), m = String(d.getMinutes()).padStart(2,"0"); return `${h<12?"오전":"오후"} ${((h+11)%12)+1}:${m}`; };
async function chatSend(text){
  const P = personaById(CH.pid); if(!P || CH.busy || !sampleFn) return;
  const C = chatRec(P.id);
  text = text.trim(); const img = CH.img; if(!text && !img) return;
  if(img && !text) text = "(사진을 보냈습니다)";
  C.turns.push({r:"me", c:(img?"[사진: 내가 보낸 사진]\n":"") + text, ts:chatClock(), img: img ? img.name || "photo" : undefined});
  const sendImg = img ? img.file : null; CH.img = null;
  CH.busy = true; CH.live = ""; CH.err = ""; CH.ctl = new AbortController();
  renderArena(); scrollChat();
  const hist = C.turns.slice(-24);
  while(hist.length && hist[0].r!=="me") hist.shift();
  const input = [{role:"user", content: chatRules(P)}].concat(hist.map(t => ({role: t.r==="me"?"user":"assistant", content: t.r==="me" ? t.c : t.raw || `<reply>${t.c}</reply>`})));
  try{
    if(sendImg) input[input.length-1] = {role:"user", content: input[input.length-1].content + "\n(첨부한 사진을 보고 캐릭터로서 자연스럽게 반응해라)"};
    const res = await sampleFn(input, Object.assign({cache:false, modelTier:"quick", signal:CH.ctl.signal, onText:({text}) => { CH.live = chatParse(text).reply; const el = document.getElementById("chLive"); if(el){ el.classList.remove("ctyping"); el.textContent = CH.live || "…"; } scrollChat(); }}, sendImg ? {images: sendImg} : {}));
    const o = chatParse(res.text);
    C.turns.push({r:"them", c:o.reply || "…", raw:res.text, ts:chatClock()});
    if(o.mood!==null) C.mood = o.mood;
    C.status = o.status;
    if(o.coach) C.coach.push({i:C.turns.length-2, t:o.coach});
    if(C.turns.length > 40) C.turns = C.turns.slice(-40);
    if(C.coach.length > 20) C.coach = C.coach.slice(-20);
  }catch(e){
    const code = e && e.code;
    if(code==="cancelled"){ C.turns.pop(); }
    else if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(code)){ sampleFn = null; C.turns.pop(); }
    else if(code==="images_unavailable" || code==="image_rejected"){ CH.imgOk = code==="image_rejected"; CH.err = code==="image_rejected" ? "이 사진은 보낼 수 없어요. 다른 사진으로 해 보세요." : "이 화면에서는 사진을 보낼 수 없어요."; C.turns.pop(); }
    else { CH.err = chatErrText(code); }
  }
  CH.busy = false; CH.ctl = null; CH.live = "";
  save(); renderArena(); scrollChat();
}
async function chatReview(){
  const P = personaById(CH.pid); if(!P || !sampleFn || CH.reviewBusy) return;
  const C = chatRec(P.id);
  if(C.turns.length < 2) return;
  CH.reviewBusy = true; CH.review = ""; renderArena();
  const tr = `(${ROLE_SCENE[roleOf(P)].them} 첫마디) ${P.opener}\n` + C.turns.map(t => (t.r==="me"?ROLE_SCENE[roleOf(P)].me+": ":ROLE_SCENE[roleOf(P)].them+": ") + t.c).join("\n");
  const RS = ROLE_SCENE[roleOf(P)];
  const prompt = `너는 한국 부동산 경매 투자자에게 협상을 가르치는 코치다. 아래는 사용자(${RS.me})가 가상의 ${RS.them}와 연습한 대화다.
상대 설정: ${P.name}, ${P.who}. ${P.story} 법적 위치: ${P.legal}. 숨은 마지노선: ${P.goal}

대화:
${tr.slice(-12000)}

아래 형식으로 한국어로 짧고 구체적으로 총평해라. 법적 사실은 정확히: ${RS.law}.
■ 점수: 100점 만점 중 N점 (한 줄 이유)
■ 잘한 점: 2개
■ 고칠 점: 2~3개 (실제 발언을 인용하고 더 나은 표현 제시)
■ 놓친 카드: 이 상대에게 써야 했는데 안 쓴 것${P.mission?`\n■ 미션 달성 여부: ${P.mission}`:""}
■ 다음에 이렇게 시작해 보세요: 첫 메시지 예시 한 개`;
  try{ const r = await sampleFn(prompt, {modelTier:"default", onText:({text}) => { CH.review = text; const el = document.getElementById("chReview"); if(el) el.textContent = text; }}); CH.review = r.text; }
  catch(e){ CH.review = null; CH.err = chatErrText(e && e.code); if(e && e.code==="not_granted") sampleFn = null; }
  CH.reviewBusy = false; renderArena();
}
function scrollChat(){ const b = document.getElementById("chBox"); if(b) b.scrollTop = b.scrollHeight; }
function bubblesHTML(text){
  return String(text).split(/\n+/).map(x=>x.trim()).filter(Boolean).map(line => {
    const m = line.match(/^\[(?:📷\s*)?사진\s*[:：]\s*(.+?)\]$/);
    if(m) return `<span class="cbub cphoto"><span class="cph-img">📷</span><span class="cph-cap">${esc(m[1])}</span></span>`;
    return `<span class="cbub">${esc(line)}</span>`;
  }).join("");
}
function chatHTML(){
  if(sampleFn === undefined) return `<p class="lead">Claude 연결을 확인하는 중이에요…</p>`;
  if(sampleFn === null) return `<div class="panel" style="padding:18px"><b>이 화면에서는 점유자 채팅을 쓸 수 없어요.</b><p class="note" style="margin-top:6px">Claude 앱이나 claude.ai에서 이 페이지를 열면 됩니다. 채팅을 처음 보낼 때 Claude 사용 허락을 한 번 물어봐요(내 Claude 사용량이 쓰여요). 도감과 명도왕 게임은 지금도 쓸 수 있어요.</p></div>`;
  if(!CH.pid){
    return `<p class="lead">명도할 점유자, 매도를 맡길 부동산 사장님, 인테리어 업자, 매수 희망자와 실제처럼 문자로 협상해 보세요. 한 마디마다 <b>코치가 한 줄 피드백</b>을 주고, 끝나면 <b>총평</b>을 받을 수 있어요. 모든 인물은 가상이에요.</p>
    ${Object.keys(ROLE_LABEL).map(role => `<h3 class="ag-role">${ROLE_LABEL[role]}</h3><div class="ag-grid">${chatOrder(allPersonas().filter(P=>roleOf(P)===role), role).map(P=>{ const C = arenaRec().chats[P.id]; const T = occType(P.type); return `<button type="button" class="panel ag-card" data-chatwith="${P.id}">${role==="occupant"?chatDiffHTML(P):""}${avatarHTML(P,52)}<span class="ag-nm">${esc(P.name)}</span><span class="note">${esc(role==="occupant"?T.name:P.who)}</span>${C&&C.turns.length?`<span class="ag-best">대화 ${C.turns.length}개 · ${esc(C.status)}</span>`:""}</button>`; }).join("")}${role==="occupant"?`<button type="button" class="panel ag-card ag-new" data-cnew><span class="ag-emo">🎲</span><span class="ag-nm">새 점유자 만들기</span><span class="note">무작위 유형·사정</span></button>`:""}</div>`).join("")}`;
  }
  const P = personaById(CH.pid), T = occType(P.type), C = chatRec(P.id);
  const coachAt = {}; C.coach.forEach(k => coachAt[k.i] = k.t);
  const avs = avatarHTML(P,30);
  const lastMe = C.turns.map(t=>t.r).lastIndexOf("me"), lastThem = C.turns.map(t=>t.r).lastIndexOf("them");
  const msgs = [`<div class="cmsg av-row">${avs}<div class="cstack"><span class="cname">${esc(P.name.replace(/\s*\(.*\)/,""))}</span>${bubblesHTML(P.opener)}</div></div>`].concat(C.turns.map((t,i) => t.r==="me"
    ? `<div class="cmsg me"><div class="cstack">${bubblesHTML(t.c)}<span class="cmeta">${i===lastMe && (CH.busy || lastThem < lastMe) ? '<b class="cread">1</b> ' : ""}${t.ts||""}</span></div></div>${coachAt[i]?`<div class="ag-coach">🧑‍🏫 ${esc(coachAt[i])}</div>`:""}`
    : `<div class="cmsg av-row">${avs}<div class="cstack">${bubblesHTML(t.c)}<span class="cmeta">${t.ts||""}</span></div></div>${coachAt[i]?`<div class="ag-coach">🧑‍🏫 ${esc(coachAt[i])}</div>`:""}`));
  if(CH.busy) msgs.push(`<div class="cmsg av-row">${avs}<div class="cstack">${CH.live?`<span class="cbub" id="chLive">${esc(CH.live)}</span>`:`<span class="cbub ctyping" id="chLive"><i></i><i></i><i></i></span>`}</div></div>`);
  const mood = C.mood===null ? null : C.mood;
  return `<div class="panel ag-top"><div class="ag-who">${avatarHTML(P,60)}<div><b>${esc(P.name)}</b><div class="note">${esc(T.name)} · ${esc(P.legal)}</div>${roleOf(P)==="occupant"?`<div class="ag-house">🏠 ${esc(houseText(P))}</div>`:""}</div></div>
    ${mood!==null?meterHTML("협조도", mood, mood>=60?"var(--ok)":mood>=35?"var(--warn)":"var(--seal)"):""}
    ${P.mission?`<div class="ag-mission">🎯 미션 — ${esc(P.mission)}</div>`:""}
    <details class="ag-brief"><summary>🎨 캐릭터 얼굴 바꾸기</summary>${avatarEditHTML(P)}</details>
    <details class="ag-brief"><summary>상황 브리핑</summary><p>${esc(P.story)}</p><p class="note">유형 공략: ${esc(T.doit.join(" · "))}</p></details>
    ${C.status!=="진행중"?`<div class="chip ${C.status==="합의"?"on":"warn"}" style="margin-top:8px">${C.status==="합의"?"🤝 합의 성공!":"💥 협상 결렬"}</div>`:""}</div>
    <div class="panel ag-chat" id="chBox">${msgs.join("")}</div>
    ${CH.img?`<div class="ag-imgpend">📷 ${esc(CH.img.name)} 첨부됨 — 문자와 함께 보내져요 <button type="button" class="linkbtn" data-cimgx>빼기</button></div>`:""}
    ${CH.err?`<p class="note" style="color:var(--seal);margin:6px 2px">${esc(CH.err)}</p>`:""}
    <form class="ag-send" id="chForm">${CH.imgOk?`<label class="btn ag-clip" title="사진 보내기">📷<input type="file" accept="image/*" id="chImg" hidden ${CH.busy?"disabled":""}></label>`:""}<textarea id="chIn" rows="2" maxlength="400" placeholder="${({occupant:"매수인",broker:"매도인",contractor:"집주인",buyer:"매도인"})[roleOf(P)]}으로서 보낼 문자를 써 보세요" ${CH.busy?"disabled":""}></textarea>${CH.busy?`<button type="button" class="btn" data-cstop>멈추기</button>`:`<button type="submit" class="btn pri">보내기</button>`}</form>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="btn" data-creview ${C.turns.length<2||CH.reviewBusy?"disabled":""}>${CH.reviewBusy?"총평 쓰는 중…":"🧑‍🏫 코치 총평 받기"}</button><button type="button" class="btn" data-creset>새로 시작</button><button type="button" class="btn" data-cback>다른 인물</button></div>
    ${CH.review!==null?`<div class="panel ag-review"><b>코치 총평</b><div id="chReview">${esc(CH.review||"생각하는 중… (10~40초)")}</div></div>`:""}`;
}

/* 문자 협상 목록 — 명도왕 단계(STAGES) 순서 = 쉬운 순. 단계 밖 인물(직접 만든 점유자 등)은 유형 난이도 순으로 뒤에. */
function chatStageIdx(P){ return typeof STAGES!=="undefined" ? STAGES.indexOf(P.id) : -1; }
function chatStars(P){ const i = chatStageIdx(P); if(i < 0) return Math.max(1, Math.min(3, occType(P.type).lv || 2)); return 1 + Math.min(2, Math.floor(i * 3 / STAGES.length)); }
function chatOrder(list, role){
  if(role !== "occupant") return list;
  const key = P => { const i = chatStageIdx(P); return i >= 0 ? i : 1000 + chatStars(P) * 10; };
  return list.map((P,n)=>[P,n]).sort((x,y)=> key(x[0]) - key(y[0]) || x[1] - y[1]).map(x=>x[0]);
}
function chatDiffHTML(P){ const i = chatStageIdx(P), n = chatStars(P);
  return `<span class="ag-diff d${n}" title="난이도 ${n}/3">${i >= 0 ? `${i+1}단계 · ` : ""}${"★".repeat(n)}<i>${"★".repeat(3-n)}</i></span>`; }

/* ============================== 도감 ============================== */
function dexHTML(){
  return `<p class="lead">케이스들에서 되풀이되는 점유자 유형을 모았어요. 먼저 <b>법적 위치</b>를 확인하고(인도명령 대상인지, 배당을 받는지), 그다음 <b>속마음</b>을 읽는 게 명도의 순서예요.</p>
  <div class="ag-dex">${OCC_TYPES.map(T => {
    const cs = (T.cases||[]).map(id => (typeof CASES!=="undefined" ? CASES.find(c=>c.id===id) : null)).filter(Boolean);
    const persona = PERSONAS.find(p=>p.type===T.id);
    return `<details class="panel ag-t"><summary>${persona?avatarHTML(persona,48):`<span class="ag-emo">${T.emoji}</span>`}<span><b>${esc(T.name)}</b><span class="note" style="display:block">${esc(T.line)}</span></span><span class="ag-lv">${"★".repeat(T.lv)}</span></summary>
    <div class="ag-tb">
      <p><span class="ag-k">법적 위치</span>${esc(T.who)} — ${esc(T.law)}</p>
      <div class="ag-cols"><div><span class="ag-k">이런 신호가 보이면</span><ul>${T.signs.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>
      <div><span class="ag-k">속마음</span><p>${esc(T.inner)}</p></div></div>
      <div class="ag-cols"><div><span class="ag-k ok">잘 먹히는 것</span><ul>${T.doit.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>
      <div><span class="ag-k bad">역효과</span><ul>${T.dont.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">
        ${persona?`<button type="button" class="btn pri" data-gstart="${persona.id}">🎮 이 유형으로 게임</button>`:""}
        <button type="button" class="btn" data-gtype="${T.id}">🎲 이 유형 무작위 인물</button>
        ${persona?`<button type="button" class="btn" data-chatwith="${persona.id}">💬 이 유형과 채팅</button>`:""}
      </div>
      ${cs.length?`<p class="note" style="margin-top:10px">관련 케이스: ${cs.map(c=>`<button type="button" class="linkbtn" data-opencase="${c.id}">${esc(c.title)}</button>`).join(" · ")}</p>`:""}
    </div></details>`; }).join("")}</div>
  <h3 class="ag-role" style="margin-top:18px">매도·인테리어 상대</h3>
  <div class="ag-grid">${PERSONAS.filter(P=>roleOf(P)!=="occupant").map(P=>`<button type="button" class="panel ag-card" data-chatwith="${P.id}">${avatarHTML(P,48)}<span class="ag-nm">${esc(P.name)}</span><span class="note">${esc(occType(P.type).name)} · 공략: ${esc(occType(P.type).doit[0])}</span></button>`).join("")}</div>
  <div class="panel" style="padding:14px 16px;margin-top:14px"><b>공통 원칙 5가지</b><ol class="ag-tips">
    <li>낙찰·대금납부 직후 인도명령부터 건다 — 협상은 그다음이어도 된다.</li>
    <li>이사비는 법적 의무가 아니다. 상한선은 "강제집행 비용 + 그동안의 이자"다.</li>
    <li>날짜를 먼저, 돈은 날짜를 당기는 도구로.</li>
    <li>합의는 합의서로, 잔금·명도확인서는 이사 확인 뒤에.</li>
    <li>단전·단수·문 따기·짐 처분은 절대 금지(자력구제는 불법).</li></ol></div>`;
}

/* ============================== 페이지 ============================== */
let arenaTab = "dex";
function renderArena(){
  if(page!=="arena") return;
  const tabs = `<div class="seg rtabs" role="tablist" aria-label="명도 메뉴" style="margin-bottom:14px"><button type="button" data-atab="dex" aria-pressed="${arenaTab==="dex"}">📖 점유자 도감</button><button type="button" data-atab="game" aria-pressed="${arenaTab==="game"}">🎮 명도왕 게임</button><button type="button" data-atab="king" aria-pressed="${arenaTab==="king"}">🏆 경매왕</button><button type="button" data-atab="chat" aria-pressed="${arenaTab==="chat"}">💬 AI 협상 채팅</button><button type="button" data-atab="sell" aria-pressed="${arenaTab==="sell"}">🏷️ 매도 게임</button><button type="button" data-atab="guess" aria-pressed="${arenaTab==="guess"}">🎯 시세 맞히기</button><button type="button" data-atab="story" aria-pressed="${arenaTab==="story"}">📚 스토리</button><button type="button" data-atab="art" aria-pressed="${arenaTab==="art"}">🎨 그림</button></div>`;
  const body = arenaTab==="dex" ? dexHTML() : arenaTab==="game" ? gameHTML() : arenaTab==="sell" ? sellHTML() : arenaTab==="guess" ? guessHTML() : arenaTab==="art" ? artHTML() : arenaTab==="story" ? storyHTML() : arenaTab==="king" ? kingHTML() : chatHTML();
  const keep = document.getElementById("chIn"); const draft = keep ? keep.value : "";
  $("#main").innerHTML = `<section class="page"><div class="eyebrow">명도·매도 연습</div><h2 style="font-size:26px;margin-top:4px">${arenaTab==="dex"?"점유자 유형 도감":arenaTab==="game"?"명도왕 — 열쇠를 받아라":arenaTab==="sell"?"매도 게임 — 얼마에 내놓을까":arenaTab==="guess"?"시세 맞히기 — 직접 조사하고 맞혀라":arenaTab==="art"?"게임 그림 관리":arenaTab==="story"?"스토리 모드 — 선택이 결말을 바꾼다":arenaTab==="king"?"경매왕 — 조사부터 매도까지 한 판":"점유자·부동산·업자와 협상 연습"}</h2>${tabs}${body}</section>`;
  const inp = document.getElementById("chIn"); if(inp && draft && !CH.busy) inp.value = draft;
  const gl = document.getElementById("gLog"); if(gl) gl.scrollTop = gl.scrollHeight;
  if(typeof vnType==="function") vnType();
}
document.addEventListener("click", e => {
  if(page!=="arena" && !e.target.closest("[data-opencase]")) return;
  let b;
  if((b = e.target.closest("[data-atab]"))){ arenaTab = b.dataset.atab; renderArena(); return; }
  if((b = e.target.closest("[data-opencase]"))){ const id = b.dataset.opencase; realTab = "cases"; go("real"); caseStart(id); renderReal(); window.scrollTo(0,0); return; }
  if((b = e.target.closest("[data-gstart]"))){ VN_ACT = ""; arenaTab = "game"; gStart(b.dataset.gstart); renderArena(); window.scrollTo(0,0); return; }
  if((b = e.target.closest("[data-gnew]")) || (b = e.target.closest("[data-gtype]"))){ const P = occGen(b.dataset.gtype); const R = arenaRec(); R.custom.unshift(P); R.custom = R.custom.slice(0,8); save(); arenaTab = "game"; gStart(P.id); renderArena(); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-gquit]")){ G = null; renderArena(); return; }
  const snap = () => G ? {mood:G.mood, resist:G.resist, cost:gTotal(), week:G.week} : null;
  if((b = e.target.closest("[data-gcard]")) && G && G.card){ const s0 = snap(); gCardPick(+b.dataset.gcard); G.fxHTML = gFxChips(s0); renderArena(); return; }
  if((b = e.target.closest("[data-gact]"))){ VN_ACT = b.dataset.gact; const s0 = snap(); gAct(b.dataset.gact); if(G) G.fxHTML = gFxChips(s0); renderArena(); return; }
  if((b = e.target.closest("[data-goffer]"))){ VN_ACT = "offer"; const s0 = snap(); gAct("offer", +b.dataset.goffer); if(G) G.fxHTML = gFxChips(s0); renderArena(); return; }
  if((b = e.target.closest("[data-chatwith]"))){ arenaTab = "chat"; CH.pid = b.dataset.chatwith; CH.review = null; CH.err = ""; renderArena(); window.scrollTo(0,0); scrollChat(); return; }
  if(e.target.closest("[data-cnew]")){ const P = occGen(); const R = arenaRec(); R.custom.unshift(P); R.custom = R.custom.slice(0,8); save(); CH.pid = P.id; CH.review = null; renderArena(); return; }
  if(e.target.closest("[data-cback]")){ if(CH.ctl) CH.ctl.abort(); CH.pid = null; CH.review = null; CH.err=""; renderArena(); return; }
  if(e.target.closest("[data-cstop]")){ if(CH.ctl) CH.ctl.abort(); return; }
  if(e.target.closest("[data-creset]")){ if(CH.busy) return; const R = arenaRec(); delete R.chats[CH.pid]; CH.review = null; CH.err=""; save(); renderArena(); return; }
  if(e.target.closest("[data-creview]")){ chatReview(); return; }
});
document.addEventListener("change", e => {
  if(e.target.id !== "chImg" || !e.target.files || !e.target.files[0]) return;
  const f = e.target.files[0]; CH.img = {file:f, name:f.name || "사진"}; renderArena(); const inp = document.getElementById("chIn"); if(inp) inp.focus();
});
document.addEventListener("click", e => { if(e.target.closest("[data-cimgx]")){ CH.img = null; renderArena(); } });
document.addEventListener("submit", e => {
  if(e.target.id!=="chForm") return;
  e.preventDefault(); const v = $("#chIn").value; if(v.trim() || CH.img) chatSend(v);
});
document.addEventListener("keydown", e => {
  if(e.target.id==="chIn" && e.key==="Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); const v = e.target.value; if(v.trim()) chatSend(v); }
});
