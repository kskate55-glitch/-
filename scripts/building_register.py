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

⚠️ 위반건축물 여부는 이 오퍼레이션(및 문서에 포함된 나머지 9개 오퍼레이션:
   getBrBasisOulnInfo/getBrRecapTitleInfo/getBrFlrOulnInfo/getBrAtchJibunInfo/
   getBrExposPubuseAreaInfo/getBrWclfInfo/getBrHsprcInfo/getBrExposInfo/
   getBrJijiguInfo) 어디에도 필드로 존재하지 않는다. 과거 버전 코드는
   regstrKindCdNm에 "위반"이 포함되면 위반건축물로 간주했으나, 이는 잘못된
   가정이었다(문서 확인 결과 regstrKindCdNm은 표제부/총괄표제부/전유부 등
   대장 구분값일 뿐 위반 여부와 무관) — 그래서 위반건축물 판정 기능은
   제거했다. 필요하면 정부24 건축물대장 열람(위반건축물 표시 포함)을
   사용자가 직접 확인하도록 안내한다.
"""

import json
import os
import urllib.parse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE_URL = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo"


def _get_service_key() -> str:
    key = os.environ.get("MOLIT_SERVICE_KEY")
    if not key:
        raise RuntimeError(
            "환경변수 MOLIT_SERVICE_KEY가 설정되지 않았습니다.\n"
            '.env에 MOLIT_SERVICE_KEY="발급받은_인증키" 를 추가해 주세요.'
        )
    return key


def get_building_info(b_code: str, main_no: str, sub_no: str, is_mountain: bool = False,
                       timeout: int = 10) -> dict | None:
    """법정동코드(10자리)+본번+부번으로 건축물대장 표제부를 조회한다.
    조회 실패·결과 없음·키 미설정이면 None을 반환한다 (계산을 막지 않는다)."""
    if not b_code or len(b_code) < 10:
        return None

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
    except (HTTPError, URLError):
        return None

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None  # XML 에러 응답 등 예상과 다른 형식 — 실제 응답을 보고 고쳐야 함

    body = data.get("response", {}).get("body", {})
    items = body.get("items")
    if not items:
        return None
    item = items.get("item")
    if isinstance(item, list):
        if not item:
            return None
        item = item[0]
    if not item:
        return None

    ride_elv = int(item.get("rideUseElvtCnt") or 0)
    emgen_elv = int(item.get("emgenUseElvtCnt") or 0)

    return {
        "household_count": item.get("hhldCnt"),
        "approval_date": item.get("useAprDay"),
        "elevator_count": ride_elv + emgen_elv,
        "has_elevator": (ride_elv + emgen_elv) > 0,
        "registry_kind": (item.get("regstrKindCdNm") or "").strip(),
        "main_purpose": item.get("mainPurpsCdNm"),
        "ground_floors": item.get("grndFlrCnt"),
    }
