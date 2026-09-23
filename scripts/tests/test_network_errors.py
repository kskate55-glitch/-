"""네트워크 실패가 예외로 새어 나가지 않는지 (CLAUDE.md 54절).

순회 화면이 `조회 실패: The read operation timed out`을 그대로 보여준 게
단서였다 — 읽기 타임아웃은 `TimeoutError`(OSError)이지 `URLError`가 아니라서,
`except (HTTPError, URLError)`로 잡던 코드는 **재시도조차 못 하고** 예외를
그대로 올려보냈다.
"""
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestMolitRetriesOnTimeout(unittest.TestCase):
    def test_read_timeout_is_retried_not_raised(self):
        import molit_rhtrade_api as m
        calls = []

        def boom(*a, **k):
            calls.append(1)
            raise TimeoutError("The read operation timed out")

        with mock.patch.object(m, "urlopen", boom), \
             mock.patch.object(m, "_get_service_key", lambda: "KEY"), \
             mock.patch("time.sleep", lambda *_: None):
            with self.assertRaises(RuntimeError):      # 날 TimeoutError가 아니라
                m.fetch_rhtrade("11305", "202601", retries=3)
        self.assertEqual(len(calls), 3, "타임아웃인데 재시도를 안 했다")

    def test_rent_api_has_the_same_guard(self):
        import molit_rhrent_api as m
        with mock.patch.object(m, "urlopen", mock.Mock(side_effect=TimeoutError("t"))), \
             mock.patch.object(m, "_get_service_key", lambda: "KEY"), \
             mock.patch("time.sleep", lambda *_: None):
            with self.assertRaises(RuntimeError):
                m.fetch_rhrent("11305", "202601", retries=2)


class TestRentParserGuard(unittest.TestCase):
    """52절을 매매 API에만 넣으면 16절을 웹에 붙이는 순간 재발한다."""

    def test_broken_html_becomes_runtime_error(self):
        import molit_rhrent_api as m
        with self.assertRaises(RuntimeError):
            m._parse_response(b"<html><meta charset=utf-8><br></html")

    def test_well_formed_html_also_caught(self):
        import molit_rhrent_api as m
        with self.assertRaises(RuntimeError) as cm:
            m._parse_response(b"<html><body>LIMITED NUMBER OF SERVICE REQUESTS</body></html>")
        self.assertIn("LIMITED NUMBER", str(cm.exception))

    def test_valid_xml_still_parses(self):
        import molit_rhrent_api as m
        xml = (b"<response><header><resultCode>000</resultCode></header>"
               b"<body><items><item><deposit>10,000</deposit></item></items></body></response>")
        self.assertEqual(len(m._parse_response(xml)), 1)


class TestKakaoSurvivesTimeoutAndBadEncoding(unittest.TestCase):
    def _no_cache(self, geo):
        geo._load_cache = lambda: {}
        geo._save_cache = lambda c: None

    def test_geocode_returns_none_on_timeout(self):
        import geocode as geo
        self._no_cache(geo)
        with mock.patch.object(geo, "urlopen", mock.Mock(side_effect=TimeoutError("t"))), \
             mock.patch.dict(os.environ, {"KAKAO_REST_API_KEY": "K"}):
            self.assertIsNone(geo.geocode("서울특별시 강북구 수유동 468"))

    def test_geocode_returns_none_on_non_utf8_error_page(self):
        """오류 페이지가 UTF-8이 아니면 UnicodeDecodeError — JSONDecodeError가 아니다."""
        import geocode as geo
        self._no_cache(geo)

        class Resp:
            def read(self): return b"\xff\xfe<html>error</html>"
            def __enter__(self): return self
            def __exit__(self, *a): return False

        with mock.patch.object(geo, "urlopen", lambda *a, **k: Resp()), \
             mock.patch.dict(os.environ, {"KAKAO_REST_API_KEY": "K"}):
            self.assertIsNone(geo.geocode("서울특별시 강북구 수유동 468"))

    def test_nearby_place_returns_none_on_timeout(self):
        import geocode as geo
        geo._load_cache_file = lambda p: {}
        geo._save_cache_file = lambda p, c: None
        with mock.patch.object(geo, "urlopen", mock.Mock(side_effect=TimeoutError("t"))), \
             mock.patch.dict(os.environ, {"KAKAO_REST_API_KEY": "K"}):
            self.assertIsNone(geo.nearby_place(37.6, 127.0, "지하철역"))


class TestOptionalLookupsNeverRaise(unittest.TestCase):
    """참고 정보(20·21·50-1절)는 실패해도 매도가 계산을 막지 않아야 한다."""

    def test_building_register_returns_none_on_timeout(self):
        import building_register as br
        with mock.patch.object(br, "urlopen", mock.Mock(side_effect=TimeoutError("t"))), \
             mock.patch.dict(os.environ, {"MOLIT_SERVICE_KEY": "K"}):
            self.assertIsNone(br.get_building_info("1130510300", "468", "202"))

    def test_land_use_returns_none_on_timeout(self):
        import land_use as lu
        with mock.patch.object(lu, "urlopen", mock.Mock(side_effect=TimeoutError("t"))), \
             mock.patch.dict(os.environ, {"VWORLD_API_KEY": "K"}):
            self.assertIsNone(lu.get_land_use_zones("1130510300", "468", "202"))


if __name__ == "__main__":
    unittest.main()


class TestBadInputsFailLoudlyNotCryptically(unittest.TestCase):
    """54절 — 0/빈 입력이 ZeroDivisionError로 터지던 자리에 말이 되는 예외를 둔다."""

    def test_zero_area_says_what_is_wrong(self):
        import estimate_price as ep
        with self.assertRaises(ValueError) as cm:
            ep.find_comparables([], (37.6, 127.0), 0, 2, "2015", 400, 2025, 2026, None)
        self.assertIn("전용면적", str(cm.exception))

    def test_negative_area_too(self):
        import estimate_price as ep
        with self.assertRaises(ValueError):
            ep.find_comparables([], (37.6, 127.0), -5, 2, "2015", 400, 2025, 2026, None)

    def test_empty_comparables_scenarios(self):
        import estimate_price as ep
        with self.assertRaises(ValueError):
            ep.compute_scenarios([], 400, 2026)

    def test_empty_comparables_tiers(self):
        import estimate_price as ep
        with self.assertRaises(ValueError):
            ep.compute_price_tiers([])

    def test_normal_area_still_works(self):
        """가드가 정상 경로를 막지 않는지 — 이게 깨지면 계산기 전체가 죽는다."""
        import estimate_price as ep
        self.assertEqual(
            ep.find_comparables([], (37.6, 127.0), 47.0, 2, "2015", 400, 2025, 2026, None),
            [])
