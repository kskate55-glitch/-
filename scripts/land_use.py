"""토지이용계획(지역지구) 조회 — 정비구역인지 직접 확인한다 (CLAUDE.md 50-1절).

50절이 "동네에 비싼 구축이 몰려 있다"로 **간접 추정**하던 것을, 이 모듈은
그 필지의 지역지구 지정 내역을 직접 읽어 확인한다.

⚠️ **검증 상태가 항목마다 다르다 — 섞어서 믿지 않는다.**

| 항목 | 상태 |
|---|---|
| PNU 구성 규칙 (10+1+4+4=19자리) | ✅ 실제 예시로 확인 (`1126010200100830008`) |
| 응답 필드명 (`prposAreaDstrcCodeNm` 등) | ⚠️ 공개 문서·사용 사례로 확인, 공식 기술문서는 못 봄 |
| **엔드포인트 URL·오퍼레이션명** | ❌ **미확인** — `LAND_USE_BASE_URL`을 채워야 동작한다 |

`data.go.kr` 접속이 이 환경에서 막혀 있어 마지막 항목을 확인하지 못했다.
20절 건축물대장·21절 경기데이터드림과 같은 원칙으로 **지어내지 않았다** —
사용자가 활용신청 페이지의 엔드포인트를 알려주면 상수 한 줄만 채우면 된다.

⚠️ 필드명이 틀리면 **틀린 값이 아니라 "못 찾음"으로 드러난다**(40절과 같은
설계) — `parse_zone_names()`가 아는 필드를 못 찾으면 빈 목록을 돌려주고,
그러면 경고가 안 뜰 뿐 매도가 계산은 그대로 간다.
"""

import json
import os
import urllib.parse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from env_file import load_env
    load_env()
except ImportError:
    pass

# ❌ 미확인 — 공공데이터포털 "토지이용계획정보" 활용신청 페이지의 엔드포인트를
#    여기 채운다. 비어 있으면 조회를 아예 시도하지 않는다(조용히 생략).
LAND_USE_BASE_URL = os.environ.get("LAND_USE_API_URL", "").strip()

# ⚠️ 공개 사용 사례로 확인한 필드명. 실제 응답이 다르면 여기만 고치면 된다.
ZONE_NAME_FIELDS = ("prposAreaDstrcCodeNm", "prposAreaDstrcNm", "zoneNm")


def build_pnu(b_code: str, main_no, sub_no, is_mountain: bool = False) -> str | None:
    """필지고유번호(PNU) 19자리를 만든다.

    구성: 법정동코드 10 + 필지구분 1(일반=1, 산=2) + 본번 4 + 부번 4.
    ✅ 실제 예시 `1126010200100830008`로 자릿수를 확인했다.

    ⚠️ 건축물대장(20절)의 `platGbCd`는 **0=대지 / 1=산**이라 규칙이 다르다 —
    같은 `is_mountain` 값에서 서로 다른 숫자가 나가는 게 정상이다.
    """
    if not b_code or len(str(b_code)) < 10:
        return None
    try:
        main = int(main_no or 0)
        sub = int(sub_no or 0)
    except (TypeError, ValueError):
        return None
    if main <= 0:
        return None
    return f"{str(b_code)[:10]}{'2' if is_mountain else '1'}{main:04d}{sub:04d}"


def parse_zone_names(payload) -> list[str]:
    """응답에서 지역지구 이름만 뽑는다. 못 알아보면 **빈 목록**(예외 아님).

    응답 구조가 `{"response": {"body": {"items": {"item": [...]}}}}`인지
    `{"items": [...]}`인지 등은 확인 못 했으므로, **어떤 깊이에 있든 아는
    필드명을 가진 dict를 전부 훑어서** 찾는다 — 구조 추측을 피하는 방법이다.
    """
    found, seen = [], set()

    def walk(node):
        if isinstance(node, dict):
            for key in ZONE_NAME_FIELDS:
                value = node.get(key)
                if isinstance(value, str) and value.strip():
                    name = value.strip()
                    if name not in seen:
                        seen.add(name)
                        found.append(name)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(payload)
    return found


def get_land_use_zones(b_code: str, main_no, sub_no, is_mountain: bool = False,
                        timeout: int = 8) -> list[str] | None:
    """그 필지의 지역지구 이름 목록. 조회할 수 없으면 `None`.

    ⚠️ **실패해도 절대 예외를 던지지 않는다** — 20절/26절과 같은 "참고 정보는
    실패해도 계산을 막지 않는다" 원칙. 키가 없거나, 엔드포인트가 아직 안
    채워졌거나, 네트워크가 죽어도 매도가 계산은 그대로 간다.
    """
    if not LAND_USE_BASE_URL:
        return None
    service_key = os.environ.get("MOLIT_SERVICE_KEY", "").strip()
    if not service_key:
        return None
    pnu = build_pnu(b_code, main_no, sub_no, is_mountain)
    if not pnu:
        return None

    url = (f"{LAND_USE_BASE_URL}?serviceKey={service_key}"
           f"&pnu={urllib.parse.quote(pnu)}&numOfRows=100&pageNo=1&type=json")
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, json.JSONDecodeError, ValueError):
        return None
    return parse_zone_names(payload)
