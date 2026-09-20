"""
경매 매도가 추정기 — 웹 버전. CLAUDE.md 22절 규칙.

scripts/estimate_price.py의 5~8절 로직(반경 기반 비교거래 선정, 가중 중앙값)을
그대로 재사용한다 — 계산 자체는 순수 파이썬이라 Claude/AI 호출이 전혀 없다.
CLI 버전과 다른 점은, 사용자가 국토부 API를 직접 실행해 data/raw/에 저장하는
대신, 이 서버가 주소를 받으면 그때그때 국토부/카카오 API를 대신 호출해준다는
것뿐이다 (data_source.py).

실행:
    pip install -r requirements.txt
    MOLIT_SERVICE_KEY="발급받은_인증키" KAKAO_REST_API_KEY="발급받은_키" python webapp/app.py
    브라우저에서 http://localhost:5000 접속

⚠️ apis.data.go.kr / dapi.kakao.com에 접속 가능한 환경(본인 PC, 또는 실제
   배포한 서버)에서 실행해야 한다 — Claude Code 샌드박스에서는 실행 불가.
⚠️ 여러 방문자가 쓸 걸 가정한 최소 기능(MVP) 버전이다. 8절 매도가 계산까지만
   지원하고, 예상 전세가(16절)·건물정보(20절)·인근 중개업소(21절) 등은
   아직 웹 버전에 없다 — CLI(estimate_price.py)에는 이미 있다.
"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, render_template, request  # noqa: E402

app = Flask(__name__)


def _fmt_eok(man: float) -> str:
    return f"{man / 10000:.2f}억"


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", last_year=datetime.now().year - 1)


@app.route("/estimate", methods=["POST"])
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

    if error:
        return render_template("index.html", error=error, form=form,
                                last_year=datetime.now().year - 1)

    def _optional_int(name):
        raw = form.get(name, "").strip()
        return int(raw) if raw else None

    def _optional_float(name, default=None):
        raw = form.get(name, "").strip()
        return float(raw) if raw else default

    floor = _optional_int("floor")
    build_year = form.get("build_year", "").strip() or None
    radius = _optional_float("radius", 400)
    this_year = datetime.now().year
    year_min = _optional_int("year_min") or (this_year - 1)
    bid_price = _optional_float("bid_price")

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
    lawd_cd = (subject_detail.get("b_code") or "")[:5]
    if len(lawd_cd) != 5:
        return render_template("index.html", error="주소에서 지역코드를 확인하지 못했습니다.",
                                form=form, last_year=this_year - 1)

    from data_source import get_trade_rows
    from estimate_price import compute_scenarios, dedupe, find_comparables

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

    filtered = find_comparables(rows, subject_coord, area, floor, build_year,
                                 radius, year_min, this_year, gu_filter=None)
    if not filtered:
        return render_template(
            "index.html",
            error=f"반경 {radius:.0f}m, 유사면적 조건에 맞는 비교거래를 찾지 못했습니다. 반경을 넓혀서 다시 시도해 보세요.",
            form=form, last_year=this_year - 1,
        )

    scen = compute_scenarios(filtered, radius, this_year)
    conservative = scen["p25"]
    realistic = scen["median"]
    upper = scen["p75"]
    ai_base = round((conservative * 0.3 + realistic * 0.5 + upper * 0.2), -1)
    listing = round(upper * 1.03, -1)

    result = {
        "address": address,
        "period": f"{year_min}.01 ~ {this_year}.12",
        "n_total": scen["n_total"], "n_close": scen["n_close"], "n_this_year": scen["n_this_year"],
        "confidence": scen["confidence"],
        "conservative": _fmt_eok(conservative), "realistic": _fmt_eok(realistic),
        "upper": _fmt_eok(upper), "ai_base": _fmt_eok(ai_base), "listing": _fmt_eok(listing),
        "comparables": [
            {
                "name": r.get("mhouseNm", "(단지명없음)"),
                "area": r.get("excluUseAr", "?"),
                "floor": r.get("floor") or "?",
                "date": f"{r.get('dealYear')}.{r.get('dealMonth')}",
                "amount": _fmt_eok(r["_amount_man"]),
                "distance": f"{r['_distance_m']:.0f}m",
            }
            for r in filtered[:8]
        ],
    }

    if bid_price is not None:
        from estimate_price import compute_profit

        labels = {
            "conservative": "보수적 급매가", "realistic": "현실적 체결가", "upper": "상단 매도가",
            "ai_base": "AI 기준매도가", "listing": "권장 최초 호가",
        }
        scenario_values = {
            "conservative": conservative, "realistic": realistic, "upper": upper,
            "ai_base": ai_base, "listing": listing,
        }
        profit_rows = []
        for key, label in labels.items():
            p = compute_profit(bid_price, scenario_values[key], 0.035, 0.005, 0)
            sign = "+" if p["net_profit"] >= 0 else ""
            profit_rows.append({
                "label": label,
                "net_profit": f"{sign}{_fmt_eok(p['net_profit'])}",
                "roi": f"{sign}{p['roi_pct']:.1f}%",
            })
        result["profit"] = profit_rows
        result["bid_price"] = _fmt_eok(bid_price)

    return render_template("result.html", result=result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
