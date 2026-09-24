"""
8절 산출값(보수적 급매가/현실적 체결가/상단 매도가/AI 기준매도가 등)과 실제
비교거래 개별 가격을 가로 점그래프(스트립플롯)로 함께 보여준다. CLI HTML
리포트(scripts/report.py, 14절)와 웹 버전 결과 페이지(webapp/app.py, 22절)
양쪽에서 재사용한다. 외부 차트 라이브러리 없이 순수 SVG(+아주 작은 바닐라
JS 툴팁/클릭 상세/필터 토글)로 그린다.

기본으로 "보수적 급매가 ~ 현실적 체결가" 구간을 강조 배경으로 칠한다 —
사용자가 실제 경매 낙찰 후 매도 사례들을 이 계산기 산출값과 대조해본 결과
실제 매도가가 이 구간에서 형성되는 경우가 많았다고 확인해준 것을 반영한
것이다. 통계적으로 검증된 구간이 아니라 사용자 관찰에 근거한 참고용
강조이므로, 캡션에 항상 그 출처를 명시한다.

⚠️ **이 절은 확장됐다(CLAUDE.md 8-1절 "더 자세히" 요청 반영).** 사용자가
지피티와 상의해서 정리한 우선순위를 그대로 따랐다:
- 점 모양 = 거래유형(원=중개거래, 다이아몬드=직거래)
- 점 테두리 = 특별히 중요한 거래(동일건물=굵은 링, 평당가 이상치=점선 링)
- 점을 클릭하면 그래프 아래 "왜 이 거래가 많이/적게 반영됐는지" 설명 카드가 뜬다
- 40건으로 잘라내던 것을 없애고, 가중치 상위 N건만 위 네 가지를 다 갖춘
  "강조" 점으로, 나머지는 작고 옅은 배경 점으로 표시해서 전체 표본을 다 보여준다
- 그래프 아래에 전체 표본의 가격 분포를 보여주는 얇은 히스토그램("거래
  밀집도")을 추가했다
- 최근 3개월/반경 200m 이내만 강조해서 보는 토글 버튼을 추가했다
- 캡션을 한 줄 압축 범례 + "? 그래프 보는 법" 접이식 상세 설명으로 나눴다

한 점에 모든 정보를 색·크기·모양·테두리·투명도로 다 우겨넣지 않는다 — 시각
채널은 딱 세 개(크기·진하기=반영도, 모양=거래유형, 테두리=특별히 중요한
거래)로 제한하고, 나머지(계약월·거리 등)는 클릭했을 때만 보여주는
상세 카드로 뺐다. 이전에 "핵심 비교거래" 텍스트 목록에 판단을 너무 많이
얹었다가 "이해하기 어렵다"고 지적받은 전례(5절)를 반복하지 않기 위해서다.

점(비교거래)마다:
- 탭/클릭(모바일)·호버(PC) 시 단지명·면적·금액·계약월·거리·반영도가 뜨는
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

import math
import html
import uuid
from datetime import datetime

PRIMARY = "#03c75a"
INK = "#1c1e21"
MUTED = "#7c8288"
MUTED_2 = "#a4a9ae"
BORDER = "#e7e9ec"

# 유사도(가중치) 낮음 -> 높음 색 램프 (연한 블루그레이 -> 짙은 네이비), sequential
# 인코딩 — 사용자가 참고로 보내준 목업의 파란 계열 톤에 맞춰 회색조에서 바꿨다.
DOT_COLOR_LOW = (0xd8, 0xe3, 0xf3)
DOT_COLOR_HIGH = (0x14, 0x2b, 0x52)
DOT_R_MIN, DOT_R_MAX = 5.0, 9.0
DIAMOND_SCALE = 1.15  # 다이아몬드(직거래)가 원과 비슷한 면적으로 보이도록 살짝 키운다

# 강조 구간(보수적 급매가~현실적 체결가) 배경색 — primary(히어로 색)와는
# 일부러 다른, 채도 있는 호박색을 진하게 칠한다. 이전엔 primary를 옅게(8%)
# 깔아서 거의 안 보인다는 피드백을 받아 색·진하기를 모두 바꿨다.
HIGHLIGHT_FILL = "#ffb020"
HIGHLIGHT_FILL_OPACITY = 0.20
HIGHLIGHT_EDGE = "#e08e00"

# 테두리 인코딩 — 유사도 색 램프와 절대 겹치지 않는 색을 쓴다(둘 다 혼동되면
# "진한 점=반영도 높음"과 "테두리 색=특별한 거래"가 헷갈릴 수 있어서).
SAME_BUILDING_RING_COLOR = "#c9971e"  # 골드 — 동일건물(가장 직접적인 증거)
OUTLIER_RING_COLOR = "#c0392b"  # 톤 다운된 레드 — 이상치(경고 성격)

# 거래 밀집도 곡선(부드러운 밀도 영역) 채움색
HIST_BAR_COLOR = "#c7d2e8"
#: 72-33절 — 화면 CSS `--accent-ink`와 같은 딥 인디고. 초록 하나만 쓰던 톤에
#: 짝이 되는 색을 하나 더해 축·눈금에 깊이를 준다.
ACCENT_INK = "#23476b"
#: 밀도 곡선 그라데이션의 진한 쪽. ⚠️ 같은 이름의 상수가 8-1-1절 막대 시절에
#: 있었다가 곡선으로 바꾸면서 사라졌다 — 72-33절에서 그라데이션에 다시 필요해
#: 되살렸다(그때 값과 같은 계열의 한 단계 진한 블루그레이).
HIST_BAR_COLOR_STRONG = "#93a9cf"
#: 72-33절 — 그래프가 단독으로 놓일 때의 제목. 카드 안에 들어가면 호출부가
#: 짧은 제목이나 None 을 넘겨 **제목이 두 번 나오는 것**을 없앤다.
_HEADING_DEFAULT = "📊 매도가 산출 근거 — 실제 비교거래 분포"

EMPHASIS_CAP_DEFAULT = 40  # 이 안쪽 순위(가중치 기준)까지만 모양/테두리/클릭상세 등 "강조" 처리
MAX_TOTAL_DOTS = 150  # 그래프에 그리는 점의 안전 상한(극단적으로 큰 표본 방지, 배경 점 포함)

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


def _reflect_sentence(t: float, is_outlier: bool) -> str:
    """클릭 상세 카드의 마지막 한 줄 — 이 거래가 왜 많이/적게 반영됐는지."""
    if is_outlier:
        return "평당가가 유독 튀는 거래라 가중치를 낮춰 참고용으로만 반영됨"
    if t >= 0.66:
        return "대상 물건과 매우 유사하여 계산에 크게 반영됨"
    if t >= 0.33:
        return "대상 물건과 어느 정도 비슷하여 계산에 보통 수준으로 반영됨"
    return "참고용으로 표시되지만 최종 계산에는 거의 반영되지 않음"


def _months_ago(deal_year, deal_month, this_year: int | None = None, this_month: int | None = None) -> int | None:
    """계약월로부터 "몇 개월 전"인지 계산한다. this_year/this_month를 안 주면
    (하위호환) 렌더링 시점의 현재 시각으로 근사한다 — 실제 8절 계산에 쓰이는
    weight_for_recency()의 this_year/this_month와는 별개로, 그래프 클릭 상세
    카드에 보여줄 표시용 값일 뿐이라 오차가 있어도 계산 자체에는 영향이 없다."""
    try:
        y, m = int(deal_year), int(deal_month)
    except (TypeError, ValueError):
        return None
    if this_year is None or this_month is None:
        now = datetime.now()
        this_year, this_month = now.year, now.month
    return max(0, (this_year - y) * 12 + (this_month - m))


def _diamond_points(cx: float, cy: float, r: float) -> str:
    r *= DIAMOND_SCALE
    return f"{cx:.1f},{cy - r:.1f} {cx + r:.1f},{cy:.1f} {cx:.1f},{cy + r:.1f} {cx - r:.1f},{cy:.1f}"


def _smooth_area_path(points: list[tuple[float, float]]) -> str:
    """points(이미 x 오름차순으로 정렬된 좌표)를 인접한 두 점의 중점을 지나는
    2차 베지어 곡선으로 매끈하게 이어서 SVG path의 "d" 속성을 만든다 —
    Catmull-Rom 스플라인 없이도 외부 라이브러리 없이 SVG만으로 부드러운
    곡선을 그릴 수 있는 가벼운 기법(중점-베지어 스무딩)이다. 거래 밀집도를
    막대그래프 대신 부드러운 언덕 모양으로 보여주는 데 쓴다(참고 목업 반영)."""
    if len(points) < 2:
        return ""
    d = [f"M {points[0][0]:.1f},{points[0][1]:.1f}"]
    for i in range(1, len(points)):
        x0, y0 = points[i - 1]
        x1, y1 = points[i]
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        d.append(f"Q {x0:.1f},{y0:.1f} {mx:.1f},{my:.1f}")
    d.append(f"L {points[-1][0]:.1f},{points[-1][1]:.1f}")
    return " ".join(d)


def _histogram_counts(amounts: list[float], domain_lo: float, domain_hi: float, n_bins: int) -> list[int]:
    """전체 표본(강조/배경 구분 없이)의 가격을 n_bins개 구간으로 나눠 각 구간
    거래건수를 센다 — "거래 밀집도" 히스토그램(순수 함수라 따로 테스트하기
    쉽게 분리해뒀다)."""
    counts = [0] * n_bins
    span = domain_hi - domain_lo
    if span <= 0 or n_bins <= 0:
        return counts
    for a in amounts:
        idx = int((a - domain_lo) / span * n_bins)
        idx = max(0, min(n_bins - 1, idx))
        counts[idx] += 1
    return counts


def render_price_distribution_html(filtered: list[dict], markers: dict[str, float],
                                     highlight: tuple[str, str] = ("보수적 급매가", "현실적 체결가"),
                                     hero_name: str = "경매용 매도가",
                                     max_dots: int = EMPHASIS_CAP_DEFAULT, width: int = 420, height: int = 300,
                                     primary: str = PRIMARY, min_width: int = 0,
                                     this_year: int | None = None, this_month: int | None = None,
                                     heading: str | None = _HEADING_DEFAULT) -> str:
    """filtered: find_comparables()가 돌려준 비교거래 목록(거리순 정렬됨,
    _amount_man·_weight 필요. _dealing_gbn/_same_building/_price_outlier가
    있으면 함께 시각화한다). markers: {"보수적
    급매가": p25, ...} — 값이 있는 것만 넘기면 된다(다 넣을 필요 없음).
    highlight: 배경으로 강조할 두 마커 이름(순서 무관, 둘 다 markers에
    있어야 함) — 기본값은 사용자가 실측으로 확인한 구간. hero_name: markers
    중 accent 색(`primary`)으로 강조해서 표시할 이름(보통 화면의 대표
    히어로 숫자와 맞춘다). max_dots: 가중치 상위 몇 건까지 모양/테두리/
    클릭상세를 갖춘 "강조" 점으로 그릴지(나머지는 옅은 배경 점) — 더 이상
    표본을 잘라내는 하드 캡이 아니다. primary: 히어로 마커 색 — 웹 버전은
    기본값(네이버 그린)을 쓰고, CLI HTML 리포트(report.py)는 그 페이지의
    인디고 accent 색을 넘겨서 톤을 맞춘다. this_year/this_month: 클릭 상세
    카드의 "N개월 전" 표시에 쓸 기준 시점(생략하면 렌더링 시점의 현재
    시각으로 근사)."""
    rows = [r for r in filtered if r.get("_amount_man") is not None]
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

    axis_y = 150
    hit_r = 15
    row_gap = 16
    min_gap_px = DOT_R_MAX * 2 + 4

    # 가중치 색·크기 램프는 전체 표본(rows) 기준으로 고정한다 — 강조/배경
    # 점이 같은 척도 위에서 일관되게 진하고 옅어야 한다.
    weights = [r.get("_weight") for r in rows if r.get("_weight") is not None]
    w_lo, w_hi = (min(weights), max(weights)) if weights else (1.0, 1.0)

    # 가중치 내림차순 — 상위 max_dots건만 "강조"(모양·테두리·클릭상세)로
    # 그리고, 나머지는 옅은 배경 점으로만 표시한다. 예전처럼
    # 표본을 하드 캡으로 잘라내지 않고 전체를 다 보여주되, 정보 우선순위를
    # 주는 방식으로 바꿨다(그래프가 몇 건짜리 표본인지 숨기지 않기 위해서).
    rows_by_weight = sorted(rows, key=lambda r: r.get("_weight") or 0, reverse=True)
    render_rows = rows_by_weight[:MAX_TOTAL_DOTS]  # 극단적으로 큰 표본에 대한 안전 상한
    emphasis_rows = render_rows[:max_dots]
    emphasis_ids = {id(r) for r in emphasis_rows}
    max_rows = 6 if len(render_rows) > 40 else 4

    chart_id = f"pd-{uuid.uuid4().hex[:8]}"

    # width="100%" height="{height}"(고정 픽셀)로 박아두면, 컨테이너가 viewBox
    # 폭(width)보다 넓어도 SVG가 "1:1 크기까지만" 커지고 더는 안 커진다(높이가
    # 정확히 맞아떨어지는 순간 preserveAspectRatio가 그 이상 확대를 막는다) —
    # 그 결과 웹의 2단 레이아웃(카드가 좁아지는 구간)이나 넓은 데스크톱
    # 화면에서 그래프 좌우로 빈 여백만 생기고 실제로는 더 안 커지는 문제가
    # 있었다. `height:auto`로 바꿔서 컨테이너 폭에 맞춰 높이가 비율대로 따라
    # 커지게 하면, 카드가 넓을 때는 그만큼 그래프도 커지고(예: 카드가
    # viewBox보다 넓으면 확대돼서 보임), 좁을 때는 비율 그대로 줄어든다 —
    # 모바일/데스크톱 어느 쪽이든 "컨테이너 폭 = 실제 렌더링 폭"이 항상
    # 성립한다.
    # `min_width`가 있으면 그 폭 아래로는 더 줄어들지 않게 막고, 대신 부모
    # 쪽에서 가로 스크롤을 준다(아래 `svg_markup` 래퍼) — 카드를 가로로 길게
    # 쓰는 레이아웃(웹 결과 페이지의 전용 카드)에서는 viewBox를 넓게 잡아야
    # 글자·점이 시원하게 보이는데, 그대로 두면 좁은 화면에서 0.4배까지
    # 축소돼 글씨가 뭉개지기 때문이다. 표가 넘칠 때 `.tier-table-wrap`으로
    # 가로 스크롤을 주는 것과 같은 처리다.
    min_w = f' min-width:{min_width}px;' if min_width else ''
    # 72-33절 — "그래프도 더 화려하게". 채도를 올리는 게 아니라 **깊이**를 준다:
    #   ① 밀도 곡선에 위→아래 그라데이션  ② 축선에 좌→우 페이드
    #   ③ 대표값(경매용 매도가) 핀에 후광  ④ 눈금선도 위에서 흐려지게
    # ⚠️ id 는 한 페이지에 여러 그래프가 있어도 안 겹치게 고유값을 붙인다
    #    (14절 HTML 리포트에는 그래프가 둘 이상 들어간다).
    gid = f"pd{abs(hash((width, height, len(rows)))) % 100000}"
    svg = [
        f'<svg viewBox="0 0 {width} {height}" style="width:100%; height:auto;{min_w} display:block" '
        f'role="img" aria-label="비교거래 가격 분포와 산출값">',
        f'<defs>'
        f'<linearGradient id="{gid}h" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0%" stop-color="{HIST_BAR_COLOR_STRONG}" stop-opacity="0.95"/>'
        f'<stop offset="100%" stop-color="{HIST_BAR_COLOR}" stop-opacity="0.35"/>'
        f'</linearGradient>'
        f'<linearGradient id="{gid}a" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0%" stop-color="{BORDER}" stop-opacity="0.25"/>'
        f'<stop offset="18%" stop-color="{ACCENT_INK}" stop-opacity="0.55"/>'
        f'<stop offset="82%" stop-color="{ACCENT_INK}" stop-opacity="0.55"/>'
        f'<stop offset="100%" stop-color="{BORDER}" stop-opacity="0.25"/>'
        f'</linearGradient>'
        f'<radialGradient id="{gid}g">'
        f'<stop offset="0%" stop-color="{primary}" stop-opacity="0.45"/>'
        f'<stop offset="100%" stop-color="{primary}" stop-opacity="0"/>'
        f'</radialGradient>'
        f'</defs>',
    ]

    band_names = set(highlight)
    if band_names <= markers.keys():
        vals = [markers[n] for n in highlight]
        bx1, bx2 = x_of(min(vals)), x_of(max(vals))
        svg.append(
            f'<rect x="{bx1:.1f}" y="26" width="{max(bx2 - bx1, 1):.1f}" height="{axis_y - 26:.1f}" '
            f'fill="{HIGHLIGHT_FILL}" fill-opacity="{HIGHLIGHT_FILL_OPACITY}" '
            f'stroke="{HIGHLIGHT_EDGE}" stroke-width="1" stroke-dasharray="3,2" stroke-opacity="0.7" />'
        )

    svg.append(
        f'<line x1="{margin_l}" y1="{axis_y}" x2="{width - margin_r}" y2="{axis_y}" '
        f'stroke="url(#{gid}a)" stroke-width="1.6" stroke-linecap="round" />'
    )

    # 가격 눈금(최저/중간/최고) — 값을 안 눌러봐도 대략적인 가격대가 바로
    # 읽히도록 그래프 위쪽에 점선 세로 눈금선과 숫자를 3개만 찍는다(사용자가
    # "그래프가 뭘 근거로 한 건지 더 자세히 보고 싶다"고 요청해서 추가). 마커
    # 이름표를 SVG에 다 못 넣는 것과 같은 이유로, 너무 많이 찍으면 좁은
    # 가격대에서 겹쳐 안 보이니 3개(최저·중간·최고)로만 제한한다.
    for tick_val in sorted({lo, (lo + hi) / 2, hi}):
        tick_x = x_of(tick_val)
        svg.append(
            f'<line x1="{tick_x:.1f}" y1="24" x2="{tick_x:.1f}" y2="{axis_y}" '
            f'stroke="{BORDER}" stroke-width="1" stroke-dasharray="2,3" />'
            f'<text x="{tick_x:.1f}" y="16" font-size="13" font-weight="600" fill="{MUTED}" '
            f'text-anchor="middle">{html.escape(_fmt_eok(tick_val))}</text>'
        )

    # 개별 비교거래 점 — 겹치지 않게 아래에서 위로 쌓는 간단한 비스웜(beeswarm) 배치.
    # 점 크기·색 진하기는 _weight(7절 가중치 — 거리·연도·층 유사도를 곱한 값)를
    # 반영한다. 강조 점만 모양(거래유형)·테두리(동일건물/이상치)·클릭 상세
    # 카드를 갖춘다 — 배경 점은 옅고 작은 원 하나로만 표시해서
    # "표본이 이만큼 더 있다"는 것만 조용히 보여준다.
    rows_sorted = sorted(render_rows, key=lambda r: r["_amount_man"])
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

        if id(r) not in emphasis_ids:
            svg.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{max(2.5, dot_r * 0.55):.1f}" '
                f'fill="{dot_color}" fill-opacity="0.35" style="pointer-events:none" />'
            )
            continue

        dealing_gbn = r.get("_dealing_gbn")
        is_jikgeorae = dealing_gbn == "직거래"
        is_same_building = bool(r.get("_same_building"))
        is_outlier = bool(r.get("_price_outlier"))

        group = []
        if is_same_building:
            group.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{dot_r + 2.5:.1f}" fill="none" '
                         f'stroke="{SAME_BUILDING_RING_COLOR}" stroke-width="2" />')
        if is_outlier:
            ring_r = dot_r + (5 if is_same_building else 2.5)
            group.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{ring_r:.1f}" fill="none" '
                         f'stroke="{OUTLIER_RING_COLOR}" stroke-width="1.5" stroke-dasharray="2,2" />')
        if is_jikgeorae:
            group.append(f'<polygon points="{_diamond_points(x, y, dot_r)}" fill="{dot_color}" '
                         f'fill-opacity="0.92" stroke="#fff" stroke-width="2" />')
        else:
            group.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{dot_r:.1f}" fill="{dot_color}" '
                         f'fill-opacity="0.92" stroke="#fff" stroke-width="2" />')

        name = html.escape(str(r.get("mhouseNm", "단지명없음")))
        area = html.escape(str(r.get("excluUseAr", "?")))
        deal_y, deal_m = r.get("dealYear"), r.get("dealMonth")
        dist = r.get("_distance_m", 0)

        months_ago = _months_ago(deal_y, deal_m, this_year, this_month)
        facts = [f"{dist:.0f}m"]
        if months_ago is not None:
            facts.append(f"{months_ago}개월 전")
        facts.append("동일건물" if is_same_building else ("직거래" if is_jikgeorae else "중개거래"))
        if is_outlier:
            facts.append("평당가 이상치")
        facts_line = " · ".join(facts)

        # 호버/탭 시 뜨는 미니 카드 — 굵은 제목(단지명·금액) + 연한 부제(거리·
        # 개월수·거래유형 등) 두 줄 구성. 사용자가 참고로 보내준 목업의 카드형
        # 툴팁 스타일을 반영했다.
        # ⚠️ `name`·`area`는 **위에서 이미 이스케이프했다** — 여기서 또 감싸면
        #    `&`가 `&amp;amp;`가 되어 화면에 "A&amp;D빌라"처럼 글자 그대로
        #    보인다(실제로 그랬다). 나머지 조각(금액·거리·개월수·고정 문구)은
        #    숫자와 우리가 쓴 상수뿐이라 이스케이프할 것이 없다.
        tip_title = f"{name} · {_fmt_eok(r['_amount_man'])}"
        tip_sub = html.escape(facts_line)
        aria_label = (
            f"{name} · {area}㎡ · {_fmt_eok(r['_amount_man'])} · "
            f"{html.escape(facts_line)} · 반영도 {_similarity_tier(t)}"
        )

        detail = "\n".join([
            f"{name} {_fmt_eok(r['_amount_man'])} · 반영도 {_similarity_tier(t)}",
            html.escape(" · ".join(facts)),
            f"→ {html.escape(_reflect_sentence(t, is_outlier))}",
        ])

        group.append(
            f'<circle class="pd-dot" cx="{x:.1f}" cy="{y:.1f}" r="{hit_r}" fill="transparent" '
            f'tabindex="0" role="button" aria-label="{aria_label}" '
            f'data-tip-title="{tip_title}" data-tip-sub="{tip_sub}" data-detail="{detail}" '
            f'style="cursor:pointer" />'
        )
        months_attr = months_ago if months_ago is not None else ""
        svg.append(
            f'<g class="pd-dot-group" data-months-ago="{months_attr}" data-distance="{dist:.0f}">'
            + "".join(group) + "</g>"
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
        tick_len = 15 if is_hero else 11
        pin_r = 7 if is_hero else 5.5
        # 72-33절 — 대표값(경매용 매도가)만 후광을 둘러 제일 먼저 눈에 들어오게.
        halo = (f'<circle cx="{x:.1f}" cy="{axis_y + tick_len:.1f}" r="{pin_r * 2.6:.1f}" '
                f'fill="url(#{gid}g)" />') if is_hero else ""
        svg.append(
            halo
            + f'<line x1="{x:.1f}" y1="{axis_y}" x2="{x:.1f}" y2="{axis_y + tick_len}" '
              f'stroke="{color}" stroke-width="{2.5 if is_hero else 2}" />'
              f'<circle cx="{x:.1f}" cy="{axis_y + tick_len:.1f}" r="{pin_r}" fill="{color}" '
              f'stroke="#fff" stroke-width="{2 if is_hero else 1.5}" />'
        )
        # hero(경매용 매도가)만 핀 밑에 이름을 글자로 같이 써준다 — 겹칠 다른
        # 라벨이 없어서 안전하고, 이 그래프에서 제일 중요한 값이라는 걸 바로
        # 알아보게 하기 위함이다. 가장자리를 벗어나지 않게 x를 클램프한다.
        if is_hero:
            text_x = min(max(x, margin_l + 34), width - margin_r - 34)
            text_y = axis_y + tick_len + pin_r + 15
            svg.append(
                f'<text x="{text_x:.1f}" y="{text_y:.1f}" text-anchor="middle" '
                f'font-size="13" font-weight="700" fill="{color}">{html.escape(name)}</text>'
            )

    # 거래 밀집도 — 강조/배경 구분 없이 표본 전체(rows)의 가격이 어디에 몰려
    # 있는지 부드러운 언덕 모양(밀도 곡선)으로 보여준다. 배경 점만으로는
    # "점이 많아서 잘라냈나?" 싶을 수 있어서, 전체 분포를 한 번 더 눈에 띄게
    # 보여주는 용도. 막대그래프 대신 매끈한 곡선을 쓴 건 사용자가 참고로
    # 보내준 목업 스타일을 반영한 것 — `_smooth_area_path()`가 그린다.
    hist_y0 = axis_y + 55
    hist_h = 34
    n_bins = min(28, max(8, len(rows) // 2))
    counts = _histogram_counts([r["_amount_man"] for r in rows], lo, hi, n_bins)
    max_count = max(counts) if counts else 0
    if max_count > 0:
        bin_w = plot_w / n_bins
        baseline = hist_y0 + hist_h
        curve_pts = [(margin_l + (i + 0.5) * bin_w, baseline - (c / max_count * hist_h))
                     for i, c in enumerate(counts)]
        closed_pts = [(margin_l, baseline)] + curve_pts + [(margin_l + plot_w, baseline)]
        area_d = _smooth_area_path(closed_pts)
        svg.append(f'<path d="{area_d} Z" fill="url(#{gid}h)" stroke="{HIST_BAR_COLOR_STRONG}" '
                   f'stroke-width="1" stroke-opacity="0.35" />')
        svg.append(
            f'<text x="{margin_l}" y="{baseline + 16:.1f}" font-size="12" font-weight="600" fill="{MUTED}">거래 밀집도</text>'
        )

    svg.append("</svg>")
    svg_markup = "".join(svg)
    if min_width:
        svg_markup = f'<div style="overflow-x:auto; -webkit-overflow-scrolling:touch">{svg_markup}</div>'

    dot_count = len(rows)
    emphasis_count = len(emphasis_ids)
    sample_note = f"비교거래 {dot_count}건"
    if dot_count > len(render_rows):
        sample_note += f" (표본이 많아 유사도 상위 {len(render_rows)}건만 그래프에 표시)"
    elif dot_count > emphasis_count:
        sample_note += f" · 주요 유사거래 {emphasis_count}건 강조"

    def _legend_row(head_color: str, head: str, sub: str) -> str:
        return (
            f'<div style="display:flex; flex-direction:column; gap:2px">'
            f'<span style="color:{head_color}; font-weight:700; font-size:14px; line-height:1.4">{head}</span>'
            f'<span style="color:{MUTED}; font-size:12.5px; line-height:1.5">{sub}</span>'
            f'</div>'
        )

    # 압축 범례 — 예전엔 4줄짜리 설명을 항상 펼쳐서 보여줬는데, 요소가
    # 늘어나면서(모양·테두리·연결선까지) 그대로 두면 캡션이 너무 길어진다.
    # 한 줄 압축 범례만 항상 보여주고, 자세한 설명은 <details>로 접어둔다
    # (모바일에서 특히 중요 — 화면을 덜 차지해야 한다).
    # 압축 범례는 **실제로 그려진 기호만** 보여준다. 예전엔 다섯 기호를
    # 항상 늘어놓았는데, 이 표본에 직거래가 한 건도 없으면 "◆ 직거래"만
    # 범례에 떠 있고 그래프에는 안 나와서 "왜 다이아몬드가 사라졌지?"라고
    # 오해하게 된다(사용자가 실제로 그렇게 물었다). 건수를 같이 적어
    # "없어서 안 보이는 것"임을 분명히 한다.
    def _count(pred) -> int:
        return sum(1 for r in emphasis_rows if pred(r))

    jikgeorae_n = _count(lambda r: r.get("_dealing_gbn") == "직거래")
    same_building_n = _count(lambda r: r.get("_same_building"))
    outlier_n = _count(lambda r: r.get("_price_outlier"))
    has_dealing_info = any(r.get("_dealing_gbn") for r in emphasis_rows)

    chips = [f'<span>{sample_note}</span>']
    if has_dealing_info:
        chips.append(f'<span>●&nbsp;일반거래 {len(emphasis_rows) - jikgeorae_n}</span>')
        if jikgeorae_n:
            chips.append(f'<span>◆&nbsp;직거래 {jikgeorae_n}</span>')
        else:
            chips.append('<span style="opacity:.55">◆&nbsp;직거래 0건</span>')
    else:
        chips.append('<span>●&nbsp;일반거래</span>')
        chips.append('<span style="opacity:.55" title="국토부 응답에 거래유형(dealingGbn) 값이 없어 직거래를 구분할 수 없습니다">'
                     '◆&nbsp;직거래 — 거래유형 정보 없음</span>')
    if same_building_n:
        chips.append(f'<span style="color:{SAME_BUILDING_RING_COLOR}">◎&nbsp;동일건물 {same_building_n}</span>')
    if outlier_n:
        chips.append(f'<span style="color:{OUTLIER_RING_COLOR}">⚠&nbsp;이상치 {outlier_n}</span>')
    chips.append('<span>크기·진하기=반영도</span>')

    compact_legend = (
        f'<div style="margin-top:10px; padding-top:8px; border-top:1px dashed {BORDER}; '
        f'font-size:13px; color:{MUTED}; display:flex; flex-wrap:wrap; align-items:center; gap:9px">'
        + "".join(chips) +
        f'</div>'
        f'<details style="margin-top:6px; font-size:13px; color:{MUTED}">'
        f'<summary style="cursor:pointer; color:{INK}; font-weight:600">? 그래프 보는 법</summary>'
        f'<div style="margin-top:8px; display:flex; flex-direction:column; gap:7px">'
        + _legend_row(
            INK, "점 하나 = 비교거래 1건, 점을 누르면 왜 반영됐는지 설명이 떠요",
            "진하고 클수록 조건이 더 비슷한 거래예요(거리·계약시기·면적·층·준공년도 종합) — "
            "위아래 높이는 겹치지 않게 배치한 것뿐, 값과는 무관합니다",
        )
        + _legend_row(
            INK, "● 원 = 중개거래, ◆ 다이아몬드 = 직거래",
            "직거래는 가족 간 거래처럼 시세를 반영 안 할 수 있어 계산에서도 가중치를 낮춰요",
        )
        + _legend_row(
            SAME_BUILDING_RING_COLOR, "◎ 굵은 테두리 = 대상 물건과 사실상 같은 건물의 거래",
            "이 물건이 실제로 얼마에 팔렸는지 보여주는 가장 직접적인 증거라 가중치를 더 크게 반영해요",
        )
        + _legend_row(
            OUTLIER_RING_COLOR, "⚠ 점선 테두리 = 평당가가 유독 튀는 거래(이상치)",
            "특수관계자 거래·입력 오류 등을 의심해 가중치를 크게 낮춰서 참고용으로만 반영해요",
        )
        + _legend_row(
            primary, f"글자가 붙은 점 = {html.escape(hero_name)}",
            "이 화면의 대표값이에요 · 나머지 색깔 점은 위 가격 카드와 같은 색으로 이어집니다",
        )
        + _legend_row(
            HIGHLIGHT_EDGE, f"진하게 칠해진 구간 = {highlight[0]}~{highlight[1]}",
            "사용자가 실제 낙찰 후 매도 사례와 대조해 확인한 구간 — 통계적으로 확정된 값이 아닌 참고용입니다",
        )
        + _legend_row(
            MUTED, "아래 곡선(거래 밀집도) = 표본 전체 가격이 어디에 몰려 있는지",
            "강조되지 않은 점까지 포함한 전체 분포입니다",
        )
        + '</div></details>'
    )

    # 호버/탭 시 뜨는 카드 — 굵은 제목 줄(단지명·금액) + 연한 부제 줄(거리·
    # 개월수·거래유형 등) 두 줄짜리 흰 카드다. 예전엔 검정 배경 한 줄짜리
    # 말풍선이었는데, 사용자가 참고로 보내준 목업의 카드형 툴팁을 반영해
    # 흰 배경+그림자+두 줄 구성으로 바꿨다.
    tooltip_box = (
        f'<div class="pd-tip" style="position:absolute; display:none; z-index:5; '
        f'background:#fff; padding:7px 11px; border-radius:10px; white-space:nowrap; '
        f'pointer-events:none; box-shadow:0 6px 16px rgba(28,30,33,0.16); '
        f'transform:translate(-50%,-100%)">'
        f'<div class="pd-tip-title" style="font-size:14px; font-weight:700; color:{INK}"></div>'
        f'<div class="pd-tip-sub" style="font-size:12.5px; color:{MUTED}; margin-top:1px"></div>'
        f'</div>'
    )
    detail_box = (
        f'<div class="pd-detail" style="display:none; margin-top:8px; padding:11px 13px; '
        f'background:#f7f8f9; border-radius:10px; font-size:13.5px; color:{INK}; '
        f'white-space:pre-line; line-height:1.65"></div>'
    )
    # 최근 3개월/반경 200m 이내만 강조해서 보는 토글 — 데이터를 다시 안
    # 불러오고, 이미 SVG에 박아둔 data-months-ago/data-distance만으로 해당
    # 안 되는 강조 점을 옅게 만든다(배경 점은 건드리지 않는다).
    toggles = (
        '<div style="display:flex; gap:6px; margin:8px 0 2px; flex-wrap:wrap">'
        f'<button type="button" class="pd-toggle" data-filter="recent3" '
        f'style="font-size:12.5px; padding:5px 12px; border-radius:999px; border:1px solid {BORDER}; '
        f'background:#fff; color:{MUTED}; cursor:pointer">최근 3개월만 강조</button>'
        f'<button type="button" class="pd-toggle" data-filter="near200" '
        f'style="font-size:12.5px; padding:5px 12px; border-radius:999px; border:1px solid {BORDER}; '
        f'background:#fff; color:{MUTED}; cursor:pointer">200m 이내만 강조</button>'
        '</div>'
    )
    script = f"""<script>
(function() {{
  var root = document.getElementById("{chart_id}");
  if (!root) return;
  var tip = root.querySelector(".pd-tip");
  var tipTitle = tip.querySelector(".pd-tip-title");
  var tipSub = tip.querySelector(".pd-tip-sub");
  var detailBox = root.querySelector(".pd-detail");
  var active = null;
  function showTip(dot) {{
    tipTitle.textContent = dot.getAttribute("data-tip-title");
    tipSub.textContent = dot.getAttribute("data-tip-sub");
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
      var detailText = dot.getAttribute("data-detail");
      if (detailText && detailBox) {{
        detailBox.textContent = detailText;
        detailBox.style.display = "block";
      }}
    }});
  }});
  document.addEventListener("click", function () {{ hideTip(); }});

  var state = {{ recent3: false, near200: false }};
  function applyFilters() {{
    var anyActive = state.recent3 || state.near200;
    root.querySelectorAll(".pd-dot-group").forEach(function (g) {{
      if (!anyActive) {{ g.style.opacity = "1"; return; }}
      var months = g.getAttribute("data-months-ago");
      var dist = g.getAttribute("data-distance");
      var ok = true;
      if (state.recent3) {{ ok = ok && months !== "" && parseInt(months, 10) <= 3; }}
      if (state.near200) {{ ok = ok && dist !== "" && parseFloat(dist) <= 200; }}
      g.style.opacity = ok ? "1" : "0.15";
    }});
  }}
  root.querySelectorAll(".pd-toggle").forEach(function (btn) {{
    btn.addEventListener("click", function () {{
      var key = btn.getAttribute("data-filter");
      state[key] = !state[key];
      btn.style.background = state[key] ? "{INK}" : "#fff";
      btn.style.color = state[key] ? "#fff" : "{MUTED}";
      btn.style.borderColor = state[key] ? "{INK}" : "{BORDER}";
      applyFilters();
    }});
  }});
}})();
</script>"""
    # 설명은 문장마다 줄을 나눈다 — 한 덩어리 줄글로 흘려보내면 눈이
    # 어디를 읽고 있는지 놓치기 쉽다는 지적을 반영했다(결과 페이지의
    # 다른 안내 문단도 같은 방식으로 맞춰뒀다).
    # ⚠️ 72-33절 — 웹에서는 이 그래프가 "이 매도가, 어떤 실거래를 보고 나온
    #    건가" 카드 **안**으로 들어가면서 카드 제목과 **제목이 두 번** 나왔다.
    #    `heading=None`을 넘기면 제목과, 카드 머리말과 겹치는 첫 줄이 같이 빠진다.
    #    CLI HTML 리포트(14절)는 이 그래프만 따로 놓이므로 기본값을 그대로 쓴다.
    intro_lines = [
        "그 안에서 위 매도가 값들이 어디쯤 위치하는지 보면, 이 매도가가 어떤 실거래를 근거로 나온 숫자인지 알 수 있습니다.",
        "점을 누르면 왜 그 거래가 많이/적게 반영됐는지도 볼 수 있어요.",
    ]
    if heading:
        intro_lines.insert(0, "아래 점 하나하나가 <b>실제로 거래된 가격</b>이에요.")
    intro = (
        '<div style="margin-bottom:10px">'
        + (f'<div style="font-size:16px; font-weight:800; color:{INK}">{heading}</div>'
           if heading else "")
        + "".join(
            f'<div style="font-size:13px; color:{MUTED}; margin-top:4px; line-height:1.7">{line}</div>'
            for line in intro_lines
        )
        + '</div>'
    )
    return (
        f'<div class="price-dist" id="{chart_id}" style="position:relative">'
        f'{intro}{toggles}{svg_markup}{tooltip_box}{detail_box}{compact_legend}{script}</div>'
    )


# ──────────────────────────────────────────────────────────────────────
# CLAUDE.md 44절 — 결과 페이지가 표·글자만 이어져 "공부하는 것처럼 지루하다"는
# 지적을 반영해, 이미 CLI에서만 보여주던 12절 계절성·15절 가격 추이를 웹에도
# 그림으로 붙인다. report.py에도 비슷한 렌더러가 있지만 그쪽은 그 페이지의
# CSS 클래스에 묶여 있어서, 여기서는 **인라인 스타일로 자립적인** 버전을
# 따로 만들었다(어느 페이지에 넣어도 그대로 그려진다).
# ──────────────────────────────────────────────────────────────────────

SEASON_BAR_BUSY = "#03c75a"
SEASON_BAR_SLOW = "#c0c6cc"
SEASON_BAR_MID = "#9fb4d4"


def render_seasonality_bars_html(season: dict, height: int = 120) -> str:
    """12절 계절성(월별 거래량 지수, 전체 평균=100)을 12칸 막대로 그린다.
    표본이 부족해 지수가 없으면 빈 문자열을 돌려줘서 호출부가 카드 자체를
    생략하게 한다(20절/26절과 같은 "없으면 조용히 생략" 원칙)."""
    index = season.get("index")
    if not index:
        return ""
    busy, slow = set(season.get("busy") or []), set(season.get("slow") or [])
    max_v = max(index.values()) or 1

    cols = []
    for m in range(1, 13):
        v = index.get(m, 0)
        h = max(3, round(v / max_v * height))
        color = SEASON_BAR_BUSY if m in busy else (SEASON_BAR_SLOW if m in slow else SEASON_BAR_MID)
        weight = "800" if m in busy else "600"
        cols.append(
            f'<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; min-width:0">'
            f'<div style="font-size:11.5px; font-weight:{weight}; color:{INK if m in busy else MUTED}">{v}</div>'
            f'<div style="width:100%; max-width:26px; height:{h}px; background:{color}; border-radius:4px 4px 0 0"></div>'
            f'<div style="font-size:11px; color:{MUTED}; white-space:nowrap">{m}월</div>'
            f'</div>'
        )
    return (
        f'<div style="display:flex; align-items:flex-end; gap:5px; margin-top:6px; '
        f'padding:10px 4px 0; border-bottom:1px solid {BORDER}">{"".join(cols)}</div>'
    )


def render_price_trend_svg(trend: dict, width: int = 720, height: int = 210,
                            primary: str = PRIMARY) -> str:
    """15절 가격 추이(월별 평균 평당가)를 꺾은선으로 그린다. 시계열이 3개월
    미만이면(compute_price_trend가 이미 걸러 빈 series를 준다) 빈 문자열."""
    series = trend.get("series") or []
    if len(series) < 3:
        return ""

    pad_l, pad_r, pad_t, pad_b = 52, 14, 18, 30
    values = [v for _, v in series]
    min_v, max_v = min(values), max(values)
    span = (max_v - min_v) or 1
    n = len(series)

    def x(i: int) -> float:
        return pad_l + (width - pad_l - pad_r) * (i / (n - 1))

    def y(v: float) -> float:
        return pad_t + (height - pad_t - pad_b) * (1 - (v - min_v) / span)

    parts = [
        f'<svg viewBox="0 0 {width} {height}" style="width:100%; height:auto; min-width:520px; display:block" '
        f'role="img" aria-label="월별 평균 평당가 추이">'
    ]
    # 가로 눈금 3줄(최저·중간·최고) — 값을 안 눌러봐도 수준이 읽히게(8-1절과 같은 원칙)
    for frac, val in ((0.0, max_v), (0.5, (min_v + max_v) / 2), (1.0, min_v)):
        gy = pad_t + (height - pad_t - pad_b) * frac
        parts.append(f'<line x1="{pad_l}" y1="{gy:.1f}" x2="{width - pad_r}" y2="{gy:.1f}" '
                     f'stroke="{BORDER}" stroke-width="1" stroke-dasharray="2,3" />')
        parts.append(f'<text x="{pad_l - 8}" y="{gy + 4:.1f}" font-size="11.5" fill="{MUTED}" '
                     f'text-anchor="end">{val:,.0f}</text>')

    area = (f'M {x(0):.1f},{height - pad_b:.1f} '
            + " ".join(f"L {x(i):.1f},{y(v):.1f}" for i, (_, v) in enumerate(series))
            + f' L {x(n - 1):.1f},{height - pad_b:.1f} Z')
    parts.append(f'<path d="{area}" fill="{primary}" fill-opacity="0.10" stroke="none" />')
    parts.append('<polyline points="'
                 + " ".join(f"{x(i):.1f},{y(v):.1f}" for i, (_, v) in enumerate(series))
                 + f'" fill="none" stroke="{primary}" stroke-width="2.5" '
                 'stroke-linejoin="round" stroke-linecap="round" />')
    for i, (_, v) in enumerate(series):
        parts.append(f'<circle cx="{x(i):.1f}" cy="{y(v):.1f}" r="3.5" fill="#fff" '
                     f'stroke="{primary}" stroke-width="2" />')

    # x축 라벨은 처음·중간·마지막 3개만 — 12개월치가 넘어가면 다 쓰면 겹친다
    for i in {0, n // 2, n - 1}:
        label = html.escape(str(series[i][0]))
        anchor = "start" if i == 0 else ("end" if i == n - 1 else "middle")
        parts.append(f'<text x="{x(i):.1f}" y="{height - 9:.1f}" font-size="11.5" fill="{MUTED}" '
                     f'text-anchor="{anchor}">{label}</text>')
    parts.append("</svg>")
    return f'<div style="overflow-x:auto; -webkit-overflow-scrolling:touch">{"".join(parts)}</div>'


# ─────────────────────────────────────────────────────────────────────────
# 72-32절 — "이 동네, 누가 얼마나 사나" 카드용 차트들.
#
# 사용자가 보내준 데이터 시각화 가이드를 그대로 따랐다:
#   · 하나의 변수에 대한 구성 비율 → 원/도넛 (도넛은 중앙에 총합을 넣을 수 있다)
#   · 비교 → 막대   · 시간에 따른 변화 → 꺾은선
# ⚠️ 가이드가 경고한 "항목을 너무 많이 넣은 원그래프"를 피하려고 도넛은
#    6조각까지만 쓴다(연령 6구간). 동네 비교는 조각이 아니라 막대로 간다.
# ⚠️ 외부 차트 라이브러리를 쓰지 않는다(14·22절) — 순수 SVG + 인라인 스타일이라
#    어느 페이지에 넣어도 그대로 그려진다(44절 렌더러와 같은 원칙).
# ─────────────────────────────────────────────────────────────────────────

#: 연령 6구간 — 순서가 있는 값이라 무지개색이 아니라 한 색의 연→진 램프를 쓴다.
AGE_RAMP = ("#d3f0e0", "#8fdcb4", "#4cc68a", "#20a96a", "#15804f", "#0d5c39")


def render_donut_svg(slices: list[dict], center_big: str, center_sub: str = "",
                     size: int = 168, thickness: int = 30) -> str:
    """구성 비율 도넛. slices = [{"label","pct","color"}, ...]

    ⚠️ 조각이 6개를 넘으면 가이드가 말한 "욕먹는 원그래프"가 되므로
       호출부에서 묶어서 넘겨야 한다. 여기서는 막지 않고 그리기만 한다.
    ⚠️ 색만으로 식별하게 두지 않는다 — 범례가 글자로 같이 나간다(호출부).
    """
    total = sum(max(0.0, float(s.get("pct") or 0)) for s in slices)
    if total <= 0:
        return ""
    r = (size - thickness) / 2
    c = size / 2
    circ = 2 * math.pi * r
    segs, offset = [], 0.0
    for s in slices:
        pct = max(0.0, float(s.get("pct") or 0)) / total
        if pct <= 0:
            continue
        seg = circ * pct
        segs.append(
            f'<circle cx="{c:.1f}" cy="{c:.1f}" r="{r:.1f}" fill="none" '
            f'stroke="{s.get("color", PRIMARY)}" stroke-width="{thickness}" '
            f'stroke-dasharray="{seg:.2f} {circ - seg:.2f}" '
            f'stroke-dashoffset="{-offset:.2f}" '
            f'transform="rotate(-90 {c:.1f} {c:.1f})">'
            f'<title>{html.escape(str(s.get("label", "")))} {pct * 100:.1f}%</title></circle>'
        )
        offset += seg
    sub = (f'<text x="{c:.1f}" y="{c + 18:.1f}" text-anchor="middle" '
           f'font-size="11.5" fill="{MUTED}">{html.escape(center_sub)}</text>') if center_sub else ""
    return (
        f'<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" '
        f'role="img" style="flex:0 0 auto">'
        + "".join(segs)
        + f'<text x="{c:.1f}" y="{c + (0 if not center_sub else -2):.1f}" text-anchor="middle" '
          f'font-size="21" font-weight="800" fill="{INK}">{html.escape(center_big)}</text>'
        + sub + "</svg>"
    )


def render_compare_bars_html(rows: list[dict], suffix: str = "%",
                             decimals: int = 1) -> str:
    """비교 막대 — rows = [{"label","value","note"?,"strong"?}, ...]

    가이드의 "비교는 막대그래프". 값 자체보다 **서로 얼마나 다른지**가
    핵심이라 가장 큰 값을 100%로 놓고 가로 길이를 준다.
    """
    vals = [float(r.get("value") or 0) for r in rows]
    if not vals or max(vals) <= 0:
        return ""
    top = max(vals)
    out = []
    for r in rows:
        v = float(r.get("value") or 0)
        strong = bool(r.get("strong"))
        color = PRIMARY if strong else "#c9d3da"
        out.append(
            f'<div style="display:grid; grid-template-columns:92px 1fr auto; gap:9px;'
            f' align-items:center; margin-bottom:6px">'
            f'<span style="font-size:13px; font-weight:{"800" if strong else "600"};'
            f' color:{INK if strong else MUTED}">{html.escape(str(r.get("label","")))}</span>'
            f'<span style="display:block; height:14px; background:#eef1f3; border-radius:999px; overflow:hidden">'
            f'<span style="display:block; height:100%; width:{v / top * 100:.1f}%;'
            f' background:{color}; border-radius:999px"></span></span>'
            f'<span style="font-size:13.5px; font-weight:800;'
            f' color:{INK if strong else MUTED}; font-variant-numeric:tabular-nums">'
            f'{v:.{decimals}f}{suffix}</span></div>'
        )
    return "".join(out)


def render_diverging_bars_html(rows: list[dict], suffix: str = "%") -> str:
    """0을 가운데 두고 좌우로 갈라지는 막대 — 오르는 동네와 내리는 동네를
    한눈에 가른다. rows = [{"label","value","strong"?}, ...]"""
    vals = [abs(float(r.get("value") or 0)) for r in rows]
    if not rows or max(vals or [0]) <= 0:
        return ""
    top = max(vals)
    out = []
    for r in rows:
        v = float(r.get("value") or 0)
        strong = bool(r.get("strong"))
        w = abs(v) / top * 50          # 좌우 각각 최대 50%
        up = v >= 0
        color = (PRIMARY if up else "#e0475a") if strong else ("#a9d9c0" if up else "#f0b4bd")
        bar = (f'<span style="position:absolute; left:50%; width:{w:.1f}%; height:100%;'
               f' background:{color}; border-radius:0 999px 999px 0"></span>' if up else
               f'<span style="position:absolute; right:50%; width:{w:.1f}%; height:100%;'
               f' background:{color}; border-radius:999px 0 0 999px"></span>')
        out.append(
            f'<div style="display:grid; grid-template-columns:78px 1fr 62px; gap:9px;'
            f' align-items:center; margin-bottom:6px">'
            f'<span style="font-size:13px; font-weight:{"800" if strong else "600"};'
            f' color:{INK if strong else MUTED}">{html.escape(str(r.get("label","")))}</span>'
            f'<span style="position:relative; display:block; height:14px; background:#f4f6f7;'
            f' border-radius:999px">'
            f'<span style="position:absolute; left:50%; top:0; bottom:0; width:1px; background:#d6dde2"></span>'
            f'{bar}</span>'
            f'<span style="font-size:13.5px; font-weight:800; text-align:right;'
            f' color:{INK if strong else MUTED}; font-variant-numeric:tabular-nums">'
            f'{v:+.1f}{suffix}</span></div>'
        )
    return "".join(out)


def render_series_line_svg(points: list[tuple], width: int = 460, height: int = 130,
                           suffix: str = "") -> str:
    """시간에 따른 변화 — 가이드의 "변화는 꺾은선". points = [(x라벨, 값), ...]"""
    pts = [(str(a), float(b)) for a, b in (points or []) if b is not None]
    if len(pts) < 2:
        return ""
    vals = [v for _, v in pts]
    lo, hi = min(vals), max(vals)
    if hi == lo:
        hi = lo + 1
    pad_l, pad_r, pad_t, pad_b = 8, 8, 16, 22
    iw, ih = width - pad_l - pad_r, height - pad_t - pad_b
    xy = [(pad_l + iw * i / (len(pts) - 1), pad_t + ih * (1 - (v - lo) / (hi - lo)))
          for i, (_, v) in enumerate(pts)]
    line = " ".join(f"{x:.1f},{y:.1f}" for x, y in xy)
    area = f"{pad_l},{pad_t + ih} " + line + f" {pad_l + iw},{pad_t + ih}"
    dots = "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.2" fill="{PRIMARY}">'
        f'<title>{html.escape(pts[i][0])} {pts[i][1]:,.0f}{html.escape(suffix)}</title></circle>'
        for i, (x, y) in enumerate(xy))
    ends = (
        f'<text x="{pad_l}" y="{height - 6}" font-size="11" fill="{MUTED}">{html.escape(pts[0][0])}</text>'
        f'<text x="{pad_l + iw}" y="{height - 6}" font-size="11" fill="{MUTED}" '
        f'text-anchor="end">{html.escape(pts[-1][0])}</text>'
        f'<text x="{xy[0][0]:.1f}" y="{max(11.0, xy[0][1] - 7):.1f}" font-size="11.5" '
        f'font-weight="700" fill="{MUTED}">{pts[0][1]:,.0f}</text>'
        f'<text x="{xy[-1][0]:.1f}" y="{max(11.0, xy[-1][1] - 7):.1f}" font-size="11.5" '
        f'font-weight="800" fill="{INK}" text-anchor="end">{pts[-1][1]:,.0f}</text>')
    return (f'<svg viewBox="0 0 {width} {height}" width="100%" role="img" '
            f'style="height:auto; display:block; max-width:{width}px">'
            f'<polygon points="{area}" fill="{PRIMARY}" fill-opacity="0.10"/>'
            f'<polyline points="{line}" fill="none" stroke="{PRIMARY}" '
            f'stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
            f'{dots}{ends}</svg>')
