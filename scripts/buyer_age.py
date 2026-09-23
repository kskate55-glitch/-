"""CLAUDE.md 69절 — 매입자 연령대별 거래량 (참고용).

"이 동네에서 집을 사는 사람이 누구인가"를 보여준다. 30~40대 비중이 높으면
실거주 매수층이 두껍다는 뜻이고, 그게 곧 **팔 때 사줄 사람이 있다**는 신호로
읽힌다 — 다만 아래 ⚠️ 두 가지 한계 때문에 **점수에는 반영하지 않는다**
(24절 시장동향·26절 역세권·40절 아파트 대비와 같은 원칙).

⚠️ **주택유형이 구분돼 있지 않다.** 원본에 아파트/연립다세대/단독을 가르는
열이 없어서 **주택 전체 합계**로 보인다. 아파트 거래가 건수로 우세하므로
연령 구성도 아파트 쪽에 끌릴 수 있다 — 24절이 "빌라 계산기에 아파트 지표는
안 맞다"고 KB 지수를 화면에서 뺀 것과 같은 맥락이라, 화면에 항상 밝힌다.

⚠️ **연 단위 스냅샷이다.** 24절 REB 지수와 같이 자동 갱신되지 않는다.
"""
import csv
import os

CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "data", "buyer_age_by_region.csv")

# 화면에 보여줄 순서 — "기타"(연령 미상)는 비중 계산에서 빼고 목록에도 안 쓴다.
AGE_ORDER = ["20대이하", "30대", "40대", "50대", "60대", "70대이상"]
YOUNG_AGES = ("30대", "40대")      # 실거주 주력 매수층
MIN_TOTAL = 200                    # 이보다 적으면 구성비가 한두 건에 흔들린다

# ⚠️ 원본 시/도 표기가 `market_index.sido_token()`이 내놓는 표준 축약명과 딱
#    하나 어긋난다 — 24절 `VILLA_SIDO_ALIAS`가 겪은 것과 같은 한 글자 차이다.
#    나머지 14개(서울·부산·대구·인천·대전·울산·세종·강원·충북·충남·전북·
#    경북·경남·제주)는 그대로 맞는 것을 확인했다.
SIDO_ALIAS = {"경기도": "경기"}

# ⛔ **광주광역시·전라남도는 지원하지 않는다.** 원본이 둘을 `전남광주`라는
#    **한 라벨로 묶어** 내려보내는데(그 시/도 합계 행은 전부 0이고, 하위에
#    `(구)광주`·`(구)전남`과 실제 시군구가 섞여 있다), 어느 시군구가 광주고
#    어느 게 전남인지 원본이 말해주지 않는다. 24절이 경기 7권역·부산 3권역을
#    "구성 시군구를 신뢰할 수 있게 확인하지 못해" 빼둔 것과 같은 판단이다 —
#    지금은 두 지역 주소에서 이 카드가 **조용히 생략된다**(틀린 값을 주는
#    것보다 안 보여주는 쪽이 안전하다).

_cache = None


def load_buyer_age(path: str = CSV_PATH) -> dict:
    """`(시도, 시군구) -> {연령대: {연도: 건수}}`. 파일이 없으면 빈 dict."""
    global _cache
    if _cache is not None and path == CSV_PATH:
        return _cache
    table: dict = {}
    try:
        with open(path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                key = (row["sido"].strip(), row["sigungu"].strip())
                by_year = {}
                for k, v in row.items():
                    if k and k.isdigit():
                        try:
                            by_year[int(k)] = int(v or 0)
                        except ValueError:
                            continue
                table.setdefault(key, {})[row["age"].strip()] = by_year
    except (OSError, ValueError, KeyError):
        return {}
    if path == CSV_PATH:
        _cache = table
    return table


def region_for_address(address: str, table: dict) -> tuple | None:
    """주소에서 (시도, 시군구) 키를 찾는다. 못 찾으면 시도 합계, 그것도 없으면 None.

    ⚠️ **반드시 시/도로 먼저 좁힌다.** 55절 버그 ①이 정확히 이것이었다 —
    구 이름만 보고 판정해서 **부산 중구가 서울 도심권 지수를 받았다.**
    '강서구'·'중구'·'북구'처럼 여러 시/도에 같은 이름이 있으므로, 시/도를
    못 정하면 시군구 매칭 자체를 하지 않는다.
    """
    from market_index import sido_token

    if not address:
        return None
    sido = sido_token(address)
    if not sido:
        return None
    sido = SIDO_ALIAS.get(sido, sido)
    # 시/도 안에서만 시군구 이름을 찾는다.
    hits = []
    for (s, g) in table:
        if s != sido or not g:
            continue
        i = address.find(g)
        if i >= 0:
            hits.append((i, i + len(g), g))
    if hits:
        # ① 다른 매치 안에 통째로 들어가는 건 버린다 — '강북구'가 걸렸는데
        #    '북구'까지 같이 잡히면 안 된다(여러 시/도에 겹치는 구 이름이 많다).
        kept = [h for h in hits
                if not any(o is not h and o[0] <= h[0] and h[1] <= o[1] for o in hits)]
        # ② 남은 것 중 **주소에서 더 뒤에 나온 것**을 쓴다. 한국 주소는
        #    넓은 단위 → 좁은 단위 순이라, 뒤에 있는 쪽이 더 좁은 단위다
        #    ('성남시 분당구'에서 분당구를 고른다 — 원본이 두 단계를 모두
        #    갖고 있고, 좁은 쪽이 대상 물건에 더 가깝다).
        return (sido, max(kept or hits)[2])
    return (sido, "") if (sido, "") in table else None


def compute_buyer_age(address: str, table: dict | None = None) -> dict | None:
    """69절 — 그 지역의 최근 연도 연령 구성과 거래량 추이. 표본이 적으면 None."""
    table = load_buyer_age() if table is None else table
    key = region_for_address(address, table)
    if not key:
        return None
    ages = table.get(key)
    if not ages or "합계" not in ages:
        return None

    years = sorted(ages["합계"])
    if not years:
        return None
    latest = years[-1]
    total = ages["합계"].get(latest, 0)
    if total < MIN_TOTAL:
        return None

    # ⚠️ 비중은 '기타'(연령 미상)를 뺀 값으로 낸다 — 지역마다 미상 비율이
    #    달라서, 합계로 나누면 미상이 많은 동네의 비중이 통째로 낮아 보인다.
    known = sum(ages.get(a, {}).get(latest, 0) for a in AGE_ORDER)
    if known < MIN_TOTAL:
        return None
    breakdown = [{"age": a,
                  "count": ages.get(a, {}).get(latest, 0),
                  "pct": ages.get(a, {}).get(latest, 0) / known * 100}
                 for a in AGE_ORDER]
    young_pct = sum(b["pct"] for b in breakdown if b["age"] in YOUNG_AGES)

    return {
        "sido": key[0],
        "region": key[1] or key[0],
        "is_sido_only": not key[1],        # 시군구를 못 찾아 시/도 합계로 대체함
        "year": latest,
        "total": total,
        "known": known,
        "breakdown": breakdown,
        "young_pct": young_pct,
        "nationwide_young_pct": _young_pct_for(table, ("전국", ""), latest),
        "volume_series": [(y, ages["합계"].get(y, 0)) for y in years],
        "rank": _rank_within_sido(table, key, latest),
    }


def _young_pct_for(table: dict, key: tuple, year: int) -> float | None:
    ages = table.get(key)
    if not ages:
        return None
    known = sum(ages.get(a, {}).get(year, 0) for a in AGE_ORDER)
    if known < MIN_TOTAL:
        return None
    return sum(ages.get(a, {}).get(year, 0) for a in YOUNG_AGES) / known * 100


def _rank_within_sido(table: dict, key: tuple, year: int) -> dict | None:
    """같은 시/도 안에서 30~40대 비중 순위 — 숫자 하나만 던지면 높은지 낮은지
    모르기 때문에, 24절이 지역간 순위를 같이 보여주는 것과 같은 이유다."""
    sido = key[0]
    peers = []
    for (s, g) in table:
        if s != sido or not g:
            continue
        pct = _young_pct_for(table, (s, g), year)
        if pct is not None:
            peers.append((g, pct))
    if len(peers) < 3 or not key[1]:
        return None
    peers.sort(key=lambda x: -x[1])
    for i, (g, _pct) in enumerate(peers, 1):
        if g == key[1]:
            return {"rank": i, "total": len(peers),
                    "top": peers[:3], "bottom": peers[-1:]}
    return None


def print_buyer_age(info: dict | None):
    """CLI 출력 — 24절 시장 동향 바로 뒤."""
    if not info:
        return
    label = f"{info['region']} 전체" if info["is_sido_only"] else info["region"]
    print(f"\n[매입자 연령대] ({label}, {info['year']}년 · 주택 전체 기준 스냅샷)")
    print("  " + " · ".join(f"{b['age']} {b['pct']:.0f}%" for b in info["breakdown"]))
    line = f"  30~40대 비중: {info['young_pct']:.1f}%"
    if info["nationwide_young_pct"] is not None:
        diff = info["young_pct"] - info["nationwide_young_pct"]
        line += f" (전국 평균 {info['nationwide_young_pct']:.1f}% 대비 {diff:+.1f}%p)"
    print(line)
    if info["rank"]:
        r = info["rank"]
        print(f"  {info['sido']} {r['total']}개 시군구 중 {r['rank']}위")
    series = info["volume_series"]
    if len(series) >= 2:
        (y0, v0), (y1, v1) = series[0], series[-1]
        chg = (v1 / v0 - 1) * 100 if v0 else 0.0
        print(f"  거래량: {y0}년 {v0:,}건 → {y1}년 {v1:,}건 ({chg:+.0f}%)")
    print("  ⚠️ 주택유형이 구분되지 않은 전체 주택 통계라 아파트 거래가 섞여 있습니다 — "
          "참고용이고 매도가 계산에는 반영되지 않습니다.")
