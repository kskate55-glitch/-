"""
시장 동향 참고 지표 2종을 보여준다. CLAUDE.md 24절 규칙.

1) KB부동산 스타일 주간 아파트 매수우위지수/전세수급지수 (data/kb_market_index.csv)
2) 한국부동산원 연립다세대 매매수급동향지수 (data/reb_villa_market_index.csv)
   — 이쪽이 우리 프로젝트가 다루는 연립다세대 전용이라 더 직접적인 참고 지표다.

⚠️ 둘 다 사용자가 특정 시점에 한 번 받은 스냅샷이다(자동 갱신되지 않는다) —
   시간이 지날수록 낡은 데이터가 되므로, 출력할 때마다 스냅샷 날짜를 항상
   같이 보여준다. 최신 데이터가 필요하면 각 출처(KB부동산 리브온 /
   한국부동산원 R-ONE)에서 새 파일을 받아 같은 경로에 덮어써야 한다.

두 지표 모두 "지금 이 지역 부동산 시장 전반이 매수자 우위인지 매도자
우위인지" 참고용 맥락으로만 쓴다 — 8절 매도가 계산에 자동 반영하지 않는다
(검증된 보정 공식이 없다). 시/도 단위까지만 있어 구/동 단위 신호는 아니다.

지수 해석 (둘 다 0~200, 기준선 100 — KB 매수우위지수/한국부동산원 매매수급동향
동일한 관례):
- 100 초과: 수요가 공급보다 많다는 응답 비중이 높음 → 매도자 우위 시장(상승 압력)
- 100 미만: 공급이 수요보다 많다는 응답 비중이 높음 → 매수자 우위 시장(하락 압력)
KB 전세수급지수도 같은 기준선(100)으로 해석한다 (초과 시 전세 수요 > 공급).
"""

import csv
import os

_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
CSV_PATH = os.path.join(_DATA_DIR, "kb_market_index.csv")
VILLA_CSV_PATH = os.path.join(_DATA_DIR, "reb_villa_market_index.csv")
VILLA_SEOUL_ZONE_CSV_PATH = os.path.join(_DATA_DIR, "reb_villa_market_index_seoul_zone.csv")

# 서울 5개 생활권 구분(2030 서울생활권계획 기준, 25개 구 전체 매핑) — 한국부동산원
# 원본 CSV에 이미 이 권역 단위로 더 세분화된 데이터가 있어서, 시/도 전체(서울 하나)
# 보다 구 단위에 가까운 참고치를 보여줄 수 있다. 경기/부산도 원본에 권역 데이터가
# 있지만(경기 7권역, 부산 3권역) 구성 시/군/구를 신뢰할 수 있게 확인하지 못해
# 아직 추가하지 않았다 — 시/도 단위로만 표시한다.
SEOUL_GU_TO_ZONE = {
    "종로구": "도심권", "중구": "도심권", "용산구": "도심권",
    "성동구": "동북권", "광진구": "동북권", "동대문구": "동북권", "중랑구": "동북권",
    "성북구": "동북권", "강북구": "동북권", "도봉구": "동북권", "노원구": "동북권",
    "은평구": "서북권", "서대문구": "서북권", "마포구": "서북권",
    "양천구": "서남권", "강서구": "서남권", "구로구": "서남권", "금천구": "서남권",
    "영등포구": "서남권", "동작구": "서남권", "관악구": "서남권",
    "서초구": "동남권", "강남구": "동남권", "송파구": "동남권", "강동구": "동남권",
}


def seoul_zone_from_address(address: str) -> str | None:
    """주소에 서울 구 이름이 있으면 해당 생활권(도심권 등)을 반환. 없으면 None."""
    for gu, zone in SEOUL_GU_TO_ZONE.items():
        if gu in address:
            return zone
    return None


def load_villa_seoul_zone_index() -> list[dict]:
    if not os.path.exists(VILLA_SEOUL_ZONE_CSV_PATH):
        return []
    with open(VILLA_SEOUL_ZONE_CSV_PATH, encoding="utf-8") as f:
        return list(csv.DictReader(f))

# 우리 프로젝트의 시/도 표기(data/lawd_codes.md 기준, "서울특별시"/"경기도" 등)를
# KB CSV의 축약 표기("서울"/"경기도" 등)로 맞춰주는 표 — 필요한 지역만 우선 등록.
SIDO_ALIAS = {
    "서울특별시": "서울", "인천광역시": "인천", "경기도": "경기도",
    "부산광역시": "부산", "대구광역시": "대구", "광주광역시": "광주",
    "대전광역시": "대전", "세종특별자치시": "세종", "울산광역시": "울산",
    "강원특별자치도": "강원", "충청북도": "충북", "충청남도": "충남",
    "전북특별자치도": "전북", "전라남도": "전남", "경상북도": "경북",
    "경상남도": "경남", "제주특별자치도": "제주",
}

# 한국부동산원 CSV는 "경기도" 대신 "경기"로 표기하는 것만 다르고 나머지는 동일.
VILLA_SIDO_ALIAS = {**SIDO_ALIAS, "경기도": "경기"}


def region_from_address(address: str, alias_map: dict[str, str] = SIDO_ALIAS) -> str | None:
    """주소 문자열에서 해당 CSV가 쓰는 지역명을 찾는다. 매칭 안 되면 None."""
    for full_name, short_name in alias_map.items():
        if full_name in address:
            return short_name
    return None


def load_market_index() -> list[dict]:
    if not os.path.exists(CSV_PATH):
        return []
    with open(CSV_PATH, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def compute_market_trend(rows: list[dict], region: str, recent_weeks: int = 4) -> dict | None:
    """최근 N주 평균 vs 그 이전 N주 평균으로 매수우위지수/전세수급지수 추세를 본다.
    해당 지역 데이터가 없거나 2*recent_weeks주 미만이면 None."""
    region_rows = sorted(
        (r for r in rows if r["region"] == region and r["매수우위"]),
        key=lambda r: r["date"],
    )
    if len(region_rows) < recent_weeks * 2:
        return None

    def _avg(vals):
        nums = [float(v) for v in vals if v]
        return sum(nums) / len(nums) if nums else None

    recent = region_rows[-recent_weeks:]
    prior = region_rows[-recent_weeks * 2:-recent_weeks]

    latest = region_rows[-1]
    buy_recent, buy_prior = _avg([r["매수우위"] for r in recent]), _avg([r["매수우위"] for r in prior])
    jeonse_recent, jeonse_prior = _avg([r["전세수급"] for r in recent]), _avg([r["전세수급"] for r in prior])

    return {
        "region": region,
        "snapshot_date": latest["date"],
        "buy_index_latest": float(latest["매수우위"]),
        "buy_index_trend": (buy_recent - buy_prior) if (buy_recent is not None and buy_prior is not None) else None,
        "jeonse_index_latest": float(latest["전세수급"]) if latest["전세수급"] else None,
        "jeonse_index_trend": (jeonse_recent - jeonse_prior) if (jeonse_recent is not None and jeonse_prior is not None) else None,
    }


def load_villa_market_index() -> list[dict]:
    """한국부동산원 연립다세대 매매수급동향지수(data/reb_villa_market_index.csv)를
    읽는다 — 월별, date는 YYYY-MM 형식."""
    if not os.path.exists(VILLA_CSV_PATH):
        return []
    with open(VILLA_CSV_PATH, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def compute_villa_market_trend(rows: list[dict], region: str, recent_months: int = 3) -> dict | None:
    """최근 N개월 평균 vs 그 이전 N개월 평균으로 매매수급동향지수 추세를 본다
    (13절 동네 랭킹과 같은 "최근 3개월 vs 이전 3개월" 원칙 — 월별 데이터라
    주 단위가 아니라 월 단위로 비교한다). 2*recent_months개월 미만이면 None."""
    region_rows = sorted(
        (r for r in rows if r["region"] == region and r["index"]),
        key=lambda r: r["date"],
    )
    if len(region_rows) < recent_months * 2:
        return None

    def _avg(vals):
        nums = [float(v) for v in vals if v]
        return sum(nums) / len(nums) if nums else None

    recent = region_rows[-recent_months:]
    prior = region_rows[-recent_months * 2:-recent_months]

    latest = region_rows[-1]
    idx_recent, idx_prior = _avg([r["index"] for r in recent]), _avg([r["index"] for r in prior])

    return {
        "region": region,
        "snapshot_date": latest["date"],
        "index_latest": float(latest["index"]),
        "index_trend": (idx_recent - idx_prior) if (idx_recent is not None and idx_prior is not None) else None,
    }
