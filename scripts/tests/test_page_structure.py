"""72-34절 — 결과 페이지를 네 구역으로, 거래량을 줌 사다리로.

사용자 지적: *"거래량 말하는 것들 다 똑같은 말 아닌가… 전체적으로 큰 틀이
매도가 / 환금성 / 동네 / 거시 이렇게 나뉘어야지 지금 뭔가 다 뒤죽박죽이라
머리 깊게 써야 이해할 만하다."*
"""
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

_TPL = os.path.join(os.path.dirname(__file__), "..", "..", "webapp", "templates", "result.html")


def _src(strip_comments=False):
    with open(_TPL, encoding="utf-8") as f:
        s = f.read()
    return re.sub(r"\{#.*?#\}", "", s, flags=re.S) if strip_comments else s


class ThePageHasFourSections(unittest.TestCase):
    EXPECTED = ["이 집, 얼마에 팔릴까", "얼마나 잘 팔릴까",
                "이 동네는 어떤 곳인가", "더 넓게 보면"]

    def test_all_four_headers_exist_in_order(self):
        src = _src(strip_comments=True)
        found = re.findall(r'sec-num">(\d)</span><span class="sec-title">([^<]+)</span>', src)
        self.assertEqual([t for _, t in found], self.EXPECTED)
        self.assertEqual([n for n, _ in found], ["1", "2", "3", "4"])

    def test_each_section_has_a_subtitle(self):
        self.assertEqual(_src(True).count('class="sec-sub"'), 4)

    def test_the_conclusion_comes_before_the_sections(self):
        """32절 — 숫자를 보기 전에 결론부터."""
        src = _src(True)
        first_sec = src.index('class="sec-head"')
        for key in ("result.estimate_warnings", "result.verdict_lines"):
            self.assertLess(src.index("{% if " + key + " %}"), first_sec,
                            f"{key} 가 구역 헤더 뒤로 밀렸다")

    def _section_of(self, needle):
        src = _src(True)
        pos = src.index(needle)
        heads = [(m.start(), m.group(1)) for m in
                 re.finditer(r'sec-num">(\d)</span>', src)]
        last = "0"
        for start, num in heads:
            if start < pos:
                last = num
            else:
                break
        return last

    def test_cards_land_in_the_right_section(self):
        # ⚠️ 조건문(`{% if result.X %}`)은 다른 카드 **안에서도** 쓰인다
        #    (price_tiers·similar_listings). 카드를 특정하려면 제목으로 찾는다.
        for needle, want, what in (
            ("가격 구간별 매도 전략", "1", "가격 구간별 매도 전략"),
            ("이 매도가, 어떤 실거래를 보고", "1", "매도가 산출 근거"),
            ("상태별 매도가 3단계", "1", "상태별 매도가 3단계"),
            ("예상 월세 추정", "1", "예상 월세"),
            ("환금성·경쟁 진단", "2", "환금성 진단"),
            ("매도 압력 (경쟁매물", "2", "매도 압력"),
            ("비교 매물 유사도 순위", "2", "비교 매물 순위"),
            ("이 동네, 누가 얼마나 사나", "3", "이 동네"),
            ("역세권 프리미엄 참고", "3", "역세권 프리미엄"),
            ("시장 동향 참고 - 연립다세대", "4", "시장 동향"),
        ):
            self.assertEqual(self._section_of(needle), want,
                             f"'{what}' 가 {want}번 구역에 없다")


class TheVolumeNumbersAreOneLadder(unittest.TestCase):
    """세 거래량은 축이 다르다 — 반경 / 동 / 구. 좁은 데서 넓은 데로."""

    def test_three_zoom_steps_in_order(self):
        src = _src(True)
        pins = re.findall(r'zoom-pin">(\d)</span>\s*([^<\n]+)', src)
        self.assertEqual([n for n, _ in pins], ["1", "2", "3"])
        labels = [t.strip() for _, t in pins]
        self.assertIn("주변", labels[0])
        self.assertIn("동", labels[1])
        self.assertIn("구", labels[2])

    def test_each_step_says_what_range_it_covers(self):
        src = _src(True)
        for phrase in ("반경 300·500m", "같은 구 안에서", "가장 넓게 본"):
            self.assertIn(phrase, src, f"'{phrase}' 설명이 빠졌다")

    def test_the_ladder_explains_why_there_are_three(self):
        self.assertIn("보는 범위가 다릅니다", _src(True))

    def test_the_district_line_is_not_drawn_twice(self):
        """줌 3단계로 옮긴 뒤 연령대 갈래의 원본을 안 지우면 두 번 나온다."""
        src = _src(True)
        # 조건문 한 번 + 출력 한 번이 정상. 출력이 둘이면 두 번 그려진다.
        self.assertEqual(src.count("{{ nb.age.volume_line"), 1)

    def test_the_old_standalone_cards_are_gone(self):
        """유동성·가격추이·계절성은 이제 '이 동네' 카드 안이다."""
        src = _src(True)
        for cond in ("result.liquidity", "result.price_trend", "result.seasonality"):
            self.assertNotIn('{%% if %s %%}\n<div class="card">' % cond, src,
                             f"{cond} 가 아직 별도 카드다")

    def test_they_are_inside_the_neighbourhood_card(self):
        src = _src(True)
        start = src.index("{% if result.neighbourhood %}")
        end = src.index('class="sec-head"', start)
        block = src[start:end]
        for key in ("nb.liquidity", "result.price_trend", "result.seasonality"):
            self.assertIn(key, block, f"{key} 가 '이 동네' 카드 안에 없다")


class TheTemplateKeysAreReal(unittest.TestCase):
    """⚠️ 실제 dict 키를 안 읽고 이름을 지어내면 화면이 조용히 빈다
    (72-13절 교훈 #4 — 실제로 price_trend.summary/chart 로 잘못 썼다)."""

    def test_price_trend_keys(self):
        src = _src(True)
        used = set(re.findall(r"result\.price_trend\.(\w+)", src))
        self.assertTrue(used <= {"chart_html", "scope", "first", "last", "change_pct"},
                        f"없는 키를 쓴다: {used}")

    def test_seasonality_keys(self):
        src = _src(True)
        used = set(re.findall(r"result\.seasonality\.(\w+)", src))
        self.assertTrue(used <= {"chart_html", "scope", "busy", "slow"},
                        f"없는 키를 쓴다: {used}")

    def test_liquidity_keys(self):
        src = _src(True)
        used = set(re.findall(r"nb\.liquidity\.(\w+)", src))
        self.assertTrue(used <= {"latest", "rows"}, f"없는 키를 쓴다: {used}")


if __name__ == "__main__":
    unittest.main()


class TheNewChartsSwallowJunk(unittest.TestCase):
    """72-35절 — 참고용 차트 하나 때문에 페이지가 죽으면 안 된다.

    ⚠️ 이 프로젝트가 반복해서 데인 자리다(72-13절 교훈 #1): 숫자가 아닌 값·
    NaN·무한대가 `if not x` 같은 가드를 **그냥 통과**한다.
    """

    JUNK = [None, "", "  ", "abc", 0, -1, 1e9, float("nan"), float("inf"),
            float("-inf"), [], {}, True, 1e-12]

    def test_the_donut_never_raises(self):
        import price_chart as pc
        for v in self.JUNK:
            pc.render_donut_svg([{"label": "a", "pct": v, "color": "#000"}], "x", "y")
        pc.render_donut_svg([], "x")
        pc.render_donut_svg([{}], "x")

    def test_the_bars_never_raise(self):
        import price_chart as pc
        for fn in (pc.render_compare_bars_html, pc.render_diverging_bars_html):
            for v in self.JUNK:
                fn([{"label": "a", "value": v}])
                fn([{"label": v, "value": 1}])
            fn([]), fn([{}])

    def test_the_line_never_raises(self):
        import price_chart as pc
        for v in self.JUNK:
            pc.render_series_line_svg([("a", v), ("b", 2), ("c", 3)])
        pc.render_series_line_svg([])
        pc.render_series_line_svg([(None, 1), ("b", 2), ("c", 3)])

    def test_junk_is_dropped_not_drawn_as_zero(self):
        """못 읽는 값을 0으로 그리면 **없는 데이터를 있는 것처럼** 보여준다."""
        import price_chart as pc
        svg = pc.render_series_line_svg([("a", 10), ("b", "abc"), ("c", 30)])
        self.assertEqual(svg.count("<circle"), 2, "읽을 수 없는 점이 그려졌다")

    def test_the_numeric_guard_exists(self):
        """되돌아가지 않게 공용 헬퍼를 고정한다."""
        import math
        import price_chart as pc
        self.assertIsNone(pc._num("abc"))
        self.assertIsNone(pc._num(float("nan")))
        self.assertIsNone(pc._num(float("inf")))
        self.assertEqual(pc._num("3.5"), 3.5)
        self.assertEqual(pc._num(None, 0.0), 0.0)


class TheRegionResolversSwallowJunk(unittest.TestCase):
    """72-35절 — 주소 자리에 문자열이 아닌 값이 와도 계산이 멈추면 안 된다."""

    JUNK = [None, "", 0, -1, float("nan"), float("inf"), True, [], {}, 1e-12]

    def test_buyer_age_resolvers(self):
        import buyer_age as B
        table = B.load_buyer_age()
        for v in self.JUNK:
            self.assertIsNone(B.region_for_address(v, table))
            self.assertIsNone(B.sido_for_address(v, table))
            self.assertIsInstance(B.unavailable_reason(v, table), str)

    def test_market_index_resolvers(self):
        import market_index as M
        for v in self.JUNK:
            self.assertIsNone(M.sido_token(v))
            self.assertIsNone(M.seoul_zone_from_address(v))
            self.assertIsNone(M.region_from_address(v, M.VILLA_SIDO_ALIAS))

    def test_real_addresses_still_work(self):
        """가드를 넣다가 정상 동작을 막지 않았는지."""
        import buyer_age as B
        import market_index as M
        self.assertEqual(M.seoul_zone_from_address("서울특별시 서대문구 홍은동 1"), "서북권")
        self.assertEqual(B.sido_for_address("서대문구 홍은동 265-218"), "서울")
