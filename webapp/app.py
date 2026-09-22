"""
빌라 매매가 계산기 — 웹 버전. CLAUDE.md 22절 규칙.

scripts/estimate_price.py의 5~8절 로직(반경 기반 비교거래 선정, 가중 중앙값)을
그대로 재사용한다 — 계산 자체는 순수 파이썬이라 Claude/AI 호출이 전혀 없다.
CLI 버전과 다른 점은, 사용자가 국토부 API를 직접 실행해 data/raw/에 저장하는
대신, 이 서버가 주소를 받으면 그때그때 국토부/카카오 API를 대신 호출해준다는
것뿐이다 (data_source.py).

실행 (로컬):
    pip install -r requirements.txt
    MOLIT_SERVICE_KEY="발급받은_인증키" KAKAO_REST_API_KEY="발급받은_키" python webapp/app.py
    브라우저에서 http://localhost:5000 접속

⚠️ apis.data.go.kr / dapi.kakao.com에 접속 가능한 환경(본인 PC, 또는 실제
   배포한 서버)에서 실행해야 한다 — Claude Code 샌드박스에서는 실행 불가.
⚠️ 여러 방문자가 쓸 걸 가정한 최소 기능(MVP) 버전이다. 8절 매도가(8-2절
   경매용 매도가 포함)·20절 건물정보(승강기/세대수/사용승인일)·24절
   시장동향·25절 인근 동 비교·26절 역세권 프리미엄(체크박스로 켜야 계산)
   까지 지원한다. 19절 수익성 계산은 사용자 요청으로 웹 버전에서 뺐다
   (CLI에는 그대로 있다). 예상 전세가(16절)·인근 중개업소(21절)·23절
   실측 전월세전환율(전월세 실거래 데이터를 아직 실시간으로 안 받아온다)도
   아직 웹 버전에 없다 — CLI(estimate_price.py)에는 이미 있다.

SITE_PASSWORD 환경변수를 설정하면 비밀번호를 아는 사람만 쓸 수 있다 (공개
URL로 배포했을 때 낯선 방문자가 국토부/카카오 API 일일 할당량을 소진시키는
것을 막기 위함). 설정하지 않으면 누구나 바로 쓸 수 있다.

KAKAO_JS_KEY 환경변수(선택)를 설정하면 27절 결과 페이지에 대상 물건 위치를
보여주는 카카오맵 미리보기가 뜬다. KAKAO_REST_API_KEY와는 다른 키이고,
카카오 개발자 콘솔에서 실제 배포 도메인을 등록해야 그 도메인에서 동작한다
(자세한 건 CLAUDE.md 27절 참고). 설정 안 하면 지도만 생략되고 나머지는
그대로 동작한다.
"""

import os
import sys
from datetime import datetime
from functools import wraps

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, redirect, render_template, request, session, url_for  # noqa: E402

SITE_PASSWORD = os.environ.get("SITE_PASSWORD")
# 27절 지도 미리보기용 카카오맵 JS SDK 키. KAKAO_REST_API_KEY(서버에서만
# 쓰는 비밀키)와는 완전히 다른 키다 — 카카오맵 JS SDK는 브라우저에서 직접
# 불러써야 하는 구조라 애초에 프론트엔드 노출을 전제로 설계됐고, 대신
# 카카오 개발자 콘솔에서 이 키를 쓸 도메인(배포한 실제 주소)을 등록해야
# 그 도메인에서만 동작한다. 설정 안 해도(또는 도메인 미등록이어도) 지도만
# 조용히 생략되고 나머지 계산은 그대로 된다.
KAKAO_JS_KEY = os.environ.get("KAKAO_JS_KEY")

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", os.urandom(24))


def _fmt_eok(man: float) -> str:
    return f"{man / 10000:.2f}억"


def _password_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if SITE_PASSWORD and not session.get("authed"):
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped


@app.route("/login", methods=["GET", "POST"])
def login():
    if not SITE_PASSWORD:
        return redirect(url_for("index"))
    error = None
    if request.method == "POST":
        if request.form.get("password") == SITE_PASSWORD:
            session["authed"] = True
            return redirect(url_for("index"))
        error = "비밀번호가 틀렸습니다."
    return render_template("login.html", error=error)


@app.route("/", methods=["GET"])
@_password_required
def index():
    return render_template("index.html", last_year=datetime.now().year - 1)


@app.route("/estimate", methods=["POST"])
@_password_required
def estimate():
    form = request.form
    address = form.get("address", "").strip()

    error = None
    if not address:
        error = "주소를 입력해 주세요."

    area = None
    if not error:
        try:
            area = float(form.get("area", ""))
            if area <= 0:
                raise ValueError
        except ValueError:
            error = "전용면적을 올바른 숫자로 입력해 주세요."

    # 층·준공년도는 필수다 — 둘 중 하나라도 빠지면 5~7절 유사층/유사연식
    # 가중치·필터가 제대로 안 걸려서 비교거래가 뒤죽박죽 섞이고 매도가
    # 산출값이 중구난감해진다(사용자가 실제로 겪은 문제).
    floor = None
    if not error:
        floor_raw = form.get("floor", "").strip()
        if not floor_raw:
            error = "층을 입력해 주세요 (반지하/지하는 0 이하로 입력)."
        else:
            try:
                floor = int(floor_raw)
            except ValueError:
                error = "층을 올바른 숫자로 입력해 주세요."

    build_year = None
    if not error:
        build_year_raw = form.get("build_year", "").strip()
        if not build_year_raw:
            error = "준공년도를 입력해 주세요."
        elif not (build_year_raw.isdigit() and len(build_year_raw) == 4):
            error = "준공년도를 4자리 숫자로 입력해 주세요 (예: 2012)."
        else:
            build_year = build_year_raw

    if error:
        return render_template("index.html", error=error, form=form,
                                last_year=datetime.now().year - 1)

    def _optional_int(name):
        raw = form.get(name, "").strip()
        return int(raw) if raw else None

    def _optional_float(name, default=None):
        raw = form.get(name, "").strip()
        return float(raw) if raw else default

    radius = _optional_float("radius", 400)
    area_tolerance_pct_input = _optional_float("area_tolerance", 15.0)
    area_tolerance_pct = area_tolerance_pct_input / 100
    build_year_tolerance = _optional_int("build_year_tolerance") or 4
    this_year = datetime.now().year
    this_month = datetime.now().month
    year_min = _optional_int("year_min") or (this_year - 1)

    from geocode import geocode_full

    try:
        subject_detail = geocode_full(address)
    except RuntimeError as e:
        return render_template("index.html", error=f"카카오 API 설정을 확인해 주세요: {e}",
                                form=form, last_year=this_year - 1)

    if subject_detail is None:
        return render_template(
            "index.html",
            error="주소를 좌표로 변환하지 못했습니다. 지번 주소로 다시 입력해 주세요 (예: 서울특별시 강북구 수유동 468-202).",
            form=form, last_year=this_year - 1,
        )

    subject_coord = (subject_detail["lat"], subject_detail["lon"])

    from naver_link import naver_land_url, naver_search_url

    naver_url = naver_land_url(*subject_coord)

    lawd_cd = (subject_detail.get("b_code") or "")[:5]
    if len(lawd_cd) != 5:
        return render_template("index.html", error="주소에서 지역코드를 확인하지 못했습니다.",
                                form=form, last_year=this_year - 1)

    building = None
    try:
        from building_register import get_building_info

        building_info = get_building_info(
            subject_detail.get("b_code"), subject_detail.get("main_no"),
            subject_detail.get("sub_no"), subject_detail.get("is_mountain", False),
        )
        if building_info:
            building = {
                "elevator": f"있음 ({building_info['elevator_count']}대)" if building_info["has_elevator"] else "없음",
                "has_elevator": building_info["has_elevator"],  # 41절 환금성 진단이 쓴다
                "household_count": building_info.get("household_count"),
                "approval_date": building_info.get("approval_date"),
                "ground_floors": building_info.get("ground_floors"),
            }
    except RuntimeError:
        building = None  # 건축물대장 조회는 참고 정보일 뿐 — 실패해도 매도가 계산은 계속 진행한다

    from estimate_price import CONDITION_LABELS, CONDITION_MULTIPLIER, INSPECTION_CHECKLIST

    inspection_checklist = INSPECTION_CHECKLIST

    terrain = None
    try:
        from estimate_price import compute_terrain_check

        t = compute_terrain_check(subject_coord)
        if t["mountain"] or t["river"]:
            terrain = {
                "mountain": f"{t['mountain']['name']} ({t['mountain']['distance_m']}m)" if t["mountain"] else "1km 이내 없음",
                "river": f"{t['river']['name']} ({t['river']['distance_m']}m)" if t["river"] else "1km 이내 없음",
            }
    except RuntimeError:
        terrain = None  # 참고 정보일 뿐 — 실패해도 매도가 계산은 계속 진행한다

    def _direction(delta, unit="p"):
        if delta is None:
            return "추세 판단 불가"
        if abs(delta) < 2:
            return "보합"
        return f"{'상승' if delta > 0 else '하락'} 중 ({delta:+.1f}{unit})"

    villa_market_trend = None
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
        peers = []
        if villa_is_zone:
            zone_rank = rank_region(villa_rows, villa_zone, "index")
            if zone_rank is not None:
                peers = format_ranking_peers(zone_rank["ranking"], villa_zone, max_show=5)
        national = latest_value_for(load_villa_market_index(), "전국", "index")
        national_line = None
        if national is not None:
            _nat_date, nat_val = national
            national_line = (f"전국 평균({nat_val:.1f}) 대비 {idx - nat_val:+.1f}p "
                              f"({'전국보다 강세' if idx > nat_val else '전국보다 약세' if idx < nat_val else '전국과 비슷'})")
        villa_market_trend = {
            "region": villa_label, "date": villa_trend["snapshot_date"],
            "index": f"{idx:.1f}", "diff": f"{idx - 100:+.1f}",
            "plain_desc": _plain_market_desc(idx),
            "trend": _direction(villa_trend["index_trend"]),
            "start_date": villa_trend["start_date"], "start_value": f"{villa_trend['start_value']:.1f}",
            "since_start": f"{villa_trend['since_start']:+.1f}",
            "peers": peers, "national_line": national_line,
            "is_zone": villa_is_zone,
        }

    from data_source import get_trade_rows
    from estimate_price import (
        ADAPTIVE_RADIUS_MIN_COMPARABLES, compute_scenarios, dedupe, estimate_monthly_trend_rate,
        find_comparables_adaptive,
    )
    from lawd_lookup import find_dong_in_address

    try:
        rows = dedupe(get_trade_rows(lawd_cd, year_min))
    except RuntimeError as e:
        return render_template("index.html", error=f"국토부 API 조회 중 문제가 발생했습니다: {e}",
                                form=form, last_year=this_year - 1)

    if not rows:
        return render_template(
            "index.html",
            error="이 지역의 실거래 데이터를 찾지 못했습니다. 조회 기간을 늘려서 다시 시도해 보세요.",
            form=form, last_year=this_year - 1,
        )

    # 7-2절 시계열 가격보정 — CLI는 data/raw의 전체 기간 데이터로 추세를
    # 추정하지만, 웹 버전은 애초에 get_trade_rows()가 year_min 이후 데이터만
    # 가져오므로 그 범위 안에서만 추세를 추정한다(그래도 최근 추세가 더
    # 중요하다는 점에서 크게 어긋나지 않는다).
    target_dong = find_dong_in_address(address)
    monthly_trend_rate = estimate_monthly_trend_rate(rows, target_dong) if target_dong else None

    filtered, radius, radius_expanded = find_comparables_adaptive(
        rows, subject_coord, area, floor, build_year,
        radius, year_min, this_year, gu_filter=None,
        area_tolerance_pct=area_tolerance_pct,
        build_year_tolerance=build_year_tolerance,
        this_month=this_month, monthly_trend_rate=monthly_trend_rate)
    if not filtered:
        return render_template(
            "index.html",
            error="반경을 최대한 넓혀봤지만 유사면적 조건에 맞는 비교거래를 찾지 못했습니다. 면적 허용범위를 넓혀서 다시 시도해 보세요.",
            form=form, last_year=this_year - 1,
        )

    scen = compute_scenarios(filtered, radius, this_year, subject_area=area)
    conservative = scen["p25"]
    realistic = scen["median"]
    upper = scen["p75"]
    ai_base = round((conservative * 0.3 + realistic * 0.5 + upper * 0.2), -1)
    auction_price = round((conservative + realistic) / 2, -1)

    # CLAUDE.md 38절 — 상태별 매도가 3단계. 35절이 "고른 상태 하나에 배율을
    # 한 번 곱한 값"만 보여줬다면, 여기서는 지금 상태에서 손볼수록 매도가가
    # 얼마씩 올라가는지(그리고 공사비를 넣으면 남는 장사인지까지) 사다리로
    # 보여준다. 기준값은 경매용 매도가 — 이 계산기가 전제하는 "낙찰받아
    # 되파는" 상황에 가장 가까운 값이라서다.
    condition = form.get("condition", "").strip()
    condition_display = None
    if condition in CONDITION_MULTIPLIER:
        from estimate_price import CONDITION_MULTIPLIER as _CM
        from estimate_price import compute_condition_ladder

        repair_costs = {}
        for step, field in (("기본", "repair_cost_basic"), ("올수리", "repair_cost_full")):
            cost = _optional_float(field)
            if cost is not None:
                repair_costs[step] = cost
        ladder = compute_condition_ladder(auction_price, condition, repair_costs)
        if ladder:
            condition_display = {
                "current_label": CONDITION_LABELS[condition],
                "base_label": "경매용 매도가",
                "rows": [
                    {
                        "label": row["label"],
                        "is_current": row["is_current"],
                        "price": _fmt_eok(row["price_man"]),
                        "gain": None if row["is_current"] else _fmt_eok(row["gain_man"]),
                        "cost": f"{row['cost_man']:,.0f}만원" if row["cost_man"] is not None else None,
                        "net": _fmt_eok(row["net_man"]) if row["net_man"] is not None else None,
                        "net_positive": None if row["net_man"] is None else row["net_man"] > 0,
                        "multiplier_pct": f"{(_CM[row['condition']] - 1) * 100:+.0f}",
                    }
                    for row in ladder
                ],
                "has_cost": any(row["cost_man"] is not None for row in ladder),
            }

    from estimate_price import (
        PRICE_TIER_LABELS, build_verdict, compute_liquidity, compute_price_tiers,
        speed_label_for_percentile,
    )

    price_tiers = compute_price_tiers(filtered)
    liquidity = compute_liquidity(rows, subject_coord, area, this_year, gu_filter=None,
                                   area_tolerance_pct=area_tolerance_pct)

    from price_chart import MARKER_COLORS, render_price_distribution_html

    # "권장 최초 호가"는 사용자 요청으로 웹 화면에서 뺐다(뭔지 헷갈린다는
    # 피드백) — CLI에는 그대로 있다.
    price_chart_html = render_price_distribution_html(filtered, {
        "보수적 급매가": conservative, "현실적 체결가": realistic, "경매용 매도가": auction_price,
        "상단 매도가": upper, "AI 기준매도가": ai_base,
    }, hero_name="경매용 매도가", this_year=this_year, this_month=this_month,
        # 8-1절 — 이 그래프는 히어로 카드 안이 아니라 전용 카드(결과 페이지
        # 전체 폭)에 들어간다. 좁은 칸에 끼워넣던 때(420×300)와 달리 가로로
        # 긴 viewBox(880×330)를 쓰고, 좁은 화면에서는 720px 아래로 줄어들지
        # 않게 막은 뒤 가로 스크롤로 넘긴다.
        width=880, height=270, min_width=720)
    marker_colors = {
        "conservative": MARKER_COLORS["보수적 급매가"], "realistic": MARKER_COLORS["현실적 체결가"],
        "upper": MARKER_COLORS["상단 매도가"], "ai_base": MARKER_COLORS["AI 기준매도가"],
    }

    dong_compare = None
    from rank_areas import MIN_SAMPLE, build_dong_stats, find_dong_rank, rank_by_price_change, rank_by_volume

    dong_result = build_dong_stats(rows) if target_dong else None
    if dong_result is not None:
        latest_ym, dong_data = dong_result
        latest_y, latest_m = divmod(latest_ym, 12)
        volume_ranked = rank_by_volume(dong_data)
        price_ranked = rank_by_price_change(dong_data)
        vol_rank = find_dong_rank(volume_ranked, target_dong)
        price_rank = find_dong_rank(price_ranked, target_dong)
        dong_compare = {
            "dong": target_dong, "latest_month": f"{latest_y}.{latest_m + 1:02d}",
            "volume_top": [
                {"dong": d, "count": c, "is_target": d == target_dong}
                for d, c in volume_ranked[:5]
            ],
            "volume_rank_note": (f"{vol_rank}위 {target_dong} {dict(volume_ranked)[target_dong]}건 "
                                  f"({len(volume_ranked)}개 동 중)") if vol_rank and vol_rank > 5 else None,
            "volume_missing": vol_rank is None,
            "price_top": [
                {"dong": d, "change_pct": f"{'+' if chg >= 0 else ''}{chg:.1f}%", "is_target": d == target_dong}
                for d, chg, _avg, _cnt in price_ranked[:5]
            ],
            "price_rank_note": None,
            "price_missing": price_rank is None,
        }
        if price_rank and price_rank > 5:
            chg = {d: chg for d, chg, _a, _c in price_ranked}[target_dong]
            sign = "+" if chg >= 0 else ""
            dong_compare["price_rank_note"] = f"{price_rank}위 {target_dong} {sign}{chg:.1f}% ({len(price_ranked)}개 동 중)"
        if not volume_ranked and not price_ranked:
            dong_compare = None

    station_premium = None
    if form.get("station_premium"):
        from estimate_price import compute_distance_premium, compute_distance_premium_correction

        premium = compute_distance_premium(filtered)
        if premium is not None:
            station_premium = {
                "n": premium["n"], "keyword": premium["keyword"],
                "min_distance": premium["min_distance"], "max_distance": premium["max_distance"],
                "change_per_100m": f"{abs(premium['change_per_100m']):.1f}",
                "pct_per_100m": f"{abs(premium['pct_per_100m']):.1f}",
                "direction": "하락" if premium["change_per_100m"] < 0 else "상승",
                "tendency": "가까울수록 비싸지는" if premium["change_per_100m"] < 0 else "가까울수록 오히려 싸지는",
                "r_squared": f"{premium['r_squared']:.2f}",
                "low_confidence": premium["r_squared"] < 0.2,
                "correction": None,
            }

            # 7-3절 — 조건이 까다로워(표본 15건·거리범위 300m·R²0.3·상식적 방향)
            # 다 맞을 때만, 대상 물건의 실제 역까지 거리를 반영한 참고용 보정
            # 수치를 추가로 보여준다. 8절 공식 매도가 값 자체는 바뀌지 않는다.
            try:
                from geocode import nearby_place

                subject_place = nearby_place(subject_coord[0], subject_coord[1], "지하철역")
            except RuntimeError:
                subject_place = None
            if subject_place is not None:
                correction = compute_distance_premium_correction(premium, subject_place["distance_m"])
                if correction is not None:
                    station_premium["correction"] = {
                        "subject_distance_m": subject_place["distance_m"],
                        "avg_distance_m": f"{correction['avg_distance_m']:.0f}",
                        "closer": subject_place["distance_m"] < correction["avg_distance_m"],
                        "pct": f"{correction['pct']:+.1f}",
                        "corrected_realistic": _fmt_eok(realistic * correction["factor"]),
                    }

    from estimate_price import describe_comparable_similarity, estimate_building_top_floors, is_estimated_top_floor

    top_floor_map = estimate_building_top_floors(rows)

    build_year_note = f", 준공년도 ±{build_year_tolerance}년 이내" if build_year is not None else ""
    expanded_note = (
        f" (지정한 반경 안 비교거래가 {ADAPTIVE_RADIUS_MIN_COMPARABLES}건 미만이라 자동으로 넓혔습니다.)"
        if radius_expanded else ""
    )
    from estimate_price import TIME_CORRECTION_MAX_PCT

    time_correction_note = (
        f" 오래된 거래는 이 동네 가격 추이(월 {monthly_trend_rate*100:+.2f}%)를 반영해 지금 시세 "
        f"수준으로 보정(최대 ±{TIME_CORRECTION_MAX_PCT*100:.0f}%)했습니다."
        if monthly_trend_rate is not None and abs(monthly_trend_rate) >= 0.001 else ""
    )
    comparable_criteria = (
        f"반경 {radius:.0f}m 안, 전용면적 ±{area_tolerance_pct_input:.0f}%{build_year_note}인 실거래 중 "
        f"거리·면적·층·준공년도 종합 유사도(0~100점, 표의 '유사도' 열)가 높을수록, "
        f"계약월이 최근일수록 가중치를 높게 줘서 고른 것입니다.{expanded_note}{time_correction_note}"
    )

    price_tiers_display = {
        "rows": [
            {"key": k, "label": PRICE_TIER_LABELS[k], "price": _fmt_eok(price_tiers[k]),
             "speed": None, "percentile": None}
            for k in ("urgent", "d30", "d60", "normal", "test")
        ],
    }

    liquidity_display = None
    if liquidity is not None:
        c = liquidity["counts"]
        liquidity_display = {
            "latest": f"{liquidity['latest_year']}.{liquidity['latest_month']:02d}",
            "rows": [
                {
                    "radius": radius,
                    "m3": c[(radius, 3)], "m3_avg": f"{c[(radius, 3)] / 3:.1f}",
                    "m6": c[(radius, 6)], "m6_avg": f"{c[(radius, 6)] / 6:.1f}",
                    "m12": c[(radius, 12)], "m12_avg": f"{c[(radius, 12)] / 12:.1f}",
                }
                for radius in liquidity["radii"]
            ],
        }

    # 결과 페이지 안에서 바로 매물을 붙여넣고 재계산할 수 있게, 지금 제출된
    # 값(주소·면적·층 등)을 숨은 필드로 그대로 echo해둔다 — 28절 UX 개선:
    # 예전엔 네이버부동산 링크는 결과 페이지에 있고 붙여넣기 칸은 입력 폼
    # 페이지에 있어서, 링크 열고 복사한 뒤 "뒤로가기"로 폼을 다시 채워야
    # 했다. 이제 결과 페이지 자체에 작은 재제출 폼을 둬서 그 왕복을 없앤다.
    resubmit_fields = {k: v for k, v in form.items() if k != "listings_text"}

    result = {
        "address": address,
        "period": f"{year_min}.01 ~ {this_year}.12",
        "building": building,
        "terrain": terrain,
        "inspection_checklist": inspection_checklist,
        "condition_adjustment": condition_display,
        "villa_market_trend": villa_market_trend,
        "dong_compare": dong_compare,
        "station_premium": station_premium,
        "price_chart_html": price_chart_html,
        "marker_colors": marker_colors,
        "naver_land_url": naver_url,
        "kakao_js_key": KAKAO_JS_KEY,
        "subject_lat": subject_coord[0],
        "subject_lon": subject_coord[1],
        "search_radius_m": radius,
        "price_tiers": price_tiers_display,
        "liquidity": liquidity_display,
        "resubmit_fields": resubmit_fields,
        "n_total": scen["n_total"], "n_close": scen["n_close"], "n_this_year": scen["n_this_year"],
        "confidence": scen["confidence"],
        "conservative": _fmt_eok(conservative), "realistic": _fmt_eok(realistic),
        "auction_price": _fmt_eok(auction_price),
        "upper": _fmt_eok(upper), "ai_base": _fmt_eok(ai_base),
        "comparable_criteria": comparable_criteria,
        "comparables": [
            {
                "name": r.get("mhouseNm", "(단지명없음)"),
                "area": r.get("excluUseAr", "?"),
                "floor": r.get("floor") or "?",
                "is_top_floor": is_estimated_top_floor(r, top_floor_map),
                "date": f"{r.get('dealYear')}.{r.get('dealMonth')}",
                "amount": _fmt_eok(r["_amount_man"]),
                "distance": f"{r['_distance_m']:.0f}m",
                "score": round(r["_similarity_score"]),
                "note": describe_comparable_similarity(area, floor, build_year, r),
                "search_url": naver_search_url(f"{r.get('umdNm', '')} {r.get('mhouseNm', '')}".strip()),
                "map_url": naver_land_url(r["_lat"], r["_lon"], zoom=19) if r.get("_lat") is not None else None,
            }
            for r in filtered[:8]
        ],
    }

    listings_text = form.get("listings_text", "").strip()
    similar_listings = None
    listing_price_summary = None  # 31절 — 일반 매도가 기준 가격 경쟁력, 붙여넣은 매물이 있을 때만 계산됨
    pressure = None  # 39절 — 경쟁매물 ÷ 최근 실거래, 마찬가지로 매물을 붙여넣은 경우만
    if listings_text:
        from listing_parser import (parse_listings, price_rank_among_listings,
                                     rank_similar_listings, sale_pressure)

        parsed, skipped = parse_listings(listings_text)
        if parsed:
            ranked = rank_similar_listings(parsed, area, floor, int(build_year), top_n=20)
            similar_listings = {
                "rows": [
                    {
                        "name": it["name"],
                        "price": _fmt_eok(it["price_man"]),
                        "area": it["area"],
                        "floor": it["floor"] if it["floor"] is not None else "?",
                        "note": describe_comparable_similarity(area, floor, build_year, {
                            "excluUseAr": it["area"],
                            "floor": str(it["floor"]) if it["floor"] is not None else None,
                            "buildYear": str(it["build_year"]) if it["build_year"] is not None else None,
                        }),
                    }
                    for it in ranked
                ],
                "n_parsed": len(parsed),
                "n_skipped": skipped,
                "n_shown": len(ranked),
            }
            listing_price_summary = price_rank_among_listings(parsed, area, price_tiers["normal"],
                                                                area_tolerance_pct)
            if listing_price_summary is not None:
                result["price_tiers"]["competitive_note"] = (
                    f"일반 매도가({_fmt_eok(price_tiers['normal'])}) 기준 붙여넣은 유사면적 매물 "
                    f"{listing_price_summary['n']}건 중 가격 경쟁력 상위 {listing_price_summary['percentile']}%"
                    f" (이보다 싼 매물 {listing_price_summary['cheaper_count']}개)"
                )

            # 29절 확장 — 5단계 가격 구간 각각이 "지금 나와 있는 경쟁 매물" 대비
            # 몇 % 위치인지(31절)와 30절 유동성을 합쳐서 구간마다 예상 소진
            # 속도를 붙인다. 과거 실거래 기준 구간(29절)과 현재 매물 기준
            # 퍼센타일(31절)이 어긋나면(예: "최고가 테스트"인데 현재 매물
            # 대비로는 오히려 싼 편) 그 자체가 시장이 움직였다는 신호가 된다.
            liquidity_avg_500_3m = liquidity["counts"][(500, 3)] / 3 if liquidity is not None else None

            # 39절 — 지금 쌓인 경쟁 매물이 이 동네 거래 속도로 몇 개월치인지.
            pressure = sale_pressure(parsed, area, liquidity_avg_500_3m, area_tolerance_pct)

            for row in result["price_tiers"]["rows"]:
                tier_rank = price_rank_among_listings(parsed, area, price_tiers[row["key"]], area_tolerance_pct)
                if tier_rank is not None:
                    row["percentile"] = tier_rank["percentile"]
                    row["speed"] = speed_label_for_percentile(tier_rank["percentile"], liquidity_avg_500_3m)
        else:
            similar_listings = {"rows": [], "n_parsed": 0, "n_skipped": skipped, "n_shown": 0}

    result["similar_listings"] = similar_listings
    result["sale_pressure"] = pressure
    result["listings_text_echo"] = listings_text
    # 32절 — 문장을 한 덩어리로 흘려보내지 않고 문장 리스트 그대로 받아서
    # 화면에서 줄을 나눈다(긴 줄글은 읽기 어렵다는 사용자 지적 반영).
    from estimate_price import build_verdict_parts

    result["verdict_lines"] = build_verdict_parts(
        scen["confidence"], scen["n_total"], liquidity=liquidity,
        listing_summary=listing_price_summary,
        model_divergence_pct=scen.get("model_divergence_pct"),
        sale_pressure=pressure)
    result["verdict"] = " ".join(result["verdict_lines"])

    # 41절 — "얼마"(8절)와 별개로 "얼마나 잘 팔릴까"를 강의 기준으로 진단한다.
    # 매물을 붙여넣었으면 경쟁 매물·가격 위치 항목까지 채워진다.
    from estimate_price import MARKETABILITY_ICONS, build_marketability_report

    marketability = build_marketability_report(
        floor=floor, build_year=int(build_year), this_year=this_year,
        confidence=scen["confidence"], liquidity=liquidity, sale_pressure=pressure,
        listing_summary=listing_price_summary, building=building)
    for item in marketability["items"]:
        item["icon"] = MARKETABILITY_ICONS.get(item["verdict"], "·")
    result["marketability"] = marketability

    monthly_deposit = _optional_float("monthly_deposit")
    if monthly_deposit is not None:
        from estimate_price import compute_monthly_rent

        conversion_rate = _optional_float("conversion_rate", 6.0)
        monthly_rent = compute_monthly_rent(realistic, monthly_deposit, conversion_rate)
        result["monthly_rent"] = {
            "deposit": f"{monthly_deposit:.0f}", "rate": f"{conversion_rate:.1f}",
            "amount": f"{monthly_rent:.0f}",
        }

    return render_template("result.html", result=result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
