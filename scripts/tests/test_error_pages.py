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


class TestFormsKeepTheirOwnMethod(unittest.TestCase):
    """⚠️ **사용자가 실제로 맞은 405의 진짜 원인.**

    `base.html`의 제출 핸들러가 `document.querySelectorAll("form")`으로 페이지의
    **모든** 폼을 가로채 **무조건 POST**로 바꿔 보내고 있었다. 그래서
    `method="get"`인 70-2절 진단 폼이 서버가 받을 수 없는 메서드로 나가
    405가 떴다 — 70-3절에서 고친 건 **에러 화면 문구**뿐이었고 원인은 그대로
    남아 있었다. 새 페이지를 만들 때마다 같은 사고가 나길 기다리는 구조다.
    """
    _ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")

    def _base_html(self):
        # ⚠️ 72-36절에서 제출 핸들러 JS 가 base.html 인라인 →
        #    webapp/static/app.js 로 옮겨졌다. 계약은 그대로다.
        with open(os.path.join(self._ROOT, "webapp/static/app.js"),
                  encoding="utf-8") as f:
            return f.read()

    def test_the_handler_reads_the_forms_own_method(self):
        src = self._base_html()
        self.assertIn('form.getAttribute("method")', src,
                      "폼이 정한 전송 방식을 읽지 않으면 GET 폼이 또 POST로 나간다")

    def test_it_no_longer_hardcodes_post(self):
        src = self._base_html()
        self.assertNotIn('method: "POST"', src,
                         "전송 방식을 다시 박아버리면 GET 폼이 405로 죽는다")

    def test_every_form_in_the_project_is_reachable_by_its_own_method(self):
        """폼이 선언한 method로 실제 서버가 받아주는지 — 템플릿을 훑어 확인한다."""
        import re

        import app as webapp

        rules = {r.rule: r.methods for r in webapp.app.url_map.iter_rules()}
        tpl_dir = os.path.join(self._ROOT, "webapp/templates")
        checked = 0
        for name in os.listdir(tpl_dir):
            if not name.endswith(".html"):
                continue
            with open(os.path.join(tpl_dir, name), encoding="utf-8") as f:
                html = f.read()
            for tag in re.findall(r"<form[^>]*>", html):
                method = (re.search(r'method="([^"]+)"', tag) or [None, "get"])[1].upper()
                action = (re.search(r'action="([^"]+)"', tag) or [None, None])[1]
                if not action or not action.startswith("/"):
                    continue
                self.assertIn(action, rules, f"{name}: {action} 라우트가 없다")
                self.assertIn(method, rules[action],
                              f"{name}: {action} 폼이 {method}인데 서버가 안 받는다")
                checked += 1
        self.assertGreater(checked, 3, "폼을 하나도 못 찾았다 — 검사가 헛돌았다")


class TestDiagnosticPageTakesBothMethods(unittest.TestCase):
    """진단 페이지가 프론트 버그 하나에 같이 죽으면 본말전도다 — 둘 다 받는다."""

    def setUp(self):
        os.environ.setdefault("MOLIT_SERVICE_KEY", "TESTKEY")
        os.environ.setdefault("KAKAO_REST_API_KEY", "TESTKEY")
        import app as webapp
        self.client = webapp.app.test_client()

    def test_get_and_post_both_answer(self):
        for call in (self.client.get, self.client.post):
            self.assertEqual(call("/land-use-check").status_code, 200)

    def test_the_address_is_read_from_either(self):
        import geocode
        orig = geocode.geocode_full
        geocode.geocode_full = lambda *a, **k: None      # 카카오로 새지 않게
        try:
            for resp in (self.client.get("/land-use-check?address=서울 강북구 수유동 1"),
                         self.client.post("/land-use-check", data={"address": "서울 강북구 수유동 1"})):
                self.assertEqual(resp.status_code, 200)
                self.assertIn("수유동", resp.get_data(as_text=True))
        finally:
            geocode.geocode_full = orig


class TestSuccessCodesAreNotJustOne(unittest.TestCase):
    """⚠️ 성공 판정이 `!= "000"` 하나였다. 이 계열 API에서 흔한 `"00"`
    (resultMsg: NORMAL SERVICE)으로 바뀌는 순간 **정상 응답이 통째로 오류가
    되어 사이트 전체가 죽는다** — 게다가 "00"은 오류 목록에 없어서 화면에
    "알 수 없는 오류"라고만 뜬다. 모르는 코드는 예전처럼 시끄럽게 실패시킨다.
    """

    def _xml(self, code, tag_pairs):
        body = "".join(f"<{k}>{v}</{k}>" for k, v in tag_pairs)
        return (f"<response><header><resultCode>{code}</resultCode>"
                f"<resultMsg>NORMAL SERVICE.</resultMsg></header>"
                f"<body><items><item>{body}</item></items></body></response>").encode()

    TRADE = (("umdNm", "수유동"), ("dealAmount", "20,000"),
             ("excluUseAr", "60"), ("floor", "3"))
    RENT = (("umdNm", "수유동"), ("deposit", "20,000"),
            ("monthlyRent", "0"), ("excluUseAr", "60"), ("floor", "3"))

    def test_every_known_success_spelling_parses(self):
        import molit_rhrent_api as rent
        import molit_rhtrade_api as trade
        for code in ("000", "00", "0", "0000"):
            self.assertEqual(len(trade._parse_response(self._xml(code, self.TRADE))), 1, code)
            self.assertEqual(len(rent._parse_response(self._xml(code, self.RENT))), 1, code)

    def test_no_data_is_still_an_empty_result_not_an_error(self):
        import molit_rhtrade_api as trade
        self.assertEqual(trade._parse_response(self._xml("03", self.TRADE)), [])

    def test_real_errors_still_raise_loudly(self):
        import molit_rhrent_api as rent
        import molit_rhtrade_api as trade
        for code in ("22", "30", "20", "99"):
            for mod, pairs in ((trade, self.TRADE), (rent, self.RENT)):
                with self.assertRaises(RuntimeError, msg=f"{mod.__name__} {code}"):
                    mod._parse_response(self._xml(code, pairs))

    def test_both_apis_share_one_list(self):
        """한쪽만 고치면 다른 경로에서 같은 사고가 난다(52절 전례)."""
        import molit_rhrent_api as rent
        import molit_rhtrade_api as trade
        self.assertIs(rent.SUCCESS_CODES, trade.SUCCESS_CODES)


class TestBuildingRegisterFailuresNeverReachTheVisitor(unittest.TestCase):
    """CLAUDE.md 20절·72-10절 — 건축물대장 조회가 **무엇으로 터지든** 방문자는
    정상 결과 페이지를 본다.

    ⚠️ 예전엔 `except RuntimeError`만 잡았다. 응답 필드가 숫자가 아닐 때 나는
    `ValueError`는 그대로 Flask까지 올라가 오류 화면이 됐다 — 20절이 못박은
    "참고 정보 실패가 매도가 계산을 막지 않는다"가 깨지는 것이다.
    """

    FORM = {"address": "서울특별시 강북구 수유동 468-202", "area": "69.27",
            "floor": "3", "build_year": "2012"}

    @classmethod
    def setUpClass(cls):
        import os
        import zlib
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
            base[0] + (zlib.crc32(a.encode()) % 600 - 300) / 1e5, base[1])
        geocode.geocode_full = lambda a, **k: {
            "lat": base[0], "lon": base[1], "b_code": "1130510200",
            "main_no": "468", "sub_no": "202", "is_mountain": False}
        geocode.nearby_place = lambda *a, **k: None
        data_source.get_trade_rows = lambda lawd, y, **k: [
            {"umdNm": "수유동", "mhouseNm": f"빌{i}", "jibun": f"468-{200 + i % 9}",
             "dealYear": "2026", "dealMonth": str(i % 9 + 1), "dealDay": "10",
             "dealAmount": f"{26000 + i * 250:,}", "excluUseAr": f"{66 + i % 7}",
             "floor": str(i % 5 + 1), "buildYear": str(2010 + i % 5),
             "sggCd": "11305", "dealingGbn": "중개거래"} for i in range(30)]
        data_source.get_apt_rows = lambda lawd, y, **k: []
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

    def tearDown(self):
        import building_register
        building_register.get_building_info = lambda *a, **k: None
        self.app.PREFETCH_BUILDING = True

    def test_every_kind_of_failure_still_renders_the_result_page(self):
        import building_register

        def raiser(exc):
            def _f(*_a, **_k):
                raise exc
            return _f

        cases = {
            "RuntimeError": raiser(RuntimeError("키 없음")),
            "ValueError": raiser(ValueError("숫자가 아닌 필드")),
            "KeyError": raiser(KeyError("rideUseElvtCnt")),
            "TypeError": raiser(TypeError("None에 int()")),
            "OverflowError": raiser(OverflowError("무한대")),
            "None 반환": lambda *a, **k: None,
            "빈 dict": lambda *a, **k: {},
        }
        for label, fn in cases.items():
            for prefetch in (True, False):
                with self.subTest(f"{label} · 미리받기={prefetch}"):
                    building_register.get_building_info = fn
                    self.app.PREFETCH_BUILDING = prefetch
                    resp = self.client.post("/estimate", data=self.FORM)
                    self.assertEqual(resp.status_code, 200,
                                     f"건축물대장 {label} 때문에 결과 페이지가 안 떴습니다")
                    self.assertIn("억", resp.get_data(as_text=True),
                                  "매도가가 화면에 안 찍혔습니다")
