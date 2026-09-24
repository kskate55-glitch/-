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


class ThePriceAndTheTiersAreOneCard(unittest.TestCase):
    """사용자 요청 — 경매용 매도가와 가격 구간별 매도 전략은 "얼마에 내놓을까"
    하나의 이야기라 한 카드 안 2단으로 합쳤다.

    ⚠️ 예전엔 바깥 그리드(`.hero-row.two-col`)가 이 둘만이 아니라 **경고·종합
    판단·구역 제목까지** 감싸 버려서 격자가 통째로 어긋났다(왼쪽에 카드가
    쌓이고 오른쪽 절반이 비었다). 그 재발을 여기서 막는다.
    """

    def test_the_tier_table_lives_inside_the_hero_card(self):
        src = _src(True)
        hero = src.index('<div class="hero">')
        tiers = src.index("가격 구간별 매도 전략")
        first_sec = src.index('class="sec-head"')
        self.assertLess(hero, tiers, "구간별 표가 히어로 카드보다 앞에 있다")
        self.assertLess(tiers, first_sec,
                        "구간별 표가 구역 제목 뒤로 밀렸다 — 맨 위에 있어야 한다")

    def test_the_two_column_grid_wraps_only_those_two(self):
        """격자가 감싸는 것이 히어로 본문과 구간표 **둘뿐**인지 센다."""
        src = _src(True)
        start = src.index('<div class="hero-split')
        depth, i = 0, start
        while True:
            nxt_o = src.find("<div", i)
            nxt_c = src.find("</div>", i)
            if nxt_c == -1:
                self.fail("hero-split 이 닫히지 않는다")
            if nxt_o != -1 and nxt_o < nxt_c:
                depth += 1
                i = nxt_o + 4
            else:
                depth -= 1
                i = nxt_c + 6
                if depth == 0:
                    break
        inside = src[start:i]
        for stray in ("이 추정치, 그대로 믿기 전에", "종합 판단", 'class="sec-head"'):
            self.assertNotIn(stray, inside,
                             f"'{stray}' 가 2단 격자 안에 들어가 격자를 어긋나게 한다")

    def test_the_warning_card_comes_right_after(self):
        src = _src(True)
        self.assertLess(src.index("가격 구간별 매도 전략"),
                        src.index("이 추정치, 그대로 믿기 전에"))


class TheRecalculateLinkIsAtTheVeryBottom(unittest.TestCase):
    """⚠️ 3번 구역과 4번 구역 **사이**에 끼어 있었다 — 페이지가 거기서
    끝나는 것처럼 보인다."""

    def test_nothing_but_the_link_after_the_last_section(self):
        src = _src(True)
        link = src.index("다른 물건 다시 계산하기")
        self.assertGreater(link, src.rindex('class="sec-head"'),
                           "다시 계산하기가 구역 중간에 끼어 있다")
        self.assertEqual(src.count("다른 물건 다시 계산하기"), 1)

    def test_it_is_a_button_not_a_tiny_link(self):
        """72-38절 — 14px 글자 링크라 페이지 맨 아래에서 안 보였다."""
        css = open(os.path.join(os.path.dirname(__file__), "..", "..",
                                "webapp", "static", "app.css"), encoding="utf-8").read()
        tpl = _src(True)
        link = tpl[tpl.index("다른 물건 다시 계산하기") - 120:]
        self.assertIn("recalc-btn", link.split(">")[0] + link[:200],
                      "맨 아래 링크에 버튼 클래스가 없다")
        block = css[css.index(".recalc-btn {"):css.index(".recalc-btn:hover")]
        self.assertIn("display: block", block, "한 줄짜리 인라인 링크로 되돌아갔다")
        size = float(re.search(r"font-size: ([\d.]+)px", block).group(1))
        self.assertGreaterEqual(size, 16, f"글자가 {size}px 로 다시 작아졌다")
        self.assertIn("box-shadow", block, "버튼으로 안 보인다")
        # ⚠️ `a.back`(0,1,1)이 `.recalc-btn`(0,1,0)을 이긴다 — 거기에 색·크기를
        #    적으면 버튼 스타일이 조용히 죽는다.
        base = css[css.index("a.back {"):css.index("}", css.index("a.back {"))]
        for prop in ("font-size", "background", "border", "display"):
            self.assertNotIn(prop, base, f"a.back 의 {prop} 가 버튼 스타일을 덮어쓴다")


class TheVolumeNumbersAreOneLadder(unittest.TestCase):
    """거래량 사다리는 반경 → 동 두 단계다. 좁은 데서 넓은 데로.

    ⚠️ 72-38절에서 **세 단계였던 것이 둘로 줄었다** — 구 단위 꺾은선은
    연령 구성과 같은 표·같은 범위 자료라 "누가 사 가나" 갈래로 옮겼다
    (`TheDistrictVolumeSitsWithTheAges`가 그쪽을 고정한다).
    """

    def test_the_zoom_steps_are_in_order(self):
        src = _src(True)
        pins = re.findall(r'zoom-pin">(\d)</span>\s*([^<\n]+)', src)
        self.assertEqual([n for n, _ in pins], ["1", "2"])
        labels = [t.strip() for _, t in pins]
        self.assertIn("주변", labels[0])
        self.assertIn("동", labels[1])

    def test_each_step_says_what_range_it_covers(self):
        src = _src(True)
        for phrase in ("반경 300·500m", "같은 구 안에서"):
            self.assertIn(phrase, src, f"'{phrase}' 설명이 빠졌다")

    def test_the_ladder_points_at_where_the_district_line_went(self):
        """단계를 빼 놓고 말을 안 하면 "구 얘기는 어디 갔지"가 된다."""
        src = _src(True)
        lead = src[src.index("아래 둘은 다 거래량"):][:300]
        self.assertIn("누가 사 가나", lead)

    def test_the_ladder_explains_why_there_are_three(self):
        self.assertIn("보는 범위가 다릅니다", _src(True))

    def test_the_district_line_is_not_drawn_twice(self):
        """옮길 때 원본을 안 지우면 같은 그래프가 한 카드에 두 번 나온다."""
        self.assertEqual(_src(True).count("{{ nb.age.volume_line"), 1)

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


class TheDistrictVolumeSitsWithTheAges(unittest.TestCase):
    """72-38절 — 사용자 지적: *"요거는 구 관련 이야기니까 누가 사 가나
    서대문구 연령대 이야기랑 같이 있어야 하는 거 아닌감?"*

    맞다. 둘 다 `buyer_age_by_region.csv` 한 표에서 나오고 범위도 같은 구
    단위다. 거래량 사다리(반경·동)와는 출처도 범위도 다르다.
    """

    def _age_block(self):
        src = _src(True)
        i = src.index('👥 누가 사 가나 <span class="nb-sub">{{ nb.age.region')
        return src[i:src.index("{% elif result.buyer_age_missing %}", i)]

    def test_the_line_is_inside_the_age_block(self):
        self.assertIn("{{ nb.age.volume_line", self._age_block(),
                      "구 거래량 꺾은선이 연령대 갈래 밖에 있다")

    def test_it_is_not_in_the_zoom_ladder_any_more(self):
        src = _src(True)
        ladder = src[src.index("📊 얼마나 자주 팔리나"):src.index("📈 값이 오르는 동네인가")]
        self.assertNotIn("nb.age.volume_line", ladder)

    def test_it_says_how_this_district_compares_with_others(self):
        """숫자 하나(4,653건)만 던지면 많은 건지 적은 건지 알 수 없다."""
        block = self._age_block()
        for needle in ("vc.change_pct", "vc.sido_change_pct", "vc.vs_sido",
                       "vc.rank.rank", "vc.rank.total"):
            self.assertIn(needle, block, f"{needle} 비교가 화면에 없다")

    def test_it_admits_counts_are_not_comparable_across_districts(self):
        """구마다 인구가 달라 건수 자체로는 비교가 안 된다 — 밝혀야 한다."""
        block = self._age_block()
        self.assertIn("건수 자체는 비교가 안 되므로", block)
        # ⚠️ 주택유형 경고는 갈래 맨 아래에 **한 번만** 있어야 한다 —
        #    72-38절에서 꺾은선을 옮기며 같은 경고를 두 번 쓴 걸 고쳤다.
        self.assertEqual(block.count("전체 주택"), 1, "주택유형 경고가 중복된다")
