# 외전 재작성 지침 v227 (생초보용 · 정의 위주)

작업 폴더: /tmp/claude-0/-home-user--/faa03bfd-a6ff-592d-9719-8bb7d66ebf18/scratchpad/study
- 맡은 파일 하나만 고친다(il_XXX.js). 다른 파일은 절대 수정하지 않는다.
- 원본 백업은 이미 ../il_bak_v227/ 에 있다.
- 먼저 맡은 파일 전체와 IL_BEGINNER_BRIEF.md(있으면 ../IL_BEGINNER_BRIEF.md), 이미 고친 참고본 il_S01.js·il_S03.js·il_D03.js를 읽고 형식을 그대로 따른다.
- 엔진: interlude.js (sheet 렌더링은 function ilSheetHTML / ilMarkBody 참고).

## 사용자 요구(가장 중요)
- 생초보가 이해할 수준. 심화 썰·수익 줄어드는 사례 이야기·복잡한 사연 금지. "정의 → 어떻게 하나 → 장점/단점 → 한 줄 요약" 정도로 짧고 쉽게.
- 한 편 기본 경로 2,700~3,800자(il_check.js가 2,500자 미만이면 실패). 장면 6~8개.

## 반드시 지킬 형식
- 파일 맨 위 IL_DEF({ ... }) 구조, id/ch/after/arrange/cg/refs 등 기존 필드와 cg 키·bg 키·음악 키는 기존 파일에 있던 것만 재사용한다(새 이미지 키 만들지 말 것). ver 값은 3으로 올린다.
- 첫 장면 근처의 결과 갈래(@if profit / @elif loss / @else / @end)는 유지한다 — 본편 결과에 맞는 짧은 도입 1~2줄씩.
- 등장인물 이름은 기존 파일의 인물을 그대로 쓴다.
- notes(실무 노트) 배열은 새 내용에 맞게 다시 쓰고, 스크립트의 @note <id>가 notes의 id와 맞아야 한다.
- sheets에서 type:"sort"는 쓰지 않는다(엔진이 건너뛴다). 쓸 수 있는 것:
  - doc: {type:"doc", title, prompt, doc:{title, rows:[[라벨, 설명, (선택)"save"|"same"|"total", (선택)괄호 태그]], foot}, foot:[...]}
  - calc: {type:"calc", title, prompt, inputs:[{id,label,def,opts:[{v,t}]}], rows:v=>[[라벨, 값 또는 [칸1,칸2,칸3], (선택)"sum"|"minus"|"head"]], foot:[...]}
    - rows에서 두 번째 값이 배열이면 여러 칸으로 그려진다. 맨 위에 ["", ["1채","3채","5채"], "head"] 같은 머리 줄을 둘 수 있다.
  - mark(쉬운 퀴즈): {type:"mark", layout:"quiz", multi:false, title, prompt, items:[{t, sub?, why}], ans:[정답 번호], showWhyOk:true, okText, foot:[...]}
- 시트는 스크립트에 @sheet <id> 한 줄로 부른다. 쓰지 않는 시트는 sheets에서 지운다.
- 끝나면 반드시 `node il_check.js`를 돌려 ALL OK인지 확인한다. 실패하면 고친다.

## 금지
- 게임 문구 금지어: 평공, 텐엑스, 쌤, 강사(강사장 포함), 카페, 아카데미, 수강생, 세연, 모닝콜, 두꺼비, 유튜브, http, 010-, 부경꾼, 경장인, 로빈, 이시훈, 박진규, 행꿈사, 열린, 푸디, 회계사님.
- 확정 수익 보장·지어낸 출처 금지. 숫자는 "예시/가상/대략"으로 표시. 법·세금은 일반적인 설명으로만, 끝에 "최신 기준은 관련 기관·전문가에게 확인" 한 줄.
- 실제 인물 이름·전화번호 금지. 본편 돈·시간에 영향 주는 코드 넣지 말 것.
- 욕설 금지(순화).

## 최종 보고
- 장면 제목 목록, 시트 목록, il_check 결과 한 줄, 법·세금 문장 중 자신 없는 것이 있으면 적는다.
