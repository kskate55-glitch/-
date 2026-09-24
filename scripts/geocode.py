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

import atexit
import json
import os
import threading
import time
import urllib.parse
from math import atan2, cos, radians, sin, sqrt
from urllib.error import HTTPError, URLError
from urllib.request import Request

# 연결을 재사용하는 urlopen (http_pool 참고) — 먼 서버일수록 악수 비용이 커서,
# 호출마다 연결을 새로 맺던 예전 방식은 그 왕복을 매번 다시 치렀다.
# HTTP_POOL=0 으로 언제든 예전 동작으로 되돌릴 수 있다.
from http_pool import urlopen

import supabase_cache
from json_cache import read_json, write_json

_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
CACHE_PATH = os.path.join(_DATA_DIR, "geocode_cache.json")
KAKAO_URL = "https://dapi.kakao.com/v2/local/search/address.json"
KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

# find_comparables()가 지오코딩을 스레드풀로 병렬 호출하므로, 캐시 파일
# 읽기/쓰기(네트워크 호출 자체는 제외)만 락으로 보호해서 동시 쓰기로 캐시
# 항목이 유실되는 걸 막는다.
_cache_lock = threading.Lock()


# ⚠️ 57절 — **캐시를 메모리에 들고 있는다.** 예전엔 `geocode()`를 부를 때마다
# 캐시 파일을 통째로 읽고(히트여도!) 쓸 때 통째로 다시 썼다. 캐시가 커질수록
# 느려지는 구조라 **쓸수록 사이트가 느려졌다** — 실측:
#
#   캐시 2,000건  → 지오코딩 200번에 디스크만 1.7초
#   캐시 10,000건 → 7.1초
#   캐시 30,000건 → **23.4초**
#
# 게다가 이 작업이 전부 `_cache_lock` 안에서 벌어져 22절 병렬 8워커가 줄을
# 섰다 — 병렬로 만들어 둔 의미가 없었다.
#
# 이제 파일은 **프로세스당 한 번만** 읽고, 쓰기는 모아서 가끔 한다. 캐시를
# 잃어봐야 느려질 뿐이라(53절과 같은 판단) 안전한 맞바꿈이다.
CACHE_FLUSH_EVERY = 50        # 새 항목 이만큼 쌓이면 파일에 쓴다
CACHE_FLUSH_SECONDS = 5.0     # 또는 이 시간이 지나면

_memory: dict[str, dict] = {}          # 경로 -> 내용
_memory_dirty: dict[str, int] = {}
_memory_written: dict[str, float] = {}
_memory_pushed: dict[str, set] = {}     # 62절 — 슈퍼베이스에 이미 올린 키


def _supabase_ns(path: str) -> str:
    """캐시 파일 이름을 슈퍼베이스 묶음 이름으로 쓴다(경로는 환경마다 다르다)."""
    return "geo:" + os.path.basename(path)


def _mem_load(path: str) -> dict:
    """파일을 프로세스당 한 번만 읽고, 그다음부터는 메모리에서 돌려준다.

    ⚠️ 62절 — 파일이 **비어 있을 때만** 슈퍼베이스에서 되살린다. 무료 호스팅은
    재배포 때마다 파일이 날아가는데, 그러면 그 지역을 처음 조회하는 것과
    똑같이 느려진다(57절이 잡아둔 개선이 배포마다 초기화됐다).
    파일이 있으면 건드리지 않는다 — 메모리·파일 경로가 훨씬 빠르고, 슈퍼베이스는
    그 **앞이 아니라 뒤**에 있어야 한다.
    """
    if path not in _memory:
        cache = read_json(path)
        if not cache:
            try:
                restored = supabase_cache.get_all(_supabase_ns(path))
            except Exception:          # noqa: BLE001 — 복구 실패가 계산을 막으면 안 된다
                restored = {}
            if restored:
                cache = restored
                try:
                    write_json(path, cache)     # 파일로도 되살려 둔다
                except OSError:
                    pass
        _memory[path] = cache
        _memory_dirty[path] = 0
        _memory_written[path] = 0.0
        _memory_pushed[path] = set(cache)       # 이미 올라가 있는 키
    return _memory[path]


def _mem_save(path: str, cache: dict, force: bool = False) -> None:
    """메모리를 갱신하고, 쌓였거나 시간이 지났을 때만 파일에 쓴다."""
    _memory[path] = cache
    _memory_dirty[path] = _memory_dirty.get(path, 0) + 1
    now = time.monotonic()
    if (force
            or _memory_dirty[path] >= CACHE_FLUSH_EVERY
            or now - _memory_written.get(path, 0.0) >= CACHE_FLUSH_SECONDS):
        write_json(path, cache)        # 53절 — 원자적 교체
        _memory_dirty[path] = 0
        _memory_written[path] = now
        _push_new_entries(path, cache)  # 62절


def _push_new_entries(path: str, cache: dict, blocking: bool = False) -> None:
    """62절 — 이번에 새로 생긴 항목만 슈퍼베이스에 올린다.

    ⚠️ 매번 캐시 전체를 올리면 수만 건을 반복해서 보내게 된다. 올린 키를
    기억해 두고 **차이분만** 보낸다. 실패해도 조용히 넘어가고, 그 키는
    '아직 안 올림'으로 남아 다음 기회에 다시 시도된다.

    ⚠️ **네트워크는 `_cache_lock` 밖에서 탄다.** 이 함수는 `_save_cache()`를
    통해 락 안에서 불리는데, 여기서 곧바로 HTTP를 치면 **22절 병렬 8워커가
    슈퍼베이스 왕복마다 줄을 선다** — 57절이 없앤 직렬화가 그대로 되살아나고,
    슈퍼베이스가 느리거나 (무료 플랜) 7일 정지에서 깨어나는 중이면 지오코딩
    전체가 그만큼 멈춘다. 캐시를 남기려다 계산을 느리게 만들면 본말전도다.
    그래서 올릴 것만 락 안에서 복사해 두고 **백그라운드 스레드**에 넘긴다.
    `blocking=True`는 프로세스 종료 직전(`flush_caches`)에만 쓴다 — 그때는
    데몬 스레드가 영영 안 돌 수 있어서 그 자리에서 보내야 한다.
    """
    if not supabase_cache.enabled():
        return
    pushed = _memory_pushed.setdefault(path, set())
    fresh = {k: cache[k] for k in cache.keys() - pushed}
    if not fresh:
        return
    # 낙관적으로 먼저 '올림' 표시 — 실패하면 아래에서 되돌린다. 안 그러면
    # 응답을 기다리는 동안 다음 플러시가 같은 항목을 또 보낸다.
    pushed.update(fresh)
    ns = _supabase_ns(path)

    def _send():
        ok = False
        try:
            ok = supabase_cache.put_many(ns, fresh)
        except Exception:    # noqa: BLE001
            ok = False
        if not ok:
            with _cache_lock:
                _memory_pushed.get(path, set()).difference_update(fresh)

    if blocking:
        _send()
    else:
        threading.Thread(target=_send, name="supabase-push", daemon=True).start()


def flush_caches() -> None:
    """아직 파일에 안 쓴 캐시를 전부 내려쓴다 (프로세스 종료 시 자동 호출)."""
    for path, cache in list(_memory.items()):
        if _memory_dirty.get(path):
            try:
                write_json(path, cache)
                _memory_dirty[path] = 0
            except OSError:
                pass
        _push_new_entries(path, cache, blocking=True)


atexit.register(flush_caches)


def _load_cache() -> dict:
    # 53절 — 깨진 캐시는 없는 것으로 친다. 예전엔 json.load를 그대로 불러서
    # 파일이 한 번 깨지면 이후 모든 조회가 JSONDecodeError로 죽었다.
    return _mem_load(CACHE_PATH)


def _save_cache(cache: dict) -> None:
    _mem_save(CACHE_PATH, cache)


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
    except (OSError, ValueError):   # 54절 — 타임아웃·인코딩 오류까지
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


# 72-31절 — geocode_full 이 돌려주는 값의 판(schema) 번호. 늘어날 때마다
# 올린다 — 옛 캐시를 그대로 쓰면 새 키가 없어 조용히 옛 동작으로 돌아간다.
_DETAIL_SCHEMA = 2


def geocode_full(address: str) -> dict | None:
    """주소 -> {lat, lon, b_code, main_no, sub_no, is_mountain, jibun, road, sido, sigungu, dong}.

    ⭐ **도로명주소를 넣어도 된다** — 카카오가 지번(address) 쪽을 같이 채워
    주므로 `jibun`에 지번 주소가 그대로 담긴다(72-31절). 호출은 안 는다.
    건축물대장 조회(scripts/building_register.py, CLAUDE.md 20절)에 필요한
    구조화된 값을 카카오 주소 검색 응답에서 그대로 뽑아 쓴다 — 별도 주소
    표준화 API 없이 지오코딩 한 번으로 해결한다.

    ⚠️ 카카오 응답의 address.b_code/main_address_no/sub_address_no/mountain_yn
    필드명에 기반한 것으로, 실제 응답과 다르면 여기를 고쳐야 한다."""
    cache = _load_cache_file(DETAIL_CACHE_PATH)
    if address in cache:
        hit = cache[address]
        # ⚠️ 72-31절에서 돌려주는 값이 늘었다. 예전 캐시에는 새 키가 없으므로
        #    **없는 것으로 치고 다시 물어본다** — 그대로 쓰면 도로명 변환과
        #    지역 판정이 조용히 옛 동작으로 돌아간다(화면으로는 알 수 없다).
        if hit is None or hit.get("v") == _DETAIL_SCHEMA:
            return hit if hit else None

    api_key = _get_api_key()
    url = f"{KAKAO_URL}?query={urllib.parse.quote(address)}"
    req = Request(url, headers={"Authorization": f"KakaoAK {api_key}"})

    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (OSError, ValueError):   # 54절 — 타임아웃·인코딩 오류까지
        return None  # 일시적 실패는 캐시하지 않는다 — 48-7절

    docs = data.get("documents", [])
    if not docs:
        cache[address] = None          # "주소는 멀쩡히 물어봤는데 결과가 없다"만 캐시
        _save_cache_file(DETAIL_CACHE_PATH, cache)
        return None

    addr = docs[0].get("address") or {}
    road = docs[0].get("road_address") or {}
    result = {
        "v": _DETAIL_SCHEMA,
        "lat": float(docs[0]["y"]),
        "lon": float(docs[0]["x"]),
        "b_code": addr.get("b_code"),
        "main_no": addr.get("main_address_no"),
        "sub_no": addr.get("sub_address_no"),
        "is_mountain": addr.get("mountain_yn") == "Y",
        # 72-31절 — 이미 받아오던 응답에서 **읽지 않고 버리던** 값들이다.
        # 카카오가 도로명주소로 검색해도 지번(address) 쪽을 같이 채워 주므로,
        # 이것만 꺼내 쓰면 도로명→지번 변환이 공짜로 된다(호출이 안 는다).
        "jibun": addr.get("address_name") or None,
        "road": road.get("address_name") or None,
        "sido": addr.get("region_1depth_name") or None,
        "sigungu": addr.get("region_2depth_name") or None,
        "dong": addr.get("region_3depth_name") or None,
    }
    cache[address] = result
    _save_cache_file(DETAIL_CACHE_PATH, cache)
    return result


def _load_cache_file(path: str) -> dict:
    return _mem_load(path)             # 53·57절


def _save_cache_file(path: str, cache: dict) -> None:
    _mem_save(path, cache)             # 53·57절


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
    except (OSError, ValueError):   # 54절 — 타임아웃·인코딩 오류까지
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
