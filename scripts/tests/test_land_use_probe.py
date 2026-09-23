"""CLAUDE.md 70-2절 — 정비구역 조회가 **왜** 안 되는지 알려준다.

⚠️ 이 파일의 존재 이유: `get_land_use_zones()`가 다섯 가지 실패(엔드포인트
없음·키 없음·PNU 실패·호출 실패·필드명 불일치)를 전부 `None` 하나로 뭉개서,
화면에서 **"키가 안 먹는 것"과 "정비구역이 아닌 것"을 구분할 수가 없었다**
— 48-4절이 제일 비싸게 배운 "조용히 틀리는" 패턴이다.
"""
import json
import os
import sys
import unittest

_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(_ROOT, "scripts"))
sys.path.insert(0, os.path.join(_ROOT, "webapp"))

import land_use


class _Resp:
    def __init__(self, body): self._b = body
    def read(self): return self._b
    def __enter__(self): return self
    def __exit__(self, *a): return False


class ProbeTells(unittest.TestCase):
    PNU_ARGS = ("1138010600", "468", "202", False)

    def setUp(self):
        self._key = os.environ.get("VWORLD_API_KEY")
        self._open = land_use.urlopen
        os.environ["VWORLD_API_KEY"] = "SECRET-TEST-KEY"

    def tearDown(self):
        land_use.urlopen = self._open
        if self._key is None:
            os.environ.pop("VWORLD_API_KEY", None)
        else:
            os.environ["VWORLD_API_KEY"] = self._key

    def _probe(self, *args):
        return land_use.probe_land_use(*(args or self.PNU_ARGS))

    def test_missing_key_says_so(self):
        os.environ.pop("VWORLD_API_KEY", None)
        self.assertEqual(self._probe()["status"], "no_key")

    def test_bad_pnu_says_so(self):
        self.assertEqual(self._probe("", None, None, False)["status"], "bad_pnu")

    def test_a_failed_call_carries_the_reason(self):
        def boom(req, timeout=8): raise OSError("연결이 끊겼습니다")
        land_use.urlopen = boom
        out = self._probe()
        self.assertEqual(out["status"], "call_failed")
        self.assertIn("연결이 끊겼습니다", out["detail"])

    def test_unknown_field_names_are_not_silent(self):
        """⚠️ 50-1절 필드명이 틀렸을 때 '정비구역 아님'으로 보이면 안 된다."""
        land_use.urlopen = lambda req, timeout=8: _Resp(b'{"something":"else"}')
        out = self._probe()
        self.assertEqual(out["status"], "unreadable")
        self.assertIn("something", out["sample"])

    def test_a_good_response_returns_the_zones(self):
        body = json.dumps({"landUses": {"field": [
            {"prposAreaDstrcCodeNm": "제2종일반주거지역"},
            {"prposAreaDstrcCodeNm": "정비구역"}]}}).encode()
        land_use.urlopen = lambda req, timeout=8: _Resp(body)
        out = self._probe()
        self.assertEqual(out["status"], "ok")
        self.assertIn("정비구역", out["zones"])
        self.assertTrue(out["pnu"])

    def test_the_key_never_shows_up_in_the_sample(self):
        """⚠️ 응답이 요청을 그대로 되비춰도 키가 화면에 나가면 안 된다 (6절)."""
        land_use.urlopen = lambda req, timeout=8: _Resp(
            b'{"echo":"key=SECRET-TEST-KEY"}')
        out = self._probe()
        self.assertNotIn("SECRET-TEST-KEY", out["sample"])
        self.assertIn("***", out["sample"])

    def test_the_old_function_still_behaves_the_same(self):
        """하위호환 — 기존 호출부는 여전히 목록 아니면 None을 받는다."""
        os.environ.pop("VWORLD_API_KEY", None)
        self.assertIsNone(land_use.get_land_use_zones(*self.PNU_ARGS))
        os.environ["VWORLD_API_KEY"] = "SECRET-TEST-KEY"
        body = json.dumps({"landUses": {"field": [
            {"prposAreaDstrcCodeNm": "정비구역"}]}}).encode()
        land_use.urlopen = lambda req, timeout=8: _Resp(body)
        self.assertEqual(land_use.get_land_use_zones(*self.PNU_ARGS), ["정비구역"])


class HealthzReportsKeysWithoutLeakingThem(unittest.TestCase):
    def setUp(self):
        os.environ.setdefault("KAKAO_REST_API_KEY", "test")
        os.environ.setdefault("MOLIT_SERVICE_KEY", "test")
        import app as appmod
        self.c = appmod.app.test_client()
        self._key = os.environ.get("VWORLD_API_KEY")

    def tearDown(self):
        if self._key is None:
            os.environ.pop("VWORLD_API_KEY", None)
        else:
            os.environ["VWORLD_API_KEY"] = self._key

    def test_it_says_whether_the_key_arrived(self):
        os.environ["VWORLD_API_KEY"] = "SECRET-TEST-KEY"
        body = self.c.get("/healthz").get_json()
        self.assertTrue(body["optional_keys"]["VWORLD_API_KEY"])
        os.environ.pop("VWORLD_API_KEY")
        self.assertFalse(self.c.get("/healthz").get_json()["optional_keys"]["VWORLD_API_KEY"])

    def test_it_never_sends_the_value(self):
        os.environ["VWORLD_API_KEY"] = "SECRET-TEST-KEY"
        self.assertNotIn("SECRET-TEST-KEY", self.c.get("/healthz").get_data(as_text=True))


class TheDiagnosticPageNeverCrashes(unittest.TestCase):
    """진단 페이지가 500을 내면 본말전도다."""

    def setUp(self):
        os.environ.setdefault("KAKAO_REST_API_KEY", "test")
        os.environ.setdefault("MOLIT_SERVICE_KEY", "test")
        import app as appmod
        self.c = appmod.app.test_client()
        # ⚠️ 48절 교훈 — 막아두지 않으면 테스트가 실제 카카오 API로 새어 나간다.
        #    `/land-use-check`는 함수 안에서 `from geocode import geocode_full`을
        #    하므로 **모듈 속성**을 갈아야 한다.
        import geocode
        self._geo = geocode.geocode_full
        geocode.geocode_full = lambda *a, **k: None

    def tearDown(self):
        import geocode
        geocode.geocode_full = self._geo

    def test_empty_form_renders(self):
        self.assertEqual(self.c.get("/land-use-check").status_code, 200)

    def test_a_junk_address_renders(self):
        r = self.c.get("/land-use-check?address=%EC%97%86%EB%8A%94%EC%A3%BC%EC%86%8C")
        self.assertEqual(r.status_code, 200)


if __name__ == "__main__":
    unittest.main()


class TestTheKeyNeverReachesTheScreen(unittest.TestCase):
    """⚠️ 이 화면의 문구는 **사용자가 캡처해서 그대로 보낸다** — 저장소가
    공개라 키가 한 번 새면 끝이다(6절). `sample`뿐 아니라 **실패 문구**도
    지운다: 지금 쓰는 예외들은 URL을 안 담지만, 원칙은 "안 새는 걸 확인했다"가
    아니라 "샐 수 없게 해둔다"이다.
    """
    KEY = "SECRET-KEY-DO-NOT-LEAK"

    def setUp(self):
        self._orig = os.environ.get("VWORLD_API_KEY")
        os.environ["VWORLD_API_KEY"] = self.KEY
        import land_use
        self.land_use = land_use
        self._urlopen = land_use.urlopen
        # ⚠️ 폴백 경로(`urlopen_no_pool`)도 같이 막아야 한다 — 하나만 막으면
        #    풀링이 실패했을 때 **실제 브이월드로 요청이 새어 나간다**(프록시
        #    로그에 실제로 8번 찍혔다). 48절·55절이 못박은 그 함정이다.
        self._urlopen_no_pool = land_use.urlopen_no_pool

        def _blocked(*a, **k):
            # 풀링이 실패하면 `_fetch_raw`가 여기로 폴백한다 — 네트워크로
            # 나가지 않으면서 "둘 다 실패"라는 상황은 그대로 재현해야 하므로
            # 같은 계열(OSError)로 돌려준다. 이때 화면에 실리는 것은 **처음
            # 실패(pooled_err)**라, 아래 테스트들이 보는 대상은 그대로다.
            raise OSError("테스트: 네트워크로 나가지 않는다")

        land_use.urlopen_no_pool = _blocked

    def tearDown(self):
        self.land_use.urlopen = self._urlopen
        self.land_use.urlopen_no_pool = self._urlopen_no_pool
        if self._orig is None:
            os.environ.pop("VWORLD_API_KEY", None)
        else:
            os.environ["VWORLD_API_KEY"] = self._orig

    def test_a_failure_message_that_echoes_the_url_is_scrubbed(self):
        def boom(*a, **k):
            raise OSError(f"connect failed: https://api.vworld.kr/x?key={self.KEY}&pnu=1")
        self.land_use.urlopen = boom
        out = self.land_use.probe_land_use("1130510200", "468", "202")
        self.assertEqual(out["status"], "call_failed")
        self.assertNotIn(self.KEY, out["detail"])
        self.assertIn("***", out["detail"])

    def test_a_response_that_echoes_the_key_is_scrubbed(self):
        import io as _io

        class Resp:
            def read(self_inner):
                return f'{{"request":{{"key":"{TestTheKeyNeverReachesTheScreen.KEY}"}}}}'.encode()
            def __enter__(self_inner):
                return self_inner
            def __exit__(self_inner, *a):
                return False
        self.land_use.urlopen = lambda *a, **k: Resp()
        out = self.land_use.probe_land_use("1130510200", "468", "202")
        self.assertNotIn(self.KEY, out["sample"])

    def test_nothing_in_the_result_ever_carries_it(self):
        def boom(*a, **k):
            raise OSError(f"key={self.KEY}")
        self.land_use.urlopen = boom
        out = self.land_use.probe_land_use("1130510200", "468", "202")
        self.assertNotIn(self.KEY, repr(out))


class TestWeCanTellWhoseFaultItIs(unittest.TestCase):
    """⚠️ 실사용 화면에 `RemoteDisconnected`만 한 줄 떴는데, 그것만 보고는
    **우리 쪽 연결 재사용(60절)이 원인인지 상대 서버가 막는 것인지** 가릴 수가
    없었다. 같은 요청을 두 방식으로 보내 보면 그 답이 화면에 남는다.
    """
    KEY = "TESTKEY"

    def setUp(self):
        self._orig = os.environ.get("VWORLD_API_KEY")
        os.environ["VWORLD_API_KEY"] = self.KEY
        import land_use
        self.land_use = land_use
        self._pooled = land_use.urlopen
        self._plain = land_use.urlopen_no_pool

    def tearDown(self):
        self.land_use.urlopen = self._pooled
        self.land_use.urlopen_no_pool = self._plain
        if self._orig is None:
            os.environ.pop("VWORLD_API_KEY", None)
        else:
            os.environ["VWORLD_API_KEY"] = self._orig

    def _resp(self, body):
        class R:
            def read(self_inner):
                return body.encode()
            def __enter__(self_inner):
                return self_inner
            def __exit__(self_inner, *a):
                return False
        return R()

    BODY = '{"prposAreaDstrcCodeNm": "제2종일반주거지역"}'

    def test_a_dropped_connection_is_retried_without_the_pool(self):
        import http.client
        calls = []

        def pooled(*a, **k):
            calls.append("pooled")
            raise http.client.RemoteDisconnected("closed without response")

        def plain(*a, **k):
            calls.append("plain")
            return self._resp(self.BODY)

        self.land_use.urlopen = pooled
        self.land_use.urlopen_no_pool = plain
        out = self.land_use.probe_land_use("1130510200", "468", "202")
        self.assertEqual(out["status"], "ok")
        self.assertEqual(calls, ["pooled", "plain"])
        self.assertIn("연결", out["detail"], "어느 쪽으로 받았는지 화면에 안 남는다")

    def test_a_real_server_answer_is_not_retried(self):
        """4xx·5xx는 상대가 답을 준 것이다 — 다시 보내도 같은 답이 온다."""
        from urllib.error import HTTPError
        calls = []

        def pooled(*a, **k):
            calls.append("pooled")
            raise HTTPError("https://x", 401, "Unauthorized", {}, None)

        self.land_use.urlopen = pooled
        self.land_use.urlopen_no_pool = lambda *a, **k: calls.append("plain")
        out = self.land_use.probe_land_use("1130510200", "468", "202")
        self.assertEqual(out["status"], "call_failed")
        self.assertEqual(calls, ["pooled"], "답을 준 서버에 또 보냈다")

    def test_when_both_ways_fail_the_first_error_is_what_we_report(self):
        import http.client

        def boom(*a, **k):
            raise http.client.RemoteDisconnected("closed without response")

        self.land_use.urlopen = boom
        self.land_use.urlopen_no_pool = boom
        out = self.land_use.probe_land_use("1130510200", "468", "202")
        self.assertEqual(out["status"], "call_failed")
        self.assertIn("RemoteDisconnected", out["detail"])

    def test_the_message_says_what_that_error_means_in_plain_korean(self):
        import http.client

        def boom(*a, **k):
            raise http.client.RemoteDisconnected("closed without response")

        self.land_use.urlopen = boom
        self.land_use.urlopen_no_pool = boom
        detail = self.land_use.probe_land_use("1130510200", "468", "202")["detail"]
        self.assertIn("연결을 끊었습니다", detail)
        self.assertNotIn("**", detail, "화면은 마크다운을 렌더링하지 않는다")
