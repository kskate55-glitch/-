"""CLAUDE.md 21절 — 인근 중개업소 조회는 **참고 정보**다.

여기서 터지면 뒤에 오는 섹션(건물 정보·시장 동향·매도가 산출)이 통째로
날아간다. 20·26·50-1절이 지켜온 "참고 정보는 실패해도 계산을 막지 않는다"를
이 경로에서도 고정한다.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import broker_lookup  # noqa: E402

class TestOneBadAddressDoesNotKillTheSection(unittest.TestCase):
    """⚠️ 21절은 참고 정보다 — 사무소 한 건의 지오코딩이 터졌다고 섹션
    전체가, 나아가 CLI 실행 전체가 멈추면 안 된다(20·26·50-1절과 같은 원칙).
    예전엔 `geocode()`가 예외를 던지면 그대로 위로 올라갔다.
    """
    ROWS = [{"법정동명": "수유동", "상태구분": "영업중",
             "주소": f"서울 강북구 수유동 {i}", "상호명": f"공인중개사{i}"}
            for i in range(5)]

    def setUp(self):
        import geocode
        self._orig = geocode.geocode
        self.geocode = geocode

    def tearDown(self):
        self.geocode.geocode = self._orig

    def test_every_lookup_failing_returns_an_empty_list(self):
        def boom(addr, **k):
            raise OSError("카카오 한도 소진")
        self.geocode.geocode = boom
        found, truncated = broker_lookup.find_nearby_brokers_seoul(
            self.ROWS, (37.5, 127.0), "수유동", 1000)
        self.assertEqual(found, [])
        self.assertFalse(truncated)

    def test_one_bad_address_only_drops_that_one(self):
        def flaky(addr, **k):
            if addr.endswith("2"):
                raise OSError("일시 오류")
            return (37.5, 127.0)
        self.geocode.geocode = flaky
        found, _ = broker_lookup.find_nearby_brokers_seoul(
            self.ROWS, (37.5, 127.0), "수유동", 1000)
        self.assertEqual(len(found), len(self.ROWS) - 1)

    def test_the_cli_wraps_it_too(self):
        """호출부에도 방어가 있어야 한다 — 여기서 터지면 뒤 섹션이 다 날아간다."""
        import os
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "..", "estimate_price.py")
        with open(path, encoding="utf-8") as f:
            src = f.read()
        block = src.split("if not args.no_brokers:")[1].split("building_info = None")[0]
        self.assertIn("try:", block)
        self.assertIn("except", block)
