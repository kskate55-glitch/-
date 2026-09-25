/* ================= 🙇 사정 끝까지 들어주기 — 점유자마다 긴 사연 · 이벤트 카드 개연성 =================
   현실 명도에서는 점유자가 구구절절 사정을 늘어놓고, 그걸 끝까지 들어주는 시간이 있다.
   화풀이·비굴함·딴소리·같은 말 반복까지 그 사람 성격대로. 모두 가상의 인물이다.
   줄 형식: [말하는 사람("" = 점유자 본인, 이름 = 같이 사는 사람, null = 지문), 대사, 표정] */
const MT_TALES = {
 p_grandpa:[
  [[null,"할아버지가 현관 앞 계단에 털썩 앉는다. 담배를 꺼냈다가 도로 넣는다.","worried"],
   ["","내가 말이여, 이 집 들어올 때 부동산이 뭐라 했는지 알어? '할아버지, 여기 주인 양반 좋은 사람이에요.' 그 말만 믿고 300 넣었어.","normal"],
   ["","현장 일이 그래. 비 오면 공치고, 겨울엔 일이 없고. 그래도 월세 25만원은 한 번도 안 밀렸어. 통장 보여 줄까?","normal"],
   ["","근데 어느 날 법원에서 누런 봉투가 오더니 경매래. 나는 경매가 뭔지도 몰라. 주인 양반한테 전화하니까 없는 번호래.","angry"],
   ["","그래서 동사무소 가서 물었더니 뭐, 배당? 나는 한 푼도 없대. 들어온 날짜가 늦어서. 날짜가 늦은 게 내 잘못이여?","angry"],
   ["","…아니, 젊은 양반한테 화낼 일은 아닌데. 미안혀. 요새 내가 말이 곱게 안 나와.","worried"]],
  [["할머니","(방 안에서) 여보, 누구 왔어요? 우리 철수 왔어?","normal"],
   ["","아니여, 손님이여. 들어가 있어. …집사람이 요새 깜빡깜빡혀. 병원에선 초기라는데, 아들 이름을 하루에도 몇 번씩 불러.","worried"],
   ["","아들놈은 부산 살어. 지 살기도 바빠. 이런 얘기 하면 걱정만 하니까 안 했지.","worried"],
   ["할머니","(문틈으로) 손님 오셨는데 커피라도 드려야지. 설탕 넣어요?","normal"],
   ["","…저 사람한텐 이사 간다는 말을 못 했어. 짐 싸는 거 보면 불안해서 밤새 못 자거든. 익숙한 데서 떠나면 더 헤맨대.","worried"],
   ["","그러니까 내 말은, 나가긴 나가야지. 근데 한 달은 줘야 혀. 방도 구하고, 저 사람한테 천천히 말할 시간.","normal"]],
  [["","방은 알아봤어. 반지하 하나 있는데 보증금이 모자라. 150만 있으면 돼.","normal"],
   ["","동사무소에서 주거급여 얘기는 들었어. 근데 서류가 한 보따리여. 나 같은 사람은 그런 거 쓸 줄을 몰라.","worried"],
   ["","…고맙다는 말은 해야겄네. 여기 온 사람들 다 문 두드리고 '언제 나가요'만 했지, 이렇게 앉아서 들어 준 사람은 없었어.","normal"],
   [null,"할아버지가 무릎을 짚고 일어선다. 목소리가 처음보다 한결 낮다.","normal"]]],
 p_coop:[
  [[null,"정은주 씨가 식탁을 가리킨다. 물컵 두 개가 놓여 있다.","normal"],
   ["","앉으세요. 먼 데서 오셨죠. …이 집, 제가 식당 하면서 번 돈으로 산 거예요. 처음으로 제 이름 들어간 집.","normal"],
   ["","코로나 때 가게 문을 두 달 닫았어요. 월세는 나가는데 손님은 없고. 대출을 대출로 막다 보니까 여기까지 왔네요.","worried"],
   ["","저는요, 원망은 안 해요. 누가 사도 샀을 거고, 법대로 하시는 거 알아요. 그냥 좀… 창피해요. 동네 사람들이 다 알아서.","worried"]],
  [["","문제는 딸이에요. 고3이에요. 수능이 두 달 남았어요.","worried"],
   ["딸","(방에서 나오다가 멈칫) …안녕하세요.","normal"],
   ["","들어가 있어, 괜찮아. …쟤는 몰라요. 아니, 아는데 모르는 척해요. 그게 더 마음 아파요.","worried"],
   ["","수능 끝나는 날까지만 여기서 버티게 해 주시면, 그다음 주에 바로 나갈게요. 약속드릴게요. 글로 써 드릴게요.","normal"]],
  [["","남편은 지방 현장 다녀서 주말에만 와요. 짐은 제가 거의 다 싸 놨어요. 보실래요? 베란다에 박스 쌓여 있죠.","normal"],
   ["","이삿짐센터 견적이 120만원 나왔어요. 새 집 보증금 넣고 나니까 그 돈이 빠듯해요.","worried"],
   ["","…이런 얘기까지 하게 될 줄은 몰랐네요. 들어 주셔서 고마워요. 날짜랑 금액, 오늘 정해요. 저도 빨리 끝내고 싶어요.","normal"]]],
 p_phishing:[
  [["오태석","들어오세요. 아니, 앉지는 마시고. 할 말만 하고 가요.","angry"],
   ["한미정","여보, 그렇게 말하지 마…","worried"],
   ["오태석","당신이 뭘 알아! …우리가 무슨 일을 당했는지 알아요? 검찰청이라고 전화가 왔어. 내 계좌가 범죄에 쓰였다고. 안전한 계좌로 옮기라고.","angry"],
   ["오태석","십 년 모은 돈이 하루에 없어졌어요. 하루에. 그거 메우려고 대출 받고, 그 대출 막으려고 또 받고.","angry"],
   ["오태석","그리고 당신이 나타났지. 헐값에 사 가지고. 사기꾼이랑 당신이랑 뭐가 달라요?","angry"]],
  [[null,"한참 정적. 한미정 씨가 남편 팔을 붙잡는다.","worried"],
   ["한미정","…죄송해요. 이 사람이 원래 이런 사람이 아니에요. 그 전화 받고 나서 잠을 못 자요.","worried"],
   ["한미정","애들이 초등학생 둘이에요. 전학 가야 하는 거 알면 울 거예요. 제일 걱정되는 건 그거예요.","worried"],
   ["오태석","…화내서 미안합니다. 당신 잘못 아닌 거 알아요. 근데 화낼 데가 없어서.","worried"],
   ["한미정","학기 끝날 때까지만요. 그리고 이사비 조금만… 저희 정말 아무것도 없어요.","worried"]]],
 p_ghost:[
  [[null,"몇 주 만에 온 긴 문자. 띄어쓰기가 엉망이다.","worried"],
   ["","연락못받아서죄송합니다 전화오면 가슴이뛰어서 못받겠더라구요 사업하다가 거래처가 부도나서 저까지 넘어갔습니다","worried"],
   ["","지금 지방에서 형님 일 도와주면서 지냅니다 거기 짐은 거의 버릴거고 몇개만 챙기면 됩니다","normal"],
   ["","솔직히 그집 다시 들어가기가 무섭습니다 거기서 제가 제일 바닥까지 갔거든요","worried"]],
  [["동거녀","(대신 전화를 받는다) 저 그 사람이랑 같이 지냈던 사람인데요. 그 사람 지금 전화 못 받아요. 창피해서.","normal"],
   ["동거녀","짐은 제가 가서 뺄 수 있어요. 열쇠 제가 갖고 있어요. 근데 그 사람 앨범이랑 아버님 사진은 꼭 챙겨 달래요.","normal"],
   ["동거녀","나머지는 버려 주셔도 된대요. 그거 써 달라고 하시면 제가 받아 올게요.","normal"]]],
 p_greedy:[
  [["","아이고, 오셨어요. 앉으세요, 앉으세요. 커피? 믹스밖에 없는데.","normal"],
   ["","내가 이 동네 20년 살았어요. 저기 부동산 사장이 내 친구야. 그 친구가 그러더라고. 저 윗동네 누구는 이사비 천만원 받고 나갔다고.","normal"],
   ["","아니 내가 달라는 게 아니고요, 시세라는 게 있잖아요. 시세. 요즘 이사 한 번 하는 데 얼마 드는 줄 알아요?","normal"],
   ["","포장이사에 새 집 복비에 도배에… 계산해 보면 천만원도 모자라요. 진짜로.","normal"]],
  [["아내","(부엌에서) 당신 그 얘기 또 하지 마. 그 사람도 결국 오백 받았대.","normal"],
   ["","…아, 거 참. 여자들은 꼭 이래. 아무튼요, 우리도 사정이 있어요. 아들이 취업 준비 3년째라.","worried"],
   ["","솔직하게 말할게요. 버티면 더 준다는 얘기를 들었어요. 근데 법원 서류 날아오니까 겁도 나고. 적당히 맞춰 주시면 적당히 나가 드릴게.","normal"]]],
 p_senior:[
  [["","아, 오셨어요. 궁금한 게 너무 많았어요. 배당기일은 언제예요? 명도확인서는 언제 써 주세요?","normal"],
   ["","제가 전세 들어오면서 확정일자 받고 전입도 바로 했거든요. 인터넷에 찾아보니까 전액 받을 수 있다고 하던데 맞죠?","normal"],
   ["","새 집 계약금은 벌써 넣었어요. 잔금을 배당금으로 치러야 해서 날짜가 딱 맞아야 해요. 하루라도 어긋나면 새 집 주인한테 위약금 물어요.","worried"]],
  [["룸메이트","(방에서) 서연아, 이사 트럭 날짜 그거 확정된 거야?","normal"],
   ["","아직! …죄송해요. 친구랑 같이 살아서요. 제가 계약자라 제가 다 챙겨야 해요.","normal"],
   ["","사실 이번에 처음 알았어요. 집이 경매로 넘어가도 제가 먼저 나가야 돈을 받는 거. 그러니까 저도 빨리 나가고 싶어요. 순서만 맞춰 주세요.","normal"]]],
 p_fake:[
  [["","저는요, 정식 임차인입니다. 계약서 여기 있어요. 보증금 2억. 도장도 찍혀 있고요.","normal"],
   ["","언제 들어왔냐고요? 근저당 전날이요. 날짜 보시면 아시잖아요. 제가 먼저예요.","normal"],
   ["","보증금은… 현금으로 드렸어요. 매형한테. 가족끼리 계좌이체 하는 사람이 어디 있어요.","worried"]],
  [["누나","(뒤에서 작게) 상훈아, 그만해…","worried"],
   ["","누나는 가만있어. …아무튼 보증금 받기 전엔 한 발짝도 못 나갑니다. 법대로 하세요.","angry"],
   ["","…그래요. 솔직히 매형이 시켰어요. 이렇게 하면 돈 좀 나온다고. 저도 이게 맞는지 모르겠어요. 누나가 여기 살거든요. 갈 데가 없어요.","worried"]]],
 p_lien:[
  [["","한빛인테리어 현장소장입니다. 저희가 이 집 리모델링을 싹 다 했어요. 욕실, 주방, 샷시까지.","normal"],
   ["","공사대금 4,800만원 중에 한 푼도 못 받았습니다. 전 주인이 잔금 날 전화를 안 받더니 경매가 들어갔더라고요.","angry"],
   ["","우리 직원들 월급은 제 돈으로 줬습니다. 자재상에 외상도 깔려 있고요. 이거 해결 안 되면 저희 회사 문 닫아요.","angry"]],
  [["","…점유요? 현수막 붙여 놨잖아요. 직원 둘이 교대로 봐요. 아, 요즘은 좀 뜸했죠. 다른 현장이 급해서.","worried"],
   ["","저도 압니다. 유치권이 쉽지 않다는 거. 변호사도 반반이래요. 근데 가만있으면 0원이잖아요. 사장님이라면 가만있겠어요?","worried"]]],
 p_hug:[
  [["","뭐, 할 얘기 있으면 해 봐요. 나 바빠요.","angry"],
   ["","6개월 치 360 선불로 냈어요. 현금으로. 집주인이 여기 문제없다 그래서. 들어온 지 두 달이야. 넉 달 치 돈은 누가 줘요? 당신이 줘요?","angry"],
   ["","문신 보고 쫄았어요? 나 이거 젊을 때 한 거고, 지금은 택배 일 해요. 새벽 네 시에 나가서 밤에 들어와. 성실하게 산다고.","angry"]],
  [["","…나도 사기 당한 거 알아요. 집주인 번호 없어진 지 한 달 됐어. 고양이 세 마리 데리고 방 구하기가 얼마나 어려운 줄 알아요?","worried"],
   ["형님","(뒤에서) 동철아, 사장님이 뭐라시는데.","normal"],
   ["","형님은 가만있어요. …사장님, 내가 험하게 말한 건 미안해요. 근데 돈 넉 달 치는 너무 억울해. 조금만 생각해 줘요.","worried"]]],
 p_5000:[
  [["서지은","(문을 열자마자 고개를 숙인다) 죄송해요, 죄송해요. 저희가 어떻게든 해 볼게요.","worried"],
   ["서지은","보증금 4천에 들어왔는데 500밖에 못 받는대요. 그거 저희 전 재산이에요. 결혼할 때 양가에서 조금씩 보태 주신 거예요.","worried"],
   ["서지은","저희 딸이 열 살이에요. 지금 학교 친구들이랑 정말 잘 지내요. 전학 가면 또 적응해야 하는데…","worried"]],
  [["한정우","(뒤에서) 사장님, 저 막노동이라도 할게요. 월세라도 내면서 몇 달만 더 살면 안 될까요? 부탁드립니다.","worried"],
   ["서지은","여보… 아니에요, 그런 부탁은 안 되는 거래요. 저도 알아요.","worried"],
   ["서지은","…다만 이사비를 조금만 더 챙겨 주시면, 정말 빨리 나갈게요. 딸 방학 시작하는 날에 맞춰서요. 은혜 안 잊을게요.","worried"]]],
 p_delay:[
  [["","아이고 사장님, 오셨어요! 제가 먼저 연락드리려고 했는데. 다음 달 초에는 진짜로 나가요. 진짜로.","normal"],
   ["","그게요, 새 집 잔금 대출이 은행에서 서류 하나가 빠졌다고 해서요. 그거만 되면 바로예요.","normal"],
   ["","아 그리고 이삿짐센터가요, 손 없는 날은 다 찼대요. 그다음 날은 애 방학식이고요. 그 다음 주는…","normal"]],
  [["아내","(작게) 여보, 대출 서류 아직 안 냈잖아…","worried"],
   ["","아니 그게, 내려고 했지! …사장님, 솔직히 말씀드릴게요. 나가기가 무서워요. 새 동네도, 대출도, 다 처음이라.","worried"],
   ["","날짜 박아 주시면 지킬게요. 제가 핑계가 많은 거 저도 알아요. 이번엔 종이에 써 주세요. 그래야 저도 움직여요.","normal"]]],
 p_youth:[
  [["","아… 안녕하세요. 문자 받고 무서워서 계속 검색해 봤어요. 경매요. 제가 뭘 잘못한 거예요?","worried"],
   ["","저 보육원에서 나올 때 받은 돈으로 여기 들어왔어요. 500이요. 그게 제 전부예요. 이거 없어지면 저…","worried"],
   ["","물어볼 사람이 없어요. 원장님한테 전화할까 하다가, 나와서까지 폐 끼치기 싫어서요.","worried"]],
  [["친구","(옆에서) 하늘아, 이분이 돈 받을 수 있다잖아. 소액…뭐라고 했죠?","normal"],
   ["","최우선변제… 그거요? 제가 받을 수 있어요? 진짜로요? 그럼 배당기일에 법원 가면 되는 거예요?","normal"],
   ["","…고맙습니다. 저 이런 거 설명해 준 사람 처음이에요. 시키는 대로 할게요. 서류 뭐 챙겨야 하는지만 알려 주세요.","normal"]]],
 p_basic:[
  [[null,"할아버지가 문고리를 붙잡고 한참 만에 문을 연다. 무릎이 좋지 않다.","worried"],
   ["","…누구시오. 아, 새 주인. 들어오시오. 앉을 데가 마땅찮은데.","normal"],
   ["","나는 수급자요. 보증금 없이 월세 20만원. 나라에서 나오는 돈으로 월세 내고 약값 내고 나면 끝이여.","worried"],
   ["","그 뭐, 요양보호사 선생이 일주일에 세 번 오는데 그 양반이 그러더만. 이 집 경매 넘어갔다고. 나는 그런 것도 몰랐어.","worried"]],
  [["","자식이 있긴 있지. 연락 안 한 지 십 년 됐어. 내가 못 해 줬으니 원망도 못 혀.","worried"],
   ["","계단 있는 데는 이제 못 가요. 이 집도 겨우 오르내렸어. 1층이나, 엘리베이터 있는 데라야 혀.","worried"],
   ["","…이런 얘기 하면 뭐 하나 싶었는데. 들어 주니 좀 낫구먼. 동사무소 선생한테 같이 물어봐 줄 수 있겠소?","normal"]]],
 p_mind:[
  [[null,"장미자 씨가 문을 반쯤 연다. 말이 빠르고, 시선이 자꾸 창밖으로 간다.","normal"],
   ["","아, 은행에서 오셨구나. 제가 이자 서류 다 드렸잖아요. 또 뭐가 필요해요?","normal"],
   ["","저기 창밖에 감나무 보이죠. 아버지가 심으신 거예요. 아니, 이 집이 아니라 시골집에. 가을마다 감을 따서…","normal"],
   ["","근데 누구시라고요? …아, 이 집을 사신 분. 죄송해요. 요즘 제가 자꾸 헷갈려요.","worried"]],
  [["","약은 먹어요. 먹으면 괜찮아요. 안 먹으면 잠을 못 자고, 그러면 머릿속이 시끄러워요.","worried"],
   ["노모","(안방에서) 미자야, 누구니?","normal"],
   ["","엄마, 손님! …엄마도 제가 챙겨야 해요. 여동생은 대구에 살아요. 여동생한테 전화하면 다 알아서 해 줘요. 번호 드릴까요?","normal"],
   [null,"장미자 씨가 수첩을 뒤져 번호를 적어 준다. 글씨가 삐뚤지만 또박또박하다.","normal"],
   ["","…저 나가야 하는 거 알아요. 무섭긴 한데. 동생이랑 같이 이야기하면 할 수 있을 것 같아요.","worried"]]],
 p_cn:[
  [["","안녕하세요. 한국어 괜찮아요, 천천히 말해 주시면 다 알아들어요.","normal"],
   ["","저는 대학원생이에요. 전 집주인한테 6개월 월세 420만원 먼저 냈어요. 한국 사람들 이렇게 한다고 해서요. 깔세.","normal"],
   ["","근데 들어오고 한 달 뒤에 경매 서류가 왔어요. 집주인은 전화를 안 받아요. 저 지금 기말고사 기간이에요. 비자 연장 서류도 내야 해요.","worried"]],
  [["","방학에 집에 가는 비행기표도 끊어 놨어요. 그 전에 이사하면 짐을 어디 둬야 할지 모르겠어요.","worried"],
   ["룸메이트","(옆에서 휴대폰 번역기를 보여 준다) 저희 둘이 같이 나갈 수 있어요. 날짜만 알려 주세요.","normal"],
   ["","돈은… 돌려받기 어렵다고 들었어요. 알아요. 그냥 시험 끝날 때까지만, 조용히 공부할 수 있게 해 주세요.","normal"]]],
 p_hwagyo:[
  [["","어서 오세요. 우리 가게 가 보셨어요? 저 모퉁이 짜장면집. 아버지 때부터 했어요.","normal"],
   ["","저는 여기서 태어났어요. 국적은 대만인데, 말은 한국말이 더 편해요. 사람들이 가끔 중국 사람이라고 신기해하는데, 동네 토박이예요.","normal"],
   ["","1년 치 월세 일부를 먼저 냈어요. 가게랑 가까워야 새벽에 장 보고 문을 열거든요.","worried"]],
  [["아내","아들이 고등학생이에요. 학교가 여기서 걸어서 5분. 이사 가면 버스를 두 번 타야 해요.","worried"],
   ["","이 동네를 떠나기가 싫어요. 단골들 얼굴이 다 여기 있어요. 근처로만 옮길 수 있으면 날짜는 맞춰 볼게요.","normal"],
   ["","…짜장면 한 그릇 드시고 가세요. 얘기는 먹으면서 해도 되잖아요.","normal"]]],
 p_mn:[
  [[null,"낮 두 시. 바트 씨가 잠긴 목소리로 문을 연다. 야간 근무 주다.","worried"],
   ["","죄송합니다… 자고 있었어요. 전화 많이 못 받았어요. 밤에 공장 일해요.","worried"],
   ["","아는 사람이 소개했어요. 6개월 돈 먼저 줬어요. 계약서? 종이 한 장 있어요. 이거 괜찮아요?","normal"]],
  [["아내","(몽골어로 뭔가 묻고, 바트 씨가 짧게 대답한다)","worried"],
   ["","아내가 한국어 잘 몰라요. 무서워해요. 딸이 네 살이에요. 어린이집 이제 적응했어요.","worried"],
   ["","나가야 하면 나가요. 근데 공장 가까운 데 찾아야 해요. 사장님이 도와준다고 했어요. 사장님 번호 드릴게요.","normal"]]],
 p_pk:[
  [["","안녕하세요. 제가 아메드예요. 계약서 제 이름으로 했어요. 근데 네 명이 같이 살아요. 돈은 똑같이 나눴어요.","normal"],
   ["동료","(방에서 나와 인사한다) 안녕하세요. 저는 밤에 일해요. 지금 조금 자고 싶어요.","normal"],
   ["","우리는 문제 만들고 싶지 않아요. 한국에서 일 잘하고 돈 모아서 가족한테 보내요. 경찰 문제 생기면 안 돼요.","worried"]],
  [["","사장님(고용주)한테 말했어요. 기숙사 알아본대요. 근데 한 달은 걸린대요.","normal"],
   ["","우리 넷 다 서명할 수 있어요. 날짜 정하면 지켜요. 우리는 약속 중요해요.","normal"]]]
};
// 무작위 점유자는 유형 틀 + 개인 사정(twist) + 같이 사는 사람으로 만든다
const MT_TYPE_TALE = {
 coop:[["","이야기 들어 주신다니 고마워요. 사실 누구한테도 제대로 말을 못 했어요.","normal"],["","빚이 한 번 밀리기 시작하니까 도미노처럼 넘어가더라고요. 정신 차려 보니까 경매 서류가 와 있었어요.","worried"]],
 angry:[["","들어 준다고요? 좋아요, 들어 봐요. 우리가 어떻게 이 집을 샀는데. 은행이 대출 막 내줄 땐 언제고 이제 와서.","angry"],["","당신한테 화낼 일 아닌 거 알아요. 아는데, 그럼 누구한테 내요? 은행? 법원? 다 전화도 안 받아.","angry"]],
 ghost:[["","(짧은 문자가 이어서 온다) 죄송합니다 요즘 전화를 못 받겠습니다 빚 독촉 전화인 줄 알고요","worried"],["","짐은 거의 정리했습니다 몇 개만 가지러 한 번 가겠습니다","normal"]],
 poor:[["","나 같은 사람은 이사 한 번이 목숨 걸린 일이여. 보증금 모을 동안 어디서 살란 말인가.","worried"],["","월세 밀린 거 한 번도 없어. 그런데도 이렇게 되니까 억울하지. 억울해서 잠이 안 와.","angry"]],
 greedy:[["","솔직히 말할게요. 주변에서 버티면 더 준다길래요. 나도 알아요, 욕심인 거.","normal"],["","근데 우리도 나가서 살아야 하잖아요. 적당한 선에서 서로 맞춰 봅시다.","normal"]],
 bully:[["","우리가 당한 거 생각하면 이 정도는 양반이에요. 법대로 하려면 해 봐요. 나도 알아볼 만큼 알아봤으니까.","angry"],["","…말은 이렇게 해도, 버틴다고 뾰족한 수가 있는 건 아니더라고요.","worried"]],
 fake:[["","저는 정식으로 계약했다니까요. 서류 다 있어요. 돈은 현금으로 줬고요.","normal"],["","…물어보시니까 말인데, 저도 누가 시켜서 한 거예요. 이러면 돈이 나온다고.","worried"]],
 senior:[["","저는 배당받으면 바로 나가요. 새 집도 알아봤어요. 날짜만 맞춰 주세요.","normal"],["","명도확인서가 있어야 돈을 받는다고 해서 걱정했어요. 순서만 알려 주시면 따를게요.","normal"]],
 lien:[["","공사대금을 한 푼도 못 받았습니다. 직원들 월급은 제 돈으로 줬어요.","angry"],["","가만있으면 0원이니까 이러는 거예요. 저도 속 편한 사람 아닙니다.","worried"]],
 short:[["","돈 먼저 다 내고 들어왔어요. 그 돈은 누가 돌려줘요? 저도 사기 당한 거예요.","angry"],["","갈 데만 있으면 나가요. 날짜 조금만 여유를 주세요.","normal"]],
 care:[["","아, 누구시더라… 죄송해요. 요즘 자꾸 헷갈려요. 천천히 말해 주세요.","worried"],["","가족한테 연락해 주시면 같이 이야기할 수 있을 것 같아요. 번호가 여기 어디 있는데…","normal"]],
 shop:[["","장사하는 사람한테 가게를 옮기라는 건 단골을 버리라는 거예요. 권리금은요?","angry"],["","계약 끝날 때까지만이라도 영업하게 해 주시면, 그다음은 저도 준비할게요.","worried"]]
};
const MT_TWIST_LINE = [
 [/기말고사/, ["","애가 지금 시험 기간이에요. 이사 얘기를 하면 공부가 되겠어요? 시험만 끝나면요.","worried"]],
 [/반려견/, ["","개들 때문에 방 구하기가 하늘의 별 따기예요. 전화하면 '동물은 안 돼요'가 첫마디예요.","worried"]],
 [/허리 수술/, ["","허리 수술하고 아직 무거운 걸 못 들어요. 짐을 누가 싸 주면 모를까.","worried"]],
 [/잔금일/, ["","새 집 잔금이 한 달 뒤예요. 그날에 맞춰 나가면 딱 맞아요. 그 전엔 갈 데가 없어요.","normal"]],
 [/부동산에서 이사비/, ["","부동산 사장님이 그러던데요. 요즘 이사비 많이들 받는다고. 그거 아니에요?","normal"]],
 [/월세가 6개월/, ["","월세가 여섯 달 밀렸어요. 뭐부터 해결해야 할지 모르겠어요. 다 막막해요.","worried"]],
 [/짐이 많아/, ["","짐이 많아서 견적만 200이 넘게 나와요. 그 돈이 어디서 나와요.","worried"]],
 [/친척/, ["","사촌 형이 버티면 돈 준다더라고요. …그 말만 믿고 있었는데, 법원 서류 보니까 겁이 나요.","worried"]],
 [/법률구조공단/, ["","법률구조공단에서 상담 받았어요. 인도명령 대상이라더군요. 그러니까 조건만 맞춰 봅시다.","normal"]],
 [/치매 초기인 어머니/, ["","어머니가 치매 초기세요. 낯선 데 가면 더 헤매세요. 새 집을 천천히 익히게 해 드리고 싶어요.","worried"]]
];
function mtTaleOf(P){
  if(!P) return [];
  if(MT_TALES[P.id]) return MT_TALES[P.id];
  const base = MT_TYPE_TALE[P.type] || MT_TYPE_TALE.coop, tw = MT_TWIST_LINE.find(x => x[0].test(P.twist || P.story || ""));
  const hs = (typeof houseOf === "function" ? houseOf(P) : []).filter(h => h.adult && h.rel);
  const c2 = [];
  if(tw) c2.push(tw[1]);
  if(hs.length) c2.push([hs[0].rel, `(옆에서) ${pick(["저도 한마디만 할게요. 저희 정말 갈 데가 없어요.","날짜만 확실하면 저희도 준비할게요.","이 사람 요즘 잠을 못 자요. 조금만 여유를 주세요."])}`, "worried"]);
  c2.push(["", "…들어 주셔서 고마워요. 이런 얘기 할 데가 없었어요.", "normal"]);
  return [base, c2];
}

/* ---------- 사연 장면(한 줄씩, 누르면 다음) ---------- */
let MT = null;
function mtPlay(lines, o){
  if(!lines || !lines.length) return;
  // 자동 흐름 테스트용: 이야기 창을 띄우지 않고 바로 끝낸다(게임 쪽 효과는 그대로).
  if(window.MT_SKIP_TALE){ if(o && o.done) o.done(); return; }
  MT = {lines, i:0, name:o.name || "", pid:o.pid || null, done:o.done || null};
  mtPaint();
  if(typeof kcSfx === "function") kcSfx("paper");
}
function mtFace(ex){
  if(!MT || !MT.pid || typeof artNpc !== "function") return "";
  try{ const u = artNpc(MT.pid, ex === "angry" ? "angry" : ex === "worried" ? "worried" : "normal"); return u ? `<img src="${u}" alt="">` : ""; }catch(e){ return ""; }
}
function mtPaint(){
  let el = document.getElementById("mtTale");
  if(!MT){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement("div"); el.id = "mtTale"; el.className = "mt-tale"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "사정 듣기"); document.body.appendChild(el); }
  const [who, t, ex] = MT.lines[MT.i], last = MT.i === MT.lines.length - 1;
  const face = who === "" ? mtFace(ex) : "";
  const nm = who === null ? "" : who === "" ? MT.name : who;
  el.innerHTML = `<div class="mt-veil" data-mtnext></div><div class="mt-card ${who === null ? "narr" : ""} ${who && who !== "" ? "other" : ""}" data-mtnext>
    <div class="mt-top"><small>🙇 사정 끝까지 듣는 중 · ${MT.i + 1}/${MT.lines.length}</small><button type="button" class="mt-skip" data-mtskip>건너뛰기 ›</button></div>
    <div class="mt-body">${face ? `<div class="mt-face">${face}</div>` : ""}<div class="mt-say">${nm ? `<b class="mt-nm">${esc(nm)}</b>` : ""}<p>${esc(t)}</p></div></div>
    <div class="mt-next">${last ? "끝까지 들었다 ✓" : "▼ 계속 듣기"}</div></div>`;
}
function mtClose(){ const d = MT && MT.done; MT = null; mtPaint(); if(d) try{ d(); }catch(e){} }
document.addEventListener("click", e => {
  if(!MT) return;
  if(e.target.closest("[data-mtskip]")){ e.stopPropagation(); mtClose(); return; }
  if(e.target.closest("[data-mtnext]")){ e.stopPropagation(); if(MT.i < MT.lines.length - 1){ MT.i++; mtPaint(); if(typeof pxSyn === "function") try{ pxSyn("tap"); }catch(_){} } else mtClose(); }
}, true);
document.addEventListener("keydown", e => {
  if(!MT) return;
  if(e.key === "Escape"){ e.preventDefault(); mtClose(); }
  else if(e.key === " " || e.key === "Enter"){ e.preventDefault(); if(MT.i < MT.lines.length - 1){ MT.i++; mtPaint(); } else mtClose(); }
}, true);

/* ---------- 명도왕: "사정 끝까지 들어주기" 행동 ---------- */
if(typeof G_ACTIONS !== "undefined" && !G_ACTIONS.some(a => a.id === "listen"))
  G_ACTIONS.splice(1, 0, {id:"listen", ic:"🙇", t:"사정 끝까지 들어주기", d:"한 주를 통째로 써서 구구절절한 사연을 다 듣는다. 속사정과 진짜 조건이 나온다"});
let MT_PENDING = null;
const _mt_gAvail = gAvail; gAvail = function(a, P){
  if(a && a.id === "listen"){ if(G && G._mtGo) return true; if(!G || G.over || G.handover || G.gone || !G.met) return false; return (G.heard || 0) < mtTaleOf(P).length; }
  return _mt_gAvail(a, P);
};
const _mt_gAct = gAct; gAct = function(id, amt){
  if(id !== "listen" || !G) return _mt_gAct(id, amt);
  const P = personaById(G.pid), a = G_ACTIONS.find(x => x.id === "listen"); if(!P || !a || !gAvail(a, P)) return;
  const tale = mtTaleOf(P), k = G.heard || 0, chunk = tale[k] || [], pr = P.p || {};
  gLog("me", "자리를 잡고 앉았다. 말을 끊지 않고 끝까지 들었다.");
  chunk.forEach(([who, t]) => { if(who === null) gLog("sys", t); else gLog("them", (who ? who + ": " : "") + t); });
  G.heard = k + 1;
  const emo = pr.emo || 1;
  G.mood = clamp(G.mood + 12 * emo); G.resist = clamp(G.resist - (5 + 3 * emo));
  if(G.heard >= tale.length){
    G.resist = clamp(G.resist - 6);
    gLog("sys", `다 듣고 나니 보인다 — 이 사람이 진짜 원하는 건 ${P.goal ? P.goal.replace(/\.$/, "") : "갈 곳과 시간"}.`);
    if(!G.hinted){ G.hinted = true; gLog("sys", `속마음 힌트: 대략 ${man0(Math.round(gNeed(P)/10)*10 || 0)} 안팎이면 움직일 것 같다.`); }
    if(P.type === "care") gLog("sys", "정신건강·인지 문제가 보일 때는 다그치지 않는다. 본인 동의를 받아 가족과 연결하고, 필요하면 지역 정신건강복지센터·행정복지센터 상담을 함께 안내한다.");
  }
  MT_PENDING = {lines:chunk, name:P.name.replace(/\s*\(.*\)$/, ""), pid:P.id};
  G._mtGo = true; try{ _mt_gAct("listen", amt); } finally { if(G) G._mtGo = false; }   // 한 주가 지나고(대출이자 등) 이벤트 판정까지 원래 흐름 그대로
  G && (G.silent = 0);
};
const _mt_render = renderArena; renderArena = function(){
  _mt_render();
  if(MT_PENDING){ const p = MT_PENDING; MT_PENDING = null; if(p.delay) setTimeout(() => mtPlay(p.lines, p), p.delay); else queueMicrotask(() => mtPlay(p.lines, p)); }
};

/* ---------- 경매왕 본게임(명도 단계): "사정부터 듣는다" ---------- */
const _mt_kMove = kMove; kMove = function(id){
  const had = K && K.occ ? K.occ.turns : 0;
  _mt_kMove(id);
  if(id !== "listen" || !K || !K.occ || K.occ.turns === had) return;
  const P = typeof personaById === "function" ? personaById(KP.occ.pid) : null, tale = mtTaleOf(P || {id:KP.occ.pid});
  if(!tale.length) return;
  const k = K.occ.heard || 0; if(k >= tale.length) return;
  K.occ.heard = k + 1;
  if(K.occ.heard >= tale.length){ K.occ.coop = Math.min(100, K.occ.coop + 6); if(typeof kLog === "function") kLog("🙇 사연을 끝까지 다 들었다 — 협조도가 더 올랐다."); }
  MT_PENDING = {lines:tale[k], name:KP.occ.name, pid:KP.occ.pid, delay:1300};   // 하루가 지나는 DAY 배너가 걷힌 뒤에
};

/* ---------- 이벤트 카드: 덜 자주, 그 집 사정에 맞게 ---------- */
const MT_CARD_MAX = 3, MT_CARD_GAP = 3, MT_CARD_P = 0.16;
gMaybeCard = function(P){
  if(G.over || G.card || G.week < 1) return;
  G.cardsUsed = G.cardsUsed || [];
  if(G.handover){ if(G.mood < 40 && !G.cardsUsed.includes("sabotage") && Math.random() < 0.5){ G.cardsUsed.push("sabotage"); G.card = {id:"sabotage", ord:shuffle([0,1,2])}; } return; }
  const crisis = G_CARDS.filter(c => (c.id === "crisis" || c.id === "arson") && !G.cardsUsed.includes(c.id) && c.cond(P));
  if(crisis.length && Math.random() < 0.3){ const c = pick(crisis); G.cardsUsed.push(c.id); G.card = {id:c.id, ord:shuffle(c.o.map((_, i) => i))}; G.lastCard = G.week; return; }
  const normal = G.cardsUsed.filter(x => !/^(crisis|arson|sabotage)$/.test(x)).length;
  if(normal >= MT_CARD_MAX) return;                                  // 한 판에 몇 장이면 충분하다
  if(G.lastCard != null && G.week - G.lastCard < MT_CARD_GAP) return;  // 연달아 터지지 않게
  if(Math.random() > MT_CARD_P) return;
  const pool = G_CARDS.filter(c => !G.cardsUsed.includes(c.id) && !/^(crisis|arson|sabotage)$/.test(c.id) && c.cond(P));
  if(!pool.length) return;
  const c = pick(pool); G.cardsUsed.push(c.id); G.lastCard = G.week;
  G.card = {id:c.id, ord:shuffle(c.o.map((_, i) => i))};
};
(function mtFixCards(){
  const cur = () => (typeof G !== "undefined" && G && typeof personaById === "function") ? personaById(G.pid) : null;
  const sns = G_CARDS.find(c => c.id === "sns"), sTxt = sns && sns.s;
  if(sns) Object.defineProperty(sns, "s", {get(){ const P = cur(); return P && hasKids(P) ? sTxt : "\"낙찰자가 오갈 데 없는 사람을 길바닥으로 내몬다\"는 글이 동네 커뮤니티에 올라왔다."; }});
  const hos = G_CARDS.find(c => c.id === "hospital");
  if(hos) Object.defineProperty(hos, "s", {get(){
    const P = cur(), h = P ? houseOf(P).find(x => x.old || /노모|아버지|할머니/.test(x.rel || "")) : null;
    const who = !h ? "어머니" : /노모|어머니/.test(h.rel + h.desc) ? "어머니" : /아버지/.test(h.rel + h.desc) ? "아버지" : /할머니|아내/.test(h.rel + h.desc) ? "집사람" : h.rel;
    const c = who.charCodeAt(who.length - 1), jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 > 0;
    return `"${who}${jong ? "이" : "가"} 쓰러져서 병원에 있어요. 이사 날짜를 좀…"`; }});
})();

/* ---------- 무작위 점유자: 사정·나이·같이 사는 사람이 서로 맞게 ---------- */
function mtOccOk(o){
  const age = +((o.name.match(/\((\d+)\)/) || [])[1] || 45), H = o.house || [], tw = o.twist || "";
  const txt = H.map(h => h.desc + " " + h.rel).join(" ");
  const kid = H.some(h => !h.adult && /아이|자녀|아들|딸/.test(h.rel + h.desc) && !/아기|백일/.test(h.desc));
  if(/기말고사/.test(tw) && !kid) return false;
  if(/치매 초기인 어머니/.test(tw) && (age >= 66 || !H.some(h => h.old || /노모|어머니/.test(h.rel)))) return false;
  if(/반려견/.test(tw) && !H.some(h => h.pet && /개|견|강아지/.test(h.rel + h.desc))) return false;
  if(age >= 60 && /아기|백일|초등학생|고등학생/.test(txt)) return false;
  if(age >= 66 && /노모|거동이 불편한 아버지/.test(txt)) return false;
  if(age <= 36 && /30대 자녀|고등학생 자녀/.test(txt)) return false;
  return true;
}
if(typeof occGen === "function"){
  const _mt_occGen = occGen;
  occGen = function(typeId){ let o = _mt_occGen(typeId); for(let i = 0; i < 40 && !mtOccOk(o); i++) o = _mt_occGen(typeId); return o; };
}
