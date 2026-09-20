"""
매도가 계산 결과를 인터넷 연결이나 외부 라이브러리 없이 보기 좋은 정적 HTML
리포트로 만든다 (순수 HTML/CSS만 사용, 더블클릭으로 브라우저에서 바로 열림).

estimate_price.py가 --html 옵션을 줬을 때 이 모듈을 사용한다.
"""

from price_chart import MARKER_COLORS, render_price_distribution_html


def fmt_eok(man: float) -> str:
    return f"{man / 10000:.2f}억"


def _seasonality_chart_html(season: dict) -> str:
    index = season.get("index")
    if not index:
        return '<p class="muted">계절성 분석에 필요한 데이터가 부족합니다.</p>'

    busy, slow = season["busy"], season["slow"]
    max_v = max(index.values()) or 1
    cols = []
    for m in range(1, 13):
        v = index.get(m, 0)
        height_pct = max(4, round(v / max_v * 100))
        cls = "bar"
        if m in busy:
            cls += " bar-busy"
        elif m in slow:
            cls += " bar-slow"
        cols.append(
            f'<div class="bar-col">'
            f'<div class="bar-value">{v}</div>'
            f'<div class="{cls}" style="height:{height_pct}%"></div>'
            f'<div class="bar-label">{m}월</div>'
            f'</div>'
        )
    return f'<div class="bar-chart">{"".join(cols)}</div>'


def _seasonality_summary(season: dict) -> str:
    if not season.get("index"):
        return "표본 부족으로 계절성 분석을 생략했습니다."
    busy, slow = season["busy"], season["slow"]
    busy_txt = ", ".join(f"{m}월" for m in busy) if busy else "뚜렷한 성수기 없음"
    slow_txt = ", ".join(f"{m}월" for m in slow) if slow else "뚜렷한 비수기 없음"
    tail = (
        "매도 시점을 조정할 수 있다면 활발한 달 사이에 내놓는 것을 추천합니다."
        if busy else "뚜렷한 계절성이 없어 매도 시점보다 가격 자체에 집중하는 것을 추천합니다."
    )
    return f"거래 활발한 달: {busy_txt} · 거래 적은 달: {slow_txt} — {tail}"


def _price_trend_chart_html(trend: dict) -> str:
    series = trend.get("series") or []
    if len(series) < 3:
        return '<p class="muted">가격 추이를 그리기엔 데이터가 부족합니다.</p>'

    width, height = 760, 180
    pad_l, pad_r, pad_t, pad_b = 44, 10, 12, 24
    values = [v for _, v in series]
    min_v, max_v = min(values), max(values)
    span = (max_v - min_v) or 1
    n = len(series)

    def x(i):
        return pad_l + (width - pad_l - pad_r) * (i / (n - 1))

    def y(v):
        return pad_t + (height - pad_t - pad_b) * (1 - (v - min_v) / span)

    points = " ".join(f"{x(i):.1f},{y(v):.1f}" for i, (_, v) in enumerate(series))
    dots = "".join(f'<circle cx="{x(i):.1f}" cy="{y(v):.1f}" r="2.5" fill="#4f46e5" />' for i, (_, v) in enumerate(series))

    step = max(1, n // 8)
    labels = "".join(
        f'<text x="{x(i):.1f}" y="{height - 4}" font-size="10" fill="#6b6b7b" text-anchor="middle">{label}</text>'
        for i, (label, _) in enumerate(series) if i % step == 0 or i == n - 1
    )
    y_labels = (
        f'<text x="4" y="{y(max_v):.1f}" font-size="10" fill="#6b6b7b">{max_v:.0f}</text>'
        f'<text x="4" y="{y(min_v):.1f}" font-size="10" fill="#6b6b7b">{min_v:.0f}</text>'
    )

    return (
        f'<svg viewBox="0 0 {width} {height}" class="trend-svg" preserveAspectRatio="xMidYMid meet">'
        f'<polyline points="{points}" fill="none" stroke="#4f46e5" stroke-width="2" />'
        f"{dots}{labels}{y_labels}"
        "</svg>"
    )


def _price_trend_summary(trend: dict) -> str:
    series = trend.get("series") or []
    if len(series) < 3:
        return "표본 부족으로 가격 추이 분석을 생략했습니다."
    first_label, first_val = series[0]
    last_label, last_val = series[-1]
    change_pct = (last_val - first_val) / first_val * 100 if first_val else 0
    sign = "+" if change_pct >= 0 else ""
    return f"{first_label} 평당 {first_val:.0f}만원 → {last_label} 평당 {last_val:.0f}만원 ({sign}{change_pct:.1f}%)"


def _comparables_table_html(comparables: list[dict]) -> str:
    if not comparables:
        return '<p class="muted">비교거래가 없습니다.</p>'
    rows = []
    for r in comparables:
        rows.append(
            "<tr>"
            f"<td>{r['name']}</td><td>{r['area']}㎡</td><td>{r['date']}</td>"
            f"<td>{fmt_eok(r['amount'])}</td><td><span class='tag'>{r['label']}</span></td>"
            "</tr>"
        )
    return (
        "<table class='comp-table'><thead><tr>"
        "<th>단지명</th><th>면적</th><th>계약월</th><th>거래가</th><th>거리</th>"
        "</tr></thead><tbody>" + "".join(rows) + "</tbody></table>"
    )


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>
  :root {{
    --bg: #f7f7fb; --card: #ffffff; --text: #1c1c28; --muted: #6b6b7b;
    --accent: #4f46e5; --accent-soft: #eef0ff; --border: #e6e6ee;
    --busy: #22c55e; --slow: #f97316;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 32px 20px 60px; background: var(--bg); color: var(--text);
    font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
  }}
  .wrap {{ max-width: 880px; margin: 0 auto; }}
  h1 {{ font-size: 26px; margin-bottom: 4px; }}
  .subtitle {{ color: var(--muted); margin-bottom: 28px; font-size: 14px; }}
  .card {{ background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 20px; }}
  .card h2 {{ font-size: 16px; margin: 0 0 16px; color: var(--muted); font-weight: 600; }}
  .stat-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }}
  .stat {{ background: var(--accent-soft); border-radius: 12px; padding: 16px; }}
  .stat .label {{ font-size: 12px; color: var(--muted); margin-bottom: 6px; }}
  .stat .value {{ font-size: 22px; font-weight: 700; color: var(--accent); }}
  .confidence {{ display: inline-block; padding: 4px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-weight: 600; font-size: 13px; }}
  .comp-table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  .comp-table th, .comp-table td {{ text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--border); }}
  .comp-table th {{ color: var(--muted); font-weight: 600; }}
  .tag {{ background: var(--accent-soft); color: var(--accent); border-radius: 999px; padding: 2px 8px; font-size: 12px; }}
  .bar-chart {{ display: flex; align-items: flex-end; gap: 6px; height: 160px; }}
  .bar-col {{ flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }}
  .bar {{ width: 100%; background: #c7c9f2; border-radius: 6px 6px 0 0; }}
  .bar-busy {{ background: var(--busy); }}
  .bar-slow {{ background: var(--slow); }}
  .bar-value {{ font-size: 11px; color: var(--muted); margin-bottom: 4px; }}
  .bar-label {{ font-size: 11px; color: var(--muted); margin-top: 6px; }}
  .trend-svg {{ width: 100%; height: auto; }}
  .muted {{ color: var(--muted); font-size: 13px; }}
  .note {{ font-size: 12px; color: var(--muted); margin-top: 12px; }}
  footer {{ text-align: center; color: var(--muted); font-size: 12px; margin-top: 32px; }}
</style>
</head>
<body>
<div class="wrap">
  <h1>{building} 매도가 분석 리포트</h1>
  <div class="subtitle">{dong} · 전용 {area}㎡ · 분석기간 {period} · 생성일 {generated}</div>
  <div class="subtitle"><a href="{naver_url}" target="_blank" rel="noopener">🗺️ 이 지역 네이버부동산 매물 보기 (빌라·매매) ↗</a></div>

  <div class="card">
    <h2>매도가 산출 <span class="confidence">신뢰도 {confidence}/100</span></h2>
    <div class="stat-grid">
      <div class="stat" style="background:#fff7d6; border-left:4px solid var(--accent)"><div class="label">경매용 매도가</div><div class="value">{auction_price}</div></div>
      <div class="stat" style="border-left:4px solid {c_conservative}"><div class="label">보수적 급매가</div><div class="value">{conservative}</div></div>
      <div class="stat" style="border-left:4px solid {c_realistic}"><div class="label">현실적 체결가 (일반 매매)</div><div class="value">{realistic}</div></div>
      <div class="stat" style="border-left:4px solid {c_upper}"><div class="label">상단 매도가</div><div class="value">{upper}</div></div>
      <div class="stat" style="border-left:4px solid {c_ai_base}"><div class="label">AI 기준매도가</div><div class="value">{ai_base}</div></div>
      <div class="stat" style="border-left:4px solid {c_listing}"><div class="label">권장 최초 호가</div><div class="value">{listing}</div></div>
    </div>
    <p class="note">경매용 매도가 = 보수적 급매가~현실적 체결가 중간값 — 경매로 낙찰받아 되파는 경우 참고용</p>
    <p class="note">유효 비교거래 {n_total}건 (반경 절반 이내 근접 매물 {n_close}건)</p>
    {price_chart}
  </div>

  <div class="card">
    <h2>핵심 비교거래</h2>
    {comp_table}
  </div>

  <div class="card">
    <h2>가격 추이 — 월별 평균 평당가 ({trend_scope} 기준)</h2>
    {trend_chart}
    <p class="note">{trend_summary}</p>
  </div>

  <div class="card">
    <h2>계절성 — 월별 거래량 지수 ({season_scope} 기준, 전체 평균=100)</h2>
    {season_chart}
    <p class="note">{season_summary}</p>
  </div>

  <footer>국토교통부 연립다세대 매매 실거래가 기반 · 참고용 자료이며 투자 판단의 최종 책임은 본인에게 있습니다.</footer>
</div>
</body>
</html>
"""


def render_report(*, building, dong, area, period, generated, confidence,
                   conservative, realistic, upper, ai_base, listing, auction_price,
                   n_total, n_close, comparables, season, trend, filtered=None,
                   naver_url="") -> str:
    price_chart = ""
    if filtered:
        price_chart = render_price_distribution_html(filtered, {
            "보수적 급매가": conservative, "현실적 체결가": realistic, "경매용 매도가": auction_price,
            "상단 매도가": upper, "AI 기준매도가": ai_base, "권장 최초 호가": listing,
        }, hero_name="경매용 매도가", primary="#4f46e5")  # 이 리포트 자체의 accent 색(인디고)에 맞춘다

    return PAGE_TEMPLATE.format(
        title=f"{building} 매도가 분석",
        building=building, dong=dong, area=area, period=period, generated=generated,
        naver_url=naver_url,
        confidence=confidence,
        conservative=fmt_eok(conservative), realistic=fmt_eok(realistic),
        upper=fmt_eok(upper), ai_base=fmt_eok(ai_base), listing=fmt_eok(listing),
        auction_price=fmt_eok(auction_price),
        c_conservative=MARKER_COLORS["보수적 급매가"], c_realistic=MARKER_COLORS["현실적 체결가"],
        c_upper=MARKER_COLORS["상단 매도가"], c_ai_base=MARKER_COLORS["AI 기준매도가"],
        c_listing=MARKER_COLORS["권장 최초 호가"],
        n_total=n_total, n_close=n_close,
        comp_table=_comparables_table_html(comparables),
        price_chart=price_chart,
        season_scope=season.get("scope_label", "-"),
        season_chart=_seasonality_chart_html(season),
        season_summary=_seasonality_summary(season),
        trend_scope=trend.get("scope_label", "-"),
        trend_chart=_price_trend_chart_html(trend),
        trend_summary=_price_trend_summary(trend),
    )
