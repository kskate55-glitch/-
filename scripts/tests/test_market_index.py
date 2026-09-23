"""24절 시장 동향 지표 — 지역 매칭과 추세 계산 (55절에서 버그 두 개가 나왔다)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestSeoulZoneNeedsToActuallyBeSeoul(unittest.TestCase):
    """⚠️ 구 이름만 보고 판정하면 남의 동네에 '서울 도심권' 지수가 뜬다."""

    def test_seoul_junggu_is_the_city_center_zone(self):
        from market_index import seoul_zone_from_address
        self.assertEqual(seoul_zone_from_address("서울특별시 중구 회현동 100"), "도심권")

    def test_other_cities_junggu_is_not_seoul(self):
        from market_index import seoul_zone_from_address
        for addr in ("부산광역시 중구 남포동 100", "대구광역시 중구 대봉동 50",
                     "인천광역시 중구 신흥동 1", "대전광역시 중구 은행동 1",
                     "울산광역시 중구 성남동 1"):
            self.assertIsNone(seoul_zone_from_address(addr), addr)

    def test_busan_gangseo_is_not_seoul_either(self):
        from market_index import seoul_zone_from_address
        self.assertIsNone(seoul_zone_from_address("부산광역시 강서구 명지동 1"))
        self.assertEqual(seoul_zone_from_address("서울특별시 강서구 화곡동 1"), "서남권")

    def test_short_seoul_form_still_works(self):
        from market_index import seoul_zone_from_address
        self.assertEqual(seoul_zone_from_address("서울 강북구 수유동 468"), "동북권")

    def test_bare_gu_without_a_sido_still_resolves(self):
        """시/도를 안 쓴 주소는 예전처럼 구 이름으로 — 서울 전용 이름이 대부분이다."""
        from market_index import seoul_zone_from_address
        self.assertEqual(seoul_zone_from_address("노원구 상계동 1"), "동북권")

    def test_every_seoul_gu_maps_to_a_zone(self):
        from market_index import SEOUL_GU_TO_ZONE, seoul_zone_from_address
        self.assertEqual(len(SEOUL_GU_TO_ZONE), 25, "서울은 25개 구다")
        for gu in SEOUL_GU_TO_ZONE:
            self.assertIsNotNone(seoul_zone_from_address(f"서울특별시 {gu} 어디동 1"), gu)


class TestRegionFromAddress(unittest.TestCase):
    def test_short_forms_are_understood(self):
        """⚠️ '경기 김포시 …'가 None이 되어 24절 카드가 조용히 사라졌다."""
        from market_index import VILLA_SIDO_ALIAS, region_from_address
        self.assertEqual(region_from_address("경기 김포시 사우동 1309", VILLA_SIDO_ALIAS), "경기")
        self.assertEqual(region_from_address("서울 강북구 수유동 468", VILLA_SIDO_ALIAS), "서울")

    def test_long_forms_still_work(self):
        from market_index import VILLA_SIDO_ALIAS, region_from_address
        self.assertEqual(region_from_address("경기도 김포시 사우동 1309", VILLA_SIDO_ALIAS), "경기")
        self.assertEqual(region_from_address("서울특별시 강북구 수유동 468", VILLA_SIDO_ALIAS), "서울")

    def test_gyeonggi_gwangju_is_not_gwangju_metro(self):
        """⚠️ 부분 문자열로 찾으면 '경기도 광주시'가 '광주광역시'로 잡힌다."""
        from market_index import VILLA_SIDO_ALIAS, region_from_address
        self.assertEqual(region_from_address("경기도 광주시 역동 100", VILLA_SIDO_ALIAS), "경기")
        self.assertEqual(region_from_address("광주광역시 북구 운암동 1", VILLA_SIDO_ALIAS), "광주")

    def test_villa_alias_differs_only_for_gyeonggi(self):
        from market_index import SIDO_ALIAS, VILLA_SIDO_ALIAS, region_from_address
        self.assertEqual(region_from_address("경기도 김포시 1", SIDO_ALIAS), "경기도")
        self.assertEqual(region_from_address("경기도 김포시 1", VILLA_SIDO_ALIAS), "경기")

    def test_unknown_address_is_none(self):
        from market_index import region_from_address
        self.assertIsNone(region_from_address("판타지아 왕국 1번지"))
        self.assertIsNone(region_from_address(""))


class TestVillaMarketTrend(unittest.TestCase):
    def _rows(self, values, region="서울"):
        return [{"date": f"2025-{i+1:02d}", "region": region, "index": str(v)}
                for i, v in enumerate(values)]

    def test_needs_twice_the_window(self):
        from market_index import compute_villa_market_trend
        self.assertIsNone(compute_villa_market_trend(self._rows([100] * 5), "서울"))
        self.assertIsNotNone(compute_villa_market_trend(self._rows([100] * 6), "서울"))

    def test_rising_trend_is_positive(self):
        from market_index import compute_villa_market_trend
        t = compute_villa_market_trend(self._rows([90, 90, 90, 110, 110, 110]), "서울")
        self.assertAlmostEqual(t["index_trend"], 20.0)
        self.assertAlmostEqual(t["since_start"], 20.0)

    def test_falling_trend_is_negative(self):
        from market_index import compute_villa_market_trend
        t = compute_villa_market_trend(self._rows([110, 110, 110, 90, 90, 90]), "서울")
        self.assertLess(t["index_trend"], 0)

    def test_latest_is_the_last_month_not_the_input_order(self):
        from market_index import compute_villa_market_trend
        rows = self._rows([100, 101, 102, 103, 104, 105])
        t = compute_villa_market_trend(list(reversed(rows)), "서울")
        self.assertEqual(t["snapshot_date"], "2025-06")
        self.assertAlmostEqual(t["index_latest"], 105.0)

    def test_other_regions_are_not_mixed_in(self):
        from market_index import compute_villa_market_trend
        rows = self._rows([100] * 6, "서울") + self._rows([999] * 6, "부산")
        t = compute_villa_market_trend(rows, "서울")
        self.assertAlmostEqual(t["index_latest"], 100.0)

    def test_missing_region_returns_none(self):
        from market_index import compute_villa_market_trend
        self.assertIsNone(compute_villa_market_trend(self._rows([100] * 6), "제주"))


class TestRankingAndPlainWords(unittest.TestCase):
    def _three_regions(self):
        return [{"date": "2025-06", "region": r, "index": str(v)}
                for r, v in [("서울", 110.0), ("부산", 95.0), ("경기", 105.0)]]

    def test_ranking_is_descending_and_finds_the_region(self):
        from market_index import rank_region
        res = rank_region(self._three_regions(), "부산",
                          allowed_regions={"서울", "부산", "경기"})
        values = [v for _, (_d, v) in res["ranking"]]
        self.assertEqual(values, sorted(values, reverse=True))
        self.assertEqual(res["ranking"][0][0], "서울")
        self.assertEqual((res["rank"], res["total"]), (3, 3))   # 부산이 꼴찌

    def test_region_with_no_data_is_none(self):
        from market_index import rank_region
        self.assertIsNone(rank_region(self._three_regions(), "제주"))

    def test_only_the_latest_date_counts(self):
        """옛 달 값이 섞여 있어도 최신 시점으로만 줄을 세워야 한다."""
        from market_index import rank_region
        rows = self._three_regions() + [
            {"date": "2025-01", "region": "부산", "index": "999"}]
        res = rank_region(rows, "부산", allowed_regions={"서울", "부산", "경기"})
        self.assertEqual(res["rank"], 3)

    def test_allowed_regions_filters_out_sub_aggregates(self):
        """원본 CSV에는 시/도가 아닌 중간집계 행이 섞여 있다."""
        from market_index import rank_region
        rows = self._three_regions() + [
            {"date": "2025-06", "region": "수도권", "index": "200"}]
        res = rank_region(rows, "서울", allowed_regions={"서울", "부산", "경기"})
        self.assertEqual(res["total"], 3)
        self.assertNotIn("수도권", [r for r, _ in res["ranking"]])

    def test_plain_words_flip_at_the_baseline(self):
        from market_index import _plain_market_desc
        above, below = _plain_market_desc(120.0), _plain_market_desc(80.0)
        self.assertNotEqual(above, below)
        self.assertTrue(above.strip() and below.strip())

    def test_real_snapshot_files_parse_if_present(self):
        """실제 스냅샷 CSV가 있으면 스키마가 맞는지까지 확인한다."""
        from market_index import load_villa_market_index, load_villa_seoul_zone_index
        for rows in (load_villa_market_index(), load_villa_seoul_zone_index()):
            for r in rows[:50]:
                self.assertIn("date", r)
                self.assertIn("region", r)
                self.assertIn("index", r)


if __name__ == "__main__":
    unittest.main()
