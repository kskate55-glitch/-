"""국토부 일일 한도(HTTP 429)를 만났을 때 (58절).

사용자 화면에 `API 호출 3회 실패: HTTP Error 429: Too Many Requests`가 떴다.
429는 일일 한도라 **재시도로는 절대 안 풀리는데** 3번을 더 긁고 있었고,
순회는 그 상태로 남은 지역을 계속 두들겼다 — 이미 바닥난 한도를 수백 번 더
쓰고 전부 실패로 끝난다(다음 날 몫까지 미리 까먹는다).
"""
import os
import sys
import unittest
from unittest import mock
from urllib.error import HTTPError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
os.environ.setdefault("MOLIT_SERVICE_KEY", "test-key")
os.environ.setdefault("KAKAO_REST_API_KEY", "test-key")


def _429():
    return HTTPError("u", 429, "Too Many Requests", {}, None)


class TestNoRetryOnQuota(unittest.TestCase):
    def test_429_is_not_retried(self):
        import molit_rhtrade_api as m
        calls = []

        def boom(*a, **k):
            calls.append(1)
            raise _429()

        with mock.patch.object(m, "urlopen", boom), \
             mock.patch.object(m, "_get_service_key", lambda: "K"), \
             mock.patch("time.sleep", lambda *_: None):
            with self.assertRaises(RuntimeError):
                m.fetch_rhtrade("11305", "202601", retries=3)
        self.assertEqual(len(calls), 1, f"429인데 {len(calls)}번 불렀다 — 한도를 더 깎는다")

    def test_message_says_it_is_a_daily_limit(self):
        import molit_rhtrade_api as m
        with mock.patch.object(m, "urlopen", mock.Mock(side_effect=_429())), \
             mock.patch.object(m, "_get_service_key", lambda: "K"), \
             mock.patch("time.sleep", lambda *_: None):
            with self.assertRaises(RuntimeError) as cm:
                m.fetch_rhtrade("11305", "202601")
        msg = str(cm.exception)
        self.assertIn("한도", msg)
        self.assertIn("내일", msg)

    def test_other_http_errors_are_still_retried(self):
        """503 같은 일시적 오류까지 한 방에 포기하면 안 된다."""
        import molit_rhtrade_api as m
        calls = []

        def boom(*a, **k):
            calls.append(1)
            raise HTTPError("u", 503, "Service Unavailable", {}, None)

        with mock.patch.object(m, "urlopen", boom), \
             mock.patch.object(m, "_get_service_key", lambda: "K"), \
             mock.patch("time.sleep", lambda *_: None):
            with self.assertRaises(RuntimeError):
                m.fetch_rhtrade("11305", "202601", retries=3)
        self.assertEqual(len(calls), 3)

    def test_rent_api_has_the_same_guard(self):
        import molit_rhrent_api as m
        calls = []

        def boom(*a, **k):
            calls.append(1)
            raise _429()

        with mock.patch.object(m, "urlopen", boom), \
             mock.patch.object(m, "_get_service_key", lambda: "K"), \
             mock.patch("time.sleep", lambda *_: None):
            with self.assertRaises(RuntimeError):
                m.fetch_rhrent("11305", "202601", retries=3)
        self.assertEqual(len(calls), 1)


class TestSweepStopsOnQuota(unittest.TestCase):
    def setUp(self):
        import app as webapp
        self.webapp = webapp
        self._orig = webapp._run_region_backtest

    def tearDown(self):
        self.webapp._run_region_backtest = self._orig

    def _post(self):
        return self.webapp.app.test_client().post(
            "/backtest/one", data={"lawd_cd": "41190", "n": "6", "months": "3"})

    def test_quota_error_sets_the_stop_flag(self):
        from molit_rhtrade_api import QUOTA_MESSAGE
        self.webapp._run_region_backtest = lambda *a, **k: {
            "error": f"국토부 조회 중 문제가 생겼어요: {QUOTA_MESSAGE}", "gu": "부천시"}
        body = self._post().get_json()
        self.assertFalse(body["ok"])
        self.assertTrue(body["quota_exhausted"], "순회가 계속 돌면 한도를 더 깎는다")

    def test_ordinary_failure_does_not_stop_the_sweep(self):
        """한 지역이 실패했다고 순회 전체를 멈추면 안 된다(48-3절)."""
        self.webapp._run_region_backtest = lambda *a, **k: {
            "error": "이 지역의 실거래 데이터를 찾지 못했어요.", "gu": "부천시"}
        body = self._post().get_json()
        self.assertFalse(body["ok"])
        self.assertFalse(body["quota_exhausted"])

    def test_the_browser_loop_actually_reads_the_flag(self):
        """서버만 고치고 화면이 안 보면 아무 의미가 없다."""
        here = os.path.dirname(__file__)
        path = os.path.join(here, "..", "..", "webapp", "templates", "backtest.html")
        with open(path, encoding="utf-8") as f:
            html = f.read()
        self.assertIn("quota_exhausted", html)
        self.assertIn("quotaStopped", html)


if __name__ == "__main__":
    unittest.main()
