"""CLAUDE.md 22절 — 웹 버전 실거래 조회(월별 병렬 + 파일 캐시) 회귀 테스트.

⚠️ 네트워크를 타지 않는다 — `molit_rhtrade_api`/`molit_apt_api`를 가짜
모듈로 갈아끼워서 "몇 번 불렀는지 / 순서가 유지되는지 / 캐시가 먹는지"만
확인한다(33절의 "추가 설치 없이 unittest만" 원칙 그대로)."""

import os
import shutil
import sys
import tempfile
import types
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _fake_module(name, calls, per_call_rows=1):
    mod = types.ModuleType(name)

    def fetch_all_pages(lawd_cd, ymd, page_size=1000):
        calls.append(ymd)
        return [{"ym": ymd, "umdNm": "수유동"} for _ in range(per_call_rows)]

    mod.fetch_all_pages = fetch_all_pages
    mod.normalize_apt_row = lambda row: row
    return mod


class TestMonthlyFetch(unittest.TestCase):
    def setUp(self):
        self.calls = []
        sys.modules["molit_rhtrade_api"] = _fake_module("molit_rhtrade_api", self.calls)
        sys.modules["molit_apt_api"] = _fake_module("molit_apt_api", self.calls)
        import data_source
        self.D = data_source
        self._orig_cache = data_source.CACHE_DIR
        self.tmp = tempfile.mkdtemp()
        data_source.CACHE_DIR = self.tmp

    def tearDown(self):
        self.D.CACHE_DIR = self._orig_cache
        shutil.rmtree(self.tmp, ignore_errors=True)
        for m in ("molit_rhtrade_api", "molit_apt_api"):
            sys.modules.pop(m, None)

    def test_every_month_is_fetched_exactly_once(self):
        months = self.D._month_range(2025, self.D.datetime.now().year,
                                      self.D.datetime.now().month)
        rows = self.D.get_trade_rows("11305", 2025)
        self.assertEqual(sorted(self.calls), sorted(months))
        self.assertEqual(len(rows), len(months))

    def test_rows_keep_month_order_despite_parallel_fetch(self):
        """병렬로 받아도 결과는 달 순서대로 이어붙어야 한다 — 같은 입력에
        같은 출력이 나와야 디버깅이 된다."""
        rows = self.D.get_trade_rows("11305", 2025)
        got = [r["ym"] for r in rows]
        self.assertEqual(got, sorted(got))

    def test_completed_months_are_cached_and_not_refetched(self):
        self.D.get_trade_rows("11305", 2025)
        first = len(self.calls)
        self.calls.clear()
        self.D.get_trade_rows("11305", 2025)
        # ⚠️ 72-5절 이후로는 **이번 달도 짧은 TTL로 캐시**하므로 곧바로 다시
        #    부르면 0회다(예전엔 이번 달 한 건만 다시 받아 1회였다).
        #    TTL이 지난 뒤의 동작은 `TestCurrentMonthHasAShortTtl`이 따로 본다.
        self.assertEqual(len(self.calls), 0)
        self.assertGreater(first, 1)

    def test_apt_fetch_failure_on_one_month_does_not_break_the_rest(self):
        boom = {"n": 0}

        def flaky(lawd_cd, ymd, page_size=1000):
            boom["n"] += 1
            if boom["n"] == 1:
                raise RuntimeError("일시 오류")
            return [{"ym": ymd}]

        sys.modules["molit_apt_api"].fetch_all_pages = flaky
        rows = self.D.get_apt_rows("11305", 2025)
        # ⚠️ 72-2절 — 아파트는 빌라와 달리 **최근 APT_MONTHS개월**만 받는다.
        #    여기에 21을 박아두면 그 값을 바꿀 때마다 이 테스트가 깨진다.
        now = self.D.datetime.now()
        months = [m for m in self.D._recent_months(self.D.APT_MONTHS, now.year, now.month)
                  if m >= "202501"]
        self.assertEqual(len(rows), len(months) - 1)

    def test_apt_asks_for_fewer_months_than_villa(self):
        """40절은 중앙값 하나만 쓰므로 빌라만큼 길게 받을 이유가 없다 —
        요청당 국토부 호출이 그만큼 줄어든다(48-6절 한도 문제에도 도움)."""
        self.calls.clear()
        self.D.get_trade_rows("11305", 2025)
        villa = len(self.calls)
        self.calls.clear()
        self.D.get_apt_rows("11305", 2025)
        apt = len(self.calls)
        self.assertLess(apt, villa, "아파트가 빌라만큼 많이 부르고 있다")
        self.assertLessEqual(apt, self.D.APT_MONTHS)


if __name__ == "__main__":
    unittest.main()


class TestRecentMonths(unittest.TestCase):
    """72-2절 — 40절 아파트는 최근 12개월만 받는다(호출 9회 절약 + 대기 단축)."""

    def test_counts_back_from_this_month(self):
        import data_source as ds
        self.assertEqual(ds._recent_months(3, 2026, 9), ["202607", "202608", "202609"])

    def test_it_crosses_the_year_boundary(self):
        import data_source as ds
        self.assertEqual(ds._recent_months(4, 2026, 2),
                         ["202511", "202512", "202601", "202602"])

    def test_it_returns_exactly_n_months_in_order(self):
        import data_source as ds
        got = ds._recent_months(12, 2026, 9)
        self.assertEqual(len(got), 12)
        self.assertEqual(got, sorted(got))

    def test_a_full_year_so_the_median_is_not_seasonal(self):
        """⚠️ 8개월로 줄이면 특정 계절에 치우친 중앙값이 나온다 — 만 1년이 기준이다."""
        import data_source as ds
        self.assertGreaterEqual(ds.APT_MONTHS, 12)


class TestMolitCallsShareOneConcurrencyBudget(unittest.TestCase):
    """⚠️ 빌라·아파트를 겹쳐 돌리면 대기시간이 크게 줄지만, 각자 워커 8개를
    쓰면 순간 16개가 나가 59절이 지목한 429(초당 제한) 위험이 커진다.
    슬롯을 공유해 **겹쳐 돌면서도 순간 호출 수는 예전 그대로**여야 한다.
    """

    def test_never_more_than_fetch_workers_at_once(self):
        import threading
        import time

        import data_source as ds

        live, peak, lock = [0], [0], threading.Lock()

        def slow(ym):
            with lock:
                live[0] += 1
                peak[0] = max(peak[0], live[0])
            time.sleep(0.02)
            with lock:
                live[0] -= 1
            return [{"ym": ym}]

        months = [f"2026{m:02d}" for m in range(1, 13)]
        threads = [threading.Thread(target=ds._fetch_months, args=(months, slow))
                   for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertLessEqual(peak[0], ds.FETCH_WORKERS,
                             f"동시 {peak[0]}개가 나갔다 — 슬롯이 안 먹는다")

    def test_results_are_still_in_month_order(self):
        """슬롯을 끼워도 순서 보장(회귀)은 그대로여야 한다."""
        import data_source as ds
        months = [f"2026{m:02d}" for m in range(1, 13)]
        got = ds._fetch_months(months, lambda ym: [{"ym": ym}])
        self.assertEqual([r["ym"] for r in got], months)


class TestCurrentMonthHasAShortTtl(unittest.TestCase):
    """72-5절 — 이번 달도 **짧게는** 캐시한다.

    ⚠️ 22절이 "이번 달은 신고가 계속 들어오므로 캐시하지 않는다"고 정한 건
    맞지만, 실거래 **신고기한이 30일**이라 몇 분 사이에 바뀔 일이 없다.
    그 한 달 때문에 재방문 요청이 매번 국토부를 기다렸다(캐시가 다 찬
    재방문 0.63초 중 0.6초). 10분 TTL로 재방문이 0.04초가 됐다.
    """

    def setUp(self):
        import data_source as ds
        self.D = ds
        self.tmp = tempfile.mkdtemp()
        self._cache_dir = ds.CACHE_DIR
        ds.CACHE_DIR = self.tmp
        self.calls = []
        sys.modules["molit_rhtrade_api"] = _fake_module("molit_rhtrade_api", self.calls)
        sys.modules["molit_apt_api"] = _fake_module("molit_apt_api", self.calls)

    def tearDown(self):
        self.D.CACHE_DIR = self._cache_dir
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _this_ym(self):
        now = self.D.datetime.now()
        return f"{now.year}{now.month:02d}"

    def test_the_current_month_is_not_refetched_within_the_ttl(self):
        self.D.get_trade_rows("11305", 2025)
        self.calls.clear()
        self.D.get_trade_rows("11305", 2025)
        self.assertEqual(self.calls, [], "이번 달을 또 받아왔다")

    def test_it_is_refetched_once_the_ttl_passes(self):
        self.D.get_trade_rows("11305", 2025)
        path = os.path.join(self.tmp, self.D.TRADE_CACHE_DIR, "11305",
                            f"{self._this_ym()}.current.json")
        blob = self.D.read_json(path, default={})
        blob["ts"] = blob["ts"] - self.D.CURRENT_MONTH_TTL_SEC - 1
        self.D.write_json(path, blob)
        self.calls.clear()
        self.D.get_trade_rows("11305", 2025)
        self.assertEqual(self.calls, [self._this_ym()], "TTL이 지났는데 안 받아왔다")

    def test_completed_months_still_use_the_permanent_cache(self):
        """짧은 TTL은 **이번 달에만** 걸려야 한다 — 지난 달까지 매번 다시
        받으면 48-6절 한도 문제가 도로 나빠진다."""
        self.D.get_trade_rows("11305", 2025)
        path = os.path.join(self.tmp, self.D.TRADE_CACHE_DIR, "11305",
                            f"{self._this_ym()}.current.json")
        os.remove(path)                      # 이번 달만 만료시킨다
        self.calls.clear()
        self.D.get_trade_rows("11305", 2025)
        self.assertEqual(self.calls, [self._this_ym()])

    def test_a_broken_current_cache_is_ignored_not_fatal(self):
        """53절 보장이 여기에도 적용돼야 한다."""
        self.D.get_trade_rows("11305", 2025)
        path = os.path.join(self.tmp, self.D.TRADE_CACHE_DIR, "11305",
                            f"{self._this_ym()}.current.json")
        with open(path, "w", encoding="utf-8") as f:
            f.write("{깨진 파일")
        self.calls.clear()
        rows = self.D.get_trade_rows("11305", 2025)
        self.assertTrue(rows)
        self.assertEqual(self.calls, [self._this_ym()])

    def test_apt_gets_the_same_treatment(self):
        self.D.get_apt_rows("11305", 2025)
        self.calls.clear()
        self.D.get_apt_rows("11305", 2025)
        self.assertEqual(self.calls, [], "아파트 이번 달을 또 받아왔다")
