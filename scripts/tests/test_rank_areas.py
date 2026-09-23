"""25절 인근 동 비교 / 13절 동네 랭킹 / 17절 평형대 — 순수 집계 로직."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def row(dong="가동", y=2026, m=9, amount="20,000", area="50.0", **kw):
    d = {"umdNm": dong, "dealYear": str(y), "dealMonth": str(m),
         "dealAmount": amount, "excluUseAr": area, "sggCd": "11305"}
    d.update(kw)
    return d


class TestWindowsComeFromTheData(unittest.TestCase):
    """12/13/15/30절과 같은 원칙 — 시스템 날짜가 아니라 데이터상 최신 계약월."""

    def test_latest_month_is_taken_from_the_rows(self):
        from rank_areas import build_dong_stats, month_index
        latest, _ = build_dong_stats([row(y=2025, m=3), row(y=2024, m=1)])
        self.assertEqual(latest, month_index(2025, 3))

    def test_recent_is_the_last_three_months(self):
        from rank_areas import build_dong_stats
        rows = [row(m=9), row(m=8), row(m=7)] + [row(m=6), row(m=5), row(m=4)]
        _, data = build_dong_stats(rows)
        self.assertEqual(data["가동"]["recent_count"], 3)
        self.assertEqual(data["가동"]["prev_count"], 3)

    def test_older_than_six_months_is_in_neither_window(self):
        from rank_areas import build_dong_stats
        _, data = build_dong_stats([row(m=9), row(m=1)])
        self.assertEqual(data["가동"]["recent_count"], 1)
        self.assertEqual(data["가동"]["prev_count"], 0)

    def test_year_boundary_is_handled(self):
        """12월 다음이 1월이라는 걸 month_index가 알아야 한다."""
        from rank_areas import build_dong_stats
        _, data = build_dong_stats([row(y=2026, m=1), row(y=2025, m=12), row(y=2025, m=11)])
        self.assertEqual(data["가동"]["recent_count"], 3)

    def test_no_usable_dates_returns_none(self):
        from rank_areas import build_dong_stats
        self.assertIsNone(build_dong_stats([]))
        self.assertIsNone(build_dong_stats([row(y=0, m=0)]))


class TestDirtyRowsAreDropped(unittest.TestCase):
    def test_cancelled_deals_are_excluded(self):
        from rank_areas import build_dong_stats
        _, data = build_dong_stats([row(), row(), row(cdealType="해제")])
        self.assertEqual(data["가동"]["recent_count"], 2)

    def test_zero_area_does_not_divide_by_zero(self):
        from rank_areas import build_dong_stats
        _, data = build_dong_stats([row(), row(area="0")])
        self.assertEqual(data["가동"]["recent_count"], 1)

    def test_unparseable_amount_is_skipped(self):
        from rank_areas import build_dong_stats
        _, data = build_dong_stats([row(), row(amount="")])
        self.assertEqual(data["가동"]["recent_count"], 1)

    def test_blank_dong_is_skipped(self):
        from rank_areas import build_dong_stats
        _, data = build_dong_stats([row(), row(dong="  ")])
        self.assertNotIn("", data)
        self.assertEqual(sum(d["recent_count"] for d in data.values()), 1)


class TestRankings(unittest.TestCase):
    def _two_dongs(self):
        rows = []
        rows += [row(dong="오른동", m=m, amount="24,000") for m in (9, 8, 7)]
        rows += [row(dong="오른동", m=m, amount="20,000") for m in (6, 5, 4)]
        rows += [row(dong="내린동", m=m, amount="18,000") for m in (9, 8, 7)]
        rows += [row(dong="내린동", m=m, amount="20,000") for m in (6, 5, 4)]
        return rows

    def test_price_change_is_sorted_high_to_low(self):
        from rank_areas import build_dong_stats, rank_by_price_change
        _, data = build_dong_stats(self._two_dongs())
        ranked = rank_by_price_change(data)
        self.assertEqual([d for d, *_ in ranked], ["오른동", "내린동"])
        self.assertAlmostEqual(ranked[0][1], 20.0)     # 2.0억 → 2.4억
        self.assertAlmostEqual(ranked[1][1], -10.0)

    def test_thin_samples_drop_out_of_the_ranking(self):
        """13절 MIN_SAMPLE — 표본이 적은 동은 '거래가 없다'가 아니라 '못 믿는다'."""
        from rank_areas import MIN_SAMPLE, build_dong_stats, rank_by_price_change
        rows = self._two_dongs() + [row(dong="한건동", m=9)]
        _, data = build_dong_stats(rows)
        self.assertNotIn("한건동", [d for d, *_ in rank_by_price_change(data)])
        self.assertEqual(MIN_SAMPLE, 3)

    def test_volume_ranking_is_by_recent_count(self):
        from rank_areas import build_dong_stats, rank_by_volume
        rows = [row(dong="많은동", m=m) for m in (9, 9, 8, 8, 7)]
        rows += [row(dong="적은동", m=m) for m in (9, 8, 7)]
        _, data = build_dong_stats(rows)
        self.assertEqual(rank_by_volume(data), [("많은동", 5), ("적은동", 3)])

    def test_find_dong_rank_is_one_based_and_none_when_absent(self):
        from rank_areas import find_dong_rank
        ranked = [("가동", 5), ("나동", 3)]
        self.assertEqual(find_dong_rank(ranked, "가동"), 1)
        self.assertEqual(find_dong_rank(ranked, "나동"), 2)
        self.assertIsNone(find_dong_rank(ranked, "없는동"))


class TestAreaBands(unittest.TestCase):
    """17절 — 경계값이 어느 쪽에 붙는지가 헷갈리기 쉽다."""

    def test_boundaries_belong_to_the_upper_band(self):
        from rank_areas import band_for_area
        self.assertIn("소형", band_for_area(39.9))
        self.assertIn("중소형", band_for_area(40.0))
        self.assertIn("중소형", band_for_area(59.9))
        self.assertIn("중형", band_for_area(60.0))
        self.assertIn("중형", band_for_area(84.9))
        self.assertIn("대형", band_for_area(85.0))

    def test_every_positive_area_lands_in_a_band(self):
        from rank_areas import band_for_area
        for a in (0.1, 1, 25, 47, 84.99, 85, 300, 10000):
            self.assertIsNotNone(band_for_area(a), a)


if __name__ == "__main__":
    unittest.main()
