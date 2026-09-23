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


def _xml(code):
    return (f"<response><header><resultCode>{code}</resultCode>"
            f"<resultMsg>LIMITED</resultMsg></header><body></body></response>").encode()


class _Resp:
    def __init__(self, body):
        self._b = body

    def read(self):
        return self._b

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class TestThrottlingIsRetried(unittest.TestCase):
    """⚠️ 59절 — 58절의 판단을 뒤집었다.

    429를 '일일 한도'로 보고 즉시 포기하게 했었는데, 공식 스펙상 일일 한도는
    **resultCode 22**(HTTP 200 + XML)다. HTTP 429는 게이트웨이의 초당 호출
    제한일 가능성이 크고 **기다리면 풀린다** — 즉시 포기하면 잠깐 숨 고르면
    될 걸 실패로 끝낸다.
    """

    def test_429_backs_off_and_retries(self):
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
        self.assertEqual(len(calls), 3, "429는 기다렸다 다시 시도해야 한다")

    def test_429_waits_longer_than_an_ordinary_error(self):
        """초당 제한이면 1.5초로는 모자라다."""
        import molit_rhtrade_api as m
        waits = []
        with mock.patch.object(m, "urlopen", mock.Mock(side_effect=_429())), \
             mock.patch.object(m, "_get_service_key", lambda: "K"), \
             mock.patch("time.sleep", lambda s: waits.append(s)):
            with self.assertRaises(RuntimeError):
                m.fetch_rhtrade("11305", "202601", retries=3)
        self.assertGreaterEqual(min(waits), m.THROTTLE_BACKOFF_SECONDS)
        self.assertGreater(waits[-1], waits[0], "물러서는 시간이 길어져야 한다")

    def test_429_that_clears_on_retry_succeeds(self):
        """잠깐 몰린 거면 다시 해서 성공해야 한다 — 58절은 이걸 실패로 만들었다."""
        import molit_rhtrade_api as m
        state = {"n": 0}

        def flaky(*a, **k):
            state["n"] += 1
            if state["n"] == 1:
                raise _429()
            return _Resp(_xml("000"))

        with mock.patch.object(m, "urlopen", flaky), \
             mock.patch.object(m, "_get_service_key", lambda: "K"), \
             mock.patch("time.sleep", lambda *_: None):
            self.assertEqual(m.fetch_rhtrade("11305", "202601", retries=3), [])


class TestDailyLimitIsCode22(unittest.TestCase):
    def test_code_22_is_not_retried(self):
        import molit_rhtrade_api as m
        calls = []

        def resp(*a, **k):
            calls.append(1)
            return _Resp(_xml("22"))

        with mock.patch.object(m, "urlopen", resp), \
             mock.patch.object(m, "_get_service_key", lambda: "K"), \
             mock.patch("time.sleep", lambda *_: None):
            with self.assertRaises(RuntimeError) as cm:
                m.fetch_rhtrade("11305", "202601", retries=3)
        self.assertEqual(len(calls), 1, "일일 한도인데 또 불렀다 — 한도를 더 깎는다")
        self.assertIn("내일", str(cm.exception))

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

        def resp(*a, **k):
            calls.append(1)
            return _Resp(_xml("22"))

        with mock.patch.object(m, "urlopen", resp), \
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

    def test_throttling_does_not_stop_the_sweep(self):
        """429는 기다리면 풀리므로 순회를 멈출 이유가 없다 (59절)."""
        self.webapp._run_region_backtest = lambda *a, **k: {
            "error": "국토부 조회 중 문제가 생겼어요: API 호출 3회 실패: HTTP Error 429",
            "gu": "부천시"}
        body = self._post().get_json()
        self.assertFalse(body["quota_exhausted"])

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
