"""
카카오 로컬 API로 지번 주소를 위도/경도로 변환한다. CLAUDE.md 5절(반경 기반
비교) 규칙에서 사용한다.

⚠️ https://developers.kakao.com 에서 애플리케이션을 만들고 "REST API 키"를
   발급받아야 한다 (국토부 서비스키와는 별개의 키). 가입 즉시 키가 나오고
   별도 승인 대기가 없다. 환경변수 KAKAO_REST_API_KEY로 주입한다.

⚠️ 이 스크립트도 샌드박스 환경에서는 실행할 수 없다 (kakao.com 도메인이
   허용 목록에 없음). 본인 로컬 환경에서 실행한다.

같은 주소를 반복 조회하지 않도록 data/geocode_cache.json에 결과를 캐시한다.
"""

import json
import os
import urllib.parse
from math import atan2, cos, radians, sin, sqrt
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

CACHE_PATH = os.path.join("data", "geocode_cache.json")
KAKAO_URL = "https://dapi.kakao.com/v2/local/search/address.json"
KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"


def _load_cache() -> dict:
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_cache(cache: dict) -> None:
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def _get_api_key() -> str:
    key = os.environ.get("KAKAO_REST_API_KEY")
    if not key:
        raise RuntimeError(
            "환경변수 KAKAO_REST_API_KEY가 설정되지 않았습니다.\n"
            ".env에 KAKAO_REST_API_KEY=발급받은_REST_API_키 를 추가해 주세요."
        )
    return key


def geocode(address: str) -> tuple[float, float] | None:
    """지번 주소 -> (위도, 경도). 실패하거나 결과가 없으면 None (캐시됨)."""
    cache = _load_cache()
    if address in cache:
        return tuple(cache[address]) if cache[address] else None

    api_key = _get_api_key()
    url = f"{KAKAO_URL}?query={urllib.parse.quote(address)}"
    req = Request(url, headers={"Authorization": f"KakaoAK {api_key}"})

    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, json.JSONDecodeError):
        cache[address] = None
        _save_cache(cache)
        return None

    docs = data.get("documents", [])
    if not docs:
        cache[address] = None
        _save_cache(cache)
        return None

    lon, lat = float(docs[0]["x"]), float(docs[0]["y"])
    cache[address] = [lat, lon]
    _save_cache(cache)
    return lat, lon


DETAIL_CACHE_PATH = os.path.join("data", "geocode_detail_cache.json")


def geocode_full(address: str) -> dict | None:
    """지번 주소 -> {lat, lon, b_code(법정동코드 10자리), main_no, sub_no, is_mountain}.
    건축물대장 조회(scripts/building_register.py, CLAUDE.md 20절)에 필요한
    구조화된 값을 카카오 주소 검색 응답에서 그대로 뽑아 쓴다 — 별도 주소
    표준화 API 없이 지오코딩 한 번으로 해결한다.

    ⚠️ 카카오 응답의 address.b_code/main_address_no/sub_address_no/mountain_yn
    필드명에 기반한 것으로, 실제 응답과 다르면 여기를 고쳐야 한다."""
    cache = _load_cache_file(DETAIL_CACHE_PATH)
    if address in cache:
        return cache[address] if cache[address] else None

    api_key = _get_api_key()
    url = f"{KAKAO_URL}?query={urllib.parse.quote(address)}"
    req = Request(url, headers={"Authorization": f"KakaoAK {api_key}"})

    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, json.JSONDecodeError):
        cache[address] = None
        _save_cache_file(DETAIL_CACHE_PATH, cache)
        return None

    docs = data.get("documents", [])
    if not docs:
        cache[address] = None
        _save_cache_file(DETAIL_CACHE_PATH, cache)
        return None

    addr = docs[0].get("address") or {}
    result = {
        "lat": float(docs[0]["y"]),
        "lon": float(docs[0]["x"]),
        "b_code": addr.get("b_code"),
        "main_no": addr.get("main_address_no"),
        "sub_no": addr.get("sub_address_no"),
        "is_mountain": addr.get("mountain_yn") == "Y",
    }
    cache[address] = result
    _save_cache_file(DETAIL_CACHE_PATH, cache)
    return result


def _load_cache_file(path: str) -> dict:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_cache_file(path: str, cache: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def nearby_place(lat: float, lon: float, keyword: str, radius_m: int = 1000) -> dict | None:
    """좌표 기준 반경 안에서 키워드로 가장 가까운 장소를 찾는다 (CLAUDE.md 19절).
    결과 없거나 호출 실패 시 None. 캐시하지 않는다 — 지오코딩과 달리 매번
    물건마다 다른 키워드/좌표 조합이라 캐시 이득이 적다."""
    api_key = _get_api_key()
    params = (
        f"query={urllib.parse.quote(keyword)}&x={lon}&y={lat}"
        f"&radius={radius_m}&sort=distance"
    )
    url = f"{KAKAO_KEYWORD_URL}?{params}"
    req = Request(url, headers={"Authorization": f"KakaoAK {api_key}"})

    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, json.JSONDecodeError):
        return None

    docs = data.get("documents", [])
    if not docs:
        return None

    nearest = docs[0]
    return {"name": nearest["place_name"], "distance_m": int(nearest["distance"])}


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 좌표 사이의 실제 거리(미터)."""
    r = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return r * 2 * atan2(sqrt(a), sqrt(1 - a))
