"""연결을 재사용하는 urlopen 대체 (57절 후속 — 먼 서버일수록 크게 이득).

⚠️ **왜 필요한가.** `urllib.request.urlopen()`은 호출마다 연결을 새로 맺는다.
HTTPS 연결 하나를 맺으려면 요청을 보내기도 전에 왕복이 2~3번 필요하다
(TCP 악수 1번 + TLS 악수 1~2번). 매도가 계산 한 건에 국토부·카카오를 합쳐
150번 넘게 부르는데, 그때마다 이 악수를 처음부터 다시 한다.

서버와 API가 같은 나라에 있으면 왕복이 짧아 티가 안 나지만, 지금처럼 서버가
미국에 있고 데이터는 한국에 있으면 **악수 비용이 실제 데이터를 받는 시간보다
커진다.** 연결을 한 번 맺어 두고 계속 쓰면 그 왕복이 통째로 사라진다.

**설계 메모**
- 연결은 **스레드마다 따로** 들고 있는다(`threading.local`). 22절 병렬 조회가
  워커 8개로 도는데 연결 하나를 같이 쓰면 응답이 섞인다 — `http.client`는
  스레드 안전하지 않다.
- 서버가 쉬는 연결을 먼저 끊는 일이 흔하다. 그래서 **한 번은 조용히 다시
  맺고 재시도**한다(그래도 실패하면 예외를 그대로 올린다).
- 4xx/5xx는 `urllib.error.HTTPError`로 그대로 올린다 — 59절이 `e.code == 429`
  로 초당 제한을 가려내고, 52절이 본문을 읽어 안내 문구를 만든다. 예외 종류가
  바뀌면 그 처리들이 조용히 안 듣게 된다.
- `HTTP_POOL=0`이면 예전 `urlopen`으로 즉시 되돌아간다 — 문제가 생겼을 때
  코드를 되돌리지 않고 환경변수 하나로 끌 수 있어야 한다.
"""
from __future__ import annotations

import http.client
import io
import os
import threading
import urllib.error
import urllib.parse
import urllib.request

ENABLED_ENV = "HTTP_POOL"

_local = threading.local()


def pooling_enabled() -> bool:
    return os.environ.get(ENABLED_ENV, "1").strip() not in ("0", "false", "False", "no")


class _Response:
    """`with urlopen(...) as resp: resp.read()` 패턴을 그대로 쓸 수 있게 하는 껍데기.

    ⚠️ 본문을 **미리 다 읽어서** 들고 있는다 — 다 읽어야 그 연결을 다음 요청에
    재사용할 수 있기 때문이다. 이 프로젝트의 응답은 한 달치 XML이 100KB 안팎이라
    통째로 들고 있어도 문제가 없다.
    """

    def __init__(self, body: bytes, status: int, headers, url: str):
        self._body = body
        self.status = self.code = status
        self.headers = headers
        self.url = url

    def read(self, *_a) -> bytes:
        return self._body

    def geturl(self) -> str:
        return self.url

    def getcode(self) -> int:
        return self.status

    def __enter__(self):
        return self

    def __exit__(self, *_a):
        return False


def _pool() -> dict:
    pool = getattr(_local, "pool", None)
    if pool is None:
        pool = _local.pool = {}
    return pool


def _new_connection(scheme: str, netloc: str, timeout: float):
    cls = http.client.HTTPSConnection if scheme == "https" else http.client.HTTPConnection
    return cls(netloc, timeout=timeout)


def close_all() -> None:
    """이 스레드가 들고 있는 연결을 전부 닫는다(테스트·정리용)."""
    for conn in _pool().values():
        try:
            conn.close()
        except Exception:
            pass
    _pool().clear()


def urlopen(req, timeout: float = 10, **kwargs):
    """`urllib.request.urlopen`과 같은 자리에 끼워 넣는 드롭인."""
    if not pooling_enabled() or kwargs:
        return urllib.request.urlopen(req, timeout=timeout, **kwargs)

    if isinstance(req, str):
        req = urllib.request.Request(req)

    parts = urllib.parse.urlsplit(req.full_url)
    if parts.scheme not in ("http", "https"):
        return urllib.request.urlopen(req, timeout=timeout)

    key = (parts.scheme, parts.netloc)
    path = parts.path or "/"
    if parts.query:
        path += "?" + parts.query
    method = req.get_method()
    body = req.data
    headers = {k: v for k, v in req.header_items()}

    last_err: Exception | None = None
    # 1회차는 들고 있던 연결, 2회차는 새로 맺은 연결 — 서버가 쉬는 연결을
    # 먼저 끊어 놓은 흔한 경우를 조용히 넘기기 위해서다.
    for attempt in (0, 1):
        pool = _pool()
        conn = pool.get(key)
        if conn is None:
            conn = pool[key] = _new_connection(parts.scheme, parts.netloc, timeout)
        else:
            conn.timeout = timeout
            if conn.sock is not None:
                try:
                    conn.sock.settimeout(timeout)
                except OSError:
                    pass
        try:
            conn.request(method, path, body=body, headers=headers)
            resp = conn.getresponse()
            payload = resp.read()
            status, resp_headers = resp.status, resp.headers
            break
        except Exception as e:      # 끊긴 연결·프로토콜 오류 전부
            last_err = e
            try:
                conn.close()
            except Exception:
                pass
            pool.pop(key, None)
            if attempt == 1:
                raise
    else:                            # pragma: no cover - 위에서 반드시 끝난다
        raise last_err               # type: ignore[misc]

    if status >= 400:
        raise urllib.error.HTTPError(
            req.full_url, status, resp_headers.get("reason", "") or http.client.responses.get(status, ""),
            resp_headers, io.BytesIO(payload))

    return _Response(payload, status, resp_headers, req.full_url)
