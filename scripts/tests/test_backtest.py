"""CLAUDE.md 48절 — 백테스트 스크립트 회귀 테스트.

이 파일의 존재 이유는 사실상 하나다: **정답 누출(leakage)이 다시 생기지
않게 고정하는 것.** 대상 거래의 계약일 이후(같은 날 포함) 거래가 한 건이라도
비교군에 새어 들어가면 오차가 가짜로 작아지고, 그러면 백테스트 결과 전체가
의미를 잃는다.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import backtest as bt  # noqa: E402
from estimate_price import top_weight_share as ep_top_share  # noqa: E402
import geocode as geo  # noqa: E402
import lawd_lookup  # noqa: E402


def _row(jibun, y, m, d, amount, area=45.0, floor=3, build_year="2012", **extra):
    row = {
        "umdNm": "수유동", "jibun": jibun, "mhouseNm": f"빌라{jibun}",
        "sggCd": "11305", "excluUseAr": str(area), "floor": str(floor),
        "buildYear": build_year, "dealYear": str(y), "dealMonth": str(m),
        "dealDay": str(d), "dealAmount": f"{amount:,}", "dealingGbn": "중개거래",
    }
    row.update(extra)
    return row


class TestYmd(unittest.TestCase):
    def test_parses_contract_date(self):
        self.assertEqual(bt._ymd(_row("1-1", 2026, 8, 15, 30000)), 20260815)

    def test_missing_day_falls_back_to_first(self):
        row = _row("1-1", 2026, 8, 15, 30000)
        del row["dealDay"]
        self.assertEqual(bt._ymd(row), 20260801)

    def test_unparseable_is_none(self):
        row = _row("1-1", 2026, 8, 15, 30000)
        row["dealYear"] = ""
        self.assertIsNone(bt._ymd(row))


class TestNoLeakage(unittest.TestCase):
    """⚠️ 이 클래스가 이 스크립트의 핵심 보증이다."""

    def setUp(self):
        self._orig_geocode = bt.geocode
        self._orig_geo_geocode = geo.geocode
        self._orig_find = bt.find_comparables
        self._orig_cache = lawd_lookup._get_cache
        lawd_lookup._get_cache = lambda: {"11305": ("서울특별시", "강북구")}

        # ⚠️ 두 군데를 다 막아야 한다 — backtest가 import해 둔 이름(bt.geocode)과,
        #    find_comparables가 **호출할 때마다 `from geocode import geocode`로
        #    새로 가져오는** 모듈 속성(geo.geocode). 후자를 안 막으면 비교거래
        #    지오코딩이 실제 카카오 API로 새어 나간다(실제로 겪었다).
        #    지번마다 다른 좌표를 줘야 거리 필터가 의미 있게 돈다.
        def fake(addr):
            h = abs(hash(addr))
            return (37.6500 + (h % 200) / 100000, 127.0200 + (h // 200 % 200) / 100000)

        bt.geocode = fake
        geo.geocode = fake
        self.seen = []                       # find_comparables가 실제로 받은 rows

        def spy(rows, *a, **kw):
            self.seen = list(rows)
            return self._orig_find(rows, *a, **kw)

        bt.find_comparables = spy

    def tearDown(self):
        bt.geocode = self._orig_geocode
        geo.geocode = self._orig_geo_geocode
        bt.find_comparables = self._orig_find
        lawd_lookup._get_cache = self._orig_cache

    def test_target_itself_never_reaches_the_comparables(self):
        target = _row("50-1", 2026, 8, 15, 30000)
        rows = [target] + [_row(f"{i}-1", 2026, 5, 1, 29000) for i in range(10)]
        bt.estimate_as_of(rows, target, 400, 2, 0.15, 4)
        self.assertNotIn(target, self.seen)

    def test_same_day_and_later_trades_are_excluded(self):
        """같은 날 계약 건도 뺀다 — 그날 아침엔 아직 모르는 정보이고, 같은
        건물에서 같은 날 여러 호실이 팔리는 경우가 실제로 있다."""
        target = _row("50-1", 2026, 8, 15, 30000)
        same_day = _row("51-1", 2026, 8, 15, 99999)
        later = _row("52-1", 2026, 9, 1, 99999)
        earlier = _row("53-1", 2026, 8, 14, 29000)
        rows = [target, same_day, later, earlier] + [
            _row(f"{i}-1", 2026, 6, 1, 29000) for i in range(10)]

        bt.estimate_as_of(rows, target, 400, 2, 0.15, 4)
        self.assertNotIn(same_day, self.seen)
        self.assertNotIn(later, self.seen)
        self.assertIn(earlier, self.seen)          # 하루 전 거래는 정상적으로 쓴다

    def test_every_row_handed_over_predates_the_target(self):
        target = _row("50-1", 2026, 8, 15, 30000)
        rows = [target]
        for i in range(30):                        # 대상 전후로 섞어서 깔아둔다
            rows.append(_row(f"{i}-1", 2026, (i % 9) + 1, 10, 29000))
        bt.estimate_as_of(rows, target, 400, 2, 0.15, 4)
        self.assertTrue(self.seen, "비교군이 비어 테스트가 무의미해졌습니다")
        for row in self.seen:
            self.assertLess(bt._ymd(row), 20260815)


class TestPickTargets(unittest.TestCase):
    def setUp(self):
        self._orig_cache = lawd_lookup._get_cache
        lawd_lookup._get_cache = lambda: {"11305": ("서울특별시", "강북구")}

    def tearDown(self):
        lawd_lookup._get_cache = self._orig_cache

    def test_window_counts_from_the_data_not_today(self):
        """12/13/15/30절과 같은 원칙 — 시스템 날짜가 아니라 데이터 안에서
        가장 최근 계약월이 기준이다(신고기한 때문에 이번 달은 덜 차 있다)."""
        rows = [_row("1-1", 2020, 3, 5, 30000), _row("2-1", 2020, 2, 5, 30000),
                _row("3-1", 2019, 1, 5, 30000)]
        picked, pool = bt.pick_targets(rows, months=2, n=10, gu=None, seed=1)
        self.assertEqual(pool, 2)                  # 2020-02, 2020-03만
        self.assertTrue(all(bt._ymd(r) >= 20200201 for r in picked))

    def test_cancelled_contracts_are_never_tested(self):
        rows = [_row("1-1", 2026, 8, 5, 30000, cdealType="해제"),
                _row("2-1", 2026, 8, 6, 30000)]
        picked, pool = bt.pick_targets(rows, months=1, n=10, gu=None, seed=1)
        self.assertEqual(pool, 1)
        self.assertEqual(picked[0]["jibun"], "2-1")

    def test_gu_filter(self):
        rows = [_row("1-1", 2026, 8, 5, 30000),
                _row("2-1", 2026, 8, 6, 30000, sggCd="11500")]
        picked, _ = bt.pick_targets(rows, months=1, n=10, gu="강북구", seed=1)
        self.assertEqual([r["jibun"] for r in picked], ["1-1"])

    def test_seed_makes_the_sample_reproducible(self):
        rows = [_row(f"{i}-1", 2026, 8, (i % 27) + 1, 30000) for i in range(40)]
        a, _ = bt.pick_targets(rows, months=1, n=5, gu=None, seed=99)
        b, _ = bt.pick_targets(rows, months=1, n=5, gu=None, seed=99)
        self.assertEqual([r["jibun"] for r in a], [r["jibun"] for r in b])


class TestSummarize(unittest.TestCase):
    def _r(self, actual, median, p25=None, p75=None):
        return {"actual": actual, "median": median,
                "p25": p25 if p25 is not None else median * 0.9,
                "p75": p75 if p75 is not None else median * 1.1,
                "error_pct": (median - actual) / actual * 100}

    def test_bias_keeps_the_sign(self):
        """평균 절대 오차만 보면 '높게 부르는 도구'와 '낮게 부르는 도구'가
        구별이 안 된다 — 부호를 살린 편향을 따로 본다."""
        s = bt.summarize([self._r(10000, 11000), self._r(10000, 11000)])
        self.assertAlmostEqual(s["bias"], 10.0, places=6)
        self.assertAlmostEqual(s["mape"], 10.0, places=6)

    def test_opposite_errors_cancel_in_bias_but_not_in_mape(self):
        s = bt.summarize([self._r(10000, 11000), self._r(10000, 9000)])
        self.assertAlmostEqual(s["bias"], 0.0, places=6)
        self.assertAlmostEqual(s["mape"], 10.0, places=6)

    def test_hit_rates(self):
        s = bt.summarize([self._r(10000, 10200),    # +2%
                          self._r(10000, 10800),    # +8%
                          self._r(10000, 13000)])   # +30%
        self.assertAlmostEqual(s["within_5"], 100 / 3, places=4)
        self.assertAlmostEqual(s["within_10"], 200 / 3, places=4)
        self.assertAlmostEqual(s["within_20"], 200 / 3, places=4)

    def test_in_band_counts_actual_inside_p25_p75(self):
        s = bt.summarize([self._r(10000, 10000, p25=9000, p75=11000),   # 들어옴
                          self._r(10000, 13000, p25=12000, p75=14000)])  # 벗어남
        self.assertAlmostEqual(s["in_band"], 50.0, places=6)


if __name__ == "__main__":
    unittest.main()


class TestDivergenceIsCarried(unittest.TestCase):
    """48-3절 — 7-1절 모델 괴리율이 건별 결과에 실려 나오는지.

    면적 쏠림 같은 "표본이 대상과 어긋난" 상태는 **가격 편향으로는 안 드러난다**
    (총액·㎡당가 50:50 블렌딩이 상쇄해서다) — 괴리율로만 드러나므로, 크게 튄
    건의 원인을 가리려면 이 값이 반드시 결과에 실려 있어야 한다.
    """

    def setUp(self):
        self._orig_geo_geocode = geo.geocode
        self._orig_geocode = bt.geocode
        self._orig_cache = lawd_lookup._get_cache
        lawd_lookup._get_cache = lambda: {"11305": ("서울특별시", "강북구")}
        coords = {}

        def fake(addr):
            if addr not in coords:
                coords[addr] = (37.6 + len(coords) * 0.0004, 127.0)
            return coords[addr]

        geo.geocode = fake
        bt.geocode = fake

    def tearDown(self):
        geo.geocode = self._orig_geo_geocode
        bt.geocode = self._orig_geocode
        lawd_lookup._get_cache = self._orig_cache

    def test_result_includes_divergence(self):
        rows = [_row(f"{i}-1", 2026, 5, 10 + i, 30000 + i * 400, area=44.0 + i)
                for i in range(8)]
        target = _row("99-1", 2026, 9, 1, 31000, area=48.0)
        out = bt.estimate_as_of(rows + [target], target, 400, 2, 0.15, 4)
        self.assertIsNotNone(out)
        self.assertIsNone(out.get("skipped"), "표본이 충분해야 이 테스트가 의미 있다")
        self.assertIn("divergence", out)
        self.assertIsInstance(out["divergence"], float)

    def test_divergence_is_in_csv_columns(self):
        """CSV로 뽑아야 지역·평형대별 원인 분석이 가능하다."""
        import inspect
        src = inspect.getsource(bt.main)
        self.assertIn('"divergence"', src)




class TestTopWeightShare(unittest.TestCase):
    """49절 — 한 건이 전체 가중치에서 차지하는 지분(`estimate_price` 공용 함수).

    시뮬레이션이 "오차를 가르는 건 표본 수가 아니라 **한 건의 지배력**"이라고
    지목한 지표라, 값이 실제로 그 뜻대로 나오는지 고정한다.
    """

    def test_equal_weights_split_evenly(self):
        rows = [{"_weight": 1.0} for _ in range(4)]
        self.assertAlmostEqual(ep_top_share(rows), 25.0)

    def test_one_dominant_row_shows_up(self):
        rows = [{"_weight": 8.0}, {"_weight": 1.0}, {"_weight": 1.0}]
        self.assertAlmostEqual(ep_top_share(rows), 80.0)

    def test_single_row_is_total_dominance(self):
        self.assertAlmostEqual(ep_top_share([{"_weight": 0.3}]), 100.0)

    def test_empty_or_zero_weights_is_none(self):
        self.assertIsNone(ep_top_share([]))
        self.assertIsNone(ep_top_share([{"_weight": 0}, {"_weight": 0}]))

    def test_missing_weight_key_is_treated_as_zero(self):
        self.assertAlmostEqual(ep_top_share([{"_weight": 3.0}, {}]), 100.0)


class TestDiagnosticFieldsAreCarried(unittest.TestCase):
    """건별 결과에 원인 진단용 필드가 실려 나오는지 — 없으면 사후 분석이 불가능하다."""

    def setUp(self):
        self._orig_geo = geo.geocode
        self._orig_bt_geo = bt.geocode
        self._orig_cache = lawd_lookup._get_cache
        lawd_lookup._get_cache = lambda: {"11305": ("서울특별시", "강북구")}
        coords = {}

        def fake(addr):
            if addr not in coords:
                coords[addr] = (37.6 + len(coords) * 0.0004, 127.0)
            return coords[addr]

        geo.geocode = fake
        bt.geocode = fake

    def tearDown(self):
        geo.geocode = self._orig_geo
        bt.geocode = self._orig_bt_geo
        lawd_lookup._get_cache = self._orig_cache

    def test_all_diagnostic_fields_present(self):
        rows = [_row(f"{i}-1", 2026, 5, 10 + i, 30000 + i * 400) for i in range(8)]
        target = _row("99-1", 2026, 9, 1, 31000)
        out = bt.estimate_as_of(rows + [target], target, 400, 2, 0.15, 4)
        self.assertIsNone(out.get("skipped"))
        for key in ("same_building_n", "outlier_n", "top_weight_share", "divergence"):
            self.assertIn(key, out)
        self.assertGreater(out["top_weight_share"], 0)
        self.assertLessEqual(out["top_weight_share"], 100)

    def test_diagnostic_fields_are_in_csv(self):
        import inspect
        src = inspect.getsource(bt.main)
        for key in ('"same_building_n"', '"top_weight_share"'):
            self.assertIn(key, src)
