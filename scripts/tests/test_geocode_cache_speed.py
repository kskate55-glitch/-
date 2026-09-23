"""지오코딩 캐시를 메모리에 들고 있는지 (57절).

예전엔 `geocode()`를 부를 때마다 캐시 파일을 통째로 읽고(히트여도!) 쓸 때
통째로 다시 썼다 — **쓸수록 사이트가 느려지는 구조**였다. 실측으로 캐시
3만 건일 때 지오코딩 200번에 디스크에만 23초를 썼고, 그게 전부 락 안에서
벌어져 22절 병렬 8워커가 줄을 섰다.
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class _Resp:
    def __init__(self, lat=37.6, lon=127.0):
        self.b = json.dumps({"documents": [{"x": str(lon), "y": str(lat)}]}).encode()

    def read(self):
        return self.b

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class TestCacheIsHeldInMemory(unittest.TestCase):
    def setUp(self):
        import geocode as geo
        self.geo = geo
        self._orig_path = geo.CACHE_PATH
        self._orig_urlopen = geo.urlopen
        self._orig_key = os.environ.get("KAKAO_REST_API_KEY")
        os.environ["KAKAO_REST_API_KEY"] = "test-key"
        self.dir = tempfile.mkdtemp()
        geo.CACHE_PATH = os.path.join(self.dir, "c.json")
        geo._memory.clear()
        geo._memory_dirty.clear()
        geo._memory_written.clear()
        geo.urlopen = lambda req, timeout=None: _Resp()

    def tearDown(self):
        self.geo.CACHE_PATH = self._orig_path
        self.geo.urlopen = self._orig_urlopen
        self.geo._memory.clear()
        self.geo._memory_dirty.clear()
        self.geo._memory_written.clear()
        if self._orig_key is None:
            os.environ.pop("KAKAO_REST_API_KEY", None)
        else:
            os.environ["KAKAO_REST_API_KEY"] = self._orig_key

    def test_file_is_read_only_once_per_path(self):
        """히트마다 파일을 다시 읽으면 캐시가 클수록 느려진다."""
        reads = []
        import json_cache
        original = json_cache.read_json
        self.geo.read_json = lambda p, **k: (reads.append(p), original(p, **k))[1]
        try:
            self.geo.geocode("서울특별시 강북구 수유동 1")
            self.geo.geocode("서울특별시 강북구 수유동 1")
            self.geo.geocode("서울특별시 강북구 수유동 2")
        finally:
            self.geo.read_json = original
        self.assertEqual(len(reads), 1, f"파일을 {len(reads)}번 읽었다")

    def test_a_hit_returns_the_cached_value_without_calling_kakao(self):
        called = []
        self.geo.urlopen = lambda req, timeout=None: (called.append(1), _Resp())[1]
        a = self.geo.geocode("서울특별시 강북구 수유동 3")
        b = self.geo.geocode("서울특별시 강북구 수유동 3")
        self.assertEqual(a, b)
        self.assertEqual(len(called), 1)

    def test_changing_the_path_reloads_from_that_file(self):
        """테스트나 다른 프로세스가 경로를 바꾸면 메모리가 남아 있으면 안 된다."""
        self.geo.geocode("서울특별시 강북구 수유동 4")
        other = os.path.join(self.dir, "other.json")
        with open(other, "w", encoding="utf-8") as f:
            json.dump({"딴주소 1": [1.0, 2.0]}, f)
        self.geo.CACHE_PATH = other
        self.assertEqual(self.geo._load_cache(), {"딴주소 1": [1.0, 2.0]})

    def test_pending_writes_are_flushed_on_demand(self):
        """모아 쓰기 때문에 파일에 아직 없을 수 있다 — flush가 내려써야 한다."""
        for i in range(5):
            self.geo.geocode(f"서울특별시 강북구 수유동 10-{i}")
        self.geo.flush_caches()
        with open(self.geo.CACHE_PATH, encoding="utf-8") as f:
            saved = json.load(f)
        for i in range(5):
            self.assertIn(f"서울특별시 강북구 수유동 10-{i}", saved)

    def test_a_big_cache_does_not_slow_lookups_down(self):
        """3만 건 캐시에서도 조회가 디스크를 타면 안 된다."""
        import time
        big = {f"주소 {i}": [37.6, 127.0] for i in range(30000)}
        self.geo._mem_save(self.geo.CACHE_PATH, big, force=True)
        keys = list(big)[:200]
        start = time.perf_counter()
        for k in keys:
            self.geo.geocode(k)
        elapsed = time.perf_counter() - start
        self.assertLess(elapsed, 1.0, f"캐시 히트 200번에 {elapsed:.2f}초 — 디스크를 타고 있다")

    def test_broken_cache_still_recovers(self):
        """53절 보장이 유지되는지 — 메모리로 바꾸면서 깨지기 쉬운 부분이다."""
        with open(self.geo.CACHE_PATH, "w", encoding="utf-8") as f:
            f.write("{깨진")
        self.geo._memory.clear()
        self.assertEqual(self.geo._load_cache(), {})


if __name__ == "__main__":
    unittest.main()


class TestApartmentFetchIsPrefetched(unittest.TestCase):
    """57절 — 40절 아파트 조회는 빌라 조회와 겹쳐 돌아야 한다.

    예전엔 지오코딩이 전부 끝난 **뒤에야** 아파트를 부르기 시작해서, 국토부를
    기다리는 구간이 줄줄이 두 번 생겼다. 둘은 서로 의존이 전혀 없다.
    """

    def setUp(self):
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
        os.environ.setdefault("KAKAO_REST_API_KEY", "test-key")
        os.environ.setdefault("MOLIT_SERVICE_KEY", "test-key")
        import app as webapp
        import data_source as ds
        import geocode as geo
        self.webapp, self.ds, self.geo = webapp, ds, geo
        import building_register as br
        self.br = br
        self._orig = (ds.get_trade_rows, ds.get_apt_rows, geo.geocode,
                      geo.geocode_full, geo.nearby_place, webapp.PREFETCH_APT,
                      br.get_building_info)
        geo.geocode = lambda a, timeout=6: (37.6156, 126.7158)
        geo.geocode_full = lambda a, timeout=6: {
            "lat": 37.6156, "lon": 126.7158, "b_code": "4157010100",
            "main_no": "1309", "sub_no": "0", "is_mountain": False}
        geo.nearby_place = lambda *a, **k: None
        br.get_building_info = lambda *a, **k: None
        geo._memory.clear()

    def tearDown(self):
        (self.ds.get_trade_rows, self.ds.get_apt_rows, self.geo.geocode,
         self.geo.geocode_full, self.geo.nearby_place, self.webapp.PREFETCH_APT,
         self.br.get_building_info) = self._orig
        self.geo._memory.clear()

    def _rows(self):
        return [{"umdNm": "사우동", "mhouseNm": f"빌라{i}", "jibun": str(1300 + i),
                 "dealYear": "2026", "dealMonth": str(1 + i % 9), "dealDay": "10",
                 "dealAmount": "20,000", "excluUseAr": "47.0", "floor": "2",
                 "buildYear": "2015", "sggCd": "41570"} for i in range(12)]

    def _post(self):
        return self.webapp.app.test_client().post("/estimate", data={
            "address": "경기도 김포시 사우동 1309", "area": "47",
            "floor": "2", "build_year": "2015"})

    def test_apartment_fetch_starts_before_the_slow_work_finishes(self):
        import time
        marks = {}
        self.ds.get_trade_rows = lambda *a, **k: self._rows()

        def apt(*a, **k):
            marks["apt"] = time.perf_counter()
            return []

        self.ds.get_apt_rows = apt
        slow_done = {}

        original = self.geo.geocode

        def slow(addr, timeout=6):
            time.sleep(0.002)
            slow_done["last"] = time.perf_counter()
            return original(addr, timeout)

        self.geo.geocode = slow
        self.webapp.PREFETCH_APT = True
        self._post()
        self.assertIn("apt", marks, "아파트 조회가 아예 안 불렸다")
        self.assertLess(marks["apt"], slow_done["last"],
                        "아파트 조회가 지오코딩이 다 끝난 뒤에 시작됐다 — 겹쳐 돌아야 한다")

    def test_switching_the_prefetch_off_still_works(self):
        """폴백 경로가 살아 있어야 한다 — 미리받기가 실패해도 결과는 나와야 한다."""
        called = []
        self.ds.get_trade_rows = lambda *a, **k: self._rows()
        self.ds.get_apt_rows = lambda *a, **k: (called.append(1), [])[1]
        self.webapp.PREFETCH_APT = False
        r = self._post()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(called), 1, "미리받기를 꺼도 아파트는 한 번은 불려야 한다")

    def test_apartment_fetch_is_not_called_twice(self):
        """미리 던지고 아래서 또 부르면 호출량이 두 배가 된다."""
        called = []
        self.ds.get_trade_rows = lambda *a, **k: self._rows()
        self.ds.get_apt_rows = lambda *a, **k: (called.append(1), [])[1]
        self.webapp.PREFETCH_APT = True
        self._post()
        self.assertEqual(len(called), 1, f"아파트 조회가 {len(called)}번 나갔다")
