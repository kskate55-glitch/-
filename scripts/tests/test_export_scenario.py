"""73절 — 게임 시나리오 내보내기.

이 파일이 지키는 계약은 네 가지다:
  ① **JSON으로 나간다.** 실제로 `compute_liquidity()`가 튜플 키 dict를
     돌려줘서 `json.dumps`가 터졌다 — 화면이 아니라 파일이라 이게 깨지면
     게임이 통째로 못 읽는다.
  ② **가명이 기본이다.** 이 JSON은 게임 아티팩트에 그대로 들어가 공개된다.
  ③ **계산기와 숫자가 갈리지 않는다.** 72-10절 웹↔CLI 교차검증과 같은 이유.
  ④ **다시 구우면 같은 값이 나온다.** 스냅샷을 쓰는 이유 자체가 재현성이다.
"""
import json
import os
import random
import sys
import types
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_SCRIPTS = os.path.dirname(_HERE)
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)

os.environ.setdefault("KAKAO_REST_API_KEY", "테스트키")

import estimate_price as ep          # noqa: E402
import export_scenario as ex         # noqa: E402
import geocode                       # noqa: E402

REAL_NAME = "진짜빌라"
ADDRESS = "서울특별시 서대문구 홍은동 265-218"


def _rows(n=40):
    rnd = random.Random(7)
    out = []
    for i in range(n):
        out.append({
            "umdNm": "홍은동", "mhouseNm": f"{REAL_NAME}{i % 9}",
            "jibun": f"265-{200 + i % 9}", "dealYear": "2026",
            "dealMonth": str(1 + i % 9), "dealDay": "10",
            "dealAmount": f"{28000 + rnd.randint(-4000, 6000):,}",
            "excluUseAr": f"{58 + rnd.uniform(-5, 5):.2f}",
            "floor": str(1 + i % 5), "buildYear": str(2010 + i % 5),
            "sggCd": "11410", "dealingGbn": "중개거래",
        })
    return out


def _args(**over):
    """CLI 기본값을 그대로 쓰되 몇 개만 바꾼다 — 파서를 거쳐야 기본값이
    한 군데(argparse)에만 있다는 게 지켜진다."""
    argv = ["--id", "t1", "--address", ADDRESS, "--area", "59.88",
            "--floor", "3", "--build-year", "2012"]
    for key, value in over.items():
        flag = "--" + key.replace("_", "-")
        if value is True:
            argv.append(flag)
        else:
            argv += [flag, str(value)]
    return ex.build_parser().parse_args(argv)


class _Fakes(unittest.TestCase):
    """⚠️ 지오코딩은 **두 이름 다** 막는다 — 48절·55절·72-11절에서 네 번
    겪은 누출이다(`find_comparables`는 호출할 때마다 모듈 속성을 새로
    가져온다)."""

    def setUp(self):
        self._saved = (geocode.geocode, geocode.geocode_full,
                       ex.load_transactions, ep.load_transactions)
        self._coords = {}

        def fake_geocode(addr):
            if addr not in self._coords:
                self._coords[addr] = (37.59 + len(self._coords) * 0.00035, 126.94)
            return self._coords[addr]

        def fake_full(addr):
            return {"lat": 37.59, "lon": 126.94, "b_code": "1141011800",
                    "main_no": "265", "sub_no": "218", "is_mountain": False,
                    "dong": "홍은동", "jibun": ADDRESS, "road": "",
                    "sido": "서울", "sigungu": "서대문구"}

        geocode.geocode = fake_geocode
        geocode.geocode_full = fake_full
        self.rows = _rows()
        ex.load_transactions = lambda d: list(self.rows)
        ep.load_transactions = ex.load_transactions

    def tearDown(self):
        (geocode.geocode, geocode.geocode_full,
         ex.load_transactions, ep.load_transactions) = self._saved


class ItSerialisesToJson(_Fakes):
    def test_the_whole_thing_dumps(self):
        """①. `compute_liquidity()`의 `(반경, 개월)` 튜플 키에서 실제로 터졌다."""
        text = json.dumps(ex.build_scenario(_args()), ensure_ascii=False)
        self.assertGreater(len(text), 500)

    def test_liquidity_counts_became_a_list(self):
        liq = ex.build_scenario(_args())["liquidity"]
        self.assertIsInstance(liq["counts"], list)
        self.assertIsInstance(liq["radii"], list)
        for entry in liq["counts"]:
            self.assertIn("radius_m", entry)
            self.assertIn("months", entry)
            self.assertIn("count", entry)

    def test_every_required_key_is_there(self):
        data = ex.build_scenario(_args())
        for key in ("schema", "scenario_id", "version", "generated_at", "source",
                    "subject", "truth", "scenarios", "prediction", "tiers",
                    "warnings", "condition_multiplier", "condition_ladder",
                    "comparables", "liquidity", "reveal"):
            self.assertIn(key, data)
        self.assertEqual(data["schema"], ex.SCHEMA)


class NamesAreHiddenByDefault(_Fakes):
    def test_no_real_building_name_and_no_address(self):
        """②. 이 파일은 공개된 게임 아티팩트에 그대로 들어간다."""
        text = json.dumps(ex.build_scenario(_args()), ensure_ascii=False)
        self.assertNotIn(REAL_NAME, text)
        self.assertNotIn("265-218", text)

    def test_one_building_gets_exactly_one_alias(self):
        """같은 건물이 두 가명으로 갈리거나 다른 두 건물이 한 가명을 쓰면,
        사장님 대사가 "그 집이 또 팔렸어요"를 엉뚱하게 말하게 된다."""
        aliased = ex.build_scenario(_args())["comparables"]
        real = ex.build_scenario(_args(real_names=True))["comparables"]
        self.assertEqual(len(aliased), len(real))
        mapping = {}
        for hidden, shown in zip(aliased, real):
            self.assertIn(hidden["name"], ex.ALIAS_NAMES)
            mapping.setdefault(shown["name"], hidden["name"])
            self.assertEqual(mapping[shown["name"]], hidden["name"])
        self.assertEqual(len(set(mapping.values())), len(mapping))

    def test_real_names_opts_out(self):
        text = json.dumps(ex.build_scenario(_args(real_names=True)),
                          ensure_ascii=False)
        self.assertIn(REAL_NAME, text)
        self.assertIn("265-218", text)


class TheNumbersMatchTheCalculator(_Fakes):
    """③. 게임이 부르는 값과 계산기가 부르는 값이 갈리면 안 된다."""

    def test_scenarios_equal_a_direct_call(self):
        data = ex.build_scenario(_args())
        rows = ep.dedupe(_rows())
        filtered = ep.find_comparables(
            rows, (37.59, 126.94), 59.88, 3, "2012", 400.0,
            data["source"]["year_min"], int(data["generated_at"][:4]),
            gu_filter=None, area_tolerance_pct=0.15, build_year_tolerance=4.0,
            this_month=int(data["generated_at"][5:7]),
            subject_building=ep.building_identity_parts("홍은동", "265", "218", False),
            monthly_trend_rate=data["source"]["monthly_trend_rate"],
            first_floor_ratio=ep.FIRST_FLOOR_PRICE_RATIO)
        scen = ep.compute_scenarios(filtered, 400.0, int(data["generated_at"][:4]),
                                    subject_area=59.88,
                                    calibration=ep.SALE_CALIBRATION_FACTOR)
        self.assertEqual(data["scenarios"]["median"], round(scen["median"]))
        self.assertEqual(data["scenarios"]["p25"], round(scen["p25"]))
        self.assertEqual(data["scenarios"]["p75"], round(scen["p75"]))

    def test_auction_price_is_the_midpoint(self):
        """8-2절 — 보수적 급매가와 현실적 체결가의 중간값."""
        s = ex.build_scenario(_args())["scenarios"]
        self.assertEqual(s["auction"], round((s["p25"] + s["median"]) / 2, -1))

    def test_the_ladder_follows_the_condition_multipliers(self):
        """38절 — 명도 결과를 매도가로 잇는 고리. 여기가 게임의 핵심이다."""
        data = ex.build_scenario(_args())
        auction = data["scenarios"]["auction"]
        for state, rung in data["condition_ladder"].items():
            self.assertTrue(rung and rung[0]["is_current"])
            self.assertEqual(rung[0]["condition"], state)
            expected = round(auction * ex.CONDITION_MULTIPLIER[state], -1)
            self.assertAlmostEqual(rung[0]["price_man"], expected, delta=1)

    def test_comparable_amounts_are_the_reported_price(self):
        """7-2·64절 — 화면(그리고 대사)은 **신고된 실제 체결가** 그대로다."""
        data = ex.build_scenario(_args(real_names=True))
        reported = {round(ep.to_amount_man(r["dealAmount"])) for r in self.rows}
        for comp in data["comparables"]:
            self.assertIn(comp["amount_man"], reported)


class TheHiddenTruthSitsInTheBand(_Fakes):
    def test_it_is_inside_the_prediction_interval(self):
        data = ex.build_scenario(_args())
        band, truth = data["prediction"], data["truth"]["sale_price_man"]
        self.assertGreaterEqual(truth, band["low_man"])
        self.assertLessEqual(truth, band["high_man"])

    def test_truth_pos_is_the_difficulty_knob(self):
        low = ex.build_scenario(_args(truth_pos=0.1))["truth"]["sale_price_man"]
        high = ex.build_scenario(_args(truth_pos=0.9))["truth"]["sale_price_man"]
        self.assertLess(low, high)

    def test_out_of_range_positions_are_clamped(self):
        data = ex.build_scenario(_args(truth_pos=5))
        self.assertLessEqual(data["truth"]["sale_price_man"],
                             data["prediction"]["high_man"])


class BakingItTwiceGivesTheSameFile(_Fakes):
    def test_identical_output(self):
        """④. 스냅샷을 쓰는 이유가 이것이다 — 이게 깨지면 게임 밸런스가
        구울 때마다 달라진다."""
        first = ex.build_scenario(_args())
        second = ex.build_scenario(_args())
        first.pop("generated_at"), second.pop("generated_at")
        self.assertEqual(json.dumps(first, ensure_ascii=False, sort_keys=True),
                         json.dumps(second, ensure_ascii=False, sort_keys=True))


class TheJsFlagEmitsPasteableCode(_Fakes):
    def test_it_is_a_const_assignment(self):
        text = ex.render(ex.build_scenario(_args()), as_js=True,
                         scenario_id="hongeun-01", pretty=False)
        self.assertTrue(text.startswith("const SCENARIO_HONGEUN_01 = {"))
        self.assertTrue(text.rstrip().endswith("};"))
        payload = text[text.index("{"):text.rstrip().rindex("}") + 1]
        self.assertEqual(json.loads(payload)["scenario_id"], "t1")

    def test_plain_json_has_no_const(self):
        text = ex.render(ex.build_scenario(_args()), as_js=False,
                         scenario_id="t1", pretty=True)
        self.assertNotIn("const ", text)
        json.loads(text)


class TheRevealMapPointsAtRealKeys(_Fakes):
    """게임이 액션으로 여는 정보는 **이 JSON 안에 실제로 있는 것**이어야
    한다 — 없는 키를 가리키면 그 장면이 조용히 빈다."""

    def test_every_pointer_resolves(self):
        data = ex.build_scenario(_args())
        for stage, spec in data["reveal"].items():
            pointers = spec if isinstance(spec, list) else []
            for path in pointers:
                node = data
                for part in path.split("."):
                    self.assertIn(part, node, f"{stage} → {path}")
                    node = node[part]


if __name__ == "__main__":
    unittest.main()
