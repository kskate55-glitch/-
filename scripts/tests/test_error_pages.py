"""국토부가 XML이 아닌 응답을 보냈을 때 500이 아니라 안내가 떠야 한다.

실제로 겪은 사고의 회귀 테스트다 — 방문자가 `Internal Server Error` 흰
화면을 받았고, 원인은 `_parse_response()`의 `ET.fromstring`이 던진
`ET.ParseError`가 호출부를 통째로 뚫고 올라간 것이었다(일일 트래픽 초과 시
data.go.kr은 HTTP 200에 HTML 에러 페이지를 싣는다).
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))


class TestNonXmlResponse(unittest.TestCase):
    def test_html_error_page_becomes_runtime_error(self):
        import molit_rhtrade_api as m
        body = b"<html><body>SERVICE ERROR: LIMITED NUMBER OF SERVICE REQUESTS</body></html>"
        with self.assertRaises(RuntimeError) as cm:
            m._parse_response(body)
        self.assertNotIsInstance(cm.exception, m.ET.ParseError)

    def test_message_carries_what_actually_came_back(self):
        """무엇이 왔는지 안 적으면 화면만 보고는 원인을 좁힐 수 없다."""
        import molit_rhtrade_api as m
        with self.assertRaises(RuntimeError) as cm:
            m._parse_response(b"<html>LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS</html>")
        self.assertIn("LIMITED NUMBER", str(cm.exception))

    def test_plain_json_error_also_handled(self):
        import molit_rhtrade_api as m
        with self.assertRaises(RuntimeError):
            m._parse_response(b'{"error": "quota exceeded"}')

    def test_valid_xml_still_parses(self):
        import molit_rhtrade_api as m
        xml = (b"<response><header><resultCode>000</resultCode></header>"
               b"<body><items><item><umdNm>\xec\x82\xac\xec\x9a\xb0\xeb\x8f\x99</umdNm>"
               b"</item></items></body></response>")
        self.assertEqual(len(m._parse_response(xml)), 1)


class TestNoRawFlaskErrorPage(unittest.TestCase):
    """어떤 예외가 나도 방문자는 안내 문구를 본다."""

    def test_unexpected_exception_renders_the_form_with_a_message(self):
        """예상 못 한 예외(RuntimeError가 아닌 것)가 나도 안내 화면이 뜬다."""
        import geocode as geo
        import app as webapp

        original = geo.geocode_full
        geo.geocode_full = lambda *a, **k: (_ for _ in ()).throw(ZeroDivisionError("터짐"))
        try:
            r = webapp.app.test_client().post("/estimate", data={
                "address": "경기도 김포시 사우동 1309", "area": "47",
                "floor": "2", "build_year": "2015"})
        finally:
            geo.geocode_full = original
        body = r.get_data(as_text=True)
        self.assertEqual(r.status_code, 500)
        self.assertIn("ZeroDivisionError", body)
        self.assertNotIn("The server encountered an internal error", body)

    def test_404_stays_a_normal_404(self):
        import app as webapp
        r = webapp.app.test_client().get("/__nope__")
        self.assertEqual(r.status_code, 404)



class TrailingSlashAndWrongUrls(unittest.TestCase):
    """CLAUDE.md 70-3절 — 주소 끝에 슬래시가 붙어도 같은 페이지로 간다.

    ⚠️ 실제로 사용자가 여기서 막혔다. 브라우저가 `/healthz/`처럼 슬래시를
    붙여 주는데 Flask 기본값(`strict_slashes=True`)은 그걸 **다른 주소로
    보고 404**를 냈고, 화면에는 영어 기본 문구만 떠서 무엇이 잘못됐는지
    알 수가 없었다.
    """

    def setUp(self):
        import os
        import sys
        root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
        sys.path.insert(0, os.path.join(root, "scripts"))
        sys.path.insert(0, os.path.join(root, "webapp"))
        os.environ.setdefault("KAKAO_REST_API_KEY", "test")
        os.environ.setdefault("MOLIT_SERVICE_KEY", "test")
        import app as appmod
        self.c = appmod.app.test_client()

    def test_a_trailing_slash_still_works(self):
        for path in ("/healthz", "/land-use-check", "/backtest"):
            self.assertEqual(self.c.get(path).status_code, 200, path)
            self.assertEqual(self.c.get(path + "/").status_code, 200, path + "/")

    def test_a_wrong_url_explains_itself_in_korean(self):
        """404 화면이 영어 기본 문구면 사용자는 원인을 알 수 없다."""
        body = self.c.get("/이런페이지는없다").get_data(as_text=True)
        self.assertIn("그 주소에는 아무것도 없어요", body)
        self.assertNotIn("not found on the server", body.lower())

    def test_the_healthz_json_never_carries_a_key_value(self):
        body = self.c.get("/healthz").get_json()
        for name, value in body["optional_keys"].items():
            self.assertIsInstance(value, bool, f"{name}이 값을 통째로 싣고 있다")


if __name__ == "__main__":
    unittest.main()
