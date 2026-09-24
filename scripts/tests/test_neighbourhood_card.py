"""72-32절 — 25절 인근 동 비교 + 69절 매입자 연령대를 한 카드로.

차트 선택은 사용자가 보내준 데이터 시각화 가이드를 그대로 따랐다:
구성 비율 → 도넛 · 비교 → 막대 · 시간 변화 → 꺾은선.
"""
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
import price_chart as pc  # noqa: E402

_SLICES = [{"label": "30대", "pct": 35.0, "color": "#4cc68a"},
           {"label": "40대", "pct": 29.0, "color": "#20a96a"},
           {"label": "50대", "pct": 36.0, "color": "#d3f0e0"}]


class TheDonutShowsAComposition(unittest.TestCase):
    def test_one_arc_per_slice(self):
        svg = pc.render_donut_svg(_SLICES, "64%", "30~40대")
        self.assertEqual(svg.count("<circle"), 3)

    def test_the_arcs_add_up_to_the_full_circle(self):
        """⚠️ 가이드: '모든 요소가 고려되지 않으면 원그래프를 쓰면 안 된다.'"""
        import re
        svg = pc.render_donut_svg(_SLICES, "64%")
        lens = [float(m) for m in re.findall(r'stroke-dasharray="([\d.]+) ', svg)]
        circ = float(re.search(r'stroke-dasharray="[\d.]+ ([\d.]+)"', svg).group(1)) + lens[0]
        self.assertAlmostEqual(sum(lens), circ, places=1)

    def test_the_centre_carries_the_headline(self):
        svg = pc.render_donut_svg(_SLICES, "64%", "30~40대")
        self.assertIn(">64%<", svg)
        self.assertIn(">30~40대<", svg)

    def test_each_slice_has_a_text_tooltip(self):
        """색만으로 식별하게 두지 않는다."""
        svg = pc.render_donut_svg(_SLICES, "64%")
        for s in _SLICES:
            self.assertIn(s["label"], svg)

    def test_empty_input_draws_nothing(self):
        self.assertEqual(pc.render_donut_svg([], "x"), "")
        self.assertEqual(pc.render_donut_svg([{"label": "a", "pct": 0}], "x"), "")

    def test_the_ramp_is_one_hue_not_a_rainbow(self):
        """순서가 있는 구간이라 연→진 한 색 램프여야 한다."""
        self.assertEqual(len(pc.AGE_RAMP), 6)
        self.assertEqual(len(set(pc.AGE_RAMP)), 6)


class TheBarsCompare(unittest.TestCase):
    def test_the_longest_bar_is_the_biggest_value(self):
        import re
        html = pc.render_compare_bars_html(
            [{"label": "이 구", "value": 64.1, "strong": True},
             {"label": "전국", "value": 50.1}])
        widths = [float(w) for w in re.findall(r"width:([\d.]+)%", html)]
        self.assertAlmostEqual(widths[0], 100.0, places=1)
        self.assertLess(widths[1], widths[0])

    def test_counts_render_as_whole_numbers(self):
        html = pc.render_compare_bars_html([{"label": "홍은동", "value": 8}],
                                           suffix="건", decimals=0)
        self.assertIn("8건", html)
        self.assertNotIn("8.0건", html)

    def test_the_target_row_stands_out(self):
        html = pc.render_compare_bars_html(
            [{"label": "이 구", "value": 5, "strong": True}, {"label": "옆", "value": 5}])
        self.assertIn(pc.PRIMARY, html)

    def test_nothing_to_compare_draws_nothing(self):
        self.assertEqual(pc.render_compare_bars_html([]), "")
        self.assertEqual(pc.render_compare_bars_html([{"label": "a", "value": 0}]), "")


class TheDivergingBarsSplitAtZero(unittest.TestCase):
    def test_up_goes_right_and_down_goes_left(self):
        html = pc.render_diverging_bars_html(
            [{"label": "오름", "value": 5.0}, {"label": "내림", "value": -5.0}])
        self.assertIn("left:50%", html)
        self.assertIn("right:50%", html)

    def test_the_sign_is_always_shown(self):
        html = pc.render_diverging_bars_html([{"label": "a", "value": 1.7}])
        self.assertIn("+1.7%", html)

    def test_all_zero_draws_nothing(self):
        self.assertEqual(pc.render_diverging_bars_html([{"label": "a", "value": 0}]), "")


class TheLineShowsChangeOverTime(unittest.TestCase):
    def test_one_dot_per_point(self):
        svg = pc.render_series_line_svg([("2019", 100), ("2020", 200), ("2021", 150)])
        self.assertEqual(svg.count("<circle"), 3)

    def test_the_ends_are_labelled(self):
        svg = pc.render_series_line_svg([("2019", 4904), ("2025", 4653)])
        self.assertIn("2019", svg)
        self.assertIn("2025", svg)
        self.assertIn("4,904", svg)

    def test_a_single_point_is_not_a_line(self):
        self.assertEqual(pc.render_series_line_svg([("2019", 1)]), "")
        self.assertEqual(pc.render_series_line_svg([]), "")

    def test_a_flat_series_does_not_divide_by_zero(self):
        svg = pc.render_series_line_svg([("a", 5), ("b", 5), ("c", 5)])
        self.assertIn("<polyline", svg)

    def test_it_does_not_swallow_the_whole_card(self):
        svg = pc.render_series_line_svg([("a", 1), ("b", 2)], width=460)
        self.assertIn("max-width:460px", svg)


class TheCardMergesBothSections(unittest.TestCase):
    def setUp(self):
        os.environ.setdefault("KAKAO_REST_API_KEY", "t")
        os.environ.setdefault("MOLIT_SERVICE_KEY", "t")
        import app
        self.build = app._build_neighbourhood_card
        import buyer_age
        self.age = buyer_age.compute_buyer_age("서울특별시 서대문구 홍은동 265-218")

    _DONG = {"dong": "홍은동", "latest_month": "2026.08",
             "volume_top": [{"dong": "홍은동", "count": 8, "is_target": True},
                            {"dong": "홍제동", "count": 5, "is_target": False}],
             "price_top": [{"dong": "홍은동", "change_pct": "+1.7%", "is_target": True},
                           {"dong": "홍제동", "change_pct": "-5.1%", "is_target": False}],
             "volume_rank_note": None, "price_rank_note": None,
             "volume_missing": False, "price_missing": False}

    def test_both_halves_render(self):
        card = self.build(self._DONG, self.age)
        self.assertTrue(card["dong"]["volume_bars"])
        self.assertTrue(card["dong"]["price_bars"])
        self.assertTrue(card["age"]["donut"])
        self.assertTrue(card["age"]["compare_bars"])
        self.assertTrue(card["age"]["volume_line"])

    def test_either_half_alone_still_works(self):
        """한쪽 데이터가 없다고 카드 전체가 사라지면 안 된다."""
        self.assertIsNotNone(self.build(self._DONG, None)["dong"])
        self.assertIsNone(self.build(self._DONG, None)["age"])
        self.assertIsNotNone(self.build(None, self.age)["age"])
        self.assertIsNone(self.build(None, self.age)["dong"])

    def test_neither_means_no_card(self):
        self.assertIsNone(self.build(None, None))

    def test_the_comparison_has_three_levels(self):
        """⚠️ 사용자 지적: 64%만 보면 많은 건지 적은 건지 모른다."""
        card = self.build(None, self.age)
        bars = card["age"]["compare_bars"]
        self.assertIn(self.age["region"], bars)
        self.assertIn(f"{self.age['sido']} 평균", bars,
                      "시/도 평균 줄이 빠졌다 — 전국 평균만으로는 비교가 약하다")
        self.assertIn("전국 평균", bars)
        self.assertEqual(bars.count("grid-template-columns:92px"), 3,
                         "비교 막대는 이 구 · 시/도 평균 · 전국 평균 세 줄이어야 한다")
        self.assertIsNotNone(card["age"]["vs_sido"])
        self.assertIsNotNone(card["age"]["vs_nation"])

    def test_a_negative_gap_is_reported_too(self):
        import buyer_age
        low = buyer_age.compute_buyer_age("경기도 고양시 덕양구 화정동 1")
        card = self.build(None, low)
        self.assertLess(card["age"]["vs_sido"], 0,
                        "시/도 평균보다 낮은 동네도 있어야 비교가 의미 있다")

    def test_percent_strings_survive_the_round_trip(self):
        import app
        self.assertEqual(app._pct_to_float("+1.7%"), 1.7)
        self.assertEqual(app._pct_to_float("-5.1%"), -5.1)
        for junk in (None, "", "없음", "--", [], {}):
            self.assertEqual(app._pct_to_float(junk), 0.0)


class TheTemplateHasOneCardNotTwo(unittest.TestCase):
    def _tpl(self, strip_comments=False):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "webapp", "templates", "result.html")
        with open(path, encoding="utf-8") as f:
            src = f.read()
        if strip_comments:
            # ⚠️ Jinja 주석({# … #})에 적은 설명이 걸려 오탐이 난다 —
            #    72-24절에서 파이썬 독스트링으로 똑같이 겪었다.
            src = re.sub(r"\{#.*?#\}", "", src, flags=re.S)
        return src

    def test_the_two_old_cards_are_gone(self):
        src = self._tpl()
        self.assertNotIn("{% if result.dong_compare %}", src)
        self.assertNotIn("{% if result.buyer_age %}", src)

    def test_the_merged_card_exists(self):
        src = self._tpl()
        self.assertIn("{% if result.neighbourhood %}", src)
        self.assertIn("이 동네, 누가 얼마나 사나", src)

    def test_the_activity_metric_is_explained(self):
        """⚠️ 사용자 지적: '거래 활발도가 뭘 뜻하는지 더 자세히'."""
        src = self._tpl(strip_comments=True)
        # 72-34절 — 줌 사다리로 묶으며 문구가 바뀌었다. 계약은 그대로다:
        #   "매물이 아니라 계약" + "팔고 싶을 때 사 줄 사람이 있는가"
        for phrase in ("계약이 끝난 건수", "사 줄 사람이 있는가", "보는 범위가 다릅니다"):
            self.assertIn(phrase, src, f"거래 활발도 설명에서 '{phrase}' 가 빠졌다")

    def test_the_missing_reason_still_has_a_home(self):
        """72-29절 — 연령대가 없을 때 이유를 말하는 자리가 남아 있어야 한다."""
        self.assertIn("result.buyer_age_missing", self._tpl())


if __name__ == "__main__":
    unittest.main()
