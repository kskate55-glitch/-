# 외전 대본 작성 가이드 (에이전트용)

작업 폴더: `/tmp/claude-0/-home-user--/faa03bfd-a6ff-592d-9719-8bb7d66ebf18/scratchpad/study` (이하 S)

## 반드시 먼저 읽을 것
1. 기획 원문: `/root/.claude/uploads/faa03bfd-a6ff-592d-9719-8bb7d66ebf18/1ccb926b-auction_king_all12_claude_code_prompt.md`
   - 41~160행 "공통 제작·구현 기준"(작문 원칙·캐릭터 성격·본편 분리) 전부
   - 160~570행 중 **내가 맡은 편의 확정 기획**(장면 흐름·배울 개념·숫자·실무 조작·노트)
   - 956~1180행 "통합 검수 / 숫자 검수용 고정 예시 / 출처와 사실 관리 / 금지할 자동 생성 결과"
2. 완성 예시: `S/il_D01.js` — 이 형식 그대로 쓴다. (엔진: `S/interlude.js` 맨 위 주석이 문법 정의)
3. 참고자료 id 목록: `S/interlude.js` 맨 아래 `IL_REFS`의 키. **refs에는 이 키만 쓴다**(새 URL 만들지 말 것).

## 파일
- 한 편당 파일 하나: `S/il_<ID>.js` (예: `il_S01.js`). 안에 `IL_DEF({...})` 한 번.
- 다른 파일은 절대 수정하지 않는다(interlude.js·il_D01.js·게임 파일 포함).

## IL_DEF 필드
```
IL_DEF({
  id:"S01", ch:"seoyun", after:0,        // after: 0=첫 번째 사건 뒤, 2=세 번째 사건 뒤
  ver:1, title:"…", sub:"한 줄 소개",
  arrange:{tempo:0.9, wave:"triangle"|"sine"|"square"|"sawtooth", kick:"1.......", hat:"..1."},  // 편마다 다르게
  cg:"cg_il_s01",                        // 대표 일러스트 칸 이름(아직 그림 없음 — 이름만)
  endLine:"끝 화면 한 문장",
  refs:["W_NTS_REGISTER", ...],
  notes:[{id, t, body:[문단...], table:[[헤더...],[행...]], list:[...]}],   // 2~3장. 실무노트 = 선택 열람
  sheets:{ <id>:{type:"sort"|"pick"|"calc"|"doc", ...} },                 // 실무 조작 1~2개 (+ doc 자료 화면 가능)
  script:`...`
});
```
- `ch`: seoyun / dohyun / mijeong / jaehoon / eunkyung / taesik
- 캐릭터↔사건: seoyun k1,f11,f12,f13 · dohyun k2,f21,f22,f23 · mijeong f31~f34 · jaehoon f41~f44 · eunkyung f51~f54 · taesik f61~f64 (이름·줄거리는 `S/episode.js` 6~38행 EP_PLAN). after:0 은 첫 번째, after:2 는 세 번째 사건.

## 대본 문법 (script 템플릿 문자열 안)
```
# s1 | bg=배경키 | music=main|focus|calm | title=장면 제목
[나레이션] 지문
[서윤] 대사                 ← 주인공은 반드시 짧은 이름: 서윤 도현 미정 재훈 은경 태식 (그래야 얼굴 그림이 붙는다)
[서윤|happy] 표정 지정 — normal happy shocked worried angry tired 중 하나만
[서윤·속마음] 생각
[엄마·전화] / [○○·메시지] / [○○·메신저] / [○○·알림] / [○○·개인 메시지]   메시지 말풍선
[시스템 안내] / [시스템 카드] 카드형 안내(도입 카드에 '교육용 가상 사례' 표시 등)
@if profit | @elif loss | @else | @end     ← 해당 사건의 실제 결과: profit(흑자) loss(적자) nodeal(패찰·미거래). 셋 다 쓰려면 @if profit / @elif loss / @else
@choice
> a | 선택지 문구
> b | 선택지 문구
@when a
...4~6줄...
@when b
...4~6줄...
@end
@sheet 시트id
@note 노트id      ← 대사 흐름 중 해금(끝나면 모든 노트 자동 해금)
{{profit}}        ← 해당 사건 손익 금액(절댓값, "1,234만원" 형태). {{caseName}} ← 「사건명」
```
- 조연 이름은 자유(실존 인물·업체 아님). `[이름]` 안에 `|`, `·`, `]`는 위 용도 외에 쓰지 않는다.
- **배경 키(bg=)**: room(주인공 방) · bg_office_1 · bg_office_2 · bg_office_3 · bg_realtor(중개사무소) · bg_court(법원) · bg_bid_room(입찰 법정) · bg_alley(골목) · bg_villa_day · bg_villa_night · bg_stairs · bg_front_door · bg_room_clean · bg_room_empty · bg_room_messy · bg_room_after · bg_oneroom · bg_banjiha · bg_rooftop · bg_shop_closed · bg_warehouse · bg_factory_dorm. 없는 키 쓰지 말 것.
- 장면 6~10개, 한 줄 1~3문장. 선택지는 한 편에 1~2개(갈래는 4~6줄 후 합류, 정답 처리 금지).

## 시트(실무 조작) 형식 — il_D01.js의 sheets 참고
- `doc`: `{type:"doc", title, prompt, doc:{title, rows:[[항목,값]...], foot}}` 서류·공고·비용표를 화면에 보여 준다.
- `sort`: `{type:"sort", title, prompt, buckets:[{id,t}...], items:[{t, b:"버킷id", why}...], okText, foot:[...], note:"노트id"}` 항목을 칸으로 분류.
- `pick`: `{type:"pick", title, prompt, doc:{...}(선택), fields:[{label, draft(선택), opts:[...], ans:정답인덱스, why}...], okText, foot}` 대조·고르기.
- `calc`: `{type:"calc", title, prompt, inputs:[{id,label,def,opts:[{v,t}...]}], rows:v => [[이름, 값문자열, "sum"|"minus"(선택)]...], foot:[가정·포함·제외 표시]}` 가정을 바꿔 가며 보는 계산표. rows는 **순수 함수**(입력 v만 사용). 숫자는 `toLocaleString("ko-KR")`로 표시.
- 모든 시트: 틀려도 불이익 없음, '설명 보고 진행' 버튼은 엔진이 자동 제공. 본편 돈과 무관.
- 숫자 검수용 고정 예시(원문 994행~)는 **그 숫자 그대로** 화면에 나와야 한다.

## 반드시 지킬 것
- 기본 경로(첫 번째 선택지 기준, profit/loss/nodeal 각각) 대사·속마음·지문 합계 **5,500자 이상**(목표 6,000~8,000), 의미 있는 노드 120~180개. 노드 수만 늘리려고 문장을 쪼개지 말 것.
- 사건 결과 분기(@if profit/loss/else)를 도입부에 반드시 넣는다 — 결과가 없는데 번 돈을 말하지 않는다. 세 번째 사건 뒤 외전도 그 사건 결과로 분기.
- 등록·잔금·등기처럼 이미 끝난 사건의 행정 장면은 '회상'이라고 표시.
- 외전의 투자 예시(월세·NPL·공동입찰·단기임대·공매·재개발)는 가상 사례 — 본편 통장·자산에 반영된다고 쓰지 않는다. 도입부에 `[시스템 안내]`로 '교육용 가상 사례, 실제 진행 전 해당 기관·전문가 확인'을 한 번 적는다(대사마다 반복 금지).
- 금지어(대사·노트·시트 어디에도): 평공 텐엑스 쌤 강사 카페 아카데미 수강생 세연 모닝콜 두꺼비 유튜브 http 010- 부경꾼 경장인 로빈 이시훈 박진규 행꿈사 열린 푸디 회계사님 TODO
  - "카페" 대신 "찻집/커피집", "유튜브" 대신 "영상/동영상 채널". "열린"도 금지(예: '열린 문' → '문이 열린 채로' 같은 활용형도 피하고 다른 표현).
- 실존 인물 발언 인용 금지, 출처 지어내기 금지, '보장·자동 절세·수익 두 배' 류 단정 금지. 법률·세무 설명은 일반적이고 정확하게, 세부는 "해당 기관에서 확인"으로.
- 욕설 금지, 성별로 능력 판단 금지, 약자 존중. 위기 번호는 112/119/109만.
- 실제 세율·수수료·학비·금리·기한 숫자를 대사에 박지 않는다(가상 예시는 '예시'라고 명시).

## 검증 (끝나기 전 반드시)
```
cd S && node il_check.js <ID>
```
`ALL OK`가 나와야 한다(파서 오류·금지어·모르는 변수·글자 수 5,000 미만이면 ❌). 표의 글자 수가 5,500 미만이면 장면을 보강한다.
완료 보고: 파일명, 장면 수, 기본 경로 글자 수(세 갈래), 노드 수, 시트 id, 노트 id, 확신이 없는 사실 문장 목록(검토 필요).
