"""21절 인근 중개업소 + 14절 CLI HTML 리포트 — 아직 테스트가 없던 두 모듈."""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestSeoulBrokerFiltering(unittest.TestCase):
    """⚠️ `geocode`를 갈아끼우면 **반드시 되돌린다** — 안 그러면 뒤에 도는
    테스트가 가짜 좌표를 물고 깨진다(48절에 적힌 그 함정에 실제로 또 빠졌다)."""

    def setUp(self):
        import geocode as geo
        self._geo = geo
        self._original = geo.geocode

    def tearDown(self):
        self._geo.geocode = self._original

    def _rows(self, n=3, dong="수유동", state="영업중"):
        return [{"법정동명": dong, "상태구분": state, "주소": f"서울 강북구 길{i}",
                 "사업자상호": f"공인{i}", "중개업자명": f"김{i}", "전화번호": "02-000-0000"}
                for i in range(n)]

    def _patch_geo(self, coord=(37.6, 127.0)):
        self._geo.geocode = lambda a, timeout=6: coord

    def test_only_the_same_dong_and_open_offices(self):
        from broker_lookup import find_nearby_brokers_seoul
        self._patch_geo()
        rows = (self._rows(2, dong="수유동")
                + self._rows(5, dong="미아동")
                + self._rows(4, dong="수유동", state="폐업"))
        out, _ = find_nearby_brokers_seoul(rows, (37.6, 127.0), "수유동")
        self.assertEqual(len(out), 2)

    def test_dong_name_is_compared_after_stripping(self):
        from broker_lookup import find_nearby_brokers_seoul
        self._patch_geo()
        rows = [{"법정동명": " 수유동 ", "상태구분": " 영업중 ", "주소": "서울 강북구 길1",
                 "사업자상호": "공인", "중개업자명": "김", "전화번호": "02"}]
        out, _ = find_nearby_brokers_seoul(rows, (37.6, 127.0), "수유동")
        self.assertEqual(len(out), 1)

    def test_offices_outside_the_radius_are_dropped(self):
        from broker_lookup import find_nearby_brokers_seoul
        self._patch_geo(coord=(38.6, 127.0))       # 약 111km 밖
        out, _ = find_nearby_brokers_seoul(self._rows(3), (37.6, 127.0), "수유동")
        self.assertEqual(out, [])

    def test_result_is_sorted_by_distance(self):
        from broker_lookup import find_nearby_brokers_seoul
        geo = self._geo
        coords = {"서울 강북구 길0": (37.605, 127.0),
                  "서울 강북구 길1": (37.601, 127.0),
                  "서울 강북구 길2": (37.603, 127.0)}
        geo.geocode = lambda a, timeout=6: coords.get(a)
        out, _ = find_nearby_brokers_seoul(self._rows(3), (37.6, 127.0), "수유동")
        self.assertEqual([o["name"] for o in out], ["공인1", "공인2", "공인0"])

    def test_too_many_offices_are_capped_and_flagged(self):
        """지오코딩 호출을 아끼려고 상한을 두는데, 잘랐다는 사실을 알려야 한다."""
        from broker_lookup import MAX_CANDIDATES, find_nearby_brokers_seoul
        self._patch_geo()
        out, truncated = find_nearby_brokers_seoul(
            self._rows(MAX_CANDIDATES + 10), (37.6, 127.0), "수유동")
        self.assertTrue(truncated)
        self.assertEqual(len(out), MAX_CANDIDATES)

    def test_not_truncated_when_under_the_cap(self):
        from broker_lookup import find_nearby_brokers_seoul
        self._patch_geo()
        _, truncated = find_nearby_brokers_seoul(self._rows(3), (37.6, 127.0), "수유동")
        self.assertFalse(truncated)

    def test_failed_geocoding_skips_that_office_only(self):
        from broker_lookup import find_nearby_brokers_seoul
        self._geo.geocode = lambda a, timeout=6: None if a.endswith("길1") else (37.6, 127.0)
        out, _ = find_nearby_brokers_seoul(self._rows(3), (37.6, 127.0), "수유동")
        self.assertEqual([o["name"] for o in out], ["공인0", "공인2"])

    def test_missing_csv_is_not_an_error(self):
        from broker_lookup import load_seoul_brokers
        self.assertEqual(load_seoul_brokers("/nope/nope.csv"), [])

    def test_cp949_csv_is_read(self):
        """서울 열린데이터광장 CSV는 cp949로 내려오는 경우가 있다."""
        from broker_lookup import load_seoul_brokers
        d = tempfile.mkdtemp()
        p = os.path.join(d, "b.csv")
        with open(p, "w", encoding="cp949") as f:
            f.write("법정동명,상태구분\n수유동,영업중\n")
        self.assertEqual(load_seoul_brokers(p)[0]["법정동명"], "수유동")


class TestHtmlReportRenders(unittest.TestCase):
    """14절 리포트는 외부 라이브러리 없이 한 덩어리 HTML을 만든다."""

    def _args(self, **over):
        a = dict(building="테스트빌라", dong="수유동", area=47.0,
                 period="2025.01 ~ 2026.09", generated="2026-09-23", confidence=78,
                 conservative=17000, realistic=19000, upper=21000, ai_base=19000,
                 listing=21600, auction_price=18000, n_total=12, n_close=5,
                 comparables=[], season={}, trend={"series": []})
        a.update(over)
        return a

    def test_renders_without_optional_sections(self):
        from report import render_report
        html = render_report(**self._args())
        self.assertIn("<html", html.lower())
        self.assertIn("테스트빌라", html)

    def test_prices_appear_in_eok(self):
        from report import fmt_eok, render_report
        html = render_report(**self._args())
        self.assertEqual(fmt_eok(19000), "1.90억")
        self.assertIn("1.90억", html)

    def test_comparables_table_is_rendered(self):
        from report import render_report
        comps = [{"name": "가나빌라", "area": "47.0", "date": "2026.05",
                  "amount": 19000, "label": "120m",
                  "map_url": "https://new.land.naver.com/houses?ms=37.6,127.0,19",
                  "search_url": "https://search.naver.com/search.naver?query=x"}]
        html = render_report(**self._args(comparables=comps))
        self.assertIn("가나빌라", html)
        self.assertIn("1.90억", html)
        self.assertIn("🗺️", html)      # 27-2절 지도 링크
        self.assertIn("🔍", html)      # 27-2절 검색 링크

    def test_empty_season_and_trend_do_not_crash(self):
        from report import render_report
        html = render_report(**self._args(season={}, trend={}))
        self.assertIn("테스트빌라", html)

    def test_naver_link_is_embedded_when_given(self):
        from report import render_report
        html = render_report(**self._args(naver_url="https://new.land.naver.com/houses?ms=1,2,17"))
        self.assertIn("new.land.naver.com", html)

    def test_fmt_eok_rounds_to_two_decimals(self):
        from report import fmt_eok
        self.assertEqual(fmt_eok(10000), "1.00억")
        self.assertEqual(fmt_eok(12345), "1.23억")
        self.assertEqual(fmt_eok(0), "0.00억")


if __name__ == "__main__":
    unittest.main()


class TestOnlyHttpUrlsBecomeLinks(unittest.TestCase):
    """CLAUDE.md 72-7절 — `href`에 들어가는 주소는 http(s)만 통과한다.

    ⚠️ 지금 이 리포트에 들어오는 주소는 전부 `naver_link.py`가 좌표·검색어로
    만든 것이라 실제로 뚫릴 길은 없다. 그래도 고정해 두는 건, 나중에 누가
    사용자 입력에서 온 주소를 여기 넘겨도 **링크가 코드로 바뀌지 않게**
    하기 위해서다.
    """

    def _render(self, search_url, map_url, naver_url):
        from report import render_report      # 이 파일의 다른 테스트와 같은 방식

        return render_report(
            building="빌라", dong="수유동", area="69.0", period="2025.01~2026.09",
            generated="2026-09-23", confidence=88,
            conservative=28000, realistic=30000, upper=32000, ai_base=30000,
            listing=33000, auction_price=29000, n_total=1, n_close=1,
            comparables=[{"name": "A", "area": "69.0", "date": "2026.5",
                          "amount": 30000.0, "label": "120m",
                          "search_url": search_url, "map_url": map_url}],
            season={"scope_label": "수유동", "index": {m: 100 for m in range(1, 13)},
                    "busy": [3], "slow": [8]},
            trend={"scope_label": "수유동", "series": [(2026, 1, 450.0)], "change_pct": 2.2},
            filtered=None, naver_url=naver_url, this_year=2026, this_month=9)

    def test_dangerous_schemes_never_become_hrefs(self):
        import re

        for bad in ("javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<b>",
                    "vbscript:x", "  javascript:alert(1)"):
            with self.subTest(bad):
                html_out = self._render(bad, bad, bad)
                hrefs = re.findall(r'href="([^"]*)"', html_out)
                for href in hrefs:
                    self.assertTrue(href == "" or href.lower().startswith("http"),
                                    f"위험한 주소가 링크로 나갔습니다: {href}")

    def test_normal_links_still_work(self):
        html_out = self._render("https://search.naver.com/?query=x",
                                "https://new.land.naver.com/houses?ms=1,2,19",
                                "https://new.land.naver.com/houses?ms=3,4,17")
        self.assertIn("search.naver.com", html_out)
        self.assertIn("new.land.naver.com/houses?ms=1,2,19", html_out)
        self.assertIn("new.land.naver.com/houses?ms=3,4,17", html_out)

    def test_the_helper_itself(self):
        import report

        self.assertEqual(report._safe_url("https://a/b"), "https://a/b")
        self.assertEqual(report._safe_url("http://a"), "http://a")
        for bad in ("javascript:x", "//evil.com", "ftp://a", "", None, "   "):
            self.assertEqual(report._safe_url(bad), "", f"{bad!r}를 통과시켰습니다")
