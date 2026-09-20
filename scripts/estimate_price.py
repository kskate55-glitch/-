"""
저장된 국토부 연립다세대 실거래가 XML(들)을 읽어서
매도가 범위(보수적 급매가 / 현실적 체결가 / 상단 매도가 / AI 기준매도가 / 권장 호가)를
CLAUDE.md 8절 포맷으로 계산하고, 12절 규칙에 따른 월별 계절성(거래 활발한 달)과
15절 규칙에 따른 월별 가격 추이, 16절 규칙에 따른 예상 전세가·매매 대비 비교,
19절 규칙에 따른 입지 체크·수익성 계산, 20절 규칙에 따른 건축물대장 조회
(승강기·세대수·사용승인일), 21절 규칙에 따른 인근 중개업소 조회, 23절 규칙에
따른 예상 월세 추정(전월세전환율 역산)도 함께 출력한다.

사용법:
    python estimate_price.py --dir data/raw --rent-dir data/raw_rent \
        --address "서울특별시 강북구 수유동 468-202" --dong 수유동 \
        --area 69.27 --floor 5 --radius 400 --year-min 2025 \
        --bid-price 10200 --extra-cost 300

--dir              : XML 파일들이 들어있는 폴더 (여러 달치를 다 넣어두면 자동으로 합쳐서 계산)
--rent-dir         : 전월세 실거래가 XML 폴더 (기본 data/raw_rent) — 데이터가 있으면
                     16절 예상 전세가·매매 대비 비교도 함께 계산한다
--address          : 대상 물건의 지번 주소 — 카카오 로컬 API로 좌표를 구하는 데 쓴다
--dong             : 법정동명 (umdNm) — 계절성/가격추이 등 동네 단위 분석 범위로 쓰인다
--area             : 대상 물건의 전용면적(㎡) — ±15% 이내를 "비슷한 면적"으로 취급
--floor            : 대상 물건의 층 (선택 — 유사층 가중치 판단에 사용)
--build-year       : 대상 물건의 준공년도 (선택 — 유사연식 가중치 판단에 사용)
--radius           : 비교 반경(미터), 기본 400m
--year-min         : 매도가 계산에 사용할 최소 계약년도 (기본값: 실행 시점 기준 작년)
--bid-price        : 낙찰가/입찰예정가 (만원 단위, 선택 — 주면 수익성 계산도 같이 보여준다)
--acquisition-rate : 취득 부대비용률 (기본 3.5%, 다주택/규제지역 여부에 따라 조정 필요)
--sale-rate        : 매도 중개수수료율 (기본 0.5%)
--extra-cost       : 명도비·수리비 등 추가비용 (만원 단위, 기본 0)
--no-location      : 입지 체크(지하철역/초등학교/마트 거리)를 건너뛴다
--brokers-csv      : 서울 인근 중개업소 조회용 CSV (기본 data/brokers_seoul.csv,
                     서울 열린데이터광장에서 받은 공인중개사사무소 정보)
--broker-radius    : 인근 중개업소 조회 반경(미터), 기본 1000m
--no-brokers       : 인근 중개업소 조회를 건너뛴다
--monthly-deposit  : 예상 월세 추정용 월세보증금 (만원, 선택 — 주면 23절 예상 월세
                     추정을 같이 보여준다. 순수월세면 0)
--conversion-rate  : 전월세전환율 (연 %, 기본 6.0) — 지역/물건마다 달라 참고값일 뿐

이 스크립트는 실거래가 XML 파일 텍스트만 읽는다 — 국토부 API를 직접 호출하지
않는다 (그건 molit_rhtrade_api.py/molit_rhrent_api.py의 몫). 다만 --address를
좌표로 바꾸기 위해 카카오 로컬 API는 직접 호출하고(geocode.py, 환경변수
KAKAO_REST_API_KEY 필요), 경기도 물건이면 인근 중개업소 조회를 위해 경기데이터드림
API도 직접 호출한다(broker_lookup.py, 환경변수 GG_DATA_KEY 필요).
"""

import argparse
import glob
import os
import re
import statistics
import xml.etree.ElementTree as ET
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

MAX_GEOCODE_CANDIDATES = 200  # 이보다 후보가 많으면 상위 N개까지만 지오코딩한다 (웹 타임아웃 방지)
GEOCODE_WORKERS = 8  # 지오코딩 병렬 호출 수 — 너무 크면 카카오 초당 호출 제한에 걸릴 수 있다


def load_transactions(xml_dir: str) -> list[dict]:
    """xml_dir 바로 아래뿐 아니라, molit_rhtrade_api.py/molit_rhrent_api.py가
    지역별로 나눠 저장하는 하위 폴더(data/raw/<LAWD_CD>/*.xml)까지 재귀적으로
    찾는다 — --dir data/raw처럼 여러 지역을 한 번에 합쳐서 볼 때도,
    --dir data/raw/11500처럼 특정 지역만 볼 때도 둘 다 그대로 동작한다."""
    rows = []
    xml_paths = glob.glob(os.path.join(xml_dir, "**", "*.xml"), recursive=True)
    txt_paths = glob.glob(os.path.join(xml_dir, "**", "*.txt"), recursive=True)
    for path in xml_paths + txt_paths:
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(path, "r", encoding="cp949") as f:
                content = f.read()

        # 파일에 <response>가 여러 개 이어붙어 있을 수도 있으니 관대하게 파싱
        # (여러 번 호출한 결과를 그냥 한 파일에 이어붙였을 경우 대비)
        for match in re.finditer(r"<response>.*?</response>", content, re.S):
            try:
                root = ET.fromstring(match.group(0))
            except ET.ParseError:
                continue
            for item in root.findall(".//item"):
                row = {child.tag: (child.text or "").strip() for child in item}
                if row:
                    rows.append(row)
    return rows


def dedupe(rows: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for r in rows:
        key = (
            r.get("umdNm"), r.get("mhouseNm"), r.get("jibun"),
            r.get("dealYear"), r.get("dealMonth"), r.get("dealDay"),
            r.get("dealAmount"), r.get("excluUseAr"), r.get("floor"),
        )
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def dedupe_rent(rows: list[dict]) -> list[dict]:
    """전월세 행은 dealAmount가 없고 deposit/monthlyRent가 금액 필드라 dedupe()와
    키가 다르다 (CLAUDE.md 16절)."""
    seen = set()
    out = []
    for r in rows:
        key = (
            r.get("umdNm"), r.get("mhouseNm"), r.get("jibun"),
            r.get("dealYear"), r.get("dealMonth"), r.get("dealDay"),
            r.get("deposit"), r.get("monthlyRent"), r.get("excluUseAr"), r.get("floor"),
        )
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def filter_pure_jeonse(rows: list[dict]) -> list[dict]:
    """월세가 섞이지 않은(monthlyRent == 0) 순수 전세 거래만 남긴다 (CLAUDE.md 16절 —
    환산보증금 계산은 하지 않으므로 월세가 섞인 거래는 전세가 추정에서 제외한다)."""
    out = []
    for r in rows:
        if to_amount_man(r.get("monthlyRent", "0")) != 0:
            continue
        out.append(r)
    return out


def to_amount_man(s: str) -> float:
    """'36,900' (만원 단위 문자열) -> 36900.0 (만원, float)"""
    try:
        return float(s.replace(",", ""))
    except (ValueError, AttributeError):
        return float("nan")


def find_comparables(rows: list[dict], subject_coord: tuple[float, float], area: float,
                      floor: int | None, build_year: str | None, radius_m: float,
                      year_min: int, this_year: int, gu_filter: str | None,
                      amount_field: str = "dealAmount") -> list[dict]:
    """CLAUDE.md 5절 규칙: 실제 반경(기본 400m) 안의 유사면적 매물만 비교 대상으로
    삼고, 거리·층·연식 유사도로 가중치를 준다.

    빌라/다세대는 한 건물에 보통 3~4세대뿐이라 "동일건물" 비교는 표본이 거의
    항상 부족하다. 그래서 실제 중개업소·투자자들처럼 "실제 반경 안 + 비슷한
    면적 + 비슷한 층 + 비슷한 연식"을 기준으로 삼는다. 건물명이 같은지는 더
    이상 필터링에 쓰지 않는다.

    amount_field: 금액 필드명. 매매 행은 "dealAmount", 전세 행은 "deposit"
    (CLAUDE.md 16절 — 예상 전세가도 같은 로직으로 계산한다).

    지오코딩(카카오 API 호출)이 후보 하나마다 순차 네트워크 왕복이라 후보가
    많은 구(garbage 400건대도 흔함)는 그것만으로 몇 분씩 걸려 웹 서버
    타임아웃을 넘긴다 — 그래서 비-네트워크 필터(면적/연식/구)를 먼저 다
    통과한 후보만 모아서 병렬로 지오코딩한다(MAX_GEOCODE_CANDIDATES로 상한도
    둔다).
    """
    from geocode import geocode, haversine_m
    from lawd_lookup import full_address, gu_name

    candidates = []
    for r in rows:
        try:
            deal_year = int(r.get("dealYear", "0"))
        except ValueError:
            continue
        if deal_year < year_min:
            continue  # 연도 제한 규칙 — 기준연도 이전 거래는 매도가 계산에서 제외
        if r.get("cdealType", "").strip() == "해제":
            continue  # 해제된 거래 제외

        try:
            row_area = float(r.get("excluUseAr", "nan"))
            amount = to_amount_man(r.get(amount_field, ""))
        except (ValueError, TypeError):
            continue
        if amount != amount or not row_area:
            continue
        if abs(row_area - area) / area > 0.15:
            continue  # 반경 안이라도 면적이 많이 다르면 비교 대상에서 제외

        row_build_year = r.get("buildYear", "").strip()
        if build_year is not None and row_build_year.isdigit():
            if abs(int(row_build_year) - int(build_year)) > 4:
                continue  # 준공년도 ±4년을 벗어나면 비교 대상에서 아예 제외

        if gu_filter and gu_name(r.get("sggCd", "")) != gu_filter:
            continue  # 다른 구는 400m 반경에 들 일이 사실상 없어 지오코딩을 아낀다

        addr = full_address(r)
        if not addr:
            continue

        candidates.append((r, addr, amount))

    if len(candidates) > MAX_GEOCODE_CANDIDATES:
        candidates = candidates[:MAX_GEOCODE_CANDIDATES]

    subject_lat, subject_lon = subject_coord

    def _geocode_one(item):
        r, addr, amount = item
        return r, amount, geocode(addr)

    out = []
    with ThreadPoolExecutor(max_workers=GEOCODE_WORKERS) as executor:
        for r, amount, coord in executor.map(_geocode_one, candidates):
            if coord is None:
                continue
            distance = haversine_m(subject_lat, subject_lon, coord[0], coord[1])
            if distance > radius_m:
                continue

            row_floor = None
            try:
                row_floor = int(r.get("floor", "").strip())
            except (ValueError, AttributeError):
                pass

            subject_is_basement = floor is not None and floor <= 0
            row_is_basement = row_floor is not None and row_floor <= 0
            if row_is_basement and not subject_is_basement:
                continue  # 반지하/지하는 지상층 매물과 가격대가 크게 달라 표본에서 아예 제외

            similar_floor = floor is not None and row_floor is not None and abs(row_floor - floor) <= 1
            floor_weight = 1.0 if (floor is None or similar_floor) else 0.6

            distance_weight = max(0.2, 1 - distance / radius_m)

            r["_distance_m"] = distance
            r["_amount_man"] = amount
            r["_weight"] = (
                weight_for_year(r.get("dealYear"), this_year) * distance_weight * floor_weight
            )
            out.append(r)

    out.sort(key=lambda r: r["_distance_m"])
    return out


def weight_for_year(deal_year: str, this_year: int) -> float:
    try:
        y = int(deal_year)
    except (TypeError, ValueError):
        return 0.5
    if y >= this_year:
        return 1.5
    if y == this_year - 1:
        return 1.0
    return 0.3  # 기준연도 이전은 원래 필터링되지만, 방어적으로 낮은 가중치만 부여


def compute_scenarios(filtered: list[dict], radius_m: float, this_year: int) -> dict:
    """CLAUDE.md 7~8절 규칙: 가중 복제 후 p25/중앙값/p75와 시세 신뢰도를 계산한다.
    매매·전세(16절) 양쪽에서 공통으로 쓴다 — find_comparables()가 이미 채워둔
    _amount_man/_weight/_distance_m을 그대로 사용한다."""
    amounts_weighted = []
    for r in filtered:
        amounts_weighted.extend([r["_amount_man"]] * max(1, round(r["_weight"])))

    median_man = statistics.median(amounts_weighted)
    p25 = statistics.median(sorted(amounts_weighted)[: max(1, len(amounts_weighted) // 2)])
    p75 = statistics.median(sorted(amounts_weighted)[len(amounts_weighted) // 2 :])

    n_total = len(filtered)
    n_this_year = sum(1 for r in filtered if r.get("dealYear") == str(this_year))
    n_close = sum(1 for r in filtered if r["_distance_m"] <= radius_m / 2)

    spread = (p75 - p25) / median_man if median_man else 1
    confidence = 100
    confidence -= max(0, (5 - n_total)) * 10
    confidence -= max(0, (2 - n_close)) * 10
    confidence -= min(30, spread * 100)
    confidence -= max(0, (1 - (n_this_year / n_total))) * 15
    confidence = max(10, min(100, round(confidence)))

    return {
        "p25": p25, "median": median_man, "p75": p75,
        "n_total": n_total, "n_close": n_close, "n_this_year": n_this_year,
        "confidence": confidence,
    }


def compute_monthly_rent(realistic_sale_man: float, deposit_man: float, annual_rate_pct: float) -> float:
    """CLAUDE.md 23절 규칙: 전세가 아니라 8절에서 산출한 매도가(현실적 체결가)에
    전월세전환율을 적용해 예상 월세를 역산한다 (현업 공인중개사 확인 관행 —
    전세보증보험 가입한도 제한으로 순수 전세가 줄면서 매도가 기준 환산이
    일반화됐다). 실거래 데이터가 아닌 추정치이므로 항상 참고용임을 밝힌다."""
    return (realistic_sale_man - deposit_man) * annual_rate_pct / 100 / 12


def print_monthly_rent(realistic_sale_man: float, deposit_man: float, annual_rate_pct: float, fmt) -> None:
    monthly_rent = compute_monthly_rent(realistic_sale_man, deposit_man, annual_rate_pct)
    print()
    print("[예상 월세 추정] (전월세전환율 역산, 예상 매도가 기준)")
    print(f"기준 매도가(현실적 체결가): {fmt(realistic_sale_man)}")
    print(f"가정: 월세보증금 {deposit_man:.0f}만원, 연 전환율 {annual_rate_pct:.1f}%")
    print(f"예상 월세: {monthly_rent:.0f}만원/월")
    print("⚠️ 실거래 데이터가 아닌 추정치입니다 — 인근 실제 월세 매물과 비교해서 조정하세요.")
    print("   전환율은 법정 상한(기준금리+2%p)과 실제 시장 관행이 다를 수 있어 참고값일 뿐입니다.")


def seasonality_index(rows: list[dict]) -> dict[int, int] | None:
    """월별 거래량 지수(전체 평균=100)를 계산. 표본이 6개월 미만이면 None."""
    counts_by_month_year: dict[int, dict[str, int]] = {m: {} for m in range(1, 13)}
    for r in rows:
        try:
            month = int(r.get("dealMonth", "0"))
        except ValueError:
            continue
        if not 1 <= month <= 12:
            continue
        year = r.get("dealYear", "")
        counts_by_month_year[month][year] = counts_by_month_year[month].get(year, 0) + 1

    months_with_data = [m for m, years in counts_by_month_year.items() if years]
    if len(months_with_data) < 6:
        return None

    avg_by_month = {
        m: (sum(years.values()) / len(years) if years else 0)
        for m, years in counts_by_month_year.items()
    }
    overall_avg = statistics.mean(v for v in avg_by_month.values() if v > 0)
    return {m: round(v / overall_avg * 100) for m, v in avg_by_month.items()}


def compute_seasonality(all_rows: list[dict], dong: str) -> dict:
    """CLAUDE.md 12절 규칙: 연도 필터 없이 전체 기간으로 월별 거래 패턴을 본다."""
    non_cancelled = [r for r in all_rows if r.get("cdealType", "").strip() != "해제"]
    dong_rows = [r for r in non_cancelled if r.get("umdNm", "").strip() == dong.strip()]
    years_in_dong = {r.get("dealYear") for r in dong_rows if r.get("dealYear")}

    if len(dong_rows) >= 24 and len(years_in_dong) >= 2:
        scope_rows, scope_label = dong_rows, f"{dong}"
    else:
        scope_rows, scope_label = non_cancelled, "동 데이터 부족 — 조회 지역 전체"

    index = seasonality_index(scope_rows)
    if index is None:
        return {"scope_label": scope_label, "index": None, "busy": [], "slow": []}

    busy = sorted((m for m in index if index[m] >= 110), key=lambda m: index[m], reverse=True)[:3]
    slow = sorted((m for m in index if index[m] <= 90), key=lambda m: index[m])[:3]
    return {"scope_label": scope_label, "index": index, "busy": busy, "slow": slow}


def print_seasonality(season: dict):
    print()
    index = season["index"]
    if index is None:
        print("[계절성 분석] 표본이 부족해 계절성 분석을 생략합니다 (최소 6개월 이상 분포 필요).")
        return

    busy, slow = season["busy"], season["slow"]
    print(f"[계절성 분석] ({season['scope_label']} 기준, 거래량 지수 — 전체 평균=100)")
    print(" ".join(f"{m}월:{index[m]}" for m in range(1, 13)))
    print(f"거래 활발한 달: {', '.join(f'{m}월' for m in busy) if busy else '뚜렷한 성수기 없음'}")
    print(f"거래 적은 달: {', '.join(f'{m}월' for m in slow) if slow else '뚜렷한 비수기 없음'}")
    if busy:
        print("→ 매도 시점을 조정할 수 있다면 위 활발한 달 사이에 내놓는 것이 매수 수요가")
        print("  가장 많은 시기입니다. (참고용 통계이며 표본이 적을수록 신뢰도가 낮습니다)")
    else:
        print("→ 뚜렷한 계절성이 보이지 않아 매도 시점보다 가격 자체에 집중하는 것을 추천합니다.")


def compute_price_trend(all_rows: list[dict], dong: str) -> dict:
    """CLAUDE.md 15절 규칙: 월별 평균 평당가(만원/㎡) 흐름을 시간순으로 뽑는다."""
    non_cancelled = [r for r in all_rows if r.get("cdealType", "").strip() != "해제"]
    dong_rows = [r for r in non_cancelled if r.get("umdNm", "").strip() == dong.strip()]

    if len(dong_rows) >= 12:
        scope_rows, scope_label = dong_rows, dong
    else:
        scope_rows, scope_label = non_cancelled, "동 데이터 부족 — 조회 지역 전체"

    buckets: dict[tuple[int, int], list[float]] = defaultdict(list)
    for r in scope_rows:
        try:
            y, m = int(r.get("dealYear", "0")), int(r.get("dealMonth", "0"))
            area = float(r.get("excluUseAr", "nan"))
            amount = to_amount_man(r.get("dealAmount", ""))
        except (ValueError, TypeError):
            continue
        if not y or not 1 <= m <= 12 or amount != amount or not area:
            continue
        buckets[(y, m)].append(amount / area)

    if len(buckets) < 3:
        return {"scope_label": scope_label, "series": []}

    series = [(f"{y}.{m:02d}", statistics.mean(vals)) for (y, m), vals in sorted(buckets.items())]
    return {"scope_label": scope_label, "series": series}


def compute_profit(bid_price_man: float, sale_price_man: float, acquisition_rate: float,
                    sale_rate: float, extra_cost_man: float) -> dict:
    """CLAUDE.md 19절 규칙: 낙찰가 대비 매도 시나리오별 순수익을 계산한다.
    모든 금액은 만원 단위. 세율/비용은 참고용 기본값이며 실제 상황(다주택 여부,
    규제지역, 명도비 등)에 따라 사용자가 직접 조정해야 한다.
    """
    total_cost = bid_price_man * (1 + acquisition_rate) + extra_cost_man
    sale_cost = sale_price_man * sale_rate
    net_profit = sale_price_man - total_cost - sale_cost
    roi_pct = (net_profit / total_cost * 100) if total_cost else 0
    return {"total_cost": total_cost, "net_profit": net_profit, "roi_pct": roi_pct}


def print_profit(bid_price_man: float, scenarios: dict, acquisition_rate: float,
                  sale_rate: float, extra_cost_man: float):
    def fmt(man):
        return f"{man / 10000:.2f}억"

    total_cost = bid_price_man * (1 + acquisition_rate) + extra_cost_man
    print()
    print(f"[수익성 계산] (낙찰가/입찰예정가 {fmt(bid_price_man)} 기준)")
    print(f"총 매수비용: {fmt(total_cost)} (낙찰가 + 취득 부대비용 {acquisition_rate*100:.1f}% + 추가비용 {fmt(extra_cost_man)})")
    print()
    print("매도 시나리오별 순수익:")
    labels = {
        "conservative": "보수적 급매가",
        "realistic": "현실적 체결가",
        "upper": "상단 매도가",
        "ai_base": "AI 기준매도가",
        "listing": "권장 최초 호가",
    }
    for key, label in labels.items():
        result = compute_profit(bid_price_man, scenarios[key], acquisition_rate, sale_rate, extra_cost_man)
        sign = "+" if result["net_profit"] >= 0 else ""
        print(f"- {label} 기준: 순수익 {sign}{fmt(result['net_profit'])} (수익률 {sign}{result['roi_pct']:.1f}%)")
    print()
    print("⚠️ 취득세율은 다주택 여부·규제지역 여부에 따라 1.1%~최대 13%까지 크게 달라집니다.")
    print("   본인 상황에 맞는 정확한 세율로 --acquisition-rate를 조정하세요.")
    print("⚠️ 명도비·수리비·대출이자 등은 --extra-cost로 직접 반영해야 합니다 (기본값 0).")


def print_location_check(subject_coord: tuple[float, float]):
    """CLAUDE.md 19절 규칙: 카카오 로컬 API로 가까운 지하철역/초등학교/마트를 찾는다."""
    from geocode import nearby_place

    print()
    print("[입지 체크] (카카오 로컬 기준, 반경 1km)")
    for keyword, label in [("지하철역", "가장 가까운 지하철역"), ("초등학교", "가장 가까운 초등학교"), ("마트", "가장 가까운 마트")]:
        try:
            place = nearby_place(subject_coord[0], subject_coord[1], keyword)
        except RuntimeError as e:
            print(f"{label}: 조회 실패 ({e})")
            continue
        if place:
            print(f"{label}: {place['name']} ({place['distance_m']}m)")
        else:
            print(f"{label}: 1km 이내 없음")


def print_broker_check(address: str, subject_coord: tuple[float, float], dong: str,
                        brokers_csv: str, radius_m: float):
    """CLAUDE.md 21절 규칙: 임장 시 바로 전화해볼 수 있는 인근 중개업소를 찾는다.
    서울은 사용자가 받아둔 CSV를 지오코딩해서 반경순, 경기도는 경기데이터드림
    API를 법정동 일치로만 필터한다 (개별 주소가 없어 거리순 정렬 불가). 다른
    시/도는 아직 데이터 소스가 없어 조용히 생략한다."""
    from broker_lookup import MAX_CANDIDATES, find_brokers_gyeonggi, find_nearby_brokers_seoul, load_seoul_brokers
    from lawd_lookup import find_gu_in_address

    print()
    if "서울특별시" in address:
        rows = load_seoul_brokers(brokers_csv)
        if not rows:
            print(f"[인근 중개업소] {brokers_csv}가 없어 생략합니다.")
            print(f"       서울 열린데이터광장에서 공인중개사사무소 정보 CSV를 받아 {brokers_csv}에 저장해 주세요.")
            return
        brokers, truncated = find_nearby_brokers_seoul(rows, subject_coord, dong, radius_m)
        print(f"[인근 중개업소] ({dong} 기준, 반경 {radius_m:.0f}m, 영업중만 — 서울 열린데이터광장 CSV)")
        if truncated:
            print(f"       (참고: {dong}에 영업중 사무소가 많아 상위 {MAX_CANDIDATES}건만 지오코딩했습니다)")
        if not brokers:
            print("반경 안에서 찾지 못했습니다.")
            return
        for b in brokers[:8]:
            print(f"- {b['name']} ({b['broker_name']}) {b['tel']} — {b['distance_m']:.0f}m")
    elif "경기도" in address:
        sigun_nm = find_gu_in_address(address)
        if not sigun_nm:
            print("[인근 중개업소] 주소에서 시/군 이름을 찾지 못해 생략합니다.")
            return
        sigun_nm = sigun_nm.split(" ")[0]  # 경기데이터드림은 구 단위가 아닌 시/군 단위로 추정됨
        try:
            brokers = find_brokers_gyeonggi(sigun_nm, dong)
        except RuntimeError as e:
            print(f"[인근 중개업소] 조회 실패: {e}")
            return
        print(f"[인근 중개업소] ({dong} 기준, 영업중만 — 경기데이터드림, ⚠️ 개별 주소 정보가 없어 거리순 정렬 불가)")
        if not brokers:
            print("같은 동에서 찾지 못했습니다.")
            return
        for b in brokers[:8]:
            print(f"- {b['name']} ({b['broker_name']}) {b['tel']}")
    else:
        return  # 서울/경기 외 지역은 아직 데이터 소스가 없다


def print_building_info(subject_detail: dict):
    """CLAUDE.md 20절 규칙: 건축물대장에서 승강기/세대수/사용승인일 등을 확인한다."""
    from building_register import get_building_info

    print()
    print("[건물 정보] (건축물대장 기준)")
    try:
        info = get_building_info(
            subject_detail.get("b_code"), subject_detail.get("main_no"),
            subject_detail.get("sub_no"), subject_detail.get("is_mountain", False),
        )
    except RuntimeError as e:
        print(f"조회 실패: {e}")
        return

    if info is None:
        print("건축물대장 조회 결과가 없습니다 (API 미승인, 필드명 불일치, 주소 문제 등 확인 필요).")
        return

    elevator_txt = f"있음 ({info['elevator_count']}대)" if info["has_elevator"] else "없음"
    print(f"승강기: {elevator_txt}")
    if info.get("household_count"):
        print(f"세대수: {info['household_count']}세대")
    if info.get("approval_date"):
        print(f"사용승인일: {info['approval_date']}")
    if info.get("ground_floors"):
        print(f"지상층수: {info['ground_floors']}층")


def _trend_direction(delta, threshold=2.0, unit="p"):
    if delta is None:
        return "추세 판단 불가"
    if abs(delta) < threshold:
        return "보합"
    return f"{'상승' if delta > 0 else '하락'} 중 ({delta:+.1f}{unit})"


def print_market_trend(address: str):
    """CLAUDE.md 24절 규칙: 시장 동향 참고 지표 2종을 보여준다 — 한국부동산원
    연립다세대 매매수급동향지수(우리 프로젝트 대상과 정확히 일치)와 KB부동산
    스타일 아파트 매수우위지수(참고용, 시/도 단위). 둘 다 매도가 계산에
    반영하지 않고 참고용으로만 표시한다."""
    from market_index import (
        VILLA_SIDO_ALIAS, compute_market_trend, compute_villa_market_trend,
        load_market_index, load_villa_market_index, region_from_address,
    )

    villa_region = region_from_address(address, VILLA_SIDO_ALIAS)
    if villa_region is not None:
        villa_trend = compute_villa_market_trend(load_villa_market_index(), villa_region)
        if villa_trend is not None:
            idx = villa_trend["index_latest"]
            desc = "매도자 우위 — 상승 압력" if idx > 100 else "매수자 우위 — 하락 압력"
            print()
            print(f"[시장 동향 참고 - 연립다세대] ({villa_trend['region']}, 한국부동산원 매매수급동향지수, {villa_trend['snapshot_date']} 기준 스냅샷)")
            print(f"매매수급동향지수: {idx:.1f} ({desc}) — 최근 3개월 추세: {_trend_direction(villa_trend['index_trend'])}")
            print("⚠️ 시/도 단위 참고용입니다 (구/동 단위 신호 아님). 매도가 계산에 자동 반영되지 않습니다.")
            print(f"   {villa_trend['snapshot_date']} 기준 스냅샷이라 이후 갱신되지 않습니다 — 최신 수치는 한국부동산원 R-ONE에서 직접 확인하세요.")

    region = region_from_address(address)
    if region is None:
        return  # 표에 없는 시/도(아직 서울/경기 등 일부만 등록) — 조용히 생략

    rows = load_market_index()
    trend = compute_market_trend(rows, region)
    if trend is None:
        return

    buy_idx = trend["buy_index_latest"]
    buy_desc = "매도자 우위 — 상승 압력" if buy_idx > 100 else "매수자 우위 — 하락 압력"

    print()
    print(f"[시장 동향 참고 - 아파트] ({trend['region']}, KB부동산 스타일 지수, {trend['snapshot_date']} 기준 스냅샷)")
    print(f"매수우위지수: {buy_idx:.1f} ({buy_desc}) — 최근 4주 추세: {_trend_direction(trend['buy_index_trend'])}")
    if trend["jeonse_index_latest"] is not None:
        jeonse_idx = trend["jeonse_index_latest"]
        jeonse_desc = "전세 수요 > 공급" if jeonse_idx > 100 else "전세 수요 < 공급"
        print(f"전세수급지수: {jeonse_idx:.1f} ({jeonse_desc}) — 최근 4주 추세: {_trend_direction(trend['jeonse_index_trend'])}")
    print("⚠️ 이 지수는 아파트 시장 지표이며 시/도 단위(빌라 자체 시세 아님) 참고용입니다.")
    print(f"   {trend['snapshot_date']} 기준 스냅샷이라 이후 갱신되지 않습니다 — 최신 수치는 KB부동산에서 직접 확인하세요.")


def print_jeonse_comparison(rent_dir: str, subject_coord: tuple[float, float], area: float,
                             floor: int | None, build_year: str | None, radius_m: float,
                             year_min: int, this_year: int, gu_filter: str | None,
                             realistic_sale: float, fmt) -> None:
    """CLAUDE.md 16절 규칙: 매매가와 같은 반경/면적/연식/층 조건으로 예상 전세가를
    계산하고, 방금 계산한 매매 현실적 체결가와 나란히 비교한다."""
    rent_rows = dedupe_rent(load_transactions(rent_dir))
    if not rent_rows:
        return  # 전세 데이터가 없으면 조용히 생략한다 — 선택 기능이라 매매가 계산을 막지 않는다

    jeonse_rows = filter_pure_jeonse(rent_rows)
    jeonse_filtered = find_comparables(jeonse_rows, subject_coord, area, floor, build_year,
                                        radius_m, year_min, this_year, gu_filter,
                                        amount_field="deposit")
    if not jeonse_filtered:
        print()
        print(f"[예상 전세가] 반경 {radius_m:.0f}m, 유사면적 조건에 맞는 전세 비교거래를 찾지 못해 생략합니다.")
        return

    jscen = compute_scenarios(jeonse_filtered, radius_m, this_year)
    print()
    print(f"[예상 전세가] (매매가와 동일 조건 — 반경 {radius_m:.0f}m, 유사면적·유사층·유사연식)")
    print(f"유효 비교거래: {jscen['n_total']}건 (반경 {radius_m:.0f}m 이내, {radius_m/2:.0f}m 이내 {jscen['n_close']}건 / {this_year}년 {jscen['n_this_year']}건)")
    print(f"시세 신뢰도: {jscen['confidence']}/100")
    print()
    print(f"보수적 급매 전세가: {fmt(jscen['p25'])}")
    print(f"현실적 전세가: {fmt(jscen['median'])}")
    print(f"상단 전세가: {fmt(jscen['p75'])}")
    print()
    print("핵심 전세 비교거래 (가까운 순):")
    for r in jeonse_filtered[:8]:
        floor_txt = f"{r.get('floor')}층" if r.get("floor") else "층정보없음"
        print(f"- {r.get('mhouseNm','(단지명없음)')} {r.get('excluUseAr','?')}㎡, {floor_txt}, "
              f"{r.get('dealYear')}.{r.get('dealMonth')} 계약, {fmt(r['_amount_man'])} — {r['_distance_m']:.0f}m")

    jeonse_realistic = jscen["median"]
    ratio = jeonse_realistic / realistic_sale * 100 if realistic_sale else 0
    gap = realistic_sale - jeonse_realistic
    print()
    print("[매매 vs 전세 비교]")
    print(f"예상 매매가(현실적 체결가): {fmt(realistic_sale)}")
    print(f"예상 전세가(현실적 전세가): {fmt(jeonse_realistic)}")
    print(f"전세가율: {ratio:.1f}%")
    print(f"갭(매매가 - 전세가, 갭투자 시 필요자금 근사): {fmt(gap)}")
    if ratio >= 80:
        print("→ 전세가율이 높은 편입니다. 매매가 대비 갭투자 부담이 적은 지역일 수 있습니다.")
    elif ratio >= 65:
        print("→ 평균적인 수준의 전세가율입니다.")
    else:
        print("→ 전세가율이 낮은 편입니다. 매매가에 거품이 있거나 전세 수요가 약할 수 있습니다.")
    print("⚠️ 참고용 통계이며 확정 판단이 아닙니다. 전세 매물 수가 매매보다 적어 표본이 부족할 수 있습니다.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="data/raw")
    ap.add_argument("--rent-dir", default="data/raw_rent", help="전월세 실거래가 XML 폴더 — 데이터가 있으면 예상 전세가와 매매 대비 비교도 함께 보여준다 (CLAUDE.md 16절)")
    ap.add_argument("--address", required=True, help="대상 물건의 지번 주소 (지오코딩용, 예: '서울특별시 강북구 수유동 468-202')")
    ap.add_argument("--dong", required=True, help="법정동명 — 계절성/가격추이 등 동네 단위 분석 범위로 쓰인다")
    ap.add_argument("--area", type=float, required=True)
    ap.add_argument("--floor", type=int, default=None, help="대상 물건의 층 (선택 — 유사층 가중치 판단에 사용)")
    ap.add_argument("--build-year", default=None, help="대상 물건의 준공년도 (선택 — 유사연식 가중치 판단에 사용)")
    ap.add_argument("--radius", type=float, default=400, help="비교 반경(미터), 기본 400m")
    ap.add_argument("--year-min", type=int, default=None)
    ap.add_argument("--html", action="store_true", help="reports/ 폴더에 예쁜 HTML 리포트도 저장하고 브라우저로 연다")
    ap.add_argument("--bid-price", type=float, default=None, help="낙찰가/입찰예정가 (만원 단위) — 주면 수익성 계산도 같이 보여준다")
    ap.add_argument("--acquisition-rate", type=float, default=0.035, help="취득 부대비용률 (취득세+법무비 등 합산, 기본 3.5%%) — 다주택 여부에 따라 조정 필요")
    ap.add_argument("--sale-rate", type=float, default=0.005, help="매도 중개수수료율 (기본 0.5%%)")
    ap.add_argument("--extra-cost", type=float, default=0, help="명도비·수리비 등 추가비용 (만원 단위, 기본 0)")
    ap.add_argument("--no-location", action="store_true", help="입지 체크(지하철역/초등학교/마트 거리)를 건너뛴다")
    ap.add_argument("--no-building-info", action="store_true", help="건축물대장 조회(승강기/세대수/사용승인일)를 건너뛴다")
    ap.add_argument("--brokers-csv", default="data/brokers_seoul.csv", help="서울 인근 중개업소 조회용 CSV 경로 (서울 열린데이터광장에서 받은 공인중개사사무소 정보)")
    ap.add_argument("--broker-radius", type=float, default=1000, help="인근 중개업소 조회 반경(미터), 기본 1000m")
    ap.add_argument("--no-brokers", action="store_true", help="인근 중개업소 조회를 건너뛴다")
    ap.add_argument("--monthly-deposit", type=float, default=None, help="예상 월세 추정용 월세보증금(만원) — 주면 23절 예상 월세 추정을 같이 보여준다")
    ap.add_argument("--conversion-rate", type=float, default=6.0, help="전월세전환율(연 %%), 기본 6.0 — 지역/물건마다 달라 참고값일 뿐")
    ap.add_argument("--no-market-trend", action="store_true", help="24절 시장 동향 참고 지표(매수우위지수 등)를 건너뛴다")
    args = ap.parse_args()

    this_year = datetime.now().year
    year_min = args.year_min or (this_year - 1)

    rows = dedupe(load_transactions(args.dir))
    if not rows:
        print(f"[안내] {args.dir} 폴더에서 유효한 XML 거래 데이터를 찾지 못했습니다.")
        print("       molit_rhtrade_api.py로 조회한 결과를 이 폴더에 .xml 또는 .txt로 저장해 주세요.")
        return

    from geocode import geocode_full
    from lawd_lookup import find_gu_in_address

    subject_detail = geocode_full(args.address)
    if subject_detail is None:
        print(f"[안내] 대상 물건 주소({args.address})를 좌표로 변환하지 못했습니다.")
        print("       카카오 개발자 콘솔에서 발급받은 KAKAO_REST_API_KEY가 .env에 있는지,")
        print("       주소 표기가 정확한지(지번 주소 권장) 확인해 주세요.")
        return
    subject_coord = (subject_detail["lat"], subject_detail["lon"])

    if not args.no_location:
        print_location_check(subject_coord)

    if not args.no_brokers:
        print_broker_check(args.address, subject_coord, args.dong, args.brokers_csv, args.broker_radius)

    if not args.no_building_info:
        print_building_info(subject_detail)

    if not args.no_market_trend:
        print_market_trend(args.address)

    gu_filter = find_gu_in_address(args.address)

    filtered = find_comparables(rows, subject_coord, args.area, args.floor, args.build_year,
                                 args.radius, year_min, this_year, gu_filter)

    if not filtered:
        print(f"[안내] 반경 {args.radius:.0f}m, 유사면적 조건에 맞는 비교거래를 찾지 못했습니다.")
        print("       반경을 넓히거나(--radius), data/raw에 더 많은 지역/기간 데이터를 추가해 보세요.")
        return

    scen = compute_scenarios(filtered, args.radius, this_year)
    n_total, n_close, n_2026, confidence = scen["n_total"], scen["n_close"], scen["n_this_year"], scen["confidence"]
    conservative = scen["p25"]
    realistic = scen["median"]
    upper = scen["p75"]
    ai_base = round((conservative * 0.3 + realistic * 0.5 + upper * 0.2), -1)
    listing = round(upper * 1.03, -1)

    def fmt(man):
        eok = man / 10000
        return f"{eok:.2f}억"

    print(f"분석기간: {year_min}.01 ~ {this_year}.12")
    print(f"유효 비교거래: {n_total}건 (반경 {args.radius:.0f}m 이내, {args.radius/2:.0f}m 이내 {n_close}건 / {this_year}년 {n_2026}건)")
    print(f"시세 신뢰도: {confidence}/100")
    print()
    print(f"보수적 급매가: {fmt(conservative)}")
    print(f"현실적 체결가: {fmt(realistic)}")
    print(f"상단 매도가: {fmt(upper)}")
    print(f"AI 기준매도가: {fmt(ai_base)}")
    print(f"권장 최초 호가: {fmt(listing)}")
    print()
    print("핵심 비교거래 (가까운 순):")
    for r in filtered[:8]:
        floor_txt = f"{r.get('floor')}층" if r.get("floor") else "층정보없음"
        print(f"- {r.get('mhouseNm','(단지명없음)')} {r.get('excluUseAr','?')}㎡, {floor_txt}, "
              f"{r.get('dealYear')}.{r.get('dealMonth')} 계약, {fmt(r['_amount_man'])} — {r['_distance_m']:.0f}m")

    if args.monthly_deposit is not None:
        print_monthly_rent(realistic, args.monthly_deposit, args.conversion_rate, fmt)

    print_jeonse_comparison(args.rent_dir, subject_coord, args.area, args.floor, args.build_year,
                             args.radius, year_min, this_year, gu_filter, realistic, fmt)

    if args.bid_price is not None:
        scenarios = {
            "conservative": conservative, "realistic": realistic, "upper": upper,
            "ai_base": ai_base, "listing": listing,
        }
        print_profit(args.bid_price, scenarios, args.acquisition_rate, args.sale_rate, args.extra_cost)

    season = compute_seasonality(rows, args.dong)
    print_seasonality(season)

    trend = compute_price_trend(rows, args.dong)
    print()
    if trend["series"]:
        first_label, first_val = trend["series"][0]
        last_label, last_val = trend["series"][-1]
        change_pct = (last_val - first_val) / first_val * 100 if first_val else 0
        sign = "+" if change_pct >= 0 else ""
        print(f"[가격 추이] ({trend['scope_label']} 기준, {first_label} → {last_label})")
        print(f"평당가(만원/㎡) {first_val:.0f} → {last_val:.0f} ({sign}{change_pct:.1f}%)")
    else:
        print("[가격 추이] 그래프를 그리기엔 데이터가 부족합니다 (최소 3개월 이상 분포 필요).")

    if args.html:
        from report import render_report

        comparables = [
            {
                "name": r.get("mhouseNm", "(단지명없음)"),
                "area": r.get("excluUseAr", "?"),
                "date": f"{r.get('dealYear')}.{r.get('dealMonth')}",
                "amount": r["_amount_man"],
                "label": f"{r['_distance_m']:.0f}m",
            }
            for r in filtered[:8]
        ]
        html_str = render_report(
            building=args.dong, dong=args.dong, area=args.area,
            period=f"{year_min}.01 ~ {this_year}.12", generated=datetime.now().strftime("%Y.%m.%d %H:%M"),
            confidence=confidence, conservative=conservative, realistic=realistic,
            upper=upper, ai_base=ai_base, listing=listing,
            n_total=n_total, n_close=n_close,
            comparables=comparables, season=season, trend=trend,
        )
        reports_dir = "reports"
        os.makedirs(reports_dir, exist_ok=True)
        out_name = f"{args.dong.replace(' ', '_')}_{datetime.now():%Y%m%d_%H%M%S}.html"
        out_path = os.path.join(reports_dir, out_name)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_str)
        print(f"\n[HTML 리포트 저장됨] {out_path}")
        try:
            os.startfile(out_path)  # Windows 전용: 기본 브라우저로 바로 열기
        except AttributeError:
            pass  # Windows가 아니면 자동으로 열지 않고 저장만 한다


if __name__ == "__main__":
    main()
