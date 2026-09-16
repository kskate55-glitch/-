"""
국토교통부 연립다세대 전월세 실거래가(전세)와 매매 실거래가를 함께 봐서
전세가율(전세 시세 ÷ 매매 시세 × 100)을 계산한다. CLAUDE.md 16절 규칙.

⚠️ 전세 데이터를 읽는 필드명(deposit/monthlyRent)은 molit_rhrent_api.py에 적힌
   대로 "추정" 스펙이다. 실제 응답 필드명이 다르면 이 스크립트도 함께 고쳐야 한다.

사용법:
    python scripts/jeonse_ratio.py --rent-dir data/raw_rent --trade-dir data/raw \
        --dong 역촌동 --area 41.81
"""

import argparse
import statistics

from estimate_price import load_transactions, dedupe, to_amount_man

MIN_SAMPLE = 3


def filter_jeonse(rows: list[dict], dong: str, area: float) -> list[float]:
    out = []
    for r in rows:
        if r.get("umdNm", "").strip() != dong.strip():
            continue
        try:
            monthly = to_amount_man(r.get("monthlyRent", "0"))
            deposit = to_amount_man(r.get("deposit", ""))
            row_area = float(r.get("excluUseAr", "nan"))
        except (ValueError, TypeError):
            continue
        if monthly != 0:
            continue  # 월세가 섞인 건 순수 전세가율 계산에서 제외
        if deposit != deposit or not row_area:
            continue
        if abs(row_area - area) / area > 0.15:
            continue
        out.append(deposit)
    return out


def filter_trade(rows: list[dict], dong: str, area: float) -> list[float]:
    out = []
    for r in rows:
        if r.get("umdNm", "").strip() != dong.strip():
            continue
        if r.get("cdealType", "").strip() == "해제":
            continue
        try:
            amount = to_amount_man(r.get("dealAmount", ""))
            row_area = float(r.get("excluUseAr", "nan"))
        except (ValueError, TypeError):
            continue
        if amount != amount or not row_area:
            continue
        if abs(row_area - area) / area > 0.15:
            continue
        out.append(amount)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rent-dir", default="data/raw_rent")
    ap.add_argument("--trade-dir", default="data/raw")
    ap.add_argument("--dong", required=True)
    ap.add_argument("--area", type=float, required=True)
    args = ap.parse_args()

    rent_rows = dedupe(load_transactions(args.rent_dir))
    trade_rows = dedupe(load_transactions(args.trade_dir))

    if not rent_rows:
        print(f"[안내] {args.rent_dir}에서 전월세 데이터를 찾지 못했습니다.")
        print("       molit_rhrent_api.py로 조회한 결과를 이 폴더에 저장해 주세요.")
        return

    jeonse_amounts = filter_jeonse(rent_rows, args.dong, args.area)
    trade_amounts = filter_trade(trade_rows, args.dong, args.area)

    if len(jeonse_amounts) < MIN_SAMPLE or len(trade_amounts) < MIN_SAMPLE:
        print("[안내] 전세가율을 계산하기엔 데이터가 부족합니다 (전세/매매 각 3건 이상 필요).")
        print(f"       전세 {len(jeonse_amounts)}건, 매매 {len(trade_amounts)}건 확보됨.")
        return

    jeonse_med = statistics.median(jeonse_amounts)
    trade_med = statistics.median(trade_amounts)
    ratio = jeonse_med / trade_med * 100

    def fmt(man):
        return f"{man / 10000:.2f}억"

    print(f"[전세가율 분석] {args.dong}, 전용 {args.area}㎡ ±15% 기준")
    print(f"전세 시세(중앙값): {fmt(jeonse_med)} ({len(jeonse_amounts)}건)")
    print(f"매매 시세(중앙값): {fmt(trade_med)} ({len(trade_amounts)}건)")
    print(f"전세가율: {ratio:.1f}%")
    print()
    if ratio >= 80:
        print("→ 전세가율이 매우 높은 편입니다. 매매가 대비 갭투자 부담이 적은 지역일 수 있습니다.")
    elif ratio >= 65:
        print("→ 평균적인 수준의 전세가율입니다.")
    else:
        print("→ 전세가율이 낮은 편입니다. 매매가에 거품이 있거나 전세 수요가 약할 수 있습니다.")


if __name__ == "__main__":
    main()
