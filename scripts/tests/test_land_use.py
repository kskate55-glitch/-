"""CLAUDE.md 50-1절 — 토지이용계획(지역지구) 조회.

⚠️ 네트워크를 타지 않는다. 엔드포인트가 아직 미확인이라 **조회부는 비어 있어도
전체가 안전하게 동작하는지**를 주로 본다(20절/26절 "참고 정보는 실패해도
계산을 막지 않는다" 원칙).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import land_use  # noqa: E402


class TestBuildPnu(unittest.TestCase):
    """PNU = 법정동코드 10 + 필지구분 1 + 본번 4 + 부번 4 = 19자리."""

    def test_matches_a_real_example(self):
        """✅ 공개된 실제 PNU 예시로 자릿수·순서를 고정한다."""
        self.assertEqual(land_use.build_pnu("1126010200", "83", "8"),
                         "1126010200100830008")

    def test_is_always_19_digits(self):
        pnu = land_use.build_pnu("1126010200", "1", "0")
        self.assertEqual(len(pnu), 19)
        self.assertTrue(pnu.isdigit())

    def test_mountain_flag_changes_the_11th_digit(self):
        """⚠️ PNU는 일반=1 / 산=2 — 건축물대장 platGbCd(0/1)와 규칙이 다르다."""
        flat = land_use.build_pnu("1126010200", "83", "8", is_mountain=False)
        mountain = land_use.build_pnu("1126010200", "83", "8", is_mountain=True)
        self.assertEqual(flat[10], "1")
        self.assertEqual(mountain[10], "2")
        self.assertEqual(flat[:10], mountain[:10])
        self.assertEqual(flat[11:], mountain[11:])

    def test_numbers_are_zero_padded(self):
        self.assertTrue(land_use.build_pnu("1126010200", "7", "3").endswith("00070003"))

    def test_bad_input_is_none_not_an_exception(self):
        for args in [("", "1", "1"), ("123", "1", "1"), ("1126010200", "", ""),
                     ("1126010200", "0", "0"), ("1126010200", "abc", "1"),
                     (None, "1", "1")]:
            with self.subTest(args=args):
                self.assertIsNone(land_use.build_pnu(*args))

    def test_missing_sub_number_is_treated_as_zero(self):
        """부번 없는 지번(예: 83번지)도 정상 처리돼야 한다."""
        self.assertEqual(land_use.build_pnu("1126010200", "83", None),
                         "1126010200100830000")


class TestParseZoneNames(unittest.TestCase):
    """응답 구조를 확인 못 했으므로 **어떤 깊이에 있든** 찾아낸다."""

    def test_finds_names_in_a_nested_response(self):
        payload = {"response": {"body": {"items": {"item": [
            {"prposAreaDstrcCodeNm": "제2종일반주거지역"},
            {"prposAreaDstrcCodeNm": "○○1구역 주택재개발사업"},
        ]}}}}
        self.assertEqual(land_use.parse_zone_names(payload),
                         ["제2종일반주거지역", "○○1구역 주택재개발사업"])

    def test_finds_names_in_a_flat_response(self):
        payload = {"items": [{"prposAreaDstrcCodeNm": "정비구역"}]}
        self.assertEqual(land_use.parse_zone_names(payload), ["정비구역"])

    def test_accepts_alternative_field_names(self):
        for field in land_use.ZONE_NAME_FIELDS:
            with self.subTest(field=field):
                self.assertEqual(land_use.parse_zone_names([{field: "정비구역"}]),
                                 ["정비구역"])

    def test_duplicates_are_collapsed_keeping_order(self):
        payload = [{"prposAreaDstrcCodeNm": "가"}, {"prposAreaDstrcCodeNm": "나"},
                   {"prposAreaDstrcCodeNm": "가"}]
        self.assertEqual(land_use.parse_zone_names(payload), ["가", "나"])

    def test_unknown_shape_gives_empty_not_an_error(self):
        """⚠️ 필드명이 틀리면 **틀린 값이 아니라 '못 찾음'으로 드러난다**(40절 설계)."""
        for payload in ({"전혀": "다른구조"}, [], None, "문자열", {"item": [{"x": 1}]}):
            with self.subTest(payload=payload):
                self.assertEqual(land_use.parse_zone_names(payload), [])

    def test_blank_values_are_skipped(self):
        self.assertEqual(
            land_use.parse_zone_names([{"prposAreaDstrcCodeNm": "  "},
                                       {"prposAreaDstrcCodeNm": "정비구역"}]),
            ["정비구역"])


class TestGetLandUseZonesIsSafe(unittest.TestCase):
    """키가 없거나 조회가 실패해도 **조용히 None** — 계산을 절대 막지 않는다."""

    def setUp(self):
        self._orig_url = land_use.LAND_USE_BASE_URL
        self._orig_key = os.environ.get("VWORLD_API_KEY")

    def tearDown(self):
        land_use.LAND_USE_BASE_URL = self._orig_url
        if self._orig_key is None:
            os.environ.pop("VWORLD_API_KEY", None)
        else:
            os.environ["VWORLD_API_KEY"] = self._orig_key

    def test_no_endpoint_means_no_call(self):
        land_use.LAND_USE_BASE_URL = ""
        called = []
        land_use.urlopen = lambda *a, **k: called.append(1)
        try:
            self.assertIsNone(land_use.get_land_use_zones("1126010200", "83", "8"))
            self.assertEqual(called, [], "엔드포인트가 없으면 호출조차 하면 안 된다")
        finally:
            from urllib.request import urlopen as real
            land_use.urlopen = real

    def test_no_vworld_key_means_no_call(self):
        land_use.LAND_USE_BASE_URL = "https://example.invalid/getLandUse"
        os.environ.pop("VWORLD_API_KEY", None)
        called = []
        land_use.urlopen = lambda *a, **k: called.append(1)
        try:
            self.assertIsNone(land_use.get_land_use_zones("1126010200", "83", "8"))
            self.assertEqual(called, [])
        finally:
            from urllib.request import urlopen as real
            land_use.urlopen = real

    def test_network_failure_returns_none(self):
        from urllib.error import URLError
        land_use.LAND_USE_BASE_URL = "https://example.invalid/getLandUse"
        os.environ["VWORLD_API_KEY"] = "test-key"

        def boom(*a, **k):
            raise URLError("죽음")

        land_use.urlopen = boom
        try:
            self.assertIsNone(land_use.get_land_use_zones("1126010200", "83", "8"))
        finally:
            from urllib.request import urlopen as real
            land_use.urlopen = real


class TestRequestShape(unittest.TestCase):
    """요청 URL이 브이월드 NED 규격 그대로인지 고정한다.

    ⚠️ MOLIT 계열 API(`serviceKey`/`type=json`)와 파라미터 이름이 다르다 —
    헷갈려서 바꿔 쓰면 조용히 전부 실패한다.
    """

    def setUp(self):
        self._orig_key = os.environ.get("VWORLD_API_KEY")
        self._orig_url = land_use.LAND_USE_BASE_URL
        self._real = land_use.urlopen

    def tearDown(self):
        land_use.urlopen = self._real
        land_use.LAND_USE_BASE_URL = self._orig_url
        if self._orig_key is None:
            os.environ.pop("VWORLD_API_KEY", None)
        else:
            os.environ["VWORLD_API_KEY"] = self._orig_key

    def test_default_endpoint_is_vworld_ned(self):
        self.assertEqual(land_use.DEFAULT_LAND_USE_URL,
                         "https://api.vworld.kr/ned/data/getLandUseAttr")

    def test_request_uses_vworld_parameter_names(self):
        os.environ["VWORLD_API_KEY"] = "vw-test-key"
        seen = {}

        class _Resp:
            def read(self):
                return b'{"landUses": {"field": [{"prposAreaDstrcCodeNm": "\uc815\ube44\uad6c\uc5ed"}]}}'

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def fake(req, timeout=None):
            seen["url"] = req.full_url
            return _Resp()

        land_use.urlopen = fake
        zones = land_use.get_land_use_zones("1126010200", "83", "8")

        self.assertEqual(zones, ["\uc815\ube44\uad6c\uc5ed"])
        url = seen["url"]
        self.assertIn("key=vw-test-key", url)
        self.assertIn("pnu=1126010200100830008", url)
        self.assertIn("format=json", url)
        # MOLIT 규격과 섞이지 않았는지
        self.assertNotIn("serviceKey=", url)
        self.assertNotIn("type=json", url)


if __name__ == "__main__":
    unittest.main()
