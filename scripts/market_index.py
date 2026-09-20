"""
KB부동산 스타일 주간 아파트 매수우위지수/전세수급지수를 참고 지표로 보여준다.
CLAUDE.md 24절 규칙.

⚠️ `data/kb_market_index.csv`는 사용자가 2026.9.7 기준으로 한 번 받은
   스냅샷이다(매주 자동 갱신되지 않는다) — 시간이 지날수록 낡은 데이터가
   되므로, 출력할 때마다 스냅샷 날짜를 항상 같이 보여준다. 최신 데이터가
   필요하면 KB부동산 리브온에서 새 파일을 받아 이 경로에 덮어써야 한다.

이 지수는 아파트 시장 지표다 — 빌라/연립다세대 자체 시세 데이터가 아니라,
"지금 이 지역 부동산 시장 전반이 매수자 우위인지 매도자 우위인지" 참고용
맥락으로만 쓴다. 시/도 단위까지만 있어 구/동 단위 신호는 아니다.

매수우위지수 해석 (KB부동산 정의, 0~200, 기준선 100):
- 100 초과: "매수자가 많다"는 응답 비중이 높음 → 매도자 우위 시장(상승 압력)
- 100 미만: "매도자가 많다"는 응답 비중이 높음 → 매수자 우위 시장(하락 압력)
전세수급지수도 같은 기준선(100)으로 해석한다 (초과 시 전세 수요 > 공급).
"""

import csv
import os

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "kb_market_index.csv")

# 우리 프로젝트의 시/도 표기(data/lawd_codes.md 기준, "서울특별시"/"경기도" 등)를
# 이 CSV의 축약 표기("서울"/"경기도" 등)로 맞춰주는 표 — 필요한 지역만 우선 등록.
SIDO_ALIAS = {
    "서울특별시": "서울", "인천광역시": "인천", "경기도": "경기도",
    "부산광역시": "부산", "대구광역시": "대구", "광주광역시": "광주",
    "대전광역시": "대전", "세종특별자치시": "세종", "울산광역시": "울산",
    "강원특별자치도": "강원", "충청북도": "충북", "충청남도": "충남",
    "전북특별자치도": "전북", "전라남도": "전남", "경상북도": "경북",
    "경상남도": "경남", "제주특별자치도": "제주",
}


def region_from_address(address: str) -> str | None:
    """주소 문자열에서 이 CSV가 쓰는 지역명을 찾는다. 매칭 안 되면 None."""
    for full_name, short_name in SIDO_ALIAS.items():
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
