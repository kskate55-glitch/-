"""
저장된 국토부 연립다세대 실거래가 XML(들)을 읽어서
매도가 범위(보수적 급매가 / 현실적 체결가 / 상단 매도가 / AI 기준매도가 / 권장 호가)를
CLAUDE.md 8절 포맷으로 계산하고, 12절 규칙에 따른 월별 계절성(거래 활발한 달)과
15절 규칙에 따른 월별 가격 추이, 16절 규칙에 따른 예상 전세가·매매 대비 비교,
19절 규칙에 따른 입지 체크·수익성 계산, 20절 규칙에 따른 건축물대장 조회
(승강기·세대수·사용승인일), 21절 규칙에 따른 인근 중개업소 조회, 23절 규칙에
따른 예상 월세 추정(전월세전환율 역산, --monthly-deposit 생략 시 반경 안
실제 월세 거래로 역산한 실측치를 우선 쓴다), 26절 규칙에 따른 역세권
프리미엄 참고(--station-premium, 거리-가격 회귀)도 함께 출력한다.

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
--acquisition-rate : 취득 부대비용률 (기본 1.1%, 1주택/무주택 실수요 기준 — 다주택/
                     규제지역이면 최대 13%까지 올라가니 본인 상황에 맞게 조정 필요)
--sale-rate        : 매도 중개수수료율 (기본 0.5%)
--extra-cost       : 명도비·수리비 등 추가비용 (만원 단위, 기본 0)
--no-location      : 입지 체크(지하철역/초등학교/마트 거리)를 건너뛴다
--brokers-csv      : 서울 인근 중개업소 조회용 CSV (기본 data/brokers_seoul.csv,
                     서울 열린데이터광장에서 받은 공인중개사사무소 정보)
--broker-radius    : 인근 중개업소 조회 반경(미터), 기본 1000m
--no-brokers       : 인근 중개업소 조회를 건너뛴다
--monthly-deposit  : 예상 월세 추정용 월세보증금 (만원, 선택 — 주면 23절 예상 월세
                     추정을 같이 보여준다. 순수월세면 0)
--conversion-rate  : 전월세전환율 (연 %, 선택) — 생략하면 반경 안 실제 월세
                     거래로 역산한 실측치를 쓰고, 그것도 없으면 6.0(기본값)

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


def filter_wolse(rows: list[dict]) -> list[dict]:
    """월세가 섞인(monthlyRent != 0) 거래만 남긴다 — 16절과 반대. CLAUDE.md 23-1절
    실측 전월세전환율 계산에 쓴다. 16절은 이 거래들을 버리지만, 여기서는 반대로
    이 거래들이야말로 "월세보증금 대비 월세" 실제 사례라 전환율 역산의 재료다."""
    out = []
    for r in rows:
        if to_amount_man(r.get("monthlyRent", "0")) == 0:
            continue
        out.append(r)
    return out


def estimate_conversion_rate(rent_dir: str, subject_coord: tuple[float, float], area: float,
                              floor: int | None, build_year: str | None, radius_m: float,
                              year_min: int, this_year: int, gu_filter: str | None,
                              area_tolerance_pct: float = 0.15, build_year_tolerance: int = 4) -> dict | None:
    """CLAUDE.md 23-1절 규칙: 8절 매도가 계산에는 안 쓰이고 버려지던 월세 낀
    전월세 실거래(filter_wolse)를 반경/면적/연식/층 조건(find_comparables)으로
    같은 물건 기준까지 좁힌 뒤, 각 건의 (월세보증금, 월세)를 16절과 동일한
    조건으로 구한 "예상 전세보증금"(순수 전세 비교거래의 현실적 전세가)과
    비교해서 그 지역 실제 전월세전환율을 역산한다.

    전환율(연 %) = 월세×12 ÷ (예상 전세보증금 − 월세보증금) × 100

    예상 전세보증금 자체가 없거나(전세 비교거래 0건), 월세 비교거래가 없거나,
    계산된 전환율이 죄다 비현실적 범위(0~30%) 밖이면 None을 돌려준다 — 이 경우
    호출부는 23절 기본값(6.0%)으로 조용히 폴백한다."""
    rent_rows = dedupe_rent(load_transactions(rent_dir))
    if not rent_rows:
        return None

    jeonse_rows = filter_pure_jeonse(rent_rows)
    jeonse_filtered = find_comparables(jeonse_rows, subject_coord, area, floor, build_year,
                                        radius_m, year_min, this_year, gu_filter,
                                        amount_field="deposit",
                                        area_tolerance_pct=area_tolerance_pct,
                                        build_year_tolerance=build_year_tolerance)
    if not jeonse_filtered:
        return None
    reference_deposit = compute_scenarios(jeonse_filtered, radius_m, this_year)["median"]

    wolse_rows = filter_wolse(rent_rows)
    wolse_filtered = find_comparables(wolse_rows, subject_coord, area, floor, build_year,
                                       radius_m, year_min, this_year, gu_filter,
                                       amount_field="monthlyRent",
                                       area_tolerance_pct=area_tolerance_pct,
                                       build_year_tolerance=build_year_tolerance)
    if not wolse_filtered:
        return None

    rates = []
    for r in wolse_filtered:
        monthly = r["_amount_man"]
        deposit = to_amount_man(r.get("deposit", ""))
        if deposit != deposit:
            continue
        denom = reference_deposit - deposit
        if denom <= 0:
            continue  # 월세보증금이 예상 전세가보다 크거나 같으면 역산이 성립하지 않는다
        rate = monthly * 12 / denom * 100
        if 0 < rate < 30:  # 입력 오류 등으로 인한 비현실적 이상치는 제외 (통상 3~15% 범위)
            rates.append(rate)

    if not rates:
        return None

    rates.sort()
    n = len(rates)
    median_rate = rates[n // 2] if n % 2 else (rates[n // 2 - 1] + rates[n // 2]) / 2
    return {"rate": median_rate, "n": n, "reference_deposit": reference_deposit}


def to_amount_man(s: str) -> float:
    """'36,900' (만원 단위 문자열) -> 36900.0 (만원, float)"""
    try:
        return float(s.replace(",", ""))
    except (ValueError, AttributeError):
        return float("nan")


def find_comparables(rows: list[dict], subject_coord: tuple[float, float], area: float,
                      floor: int | None, build_year: str | None, radius_m: float,
                      year_min: int, this_year: int, gu_filter: str | None,
                      amount_field: str = "dealAmount",
                      area_tolerance_pct: float = 0.15, build_year_tolerance: int = 4) -> list[dict]:
    """CLAUDE.md 5절 규칙: 실제 반경(기본 400m) 안의 유사면적 매물만 비교 대상으로
    삼고, 거리·층·연식 유사도로 가중치를 준다.

    빌라/다세대는 한 건물에 보통 3~4세대뿐이라 "동일건물" 비교는 표본이 거의
    항상 부족하다. 그래서 실제 중개업소·투자자들처럼 "실제 반경 안 + 비슷한
    면적 + 비슷한 층 + 비슷한 연식"을 기준으로 삼는다. 건물명이 같은지는 더
    이상 필터링에 쓰지 않는다.

    amount_field: 금액 필드명. 매매 행은 "dealAmount", 전세 행은 "deposit"
    (CLAUDE.md 16절 — 예상 전세가도 같은 로직으로 계산한다).

    area_tolerance_pct/build_year_tolerance: 면적/준공년도 허용범위(기본
    ±15%/±4년) — CLI `--area-tolerance`/`--build-year-tolerance`, 웹 폼
    "상세 옵션"으로 사용자가 직접 조정할 수 있다(5절).

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
        if abs(row_area - area) / area > area_tolerance_pct:
            continue  # 반경 안이라도 면적이 많이 다르면 비교 대상에서 제외

        row_build_year = r.get("buildYear", "").strip()
        if build_year is not None and row_build_year.isdigit():
            if abs(int(row_build_year) - int(build_year)) > build_year_tolerance:
                continue  # 준공년도 허용범위를 벗어나면 비교 대상에서 아예 제외

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
            r["_lat"], r["_lon"] = coord
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


def describe_comparable_similarity(subject_area: float, subject_floor: int | None,
                                    subject_build_year: str | None, row: dict) -> str:
    """비교거래 하나가 대상 물건과 정확히 어떤 부분이 비슷하고 어떤 부분이
    다른지 짧게 요약한다(면적/층/준공년도) — "핵심 비교거래" 목록에 물건마다
    괄호로 달아서, 왜 이 물건이 골라졌는지/어디를 감안하고 봐야 하는지
    사용자가 바로 알 수 있게 한다. 거리는 목록에 이미 따로 표시되므로 여기
    넣지 않는다."""
    parts = []

    row_area = row.get("excluUseAr")
    try:
        row_area = float(row_area)
        diff_pct = (row_area - subject_area) / subject_area * 100
        if abs(diff_pct) <= 3:
            parts.append("면적 비슷")
        else:
            parts.append(f"면적 {diff_pct:+.0f}%")
    except (TypeError, ValueError):
        parts.append("면적 정보없음")

    if subject_floor is not None:
        row_floor_raw = (row.get("floor") or "").strip()
        try:
            row_floor = int(row_floor_raw)
            diff = row_floor - subject_floor
            parts.append("층 동일" if diff == 0 else f"층 {diff:+d}")
        except ValueError:
            parts.append("층 정보없음")

    if subject_build_year is not None:
        row_build_year = (row.get("buildYear") or "").strip()
        if row_build_year.isdigit():
            diff = int(row_build_year) - int(subject_build_year)
            parts.append("준공 동일" if diff == 0 else f"준공 {abs(diff)}년 차이")
        else:
            parts.append("준공년도 정보없음")

    return " · ".join(parts)


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


def print_monthly_rent(realistic_sale_man: float, deposit_man: float, annual_rate_pct: float, fmt,
                        rate_source: str = "기본값", measured: dict | None = None) -> None:
    monthly_rent = compute_monthly_rent(realistic_sale_man, deposit_man, annual_rate_pct)
    print()
    print("[예상 월세 추정] (전월세전환율 역산, 예상 매도가 기준)")
    print(f"기준 매도가(현실적 체결가): {fmt(realistic_sale_man)}")
    print(f"가정: 월세보증금 {deposit_man:.0f}만원, 연 전환율 {annual_rate_pct:.1f}% ({rate_source})")
    print(f"예상 월세: {monthly_rent:.0f}만원/월")
    if measured is not None and abs(measured["rate"] - annual_rate_pct) > 0.05:
        print(f"참고: 반경 안 실제 월세 거래 {measured['n']}건으로 역산한 이 지역 실측 전환율은 {measured['rate']:.1f}%입니다"
              f" (예상 전세보증금 {measured['reference_deposit']:,.0f}만원 기준).")
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
        "auction_price": "경매용 매도가",
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
    """CLAUDE.md 24절 규칙: 한국부동산원 연립다세대 매매수급동향지수(우리
    프로젝트 대상과 정확히 일치)를 참고용으로 보여준다. 매도가 계산에는
    반영하지 않는다. 지수 숫자만 던지면 이해하기 어려워서 쉬운 말로도
    풀어주고, 다른 지역/최초 집계 시점 대비 숫자로도 비교해준다.
    (KB부동산 스타일 아파트 지표는 사용자 요청으로 출력에서 뺐다 — 계산
    로직 자체는 market_index.py에 남아있어 필요하면 다시 켤 수 있다.)"""
    from market_index import (
        VILLA_SIDO_ALIAS, _plain_market_desc, compute_villa_market_trend,
        format_ranking_peers, latest_value_for, load_villa_market_index,
        load_villa_seoul_zone_index, rank_region, region_from_address,
        seoul_zone_from_address,
    )

    villa_zone = seoul_zone_from_address(address)
    villa_trend = None
    villa_label = None
    villa_is_zone = False
    villa_rows = None
    if villa_zone is not None:
        villa_rows = load_villa_seoul_zone_index()
        villa_trend = compute_villa_market_trend(villa_rows, villa_zone)
        if villa_trend is not None:
            villa_label = f"서울 {villa_zone}"
            villa_is_zone = True

    if villa_trend is None:
        villa_region = region_from_address(address, VILLA_SIDO_ALIAS)
        if villa_region is not None:
            villa_rows = load_villa_market_index()
            villa_trend = compute_villa_market_trend(villa_rows, villa_region)
            if villa_trend is not None:
                villa_label = villa_trend["region"]

    if villa_trend is not None:
        idx = villa_trend["index_latest"]
        unit_note = ("서울 내 5대 생활권(도심/동북/서북/서남/동남) 단위 참고용입니다 (개별 구/동 신호 아님)"
                     if villa_is_zone else "시/도 단위 참고용입니다 (구/동 단위 신호 아님)")
        print()
        print(f"[시장 동향 참고 - 연립다세대] ({villa_label}, 한국부동산원 매매수급동향지수, {villa_trend['snapshot_date']} 기준 스냅샷)")
        print(f"매매수급동향지수: {idx:.1f} (기준선 100 대비 {idx - 100:+.1f})")
        print(f"→ {_plain_market_desc(idx)}")
        since = villa_trend["since_start"]
        print(f"최근 3개월 추세: {_trend_direction(villa_trend['index_trend'])} "
              f"({villa_trend['start_date']} 최초 집계 {villa_trend['start_value']:.1f} → 지금 {idx:.1f}, {since:+.1f}p)")

        if villa_is_zone:
            zone_rank = rank_region(villa_rows, villa_zone, "index")
            if zone_rank is not None:
                print(f"서울 5개 생활권 비교 ({zone_rank['date']} 기준):")
                for line in format_ranking_peers(zone_rank["ranking"], villa_zone, max_show=5):
                    print(f"  {line}")
        national = latest_value_for(load_villa_market_index(), "전국", "index")
        if national is not None:
            _nat_date, nat_val = national
            print(f"전국 평균({nat_val:.1f}) 대비: {idx - nat_val:+.1f}p "
                  f"({'전국보다 강세' if idx > nat_val else '전국보다 약세' if idx < nat_val else '전국과 비슷'})")
        print(f"⚠️ {unit_note}. 매도가 계산에 자동 반영되지 않습니다.")
        print("   이 지표는 2025년 11월부터 모은 스냅샷이라 '작년 대비' 계산은 아직 할 수 없습니다 —")
        print(f"   대신 최초 집계({villa_trend['start_date']}) 대비 변화로 참고하세요. 최신 수치는 한국부동산원 R-ONE에서 확인하세요.")


def compute_distance_premium(filtered: list[dict], keyword: str = "지하철역",
                              search_radius_m: int = 1500, max_sample: int = 15) -> dict | None:
    """CLAUDE.md 26절 규칙: find_comparables()가 이미 지오코딩해둔 비교거래
    좌표를 재사용해서, 대상 시설(기본 지하철역)까지 거리와 평당가 사이의
    실제 관계를 단순 선형회귀로 추정한다 — "역에서 가까울수록 실제로 평당가가
    얼마나 비싼지"를 이 지역 실거래 데이터로 직접 계산한다 (19절 입지체크가
    대상 물건 하나의 거리만 보여주는 것과 달리, 여기서는 그 거리가 가격에
    실제로 얼마나 영향을 주는지까지 본다).

    이미 거리순으로 정렬된 filtered에서 가까운 상위 max_sample개만 쓴다 —
    카카오 키워드 검색을 비교거래마다 하나씩 호출해야 해서(geocode()와 달리
    결과가 좌표+키워드 조합마다 달라 캐시 재사용이 제한적이다) 비용을 이
    정도로 묶는다."""
    from geocode import nearby_place

    sample = filtered[:max_sample]

    def _lookup(r):
        return r, nearby_place(r["_lat"], r["_lon"], keyword, search_radius_m)

    points = []  # (시설까지 거리 m, 평당가 만원/㎡)
    with ThreadPoolExecutor(max_workers=GEOCODE_WORKERS) as executor:
        for r, place in executor.map(_lookup, sample):
            if place is None:
                continue
            area = float(r.get("excluUseAr", "nan") or "nan")
            if area != area or not area:
                continue
            points.append((place["distance_m"], r["_amount_man"] / area))

    if len(points) < 5:
        return None  # 표본이 너무 적으면(카카오에 시설이 안 잡히는 경우 포함) 회귀 자체가 무의미하다

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    n = len(points)
    mean_x, mean_y = sum(xs) / n, sum(ys) / n
    var_x = sum((x - mean_x) ** 2 for x in xs)
    if var_x == 0:
        return None  # 표본의 거리가 다 똑같으면(한 건물에 몰림 등) 기울기를 구할 수 없다

    cov_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    slope = cov_xy / var_x  # 거리 1m 늘어날 때 평당가(만원/㎡) 변화
    var_y = sum((y - mean_y) ** 2 for y in ys)
    r_squared = (cov_xy ** 2) / (var_x * var_y) if var_y > 0 else 0.0

    return {
        "n": n, "keyword": keyword,
        "change_per_100m": slope * 100,
        "pct_per_100m": (slope * 100 / mean_y * 100) if mean_y else 0,
        "r_squared": r_squared,
        "avg_price_ppyeong": mean_y,
        "min_distance": min(xs), "max_distance": max(xs),
    }


def print_distance_premium(filtered: list[dict], keyword: str = "지하철역") -> None:
    result = compute_distance_premium(filtered, keyword)
    print()
    label = keyword
    if result is None:
        print(f"[역세권 프리미엄 참고] 표본이 부족하거나({label}까지 거리가 다 비슷하거나 검색 결과가 없음) "
              "계산할 만한 관계를 찾지 못해 생략합니다.")
        return

    direction = "가까울수록 비싸지는" if result["change_per_100m"] < 0 else "가까울수록 오히려 싸지는"
    print(f"[역세권 프리미엄 참고] (반경 안 비교거래 {result['n']}건, {label}까지 거리 기준 — {result['min_distance']}~{result['max_distance']}m 분포)")
    print(f"{label}에서 100m 멀어질 때마다 평당가 {abs(result['change_per_100m']):.1f}만원/㎡ "
          f"({abs(result['pct_per_100m']):.1f}%) {'하락' if result['change_per_100m'] < 0 else '상승'} 경향")
    print(f"→ 이 지역 비교거래는 {label}에 {direction} 경향을 보입니다 (설명력 R²={result['r_squared']:.2f}, "
          f"1에 가까울수록 거리만으로 가격 차이가 잘 설명됨).")
    if result["r_squared"] < 0.2:
        print("⚠️ 설명력(R²)이 낮아 거리 외에 다른 요인(층·연식·개별 단지 차이 등)의 영향이 더 클 수 있습니다.")
    print("⚠️ 표본이 최대 15건인 단순 참고 통계입니다 — 매도가 계산에 자동 반영되지 않습니다.")


def print_jeonse_comparison(rent_dir: str, subject_coord: tuple[float, float], area: float,
                             floor: int | None, build_year: str | None, radius_m: float,
                             year_min: int, this_year: int, gu_filter: str | None,
                             realistic_sale: float, fmt,
                             area_tolerance_pct: float = 0.15, build_year_tolerance: int = 4) -> None:
    """CLAUDE.md 16절 규칙: 매매가와 같은 반경/면적/연식/층 조건으로 예상 전세가를
    계산하고, 방금 계산한 매매 현실적 체결가와 나란히 비교한다."""
    rent_rows = dedupe_rent(load_transactions(rent_dir))
    if not rent_rows:
        return  # 전세 데이터가 없으면 조용히 생략한다 — 선택 기능이라 매매가 계산을 막지 않는다

    jeonse_rows = filter_pure_jeonse(rent_rows)
    jeonse_filtered = find_comparables(jeonse_rows, subject_coord, area, floor, build_year,
                                        radius_m, year_min, this_year, gu_filter,
                                        amount_field="deposit",
                                        area_tolerance_pct=area_tolerance_pct,
                                        build_year_tolerance=build_year_tolerance)
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
    ap.add_argument("--area-tolerance", type=float, default=15.0, help="면적 허용범위(%%, 기본 15) — 대상 물건 전용면적과 이 범위 안 오차인 실거래만 비교 대상으로 삼는다")
    ap.add_argument("--build-year-tolerance", type=int, default=4, help="준공년도 허용범위(년, 기본 4) — --build-year를 줬을 때만 적용")
    ap.add_argument("--year-min", type=int, default=None)
    ap.add_argument("--html", action="store_true", help="reports/ 폴더에 예쁜 HTML 리포트도 저장하고 브라우저로 연다")
    ap.add_argument("--bid-price", type=float, default=None, help="낙찰가/입찰예정가 (만원 단위) — 주면 수익성 계산도 같이 보여준다")
    ap.add_argument("--acquisition-rate", type=float, default=0.011, help="취득 부대비용률 (취득세+법무비 등 합산, 기본 1.1%% — 1주택/무주택 실수요 기준) — 다주택/규제지역이면 최대 13%%까지 올라가니 조정 필요")
    ap.add_argument("--sale-rate", type=float, default=0.005, help="매도 중개수수료율 (기본 0.5%%)")
    ap.add_argument("--extra-cost", type=float, default=0, help="명도비·수리비 등 추가비용 (만원 단위, 기본 0)")
    ap.add_argument("--no-location", action="store_true", help="입지 체크(지하철역/초등학교/마트 거리)를 건너뛴다")
    ap.add_argument("--no-building-info", action="store_true", help="건축물대장 조회(승강기/세대수/사용승인일)를 건너뛴다")
    ap.add_argument("--brokers-csv", default="data/brokers_seoul.csv", help="서울 인근 중개업소 조회용 CSV 경로 (서울 열린데이터광장에서 받은 공인중개사사무소 정보)")
    ap.add_argument("--broker-radius", type=float, default=1000, help="인근 중개업소 조회 반경(미터), 기본 1000m")
    ap.add_argument("--no-brokers", action="store_true", help="인근 중개업소 조회를 건너뛴다")
    ap.add_argument("--monthly-deposit", type=float, default=None, help="예상 월세 추정용 월세보증금(만원) — 주면 23절 예상 월세 추정을 같이 보여준다")
    ap.add_argument("--conversion-rate", type=float, default=None, help="전월세전환율(연 %%) — 생략하면 반경 안 실제 월세 거래로 역산한 실측치를 쓰고, 그것도 없으면 6.0(참고용 기본값)으로 폴백한다")
    ap.add_argument("--no-market-trend", action="store_true", help="24절 시장 동향 참고 지표(매수우위지수 등)를 건너뛴다")
    ap.add_argument("--no-dong-compare", action="store_true", help="25절 인근 동 비교(거래활발도/가격상승률)를 건너뛴다")
    ap.add_argument("--station-premium", action="store_true", help="26절 역세권 프리미엄 참고(거리-가격 회귀)를 계산한다 — 카카오 키워드 검색을 비교거래마다 추가로 호출해서 기본은 꺼져 있다")
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

    from naver_link import naver_land_url

    naver_url = naver_land_url(*subject_coord)
    print(f"[참고] 이 지역 네이버부동산 매물(빌라·매매) 바로 보기: {naver_url}")
    print()

    if not args.no_location:
        print_location_check(subject_coord)

    if not args.no_brokers:
        print_broker_check(args.address, subject_coord, args.dong, args.brokers_csv, args.broker_radius)

    if not args.no_building_info:
        print_building_info(subject_detail)

    if not args.no_market_trend:
        print_market_trend(args.address)

    gu_filter = find_gu_in_address(args.address)

    area_tolerance_pct = args.area_tolerance / 100
    filtered = find_comparables(rows, subject_coord, args.area, args.floor, args.build_year,
                                 args.radius, year_min, this_year, gu_filter,
                                 area_tolerance_pct=area_tolerance_pct,
                                 build_year_tolerance=args.build_year_tolerance)

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
    auction_price = round((conservative + realistic) / 2, -1)

    def fmt(man):
        eok = man / 10000
        return f"{eok:.2f}억"

    print(f"분석기간: {year_min}.01 ~ {this_year}.12")
    print(f"유효 비교거래: {n_total}건 (반경 {args.radius:.0f}m 이내, {args.radius/2:.0f}m 이내 {n_close}건 / {this_year}년 {n_2026}건)")
    print(f"시세 신뢰도: {confidence}/100")
    print()
    print(f"보수적 급매가: {fmt(conservative)}")
    print(f"현실적 체결가: {fmt(realistic)} (일반 매매 기준)")
    print(f"경매용 매도가: {fmt(auction_price)} (보수적 급매가~현실적 체결가 중간값 — 경매 낙찰 후 되파는 경우 참고)")
    print(f"상단 매도가: {fmt(upper)}")
    print(f"AI 기준매도가: {fmt(ai_base)}")
    print(f"권장 최초 호가: {fmt(listing)}")
    print()
    build_year_note = f", 준공년도 ±{args.build_year_tolerance}년 이내" if args.build_year is not None else ""
    print(f"핵심 비교거래 (가까운 순 — 반경 {args.radius:.0f}m 안, 전용면적 ±{args.area_tolerance:.0f}%{build_year_note}인 "
          f"실거래 중 거리·계약시기·층이 비슷할수록 가중치를 높게 준 것입니다):")
    for r in filtered[:8]:
        floor_txt = f"{r.get('floor')}층" if r.get("floor") else "층정보없음"
        note = describe_comparable_similarity(args.area, args.floor, args.build_year, r)
        print(f"- {r.get('mhouseNm','(단지명없음)')} {r.get('excluUseAr','?')}㎡, {floor_txt}, "
              f"{r.get('dealYear')}.{r.get('dealMonth')} 계약, {fmt(r['_amount_man'])} — {r['_distance_m']:.0f}m ({note})")

    if args.station_premium:
        print_distance_premium(filtered)

    if args.monthly_deposit is not None:
        measured_rate = estimate_conversion_rate(args.rent_dir, subject_coord, args.area, args.floor,
                                                   args.build_year, args.radius, year_min, this_year, gu_filter,
                                                   area_tolerance_pct=area_tolerance_pct,
                                                   build_year_tolerance=args.build_year_tolerance)
        if args.conversion_rate is not None:
            effective_rate, rate_source = args.conversion_rate, "사용자 지정"
        elif measured_rate is not None:
            effective_rate = measured_rate["rate"]
            rate_source = f"실측치, 반경 안 월세 거래 {measured_rate['n']}건 기준"
        else:
            effective_rate, rate_source = 6.0, "기본값, 반경 안에 참고할 월세 실거래 없음"
        print_monthly_rent(realistic, args.monthly_deposit, effective_rate, fmt,
                            rate_source=rate_source, measured=measured_rate)

    print_jeonse_comparison(args.rent_dir, subject_coord, args.area, args.floor, args.build_year,
                             args.radius, year_min, this_year, gu_filter, realistic, fmt,
                             area_tolerance_pct=area_tolerance_pct,
                             build_year_tolerance=args.build_year_tolerance)

    if args.bid_price is not None:
        scenarios = {
            "conservative": conservative, "realistic": realistic, "auction_price": auction_price,
            "upper": upper, "ai_base": ai_base, "listing": listing,
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

    if not args.no_dong_compare:
        from lawd_lookup import gu_name
        from rank_areas import print_dong_comparison

        gu_rows = [r for r in rows if gu_filter is None or gu_name(r.get("sggCd", "")) == gu_filter]
        print_dong_comparison(gu_rows, args.dong, gu_filter)

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
            upper=upper, ai_base=ai_base, listing=listing, auction_price=auction_price,
            n_total=n_total, n_close=n_close,
            comparables=comparables, season=season, trend=trend, filtered=filtered,
            naver_url=naver_url,
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
