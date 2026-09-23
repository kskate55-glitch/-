"""
CLAUDE.md 72-6절 — 매도가 산출 경로가 **깨지면 조용히 틀리는 성질**들을
무작위 동네 수십 개에 걸쳐 확인한다.

33절 단위 테스트가 "이 입력에 이 답이 나오는지"를 고정한다면, 이 파일은
"어떤 입력이 와도 반드시 성립해야 하는 관계"를 고정한다. 여기 걸리는
버그는 값 하나가 틀리는 게 아니라 **계산 구조가 틀어진** 것이라, 화면만
봐서는 알아챌 방법이 없다.

⚠️ 지오코딩은 `zlib.crc32`로 **결정적으로** 흉내 낸다. 처음에 `hash()`를
썼다가 프로세스마다 값이 달라져 **실패가 재현되지 않는** 상태를 겪었다
(55절이 못박은 "순서에 기대는 테스트는 안전망인 척하는 것"과 같은 문제다).

⚠️ 48절이 못박은 대로 `geocode` **모듈의 속성**을 갈아야 한다 —
`find_comparables()`가 호출할 때마다 함수 안에서 `from geocode import
geocode`로 새로 가져오기 때문에, `estimate_price`의 이름만 바꾸면 실제
카카오 API로 새어 나간다.
"""

import os
import random
import sys
import unittest
import zlib

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import estimate_price as ep  # noqa: E402
import geocode as geo  # noqa: E402

BASE = (37.6380, 127.0250)
SUBJECT_AREA = 69.0


def _fake_geocode(address: str):
    """주소마다 반경 400m 안 어딘가의 좌표 — 프로세스가 바뀌어도 같은 값."""
    h = zlib.crc32(address.encode())
    return (BASE[0] + (h % 600 - 300) / 1e5, BASE[1] + ((h // 600) % 700 - 350) / 1e5)


def _neighborhood(n: int, rnd: random.Random) -> list[dict]:
    rows = []
    for i in range(n):
        area = SUBJECT_AREA * rnd.uniform(0.88, 1.12)
        amount = rnd.uniform(380, 620) * area
        rows.append({
            "umdNm": "수유동", "mhouseNm": f"빌라{i}", "jibun": f"{200 + i}-{i % 9}",
            "dealYear": str(rnd.choice([2025, 2026])), "dealMonth": str(rnd.randrange(1, 13)),
            "dealDay": "10", "dealAmount": f"{round(amount):,}", "excluUseAr": f"{area:.2f}",
            "floor": str(rnd.choice([1, 2, 3, 4, 5])), "buildYear": str(rnd.randrange(2010, 2015)),
            "sggCd": "11305", "dealingGbn": "중개거래",
        })
    return rows


def _rows_copy(rows: list[dict]) -> list[dict]:
    return [dict(r) for r in rows]


class PricePropertyCase(unittest.TestCase):
    """무작위 동네를 돌려가며 성질을 확인하는 테스트들의 공통 뼈대."""

    def setUp(self):
        self._real_geocode = geo.geocode
        geo.geocode = _fake_geocode

    def tearDown(self):
        # 55절 — 갈아끼운 것을 되돌리지 않으면 뒤에 도는 테스트가 깨진다.
        geo.geocode = self._real_geocode

    def _scenarios(self, rows, floor=3, trend=None, first_floor_ratio=1.0):
        comparables = ep.find_comparables(
            rows, subject_coord=BASE, area=SUBJECT_AREA, floor=floor,
            build_year="2012", radius_m=400, year_min=2025, this_year=2026,
            gu_filter=None, this_month=9, monthly_trend_rate=trend,
            first_floor_ratio=first_floor_ratio)
        if len(comparables) < 4:
            return None
        return ep.compute_scenarios(comparables, radius_m=400, this_year=2026,
                                    subject_area=SUBJECT_AREA,
                                    calibration=ep.SALE_CALIBRATION_FACTOR)

    def _each_neighborhood(self, count=60):
        """(seed, rows, 기준 산출값)을 차례로 내준다. 표본이 얇은 동네는 건너뛴다."""
        produced = 0
        for seed in range(count * 3):
            rnd = random.Random(seed)
            rows = _neighborhood(rnd.randrange(12, 40), rnd)
            base = self._scenarios(_rows_copy(rows))
            if base is None:
                continue
            produced += 1
            yield seed, rows, base
            if produced >= count:
                return
        self.fail("성질을 확인할 동네를 충분히 만들지 못했습니다")


class TestOrderIndependence(PricePropertyCase):
    """행 순서가 결과를 바꾸면 안 된다.

    같은 데이터를 어떤 순서로 받든 같은 매도가가 나와야 한다. 순서에 따라
    답이 달라지면 "어제와 오늘 값이 다른데 이유를 모르는" 상태가 된다.

    ⚠️ **지금 이 성질은 5절 거리 정렬이 보장한다** — 비교거래를 거리순으로
    줄 세우므로 입력 순서가 결과까지 새어 나갈 길이 없다. 그래서 이 테스트가
    지키는 건 사실 **그 정렬이 완전(total)하다**는 것이다: 거리가 같은 두 건을
    정렬이 못 가리면 그 순간 입력 순서가 답을 가르기 시작한다. 목록 자체가
    같은 순서로 나오는지까지 확인하는 이유다.
    """

    def test_shuffling_the_rows_changes_nothing(self):
        for seed, rows, base in self._each_neighborhood():
            shuffled = _rows_copy(rows)
            random.Random(seed + 1).shuffle(shuffled)
            other = self._scenarios(shuffled)
            self.assertIsNotNone(other, f"seed={seed}")
            for key in ("p25", "median", "p75"):
                self.assertAlmostEqual(base[key], other[key], places=6,
                                       msg=f"seed={seed} {key} — 행 순서에 따라 값이 달라졌습니다")

    def test_the_comparable_list_itself_comes_back_in_the_same_order(self):
        def names(rows):
            return [(r["mhouseNm"], r["jibun"], r["dealMonth"]) for r in ep.find_comparables(
                rows, subject_coord=BASE, area=SUBJECT_AREA, floor=3, build_year="2012",
                radius_m=400, year_min=2025, this_year=2026, gu_filter=None, this_month=9)]

        for seed, rows, _base in self._each_neighborhood(count=40):
            shuffled = _rows_copy(rows)
            random.Random(seed + 7).shuffle(shuffled)
            self.assertEqual(names(_rows_copy(rows)), names(shuffled),
                             f"seed={seed} — 거리 정렬이 동점을 못 가려 입력 순서가 새어 나왔습니다")


class TestScaleInvariance(PricePropertyCase):
    """모든 체결가가 같은 비율로 오르면 산출값도 정확히 그만큼 올라야 한다.

    깨진다면 금액에 비례하지 않는 무언가(고정 상수, 잘못된 반올림)가 계산
    한가운데 섞여 있다는 뜻이다.
    """

    def test_every_tier_follows_the_multiplier(self):
        """⚠️ 배율을 10%만 올려 봤을 때는 **계산 한가운데 상수를 하나 심어도
        그냥 통과했다** — 금액에 비해 상수가 작아 허용오차에 묻힌 것이다.
        배율을 크게 잡으면 그런 상수가 비율을 눈에 띄게 어긋나게 만든다."""
        for multiplier, delta in ((1.10, 0.004), (10.0, 0.01)):
            for seed, rows, base in self._each_neighborhood(count=30):
                scaled = _rows_copy(rows)
                for row in scaled:
                    row["dealAmount"] = f"{round(ep.to_amount_man(row['dealAmount']) * multiplier):,}"
                other = self._scenarios(scaled)
                if other is None:
                    continue
                for key in ("p25", "median", "p75"):
                    self.assertAlmostEqual(
                        other[key] / base[key], multiplier, delta=delta,
                        msg=f"seed={seed} {key} — 전체 x{multiplier}인데 산출값은 "
                            f"x{other[key] / base[key]:.4f}입니다")


class TestQuantilesStayOrdered(PricePropertyCase):
    """보수적 급매가 ≤ 현실적 체결가 ≤ 상단 매도가 — 뒤집히면 화면이 거짓말을 한다."""

    def test_p25_median_p75_never_invert(self):
        for seed, _rows, base in self._each_neighborhood():
            self.assertLessEqual(base["p25"], base["median"] + 1e-9, f"seed={seed}")
            self.assertLessEqual(base["median"], base["p75"] + 1e-9, f"seed={seed}")


class TestFirstFloorCorrectionIsNoOpWithinTheSameFloor(PricePropertyCase):
    """64절 1층 보정은 **층이 다른 비교거래에만** 걸려야 한다.

    대상도 비교거래도 전부 1층이면 보정할 층 차이가 없으므로 결과가
    한 자리도 달라지면 안 된다. 여기가 깨지면 1층 물건을 통째로 7% 깎는
    셈이 된다.
    """

    def test_all_first_floor_means_no_adjustment_at_all(self):
        """⚠️ 처음엔 "보정을 켠 실행과 끈 실행이 같은가"만 봤는데, 보정식을
        망가뜨려 보니 **양쪽이 똑같이 망가져서 그냥 통과했다.** 두 실행을
        견주는 대신 **보정이 아예 안 붙었는지**를 절대 기준으로 확인한다."""
        checked = 0
        for seed, rows, _base in self._each_neighborhood(count=40):
            all_first = _rows_copy(rows)
            for row in all_first:
                row["floor"] = "1"
            comparables = ep.find_comparables(
                all_first, subject_coord=BASE, area=SUBJECT_AREA, floor=1,
                build_year="2012", radius_m=400, year_min=2025, this_year=2026,
                gu_filter=None, this_month=9,
                first_floor_ratio=ep.FIRST_FLOOR_PRICE_RATIO)
            checked += len(comparables)
            for row in comparables:
                self.assertNotIn("_first_floor_factor", row,
                                 f"seed={seed} — 1층끼리인데 64절 보정이 걸렸습니다")
                self.assertNotIn("_amount_man_adjusted", row,
                                 f"seed={seed} — 1층끼리인데 금액이 보정됐습니다")
        self.assertGreater(checked, 50, "확인한 비교거래가 너무 적습니다")


class TestTheTwoAdjustmentsMultiply(PricePropertyCase):
    """64절 1층 보정과 7-2절 시계열 보정은 **곱해져야** 한다.

    둘이 같은 `_amount_man_adjusted` 필드를 쓰기 때문에, 한쪽이 다른 쪽을
    덮어쓰면 **조용히 사라진다** — 화면에는 아무 표시도 나지 않는다.

    ⚠️ 이 테스트는 처음에 "배율 종류가 두 가지 이상인가"만 봤는데, 실제로
    덮어쓰기로 되돌려 보니 **그냥 통과했다**(덮어써도 1층 보정분과 1.0이
    함께 나오므로). 지금은 두 보정계수를 따로 저장해 둔 값으로 **곱이
    정확히 맞는지** 직접 확인한다 — 덮어쓰면 반드시 걸린다.
    """

    def test_the_adjusted_amount_is_exactly_the_product(self):
        ratio = ep.FIRST_FLOOR_PRICE_RATIO
        checked = 0
        for seed, rows, _base in self._each_neighborhood(count=40):
            comparables = ep.find_comparables(
                _rows_copy(rows), subject_coord=BASE, area=SUBJECT_AREA, floor=1,
                build_year="2012", radius_m=400, year_min=2025, this_year=2026,
                gu_filter=None, this_month=9, monthly_trend_rate=0.006,
                first_floor_ratio=ratio)
            both = [r for r in comparables
                    if "_time_correction_factor" in r and "_first_floor_factor" in r
                    and abs(r["_time_correction_factor"] - 1.0) > 1e-9]
            for row in both:
                checked += 1
                expected = (row["_amount_man"] * row["_time_correction_factor"]
                            * row["_first_floor_factor"])
                self.assertAlmostEqual(
                    row["_amount_man_adjusted"], expected, places=6,
                    msg=f"seed={seed} {row['mhouseNm']} — 두 보정이 곱해지지 않았습니다 "
                        f"(한쪽이 다른 쪽을 덮어썼습니다)")
        self.assertGreater(checked, 20,
                           "두 보정이 함께 걸린 비교거래를 충분히 만나지 못했습니다 — "
                           "이 테스트가 실제로 뭔가를 확인하고 있는지 의심해야 합니다")


class TestInputRowsAreNeverMutated(PricePropertyCase):
    """7절이 실제로 겪은 버그 — `find_comparables()`가 입력 dict를 직접 고치면
    같은 rows를 다른 조건으로 다시 조회하는 30절·40절이 앞선 계산을 덮어쓴다."""

    def test_calling_twice_with_different_settings_is_safe(self):
        for seed, rows, base in self._each_neighborhood(count=30):
            ep.find_comparables(rows, subject_coord=BASE, area=SUBJECT_AREA, floor=None,
                                build_year=None, radius_m=800, year_min=2025,
                                this_year=2026, gu_filter=None, this_month=9)
            again = self._scenarios(rows)
            self.assertIsNotNone(again, f"seed={seed}")
            self.assertAlmostEqual(base["median"], again["median"], places=6,
                                   msg=f"seed={seed} — 넓은 반경 재조회가 앞선 결과를 덮어썼습니다")


if __name__ == "__main__":
    unittest.main()
