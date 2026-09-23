"""CLAUDE.md 69절 — 매입자 연령대별 거래량.

⚠️ 이 파일이 지키는 제일 중요한 것은 **55절 버그 ①의 재발 방지**다 —
거기서는 구 이름만 보고 판정하는 바람에 **부산 중구가 서울 도심권 지수를
받았다.** 화면에 그럴듯한 숫자가 뜨는 종류라 눈으로는 절대 못 잡는다.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import buyer_age as ba


def _t(rows):
    """`{(시도, 시군구): {연령대: {연도: 건수}}}` 를 짧게 만든다."""
    table = {}
    for (sido, gu), ages in rows.items():
        table[(sido, gu)] = {a: {2025: n} for a, n in ages.items()}
    return table


def _mix(total):
    """연령 구성 하나 — 30·40대가 딱 절반이 되도록."""
    q = total // 4
    return {"합계": total, "20대이하": q, "30대": q, "40대": q, "50대": total - 3 * q}


class RegionMatching(unittest.TestCase):
    def setUp(self):
        self.table = _t({
            ("서울", ""): _mix(9000), ("서울", "중구"): _mix(1000),
            ("서울", "강북구"): _mix(1000), ("서울", "중랑구"): _mix(1000),
            ("부산", ""): _mix(9000), ("부산", "중구"): _mix(1000),
            ("부산", "북구"): _mix(1000),
            ("경기", ""): _mix(9000), ("경기", "성남시"): _mix(3000),
            ("경기", "분당구"): _mix(1000), ("경기", "김포시"): _mix(1000),
        })

    def test_a_gu_name_shared_by_two_sido_never_crosses_over(self):
        """55절 버그 ① — 부산 중구가 서울 중구로 잡히면 안 된다."""
        self.assertEqual(ba.region_for_address("부산광역시 중구 1", self.table),
                         ("부산", "중구"))
        self.assertEqual(ba.region_for_address("서울특별시 중구 1", self.table),
                         ("서울", "중구"))

    def test_gyeonggi_is_spelled_differently_in_this_file(self):
        """원본은 '경기도'가 아니라 '경기'다 — 24절 VILLA_SIDO_ALIAS와 같은 한 글자."""
        self.assertEqual(ba.region_for_address("경기도 김포시 사우동 1309", self.table),
                         ("경기", "김포시"))
        self.assertEqual(ba.region_for_address("경기 김포시 사우동 1309", self.table),
                         ("경기", "김포시"))

    def test_the_narrower_unit_wins(self):
        """'성남시 분당구'는 분당구다 — 둘 다 원본에 있고 이름 길이도 같다."""
        self.assertEqual(ba.region_for_address("경기도 성남시 분당구 정자동 1", self.table),
                         ("경기", "분당구"))

    def test_a_name_contained_in_another_is_dropped(self):
        """'강북구'가 걸렸는데 '북구'까지 같이 잡히면 안 된다."""
        table = dict(self.table)
        table[("서울", "북구")] = {a: {2025: n} for a, n in _mix(1000).items()}
        self.assertEqual(ba.region_for_address("서울특별시 강북구 수유동 468", table),
                         ("서울", "강북구"))

    def test_no_sido_means_no_guessing(self):
        """시/도를 못 정하면 시군구 매칭 자체를 하지 않는다."""
        self.assertIsNone(ba.region_for_address("중구 어딘가 1", self.table))
        self.assertIsNone(ba.region_for_address("", self.table))

    def test_unknown_gu_falls_back_to_the_sido_total(self):
        self.assertEqual(ba.region_for_address("서울특별시 없는구 1", self.table),
                         ("서울", ""))

    def test_gwangju_and_jeonnam_are_not_supported(self):
        """원본이 둘을 '전남광주' 한 라벨로 묶어 어느 쪽인지 모른다 —
        틀린 값을 주느니 조용히 생략한다."""
        table = dict(self.table)
        table[("전남광주", "")] = {a: {2025: 0} for a in _mix(0)}
        table[("전남광주", "목포시")] = {a: {2025: n} for a, n in _mix(1000).items()}
        self.assertIsNone(ba.region_for_address("광주광역시 남구 1", table))
        self.assertIsNone(ba.region_for_address("전라남도 목포시 1", table))


class Computation(unittest.TestCase):
    def test_percentages_exclude_the_unknown_age_bucket(self):
        """'기타'(연령 미상)는 비중에서 뺀다 — 지역마다 미상 비율이 달라서
        합계로 나누면 미상이 많은 동네의 비중이 통째로 낮아 보인다."""
        table = _t({("서울", "강북구"): {"합계": 1000, "30대": 250, "40대": 250,
                                      "50대": 100, "기타": 400}})
        info = ba.compute_buyer_age("서울특별시 강북구 1", table)
        self.assertEqual(info["known"], 600)
        self.assertAlmostEqual(info["young_pct"], 500 / 600 * 100, places=6)
        self.assertNotIn("기타", [b["age"] for b in info["breakdown"]])
        self.assertAlmostEqual(sum(b["pct"] for b in info["breakdown"]), 100.0, places=6)

    def test_a_thin_sample_is_skipped_rather_than_shown(self):
        table = _t({("서울", "강북구"): _mix(ba.MIN_TOTAL - 4)})
        self.assertIsNone(ba.compute_buyer_age("서울특별시 강북구 1", table))

    def test_known_must_clear_the_bar_too(self):
        """합계는 넉넉한데 대부분이 '기타'면 구성비를 믿을 수 없다."""
        table = _t({("서울", "강북구"): {"합계": 5000, "30대": 50, "기타": 4950}})
        self.assertIsNone(ba.compute_buyer_age("서울특별시 강북구 1", table))

    def test_an_unmatched_address_returns_nothing(self):
        self.assertIsNone(ba.compute_buyer_age("없는주소", _t({("서울", ""): _mix(9000)})))

    def test_rank_is_within_the_same_sido_only(self):
        table = _t({
            ("서울", "가구"): {"합계": 1000, "30대": 800, "50대": 200},
            ("서울", "나구"): {"합계": 1000, "30대": 500, "50대": 500},
            ("서울", "다구"): {"합계": 1000, "30대": 200, "50대": 800},
            ("부산", "라구"): {"합계": 1000, "30대": 900, "50대": 100},
        })
        info = ba.compute_buyer_age("서울특별시 나구 1", table)
        self.assertEqual(info["rank"]["rank"], 2)
        self.assertEqual(info["rank"]["total"], 3)   # 부산은 안 센다

    def test_a_missing_file_is_not_a_crash(self):
        self.assertEqual(ba.load_buyer_age("/tmp/이런파일은없다.csv"), {})


class ItNeverTouchesThePrice(unittest.TestCase):
    """24절·26절·40절과 같은 원칙 — 참고 지표는 매도가에도 41절 점수에도
    반영하지 않는다. 주택유형이 안 갈린 통계라 더더욱 그렇다."""

    def test_the_scoring_function_never_looks_at_this_data(self):
        """41절 점수 함수 **본문 안**에 이 모듈이 들어오지 않는지 본다.

        ⚠️ 파일 전체를 보면 안 된다 — CLI 출력부가 정상적으로 import하므로
        그건 오탐이다. `def` 하나의 몸통만 잘라서 검사한다.
        """
        root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        with open(os.path.join(root, "estimate_price.py"), encoding="utf-8") as f:
            src = f.read()
        start = src.index("def build_marketability_report")
        rest = src[start:]
        end = rest.index("\ndef ", 1)            # 다음 최상위 def까지가 이 함수다
        body = rest[:end]
        self.assertGreater(len(body), 500)       # 잘못 잘렸으면 검사가 무의미하다
        self.assertNotIn("buyer_age", body)
        self.assertNotIn("young_pct", body)

    def test_the_warning_about_housing_type_is_always_printed(self):
        import io as _io
        from contextlib import redirect_stdout
        table = _t({("서울", "강북구"): _mix(4000)})
        buf = _io.StringIO()
        with redirect_stdout(buf):
            ba.print_buyer_age(ba.compute_buyer_age("서울특별시 강북구 1", table))
        out = buf.getvalue()
        self.assertIn("아파트 거래가 섞여", out)
        self.assertIn("매도가 계산에는 반영되지 않습니다", out)


class TheRealFileLoads(unittest.TestCase):
    def test_every_sido_in_the_file_is_reachable_except_the_merged_one(self):
        """⚠️ 실제 파일이 바뀌었을 때 조용히 매칭이 끊기는 걸 잡는다."""
        from market_index import SIDO_ALIAS, sido_token
        table = ba.load_buyer_age()
        if not table:
            self.skipTest("data/buyer_age_by_region.csv 없음")
        have = {s for s, _ in table}
        unreachable = []
        for long in SIDO_ALIAS:
            tok = ba.SIDO_ALIAS.get(sido_token(long + " 어딘가"), sido_token(long + " 어딘가"))
            if tok not in have:
                unreachable.append(long)
        self.assertEqual(sorted(unreachable), ["광주광역시", "전라남도"])


if __name__ == "__main__":
    unittest.main()
