"""64절 — 1층 가격대 보정.

⚠️ 이 보정의 **첫 번째 계약**은 "화면에 뜨는 실제 체결가를 절대 안 바꾼다"이다.
국토부에 신고된 금액을 우리가 고쳐서 보여주면 그건 다른 종류의 사고다
(7-2절이 `_amount_man_adjusted`라는 별도 필드를 만든 이유와 같다).
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("KAKAO_REST_API_KEY", "test")

import estimate_price as ep  # noqa: E402
import geocode as geo  # noqa: E402

BASE = (37.60, 126.92)


def _row(i, floor, amount_man, area=55.0):
    return {"umdNm": "역촌동", "jibun": str(100 + i), "mhouseNm": f"빌라{i}",
            "dealYear": "2026", "dealMonth": "5", "dealDay": "10",
            "dealAmount": f"{amount_man:,}", "excluUseAr": f"{area:.2f}",
            "floor": str(floor), "buildYear": "2012", "sggCd": "11380"}


class FloorTestBase(unittest.TestCase):
    def setUp(self):
        self._real = geo.geocode
        # 전부 대상 물건과 같은 자리에 둬서 거리 영향을 없앤다
        geo.geocode = lambda addr, *a, **k: BASE

    def tearDown(self):
        geo.geocode = self._real

    def comps(self, rows, subject_floor):
        return ep.find_comparables(rows, BASE, 55.0, subject_floor, 2012,
                                   400, 2025, 2026, None, this_month=10)


class TestFactor(unittest.TestCase):
    """배율 자체 — 네트워크를 안 탄다."""

    def test_same_tier_is_untouched(self):
        self.assertEqual(ep.first_floor_price_factor(1, 1), 1.0)
        self.assertEqual(ep.first_floor_price_factor(3, 4), 1.0)

    def test_subject_on_first_floor_pulls_comparables_down(self):
        """대상이 1층이면 지상 중간층 거래를 '1층이었다면'으로 낮춘다."""
        self.assertEqual(ep.first_floor_price_factor(3, 1), ep.FIRST_FLOOR_PRICE_RATIO)
        self.assertLess(ep.first_floor_price_factor(3, 1), 1.0)

    def test_first_floor_comparable_is_lifted_for_a_higher_subject(self):
        f = ep.first_floor_price_factor(1, 3)
        self.assertGreater(f, 1.0)
        self.assertAlmostEqual(f, 1.0 / ep.FIRST_FLOOR_PRICE_RATIO)

    def test_the_two_directions_are_exact_inverses(self):
        """⚠️ 한쪽만 걸려 있으면 5절 반지하 버그와 같은 사고가 난다."""
        self.assertAlmostEqual(
            ep.first_floor_price_factor(3, 1) * ep.first_floor_price_factor(1, 3), 1.0)

    def test_basement_is_left_alone(self):
        """반지하는 5절이 이미 양방향 하드 제외한다 — 여기서 또 건드리지 않는다."""
        self.assertEqual(ep.first_floor_price_factor(0, 1), 1.0)
        self.assertEqual(ep.first_floor_price_factor(-1, -1), 1.0)
        self.assertEqual(ep.first_floor_price_factor(1, 0), 1.0)

    def test_unknown_floor_means_no_adjustment(self):
        """층을 모르면 5절처럼 계산은 그대로 되어야 한다."""
        self.assertEqual(ep.first_floor_price_factor(None, 1), 1.0)
        self.assertEqual(ep.first_floor_price_factor(1, None), 1.0)


class TestRealPriceIsNeverChanged(FloorTestBase):
    def test_reported_amount_stays_exactly_as_filed(self):
        """⚠️ 제일 중요한 계약 — 화면의 '핵심 비교거래'에는 신고된 금액 그대로."""
        rows = [_row(i, 3, 20000) for i in range(4)]
        for c in self.comps(rows, 1):
            self.assertEqual(c["_amount_man"], 20000)

    def test_input_rows_are_not_mutated(self):
        """7절 mutation-safety 회귀 — 같은 rows를 다시 써도 안전해야 한다."""
        rows = [_row(i, 3, 20000) for i in range(4)]
        self.comps(rows, 1)
        for r in rows:
            self.assertNotIn("_amount_man_adjusted", r)
            self.assertNotIn("_first_floor_factor", r)


class TestCalculationUsesTheAdjustedValue(FloorTestBase):
    def test_first_floor_subject_gets_a_lower_estimate(self):
        """지상층 거래만 있는 동네에서 1층 물건을 보면 값이 내려가야 한다."""
        rows = [_row(i, 3, 20000) for i in range(6)]
        high = ep.compute_scenarios(self.comps(rows, 3), 400, 2026, subject_area=55.0)
        low = ep.compute_scenarios(self.comps(rows, 1), 400, 2026, subject_area=55.0)
        self.assertLess(low["median"], high["median"])
        self.assertAlmostEqual(low["median"] / high["median"],
                               ep.FIRST_FLOOR_PRICE_RATIO, places=2)

    def test_first_floor_comparables_do_not_drag_a_third_floor_subject_down(self):
        """반대 방향 — 1층 거래가 섞였다고 3층 물건이 과소평가되면 안 된다."""
        cheap = int(20000 * ep.FIRST_FLOOR_PRICE_RATIO)
        mixed = [_row(i, 1, cheap) for i in range(3)] + [_row(10 + i, 3, 20000) for i in range(3)]
        only_high = [_row(10 + i, 3, 20000) for i in range(3)]
        got = ep.compute_scenarios(self.comps(mixed, 3), 400, 2026, subject_area=55.0)
        want = ep.compute_scenarios(self.comps(only_high, 3), 400, 2026, subject_area=55.0)
        self.assertAlmostEqual(got["median"] / want["median"], 1.0, places=1)


class TestComposesWithTimeCorrection(FloorTestBase):
    def test_both_corrections_multiply_instead_of_overwriting(self):
        """⚠️ 7-2절이 다시 켜지면 같은 필드를 쓴다 — 덮어쓰면 한쪽이 조용히 사라진다."""
        rows = [_row(i, 3, 20000) for i in range(4)]
        rate = -0.01     # 월 −1% 추세
        comps = ep.find_comparables(rows, BASE, 55.0, 1, 2012, 400, 2025, 2026, None,
                                    this_month=10, monthly_trend_rate=rate)
        for c in comps:
            time_factor = c["_time_correction_factor"]
            self.assertNotEqual(time_factor, 1.0)
            expected = c["_amount_man"] * time_factor * ep.FIRST_FLOOR_PRICE_RATIO
            self.assertAlmostEqual(c["_amount_man_adjusted"], expected, places=6)


class TestCoefficientStaysConservative(unittest.TestCase):
    def test_ratio_is_not_the_raw_point_estimate(self):
        """⚠️ 실측 점추정치(9%)가 아니라 민감도 분석으로 고른 7%다 —
        신뢰구간이 넓어([+0.4, +19.9]) 점추정치에 맞추면 48-2절 0.97처럼
        한 표본에 과적합된다."""
        discount = 1.0 - ep.FIRST_FLOOR_PRICE_RATIO
        self.assertGreater(discount, 0.03, "너무 작으면 고치는 의미가 없다")
        self.assertLess(discount, 0.09, "실측 점추정치(9%)보다는 보수적이어야 한다")


if __name__ == "__main__":
    unittest.main()
