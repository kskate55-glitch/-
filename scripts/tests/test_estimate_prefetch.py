"""CLAUDE.md 72-2절 — 실거래·아파트 조회를 미리 던져도 **결과가 같아야 한다**.

⚠️ 속도를 올리려고 순서를 바꾼 것이지 계산을 바꾼 게 아니다. 순서만 바꿨는데
숫자가 달라지면 그건 어딘가 공유 상태가 있다는 뜻이고, 48-4절(아파트가 빌라
조회로 새어 들어간 사고)이 정확히 그런 종류였다.
"""
import os
import re
import sys
import unittest

_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(_ROOT, "scripts"))
sys.path.insert(0, os.path.join(_ROOT, "webapp"))

FORM = {"address": "서울특별시 강북구 수유동 468-202", "area": "69.27",
        "floor": "3", "build_year": "2012"}


def _rows(lawd_cd, year_min=None, **kw):
    return [{"umdNm": "수유동", "mhouseNm": f"빌라{i % 4}", "jibun": f"468-{200 + i % 5}",
             "dealYear": "2026", "dealMonth": str(i % 9 + 1), "dealDay": "10",
             "dealAmount": f"{20000 + i * 300:,}", "excluUseAr": str(60 + i % 8),
             "floor": str(i % 5), "buildYear": str(2010 + i % 5), "sggCd": "11305",
             "dealingGbn": "중개거래"} for i in range(30)]


def _apt(lawd_cd, year_min=None, **kw):
    return [{"umdNm": "수유동", "mhouseNm": "OO아파트", "jibun": "1", "dealYear": "2026",
             "dealMonth": "5", "dealDay": "1", "dealAmount": "60,000",
             "excluUseAr": "84", "floor": "10", "buildYear": "2012",
             "sggCd": "11305"} for _ in range(8)]


class TestPrefetchDoesNotChangeTheAnswer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("MOLIT_SERVICE_KEY", "TESTKEY")
        os.environ.setdefault("KAKAO_REST_API_KEY", "TESTKEY")
        import building_register
        import data_source
        import geocode
        cls._saved = (geocode.geocode, geocode.geocode_full, geocode.nearby_place,
                      data_source.get_trade_rows, data_source.get_apt_rows,
                      building_register.get_building_info)
        geocode.geocode = lambda a, **k: (37.5 + (abs(hash(a)) % 40) / 10000.0, 127.0)
        geocode.geocode_full = lambda a, **k: {
            "lat": 37.5, "lon": 127.0, "b_code": "1130510200",
            "main_no": "468", "sub_no": "202", "is_mountain": False}
        geocode.nearby_place = lambda *a, **k: {"name": "OO역", "distance_m": 300}
        data_source.get_trade_rows = _rows
        data_source.get_apt_rows = _apt
        building_register.get_building_info = lambda *a, **k: None
        import app as webapp
        cls.webapp = webapp
        cls.client = webapp.app.test_client()

    @classmethod
    def tearDownClass(cls):
        import building_register
        import data_source
        import geocode
        (geocode.geocode, geocode.geocode_full, geocode.nearby_place,
         data_source.get_trade_rows, data_source.get_apt_rows,
         building_register.get_building_info) = cls._saved

    def _numbers(self, rows_flag, apt_flag):
        self.webapp.PREFETCH_ROWS, self.webapp.PREFETCH_APT = rows_flag, apt_flag
        resp = self.client.post("/estimate", data=FORM)
        self.assertEqual(resp.status_code, 200)
        html = resp.get_data(as_text=True)
        # 화면에 찍히는 "N.NN억" 을 전부 모은다 — 계산이 달라지면 여기서 갈린다.
        return re.findall(r"\d+\.\d{2}억", html)

    def test_all_four_combinations_give_the_same_numbers(self):
        base = self._numbers(False, False)
        self.assertGreater(len(base), 5, "가격이 거의 안 찍혔다 — 테스트가 헛돈다")
        for rows_flag, apt_flag in ((True, False), (False, True), (True, True)):
            self.assertEqual(self._numbers(rows_flag, apt_flag), base,
                             f"미리받기(rows={rows_flag}, apt={apt_flag})가 숫자를 바꿨다")

    def test_the_flags_exist_so_this_can_be_turned_off(self):
        """문제가 생기면 코드를 되돌리지 않고 플래그만 끌 수 있어야 한다(60절 원칙)."""
        for flag in ("PREFETCH_ROWS", "PREFETCH_APT"):
            self.assertIsInstance(getattr(self.webapp, flag), bool)

    def tearDown(self):
        self.webapp.PREFETCH_ROWS = self.webapp.PREFETCH_APT = True
