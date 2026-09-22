"""
CLAUDE.md 8-1절 확장 — scripts/price_chart.py의 순수 계산 헬퍼(히스토그램
집계·개월수 계산·반영도 문장·다이아몬드 좌표) 단위 테스트와, 전체 렌더링
함수의 구조적 스모크 테스트(모양/테두리/연결선이 조건에 맞게 나타나는지).

실행: python3 -m unittest discover -s scripts/tests -v
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import price_chart as pc  # noqa: E402


class HistogramCountsTests(unittest.TestCase):
    def test_counts_fall_into_expected_bins(self):
        # 도메인 0~100을 4구간으로 나누면 각 구간 폭은 25
        amounts = [5, 10, 30, 60, 95, 99]
        counts = pc._histogram_counts(amounts, 0, 100, 4)
        self.assertEqual(counts, [2, 1, 1, 2])

    def test_zero_span_returns_all_zero(self):
        self.assertEqual(pc._histogram_counts([10, 20], 50, 50, 4), [0, 0, 0, 0])

    def test_value_at_domain_max_falls_in_last_bin(self):
        counts = pc._histogram_counts([100], 0, 100, 4)
        self.assertEqual(counts, [0, 0, 0, 1])


class MonthsAgoTests(unittest.TestCase):
    def test_explicit_reference_point(self):
        self.assertEqual(pc._months_ago("2025", "6", this_year=2026, this_month=9), 15)

    def test_same_month_is_zero(self):
        self.assertEqual(pc._months_ago("2026", "9", this_year=2026, this_month=9), 0)

    def test_garbage_input_returns_none(self):
        self.assertIsNone(pc._months_ago("모름", None, this_year=2026, this_month=9))

    def test_future_deal_month_clamped_to_zero(self):
        # 데이터 이상치(미래 계약월) 방어
        self.assertEqual(pc._months_ago("2026", "12", this_year=2026, this_month=9), 0)


class ReflectSentenceTests(unittest.TestCase):
    def test_outlier_overrides_tier(self):
        # 반영도가 높아도(t=0.9) 이상치면 이상치 문구가 우선한다
        sentence = pc._reflect_sentence(0.9, is_outlier=True)
        self.assertIn("가중치를 낮춰", sentence)

    def test_high_tier_sentence(self):
        self.assertIn("크게 반영됨", pc._reflect_sentence(0.9, is_outlier=False))

    def test_mid_tier_sentence(self):
        self.assertIn("보통 수준으로 반영됨", pc._reflect_sentence(0.5, is_outlier=False))

    def test_low_tier_sentence(self):
        self.assertIn("거의 반영되지 않음", pc._reflect_sentence(0.1, is_outlier=False))


class DiamondPointsTests(unittest.TestCase):
    def test_produces_four_coordinate_pairs(self):
        pts = pc._diamond_points(10, 20, 5)
        pairs = pts.split(" ")
        self.assertEqual(len(pairs), 4)
        for pair in pairs:
            x, y = pair.split(",")
            float(x)  # 파싱 가능한 숫자여야 함
            float(y)


class SmoothAreaPathTests(unittest.TestCase):
    """거래 밀집도 곡선(부드러운 밀도 영역)에 쓰는 중점-베지어 스무딩 헬퍼."""

    def test_empty_or_single_point_returns_empty_string(self):
        self.assertEqual(pc._smooth_area_path([]), "")
        self.assertEqual(pc._smooth_area_path([(0, 0)]), "")

    def test_starts_with_moveto_first_point(self):
        d = pc._smooth_area_path([(0, 10), (5, 0), (10, 10)])
        self.assertTrue(d.startswith("M 0.0,10.0"))

    def test_ends_at_last_point(self):
        d = pc._smooth_area_path([(0, 10), (5, 0), (10, 10)])
        self.assertTrue(d.endswith("L 10.0,10.0"))

    def test_uses_quadratic_curves_between_points(self):
        d = pc._smooth_area_path([(0, 10), (5, 0), (10, 10)])
        self.assertEqual(d.count("Q"), 2)  # 점 3개 -> 구간 2개


def _fake_row(name, amount, weight, distance, deal_year="2026", deal_month="9",
              dealing_gbn=None, same_building=False, outlier=False, adjusted=None):
    row = {
        "_amount_man": amount, "_weight": weight, "_distance_m": distance,
        "mhouseNm": name, "excluUseAr": "69.27", "dealYear": deal_year, "dealMonth": deal_month,
    }
    if dealing_gbn is not None:
        row["_dealing_gbn"] = dealing_gbn
    if same_building:
        row["_same_building"] = True
    if outlier:
        row["_price_outlier"] = True
    if adjusted is not None:
        row["_amount_man_adjusted"] = adjusted
    return row


class RenderPriceDistributionStructureTests(unittest.TestCase):
    """SVG 문자열을 픽셀 단위로 검증할 수는 없으니, 조건에 맞는 마크업 조각이
    나타나는지(모양/테두리/연결선/클릭상세) 구조적으로만 확인한다."""

    def test_empty_input_returns_empty_string(self):
        self.assertEqual(pc.render_price_distribution_html([], {}), "")

    def test_jikgeorae_renders_as_polygon(self):
        rows = [_fake_row("직거래빌라", 30000, 1.0, 50, dealing_gbn="직거래")]
        out = pc.render_price_distribution_html(rows, {})
        self.assertIn("<polygon", out)

    def test_junggae_renders_as_circle_not_polygon(self):
        rows = [_fake_row("중개빌라", 30000, 1.0, 50, dealing_gbn="중개거래")]
        out = pc.render_price_distribution_html(rows, {})
        self.assertNotIn("<polygon", out)

    def test_same_building_adds_gold_ring(self):
        rows = [_fake_row("동일건물빌라", 30000, 1.0, 50, same_building=True)]
        out = pc.render_price_distribution_html(rows, {})
        self.assertIn(pc.SAME_BUILDING_RING_COLOR, out)

    def test_outlier_adds_dashed_ring(self):
        rows = [_fake_row("이상치빌라", 30000, 1.0, 50, outlier=True)]
        out = pc.render_price_distribution_html(rows, {})
        self.assertIn(pc.OUTLIER_RING_COLOR, out)
        self.assertIn('stroke-dasharray="2,2"', out)

    def test_time_correction_is_no_longer_drawn(self):
        # 7-2절 시계열 보정은 껐다 — `_amount_man_adjusted`가 남아 있어도
        # 연결선·빈 점·범례 어디에도 나타나지 않아야 한다(되살아나면 잡는다).
        rows = [_fake_row("보정빌라", 30000, 1.0, 50, adjusted=31500)]
        out = pc.render_price_distribution_html(rows, {})
        self.assertNotIn("시계열", out)
        # 점 1개 = 채워진 원 + 투명 히트타깃 2개뿐. 보정 연결선이 살아있으면
        # 끝에 붙는 흰 빈 점 때문에 3개가 된다.
        self.assertEqual(out.count("<circle"), 2)

    def test_rows_beyond_emphasis_cap_are_not_interactive(self):
        # 가중치가 낮은 건 강조(max_dots) 밖으로 밀려나 클릭 불가능한 배경 점이 된다
        rows = [_fake_row(f"빌라{i}", 30000 + i * 10, weight=(100 - i), distance=50) for i in range(5)]
        out = pc.render_price_distribution_html(rows, {}, max_dots=2)
        self.assertEqual(out.count('class="pd-dot"'), 2)

    def test_sample_note_mentions_emphasis_count_when_capped(self):
        rows = [_fake_row(f"빌라{i}", 30000 + i * 10, weight=(100 - i), distance=50) for i in range(5)]
        out = pc.render_price_distribution_html(rows, {}, max_dots=2)
        self.assertIn("비교거래 5건", out)
        self.assertIn("주요 유사거래 2건 강조", out)

    def test_no_emphasis_note_when_sample_fits_within_cap(self):
        # "강조" 자체는 토글 버튼 라벨에 항상 있으니, 캡션 전용 문구("주요
        # 유사거래 N건 강조")로 정확히 확인한다.
        rows = [_fake_row("빌라", 30000, 1.0, 50)]
        out = pc.render_price_distribution_html(rows, {}, max_dots=40)
        self.assertNotIn("주요 유사거래", out)


class CompactLegendTests(unittest.TestCase):
    """압축 범례는 실제로 그려진 기호만 보여준다 — 표본에 직거래가 없는데
    "◆ 직거래"만 떠 있으면 "다이아몬드가 왜 사라졌지?"라고 오해하게 된다
    (사용자가 실제로 그렇게 물어서 고친 부분이다)."""

    def _legend(self, rows):
        out = pc.render_price_distribution_html(rows, {})
        return out.split("border-top:1px dashed")[1].split("</div>")[0]

    def test_jikgeorae_count_is_shown_when_present(self):
        rows = [_fake_row("직거래빌라", 30000, 1.0, 50, dealing_gbn="직거래"),
                _fake_row("중개빌라", 31000, 1.0, 60, dealing_gbn="중개거래")]
        legend = self._legend(rows)
        self.assertIn("직거래 1", legend.replace("&nbsp;", " "))

    def test_zero_jikgeorae_is_stated_explicitly(self):
        rows = [_fake_row("중개빌라", 30000, 1.0, 50, dealing_gbn="중개거래")]
        self.assertIn("직거래 0건", self._legend(rows).replace("&nbsp;", " "))

    def test_missing_dealing_type_says_so_instead_of_pretending(self):
        rows = [_fake_row("정보없음빌라", 30000, 1.0, 50)]
        self.assertIn("거래유형 정보 없음", self._legend(rows).replace("&nbsp;", " "))

    def test_absent_symbols_are_not_listed(self):
        rows = [_fake_row("중개빌라", 30000, 1.0, 50, dealing_gbn="중개거래")]
        legend = self._legend(rows)
        self.assertNotIn("동일건물", legend)
        self.assertNotIn("이상치", legend)
        self.assertNotIn("시계열보정", legend)

    def test_present_symbols_are_listed_with_counts(self):
        rows = [_fake_row("동일건물빌라", 30000, 1.0, 50, dealing_gbn="중개거래",
                          same_building=True, outlier=True, adjusted=33000)]
        legend = self._legend(rows).replace("&nbsp;", " ")
        self.assertIn("동일건물 1", legend)
        self.assertIn("이상치 1", legend)
        self.assertNotIn("시계열", legend)  # 7-2절 보정은 껐다


if __name__ == "__main__":
    unittest.main()
