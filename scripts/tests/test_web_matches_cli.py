"""
CLAUDE.md 72-10절 — **웹 화면과 CLI가 같은 입력에 같은 매도가를 내는지.**

둘은 `find_comparables()`·`compute_scenarios()`를 공유하지만 **호출 경로가
따로**다. 인자 하나를 한쪽에만 넘기거나(64절 `first_floor_ratio`, 7-2절
`monthly_trend_rate`, 48-2절 `calibration`) 한쪽만 고치면 **화면과 CLI가
조용히 갈린다** — 48-3절이 백테스트에서 같은 이유로 "같은 함수를 쓰게"
못박았고, 7-4절에서는 8절과 29절이 실제로 다른 분포를 쓰고 있었다.

⚠️ 이 테스트가 없으면 그 어긋남을 **사람이 두 화면을 나란히 놓고 눈으로
대조해야만** 발견된다.
"""

import contextlib
import io
import os
import re
import sys
import tempfile
import unittest
import zlib

_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(_ROOT, "scripts"))
sys.path.insert(0, os.path.join(_ROOT, "webapp"))

BASE = (37.6380, 127.0250)
LABELS = ("보수적 급매가", "현실적 체결가", "경매용 매도가", "상단 매도가", "AI 기준매도가")
COMMON_OFF = ["--no-location", "--no-building-info", "--no-brokers",
              "--no-market-trend", "--no-dong-compare", "--no-buyer-age"]


def _fake_geocode(address, **_kw):
    h = zlib.crc32(address.encode())
    return (BASE[0] + (h % 600 - 300) / 1e5, BASE[1] + ((h // 600) % 700 - 350) / 1e5)


def _rows(n=40):
    out = []
    for i in range(n):
        area = 69.0 * (0.88 + (i % 11) * 0.005)
        out.append({"umdNm": "수유동", "mhouseNm": f"빌라{i}", "jibun": f"468-{200 + i % 13}",
                    "dealYear": "2026" if i % 3 else "2025", "dealMonth": str(i % 9 + 1),
                    "dealDay": "10", "dealAmount": f"{26000 + i * 220:,}",
                    "excluUseAr": f"{area:.2f}", "floor": str(i % 5 + 1),
                    "buildYear": str(2010 + i % 5), "sggCd": "11305",
                    "dealingGbn": "중개거래" if i % 7 else "직거래"})
    return out


class TestWebAndCliAgree(unittest.TestCase):
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
        # ⚠️ 48절 — `find_comparables()`는 호출할 때마다 `geocode` **모듈의
        #    속성**을 새로 가져온다. 여기를 안 갈면 실제 카카오로 새어 나간다.
        geocode.geocode = _fake_geocode
        geocode.geocode_full = lambda a, **k: {
            "lat": BASE[0], "lon": BASE[1], "b_code": "1130510200",
            "main_no": "468", "sub_no": "202", "is_mountain": False}
        geocode.nearby_place = lambda *a, **k: None
        data_source.get_trade_rows = lambda lawd, year_min, **k: _rows()
        data_source.get_apt_rows = lambda lawd, year_min, **k: []
        building_register.get_building_info = lambda *a, **k: None

        cls._tmp = tempfile.mkdtemp()
        os.makedirs(os.path.join(cls._tmp, "11305"), exist_ok=True)
        items = "".join("<item>" + "".join(f"<{k}>{v}</{k}>" for k, v in r.items()) + "</item>"
                        for r in _rows())
        with open(os.path.join(cls._tmp, "11305", "202609.xml"), "w", encoding="utf-8") as f:
            f.write(f"<response><body><items>{items}</items></body></response>")

    @classmethod
    def tearDownClass(cls):
        import shutil
        import building_register
        import data_source
        import geocode
        (geocode.geocode, geocode.geocode_full, geocode.nearby_place,
         data_source.get_trade_rows, data_source.get_apt_rows,
         building_register.get_building_info) = cls._saved
        shutil.rmtree(cls._tmp, ignore_errors=True)

    def _from_web(self, form):
        import app
        resp = app.app.test_client().post("/estimate", data=form)
        self.assertEqual(resp.status_code, 200)
        html = resp.get_data(as_text=True)
        found = {}
        for label in LABELS:
            m = re.search(re.escape(label) + r"[^0-9]{0,200}?(\d+\.\d{2})억", html, re.S)
            if m:
                found[label] = m.group(1)
        return found

    def _from_cli(self, argv):
        import estimate_price as ep
        buf, saved = io.StringIO(), sys.argv
        sys.argv = ["estimate_price.py", "--dir", self._tmp] + argv + COMMON_OFF
        try:
            with contextlib.redirect_stdout(buf):
                ep.main()
        finally:
            sys.argv = saved
        text = buf.getvalue()
        found = {}
        for label in LABELS:
            m = re.search(re.escape(label) + r"[^0-9]{0,80}?(\d+\.\d{2})억", text)
            if m:
                found[label] = m.group(1)
        return found

    def _compare(self, form, argv):
        from_web, from_cli = self._from_web(form), self._from_cli(argv)
        self.assertEqual(len(from_web), len(LABELS),
                         f"웹에서 값을 다 못 읽었습니다: {sorted(from_web)}")
        self.assertEqual(from_web, from_cli,
                         "웹과 CLI의 매도가가 어긋났습니다 — 한쪽에만 넘어간 인자가 있습니다")
        return from_web

    def test_the_default_case_matches(self):
        self._compare(
            {"address": "서울특별시 강북구 수유동 468-202", "area": "69.27",
             "floor": "3", "build_year": "2012"},
            ["--address", "서울특별시 강북구 수유동 468-202", "--dong", "수유동",
             "--area", "69.27", "--floor", "3", "--build-year", "2012"])

    def test_a_first_floor_subject_matches_and_is_actually_cheaper(self):
        """64절 1층 보정이 **양쪽에 똑같이** 걸리는지 — 한쪽만 걸리면 여기서 걸린다."""
        upper = self._compare(
            {"address": "서울특별시 강북구 수유동 468-202", "area": "69.27",
             "floor": "3", "build_year": "2012"},
            ["--address", "서울특별시 강북구 수유동 468-202", "--dong", "수유동",
             "--area", "69.27", "--floor", "3", "--build-year", "2012"])
        first = self._compare(
            {"address": "서울특별시 강북구 수유동 468-202", "area": "69.27",
             "floor": "1", "build_year": "2012"},
            ["--address", "서울특별시 강북구 수유동 468-202", "--dong", "수유동",
             "--area", "69.27", "--floor", "1", "--build-year", "2012"])
        self.assertLess(float(first["현실적 체결가"]), float(upper["현실적 체결가"]),
                        "1층인데 위층보다 싸지 않습니다 — 64절 보정이 안 걸렸습니다")

    def test_non_default_radius_and_tolerance_match(self):
        """사용자가 상세 옵션을 건드린 경우도 같은 값이어야 한다."""
        self._compare(
            {"address": "서울특별시 강북구 수유동 468-202", "area": "69.27", "floor": "4",
             "build_year": "2012", "radius": "800", "area_tolerance": "25"},
            ["--address", "서울특별시 강북구 수유동 468-202", "--dong", "수유동",
             "--area", "69.27", "--floor", "4", "--build-year", "2012",
             "--radius", "800", "--area-tolerance", "25"])


if __name__ == "__main__":
    unittest.main()
