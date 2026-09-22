"""CLAUDE.md 48-4절 — 아파트 조회가 빌라 조회를 오염시키지 않는지.

⚠️ **실제로 터졌던 사고의 회귀 테스트다.** 예전 `fetch_apt_trade()`는 전역
`molit_rhtrade_api.BASE_URL`을 아파트 엔드포인트로 갈았다가 `finally`로
되돌렸는데, 22절 병렬 조회(FETCH_WORKERS=8)에서 스레드가 겹치면
  ① 동시에 도는 **빌라 요청이 아파트 엔드포인트로 나가고**
  ② 심하면 전역이 아파트로 **고착**돼 그 워커 프로세스의 모든 빌라 조회가
     아파트를 받아온다
는 두 가지가 동시에 일어났다. 실측 재현에서 빌라 요청 20건 중 20건이 샜고,
그 결과가 그대로 캐시 파일에 저장돼 백테스트 101건 중 80건이 아파트였다.

네트워크는 타지 않는다 — urlopen을 가짜로 갈아 **어느 엔드포인트로 갔는지**만 본다.
"""

import os
import sys
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "webapp"))

os.environ.setdefault("MOLIT_SERVICE_KEY", "test-key")

import molit_apt_api as apt  # noqa: E402
import molit_rhtrade_api as rh  # noqa: E402

EMPTY = b"<response><header><resultCode>000</resultCode></header><body></body></response>"


class _FakeResp:
    def read(self):
        return EMPTY

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class TestEndpointIsolation(unittest.TestCase):
    def setUp(self):
        self._orig_urlopen = rh.urlopen
        self._orig_base = rh.BASE_URL
        self.hits = []
        self.lock = threading.Lock()

        def fake_urlopen(req, timeout=None):
            with self.lock:
                self.hits.append("APT" if "AptTrade" in req.full_url else "VILLA")
            time.sleep(0.005)          # 스레드를 실제로 겹치게 한다
            return _FakeResp()

        rh.urlopen = fake_urlopen

    def tearDown(self):
        rh.urlopen = self._orig_urlopen
        rh.BASE_URL = self._orig_base

    def _villa(self, _):
        rh.fetch_rhtrade("11305", "202608", retries=1)

    def _apt(self, _):
        apt.fetch_apt_trade("11305", "202608", retries=1)

    def test_villa_never_leaks_to_apartment_endpoint(self):
        """⚠️ 핵심 보증 — 이게 깨지면 빌라 시세에 아파트가 섞인다."""
        with ThreadPoolExecutor(max_workers=8) as ex:
            list(ex.map(lambda i: self._villa(i) if i % 2 else self._apt(i), range(40)))
        self.assertEqual(self.hits.count("VILLA"), 20,
                         "빌라 요청이 아파트 엔드포인트로 샜습니다")
        self.assertEqual(self.hits.count("APT"), 20,
                         "아파트 요청이 빌라 엔드포인트로 샜습니다")

    def test_apartment_fetch_leaves_global_untouched(self):
        before = rh.BASE_URL
        with ThreadPoolExecutor(max_workers=8) as ex:
            list(ex.map(self._apt, range(40)))
        self.assertEqual(rh.BASE_URL, before,
                         "아파트 조회가 전역 BASE_URL을 바꿔놓고 갔습니다")
        self.assertNotIn("AptTrade", rh.BASE_URL)

    def test_villa_is_clean_after_apartment_fetches(self):
        """아파트를 잔뜩 부른 **뒤에도** 빌라는 빌라로 나가야 한다."""
        with ThreadPoolExecutor(max_workers=8) as ex:
            list(ex.map(self._apt, range(20)))
        self.hits.clear()
        with ThreadPoolExecutor(max_workers=8) as ex:
            list(ex.map(self._villa, range(10)))
        self.assertEqual(self.hits.count("APT"), 0)
        self.assertEqual(self.hits.count("VILLA"), 10)

    def test_base_url_argument_is_honoured(self):
        rh.fetch_rhtrade("11305", "202608", retries=1, base_url=apt.BASE_URL)
        self.assertEqual(self.hits, ["APT"])

    def test_default_is_still_villa(self):
        rh.fetch_rhtrade("11305", "202608", retries=1)
        self.assertEqual(self.hits, ["VILLA"])


class TestApartmentCanary(unittest.TestCase):
    """엔드포인트가 또 오염되면 **조용히 틀린 값을 주지 말고 시끄럽게 실패**해야 한다."""

    def test_detects_apartment_rows(self):
        from data_source import looks_like_apartment_rows
        self.assertTrue(looks_like_apartment_rows([{"aptNm": "래미안", "umdNm": "동"}]))

    def test_villa_rows_pass(self):
        from data_source import looks_like_apartment_rows
        self.assertFalse(looks_like_apartment_rows([{"mhouseNm": "행복빌라", "umdNm": "동"}]))
        self.assertFalse(looks_like_apartment_rows([]))

    def test_cache_dir_is_versioned(self):
        """오염된 캐시 파일을 다시 읽지 않도록 폴더 이름에 버전이 붙어 있어야 한다."""
        import data_source
        self.assertNotEqual(data_source.TRADE_CACHE_DIR, "trade")


if __name__ == "__main__":
    unittest.main()
