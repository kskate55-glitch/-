"""슈퍼베이스(Postgres)를 캐시 보관소로 쓰는 얇은 계층 (62절).

⚠️ **슈퍼베이스가 이 서비스를 돌리는 게 아니다.** 계산은 여전히 파이썬 서버가
한다 — 슈퍼베이스는 **재배포해도 안 죽는 저장소** 역할만 맡는다. 무료 호스팅은
배포·재시작 때마다 파일이 날아가서, 57절에서 잡아둔 속도 개선이 매번
초기화되고 있었다(국토부 월별 캐시 + 좌표 캐시 수만 건이 통째로).

**설계 원칙 — 절대 계산을 막지 않는다.**
  파일 캐시 → (없으면) 슈퍼베이스 → (없으면) 원래 API
  어느 단계가 실패하든 조용히 다음 단계로 넘어간다. 슈퍼베이스가 죽어도,
  키가 없어도, 무료 플랜이 7일 무활동으로 잠들어 있어도 **매도가 계산은
  그대로 된다.** 20·21·26·50-1절이 지켜온 "없으면 조용히 생략" 원칙 그대로다.

**⚠️ 메모리·파일 캐시를 대체하지 않고 뒤에 덧댄다.** 57절이 좌표 캐시를
메모리로 올려 150배 빠르게 만든 걸 되돌리면 안 된다 — 슈퍼베이스는 그 앞이
아니라 **뒤**에 있다(파일이 비었을 때 복구해 주고, 새로 생긴 항목을 올려둔다).

**외부 라이브러리를 쓰지 않는다**(14·22절 원칙). psycopg2 대신 슈퍼베이스가
기본 제공하는 REST(PostgREST)를 표준 라이브러리로 호출하고, 60절 연결
재사용까지 그대로 얹는다.

**환경변수** (6절 원칙 — 값은 git에 넣지 않는다)
  SUPABASE_URL          예: https://xxxxx.supabase.co
  SUPABASE_SERVICE_KEY  service_role 키
⚠️ service_role 키는 **서버 전용**이다. 프론트엔드(HTML/JS)에 절대 내보내지
않는다 — 27-1절 KAKAO_JS_KEY와 달리 이 키는 노출되면 DB를 통째로 열어준다.

**필요한 테이블** (슈퍼베이스 SQL Editor에 한 번만 실행)

    create table if not exists cache_entries (
      ns         text        not null,
      k          text        not null,
      v          jsonb       not null,
      updated_at timestamptz not null default now(),
      primary key (ns, k)
    );
    alter table cache_entries enable row level security;
    -- 정책을 안 만들면 service_role 키로만 읽고 쓸 수 있다(원하는 상태다).
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request

from http_pool import urlopen

URL_ENV = "SUPABASE_URL"
KEY_ENV = "SUPABASE_SERVICE_KEY"
TABLE = "cache_entries"
TIMEOUT = 8
PAGE_SIZE = 1000


def _config() -> tuple[str, str] | None:
    url = (os.environ.get(URL_ENV) or "").strip().rstrip("/")
    key = (os.environ.get(KEY_ENV) or "").strip()
    return (url, key) if url and key else None


def enabled() -> bool:
    """키가 둘 다 있어야 켜진다. 없으면 이 모듈은 아무것도 하지 않는다."""
    return _config() is not None


def _request(method: str, query: str, payload=None, extra_headers=None):
    conf = _config()
    if conf is None:
        return None
    url, key = conf
    endpoint = f"{url}/rest/v1/{TABLE}{query}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(endpoint, data=data, headers=headers, method=method)
    with urlopen(req, timeout=TIMEOUT) as resp:
        body = resp.read()
    return json.loads(body.decode("utf-8")) if body else None


def get(ns: str, key: str):
    """한 건 읽기. 없거나 실패하면 None — 호출부는 다음 단계로 넘어가면 된다."""
    try:
        q = (f"?ns=eq.{urllib.parse.quote(ns, safe='')}"
             f"&k=eq.{urllib.parse.quote(key, safe='')}&select=v&limit=1")
        rows = _request("GET", q)
    except Exception:       # noqa: BLE001 — 캐시 실패가 계산을 막으면 안 된다
        return None
    if not rows:
        return None
    return rows[0].get("v")


def put(ns: str, key: str, value) -> bool:
    """한 건 쓰기(있으면 덮어씀). 실패해도 예외를 올리지 않는다."""
    return put_many(ns, {key: value})


def put_many(ns: str, items: dict) -> bool:
    """여러 건을 한 번에 쓴다 — 좌표 캐시처럼 수백 건을 올릴 때 왕복을 아낀다."""
    if not items:
        return True
    rows = [{"ns": ns, "k": str(k), "v": v} for k, v in items.items()]
    try:
        for i in range(0, len(rows), PAGE_SIZE):
            _request("POST", "?on_conflict=ns,k", rows[i:i + PAGE_SIZE],
                     {"Prefer": "resolution=merge-duplicates,return=minimal"})
        return True
    except Exception:       # noqa: BLE001
        return False


def get_all(ns: str, limit: int = 100_000) -> dict:
    """한 묶음(ns) 전체를 내려받는다 — 서버가 새로 떴을 때 파일 캐시를 복구하는 용도.

    ⚠️ 페이지를 나눠 받는다. PostgREST는 기본적으로 한 번에 돌려주는 행 수에
    상한이 있어서, 한 방에 다 받은 줄 알고 넘어가면 **조용히 일부만 복구된다.**
    """
    out: dict = {}
    try:
        offset = 0
        while offset < limit:
            size = min(PAGE_SIZE, limit - offset)
            q = (f"?ns=eq.{urllib.parse.quote(ns, safe='')}&select=k,v"
                 f"&order=k&limit={size}&offset={offset}")
            rows = _request("GET", q)
            if not rows:
                break
            for r in rows:
                out[r["k"]] = r["v"]
            if len(rows) < size:
                break
            offset += len(rows)
    except Exception:       # noqa: BLE001
        return out          # 받은 데까지만 쓴다 — 없는 것보다 낫다
    return out
