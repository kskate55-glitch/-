/* ================= 📚 스토리 모드 — 선택지·분기·플래그·멀티엔딩 =================
   대본(STORY_EPS)은 라벨 → 노드 배열. 노드 종류:
   {bg}        배경(또는 cut_ 클로즈업) 바꾸기
   {say,t,ex}  대사(say = 인물 id 또는 조연 키, "me" = 나). 조연·인물이 말하면 그 사람이 무대에 선다
   {narr}      나레이션(이름표 없음)
   {menu,q}    선택지 [{t, go, set}] — set은 플래그를 더하거나(숫자) 켠다
   {if,go}     플래그 조건이 맞으면 그 라벨로 점프 (if는 f=>… 함수)
   {set} {go}  플래그만 바꾸기 / 무조건 점프
   {tip}       이 장면의 '법·실무 포인트' — 엔딩 화면에 모아서 보여 준다
   {end}       엔딩(도감에 저장된다) */
const ST_WHO = {me:"나", sister:"장미숙 씨 (여동생)", clerk:"행정복지센터 주무관", manager:"관리인 할아버지", broker:"부동산 사장님", bailiff:"집행관", mover:"이삿짐 반장님",
  kid:"아이", daughter:"딸", locksmith:"열쇠공", grandma:"옆집 할머니", boss:"공장 사장님", lawyer:"법무사", wife:"아내", neighbor:"이웃 주민", dog:"콩이"};
const ST_SPR = {sister:"sister", clerk:"youngwoman", manager:"manager", broker:"broker", bailiff:"bailiff", mover:"mover", kid:"kid", daughter:"youngwoman", locksmith:"locksmith", grandma:"grandma", neighbor:"ajumma", boss:"husband"};
const ST_GRADE = {true:["TRUE","#1f9d62"], good:["GOOD","#3a7bd5"], bad:["BAD","#d6463c"], hidden:["HIDDEN","#9b59b6"]};

const STORY_EPS = [
/* ─────────────────────────────── 1. 은하늘 ─────────────────────────────── */
{id:"ep_youth", pid:"p_youth", title:"스물한 살의 원룸", sub:"보증금이 다 날아간 줄 아는 청년 세입자",
 blurb:"낙찰받은 빌라 3층 원룸에 스물한 살 은하늘 씨가 산다. 문자는 읽고 답이 없다.",
 endings:{
  e_start:{grade:"true", title:"열쇠와 새 출발", text:"하늘 씨는 배당금으로 새 보증금을 마련했고, 청년 주거 지원으로 옮길 집도 구했다. 이삿날 짐이 빠진 걸 확인하고 명도확인서를 건넸다. 열쇠를 받으며 하늘 씨가 처음으로 웃었다."},
  e_early:{grade:"good", title:"먼저 준 서류", text:"명도확인서를 이사 전에 먼저 건넸다. 하늘 씨는 약속을 지켰지만, 새 집 계약이 한 번 엎어지면서 이사가 3주 밀렸다. 결과는 괜찮았지만 운이 좋았을 뿐이다."},
  e_cold:{grade:"bad", title:"닫힌 문", text:"다그치는 문자만 보냈다. 하늘 씨는 연락을 끊었고, 결국 인도명령과 강제집행까지 갔다. 비용은 몇 배로 들었고, 집행 날 짐 사이에서 뜯지 않은 법원 우편이 나왔다."},
  e_mentor:{grade:"hidden", title:"먼저 가 본 사람", text:"주거 지원 서류를 같이 챙기고, 이삿날엔 반장님까지 불러 줬다. 몇 달 뒤 하늘 씨에게서 문자가 왔다. \"저도 나중에 집 사면 사장님처럼 할게요.\""}},
 labels:{
  start:[
   {bg:"bg_villa_night"},
   {narr:"대금납부를 마친 다음 날 밤. 3층 원룸 창문엔 불이 켜져 있다."},
   {narr:"문자를 세 번 보냈다. 전부 '읽음'. 답은 없다."},
   {bg:"bg_stairs"},
   {menu:[{t:"🚪 직접 찾아가 문을 두드린다", go:"visit"},{t:"📱 한 번 더 문자 — '기한 안에 안 나가면 강제집행합니다'", go:"threat", set:{cold:1}},{t:"🏢 먼저 관리인 할아버지에게 사정을 묻는다", go:"survey", set:{survey:1}}], q:"어떻게 할까?"}],
  survey:[
   {say:"manager", t:"그 총각? 아니 아가씨던가… 아무튼 착해. 쓰레기도 꼬박꼬박 내놓고. 근데 요즘 우편함이 꽉 찼더라고."},
   {say:"manager", t:"법원에서 온 누런 봉투도 있던데, 안 뜯은 것 같아. 혼자 사는 애라 뭘 모르는 거 아닌가 몰라."},
   {tip:"점유자를 만나기 전에 관리인·이웃에게 생활 모습을 먼저 들어 두면 대화의 첫마디가 달라진다."},
   {go:"visit"}],
  threat:[
   {narr:"보낸 문자 옆 숫자 '1'이 사라졌다. 답은 오지 않았다."},
   {narr:"다음 날, 그다음 날도. 3층 창문의 불이 꺼져 있었다."},
   {menu:[{t:"🚪 그래도 찾아가 본다", go:"visit"},{t:"⚖️ 인도명령 신청부터 한다", go:"order"}], q:"연락이 끊겼다."}],
  visit:[
   {bg:"bg_front_door"},
   {narr:"문이 반쯤 열렸다. 체인이 걸려 있다."},
   {say:"p_youth", ex:"worried", t:"…죄송한데 저 여기서 나가면 갈 데가 없어요."},
   {say:"p_youth", ex:"worried", t:"보증금도 못 받는 거죠? 인터넷에 경매 되면 다 날아간다고…"},
   {menu:[
     {t:"\"보증금 받으실 수 있어요. 천천히 설명드릴게요\"", go:"explain", set:{trust:2}},
     {t:"\"그건 제 사정이 아니고요, 언제 나가실 거예요?\"", go:"push", set:{trust:-1, cold:1}},
     {t:"\"혹시 법원에서 온 봉투, 뜯어 보셨어요?\"", go:"letter", set:{trust:1}}], q:"첫마디."}],
  push:[
   {say:"p_youth", ex:"angry", t:"…그러니까 그냥 나가라는 거잖아요."},
   {fx:"shake", narr:"문이 닫혔다. 체인 소리가 유난히 크게 들렸다."},
   {if:f=>(f.cold||0) >= 2, go:"order"},
   {menu:[{t:"문 앞에 쉬운 말로 쓴 안내문을 남긴다", go:"note", set:{trust:1}},{t:"⚖️ 인도명령을 신청한다", go:"order"}]}],
  note:[
   {bg:"cut_notice"},
   {narr:"'보증금을 받는 방법이 있습니다. 겁먹지 마시고 연락 주세요.' — 짧게, 쉬운 말로 적어 문에 붙였다."},
   {tip:"안내문은 날짜·연락처·다음 단계 하나만. 법률 용어를 한꺼번에 쏟아내면 오히려 문을 닫는다."},
   {bg:"bg_front_door"},
   {narr:"이틀 뒤, 문자가 왔다. '안내문 봤어요. 설명 들어도 될까요.'"},
   {go:"explain"}],
  letter:[
   {say:"p_youth", ex:"worried", t:"…무서워서요. 뜯으면 뭔가 진짜가 될 것 같아서."},
   {narr:"하늘 씨가 서랍에서 봉투 네 개를 꺼냈다. 전부 봉해진 채였다."},
   {set:{opened:1}},
   {narr:"그중 하나 — 배당기일 통지서. 소액임차인 최우선변제로 보증금 대부분을 받을 수 있다는 뜻이다."},
   {say:"p_youth", ex:"normal", t:"……받는다고요? 제 돈을요?"},
   {tip:"대항력이 없어도 소액임차인은 최우선변제로 보증금 일부를 먼저 배당받을 수 있다. 단, 배당요구 종기까지 배당요구를 했어야 한다."},
   {go:"explain"}],
  explain:[
   {bg:"bg_oneroom"},
   {narr:"좁은 원룸. 책상 위에 자립정착금 안내문이 붙어 있다."},
   {say:"me", t:"순서는 이래요. 배당기일에 법원에서 보증금을 받으시려면 제가 드리는 '명도확인서'가 필요해요."},
   {say:"me", t:"명도확인서는 이사 나가신 걸 확인하고 드리는 서류예요. 그러니까 이사 날짜를 먼저 같이 정하면 돼요."},
   {say:"p_youth", ex:"worried", t:"근데… 옮길 집을 구할 돈이 그날 들어오잖아요. 그 전에 어떻게 집을 구해요?"},
   {tip:"임차인이 배당금을 받으려면 매수인의 명도확인서(인감증명 첨부)가 필요하다. 그래서 명도확인서는 매수인 쪽의 가장 큰 협상 카드다."},
   {menu:[
     {t:"🏛️ 행정복지센터 청년 주거 지원 창구를 같이 알아본다", go:"support", set:{trust:2, help:1}},
     {t:"📄 명도확인서를 먼저 드리고, 그 돈으로 집을 구하시게 한다", go:"early", set:{early:1}},
     {t:"💬 \"그건 알아서 하셔야죠\" 하고 날짜만 받는다", go:"dateonly", set:{trust:-1}}], q:"닭이 먼저냐 달걀이 먼저냐."}],
  support:[
   {bg:"bg_realtor"},
   {say:"clerk", t:"자립준비청년이시면 주거 지원을 먼저 보셔야 해요. 공공임대 우선 신청이나 보증금 지원 같은 게 있어요."},
   {say:"clerk", t:"서류는 이것저것 필요하니까 목록 드릴게요. 배당기일 전에 계약만 되면 잔금은 그날 받는 돈으로 맞추시면 되고요."},
   {say:"p_youth", ex:"normal", t:"이런 게 있는 줄 몰랐어요. 아무도 안 알려 줬거든요."},
   {tip:"점유자가 갈 곳이 없어서 버틸 때, 행정복지센터 연결은 이사비보다 빨리 문을 연다. 협상은 돈만의 문제가 아니다."},
   {menu:[{t:"🚚 이삿날 반장님도 불러 드린다 (50만원)", go:"moveday", set:{mover:1}},{t:"날짜만 확정하고 나머지는 하늘 씨에게 맡긴다", go:"moveday"}], q:"이삿날 준비."}],
  dateonly:[
   {say:"p_youth", ex:"worried", t:"…네. 알아서 해 볼게요."},
   {narr:"목소리가 작아졌다. 날짜는 받았지만, 뭔가 걸린다."},
   {if:f=>(f.trust||0) >= 2, go:"moveday"},
   {narr:"약속한 날 일주일 전. 문자가 왔다. '집을 못 구했어요. 죄송해요.' 그리고 다시 답이 끊겼다."},
   {go:"order"}],
  early:[
   {bg:"cut_signing"},
   {narr:"명도확인서에 도장을 찍어 건넸다. 하늘 씨가 두 손으로 받았다."},
   {tip:"명도확인서를 이사 전에 먼저 주면 매수인은 협상 카드를 잃는다. 선의가 통할 때도 있지만, 계약이 엎어지면 기댈 곳이 없다."},
   {bg:"bg_oneroom"},
   {narr:"그런데 배당기일 사흘 뒤 — 새 집 집주인이 계약을 미뤘다."},
   {say:"p_youth", ex:"worried", t:"정말 죄송해요… 3주만 더 있으면 안 될까요? 돈은 받았는데 들어갈 데가 없어서…"},
   {menu:[{t:"기다려 준다", go:"e_early_go"},{t:"🏛️ 이번엔 센터에 같이 가 본다", go:"support", set:{help:1}}]}],
  e_early_go:[{end:"e_early"}],
  moveday:[
   {bg:"cut_moving"},
   {narr:"이삿날 아침. 작은 트럭 한 대."},
   {if:f=>f.mover, go:"mover"},
   {go:"handover"}],
  mover:[
   {say:"mover", t:"짐 이게 다예요? 금방 끝나겠네. 학생, 무거운 건 놔둬요."},
   {say:"p_youth", ex:"normal", t:"……감사합니다. 진짜로요."},
   {go:"handover"}],
  handover:[
   {bg:"bg_room_clean"},
   {narr:"빈 방. 벽에 붙어 있던 안내문 자국만 남았다."},
   {menu:[{t:"🔍 짐이 다 빠졌는지 확인하고 명도확인서를 건넨다", go:"keys"},{t:"대충 보고 바로 서류부터 준다", go:"keys", set:{sloppy:1}}], q:"인도 확인."}],
  keys:[
   {bg:"cut_keys"},
   {tip:"명도확인서·잔금은 '짐이 다 빠진 것'을 눈으로 확인한 뒤에. 전입도 옮겼는지 함께 본다."},
   {if:f=>f.mover && f.help && (f.trust||0) >= 4, go:"end_mentor"},
   {end:"e_start"}],
  end_mentor:[{end:"e_mentor"}],
  order:[
   {bg:"bg_court"},
   {narr:"인도명령을 신청했다. 결정이 나오고, 집행관 사무실에 강제집행을 접수했다."},
   {tip:"대항력 없는 점유자는 대금 완납 후 6개월 안에 인도명령을 신청할 수 있다. 결정문이 곧 집행권원이 된다."},
   {bg:"bg_front_door"},
   {say:"bailiff", t:"계고 기간 지나서 오늘 집행합니다. 짐은 목록 만들어서 보관 창고로 옮겨요."},
   {bg:"bg_room_messy"},
   {narr:"짐 사이로 뜯지 않은 누런 봉투가 굴러 나왔다. 배당기일 통지서였다."},
   {end:"e_cold"}]
 }},

/* ─────────────────────────────── 2. 장미자 ─────────────────────────────── */
{id:"ep_mind", pid:"p_mind", title:"은행 사람이 아니에요", sub:"누구를 믿어야 할지 모르는 전 소유자",
 blurb:"전 소유자 장미자 씨는 매수인을 예전 은행 직원으로 착각한다. 서두를수록 문이 닫힌다.",
 endings:{
  e_trust:{grade:"true", title:"믿을 사람이 생겼다", text:"여동생과 주무관이 함께 앉은 자리에서, 같은 설명을 세 번 했다. 미자 씨는 여동생 집 근처로 옮기기로 했다. 이삿날 미자 씨가 물었다. \"그쪽은 은행 사람 아니죠?\" \"아니에요.\" \"그럼 됐어요.\""},
  e_sign:{grade:"bad", title:"혼자 받은 서명", text:"합의서에 서명은 받았다. 한 달 뒤 여동생이 연락해 왔다 — 언니는 그날 무슨 서류인지 몰랐다고. 합의는 흔들렸고, 결국 인도명령부터 다시 밟았다."},
  e_exec:{grade:"good", title:"법대로, 그러나", text:"인도명령과 강제집행으로 명도는 끝났다. 절차는 모두 적법했다. 집행 날 여동생이 뛰어왔고, 미자 씨는 여동생 손을 잡고서야 계단을 내려갔다. 처음부터 저 손이 있었다면."},
  e_door:{grade:"hidden", title:"닫힌 문 너머", text:"며칠째 인기척이 없는 게 마음에 걸렸다. 문을 따는 대신 행정복지센터에 방문 확인을 부탁했다. 미자 씨는 탈수로 누워 있었고, 제때 병원에 갔다. 명도는 그다음 이야기였다."}},
 labels:{
  start:[
   {bg:"bg_villa_day"},
   {narr:"오후 두 시. 2층 현관 앞에서 인기척이 난다."},
   {bg:"bg_front_door"},
   {say:"p_mind", ex:"angry", t:"은행에서 또 왔어요? 나 돈 다 갚았다니까. 우리 집 앞에서 뭐 하는 거예요?"},
   {menu:[
     {t:"\"저는 은행 사람이 아니에요. 이 집을 새로 산 사람이에요.\" (짧게)", go:"slow", set:{trust:1}},
     {t:"경매 절차·인도명령·집행까지 한 번에 쭉 설명한다", go:"fast", set:{trust:-1}},
     {t:"오늘은 인사만 하고, 쉬운 말로 쓴 안내문을 드린다", go:"paper", set:{trust:1, paper:1}}], q:"첫마디."}],
  fast:[
   {say:"p_mind", ex:"angry", t:"뭐? 뭐라고요? 집행? 나 몰라요, 그런 거 몰라!"},
   {fx:"shake", narr:"문이 쾅 닫혔다. 안에서 같은 말을 되풀이하는 소리가 들린다."},
   {tip:"불안이 큰 사람에게 법률 용어를 한꺼번에 쏟으면 내용이 아니라 '겁'만 전달된다. 짧게, 한 번에 하나씩."},
   {menu:[{t:"안내문을 문틈에 넣고 돌아선다", go:"paper", set:{paper:1}},{t:"⚖️ 대화는 포기하고 인도명령을 신청한다", go:"order"}]}],
  paper:[
   {bg:"cut_notice"},
   {narr:"큰 글씨로 딱 세 줄. '저는 새 집주인입니다. 은행이 아닙니다. 이사 날짜를 함께 정하고 싶습니다.' 그리고 연락처."},
   {bg:"bg_front_door"},
   {go:"slow"}],
  slow:[
   {say:"p_mind", ex:"worried", t:"…새로 샀다고요? 이 집을? 그럼 나는요?"},
   {say:"p_mind", ex:"worried", t:"은행 사람 아니에요? 진짜로?"},
   {say:"me", t:"네. 은행 사람 아니에요. 오늘은 인사만 드리러 왔어요."},
   {narr:"같은 질문이 세 번 돌아왔다. 세 번 다 같은 대답을 했다."},
   {say:"p_mind", ex:"normal", t:"…여동생이 있어요. 미숙이. 걔는 이런 거 잘 알아요."},
   {menu:[
     {t:"📞 여동생분 연락처를 여쭤본다 (동의를 받고)", go:"sister", set:{trust:2, sis:1}},
     {t:"📄 오늘 바로 이사 합의서를 써 달라고 한다", go:"signalone", set:{alone:1}},
     {t:"🏛️ 행정복지센터에 먼저 상담을 해 본다", go:"center", set:{center:1}}], q:"어떻게 이어 갈까?"}],
  signalone:[
   {bg:"cut_signing"},
   {narr:"미자 씨는 펜을 들고 한참 종이를 봤다. 그러다 서명했다."},
   {say:"p_mind", ex:"worried", t:"이거 쓰면 은행에서 안 오는 거죠?"},
   {narr:"…대답을 하기 전에 뭔가 잘못됐다는 느낌이 들었다."},
   {tip:"상대가 내용을 이해하지 못한 상태에서 받은 서명은 나중에 효력이 다퉈질 수 있다. 가족·지원기관이 함께한 자리에서 서면으로, 천천히."},
   {menu:[{t:"이대로 날짜를 기다린다", go:"signend"},{t:"아니다 — 여동생분께 연락해서 다시 설명한다", go:"sister", set:{sis:1}}]}],
  signend:[{narr:"약속한 날, 미자 씨는 문을 열지 않았다."},{end:"e_sign"}],
  center:[
   {bg:"bg_realtor"},
   {say:"clerk", solo:1, t:"그분 저희도 알아요. 예전에 몇 번 상담하셨어요. 요즘 연락이 잘 안 됐는데…"},
   {say:"clerk", solo:1, t:"본인이 동의하시면 여동생분과 같이 뵙는 자리를 만들어 볼게요. 옮길 곳도 같이 알아보고요."},
   {tip:"행정복지센터는 주거·복지 상담 창구다. 매수인이 대신 결정하는 곳이 아니라, 점유자가 '믿을 사람'을 곁에 두게 돕는 곳."},
   {set:{trust:1}},
   {go:"quiet"}],
  sister:[
   {bg:"bg_villa_day"},
   {say:"sister", t:"언니가요? …경매요? 저 아무것도 몰랐어요. 이사한다고, 우리 집 근처로 온다고 했었는데."},
   {say:"sister", t:"우편물은 언니가 다 숨겨 뒀나 봐요. 뜯지도 않고. 무서우니까."},
   {narr:"반전이었다. 여동생은 언니가 이미 옮겨 오는 줄 알았다. 미자 씨는 그동안 혼자였다."},
   {tip:"점유자 가족에게는 본인의 동의를 받고 연락한다. 사정을 모르는 가족이 오히려 가장 빠른 해결사가 되는 경우가 많다."},
   {go:"quiet"}],
  quiet:[
   {bg:"bg_stairs"},
   {narr:"그 주 금요일. 약속한 시간에 문을 두드렸다. 대답이 없다."},
   {narr:"다음 날도. 우편함엔 전단지가 쌓이고, 현관 앞 우유가 그대로다."},
   {menu:[
     {t:"🏛️ 행정복지센터에 방문 확인을 요청한다 (위급해 보이면 119)", go:"welfare", set:{check:1}},
     {t:"🔧 열쇠공을 불러 문을 연다", go:"lock"},
     {t:"그냥 며칠 더 기다린다", go:"meet"}], q:"이상하다."}],
  lock:[
   {say:"manager", t:"이봐요, 그거 안 돼요. 사람 사는 집 문을 마음대로 따면 큰일 나요. 집주인이라도."},
   {tip:"낙찰받은 집이어도 점유자가 있는 한 문을 따거나 짐을 빼는 건 불법(자력구제). 사람의 안전이 걱정되면 119·112나 행정복지센터로."},
   {menu:[{t:"맞다 — 센터에 방문 확인을 요청한다", go:"welfare", set:{check:1}}]}],
  welfare:[
   {say:"clerk", t:"같이 가 볼게요. 대답이 없으면 저희가 119랑 확인할게요."},
   {narr:"미자 씨는 방 안에 누워 있었다. 며칠째 제대로 먹지 못했다고 했다. 구급대가 병원으로 옮겼다."},
   {narr:"며칠 뒤. 여동생에게서 문자가 왔다. '언니 괜찮아요. 고맙습니다. 이사는 퇴원하고 같이 얘기해요.'"},
   {if:f=>f.sis && f.check && (f.trust||0) >= 3, go:"hidden"},
   {go:"meet"}],
  hidden:[{end:"e_door"}],
  meet:[
   {bg:"bg_oneroom"},
   {if:f=>!(f.sis || f.center), go:"order"},
   {narr:"작은 탁자에 넷이 앉았다. 미자 씨, 여동생, 주무관, 그리고 나."},
   {say:"p_mind", ex:"worried", t:"그래서… 나는 언제 나가요? 은행 사람 아니죠?"},
   {say:"me", t:"네, 아니에요. 날짜는 미자 씨가 괜찮은 날로 정해요. 동생분 집 근처로요."},
   {say:"sister", t:"언니, 이 달 말에 우리 동네로 와. 방은 내가 봐 뒀어."},
   {say:"p_mind", ex:"normal", t:"……미숙이가 하라면 할게요."},
   {tip:"합의는 합의서로, 본인이 이해할 수 있게 큰 글씨로. 이사비는 법적 의무가 아니지만, 이 경우엔 이사 비용 일부가 가장 싼 해결책이다."},
   {bg:"cut_moving"},
   {narr:"월말, 여동생이 빌린 작은 트럭이 왔다."},
   {bg:"cut_keys"},
   {end:"e_trust"}],
  order:[
   {bg:"bg_court"},
   {narr:"대화는 끝내 이어지지 않았다. 인도명령을 신청했고, 결정 후 강제집행을 접수했다."},
   {tip:"전 소유자(채무자)는 인도명령 대상이다. 인도명령은 대금 완납 후 6개월 안에."},
   {bg:"bg_front_door"},
   {say:"bailiff", t:"계고 기간이 지나 오늘 집행합니다."},
   {say:"sister", t:"언니! 언니 나 왔어. 괜찮아, 나랑 가자."},
   {end:"e_exec"}]
 }},

/* ─────────────────────────────── 3. 강성필 ─────────────────────────────── */
{id:"ep_greedy", pid:"p_greedy", title:"천만 원의 근거", sub:"숫자부터 던지는 전 소유자",
 blurb:"\"이사비는 천만원은 주셔야죠. 다들 그 정도 받던데요?\" — 여유로운 척하는 강성필 씨와의 숫자 싸움.",
 endings:{
  e_win:{grade:"true", title:"날짜 먼저, 숫자는 나중", text:"날짜를 먼저 못박고, 집행비용을 근거로 숫자를 깎았다. 이사비는 합의서에 적고 이사 확인 뒤에 줬다. 강성필 씨는 떠나며 말했다. \"사장님, 부동산에서 들은 거랑 다르네.\""},
  e_sucker:{grade:"bad", title:"첫 숫자에 예스", text:"천만원에 바로 도장을 찍었다. 강성필 씨는 이틀 뒤 전화를 걸어 왔다. \"근데 이사 날짜는 좀 미뤄야겠는데요.\" 돈을 먼저 준 쪽에겐 카드가 없었다."},
  e_crime:{grade:"bad", title:"선을 넘은 날", text:"관리실에 부탁해 수도를 잠갔다. 다음 날 경찰이 찾아왔다. 명도는 멈췄고, 협상은 강성필 씨 쪽으로 완전히 기울었다."},
  e_law:{grade:"good", title:"끝까지 법대로", text:"인도명령이 결정되고 계고장이 붙자, 강성필 씨가 먼저 전화했다. 200만원에 이사하기로 했다. 시간은 걸렸지만 계산은 맞았다."}},
 labels:{
  start:[
   {bg:"bg_villa_day"},
   {bg:"bg_stairs"},
   {say:"p_greedy", ex:"normal", t:"아 그 집이요. 나가 드려야죠, 당연히."},
   {say:"p_greedy", ex:"normal", t:"근데 이사비는 천만원은 주셔야 됩니다. 다들 그 정도 받던데요?"},
   {menu:[
     {t:"\"네, 천만원 드릴게요. 언제 나가세요?\"", go:"sucker"},
     {t:"\"천만원이요? 말도 안 되는 소리 하지 마세요!\"", go:"fight", set:{heat:1}},
     {t:"\"숫자는 나중에 얘기하고, 이사 날짜부터 정하시죠.\"", go:"datefirst", set:{calm:1}}], q:"첫 숫자가 날아왔다."}],
  sucker:[
   {bg:"cut_signing"},
   {narr:"그 자리에서 계좌번호를 받았다. 날짜는 '곧'이라고 했다."},
   {tip:"첫 제안을 바로 받으면 상대는 '더 부를 걸' 하고 생각한다. 그리고 돈을 먼저 주면 날짜를 지킬 이유가 사라진다."},
   {end:"e_sucker"}],
  fight:[
   {say:"p_greedy", ex:"angry", t:"말이 안 된다니? 내가 이 집에 몇 년을 살았는데! 법대로 하쇼, 법대로!"},
   {narr:"대화가 끝났다. 강성필 씨는 휴대폰을 꺼내 누군가에게 전화를 걸었다."},
   {menu:[
     {t:"🔌 관리실에 말해 수도·전기를 끊는다 — 그래야 나가지", go:"crime"},
     {t:"⚖️ 그래, 법대로. 인도명령을 신청한다", go:"law", set:{order:1}},
     {t:"🏢 관리인 할아버지에게 사정을 물어본다", go:"survey", set:{survey:1}}], q:"감정이 올라왔다."}],
  crime:[
   {bg:"bg_alley"},
   {narr:"다음 날 오후. 모르는 번호로 전화가 왔다. 관할 파출소였다."},
   {tip:"단전·단수·문 따기·짐 처분은 모두 자력구제로 불법이다. 형사 문제로 번지면 명도 협상력은 한순간에 상대에게 넘어간다."},
   {end:"e_crime"}],
  datefirst:[
   {say:"p_greedy", ex:"normal", t:"날짜요? 허허. 돈 얘기가 먼저 아닌가?"},
   {say:"me", t:"날짜가 정해져야 제가 얼마를 쓸 수 있는지도 나와요. 늦어질수록 저도 이자가 나가거든요."},
   {say:"p_greedy", ex:"worried", t:"……뭐, 한 두 달이면 되겠지."},
   {tip:"날짜를 먼저, 돈은 날짜를 당기는 도구로. 이사비는 법적 의무가 아니다."},
   {menu:[
     {t:"🏢 관리인 할아버지에게 사정을 물어본다", go:"survey", set:{survey:1}},
     {t:"⚖️ 협상과 별개로 인도명령부터 신청해 둔다", go:"law2", set:{order:1}},
     {t:"💬 바로 금액 협상에 들어간다", go:"nego"}], q:"다음 수."}],
  survey:[
   {bg:"bg_villa_day"},
   {say:"manager", t:"강 사장? 그 양반 벌써 이삿짐센터 견적 받았던데. 저번 주에 트럭 기사랑 계단 재고 갔어."},
   {say:"manager", t:"딸네 근처로 간다나 봐. 동네 부동산에서 '버티면 천만원 받는다'고 바람 넣었다고 하더만."},
   {narr:"반전이었다. 천만원은 근거가 아니라 동네에서 들은 소문이었다. 그리고 이미 나갈 준비를 하고 있었다."},
   {set:{know:1}},
   {tip:"탐문으로 점유자의 실제 사정(이사 준비 여부, 금액의 출처)을 알면 협상의 근거가 생긴다."},
   {go:"nego"}],
  law:[
   {bg:"bg_court"},
   {narr:"인도명령을 신청했다. 대금 완납 후 6개월 안이니 아직 여유가 있다."},
   {tip:"전 소유자(채무자)는 인도명령 대상이다. 신청해 두는 것만으로도 협상의 무게가 달라진다."},
   {go:"nego"}],
  law2:[
   {bg:"bg_court"},
   {narr:"인도명령을 신청했다. 협상은 협상대로, 절차는 절차대로."},
   {tip:"인도명령 신청은 전쟁 선포가 아니라 보험이다. 합의가 깨져도 시간이 새지 않게."},
   {go:"nego"}],
  nego:[
   {bg:"bg_realtor"},
   {say:"p_greedy", ex:"normal", t:"그래서, 얼마 주실 건데요? 천만원에서 좀 빼 드릴 수는 있고."},
   {menu:[
     {t:"📊 \"강제집행하면 비용이 450 정도 들어요. 그 안에서 날짜 당겨 주시면 300.\"", go:"logic", set:{logic:1}},
     {t:"🤝 \"중간 잡아서 500 어떠세요?\"", go:"half"},
     {t:"🕵️ \"이삿짐센터 견적 받으셨다던데요. 딸 댁 근처로요.\"", go:"reveal", cond:f=>f.know}], q:"숫자 싸움."}],
  half:[
   {say:"p_greedy", ex:"normal", t:"오, 500이면 얘기가 되지. 근데 계약금으로 반은 먼저 주셔야지."},
   {tip:"'중간값' 제안은 상대의 터무니없는 첫 숫자를 기준으로 인정해 주는 셈이다. 근거 있는 숫자로 되돌려야 한다."},
   {menu:[{t:"다시 근거로 돌아간다 — 집행비용 이야기", go:"logic", set:{logic:1}},{t:"반을 먼저 보내 준다", go:"sucker"}]}],
  reveal:[
   {say:"p_greedy", ex:"worried", t:"……누가 그래요? 관리실 영감이 그러지?"},
   {say:"p_greedy", ex:"worried", t:"아, 알겠어요. 그럼 뭐 이사 비용이라도 보태 주쇼. 200."},
   {set:{logic:1, cheap:1}},
   {go:"logic"}],
  logic:[
   {if:f=>f.order, go:"notice"},
   {say:"p_greedy", ex:"normal", t:"흠. 계산은 맞네. 근데 나 날짜는 좀 넉넉히 줘야 돼."},
   {say:"me", t:"다음 달 15일. 합의서에 적고, 이사비는 짐 다 빠진 거 확인하고 그날 드릴게요."},
   {go:"deal"}],
  notice:[
   {bg:"cut_court_order"},
   {narr:"인도명령 결정문이 나왔다. 협상 테이블 위에 조용히 올려놓았다."},
   {say:"p_greedy", ex:"worried", t:"……벌써 나왔어? 허 참."},
   {if:f=>f.calm, go:"deal"},
   {bg:"cut_notice"},
   {narr:"집행관이 계고장을 붙였다. 그날 밤 강성필 씨가 먼저 전화했다."},
   {end:"e_law"}],
  deal:[
   {bg:"cut_signing"},
   {narr:"합의서. 이사 날짜, 금액, 지급 조건 — '짐이 다 빠진 것을 확인한 후 지급'."},
   {tip:"합의는 합의서로. 잔금·이사비는 이사 확인 뒤에. 구두 약속만 믿고 먼저 주지 않는다."},
   {bg:"cut_moving"},
   {narr:"15일 아침, 이삿짐 트럭이 약속대로 왔다."},
   {bg:"bg_room_clean"},
   {narr:"빈 방을 한 바퀴 돌았다. 잔존물 없음. 계량기 확인."},
   {bg:"cut_keys"},
   {end:"e_win"}]
 }}
];

/* ============================== 엔진 ============================== */
// 💗 호감(신뢰) 게이지 — 선택지의 set 중 이 키들의 숫자 합
const ST_AFF = ["trust","kind","calm","fair","help","ally"];
function stAff(f){ return ST_AFF.reduce((a,k)=> a + (typeof f[k]==="number" ? f[k] : 0), 0); }
// 👥 두 사람 무대 — 이 조연이 말하면 점유자와 나란히 선다(점유자가 그 자리에 없는 장면은 노드에 solo:1)
const ST_PAIR = ["sister","clerk","kid","daughter","mover","dog"];
// ⏩ 읽은 대사(이 기기에 저장)
const ST_READ = (()=>{ try{ return new Set(JSON.parse(localStorage.getItem("st_read")||"[]")); }catch(e){ return new Set(); } })();
function stKey(){ return ST.ep + "|" + ST.label + "|" + ST.i; }
function stMarkRead(){ const n = stNode(); if(n && (n.say || n.narr)){ const k = stKey(); if(!ST_READ.has(k)){ ST_READ.add(k); try{ localStorage.setItem("st_read", JSON.stringify([...ST_READ])); }catch(e){} } } }
let ST_AUTO = false;
let ST = null;             // {ep, label, i, flags, hist:[], tips:[], run, bg, who, ex, end}
function storyRec(){ const R = arenaRec(); if(!R.endings) R.endings = {}; return R.endings; }
function stEp(){ return ST && STORY_EPS.find(e=>e.id===ST.ep); }
function stNode(){ const E = stEp(); return E && (E.labels[ST.label]||[])[ST.i]; }
function stName(who){ if(who==="me") return ST_WHO.me; const P = typeof personaById==="function" && personaById(who); return P ? P.name.replace(/\s*\(.*\)/,"") : (ST_WHO[who] || who); }
function stSprite(who, ex){
  if(!who || who==="me") return null;
  if(who==="dog") return artUrl("prop_dog");
  if(typeof personaById==="function" && personaById(who)) return artNpc(who, ex);
  const t = ST_SPR[who]; if(!t) return null;
  const e2 = (typeof ART_EXMAP!=="undefined" && ART_EXMAP[ex]) || "neutral";
  return artNpc(t, ex) || artUrl(`npc_${t}_${e2}`) || artUrl(`npc_${t}_neutral`) || artUrl(`npc_${t}_normal`);
}
function stStart(id){
  const E = STORY_EPS.find(e=>e.id===id); if(!E) return;
  const done = JSON.parse(JSON.stringify(storyRec()));   // 앞 화에서 본 엔딩 — 뒤 화에서 f.done.ep_x.e_y 로 기억한다
  ST = {ep:id, label:"start", i:0, flags:{done}, hist:[], tips:[], intro:true, run:Date.now()+Math.random(), bg:"bg_villa_day", who:E.pid, ex:"normal", end:null};
  stRun();
}
function stJump(label){ ST.label = label; ST.i = 0; }
function stSaw(f, ep, end){ const d = (f.done||{})[ep] || {}; return end ? !!d[end] : Object.keys(d).length > 0; }
function stSet(o){ for(const k in (o||{})){ const v = o[k]; ST.flags[k] = typeof v==="number" ? (ST.flags[k]||0) + v : v; } }   // 숫자는 더하고, 나머지는 켠다
// 화면에 보여야 하는 노드(대사·나레이션·선택지·엔딩)에 닿을 때까지 즉시 실행형 노드를 처리한다
function stRun(){
  for(let guard=0; guard<400; guard++){
    const n = stNode(); if(!n){ ST.end = ST.end || "?"; return; }
    if(n.bg){ ST.bg = n.bg; ST.i++; continue; }
    if(n.set && !n.menu){ stSet(n.set); ST.i++; continue; }
    if(n.tip){ if(!ST.tips.includes(n.tip)) ST.tips.push(n.tip); ST.i++; continue; }
    if(n.if){ let ok = false; try{ ok = !!n.if(ST.flags); }catch(e){} if(ok) stJump(n.go); else ST.i++; continue; }
    if(n.go && !n.menu){ stJump(n.go); continue; }
    if(n.end){ if(!ST.end){ ST.end = n.end; const R = storyRec(); (R[ST.ep] = R[ST.ep]||{})[n.end] = Date.now(); if(typeof save==="function") save(); } return; }
    if(n.say){ if(n.say!=="me"){ ST.who = n.say; ST.ex = n.ex || "normal"; if(n.say === stEp().pid) ST.mainEx = ST.ex; ST.solo = !!n.solo; } ST.hist.push({name:stName(n.say), t:n.t}); return; }
    if(n.narr){ ST.hist.push({name:"", t:n.narr}); return; }
    if(n.menu) return;
    ST.i++;
  }
}
function stAdvance(){ const n = stNode(); if(!n || n.menu || n.end || ST.end) return; stMarkRead(); ST.i++; stRun(); }
function stSkip(){ for(let g=0; g<400; g++){ const n = stNode(); if(!n || n.menu || n.end || ST.end || !(n.say || n.narr) || !ST_READ.has(stKey())) return; ST.i++; stRun(); } }
function stPick(k){
  const n = stNode(); if(!n || !n.menu) return;
  const c = n.menu.filter(c=>!c.cond || c.cond(ST.flags))[k]; if(!c) return;
  ST.hist.push({name:ST_WHO.me, t:"▶ " + c.t, me:true});
  const a0 = stAff(ST.flags); stSet(c.set); const da = stAff(ST.flags) - a0; if(da) ST.affPop = da;
  stJump(c.go); stRun();
}

/* ============================== 화면 ============================== */
function stStage(){
  const E = stEp(), n = stNode() || {};
  const slot = ST.bg, closeUp = /^cut_/.test(slot) && slot!=="cut_moving" && !!artUrl(slot);
  const who = closeUp ? "" : ST.who, spr = stSprite(who, ST.ex);
  const d = vnDiff("story", ST.run, slot, ST.ex, spr ? who : "");
  const en = ST.end && E.endings[ST.end], win = en && (en.grade==="true" || en.grade==="hidden");
  const pu = artNpc("player", "normal");
  const speaking = n.say ? n.say : "", narr = !!n.narr;
  const endT = ST.end && E.endings[ST.end] ? `— ${E.endings[ST.end].title} —` : "";
  const name = speaking && !endT ? stName(speaking) : "", text = endT || (n.say ? n.t : n.narr || (n.menu ? (n.q || "어떻게 할까?") : ""));
  const key = "st|" + ST.run + "|" + ST.label + "|" + ST.i;
  const typed = VN_SHOWN === key;
  const face = speaking && speaking!=="me" && spr ? `<span class="vn-face"><img src="${spr}" alt=""></span>` : "";
  const opts = n.menu ? n.menu.filter(c=>!c.cond || c.cond(ST.flags)) : [];
  const menu = opts.length ? `<div class="st-menu" role="group" aria-label="선택지">${opts.map((c,k)=>`<button type="button" class="st-opt" data-stpick="${k}" style="animation-delay:${k*0.08}s">${esc(c.t)}</button>`).join("")}</div>` : "";
  const aff = stAff(ST.flags), full = Math.max(0, Math.min(5, 2 + aff));
  const hearts = Array.from({length:5},(_,i)=>`<i class="${i<full?"on":""}"></i>`).join("");
  const hud = `<div class="vn-hud"><div class="vn-card"><span class="vn-ico">📚</span><span><small>${STORY_EPS.indexOf(E)+1}화</small><b>${esc(E.title)}</b></span></div><div class="vn-card st-heart" title="이 사람과 쌓은 신뢰"><span class="vn-ico">${aff<=-2?"💔":"💗"}</span><span><small>신뢰</small><span class="st-hearts">${hearts}</span></span></div>${ST_AUTO?'<div class="vn-card st-autotag">▶ AUTO</div>':""}</div>`;
  const ap = ST.affPop; ST.affPop = 0;
  const affHTML = ap ? `<div class="vn-pops" aria-hidden="true"><span class="vn-pop ${ap>0?"up":"down"}">${ap>0?"💗 신뢰 +"+ap:"💔 신뢰 "+ap}</span></div>` : "";
  const pair = !closeUp && spr && ST_PAIR.includes(who) && !ST.solo && E.pid && who !== E.pid;
  const mainSpr = pair ? stSprite(E.pid, ST.mainEx || "normal") : null;
  return `<div class="vn story ${vnMood(slot, ST.ex, win)}${d.step || n.fx==="shake" || ap<0 ? " cam-shake" : ""}${n.menu?" st-choosing":""}" data-vnkey="${esc(key)}" tabindex="0" aria-label="대화 화면 — 누르거나 스페이스로 넘기기">${d.step?'<span class="vn-flash" aria-hidden="true"></span>':""}${vnBgLayers(slot, d)}${affHTML}${mainSpr?`<img class="vn-sprite pos-l dim" src="${mainSpr}" alt="${esc(stName(E.pid))}">`:""}${spr?`<img class="vn-sprite ex-${ST.ex}${pair?" pos-r":""} who-${who}${vnMoveCls(d)}" src="${spr}" alt="${esc(stName(who))}">`:""}${pu&&!closeUp?`<img class="vn-player" src="${pu}" alt="">`:""}${hud}${menu}
    ${ST.intro && !ST.end ? `<div class="gi-card st-intro" data-stintro role="dialog" aria-label="에피소드 소개"><div class="gi-inner"><span class="gi-stage">${STORY_EPS.indexOf(E)+1}화</span><h3 class="gi-name">${esc(E.title)}</h3><div class="gi-type">${esc(E.sub)}</div><p class="gi-style">${esc(E.blurb)}</p><span class="gi-go">▶ 눌러서 시작</span></div></div>` : ""}<div class="vn-box${face?" has-face":""}${narr||n.menu||endT?" narr":""}">${face}${name?`<div class="vn-name${speaking==="me"?" sys":""}">${esc(name)}</div>`:""}
    <div class="vn-text" id="vnText" data-full="${esc(text)}">${typed?esc(text):""}</div>${n.menu||endT?"":`<span class="vn-next" aria-hidden="true">▼</span>`}</div></div>`;
}
function stEndHTML(){
  const E = stEp(), en = E.endings[ST.end] || {title:"끝", text:"", grade:"good"}, [gl, gc] = ST_GRADE[en.grade] || ST_GRADE.good;
  const got = storyRec()[E.id] || {}, total = Object.keys(E.endings).length, have = Object.keys(E.endings).filter(k=>got[k]).length;
  return (en.grade==="true"||en.grade==="hidden" ? (typeof confettiHTML==="function" ? confettiHTML() : "") : "") + stStage() + `
   <div class="panel st-end"><span class="st-grade" style="background:${gc}">${gl} END</span><h3>${esc(en.title)}</h3><p>${esc(en.text)}</p><div class="note">이 에피소드 엔딩 ${have} / ${total} 수집</div></div>
   ${ST.tips.length?`<div class="panel st-tips"><b>📌 이번 플레이에서 나온 포인트</b><ul class="ag-tips">${ST.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`:""}
   <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><button type="button" class="btn pri" data-ststart="${E.id}">↺ 처음부터 다시 (다른 선택)</button><button type="button" class="btn" data-stquit>에피소드 목록</button></div>`;
}
function storyHTML(){
  if(!ST){
    const R = storyRec();
    const all = STORY_EPS.reduce((n,E)=>n+Object.keys(E.endings).length,0), got = STORY_EPS.reduce((n,E)=>n+Object.keys(E.endings).filter(k=>(R[E.id]||{})[k]).length,0);
    return `<p class="lead">한 사람의 이야기를 끝까지 따라가는 모드예요. <b>선택에 따라 이야기가 갈리고</b>, 앞에서 한 행동이 뒤에서 돌아와요. 엔딩은 여러 개 — 모아 보세요.</p>
    <div class="panel ag-prog"><span>🏁 엔딩 ${got} / ${all}</span><span>화면을 누르거나 <kbd>Space</kbd>로 넘겨요</span></div>
    <div class="st-eps">${STORY_EPS.map((E,ei)=>{ const P = personaById(E.pid), got = R[E.id]||{};
      const face = artNpc(E.pid, "normal");
      return `<div class="panel st-ep"><div class="st-ephead">${face?`<img class="st-epface" src="${face}" alt="">`:avatarHTML(P,56)}<div><small class="st-no">${ei+1}화</small><b>${esc(E.title)}</b><div class="note">${esc(P?P.name:"")} · ${esc(E.sub)}</div></div></div><p class="st-blurb">${esc(E.blurb)}</p>
       <div class="st-gal">${Object.entries(E.endings).map(([k,en])=>{ const on = got[k], [gl,gc] = ST_GRADE[en.grade]||ST_GRADE.good; return `<span class="st-slot ${on?"on":""}" title="${on?esc(en.title):"아직 못 본 엔딩"}"><i style="background:${on?gc:"#c9ceda"}">${on?gl:"?"}</i>${on?esc(en.title):"???"}</span>`; }).join("")}</div>
       <button type="button" class="btn pri" data-ststart="${E.id}">▶ ${Object.keys(got).length?"다시 하기":"시작"}</button></div>`; }).join("")}</div>`;
  }
  if(ST.end) return stEndHTML();
  const log = ST.hist.slice(-60).map(h=>`<div class="st-log${h.me?" me":""}">${h.name?`<b>${esc(h.name)}</b> `:""}${h.name?"":"<i>"}${esc(h.t)}${h.name?"":"</i>"}</div>`).join("");
  const n0 = stNode() || {}, canSkip = (n0.say || n0.narr) && ST_READ.has(stKey());
  const ctl = `<div class="st-ctl"><button type="button" class="btn" data-stauto aria-pressed="${ST_AUTO}">${ST_AUTO?"⏸ 오토 끄기":"▶ 오토"}</button><button type="button" class="btn" data-stskip ${canSkip?"":"disabled"} title="이미 읽은 대사를 다음 선택지(또는 처음 보는 대사)까지 건너뛰어요">⏩ 읽은 대사 건너뛰기</button></div>`;
  return stStage() + ctl + `<details class="panel vn-more"><summary>📜 지난 대사 보기</summary><div class="st-logs">${log}</div></details>${vnFxPanel()}<div style="margin-top:12px"><button type="button" class="btn" data-stquit>에피소드 목록으로</button></div>`;
}

document.addEventListener("click", e => {
  if(page!=="arena" || arenaTab!=="story") return;
  let b;
  if((b = e.target.closest("[data-ststart]"))){ stStart(b.dataset.ststart); renderArena(); return; }
  if(e.target.closest("[data-stquit]")){ ST = null; renderArena(); return; }
  if((b = e.target.closest("[data-stpick]"))){ stPick(+b.dataset.stpick); renderArena(); return; }
  if(e.target.closest("[data-stauto]")){ ST_AUTO = !ST_AUTO; if(ST && ST.intro) ST.intro = false; renderArena(); return; }
  if(e.target.closest("[data-stskip]") && ST && !ST.end){ ST.intro = false; stSkip(); renderArena(); return; }
});
// 대화창 누르기: 글자가 아직 찍히는 중이면 이번 클릭은 '다 보여 주기'로만 쓴다(캡처 단계에서 먼저 본다)
document.addEventListener("click", e => {
  if(page!=="arena" || arenaTab!=="story" || !ST || ST.end) return;
  const box = e.target.closest(".vn.story"); if(!box || e.target.closest("[data-stpick]")) return;
  if(ST.intro){ e.stopPropagation(); ST.intro = false; renderArena(); return; }
  if(box.classList.contains("typing")) return;
  stAdvance(); renderArena();
}, true);
document.addEventListener("keydown", e => {
  if(page!=="arena" || arenaTab!=="story" || !ST || ST.end) return;
  if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target.tagName||"")) || e.isComposing) return;
  if(e.key!==" " && e.key!=="Enter") return;
  e.preventDefault();
  if(ST.intro){ ST.intro = false; renderArena(); return; }
  const box = document.querySelector(".vn.story"), el = document.getElementById("vnText");
  if(box && box.classList.contains("typing") && el){ clearTimeout(el._t); el.textContent = el.dataset.full || ""; box.classList.remove("typing"); return; }
  stAdvance(); renderArena();
});

// ▶ 오토: 글자가 다 찍힌 뒤 읽을 시간(길이 비례)을 주고 다음으로
let ST_AUTO_T = null;
function stAutoArm(){
  clearTimeout(ST_AUTO_T);
  if(!ST_AUTO || page!=="arena" || arenaTab!=="story" || !ST || ST.end || ST.intro) return;
  const n = stNode(); if(!n || n.menu || n.end) return;
  const key = stKey();
  const wait = () => {
    const box = document.querySelector(".vn.story"); if(!box || !ST_AUTO || !ST || stKey() !== key) return;
    if(box.classList.contains("typing")){ ST_AUTO_T = setTimeout(wait, 150); return; }
    const len = ((document.getElementById("vnText")||{}).dataset||{}).full ? document.getElementById("vnText").dataset.full.length : 20;
    ST_AUTO_T = setTimeout(() => { if(ST_AUTO && ST && stKey() === key && !ST.end){ stAdvance(); renderArena(); } }, Math.min(4500, 900 + len * 28));
  };
  ST_AUTO_T = setTimeout(wait, 150);
}
const _vnTypeS = vnType;
vnType = function(){ _vnTypeS(); stAutoArm(); };
