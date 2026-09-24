#!/usr/bin/env python3
"""73절 — 게임 시나리오 JSON 내보내기.

경매 사이클 게임("권리분석 연습장" 아티팩트, 순수 HTML/JS)이 읽을 **정답지**를
한 번 구워서 파일로 떨어뜨린다. 게임은 이 JSON만 읽으므로 파이썬도, API 키도,
네트워크도 필요 없다.

⚠️ **왜 실시간 API 연동이 아니라 스냅샷인가** — 셋 다 이 프로젝트가 실제로
   겪은 것이다:
   1. **재현성**(제일 큼). 실거래는 매달 갱신된다. 같은 시나리오인데 이번 달
      3.2억, 다음 달 3.4억이면 "낙찰가 2.4억이면 이득" 같은 밸런스가 통째로
      무너진다.
   2. **API 한도**. 48-6절에서 실제로 넘겼다. 게임 플레이어가 늘면 사장님이
      진짜 경매 물건을 볼 때 계산기가 안 돈다.
   3. **속도**. 첫 조회 3~4초 + 무료 티어 콜드 스타트 수십 초(72-20절).
      대화형 게임에서 대사 한 줄에 그만큼 기다릴 수 없다.

⚠️ **가격을 새로 계산하지 않는다.** 웹 `/estimate`와 **같은 순서로 같은 함수**를
   부른다(72-10절 웹↔CLI 교차검증과 같은 이유) — 숫자가 갈리면 게임과 계산기가
   서로 다른 말을 하게 된다.

사용법 (data/raw 에 국토부 XML이 있어야 한다, 9절):

    KAKAO_REST_API_KEY="발급받은_키" python3 scripts/export_scenario.py \\
        --id hongeun-01 --address "서울특별시 서대문구 홍은동 265-218" \\
        --area 59.88 --floor 3 --build-year 2012 \\
        --out game/scenarios/hongeun-01.json

    # 아티팩트에 그대로 붙여넣을 JS 리터럴로:
    ... --js --out game/scenarios/hongeun-01.js
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from env_file import load_env  # noqa: E402

load_env()

from estimate_price import (  # noqa: E402
    CONDITION_MULTIPLIER,
    FIRST_FLOOR_PRICE_RATIO,
    SALE_CALIBRATION_FACTOR,
    building_identity_parts,
    compute_condition_ladder,
    compute_estimate_warnings,
    compute_liquidity,
    compute_prediction_interval,
    compute_price_tiers,
    compute_scenarios,
    dedupe,
    detect_redevelopment_signal,
    estimate_monthly_trend_rate,
    find_comparables,
    load_transactions,
)

SCHEMA = 1

# 43절 임장 체크 7개 — 게임의 임장 파트가 그대로 이 목록이다.
INSPECTION_LABELS = list(getattr(
    __import__("estimate_price"), "INSPECTION_CHECKLIST", ()))

# ⚠️ 가명은 **고정 목록에서 순서대로** 준다 — 무작위면 같은 시나리오를 다시
#    구울 때마다 이름이 바뀌어 게임 대사와 어긋난다(66절 version 열과 같은
#    이유로, 다시 구워도 같은 결과가 나와야 한다).
ALIAS_NAMES = [
    "○○빌라", "△△하이츠", "□□맨션", "☆☆타운", "◇◇캐슬",
    "○○파크빌", "△△그린빌", "□□스카이", "☆☆리치빌", "◇◇home",
]


def _deploy_version() -> str:
    """어느 코드로 구운 JSON인지 (66절 — 오래 걸리는 작업의 결과에는 그걸
    만든 코드의 신원을 같이 박아 둔다)."""
    for name in ("APP_VERSION", "RENDER_GIT_COMMIT", "GIT_COMMIT"):
        value = (os.environ.get(name) or "").strip()
        if value:
            return value[:7]
    try:
        out = subprocess.run(["git", "rev-parse", "--short=7", "HEAD"],
                             cwd=os.path.dirname(HERE), capture_output=True,
                             text=True, timeout=5)
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        pass
    return "local"


def _man(value):
    """만원 단위 정수로. None은 그대로 둔다."""
    return None if value is None else int(round(value))


def _num(value):
    """문자열로 오는 숫자 필드를 실수로. 못 읽으면 None (5절 원칙)."""
    try:
        out = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return None if out != out or out in (float("inf"), float("-inf")) else out


def _int(value):
    """층처럼 정수로 와야 하는 필드. 못 읽으면 None."""
    out = _num(value)
    return None if out is None else int(out)


def _alias_map(rows: list[dict], enabled: bool) -> dict:
    """단지명 → 가명. ⚠️ 실제 단지명을 게임에 그대로 쓰면 실재 건물에 대한
    묘사가 된다 — 좌표·시세는 공개 데이터지만 게임 스토리(점유자가 버틴다,
    누수가 있다)는 창작이라 둘이 실명으로 섞이면 곤란하다."""
    if not enabled:
        return {}
    names, mapping = [], {}
    for row in rows:
        name = (row.get("mhouseNm") or "").strip()
        if name and name not in mapping:
            mapping[name] = ALIAS_NAMES[len(names) % len(ALIAS_NAMES)]
            names.append(name)
    return mapping


def _comparable(row: dict, alias: dict) -> dict:
    """사장님 대사 소재 한 줄. ⚠️ 금액은 **신고된 실제 체결가 그대로**다
    (7-2·64절 원칙 — 화면은 사실, 계산에만 보정값을 쓴다)."""
    name = (row.get("mhouseNm") or "").strip() or "(단지명없음)"
    return {
        "name": alias.get(name, name),
        "area": _num(row.get("excluUseAr")),
        "floor": _int(row.get("floor")),
        "build_year": row.get("buildYear"),
        "ym": f"{row.get('dealYear')}.{str(row.get('dealMonth')).zfill(2)}",
        "amount_man": _man(row.get("_amount_man")),
        "distance_m": None if row.get("_distance_m") is None
        else int(round(row["_distance_m"])),
        "similarity": None if row.get("_similarity_score") is None
        else int(round(row["_similarity_score"])),
    }


def _liquidity_json(liq: dict) -> dict:
    """30절 유동성을 JSON으로 담을 수 있게 편다.

    ⚠️ `compute_liquidity()`의 `counts`는 **튜플 키**(`(반경m, 개월)`)라
    `json.dumps`가 그대로 못 쓴다(`keys must be str…`). 키를 풀어 목록으로
    바꾼다 — 게임 쪽에서도 `for (const c of liq.counts)`로 도는 게 편하다.
    """
    counts = []
    for key, value in sorted((liq.get("counts") or {}).items()):
        radius, months = key
        entry = {"radius_m": radius, "months": months}
        if isinstance(value, dict):
            entry.update(value)
        else:
            entry["count"] = value
            entry["monthly_avg"] = round(value / months, 1) if months else None
        counts.append(entry)
    return {
        "latest_year": liq.get("latest_year"),
        "latest_month": liq.get("latest_month"),
        "radii": list(liq.get("radii") or ()),
        "counts": counts,
    }


def build_scenario(args) -> dict:
    this_year = datetime.now().year
    this_month = datetime.now().month
    year_min = args.year_min or (this_year - 1)

    rows = dedupe(load_transactions(args.dir))
    if not rows:
        raise SystemExit(f"[안내] {args.dir} 에서 유효한 실거래 XML을 찾지 못했습니다.\n"
                         "       scripts/molit_rhtrade_api.py 로 먼저 받아 주세요 (9절).")

    from geocode import geocode_full
    from lawd_lookup import find_dong_in_address

    detail = geocode_full(args.address)
    if detail is None:
        raise SystemExit(f"[안내] 주소({args.address})를 좌표로 바꾸지 못했습니다.\n"
                         "       KAKAO_REST_API_KEY 가 .env 에 있는지, 지번 주소인지 확인해 주세요.")
    coord = (detail["lat"], detail["lon"])

    # ⚠️ 지역 판정은 입력 글자가 아니라 **카카오가 정규화한 지번 주소**로 한다
    #    (72-31절) — 도로명·짧은 주소로 넣어도 같은 결과가 나온다.
    canonical = detail.get("jibun") or args.address
    dong = detail.get("dong") or find_dong_in_address(canonical)

    subject_building = building_identity_parts(
        dong, detail.get("main_no"), detail.get("sub_no"),
        bool(detail.get("is_mountain")))
    trend_rate = estimate_monthly_trend_rate(rows, dong) if dong else None

    # ── 여기서부터 웹 `/estimate` 와 **같은 순서, 같은 인자**다 ──────────────
    # ⚠️ 함수는 **분수**(0.15)를 받고 CLI 인자는 **퍼센트**(15)다 — 5절 표기를
    #    따르느라 단위가 갈린다. 웹도 `/100` 해서 넘긴다(webapp/app.py).
    tol = args.area_tolerance / 100.0
    filtered = find_comparables(
        rows, coord, args.area, args.floor, args.build_year,
        args.radius, year_min, this_year, gu_filter=None,
        area_tolerance_pct=tol,
        build_year_tolerance=args.build_year_tolerance,
        this_month=this_month,
        subject_building=subject_building,
        monthly_trend_rate=trend_rate,
        first_floor_ratio=FIRST_FLOOR_PRICE_RATIO)
    if not filtered:
        raise SystemExit(f"[안내] 반경 {args.radius:.0f}m 안에서 비교거래를 못 찾았습니다.\n"
                         "       --radius 나 --area-tolerance 를 넓혀 보세요.")

    scen = compute_scenarios(filtered, args.radius, this_year,
                             subject_area=args.area,
                             calibration=SALE_CALIBRATION_FACTOR)
    redevelopment = detect_redevelopment_signal(rows, dong, this_year)
    warnings = compute_estimate_warnings(
        filtered, scen.get("model_divergence_pct"), redevelopment, None,
        args.build_year, None)

    conservative, realistic, upper = scen["p25"], scen["median"], scen["p75"]
    ai_base = round(conservative * 0.3 + realistic * 0.5 + upper * 0.2, -1)
    auction = round((conservative + realistic) / 2, -1)

    interval = compute_prediction_interval(
        realistic, filtered, args.area, scen.get("model_divergence_pct"),
        args.build_year)
    tiers = compute_price_tiers(filtered, calibration=SALE_CALIBRATION_FACTOR,
                                subject_area=args.area)
    liquidity = _liquidity_json(compute_liquidity(
        rows, coord, args.area, this_year, area_tolerance_pct=tol))
    # ── 계산 끝. 아래는 전부 **읽어서 담기만** 한다 ────────────────────────

    # 명도 결과 → 매도가 사다리 (38절). 게임의 두 파트를 잇는 고리다.
    ladder = {}
    for state in ("노후", "기본", "올수리"):
        steps = compute_condition_ladder(auction, state, {})
        ladder[state] = [{"condition": r.get("condition"), "label": r.get("label"),
                          "is_current": r.get("is_current"),
                          "price_man": _man(r.get("price_man")),
                          "gain_man": _man(r.get("gain_man"))}
                         for r in steps]

    alias = _alias_map(filtered, not args.real_names)

    # ⚠️ 정답은 **예측구간 안의 한 점**이다. 어디에 두느냐가 난이도 손잡이다
    #    (0.5 = 한가운데 = 쉬움, 0.05·0.95 = 꼬리 = 어려움). 플레이어에겐
    #    안 보여준다.
    truth = None
    if interval:
        pos = min(1.0, max(0.0, args.truth_pos))
        truth = _man(interval["low_man"] +
                     (interval["high_man"] - interval["low_man"]) * pos)

    scenario = {
        "schema": SCHEMA,
        "scenario_id": args.id,
        "version": _deploy_version(),
        "generated_at": datetime.now().strftime("%Y-%m-%d"),
        "source": {
            "radius_m": args.radius,
            "area_tolerance_pct": args.area_tolerance,
            "build_year_tolerance": args.build_year_tolerance,
            "year_min": year_min,
            "calibration": SALE_CALIBRATION_FACTOR,
            "monthly_trend_rate": trend_rate,
        },
        "subject": {
            "display_name": args.display_name or (ALIAS_NAMES[0] if not args.real_names
                                                  else args.address),
            "dong": dong,
            "area": args.area,
            "floor": args.floor,
            "build_year": args.build_year,
            "address": args.address if args.real_names else None,
        },
        "truth": {"sale_price_man": truth, "position": args.truth_pos},
        "scenarios": {
            "p25": _man(conservative), "median": _man(realistic), "p75": _man(upper),
            "ai_base": _man(ai_base), "auction": _man(auction),
            "confidence": scen.get("confidence"),
            "model_divergence_pct": scen.get("model_divergence_pct"),
            "n_total": scen.get("n_total"), "n_close": scen.get("n_close"),
            "n_this_year": scen.get("n_this_year"),
        },
        "prediction": None if not interval else {
            "pct": interval["pct"], "risks": interval["risks"],
            "tier": interval["tier"], "label": interval["label"],
            "sample_n": interval["sample_n"],
            "low_man": _man(interval["low_man"]),
            "high_man": _man(interval["high_man"]),
        },
        "tiers": {k: _man(v) for k, v in (tiers or {}).items()
                  if isinstance(v, (int, float))},
        "warnings": [{"key": w.get("key"), "label": w.get("label"),
                      "detail": w.get("detail"), "advice": w.get("advice")}
                     for w in (warnings or [])],
        "condition_multiplier": dict(CONDITION_MULTIPLIER),
        "condition_ladder": ladder,
        "comparables": [_comparable(r, alias) for r in filtered[:args.comparables]],
        "liquidity": liquidity,
        "reveal": {
            # 게임이 액션으로 하나씩 여는 정보. 값은 위에서 이미 구한 것을
            # 가리키기만 한다 — 새로 계산하는 게 없다.
            "desk": ["subject"],
            "broker": ["comparables", "scenarios.median"],
            "visit": {"inspection_options": INSPECTION_LABELS},
            "papers": ["prediction", "warnings"],
        },
    }
    return scenario


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="73절 — 경매 사이클 게임이 읽을 시나리오 JSON을 굽는다")
    ap.add_argument("--id", required=True, help="시나리오 id (파일명·게임 키)")
    ap.add_argument("--address", required=True, help="지번 주소 (도로명도 가능)")
    ap.add_argument("--area", type=float, required=True, help="전용면적 ㎡")
    ap.add_argument("--floor", type=int, help="층 (모르면 생략)")
    ap.add_argument("--build-year", help="준공년도 (모르면 생략)")
    ap.add_argument("--dir", default="data/raw", help="국토부 매매 XML 폴더")
    ap.add_argument("--radius", type=float, default=400.0)
    ap.add_argument("--area-tolerance", type=float, default=15.0)
    ap.add_argument("--build-year-tolerance", type=float, default=4.0)
    ap.add_argument("--year-min", type=int)
    ap.add_argument("--comparables", type=int, default=8,
                     help="JSON에 담을 비교거래 수 (사장님 대사 소재)")
    ap.add_argument("--truth-pos", type=float, default=0.5,
                     help="정답을 예측구간 어디에 둘지 0~1 (0.5=쉬움, 0.05·0.95=어려움)")
    ap.add_argument("--display-name", help="게임에 보일 건물 이름")
    ap.add_argument("--real-names", action="store_true",
                     help="⚠️ 실제 단지명·주소를 그대로 담는다 (기본은 가명)")
    ap.add_argument("--js", action="store_true",
                     help="JS 리터럴(const SCENARIO_xxx = {...};)로 내보낸다")
    ap.add_argument("--pretty", action="store_true", help="읽기 좋게 들여쓴다")
    ap.add_argument("--out", help="저장할 경로 (생략하면 표준출력)")
    return ap


def render(scenario: dict, as_js: bool, scenario_id: str, pretty: bool) -> str:
    """JSON 문자열, 또는 아티팩트에 그대로 붙여넣을 JS 리터럴."""
    body = json.dumps(scenario, ensure_ascii=False,
                      indent=2 if pretty else None,
                      separators=None if pretty else (",", ":"))
    if not as_js:
        return body
    key = "".join(c if c.isalnum() else "_" for c in scenario_id).upper()
    return f"const SCENARIO_{key} = {body};\n"


def main():
    ap = build_parser()
    args = ap.parse_args()

    if args.area <= 0:
        ap.error(f"--area 는 0보다 커야 합니다 (받은 값: {args.area})")

    scenario = build_scenario(args)
    body = render(scenario, args.js, args.id, args.pretty)

    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(body if body.endswith("\n") else body + "\n")
        p = scenario.get("prediction") or {}
        print(f"[완료] {args.out}")
        print(f"  버전 {scenario['version']} · 비교거래 {scenario['scenarios']['n_total']}건")
        print(f"  경매용 매도가 {scenario['scenarios']['auction']:,}만원"
              f" · 예측구간 ±{p.get('pct', '?')}% ({p.get('label', '?')})")
        print(f"  정답 {scenario['truth']['sale_price_man']:,}만원"
              f" (구간 {args.truth_pos:.0%} 지점) — 플레이어에겐 안 보이는 값입니다")
        if scenario["warnings"]:
            print(f"  경고 {len(scenario['warnings'])}개: "
                  + " · ".join(w["key"] for w in scenario["warnings"]))
    else:
        print(body)


if __name__ == "__main__":
    main()
