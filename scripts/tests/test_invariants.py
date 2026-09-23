"""계산 결과가 항상 지켜야 하는 성질들 (CLAUDE.md 72-3절).

⚠️ 여기가 깨지면 **화면은 멀쩡한데 숫자가 틀린다** — 48-4절이 제일 비싸게
배운 "조용히 틀리는" 종류다. 단위 테스트가 특정 입력 하나를 보는 것과 달리,
이 파일은 무작위 입력 수백 개에 대해 **성질**이 유지되는지 본다.
"""
import os
import random
import sys
import unittest

_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(_ROOT, "scripts"))

import estimate_price as ep  # noqa: E402
import geocode  # noqa: E402

ROUNDING_MAN = 5   # 구간 값은 10만원 단위로 반올림된다 — 그만큼은 차이가 정상이다


def _sample(rnd, coords):
    """한 동네의 무작위 실거래 목록 — 좌표는 호출부가 쓰는 캐시에 심어 둔다."""
    coords.clear()
    rows = []
    for i in range(rnd.randint(4, 40)):
        area = 60 * rnd.uniform(0.87, 1.13)
        jibun = f"100-{i}"
        coords[f"서울특별시 강북구 수유동 {jibun}"] = (
            37.5 + rnd.uniform(-0.002, 0.002), 127.0 + rnd.uniform(-0.002, 0.002))
        rows.append({
            "umdNm": "수유동", "mhouseNm": f"빌라{i}", "jibun": jibun,
            "dealYear": str(rnd.choice([2025, 2026])), "dealMonth": str(rnd.randint(1, 9)),
            "dealDay": "10", "dealAmount": f"{round(area * rnd.uniform(400, 650)):,}",
            "excluUseAr": f"{area:.1f}", "floor": str(rnd.randint(1, 5)),
            "buildYear": str(rnd.randint(2009, 2015)), "sggCd": "11305",
            "dealingGbn": rnd.choice(["중개거래", "직거래"]),
        })
    return rows


class TestCalculationInvariants(unittest.TestCase):
    TRIALS = 200

    def setUp(self):
        self._geocode = geocode.geocode
        self.coords = {}
        geocode.geocode = lambda a, **k: self.coords.get(a)

    def tearDown(self):
        geocode.geocode = self._geocode

    def _cases(self):
        rnd = random.Random(0)
        for _ in range(self.TRIALS):
            rows = _sample(rnd, self.coords)
            filtered = ep.find_comparables(rows, (37.5, 127.0), 60.0,
                                           rnd.randint(1, 5), "2012", 400,
                                           2025, 2026, None)
            if filtered:
                yield filtered

    def test_quartiles_never_invert(self):
        n = 0
        for f in self._cases():
            sc = ep.compute_scenarios(f, 400, 2026, subject_area=60.0)
            self.assertLessEqual(sc["p25"], sc["median"])
            self.assertLessEqual(sc["median"], sc["p75"])
            n += 1
        self.assertGreater(n, 50, "검사한 표본이 너무 적다 — 테스트가 헛돈다")

    def test_confidence_stays_in_its_declared_range(self):
        for f in self._cases():
            sc = ep.compute_scenarios(f, 400, 2026, subject_area=60.0)
            self.assertGreaterEqual(sc["confidence"], 10)
            self.assertLessEqual(sc["confidence"], 100)

    def test_model_divergence_is_never_negative(self):
        for f in self._cases():
            d = ep.compute_scenarios(f, 400, 2026, subject_area=60.0)["model_divergence_pct"]
            if d is not None:
                self.assertGreaterEqual(d, 0)

    def test_price_tiers_always_ascend(self):
        order = ["urgent", "d30", "d60", "normal", "top"]
        for f in self._cases():
            t = ep.compute_price_tiers(f, subject_area=60.0)
            vals = [t[k] for k in order if k in t]
            self.assertEqual(vals, sorted(vals), f"가격 구간이 뒤집혔다: {vals}")

    def test_the_60day_target_matches_the_realistic_price(self):
        """7-4절 — 29절과 8절이 **같은 분포·같은 블렌딩**을 쓴다. 한 화면에
        나란히 뜨는 두 숫자라 어긋나면 바로 보인다(10만원 반올림 차이는 정상)."""
        for f in self._cases():
            sc = ep.compute_scenarios(f, 400, 2026, subject_area=60.0)
            t = ep.compute_price_tiers(f, subject_area=60.0)
            if "d60" in t:
                self.assertLessEqual(abs(t["d60"] - sc["median"]), ROUNDING_MAN)

    def test_the_prediction_interval_contains_the_estimate(self):
        for f in self._cases():
            sc = ep.compute_scenarios(f, 400, 2026, subject_area=60.0)
            pi = ep.compute_prediction_interval(sc["median"], f, 60.0,
                                                sc["model_divergence_pct"])
            if pi and pi.get("low") is not None:
                self.assertLessEqual(pi["low"], sc["median"])
                self.assertLessEqual(sc["median"], pi["high"])

    def test_the_thin_sample_warning_matches_the_sample_size(self):
        """70절 · 72-19절 — 경고가 실제 상태와 어긋나면 화면이 거짓말을 한다.

        ⚠️ 72-19절에서 **구축 조건이 붙었다** — 신축 얇은 표본은 실측에서
        오히려 정확했다(편향 +0.5% · MAPE 8.6%). 그래서 "얇다"만으로는
        경고가 뜨지 않는 게 맞고, 이 불변식도 두 축을 같이 본다.
        """
        seen = {(True, True): 0, (True, False): 0, (False, True): 0, (False, False): 0}
        for f in self._cases():
            sc = ep.compute_scenarios(f, 400, 2026, subject_area=60.0)
            for build_year in (1995, 2015):
                keys = {w["key"] for w in ep.compute_estimate_warnings(
                    f, sc["model_divergence_pct"], None, None, build_year)}
                thin = len(f) < ep.ESTIMATE_WARN_THIN_SAMPLE
                old = build_year < ep.ESTIMATE_WARN_THIN_OLD_BUILD_YEAR
                fired = "thin_sample" in keys
                self.assertEqual(fired, thin and old,
                                 f"비교거래 {len(f)}건 · {build_year}년식인데 "
                                 f"경고가 {'떴다' if fired else '없다'}")
                seen[(thin, old)] += 1
        # 네 칸을 모두 지나쳤는지 — 한 칸만 돌고 통과하면 고정한 게 없다
        for cell, n in seen.items():
            self.assertGreater(n, 0, f"{cell} 조합을 한 번도 안 봤다")


class TestBasementExclusionIsSound(unittest.TestCase):
    """⚠️ **바꾸려다 실측으로 말린 것**(72-3절).

    5절은 반지하와 지상층을 서로 비교 대상에서 통째로 뺀다. 그러면 표본이
    아주 얇아져서 70절("얇으면 높게 부른다")에 정면으로 걸릴 것처럼 보이는데,
    실제 코드로 돌려 보니 **편향이 없었다**(비교거래 2.4건에서도 −0.0%).
    64절 1층처럼 "섞고 배율로 보정"하는 쪽으로 바꾸면 배율(약 50%)이 조금만
    틀려도 크게 흔들리므로, **지금 방식이 맞다.** 이 테스트는 그 판단을
    고정한다 — 나중에 누가 다시 섞으려 하면 여기서 걸린다.
    """

    def setUp(self):
        self._geocode = geocode.geocode
        self.coords = {}
        geocode.geocode = lambda a, **k: self.coords.get(a)

    def tearDown(self):
        geocode.geocode = self._geocode

    def _rows(self, rnd, basement_share):
        self.coords.clear()
        rows = []
        for i in range(40):
            is_base = rnd.random() < basement_share
            ppm = 500.0 * (0.5 if is_base else 1.0) * rnd.lognormvariate(0, 0.10)
            area = 60 + rnd.uniform(-5, 5)
            jibun = f"100-{i}"
            self.coords[f"서울특별시 강북구 수유동 {jibun}"] = (
                37.5 + rnd.uniform(-0.002, 0.002), 127.0 + rnd.uniform(-0.002, 0.002))
            rows.append({
                "umdNm": "수유동", "mhouseNm": f"빌라{i}", "jibun": jibun,
                "dealYear": "2026", "dealMonth": str(rnd.randint(1, 9)), "dealDay": "10",
                "dealAmount": f"{round(ppm * area):,}", "excluUseAr": f"{area:.1f}",
                "floor": "0" if is_base else str(rnd.randint(2, 5)),
                "buildYear": "2012", "sggCd": "11305", "dealingGbn": "중개거래"})
        return rows

    def test_a_basement_subject_is_not_systematically_overpriced(self):
        rnd = random.Random(1)
        errs = []
        truth = 500.0 * 0.5 * 60.0
        for _ in range(120):
            rows = self._rows(rnd, 0.20)
            f = ep.find_comparables(rows, (37.5, 127.0), 60.0, 0, "2012", 400,
                                    2025, 2026, None)
            if not f:
                continue
            med = ep.compute_scenarios(f, 400, 2026, subject_area=60.0)["median"]
            errs.append((med - truth) / truth * 100)
        self.assertGreater(len(errs), 50)
        bias = sum(errs) / len(errs)
        self.assertLess(abs(bias), 5.0, f"반지하 추정이 한쪽으로 쏠린다 (편향 {bias:+.1f}%)")

    def test_no_above_ground_deal_ever_slips_into_a_basement_comparison(self):
        rnd = random.Random(2)
        for _ in range(40):
            rows = self._rows(rnd, 0.20)
            f = ep.find_comparables(rows, (37.5, 127.0), 60.0, 0, "2012", 400,
                                    2025, 2026, None)
            for row in f:
                self.assertLessEqual(int(row["floor"]), 0,
                                     "지상층 거래가 반지하 비교군에 섞였다")
