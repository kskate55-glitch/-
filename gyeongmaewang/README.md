# 🏆 경매왕 — 독립 게임 버전

낙찰부터 명도·수리·매도까지, 경매 한 사이클을 돌려 보는 게임이다.
원래는 claude.ai의 "권리분석 연습장" 안에 있던 게임인데, **경매왕만 따로 떼어서 어디든 올릴 수 있게** 만든 폴더다.

```
gyeongmaewang/
├── site/            ← 이 폴더만 통째로 올리면 끝 (서버 필요 없음)
│   ├── index.html   게임 전체 (1.6MB, 외부 라이브러리 없음)
│   ├── assets/      그림 95장 (webp, 약 16MB)
│   └── _headers     Cloudflare Pages용 캐시 설정
└── src/             소스 (고칠 때만 필요)
```

## 왜 서버가 필요 없나

게임 계산은 **전부 방문자 브라우저에서** 돈다. 서버가 하는 일은 파일을 내려주는 것뿐이라
**정적 호스팅(무료)** 이면 동시 접속이 수천 명이어도 버틴다 — 무료 호스팅 서버가 잠들고
깨느라 수십 초 걸리는 문제(Render 무료)도 없다.

- 저장: 방문자 브라우저(localStorage)에 저장된다. 기기를 바꾸면 기록이 안 따라간다.
- 소리: 음원 파일 없이 브라우저가 즉석에서 만든다.

## 올리는 법 (추천: Cloudflare Pages)

1. https://pages.cloudflare.com → 가입 → **Create a project → Direct Upload**
2. `site` 폴더를 통째로 끌어다 놓기 → Deploy
3. `xxxx.pages.dev` 주소가 바로 생긴다. 한국 사용자도 빠르다(서울 엣지).
4. (선택) 도메인을 사서 연결 — 예: `gyeongmaewang.kr`

GitHub에 연결해 두면 푸시할 때마다 자동으로 다시 올라간다 — 그때는
"Build output directory"를 `gyeongmaewang/site`로 지정한다(빌드 명령은 비워 둔다).

다른 곳도 똑같이 된다: Netlify(폴더 끌어다 놓기), Vercel, GitHub Pages.

## 독립 버전에서 빠진 것

| 기능 | 왜 | 되살리려면 |
|---|---|---|
| 💬 AI 협상 채팅 | claude.ai 안에서만 되는 기능을 쓴다 | 서버리스 함수 + Claude API 키(사용량만큼 과금) |
| 🎨 그림 관리 | claude.ai 자산 저장소를 쓴다 | 필요 없음 — 그림은 `assets/`에 고정 |
| 권리분석 노트·퀴즈 | 연습장 쪽 기능 | 코드에는 남아 있고 화면에서만 숨겼다 |

## 나중에 붙일 것 (서버가 필요해지는 순간)

- **이번 주 경매 랭킹**: 지금은 "내 기록"만 보인다. 전체 순위를 보여 주려면
  기록을 모으는 DB가 필요하다 → Supabase(무료) 테이블 하나 + 공개 키로 충분하다.
- **기기 간 저장**: 로그인 + DB.
- 둘 다 게임 코드는 그대로 두고 저장 부분만 바꾸면 된다.

## 고치고 다시 만들기

```
cd src
python3 merge.py                               # 소스 → rights-study.html (연습장 번들)
python3 build_standalone.py ../site            # 번들 → 독립 버전
```
⚠️ `build_standalone.py`는 그림을 `_blob/<id>` 에서 복사한다. 이미 `site/assets/<id>.webp`에
있으므로, 새 그림을 넣을 때만 `_blob/`에 같은 이름으로 넣어 주면 된다.

테스트(`src/tests/`)는 Playwright로 로컬 서버(`srv.py`, 8765)를 띄워 돌린다.
