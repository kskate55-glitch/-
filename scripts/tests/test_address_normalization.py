"""72-31절 — 도로명주소·짧은 주소도 받는다.

카카오 주소 검색은 **이미** 지번(address)과 도로명(road_address)을 같이
돌려주는데 우리는 b_code 만 꺼내 쓰고 있었다. 나머지를 읽기만 하면
도로명→지번 변환이 호출 하나 안 늘리고 공짜로 된다.
"""
import json
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
import geocode  # noqa: E402


class _Resp:
    def __init__(self, payload):
        self._b = json.dumps(payload).encode()

    def read(self):
        return self._b

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def _kakao(jibun="서울 서대문구 홍은동 265-218", road="서울 서대문구 홍은로39길 21"):
    sido, sigungu, dong, no = jibun.split()
    main, _, sub = no.partition("-")
    doc = {
        "x": "126.94", "y": "37.6",
        "address": {"address_name": jibun, "region_1depth_name": sido,
                    "region_2depth_name": sigungu, "region_3depth_name": dong,
                    "main_address_no": main, "sub_address_no": sub,
                    "mountain_yn": "N", "b_code": "1141011800"},
        "road_address": ({"address_name": road} if road else None),
    }
    return {"documents": [doc]}


class KakaoGivesUsTheJibunForFree(unittest.TestCase):
    def setUp(self):
        self._tmp = os.path.join(os.path.dirname(__file__), "_tmp_detail.json")
        self._old = geocode.DETAIL_CACHE_PATH
        geocode.DETAIL_CACHE_PATH = self._tmp
        geocode._memory.pop(self._tmp, None)
        os.environ.setdefault("KAKAO_REST_API_KEY", "test")

    def tearDown(self):
        geocode._memory.pop(self._tmp, None)
        geocode.DETAIL_CACHE_PATH = self._old
        for p in (self._tmp, self._tmp + ".corrupt"):
            if os.path.exists(p):
                os.remove(p)

    def _call(self, query, payload):
        with patch.object(geocode, "urlopen", lambda *a, **k: _Resp(payload)):
            return geocode.geocode_full(query)

    def test_a_road_address_comes_back_as_a_jibun_address(self):
        r = self._call("서울 서대문구 홍은로39길 21", _kakao())
        self.assertEqual(r["jibun"], "서울 서대문구 홍은동 265-218")
        self.assertEqual(r["road"], "서울 서대문구 홍은로39길 21")

    def test_the_region_parts_come_along(self):
        r = self._call("홍은동 265-218", _kakao())
        self.assertEqual((r["sido"], r["sigungu"], r["dong"]),
                         ("서울", "서대문구", "홍은동"))

    def test_the_old_fields_are_untouched(self):
        """20절 건축물대장이 쓰는 값이 그대로여야 한다."""
        r = self._call("서울 서대문구 홍은동 265-218", _kakao())
        self.assertEqual(r["b_code"], "1141011800")
        self.assertEqual((r["main_no"], r["sub_no"]), ("265", "218"))
        self.assertIs(r["is_mountain"], False)

    def test_a_missing_road_address_is_fine(self):
        r = self._call("서울 서대문구 홍은동 265-218", _kakao(road=None))
        self.assertIsNone(r["road"])
        self.assertEqual(r["jibun"], "서울 서대문구 홍은동 265-218")

    def test_an_old_cache_entry_is_refetched(self):
        """⚠️ 예전 캐시에는 새 키가 없다 — 그대로 쓰면 조용히 옛 동작이 된다."""
        from json_cache import write_json
        write_json(self._tmp, {"어떤주소": {"lat": 1.0, "lon": 2.0, "b_code": "x"}})
        geocode._memory.pop(self._tmp, None)   # 57절 메모리 캐시를 비운다
        r = self._call("어떤주소", _kakao())
        self.assertEqual(r.get("jibun"), "서울 서대문구 홍은동 265-218")

    def test_a_cached_no_result_is_still_a_hit(self):
        """48-7절 — 카카오가 정상 응답했는데 0건인 건 다시 물어도 소용없다."""
        from json_cache import write_json
        write_json(self._tmp, {"없는주소": None})
        geocode._memory.pop(self._tmp, None)

        def _boom(*a, **k):
            raise AssertionError("캐시된 '결과 없음'인데 다시 호출했다")

        with patch.object(geocode, "urlopen", _boom):
            self.assertIsNone(geocode.geocode_full("없는주소"))


class TheNoticeOnlyShowsWhenItMatters(unittest.TestCase):
    """제대로 쓴 주소에도 매번 뜨면 그냥 잡음이다."""

    def setUp(self):
        os.environ.setdefault("KAKAO_REST_API_KEY", "test")
        os.environ.setdefault("MOLIT_SERVICE_KEY", "test")
        import app
        self.differs = app._address_differs

    def test_province_spelling_alone_is_not_a_difference(self):
        self.assertFalse(self.differs("서울특별시 서대문구 홍은동 265-218",
                                      "서울 서대문구 홍은동 265-218"))
        self.assertFalse(self.differs("경기도 김포시 사우동 1309",
                                      "경기 김포시 사우동 1309"))

    def test_whitespace_alone_is_not_a_difference(self):
        self.assertFalse(self.differs(" 서울  서대문구 홍은동 265-218 ",
                                      "서울 서대문구 홍은동 265-218"))

    def test_a_road_address_is_a_difference(self):
        self.assertTrue(self.differs("홍은로39길 21",
                                     "서울 서대문구 홍은동 265-218"))

    def test_a_missing_district_is_a_difference(self):
        self.assertTrue(self.differs("홍은동 265-218",
                                     "서울 서대문구 홍은동 265-218"))

    def test_no_canonical_means_no_notice(self):
        self.assertFalse(self.differs("아무거나", ""))
        self.assertFalse(self.differs("아무거나", None))


class EveryRegionLookupUsesTheCanonicalAddress(unittest.TestCase):
    """⚠️ 한 군데라도 빠뜨리면 그 카드만 조용히 안 뜬다(72-30절에서 실제로 겪었다)."""

    def test_no_region_helper_reads_the_raw_input(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..", "webapp", "app.py")
        with open(path, encoding="utf-8") as f:
            src = f.read()
        for fn in ("seoul_zone_from_address", "region_from_address",
                   "sido_for_address", "compute_buyer_age",
                   "unavailable_reason", "find_dong_in_address"):
            self.assertNotIn(f"{fn}(address)", src,
                             f"{fn} 이 아직 사용자가 친 글자를 그대로 쓴다")
            self.assertNotIn(f"{fn}(address,", src,
                             f"{fn} 이 아직 사용자가 친 글자를 그대로 쓴다")


if __name__ == "__main__":
    unittest.main()
