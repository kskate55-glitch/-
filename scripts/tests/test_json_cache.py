"""깨진 캐시 파일이 서비스를 영구히 멈춰 세우던 버그의 회귀 테스트 (53절).

순회 화면에서 19개 지역이 전부 `오류(JSONDecodeError)`로 죽은 사건이다.
카카오 한도가 아니라 `data/geocode_cache.json`이 쓰다 만 상태로 남아,
읽을 때마다 같은 예외가 나던 것이었다 — 한 번 깨지면 저절로 낫지 않는다.
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestBrokenCacheDoesNotKillEverything(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.path = os.path.join(self.dir, "cache.json")

    def test_truncated_file_reads_as_empty(self):
        """쓰다 만 파일 — 프로세스가 죽으면 실제로 이런 모양이 남는다."""
        from json_cache import read_json
        with open(self.path, "w", encoding="utf-8") as f:
            f.write('{"서울 강북구 수유동 468": [37.63, 127.0')   # 닫히지 않음
        self.assertEqual(read_json(self.path), {})

    def test_empty_file_reads_as_empty(self):
        from json_cache import read_json
        open(self.path, "w").close()
        self.assertEqual(read_json(self.path), {})

    def test_broken_file_is_moved_aside_so_it_heals(self):
        """그대로 두면 다음 호출도 똑같이 깨진다 — 치워야 다시 만들어진다."""
        from json_cache import read_json
        with open(self.path, "w", encoding="utf-8") as f:
            f.write("{oops")
        read_json(self.path)
        self.assertFalse(os.path.exists(self.path))
        self.assertTrue(os.path.exists(self.path + ".corrupt"))

    def test_missing_file_uses_the_given_default(self):
        from json_cache import read_json
        self.assertIsNone(read_json(self.path, default=None))

    def test_good_file_still_reads(self):
        from json_cache import read_json, write_json
        write_json(self.path, {"가": [1, 2]})
        self.assertEqual(read_json(self.path), {"가": [1, 2]})


class TestWriteIsAtomic(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.path = os.path.join(self.dir, "cache.json")

    def test_failed_write_leaves_the_previous_file_intact(self):
        """쓰는 도중에 죽어도 **이전 내용이 멀쩡히 남는다** — 핵심 보장이다."""
        from json_cache import read_json, write_json
        write_json(self.path, {"기존": 1})

        class Boom:
            pass
        with self.assertRaises(TypeError):
            write_json(self.path, {"새것": Boom()})     # 직렬화 실패
        self.assertEqual(read_json(self.path), {"기존": 1})

    def test_no_temp_files_are_left_behind(self):
        from json_cache import write_json
        write_json(self.path, {"가": 1})
        leftovers = [n for n in os.listdir(self.dir) if n.startswith(".tmp-")]
        self.assertEqual(leftovers, [])

    def test_directory_is_created(self):
        from json_cache import read_json, write_json
        deep = os.path.join(self.dir, "a", "b", "c.json")
        write_json(deep, [1, 2, 3])
        self.assertEqual(read_json(deep, default=None), [1, 2, 3])


class TestGeocodeSurvivesABrokenCache(unittest.TestCase):
    def test_geocode_cache_load_does_not_raise(self):
        """예전엔 여기서 JSONDecodeError가 나서 모든 조회가 죽었다."""
        import geocode as geo
        original = geo.CACHE_PATH
        d = tempfile.mkdtemp()
        geo.CACHE_PATH = os.path.join(d, "geocode_cache.json")
        try:
            with open(geo.CACHE_PATH, "w", encoding="utf-8") as f:
                f.write('{"주소": [37.5, 127.0')
            self.assertEqual(geo._load_cache(), {})
        finally:
            geo.CACHE_PATH = original


if __name__ == "__main__":
    unittest.main()


class TestMissingIsNotTheSameAsEmpty(unittest.TestCase):
    """⚠️ `default=None`을 `{}`로 바꾸면 '캐시 없음'과 '캐시가 빈 목록'이
    뭉개진다 — data_source가 `is not None`으로 그 둘을 가르므로, 캐시가
    없는데도 '조회 결과 0건'으로 읽혀 국토부 호출을 건너뛰게 된다."""

    def test_explicit_none_default_survives(self):
        from json_cache import read_json
        d = tempfile.mkdtemp()
        self.assertIsNone(read_json(os.path.join(d, "nope.json"), default=None))

    def test_broken_file_also_returns_the_none_default(self):
        from json_cache import read_json
        d = tempfile.mkdtemp()
        p = os.path.join(d, "x.json")
        with open(p, "w", encoding="utf-8") as f:
            f.write("{broken")
        self.assertIsNone(read_json(p, default=None))

    def test_empty_list_cache_is_read_back_as_empty_list(self):
        from json_cache import read_json, write_json
        d = tempfile.mkdtemp()
        p = os.path.join(d, "x.json")
        write_json(p, [])
        self.assertEqual(read_json(p, default=None), [])


class TestAnyUnreadableFileIsTreatedAsMissing(unittest.TestCase):
    """53절이 약속한 "깨진 캐시는 없는 것으로 친다"에 구멍이 있었다.

    ⚠️ 파이썬 3.11부터 **아주 긴 숫자 문자열**은 `json.loads`에서
    `ValueError: Exceeds the limit (4300 digits)`로 죽는데, 그건
    `JSONDecodeError`가 아니라 잡히지 않고 그대로 올라갔다 — 깨진 캐시
    파일에 숫자 쓰레기가 남으면 그 지역 조회가 계속 죽는다.
    """

    def _read(self, content):
        import json_cache
        path = os.path.join(self.tmp, "c.json")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return json_cache.read_json(path, default={"fallback": True})

    def setUp(self):
        import tempfile
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_a_huge_number_does_not_raise(self):
        self.assertEqual(self._read("9" * 100000), {"fallback": True})
        self.assertEqual(self._read('{"a": ' + "9" * 6000 + "}"), {"fallback": True})

    def test_the_usual_broken_shapes_still_work(self):
        for content in ("", "{", "not json", "\x00\x01"):
            self.assertEqual(self._read(content), {"fallback": True}, repr(content))

    def test_valid_json_is_untouched(self):
        self.assertEqual(self._read('{"a": 1}'), {"a": 1})
        self.assertEqual(self._read('[1, 2, 3]'), [1, 2, 3])
