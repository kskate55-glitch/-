"""
저장된 국토부 연립다세대 실거래가 XML(들)을 읽어서
매도가 범위(보수적 급매가 / 현실적 체결가 / 상단 매도가 / AI 기준매도가 / 권장 호가)를
CLAUDE.md 8절 포맷으로 계산하고, 12절 규칙에 따른 월별 계절성(거래 활발한 달)과
15절 규칙에 따른 월별 가격 추이 분석도 함께 출력한다.

사용법:
    python estimate_price.py --dir data/raw \
        --address "서울특별시 강북구 수유동 468-202" --dong 수유동 \
        --area 69.27 --floor 5 --radius 400 --year-min 2025

--dir       : XML 파일들이 들어있는 폴더 (여러 달치를 다 넣어두면 자동으로 합쳐서 계산)
--address   : 대상 물건의 지번 주소 — 카카오 로컬 API로 좌표를 구하는 데 쓴다
--dong      : 법정동명 (umdNm) — 계절성/가격추이 등 동네 단위 분석 범위로 쓰인다
--area      : 대상 물건의 전용면적(㎡) — ±15% 이내를 "비슷한 면적"으로 취급
--floor     : 대상 물건의 층 (선택 — 유사층 가중치 판단에 사용)
--radius    : 비교 반경(미터), 기본 400m
--year-min  : 매도가 계산에 사용할 최소 계약년도 (기본값: 실행 시점 기준 작년)

이 스크립트는 실거래가 XML 파일 텍스트만 읽는다 — 국토부 API를 직접 호출하지
않는다 (그건 molit_rhtrade_api.py의 몫). 다만 --address를 좌표로 바꾸기 위해
카카오 로컬 API는 직접 호출한다 (geocode.py, 환경변수 KAKAO_REST_API_KEY 필요).
"""

import argparse
import glob
import os
import re
import statistics
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime


def load_transactions(xml_dir: str) -> list[dict]:
    rows = []
    for path in glob.glob(os.path.join(xml_dir, "*.xml")) + glob.glob(os.path.join(xml_dir, "*.txt")):
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


def to_amount_man(s: str) -> float:
    """'36,900' (만원 단위 문자열) -> 36900.0 (만원, float)"""
    try:
        return float(s.replace(",", ""))
    except (ValueError, AttributeError):
        return float("nan")


def find_comparables(rows: list[dict], subject_coord: tuple[float, float], area: float,
                      floor: int | None, radius_m: float, year_min: int, this_year: int,
                      gu_filter: str | None) -> list[dict]:
    """CLAUDE.md 5절 규칙: 실제 반경(기본 400m) 안의 유사면적 매물만 비교 대상으로
    삼고, 거리·층 유사도로 가중치를 준다.

    빌라/다세대는 한 건물에 보통 3~4세대뿐이라 "동일건물" 비교는 표본이 거의
    항상 부족하다. 그래서 실제 중개업소·투자자들처럼 "실제 반경 안 + 비슷한
    면적 + 비슷한 층"을 기준으로 삼는다. 건물명이 같은지는 더 이상 필터링에
    쓰지 않는다.
    """
    from geocode import geocode, haversine_m
    from lawd_lookup import full_address, gu_name

    subject_lat, subject_lon = subject_coord
    out = []
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
            amount = to_amount_man(r.get("dealAmount", ""))
        except (ValueError, TypeError):
            continue
        if amount != amount or not row_area:
            continue
        if abs(row_area - area) / area > 0.15:
            continue  # 반경 안이라도 면적이 많이 다르면 비교 대상에서 제외

        if gu_filter and gu_name(r.get("sggCd", "")) != gu_filter:
            continue  # 다른 구는 400m 반경에 들 일이 사실상 없어 지오코딩을 아낀다

        addr = full_address(r)
        if not addr:
            continue
        coord = geocode(addr)
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
        similar_floor = floor is not None and row_floor is not None and abs(row_floor - floor) <= 1
        floor_weight = 1.0 if (floor is None or similar_floor) else 0.6
        distance_weight = max(0.2, 1 - distance / radius_m)

        r["_distance_m"] = distance
        r["_amount_man"] = amount
        r["_weight"] = weight_for_year(r.get("dealYear"), this_year) * distance_weight * floor_weight
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="data/raw")
    ap.add_argument("--address", required=True, help="대상 물건의 지번 주소 (지오코딩용, 예: '서울특별시 강북구 수유동 468-202')")
    ap.add_argument("--dong", required=True, help="법정동명 — 계절성/가격추이 등 동네 단위 분석 범위로 쓰인다")
    ap.add_argument("--area", type=float, required=True)
    ap.add_argument("--floor", type=int, default=None, help="대상 물건의 층 (선택 — 유사층 가중치 판단에 사용)")
    ap.add_argument("--radius", type=float, default=400, help="비교 반경(미터), 기본 400m")
    ap.add_argument("--year-min", type=int, default=None)
    ap.add_argument("--html", action="store_true", help="reports/ 폴더에 예쁜 HTML 리포트도 저장하고 브라우저로 연다")
    args = ap.parse_args()

    this_year = datetime.now().year
    year_min = args.year_min or (this_year - 1)

    rows = dedupe(load_transactions(args.dir))
    if not rows:
        print(f"[안내] {args.dir} 폴더에서 유효한 XML 거래 데이터를 찾지 못했습니다.")
        print("       molit_rhtrade_api.py로 조회한 결과를 이 폴더에 .xml 또는 .txt로 저장해 주세요.")
        return

    from geocode import geocode
    from lawd_lookup import find_gu_in_address

    subject_coord = geocode(args.address)
    if subject_coord is None:
        print(f"[안내] 대상 물건 주소({args.address})를 좌표로 변환하지 못했습니다.")
        print("       카카오 개발자 콘솔에서 발급받은 KAKAO_REST_API_KEY가 .env에 있는지,")
        print("       주소 표기가 정확한지(지번 주소 권장) 확인해 주세요.")
        return

    gu_filter = find_gu_in_address(args.address)

    filtered = find_comparables(rows, subject_coord, args.area, args.floor, args.radius,
                                 year_min, this_year, gu_filter)

    if not filtered:
        print(f"[안내] 반경 {args.radius:.0f}m, 유사면적 조건에 맞는 비교거래를 찾지 못했습니다.")
        print("       반경을 넓히거나(--radius), data/raw에 더 많은 지역/기간 데이터를 추가해 보세요.")
        return

    amounts_weighted = []
    for r in filtered:
        amounts_weighted.extend([r["_amount_man"]] * max(1, round(r["_weight"])))

    median_man = statistics.median(amounts_weighted)
    p25 = statistics.median(sorted(amounts_weighted)[: max(1, len(amounts_weighted) // 2)])
    p75 = statistics.median(sorted(amounts_weighted)[len(amounts_weighted) // 2 :])

    n_total = len(filtered)
    n_2026 = sum(1 for r in filtered if r.get("dealYear") == str(this_year))
    n_2025 = sum(1 for r in filtered if r.get("dealYear") == str(this_year - 1))
    n_close = sum(1 for r in filtered if r["_distance_m"] <= args.radius / 2)

    # 신뢰도: 건수, 근접 매물 비중, 최신성, 분산 반영 (0~100)
    spread = (p75 - p25) / median_man if median_man else 1
    confidence = 100
    confidence -= max(0, (5 - n_total)) * 10
    confidence -= max(0, (2 - n_close)) * 10
    confidence -= min(30, spread * 100)
    confidence -= max(0, (1 - (n_2026 / n_total))) * 15
    confidence = max(10, min(100, round(confidence)))

    conservative = p25
    realistic = median_man
    upper = p75
    ai_base = round((p25 * 0.3 + median_man * 0.5 + p75 * 0.2), -1)
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
