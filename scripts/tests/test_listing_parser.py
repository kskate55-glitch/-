"""
CLAUDE.md 33절 — scripts/listing_parser.py(28절/31절 붙여넣은 매물 파싱·
유사도 순위·가격 포지션) 단위 테스트.

실행: python3 -m unittest discover -s scripts/tests -v
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import listing_parser as lp  # noqa: E402


class ParsePricesTests(unittest.TestCase):
    def test_eok_and_man_combo(self):
        self.assertEqual(lp._parse_price_man("매매 3억 5,000"), 35000.0)

    def test_decimal_eok_notation(self):
        self.assertEqual(lp._parse_price_man("매매 3.6억"), 36000.0)

    def test_eok_with_comma_man_no_space(self):
        self.assertEqual(lp._parse_price_man("3억2,000만원"), 32000.0)

    def test_decimal_eok_does_not_swallow_next_lines_digits(self):
        # 회귀 테스트: "3.6억\n21평..." 에서 다음 줄의 "21"을 나머지(만원)로
        # 잘못 삼켜서 60021이 나오던 버그가 있었다
        text = "3.6억\n21평 5/5층"
        self.assertEqual(lp._parse_price_man(text), 36000.0)

    def test_man_only_notation(self):
        self.assertEqual(lp._parse_price_man("32,000만원"), 32000.0)

    def test_remainder_over_9999_is_ignored_as_misparse(self):
        # 억 뒤 나머지가 1억을 넘으면(잘못 잡힌 것) 무시하고 억 단위만 쓴다
        self.assertEqual(lp._parse_price_man("3억 99999"), 30000.0)

    def test_no_price_returns_none(self):
        self.assertIsNone(lp._parse_price_man("전용면적 69㎡ 4층"))


class ParseAreaTests(unittest.TestCase):
    def test_square_meter_notation(self):
        self.assertEqual(lp._parse_area("69.27㎡"), 69.27)

    def test_pyeong_converts_to_square_meters(self):
        self.assertAlmostEqual(lp._parse_area("21평"), 21 * 3.3058, places=2)

    def test_no_area_returns_none(self):
        self.assertIsNone(lp._parse_area("매매 3억"))


class ParseFloorTests(unittest.TestCase):
    def test_fraction_notation(self):
        self.assertEqual(lp._parse_floor("4/5층"), 4)

    def test_plain_floor(self):
        self.assertEqual(lp._parse_floor("3층"), 3)

    def test_basement_becomes_zero(self):
        self.assertEqual(lp._parse_floor("반지하"), 0)
        self.assertEqual(lp._parse_floor("지하1층"), 0)


class ParseListingsTests(unittest.TestCase):
    SAMPLE = """
행복빌라
매매 3억 5,000
69.27㎡, 4/5층
2012년 준공
방3 화장실2

한마음빌라
매매 3억2,000만원
68㎡ 3층

미소빌라
전세 2억
70㎡ 2층

늘봄빌라
매매 3.6억
21평 5/5층
2010년 건축

지하빌라
매매 2억8,000
70㎡ 반지하
"""

    def test_sale_listings_are_parsed(self):
        parsed, skipped = lp.parse_listings(self.SAMPLE)
        names = {p["name"] for p in parsed}
        self.assertIn("행복빌라", names)
        self.assertIn("한마음빌라", names)
        self.assertIn("늘봄빌라", names)
        self.assertIn("지하빌라", names)

    def test_jeonse_listing_is_excluded(self):
        parsed, skipped = lp.parse_listings(self.SAMPLE)
        names = {p["name"] for p in parsed}
        self.assertNotIn("미소빌라", names)
        self.assertGreaterEqual(skipped, 1)

    def test_prices_converted_correctly(self):
        parsed, _ = lp.parse_listings(self.SAMPLE)
        by_name = {p["name"]: p for p in parsed}
        self.assertEqual(by_name["행복빌라"]["price_man"], 35000.0)
        self.assertEqual(by_name["한마음빌라"]["price_man"], 32000.0)
        self.assertEqual(by_name["늘봄빌라"]["price_man"], 36000.0)
        self.assertEqual(by_name["지하빌라"]["price_man"], 28000.0)

    def test_basement_floor_parsed_as_zero(self):
        parsed, _ = lp.parse_listings(self.SAMPLE)
        by_name = {p["name"]: p for p in parsed}
        self.assertEqual(by_name["지하빌라"]["floor"], 0)

    def test_empty_text_returns_nothing(self):
        parsed, skipped = lp.parse_listings("")
        self.assertEqual(parsed, [])


class RankSimilarListingsTests(unittest.TestCase):
    def test_closer_spec_ranks_first(self):
        listings = [
            {"name": "먼매물", "price_man": 30000, "area": 90.0, "floor": 1, "build_year": 1995},
            {"name": "가까운매물", "price_man": 35000, "area": 69.5, "floor": 4, "build_year": 2012},
        ]
        ranked = lp.rank_similar_listings(listings, subject_area=69.27, subject_floor=4,
                                           subject_build_year=2012, top_n=20)
        self.assertEqual(ranked[0]["name"], "가까운매물")

    def test_top_n_limits_result_count(self):
        listings = [
            {"name": f"매물{i}", "price_man": 30000 + i, "area": 69.27, "floor": 4, "build_year": 2012}
            for i in range(30)
        ]
        ranked = lp.rank_similar_listings(listings, subject_area=69.27, top_n=5)
        self.assertEqual(len(ranked), 5)


class PriceRankAmongListingsTests(unittest.TestCase):
    def _listings(self):
        # 평당가(만원/㎡) = price_man / area, area는 전부 동일(69.27)해서
        # 평당가 순서 = 가격 순서와 같다
        return [
            {"name": "A", "price_man": 30000, "area": 69.27},
            {"name": "B", "price_man": 31000, "area": 69.27},
            {"name": "C", "price_man": 32000, "area": 69.27},
            {"name": "D", "price_man": 33000, "area": 69.27},
        ]

    def test_cheapest_price_gets_low_percentile(self):
        r = lp.price_rank_among_listings(self._listings(), subject_area=69.27,
                                          price_man=29000, area_tolerance_pct=0.15)
        self.assertEqual(r["cheaper_count"], 0)
        self.assertEqual(r["percentile"], 0)

    def test_most_expensive_price_gets_high_percentile(self):
        r = lp.price_rank_among_listings(self._listings(), subject_area=69.27,
                                          price_man=40000, area_tolerance_pct=0.15)
        self.assertEqual(r["percentile"], 100)

    def test_fewer_than_3_similar_listings_returns_none(self):
        listings = self._listings()[:2]
        r = lp.price_rank_among_listings(listings, subject_area=69.27,
                                          price_man=30000, area_tolerance_pct=0.15)
        self.assertIsNone(r)

    def test_dissimilar_area_listings_are_excluded(self):
        listings = self._listings() + [{"name": "딴평형", "price_man": 50000, "area": 120.0}]
        r = lp.price_rank_among_listings(listings, subject_area=69.27,
                                          price_man=30000, area_tolerance_pct=0.15)
        self.assertEqual(r["n"], 4)  # 딴평형은 허용범위 밖이라 제외됨


class TestSalePressure(unittest.TestCase):
    """CLAUDE.md 39절 — 경쟁매물 ÷ 최근 실거래 = 몇 개월치 물량인지."""

    def _listings(self, n, area=69.0):
        return [{"name": f"매물{i}", "price_man": 30000, "area": area} for i in range(n)]

    def test_months_of_supply_is_listings_over_monthly_deals(self):
        r = lp.sale_pressure(self._listings(14), 69.0, monthly_deal_avg=2 / 3)
        self.assertEqual(r["n_listings"], 14)
        self.assertEqual(r["months_of_supply"], 21.0)
        self.assertEqual(r["level"], "높음")

    def test_few_listings_in_an_active_market_is_low_pressure(self):
        r = lp.sale_pressure(self._listings(2), 69.0, monthly_deal_avg=8 / 3)
        self.assertLess(r["months_of_supply"], 2.0)
        self.assertEqual(r["level"], "낮음")

    def test_band_boundaries(self):
        # 월 1건 기준으로 매물 수가 곧 개월수가 된다
        self.assertEqual(lp.sale_pressure(self._listings(3), 69.0, 1.0)["level"], "보통")
        self.assertEqual(lp.sale_pressure(self._listings(5), 69.0, 1.0)["level"], "다소 높음")
        self.assertEqual(lp.sale_pressure(self._listings(9), 69.0, 1.0)["level"], "높음")

    def test_no_recent_deals_cannot_be_divided_but_still_reports(self):
        r = lp.sale_pressure(self._listings(5), 69.0, monthly_deal_avg=0)
        self.assertIsNone(r["months_of_supply"])
        self.assertEqual(r["level"], "판단 보류")

    def test_dissimilar_area_listings_are_not_counted_as_competitors(self):
        listings = self._listings(3) + self._listings(4, area=120.0)
        r = lp.sale_pressure(listings, 69.0, monthly_deal_avg=1.0)
        self.assertEqual(r["n_listings"], 3)

    def test_no_similar_listings_returns_none(self):
        self.assertIsNone(lp.sale_pressure(self._listings(3, area=120.0), 69.0, 1.0))


if __name__ == "__main__":
    unittest.main()


class TestLongPasteDoesNotHangTheServer(unittest.TestCase):
    """⚠️ 실제로 겪은 것: 숫자가 길게 이어진 한 줄을 붙여넣으면 파싱이
    **입력 길이의 제곱으로** 느려졌다(8천자 3.5초 · 2만자 20초). 정규식의
    `\\d+`가 끝이 열려 있어서 시작 위치마다 끝까지 갔다가 되돌아온 탓이다.

    공개 사이트에서는 이게 곧 **워커 하나를 묶는 수단**이 된다 — 누가
    일부러 하지 않아도, 표가 통째로 복사된 텍스트 한 번이면 걸린다.
    """

    def _elapsed(self, n):
        import time
        t0 = time.monotonic()
        lp.parse_listings("매매 " + "9" * n + "억 59.9㎡")
        return time.monotonic() - t0

    def test_a_very_long_line_finishes_quickly(self):
        # 옛 코드는 여기서 20초가 걸렸다. 넉넉하게 2초로 잡아도 충분히 잡힌다.
        self.assertLess(self._elapsed(20000), 2.0, "긴 줄에서 파서가 멈춰 선다")

    def test_it_grows_linearly_not_quadratically(self):
        """길이를 4배로 늘렸을 때 시간이 4배 근처면 선형, 16배면 제곱이다."""
        small, big = self._elapsed(2000), self._elapsed(8000)
        if small < 0.002:          # 너무 빨라 측정 잡음이 크면 상한만 본다
            self.assertLess(big, 0.5)
            return
        self.assertLess(big / small, 8.0, "길이에 제곱으로 느려지고 있다")

    def test_the_patterns_still_bound_their_digit_runs(self):
        """상한을 다시 열어두면 같은 사고가 난다 — 소스로 고정한다."""
        with open(lp.__file__, encoding="utf-8") as f:
            code = "\n".join(l.split("#")[0] for l in f if "re.compile" in l)
        self.assertNotIn(r"\d+", code, "끝이 열린 \\d+ 가 다시 들어왔다")

    def test_normal_pastes_still_parse_the_same(self):
        for text, want_price, want_area in [
            ("OO빌라\n매매 3억 5,000\n59.9㎡ 3층", 35000.0, 59.9),
            ("매매 32,000만원 59.9㎡", 32000.0, 59.9),
            ("매매 3.6억 18평", 36000.0, 59.5),
        ]:
            got, _ = lp.parse_listings(text)
            self.assertEqual(got[0]["price_man"], want_price, text)
            self.assertAlmostEqual(got[0]["area"], want_area, places=1, msg=text)


class TestTheEokRemainderIsNotJustAnyNumber(unittest.TestCase):
    """⚠️ 실제로 겪은 값 오류: `억` 뒤에 오는 **아무 숫자나** 만원 단위
    나머지로 삼켰다 — `3억 2012년 준공`이 3억 2,012만원(+2천만원),
    `3.6억 18평`이 3억 6,018만원으로 읽혔다. 붙여넣은 매물 한 건이
    2천만원 비싸게 잡히면 31절 가격 포지션·39절 매도압력이 통째로 흔들린다.
    """

    def _price(self, text):
        got, _ = lp.parse_listings(text)
        return got[0]["price_man"] if got else None

    def test_a_build_year_is_not_a_price_remainder(self):
        self.assertEqual(self._price("매매 3억 2012년 준공 59.9㎡"), 30000)

    def test_an_area_is_not_a_price_remainder(self):
        self.assertEqual(self._price("매매 3.6억 18평"), 36000)
        self.assertEqual(self._price("매매 3억 59.9㎡ 3층"), 30000)

    def test_a_comma_grouped_remainder_still_counts(self):
        for text in ("매매 3억 5,000 59.9㎡", "매매 3억 5,000만원 59.9㎡"):
            self.assertEqual(self._price(text), 35000, text)

    def test_a_remainder_followed_by_man_still_counts(self):
        for text in ("매매 3억5000만원 59.9㎡", "매매 3억 5000만 59.9㎡"):
            self.assertEqual(self._price(text), 35000, text)

    def test_a_bare_eok_is_unchanged(self):
        self.assertEqual(self._price("매매 3.6억 59.9㎡"), 36000)
