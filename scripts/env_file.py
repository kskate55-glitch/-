"""저장소 루트의 `.env`를 읽어 환경변수로 올린다 (CLAUDE.md 6절).

⚠️ **이게 없어서 그동안 안내 문구가 거짓말을 하고 있었다.** 여러 스크립트가
"`.env`에 KEY를 추가해 주세요"라고 안내하는데, 정작 `.env`를 읽는 코드가
아무 데도 없어서 파일에 적어놔도 동작하지 않았다.

14절/22절의 "외부 라이브러리 최소화" 원칙대로 `python-dotenv`를 쓰지 않고
표준 라이브러리만으로 구현한다 — 형식이 `KEY=VALUE` 한 줄씩이라 파서가
몇 줄이면 끝난다.

⚠️ **이미 설정된 환경변수는 덮어쓰지 않는다.** 그래야 Render 대시보드나
셸에서 준 값이 항상 파일보다 우선한다(배포 환경에는 `.env`가 아예 없고,
로컬에서 일회성으로 `KEY=... python ...`을 앞에 붙이는 방식도 그대로 먹는다).

⚠️ `.env`는 `.gitignore`에 있어 **git에 올라가지 않는다** — 6절 원칙대로
실제 키 값은 절대 저장소에 들어가면 안 된다. 빈 양식은 `.env.example`에 있다.
"""

import os

# scripts/env_file.py 기준으로 저장소 루트는 한 단계 위다.
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")


def parse_env(text: str) -> dict[str, str]:
    """`.env` 텍스트를 dict로. 빈 줄·주석(#)은 건너뛰고, 값을 감싼 따옴표는 벗긴다.

    `export KEY=VALUE`처럼 앞에 `export`가 붙은 형식도 받아준다 — 셸에서
    쓰던 파일을 그대로 갖다 놓는 경우가 흔해서다.
    """
    out = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if not key:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        out[key] = value
    return out


def load_env(path: str | None = None) -> list[str]:
    """`.env`를 읽어 **아직 설정되지 않은** 환경변수만 채운다.

    새로 채운 키 이름 목록을 돌려준다(값은 절대 돌려주지 않는다 — 실수로
    로그에 찍히는 걸 막기 위해서다). 파일이 없으면 조용히 빈 목록."""
    path = path or ENV_PATH
    try:
        with open(path, encoding="utf-8") as f:
            pairs = parse_env(f.read())
    except (OSError, UnicodeDecodeError):
        return []

    loaded = []
    for key, value in pairs.items():
        if key not in os.environ:           # 이미 있는 값이 항상 이긴다
            os.environ[key] = value
            loaded.append(key)
    return loaded
