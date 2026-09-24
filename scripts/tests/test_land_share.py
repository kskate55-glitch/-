"""72-39절 — 대지권면적(`landAr`) 확인 장치.

이 파일이 고정하는 것은 **두 가지뿐**이다:
  1. 무엇이 와도 안 터지고, 안 오면 조용히 None이다.
  2. **가격을 한 글자도 바꾸지 않는다.**

2번이 핵심이다. `landAr`은 검증된 기술문서 표에 있지만 **값이 채워져 오는
것을 아직 못 봤다**(21·27·50-1절이 지켜온 구분). 실측 없이 가격에 넣으면
48-2절 `SALE_CALIBRATION_FACTOR` 0.97이 한 표본에 과적합됐다가 48-4절에서
되돌려진 일이 그대로 반복된다.
"""

import ast
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import land_share
from land_share import land_area_sqm, land_share_ratio, summarize


def _rows(ratios, area=60.0):
    return [{"landAr": str(r * area), "excluUseAr": str(area)} for r in ratios]


class ItNeverCrashes(unittest.TestCase):
    """72-13절 교훈 #1 — NaN·무한대·비문자열은 `> 0` 가드를 그냥 통과한다."""

    def test_garbage_values_return_none(self):
        for bad in ("nan", "inf", "-inf", "", "  ", "없음", "-", None, [], {}, True,
                    "1e400", "０", "12,3.4.5"):
            with self.subTest(bad=bad):
                self.assertIsNone(land_area_sqm({"landAr": bad}),
                                  f"{bad!r}이 대지권면적으로 통과했다")

    def test_missing_field_is_none_not_error(self):
        self.assertIsNone(land_area_sqm({}))
        self.assertIsNone(land_share_ratio({}))
        self.assertIsNone(land_share_ratio(None))
        self.assertIsNone(land_area_sqm(None))

    def test_zero_and_negative_area_do_not_divide(self):
        for area in ("0", "-5", "nan"):
            self.assertIsNone(land_share_ratio({"landAr": "30", "excluUseAr": area}))

    def test_commas_are_read(self):
        self.assertAlmostEqual(land_area_sqm({"landAr": "1,234.5"}), 1234.5)

    def test_summarize_survives_anything(self):
        for rows in ([], [{}], [None], [{"landAr": "nan", "excluUseAr": "nan"}] * 5):
            with self.subTest(rows=rows):
                out = summarize([r for r in rows if r is not None])
                self.assertIn("verdict", out)


class TheVerdictSplitsTheRightWay(unittest.TestCase):
    """"오는가"와 "흩어져 있는가"는 **다른 질문**이라 따로 갈라야 한다."""

    def test_field_absent(self):
        out = summarize([{"excluUseAr": "60"}] * 30)
        self.assertEqual(out["verdict"], "no_field")
        self.assertEqual(out["with_land"], 0)
        self.assertIn("건축물대장", out["note"])   # 대안을 같이 말해 준다

    def test_present_but_flat_is_useless(self):
        """값이 와도 거의 상수면 비교거래를 못 가려낸다 — 신호가 아니다."""
        out = summarize(_rows([0.50 + i * 0.001 for i in range(40)]))
        self.assertEqual(out["verdict"], "flat")
        self.assertLess(out["spread"], land_share.FLAT_SPREAD_MAX)

    def test_present_and_spread_out_is_a_signal(self):
        out = summarize(_rows([0.3 + i * 0.03 for i in range(40)]))
        self.assertEqual(out["verdict"], "varies")
        self.assertGreater(out["spread"], land_share.FLAT_SPREAD_MAX)

    def test_too_few_to_judge_spread(self):
        out = summarize(_rows([0.3, 0.9, 1.5]))
        self.assertEqual(out["verdict"], "thin")
        self.assertIn("이릅니다", out["note"])

    def test_partly_filled_is_flagged(self):
        rows = _rows([0.3 + i * 0.03 for i in range(30)]) + [{"excluUseAr": "60"}] * 40
        self.assertEqual(summarize(rows)["verdict"], "sparse")

    def test_fill_pct_is_honest(self):
        rows = _rows([0.5] * 10) + [{"excluUseAr": "60"}] * 10
        self.assertEqual(summarize(rows)["fill_pct"], 50.0)


class TheRatioIsPerSquareMetre(unittest.TestCase):
    """대지권면적 자체가 아니라 **전용 1㎡당**이어야 평형이 달라도 비교된다."""

    def test_same_ratio_different_size(self):
        small = land_share_ratio({"landAr": "30", "excluUseAr": "60"})
        big = land_share_ratio({"landAr": "60", "excluUseAr": "120"})
        self.assertAlmostEqual(small, big)

    def test_land_heavy_unit_scores_higher(self):
        thin = land_share_ratio({"landAr": "20", "excluUseAr": "60"})
        thick = land_share_ratio({"landAr": "50", "excluUseAr": "60"})
        self.assertGreater(thick, thin)


class ItNeverTouchesThePrice(unittest.TestCase):
    """⛔ 실측 전까지 매도가는 한 글자도 안 바뀐다.

    ⚠️ 소스를 **문자열로** 훑으면 안 된다 — 이 모듈을 설명하는 주석·독스트링이
       걸려 멀쩡한 코드가 실패한다(69·72-24·72-32절에서 세 번 겪었다).
       `ast`로 독스트링을 떼고 본문만 본다.
    """

    PRICE_FUNCS = ("compute_scenarios", "compute_price_tiers", "find_comparables",
                   "similarity_score", "weighted_quantile",
                   "count_prediction_risks", "compute_prediction_interval")

    def test_no_price_function_reads_the_land_field(self):
        path = os.path.join(os.path.dirname(__file__), "..", "estimate_price.py")
        tree = ast.parse(open(path, encoding="utf-8").read())
        checked = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name in self.PRICE_FUNCS:
                checked.append(node.name)
                body = list(node.body)
                if (body and isinstance(body[0], ast.Expr)
                        and isinstance(body[0].value, ast.Constant)):
                    body = body[1:]           # 독스트링 제거
                code = "\n".join(ast.unparse(n) for n in body)
                for needle in ("land_share", "landAr", "land_ratio"):
                    self.assertNotIn(needle, code,
                                     f"{node.name}()가 {needle}을(를) 읽는다 — "
                                     "실측 전에 가격을 바꾸면 안 된다")
        self.assertGreaterEqual(len(checked), 5, f"검사한 함수가 너무 적다: {checked}")

    def test_the_module_itself_computes_no_price(self):
        path = os.path.join(os.path.dirname(__file__), "..", "land_share.py")
        tree = ast.parse(open(path, encoding="utf-8").read())
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                body = node.body[1:] if (node.body and isinstance(node.body[0], ast.Expr)
                                         and isinstance(node.body[0].value, ast.Constant)) else node.body
                code = "\n".join(ast.unparse(n) for n in body)
                for needle in ("dealAmount", "_amount_man", "_weight"):
                    self.assertNotIn(needle, code,
                                     f"{node.name}()가 가격 필드({needle})를 만진다")


class TheBacktestCarriesItWithoutExtraCalls(unittest.TestCase):
    """백테스트는 **이미 받아 둔 행만** 읽는다 — 조회가 하나도 안 는다."""

    def test_gap_is_subject_over_comparable_median(self):
        import backtest as bt
        gap = bt._land_gap({"landAr": "54", "excluUseAr": "60"},   # 0.9
                           _rows([0.45, 0.50, 0.55]))             # 중앙 0.50
        self.assertAlmostEqual(gap, 1.8)

    def test_gap_is_none_when_either_side_lacks_the_field(self):
        import backtest as bt
        self.assertIsNone(bt._land_gap({"excluUseAr": "60"}, _rows([0.5])))
        self.assertIsNone(bt._land_gap({"landAr": "30", "excluUseAr": "60"},
                                       [{"excluUseAr": "60"}]))

    def test_csv_carries_both_columns(self):
        path = os.path.join(os.path.dirname(__file__), "..", "backtest.py")
        src = open(path, encoding="utf-8").read()
        tree = ast.parse(src)
        cols = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                cols.add(node.value)
        for needed in ("land_ratio", "land_ratio_gap"):
            self.assertIn(needed, cols, f"CSV 열 {needed}이(가) 빠졌다 — "
                                        "순회를 돌려도 가설을 검증할 수 없다")

    def test_no_extra_network_call_is_made(self):
        """`_land_gap`은 행만 읽는다 — 지오코딩·건축물대장을 부르지 않는다."""
        import backtest as bt
        path = os.path.join(os.path.dirname(__file__), "..", "backtest.py")
        tree = ast.parse(open(path, encoding="utf-8").read())
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == "_land_gap":
                code = ast.unparse(node)
                for banned in ("geocode", "get_building_info", "urlopen", "fetch"):
                    self.assertNotIn(banned, code,
                                     f"_land_gap()이 {banned}을(를) 부른다 — "
                                     "추가 호출 0이라는 전제가 깨진다")
                return
        self.fail("_land_gap()을 찾지 못했다")


if __name__ == "__main__":
    unittest.main()
