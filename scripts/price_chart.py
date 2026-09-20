"""
8절 산출값(보수적 급매가/현실적 체결가/상단 매도가/AI 기준매도가 등)과 실제
비교거래 개별 가격을 가로 점그래프(스트립플롯)로 함께 보여준다. CLI HTML
리포트(scripts/report.py, 14절)와 웹 버전 결과 페이지(webapp/app.py, 22절)
양쪽에서 재사용한다. 외부 차트 라이브러리 없이 순수 SVG(+아주 작은 바닐라
JS 툴팁)로 그린다.

기본으로 "보수적 급매가 ~ 현실적 체결가" 구간을 강조 배경으로 칠한다 —
사용자가 실제 경매 낙찰 후 매도 사례들을 이 계산기 산출값과 대조해본 결과
실제 매도가가 이 구간에서 형성되는 경우가 많았다고 확인해준 것을 반영한
것이다. 통계적으로 검증된 구간이 아니라 사용자 관찰에 근거한 참고용
강조이므로, 캡션에 항상 그 출처를 명시한다.

점(비교거래)마다:
- 탭/클릭(모바일)·호버(PC) 시 단지명·면적·금액·계약월·거리·유사도가 뜨는
  커스텀 툴팁을 보여준다 (네이티브 <title>은 모바일에서 잘 안 뜨는 경우가
  많아 직접 구현했다).
- find_comparables()가 이미 계산해둔 가중치(_weight — 연도·거리·층
  유사도를 곱한 값, CLAUDE.md 7절)를 점 색 진하기와 크기로 인코딩한다 —
  진하고 클수록 대상 물건과 조건이 더 비슷한 비교거래라는 뜻이다.

산출값(보수적 급매가 등) 마커는 축 위에 이름마다 고정된 색(MARKER_COLORS)의
작은 점으로만 찍고, 글자는 SVG 안에 넣지 않는다 — 값이 여러 개 좁은
구간에 몰리면 SVG 텍스트 라벨은 아무리 줄바꿈을 해도 결국 읽기 힘들어질
수 있어서, "어떤 색이 무슨 값인지"는 그래프 밖의 화면 요소(웹의 가격
그리드 카드, CLI 리포트의 stat 카드)에 같은 색 점을 달아 설명하는 방식으로
바꿨다. MARKER_COLORS를 그 화면 요소를 그리는 쪽(webapp/app.py 등)에서도
그대로 가져다 써서 색이 항상 일치한다.

예외로 `hero_name`(화면의 대표값 — 기본 "경매용 매도가") 하나만은 핀 밑에
이름을 텍스트로 같이 써준다 — 겹칠 라벨이 이제 이거 하나뿐이라 겹침 문제가
없고, 사용자가 그래프를 봤을 때 "이 초록 점이 제일 중요한 값"이라는 걸
바로 알아보게 하기 위함이다. 나머지 값들은 여전히 화면 카드의 색 점으로만
구분한다.
"""

import html
import uuid

PRIMARY = "#03c75a"
INK = "#1c1e21"
MUTED = "#7c8288"
MUTED_2 = "#a4a9ae"
BORDER = "#e7e9ec"

# 유사도(가중치) 낮음 -> 높음 색 램프 (연한 회색 -> 짙은 잉크색), sequential 인코딩
DOT_COLOR_LOW = (0xcd, 0xd1, 0xd5)
DOT_COLOR_HIGH = (0x3a, 0x3d, 0x42)
DOT_R_MIN, DOT_R_MAX = 4.0, 7.5

# 강조 구간(보수적 급매가~현실적 체결가) 배경색 — primary(히어로 색)와는
# 일부러 다른, 채도 있는 호박색을 진하게 칠한다. 이전엔 primary를 옅게(8%)
# 깔아서 거의 안 보인다는 피드백을 받아 색·진하기를 모두 바꿨다.
HIGHLIGHT_FILL = "#ffb020"
HIGHLIGHT_FILL_OPACITY = 0.20
HIGHLIGHT_EDGE = "#e08e00"

# 산출값 마커 이름 -> 고정 색(카테고리 컬러, 순서 고정 — 절대 순환/재배정하지
# 않는다). "경매용 매도가"(히어로)는 여기 없고 render_price_distribution_html의
# `primary` 인자를 그대로 쓴다 — 웹은 네이버 그린, CLI 리포트는 인디고로 페이지
# 톤에 맞춰야 해서 고정색표에 넣지 않았다.
MARKER_COLORS = {
    "보수적 급매가": "#2a78d6",   # blue
    "현실적 체결가": "#eb6834",   # orange
    "상단 매도가": "#4a3aa7",     # violet
    "AI 기준매도가": "#e87ba4",   # magenta
    "권장 최초 호가": "#1baf7a",  # aqua
}


def _fmt_eok(man: float) -> str:
    return f"{man / 10000:.2f}억"


def _lerp_color(t: float, lo: tuple, hi: tuple) -> str:
    t = max(0.0, min(1.0, t))
    r = round(lo[0] + (hi[0] - lo[0]) * t)
    g = round(lo[1] + (hi[1] - lo[1]) * t)
    b = round(lo[2] + (hi[2] - lo[2]) * t)
    return f"#{r:02x}{g:02x}{b:02x}"


def _similarity_tier(t: float) -> str:
    if t >= 0.66:
        return "높음"
    if t >= 0.33:
        return "중간"
    return "낮음"


def render_price_distribution_html(filtered: list[dict], markers: dict[str, float],
                                     highlight: tuple[str, str] = ("보수적 급매가", "현실적 체결가"),
                                     hero_name: str = "경매용 매도가",
                                     max_dots: int = 40, width: int = 660, height: int = 142,
                                     primary: str = PRIMARY) -> str:
    """filtered: find_comparables()가 돌려준 비교거래 목록(거리순 정렬됨,
    _amount_man·_weight 필요). markers: {"보수적 급매가": p25, ...} — 값이
    있는 것만 넘기면 된다(다 넣을 필요 없음). highlight: 배경으로 강조할
    두 마커 이름(순서 무관, 둘 다 markers에 있어야 함) — 기본값은 사용자가
    실측으로 확인한 구간. hero_name: markers 중 accent 색(`primary`)으로
    강조해서 표시할 이름(보통 화면의 대표 히어로 숫자와 맞춘다). primary:
    히어로 마커 색 — 웹 버전은 기본값(네이버 그린)을 쓰고, CLI HTML
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

    axis_y = 88
    hit_r = 13
    row_gap = 14
    max_rows = 4
    min_gap_px = DOT_R_MAX * 2 + 4

    weights = [r.get("_weight") for r in rows if r.get("_weight") is not None]
    w_lo, w_hi = (min(weights), max(weights)) if weights else (1.0, 1.0)

    chart_id = f"pd-{uuid.uuid4().hex[:8]}"

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
            f'fill="{HIGHLIGHT_FILL}" fill-opacity="{HIGHLIGHT_FILL_OPACITY}" '
            f'stroke="{HIGHLIGHT_EDGE}" stroke-width="1" stroke-dasharray="3,2" stroke-opacity="0.7" />'
        )

    svg.append(
        f'<line x1="{margin_l}" y1="{axis_y}" x2="{width - margin_r}" y2="{axis_y}" '
        f'stroke="{BORDER}" stroke-width="1" />'
    )

    # 개별 비교거래 점 — 겹치지 않게 아래에서 위로 쌓는 간단한 비스웜(beeswarm) 배치.
    # 점 크기·색 진하기는 _weight(7절 가중치 — 거리·연도·층 유사도)를 반영한다.
    rows_sorted = sorted(rows, key=lambda r: r["_amount_man"])
    row_last_x: list[float | None] = [None] * max_rows
    for r in rows_sorted:
        x = x_of(r["_amount_man"])
        row = 0
        while row < max_rows - 1 and row_last_x[row] is not None and abs(x - row_last_x[row]) < min_gap_px:
            row += 1
        row_last_x[row] = x
        y = axis_y - 11 - row * row_gap

        w = r.get("_weight")
        t = (w - w_lo) / (w_hi - w_lo) if (w is not None and w_hi > w_lo) else 0.5
        dot_r = DOT_R_MIN + (DOT_R_MAX - DOT_R_MIN) * t
        dot_color = _lerp_color(t, DOT_COLOR_LOW, DOT_COLOR_HIGH)

        name = html.escape(str(r.get("mhouseNm", "단지명없음")))
        area = html.escape(str(r.get("excluUseAr", "?")))
        deal = html.escape(f"{r.get('dealYear')}.{r.get('dealMonth')}")
        dist = r.get("_distance_m", 0)
        tip = html.escape(
            f"{name} · {area}㎡ · {_fmt_eok(r['_amount_man'])} · {deal} 계약 · {dist:.0f}m · "
            f"유사도 {_similarity_tier(t)}"
        )
        svg.append(
            f'<circle class="pd-dot" cx="{x:.1f}" cy="{y:.1f}" r="{hit_r}" fill="transparent" '
            f'tabindex="0" role="button" aria-label="{tip}" data-tip="{tip}" style="cursor:pointer" />'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{dot_r:.1f}" fill="{dot_color}" '
            f'fill-opacity="0.92" stroke="#fff" stroke-width="2" style="pointer-events:none" />'
        )

    # 산출값 마커 — 축 아래로 색깔 있는 핀 모양(작은 원)만 찍는다. 글자는 SVG
    # 안에 안 넣는다 — 값이 몰리면 텍스트가 겹쳐 안 보이던 문제를 근본적으로
    # 피하려고, "어떤 색이 무슨 값인지"는 화면 쪽 카드(가격 그리드 등)에
    # MARKER_COLORS로 같은 색 점을 달아 설명한다.
    marker_items = sorted(markers.items(), key=lambda kv: kv[1])
    for name, value in marker_items:
        x = x_of(value)
        is_hero = name == hero_name
        color = primary if is_hero else MARKER_COLORS.get(name, MUTED_2)
        tick_len = 12 if is_hero else 9
        pin_r = 5 if is_hero else 4
        svg.append(
            f'<line x1="{x:.1f}" y1="{axis_y}" x2="{x:.1f}" y2="{axis_y + tick_len}" '
            f'stroke="{color}" stroke-width="{2.5 if is_hero else 2}" />'
            f'<circle cx="{x:.1f}" cy="{axis_y + tick_len:.1f}" r="{pin_r}" fill="{color}" '
            f'stroke="#fff" stroke-width="1.5" />'
        )
        # hero(경매용 매도가)만 핀 밑에 이름을 글자로 같이 써준다 — 겹칠 다른
        # 라벨이 없어서 안전하고, 이 그래프에서 제일 중요한 값이라는 걸 바로
        # 알아보게 하기 위함이다. 가장자리를 벗어나지 않게 x를 클램프한다.
        if is_hero:
            text_x = min(max(x, margin_l + 34), width - margin_r - 34)
            text_y = axis_y + tick_len + pin_r + 13
            svg.append(
                f'<text x="{text_x:.1f}" y="{text_y:.1f}" text-anchor="middle" '
                f'font-size="11" font-weight="700" fill="{color}">{html.escape(name)}</text>'
            )

    svg.append("</svg>")
    svg_markup = "".join(svg)

    dot_count = len(rows)
    truncated_note = f" (가까운 {dot_count}건만 표시)" if len(filtered) > max_dots else ""
    caption = (
        f'<p class="muted" style="margin-top:6px">● 점 하나 = 비교거래 1건{truncated_note}, '
        f'누르면 상세 정보가 뜹니다 · 진하고 클수록 대상 물건과 조건(거리·계약시기·층)이 더 비슷한 거래예요 '
        f'(점의 위아래 높이는 겹치지 않게 배치한 것뿐, 값과는 무관합니다) · '
        f'글자가 붙은 점 = {html.escape(hero_name)}(이 화면의 대표값), 나머지 색깔 점은 위 가격 카드와 같은 색으로 이어집니다 · '
        f'진하게 색칠된 구간 = <strong>{highlight[0]}~{highlight[1]}</strong> 구간 '
        f'(사용자가 실제 낙찰 후 매도 사례와 대조해 확인한 구간 — 통계적으로 확정된 값이 아닌 참고용)</p>'
    )
    tooltip_box = (
        f'<div class="pd-tip" style="position:absolute; display:none; z-index:5; '
        f'background:{INK}; color:#fff; font-size:12px; font-weight:600; padding:6px 10px; '
        f'border-radius:8px; white-space:nowrap; pointer-events:none; '
        f'box-shadow:0 4px 10px rgba(0,0,0,0.18); transform:translate(-50%,-100%)"></div>'
    )
    script = f"""<script>
(function() {{
  var root = document.getElementById("{chart_id}");
  if (!root) return;
  var tip = root.querySelector(".pd-tip");
  var active = null;
  function showTip(dot) {{
    var text = dot.getAttribute("data-tip");
    tip.textContent = text;
    tip.style.display = "block";
    var rootRect = root.getBoundingClientRect();
    var dotRect = dot.getBoundingClientRect();
    tip.style.left = (dotRect.left - rootRect.left + dotRect.width / 2) + "px";
    tip.style.top = (dotRect.top - rootRect.top - 6) + "px";
    active = dot;
  }}
  function hideTip() {{ tip.style.display = "none"; active = null; }}
  root.querySelectorAll(".pd-dot").forEach(function (dot) {{
    dot.addEventListener("pointerenter", function () {{ showTip(dot); }});
    dot.addEventListener("pointerleave", function () {{ if (active === dot) hideTip(); }});
    dot.addEventListener("focus", function () {{ showTip(dot); }});
    dot.addEventListener("blur", hideTip);
    dot.addEventListener("click", function (e) {{
      e.stopPropagation();
      if (active === dot) {{ hideTip(); }} else {{ showTip(dot); }}
    }});
  }});
  document.addEventListener("click", function () {{ hideTip(); }});
}})();
</script>"""
    return (
        f'<div class="price-dist" id="{chart_id}" style="position:relative">'
        f'{svg_markup}{tooltip_box}{caption}{script}</div>'
    )
