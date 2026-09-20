"""
국토교통부 연립다세대(빌라/다세대) 매매 실거래가 API 클라이언트
========================================================
출처: 업로드된 "연립다세대 매매 실거래가 자료 기술문서.hwp" 확인 완료

API 기본 정보 (기술문서 원문 기준)
- 서비스명: 연립다세대 매매 실거래가 자료 (Actual transaction price data for townhouse multi-family housing)
- Endpoint : https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade
- Operation: getRTMSDataSvcRHTrade  (기술문서 표에는 getRTMSDataSvcAptRent로 오탈자가 있으나,
             콜백 URL과 요청 예제에는 getRTMSDataSvcRHTrade로 명시되어 있음 — 이 값이 맞음)
- 인터페이스: REST (GET), 응답 포맷: XML (JSON 미지원)
- 데이터 갱신주기: 일 1회

필수 요청 파라미터
- serviceKey  : 인증키 (URL 인코딩된 값)
- LAWD_CD     : 법정동코드 10자리 중 앞 5자리 (예: 서울 종로구 = 11110)
- DEAL_YMD    : 계약년월 6자리 (예: 202407)
옵션 파라미터
- pageNo      : 페이지번호 (기본 1)
- numOfRows   : 한 페이지 결과 수 (기본 10)

응답 필드 (기술문서 표 그대로)
sggCd, umdNm, mhouseNm, jibun, buildYear, excluUseAr, landAr,
dealYear, dealMonth, dealDay, dealAmount(만원), floor, cdealType,
cdealDay, dealingGbn, estateAgentSggNm, rgstDate, slerGbn, buyerGbn, houseType

에러 코드: 01/02/04/05=제공기관 오류, 03=데이터없음, 10=서비스키 파라미터 누락,
11=필수 파라미터 누락, 12=폐기/잘못된 URL, 20=미승인 활용신청, 22=일일 한도초과,
30=잘못된 서비스키, 31=기간만료, 32=미등록 도메인/IP

⚠️ 보안 원칙 (프로젝트 기준 문서 6절에 따름)
   인증키는 코드에 하드코딩하지 않는다. 반드시 환경변수로 주입한다.
   실행 전: export MOLIT_SERVICE_KEY="발급받은_인증키(URL 인코딩된 값 그대로)"

⚠️ 참고: 이 스크립트는 Claude 샌드박스 환경에서는 실행할 수 없습니다.
   apis.data.go.kr 도메인이 샌드박스 네트워크 허용 목록에 없어 403으로 차단됩니다.
   본인 로컬 환경/서버에서 실행해 주세요.
"""

import os
import sys
import time
import xml.etree.ElementTree as ET
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from xml.sax.saxutils import escape

BASE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade"

ERROR_MESSAGES = {
    "01": "Application Error - 제공기관 서비스 상태 불안정",
    "02": "DB Error - 제공기관 서비스 상태 불안정",
    "03": "No Data - 해당 조건에 데이터 없음 (에러 아님, 빈 결과로 처리)",
    "04": "HTTP Error - 제공기관 서비스 상태 불안정",
    "05": "Service Time Out",
    "10": "잘못된 요청 파라미터 - serviceKey 누락",
    "11": "필수 요청 파라미터 누락 (LAWD_CD/DEAL_YMD 등 확인)",
    "12": "해당 API 서비스 없음/폐기 - URL 확인 필요",
    "20": "서비스 접근 거부 - 활용신청 승인 여부 확인",
    "22": "일일 요청 한도 초과",
    "30": "등록되지 않은 서비스키 - 키 또는 URL 인코딩 확인",
    "31": "기간 만료된 서비스키 - 활용연장신청 필요",
    "32": "등록되지 않은 도메인/IP",
}


def _get_service_key() -> str:
    key = os.environ.get("MOLIT_SERVICE_KEY")
    if not key:
        raise RuntimeError(
            "환경변수 MOLIT_SERVICE_KEY가 설정되지 않았습니다.\n"
            '실행 전: export MOLIT_SERVICE_KEY="발급받은_인증키"'
        )
    return key


def fetch_rhtrade(lawd_cd: str, deal_ymd: str, page_no: int = 1,
                   num_of_rows: int = 100, retries: int = 3, timeout: int = 10) -> list[dict]:
    """
    연립다세대 매매 실거래가 조회

    Args:
        lawd_cd: 법정동코드 앞 5자리 (예: "11110")
        deal_ymd: 계약년월 6자리 (예: "202407")
        page_no: 페이지번호
        num_of_rows: 한 페이지 결과 수 (최대한 크게 잡아 페이지 수 줄이는 것을 권장, 예: 1000)
        retries: 일시적 오류(01/02/04/05) 발생 시 재시도 횟수
        timeout: 초 단위 타임아웃

    Returns:
        각 거래 건을 dict로 담은 list. (totalCount로 페이지네이션 필요 여부 판단 가능)
    """
    service_key = _get_service_key()
    # serviceKey는 이미 URL 인코딩된 값을 그대로 쓴다 (이중 인코딩 금지)
    url = (
        f"{BASE_URL}?serviceKey={service_key}"
        f"&LAWD_CD={lawd_cd}&DEAL_YMD={deal_ymd}"
        f"&pageNo={page_no}&numOfRows={num_of_rows}"
    )

    last_err = None
    for attempt in range(1, retries + 1):
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
            return _parse_response(raw)
        except (HTTPError, URLError) as e:
            last_err = e
            time.sleep(1.5 * attempt)
        except RuntimeError as e:
            # API가 명시적 에러코드를 반환한 경우 (일시적 오류만 재시도)
            msg = str(e)
            if any(f"[{c}]" in msg for c in ("01", "02", "04", "05")):
                last_err = e
                time.sleep(1.5 * attempt)
                continue
            raise
    raise RuntimeError(f"API 호출 {retries}회 실패: {last_err}")


def _parse_response(raw_bytes: bytes) -> list[dict]:
    root = ET.fromstring(raw_bytes)
    result_code = root.findtext(".//resultCode")
    result_msg = root.findtext(".//resultMsg")

    if result_code and result_code != "000":
        note = ERROR_MESSAGES.get(result_code, "알 수 없는 오류")
        if result_code == "03":
            return []  # 데이터 없음은 정상 케이스
        raise RuntimeError(f"[{result_code}] {result_msg} - {note}")

    items = []
    for item in root.findall(".//item"):
        row = {child.tag: (child.text or "").strip() for child in item}
        items.append(row)
    return items


def fetch_all_pages(lawd_cd: str, deal_ymd: str, page_size: int = 1000) -> list[dict]:
    """totalCount를 보고 필요한 만큼 자동 페이지네이션."""
    all_rows = []
    page_no = 1
    while True:
        rows = fetch_rhtrade(lawd_cd, deal_ymd, page_no=page_no, num_of_rows=page_size)
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        page_no += 1
    return all_rows


def _rows_to_xml(rows: list[dict]) -> str:
    """load_transactions()가 파싱할 수 있는 <response>...</response> 형태로 되돌린다."""
    items = []
    for row in rows:
        fields = "".join(f"<{k}>{escape(str(v))}</{k}>" for k, v in row.items())
        items.append(f"<item>{fields}</item>")
    return f"<response><body><items>{''.join(items)}</items></body></response>"


def save_rows(lawd_cd: str, deal_ymd: str, rows: list[dict], out_dir: str = "data/raw") -> str:
    """CLAUDE.md 1절 흐름("결과를 data/raw/에 저장")대로 지역별 하위 폴더에 저장한다."""
    dir_path = os.path.join(out_dir, lawd_cd)
    os.makedirs(dir_path, exist_ok=True)
    path = os.path.join(dir_path, f"{deal_ymd}.xml")
    with open(path, "w", encoding="utf-8") as f:
        f.write(_rows_to_xml(rows))
    return path


if __name__ == "__main__":
    # 사용 예시: python molit_rhtrade_api.py 11110 202408 202409 202410
    if len(sys.argv) < 3:
        print("사용법: python molit_rhtrade_api.py <LAWD_CD> <DEAL_YMD> [DEAL_YMD2 ...]")
        sys.exit(1)
    lawd = sys.argv[1]
    for ymd in sys.argv[2:]:
        rows = fetch_all_pages(lawd, ymd)
        path = save_rows(lawd, ymd, rows)
        print(f"{lawd} / {ymd} : 총 {len(rows)}건 -> {path}")
