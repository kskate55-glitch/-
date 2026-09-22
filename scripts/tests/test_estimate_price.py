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
            expected = ep.weight_for_recency("2026", "9", 2026, 9) * ep.SIMILARITY_EMPHASIS_CURVE(100.0)
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


if __name__ == "__main__":
    unittest.main()
