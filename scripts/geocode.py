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
import threading
import urllib.parse
from math import atan2, cos, radians, sin, sqrt
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from json_cache import read_json, write_json

_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
CACHE_PATH = os.path.join(_DATA_DIR, "geocode_cache.json")
KAKAO_URL = "https://dapi.kakao.com/v2/local/search/address.json"
KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

# find_comparables()가 지오코딩을 스레드풀로 병렬 호출하므로, 캐시 파일
# 읽기/쓰기(네트워크 호출 자체는 제외)만 락으로 보호해서 동시 쓰기로 캐시
# 항목이 유실되는 걸 막는다.
_cache_lock = threading.Lock()


def _load_cache() -> dict:
    # 53절 — 깨진 캐시는 없는 것으로 친다. 예전엔 json.load를 그대로 불러서
    # 파일이 한 번 깨지면 이후 모든 조회가 JSONDecodeError로 죽었다.
    return read_json(CACHE_PATH)


def _save_cache(cache: dict) -> None:
    write_json(CACHE_PATH, cache)      # 53절 — 원자적 교체


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
    with _cache_lock:
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
        # ⚠️ **일시적 실패는 절대 캐시하지 않는다** (CLAUDE.md 48-7절).
        #    예전엔 여기서도 `cache[address] = None`을 썼는데, 카카오 일일
        #    할당량이 소진되면 HTTPError가 나므로 **그때 조회한 주소가 전부
        #    "지오코딩 불가"로 영구 저장됐다.** 다음 날 할당량이 돌아와도
        #    캐시가 먼저 걸려 다시 물어보지 않으니, 그 주소들은 영영 비교거래에서
        #    빠진다 — 화면에는 그냥 "비교거래가 적네"로만 보여서 알아챌 방법이
        #    없다. 할당량 소진·네트워크 오류는 **주소 문제가 아니므로** 다음
        #    호출 때 다시 시도하게 둔다.
        return None

    docs = data.get("documents", [])
    if not docs:
        with _cache_lock:
            cache = _load_cache()
            cache[address] = None
            _save_cache(cache)
        return None

    lon, lat = float(docs[0]["x"]), float(docs[0]["y"])
    with _cache_lock:
        cache = _load_cache()
        cache[address] = [lat, lon]
        _save_cache(cache)
    return lat, lon


DETAIL_CACHE_PATH = os.path.join(_DATA_DIR, "geocode_detail_cache.json")


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
        return None  # 일시적 실패는 캐시하지 않는다 — 48-7절

    docs = data.get("documents", [])
    if not docs:
        cache[address] = None          # "주소는 멀쩡히 물어봤는데 결과가 없다"만 캐시
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
    return read_json(path)             # 53절


def _save_cache_file(path: str, cache: dict) -> None:
    write_json(path, cache)            # 53절


NEARBY_CACHE_PATH = os.path.join(_DATA_DIR, "nearby_place_cache.json")
_nearby_cache_lock = threading.Lock()


def nearby_place(lat: float, lon: float, keyword: str, radius_m: int = 1000,
                  name_suffix: str | None = None) -> dict | None:
    """좌표 기준 반경 안에서 키워드로 가장 가까운 장소를 찾는다 (CLAUDE.md 19절,
    26절 역세권 프리미엄, 34절 주변 지형 참고에서도 재사용). 결과 없거나 호출
    실패 시 None.

    name_suffix: 결과 중 장소명이 이 문자열로 끝나는 것만 남긴다 — 34절에서
    "산"/"강"/"천" 키워드로 검색할 때, 카카오 키워드 검색은 장소명에 그
    글자가 포함되기만 해도 걸리는 단순 텍스트 매칭이라(예: "산" 검색 시
    "OO부동산"까지 걸림) 이름이 실제로 그 글자로 끝나는 것만 골라 노이즈를
    줄이는 용도다. 완벽한 필터는 아니다("강남부동산"도 "산"으로 끝나진
    않지만 "OO부동산중개"류는 여전히 걸러지지 않을 수 있다).

    좌표를 소수점 5자리(약 1m 오차)로 반올림해서 캐시한다 — 26절처럼 반경 안
    비교거래 수십 건마다 이 함수를 호출하는 경우, 같은 동네를 반복 조회하면
    거의 같은 좌표가 계속 나오므로(같은 건물/인접 건물) 캐시 이득이 크다."""
    cache_key = f"{round(lat, 5)},{round(lon, 5)}|{keyword}|{radius_m}|{name_suffix or ''}"
    with _nearby_cache_lock:
        cache = _load_cache_file(NEARBY_CACHE_PATH)
        if cache_key in cache:
            return cache[cache_key]

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
    if name_suffix:
        docs = [d for d in docs if d.get("place_name", "").endswith(name_suffix)]
    result = {"name": docs[0]["place_name"], "distance_m": int(docs[0]["distance"])} if docs else None

    with _nearby_cache_lock:
        cache = _load_cache_file(NEARBY_CACHE_PATH)
        cache[cache_key] = result
        _save_cache_file(NEARBY_CACHE_PATH, cache)
    return result


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 좌표 사이의 실제 거리(미터)."""
    r = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return r * 2 * atan2(sqrt(a), sqrt(1 - a))
