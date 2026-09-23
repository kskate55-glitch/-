"""
임장(현장답사) 시 바로 전화해볼 수 있는 "인근 중개업소" 목록을 찾는다.
CLAUDE.md 21절 규칙. 시/도별로 데이터 소스가 다르다.

서울특별시 — data/brokers_seoul.csv (사용자가 서울 열린데이터광장에서 직접
    받아 저장한 공인중개사사무소 정보 전체 스냅샷). 지번/도로명주소가 있어
    geocode.py로 지오코딩해서 5절과 같은 방식으로 실제 반경 기준 거리순
    정렬이 가능하다. 파일이 매우 커서(2.5만 건 안팎) 대상 동(법정동)으로
    먼저 좁힌 뒤에만 지오코딩한다 — 그래도 한 동에 수백 건인 경우가 있어
    MAX_CANDIDATES로 상한을 둔다 (그 이상이면 안내만 하고 일부만 계산).

경기도 — 경기데이터드림 오픈API(Rlestatebrkragofc)를 그때그때 직접 호출한다.
    ⚠️ 이 API는 시군명(SIGUN_NM) 단위로만 조회되고 응답에 개별 사무소
    주소(지번/도로명)가 없어 반경 계산이 불가능하다 — 법정동명(LEGALDONG_NM)이
    대상 물건의 동과 일치하는지로만 좁힌다. 실제 응답이 여기 적은 필드명과
    다르면(예: SIGUN_NM이 "성남시 분당구"처럼 구까지 포함되는지 등) 사용자에게
    실제 응답을 보여달라고 해서 고친다 — 페이지에 있던 항목 설명만 보고 만든
    "추정" 스펙이다.

서울/경기 외 지역은 아직 데이터 소스가 없어 조용히 생략한다.
"""

import csv
import json
import os
import urllib.parse
from urllib.error import HTTPError, URLError
from urllib.request import Request

# 연결을 재사용하는 urlopen (http_pool 참고) — 먼 서버일수록 악수 비용이 커서,
# 호출마다 연결을 새로 맺던 예전 방식은 그 왕복을 매번 다시 치렀다.
# HTTP_POOL=0 으로 언제든 예전 동작으로 되돌릴 수 있다.
from http_pool import urlopen

MAX_CANDIDATES = 80  # 한 동에 이보다 많은 영업중 사무소가 있으면 상한까지만 지오코딩한다

GG_BASE_URL = "https://openapi.gg.go.kr/Rlestatebrkragofc"


def _get_gg_key() -> str:
    key = os.environ.get("GG_DATA_KEY")
    if not key:
        raise RuntimeError(
            "환경변수 GG_DATA_KEY가 설정되지 않았습니다.\n"
            ".env에 GG_DATA_KEY=발급받은_인증키 를 추가해 주세요 "
            "(경기데이터드림 openapi.gg.go.kr에서 별도 발급 — MOLIT/카카오 키와는 다른 키)."
        )
    return key


def load_seoul_brokers(csv_path: str) -> list[dict]:
    if not os.path.exists(csv_path):
        return []
    try:
        with open(csv_path, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
    except UnicodeDecodeError:
        with open(csv_path, encoding="cp949") as f:
            rows = list(csv.DictReader(f))
    return rows


def find_nearby_brokers_seoul(rows: list[dict], subject_coord: tuple[float, float],
                               dong: str, radius_m: float = 1000) -> tuple[list[dict], bool]:
    """CLAUDE.md 21절: 같은 법정동 + 영업중인 사무소만 남긴 뒤 지오코딩해서
    실제 반경 안, 가까운 순으로 정렬한다."""
    from geocode import geocode, haversine_m

    candidates = [
        r for r in rows
        if r.get("법정동명", "").strip() == dong.strip() and r.get("상태구분", "").strip() == "영업중"
    ]
    truncated = len(candidates) > MAX_CANDIDATES
    candidates = candidates[:MAX_CANDIDATES]

    subject_lat, subject_lon = subject_coord
    out = []
    for r in candidates:
        addr = r.get("주소", "").strip()
        if not addr:
            continue
        coord = geocode(addr)
        if coord is None:
            continue
        distance = haversine_m(subject_lat, subject_lon, coord[0], coord[1])
        if distance > radius_m:
            continue
        out.append({
            "name": r.get("사업자상호", "(상호없음)"),
            "broker_name": r.get("중개업자명", ""),
            "tel": r.get("전화번호", ""),
            "distance_m": distance,
        })

    out.sort(key=lambda x: x["distance_m"])
    return out, truncated


def find_brokers_gyeonggi(sigun_nm: str, dong: str, num_of_rows: int = 100,
                           timeout: int = 10) -> list[dict]:
    """CLAUDE.md 21절: 경기데이터드림 API로 시/군 전체를 받아 법정동명이 일치하고
    영업중인 사무소만 남긴다. 개별 주소가 없어 거리순 정렬은 불가능하다."""
    key = _get_gg_key()
    params = (
        f"KEY={key}&Type=json&pIndex=1&pSize={num_of_rows}"
        f"&SIGUN_NM={urllib.parse.quote(sigun_nm)}"
    )
    url = f"{GG_BASE_URL}?{params}"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})

    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except (OSError, ValueError):   # 54절 — 타임아웃·인코딩 오류까지
        return []

    try:
        data = json.loads(raw)
    except ValueError:                # 54절 — UnicodeDecodeError도 ValueError다
        return []  # 예상과 다른 응답 형식 — 실제 응답을 보고 고쳐야 함

    rows = data.get("Rlestatebrkragofc", [])
    items = []
    for block in rows:
        items.extend(block.get("row", []))

    out = []
    for item in items:
        if item.get("LEGALDONG_NM", "").strip() != dong.strip():
            continue
        if "영업" not in item.get("STATE_DIV_NM", ""):
            continue
        out.append({
            "name": item.get("BIZMAN_CMPNM_INFO", "(상호없음)"),
            "broker_name": item.get("BRKR_NM", ""),
            "tel": item.get("TELNO_INFO", ""),
        })

    out.sort(key=lambda x: x["name"])
    return out
