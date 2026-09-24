"""74절 — 게임용 데이터와 케이스 파일을 고정한다.

이 파일이 지키는 계약은 두 가지다:

1. **생성기가 키를 흘리지 않는다.** 결과물은 공개된 게임 아티팩트에 그대로
   붙여넣는 파일이라, 인증키가 한 글자라도 섞이면 끝이다(6절).
2. **케이스에 손으로 적은 숫자가 데이터·상수와 어긋나지 않는다.** 72-13절
   교훈 그대로 — 기억으로 적은 숫자는 조용히 틀린다. 실제로 이 테스트를
   쓰다가 인테리어 케이스의 순증 계산이 틀린 것을 잡았다.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(_ROOT, "scripts"))

import estimate_price as ep          # noqa: E402
import listing_parser as lp          # noqa: E402
import export_game_data as gd        # noqa: E402

DATA_JS = os.path.join(_ROOT, "game", "auction-game-data.js")
CASES_JS = os.path.join(_ROOT, "game", "cases-sale.js")


def _load_data() -> dict:
    t = open(DATA_JS, encoding="utf-8").read()
    return json.loads(t[t.index("{"):t.rindex(";")])


def _cases_text() -> str:
    return open(CASES_JS, encoding="utf-8").read()


class TheGeneratorRunsWithoutNetwork(unittest.TestCase):
    """생성기는 `data/`·`reports/`와 상수만 읽는다 — 네트워크를 타면 안 된다."""

    def test_it_does_not_import_anything_that_calls_out(self):
        src = open(os.path.join(_ROOT, "scripts", "export_game_data.py"), encoding="utf-8").read()
        for bad in ("urlopen", "requests", "http_pool", "geocode", "data_source"):
            self.assertNotIn(bad, src, f"생성기가 {bad} 를 쓴다 — 네트워크로 샐 수 있다")

    def test_rebaking_gives_the_same_file(self):
        """다시 구우면 같은 파일이 나와야 한다 — 안 그러면 게임 대사와 어긋난다."""
        before = open(DATA_JS, encoding="utf-8").read()
        subprocess.run([sys.executable, os.path.join(_ROOT, "scripts", "export_game_data.py")],
                       cwd=_ROOT, capture_output=True, check=True)
        self.assertEqual(before, open(DATA_JS, encoding="utf-8").read())


class NoKeyEverReachesTheGameFile(unittest.TestCase):
    """공개 아티팩트에 붙여넣는 파일이라 키가 섞이면 안 된다(6절)."""

    KEY_NAMES = ("MOLIT_SERVICE_KEY", "KAKAO_REST_API_KEY", "KAKAO_JS_KEY",
                 "SUPABASE_SERVICE_KEY", "SUPABASE_URL", "VWORLD_API_KEY",
                 "GG_DATA_KEY", "serviceKey")

    def test_neither_file_mentions_a_key(self):
        for path in (DATA_JS, CASES_JS):
            body = open(path, encoding="utf-8").read()
            for name in self.KEY_NAMES:
                self.assertNotIn(name, body, f"{os.path.basename(path)} 에 {name} 가 있다")

    def test_no_long_opaque_token_slipped_in(self):
        """키처럼 생긴 긴 문자열이 값으로 들어가 있지 않은지."""
        body = open(DATA_JS, encoding="utf-8").read()
        for tok in re.findall(r'"[A-Za-z0-9+/=%_-]{40,}"', body):
            self.fail(f"키처럼 생긴 값이 있다: {tok[:50]}…")


class TheRegionMapIsHonest(unittest.TestCase):
    def setUp(self):
        self.d = _load_data()

    def test_the_merged_gwangju_jeonnam_label_is_excluded(self):
        """69절 — 원본이 광주와 전남을 한 라벨로 묶어 내려보내 둘을 가를 수 없다."""
        self.assertNotIn("전남광주", {r["sido"] for r in self.d["regions"]})

    def test_zone_rows_are_not_passed_off_as_provinces(self):
        """24절 — 권역 행(경부1권 등)을 시/도로 내보내면 게임이 착각한다."""
        for name in self.d["market"]["sido"]:
            self.assertIn(name, gd.SIDO_KEYS, f"{name} 은 시/도가 아니다")
        self.assertTrue(self.d["market"]["droppedRegions"],
                        "권역 행이 하나도 안 걸러졌다 — 원본이 바뀌었는지 확인")

    def test_every_region_clears_the_minimum_sample(self):
        for r in self.d["regions"]:
            self.assertGreaterEqual(r["vol"], gd.MIN_TOTAL, f"{r['gu']} 표본 부족")

    def test_demand_tiers_split_the_country(self):
        tiers = {r["demand"] for r in self.d["regions"]}
        self.assertEqual(tiers, {"두꺼움", "보통", "얇음"})


class TheRulesMatchTheCalculator(unittest.TestCase):
    """게임 규칙은 계산기 상수를 그대로 옮긴 것이어야 한다 — 갈라지면 안 된다."""

    def setUp(self):
        self.rules = _load_data()["rules"]

    def test_condition_multipliers(self):
        self.assertEqual(self.rules["condition"], ep.CONDITION_MULTIPLIER)

    def test_first_floor_and_interval_and_location(self):
        self.assertEqual(self.rules["firstFloor"], ep.FIRST_FLOOR_PRICE_RATIO)
        self.assertEqual({int(k): v for k, v in self.rules["interval"]["pct"].items()},
                         ep.PREDICTION_INTERVAL_PCT)
        self.assertEqual(self.rules["location"]["stationNear"], ep.STATION_NEAR_M)
        self.assertEqual(self.rules["inspection"], ep.INSPECTION_CHECKLIST)

    def test_pressure_bands_come_from_the_parser(self):
        self.assertEqual([b["upto"] for b in self.rules["pressure"]],
                         [u for u, _, _ in lp.SALE_PRESSURE_BANDS])


class TheCasesQuoteRealNumbers(unittest.TestCase):
    """케이스 본문에 손으로 적은 숫자가 데이터와 어긋나지 않는지."""

    def setUp(self):
        self.d = _load_data()
        self.text = _cases_text()
        self.by_gu = {(r["sido"], r["gu"]): r for r in self.d["regions"]}

    def test_region_figures_in_the_stage_picking_case(self):
        for sido, gu in [("서울", "성동구"), ("서울", "강북구")]:
            r = self.by_gu[(sido, gu)]
            self.assertIn(f"{r['young']}%", self.text, f"{gu} 비중이 본문과 다르다")
        self.assertIn(f"{self.d['regionMeta']['national']}%", self.text, "전국 평균이 다르다")
        self.assertIn(f"{self.d['regionMeta']['min']}%", self.text, "최저 지역 비중이 다르다")
        self.assertIn(f"{self.by_gu[('서울','성동구')]['rank']}위", self.text)
        self.assertIn(f"{self.d['regionMeta']['count']}", self.text, "지역 개수가 다르다")

    def test_market_index_figures(self):
        z = self.d["market"]["seoulZone"]
        self.assertIn(str(z["동북권"]), self.text)
        self.assertIn(str(z["서북권"]), self.text)
        self.assertIn(str(self.d["market"]["sido"]["대구"]), self.text)

    def test_the_hongeun_prices_come_from_the_real_report(self):
        ans = next(a for a in self.d["appraise"] if a["dong"] == "홍은동")["answer"]
        for label in ("보수적 급매가", "경매용 매도가", "상단 매도가", "권장 최초 호가"):
            # ⚠️ 소수 둘째 자리까지 맞춰 비교한다 — 리포트가 4.1로 읽히는 값을
            # 본문은 "4.10억"으로 쓴다. 글자 그대로 비교하면 멀쩡한 케이스가 실패한다.
            self.assertIn(f"{ans[label]:.2f}억", self.text, f"{label} 가 리포트와 다르다")
        self.assertIn(f"{next(a for a in self.d['appraise'] if a['dong']=='홍은동')['compTotal']}건",
                      self.text, "비교거래 건수가 다르다")

    def test_the_repair_ladder_arithmetic_is_exact(self):
        """⚠️ 이 검사가 실제로 틀린 계산을 잡았다 — 지우지 말 것."""
        base = 33600.0                      # 경매용 매도가 3.36억(만원)
        mult = ep.CONDITION_MULTIPLIER
        worn = base * mult["노후"]
        rows = [("기본", mult["기본"], 400, 5), ("올수리", mult["올수리"], 3500, 28)]
        for name, m, cost, days in rows:
            gain = round(base * m - worn)
            hold = round(70 * days / 30)
            net = gain - cost - hold
            self.assertIn(f"{gain:,}만", self.text, f"{name} 더받는 돈이 본문과 다르다")
            self.assertIn(f"{net:,}만", self.text, f"{name} 순증이 본문과 다르다")
        # 세 단계 가격표
        for m in mult.values():
            self.assertIn(f"{base * m / 10000:.2f}억", self.text)

    def test_the_first_floor_discount_is_not_overstated(self):
        """1층 할인은 참고치 7%다 — 반값은 반지하라는 구분이 본문에 있어야 한다."""
        pct = round((1 - ep.FIRST_FLOOR_PRICE_RATIO) * 100)
        self.assertIn(f"{pct}%", self.text)
        self.assertIn("반지하", self.text)

    def test_unverified_numbers_are_labelled(self):
        """검증 안 된 수치는 항상 그렇게 적는다(24·29·35절 원칙)."""
        self.assertIn("검증된 수치가 아닙니다", self.text)
        self.assertIn("참고치", self.text)


class TheCasesFitTheGameFormat(unittest.TestCase):
    """게임의 CASES 배열에 그대로 들어갈 수 있는 모양인지."""

    def setUp(self):
        self.text = _cases_text()

    def test_categories_are_ones_the_game_already_declares(self):
        # 게임의 CASE_CATS 에 이미 있는 이름만 쓴다 — 새 카테고리를 만들면 화면에 안 뜬다
        declared = {"명도", "고난도 명도", "위기 대응", "외국인 점유자", "매도·임대",
                    "선순위 임차인", "상가", "지분", "부동산 사장님", "인테리어", "빌라 투자"}
        used = set(re.findall(r'cat:"([^"]+)"', self.text))
        self.assertTrue(used <= declared, f"게임에 없는 카테고리: {used - declared}")

    def test_every_step_has_exactly_one_best_answer(self):
        """등급 2(가장 좋은 선택)가 단계마다 정확히 하나 있어야 한다."""
        out = subprocess.run(
            ["node", "-e",
             "const {CASES_SALE}=require(process.argv[1]);"
             "console.log(JSON.stringify(CASES_SALE.map(c=>c.steps.map(s=>s.o.filter(o=>o.g===2).length))))",
             CASES_JS],
            capture_output=True, text=True, check=True)
        for case in json.loads(out.stdout):
            for n in case:
                self.assertEqual(n, 1, "한 단계에 최선 선택지가 하나여야 한다")

    def test_no_lecture_attribution_on_screen(self):
        """42-1절 — 화면 문구에 출처를 드러내지 않는다."""
        for word in ("강의", "평공쌤", "텐엑스"):
            self.assertNotIn(word, self.text, f"화면 문구에 '{word}' 가 있다")


if __name__ == "__main__":
    unittest.main()
