"""
8절 산출값(보수적 급매가/현실적 체결가/상단 매도가/AI 기준매도가/권장 최초
호가)과 실제 비교거래 개별 가격을 가로 점그래프(스트립플롯)로 함께 보여준다.
CLI HTML 리포트(scripts/report.py, 14절)와 웹 버전 결과 페이지(webapp/app.py,
22절) 양쪽에서 재사용한다. 외부 차트 라이브러리 없이 순수 SVG로 그린다.

기본으로 "보수적 급매가 ~ 현실적 체결가" 구간을 강조 배경으로 칠한다 —
사용자가 실제 경매 낙찰 후 매도 사례들을 이 계산기 산출값과 대조해본 결과
실제 매도가가 이 구간에서 형성되는 경우가 많았다고 확인해준 것을 반영한
것이다. 통계적으로 검증된 구간이 아니라 사용자 관찰에 근거한 참고용
강조이므로, 캡션에 항상 그 출처를 명시한다.
"""

import html

PRIMARY = "#03c75a"
INK = "#1c1e21"
MUTED = "#7c8288"
MUTED_2 = "#a4a9ae"
BORDER = "#e7e9ec"
DOT_FILL = "#9aa0a6"


def _fmt_eok(man: float) -> str:
    return f"{man / 10000:.2f}억"


def render_price_distribution_html(filtered: list[dict], markers: dict[str, float],
                                     highlight: tuple[str, str] = ("보수적 급매가", "현실적 체결가"),
                                     hero_name: str = "경매용 매도가",
                                     max_dots: int = 40, width: int = 660, height: int = 172,
                                     primary: str = PRIMARY) -> str:
    """filtered: find_comparables()가 돌려준 비교거래 목록(거리순 정렬됨,
    _amount_man 필요). markers: {"보수적 급매가": p25, ...} 순서대로 표시된다.
    highlight: 배경으로 강조할 두 마커 이름(순서 무관, 둘 다 markers에 있어야
    함) — 기본값은 사용자가 실측으로 확인한 구간. hero_name: markers 중 accent
    색으로 강조해서 표시할 이름(보통 화면의 대표 히어로 숫자와 맞춘다).
    primary: 강조색 — 웹 버전은 기본값(네이버 그린)을 쓰고, CLI HTML
    리포트(report.py)는 그 페이지의 인디고 accent 색을 넘겨서 톤을 맞춘다."""
    rows = [r for r in filtered if r.get("_amount_man") is not None][:max_dots]
    all_values = [r["_amount_man"] for r in rows] + list(markers.values())
    if not all_values:
        return ""

    lo, hi = min(all_values), max(all_values)
    if hi <= lo:
        hi = lo + 1
    pad = (hi - lo) * 0.08
    domain_lo, domain_hi = lo - pad, hi + pad

    margin_l, margin_r = 16, 16
    plot_w = width - margin_l - margin_r

    def x_of(v: float) -> float:
        return margin_l + (v - domain_lo) / (domain_hi - domain_lo) * plot_w

    axis_y = 92
    dot_r, hit_r = 5, 13
    row_gap = 13
    max_rows = 4
    min_gap_px = dot_r * 2 + 4

    svg = [
        f'<svg viewBox="0 0 {width} {height}" width="100%" height="{height}" '
        f'role="img" aria-label="비교거래 가격 분포와 산출값">'
    ]

    band_names = set(highlight)
    if band_names <= markers.keys():
        vals = [markers[n] for n in highlight]
        bx1, bx2 = x_of(min(vals)), x_of(max(vals))
        svg.append(
            f'<rect x="{bx1:.1f}" y="6" width="{max(bx2 - bx1, 1):.1f}" height="{axis_y - 6:.1f}" '
            f'fill="{primary}" fill-opacity="0.08" />'
        )

    svg.append(
        f'<line x1="{margin_l}" y1="{axis_y}" x2="{width - margin_r}" y2="{axis_y}" '
        f'stroke="{BORDER}" stroke-width="1" />'
    )

    # 개별 비교거래 점 — 겹치지 않게 아래에서 위로 쌓는 간단한 비스웜(beeswarm) 배치
    rows_sorted = sorted(rows, key=lambda r: r["_amount_man"])
    row_last_x: list[float | None] = [None] * max_rows
    for r in rows_sorted:
        x = x_of(r["_amount_man"])
        row = 0
        while row < max_rows - 1 and row_last_x[row] is not None and abs(x - row_last_x[row]) < min_gap_px:
            row += 1
        row_last_x[row] = x
        y = axis_y - 10 - row * row_gap
        name = html.escape(str(r.get("mhouseNm", "단지명없음")))
        area = html.escape(str(r.get("excluUseAr", "?")))
        deal = html.escape(f"{r.get('dealYear')}.{r.get('dealMonth')}")
        dist = r.get("_distance_m", 0)
        tip = f"{name} {area}㎡ · {_fmt_eok(r['_amount_man'])} · {deal} 계약 · {dist:.0f}m"
        svg.append(
            f'<circle cx="{x:.1f}" cy="{y}" r="{hit_r}" fill="transparent">'
            f'<title>{tip}</title></circle>'
            f'<circle cx="{x:.1f}" cy="{y}" r="{dot_r}" fill="{DOT_FILL}" '
            f'fill-opacity="0.85" stroke="#fff" stroke-width="2" />'
        )

    # 산출값 마커 — 축 아래로 눈금 + 라벨, x순서로 정렬해서 두 줄로 번갈아 배치(겹침 방지)
    marker_items = sorted(markers.items(), key=lambda kv: kv[1])
    for i, (name, value) in enumerate(marker_items):
        x = x_of(value)
        is_hero = name == hero_name
        tick_color = primary if is_hero else MUTED_2
        tick_len = 10 if is_hero else 7
        svg.append(
            f'<line x1="{x:.1f}" y1="{axis_y}" x2="{x:.1f}" y2="{axis_y + tick_len}" '
            f'stroke="{tick_color}" stroke-width="{2.5 if is_hero else 1.5}" />'
        )
        label_row = i % 2
        label_y = axis_y + 24 + label_row * 18
        weight = 800 if is_hero else 700
        size = 12.5 if is_hero else 11.5
        color = INK if is_hero else MUTED
        label = html.escape(f"{name} {_fmt_eok(value)}")
        svg.append(
            f'<text x="{x:.1f}" y="{label_y}" text-anchor="middle" '
            f'font-size="{size}" font-weight="{weight}" fill="{color}" '
            f'font-family="-apple-system,BlinkMacSystemFont,\'Malgun Gothic\',sans-serif">{label}</text>'
        )

    svg.append("</svg>")
    svg_markup = "".join(svg)

    dot_count = len(rows)
    truncated_note = f" (가까운 {dot_count}건만 표시)" if len(filtered) > max_dots else ""
    caption = (
        f'<p class="muted" style="margin-top:6px">● 점 하나 = 비교거래 1건{truncated_note} · '
        f'색칠된 구간 = <strong>{highlight[0]}~{highlight[1]}</strong> 구간 '
        f'(사용자가 실제 낙찰 후 매도 사례와 대조해 확인한 구간 — 통계적으로 확정된 값이 아닌 참고용)</p>'
    )
    return f'<div class="price-dist">{svg_markup}{caption}</div>'
