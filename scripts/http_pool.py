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


# ⚠️ `urllib.request.urlopen`은 3xx 리다이렉트를 **자동으로 따라간다**.
# `http.client`는 안 따라간다 — 그냥 리다이렉트 응답 본문을 돌려준다.
# 그대로 두면 서버가 경로를 옮기거나 http→https로 올려보내는 순간
# **국토부 XML 대신 빈 리다이렉트 페이지를, 카카오 JSON 대신 HTML을** 받게 되고,
# 화면에는 "데이터를 못 찾음"으로만 보인다(48-4·48-7절과 같은 조용히 틀리는 실패).
# 그래서 여기서도 urllib과 똑같이 따라간다.
MAX_REDIRECTS = 5
_REDIRECT_CODES = (301, 302, 303, 307, 308)


def urlopen(req, timeout: float = 10, **kwargs):
    """`urllib.request.urlopen`과 같은 자리에 끼워 넣는 드롭인."""
    if not pooling_enabled() or kwargs:
        return urllib.request.urlopen(req, timeout=timeout, **kwargs)

    if isinstance(req, str):
        req = urllib.request.Request(req)

    for _ in range(MAX_REDIRECTS + 1):
        resp = _request_once(req, timeout)
        if resp.status not in _REDIRECT_CODES:
            return resp
        location = resp.headers.get("Location")
        if not location:
            return resp
        target = urllib.parse.urljoin(req.full_url, location)
        # urllib과 같은 규칙: 301/302/303 + POST 는 GET으로 바뀌고 본문을 버린다.
        # 307/308 은 메서드·본문을 그대로 유지한다.
        data, method = req.data, req.get_method()
        if resp.status in (301, 302, 303) and method != "HEAD":
            data, method = None, "GET"
        headers = {k: v for k, v in req.header_items()}
        if urllib.parse.urlsplit(target).netloc != urllib.parse.urlsplit(req.full_url).netloc:
            # 다른 호스트로 넘어갈 때 인증 헤더를 딸려 보내지 않는다 — 카카오
            # REST 키·슈퍼베이스 서비스 키가 엉뚱한 서버로 새면 안 된다(6절).
            headers = {k: v for k, v in headers.items()
                       if k.lower() not in ("authorization", "apikey", "cookie")}
        req = urllib.request.Request(target, data=data, headers=headers, method=method)
    raise urllib.error.HTTPError(req.full_url, 310, "리다이렉트가 너무 많습니다",
                                 resp.headers, io.BytesIO(b""))


def _request_once(req, timeout: float):
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
