"""72-26절 — 사용자가 직접 알려주는 정비구역 여부.

⚠️ 이 절의 계약은 **"가격을 바꾸지 않는다"** 하나가 제일 중요하다. 50절이
프리미엄을 안 넣기로 한 세 이유 중 사용자 답이 없애주는 건 첫 번째(구역
경계를 모른다)뿐이고, 나머지 둘(단계별로 0~수억 · 틀리면 한쪽으로만
과대평가돼 입찰가 과다로 이어짐)은 그대로다.
"""
import ast
import inspect
import os
import sys
import textwrap
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import estimate_price as ep  # noqa: E402


def _rows(n=12, amount=30000, area=60.0):
    return [{"_amount_man": amount + i * 200, "_area": area, "_weight": 1.0,
             "_distance_m": 100.0, "_similarity_score": 80.0,
             "dealYear": "2026", "dealMonth": "8"} for i in range(n)]


REDEV = {"dong": "홍은동", "max_ratio": 2.8, "count": 3,
         "examples": [{"name": "한보주택", "area": 34.0,
                       "amount_man": 30600, "build_year": 1991}]}


def _keys(**kw):
    kw.setdefault("filtered", _rows())
    kw.setdefault("model_divergence_pct", 0.0)
    return [w["key"] for w in ep.compute_estimate_warnings(
        kw["filtered"], kw["model_divergence_pct"],
        kw.get("redevelopment"), kw.get("zone_check"),
        kw.get("build_year"), kw.get("user_zone"))]


class NormalizeIsForgiving(unittest.TestCase):
    """모르는 값이 예외가 되면 참고 정보 하나로 계산 전체가 멈춘다."""

    def test_the_three_real_answers_survive(self):
        for v in ("no", "early", "late"):
            self.assertEqual(ep.normalize_user_zone(v), v)

    def test_whitespace_and_case(self):
        self.assertEqual(ep.normalize_user_zone("  Early "), "early")

    def test_anything_else_becomes_unknown(self):
        for v in (None, "", "   ", "yes", "정비구역", "0", "1", [], {}, 3.5,
                  float("nan"), True):
            self.assertEqual(ep.normalize_user_zone(v), ep.REDEV_USER_UNKNOWN)

    def test_unknown_is_the_empty_string_so_falsy_checks_work(self):
        self.assertEqual(ep.REDEV_USER_UNKNOWN, "")


class TheAnswerNeverChangesThePrice(unittest.TestCase):
    """⛔ 이 절의 가장 중요한 계약."""

    def test_every_answer_gives_the_identical_scenarios(self):
        base = ep.compute_scenarios(_rows(), 400, 2026, subject_area=60.0)
        for v in ("", "no", "early", "late", "쓰레기"):
            # 답은 compute_scenarios 에 아예 들어가지도 않아야 한다.
            again = ep.compute_scenarios(_rows(), 400, 2026, subject_area=60.0)
            self.assertEqual(base, again, f"{v!r} 에서 산출값이 달라졌다")

    def test_the_warning_function_does_not_touch_the_rows(self):
        rows = _rows()
        before = [dict(r) for r in rows]
        ep.compute_estimate_warnings(rows, 0.0, REDEV, None, 1991, "late")
        self.assertEqual(before, rows, "경고 계산이 입력 행을 고쳤다")

    def test_no_pricing_code_reads_the_answer(self):
        """가격을 만드는 함수 본문에 이 값이 들어오면 안 된다.

        ⚠️ `ast`로 독스트링 노드를 떼고 본문만 본다 — 주석·독스트링에 적은
        설명이 걸려 오탐이 나는 것을 72-24절에서 실제로 겪었다.
        """
        for fn in (ep.compute_scenarios, ep.compute_price_tiers,
                   ep.find_comparables, ep.count_prediction_risks,
                   ep.compute_prediction_interval):
            node = ast.parse(textwrap.dedent(inspect.getsource(fn))).body[0]
            body = node.body
            if (isinstance(body[0], ast.Expr)
                    and isinstance(body[0].value, ast.Constant)
                    and isinstance(body[0].value.value, str)):
                body = body[1:]
            code = "\n".join(ast.unparse(n) for n in body)
            for banned in ("user_zone", "REDEV_USER", "normalize_user_zone"):
                self.assertNotIn(banned, code,
                                 f"{fn.__name__} 이 정비구역 답을 읽는다 — 가격이 바뀔 수 있다")


class TheFourBranches(unittest.TestCase):
    def test_unknown_behaves_exactly_as_before(self):
        self.assertIn("redevelopment", _keys(redevelopment=REDEV, user_zone=""))
        self.assertIn("redevelopment", _keys(redevelopment=REDEV, user_zone=None))

    def test_inside_replaces_the_indirect_guess(self):
        for v in ("early", "late"):
            keys = _keys(redevelopment=REDEV, user_zone=v)
            self.assertIn("zone_user", keys)
            self.assertNotIn("redevelopment", keys,
                             "사용자가 확인해 준 뒤에도 '있을 수 있다'고 또 말하면 안 된다")

    def test_inside_warns_even_without_any_neighbourhood_signal(self):
        self.assertIn("zone_user", _keys(redevelopment=None, user_zone="late"))

    def test_outside_plus_signal_flips_the_direction(self):
        keys = _keys(redevelopment=REDEV, user_zone="no")
        self.assertIn("zone_contaminated", keys)
        self.assertNotIn("redevelopment", keys)

    def test_outside_without_signal_says_nothing(self):
        keys = _keys(redevelopment=None, user_zone="no")
        for k in ("zone_user", "zone_contaminated", "redevelopment"):
            self.assertNotIn(k, keys, "괜한 경고를 띄웠다")

    def test_the_direct_api_still_wins(self):
        """50-1절 토지이용계획이 근거가 가장 강하다 — 사용자 답보다 우선."""
        zc = {"zones": ["정비구역"], "pnu": "1" * 19}
        for v in ("", "no", "early", "late"):
            keys = _keys(redevelopment=REDEV, zone_check=zc, user_zone=v)
            self.assertIn("zone", keys)
            for k in ("zone_user", "zone_contaminated", "redevelopment"):
                self.assertNotIn(k, keys)

    def test_the_earlier_warnings_are_not_swallowed(self):
        """①② 경고는 정비구역 갈래로 빠져도 남아 있어야 한다."""
        keys = _keys(filtered=_rows(4), model_divergence_pct=9.0,
                     redevelopment=REDEV, build_year=1991, user_zone="late")
        self.assertIn("divergence", keys)
        self.assertIn("thin_sample", keys)
        self.assertIn("zone_user", keys)


class TheWordingIsSafe(unittest.TestCase):
    def test_no_markdown_reaches_the_screen(self):
        """화면은 마크다운을 렌더링하지 않는다(71-1절)."""
        for v in ("early", "late", "no"):
            for w in ep.compute_estimate_warnings(_rows(), 0.0, REDEV, None, 1991, v):
                for field in ("label", "detail", "advice"):
                    self.assertNotIn("**", w[field], f"{w['key']}.{field}")

    def test_inside_calls_the_number_a_floor_and_outside_a_ceiling(self):
        inside = [w for w in ep.compute_estimate_warnings(_rows(), 0.0, None, None, 1991, "late")
                  if w["key"] == "zone_user"][0]
        self.assertIn("하한", inside["advice"])
        outside = [w for w in ep.compute_estimate_warnings(_rows(), 0.0, REDEV, None, 1991, "no")
                   if w["key"] == "zone_contaminated"][0]
        self.assertIn("상한", outside["advice"])

    def test_the_two_stages_say_different_things(self):
        def detail(v):
            return [w for w in ep.compute_estimate_warnings(_rows(), 0.0, None, None, 1991, v)
                    if w["key"] == "zone_user"][0]["detail"]
        self.assertNotEqual(detail("early"), detail("late"))

    def test_every_choice_has_a_korean_label(self):
        for val, label in ep.REDEV_USER_CHOICES.items():
            self.assertTrue(label.strip())
            self.assertNotEqual(val, label)

    def test_no_lecture_attribution(self):
        """42-1절 — 화면 문구에 출처를 드러내지 않는다."""
        for v in ("early", "late", "no"):
            for w in ep.compute_estimate_warnings(_rows(), 0.0, REDEV, None, 1991, v):
                blob = " ".join(w[f] for f in ("label", "detail", "advice"))
                for banned in ("강의", "평공", "텐엑스"):
                    self.assertNotIn(banned, blob)


class TheCliAcceptsIt(unittest.TestCase):
    def test_the_flag_only_takes_the_real_answers(self):
        src = inspect.getsource(ep)
        self.assertIn('"--redevelopment"', src)
        self.assertIn("choices=list(REDEV_USER_CHOICES)", src)

    def test_the_cli_passes_it_to_the_warnings(self):
        src = inspect.getsource(ep)
        self.assertIn("args.build_year, args.redevelopment))", src,
                      "CLI 가 답을 경고 계산에 넘기지 않는다")


if __name__ == "__main__":
    unittest.main()
