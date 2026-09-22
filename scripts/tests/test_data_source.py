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
        # 이번 달은 신고가 계속 들어와 캐시하지 않으므로 딱 한 번만 다시 부른다.
        self.assertEqual(len(self.calls), 1)
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
        months = self.D._month_range(2025, self.D.datetime.now().year,
                                      self.D.datetime.now().month)
        self.assertEqual(len(rows), len(months) - 1)


if __name__ == "__main__":
    unittest.main()
