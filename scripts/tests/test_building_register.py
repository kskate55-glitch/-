"""
CLAUDE.md 20절·72-5절·72-10절 — 건축물대장 조회는 **무엇이 터지든 매도가
계산을 막지 않는다.**

⚠️ 실제로 깨져 있었다: 승강기 수를 `int(값 or 0)`으로 읽는데 값이 `"1.0"`·
`"-"`처럼 숫자가 아니면 `ValueError`가 그대로 터져 나갔고, 호출부가
`except RuntimeError`만 잡아서 **방문자에게 오류 화면이 갔다.**
"""

import json
import os
import sys
import tempfile
import threading
import time
import unittest

_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(_ROOT, "scripts"))

import building_register as br  # noqa: E402


def _item(**over):
    base = {"hhldCnt": "8", "useAprDay": "20120301", "rideUseElvtCnt": "1",
            "emgenUseElvtCnt": "0", "regstrKindCdNm": "표제부",
            "mainPurpsCdNm": "다세대주택", "grndFlrCnt": "5"}
    base.update(over)
    return base


class _Resp:
    def __init__(self, payload):
        self._body = json.dumps(payload).encode()

    def read(self, *_a):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *_a):
        return False


class BuildingRegisterCase(unittest.TestCase):
    def setUp(self):
        self._saved_urlopen = br.urlopen
        self._saved_path = br.CACHE_PATH
        self._saved_memory = br._memory
        self._dir = tempfile.mkdtemp()
        br.CACHE_PATH = os.path.join(self._dir, "building_cache.json")
        br._memory = None
        os.environ.setdefault("MOLIT_SERVICE_KEY", "TESTKEY")

    def tearDown(self):
        import shutil
        br.urlopen = self._saved_urlopen
        br.CACHE_PATH = self._saved_path
        br._memory = self._saved_memory
        shutil.rmtree(self._dir, ignore_errors=True)

    def _serve(self, item):
        br.urlopen = lambda req, timeout=10: _Resp(
            {"response": {"body": {"items": {"item": item}}}})


class TestOddFieldValuesNeverRaise(BuildingRegisterCase):
    def test_non_numeric_elevator_counts_are_read_as_unknown(self):
        for value, expected in (("1", 1), ("2", 2), ("1.0", 1), ("  3  ", 3),
                                ("", 0), (None, 0), ("-", 0), ("없음", 0),
                                ("1대", 0), ("1e3", 1000), ("nan", 0), ("inf", 0)):
            with self.subTest(value):
                br._memory = None
                self._serve(_item(rideUseElvtCnt=value, emgenUseElvtCnt="0"))
                info = br.get_building_info("1130510200", "468", str(hash(str(value))), False)
                self.assertIsNotNone(info, f"{value!r}에서 조회가 통째로 실패했습니다")
                self.assertEqual(info["elevator_count"], expected)
                self.assertEqual(info["has_elevator"], expected > 0)

    def test_as_count_itself(self):
        for value in ("-", "없음", "1대", "", None, [], {}, "nan", "inf", "-inf"):
            self.assertEqual(br._as_count(value), 0, f"{value!r}")
        for value, expected in (("7", 7), (3, 3), ("2.9", 2), ("  4 ", 4)):
            self.assertEqual(br._as_count(value), expected, f"{value!r}")

    def test_missing_fields_do_not_raise(self):
        self._serve({"regstrKindCdNm": "표제부"})
        info = br.get_building_info("1130510200", "468", "202", False)
        self.assertIsNotNone(info)
        self.assertEqual(info["elevator_count"], 0)
        self.assertIsNone(info["household_count"])


class TestTransientFailuresAreNotCached(BuildingRegisterCase):
    """48-7절 — 일시적 실패를 캐시하면 그 건물은 영영 조회가 안 된다."""

    def test_a_network_error_is_retried_next_time(self):
        def boom(req, timeout=10):
            raise OSError("일시적 실패")

        br.urlopen = boom
        self.assertIsNone(br.get_building_info("1130510200", "468", "202", False))
        self._serve(_item())
        info = br.get_building_info("1130510200", "468", "202", False)
        self.assertIsNotNone(info, "실패를 캐시해서 다시 물어보지 않았습니다")

    def test_a_broken_response_is_retried_next_time(self):
        class Broken(_Resp):
            def __init__(self):
                self._body = b"<html>\xed\x95\x9c error</html>"

        br.urlopen = lambda req, timeout=10: Broken()
        self.assertIsNone(br.get_building_info("1130510200", "468", "202", False))
        self._serve(_item())
        self.assertIsNotNone(br.get_building_info("1130510200", "468", "202", False))

    def test_a_building_that_is_simply_not_registered_is_cached(self):
        """다시 물어도 같은 답이라 이건 캐시한다 — 그래야 호출이 안 늘어난다."""
        calls = []

        def empty(req, timeout=10):
            calls.append(1)
            return _Resp({"response": {"body": {"items": ""}}})

        br.urlopen = empty
        self.assertIsNone(br.get_building_info("1130510200", "999", "0", False))
        self.assertIsNone(br.get_building_info("1130510200", "999", "0", False))
        self.assertEqual(len(calls), 1, "결과 없음이 캐시되지 않았습니다")


class TestTheCacheSurvivesConcurrencyAndCorruption(BuildingRegisterCase):
    def test_many_threads_writing_different_buildings_lose_nothing(self):
        self._serve(_item())

        def worker(i):
            for j in range(6):
                br.get_building_info("1130510200", str(i * 10 + j), "0", False)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(12)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        with open(br.CACHE_PATH, encoding="utf-8") as f:
            self.assertEqual(len(json.load(f)), 72, "동시 쓰기로 캐시 항목이 유실됐습니다")

    def test_a_corrupt_cache_file_is_moved_aside(self):
        with open(br.CACHE_PATH, "w", encoding="utf-8") as f:
            f.write('{"a": {"ts": 1, "inf')
        self._serve(_item())
        self.assertIsNotNone(br.get_building_info("1130510200", "468", "202", False))
        self.assertTrue(os.path.exists(br.CACHE_PATH + ".corrupt"),
                        "깨진 캐시를 치우지 않아 다음 호출도 같은 자리에서 죽습니다")

    def test_the_ttl_boundary(self):
        key = br._cache_key("1130510200", "777", "0", False)
        br._cache_put(key, {"has_elevator": True})
        br._memory[key]["ts"] = time.time() - (br.CACHE_TTL_DAYS * 86400 - 10)
        self.assertTrue(br._cache_get(key)[0], "만료 전인데 버렸습니다")
        br._memory[key]["ts"] = time.time() - (br.CACHE_TTL_DAYS * 86400 + 10)
        self.assertFalse(br._cache_get(key)[0], "만료됐는데 계속 씁니다")


if __name__ == "__main__":
    unittest.main()
