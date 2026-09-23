"""CLAUDE.md 48-3절 — 웹 전체순회(`/backtest/one`) 회귀 테스트.

⚠️ 네트워크를 타지 않는다 — 국토부 조회(`data_source.get_trade_rows`)와
카카오 지오코딩을 가짜로 갈아끼운다. `find_comparables`는 호출할 때마다
`from geocode import geocode`로 새로 가져오므로 **모듈 속성**을 갈아야
실제 API로 새어 나가지 않는다(48절 참고 — 실제로 겪은 사고다).

이 파일이 고정하는 것:
  ① 브라우저가 구를 하나씩 돌 수 있도록 JSON 엔드포인트가 살아 있는지
  ② 전체 평균을 **건 단위로** 다시 계산할 수 있게 건별 기록을 다 돌려주는지
     (구별 평균을 또 평균내면 구마다 건수가 달라 틀린 값이 나온다)
  ③ 구 하나가 실패해도 예외로 터지지 않고 `ok: False`로 돌아오는지
     — 안 그러면 순회가 중간에 통째로 멈춘다
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("MOLIT_SERVICE_KEY", "test-key")
os.environ.setdefault("KAKAO_REST_API_KEY", "test-key")

import geocode as geo  # noqa: E402
import lawd_lookup  # noqa: E402


def _row(jibun, y, m, d, amount, area=45.0, floor=3):
    return {"umdNm": "수유동", "jibun": jibun, "mhouseNm": f"빌라{jibun}",
            "sggCd": "11305", "excluUseAr": str(area), "floor": str(floor),
            "buildYear": "2015", "dealYear": str(y), "dealMonth": str(m),
            "dealDay": str(d), "dealAmount": f"{amount:,}", "dealingGbn": "중개거래"}


class BacktestWebBase(unittest.TestCase):
    def setUp(self):
        import app as web
        import backtest as bt
        import data_source

        self.web, self.data_source, self.bt = web, data_source, bt
        self._orig_rows = data_source.get_trade_rows
        self._orig_geo = geo.geocode
        self._orig_bt_geo = bt.geocode
        self._orig_cache = lawd_lookup._get_cache
        lawd_lookup._get_cache = lambda: {"11305": ("서울특별시", "강북구")}

        coords = {}

        def fake_geocode(addr):
            if addr not in coords:
                coords[addr] = (37.6 + len(coords) * 0.0004, 127.0)
            return coords[addr]

        # ⚠️ 두 군데를 다 막아야 한다 — 대상 물건 주소는 backtest가 import해 둔
        #    이름(`bt.geocode`)으로, 비교거래는 `find_comparables`가 호출할 때마다
        #    새로 가져오는 모듈 속성(`geo.geocode`)으로 나간다. 하나만 막으면
        #    **테스트 실행 순서에 따라** 실제 카카오 API로 새어 나간다(실제로 겪었다 —
        #    이 파일만 단독 실행하면 통과하는데 전체 discover에서만 깨졌다).
        geo.geocode = fake_geocode
        bt.geocode = fake_geocode

        web.app.config["TESTING"] = True
        self.client = web.app.test_client()

    def tearDown(self):
        self.data_source.get_trade_rows = self._orig_rows
        geo.geocode = self._orig_geo
        self.bt.geocode = self._orig_bt_geo
        lawd_lookup._get_cache = self._orig_cache

    def _serve(self, rows):
        self.data_source.get_trade_rows = lambda *a, **k: rows

    @staticmethod
    def _sample_rows():
        rows = [_row(f"{i}-1", 2026, 5, 10 + i, 30000 + i * 300) for i in range(14)]
        rows += [_row(f"9{i}-1", 2026, 9, 1 + i, 31000 + i * 200) for i in range(5)]
        return rows


class TestBacktestOne(BacktestWebBase):
    def test_returns_case_level_records(self):
        self._serve(self._sample_rows())
        res = self.client.post("/backtest/one",
                               data={"lawd_cd": "11305", "n_cases": "4", "months": "1"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["ok"], data.get("error"))
        self.assertEqual(data["gu"], "강북구")
        self.assertTrue(data["cases"], "건별 기록이 비면 전체 통계를 못 낸다")
        for key in ("gu", "name", "area", "actual", "median", "err",
                    "conf", "n", "in_band", "divergence"):
            self.assertIn(key, data["cases"][0], f"{key}가 빠지면 원인 분석을 못 한다")

    def test_error_pct_sign_matches_html_route(self):
        """양수 = 계산기가 실제보다 높게 부름. 부호가 뒤집히면 보정 방향이 반대가 된다."""
        self._serve(self._sample_rows())
        data = self.client.post(
            "/backtest/one",
            data={"lawd_cd": "11305", "n_cases": "4", "months": "1"}).get_json()
        for c in data["cases"]:
            expected = (c["median"] - c["actual"]) / c["actual"] * 100
            self.assertAlmostEqual(c["err"], round(expected, 2), places=1)

    def test_missing_region_is_rejected(self):
        res = self.client.post("/backtest/one", data={})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.get_json()["ok"])

    def test_region_failure_does_not_raise(self):
        """구 하나가 실패해도 순회가 멈추면 안 된다 — 200 + ok:False로 돌아와야 한다."""
        self._serve([])
        res = self.client.post("/backtest/one", data={"lawd_cd": "11305"})
        self.assertEqual(res.status_code, 200)
        body = res.get_json()
        self.assertFalse(body["ok"])
        self.assertTrue(body["error"])

    def test_upstream_exception_is_swallowed(self):
        def boom(*a, **k):
            raise ValueError("국토부가 이상한 응답을 줬다고 치자")

        self.data_source.get_trade_rows = boom
        res = self.client.post("/backtest/one", data={"lawd_cd": "11305"})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.get_json()["ok"])

    def test_cases_are_capped(self):
        self._serve(self._sample_rows())
        data = self.client.post(
            "/backtest/one",
            data={"lawd_cd": "11305", "n_cases": "999", "months": "1"}).get_json()
        self.assertLessEqual(len(data["cases"]), self.web.BACKTEST_MAX_CASES)


class TestBacktestPageStillWorks(BacktestWebBase):
    """단건 화면이 전체순회 도입으로 깨지지 않았는지."""

    def test_get_renders_sweep_ui(self):
        html = self.client.get("/backtest").get_data(as_text=True)
        self.assertIn("전체 테스트 시작", html)
        self.assertIn("한 지역만 테스트하기", html)

    def test_post_still_renders_results(self):
        self._serve(self._sample_rows())
        html = self.client.post(
            "/backtest",
            data={"lawd_cd": "11305", "n_cases": "4", "months": "1"}).get_data(as_text=True)
        self.assertIn("건별 결과", html)


class TestSharedCodePath(unittest.TestCase):
    """HTML 화면과 JSON 순회가 **같은 함수**를 쓰는지 소스로 고정한다 —
    갈라지면 "화면 숫자와 순회 숫자가 다른" 문제가 조용히 생긴다."""

    def test_both_routes_call_the_same_runner(self):
        import inspect

        import app as web
        for fn in (web.backtest_page, web.backtest_one):
            self.assertIn("_run_region_backtest", inspect.getsource(fn))


class TestVersionIsStampedOnEveryCase(unittest.TestCase):
    """66절 — CSV만 보고도 "어느 코드로 나온 숫자인지" 알 수 있어야 한다.

    ⚠️ 이게 없어서 실제로 판정을 못 했다: 서울 순회 결과가 64절 1층 보정
    이후 코드인지 이전인지 구분할 방법이 없어, 그 보정이 먹혔는지 결론을
    못 내렸다. 순회는 수십 분 걸려서 "다시 돌려보자"가 싸지 않다.
    """

    def test_sweep_json_carries_the_version(self):
        src = _app_source()
        self.assertIn('c["version"] = version', src,
                       "순회 JSON의 건별 기록에 배포 버전이 안 실린다")
        self.assertIn('"version": version', src,
                       "순회 응답 자체에도 버전이 안 실린다")

    def test_csv_download_includes_the_version_column(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                             "webapp", "templates", "backtest.html")
        with open(path, encoding="utf-8") as f:
            html = f.read()
        cols = html.split("var cols = [", 1)[1].split("]", 1)[0]
        self.assertIn("'version'", cols, "CSV 내보내기에 version 열이 없다")


def _app_source() -> str:
    path = os.path.join(os.path.dirname(__file__), "..", "..", "webapp", "app.py")
    with open(path, encoding="utf-8") as f:
        return f.read()


if __name__ == "__main__":
    unittest.main()


class TestDeployVersion(unittest.TestCase):
    """CLAUDE.md 48-5절 — 화면에 배포 버전이 찍히는지.

    ⚠️ 이게 없어서 사용자가 **고치기 전 코드로 27분짜리 순회를 돌렸다.**
    결과만 보고는 그게 어느 코드로 나온 건지 알 방법이 전혀 없었다.
    """

    def setUp(self):
        import app as web
        self.web = web
        self._orig = os.environ.get("RENDER_GIT_COMMIT")
        web.app.config["TESTING"] = True
        self.client = web.app.test_client()

    def tearDown(self):
        if self._orig is None:
            os.environ.pop("RENDER_GIT_COMMIT", None)
        else:
            os.environ["RENDER_GIT_COMMIT"] = self._orig

    def test_shows_short_commit_when_deployed(self):
        os.environ["RENDER_GIT_COMMIT"] = "abcdef1234567890"
        html = self.client.get("/backtest").get_data(as_text=True)
        self.assertIn("버전 abcdef1", html)
        self.assertNotIn("abcdef1234567890", html, "전체 해시까지 쓸 필요는 없다")

    def test_falls_back_to_local(self):
        os.environ.pop("RENDER_GIT_COMMIT", None)
        self.assertEqual(self.web._deploy_version(), "local")

    def test_blank_env_is_local(self):
        os.environ["RENDER_GIT_COMMIT"] = "   "
        self.assertEqual(self.web._deploy_version(), "local")


class TestVersionSurvivesAHostChange(unittest.TestCase):
    """⚠️ 63절 — 호스팅마다 커밋 해시를 넣어주는 환경변수 이름이 다르다.
    한 곳만 보면 **서버를 옮기는 순간 버전 표시가 조용히 사라지는데**, 하필
    그때가 "지금 어느 코드로 도는지"를 제일 알아야 하는 시점이다
    (48-5절에서 실제로 옛 코드로 27분을 돌렸다)."""

    def setUp(self):
        import app as web
        self.web = web
        self._saved = {n: os.environ.get(n) for n in web._VERSION_ENVS}
        for n in web._VERSION_ENVS:
            os.environ.pop(n, None)

    def tearDown(self):
        for n, v in self._saved.items():
            if v is None:
                os.environ.pop(n, None)
            else:
                os.environ[n] = v

    def test_each_known_host_variable_is_read(self):
        for name in ("RENDER_GIT_COMMIT", "RAILWAY_GIT_COMMIT_SHA",
                     "VERCEL_GIT_COMMIT_SHA", "HEROKU_SLUG_COMMIT",
                     "SOURCE_VERSION", "GIT_COMMIT", "COMMIT_SHA"):
            with self.subTest(host=name):
                os.environ[name] = "abcdef1234567890"
                try:
                    self.assertEqual(self.web._deploy_version(), "abcdef1")
                finally:
                    os.environ.pop(name, None)

    def test_app_version_wins_so_it_can_always_be_set_by_hand(self):
        os.environ["RENDER_GIT_COMMIT"] = "1111111111"
        os.environ["APP_VERSION"] = "2222222222"
        self.assertEqual(self.web._deploy_version(), "2222222")

    def test_nothing_set_still_says_local(self):
        self.assertEqual(self.web._deploy_version(), "local")

    def test_blank_values_are_skipped_not_shown(self):
        """빈 문자열이 들어오면 그걸 버전이라고 찍으면 안 된다."""
        os.environ["RENDER_GIT_COMMIT"] = "   "
        os.environ["GIT_COMMIT"] = "cafebabe"
        self.assertEqual(self.web._deploy_version(), "cafebab")
