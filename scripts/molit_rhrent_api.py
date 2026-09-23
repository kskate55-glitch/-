"""
국토교통부 연립다세대(빌라/다세대) 전월세 실거래가 API 클라이언트
========================================================
✅ 사용자가 업로드한 공식 기술문서(국토교통부 실거래가 정보 오픈API 활용가이드
   — 연립다세대 전월세 실거래가 자료)로 스펙을 검증했다.

API 기본 정보
- Endpoint : https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent
- 공공데이터포털에서 "연립다세대 전월세 실거래가"로 검색 → 별도로 활용신청 필요
  (매매 API 승인과는 별개의 서비스이다). 인증키는 MOLIT_SERVICE_KEY를 재사용한다.
- 인터페이스: REST (GET), 응답 포맷: XML

필수 요청 파라미터
- serviceKey  : 인증키
- LAWD_CD     : 법정동코드 앞 5자리
- DEAL_YMD    : 계약년월 6자리

응답 필드 (문서로 확인됨)
sggCd, umdNm, houseType(연립/다세대), mhouseNm, jibun, buildYear, excluUseAr,
dealYear, dealMonth, dealDay, deposit(보증금액, 만원), monthlyRent(월세금액, 만원),
floor, contractTerm, contractType, useRRRight, preDeposit, preMonthlyRent.
매매 API와 달리 cdealType(계약해제) 필드는 없다.

⚠️ 이 스크립트도 샌드박스 환경에서는 실행할 수 없다. 본인 로컬 환경에서 실행한다.
"""

import os
import sys
import time
import xml.etree.ElementTree as ET
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from molit_rhtrade_api import ERROR_MESSAGES, _get_service_key, save_rows

# .env에 적어둔 키를 환경변수로 올린다 (6절) — 이미 설정된 값은 안 덮어쓴다.
try:
    from env_file import load_env
    load_env()
except ImportError:  # 다른 경로에서 import될 때도 죽지 않게
    pass


BASE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent"


def fetch_rhrent(lawd_cd: str, deal_ymd: str, page_no: int = 1,
                  num_of_rows: int = 100, retries: int = 3, timeout: int = 10) -> list[dict]:
    service_key = _get_service_key()
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
        # ⚠️ 읽기 타임아웃은 TimeoutError(OSError)라 URLError로는 안 잡힌다 —
        #    그래서 **재시도조차 못 하고** 예외가 그대로 올라갔다(54절).
        #    OSError가 HTTPError·URLError·TimeoutError를 전부 덮는다.
        except OSError as e:
            last_err = e
            time.sleep(1.5 * attempt)
        except RuntimeError as e:
            msg = str(e)
            if any(f"[{c}]" in msg for c in ("01", "02", "04", "05")):
                last_err = e
                time.sleep(1.5 * attempt)
                continue
            raise
    raise RuntimeError(f"API 호출 {retries}회 실패: {last_err}")


def _parse_response(raw_bytes: bytes) -> list[dict]:
    # 52절과 같은 방어 — 한도 초과·점검 시 data.go.kr은 HTTP 200에 HTML/JSON
    # 오류 페이지를 싣는다. 매매 API만 고치고 전월세를 빼두면 16절을 웹에
    # 붙이는 순간 같은 500이 재발한다.
    try:
        root = ET.fromstring(raw_bytes)
    except ET.ParseError:
        head = raw_bytes[:300].decode("utf-8", "replace").strip().replace("\n", " ")
        raise RuntimeError(
            "국토부 전월세 API가 XML이 아닌 응답을 보냈습니다 — 일일 트래픽 한도 "
            f"초과이거나 서비스 점검 중일 수 있습니다. 받은 내용 앞부분: {head[:200]}") from None

    if str(root.tag).split("}")[-1].lower() in ("html", "body", "error", "errors"):
        head = raw_bytes[:300].decode("utf-8", "replace").strip().replace("\n", " ")
        raise RuntimeError(
            "국토부 전월세 API가 실거래 데이터 대신 오류 페이지를 보냈습니다. "
            f"받은 내용 앞부분: {head[:200]}")

    result_code = root.findtext(".//resultCode")
    result_msg = root.findtext(".//resultMsg")

    if result_code and result_code != "000":
        note = ERROR_MESSAGES.get(result_code, "알 수 없는 오류")
        if result_code == "03":
            return []
        raise RuntimeError(f"[{result_code}] {result_msg} - {note}")

    items = []
    for item in root.findall(".//item"):
        row = {child.tag: (child.text or "").strip() for child in item}
        items.append(row)
    return items


def fetch_all_pages(lawd_cd: str, deal_ymd: str, page_size: int = 1000) -> list[dict]:
    all_rows = []
    page_no = 1
    while True:
        rows = fetch_rhrent(lawd_cd, deal_ymd, page_no=page_no, num_of_rows=page_size)
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        page_no += 1
    return all_rows


if __name__ == "__main__":
    # 사용 예시: python molit_rhrent_api.py 11110 202408 202409 202410
    if len(sys.argv) < 3:
        print("사용법: python molit_rhrent_api.py <LAWD_CD> <DEAL_YMD> [DEAL_YMD2 ...]")
        sys.exit(1)
    lawd = sys.argv[1]
    for ymd in sys.argv[2:]:
        rows = fetch_all_pages(lawd, ymd)
        path = save_rows(lawd, ymd, rows, out_dir="data/raw_rent")
        print(f"{lawd} / {ymd} : 총 {len(rows)}건 -> {path}")
