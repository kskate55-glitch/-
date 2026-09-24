"""
data/raw/에 저장된 모든 실거래가 XML을 동(umdNm) 단위로 모아서,
"가격이 오르고 있는 동네" / "거래가 활발한 동네" 랭킹을 보여준다.
CLAUDE.md 13절 규칙과 동일한 로직이다.

지금까지 조회해서 data/raw에 저장해둔 동네만 랭킹에 나온다 — 조회한 지역이
늘어날수록 랭킹도 넓어진다. (실거래가 API는 하루 호출 한도가 있어 한 번에
전국을 다 조회할 수는 없다)

사용법:
    python scripts/rank_areas.py --dir data/raw --top 10
    python scripts/rank_areas.py --dir data/raw --dong 역촌동   # 면적 구간별 비교도 함께(17절)
"""

import argparse
import os
import statistics
from collections import defaultdict

from estimate_price import (load_transactions, dedupe, to_amount_man,
                            month_index, decode_month_index)

MIN_SAMPLE = 3  # 이보다 적게 거래된 동은 통계적으로 신뢰하기 어려워 랭킹에서 제외


def build_dong_stats(rows: list[dict]):
    """반환: (최신 계약월 인덱스, {동: {recent_prices, prev_prices, recent_count, prev_count}})"""
    ym_indices = set()
    for r in rows:
        try:
            y, m = int(r.get("dealYear", "0")), int(r.get("dealMonth", "0"))
        except ValueError:
            continue
        if y and 1 <= m <= 12:
            ym_indices.add(month_index(y, m))
    if not ym_indices:
        return None

    latest = max(ym_indices)
    recent_window = {latest, latest - 1, latest - 2}
    prev_window = {latest - 3, latest - 4, latest - 5}

    dong_data = defaultdict(lambda: {"recent_prices": [], "prev_prices": [], "recent_count": 0, "prev_count": 0})
    for r in rows:
        if r.get("cdealType", "").strip() == "해제":
            continue
        try:
            y, m = int(r.get("dealYear", "0")), int(r.get("dealMonth", "0"))
            area = float(r.get("excluUseAr", "nan"))
            amount = to_amount_man(r.get("dealAmount", ""))
        except (ValueError, TypeError):
            continue
        if not y or not (1 <= m <= 12) or amount != amount or not area:
            continue
        dong = r.get("umdNm", "").strip()
        if not dong:
            continue
        idx = month_index(y, m)
        price_per_area = amount / area
        d = dong_data[dong]
        if idx in recent_window:
            d["recent_prices"].append(price_per_area)
            d["recent_count"] += 1
        elif idx in prev_window:
            d["prev_prices"].append(price_per_area)
            d["prev_count"] += 1

    return latest, dong_data


def rank_by_price_change(dong_data: dict) -> list[tuple]:
    ranked = []
    for dong, d in dong_data.items():
        if len(d["recent_prices"]) < MIN_SAMPLE or len(d["prev_prices"]) < MIN_SAMPLE:
            continue
        recent_avg = statistics.mean(d["recent_prices"])
        prev_avg = statistics.mean(d["prev_prices"])
        if not prev_avg:
            continue
        change_pct = (recent_avg - prev_avg) / prev_avg * 100
        ranked.append((dong, change_pct, recent_avg, d["recent_count"]))
    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked


def rank_by_volume(dong_data: dict) -> list[tuple]:
    ranked = [(dong, d["recent_count"]) for dong, d in dong_data.items() if d["recent_count"] >= MIN_SAMPLE]
    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked


AREA_BANDS = [
    (0, 40, "소형(40㎡ 미만)"),
    (40, 60, "중소형(40~60㎡)"),
    (60, 85, "중형(60~85㎡)"),
    (85, float("inf"), "대형(85㎡ 이상)"),
]


def band_for_area(area: float) -> str:
    for lo, hi, label in AREA_BANDS:
        if lo <= area < hi:
            return label
    return AREA_BANDS[-1][2]


def build_band_stats(rows: list[dict], dong: str):
    """CLAUDE.md 17절 규칙: 한 동 안에서 면적 구간별 최근/이전 3개월 평당가를 비교한다."""
    dong_rows = [
        r for r in rows
        if r.get("umdNm", "").strip() == dong.strip() and r.get("cdealType", "").strip() != "해제"
    ]
    ym_indices = set()
    for r in dong_rows:
        try:
            y, m = int(r.get("dealYear", "0")), int(r.get("dealMonth", "0"))
        except ValueError:
            continue
        if y and 1 <= m <= 12:
            ym_indices.add(month_index(y, m))
    if not ym_indices:
        return None

    latest = max(ym_indices)
    recent_window = {latest, latest - 1, latest - 2}
    prev_window = {latest - 3, latest - 4, latest - 5}

    band_data = defaultdict(lambda: {"recent": [], "prev": []})
    for r in dong_rows:
        try:
            y, m = int(r.get("dealYear", "0")), int(r.get("dealMonth", "0"))
            area = float(r.get("excluUseAr", "nan"))
            amount = to_amount_man(r.get("dealAmount", ""))
        except (ValueError, TypeError):
            continue
        if not y or not (1 <= m <= 12) or amount != amount or not area:
            continue
        idx = month_index(y, m)
        band = band_for_area(area)
        ppa = amount / area
        if idx in recent_window:
            band_data[band]["recent"].append(ppa)
        elif idx in prev_window:
            band_data[band]["prev"].append(ppa)

    return latest, band_data


def rank_bands_by_price_change(band_data: dict) -> list[tuple]:
    ranked = []
    for band, d in band_data.items():
        if len(d["recent"]) < MIN_SAMPLE or len(d["prev"]) < MIN_SAMPLE:
            continue
        recent_avg = statistics.mean(d["recent"])
        prev_avg = statistics.mean(d["prev"])
        if not prev_avg:
            continue
        change_pct = (recent_avg - prev_avg) / prev_avg * 100
        ranked.append((band, change_pct, recent_avg, len(d["recent"])))
    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked


def find_dong_rank(ranked_list: list[tuple], dong: str) -> int | None:
    """rank_by_price_change/rank_by_volume이 돌려준 정렬된 리스트에서 dong의
    순위(1부터)를 찾는다. 표본 부족 등으로 랭킹에 아예 없으면 None."""
    for i, item in enumerate(ranked_list, start=1):
        if item[0] == dong:
            return i
    return None


def print_dong_comparison(rows: list[dict], target_dong: str, gu_label: str | None, top: int = 5):
    """CLAUDE.md 25절 규칙: 대상 물건이 속한 구 안에서 다른 동네와 비교해
    "여기가 거래가 활발한 편인지", "가격이 더 오르고 있는 동네인지"를 보여준다.
    13절 동네 랭킹과 같은 build_dong_stats/rank_by_* 로직을 재사용하되, 전국이
    아니라 대상 물건이 속한 구(이미 gu_filter로 좁혀 넘어온 rows) 안에서만
    비교한다는 점이 다르다."""
    result = build_dong_stats(rows)
    if result is None or not target_dong:
        return
    latest, dong_data = result
    latest_y, latest_m = decode_month_index(latest)

    price_ranked = rank_by_price_change(dong_data)
    volume_ranked = rank_by_volume(dong_data)

    label = f"{gu_label} 내 다른 동네와 비교" if gu_label else "인근 동네와 비교"
    print()
    print(f"[인근 동 비교] ({label}, 최근 거래월 {latest_y}.{latest_m:02d} 기준)")

    print("거래 활발도 (최근 3개월 거래건수):")
    if not volume_ranked:
        print("  비교할 만한 동이 부족합니다 (동마다 최근 3개월에 3건 이상 거래 필요).")
    else:
        vol_rank = find_dong_rank(volume_ranked, target_dong)
        for i, (dong, cnt) in enumerate(volume_ranked[:top], start=1):
            marker = " ← 검색하신 동" if dong == target_dong else ""
            print(f"  {i}위 {dong} {cnt}건{marker}")
        if vol_rank is not None and vol_rank > top:
            cnt = dict(volume_ranked)[target_dong]
            print(f"  {vol_rank}위 {target_dong} {cnt}건 ← 검색하신 동 ({len(volume_ranked)}개 동 중)")
        elif vol_rank is None:
            print(f"  ※ 검색하신 {target_dong}은 최근 3개월 거래가 {MIN_SAMPLE}건 미만이라 순위에서 빠졌습니다.")

    print("가격 상승률 (최근 3개월 평균 평당가, 이전 3개월 대비):")
    if not price_ranked:
        print("  비교할 만한 동이 부족합니다 (동마다 최근·이전 3개월에 각 3건 이상 거래 필요).")
    else:
        price_map = {d: (chg, avg, cnt) for d, chg, avg, cnt in price_ranked}
        price_rank = find_dong_rank(price_ranked, target_dong)
        for i, (dong, change_pct, recent_avg, cnt) in enumerate(price_ranked[:top], start=1):
            sign = "+" if change_pct >= 0 else ""
            marker = " ← 검색하신 동" if dong == target_dong else ""
            print(f"  {i}위 {dong} {sign}{change_pct:.1f}%{marker}")
        if price_rank is not None and price_rank > top:
            chg, _avg, _cnt = price_map[target_dong]
            sign = "+" if chg >= 0 else ""
            print(f"  {price_rank}위 {target_dong} {sign}{chg:.1f}% ← 검색하신 동 ({len(price_ranked)}개 동 중)")
        elif price_rank is None:
            print(f"  ※ 검색하신 {target_dong}은 최근·이전 3개월 거래가 부족해 순위에서 빠졌습니다.")

    print("※ 지금까지 조회해서 가지고 있는 데이터 기준입니다 — 실제로 거래가 없다는 뜻이 아니라 "
          "아직 조회하지 않은 기간/지역일 수 있습니다.")


def print_area_bands(rows: list[dict], dong: str):
    result = build_band_stats(rows, dong)
    print()
    if result is None:
        print(f"[면적대별 비교] {dong}에 유효한 계약월 데이터가 없습니다.")
        return
    latest, band_data = result
    latest_y, latest_m = decode_month_index(latest)
    ranked = rank_bands_by_price_change(band_data)

    print(f"[면적대별 비교] {dong} 기준, 최근 거래월: {latest_y}.{latest_m:02d}")
    if not ranked:
        print("  구간별로 비교할 만한 데이터가 부족합니다 (구간마다 최근·이전 3개월에 각 3건 이상 필요).")
        return
    for band, change_pct, recent_avg, cnt in ranked:
        sign = "+" if change_pct >= 0 else ""
        print(f"- {band}: {sign}{change_pct:.1f}%  (최근 평균 {recent_avg:.0f}만원/㎡, 거래 {cnt}건)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="data/raw")
    ap.add_argument("--top", type=int, default=10)
    ap.add_argument("--dong", default=None, help="지정하면 그 동 안에서 면적 구간별(소형/중형/대형) 비교도 함께 보여준다")
    args = ap.parse_args()

    rows = dedupe(load_transactions(args.dir))
    if not rows:
        print(f"[안내] {args.dir} 폴더에서 유효한 XML 거래 데이터를 찾지 못했습니다.")
        return

    result = build_dong_stats(rows)
    if result is None:
        print("[안내] 유효한 계약월 데이터가 없습니다.")
        return
    latest, dong_data = result
    latest_y, latest_m = decode_month_index(latest)

    price_ranked = rank_by_price_change(dong_data)
    volume_ranked = rank_by_volume(dong_data)

    print(f"[동네 랭킹] 최근 거래월 기준: {latest_y}.{latest_m:02d} (data/raw에 있는 동네만 대상)")
    print()

    print("가격 상승률 TOP (최근 3개월 평균 평당가 vs 이전 3개월)")
    if price_ranked:
        for i, (dong, change_pct, recent_avg, cnt) in enumerate(price_ranked[: args.top], start=1):
            sign = "+" if change_pct >= 0 else ""
            print(f"{i}. {dong}  {sign}{change_pct:.1f}%  (최근 평균 {recent_avg:.0f}만원/㎡, 거래 {cnt}건)")
    else:
        print("  비교 가능한 동이 없습니다 (동마다 최근·이전 3개월에 각 3건 이상 거래 필요).")

    print()
    print("거래 활발도 TOP (최근 3개월 거래건수)")
    if volume_ranked:
        for i, (dong, cnt) in enumerate(volume_ranked[: args.top], start=1):
            print(f"{i}. {dong}  {cnt}건")
    else:
        print("  거래량 랭킹을 매길 만한 동이 없습니다 (최근 3개월간 3건 이상 필요).")

    print()
    print("※ 아직 조회하지 않은 동네는 여기 나타나지 않습니다. 더 많은 지역을 조회할수록 랭킹이 넓어집니다.")

    if args.dong:
        print_area_bands(rows, args.dong)


if __name__ == "__main__":
    main()
