"""JSON 캐시 파일을 안전하게 읽고 쓴다 (CLAUDE.md 53절).

⚠️ **실제로 서비스를 통째로 멈춰 세운 버그에서 나온 모듈이다.**

예전 코드는 어디서나 이 두 줄이었다:

    with open(path, "w", ...) as f:      # ← 여는 순간 파일이 비워진다
        json.dump(cache, f, ...)         # ← 여기서 죽으면 반쪽짜리 파일이 남는다

    with open(path) as f:
        return json.load(f)              # ← 반쪽짜리를 만나면 JSONDecodeError

`"w"`는 **여는 즉시 기존 내용을 지운다.** 그래서 쓰는 도중에 프로세스가
죽거나(Render 무료 티어의 gunicorn 워커 타임아웃·재시작) 두 워커가 동시에
쓰면 파일이 깨진 채 남고, 그 뒤로는 **읽을 때마다 영영 JSONDecodeError**가
난다 — 한 번 깨지면 저절로 낫지 않는다.

두 가지로 막는다:

1. `read_json()` — 깨진 파일은 **없는 것으로 친다**. 캐시를 잃는 건 느려질
   뿐이지만, 못 읽는 캐시는 기능을 통째로 멈춘다.
2. `write_json()` — 임시 파일에 다 쓰고 `os.replace()`로 **원자적으로**
   갈아끼운다. 죽더라도 **이전 파일이 멀쩡하게 남는다**(os.replace는 POSIX
   에서 원자적이라 반쪽짜리가 보이는 순간 자체가 없다). 프로세스가 여러 개
   여도 성립한다 — `threading.Lock`은 한 프로세스 안에서만 듣는다.
"""
import json
import os
import tempfile


_MISSING = object()   # ⚠️ None을 "기본값 미지정"으로 쓰면 안 된다 — 호출부가
                      #    `default=None`으로 "없음"을 구분하는 경우가 있어서,
                      #    None을 {}로 바꿔버리면 빈 캐시와 없는 캐시가 뭉개진다
                      #    (실제로 이 실수를 했다 — 캐시가 없는데 "0건"으로 읽혀
                      #    국토부 조회를 건너뛸 뻔했다).


def read_json(path: str, default=_MISSING):
    """캐시를 읽는다. 없거나 깨졌으면 `default`(기본 `{}`)를 돌려준다."""
    if default is _MISSING:
        default = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    # ⚠️ `ValueError`로 넓게 잡는다 — `JSONDecodeError`·`UnicodeDecodeError`가
    #    둘 다 그 하위라서 전보다 좁아지지 않고, **파이썬 3.11부터 아주 긴
    #    숫자 문자열은 `ValueError: Exceeds the limit (4300 digits)`로 죽는다**
    #    (깨진 캐시 파일에 숫자 쓰레기가 남으면 실제로 난다). 53절이 약속한
    #    "깨진 캐시는 없는 것으로 친다"가 그 한 줄에 뚫려 있었다.
    except (ValueError, OSError):
        # 깨진 캐시는 지우고 다시 만든다 — 그대로 두면 다음 호출도 똑같이 죽는다.
        try:
            os.replace(path, path + ".corrupt")
        except OSError:
            pass
        return default


def write_json(path: str, data) -> None:
    """같은 디렉터리의 임시 파일에 쓴 뒤 원자적으로 갈아끼운다."""
    directory = os.path.dirname(path) or "."
    os.makedirs(directory, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=directory, prefix=".tmp-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)          # ← 원자적 교체
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
