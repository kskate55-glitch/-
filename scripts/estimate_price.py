"""
저장된 국토부 연립다세대 실거래가 XML(들)을 읽어서
매도가 범위(보수적 급매가 / 현실적 체결가 / 상단 매도가 / AI 기준매도가 / 권장 호가)를
CLAUDE.md 8절 포맷으로 계산하고, 12절 규칙에 따른 월별 계절성(거래 활발한 달) 분석도
함께 출력한다.

사용법:
    python estimate_price.py --dir data/raw --building 태영아뜨리움 \
        --dong 역촌동 --area 41.81 --year-min 2025

--dir       : XML 파일들이 들어있는 폴더 (여러 달치를 다 넣어두면 자동으로 합쳐서 계산)
--building  : 비교 1순위로 우선할 건물명 (mhouseNm에 부분일치)
--dong      : 법정동명 (umdNm) — 5순위 비교의 기준
--area      : 대상 물건의 전용면적(㎡) — ±15% 이내를 "비슷한 면적"으로 취급
--year-min  : 매도가 계산에 사용할 최소 계약년도 (기본값: 실행 시점 기준 작년)
--build-year: 대상 물건의 준공년도 (선택 — 3/4순위 판단 시 사용, 없으면 생략)

이 스크립트는 XML 파일 텍스트만 읽는다 — 네트워크 호출은 하지 않는다.
(API 호출은 molit_rhtrade_api.py 또는 사용자가 직접 만든 XML 파일로 한다)
"""

import argparse
import glob
import os
import re
import statistics
import xml.etree.ElementTree as ET
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


def classify_priority(row: dict, building: str, dong: str, area: float, build_year: str | None) -> int:
    """1(최우선)~5(최하위). 조건에 맞지 않으면 0(제외)."""
    same_dong = dong and row.get("umdNm", "").strip() == dong.strip()
    if not same_dong:
        return 0  # 법정동조차 다르면 이번 라운드에서는 비교군에서 제외

    same_building = building and building.strip() and building.strip() in row.get("mhouseNm", "")
    row_area = None
    try:
        row_area = float(row.get("excluUseAr", "nan"))
    except ValueError:
        pass
    similar_area = row_area is not None and area and abs(row_area - area) / area <= 0.15

    same_vintage = (
        build_year is not None
        and row.get("buildYear", "").strip() == str(build_year).strip()
    )

    if same_building and similar_area:
        return 1
    if same_building:
        return 2
    if same_vintage and similar_area:
        return 3
    if similar_area:
        return 5
    return 4  # 같은 동이지만 면적/연식이 꽤 다름 — 참고용 최하위


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="data/raw")
    ap.add_argument("--building", default="")
    ap.add_argument("--dong", required=True)
    ap.add_argument("--area", type=float, required=True)
    ap.add_argument("--build-year", default=None)
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

    filtered = []
    for r in rows:
        try:
            deal_year = int(r.get("dealYear", "0"))
        except ValueError:
            continue
        if deal_year < year_min:
            continue  # 연도 제한 규칙 — 기준연도 이전 거래는 매도가 계산에서 제외
        if r.get("cdealType", "").strip() == "해제":
            continue  # 해제된 거래 제외
        priority = classify_priority(r, args.building, args.dong, args.area, args.build_year)
        if priority == 0:
            continue
        amount = to_amount_man(r.get("dealAmount", ""))
        if amount != amount:  # NaN
            continue
        r["_priority"] = priority
        r["_amount_man"] = amount
        r["_weight"] = weight_for_year(r.get("dealYear"), this_year) * (6 - priority)
        filtered.append(r)

    if not filtered:
        print("[안내] 조건(법정동/연도)에 맞는 비교거래를 찾지 못했습니다.")
        print("       --dong 이 실거래 응답의 umdNm(예: '역촌동')과 정확히 일치하는지 확인해 주세요.")
        return

    filtered.sort(key=lambda r: r["_priority"])

    amounts_weighted = []
    for r in filtered:
        amounts_weighted.extend([r["_amount_man"]] * max(1, round(r["_weight"])))

    median_man = statistics.median(amounts_weighted)
    p25 = statistics.median(sorted(amounts_weighted)[: max(1, len(amounts_weighted) // 2)])
    p75 = statistics.median(sorted(amounts_weighted)[len(amounts_weighted) // 2 :])

    n_total = len(filtered)
    n_2026 = sum(1 for r in filtered if r.get("dealYear") == str(this_year))
    n_2025 = sum(1 for r in filtered if r.get("dealYear") == str(this_year - 1))
    n_same_building = sum(1 for r in filtered if r["_priority"] <= 2)

    # 신뢰도: 건수, 동일건물 비중, 최신성, 분산 반영 (0~100)
    spread = (p75 - p25) / median_man if median_man else 1
    confidence = 100
    confidence -= max(0, (5 - n_total)) * 10
    confidence -= max(0, (2 - n_same_building)) * 10
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
    print(f"유효 비교거래: {n_total}건 ({this_year}년 {n_2026}건 / {this_year-1}년 {n_2025}건 / 동일건물 {n_same_building}건)")
    print(f"시세 신뢰도: {confidence}/100")
    print()
    print(f"보수적 급매가: {fmt(conservative)}")
    print(f"현실적 체결가: {fmt(realistic)}")
    print(f"상단 매도가: {fmt(upper)}")
    print(f"AI 기준매도가: {fmt(ai_base)}")
    print(f"권장 최초 호가: {fmt(listing)}")
    print()
    pr_labels = {1: "1순위(동일건물·유사면적)", 2: "2순위(동일건물)", 3: "3순위(유사연식·면적)",
                 4: "4순위(참고용)", 5: "5순위(동일법정동)"}
    print("핵심 비교거래 (우선순위 순):")
    for r in filtered[:8]:
        print(f"- {r.get('mhouseNm','(단지명없음)')} {r.get('excluUseAr','?')}㎡, "
              f"{r.get('dealYear')}.{r.get('dealMonth')} 계약, {fmt(r['_amount_man'])} — {pr_labels[r['_priority']]}")

    season = compute_seasonality(rows, args.dong)
    print_seasonality(season)

    if args.html:
        from report import render_report

        comparables = [
            {
                "name": r.get("mhouseNm", "(단지명없음)"),
                "area": r.get("excluUseAr", "?"),
                "date": f"{r.get('dealYear')}.{r.get('dealMonth')}",
                "amount": r["_amount_man"],
                "label": pr_labels[r["_priority"]],
            }
            for r in filtered[:8]
        ]
        html_str = render_report(
            building=args.building or args.dong, dong=args.dong, area=args.area,
            period=f"{year_min}.01 ~ {this_year}.12", generated=datetime.now().strftime("%Y.%m.%d %H:%M"),
            confidence=confidence, conservative=conservative, realistic=realistic,
            upper=upper, ai_base=ai_base, listing=listing,
            n_total=n_total, n_same_building=n_same_building,
            comparables=comparables, season=season,
        )
        reports_dir = "reports"
        os.makedirs(reports_dir, exist_ok=True)
        out_name = f"{(args.building or args.dong).replace(' ', '_')}_{datetime.now():%Y%m%d_%H%M%S}.html"
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
