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
