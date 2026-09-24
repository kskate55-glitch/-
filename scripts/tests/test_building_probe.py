"""72-16절 — 건축물대장 필드 진단(`probe_building_register` + `/building-check`).

⚠️ 이 화면의 존재 이유는 **20절이 "검증된 필드 목록에 대지면적이 없다"고
남겨둔 것을 실측으로 끝내는 것**이다. 그래서 고정해야 할 계약이 둘이다:
  ① 어떤 실패에도 예외를 던지지 않고 `status`로 알려준다 (50-1절과 같은 계약)
  ② **서비스 키가 화면에 절대 안 나온다** — 이 화면은 사용자가 캡처해서 보낸다(6절)
"""
import io, json, os, sys, unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "..", "..", "webapp"))

import building_register as br

KEY = "SECRET-KEY-DO-NOT-LEAK-12345"


class _Resp(io.BytesIO):
    def __enter__(self): return self
    def __exit__(self, *a): return False


def _ok_payload(**extra):
    item = {"hhldCnt": "8", "useAprDay": "19910312", "rideUseElvtCnt": "0",
            "emgenUseElvtCnt": "0", "grndFlrCnt": "5", "mainPurpsCdNm": "공동주택",
            "regstrKindCdNm": "표제부"}
    item.update(extra)
    return json.dumps({"response": {"body": {"items": {"item": [item]}}}})


class ProbeReportsWhatWentWrong(unittest.TestCase):
    def setUp(self):
        self._saved = os.environ.get("MOLIT_SERVICE_KEY")
        os.environ["MOLIT_SERVICE_KEY"] = KEY

    def tearDown(self):
        if self._saved is None:
            os.environ.pop("MOLIT_SERVICE_KEY", None)
        else:
            os.environ["MOLIT_SERVICE_KEY"] = self._saved

    def test_no_key(self):
        os.environ.pop("MOLIT_SERVICE_KEY", None)
        self.assertEqual(br.probe_building_register("1141011800", "265", "218")["status"],
                         "no_key")

    def test_bad_bcode(self):
        for bad in (None, "", "114101"):
            self.assertEqual(br.probe_building_register(bad, "265", "218")["status"],
                             "bad_input")

    def test_network_failure_is_reported_not_raised(self):
        for exc in (OSError("boom"), TimeoutError("read timed out"),
                    ValueError("bad encoding")):
            with mock.patch.object(br, "urlopen", side_effect=exc):
                out = br.probe_building_register("1141011800", "265", "218")
            self.assertEqual(out["status"], "call_failed")
            self.assertIn(type(exc).__name__, out["detail"])

    def test_html_error_page_is_unreadable_not_a_crash(self):
        with mock.patch.object(br, "urlopen",
                               return_value=_Resp(b"<html><body>quota</body></html>")):
            out = br.probe_building_register("1141011800", "265", "218")
        self.assertEqual(out["status"], "unreadable")

    def test_empty_items_is_not_found(self):
        empty = json.dumps({"response": {"body": {"items": ""}}}).encode()
        with mock.patch.object(br, "urlopen", return_value=_Resp(empty)):
            out = br.probe_building_register("1141011800", "265", "218")
        self.assertEqual(out["status"], "not_found")

    def test_ok_lists_every_field_that_arrived(self):
        with mock.patch.object(br, "urlopen",
                               return_value=_Resp(_ok_payload().encode())):
            out = br.probe_building_register("1141011800", "265", "218")
        self.assertEqual(out["status"], "ok")
        self.assertIn("hhldCnt", out["fields"])
        self.assertIn("grndFlrCnt", out["wanted"])
        # 대지면적이 안 오면 그 사실을 문장으로 말해 준다 — 이게 이 화면의 요점이다.
        self.assertIn("platArea", out["detail"])

    def test_it_says_so_when_land_area_does_arrive(self):
        payload = _ok_payload(platArea="330.5", totArea="620.2", vlRat="187.6")
        with mock.patch.object(br, "urlopen", return_value=_Resp(payload.encode())):
            out = br.probe_building_register("1141011800", "265", "218")
        self.assertEqual(out["wanted"]["platArea"], "330.5")
        self.assertEqual(out["wanted"]["totArea"], "620.2")
        self.assertIn("대지지분을 구할 수 있습니다", out["detail"])

    def test_unknown_area_like_fields_are_surfaced(self):
        # 우리가 모르는 이름으로 와도 놓치지 않게 넓이·비율·개수는 따로 짚어 준다.
        payload = _ok_payload(platAr="330.5", bcRatio="55.1")
        with mock.patch.object(br, "urlopen", return_value=_Resp(payload.encode())):
            out = br.probe_building_register("1141011800", "265", "218")
        self.assertIn("platAr", out["area_like"])
        self.assertIn("bcRatio", out["area_like"])

    def test_the_two_fields_we_actually_need_are_in_the_wanted_list(self):
        for k in ("platArea", "totArea"):
            self.assertIn(k, br.WANTED_FIELDS)


class TheKeyNeverReachesTheScreen(unittest.TestCase):
    """⚠️ 이 화면은 캡처해서 보내라고 만든 것이라, 키가 한 글자도 새면 안 된다."""

    def setUp(self):
        self._saved = os.environ.get("MOLIT_SERVICE_KEY")
        os.environ["MOLIT_SERVICE_KEY"] = KEY

    def tearDown(self):
        if self._saved is None:
            os.environ.pop("MOLIT_SERVICE_KEY", None)
        else:
            os.environ["MOLIT_SERVICE_KEY"] = self._saved

    def _assert_clean(self, out):
        for field in ("detail", "sample", "url_shape"):
            self.assertNotIn(KEY, str(out.get(field, "")), f"{field}에 키가 샜다")
        self.assertNotIn(KEY, json.dumps(out, ensure_ascii=False, default=str))

    def test_url_shape_masks_the_key(self):
        with mock.patch.object(br, "urlopen",
                               return_value=_Resp(_ok_payload().encode())):
            out = br.probe_building_register("1141011800", "265", "218")
        self.assertIn("serviceKey=***", out["url_shape"])
        self._assert_clean(out)

    def test_a_response_that_echoes_the_key_is_scrubbed(self):
        echo = f'{{"fault":"bad key {KEY}"}}'.encode()
        with mock.patch.object(br, "urlopen", return_value=_Resp(echo)):
            out = br.probe_building_register("1141011800", "265", "218")
        self._assert_clean(out)

    def test_an_exception_carrying_the_key_is_scrubbed(self):
        with mock.patch.object(br, "urlopen",
                               side_effect=OSError(f"failed for serviceKey={KEY}")):
            out = br.probe_building_register("1141011800", "265", "218")
        self.assertEqual(out["status"], "call_failed")
        self._assert_clean(out)


class ThePageNeverBreaks(unittest.TestCase):
    """진단 페이지가 500을 내면 본말전도다 (70-2절과 같은 계약)."""

    def setUp(self):
        self._saved = {k: os.environ.get(k) for k in
                       ("MOLIT_SERVICE_KEY", "KAKAO_REST_API_KEY")}
        os.environ["MOLIT_SERVICE_KEY"] = KEY
        os.environ["KAKAO_REST_API_KEY"] = "kakao-test"
        import app as webapp
        self.app = webapp
        self.client = webapp.app.test_client()
        # ⚠️ 72-39절 두 번째 카드(대지지분)가 `get_trade_rows`로 국토부를 부른다 —
        #    막지 않으면 이 테스트가 **실제 API로 새어 나간다**(48·55·72-11절이
        #    반복해 겪은 함정. 실제로 여기서 새는 것을 ResourceWarning으로 잡았다).
        import data_source
        self._real_rows = data_source.get_trade_rows
        data_source.get_trade_rows = lambda *a, **k: [
            {"umdNm": "홍은동", "jibun": "265-218", "excluUseAr": "59.88",
             "landAr": "40.1", "dealAmount": "30,000", "dealYear": "2026",
             "dealMonth": "9", "dealDay": "1", "floor": "3", "buildYear": "2012"}
        ]

    def tearDown(self):
        import data_source
        data_source.get_trade_rows = self._real_rows
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def test_empty_form_renders(self):
        for path in ("/building-check", "/building-check/"):
            self.assertEqual(self.client.get(path).status_code, 200)

    def test_get_and_post_both_work(self):
        # 71절 — 프론트가 한때 모든 폼을 POST로 바꿔 보내 405가 났다.
        self.assertEqual(self.client.post("/building-check",
                                          data={"address": ""}).status_code, 200)

    def test_geocode_failure_is_a_message_not_a_500(self):
        with mock.patch("geocode.geocode_full", return_value=None):
            r = self.client.get("/building-check?address=없는주소")
        self.assertEqual(r.status_code, 200)
        self.assertIn("좌표로 바꾸지 못했", r.get_data(as_text=True))

    def test_any_exception_becomes_korean_text(self):
        for exc in (RuntimeError("x"), ValueError("y"), KeyError("z"),
                    TypeError("t"), OverflowError("o")):
            with mock.patch("geocode.geocode_full", side_effect=exc):
                r = self.client.get("/building-check?address=서울시 강북구 수유동 1")
            self.assertEqual(r.status_code, 200)
            body = r.get_data(as_text=True)
            self.assertNotIn("The server encountered an internal error", body)
            self.assertIn(type(exc).__name__, body)

    def test_a_successful_probe_shows_the_field_table(self):
        payload = _ok_payload(platArea="330.5", totArea="620.2")
        with mock.patch("geocode.geocode_full",
                        return_value={"b_code": "1141011800", "main_no": "265",
                                      "sub_no": "218", "is_mountain": False}), \
             mock.patch.object(br, "urlopen", return_value=_Resp(payload.encode())):
            r = self.client.get("/building-check?address=서울시 서대문구 홍은동 265-218")
        body = r.get_data(as_text=True)
        self.assertEqual(r.status_code, 200)
        self.assertIn("platArea", body)
        self.assertIn("대지지분을 구할 수 있습니다", body)
        self.assertNotIn(KEY, body)


class TheLandShareCardIsWiredAndFakeable(unittest.TestCase):
    """72-40절 — 72-39절 두 번째 카드가 뜨는지, 그리고 그게 **가짜로 막힐 수
    있는지**. 후자가 더 중요하다 — 막을 수 없으면 테스트가 실제 국토부로
    새어 나간다(그 누출을 실제로 겪어서 이 클래스를 만들었다)."""

    def setUp(self):
        os.environ["MOLIT_SERVICE_KEY"] = KEY
        os.environ["KAKAO_REST_API_KEY"] = "kakao-test"
        import app as webapp
        import data_source
        self.client = webapp.app.test_client()
        self.ds = data_source
        self._real = data_source.get_trade_rows
        self.calls = []

    def tearDown(self):
        self.ds.get_trade_rows = self._real

    def _run(self, rows):
        def fake(*a, **k):
            self.calls.append(a)
            return rows
        self.ds.get_trade_rows = fake
        payload = ('<response><body><items><item><platArea>284</platArea>'
                   '<totArea>424.8</totArea></item></items></body>'
                   '<header><resultCode>00</resultCode></header></response>')
        with mock.patch("geocode.geocode_full",
                        return_value={"lat": 37.5, "lon": 126.9, "b_code": "1141011800",
                                      "main_no": "265", "sub_no": "218"}), \
             mock.patch.object(br, "urlopen", return_value=_Resp(payload.encode())):
            r = self.client.get("/building-check?address=서울 서대문구 홍은동 265-218")
        return r

    def _row(self, land="40.1", area="59.88"):
        return {"umdNm": "홍은동", "jibun": "265-218", "excluUseAr": area,
                "landAr": land, "dealAmount": "30,000", "dealYear": "2026",
                "dealMonth": "9", "dealDay": "1", "floor": "3", "buildYear": "2012"}

    def test_the_fake_is_actually_used(self):
        self._run([self._row()])
        self.assertTrue(self.calls, "get_trade_rows 가짜가 안 불렸다 — 진짜로 나갔을 수 있다")

    def test_the_card_renders(self):
        text = self._run([self._row()]).get_data(as_text=True)
        self.assertEqual(200, 200)
        self.assertIn("대지권면적", text)

    def test_no_rows_does_not_break_the_page(self):
        self.assertEqual(self._run([]).status_code, 200)


class TheNormalLookupIsUnchanged(unittest.TestCase):
    """진단을 붙이면서 20절 본체가 망가지지 않았는지."""

    def setUp(self):
        self._saved = os.environ.get("MOLIT_SERVICE_KEY")
        os.environ["MOLIT_SERVICE_KEY"] = KEY
        br._memory = {}                      # 72-5절 캐시를 비우고 시작한다

    def tearDown(self):
        br._memory = {}
        if self._saved is None:
            os.environ.pop("MOLIT_SERVICE_KEY", None)
        else:
            os.environ["MOLIT_SERVICE_KEY"] = self._saved

    def test_get_building_info_still_reads_the_same_fields(self):
        payload = _ok_payload(rideUseElvtCnt="1", platArea="330.5")
        with mock.patch.object(br, "urlopen", return_value=_Resp(payload.encode())), \
             mock.patch.object(br, "_cache_put"):
            info = br.get_building_info("1141011800", "265", "218")
        self.assertEqual(info["household_count"], "8")
        self.assertEqual(info["ground_floors"], "5")
        self.assertTrue(info["has_elevator"])


if __name__ == "__main__":
    unittest.main()
