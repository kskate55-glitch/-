"""
CLAUDE.md 33절 — scripts/estimate_price.py의 핵심 계산 함수(7~8절 가중치·
매도가 산출, 29~32절 확장) 단위 테스트.

실행:
    python3 -m unittest discover -s scripts/tests -v

이 프로젝트는 외부 라이브러리를 최소화하는 원칙(14절 등)이 있어, pytest
같은 추가 설치 없이 돌아가는 표준 라이브러리 unittest만 쓴다.

이 테스트는 "숫자가 맞게 나오는지"를 사람이 매번 눈으로 확인하는 대신
자동으로 확인해주는 안전망이다 — 실제로 이 테스트를 만드는 계기가 된
버그(30절 유동성 계산이 29절 유사도 점수를 덮어쓰던 문제, 아래
`test_find_comparables_does_not_mutate_input_rows`)가 실제로 있었다.
"""

import os
import re
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import estimate_price as ep  # noqa: E402


def _fake_row(name, jibun, area, floor, build_year, deal_year, deal_month, amount_man,
              umd="수유동", sgg="11305"):
    return {
        "umdNm": umd, "mhouseNm": name, "jibun": jibun, "buildYear": str(build_year),
        "excluUseAr": str(area), "dealYear": str(deal_year), "dealMonth": str(deal_month),
        "dealDay": "10", "dealAmount": f"{amount_man:,}", "floor": str(floor), "sggCd": sgg,
    }


class ToAmountManTests(unittest.TestCase):
    def test_parses_comma_separated_string(self):
        self.assertEqual(ep.to_amount_man("36,900"), 36900.0)

    def test_parses_plain_number_string(self):
        self.assertEqual(ep.to_amount_man("5000"), 5000.0)

    def test_returns_nan_for_garbage(self):
        self.assertTrue(ep.to_amount_man("모름") != ep.to_amount_man("모름"))  # NaN != NaN


class DedupeTests(unittest.TestCase):
    def test_removes_exact_duplicate_rows(self):
        row = _fake_row("A빌라", "1", 60, 3, 2010, 2025, 5, 30000)
        rows = [dict(row), dict(row), dict(row)]
        self.assertEqual(len(ep.dedupe(rows)), 1)

    def test_keeps_rows_that_differ_in_key_fields(self):
        r1 = _fake_row("A빌라", "1", 60, 3, 2010, 2025, 5, 30000)
        r2 = _fake_row("A빌라", "1", 60, 3, 2010, 2025, 5, 31000)  # 금액만 다름
        self.assertEqual(len(ep.dedupe([r1, r2])), 2)


class WeightForRecencyTests(unittest.TestCase):
    def test_within_3_months_gets_highest_weight(self):
        self.assertEqual(ep.weight_for_recency("2026", "9", 2026, 9), 1.6)
        self.assertEqual(ep.weight_for_recency("2026", "7", 2026, 9), 1.6)  # 딱 3개월 전

    def test_4_to_12_months_gets_mid_weight(self):
        self.assertEqual(ep.weight_for_recency("2026", "5", 2026, 9), 1.0)  # 4개월 전(3개월 초과)
        self.assertEqual(ep.weight_for_recency("2025", "9", 2026, 9), 1.0)  # 딱 12개월 전

    def test_over_12_months_gets_lowest_weight(self):
        self.assertEqual(ep.weight_for_recency("2025", "8", 2026, 9), 0.4)

    def test_garbage_input_falls_back_to_neutral(self):
        self.assertEqual(ep.weight_for_recency("모름", None, 2026, 9), 0.5)

    def test_future_month_defensively_treated_as_latest(self):
        # 데이터 이상치(미래 계약월)로 months_ago가 음수가 되는 경우 방어
        self.assertEqual(ep.weight_for_recency("2026", "12", 2026, 9), 1.6)


class SimilarityScoreTests(unittest.TestCase):
    def test_identical_spec_scores_100(self):
        s = ep.similarity_score(
            distance_m=0, radius_m=400, area=69.27, subject_area=69.27, area_tolerance_pct=0.15,
            floor=4, subject_floor=4, build_year=2012, subject_build_year=2012, build_year_tolerance=4,
        )
        self.assertAlmostEqual(s, 100.0)

    def test_boundary_of_radius_scores_near_zero_distance_component(self):
        # 거리만 반경 경계(가중치 0)로 두고 나머지는 완전 동일 —
        # 거리 비중(35%)만큼 100점에서 깎여야 한다
        s = ep.similarity_score(
            distance_m=400, radius_m=400, area=69.27, subject_area=69.27, area_tolerance_pct=0.15,
            floor=4, subject_floor=4, build_year=2012, subject_build_year=2012, build_year_tolerance=4,
        )
        self.assertAlmostEqual(s, 65.0)  # 100 - 35(거리 비중)

    def test_missing_build_year_redistributes_its_weight(self):
        # 준공년도 정보가 없으면 15% 몫이 거리/면적/층에 비례 배분되고,
        # 나머지가 전부 만점이면 여전히 100점이어야 한다
        s = ep.similarity_score(
            distance_m=0, radius_m=400, area=69.27, subject_area=69.27, area_tolerance_pct=0.15,
            floor=4, subject_floor=4, build_year=None, subject_build_year=None, build_year_tolerance=4,
        )
        self.assertAlmostEqual(s, 100.0)

    def test_dissimilar_comparable_scores_much_lower(self):
        s = ep.similarity_score(
            distance_m=380, radius_m=400, area=60.0, subject_area=69.27, area_tolerance_pct=0.15,
            floor=1, subject_floor=4, build_year=2009, subject_build_year=2012, build_year_tolerance=4,
        )
        self.assertLess(s, 60.0)


class SimilarityEmphasisCurveTests(unittest.TestCase):
    def test_high_score_weighted_much_more_than_low_score(self):
        high = ep.SIMILARITY_EMPHASIS_CURVE(90)
        low = ep.SIMILARITY_EMPHASIS_CURVE(60)
        self.assertGreater(high / low, 3.0)  # "90점을 60점보다 훨씬 크게 반영"

    def test_zero_and_hundred_are_boundary_correct(self):
        self.assertAlmostEqual(ep.SIMILARITY_EMPHASIS_CURVE(0), 0.0)
        self.assertAlmostEqual(ep.SIMILARITY_EMPHASIS_CURVE(100), 1.0)


class ComputeScenariosTests(unittest.TestCase):
    def _filtered(self):
        # _amount_man 오름차순: 10000, 20000, 30000, 40000, 50000 (가중치 전부 1)
        return [
            {"_amount_man": v, "_weight": 1.0, "_distance_m": 100.0, "dealYear": "2026"}
            for v in (10000, 20000, 30000, 40000, 50000)
        ]

    def test_median_and_percentiles(self):
        scen = ep.compute_scenarios(self._filtered(), radius_m=400, this_year=2026)
        self.assertEqual(scen["median"], 30000)
        self.assertLessEqual(scen["p25"], scen["median"])
        self.assertGreaterEqual(scen["p75"], scen["median"])
        self.assertEqual(scen["n_total"], 5)

    def test_higher_weight_pulls_median_toward_that_value(self):
        filtered = self._filtered()
        filtered[0]["_weight"] = 10.0  # 10000짜리를 압도적으로 크게 반영
        scen = ep.compute_scenarios(filtered, radius_m=400, this_year=2026)
        self.assertLess(scen["median"], 30000)  # 가중치 없을 때 중앙값(30000)보다 낮아져야 함

    def test_confidence_is_clamped_between_10_and_100(self):
        scen = ep.compute_scenarios(self._filtered(), radius_m=400, this_year=2026)
        self.assertGreaterEqual(scen["confidence"], 10)
        self.assertLessEqual(scen["confidence"], 100)


class UnitPriceModelBlendTests(unittest.TestCase):
    """CLAUDE.md 7-1절 — ㎡당가 모델을 총액 모델과 50:50 블렌딩하고, 두 모델이
    갈리면 model_divergence_pct로 시세 신뢰도를 깎는다."""

    def _filtered_with_area(self, amounts, area):
        return [
            {"_amount_man": v, "_weight": 1.0, "_distance_m": 100.0, "dealYear": "2026",
             "excluUseAr": str(area)}
            for v in amounts
        ]

    def test_defaults_to_total_model_only_when_subject_area_omitted(self):
        filtered = self._filtered_with_area((10000, 20000, 30000, 40000, 50000), 60)
        scen = ep.compute_scenarios(filtered, radius_m=400, this_year=2026)
        self.assertEqual(scen["median"], 30000)
        self.assertIsNone(scen["model_divergence_pct"])

    def test_unit_model_matches_total_model_when_areas_already_equal_subject(self):
        # 비교거래 면적이 전부 대상 물건 면적과 같으면, ㎡당가 모델로 환산해도
        # 총액 모델과 정확히 같은 값이 나와야 한다 (면적 정규화가 아무 영향을 안 줌).
        filtered = self._filtered_with_area((10000, 20000, 30000, 40000, 50000), 60)
        scen = ep.compute_scenarios(filtered, radius_m=400, this_year=2026, subject_area=60)
        self.assertEqual(scen["median"], 30000)
        self.assertAlmostEqual(scen["model_divergence_pct"], 0.0, places=6)

    def test_diverging_models_lower_confidence_more_than_matching_models(self):
        matching = self._filtered_with_area((28000, 29000, 30000, 31000, 32000), 60)
        diverging = [
            {"_amount_man": 28000, "_weight": 1.0, "_distance_m": 100.0, "dealYear": "2026", "excluUseAr": "50"},
            {"_amount_man": 29000, "_weight": 1.0, "_distance_m": 100.0, "dealYear": "2026", "excluUseAr": "52"},
            {"_amount_man": 30000, "_weight": 1.0, "_distance_m": 100.0, "dealYear": "2026", "excluUseAr": "55"},
            {"_amount_man": 31000, "_weight": 1.0, "_distance_m": 100.0, "dealYear": "2026", "excluUseAr": "58"},
            {"_amount_man": 50000, "_weight": 1.0, "_distance_m": 100.0, "dealYear": "2026", "excluUseAr": "90"},
        ]
        scen_matching = ep.compute_scenarios(matching, radius_m=400, this_year=2026, subject_area=60)
        scen_diverging = ep.compute_scenarios(diverging, radius_m=400, this_year=2026, subject_area=60)
        self.assertGreater(scen_diverging["model_divergence_pct"], scen_matching["model_divergence_pct"])
        self.assertLessEqual(scen_diverging["confidence"], scen_matching["confidence"])


class TimeSeriesPriceCorrectionTests(unittest.TestCase):
    """CLAUDE.md 7-2절 — 15절 가격 추이 시계열로 월평균 변동률을 추정한다."""

    def _rows_with_trend(self, pps_start, pps_step, months, dong="수유동"):
        rows = []
        for i in range(months):
            pps = pps_start + i * pps_step
            rows.append(_fake_row(f"빌라{i}", str(i), 60, 4, 2012, 2025, i + 1, round(pps * 60), umd=dong))
        return rows

    def test_returns_none_for_insufficient_months(self):
        rows = self._rows_with_trend(100, 2, 2)  # 2개월치뿐 -> 15절과 같은 최소 3개월 기준 미달
        self.assertIsNone(ep.estimate_monthly_trend_rate(rows, "수유동"))

    def test_positive_trend_rate_for_rising_prices(self):
        rows = self._rows_with_trend(100, 2, 6)  # 100 -> 110 만원/㎡, 6개월
        rate = ep.estimate_monthly_trend_rate(rows, "수유동")
        self.assertIsNotNone(rate)
        self.assertGreater(rate, 0)

    def test_negative_trend_rate_for_falling_prices(self):
        rows = self._rows_with_trend(110, -2, 6)  # 110 -> 100 만원/㎡
        rate = ep.estimate_monthly_trend_rate(rows, "수유동")
        self.assertLess(rate, 0)


class TimeCorrectionFactorTests(unittest.TestCase):
    """CLAUDE.md 7-2절 — 오래된 거래를 지금 시세 수준으로 환산하는 배율.
    외삽 상한(12개월)과 보정폭 clamp(±15%)를 검증한다."""

    def test_no_correction_for_recent_deal(self):
        self.assertEqual(ep.time_correction_factor("2026", "9", 2026, 9, 0.05), 1.0)

    def test_factor_clamped_to_max_pct(self):
        factor = ep.time_correction_factor("2020", "1", 2026, 9, 0.05)  # 매우 오래되고 변동률도 큼
        self.assertAlmostEqual(factor, 1 + ep.TIME_CORRECTION_MAX_PCT, places=6)

    def test_extrapolation_capped_at_max_months(self):
        # 12개월 전과 24개월 전은 같은 배율이어야 한다(그 이상은 더 외삽하지 않음)
        f12 = ep.time_correction_factor("2025", "9", 2026, 9, 0.01)
        f24 = ep.time_correction_factor("2024", "9", 2026, 9, 0.01)
        self.assertAlmostEqual(f12, f24, places=6)

    def test_garbage_deal_date_returns_no_correction(self):
        self.assertEqual(ep.time_correction_factor("모름", None, 2026, 9, 0.05), 1.0)


class FindComparablesTimeCorrectionTests(unittest.TestCase):
    """monthly_trend_rate를 주면 _amount_man_adjusted가 채워지고, 화면에 쓰이는
    _amount_man(실제 체결가)은 그대로 남는지 확인한다."""

    def test_adjusted_amount_set_when_trend_rate_given(self):
        with patch("geocode.geocode", return_value=(37.66, 127.02)):  # 대상과 약 1.1km 거리
            row = _fake_row("빌라", "1", 69.27, 4, 2012, 2025, 9, 35000)
            out = ep.find_comparables(
                [row], (37.65, 127.02), 69.27, 4, "2012", 2000, 2024, 2026, None,
                area_tolerance_pct=0.15, this_month=9, monthly_trend_rate=0.01,
            )
            self.assertEqual(out[0]["_amount_man"], 35000)  # 실제 체결가는 그대로
            expected_factor = ep.time_correction_factor("2025", "9", 2026, 9, 0.01)
            self.assertAlmostEqual(out[0]["_amount_man_adjusted"], 35000 * expected_factor, places=4)

    def test_no_adjusted_field_when_rate_omitted(self):
        with patch("geocode.geocode", return_value=(37.66, 127.02)):
            row = _fake_row("빌라", "1", 69.27, 4, 2012, 2025, 9, 35000)
            out = ep.find_comparables(
                [row], (37.65, 127.02), 69.27, 4, "2012", 2000, 2024, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertNotIn("_amount_man_adjusted", out[0])


class WeightedAmountsPreferAdjustedTests(unittest.TestCase):
    """7-1절/7-2절 계산이 공유하는 규칙 — _amount_man_adjusted가 있으면 그 값을,
    없으면 원래 _amount_man으로 폴백해서 가중 복제 리스트를 만든다."""

    def test_weighted_amounts_prefers_adjusted(self):
        filtered = [{"_amount_man": 100.0, "_amount_man_adjusted": 150.0, "_weight": 1.0}]
        self.assertEqual(set(ep._weighted_amounts_sorted(filtered)), {150.0})

    def test_weighted_amounts_falls_back_without_adjusted(self):
        filtered = [{"_amount_man": 100.0, "_weight": 1.0}]
        self.assertEqual(set(ep._weighted_amounts_sorted(filtered)), {100.0})

    def test_unit_price_model_prefers_adjusted(self):
        filtered = [{"_amount_man": 100.0, "_amount_man_adjusted": 150.0, "_weight": 1.0, "excluUseAr": "50"}]
        self.assertEqual(set(ep._weighted_unit_prices_sorted(filtered, subject_area=50)), {150.0})


class WeightReplicationScaleTests(unittest.TestCase):
    """7절 — 가중치가 복제 개수에 실제로 반영되는지.

    ⚠️ 이 클래스 전체가 실제로 겪은 버그의 회귀 테스트다. 예전 구현
    `max(1, round(weight))`은 실제 가중치 범위(대부분 0.05~1.6)에서 1.5 미만을
    전부 1개로 뭉개버려서, 유사도·최근성·직거래 다운웨이트·평당가 이상치
    다운웨이트·동일건물 보너스가 **전부 계산에 반영되지 않고 있었다**."""

    def test_higher_weight_gets_more_copies(self):
        strong = ep._replication_count(1.166)   # 유사도 90점 + 최근 3개월
        weak = ep._replication_count(0.216)     # 유사도 60점 + 4~12개월
        self.assertGreater(strong, weak * 4)

    def test_outlier_weight_is_actually_downweighted(self):
        base = 0.512
        self.assertGreater(
            ep._replication_count(base),
            ep._replication_count(base * ep.PRICE_OUTLIER_WEIGHT) * 10,
        )

    def test_direct_deal_downweight_survives_rounding(self):
        base = 0.512
        self.assertLess(
            ep._replication_count(base * ep.DEALING_TYPE_WEIGHT["직거래"]),
            ep._replication_count(base),
        )

    def test_same_building_bonus_survives_rounding(self):
        base = 0.343
        self.assertGreater(
            ep._replication_count(base * ep.SAME_BUILDING_BONUS),
            ep._replication_count(base),
        )

    def test_never_drops_below_one_copy(self):
        self.assertEqual(ep._replication_count(0.0), 1)
        self.assertEqual(ep._replication_count(0.0001), 1)

    def test_outliers_barely_move_the_median(self):
        """정상 7건 + 고가 이상치 4건이면 중앙값이 정상 구간 안에 있어야 한다.
        고치기 전에는 이상치가 정상 거래와 똑같이 1표씩 들어가 중앙값이
        위로 끌려 올라갔다."""
        def row(amount, outlier):
            weight = ep.SIMILARITY_EMPHASIS_CURVE(80)
            if outlier:
                weight *= ep.PRICE_OUTLIER_WEIGHT
            return {"_amount_man": float(amount), "_weight": weight, "excluUseAr": "45",
                    "_distance_m": 100.0, "dealYear": "2026", "dealMonth": "5"}

        normal = [15500, 16200, 16800, 17000, 17500, 18200, 19500]
        filtered = [row(a, False) for a in normal]
        filtered += [row(a, True) for a in (27400, 29500, 32000, 37300)]
        result = ep.compute_scenarios(filtered, 400, 2026, subject_area=45.0)
        self.assertLessEqual(result["median"], 17500)
        self.assertLessEqual(result["p75"], 19500)


class StationRegressionCorrectionTests(unittest.TestCase):
    """CLAUDE.md 7-3절 — 26절 회귀가 조건(표본·거리범위·R²·계수 방향)을 모두
    만족할 때만 참고용 보정 수치를 계산하고, 하나라도 안 맞으면 None이어야 한다."""

    GOOD_PREMIUM = {
        "n": 15, "min_distance": 100, "max_distance": 500, "r_squared": 0.5,
        "change_per_100m": -5.0, "avg_price_ppyeong": 1000, "mean_distance": 300,
    }

    def test_closer_than_average_gets_positive_correction(self):
        correction = ep.compute_distance_premium_correction(self.GOOD_PREMIUM, 100)
        self.assertIsNotNone(correction)
        self.assertGreater(correction["pct"], 0)

    def test_farther_than_average_gets_negative_correction(self):
        correction = ep.compute_distance_premium_correction(self.GOOD_PREMIUM, 500)
        self.assertLess(correction["pct"], 0)

    def test_none_premium_returns_none(self):
        self.assertIsNone(ep.compute_distance_premium_correction(None, 100))

    def test_insufficient_sample_returns_none(self):
        premium = {**self.GOOD_PREMIUM, "n": 10}
        self.assertIsNone(ep.compute_distance_premium_correction(premium, 100))

    def test_narrow_distance_spread_returns_none(self):
        premium = {**self.GOOD_PREMIUM, "max_distance": 320}
        self.assertIsNone(ep.compute_distance_premium_correction(premium, 100))

    def test_low_r_squared_returns_none(self):
        premium = {**self.GOOD_PREMIUM, "r_squared": 0.1}
        self.assertIsNone(ep.compute_distance_premium_correction(premium, 100))

    def test_counterintuitive_direction_returns_none(self):
        premium = {**self.GOOD_PREMIUM, "change_per_100m": 5.0}
        self.assertIsNone(ep.compute_distance_premium_correction(premium, 100))

    def test_correction_clamped_to_max_pct(self):
        extreme_premium = {**self.GOOD_PREMIUM, "change_per_100m": -500.0}
        correction = ep.compute_distance_premium_correction(extreme_premium, 100)
        self.assertAlmostEqual(correction["pct"], ep.STATION_REGRESSION_MAX_CORRECTION_PCT * 100, places=6)


class ComputePriceTiersTests(unittest.TestCase):
    def test_tiers_are_monotonically_nondecreasing(self):
        filtered = [
            {"_amount_man": v, "_weight": 1.0}
            for v in (25000, 28000, 30000, 31000, 33000, 36000, 38000)
        ]
        tiers = ep.compute_price_tiers(filtered)
        ordered = [tiers[k] for k in ("urgent", "d30", "d60", "normal", "test")]
        self.assertEqual(ordered, sorted(ordered))

    def test_labels_cover_all_five_tiers(self):
        self.assertEqual(set(ep.PRICE_TIER_LABELS.keys()), {"urgent", "d30", "d60", "normal", "test"})


class SpeedLabelForPercentileTests(unittest.TestCase):
    def test_low_percentile_is_fast(self):
        self.assertEqual(ep.speed_label_for_percentile(10), "빠른 소진 가능성 매우 높음")

    def test_high_percentile_is_slow(self):
        self.assertEqual(ep.speed_label_for_percentile(95), "장기화 가능성 큼")

    def test_active_liquidity_shifts_toward_faster(self):
        # 같은 퍼센타일(50, "정상 매도 구간" 근방)이라도 유동성이 활발하면
        # 더 빠른 등급으로 보정돼야 한다
        slow_liquidity = ep.speed_label_for_percentile(45, liquidity_monthly_avg=0.5)
        fast_liquidity = ep.speed_label_for_percentile(45, liquidity_monthly_avg=5.0)
        tiers_order = ["빠른 소진 가능성 매우 높음", "빠른 소진 가능성 높음",
                       "정상 매도 구간", "다소 느릴 수 있음", "장기화 가능성 큼"]
        self.assertLess(tiers_order.index(fast_liquidity), tiers_order.index(slow_liquidity))


class DescribeComparableSimilarityTests(unittest.TestCase):
    """사용자가 화면에서 직접 보고 "이해하기 너무 어렵다"고 지적해서, 상대
    차이(±N%, 신축/구축, 선호순위 등) 대신 절대값(면적㎡+평/층/준공년도)만
    단순하게 보여주는 방식으로 되돌렸다 — 그 단순화 결과를 검증한다."""

    def test_shows_area_in_sqm_and_pyeong(self):
        row = {"excluUseAr": "69.27", "floor": "4", "buildYear": "2012"}
        note = ep.describe_comparable_similarity(69.27, 4, "2012", row)
        self.assertIn("69.3㎡", note)
        self.assertIn("21.0평", note)

    def test_shows_plain_floor_number(self):
        row = {"excluUseAr": "69.27", "floor": "6", "buildYear": "2012"}
        note = ep.describe_comparable_similarity(69.27, 4, "2012", row)
        self.assertIn("6층", note)
        # 대상 물건과의 차이(+2 등)나 선호순위 같은 부가 판단은 더 이상 안 붙는다
        self.assertNotIn("+2", note)
        self.assertNotIn("선호순위", note)

    def test_shows_plain_build_year(self):
        row = {"excluUseAr": "69.27", "floor": "4", "buildYear": "2008"}
        note = ep.describe_comparable_similarity(69.27, 4, "2012", row)
        self.assertIn("2008년식", note)
        self.assertNotIn("차이", note)
        self.assertNotIn("신축", note)
        self.assertNotIn("구축", note)

    def test_banjiha_shown_as_plain_label(self):
        row = {"excluUseAr": "69.27", "floor": "0", "buildYear": "2012"}
        note = ep.describe_comparable_similarity(69.27, 0, "2012", row)
        self.assertIn("반지하", note)

    def test_missing_floor_info(self):
        row = {"excluUseAr": "69.27", "floor": "", "buildYear": "2012"}
        note = ep.describe_comparable_similarity(69.27, 4, "2012", row)
        self.assertIn("층 정보없음", note)

    def test_missing_area_and_buildyear_info(self):
        row = {"excluUseAr": "", "floor": "4", "buildYear": ""}
        note = ep.describe_comparable_similarity(69.27, 4, "2012", row)
        self.assertIn("면적 정보없음", note)
        self.assertIn("준공년도 정보없음", note)


class FindComparablesMutationSafetyTests(unittest.TestCase):
    """실제로 겪은 버그의 회귀 테스트: find_comparables()가 입력 rows의 dict를
    직접 고치면, 같은 rows를 다른 조건으로 다시 조회할 때(30절 유동성 등)
    먼저 계산해둔 _similarity_score/_weight가 덮어써진다."""

    def _rows(self):
        return [_fake_row("동일스펙빌라", "1", 69.27, 4, 2012, 2026, 9, 35000)]

    def test_second_call_does_not_corrupt_first_calls_results(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            rows = self._rows()
            first = ep.find_comparables(
                rows, (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, build_year_tolerance=4, this_month=9,
            )
            self.assertEqual(len(first), 1)
            self.assertAlmostEqual(first[0]["_similarity_score"], 100.0)

            # 30절 유동성처럼 floor/build_year 없이, 더 넓은 조건으로 같은 rows를 재조회
            ep.find_comparables(
                rows, (37.65, 127.02), 69.27, None, None, 500, 2024, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )

            # 먼저 만든 first 리스트의 값이 그대로 남아 있어야 한다
            self.assertAlmostEqual(first[0]["_similarity_score"], 100.0)

    def test_returned_rows_are_not_the_same_object_as_input(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            rows = self._rows()
            out = ep.find_comparables(
                rows, (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertIsNot(out[0], rows[0])
            self.assertNotIn("_similarity_score", rows[0])  # 원본은 안 건드려야 함


class FindComparablesFilteringTests(unittest.TestCase):
    def test_area_outside_tolerance_is_excluded(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            rows = [_fake_row("큰집빌라", "1", 90.0, 4, 2012, 2026, 9, 40000)]  # 69.27 대비 +30%
            out = ep.find_comparables(
                rows, (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertEqual(out, [])

    def test_basement_excluded_when_subject_is_above_ground(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            rows = [_fake_row("반지하빌라", "1", 69.27, 0, 2012, 2026, 9, 25000)]
            out = ep.find_comparables(
                rows, (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertEqual(out, [])

    def test_basement_included_when_subject_is_also_basement(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            rows = [_fake_row("반지하빌라", "1", 69.27, 0, 2012, 2026, 9, 25000)]
            out = ep.find_comparables(
                rows, (37.65, 127.02), 69.27, 0, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertEqual(len(out), 1)

    def test_cancelled_deal_is_excluded(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            row = _fake_row("해제빌라", "1", 69.27, 4, 2012, 2026, 9, 35000)
            row["cdealType"] = "해제"
            out = ep.find_comparables(
                [row], (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertEqual(out, [])


class DealingTypeWeightTests(unittest.TestCase):
    """GPT 조언 반영 — 직거래(dealingGbn)는 제외가 아니라 다운웨이트만 한다."""

    def test_jikgeorae_gets_downweighted_relative_to_junggae(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            row_junggae = _fake_row("중개빌라", "1", 69.27, 4, 2012, 2026, 9, 35000)
            row_junggae["dealingGbn"] = "중개거래"
            row_jikgeorae = _fake_row("직거래빌라", "2", 69.27, 4, 2012, 2026, 9, 35000)
            row_jikgeorae["dealingGbn"] = "직거래"

            out = ep.find_comparables(
                [row_junggae, row_jikgeorae], (37.65, 127.02), 69.27, 4, "2012", 400,
                2025, 2026, None, area_tolerance_pct=0.15, this_month=9,
            )
            by_name = {r["mhouseNm"]: r for r in out}
            ratio = by_name["직거래빌라"]["_weight"] / by_name["중개빌라"]["_weight"]
            self.assertAlmostEqual(ratio, ep.DEALING_TYPE_WEIGHT["직거래"], places=6)

    def test_unknown_or_missing_dealing_gbn_is_not_penalized(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            row = _fake_row("정보없는빌라", "1", 69.27, 4, 2012, 2026, 9, 35000)
            # dealingGbn 키 자체가 없음 — _fake_row 기본값
            out = ep.find_comparables(
                [row], (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            # 이 테스트의 mock geocode는 대상 좌표와 완전히 동일한 좌표를 돌려주므로
            # (거리 0m) 동일건물 보너스도 함께 곱해져야 한다.
            expected = (ep.weight_for_recency("2026", "9", 2026, 9) * ep.SIMILARITY_EMPHASIS_CURVE(100.0)
                        * ep.SAME_BUILDING_BONUS)
            self.assertAlmostEqual(out[0]["_weight"], expected, places=6)


class PriceOutlierDownweightTests(unittest.TestCase):
    """평당가 기준 median ± 3×MAD 밖인 거래는 제외가 아니라 가중치만 낮춘다."""

    def _rows_with_pps(self, pps_list):
        rows = []
        for i, pps in enumerate(pps_list):
            amount = round(pps * 60)  # area=60㎡ 고정
            rows.append(_fake_row(f"빌라{i}", str(i), 60, 4, 2012, 2026, 9, amount))
        return rows

    def test_far_outlier_is_downweighted_not_removed(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            # median=500, MAD=10(위 설계 계산) -> 임계값 30, 1500은 이상치
            rows = self._rows_with_pps([480, 495, 500, 510, 1500])
            out = ep.find_comparables(
                rows, (37.65, 127.02), 60, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertEqual(len(out), 5)  # 제외되지 않고 그대로 남아있어야 함
            by_amount = {round(r["_amount_man"]): r for r in out}
            outlier_row = by_amount[round(1500 * 60)]
            normal_row = by_amount[round(500 * 60)]
            self.assertTrue(outlier_row.get("_price_outlier"))
            self.assertFalse(normal_row.get("_price_outlier", False))
            ratio = outlier_row["_weight"] / normal_row["_weight"]
            self.assertAlmostEqual(ratio, ep.PRICE_OUTLIER_WEIGHT, places=6)

    def test_no_downweight_when_sample_too_small(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            # PRICE_OUTLIER_MIN_SAMPLE(5) 미만이면 이상치 판단 자체를 건너뜀
            rows = self._rows_with_pps([480, 500, 5000])
            out = ep.find_comparables(
                rows, (37.65, 127.02), 60, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertTrue(all(not r.get("_price_outlier") for r in out))


class FindComparablesAdaptiveTests(unittest.TestCase):
    """5절 확장 — 적응형 반경. 지정 반경 안에 표본이 부족하면 단계적으로 넓힌다."""

    NEAR_JIBUN = "near"
    FAR_JIBUN = "far"

    def _fake_geocode(self, address):
        # full_address()는 "...동 {jibun}" 형태라 끝부분으로 근/원거리를 구분한다.
        if address.endswith(self.FAR_JIBUN):
            return (37.65 + 0.00315, 127.02)  # 대상 좌표에서 약 350m
        return (37.65, 127.02)  # 대상 좌표와 동일(0m)

    def _rows(self, n_near, n_far):
        rows = []
        for i in range(n_near):
            rows.append(_fake_row(f"근접빌라{i}", f"{i}{self.NEAR_JIBUN}", 69.27, 4, 2012, 2026, 9, 35000))
        for i in range(n_far):
            rows.append(_fake_row(f"원거리빌라{i}", f"{i}{self.FAR_JIBUN}", 69.27, 4, 2012, 2026, 9, 35000))
        return rows

    def test_does_not_expand_when_base_radius_already_has_enough(self):
        with patch("geocode.geocode", side_effect=self._fake_geocode):
            rows = self._rows(n_near=3, n_far=5)  # 400m 안에 총 8건 (>= 최소 7건)
            out, radius, expanded = ep.find_comparables_adaptive(
                rows, (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertEqual(radius, 400)
            self.assertFalse(expanded)
            self.assertEqual(len(out), 8)

    def test_expands_when_base_radius_has_too_few(self):
        with patch("geocode.geocode", side_effect=self._fake_geocode):
            rows = self._rows(n_near=3, n_far=5)  # 200m 안엔 근접 3건뿐
            out, radius, expanded = ep.find_comparables_adaptive(
                rows, (37.65, 127.02), 69.27, 4, "2012", 200, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertTrue(expanded)
            self.assertEqual(radius, 400)  # 300m엔 여전히 못 미쳐서 400m까지 넓어짐
            self.assertEqual(len(out), 8)

    def test_never_tries_narrower_than_requested_radius(self):
        with patch("geocode.geocode", side_effect=self._fake_geocode):
            rows = self._rows(n_near=1, n_far=0)  # 어떤 반경에서도 표본 부족(최소 7건 못 채움)
            out, radius, expanded = ep.find_comparables_adaptive(
                rows, (37.65, 127.02), 69.27, 4, "2012", 500, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            # 500m보다 좁은 단계(200/300/400)는 시도하지 않고, 끝까지 못 채우면
            # 가장 넓은 단계(1000m)에서 멈춘다 — 그래도 지정한 500m 밑으로는 안 내려감
            self.assertEqual(radius, 1000)
            self.assertTrue(expanded)
            self.assertEqual(len(out), 1)


class SameBuildingBonusTests(unittest.TestCase):
    """GPT 조언 반영 — 좌표가 거의 겹치는(사실상 동일건물) 거래는 가중치를
    SAME_BUILDING_BONUS만큼 추가로 높인다."""

    def test_coincident_coordinate_gets_bonus_weight(self):
        with patch("geocode.geocode", return_value=(37.65, 127.02)):  # 대상과 동일 좌표 -> 거리 0m
            row = _fake_row("동일건물빌라", "1", 69.27, 4, 2012, 2026, 9, 35000)
            out = ep.find_comparables(
                [row], (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertTrue(out[0].get("_same_building"))
            expected = (ep.weight_for_recency("2026", "9", 2026, 9) * ep.SIMILARITY_EMPHASIS_CURVE(100.0)
                        * ep.SAME_BUILDING_BONUS)
            self.assertAlmostEqual(out[0]["_weight"], expected, places=6)

    def test_far_coordinate_gets_no_bonus(self):
        # 약 350m 떨어진 좌표 — SAME_BUILDING_DISTANCE_M(20m)보다 훨씬 멀다
        with patch("geocode.geocode", return_value=(37.65 + 0.00315, 127.02)):
            row = _fake_row("먼빌라", "1", 69.27, 4, 2012, 2026, 9, 35000)
            out = ep.find_comparables(
                [row], (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertFalse(out[0].get("_same_building", False))


class BuildVerdictModelDivergenceTests(unittest.TestCase):
    """32절 확장 — 모델 합의도(model_divergence_pct)가 크면 종합 판단 문단에
    엇갈림을 언급한다."""

    def test_large_divergence_is_mentioned(self):
        verdict = ep.build_verdict(80, 10, model_divergence_pct=20.0)
        self.assertIn("엇갈립니다", verdict)

    def test_small_divergence_is_not_mentioned(self):
        verdict = ep.build_verdict(80, 10, model_divergence_pct=1.0)
        self.assertNotIn("엇갈립니다", verdict)

    def test_none_divergence_is_not_mentioned(self):
        verdict = ep.build_verdict(80, 10, model_divergence_pct=None)
        self.assertNotIn("엇갈립니다", verdict)


class ComputeTerrainCheckTests(unittest.TestCase):
    """34절 — 산/하천 근접 참고(실험적)."""

    def test_finds_mountain_and_nearer_of_river_or_stream(self):
        def fake_nearby(lat, lon, keyword, radius_m=1000, name_suffix=None):
            if keyword == "산":
                return {"name": "북한산", "distance_m": 850}
            if keyword == "강":
                return {"name": "한강", "distance_m": 620}
            if keyword == "천":
                return {"name": "청계천", "distance_m": 400}
            return None

        with patch("geocode.nearby_place", side_effect=fake_nearby):
            t = ep.compute_terrain_check((37.65, 127.02))
            self.assertEqual(t["mountain"]["name"], "북한산")
            self.assertEqual(t["river"]["name"], "청계천")  # 강(620m)보다 천(400m)이 더 가까움

    def test_nothing_within_radius_returns_none_without_error(self):
        with patch("geocode.nearby_place", return_value=None):
            t = ep.compute_terrain_check((37.65, 127.02))
            self.assertIsNone(t["mountain"])
            self.assertIsNone(t["river"])
            self.assertIsNone(t["mountain_error"])

    def test_api_failure_is_reported_but_does_not_raise(self):
        with patch("geocode.nearby_place", side_effect=RuntimeError("키 미설정")):
            t = ep.compute_terrain_check((37.65, 127.02))  # 예외가 여기서 안 터져야 함
            self.assertIsNone(t["mountain"])
            self.assertIn("키 미설정", t["mountain_error"])


class TestConditionLadder(unittest.TestCase):
    """CLAUDE.md 38절 — 상태별 매도가 3단계 사다리."""

    def test_ladder_starts_at_current_condition_and_only_goes_up(self):
        rows = ep.compute_condition_ladder(15000, "노후")
        self.assertEqual([r["condition"] for r in rows], ["노후", "기본", "올수리"])
        self.assertTrue(rows[0]["is_current"])
        # 올수리 집이면 그 위가 없으니 한 줄만
        self.assertEqual([r["condition"] for r in ep.compute_condition_ladder(15000, "올수리")], ["올수리"])

    def test_prices_follow_the_multipliers_and_gains_are_vs_current(self):
        rows = ep.compute_condition_ladder(10000, "노후")
        by = {r["condition"]: r for r in rows}
        self.assertAlmostEqual(by["노후"]["price_man"], 9000, delta=10)
        self.assertAlmostEqual(by["기본"]["price_man"], 10000, delta=10)
        self.assertAlmostEqual(by["올수리"]["price_man"], 10800, delta=10)
        self.assertEqual(by["노후"]["gain_man"], 0)
        self.assertAlmostEqual(by["기본"]["gain_man"], 1000, delta=10)

    def test_repair_cost_turns_gain_into_net(self):
        rows = ep.compute_condition_ladder(10000, "노후", {"기본": 400, "올수리": 2500})
        by = {r["condition"]: r for r in rows}
        self.assertAlmostEqual(by["기본"]["net_man"], 600, delta=10)   # +1000 회수 − 400 공사비
        self.assertAlmostEqual(by["올수리"]["net_man"], -700, delta=10)  # +1800 회수 − 2500 공사비 → 손해
        self.assertIsNone(by["노후"]["net_man"])  # 현재 상태에는 공사비 개념이 없다

    def test_unknown_condition_returns_empty(self):
        self.assertEqual(ep.compute_condition_ladder(10000, "모름"), [])


class TestSalePressureVerdict(unittest.TestCase):
    """CLAUDE.md 39절 — 매도압력이 32절 종합 판단 문단에 들어가는지."""

    def test_pressure_sentence_is_added_when_months_known(self):
        v = ep.build_verdict(80, 12, sale_pressure={
            "n_listings": 14, "monthly_deal_avg": 0.7, "months_of_supply": 21.0,
            "level": "높음", "desc": "...",
        })
        self.assertIn("21.0개월치", v)
        self.assertIn("높음", v)

    def test_pressure_sentence_is_skipped_when_months_unknown(self):
        v = ep.build_verdict(80, 12, sale_pressure={
            "n_listings": 5, "monthly_deal_avg": 0.0, "months_of_supply": None,
            "level": "판단 보류", "desc": "...",
        })
        self.assertNotIn("개월치", v)


class TestMarketabilityReport(unittest.TestCase):
    """CLAUDE.md 41절 — 환금성·경쟁 진단(강의 기준 규칙 판정)."""

    def test_good_conditions_score_high(self):
        r = ep.build_marketability_report(
            floor=3, build_year=2018, this_year=2026, confidence=85,
            liquidity={"counts": {(500, 3): 12}}, building={"has_elevator": True})
        self.assertGreaterEqual(r["score"], 75)
        self.assertEqual(r["grade"], "환금성 좋은 편")
        self.assertEqual(r["weaknesses"], [])

    def test_bad_conditions_score_low_and_list_weaknesses(self):
        r = ep.build_marketability_report(
            floor=5, build_year=2012, this_year=2026, confidence=30,
            liquidity={"counts": {(500, 3): 1}}, building={"has_elevator": False},
            sale_pressure={"n_listings": 14, "monthly_deal_avg": 0.3,
                            "months_of_supply": 42.0, "level": "높음", "desc": ""},
            listing_summary={"percentile": 80, "n": 11})
        self.assertLess(r["score"], 50)
        self.assertIn("거래량", r["weaknesses"])
        self.assertIn("층·승강기", r["weaknesses"])

    def test_basement_floor_is_always_a_weakness(self):
        r = ep.build_marketability_report(floor=0, liquidity={"counts": {(500, 3): 30}})
        floor_item = next(i for i in r["items"] if i["key"] == "floor")
        self.assertEqual(floor_item["verdict"], "warn")

    def test_elevator_rescues_a_high_floor(self):
        with_elv = ep.build_marketability_report(floor=5, building={"has_elevator": True})
        without = ep.build_marketability_report(floor=5, building={"has_elevator": False})
        self.assertEqual(next(i for i in with_elv["items"] if i["key"] == "floor")["verdict"], "good")
        self.assertEqual(next(i for i in without["items"] if i["key"] == "floor")["verdict"], "warn")

    def test_competition_item_is_unknown_without_pasted_listings(self):
        r = ep.build_marketability_report(liquidity={"counts": {(500, 3): 9}})
        comp = next(i for i in r["items"] if i["key"] == "competition")
        self.assertEqual(comp["verdict"], "unknown")
        self.assertIn("붙여넣으면", comp["text"])

    def test_unknown_items_do_not_affect_the_score(self):
        """정보가 없어서 `unknown`인 항목은 감점도 가점도 아니다 —
        매물을 안 붙여넣었다고 점수가 깎이면 안 된다."""
        r = ep.build_marketability_report(floor=3, confidence=85)
        comp = next(i for i in r["items"] if i["key"] == "competition")
        self.assertEqual(comp["verdict"], "unknown")
        self.assertEqual(r["score"], 100)  # 층 good + 신뢰도 good만 반영


class TestFloorAndElevator(unittest.TestCase):
    """41절 층·승강기 항목 — 사용자 지적 반영분 고정.
    (1) 승강기 유무를 항상 문장에 쓴다, (2) 4층과 5층 이상을 가른다,
    (3) 건축물대장 지상층수로 탑층을 실제 확인한다."""

    def _item(self, floor, has_elevator=None, ground_floors=None, **extra):
        building = None
        if has_elevator is not None or ground_floors is not None:
            building = {"has_elevator": has_elevator, "ground_floors": ground_floors, **extra}
        r = ep.build_marketability_report(floor=floor, building=building)
        return next(i for i in r["items"] if i["key"] == "floor")

    def test_elevator_is_always_stated(self):
        self.assertIn("승강기가 있어", self._item(3, True)["text"])
        self.assertIn("승강기가 없어", self._item(3, False)["text"])
        self.assertIn("확인하지 못했어요", self._item(3)["text"])

    def test_fourth_floor_without_elevator_is_only_ok(self):
        """예전엔 4층 이상 승강기 없음을 전부 warn으로 묶었다 — 사용자가
        "4층은 무난하거나 조금 나쁜 편"이라고 해서 5층 이상과 갈랐다."""
        item = self._item(4, False)
        self.assertEqual(item["verdict"], "ok")
        self.assertIn("무난하거나 조금 나쁜 편", item["text"])

    def test_fifth_floor_without_elevator_stays_warn(self):
        self.assertEqual(self._item(5, False)["verdict"], "warn")

    def test_elevator_still_rescues_high_floors(self):
        self.assertEqual(self._item(5, True)["verdict"], "good")

    def test_top_floor_is_detected_from_the_register(self):
        item = self._item(5, True, ground_floors=5)
        self.assertIn("탑층", item["text"])
        self.assertIn("옥상", item["text"])  # 무엇을 보고 와야 하는지까지 말해준다
        self.assertEqual(item["verdict"], "ok")  # good에서 한 단계 내려온다

    def test_not_top_floor_is_stated_explicitly(self):
        """탑층이 아니면 조용히 넘어가지 않고 '탑층은 아니다'라고 밝힌다 —
        건축물대장을 봤다는 사실 자체가 정보이기 때문."""
        item = self._item(3, True, ground_floors=5)
        self.assertIn("탑층은 아니", item["text"])
        self.assertEqual(item["verdict"], "good")  # 판정은 그대로다

    def test_register_facts_ride_along_with_the_floor_item(self):
        """건축물대장 사실(승강기·층수·세대수·사용승인일)이 층·승강기 항목
        안에 함께 실린다 — 예전엔 페이지 맨 아래 별도 카드였다."""
        item = self._item(4, False, ground_floors=5,
                          household_count="8", approval_date="20141112")
        facts = " · ".join(item["facts"])
        self.assertIn("승강기 없음", facts)
        self.assertIn("지상 5층 건물의 4층", facts)
        self.assertIn("8세대", facts)
        self.assertIn("사용승인 2014.11.12", facts)
        self.assertTrue(any("위반건축물" in n for n in item["notes"]))

    def test_no_register_means_no_facts(self):
        """건축물대장 조회에 실패하면 사실 줄도 위반건축물 안내도 안 붙인다."""
        item = ep.build_marketability_report(floor=4, building=None)["items"][0]
        self.assertEqual(item["key"], "floor")
        self.assertIsNone(item["facts"])
        self.assertIsNone(item["notes"])

    def test_single_storey_building_is_not_called_a_top_floor(self):
        """지상 1층짜리 건물에 1층이면 '탑층'이라는 말 자체가 의미 없다."""
        self.assertNotIn("탑층", self._item(1, False, ground_floors=1)["text"])

    def test_unreadable_ground_floor_value_is_ignored(self):
        """건축물대장 값은 문자열로 오고 빈 값·'-'도 섞인다 — 못 읽으면
        탑층 판정을 조용히 건너뛰고 나머지 판정은 그대로 나와야 한다."""
        for bad in ("", "-", None, "미상"):
            item = self._item(5, True, ground_floors=bad)
            self.assertNotIn("탑층", item["text"])
            self.assertEqual(item["verdict"], "good")

    def test_ground_floors_as_string_still_works(self):
        self.assertIn("탑층", self._item(5, True, ground_floors="5")["text"])


class TestLocationKeywords(unittest.TestCase):
    """19절 — 입지 체크를 10개(4갈래)로 늘렸지만, 45절 환금성 판정에 쓰이는
    항목은 여전히 지하철역·초등학교 둘뿐이어야 한다."""

    def test_groups_cover_every_keyword_exactly_once(self):
        flat = [kw for _n, _i, items in ep.LOCATION_GROUPS for kw, _lb in items]
        self.assertEqual(flat, [kw for kw, _lb in ep.LOCATION_KEYWORDS])
        self.assertEqual(len(flat), len(set(flat)))

    def test_only_station_and_school_are_scored(self):
        self.assertEqual(set(ep.LOCATION_SCORED), {"지하철역", "초등학교"})
        for kw in ep.LOCATION_SCORED:
            self.assertIn(kw, [k for k, _lb in ep.LOCATION_KEYWORDS])

    def test_extra_facilities_do_not_change_the_transit_verdict(self):
        """편의점·병원이 코앞이어도 역·학교가 멀면 판정은 그대로 warn이다 —
        추가 시설은 화면 참고용이지 점수 항목이 아니다."""
        def report(extras_near):
            loc = {}
            for kw, _lb in ep.LOCATION_KEYWORDS:
                far = {"name": "멀리", "distance_m": 1400}
                near = {"name": "코앞", "distance_m": 50}
                loc[kw] = {"place": (far if kw in ep.LOCATION_SCORED
                                     else (near if extras_near else far)), "error": None}
            r = ep.build_marketability_report(location=loc)
            return next(i for i in r["items"] if i["key"] == "transit_school")["verdict"]
        self.assertEqual(report(True), report(False))


class TestBuildYearScoring(unittest.TestCase):
    """41절 — 사용자 요청으로 연식이 참고 안내(`info`)에서 실제 감점
    항목으로 바뀌었다: "완전 구축이면 그것도 디버프 요소로 넣어줘"."""

    def _verdict(self, build_year, this_year=2026):
        r = ep.build_marketability_report(build_year=build_year, this_year=this_year)
        return next(i for i in r["items"] if i["key"] == "build_year")["verdict"]

    def test_recent_build_is_good(self):
        self.assertEqual(self._verdict(2026 - ep.BUILD_AGE_NEW_MAX), "good")

    def test_middle_aged_is_ok(self):
        self.assertEqual(self._verdict(2026 - ep.BUILD_AGE_NEW_MAX - 1), "ok")
        self.assertEqual(self._verdict(2026 - ep.BUILD_AGE_OK_MAX), "ok")

    def test_very_old_is_a_penalty(self):
        self.assertEqual(self._verdict(2026 - ep.BUILD_AGE_OK_MAX - 1), "warn")
        item_text = next(
            i for i in ep.build_marketability_report(build_year=1985, this_year=2026)["items"]
            if i["key"] == "build_year")["text"]
        self.assertIn("완전 구축", item_text)

    def test_old_build_actually_lowers_the_score(self):
        new = ep.build_marketability_report(floor=3, confidence=85, build_year=2020, this_year=2026)
        old = ep.build_marketability_report(floor=3, confidence=85, build_year=1985, this_year=2026)
        self.assertLess(old["score"], new["score"])
        self.assertIn("연식", " · ".join(old["weaknesses"]))

    def test_unknown_build_year_is_skipped_entirely(self):
        r = ep.build_marketability_report(floor=3, confidence=85)
        self.assertNotIn("build_year", [i["key"] for i in r["items"]])

    def test_no_inputs_yields_no_score(self):
        r = ep.build_marketability_report()
        self.assertIsNone(r["score"])
        self.assertEqual(r["grade"], "판단 보류")


class TestNormalizeDealingGbn(unittest.TestCase):
    """5절 — 실측으로 확인 못 한 필드라 완전 일치 대신 느슨하게 판정한다."""

    def test_exact_values(self):
        self.assertEqual(ep.normalize_dealing_gbn("직거래"), "직거래")
        self.assertEqual(ep.normalize_dealing_gbn("중개거래"), "중개거래")

    def test_surrounding_noise_is_tolerated(self):
        self.assertEqual(ep.normalize_dealing_gbn(" 직거래 "), "직거래")
        self.assertEqual(ep.normalize_dealing_gbn("중개거래(법인)"), "중개거래")

    def test_empty_or_unknown_is_none(self):
        for v in ("", None, "기타"):
            self.assertIsNone(ep.normalize_dealing_gbn(v))


class TestMarketabilityOrdering(unittest.TestCase):
    """41절 — 항목은 중요한 순서로 나오고 1부터 순번이 붙는다.
    앞쪽이 물건 자체 속성(가격·층·입지·임장·연식), 뒤쪽이 시장 지표다."""

    def _report(self):
        return ep.build_marketability_report(
            floor=5, build_year=2012, this_year=2026, confidence=78,
            liquidity={"counts": {(500, 3): 2}}, building={"has_elevator": False},
            sale_pressure={"n_listings": 14, "monthly_deal_avg": 0.7,
                            "months_of_supply": 21.0, "level": "높음", "desc": ""},
            listing_summary={"percentile": 72, "n": 11})

    def test_items_follow_the_lecture_priority_order(self):
        keys = [i["key"] for i in self._report()["items"]]
        self.assertEqual(keys, ["price_position", "floor", "inspection", "build_year",
                                 "volume", "competition", "confidence"])

    def test_ranks_are_sequential(self):
        items = self._report()["items"]
        self.assertEqual([i["rank"] for i in items], [1, 2, 3, 4, 5, 6, 7])

    def test_every_item_carries_a_korean_verdict_label(self):
        for item in self._report()["items"]:
            self.assertIn(item["verdict_label"], ep.MARKETABILITY_VERDICT_LABELS.values())

    def test_order_holds_even_when_some_items_are_missing(self):
        # 매물을 안 붙여넣으면 가격 위치 항목이 빠지는데, 남은 항목의 순서와
        # 번호는 그대로 1부터 이어져야 한다.
        r = ep.build_marketability_report(floor=3, confidence=80,
                                           liquidity={"counts": {(500, 3): 9}})
        keys = [i["key"] for i in r["items"]]
        self.assertEqual(keys, ["floor", "inspection", "volume", "competition", "confidence"])
        self.assertEqual([i["rank"] for i in r["items"]], [1, 2, 3, 4, 5])

    def test_unknown_items_still_get_a_number(self):
        """`unknown`(매물 미입력 시 경쟁 항목)은 점수에서만 빠지고 번호는 받는다."""
        items = ep.build_marketability_report(floor=3, confidence=80)["items"]
        comp = next(i for i in items if i["key"] == "competition")
        self.assertEqual(comp["verdict"], "unknown")
        self.assertIsNotNone(comp["rank"])


class TestInspectionScoring(unittest.TestCase):
    """CLAUDE.md 43절 — 임장에서 체크한 항목이 41절 환금성 점수에 반영된다."""

    def _item(self, **kw):
        r = ep.build_marketability_report(floor=3, confidence=80,
                                           liquidity={"counts": {(500, 3): 9}}, **kw)
        return next(i for i in r["items"] if i["key"] == "inspection"), r

    def test_nothing_entered_is_unknown_and_does_not_score(self):
        item, r = self._item()
        clean_item, clean = self._item(inspection_clean=True)
        self.assertEqual(item["verdict"], "unknown")
        # unknown은 점수에서 빠지므로, 전부 good인 표본에서는 둘이 같은 점수여야 한다
        self.assertEqual(r["score"], clean["score"])

    def test_clean_inspection_counts_as_good(self):
        item, _ = self._item(inspection_clean=True)
        self.assertEqual(item["verdict"], "good")

    def test_one_bad_item_is_ok_two_or_more_is_warn(self):
        self.assertEqual(self._item(inspection_bad=["누수"])[0]["verdict"], "ok")
        self.assertEqual(self._item(inspection_bad=["누수", "경사"])[0]["verdict"], "warn")

    def test_bad_items_lower_the_score_and_show_up_as_a_weakness(self):
        _, clean = self._item(inspection_clean=True)
        item, bad = self._item(inspection_bad=["누수", "경사", "주차"])
        self.assertLess(bad["score"], clean["score"])
        self.assertIn("임장 체크", bad["weaknesses"])
        for label in ("누수", "경사", "주차"):
            self.assertIn(label, item["text"])

    def test_clean_flag_is_ignored_when_bad_items_are_also_given(self):
        # 폼에서 "문제 없음"과 개별 항목이 같이 체크되는 모순 상황 — 개별
        # 항목(더 구체적인 정보)을 따른다.
        item, _ = self._item(inspection_bad=["누수"], inspection_clean=True)
        self.assertEqual(item["verdict"], "ok")


class TestAptGap(unittest.TestCase):
    """CLAUDE.md 40절 — 인근 아파트 대비 가격비율. **비율이 낮을수록(갭이
    클수록) 좋다** — 아파트를 사려다 예산이 모자라 내려오는 수요가 두껍고,
    키 맞추기 상승 여력도 남는다는 현업 경험칙을 옮긴 것이다."""

    def _apt(self, n=8, area="84.9", base=92000, dong="수유동", year="2026"):
        return [{"umdNm": dong, "excluUseAr": area, "dealAmount": f"{base + i * 1500:,}",
                 "dealYear": year, "dealMonth": "3"} for i in range(n)]

    def test_big_gap_is_good_small_gap_is_warn(self):
        apt = self._apt()
        cheap = ep.compute_apt_gap(apt, "수유동", 69.27, 22500, 2026, 2025)
        mid = ep.compute_apt_gap(apt, "수유동", 69.27, 40000, 2026, 2025)
        pricey = ep.compute_apt_gap(apt, "수유동", 69.27, 65000, 2026, 2025)
        self.assertEqual(cheap["verdict"], "good")
        self.assertEqual(mid["verdict"], "good")
        self.assertEqual(pricey["verdict"], "warn")
        self.assertGreater(cheap["gap_pct"], pricey["gap_pct"])

    def test_ratio_is_unit_price_based_not_total_price(self):
        # 빌라(69.27㎡)와 아파트(84.9㎡)는 면적이 달라 총액 비교는 왜곡된다.
        g = ep.compute_apt_gap(self._apt(), "수유동", 69.27, 22500, 2026, 2025)
        self.assertAlmostEqual(g["villa_unit_price"], round(22500 / 69.27), delta=1)
        self.assertAlmostEqual(g["ratio"], g["villa_unit_price"] / g["apt_unit_price"], places=2)

    def test_too_few_apartments_returns_none(self):
        self.assertIsNone(ep.compute_apt_gap(self._apt(n=ep.APT_GAP_MIN_SAMPLE - 1),
                                              "수유동", 69.27, 22500, 2026, 2025))

    def test_other_dong_and_cancelled_and_old_deals_are_excluded(self):
        apt = self._apt(n=6)
        apt += [{"umdNm": "딴동네", "excluUseAr": "84.9", "dealAmount": "10,000",
                 "dealYear": "2026", "dealMonth": "3"}] * 20
        apt += [dict(r, cdealType="해제") for r in self._apt(n=20, base=10000)]
        apt += [dict(r, dealYear="2019") for r in self._apt(n=20, base=10000)]
        g = ep.compute_apt_gap(apt, "수유동", 69.27, 22500, 2026, 2025)
        self.assertEqual(g["n"], 6)  # 같은 동·해제 아님·기준연도 이후인 6건만

    def test_area_tolerance_is_wider_than_the_villa_rule(self):
        # 빌라 69.27㎡ 기준 ±30%면 48~90㎡ — 84.9㎡ 아파트가 들어와야 한다.
        self.assertIsNotNone(ep.compute_apt_gap(self._apt(), "수유동", 69.27, 22500, 2026, 2025))
        # ±15%(8절 기본값)로 좁히면 84.9㎡는 빠져서 표본이 0이 된다.
        self.assertIsNone(ep.compute_apt_gap(self._apt(), "수유동", 69.27, 22500,
                                              2026, 2025, area_tolerance_pct=0.15))

    # ── 인접 동 폴백 (구 전체가 아니다) ──────────────────────────────
    _COORDS = {"수유동": (37.638, 127.025),   # 대상 동
               "미아동": (37.628, 127.030),   # 약 1.2km — 인접
               "번동": (37.500, 127.200)}     # 아주 멀다

    def _with_geocode(self):
        from unittest.mock import patch
        return (patch("geocode.geocode", side_effect=lambda a: self._COORDS.get(a.split()[-1])),
                patch("lawd_lookup.sido_name", return_value="서울특별시"),
                patch("lawd_lookup.gu_name", return_value="강북구"))

    def _mixed_rows(self):
        rows = [dict(r, sggCd="11305") for r in self._apt(n=2)]
        rows += [dict(r, umdNm="미아동", sggCd="11305") for r in self._apt(n=10)]
        rows += [dict(r, umdNm="번동", sggCd="11305") for r in self._apt(n=30)]
        return rows

    def test_falls_back_to_adjacent_dongs_only_not_the_whole_gu(self):
        g1, g2, g3 = self._with_geocode()
        with g1, g2, g3:
            g = ep.compute_apt_gap(self._mixed_rows(), "수유동", 69.27, 22500, 2026, 2025,
                                    subject_coord=self._COORDS["수유동"])
        self.assertTrue(g["widened"])
        self.assertEqual(g["nearby_dongs"], ["미아동"])   # 먼 번동은 빠진다
        self.assertEqual(g["n"], 12)                       # 수유 2 + 미아 10
        self.assertIn("인접", g["dong"])

    def test_no_fallback_without_subject_coordinates(self):
        # 좌표가 없으면 인접 여부를 알 수 없으므로 넓히지 않는다(구 전체로도 안 간다)
        self.assertIsNone(ep.compute_apt_gap(self._mixed_rows(), "수유동", 69.27,
                                              22500, 2026, 2025))

    def test_no_fallback_when_the_dong_already_has_enough(self):
        rows = [dict(r, sggCd="11305") for r in self._apt(n=8)]
        rows += [dict(r, umdNm="미아동", sggCd="11305") for r in self._apt(n=10)]
        g1, g2, g3 = self._with_geocode()
        with g1, g2, g3:
            g = ep.compute_apt_gap(rows, "수유동", 69.27, 22500, 2026, 2025,
                                    subject_coord=self._COORDS["수유동"])
        self.assertFalse(g["widened"])
        self.assertEqual(g["n"], 8)

    def test_fallback_stays_inside_the_target_gu(self):
        # 다른 구 아파트는 좌표가 가까워도 섞이면 안 된다(행정구역이 다르다)
        rows = [dict(r, sggCd="11305") for r in self._apt(n=2)]
        rows += [dict(r, umdNm="미아동", sggCd="11380") for r in self._apt(n=30)]
        g1, g2, g3 = self._with_geocode()
        with g1, g2, g3:
            self.assertIsNone(ep.compute_apt_gap(rows, "수유동", 69.27, 22500, 2026, 2025,
                                                  subject_coord=self._COORDS["수유동"]))

    def test_geocode_failure_on_a_dong_skips_it_quietly(self):
        from unittest.mock import patch
        rows = self._mixed_rows()
        with patch("geocode.geocode", return_value=None), \
             patch("lawd_lookup.sido_name", return_value="서울특별시"), \
             patch("lawd_lookup.gu_name", return_value="강북구"):
            self.assertIsNone(ep.compute_apt_gap(rows, "수유동", 69.27, 22500, 2026, 2025,
                                                  subject_coord=self._COORDS["수유동"]))

    def test_report_places_apt_gap_last_among_scored_items(self):
        """사용자 지적 반영 — 인근 아파트 대비는 "경매 단타용으로는 그렇게까지
        중한 게 아닌 참고치"라 판정 항목 중 **맨 뒤**로 내렸다. 판정 없는
        참고 항목(연식)보다는 앞이다."""
        g = ep.compute_apt_gap(self._apt(), "수유동", 69.27, 22500, 2026, 2025)
        r = ep.build_marketability_report(floor=3, confidence=80, apt_gap=g, build_year=2012,
                                           this_year=2026,
                                           listing_summary={"percentile": 20, "n": 5})
        keys = [i["key"] for i in r["items"]]
        self.assertEqual(keys[0], "price_position")
        self.assertEqual(keys[-1], "apt_gap")

    def test_apt_gap_text_flags_it_as_a_long_hold_signal(self):
        """갭이 크다는 건 "지금 당장 빨리 팔린다"가 아니라 "수요층이 두껍고
        키 맞추기 여력이 남았다"는 뜻이라, 중·장기 신호라는 걸 문장에 밝힌다."""
        g = ep.compute_apt_gap(self._apt(), "수유동", 69.27, 22500, 2026, 2025)
        r = ep.build_marketability_report(apt_gap=g)
        item = next(i for i in r["items"] if i["key"] == "apt_gap")
        self.assertIn("중·장기", item["text"])
        self.assertIn("중·장기", item["label"])


class TestTransitSchoolItem(unittest.TestCase):
    """CLAUDE.md 45절 — 역세권·학세권 판정. 19절 입지 체크가 이미 구해둔
    거리를 판정으로만 옮기므로 추가 API 호출은 없다."""

    def _loc(self, station_m=None, school_m=None, error=None):
        def cell(d):
            return {"place": ({"name": "테스트", "distance_m": d} if d is not None else None),
                    "error": error}
        return {"지하철역": cell(station_m), "초등학교": cell(school_m)}

    def _verdict(self, **kw):
        r = ep.build_marketability_report(floor=3, location=self._loc(**kw))
        return next(i for i in r["items"] if i["key"] == "transit_school")

    def test_both_close_is_good(self):
        self.assertEqual(self._verdict(station_m=350, school_m=280)["verdict"], "good")

    def test_one_close_one_far_is_ok(self):
        # 역 700m(2점) + 초등학교 없음(0점) = 2점 → 보통
        self.assertEqual(self._verdict(station_m=700)["verdict"], "ok")

    def test_both_far_is_warn(self):
        self.assertEqual(self._verdict(station_m=1400, school_m=1400)["verdict"], "warn")
        self.assertEqual(self._verdict()["verdict"], "warn")

    def test_boundary_distances(self):
        self.assertEqual(self._verdict(station_m=ep.STATION_NEAR_M, school_m=ep.SCHOOL_NEAR_M)["verdict"], "good")
        # 역 801m(1점) + 초 501m(1점) = 2점 → 보통
        self.assertEqual(self._verdict(station_m=ep.STATION_NEAR_M + 1,
                                        school_m=ep.SCHOOL_NEAR_M + 1)["verdict"], "ok")

    def test_lookup_failure_is_unknown_not_a_penalty(self):
        self.assertEqual(self._verdict(error="키 미설정")["verdict"], "unknown")

    def test_item_sits_right_after_floor(self):
        r = ep.build_marketability_report(floor=3, location=self._loc(350, 280))
        keys = [i["key"] for i in r["items"]]
        self.assertEqual(keys[keys.index("floor") + 1], "transit_school")


if __name__ == "__main__":
    unittest.main()


class TestInspectionChecklistLabels(unittest.TestCase):
    """43절 — 체크리스트 항목명이 '나쁜 상태'를 서술하는지, 승강기가 빠졌는지."""

    def test_elevator_is_not_in_the_checklist(self):
        """승강기는 20절 건축물대장으로 자동 판정되므로 임장 체크에서 뺐다 —
        남겨두면 한 요소로 두 번 감점된다."""
        self.assertNotIn("엘리베이터", ep.INSPECTION_CHECKLIST)
        self.assertNotIn("elevator", [k for k, _ in ep.INSPECTION_FIELDS])

    def test_labels_describe_the_bad_state(self):
        """'채광'처럼 중립적인 명사면 좋아서 체크하는 건지 나빠서 체크하는
        건지 알 수 없다 — 라벨 자체가 나쁜 상태를 말해야 한다."""
        bad_words = ("나쁨", "부족", "있음", "심함", "열악")
        for label in ep.INSPECTION_CHECKLIST:
            self.assertTrue(any(w in label for w in bad_words), label)

    def test_fields_and_checklist_stay_in_sync(self):
        self.assertEqual([label for _, label in ep.INSPECTION_FIELDS], ep.INSPECTION_CHECKLIST)


class TestBuildYearNotes(unittest.TestCase):
    """41절 연식 항목 — 오래된 물건이면 임장 포인트·인테리어 비용까지 짚어준다."""

    def _item(self, build_year):
        report = ep.build_marketability_report(build_year=build_year, this_year=2026)
        return next(i for i in report["items"] if i["key"] == "build_year")

    def test_old_building_warns_about_leaks_and_repair_cost(self):
        item = self._item(1990)
        self.assertEqual(item["verdict"], "warn")
        notes = " ".join(item["notes"])
        self.assertIn("누수", notes)
        self.assertIn("인테리어", notes)

    def test_middle_aged_building_gets_a_lighter_note(self):
        item = self._item(2005)
        self.assertEqual(item["verdict"], "ok")
        self.assertEqual(len(item["notes"]), 1)

    def test_new_building_has_no_note(self):
        self.assertIsNone(self._item(2020).get("notes"))


class TestAdaptiveRadiusIsOff(unittest.TestCase):
    """5절 적응형 반경은 사용자 요청으로 꺼져 있다 — 지정한 반경이 곧 계산
    범위여야 한다. 함수 자체는 되살릴 수 있게 남겨 뒀으므로(7-2절 시계열
    보정과 같은 처리), "남아는 있지만 아무도 안 부른다"를 여기서 고정한다."""

    def _source(self, *path_parts):
        root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        with open(os.path.join(root, *path_parts), encoding="utf-8") as f:
            return f.read()

    def _calls(self, source):
        """주석·독스트링을 뺀 실제 호출만 센다 — 되살리는 방법을 적어 둔
        설명 문장까지 "호출"로 세면 이 테스트가 의미 없어진다."""
        return re.findall(r"^[^#\n]*\bfind_comparables_adaptive\(", source, re.MULTILINE)

    def test_cli_does_not_widen_the_radius(self):
        source = self._source("scripts", "estimate_price.py")
        # 정의 한 줄(def ...)만 남고 호출은 없어야 한다
        calls = [c for c in self._calls(source) if "def " not in c]
        self.assertEqual(calls, [], f"CLI가 아직 적응형 반경을 호출합니다: {calls}")

    def test_web_does_not_widen_the_radius(self):
        calls = self._calls(self._source("webapp", "app.py"))
        self.assertEqual(calls, [], f"웹이 아직 적응형 반경을 호출합니다: {calls}")

    def test_the_function_itself_still_works(self):
        """되살릴 수 있게 남겨 둔 것이므로 함수는 계속 동작해야 한다."""
        self.assertTrue(callable(ep.find_comparables_adaptive))


class TestSaleCalibration(unittest.TestCase):
    """48절 백테스트로 잡은 매매가 보정 계수(`SALE_CALIBRATION_FACTOR`).

    ⚠️ 제일 중요한 보증은 **전세(16절)에 새어 들어가지 않는 것**이다 — 매매
    실거래로만 잰 편향이라 전세에 쓰면 근거 없는 보정이 된다."""

    def _rows(self):
        return [{"_amount_man": a, "_weight": 0.5, "excluUseAr": "45",
                 "_distance_m": 100, "dealYear": "2026", "dealMonth": "5"}
                for a in (15000, 16000, 17000, 18000, 19000)]

    def test_default_is_no_calibration(self):
        """기본값 1.0 — 전세 호출부가 인자를 안 넘겨도 안전해야 한다."""
        rows = self._rows()
        a = ep.compute_scenarios(rows, 400, 2026, subject_area=45.0)
        b = ep.compute_scenarios(rows, 400, 2026, subject_area=45.0, calibration=1.0)
        self.assertEqual(a["median"], b["median"])

    def test_scales_all_three_values(self):
        rows = self._rows()
        plain = ep.compute_scenarios(rows, 400, 2026, subject_area=45.0)
        cal = ep.compute_scenarios(rows, 400, 2026, subject_area=45.0, calibration=0.97)
        for key in ("p25", "median", "p75"):
            self.assertAlmostEqual(cal[key] / plain[key], 0.97, places=9)

    def test_confidence_is_unaffected(self):
        """세 값에 같은 배율을 곱하므로 스프레드 비율이 안 변한다 — 보정 때문에
        신뢰도 점수가 흔들리면 안 된다."""
        rows = self._rows()
        plain = ep.compute_scenarios(rows, 400, 2026, subject_area=45.0)
        cal = ep.compute_scenarios(rows, 400, 2026, subject_area=45.0, calibration=0.97)
        self.assertEqual(plain["confidence"], cal["confidence"])

    def test_price_tiers_get_the_same_calibration(self):
        """29절 구간과 8절 산출값이 어긋나면 화면 안에서 숫자가 안 맞는다."""
        rows = self._rows()
        plain = ep.compute_price_tiers(rows)
        cal = ep.compute_price_tiers(rows, calibration=0.97)
        for key in plain:
            self.assertLess(cal[key], plain[key])
            self.assertAlmostEqual(cal[key] / plain[key], 0.97, delta=0.005)

    def test_factor_is_in_a_sane_range(self):
        """⛔ 한때 `< 1.0`(3% 낮게)을 고정했는데, 그 근거였던 표본이 빌라가
        아니라 아파트였던 게 드러나(48-4절) 1.0으로 되돌렸다. 이제 방향을
        고정하지 않고 **오타 방지 범위만** 지킨다 — 깨끗한 빌라 표본으로
        다시 재면 위로든 아래로든 갈 수 있다."""
        self.assertGreater(ep.SALE_CALIBRATION_FACTOR, 0.8)   # 오타로 0.097 같은 값 방지
        self.assertLess(ep.SALE_CALIBRATION_FACTOR, 1.2)

    def test_jeonse_path_does_not_get_sale_calibration(self):
        """16절 전세 계산부(`compute_scenarios`를 인자 없이 부르는 곳)가
        매매 보정을 받지 않는지 소스로 고정한다."""
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        with open(os.path.join(root, "estimate_price.py"), encoding="utf-8") as f:
            source = f.read()
        for line in source.splitlines():
            if "compute_scenarios(jeonse_filtered" in line:
                self.assertNotIn("calibration", line)


class TestBasementSymmetry(unittest.TestCase):
    """CLAUDE.md 48-4절 — 반지하↔지상층은 **양방향으로** 안 섞여야 한다.

    ⚠️ 실제로 터졌던 버그의 회귀 테스트다. 예전 조건은
    `row_is_basement and not subject_is_basement`라 한쪽만 걸렸다 —
    대상이 지상층이면 반지하를 빼줬지만, **대상이 반지하일 때 지상층
    거래가 그대로 섞여** 매도가가 두 배 가까이 부풀었다(실측: 반지하
    4건 평균 오차 42.6%, 최악 +94.8%).
    """

    def setUp(self):
        import geocode as geo
        self._orig = geo.geocode
        self.coords = {}

        def fake(addr):
            return self.coords.get(addr)

        geo.geocode = fake
        self._geo = geo

        import lawd_lookup
        self._orig_addr = lawd_lookup.full_address
        lawd_lookup.full_address = lambda r: r["_addr"]

    def tearDown(self):
        self._geo.geocode = self._orig
        import lawd_lookup
        lawd_lookup.full_address = self._orig_addr

    def _row(self, addr, floor, amount, lat):
        self.coords[addr] = (lat, 127.0)
        return {"_addr": addr, "umdNm": "동", "jibun": addr, "mhouseNm": addr,
                "sggCd": "11305", "excluUseAr": "40.0", "floor": str(floor),
                "buildYear": "2015", "dealYear": "2026", "dealMonth": "5",
                "dealDay": "10", "dealAmount": f"{amount:,}"}

    def _run(self, subject_floor):
        self.coords["SUBJ"] = (37.6, 127.0)
        rows = [self._row(f"지상{i}", 3, 30000, 37.6 + i * 0.0003) for i in range(5)]
        rows += [self._row(f"반지하{i}", -1, 15000, 37.6 + (5 + i) * 0.0003) for i in range(5)]
        return ep.find_comparables(rows, (37.6, 127.0), 40.0, subject_floor, "2015", 400,
                                   year_min=2025, this_year=2026, this_month=9,
                                   gu_filter=None)

    def test_ground_subject_excludes_basement(self):
        floors = [int(r["floor"]) for r in self._run(3)]
        self.assertTrue(floors, "표본이 비면 테스트가 의미 없다")
        self.assertTrue(all(f > 0 for f in floors), "지상층 대상에 반지하가 섞였다")

    def test_basement_subject_excludes_ground(self):
        """⚠️ 이게 예전에 안 걸리던 방향이다."""
        floors = [int(r["floor"]) for r in self._run(-1)]
        self.assertTrue(floors, "표본이 비면 테스트가 의미 없다")
        self.assertTrue(all(f <= 0 for f in floors),
                        "반지하 대상에 지상층이 섞였다 — 매도가가 두 배로 부풀어 오른다")

    def test_basement_subject_estimate_stays_near_basement_prices(self):
        """실제 산출값까지 확인 — 반지하 시세(1.5억) 근처여야 한다."""
        filtered = self._run(-1)
        scen = ep.compute_scenarios(filtered, 400, 2026, subject_area=40.0)
        self.assertLess(scen["median"], 20000,
                        "반지하 대상인데 지상층 시세(3억)로 끌려 올라갔다")


class TestEstimateWarnings(unittest.TestCase):
    """CLAUDE.md 49절 — 추정 경고등.

    실측 44건(경기 빌라)에서 세 경고 중 하나라도 걸린 건과 안 걸린 건의
    성적이 이렇게 갈렸다: 없음 19건 6.8% / 있음 25건 17.1%.
    """

    @staticmethod
    def _rows(n=10, same_building=0, top_share=None):
        if top_share is None:
            rows = [{"_weight": 1.0} for _ in range(n)]
        else:
            rest = (100 - top_share) / max(1, n - 1)
            rows = [{"_weight": top_share}] + [{"_weight": rest} for _ in range(n - 1)]
        for i in range(same_building):
            rows[i]["_same_building"] = True
        return rows

    def _keys(self, rows, divergence):
        return {w["key"] for w in ep.compute_estimate_warnings(rows, divergence)}

    def test_clean_sample_has_no_warning(self):
        self.assertEqual(self._keys(self._rows(12, same_building=3), 0.5), set())

    def test_high_divergence_warns(self):
        self.assertIn("divergence", self._keys(self._rows(12), 9.0))

    def test_divergence_threshold_boundary(self):
        self.assertNotIn("divergence", self._keys(self._rows(12), 2.9))
        self.assertIn("divergence", self._keys(self._rows(12), 3.0))

    def test_missing_divergence_does_not_warn(self):
        """괴리율을 못 구한 경우(대상 면적 미입력 등)는 경고하지 않는다."""
        self.assertNotIn("divergence", self._keys(self._rows(12), None))

    def test_dominant_single_row_warns(self):
        self.assertIn("share", self._keys(self._rows(10, top_share=60.0), 0.0))

    def test_evenly_spread_weights_do_not_warn(self):
        self.assertNotIn("share", self._keys(self._rows(10, top_share=20.0), 0.0))

    def test_exactly_one_same_building_warns(self):
        """⚠️ 실측에서 **1건일 때가 제일 나빴다**(18.9%) — 0건(14.5%)·
        2~3건(11.0%)·4건 이상(3.1%)보다 나쁘다. 견제할 같은 건물 거래 없이
        동일건물 보너스(×2.0)를 그 한 건이 독차지하기 때문이다."""
        self.assertIn("same_building", self._keys(self._rows(12, same_building=1), 0.0))

    def test_zero_or_many_same_building_do_not_warn(self):
        self.assertNotIn("same_building", self._keys(self._rows(12, same_building=0), 0.0))
        self.assertNotIn("same_building", self._keys(self._rows(12, same_building=4), 0.0))

    def test_warnings_can_stack(self):
        keys = self._keys(self._rows(10, same_building=1, top_share=70.0), 12.0)
        self.assertEqual(keys, {"divergence", "share", "same_building"})

    def test_every_warning_carries_text_for_the_screen(self):
        for w in ep.compute_estimate_warnings(self._rows(10, same_building=1, top_share=70.0), 12.0):
            for field in ("key", "label", "detail", "advice"):
                self.assertTrue(w.get(field), f"{w.get('key')}에 {field}가 비었다")

    def test_empty_sample_is_safe(self):
        self.assertEqual(ep.compute_estimate_warnings([], None), [])


class TestTopWeightShareShared(unittest.TestCase):
    """49절 — `backtest.py`와 같은 구현을 쓰는지(중복 구현이 갈리면 화면과
    백테스트 숫자가 어긋난다)."""

    def test_backtest_uses_the_shared_function(self):
        import inspect
        import backtest as bt
        self.assertIs(bt.top_weight_share, ep.top_weight_share)
        self.assertNotIn("def _top_weight_share", inspect.getsource(bt))


class TestRedevelopmentSignal(unittest.TestCase):
    """CLAUDE.md 50절 — 정비구역(재개발) 신호 탐지.

    ⚠️ **프리미엄을 가격에 더하지 않는다.** 구역 경계 한 블록 차이로 0이 되고
    단계별로 0~수억까지 갈리는 값이라, 자동 반영하면 전 물건이 과대평가된다.
    "있을 수 있으니 확인하라"고 알리기만 한다.

    실측 근거: 광명 `한보주택` 34㎡가 6.5억(동네 ㎡당가 중앙값의 2.81배,
    1991년식)에 팔렸고 계산기는 −48.5% 빗나갔다.
    """

    @staticmethod
    def _row(dong, name, area, amount_man, build_year):
        return {"umdNm": dong, "mhouseNm": name, "excluUseAr": str(area),
                "dealAmount": f"{amount_man:,}", "buildYear": str(build_year)}

    def _baseline_rows(self, n=30):
        """㎡당가 300만원 언저리의 평범한 거래들 — 기준선을 만든다."""
        return [self._row("평범동", f"빌라{i}", 50.0, 15000 + i * 100, 2010)
                for i in range(n)]

    def test_clusters_of_expensive_old_units_are_flagged(self):
        rows = self._baseline_rows() + [
            self._row("재개발동", "한보주택", 34.0, 30600, 1991),
            self._row("재개발동", "낡은빌라", 40.0, 34000, 1988),
        ]
        sig = ep.detect_redevelopment_signal(rows, "재개발동", 2026)
        self.assertIsNotNone(sig)
        self.assertEqual(sig["count"], 2)
        self.assertGreater(sig["max_ratio"], ep.REDEV_PRICE_RATIO)

    def test_new_buildings_are_not_a_signal(self):
        """⚠️ 신축이 비싼 건 정상이다 — 재개발 기대는 구축에 붙는다."""
        rows = self._baseline_rows() + [
            self._row("신축동", "새빌라A", 40.0, 34000, 2024),
            self._row("신축동", "새빌라B", 40.0, 33000, 2023),
        ]
        self.assertIsNone(ep.detect_redevelopment_signal(rows, "신축동", 2026))

    def test_single_expensive_unit_is_not_enough(self):
        """한 건은 우연(업거래·특수관계)일 수 있어 신호로 보지 않는다."""
        rows = self._baseline_rows() + [
            self._row("한건동", "혼자비쌈", 34.0, 30600, 1991)]
        self.assertIsNone(ep.detect_redevelopment_signal(rows, "한건동", 2026))

    def test_ordinary_neighbourhood_is_quiet(self):
        self.assertIsNone(
            ep.detect_redevelopment_signal(self._baseline_rows(), "평범동", 2026))

    def test_small_sample_gives_no_verdict(self):
        """기준선(구 중앙값)을 못 믿을 만큼 표본이 적으면 판단하지 않는다."""
        rows = self._baseline_rows(n=5) + [
            self._row("재개발동", "한보주택", 34.0, 30600, 1991),
            self._row("재개발동", "낡은빌라", 40.0, 34000, 1988),
        ]
        self.assertIsNone(ep.detect_redevelopment_signal(rows, "재개발동", 2026))

    def test_missing_dong_is_safe(self):
        self.assertIsNone(ep.detect_redevelopment_signal(self._baseline_rows(), None, 2026))

    def test_unparseable_rows_do_not_crash(self):
        rows = self._baseline_rows() + [
            {"umdNm": "재개발동", "mhouseNm": "깨진행", "excluUseAr": "",
             "dealAmount": "", "buildYear": "abcd"},
            self._row("재개발동", "한보주택", 34.0, 30600, 1991),
            self._row("재개발동", "낡은빌라", 40.0, 34000, 1988),
        ]
        sig = ep.detect_redevelopment_signal(rows, "재개발동", 2026)
        self.assertEqual(sig["count"], 2, "못 읽는 행은 조용히 건너뛰어야 한다")

    def test_signal_becomes_a_warning(self):
        rows = self._baseline_rows() + [
            self._row("재개발동", "한보주택", 34.0, 30600, 1991),
            self._row("재개발동", "낡은빌라", 40.0, 34000, 1988),
        ]
        sig = ep.detect_redevelopment_signal(rows, "재개발동", 2026)
        keys = {w["key"] for w in ep.compute_estimate_warnings(
            [{"_weight": 1.0} for _ in range(12)], 0.0, sig)}
        self.assertIn("redevelopment", keys)

    def test_no_signal_means_no_warning(self):
        keys = {w["key"] for w in ep.compute_estimate_warnings(
            [{"_weight": 1.0} for _ in range(12)], 0.0, None)}
        self.assertNotIn("redevelopment", keys)

    def test_price_is_never_changed_by_the_signal(self):
        """⚠️ 이 절의 핵심 보증 — 신호가 떠도 **가격은 한 푼도 안 바뀐다.**

        입력 행을 건드리지 않는지 실제로 돌려서 확인한다(소스 검사로 하면
        `to_amount_man` 같은 함수 이름에 걸려 오탐이 난다)."""
        import copy
        rows = self._baseline_rows() + [
            self._row("재개발동", "한보주택", 34.0, 30600, 1991),
            self._row("재개발동", "낡은빌라", 40.0, 34000, 1988),
        ]
        before = copy.deepcopy(rows)
        sig = ep.detect_redevelopment_signal(rows, "재개발동", 2026)
        self.assertIsNotNone(sig, "신호가 떠야 의미 있는 테스트다")
        self.assertEqual(rows, before, "탐지가 입력 행을 고쳤다")

    def test_warning_does_not_touch_the_scenarios(self):
        """경고를 만들어도 8절 산출값은 그대로여야 한다."""
        import copy
        filtered = [{"_amount_man": 30000.0, "excluUseAr": "50.0", "_weight": 1.0,
                     "_distance_m": 100.0, "dealYear": "2026",
                     "_similarity_score": 80} for _ in range(8)]
        before_scen = ep.compute_scenarios(copy.deepcopy(filtered), 400, 2026,
                                            subject_area=50.0)
        ep.compute_estimate_warnings(filtered, 0.0,
                                     {"dong": "재개발동", "count": 2, "max_ratio": 2.5,
                                      "baseline_unit": 300.0,
                                      "examples": [{"name": "한보주택", "area": 34.0,
                                                    "amount_man": 30600.0,
                                                    "build_year": 1991, "ratio": 2.5}]})
        after_scen = ep.compute_scenarios(filtered, 400, 2026, subject_area=50.0)
        self.assertEqual(before_scen["median"], after_scen["median"])
        self.assertEqual(before_scen["p25"], after_scen["p25"])
        self.assertEqual(before_scen["p75"], after_scen["p75"])
