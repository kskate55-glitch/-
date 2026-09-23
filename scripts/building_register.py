"""
국토교통부 건축물대장 정보 서비스(건축HUB)로 승강기 유무·세대수·
사용승인일 등을 조회한다. CLAUDE.md 20절 규칙에서 사용한다.

✅ 사용자가 업로드한 공식 기술문서(건축HUB 건축물대장정보 서비스 기술문서,
   getBrTitleInfo 오퍼레이션)로 아래 스펙을 검증 완료했다 — 엔드포인트,
   요청 파라미터, 응답 필드명 모두 문서 기준으로 확인된 값이다.

API 기본 정보
- Endpoint : https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo
  (건축물대장 표제부 — 세대수, 사용승인일, 승강기 수, 대장 종류 등)
- 공공데이터포털에서 "건축물대장정보 서비스"로 검색 → 활용신청 필요
  (매매 API와 provider(1613000)는 같지만 서비스별로 별도 활용신청이 필요하다.
  MOLIT_SERVICE_KEY를 그대로 재사용한다.)
- 파라미터: serviceKey, sigunguCd(5자리), bjdongCd(5자리), platGbCd(0=대지,
  1=산, 2=블록 — 카카오 지오코딩 응답으로는 0/1만 구분 가능해 2는 지원하지
  않는다), bun(지번 본번, 4자리, 0-padding), ji(지번 부번, 4자리, 0-padding),
  numOfRows, pageNo
  → 이 값들은 지번 주소를 직접 쪼개지 않고, geocode.py의 geocode_full()이
    반환하는 법정동코드(b_code)/본번/부번에서 그대로 가져와 쓴다.

응답 필드 (getBrTitleInfo, 일부만 사용 — 문서로 확인됨)
- hhldCnt(세대수), useAprDay(사용승인일 YYYYMMDD), rideUseElvtCnt(승용승강기수),
  emgenUseElvtCnt(비상용승강기수), regstrKindCdNm(대장종류코드명 — "표제부"/
  "총괄표제부"/"전유부"/"일반건축물" 등 대장이 어떤 하위 문서인지 구분하는
  값이다), mainPurpsCdNm(주용도명), grndFlrCnt(지상층수)

위반건축물 여부는 이 API에 필드가 없어 확인하지 않는다 (승강기·세대수·
사용승인일·지상층수만 다룬다).
"""

import json
import os
import urllib.parse
from urllib.error import HTTPError, URLError
from urllib.request import Request

# 연결을 재사용하는 urlopen (http_pool 참고) — 먼 서버일수록 악수 비용이 커서,
# 호출마다 연결을 새로 맺던 예전 방식은 그 왕복을 매번 다시 치렀다.
# HTTP_POOL=0 으로 언제든 예전 동작으로 되돌릴 수 있다.
import threading
import time

from http_pool import urlopen
from json_cache import read_json, write_json

BASE_URL = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo"


def _get_service_key() -> str:
    key = os.environ.get("MOLIT_SERVICE_KEY")
    if not key:
        raise RuntimeError(
            "환경변수 MOLIT_SERVICE_KEY가 설정되지 않았습니다.\n"
            '.env에 MOLIT_SERVICE_KEY="발급받은_인증키" 를 추가해 주세요.'
        )
    return key


# ── 조회 결과 캐시 (CLAUDE.md 72-5절) ──────────────────────────────────
# ⚠️ **재방문 요청의 95%가 이 호출 하나였다**(실측: 캐시가 다 찬 재방문이
#    0.63초인데 그중 0.60초). 건물의 승강기 수·지상층수·세대수·사용승인일은
#    **한 번 지어지면 사실상 안 바뀌는 값**이라 캐시하지 않을 이유가 없었다.
# ⚠️ 53절 원자적 교체·깨진 파일 무시를 그대로 쓴다. 메모리에도 들고 있어서
#    (57절) 같은 프로세스에서 두 번째부터는 파일도 안 읽는다.
# ⚠️ 증축·용도변경이 있으면 값이 바뀔 수 있다 — 그래서 무기한이 아니라
#    `CACHE_TTL_DAYS`(30일)로 끊는다. 그 안에 바뀌는 일은 드물고, 바뀌어도
#    우리가 읽는 네 필드는 41절 판정에만 쓰인다.
CACHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                          "data", "building_cache.json")
CACHE_TTL_DAYS = 30
_cache_lock = threading.Lock()
_write_lock = threading.Lock()
_memory: dict | None = None


def _cache_key(b_code, main_no, sub_no, is_mountain) -> str:
    return f"{b_code}|{main_no}|{sub_no}|{1 if is_mountain else 0}"


def _cache_get(key: str):
    """캐시에 살아 있는 값이 있으면 (True, 값), 없으면 (False, None)."""
    global _memory
    with _cache_lock:
        if _memory is None:
            _memory = read_json(CACHE_PATH, default={})
        hit = _memory.get(key)
    if not isinstance(hit, dict) or "ts" not in hit:
        return False, None
    if time.time() - hit["ts"] > CACHE_TTL_DAYS * 86400:
        return False, None
    return True, hit.get("info")


def _cache_put(key: str, info) -> None:
    global _memory
    with _cache_lock:
        if _memory is None:
            _memory = read_json(CACHE_PATH, default={})
        _memory[key] = {"ts": time.time(), "info": info}
    # ⚠️ **스냅샷과 쓰기를 한 덩어리로 묶는다(72-11절 — 분실 갱신).**
    #    예전엔 락 안에서 스냅샷만 뜨고 쓰기는 밖에서 했는데, 그러면 항목
    #    70개짜리 스냅샷이 72개짜리를 **덮어써서 파일에서 2건이 사라진다**
    #    (12스레드 동시 쓰기 테스트가 가끔 70 != 72로 깨져서 발견했다).
    #    메모리는 멀쩡하지만 파일은 재시작 뒤에 쓰이는 값이라 그냥 두면 안 된다.
    # ⚠️ 쓰기 락은 **읽기(`_cache_get`)를 막지 않는다** — 57절이 없앤
    #    "호출마다 파일 전체를 읽느라 8워커가 줄 서던" 문제가 되살아나지
    #    않게, 이 락은 쓰는 쪽만 줄 세운다. 쓰기는 새 건물을 만났을 때뿐이다.
    with _write_lock:
        with _cache_lock:
            snapshot = dict(_memory)
        try:
            write_json(CACHE_PATH, snapshot)  # 53절 — 원자적 교체
        except OSError:
            pass                              # 못 써도 조회 자체는 이미 성공했다


def _as_count(value) -> int:
    """건축물대장 숫자 필드를 관대하게 읽는다(못 읽으면 0).

    ⚠️ 예전엔 `int(item.get("rideUseElvtCnt") or 0)`이었는데, 값이 `"1.0"`·
    `"-"`·`"없음"`처럼 숫자가 아니면 **`ValueError`가 그대로 터져 나갔다.**
    호출부(webapp/app.py)는 `except RuntimeError`만 잡고 있어서 그 예외가
    Flask까지 올라가 **방문자에게 오류 화면이 갔다** — 20절이 못박은
    "건축물대장 조회 실패는 매도가 계산을 막지 않는다"가 깨지는 것이다.
    실제 응답에 그런 값이 오는지는 확인 못 했지만, 확인 못 한 필드일수록
    **터지지 말고 모르는 값으로 넘어가야 한다**(21절·27절·50-1절 원칙).
    """
    try:
        number = float(str(value).strip())
    except (TypeError, ValueError):
        return 0
    # ⚠️ `float("inf")`·`float("nan")`은 파이썬이 아무 불평 없이 만들어 준다.
    #    거기에 `int()`를 씌우면 각각 `OverflowError`·`ValueError`가 나는데,
    #    둘 다 여기서 안 잡으면 20절 약속이 또 깨진다(72-7절과 같은 함정).
    if number != number or number in (float("inf"), float("-inf")):
        return 0
    return int(number)


def get_building_info(b_code: str, main_no: str, sub_no: str, is_mountain: bool = False,
                       timeout: int = 10) -> dict | None:
    """법정동코드(10자리)+본번+부번으로 건축물대장 표제부를 조회한다.
    조회 실패·결과 없음·키 미설정이면 None을 반환한다 (계산을 막지 않는다)."""
    if not b_code or len(b_code) < 10:
        return None

    key = _cache_key(b_code, main_no, sub_no, is_mountain)
    hit, cached = _cache_get(key)
    if hit:
        return cached

    service_key = _get_service_key()
    sigungu_cd = b_code[:5]
    bjdong_cd = b_code[5:10]
    plat_gb_cd = "1" if is_mountain else "0"
    bun = str(main_no or "0").zfill(4)
    ji = str(sub_no or "0").zfill(4)

    params = (
        f"serviceKey={service_key}&sigunguCd={sigungu_cd}&bjdongCd={bjdong_cd}"
        f"&platGbCd={plat_gb_cd}&bun={bun}&ji={ji}&numOfRows=5&pageNo=1&_type=json"
    )
    url = f"{BASE_URL}?{params}"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})

    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except (OSError, ValueError):   # 54절 — 타임아웃·인코딩 오류까지
        return None

    try:
        data = json.loads(raw)
    except ValueError:                # 54절 — UnicodeDecodeError도 ValueError다
        return None  # XML 에러 응답 등 예상과 다른 형식 — 실제 응답을 보고 고쳐야 함

    # ⚠️ 여기서부터는 **응답을 정상적으로 받아 읽은** 상태다 — 이 결과만
    #    캐시한다. 위쪽의 네트워크·형식 실패는 캐시하지 않는다(48-7절에서
    #    일시적 실패를 영구 저장했다가 그 지역이 영영 안 뜨던 사고가 있었다).
    body = data.get("response", {}).get("body", {})
    items = body.get("items")
    item = items.get("item") if items else None
    if isinstance(item, list):
        item = item[0] if item else None
    if not item:
        # 건축물대장에 없는 건물 — 다시 물어봐야 같은 답이라 이것도 캐시한다.
        _cache_put(key, None)
        return None

    ride_elv = _as_count(item.get("rideUseElvtCnt"))
    emgen_elv = _as_count(item.get("emgenUseElvtCnt"))

    info = {
        "household_count": item.get("hhldCnt"),
        "approval_date": item.get("useAprDay"),
        "elevator_count": ride_elv + emgen_elv,
        "has_elevator": (ride_elv + emgen_elv) > 0,
        "registry_kind": (item.get("regstrKindCdNm") or "").strip(),
        "main_purpose": item.get("mainPurpsCdNm"),
        "ground_floors": item.get("grndFlrCnt"),
    }
    _cache_put(key, info)
    return info


# ── 72-16절 진단 — 이 응답에 **어떤 필드가 오는지** 직접 본다 ──────────────
# ⚠️ 20절이 "검증된 필드 목록에 대지면적이 없다"고 적어둔 것을 여태 확인하지
#    않은 채로 뒀다. 추측으로 필드명을 지어내지 않는다는 원칙(21·27·50-1절)은
#    맞지만, **원칙은 "확인하지 말라"는 뜻이 아니다** — 실제 응답을 한 번
#    보면 끝나는 일이었다.
#
# 왜 지금 필요한가: 백테스트 139건에서 **구축(1999년 이전)이 MAPE 17.1%로
# 2000년대(8.1%)의 두 배**였고, 다중회귀로는 아무것도 설명되지 않았다
# (R²=0.092). 즉 남은 오차는 가중치가 아니라 **없는 정보**다. 구축 빌라 값의
# 상당 부분은 땅이므로 **대지지분**이 가장 유력한 후보이고, 그걸 구하려면
# 대지면적·연면적 필드가 실제로 오는지부터 확인해야 한다.
#
# ⚠️ 50-1절 probe_land_use()와 같은 계약을 따른다 — 다섯 가지 실패를 `None`
#    하나로 뭉개지 않고, 무엇이 막혔는지 화면에 그대로 보여준다.
#    **서비스 키는 절대 담지 않는다**(6절 — 이 화면은 사용자가 캡처해서 보낸다).

# 대지지분을 구하려면 이 셋이 필요하다 — 이름만 모아 두고 실제 응답과 대조한다.
WANTED_FIELDS = {
    "platArea": "대지면적 — 대지지분 계산의 분자",
    "totArea": "연면적 — 대지지분 계산의 분모",
    "archArea": "건축면적",
    "vlRat": "용적률",
    "bcRat": "건폐율",
    "grndFlrCnt": "지상층수 (41절이 이미 쓴다)",
    "hhldCnt": "세대수 (20절이 이미 쓴다)",
    "useAprDay": "사용승인일 (20절이 이미 쓴다)",
    "rideUseElvtCnt": "승용승강기 (20절이 이미 쓴다)",
}
# 위 목록에 없어도 넓이처럼 보이는 필드는 따로 짚어 준다.
_AREA_HINTS = ("area", "ar", "rat", "cnt")


def probe_building_register(b_code: str, main_no, sub_no, is_mountain: bool = False,
                             timeout: int = 10) -> dict:
    """건축물대장 표제부를 조회하되 **응답에 실제로 어떤 필드가 왔는지**까지 돌려준다.

    반환: `{"status", "detail", "fields", "wanted", "area_like", "item", "sample"}`
    - `status`: no_key / bad_input / call_failed / unreadable / not_found / ok
    - `fields`: 응답 item의 모든 키 (정렬)
    - `wanted`: WANTED_FIELDS 중 실제로 온 것 → 값
    - `area_like`: 목록에 없지만 넓이·비율·개수처럼 보이는 필드 → 값
    """
    out = {"status": "ok", "detail": "", "fields": [], "wanted": {},
           "area_like": {}, "item": {}, "sample": "", "url_shape": ""}

    service_key = os.environ.get("MOLIT_SERVICE_KEY", "").strip()
    if not service_key:
        out.update(status="no_key",
                   detail="MOLIT_SERVICE_KEY 환경변수가 서버에 없습니다.")
        return out
    if not b_code or len(str(b_code)) < 10:
        out.update(status="bad_input",
                   detail=f"법정동코드 10자리를 못 만들었습니다 (받은 값: {b_code!r}).")
        return out

    sigungu_cd = str(b_code)[:5]
    bjdong_cd = str(b_code)[5:10]
    plat_gb_cd = "1" if is_mountain else "0"
    bun = str(main_no or "0").zfill(4)
    ji = str(sub_no or "0").zfill(4)
    out["url_shape"] = (f"{BASE_URL}?serviceKey=***&sigunguCd={sigungu_cd}"
                        f"&bjdongCd={bjdong_cd}&platGbCd={plat_gb_cd}"
                        f"&bun={bun}&ji={ji}&numOfRows=5&pageNo=1&_type=json")

    params = (
        f"serviceKey={service_key}&sigunguCd={sigungu_cd}&bjdongCd={bjdong_cd}"
        f"&platGbCd={plat_gb_cd}&bun={bun}&ji={ji}&numOfRows=5&pageNo=1&_type=json"
    )
    req = Request(f"{BASE_URL}?{params}", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
    except (OSError, ValueError) as e:      # 54절 — 타임아웃·인코딩까지
        out.update(status="call_failed",
                   detail=f"{type(e).__name__}: {str(e)[:160]}".replace(service_key, "***"))
        return out

    # ⚠️ 키가 응답에 에코될 수 있으니 무조건 한 번 지운다(6절).
    out["sample"] = raw[:1500].replace(service_key, "***")

    try:
        data = json.loads(raw)
    except ValueError as e:
        out.update(status="unreadable",
                   detail=f"JSON이 아닙니다 ({type(e).__name__}) — XML 오류 페이지일 수 있습니다.")
        return out

    body = (data.get("response") or {}).get("body") or {}
    items = body.get("items")
    item = items.get("item") if isinstance(items, dict) else items
    if isinstance(item, list):
        item = item[0] if item else None
    if not isinstance(item, dict) or not item:
        out.update(status="not_found",
                   detail="응답은 받았는데 표제부 항목이 비어 있습니다 — "
                          "그 지번에 건축물대장이 없거나 지번이 틀렸습니다.")
        return out

    out["item"] = item
    out["fields"] = sorted(item.keys())
    out["wanted"] = {k: item[k] for k in WANTED_FIELDS if k in item}
    out["area_like"] = {
        k: v for k, v in sorted(item.items())
        if k not in WANTED_FIELDS and any(h in k.lower() for h in _AREA_HINTS)
    }
    missing = [k for k in ("platArea", "totArea") if k not in item]
    out["detail"] = ("대지지분을 구할 수 있습니다 (대지면적·연면적이 둘 다 옵니다)."
                     if not missing else
                     f"대지지분 계산에 필요한 {', '.join(missing)}가 응답에 없습니다.")
    return out
