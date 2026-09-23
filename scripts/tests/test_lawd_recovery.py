"""낡은 LAWD_CD를 카카오에 물어 되살리는 경로 (56절).

부천시가 순회에서 계속 '데이터 못 찾음'으로 죽었다. 한도 문제가 아니었다 —
알파벳 순서상 앞뒤(동두천시·성남시)가 멀쩡히 성공한 사이에서 혼자 0건이었다.
`data/lawd_codes.md`의 코드가 행정구역 개편을 못 따라간 것이다.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
os.environ.setdefault("KAKAO_REST_API_KEY", "test-key")
os.environ.setdefault("MOLIT_SERVICE_KEY", "test-key")


class TestStaleCodeRecovery(unittest.TestCase):
    def setUp(self):
        import geocode as geo
        import app as webapp
        self.webapp = webapp
        self.geo = geo
        self._orig_geocode_full = geo.geocode_full

    def tearDown(self):
        self.geo.geocode_full = self._orig_geocode_full

    def test_asks_kakao_with_the_region_name(self):
        asked = []

        def fake(addr, timeout=6):
            asked.append(addr)
            return {"b_code": "4119200000"}

        self.geo.geocode_full = fake
        got = self.webapp._lawd_from_kakao("41190")      # 경기도 부천시
        self.assertEqual(got, "41192")
        self.assertEqual(len(asked), 1)
        self.assertIn("부천시", asked[0])
        self.assertIn("경기도", asked[0])

    def test_returns_none_when_kakao_fails(self):
        """이 경로가 죽어서 순회 전체가 멈추면 안 된다."""
        def boom(addr, timeout=6):
            raise TimeoutError("t")
        self.geo.geocode_full = boom
        self.assertIsNone(self.webapp._lawd_from_kakao("41190"))

    def test_returns_none_when_kakao_has_no_bcode(self):
        self.geo.geocode_full = lambda a, timeout=6: {"lat": 1, "lon": 2}
        self.assertIsNone(self.webapp._lawd_from_kakao("41190"))

    def test_returns_none_for_an_unknown_code(self):
        """표에 없는 코드면 물어볼 지역명 자체가 없다."""
        self.geo.geocode_full = lambda a, timeout=6: {"b_code": "9999900000"}
        self.assertIsNone(self.webapp._lawd_from_kakao("99999"))

    def test_only_the_first_five_digits_are_used(self):
        self.geo.geocode_full = lambda a, timeout=6: {"b_code": "1130510300"}
        self.assertEqual(self.webapp._lawd_from_kakao("11305"), "11305")


class TestSweepRetriesWithTheRecoveredCode(unittest.TestCase):
    def setUp(self):
        import app as webapp
        import data_source as ds
        self.webapp, self.ds = webapp, ds
        self._orig_get = ds.get_trade_rows
        self._orig_helper = webapp._lawd_from_kakao

    def tearDown(self):
        self.ds.get_trade_rows = self._orig_get
        self.webapp._lawd_from_kakao = self._orig_helper

    def _rows(self):
        return [{"umdNm": "심곡동", "mhouseNm": "빌라", "jibun": "1",
                 "dealYear": "2026", "dealMonth": "9", "dealDay": "1",
                 "dealAmount": "20,000", "excluUseAr": "47.0", "floor": "2",
                 "buildYear": "2015", "sggCd": "41192"}]

    def test_empty_result_triggers_a_retry_with_the_new_code(self):
        seen = []

        def fake_get(code, *a, **k):
            seen.append(code)
            return self._rows() if code == "41192" else []

        self.ds.get_trade_rows = fake_get
        self.webapp._lawd_from_kakao = lambda code: "41192"
        out = self.webapp._run_region_backtest("41190", months=1, n_cases=1)
        self.assertEqual(seen, ["41190", "41192"], "새 코드로 다시 받아야 한다")
        self.assertNotIn("실거래 데이터를 찾지 못했", out.get("error", ""))

    def test_no_retry_when_the_first_code_works(self):
        seen = []

        def fake_get(code, *a, **k):
            seen.append(code)
            return self._rows()

        self.ds.get_trade_rows = fake_get
        self.webapp._lawd_from_kakao = lambda code: "41192"
        self.webapp._run_region_backtest("41190", months=1, n_cases=1)
        self.assertEqual(seen, ["41190"], "잘 되는데 카카오를 또 부르면 안 된다")

    def test_error_message_says_the_code_looks_stale(self):
        """'데이터 못 찾음'만 보면 한도 문제인지 코드 문제인지 구분이 안 된다."""
        self.ds.get_trade_rows = lambda code, *a, **k: []
        self.webapp._lawd_from_kakao = lambda code: None
        out = self.webapp._run_region_backtest("41190", months=1, n_cases=1)
        self.assertIn("41190", out["error"])
        self.assertIn("0건", out["error"])


if __name__ == "__main__":
    unittest.main()
