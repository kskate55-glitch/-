"""
CLAUDE.md 72-11절 — 응답 압축.

⚠️ Flask도 gunicorn도 **기본적으로 압축을 안 한다.** 결과 페이지가 raw
139KB인데 gzip하면 33KB다 — 느린 모바일에서는 이 76%가 72-2·72-5·72-8절에서
줄인 서버 시간(3.17 → 0.78초)보다 큰 차이를 낸다.

이 테스트가 지키는 것은 "압축이 된다"가 아니라 **"압축 때문에 무언가
깨지지 않는다"**이다 — 앞단이 이미 압축했는데 또 하거나, gzip을 못 받는
브라우저에 gzip을 보내거나, 작은 응답에 헛수고를 하면 안 된다.
"""

import gzip
import os
import sys
import unittest
import zlib

_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(_ROOT, "scripts"))
sys.path.insert(0, os.path.join(_ROOT, "webapp"))

FORM = {"address": "서울특별시 강북구 수유동 468-202", "area": "69.27",
        "floor": "3", "build_year": "2012"}


class TestResponsesAreCompressed(unittest.TestCase):
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
        base = (37.6380, 127.0250)
        geocode.geocode = lambda a, **k: (
            base[0] + (zlib.crc32(a.encode()) % 600 - 300) / 1e5,
            base[1] + ((zlib.crc32(a.encode()) // 600) % 700 - 350) / 1e5)
        geocode.geocode_full = lambda a, **k: {
            "lat": base[0], "lon": base[1], "b_code": "1130510200",
            "main_no": "468", "sub_no": "202", "is_mountain": False}
        geocode.nearby_place = lambda *a, **k: None
        data_source.get_trade_rows = lambda lawd, y, **k: [
            {"umdNm": "수유동", "mhouseNm": f"빌라{i}", "jibun": f"468-{200 + i % 20}",
             "dealYear": "2026", "dealMonth": str(i % 9 + 1), "dealDay": "10",
             "dealAmount": f"{26000 + i * 150:,}", "excluUseAr": f"{65 + i % 8}",
             "floor": str(i % 5 + 1), "buildYear": str(2010 + i % 5),
             "sggCd": "11305", "dealingGbn": "중개거래"} for i in range(60)]
        data_source.get_apt_rows = lambda lawd, y, **k: []
        building_register.get_building_info = lambda *a, **k: None
        import app
        cls.app = app
        cls.client = app.app.test_client()

    @classmethod
    def tearDownClass(cls):
        import building_register
        import data_source
        import geocode
        (geocode.geocode, geocode.geocode_full, geocode.nearby_place,
         data_source.get_trade_rows, data_source.get_apt_rows,
         building_register.get_building_info) = cls._saved

    def test_a_big_page_is_actually_smaller_on_the_wire(self):
        packed = self.client.post("/estimate", data=FORM,
                                  headers={"Accept-Encoding": "gzip"})
        self.assertEqual(packed.headers.get("Content-Encoding"), "gzip")
        raw = gzip.decompress(packed.get_data())
        self.assertLess(len(packed.get_data()), len(raw) / 2,
                        "압축했는데 절반도 안 줄었습니다")
        self.assertIn("Accept-Encoding", packed.headers.get("Vary", ""),
                      "Vary가 없으면 중간 캐시가 gzip 응답을 gzip 못 받는 쪽에 줍니다")

    def test_the_content_is_byte_for_byte_the_same(self):
        import re
        packed = self.client.post("/estimate", data=FORM,
                                  headers={"Accept-Encoding": "gzip"})
        plain = self.client.post("/estimate", data=FORM)
        self.assertIsNone(plain.headers.get("Content-Encoding"),
                          "gzip을 못 받는 브라우저에 gzip을 보냈습니다")
        # ⚠️ 렌더마다 달라지는 것이 두 가지 있다 — 8-1절 그래프의 임의
        #    id(`pd-xxxxxxxx`)와 60-1절 구간 계측의 소요시간. 둘 다 압축과
        #    무관하므로 지우고 비교한다. (이걸 안 하면 **단독 실행에서는
        #    우연히 통과하고 전체 실행에서만 깨지는** 테스트가 된다 —
        #    실제로 그렇게 나왔다.)
        def normalize(text):
            text = re.sub(r"pd-[0-9a-f]{8}", "pd-ID", text)
            return re.sub(r"\d+\.\d+초", "N초", text)

        self.assertEqual(normalize(gzip.decompress(packed.get_data()).decode()),
                         normalize(plain.get_data(as_text=True)),
                         "압축을 풀었더니 원본과 다릅니다")

    def test_the_declared_length_matches_what_we_send(self):
        """Content-Length가 원본 길이로 남아 있으면 브라우저가 응답을 잘라 읽는다."""
        resp = self.client.post("/estimate", data=FORM,
                                headers={"Accept-Encoding": "gzip"})
        self.assertEqual(int(resp.headers["Content-Length"]), len(resp.get_data()))

    def test_a_tiny_response_is_left_alone(self):
        """작은 응답은 압축해봐야 손해다 — 61절 깨우기 핑이 대표적이다."""
        resp = self.client.get("/healthz", headers={"Accept-Encoding": "gzip"})
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.headers.get("Content-Encoding"))

    def test_an_already_encoded_response_is_not_double_compressed(self):
        """앞단(호스팅·CDN)이 이미 압축했으면 손대지 않는다.

        ⚠️ Flask는 첫 요청 뒤 라우트 추가를 막으므로, 압축 함수를 직접
        부른다 — 확인하려는 것이 그 함수의 판단 하나뿐이라 그게 맞다."""
        from flask import Response

        already = gzip.compress(b"x" * 5000)
        with self.app.app.test_request_context("/", headers={"Accept-Encoding": "gzip"}):
            resp = Response(already, mimetype="text/html")
            resp.headers["Content-Encoding"] = "gzip"
            out = self.app._compress(resp)
        self.assertEqual(out.get_data(), already,
                         "이미 압축된 응답을 한 번 더 압축했습니다")

    def test_a_non_text_response_is_left_alone(self):
        """이미지·폰트처럼 이미 압축된 형식은 다시 압축해봐야 커지기만 한다."""
        from flask import Response

        payload = bytes(range(256)) * 40
        with self.app.app.test_request_context("/", headers={"Accept-Encoding": "gzip"}):
            out = self.app._compress(Response(payload, mimetype="image/png"))
        self.assertIsNone(out.headers.get("Content-Encoding"))
        self.assertEqual(out.get_data(), payload)

    def test_every_page_still_renders(self):
        for path, method in (("/", "get"), ("/backtest", "get"), ("/healthz", "get")):
            with self.subTest(path):
                resp = getattr(self.client, method)(path, headers={"Accept-Encoding": "gzip"})
                self.assertEqual(resp.status_code, 200)
                body = resp.get_data()
                if resp.headers.get("Content-Encoding") == "gzip":
                    body = gzip.decompress(body)
                self.assertGreater(len(body), 100)


if __name__ == "__main__":
    unittest.main()
