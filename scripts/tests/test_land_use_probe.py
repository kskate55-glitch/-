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
