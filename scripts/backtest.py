"""CLAUDE.md 48절 — 계산기 정확도 백테스트.

이미 팔린 실거래를 무작위로 뽑아, **그 거래 계약일 직전으로 시계를 되돌려**
계산기를 돌리고 실제 체결가와 비교한다. "그럴듯하다"가 아니라 "몇 % 틀리냐"를
숫자로 내는 게 목적이다.

⚠️⚠️ **데이터 누출(leakage)을 막는 게 이 스크립트의 핵심이다.**
그냥 최근 거래 주소를 넣고 계산기를 돌리면, 5절 비교거래 탐색이 **바로 그
거래 자체를 비교 대상으로 집어온다** — 거리 0m(동일건물 보너스 ×2), 계약월이
가장 최근(최근성 1.6), 면적·층·연식 완전 일치(유사도 100점). 정답을 보고
정답을 맞히는 셈이라 오차가 1~2%로 나오는데, 그 숫자는 **전부 거짓말**이다.
그래서 여기서는 대상 거래의 **계약일보다 앞선 거래만** 계산기에 넘긴다.

⚠️ 무작위로 뽑은 국토부 거래는 **일반 매매**이지 경매 낙찰 후 되판 건이
아니다. 그래서 비교 기준은 8절 **현실적 체결가(median)**다 — 8-2절 경매용
매도가와 대면 구조적으로 낮게 나와서 "계산기가 과소추정한다"는 잘못된
결론이 나온다.

⚠️ 국토부 API는 샌드박스에서 호출할 수 없으므로(2절) 이 스크립트는
`data/raw/`에 **이미 받아둔 XML만 읽는다**. 카카오 지오코딩은 필요하지만
`data/geocode_cache.json`에 캐시되므로, **같은 구를 반복해서 돌리면 호출이
거의 안 나간다**(`--gu`로 한 구씩 돌리는 걸 권장).

사용 예:
    KAKAO_REST_API_KEY="발급받은_키" python scripts/backtest.py \\
        --dir data/raw --gu 강북구 --months 1 --n 30 --csv reports/backtest.csv
"""

import argparse
import csv
import os
import random
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lawd_lookup
from estimate_price import (compute_scenarios, dedupe, find_comparables,
                            load_transactions, to_amount_man)
from geocode import geocode

# .env에 적어둔 키를 환경변수로 올린다 (6절) — 이미 설정된 값은 안 덮어쓴다.
try:
    from env_file import load_env
    load_env()
except ImportError:  # 다른 경로에서 import될 때도 죽지 않게
    pass


# 이보다 비교거래가 적으면 그 건은 "표본 부족"으로 건너뛴다. 계산기 자체는
# 1건만 있어도 숫자를 뱉지만, 그런 값까지 정확도 통계에 넣으면 도구의 실력이
# 아니라 데이터 부족을 재는 꼴이 된다. 건너뛴 비율도 결과에 같이 보고한다.
MIN_COMPARABLES = 3


def _ymd(row: dict) -> int | None:
    """계약일을 YYYYMMDD 정수로. 일자가 없으면 그 달 1일로 본다."""
    try:
        y, m = int(row.get("dealYear")), int(row.get("dealMonth"))
    except (TypeError, ValueError):
        return None
    try:
        d = int(row.get("dealDay"))
    except (TypeError, ValueError):
        d = 1
    return y * 10000 + m * 100 + d


def _int_or_none(value) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError, AttributeError):
        return None


def pick_targets(rows: list[dict], months: int, n: int, gu: str | None,
                 seed: int) -> tuple[list[dict], int]:
    """테스트 대상 거래를 무작위로 고른다.

    "최근 N개월"은 12/13/15/30절과 같은 원칙으로 **시스템 날짜가 아니라
    데이터 안에서 가장 최근 계약월**을 기준으로 센다(실거래 신고기한이 최대
    30일이라 이번 달 데이터는 아직 덜 들어와 있다).
    """
    dated = [(r, _ymd(r)) for r in rows]
    dated = [(r, d) for r, d in dated if d]
    if not dated:
        return [], 0

    latest = max(d for _, d in dated)
    latest_y, latest_m = latest // 10000, (latest // 100) % 100
    cut_m, cut_y = latest_m - months + 1, latest_y
    while cut_m <= 0:
        cut_m += 12
        cut_y -= 1
    cutoff = cut_y * 10000 + cut_m * 100  # 그 달 1일

    pool = []
    for row, d in dated:
        if d < cutoff:
            continue
        if (row.get("cdealType") or "").strip() == "해제":
            continue
        if gu and lawd_lookup.gu_name((row.get("sggCd") or "")[:5]) != gu:
            continue
        if not lawd_lookup.full_address(row):
            continue
        try:
            if float(row.get("excluUseAr")) <= 0:
                continue
        except (TypeError, ValueError):
            continue
        if _int_or_none(row.get("floor")) is None:
            continue
        pool.append(row)

    random.Random(seed).shuffle(pool)
    return pool[:n], len(pool)


def estimate_as_of(rows: list[dict], target: dict, radius_m: float,
                   year_window: int, area_tolerance_pct: float,
                   build_year_tolerance: int) -> dict | None:
    """대상 거래의 **계약일 직전 시점**으로 되돌려 계산기를 돌린다.

    ⚠️ 여기가 누출 차단 지점이다 — `prior`에 대상 거래 자신은 물론이고
    같은 날·이후에 계약된 거래를 **한 건도 남기지 않는다**. 같은 날 계약 건도
    빼는 이유: 그날 아침에는 아직 모르는 정보이고, 같은 건물에서 같은 날
    여러 호실이 팔리는 경우(분양성 거래)가 실제로 있어서다.
    """
    target_ymd = _ymd(target)
    subject_address = lawd_lookup.full_address(target)
    subject_coord = geocode(subject_address)
    if not subject_coord:
        return None

    prior = [r for r in rows if (_ymd(r) or 0) < target_ymd]
    if not prior:
        return None

    target_y, target_m = target_ymd // 10000, (target_ymd // 100) % 100
    area = float(target["excluUseAr"])
    build_year = (target.get("buildYear") or "").strip() or None

    filtered = find_comparables(
        prior, subject_coord, area,
        _int_or_none(target.get("floor")), build_year,
        radius_m,
        year_min=target_y - year_window + 1,
        this_year=target_y,
        gu_filter=lawd_lookup.gu_name((target.get("sggCd") or "")[:5]),
        area_tolerance_pct=area_tolerance_pct,
        build_year_tolerance=build_year_tolerance,
        this_month=target_m,
    )
    if len(filtered) < MIN_COMPARABLES:
        return {"n_comparables": len(filtered), "skipped": "표본부족"}

    scen = compute_scenarios(filtered, radius_m, target_y, subject_area=area)
    return {
        "address": subject_address,
        "name": (target.get("mhouseNm") or "").strip() or "(단지명없음)",
        "ymd": target_ymd,
        "area": area,
        "floor": _int_or_none(target.get("floor")),
        "build_year": build_year,
        "actual": to_amount_man(target.get("dealAmount", "")),
        "p25": scen["p25"],
        "median": scen["median"],
        "p75": scen["p75"],
        "confidence": scen["confidence"],
        "n_comparables": len(filtered),
        "skipped": None,
    }


def summarize(results: list[dict]) -> dict:
    """오차 통계. 부호를 살린 편향과 절대 오차를 **따로** 본다 —
    평균 오차율이 0에 가까워도 ±30%씩 흩어져 있으면 쓸모없는 도구다."""
    errs = [r["error_pct"] for r in results]
    abs_errs = [abs(e) for e in errs]
    in_band = sum(1 for r in results if r["p25"] <= r["actual"] <= r["p75"])
    return {
        "n": len(results),
        "bias": statistics.mean(errs),                 # +면 계산기가 높게 부름
        "median_error": statistics.median(errs),
        "mape": statistics.mean(abs_errs),             # 평균 절대 오차율
        "median_abs_error": statistics.median(abs_errs),
        "within_5": sum(1 for e in abs_errs if e <= 5) / len(errs) * 100,
        "within_10": sum(1 for e in abs_errs if e <= 10) / len(errs) * 100,
        "within_20": sum(1 for e in abs_errs if e <= 20) / len(errs) * 100,
        "in_band": in_band / len(results) * 100,       # 실제가가 급매~상단 사이
    }


def print_report(results: list[dict], skipped: dict, total_pool: int, args) -> None:
    eok = lambda man: f"{man / 10000:.2f}억"

    print()
    print("=" * 78)
    print(f"[백테스트] 최근 {args.months}개월 매매 {len(results)}건"
          f"{f' · {args.gu}' if args.gu else ''} · 반경 {args.radius:.0f}m")
    print("  ⚠️ 각 건마다 그 계약일 **이전** 거래만 써서 계산했습니다(정답 누출 차단).")
    print("  ⚠️ 비교 기준은 8절 '현실적 체결가'입니다 — 일반 매매 거래라 경매용 매도가와 대면 안 됩니다.")
    print("=" * 78)

    results.sort(key=lambda r: abs(r["error_pct"]))
    print(f"{'단지명':<16}{'계약':<9}{'면적':>7}{'층':>4}{'실제':>8}{'예측':>8}{'오차':>9}{'비교':>5}{'신뢰':>5}")
    print("-" * 78)
    for r in results:
        name = r["name"][:14]
        d = str(r["ymd"])
        print(f"{name:<16}{d[2:4]}.{d[4:6]}.{d[6:8]:<3}"
              f"{r['area']:>6.1f}㎡{r['floor']:>3}층"
              f"{eok(r['actual']):>8}{eok(r['median']):>8}"
              f"{r['error_pct']:>+8.1f}%{r['n_comparables']:>5}{r['confidence']:>5}")

    s = summarize(results)
    print("-" * 78)
    print(f"모집단 {total_pool}건 중 {len(results)}건 검증"
          + (f" (제외: " + " · ".join(f"{k} {v}건" for k, v in skipped.items()) + ")" if skipped else ""))
    print()
    print("  ■ 정확도")
    print(f"     평균 절대 오차(MAPE) : {s['mape']:.1f}%")
    print(f"     중앙 절대 오차       : {s['median_abs_error']:.1f}%   ← 이상치에 덜 흔들리는 값")
    print(f"     ±5%  이내 적중       : {s['within_5']:.0f}%")
    print(f"     ±10% 이내 적중       : {s['within_10']:.0f}%")
    print(f"     ±20% 이내 적중       : {s['within_20']:.0f}%")
    print()
    print("  ■ 편향 (부호를 살린 값 — 체계적으로 높게/낮게 부르는지)")
    direction = "높게" if s["bias"] > 0 else "낮게"
    print(f"     평균 오차            : {s['bias']:+.1f}%   ← 계산기가 평균적으로 {direction} 부름")
    print(f"     중앙 오차            : {s['median_error']:+.1f}%")
    print()
    print("  ■ 구간 적중")
    print(f"     실제가가 급매가~상단 매도가 사이에 들어온 비율: {s['in_band']:.0f}%")
    print("     (구간을 제시하는 도구라 이게 단일 숫자 정확도보다 중요합니다)")

    # 신뢰도 점수가 실제로 의미가 있는지 — "신뢰도 높음"이 정말 더 정확한가
    hi = [abs(r["error_pct"]) for r in results if r["confidence"] >= 70]
    mid = [abs(r["error_pct"]) for r in results if 40 <= r["confidence"] < 70]
    lo = [abs(r["error_pct"]) for r in results if r["confidence"] < 40]
    print()
    print("  ■ 시세 신뢰도 점수 검증 (이 점수가 실제로 정확도를 예측하는가)")
    for label, group in (("70 이상", hi), ("40~69", mid), ("40 미만", lo)):
        if group:
            print(f"     신뢰도 {label:<7} {len(group):>3}건 · 평균 절대 오차 {statistics.mean(group):>5.1f}%")
        else:
            print(f"     신뢰도 {label:<7}   0건")
    if hi and lo and statistics.mean(hi) < statistics.mean(lo):
        print("     → 신뢰도가 높을수록 실제로 더 정확합니다. 점수가 제 역할을 하고 있어요.")
    elif hi and lo:
        print("     ⚠️ 신뢰도가 높은 쪽이 더 정확하지 않습니다 — 점수 산식을 손봐야 합니다.")
    print("=" * 78)
    print()


def main() -> None:
    ap = argparse.ArgumentParser(
        description="이미 팔린 실거래로 계산기 정확도를 검증한다(계약일 이전 데이터만 사용).")
    ap.add_argument("--dir", default="data/raw", help="국토부 XML 폴더 (기본 data/raw)")
    ap.add_argument("--n", type=int, default=30, help="검증할 건수 (기본 30)")
    ap.add_argument("--months", type=int, default=1, help="최근 몇 개월 거래를 대상으로 할지 (기본 1)")
    ap.add_argument("--gu", help="특정 구만 (예: 강북구) — 지오코딩 캐시가 잘 들어 훨씬 빠릅니다")
    ap.add_argument("--radius", type=float, default=400, help="비교거래 반경 m (기본 400)")
    ap.add_argument("--year-window", type=int, default=2,
                    help="계약 시점 기준 몇 개 연도를 볼지 (기본 2 = 그해+전해)")
    ap.add_argument("--area-tolerance", type=float, default=15, help="면적 허용범위 %% (기본 15)")
    ap.add_argument("--build-year-tolerance", type=int, default=4, help="준공년도 허용범위 년 (기본 4)")
    ap.add_argument("--seed", type=int, default=42, help="무작위 시드 (기본 42 — 같은 표본 재현용)")
    ap.add_argument("--csv", help="결과를 CSV로 저장할 경로")
    args = ap.parse_args()

    rows = dedupe(load_transactions(args.dir))
    if not rows:
        print(f"[안내] {args.dir}에서 거래 데이터를 찾지 못했습니다.")
        print("       scripts/molit_rhtrade_api.py로 먼저 받아주세요(2절).")
        return

    targets, pool_size = pick_targets(rows, args.months, args.n, args.gu, args.seed)
    if not targets:
        print(f"[안내] 최근 {args.months}개월 안에 검증할 만한 거래가 없습니다.")
        print("       --months를 늘리거나 --gu를 빼고 다시 돌려보세요.")
        return

    print(f"[진행] {len(targets)}건 검증 시작 (모집단 {pool_size}건에서 무작위 추출, seed={args.seed})")
    print("       처음 몇 건은 지오코딩 때문에 느립니다 — 같은 구를 계속 돌리면 캐시가 차서 빨라져요.")

    results, skipped = [], {}
    for i, target in enumerate(targets, 1):
        try:
            out = estimate_as_of(rows, target, args.radius, args.year_window,
                                 args.area_tolerance / 100, args.build_year_tolerance)
        except Exception as e:                      # 한 건 실패가 전체를 막지 않게
            skipped["오류"] = skipped.get("오류", 0) + 1
            print(f"  [{i}/{len(targets)}] 오류 — {type(e).__name__}: {e}")
            continue

        if out is None:
            skipped["지오코딩실패"] = skipped.get("지오코딩실패", 0) + 1
            continue
        if out.get("skipped"):
            skipped[out["skipped"]] = skipped.get(out["skipped"], 0) + 1
            continue

        out["error_pct"] = (out["median"] - out["actual"]) / out["actual"] * 100
        results.append(out)
        print(f"  [{i}/{len(targets)}] {out['name'][:12]} "
              f"실제 {out['actual'] / 10000:.2f}억 / 예측 {out['median'] / 10000:.2f}억 "
              f"({out['error_pct']:+.1f}%)")

    if not results:
        print("\n[안내] 검증된 건이 하나도 없습니다 — 제외 사유:", skipped or "(없음)")
        print("       반경(--radius)이나 면적 허용범위(--area-tolerance)를 넓혀보세요.")
        return

    print_report(results, skipped, pool_size, args)

    if args.csv:
        os.makedirs(os.path.dirname(os.path.abspath(args.csv)), exist_ok=True)
        cols = ["ymd", "name", "address", "area", "floor", "build_year",
                "actual", "p25", "median", "p75", "error_pct",
                "n_comparables", "confidence"]
        with open(args.csv, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            w.writerows(results)
        print(f"[저장] {args.csv} ({len(results)}건)")
        print("       여러 번 돌린 CSV를 모으면 지역·면적대별 편향까지 볼 수 있습니다.")


if __name__ == "__main__":
    main()
