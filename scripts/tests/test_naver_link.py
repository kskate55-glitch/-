"""27절/27-2절 네이버 링크 — URL만 만든다(스크래핑 아님)."""
import os
import sys
import unittest
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestLandDeepLink(unittest.TestCase):
    def test_villa_and_sale_filters_are_in_the_url(self):
        from naver_link import naver_land_url
        url = naver_land_url(37.6156, 126.7158)
        self.assertIn("a=VL", url)    # 빌라/연립다세대
        self.assertIn("b=A1", url)    # 매매

    def test_coordinates_are_not_swapped(self):
        """위도,경도 순서가 뒤집히면 지도가 엉뚱한 데를 연다."""
        from naver_link import naver_land_url
        url = naver_land_url(37.6156, 126.7158)
        ms = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["ms"][0]
        lat, lon, zoom = ms.split(",")
        self.assertAlmostEqual(float(lat), 37.6156, places=4)
        self.assertAlmostEqual(float(lon), 126.7158, places=4)
        self.assertEqual(zoom, "17")

    def test_zoom_is_overridable_for_comparable_rows(self):
        """27-2절 비교거래 링크는 건물 하나가 보이게 더 당긴다."""
        from naver_link import naver_land_url
        self.assertIn(",19&", naver_land_url(37.0, 127.0, zoom=19))

    def test_it_is_an_https_naver_url(self):
        from naver_link import naver_land_url
        self.assertTrue(naver_land_url(37.0, 127.0).startswith("https://new.land.naver.com/"))

    def test_negative_and_small_coordinates_do_not_break_the_format(self):
        from naver_link import naver_land_url
        url = naver_land_url(-0.5, 0.25)
        self.assertIn("ms=-0.500000,0.250000,17", url)


class TestSearchLink(unittest.TestCase):
    def test_korean_query_is_percent_encoded(self):
        """인코딩을 빼먹으면 공백·한글이 들어간 순간 깨진 URL이 된다."""
        from naver_link import naver_search_url
        url = naver_search_url("홍은동 경원탑스빌")
        self.assertNotIn(" ", url)
        q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["query"][0]
        self.assertEqual(q, "홍은동 경원탑스빌")

    def test_special_characters_survive(self):
        from naver_link import naver_search_url
        for q in ("가동 빌라&하우스", "삼정빌 #3", "A/B동", "(단지명없음)"):
            url = naver_search_url(q)
            back = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["query"][0]
            self.assertEqual(back, q)

    def test_it_is_an_https_naver_search_url(self):
        from naver_link import naver_search_url
        self.assertTrue(naver_search_url("x").startswith("https://search.naver.com/"))


if __name__ == "__main__":
    unittest.main()
