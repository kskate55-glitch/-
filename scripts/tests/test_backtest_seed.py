"""CLAUDE.md 70절 — 표본 번호(시드)를 화면에서 바꿀 수 있어야 한다.

⚠️ 이 파일의 존재 이유: 예전엔 `webapp/app.py`에 `seed=42`가 박혀 있어서
**같은 지역을 다시 돌리면 항상 같은 물건이 다시 뽑혔다.** 그래서 67절·70절이
둘 다 "다음 독립 표본에서 확인한다"로 끝나 놓고 정작 그 표본을 만들 방법이
없었다 — 84건을 받았는데 처음 보는 물건이 9건뿐인 일이 실제로 있었다.
"""
import os
import sys
import unittest

_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(_ROOT, "scripts"))
sys.path.insert(0, os.path.join(_ROOT, "webapp"))


class TestSeedIsNotHardcoded(unittest.TestCase):
    def _src(self, rel):
        with open(os.path.join(_ROOT, rel), encoding="utf-8") as f:
            return f.read()

    def test_the_web_no_longer_pins_the_seed(self):
        src = self._src("webapp/app.py")
        self.assertNotIn("seed=42", src,
                         "시드를 다시 박아버리면 새 표본을 영영 못 뽑는다")
        self.assertIn("seed=seed", src)

    def test_both_forms_let_you_change_it(self):
        html = self._src("webapp/templates/backtest.html")
        for field in ('name="seed"', 'id="sweep_seed"'):
            self.assertIn(field, html, f"{field}가 화면에 없다")

    def test_the_sweep_sends_it(self):
        self.assertIn("body.append('seed'", self._src("webapp/templates/backtest.html"))

    def test_the_csv_records_which_sample_it_was(self):
        """66절 버전 열과 같은 이유 — CSV만 보고 독립 표본인지 가릴 수 있어야 한다."""
        html = self._src("webapp/templates/backtest.html")
        self.assertIn("'version', 'seed'", html)


class TestSeedParsing(unittest.TestCase):
    def setUp(self):
        os.environ.setdefault("KAKAO_REST_API_KEY", "test")
        os.environ.setdefault("MOLIT_SERVICE_KEY", "test")
        import app
        self.app = app

    def test_a_number_comes_through(self):
        self.assertEqual(self.app._backtest_seed("7"), 7)
        self.assertEqual(self.app._backtest_seed(123), 123)

    def test_junk_falls_back_instead_of_crashing(self):
        """순회가 시드 하나 때문에 멈추면 안 된다."""
        for bad in (None, "", "abc", "3.5", [], {}):
            self.assertEqual(self.app._backtest_seed(bad),
                             self.app.BACKTEST_DEFAULT_SEED)

    def test_it_is_clamped(self):
        self.assertEqual(self.app._backtest_seed("-5"), 0)
        self.assertEqual(self.app._backtest_seed("999999"), 9999)


class TestDifferentSeedsPickDifferentProperties(unittest.TestCase):
    """시드가 실제로 **다른 물건**을 뽑는지 — 이게 이 변경의 전부다."""

    @staticmethod
    def _rows(n=60):
        return [{"umdNm": "역촌동", "jibun": str(100 + i), "mhouseNm": f"빌라{i}",
                 "dealYear": "2026", "dealMonth": "9", "dealDay": str(1 + i % 28),
                 "dealAmount": "20,000", "excluUseAr": "55.0", "floor": "3",
                 "buildYear": "2012", "sggCd": "11380"} for i in range(n)]

    def _names(self, seed):
        import backtest as bt
        targets, _ = bt.pick_targets(self._rows(), months=1, n=8, gu=None, seed=seed)
        return [t["mhouseNm"] for t in targets]

    def test_same_seed_is_reproducible(self):
        self.assertEqual(self._names(42), self._names(42))

    def test_a_different_seed_gives_a_different_draw(self):
        a, b = self._names(42), self._names(7)
        self.assertNotEqual(a, b, "시드를 바꿨는데 같은 물건이 뽑힌다")
        self.assertLess(len(set(a) & set(b)), len(a),
                        "겹침이 100%면 새 표본이 아니다")


if __name__ == "__main__":
    unittest.main()


class TestBothRunPathsActuallyUseIt(unittest.TestCase):
    """⚠️ **실제로 겪은 버그**: 표본 번호 입력칸은 화면에 있고 템플릿으로도
    넘어가는데, `/backtest` 단일 지역 실행이 `_run_region_backtest()`에 그
    값을 **안 넘기고 있었다** — 즉 입력칸을 아무리 바꿔도 항상 42로 돌았다.
    소스 검사(`seed=seed`)만으로는 순회 경로 한 곳만 보고 통과해버려서
    못 잡았으므로, **두 경로 모두 실제로 호출해서** 확인한다.
    """

    def setUp(self):
        os.environ.setdefault("MOLIT_SERVICE_KEY", "TESTKEY")
        os.environ.setdefault("KAKAO_REST_API_KEY", "TESTKEY")
        import app as webapp

        self.webapp = webapp
        self._orig = webapp._run_region_backtest
        self.calls = []

        def fake(lawd_cd, n_cases, months, seed=None):
            self.calls.append(seed)
            return {"error": "테스트라 여기서 멈춘다"}

        webapp._run_region_backtest = fake
        self.client = webapp.app.test_client()

    def tearDown(self):
        self.webapp._run_region_backtest = self._orig

    def test_single_region_page_passes_the_seed(self):
        self.client.post("/backtest", data={"lawd_cd": "11305", "seed": "7"})
        self.assertEqual(self.calls, [7], "단일 지역 실행이 표본 번호를 버렸다")

    def test_sweep_endpoint_passes_the_seed(self):
        self.client.post("/backtest/one", data={"lawd_cd": "11305", "seed": "7"})
        self.assertEqual(self.calls, [7], "순회가 표본 번호를 버렸다")

    def test_a_junk_seed_falls_back_instead_of_breaking_the_run(self):
        self.client.post("/backtest", data={"lawd_cd": "11305", "seed": "abc"})
        self.assertEqual(self.calls, [self.webapp.BACKTEST_DEFAULT_SEED])


class TestPairedComparisonUi(unittest.TestCase):
    """CLAUDE.md 72-12절 — 이전 결과와 **짝지어** 비교하는 칸.

    ⚠️ 51-2절이 못박은 대로, 계산기를 고쳤을 때 좋아졌는지는 **그룹 평균이
    아니라 같은 물건끼리 짝지어** 봐야 안다. 실제로 "같은 건물 1건" 구간
    평균이 16.0% → 13.3%로 내려간 걸 개선으로 읽었다가, 짝지어 보니 그
    물건들은 오히려 나빠져 있었던 적이 있다.
    """

    def _template(self):
        path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))), "webapp", "templates", "backtest.html")
        with open(path, encoding="utf-8") as f:
            return f.read()

    def test_the_card_lives_outside_the_sweep_output(self):
        """⚠️ **순회는 구 하나가 끝날 때마다 `#sweep_out`을 통째로 다시 그린다.**
        카드가 그 안에 있으면 붙여넣던 CSV와 비교 결과가 통째로 지워진다 —
        진짜 브라우저로 돌려 보고 발견했다(클릭이 아예 안 먹는 것처럼 보였다).
        """
        html = self._template()
        sweep_out = html.index('<div id="sweep_out">')
        card = html.index('id="cmp_card"')
        closing = html.index("</div>", sweep_out)
        self.assertGreater(card, closing,
                           "비교 카드가 순회 출력 안에 있습니다 — 중간 갱신에 지워집니다")

    def test_render_never_rebuilds_the_card(self):
        """`render()`가 카드를 다시 만들면 같은 문제가 되살아난다."""
        html = self._template()
        start = html.index("  function render() {")
        # ⚠️ 경계를 `downloadCsv`로 잡으면 그 사이에 있는 비교 함수까지
        #    함께 잘려 들어와 오탐이 난다 — 실제로 그렇게 썼다가 걸렸다.
        end = html.index("  // ── 이전 결과와 짝지은 비교", start)
        body = html[start:end]
        self.assertNotIn("cmp_csv", body, "render()가 붙여넣기 칸을 다시 만듭니다")
        self.assertNotIn("cmp_run", body, "render()가 비교 버튼을 다시 만듭니다")
        self.assertIn("cmp_card", body, "결과가 생겼을 때 카드를 보여주는 코드가 없습니다")

    def test_the_page_ships_the_compare_ui(self):
        import app
        html = app.app.test_client().get("/backtest").get_data(as_text=True)
        for needle in ('id="cmp_card"', 'id="cmp_csv"', 'id="cmp_run"', 'id="cmp_out"'):
            self.assertIn(needle, html, f"{needle}가 화면에 없습니다")
        self.assertIn("표본 번호를 <b>같게</b>", html,
                      "표본 번호를 같게 둬야 한다는 안내가 없습니다")

    def test_the_csv_carries_what_the_comparison_needs(self):
        """짝을 맞추려면 지역·단지명·계약월·면적·층이 CSV에 있어야 한다."""
        html = self._template()
        start = html.index("  function downloadCsv()")
        cols = html[start:start + 700]
        for needed in ("'gu'", "'name'", "'date'", "'area'", "'floor'", "'err'",
                       "'actual'", "'version'", "'seed'"):
            self.assertIn(needed, cols, f"CSV에 {needed} 열이 빠졌습니다")
