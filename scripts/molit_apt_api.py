"""
국토교통부 아파트 매매 실거래가 API 클라이언트 (CLAUDE.md 40절)
========================================================
빌라(연립다세대) 시세를 판단할 때 "인근 아파트보다 비싸면 잘 안 팔린다"는
기준선을 세우기 위해, 같은 동네 아파트 실거래가를 따로 받아온다.

API 기본 정보
- Endpoint : https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade   ✅ 실측 확인
- Operation: getRTMSDataSvcAptTrade                                ✅ 실측 확인
- 데이터포맷: XML                                                   ✅ 실측 확인
- 요청 파라미터·에러코드·인증키는 연립다세대 API(molit_rhtrade_api.py)와 동일하다
  (같은 제공기관 1613000, 같은 계정 인증키 `MOLIT_SERVICE_KEY`를 그대로 쓴다).

✅ **실측으로 확인했다** — 사용자가 실제로 강북구(11305) 2026-04~07을
   조회해서 205/196/109/132건을 받았고, **받은 행이 전부 `normalize_apt_row()`를
   통과했다**(205건 중 205건). 즉 계산에 필요한 필드
   (umdNm·excluUseAr·dealAmount·dealYear·dealMonth)가 연립다세대 API와 같은
   이름으로 온다는 뜻이다. 오퍼레이션명도 이 값이 맞다.

   - 단지명 필드만은 여전히 후보를 여러 개 받아둔다(`NAME_FIELDS`) — 아파트는
     `aptNm`이 표준으로 알려져 있지만 연립다세대는 `mhouseNm`이라 규격이
     통일돼 있지 않고, 단지명은 계산에 안 쓰여서 틀려도 "(단지명없음)"으로
     표시될 뿐 숫자에는 영향이 없다.
   - 필수 필드를 못 찾은 행은 조용히 버린다 — **필드명이 틀리면 "숫자가
     틀리는" 게 아니라 "0건"으로 나오므로** 화면에서 바로 알아챌 수 있다.

⚠️ 이 스크립트는 Claude 샌드박스에서 실행할 수 없다 — apis.data.go.kr이
   허용 목록에 없어 403으로 막힌다(2절). 본인 PC/서버에서 실행한다.

사용 예:
    MOLIT_SERVICE_KEY="발급받은_인증키" python scripts/molit_apt_api.py 11305 202607 202608
"""

import os
import sys

# 요청/에러처리/페이지네이션/저장 로직은 연립다세대 클라이언트와 완전히 같다 —
# 같은 제공기관의 같은 규격이라 복사본을 만들지 않고 그대로 재사용한다.
from molit_rhtrade_api import (  # noqa: F401  (재노출)
    ERROR_MESSAGES,
    _get_service_key,
    _parse_response,
    _rows_to_xml,
)
from molit_rhtrade_api import fetch_rhtrade as _fetch_generic

# .env에 적어둔 키를 환경변수로 올린다 (6절) — 이미 설정된 값은 안 덮어쓴다.
try:
    from env_file import load_env
    load_env()
except ImportError:  # 다른 경로에서 import될 때도 죽지 않게
    pass


BASE = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade"
OPERATION = "getRTMSDataSvcAptTrade"  # ✅ 실측 확인 (강북구 2026-04~07)
BASE_URL = f"{BASE}/{OPERATION}"

# 단지명이 올 수 있는 필드 이름 후보. 아파트 API는 aptNm이 표준으로 알려져
# 있지만, 연립다세대는 mhouseNm이라 규격이 통일돼 있지 않다 — 확인 전까지
# 둘 다(그리고 오피스텔 표기까지) 받아둔다.
NAME_FIELDS = ("aptNm", "mhouseNm", "offiNm", "apartmentName", "aptName")
# 계산에 반드시 필요한 필드 — 하나라도 없으면 그 행은 버린다.
REQUIRED_FIELDS = ("umdNm", "excluUseAr", "dealAmount", "dealYear", "dealMonth")


def fetch_apt_trade(lawd_cd: str, deal_ymd: str, page_no: int = 1,
                     num_of_rows: int = 1000, retries: int = 3, timeout: int = 10) -> list[dict]:
    """아파트 매매 실거래가 조회. 파라미터·반환 형태는 연립다세대와 동일하다."""
    import molit_rhtrade_api as rh

    saved = rh.BASE_URL
    rh.BASE_URL = BASE_URL  # 같은 요청 로직을 엔드포인트만 바꿔 재사용
    try:
        return _fetch_generic(lawd_cd, deal_ymd, page_no=page_no,
                              num_of_rows=num_of_rows, retries=retries, timeout=timeout)
    finally:
        rh.BASE_URL = saved


def fetch_all_pages(lawd_cd: str, deal_ymd: str, page_size: int = 1000) -> list[dict]:
    """totalCount 대신 "가져온 건수 < 요청 건수"로 마지막 페이지를 판단한다
    (연립다세대 클라이언트와 같은 방식)."""
    all_rows = []
    page_no = 1
    while True:
        rows = fetch_apt_trade(lawd_cd, deal_ymd, page_no=page_no, num_of_rows=page_size)
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        page_no += 1
    return all_rows


def normalize_apt_row(row: dict) -> dict | None:
    """응답 필드명 차이를 흡수해서 이 프로젝트의 공통 스키마로 맞춘다.

    단지명 필드만 이름이 갈릴 수 있어 후보를 순서대로 찾고, 나머지는
    연립다세대와 같은 이름을 그대로 쓴다. 계산에 필요한 필드를 못 찾으면
    `None`을 돌려줘서 호출부가 그 행을 버리게 한다 — 필드명을 잘못
    짚었을 때 엉뚱한 숫자가 나오는 대신 "0건"으로 드러나게 하기 위함이다."""
    if any(not (row.get(f) or "").strip() for f in REQUIRED_FIELDS):
        return None
    name = ""
    for field in NAME_FIELDS:
        if (row.get(field) or "").strip():
            name = row[field].strip()
            break
    out = dict(row)
    out["mhouseNm"] = name or "(단지명없음)"  # 나머지 절의 공통 키에 맞춘다
    return out


def save_rows(lawd_cd: str, deal_ymd: str, rows: list[dict], out_dir: str = "data/raw_apt") -> str:
    """연립다세대와 분리된 폴더(`data/raw_apt/`)에 저장한다 — 섞이면 8절
    비교거래 계산에 아파트가 딸려 들어간다."""
    dir_path = os.path.join(out_dir, lawd_cd)
    os.makedirs(dir_path, exist_ok=True)
    path = os.path.join(dir_path, f"{deal_ymd}.xml")
    with open(path, "w", encoding="utf-8") as f:
        f.write(_rows_to_xml(rows))
    return path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("사용법: python molit_apt_api.py <LAWD_CD> <DEAL_YMD> [DEAL_YMD2 ...]")
        print('예시  : MOLIT_SERVICE_KEY="발급받은_인증키" python scripts/molit_apt_api.py 11305 202607')
        sys.exit(1)
    lawd = sys.argv[1]
    for ymd in sys.argv[2:]:
        rows = fetch_all_pages(lawd, ymd)
        usable = [r for r in (normalize_apt_row(r) for r in rows) if r]
        path = save_rows(lawd, ymd, rows)
        print(f"{lawd} / {ymd} : 총 {len(rows)}건(계산에 쓸 수 있는 행 {len(usable)}건) -> {path}")
        if rows and not usable:
            print("  ⚠️ 응답은 왔는데 필요한 필드를 못 찾았습니다 — 아래 필드 목록을 알려주세요:")
            print("     ", ", ".join(sorted(rows[0].keys())))
