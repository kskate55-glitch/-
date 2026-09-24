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

import math
import os
import random
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


def _repo(rel: str) -> str:
    """리포 루트 기준 경로 — 소스 검사 테스트가 공유한다."""
    return os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)))), rel)


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
        # 거리 비중만큼 100점에서 깎여야 한다.
        # ⚠️ 기대값을 숫자로 박아 두면 72-9절처럼 배분을 고칠 때마다 이 테스트가
        #    같이 깨진다 — 배분표에서 끌어와 "관계"를 고정한다.
        s = ep.similarity_score(
            distance_m=400, radius_m=400, area=69.27, subject_area=69.27, area_tolerance_pct=0.15,
            floor=4, subject_floor=4, build_year=2012, subject_build_year=2012, build_year_tolerance=4,
        )
        expected = 100 * (1 - ep.SIMILARITY_WEIGHTS["distance"])
        self.assertAlmostEqual(s, expected)

    def test_the_weights_add_up_to_one(self):
        """합이 1이 아니면 점수가 0~100을 벗어나 7절 강조 곡선이 뒤틀린다."""
        self.assertAlmostEqual(sum(ep.SIMILARITY_WEIGHTS.values()), 1.0)
        self.assertEqual(set(ep.SIMILARITY_WEIGHTS),
                         {"distance", "area", "floor", "build_year"})
        for key, value in ep.SIMILARITY_WEIGHTS.items():
            self.assertGreater(value, 0, f"{key} 비중이 0 이하입니다")

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


    def test_one_up_trade_no_longer_flips_the_trend(self):
        """⚠️ 68절 — 추세가 이제 **가격을 실제로 움직이므로**, 업거래 한 건에
        부호가 뒤집히면 매도가가 통째로 틀린다. 그래서 추정기만 월별 **중앙값**을
        쓴다(15절 화면은 익숙한 평균 그대로)."""
        rows = []
        for month in range(1, 7):                       # 한 달에 4건씩, 꾸준히 상승
            for k in range(4):
                pps = 100 + (month - 1) * 2
                rows.append(_fake_row(f"빌라{month}{k}", f"{month}{k}", 60, 4, 2012,
                                      2025, month, round(pps * 60)))
        clean = ep.estimate_monthly_trend_rate(rows, "수유동")
        self.assertGreater(clean, 0)
        rows.append(_fake_row("업거래", "999", 60, 4, 2012, 2025, 6, round(30 * 60)))
        self.assertGreater(ep.estimate_monthly_trend_rate(rows, "수유동"), 0,
                           "업거래 한 건에 상승 추세가 하락으로 뒤집혔다")

    def test_noise_without_a_real_trend_is_not_corrected(self):
        """⚠️ 68절의 핵심 안전장치 — 가격이 안 움직이는 동네에서 잡음을 추세로
        착각하면 **멀쩡한 매도가를 흔든다**(실측: 거래가 드문 동네 보합장
        MAPE 3.2% → 3.8%). 기울기가 자기 표준오차를 못 넘으면 보정하지 않는다."""
        rnd = random.Random(7)
        rows = []
        for month in range(1, 13):
            for k in range(3):
                pps = 100 * rnd.lognormvariate(0, 0.12)      # 추세 0, 잡음만
                rows.append(_fake_row(f"빌라{month}{k}", f"{month}{k}", 60, 4, 2012,
                                      2025, month, round(pps * 60)))
        self.assertIsNone(ep.estimate_monthly_trend_rate(rows, "수유동"),
                          "추세가 없는데 보정을 걸고 있다")

    def test_a_clear_trend_still_passes_the_gate(self):
        """게이트가 너무 빡빡하면 진짜 상승장에서도 보정을 못 건다."""
        rnd = random.Random(7)
        rows = []
        for month in range(1, 25):          # 24개월 × 6건 — 실제 동 규모
            y, m = (2025, month) if month <= 12 else (2026, month - 12)
            for k in range(6):
                pps = 100 * (1.007 ** (month - 1)) * rnd.lognormvariate(0, 0.12)
                rows.append(_fake_row(f"빌라{month}{k}", f"{month}{k}", 60, 4, 2012,
                                      y, m, round(pps * 60)))
        rate = ep.estimate_monthly_trend_rate(rows, "수유동")
        self.assertIsNotNone(rate, "뚜렷한 상승 추세인데 게이트가 막았다")
        self.assertGreater(rate, 0.002)

    def test_the_rate_is_clamped_to_a_sane_range(self):
        """표본이 얇으면 추정이 터무니없이 나올 수 있다 — 마지막 안전장치."""
        rows = [_fake_row(f"빌라{i}", str(i), 60, 4, 2012, 2025, i + 1,
                          round(100 * (3 ** i) * 60)) for i in range(4)]   # 매달 3배
        self.assertAlmostEqual(ep.estimate_monthly_trend_rate(rows, "수유동"),
                               ep.TREND_RATE_SANITY_MAX, places=9)
        crash = [_fake_row(f"빌라{i}", str(i), 60, 4, 2012, 2025, i + 1,
                           round(100 / (3 ** i) * 60)) for i in range(4)]
        self.assertAlmostEqual(ep.estimate_monthly_trend_rate(crash, "수유동"),
                               -ep.TREND_RATE_SANITY_MAX, places=9)

    def test_display_series_still_uses_the_mean(self):
        """15절 화면은 바꾸지 않았다 — 기본 집계는 여전히 평균이다."""
        rows = [_fake_row("a", "1", 60, 4, 2012, 2025, 1, round(100 * 60)),
                _fake_row("b", "2", 60, 4, 2012, 2025, 1, round(200 * 60))]
        series, _ = ep._price_trend_monthly_series(rows, "수유동")
        self.assertAlmostEqual(series[0][2], 150.0)

    def test_flat_prices_are_not_corrected_at_all(self):
        """보합이면 None — 68절 게이트가 "움직이지 않는 동네는 건드리지 않는다"를
        보장한다(예전엔 0.0을 돌려줬는데, 의미상 같지만 호출부가 보정 자체를
        건너뛰는 쪽이 명확하다)."""
        rows = self._rows_with_trend(100, 0, 6)
        self.assertIsNone(ep.estimate_monthly_trend_rate(rows, "수유동"))

    def test_rate_is_compounding_not_linear(self):
        """log를 씌워 회귀하므로 기울기가 곧 **월 복리율**이어야 한다."""
        rows = [_fake_row(f"빌라{i}", str(i), 60, 4, 2012, 2025, i + 1,
                          round(100 * (1.01 ** i) * 60)) for i in range(8)]
        self.assertAlmostEqual(ep.estimate_monthly_trend_rate(rows, "수유동"), 0.01, places=5)


class TimeCorrectionNoteTests(unittest.TestCase):
    """68절 — 보정이 걸리면 **반드시 화면에 알린다**(목록엔 실제 체결가가 그대로
    뜨므로, 안 알리면 '표 가격이랑 매도가가 왜 안 맞지'로 읽힌다)."""

    def test_no_note_when_rate_is_missing_or_tiny(self):
        self.assertEqual(ep.time_correction_note(None), "")
        self.assertEqual(ep.time_correction_note(0.0), "")
        self.assertEqual(ep.time_correction_note(ep.TIME_CORRECTION_MENTION_RATE / 2), "")

    def test_rising_and_falling_read_differently(self):
        up = ep.time_correction_note(0.007)
        down = ep.time_correction_note(-0.007)
        self.assertIn("오르는", up)
        self.assertIn("내리는", down)
        for note in (up, down):
            self.assertIn("실제 체결가 그대로", note,
                          "목록 금액이 손대지 않은 값이라는 걸 반드시 밝혀야 한다")

    def test_cli_and_web_use_the_same_sentence(self):
        """CLI와 웹이 각자 문장을 쓰면 조용히 갈라진다 — 한 함수만 부르는지 고정."""
        for path in ("scripts/estimate_price.py", "webapp/app.py"):
            src = open(_repo(path), encoding="utf-8").read()
            self.assertIn("time_correction_note", src)


class TimeCorrectionIsOnForSaleOnly(unittest.TestCase):
    """68절 — 7-2절을 되살리면서 16절 전세·23-1절 전환율이 **매매 추세를
    물려받지 않는지** 소스로 고정한다(48-2절·65절에서 같은 실수를 두 번 했다)."""

    def test_sale_call_sites_pass_the_trend(self):
        for path in ("scripts/estimate_price.py", "webapp/app.py", "scripts/backtest.py"):
            src = open(_repo(path), encoding="utf-8").read()
            self.assertIn("monthly_trend_rate=", src, f"{path}에서 매매 보정이 빠졌다")

    def test_default_is_off(self):
        import inspect
        sig = inspect.signature(ep.find_comparables)
        self.assertIsNone(sig.parameters["monthly_trend_rate"].default,
                          "기본값이 켜져 있으면 전세 경로가 매매 추세를 물려받는다")

    def test_the_jeonse_call_sites_do_not_pass_it(self):
        src = open(_repo("scripts/estimate_price.py"), encoding="utf-8").read()
        for marker in ('amount_field="deposit"', 'amount_field="monthlyRent"'):
            idx = 0
            while True:
                idx = src.find(marker, idx)
                if idx < 0:
                    break
                start = src.rfind("find_comparables(", 0, idx)
                self.assertGreaterEqual(start, 0)
                self.assertNotIn("monthly_trend_rate", src[start:idx + len(marker) + 400],
                                 "전세/전환율 경로가 매매 시계열 보정을 물려받고 있다")
                idx += len(marker)


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
            # 이 mock은 대상과 같은 좌표를 돌려주므로 거리 0m(동일건물)이지만,
            # 같은 건물 거래가 **한 건뿐이라 보너스는 안 붙는다**(51절).
            expected = (ep.weight_for_recency("2026", "9", 2026, 9)
                        * ep.SIMILARITY_EMPHASIS_CURVE(100.0))
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
    """좌표가 거의 겹치는(사실상 동일건물) 거래는 가중치를 `SAME_BUILDING_BONUS`
    만큼 높인다 — 단 **2건 이상일 때만**(51절).

    ⚠️ 한 건짜리에도 보너스를 주던 시절의 실측: 같은 건물 0건 14.5% ·
    **1건 18.9%** · 2~3건 11.0% · 4건 이상 3.1%. 정보를 더 줬는데 오히려
    나빠지는 구간이 있었고, 원인은 그 한 건이 대표성이 없어도 ×2 가중치를
    견제 없이 받는 것이었다.
    """

    @staticmethod
    def _base_weight():
        return (ep.weight_for_recency("2026", "9", 2026, 9)
                * ep.SIMILARITY_EMPHASIS_CURVE(100.0))

    def test_single_same_building_row_gets_no_bonus(self):
        """⚠️ 51절 핵심 — 한 건뿐이면 '건물 시세'가 아니라 '그 한 호실 가격'이다."""
        with patch("geocode.geocode", return_value=(37.65, 127.02)):
            row = _fake_row("동일건물빌라", "1", 69.27, 4, 2012, 2026, 9, 35000)
            out = ep.find_comparables(
                [row], (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
            self.assertTrue(out[0].get("_same_building"),
                            "플래그 자체는 남아야 한다 — 그래프·경고가 쓴다")
            self.assertAlmostEqual(out[0]["_weight"], self._base_weight(), places=6)

    def test_two_same_building_rows_get_the_bonus(self):
        coords = {"동일건물빌라A": (37.65, 127.02), "동일건물빌라B": (37.65, 127.02)}
        rows = [_fake_row("동일건물빌라A", "1", 69.27, 4, 2012, 2026, 9, 35000),
                _fake_row("동일건물빌라B", "2", 69.27, 4, 2012, 2026, 9, 35500)]
        with patch("geocode.geocode", side_effect=lambda addr: (37.65, 127.02)):
            out = ep.find_comparables(
                rows, (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                area_tolerance_pct=0.15, this_month=9,
            )
        self.assertEqual(len(out), 2)
        expected = self._base_weight() * ep.SAME_BUILDING_BONUS
        for r in out:
            self.assertTrue(r.get("_same_building"))
            self.assertAlmostEqual(r["_weight"], expected, places=6)
        del coords

    def test_gate_constant_is_honoured(self):
        """상수를 바꾸면 동작도 따라와야 한다(하드코딩된 2가 아니어야 한다)."""
        orig = ep.SAME_BUILDING_MIN_COUNT
        try:
            ep.SAME_BUILDING_MIN_COUNT = 1
            with patch("geocode.geocode", return_value=(37.65, 127.02)):
                row = _fake_row("동일건물빌라", "1", 69.27, 4, 2012, 2026, 9, 35000)
                out = ep.find_comparables(
                    [row], (37.65, 127.02), 69.27, 4, "2012", 400, 2025, 2026, None,
                    area_tolerance_pct=0.15, this_month=9,
                )
            self.assertAlmostEqual(out[0]["_weight"],
                                   self._base_weight() * ep.SAME_BUILDING_BONUS, places=6)
        finally:
            ep.SAME_BUILDING_MIN_COUNT = orig

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


class TestTheCliHelpMatchesWhatItAccepts(unittest.TestCase):
    """⚠️ 실제로 겪은 것: 도움말이 **자기가 거부하는 예시**를 안내하고 있었다.

    36절에서 항목 이름을 "나쁜 상태"로 바꾸면서 `choices`는 고쳤는데 `help`의
    예시(`--inspection-bad 누수 경사`)는 옛 이름 그대로라, 안내대로 치면
    argparse가 그 자리에서 거부했다. 항목 개수도 엘리베이터를 뺀 뒤 7개인데
    "8가지"로 남아 있었다.
    """
    def test_every_example_in_the_help_is_an_accepted_choice(self):
        import re
        import estimate_price as ep
        with open(ep.__file__, encoding="utf-8") as f:
            src = f.read()
        block = src.split('"--inspection-bad"')[1].split("ap.add_argument")[0]
        examples = re.findall(r'--inspection-bad ((?:"[^"]+"\s*)+)', block)
        self.assertTrue(examples, "도움말에 예시가 없다")
        for chunk in examples:
            for value in re.findall(r'"([^"]+)"', chunk):
                self.assertIn(value, ep.INSPECTION_CHECKLIST,
                              f"도움말이 안내하는 {value!r}를 argparse가 거부한다")

    def test_the_count_in_the_help_is_not_hardcoded(self):
        import estimate_price as ep
        with open(ep.__file__, encoding="utf-8") as f:
            src = f.read()
        block = src.split('"--inspection-clean"')[1].split("args = ap.parse_args")[0]
        # ⚠️ 주석은 빼고 본다 — 69절에서 겪은 것과 같은 소스검사 오탐이다
        #    (이 수정을 설명하는 주석 자체가 옛 숫자를 인용하고 있다).
        code = "\n".join(l.split("#")[0] for l in block.splitlines())
        self.assertNotIn("8가지", code, "항목 수를 다시 박으면 또 어긋난다")
        self.assertIn("len(INSPECTION_CHECKLIST)", code)


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

    def test_a_string_build_year_does_not_crash(self):
        """⚠️ 호출부마다 타입이 다르게 온다 — 웹은 `int()`로 바꿔 넘기지만
        CLI `--build-year`는 문자열 그대로다(5절 하드 필터가 문자열 비교를
        쓰기 때문). 예전엔 `this_year - build_year`에서 TypeError로 죽어서
        **CLI로 준공년도를 주면 환금성 진단 지점에서 통째로 멈췄다.**"""
        self.assertEqual(self._item("2012")["verdict"], self._item(2012)["verdict"])
        self.assertIn("2012년식", self._item("2012")["text"])

    def test_a_junk_build_year_is_skipped_not_crashed(self):
        report = ep.build_marketability_report(build_year="-", this_year=2026)
        self.assertFalse([i for i in report["items"] if i["key"] == "build_year"])

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

    def test_top_share_never_warns_anymore(self):
        """⛔ 49-1절 — 최대지분 경고는 껐다.

        표본 92건에서 방향이 **뒤집혔다**(45% 이상 8.7% vs 그 미만 11.4%).
        지분이 아무리 높아도 이 키는 안 나와야 한다 — 되살리면 이 테스트가
        먼저 깨지므로 "왜 껐는지"를 다시 읽게 된다.
        """
        for share in (50.0, 60.0, 70.0, 95.0):
            self.assertNotIn("share", self._keys(self._rows(10, top_share=share), 0.0),
                             f"지분 {share}%에서 경고가 되살아났다")

    def test_top_share_is_still_computable_for_the_backtest(self):
        """경고는 껐지만 `top_weight_share()` 자체는 백테스트 CSV가 계속 쓴다."""
        self.assertIsNotNone(ep.top_weight_share(self._rows(10, top_share=60.0)))

    def test_same_building_never_warns_anymore(self):
        """⛔ 67절 — '같은 건물 거래가 딱 한 건' 경고는 **껐다.**

        경기 44건에서 "1건이 0건보다 나쁘다"는 반직관적 순서를 보고 채택했고
        92건에서도 같은 순서가 나왔지만, **두 표본이 사실 같은 물건이었다**
        (49-2절 시드 고정). 독립 표본인 서울 53건에서는 방향이 뒤집혔고
        (−3.8%p), 118건을 합쳐도 +1.1%p [−3.8, +6.8]로 0을 못 넘는다.
        49-1절 최대지분 경고와 똑같은 경로다 — **되살아나지 않게 고정한다.**
        """
        for sb in (0, 1, 2, 4):
            self.assertNotIn("same_building", self._keys(self._rows(12, same_building=sb), 0.0),
                             f"동일건물 {sb}건에서 껐어야 할 경고가 되살아났다")

    def test_warnings_can_stack(self):
        keys = self._keys(self._rows(10, same_building=1, top_share=70.0), 12.0)
        self.assertEqual(keys, {"divergence"})

    def test_every_warning_carries_text_for_the_screen(self):
        for w in ep.compute_estimate_warnings(self._rows(10, same_building=1, top_share=70.0), 12.0):
            for field in ("key", "label", "detail", "advice"):
                self.assertTrue(w.get(field), f"{w.get('key')}에 {field}가 비었다")

    def test_empty_sample_is_safe(self):
        self.assertEqual(ep.compute_estimate_warnings([], None), [])


class TestThinSampleWarning(unittest.TestCase):
    """70절 · 72-19절 — 비교거래가 얇으면 **높게 부른다. 단, 구축일 때만.**

    ⚠️ 이 경고는 다른 경고들과 성격이 다르다 — 크기가 아니라 **방향**을
    말해준다. 그래서 문구가 "높게 잡혔을 수 있다"라고 한쪽을 가리키는지까지
    고정한다(양쪽으로 틀릴 수 있다고 바꿔 쓰면 정보가 사라진다).

    ⚠️ **72-19절에서 구축 조건이 붙었다.** 실측 139건 2×2에서 신축 얇은
    표본은 편향 +0.5% · MAPE 8.6%로 **오히려 제일 좋았다** — 모든 얇은
    표본에 띄우면 열에 여섯이 오탐이다. 부트스트랩으로도 갈라내는 힘이
    +3.8%p [−2.7, +11.2](➖)에서 +15.5%p [+3.2, +29.4](⭐)로 바뀐다.
    """

    OLD, NEW = 1995, 2015

    @staticmethod
    def _keys(n, divergence=0.5, build_year=1995):
        return {w["key"] for w in ep.compute_estimate_warnings(
            [{"_weight": 1.0}] * n, divergence, None, None, build_year)}

    def test_it_fires_only_below_the_threshold(self):
        th = ep.ESTIMATE_WARN_THIN_SAMPLE
        for n in range(1, th):
            self.assertIn("thin_sample", self._keys(n, build_year=self.OLD),
                          f"{n}건인데 경고가 없다")
        for n in (th, th + 1, th + 10):
            self.assertNotIn("thin_sample", self._keys(n, build_year=self.OLD),
                             f"{n}건인데 경고가 뜬다")

    def test_a_recent_building_with_a_thin_sample_stays_silent(self):
        """⭐ 72-19절의 핵심 — 신축 얇은 표본은 실측에서 멀쩡했다."""
        for n in range(1, ep.ESTIMATE_WARN_THIN_SAMPLE):
            self.assertNotIn("thin_sample", self._keys(n, build_year=self.NEW),
                             f"신축 {n}건에 경고가 떴다 (오탐)")

    def test_the_cutoff_year_is_where_the_data_splits(self):
        boundary = ep.ESTIMATE_WARN_THIN_OLD_BUILD_YEAR
        self.assertIn("thin_sample", self._keys(3, build_year=boundary - 1))
        self.assertNotIn("thin_sample", self._keys(3, build_year=boundary))

    def test_an_unknown_build_year_stays_silent(self):
        """⚠️ 모르면 경고하지 않는다 — 41절 "정보가 없다고 감점하지 않는다"와 같다."""
        for bad in (None, "", "몰라요", float("nan"), []):
            self.assertNotIn("thin_sample", self._keys(3, build_year=bad),
                             f"{bad!r}에서 경고가 떴다")

    def test_a_string_build_year_still_counts(self):
        """⚠️ CLI `--build-year`는 문자열이다(65절 ③)."""
        self.assertIn("thin_sample", self._keys(3, build_year="1995"))
        self.assertNotIn("thin_sample", self._keys(3, build_year=" 2015 "))

    def test_no_comparables_at_all_stays_silent(self):
        """0건은 애초에 계산 자체가 안 되는 상태라 이 경고를 얹을 자리가 아니다."""
        self.assertEqual(ep.compute_estimate_warnings([], None, None, None, 1995), [])

    def test_it_says_which_way_the_error_leans(self):
        w = [x for x in ep.compute_estimate_warnings([{"_weight": 1.0}] * 3, 0.5,
                                                      None, None, self.OLD)
             if x["key"] == "thin_sample"][0]
        self.assertIn("높게", w["label"] + w["detail"])
        self.assertNotIn("낮게", w["label"])
        # 왜 구축에만 뜨는지가 문구에 드러나야 한다 — 안 그러면 오탐처럼 읽힌다
        self.assertIn("오래된", w["label"] + w["detail"])

    def test_it_stacks_with_the_divergence_warning(self):
        """둘은 서로 다른 질문에 답한다 — 하나가 다른 하나를 덮으면 안 된다."""
        self.assertEqual(self._keys(3, divergence=12.0, build_year=self.OLD),
                         {"divergence", "thin_sample"})

    def test_the_warning_never_changes_the_price(self):
        """50절과 같은 계약 — 탐지만 하고 가격은 그대로다.

        ⚠️ 소스 검사가 아니라 **행동 검사**로 한다(50절이 `to_amount_man`
        이름에 걸려 오탐을 낸 전례 그대로).
        """
        rows = [{"_amount_man": 20000 + i * 500, "_weight": 1.0,
                 "_distance_m": 100.0, "dealYear": "2026", "excluUseAr": "50"}
                for i in range(3)]
        before = ep.compute_scenarios([dict(r) for r in rows], 400, 2026)
        ep.compute_estimate_warnings(rows, 0.5, None, None, 1995)
        after = ep.compute_scenarios([dict(r) for r in rows], 400, 2026)
        self.assertEqual(before["median"], after["median"])
        self.assertTrue(all("_amount_man_adjusted" not in r for r in rows))


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


class TestRedevelopmentZoneKeywords(unittest.TestCase):
    """CLAUDE.md 50-1절 — 토지이용계획 지역지구 이름으로 정비구역을 가린다.

    ⚠️ **API 응답을 받아오는 부분은 아직 없다.** 엔드포인트·필드명을 확인하지
    못해 지어내지 않았다(20절/21절 원칙). 이 판정만 먼저 만들어 둬서, 스펙이
    확인되면 응답을 그대로 넘기기만 하면 된다.
    """

    def test_finds_typical_zone_names(self):
        for name in ("정비구역", "재정비촉진지구", "주택재개발사업구역",
                     "주택재건축사업", "도시환경정비구역", "가로주택정비사업"):
            with self.subTest(name=name):
                self.assertIsNotNone(ep.is_redevelopment_zone([name]), name)

    def test_ordinary_zones_are_ignored(self):
        self.assertIsNone(ep.is_redevelopment_zone(
            ["제2종일반주거지역", "도로", "상대보호구역", "가축사육제한구역"]))

    def test_district_unit_plan_is_deliberately_excluded(self):
        """⚠️ '지구단위계획구역'은 전국에 널려 있어 신호가 되지 않는다 —
        넣으면 거의 모든 물건에 경고가 떠서 경고 자체가 무의미해진다."""
        self.assertIsNone(ep.is_redevelopment_zone(
            ["제2종일반주거지역", "지구단위계획구역"]))

    def test_picks_the_zone_out_of_a_mixed_list(self):
        found = ep.is_redevelopment_zone(
            ["제2종일반주거지역", "지구단위계획구역", "○○1구역 주택재개발사업", "도로"])
        self.assertIsNotNone(found)
        self.assertEqual(found["zones"], ["○○1구역 주택재개발사업"])

    def test_duplicates_are_collapsed(self):
        found = ep.is_redevelopment_zone(["정비구역", "정비구역", "재개발구역"])
        self.assertEqual(found["count"], 2)

    def test_blank_input_is_safe(self):
        for value in ([], None, ["", "   ", None]):
            with self.subTest(value=value):
                self.assertIsNone(ep.is_redevelopment_zone(value))

    def test_confirmed_zone_replaces_the_guessed_signal(self):
        """직접 확인된 구역이 있으면 간접 추정 경고는 안 띄운다 — 근거가 더 강하다."""
        guess = {"dong": "재개발동", "count": 3, "max_ratio": 2.5, "baseline_unit": 300.0,
                 "examples": [{"name": "한보주택", "area": 34.0, "amount_man": 30600.0,
                               "build_year": 1991, "ratio": 2.5}]}
        confirmed = ep.is_redevelopment_zone(["○○1구역 주택재개발사업"])
        keys = {w["key"] for w in ep.compute_estimate_warnings(
            [{"_weight": 1.0} for _ in range(12)], 0.0, guess, confirmed)}
        self.assertIn("zone", keys)
        self.assertNotIn("redevelopment", keys)

    def test_without_confirmation_the_guess_still_shows(self):
        guess = {"dong": "재개발동", "count": 3, "max_ratio": 2.5, "baseline_unit": 300.0,
                 "examples": [{"name": "한보주택", "area": 34.0, "amount_man": 30600.0,
                               "build_year": 1991, "ratio": 2.5}]}
        keys = {w["key"] for w in ep.compute_estimate_warnings(
            [{"_weight": 1.0} for _ in range(12)], 0.0, guess, None)}
        self.assertIn("redevelopment", keys)


class TestPredictionInterval(unittest.TestCase):
    """49-2절 — 신뢰도 점수를 대체하는 백테스트 잔차 기반 예측구간."""

    def _rows(self, n, same_building=0):
        rows = []
        for i in range(n):
            r = {"_weight": 1.0, "_amount_man": 20000.0}
            if i < same_building:
                r["_same_building"] = True
            rows.append(r)
        return rows

    def test_no_risk_gives_the_narrowest_band(self):
        r = ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5)
        self.assertEqual(r["risks"], 0)
        self.assertEqual(r["pct"], ep.PREDICTION_INTERVAL_PCT[0])

    def test_each_risk_widens_the_band(self):
        """위험요인이 늘수록 구간이 좁아지는 일은 없어야 한다(단조)."""
        widths = []
        for area, div, year in [(70.0, 0.5, 2015), (70.0, 9.0, 2015),
                                (40.0, 9.0, 2015), (40.0, 9.0, 1990)]:
            r = ep.compute_prediction_interval(20000, self._rows(10), area, div, year)
            widths.append(r["pct"])
        self.assertEqual(widths, sorted(widths), f"구간 폭이 단조가 아니다: {widths}")

    def test_three_risks_land_in_the_top_tier(self):
        """72-17절 — 연식이 들어와 위험요인이 셋이 됐다."""
        r = ep.compute_prediction_interval(20000, self._rows(10), 40.0, 9.0, 1990)
        self.assertEqual(r["risks"], 3)
        self.assertEqual(r["tier"], 3)

    def test_an_old_building_is_a_risk_on_its_own(self):
        """⭐ 72-17절 — 지금까지 중 근거가 가장 센 위험요인이다.

        실측 139건(경기 86 + 서울 53): 구축 MAPE 17.1% vs 2000년 이후 10.3%,
        차이 +6.8%p [+2.4, +11.4]. 소형·괴리율 칸 안에서 따로 봐도 전부
        갈린다(+5.7 / +3.0 / +11.4%p) — 교란이 아니다.
        """
        new_build = ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5, 2015)
        old_build = ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5, 1995)
        self.assertEqual(new_build["risks"], 0)
        self.assertEqual(old_build["risks"], 1)
        self.assertGreater(old_build["pct"], new_build["pct"])

    def test_the_cutoff_year_is_where_the_data_splits(self):
        """경계 바로 앞뒤가 실제로 갈리는지 — 2000년이 기준이다."""
        boundary = ep.PREDICTION_RISK_OLD_BUILD_YEAR
        self.assertEqual(
            ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5, boundary)["risks"], 0)
        self.assertEqual(
            ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5, boundary - 1)["risks"], 1)

    def test_a_string_build_year_still_counts(self):
        """⚠️ CLI `--build-year`는 문자열이다(65절 ③에서 실제로 터졌다)."""
        self.assertEqual(
            ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5, "1991")["risks"], 1)
        self.assertEqual(
            ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5, " 2015 ")["risks"], 0)

    def test_an_unreadable_build_year_is_simply_skipped(self):
        """숫자로 못 읽으면 **그 요인만** 빼고 나머지를 센다 — 터지지 않는다."""
        for bad in (None, "", "몰라요", "abc", float("nan"), float("inf"), []):
            r = ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5, bad)
            self.assertIsNotNone(r, f"{bad!r}에서 구간이 사라졌다")
            self.assertEqual(r["risks"], 0, f"{bad!r}가 위험요인으로 세어졌다")

    def test_same_building_count_no_longer_changes_the_band(self):
        """⛔ 67절 — 동일건물 건수는 더 이상 위험요인이 아니다.

        118건(경기 65 + 서울 53)에서 +1.1%p [−3.8, +6.8]로 0을 못 넘었다.
        빼도 갈라내는 힘이 그대로이고(합계 +4.2%p → +4.2%p) 경고율만
        59% → 47%로 내려간다.
        """
        base = ep.compute_prediction_interval(20000, self._rows(10, same_building=0), 70.0, 0.5)
        for sb in (1, 2, 4):
            r = ep.compute_prediction_interval(20000, self._rows(10, same_building=sb), 70.0, 0.5)
            self.assertEqual(r["risks"], base["risks"], f"동일건물 {sb}건이 위험요인으로 되살아났다")
            self.assertEqual(r["pct"], base["pct"])

    def test_band_brackets_the_center(self):
        r = ep.compute_prediction_interval(20000, self._rows(10), 70.0, 0.5)
        self.assertLess(r["low_man"], 20000)
        self.assertGreater(r["high_man"], 20000)
        self.assertAlmostEqual((r["low_man"] + r["high_man"]) / 2, 20000, places=6)

    def test_missing_inputs_are_safe(self):
        self.assertIsNone(ep.compute_prediction_interval(None, self._rows(10), 70.0, 0.5))
        self.assertIsNone(ep.compute_prediction_interval(20000, [], 70.0, 0.5))
        # 면적·괴리율을 몰라도 계산은 된다(그 요인만 빠진다)
        self.assertEqual(ep.compute_prediction_interval(20000, self._rows(10), None, None)["risks"], 0)

    def test_table_is_wider_than_the_measured_quantiles(self):
        """⚠️ **두 지역 모두의** 실측 80% 분위보다 넓게 잡아둔 상태를 고정한다.

        66절에서 독립 표본(서울 53건)이 예전 폭 ±10/18/25를 깨뜨렸다 —
        적중이 50/58/76%였다. 좁게 잡으면 "80%가 이 범위"라는 화면 문구가
        그대로 거짓말이 되고, 그만큼 입찰가를 잘못 쓰게 된다.
        **좁아서 틀리는 쪽이 넓어서 싱거운 쪽보다 훨씬 해롭다.**

        아래 수치는 72-17절에서 연식을 넣어 4칸으로 다시 잰 값이다
        (경기 86 + 서울 53 = 139건).

        ⚠️ **표본이 얇은 칸은 지역 대신 전체를 기준 삼는다.** 위험 0개와
        3개는 지역별로 5~8건뿐이라 80% 분위가 한두 건에 좌우된다 —
        그런 꼬리에 폭을 맞추는 건 48-2절 0.97과 같은 과적합이다.
        """
        MIN_N = 15
        # (칸, 경기 분위, 경기 n, 서울 분위, 서울 n, 전체 분위)
        measured = [
            (0, 11.4, 29,  None,  5, 12.2),
            (1, 14.8, 26,  25.0, 20, 17.9),
            (2, 17.1, 23,  24.2, 21, 23.8),
            (3, 22.8,  8,  None,  7, 27.0),
        ]
        for tier, gg, gg_n, seoul, seoul_n, pooled in measured:
            thick = [q for q, n in ((gg, gg_n), (seoul, seoul_n))
                     if q is not None and n >= MIN_N]
            target = max(thick) if thick else pooled
            self.assertGreaterEqual(ep.PREDICTION_INTERVAL_PCT[tier], target * 0.95,
                                     f"위험 {tier}개 구간이 실측 꼬리보다 좁다")

    def test_the_widths_are_not_the_narrowest_that_fit_this_sample(self):
        """⚠️ **최소값을 쓰면 안 된다** — 이 표본에만 딱 맞는 폭은
        부트스트랩에서 깨질 확률이 18% → 41%로 뛴다(48-2절 과적합).
        채택값은 "지금보다 위태롭지 않은 선에서 가장 좁게"다.
        """
        narrowest = {0: 16.0, 1: 18.0, 2: 28.0, 3: 34.0}
        self.assertNotEqual(dict(ep.PREDICTION_INTERVAL_PCT), narrowest)
        self.assertGreater(sum(ep.PREDICTION_INTERVAL_PCT.values()), sum(narrowest.values()))

    def test_widths_never_shrink_as_risk_grows(self):
        """위험이 늘수록 구간이 좁아지면 등급 자체가 말이 안 된다."""
        w = ep.PREDICTION_INTERVAL_PCT
        tiers = sorted(w)
        for a, b in zip(tiers, tiers[1:]):
            self.assertLessEqual(w[a], w[b], f"위험 {a}→{b}에서 구간이 좁아진다")
        # 라벨·표본수 표가 폭 표와 칸 수가 같아야 한다 (하나만 고치면 KeyError)
        self.assertEqual(set(w), set(ep.PREDICTION_INTERVAL_LABEL))
        self.assertEqual(set(w), set(ep.PREDICTION_INTERVAL_SAMPLE_N))


class TestZeroWeightsNeverKillThePage(unittest.TestCase):
    """72-18절 — 가중치 합이 0이어도 매도가가 나와야 한다.

    ⚠️ 예전엔 `weighted_quantile`이 `None`을 돌려줬고, 호출부는 그 값으로 바로
    산술을 한다 — 8-2절 경매용 매도가 `(p25 + median) / 2`, 29절 구간 표의
    `v * calibration`. 그래서 **`TypeError`로 페이지가 통째로 죽었다.**
    퍼징이 아니면 안 드러날 잠복 지뢰였다.

    7절 가중치는 지금 구조상 0이 될 수 없지만(최소 ~5e-7), 계수 하나만
    바뀌면 0이 될 수 있고 그때 증상이 "매도가가 안 나온다"가 아니라
    "사이트가 죽는다"가 된다.
    """

    def _rows(self, weight, n=5):
        return [{"_weight": weight, "_amount_man": 20000.0 + i * 1000,
                 "_area": 69.0, "_distance_m": 100.0} for i in range(n)]

    def test_all_zero_weights_still_produce_a_price(self):
        for weight in (0.0, -1.0, None):
            scen = ep.compute_scenarios(self._rows(weight), 400.0, 2026, subject_area=69.3)
            for key in ("p25", "median", "p75"):
                self.assertIsNotNone(scen[key], f"가중치 {weight!r}에서 {key}가 None")
            self.assertLessEqual(scen["p25"], scen["median"])
            self.assertLessEqual(scen["median"], scen["p75"])

    def test_the_auction_price_arithmetic_does_not_blow_up(self):
        """8-2절 경매용 매도가는 호출부에서 바로 더한다 — 거기서 터지던 경로다."""
        scen = ep.compute_scenarios(self._rows(0.0), 400.0, 2026, subject_area=69.3)
        auction = round((scen["p25"] + scen["median"]) / 2, -1)
        self.assertGreater(auction, 0)

    def test_price_tiers_survive_too(self):
        tiers = ep.compute_price_tiers(self._rows(0.0), subject_area=69.3)
        vals = [tiers[k] for k in ("urgent", "d30", "d60", "normal", "test")]
        self.assertEqual(vals, sorted(vals))

    def test_the_fallback_is_the_ordinary_percentile(self):
        """가중치가 없으면 **가중치 없는 분위수**가 가장 말이 되는 답이다."""
        vals = [1.0, 2.0, 3.0, 4.0, 5.0]
        self.assertAlmostEqual(ep.weighted_quantile([(v, 0.0) for v in vals], 0.5),
                                ep.weighted_quantile([(v, 1.0) for v in vals], 0.5))

    def test_an_empty_list_is_still_none(self):
        """값이 아예 없으면 답이 없는 게 맞다 — 폴백이 이것까지 덮으면 안 된다."""
        self.assertIsNone(ep.weighted_quantile([], 0.5))


class TestWeightedQuantile(unittest.TestCase):
    """7절 — 복제 근사를 대체한 진짜 가중 분위수."""

    def test_equal_weights_match_ordinary_percentiles(self):
        """가중치가 전부 같으면 통상적인 백분위수와 같아야 한다."""
        pairs = [(float(v), 1.0) for v in range(1, 101)]
        self.assertAlmostEqual(ep.weighted_quantile(pairs, 0.5), 50.5, places=6)
        self.assertAlmostEqual(ep.weighted_quantile(pairs, 0.0), 1.0, places=6)
        self.assertAlmostEqual(ep.weighted_quantile(pairs, 1.0), 100.0, places=6)

    def test_weight_actually_moves_the_answer(self):
        """⚠️ 이게 예전 복제 방식에서 터졌던 버그다 — 가중치가 달라도
        전부 1표로 뭉개져서 답이 안 움직였다."""
        light = ep.weighted_quantile([(100.0, 1.0), (200.0, 1.0)], 0.5)
        heavy = ep.weighted_quantile([(100.0, 100.0), (200.0, 1.0)], 0.5)
        self.assertLess(heavy, light, "가중치를 100배 줬는데 중앙값이 안 끌려왔다")
        # 보간이 들어가므로 정확히 100.0은 아니고 그 바로 옆에 붙는다
        self.assertLess(heavy, 105.0, f"무거운 쪽으로 충분히 안 끌려왔다: {heavy}")

    def test_tiny_weights_are_not_quantized_away(self):
        """0.004 같은 작은 가중치도 0으로 반올림되지 않는다(복제 방식의 약점)."""
        a = ep.weighted_quantile([(100.0, 1.0), (500.0, 0.004)], 0.5)
        b = ep.weighted_quantile([(100.0, 1.0), (500.0, 0.400)], 0.5)
        self.assertNotEqual(a, b)

    def test_quantiles_are_monotone(self):
        pairs = [(10.0, 1.0), (20.0, 3.0), (30.0, 0.5), (40.0, 2.0)]
        vals = [ep.weighted_quantile(pairs, q) for q in (0.1, 0.25, 0.5, 0.75, 0.92)]
        self.assertEqual(vals, sorted(vals), f"분위수가 오름차순이 아니다: {vals}")

    def test_result_stays_inside_the_data_range(self):
        pairs = [(10.0, 1.0), (20.0, 3.0), (30.0, 0.5)]
        for q in (0.0, 0.1, 0.5, 0.9, 1.0):
            v = ep.weighted_quantile(pairs, q)
            self.assertGreaterEqual(v, 10.0)
            self.assertLessEqual(v, 30.0)

    def test_degenerate_inputs_are_safe(self):
        self.assertIsNone(ep.weighted_quantile([], 0.5))            # 값이 아예 없다
        self.assertEqual(ep.weighted_quantile([(7.0, 1.0)], 0.5), 7.0)  # 한 건뿐

    def test_zero_weights_fall_back_instead_of_returning_none(self):
        """⚠️ **계약이 바뀌었다**(72-18절) — 예전엔 `None`이었다.

        호출부가 그 값으로 바로 산술을 해서(8-2절 `(p25 + median) / 2`,
        29절 `v * calibration`) **페이지가 통째로 죽었다.** 값이 있는데
        가중치만 없는 상황에서는 **가중치 없는 분위수**가 가장 말이 되는
        답이라 그렇게 폴백한다.
        """
        self.assertEqual(ep.weighted_quantile([(100.0, 0.0)], 0.5), 100.0)
        self.assertAlmostEqual(
            ep.weighted_quantile([(10.0, 0.0), (20.0, 0.0), (30.0, 0.0)], 0.5), 20.0)


class TestTiersShareTheScenarioDistribution(unittest.TestCase):
    """29절 60일 목표가(p50) == 8절 현실적 체결가.

    ⚠️ 예전엔 두 군데가 **다른 분포**를 썼다 — 8절은 튜키 힌지 + 두 모델
    블렌딩, 29절은 최근접-순위 백분위수 + 총액 모델만. 그래서 29절 원문이
    "거의 같음"이라고 적어야 했다. 한 화면에 나란히 뜨는 두 숫자라 어긋나면
    사용자가 바로 알아챈다."""

    def _rows(self):
        rows = []
        for i in range(12):
            rows.append({
                "_amount_man": 20000.0 + i * 400,
                "_weight": 0.3 + i * 0.1,
                "_distance_m": 50.0 + i * 20,
                "excluUseAr": str(48.0 + i * 0.4),
                "dealYear": "2026",
            })
        return rows

    def test_d60_equals_realistic_price(self):
        rows = self._rows()
        scen = ep.compute_scenarios(rows, 2026, 400, subject_area=50.0)
        tiers = ep.compute_price_tiers(rows, subject_area=50.0)
        self.assertAlmostEqual(tiers["d60"], round(scen["median"], -1), delta=1)

    def test_same_calibration_keeps_them_aligned(self):
        rows = self._rows()
        scen = ep.compute_scenarios(rows, 2026, 400, subject_area=50.0,
                                    calibration=ep.SALE_CALIBRATION_FACTOR)
        tiers = ep.compute_price_tiers(rows, calibration=ep.SALE_CALIBRATION_FACTOR,
                                       subject_area=50.0)
        self.assertAlmostEqual(tiers["d60"], round(scen["median"], -1), delta=1)

    def test_without_subject_area_it_still_works(self):
        """하위호환 — 면적을 안 주면 총액 모델만 쓰고 예외는 안 난다."""
        tiers = ep.compute_price_tiers(self._rows())
        vals = [tiers[k] for k in ("urgent", "d30", "d60", "normal", "test")]
        self.assertEqual(vals, sorted(vals))


class TestBuildingIdentity(unittest.TestCase):
    """51-1절 — 같은 건물 판별을 좌표 20m가 아니라 지번으로."""

    def test_jibun_notation_variants_normalize_together(self):
        """5절이 지번 문자열 비교를 포기했던 이유가 이 흔들림이었다."""
        self.assertEqual(ep.normalize_jibun("123-4"), ep.normalize_jibun("0123-0004"))
        self.assertEqual(ep.normalize_jibun("123"), (False, 123, 0))
        self.assertEqual(ep.normalize_jibun("123-0"), (False, 123, 0))

    def test_mountain_parcel_is_a_different_place(self):
        """⚠️ '산 123-4'와 '123-4'는 **다른 필지다** — 같은 건물로 보면 안 된다."""
        self.assertNotEqual(ep.normalize_jibun("산 123-4"), ep.normalize_jibun("123-4"))

    def test_unreadable_jibun_is_none(self):
        for bad in (None, "", "   ", "번지없음"):
            self.assertIsNone(ep.normalize_jibun(bad), bad)

    def test_identity_includes_the_dong(self):
        """지번 번호는 동마다 반복되므로 동 이름이 반드시 들어가야 한다."""
        a = ep.building_identity("수유동", "468-202")
        b = ep.building_identity("미아동", "468-202")
        self.assertIsNotNone(a)
        self.assertNotEqual(a, b)

    def test_row_identity_matches_geocoded_subject(self):
        """실거래 행(동+지번)과 카카오 지오코딩(본번/부번)이 같은 키를 만든다."""
        row = ep.building_identity("수유동", "468-202")
        subject = ep.building_identity_parts("수유동", "468", "202", False)
        self.assertEqual(row, subject)

    def test_missing_pieces_are_none(self):
        self.assertIsNone(ep.building_identity(None, "468-202"))
        self.assertIsNone(ep.building_identity("수유동", None))
        self.assertIsNone(ep.building_identity_parts("수유동", "0", "0", False))
        self.assertIsNone(ep.building_identity_parts(None, "468", "202", False))


class TestSameBuildingUsesJibunNotDistance(unittest.TestCase):
    """⚠️ 실제로 겪은 설계 결함 — 빌라 밀집지에서 바로 옆 동이 20m 안에
    들어와 **남의 건물이 동일건물 보너스를 받고 있었다.**"""

    def _rows(self):
        # 같은 좌표(=거리 0m)에 있지만 지번이 다른 옆 건물 2건 + 진짜 같은 건물 2건
        def row(jibun, amount):
            return {"umdNm": "수유동", "jibun": jibun, "mhouseNm": "X",
                    "dealYear": "2026", "dealMonth": "8", "dealDay": "1",
                    "dealAmount": f"{amount:,}", "excluUseAr": "50.0", "floor": "3",
                    "buildYear": "2010", "sggCd": "11305", "cdealType": ""}
        return [row("468-202", 20000), row("468-202", 20500),
                row("468-100", 21000), row("468-101", 21500)]

    def _run(self, subject_building):
        import geocode as geo
        # ⚠️ `find_comparables()`는 호출할 때마다 함수 안에서
        #    `from geocode import geocode`로 새로 가져온다 — 그래서 바꿔야 할 건
        #    **`geocode` 모듈의 속성**이다(48절에 적어둔 함정).
        # 네 건 모두 대상과 같은 좌표 — 거리로만 보면 전부 "같은 건물"이 된다.
        orig = geo.geocode
        geo.geocode = lambda *a, **k: (37.5, 127.0)
        try:
            return ep.find_comparables(
                self._rows(), (37.5, 127.0), 50.0, 3, "2010", 400, 2025, 2026, None,
                this_month=9, subject_building=subject_building)
        finally:
            geo.geocode = orig

    def test_distance_fallback_marks_everything(self):
        """폴백(지번 미지정)일 때는 예전처럼 거리로만 판정한다."""
        out = self._run(None)
        self.assertEqual(sum(1 for r in out if r.get("_same_building")), 4)

    def test_jibun_marks_only_the_real_building(self):
        subject = ep.building_identity("수유동", "468-202")
        out = self._run(subject)
        marked = [r for r in out if r.get("_same_building")]
        self.assertEqual(len(marked), 2, "옆 건물까지 같은 건물로 잡혔다")
        self.assertTrue(all(r["jibun"] == "468-202" for r in marked))

    def test_neighbours_lose_the_bonus(self):
        """옆 건물은 거리 점수는 그대로 받되 ×2 보너스는 못 받는다."""
        out = self._run(ep.building_identity("수유동", "468-202"))
        same = [r for r in out if r.get("_same_building")]
        other = [r for r in out if not r.get("_same_building")]
        self.assertGreater(min(r["_weight"] for r in same),
                           max(r["_weight"] for r in other))


class TestZeroToleranceDoesNotCrash(unittest.TestCase):
    """⚠️ 실제로 겪은 크래시: `--build-year-tolerance 0`(= "같은 연식만 보겠다"는
    정상적인 입력)에서 `TypeError: unsupported operand type(s) for *: 'NoneType'`.

    준공년도 점수는 None이 되는데 **아래 가중합 분기는 그대로 준공년도 항목을
    넣고 있었다.** 웹 상세 옵션에도 같은 칸이 있어 방문자가 0을 넣으면
    그대로 오류 화면을 본다.
    """

    def test_build_year_tolerance_zero_scores_instead_of_crashing(self):
        same = ep.similarity_score(100, 400, 60, 60, 0.15, 3, 3, 2012, 2012, 0)
        diff = ep.similarity_score(100, 400, 60, 60, 0.15, 3, 3, 2010, 2012, 0)
        self.assertGreater(same, diff, "같은 연식이 더 높아야 한다")
        for v in (same, diff):
            self.assertGreaterEqual(v, 0)
            self.assertLessEqual(v, 100)

    def test_area_tolerance_zero_also_scores(self):
        v = ep.similarity_score(100, 400, 60, 60, 0, 3, 3, 2012, 2012, 4)
        self.assertGreaterEqual(v, 0)
        self.assertLessEqual(v, 100)

    def test_both_zero_at_once(self):
        v = ep.similarity_score(100, 400, 60, 60, 0, 3, 3, 2012, 2012, 0)
        self.assertGreaterEqual(v, 0)
        self.assertLessEqual(v, 100)

    def test_the_normal_case_is_unchanged(self):
        """고치면서 평소 점수가 바뀌지 않았는지 — 같은 스펙이면 여전히 만점이다."""
        self.assertAlmostEqual(
            ep.similarity_score(0, 400, 60, 60, 0.15, 3, 3, 2012, 2012, 4), 100.0, places=6)

    def test_missing_build_year_still_redistributes(self):
        v = ep.similarity_score(100, 400, 60, 60, 0.15, 3, 3, None, 2012, 4)
        self.assertGreater(v, 0)
        self.assertLessEqual(v, 100)


class TestNanAndInfinityNeverReachTheCalculation(unittest.TestCase):
    """CLAUDE.md 72-7절 — 실거래 응답에 `nan`·`inf` 문자열이 섞여도 계산에
    들어오면 안 된다.

    ⚠️ **NaN은 모든 비교가 False다.** 그래서 예전 가드(`not row_area`)와
    면적 허용범위 검사(`abs(차이)/면적 > 허용범위`)를 **둘 다 그냥
    통과했다** — 그 행이 비교거래로 들어와 7-1절 ㎡당가 모델과 7-2절 월별
    추세를 NaN으로 오염시키는데, 화면에는 아무 표시도 안 난다(48-4절 아파트
    오염과 같은 "조용히 틀리는" 유형이다).

    `float("nan")`·`float("inf")`는 파이썬이 아무 불평 없이 만들어 주므로
    "설마 그런 값이 오겠나"가 아니라 **가드가 실제로 막는지**를 고정한다.
    """

    def _rows(self, poison_area="69.0", poison_amount=30000):
        rows = [_fake_row(f"빌{i}", f"{i}-1", 67 + i * 0.4, 2 + i % 3, 2012,
                          2026, 5, 28000 + i * 400) for i in range(8)]
        bad = _fake_row("독", "9-9", 69.0, 3, 2012, 2026, 5, 30000)
        bad["excluUseAr"] = poison_area
        bad["dealAmount"] = (poison_amount if isinstance(poison_amount, str)
                             else f"{poison_amount:,}")
        return rows + [bad]

    def _comparables(self, rows):
        with patch("geocode.geocode", return_value=(37.6380, 127.0250)):
            return ep.find_comparables(
                rows, subject_coord=(37.6380, 127.0250), area=69.0, floor=3,
                build_year="2012", radius_m=400, year_min=2025, this_year=2026,
                gu_filter=None, this_month=9)

    def test_a_nan_area_is_not_treated_as_a_matching_area(self):
        comparables = self._comparables(self._rows(poison_area="nan"))
        self.assertNotIn("독", [r["mhouseNm"] for r in comparables],
                         "면적이 NaN인 거래가 면적 허용범위 검사를 통과했습니다")

    def test_infinite_and_negative_values_are_rejected(self):
        for label, area, amount in (("무한대 면적", "inf", 30000),
                                    ("음의 무한대 면적", "-Infinity", 30000),
                                    ("자리수 넘침 면적", "1e400", 30000),
                                    ("음수 면적", "-69", 30000),
                                    ("무한대 금액", "69.0", "inf"),
                                    ("NaN 금액", "69.0", "nan"),
                                    ("음수 금액", "69.0", "-30,000"),
                                    ("0원 금액", "69.0", "0")):
            with self.subTest(label):
                comparables = self._comparables(self._rows(area, amount))
                self.assertNotIn("독", [r["mhouseNm"] for r in comparables],
                                 f"{label}인 거래가 계산에 들어왔습니다")

    def test_the_results_stay_finite(self):
        for area in ("nan", "inf", "1e400"):
            with self.subTest(area):
                comparables = self._comparables(self._rows(poison_area=area))
                scenarios = ep.compute_scenarios(comparables, radius_m=400,
                                                 this_year=2026, subject_area=69.0)
                for key in ("p25", "median", "p75"):
                    self.assertTrue(math.isfinite(scenarios[key]),
                                    f"{key}가 유한한 값이 아닙니다: {scenarios[key]}")

    def test_the_monthly_trend_series_ignores_them_too(self):
        """7-2절 월별 추세도 같은 구멍이 있었다 — 여기가 오염되면 추세 보정이
        통째로 NaN이 되어 **매도가까지 번진다**."""
        rows = [_fake_row(f"빌{i}", f"{i}-1", 69.0, 3, 2012, 2026, 1 + i, 30000 + i * 300)
                for i in range(6)]
        poisoned = _fake_row("독", "9-9", 69.0, 3, 2012, 2026, 4, 30000)
        poisoned["excluUseAr"] = "nan"
        series, _label = ep._price_trend_monthly_series(rows + [poisoned], "수유동")
        for _y, _m, value in series:
            self.assertTrue(math.isfinite(value), f"월별 평당가에 NaN이 섞였습니다: {value}")

    def test_is_usable_number_itself(self):
        for value in (float("nan"), float("inf"), float("-inf"), 0.0, -1.0):
            self.assertFalse(ep.is_usable_number(value), f"{value}를 통과시켰습니다")
        for value in (1.0, 69.27, 1e9):
            self.assertTrue(ep.is_usable_number(value), f"{value}를 막았습니다")


class TestTerrainLookupsRunTogether(unittest.TestCase):
    """CLAUDE.md 72-8절 — 34절 주변 지형의 키워드 세 개는 동시에 나가야 한다.

    ⚠️ 예전엔 산 → 강 → 천을 **줄줄이** 기다렸다(실측 0.45초). 서로 의존이
    없는 호출이라 그냥 겹치면 되는데, 19절 입지 체크만 병렬로 고쳐 두고
    여기는 빠뜨려 있었다.

    ⚠️ "빠른지"를 시간으로만 재면 느린 기계에서 깜빡인다 — **동시에 떠 있는
    호출 수**를 세서 고정한다.
    """

    def _run_with_counting_lookup(self, delay=0.05):
        import threading
        import time as _time

        state = {"now": 0, "peak": 0}
        lock = threading.Lock()

        def fake_nearby(lat, lon, keyword, radius_m=None, name_suffix=None):
            with lock:
                state["now"] += 1
                state["peak"] = max(state["peak"], state["now"])
            _time.sleep(delay)
            with lock:
                state["now"] -= 1
            return {"name": f"OO{keyword}", "distance_m": 400}

        import geocode
        saved = geocode.nearby_place
        geocode.nearby_place = fake_nearby
        try:
            started = _time.monotonic()
            result = ep.compute_terrain_check((37.638, 127.025))
            return result, state["peak"], _time.monotonic() - started
        finally:
            geocode.nearby_place = saved

    def test_all_three_keywords_are_in_flight_at_once(self):
        _result, peak, _elapsed = self._run_with_counting_lookup()
        self.assertEqual(peak, 3, f"동시에 떠 있던 호출이 {peak}개입니다 — 줄줄이 돌고 있습니다")

    def test_the_result_shape_is_unchanged(self):
        result, _peak, _elapsed = self._run_with_counting_lookup()
        self.assertEqual(set(result), {"mountain", "mountain_error", "river", "river_error"})
        self.assertEqual(result["mountain"]["name"], "OO산")
        # 강·천 중 가까운 쪽이 하천/강으로 잡힌다 (둘 다 400m면 먼저 들어온 쪽)
        self.assertIn(result["river"]["name"], ("OO강", "OO천"))
        self.assertIsNone(result["mountain_error"])

    def test_one_failing_keyword_does_not_lose_the_others(self):
        import geocode

        def flaky(lat, lon, keyword, radius_m=None, name_suffix=None):
            if keyword == "강":
                raise RuntimeError("카카오 조회 실패")
            return {"name": f"OO{keyword}", "distance_m": 300}

        saved = geocode.nearby_place
        geocode.nearby_place = flaky
        try:
            result = ep.compute_terrain_check((37.638, 127.025))
        finally:
            geocode.nearby_place = saved
        self.assertEqual(result["mountain"]["name"], "OO산")
        self.assertEqual(result["river"]["name"], "OO천", "성공한 키워드 결과가 사라졌습니다")
        self.assertIsNone(result["river_error"], "하나가 성공했으면 오류로 덮지 않는다")


class TestTheScreenNeverStatesStaleWeights(unittest.TestCase):
    """CLAUDE.md 72-9절 — 화면·CLI가 말하는 유사도 배분은 **표에서 끌어와야** 한다.

    ⚠️ 실제로 겪었다: 배분을 거리 35% → 65%로 바꿨는데 CLI 안내 문구는
    "거리 35%·면적 30%·층 20%·준공년도 15%"를 그대로 말하고 있었다. 5절이
    "비교거래를 어떤 기준으로 골랐는지는 항상 설명한다"고 못박은 자리인데,
    그 설명이 틀리면 안 하느니만 못하다.
    """

    def test_the_sentence_is_built_from_the_table(self):
        text = ep.similarity_weights_text()
        for label, key in (("거리", "distance"), ("면적", "area"),
                           ("층", "floor"), ("준공년도", "build_year")):
            pct = round(ep.SIMILARITY_WEIGHTS[key] * 100)
            self.assertIn(f"{label} {pct}%", text, f"{label} 비중이 문구와 다릅니다")

    def test_it_follows_a_changed_table(self):
        saved = dict(ep.SIMILARITY_WEIGHTS)
        try:
            ep.SIMILARITY_WEIGHTS.update({"distance": 0.40, "area": 0.30,
                                          "floor": 0.20, "build_year": 0.10})
            self.assertIn("거리 40%", ep.similarity_weights_text())
        finally:
            ep.SIMILARITY_WEIGHTS.clear()
            ep.SIMILARITY_WEIGHTS.update(saved)

    def test_no_source_file_hardcodes_the_old_split(self):
        """배분값을 문구에 박아 넣는 습관 자체를 막는다 — 주석은 세지 않는다."""
        import re as _re
        stale = _re.compile(r"거리\s*35\s*%\s*[·,]\s*면적\s*30\s*%")
        for rel in ("scripts/estimate_price.py", "webapp/app.py",
                    "webapp/templates/result.html"):
            path = _repo(rel)
            if not os.path.exists(path):
                continue
            with open(path, encoding="utf-8") as f:
                body = "\n".join(line for line in f
                                 if not line.lstrip().startswith(("#", "//")))
            self.assertIsNone(stale.search(body),
                              f"{rel}에 옛 배분이 문구로 박혀 있습니다")


class TestMonthIndexRoundTrip(unittest.TestCase):
    """72-21절 — 계약월 정수 인코딩/디코딩이 **12월에서 어긋났던** 실제 버그.

    30절 유동성 카드가 "데이터상 최근 계약월"을 헤더에 찍는데, 12월이 최신이면
    **2026.12가 아니라 2027.12**로 떴다. `year*12+month`(월이 1~12)를
    `divmod(idx, 12)`로 되돌리면 12월에서 나머지가 0이 되고 몫이 연도+1이 되기
    때문이다. 세는 것(창 계산)은 차이만 쓰므로 정상이었고 **표시만 틀렸다** —
    그래서 화면을 봐도 12월이 아니면 알아챌 수 없었다.
    """

    def test_every_month_survives_the_round_trip(self):
        for year in range(2019, 2031):
            for month in range(1, 13):
                idx = ep.month_index(year, month)
                self.assertEqual(ep.decode_month_index(idx), (year, month),
                                 f"{year}.{month:02d}이 왕복에서 어긋났다")

    def test_december_is_the_case_that_used_to_break(self):
        self.assertEqual(ep.decode_month_index(ep.month_index(2026, 12)), (2026, 12))

    def test_consecutive_months_stay_consecutive_across_the_year_line(self):
        dec = ep.month_index(2026, 12)
        self.assertEqual(ep.decode_month_index(dec - 1), (2026, 11))
        self.assertEqual(ep.decode_month_index(dec + 1), (2027, 1))

    def test_the_naive_divmod_would_fail_this(self):
        """이 인코딩에 `divmod(idx, 12)`를 쓰면 안 된다는 것 자체를 고정한다 —
        누가 '더 간단하게' 되돌리려다 같은 버그를 다시 심는 것을 막는다."""
        idx = ep.month_index(2026, 12)
        self.assertNotEqual(divmod(idx, 12), (2026, 12))

    def test_the_liquidity_card_reports_december_correctly(self):
        """계산부까지 통째로 태워서, 화면에 실리는 값이 맞는지 본다."""
        rows = [_fake_row(f"동일빌라{i}", str(100 + i), 60.0, 3, 2012,
                          2026, 12, 30000) for i in range(4)]
        with patch("geocode.geocode", return_value=(37.6, 127.0)):
            liq = ep.compute_liquidity(rows, (37.6, 127.0), 60.0,
                                       this_year=2027)
        self.assertIsNotNone(liq)
        self.assertEqual((liq["latest_year"], liq["latest_month"]), (2026, 12))


    def test_there_is_only_one_month_encoding_in_the_repo(self):
        """⚠️ 72-21절 — 이 버그를 고치는 과정에서 `month_index`라는 **같은 이름이
        두 파일에 서로 다른 인코딩으로** 생길 뻔했다(rank_areas는 0-based,
        estimate_price는 1-based). 둘을 섞어 쓰면 모든 달이 한 달씩 밀린다.
        그래서 rank_areas가 자기 것을 버리고 공용 함수를 쓰도록 통일했고,
        여기서 그게 유지되는지 고정한다."""
        import rank_areas
        self.assertIs(rank_areas.month_index, ep.month_index)
        self.assertIs(rank_areas.decode_month_index, ep.decode_month_index)

        src = open(_repo("scripts/rank_areas.py"), encoding="utf-8").read()
        src = re.sub(r"#.*", "", src)  # 주석은 세지 않는다
        self.assertNotIn("def month_index", src,
                         "rank_areas가 자기 인코딩을 다시 정의했다 — 짝이 갈린다")
        self.assertNotIn("divmod(latest", src,
                         "divmod로 되돌리면 12월에서 어긋난다 (decode_month_index를 쓸 것)")


class TestRegionIsNotAFactor(unittest.TestCase):
    """72-24절 — **지역별 보정을 측정하고 기각한 판단을 고정한다.**

    깨끗한 표본 131건(경기 86 + 서울 45)으로 재본 결과:

    | | 서울 | 경기 | 차이 |
    |---|---|---|---|
    | 편향 | +0.58% ➖ | −0.37% ➖ | +0.95%p [−6.05, +8.13] ➖ |
    | MAPE | 15.55% | 10.43% | +5.12%p [+0.42, +10.31] ⭐ |

    ① **편향 차이가 없다** → 가격 보정 계수(48-2절 `SALE_CALIBRATION_FACTOR`
       같은 것)를 지역별로 둘 근거가 0이다. 68절 시계열 보정이 서울 −5.2%를
       이미 0 근처로 데려왔다.
    ② 산포 차이는 있지만 **위험요인 세 개가 이미 잡아낸다** — 지역을 네 번째로
       넣으면 갈라내는 폭이 13.5 → 11.6%p로 나빠진다(72-19절 "구축×얇음"
       상호작용을 기각한 것과 같은 형태).
    ③ 서울은 이미 적중 82%로 목표(80%)를 지킨다 — 넓힐 이유가 없다.
    ④ 표본에 서울·경기뿐이라 **"비서울"이 일반화되지 않는다**(55절 버그 ①이
       지역을 잘못 판정해 남의 동네 지수를 보여준 사고였다).

    나중에 누가 지역 보정을 다시 넣으려 하면 여기서 걸린다.
    """

    def test_no_region_specific_calibration_constant_exists(self):
        names = [n for n in dir(ep)
                 if "CALIBRATION" in n.upper() or "REGION_FACTOR" in n.upper()]
        self.assertEqual(names, ["SALE_CALIBRATION_FACTOR"],
                         f"지역별 보정 상수가 새로 생겼다: {names}")
        self.assertEqual(ep.SALE_CALIBRATION_FACTOR, 1.0,
                         "48-4절에서 1.0으로 되돌린 값이다 — 깨끗한 표본에서도 "
                         "편향이 0 근처라 다시 켤 근거가 없다")

    def test_the_risk_count_does_not_look_at_region(self):
        """`count_prediction_risks()`가 지역·주소를 아예 안 받는다는 것 자체를 고정."""
        import inspect
        params = set(inspect.signature(ep.count_prediction_risks).parameters)
        for banned in ("region", "sido", "address", "gu", "lawd_cd", "is_seoul"):
            self.assertNotIn(banned, params,
                             f"지역 정보({banned})가 위험요인 계산에 들어왔다 — 72-24절 참고")
        # ⚠️ `ast`로 **독스트링 노드를 떼고 본문만** 본다 — 주석만 걷어내면
        #    내 설명 표의 "괴리율 ≥3% … 경기만" 같은 글자가 걸려 오탐이 난다
        #    (72-13절 교훈 #5가 여기서 또 재발했다). `inspect.getdoc()`은
        #    들여쓰기를 없애서 원문과 안 맞으므로 문자열 치환으로는 안 된다.
        import ast as _ast, textwrap as _tw
        fn = _ast.parse(_tw.dedent(
            inspect.getsource(ep.count_prediction_risks))).body[0]
        body = fn.body
        if (isinstance(body[0], _ast.Expr) and isinstance(body[0].value, _ast.Constant)
                and isinstance(body[0].value.value, str)):
            body = body[1:]          # 독스트링 제거
        code = "\n".join(_ast.unparse(n) for n in body)
        for banned in ("서울", "경기", "region"):
            self.assertNotIn(banned, code, f"본문에 지역 판정({banned})이 들어왔다")

    def test_the_interval_table_has_one_set_of_widths_not_per_region(self):
        """폭 표가 지역별로 갈라지지 않았는지 — 갈라지면 서울 45건짜리 잡음에
        맞추는 것이 된다(실측 80분위가 ±24/±28/±23/±37로 단조도 아니었다)."""
        self.assertEqual(set(ep.PREDICTION_INTERVAL_PCT), {0, 1, 2, 3})
        for v in ep.PREDICTION_INTERVAL_PCT.values():
            self.assertIsInstance(v, float,
                                  "폭이 숫자 하나가 아니라 지역별 표로 바뀌었다")


class TestReferenceCardsGoNarrowToWide(unittest.TestCase):
    """72-27절 — 참고 정보는 좁은 단위 → 넓은 단위 순이어야 한다.

    사용자 지적: "동 이야기를 먼저 하고 서남권 이런 권역 이야기를 다음에
    하는 게 순서상 맞지 않나". 화면 순서는 테스트가 없으면 다음 편집에서
    **조용히 뒤섞이고 아무도 모른다** — 소스 위치로 고정한다.

    ⚠️ 72-32절에서 동(25절)과 구(69절)가 **한 카드로 합쳐졌다.** 순서 계약은
    그대로다 — 이제 카드 **안에서** 동 → 구 순이고, 그 뒤에 권역 카드가 온다.
    """

    def _template(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "webapp", "templates", "result.html")
        with open(path, encoding="utf-8") as f:
            return f.read()

    def test_dong_then_gu_then_zone(self):
        src = self._template()
        spots = [(src.find("📊 얼마나 자주 팔리나"), "거래 활발도(동)"),
                 (src.find("👥 누가 사 가나"), "매입자 연령대(구)"),
                 (src.find("{% if result.villa_market_trend %}"), "시장 동향(권역)")]
        for pos, name in spots:
            self.assertGreater(pos, 0, f"{name} 가 사라졌다")
        self.assertEqual(spots, sorted(spots),
                         "참고 정보가 좁은 단위 → 넓은 단위 순이 아니다: "
                         + " → ".join(n for _, n in sorted(spots)))

    def test_the_merged_card_comes_before_the_zone_card(self):
        src = self._template()
        self.assertLess(src.index("{% if result.neighbourhood %}"),
                        src.index("{% if result.villa_market_trend %}"))

    def test_each_card_sits_under_its_section_header(self):
        """72-34절 — '참고 정보' 구분선 대신 번호 붙은 구역 헤더를 쓴다."""
        src = self._template()
        for key, sec in (("neighbourhood", "이 동네는 어떤 곳인가"),
                         ("villa_market_trend", "더 넓게 보면")):
            head = src.index(sec)
            self.assertGreater(src.index("{%% if result.%s %%}" % key), head,
                               f"{key} 카드가 '{sec}' 구역 헤더보다 위에 있다")


class TestMarketabilityHeadingIsEmphasised(unittest.TestCase):
    """72-27절 — 이 카드가 매도가 카드와 무엇이 다른지가 핵심 설명이다.

    사용자 지적: "얼마에 팔리나와 별개로 얼마나 잘 팔리나를 본 것이에요,
    이 부분 설명이 중요하자나" — 그 한 줄만 본문보다 크고 진해야 한다.
    """

    def _card(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "webapp", "templates", "result.html")
        with open(path, encoding="utf-8") as f:
            src = f.read()
        start = src.find("🧭 환금성·경쟁 진단")
        self.assertGreater(start, 0, "환금성 진단 카드가 사라졌다")
        return src[start - 200:start + 900]

    def test_the_heading_is_bigger_than_the_default_h3(self):
        card = self._card()
        m = re.search(r"<h3[^>]*font-size:\s*([\d.]+)px[^>]*>🧭 환금성", card)
        self.assertIsNotNone(m, "환금성 제목에 별도 크기 지정이 없다")
        self.assertGreater(float(m.group(1)), 16.5,
                           "기본 h3(16.5px)보다 커야 강조가 된다")

    def test_the_key_sentence_is_bold_and_bigger_than_the_side_notes(self):
        card = self._card()
        m = re.search(r'<p style="[^"]*font-size:\s*([\d.]+)px[^"]*'
                      r'font-weight:\s*(\d+)[^"]*">\s*"얼마에 팔리나"', card)
        self.assertIsNotNone(m, "핵심 문장이 별도 <p>로 크게 들어가 있지 않다")
        size, weight = float(m.group(1)), int(m.group(2))
        self.assertGreaterEqual(size, 16.0, "핵심 문장이 부연(14px)보다 충분히 크지 않다")
        self.assertGreaterEqual(weight, 700, "핵심 문장이 진하지 않다")

    def test_the_side_notes_did_not_get_enlarged_too(self):
        """셋 다 키우면 강조가 사라진다 — 부연은 기본 note-lines 그대로."""
        card = self._card()
        notes = card[card.find('<ul class="note-lines"'):]
        self.assertIn("중요한 순서대로", notes)
        self.assertNotIn("font-size", notes.split("</ul>")[0],
                         "부연 목록에도 크기를 줘서 강조가 흐려졌다")


class TestLocationCheckIsFoldedIntoTheDiagnosis(unittest.TestCase):
    """72-28절 — 입지 체크(19·34·45절)는 환금성 진단 항목 안 접이식이다.

    사용자 지적: "입지 체크 밑에 따로 있는 건 환금성·경쟁 진단 2번 요소랑
    합쳐도 될 것 같아, 쓸데없이 길어짐. 전부 입지 요소니까." — 41절이 이미
    정해둔 패턴(40절 아파트 대비·43절 임장 체크가 그 항목 안으로 들어간 것)
    그대로다.
    """

    def _tpl(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "webapp", "templates", "result.html")
        with open(path, encoding="utf-8") as f:
            return f.read()

    def test_the_fold_lives_inside_the_transit_school_item(self):
        src = self._tpl()
        m = re.search(r"\{%\s*if item\.key == 'transit_school' and result\.location\s*%\}"
                      r"(.{0,400}?)\{%\s*endif\s*%\}", src, re.S)
        self.assertIsNotNone(m, "역세권·학세권 항목 안에 입지 체크 접이식이 없다")
        block = m.group(1)
        self.assertIn("<details", block, "접이식이 아니다 — 펼치기가 안 된다")
        self.assertIn("location_detail()", block)

    def test_the_standalone_card_only_shows_as_a_fallback(self):
        """진단 항목이 있으면 같은 내용이 두 번 뜨면 안 된다(40절 전례)."""
        src = self._tpl()
        self.assertIn("{% if result.location and not _has_ts %}", src,
                      "따로 있는 카드가 폴백 조건 없이 그대로 남아 있다")
        self.assertNotIn("{% if result.location %}\n<div class=\"card\">", src)

    def test_the_fallback_still_renders_everything(self):
        """진단 카드가 아예 안 뜨는 경우에도 입지 정보가 사라지면 안 된다."""
        src = self._tpl()
        fallback = src[src.index("{% if result.location and not _has_ts %}"):]
        fallback = fallback[:fallback.index("{% endif %}")]
        self.assertIn("location_detail()", fallback)

    def test_nothing_was_dropped_from_the_content(self):
        """⚠️ 사용자가 '내용을 줄이라는 건 절대 아냐'라고 못박았다."""
        src = self._tpl()
        macro = src[src.index("{% macro location_detail() %}"):
                    src.index("{% endmacro %}", src.index("{% macro location_detail() %}"))]
        for phrase in (
            "지하철역·초등학교",                  # ★가 무엇인지
            "참고 정보",                          # 나머지 여덟의 성격
            "편의점이 200m냐 400m냐",             # ★ 외를 왜 안 세는지
            "매도가 계산에는 어느 항목도",          # 가격 미반영
            '"자연"은 실험적입니다',               # 34절 경고
            "카카오 로컬",                        # 출처
            "radius_km",                          # 검색 반경
            "loc-star",                           # ★ 표시 자체
            "experimental",                       # 실험적 배지
            "none_text",                          # 못 찾은 항목 문구
        ):
            self.assertIn(phrase, macro, f"입지 체크에서 '{phrase}' 가 사라졌다")


class TestLocationRowsKeepTheDistanceColumn(unittest.TestCase):
    """72-28절 — 긴 이름이 거리 숫자를 밀어내면 안 된다.

    예전 flex 배치에서는 "시티식자재마트 남가좌점"처럼 이름이 길면 줄바꿈되며
    1408m 이 엉뚱한 줄로 떠밀렸다(사용자 스크린샷에서 실제로 그랬다).
    """

    def _css(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "webapp", "static", "app.css")
        with open(path, encoding="utf-8") as f:
            return f.read()

    def _rule(self, selector):
        css = self._css()
        i = css.index(selector + " {")
        return css[i:css.index("}", i)]

    def test_the_row_is_a_grid_with_its_own_distance_column(self):
        rule = self._rule("  .loc-row")
        self.assertIn("display: grid", rule, "flex 로 되돌아가면 거리가 다시 밀린다")
        self.assertIn("grid-template-columns", rule)

    def test_the_distance_never_wraps(self):
        self.assertIn("white-space: nowrap", self._rule("  .loc-dist"))

    def test_the_two_scored_rows_are_visually_separated(self):
        """★ 두 항목이 나머지 여덟과 똑같이 보이면 어느 게 판정에 쓰이는지 모른다."""
        css = self._css()
        self.assertIn(".loc-scored {", css)

    def test_the_experimental_badge_survived(self):
        """34절 '자연' 갈래의 신뢰도 경고 배지 — CSS 정리하다 날리기 쉽다."""
        self.assertIn(".loc-exp {", self._css())
