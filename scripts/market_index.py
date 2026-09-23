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


# 주소 맨 앞 토큰(시/도)을 표준 축약명으로 맞춘다. 사용자는 "서울특별시"도
# "서울"도 친다 — 55절에서 "경기 김포시 …"가 시장동향 카드를 통째로 날리던
# 문제를 잡으면서 추가했다.
_SIDO_TOKEN = {
    "서울": "서울", "서울특별시": "서울",
    "인천": "인천", "인천광역시": "인천",
    "경기": "경기도", "경기도": "경기도",
    "부산": "부산", "부산광역시": "부산",
    "대구": "대구", "대구광역시": "대구",
    "광주": "광주", "광주광역시": "광주",
    "대전": "대전", "대전광역시": "대전",
    "세종": "세종", "세종특별자치시": "세종", "세종시": "세종",
    "울산": "울산", "울산광역시": "울산",
    "강원": "강원", "강원도": "강원", "강원특별자치도": "강원",
    "충북": "충북", "충청북도": "충북",
    "충남": "충남", "충청남도": "충남",
    "전북": "전북", "전라북도": "전북", "전북특별자치도": "전북",
    "전남": "전남", "전라남도": "전남",
    "경북": "경북", "경상북도": "경북",
    "경남": "경남", "경상남도": "경남",
    "제주": "제주", "제주도": "제주", "제주특별자치도": "제주",
}


def sido_token(address: str) -> str | None:
    """주소 맨 앞 토큰을 표준 시/도 축약명으로. 못 알아보면 None.

    ⚠️ **맨 앞 토큰만 본다** — 부분 문자열로 찾으면 "경기도 **광주**시"가
    "광주광역시"로 잡힌다(실제로 헷갈리기 쉬운 조합이다)."""
    first = (address or "").strip().split()
    return _SIDO_TOKEN.get(first[0]) if first else None


def seoul_zone_from_address(address: str) -> str | None:
    """주소에 서울 구 이름이 있으면 해당 생활권(도심권 등)을 반환. 없으면 None.

    ⚠️ **서울이 맞는지 먼저 확인한다(55절).** 예전엔 구 이름만 보고 판정해서
    `부산광역시 중구`·`대구광역시 중구`·`인천광역시 중구`·`대전광역시 중구`·
    `울산광역시 중구`·`부산광역시 강서구`가 전부 **서울 생활권으로 잘못
    잡혔다** — 화면에는 "서울 도심권" 라벨과 함께 **남의 동네 시장동향
    지수**가 떴다. 조용히 틀리는 종류라 화면만 보고는 알 수 없다.
    시/도 토큰이 아예 없는 주소("강북구 수유동 468")는 예전처럼 구 이름으로
    판정한다 — 서울 전용 구 이름이 대부분이라 그쪽이 더 쓸모 있다."""
    # ⚠️ 주소가 비어 있거나 None이면 여기서 끝낸다 — 아래 `in address`가
    #    None을 만나면 TypeError로 터지고, 참고용 카드 하나 때문에 계산
    #    전체가 죽는다(71절 ④와 같은 실패다).
    if not address:
        return None
    sido = sido_token(address)
    if sido is not None and sido != "서울":
        return None
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

# rank_region()에서 "17개 시/도끼리만" 랭킹을 매길 때 쓰는 필터 — 원본 CSV에는
# 전남광주 같은 중간집계, 경기 하위 권역 등 시/도가 아닌 행도 섞여있어 그대로
# 랭킹에 넣으면 왜곡된다.
VILLA_SIDO_NAMES = set(VILLA_SIDO_ALIAS.values())


def region_from_address(address: str, alias_map: dict[str, str] = SIDO_ALIAS) -> str | None:
    """주소 문자열에서 해당 CSV가 쓰는 지역명을 찾는다. 매칭 안 되면 None.

    ⚠️ **맨 앞 토큰을 먼저 본다(55절).** 예전엔 `alias_map`의 긴 표기
    ("서울특별시")만 부분 문자열로 찾아서, 사용자가 흔하게 치는 짧은 표기
    ("경기 김포시 …")면 `None`이 되어 **24절 시장동향 카드가 통째로 조용히
    사라졌다.** 토큰으로 못 알아보면 예전 방식으로 폴백한다."""
    # ⚠️ 주소가 비어 있거나 None이면 여기서 끝낸다 — 아래 `in address`가
    #    None을 만나면 TypeError로 터지고, 참고용 카드 하나 때문에 계산
    #    전체가 죽는다(71절 ④와 같은 실패다).
    if not address:
        return None
    token = sido_token(address)
    if token is not None:
        # alias_map은 "경기도"를 "경기"로 줄이는 식의 CSV별 차이만 담고 있다.
        return alias_map.get(token, token)
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
    주 단위가 아니라 월 단위로 비교한다). 2*recent_months개월 미만이면 None.
    같은 범위 안에서 자료가 시작된 첫 달과 최신 달도 함께 비교해서
    돌려준다(since_start) — 이 데이터는 2025-11부터라 1년 전 대비(YoY)
    계산이 안 되므로, 대신 "가지고 있는 전체 기간 동안 얼마나 변했는지"를
    보여주는 용도다."""
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
    first = region_rows[0]
    idx_recent, idx_prior = _avg([r["index"] for r in recent]), _avg([r["index"] for r in prior])

    return {
        "region": region,
        "snapshot_date": latest["date"],
        "index_latest": float(latest["index"]),
        "index_trend": (idx_recent - idx_prior) if (idx_recent is not None and idx_prior is not None) else None,
        "start_date": first["date"],
        "start_value": float(first["index"]),
        "since_start": float(latest["index"]) - float(first["index"]),
    }


def _plain_market_desc(value: float, kind: str = "buy") -> str:
    """지수 값(0~200, 기준선 100)을 부동산 초보도 알 수 있는 문장으로 풀어준다.
    kind='buy'는 매수우위지수/매매수급동향지수(같은 관례), kind='jeonse'는
    KB 전세수급지수용 — 해석 방향(누가 유리한지)이 서로 다르다."""
    diff = value - 100
    if kind == "jeonse":
        if abs(diff) < 3:
            return "전세를 구하는 사람과 내놓는 사람이 균형 잡힌 상태예요."
        if diff > 0:
            return "전세 매물보다 구하는 사람이 더 많아요 → 전세가가 오르기 쉬운 분위기예요."
        return "전세를 구하는 사람보다 매물이 더 많아요 → 전세가가 내리기 쉬운 분위기예요."
    if abs(diff) < 3:
        return "사려는 사람과 팔려는 사람이 균형 잡힌 상태예요."
    if diff > 0:
        return "사려는 사람이 팔려는 사람보다 많아요 → 집주인(파는 사람)에게 유리하고, 가격이 오르기 쉬운 분위기예요."
    return "팔려는 사람이 사려는 사람보다 많아요 → 사는 사람에게 유리하고, 가격이 내리기 쉬운 분위기예요."


def _latest_by_region(rows: list[dict], value_field: str, allowed_regions: set | None = None) -> dict:
    """region별 가장 최근 날짜의 (date, value)를 돌려준다. 여러 region이 섞인
    rows(예: 모든 시/도, 또는 서울 5개 권역)에서 지역간 비교/랭킹을 만들 때 쓴다."""
    latest: dict[str, tuple[str, float]] = {}
    for r in rows:
        region = r.get("region")
        if not region or (allowed_regions is not None and region not in allowed_regions):
            continue
        val = r.get(value_field)
        if not val:
            continue
        date = r["date"]
        if region not in latest or date > latest[region][0]:
            latest[region] = (date, float(val))
    return latest


def latest_value_for(rows: list[dict], region: str, value_field: str = "index") -> tuple | None:
    """특정 region의 가장 최근 (date, value) 하나만 필요할 때 쓰는 간단한 조회
    (전국 평균과 비교할 때처럼 랭킹까지는 필요 없는 경우)."""
    latest = _latest_by_region(rows, value_field, allowed_regions={region})
    return latest.get(region)


def rank_region(rows: list[dict], region: str, value_field: str = "index",
                 allowed_regions: set | None = None) -> dict | None:
    """같은 시점 기준으로 region이 동료 지역들(allowed_regions) 중 몇 위인지 계산.
    반환: rank, total, value, date, ranking(전체 정렬 리스트). region 데이터가
    없으면 None."""
    latest = _latest_by_region(rows, value_field, allowed_regions)
    if region not in latest:
        return None
    ranking = sorted(latest.items(), key=lambda kv: kv[1][1], reverse=True)
    rank = next(i for i, (k, _v) in enumerate(ranking, start=1) if k == region)
    return {
        "rank": rank, "total": len(ranking),
        "value": latest[region][1], "date": latest[region][0],
        "ranking": ranking,
    }


def format_ranking_peers(ranking: list[tuple], highlight_region: str, max_show: int = 5) -> list[str]:
    """rank_region()이 돌려준 ranking을 사람이 읽을 수 있는 줄 목록으로 만든다.
    상위 max_show개는 항상 보여주고, 검색한 지역이 그 밖에 있으면 순위만
    따로 덧붙인다 — 17개 시/도를 다 나열하면 너무 길어지는 것을 막는 용도."""
    n = len(ranking)
    lines = []
    for i, (region, (_date, val)) in enumerate(ranking[:max_show], start=1):
        marker = " ← 검색하신 지역" if region == highlight_region else ""
        lines.append(f"{i}위 {region} {val:.1f}{marker}")
    hl_idx = next((i for i, (k, _v) in enumerate(ranking, start=1) if k == highlight_region), None)
    if hl_idx is not None and hl_idx > max_show:
        val = dict(ranking)[highlight_region][1]
        lines.append(f"{hl_idx}위 {highlight_region} {val:.1f} ← 검색하신 지역 ({n}개 지역 중)")
    return lines


def yoy_change(rows: list[dict], region: str, value_field: str, days: int = 365,
               tolerance_days: int = 10) -> dict | None:
    """KB처럼 주 단위로 오래 쌓인 데이터에서 "작년 이맘때 대비"를 계산한다.
    최신 날짜에서 정확히 365일 전 날짜의 데이터가 없을 수 있으니(주간
    발표일 차이), 그 날짜 ±tolerance_days 안에서 가장 가까운 값을 쓴다.
    맞는 데이터가 없으면(신규 지표라 1년치가 안 쌓였거나) None."""
    from datetime import date as _date, timedelta as _timedelta

    region_rows = sorted(
        (r for r in rows if r.get("region") == region and r.get(value_field)),
        key=lambda r: r["date"],
    )
    if not region_rows:
        return None

    latest = region_rows[-1]
    try:
        latest_date = _date.fromisoformat(latest["date"])
    except ValueError:
        return None
    target_date = latest_date - _timedelta(days=days)

    best, best_diff = None, None
    for r in region_rows:
        try:
            d = _date.fromisoformat(r["date"])
        except ValueError:
            continue
        diff = abs((d - target_date).days)
        if diff <= tolerance_days and (best_diff is None or diff < best_diff):
            best, best_diff = r, diff
    if best is None:
        return None

    old_val = float(best[value_field])
    new_val = float(latest[value_field])
    return {
        "latest_date": latest["date"], "latest_value": new_val,
        "year_ago_date": best["date"], "year_ago_value": old_val,
        "delta": new_val - old_val,
    }
