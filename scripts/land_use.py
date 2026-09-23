"""토지이용계획(지역지구) 조회 — 정비구역인지 직접 확인한다 (CLAUDE.md 50-1절).

50절이 "동네에 비싼 구축이 몰려 있다"로 **간접 추정**하던 것을, 이 모듈은
그 필지의 지역지구 지정 내역을 직접 읽어 확인한다.

⚠️ **검증 상태가 항목마다 다르다 — 섞어서 믿지 않는다.**

| 항목 | 상태 |
|---|---|
| PNU 구성 규칙 (10+1+4+4=19자리) | ✅ 실제 예시로 확인 (`1126010200100830008`) |
| 엔드포인트·파라미터 (`api.vworld.kr/ned/data/getLandUseAttr`, `key`/`pnu`/`format`) | ⚠️ 실제로 동작하는 공개 구현체의 소스로 확인 — 공식 기술문서는 못 봄 |
| 응답 필드명 (`prposAreaDstrcCodeNm` 등) | ⚠️ 같은 출처로 확인 |

이 환경에서 `data.go.kr`·`vworld.kr` 접속이 egress 정책으로 막혀 있어 공식
문서를 직접 열지 못했다. 그래서 **추측으로 짓지 않고**, 실제로 이 API를 호출해
동작하는 공개 구현체가 쓰는 URL·파라미터·필드명을 그대로 옮겼다.

⚠️ 필드명이나 URL이 틀려도 **틀린 값이 아니라 "못 찾음"으로 드러난다**(40절과
같은 설계) — `parse_zone_names()`가 아는 필드를 못 찾으면 빈 목록을 돌려주고,
그러면 경고가 안 뜰 뿐 매도가 계산은 그대로 간다.

⚠️ **키가 MOLIT이 아니라 브이월드(VWorld) 키다.** 이 API는 공공데이터포털이
아니라 국가공간정보포털(NED)이 브이월드를 통해 제공한다 — `vworld.kr`에서
무료로 발급받아 `VWORLD_API_KEY` 환경변수로 넣는다(6절 원칙 그대로, 코드에
하드코딩하지 않는다).
"""

import json
import os
import urllib.parse
from urllib.error import HTTPError, URLError
from urllib.request import Request

# 연결을 재사용하는 urlopen (http_pool 참고) — 먼 서버일수록 악수 비용이 커서,
# 호출마다 연결을 새로 맺던 예전 방식은 그 왕복을 매번 다시 치렀다.
# HTTP_POOL=0 으로 언제든 예전 동작으로 되돌릴 수 있다.
from http_pool import urlopen

try:
    from env_file import load_env
    load_env()
except ImportError:
    pass

# 브이월드 NED 토지이용계획속성 조회. `LAND_USE_API_URL`로 덮어쓸 수 있다 —
# 실제 응답을 보고 다른 엔드포인트로 바꿔야 할 때 코드를 안 고치기 위해서다.
DEFAULT_LAND_USE_URL = "https://api.vworld.kr/ned/data/getLandUseAttr"
LAND_USE_BASE_URL = os.environ.get("LAND_USE_API_URL", "").strip() or DEFAULT_LAND_USE_URL

# ⚠️ 공개 구현체로 확인한 필드명. 실제 응답이 다르면 여기만 고치면 된다.
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

    응답이 `{"landUses": {"field": [...]}}`인지 `{"items": [...]}`인지 등
    감싸는 구조는 확신할 수 없으므로, **어떤 깊이에 있든 아는 필드명을 가진
    dict를 전부 훑어서** 찾는다 — 구조 추측을 피하는 방법이다.
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
    실패해도 계산을 막지 않는다" 원칙. 키가 없거나, 엔드포인트가 죽었거나,
    네트워크가 끊겨도 매도가 계산은 그대로 간다.

    ⚠️ 그래서 **왜 못 가져왔는지는 여기서 알 수 없다** — 진단이 필요하면
    `probe_land_use()`를 쓴다(70-2절).
    """
    return probe_land_use(b_code, main_no, sub_no, is_mountain, timeout)["zones"]


def probe_land_use(b_code: str, main_no, sub_no, is_mountain: bool = False,
                    timeout: int = 8) -> dict:
    """위와 같은 조회를 하되 **왜 실패했는지까지** 돌려준다 (70-2절).

    `get_land_use_zones()`는 다섯 가지 실패를 전부 `None` 하나로 뭉개서,
    화면에서 "키가 안 먹는 것"과 "정비구역이 아닌 것"을 **구분할 수가 없었다**
    — 48-4절이 제일 비싸게 배운 "조용히 틀리는" 패턴이다.

    반환: `{"status", "detail", "zones", "pnu", "sample"}`
    - `status`: no_endpoint / no_key / bad_pnu / call_failed / unreadable / ok
    - `sample`: 실제 응답 앞부분(필드명 확인용). ⚠️ **키는 절대 담지 않는다.**
    """
    out = {"status": "ok", "detail": "", "zones": None, "pnu": None, "sample": ""}
    if not LAND_USE_BASE_URL:
        out.update(status="no_endpoint", detail="엔드포인트가 비어 있습니다.")
        return out
    service_key = os.environ.get("VWORLD_API_KEY", "").strip()
    if not service_key:
        out.update(status="no_key",
                   detail="VWORLD_API_KEY 환경변수가 서버에 없습니다.")
        return out
    pnu = build_pnu(b_code, main_no, sub_no, is_mountain)
    if not pnu:
        out.update(status="bad_pnu",
                   detail=f"PNU를 만들지 못했습니다 (b_code={b_code!r}, "
                          f"본번={main_no!r}, 부번={sub_no!r}).")
        return out
    out["pnu"] = pnu

    params = {
        "key": service_key,
        "pnu": pnu,
        "format": "json",
        "numOfRows": "100",
        "pageNo": "1",
    }
    # 브이월드 키는 도메인을 등록해 쓰는 경우가 있어, 설정돼 있으면 같이 보낸다.
    domain = os.environ.get("VWORLD_DOMAIN", "").strip()
    if domain:
        params["domain"] = domain

    url = f"{LAND_USE_BASE_URL}?{urllib.parse.urlencode(params)}"
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
        payload = json.loads(raw)
    except (OSError, ValueError) as e:   # 54절 — 타임아웃·인코딩 오류까지
        out.update(status="call_failed",
                   detail=f"{type(e).__name__}: {str(e)[:160]}")
        return out

    # ⚠️ 응답 앞부분을 그대로 보여준다 — 50-1절이 "응답 필드명을 실측으로
    #    확인 못 했다"고 남겨둔 것을 이 한 줄로 끝낼 수 있다. 다만 **키가
    #    섞여 들어가면 안 되므로** 혹시 모를 에코를 지운다.
    out["sample"] = raw[:1200].replace(service_key, "***")
    zones = parse_zone_names(payload)
    out["zones"] = zones
    if not zones:
        out.update(status="unreadable",
                   detail="응답은 받았는데 아는 필드명으로 지역지구를 찾지 "
                          "못했습니다 — 필드명이 다르거나 이 필지에 지정된 "
                          "지역지구가 없습니다.")
    return out
