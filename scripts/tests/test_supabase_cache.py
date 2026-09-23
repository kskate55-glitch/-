"""슈퍼베이스 캐시 계층 테스트 (62절).

⚠️ 이 계층의 첫 번째 계약은 "**절대 계산을 막지 않는다**"이다. 슈퍼베이스가
꺼져 있든, 죽어 있든, 무료 플랜이 7일 무활동으로 잠들어 있든 매도가 계산은
그대로 돌아야 한다. 그걸 고정하는 게 이 파일의 대부분이다.
"""
import json
import os
import sys
import tempfile
import unittest
import urllib.error
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import supabase_cache  # noqa: E402


class _FakeHTTP:
    """요청을 기록하고 미리 정해둔 응답을 돌려주는 가짜."""

    def __init__(self):
        self.calls = []
        self.rows = []
        self.raise_with = None

    def __call__(self, req, timeout=None):
        self.calls.append({
            "method": req.get_method(), "url": req.full_url,
            "headers": dict(req.header_items()),
            "body": json.loads(req.data.decode()) if req.data else None,
        })
        if self.raise_with is not None:
            raise self.raise_with
        payload = json.dumps(self.rows).encode()

        class _R:
            def read(self_inner): return payload
            def __enter__(self_inner): return self_inner
            def __exit__(self_inner, *a): return False
        return _R()


class SupabaseTestBase(unittest.TestCase):
    def setUp(self):
        self._saved = {k: os.environ.get(k) for k in (supabase_cache.URL_ENV, supabase_cache.KEY_ENV)}
        os.environ[supabase_cache.URL_ENV] = "https://proj.supabase.co"
        os.environ[supabase_cache.KEY_ENV] = "test-service-key"
        self.http = _FakeHTTP()
        self._real = supabase_cache.urlopen
        supabase_cache.urlopen = self.http

    def tearDown(self):
        supabase_cache.urlopen = self._real
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


class TestOffByDefault(SupabaseTestBase):
    def test_no_keys_means_no_network_at_all(self):
        """⚠️ 키를 안 넣은 사람에게는 이 기능이 **존재하지 않아야** 한다 —
        호출이 한 번이라도 나가면 느려지고 오류만 늘어난다."""
        os.environ.pop(supabase_cache.URL_ENV, None)
        os.environ.pop(supabase_cache.KEY_ENV, None)
        self.assertFalse(supabase_cache.enabled())
        self.assertIsNone(supabase_cache.get("ns", "k"))
        self.assertTrue(supabase_cache.put("ns", "k", {"a": 1}))
        self.assertEqual(supabase_cache.get_all("ns"), {})
        self.assertEqual(self.http.calls, [])

    def test_half_configured_is_also_off(self):
        """URL만 있고 키가 없으면 켜진 걸로 치면 안 된다 — 전부 401이 난다."""
        os.environ.pop(supabase_cache.KEY_ENV, None)
        self.assertFalse(supabase_cache.enabled())
        self.assertEqual(self.http.calls, [])


class TestFailuresAreSilent(SupabaseTestBase):
    def test_network_error_on_read_returns_none(self):
        self.http.raise_with = OSError("연결 실패")
        self.assertIsNone(supabase_cache.get("ns", "k"))

    def test_paused_project_on_read_returns_none(self):
        """⚠️ 무료 플랜은 7일 무활동이면 잠든다 — 그때 계산이 멈추면 안 된다."""
        self.http.raise_with = urllib.error.HTTPError(
            "u", 503, "Service Unavailable", {}, None)
        self.assertIsNone(supabase_cache.get("ns", "k"))

    def test_write_failure_is_reported_but_not_raised(self):
        self.http.raise_with = OSError("끊김")
        self.assertFalse(supabase_cache.put("ns", "k", {"a": 1}))

    def test_partial_bulk_read_keeps_what_it_got(self):
        """받다가 끊기면 받은 데까지는 쓴다 — 없는 것보다 낫다."""
        calls = {"n": 0}
        real = self.http.__call__

        def flaky(req, timeout=None):
            calls["n"] += 1
            if calls["n"] > 1:
                raise OSError("중간에 끊김")
            return real(req, timeout)

        self.http.rows = [{"k": f"a{i}", "v": [1, 2]} for i in range(supabase_cache.PAGE_SIZE)]
        supabase_cache.urlopen = flaky
        got = supabase_cache.get_all("ns")
        self.assertEqual(len(got), supabase_cache.PAGE_SIZE)


class TestRequestShape(SupabaseTestBase):
    def test_read_uses_service_key_in_both_headers(self):
        """슈퍼베이스는 apikey와 Authorization을 둘 다 본다 — 하나만 보내면 401."""
        self.http.rows = [{"v": {"x": 1}}]
        supabase_cache.get("trade:11380", "202603")
        h = self.http.calls[0]["headers"]
        self.assertEqual(h.get("Apikey"), "test-service-key")
        self.assertEqual(h.get("Authorization"), "Bearer test-service-key")

    def test_write_upserts_instead_of_duplicating(self):
        """⚠️ on_conflict + merge-duplicates가 빠지면 같은 달을 다시 받을 때마다
        행이 쌓여 500MB 무료 용량을 금방 먹는다."""
        supabase_cache.put("trade:11380", "202603", [{"a": 1}])
        call = self.http.calls[0]
        self.assertEqual(call["method"], "POST")
        self.assertIn("on_conflict=ns,k", call["url"])
        self.assertIn("merge-duplicates", call["headers"].get("Prefer", ""))

    def test_keys_are_url_escaped(self):
        """동 이름·주소가 키로 들어가면 한글·공백·&가 섞인다."""
        supabase_cache.get("geo:x", "서울 강북구 수유동 468-202 & 옆")
        url = self.http.calls[0]["url"]
        self.assertNotIn(" ", url)
        self.assertNotIn("468-202 &", url)

    def test_bulk_read_pages_through(self):
        """⚠️ 한 방에 다 받은 줄 알면 캐시가 조용히 일부만 복구된다."""
        full = [{"k": f"a{i}", "v": [1]} for i in range(supabase_cache.PAGE_SIZE)]
        seq = [full, [{"k": "z", "v": [2]}]]

        def paged(req, timeout=None):
            self.http.rows = seq.pop(0) if seq else []
            return _FakeHTTP.__call__(self.http, req, timeout)

        supabase_cache.urlopen = paged
        got = supabase_cache.get_all("ns")
        self.assertEqual(len(got), supabase_cache.PAGE_SIZE + 1)
        self.assertIn("offset=0", self.http.calls[0]["url"])
        self.assertIn(f"offset={supabase_cache.PAGE_SIZE}", self.http.calls[1]["url"])


class TestServiceKeyStaysServerSide(unittest.TestCase):
    def test_no_template_mentions_the_service_key(self):
        """⚠️ 6절 — service_role 키가 프론트엔드로 새면 DB가 통째로 열린다.
        27-1절 KAKAO_JS_KEY(노출이 정상)와는 성격이 전혀 다르다."""
        root = os.path.join(os.path.dirname(__file__), "..", "..", "webapp", "templates")
        for name in os.listdir(root):
            if not name.endswith(".html"):
                continue
            with open(os.path.join(root, name), encoding="utf-8") as f:
                body = f.read()
            self.assertNotIn("SUPABASE_SERVICE_KEY", body, name)
            self.assertNotIn("supabase_service_key", body, name)


class TestGeocodeIntegration(unittest.TestCase):
    """57절 메모리 캐시를 되돌리지 않았는지 — 슈퍼베이스는 앞이 아니라 뒤에 있다."""

    def setUp(self):
        import geocode
        self.geocode = geocode
        self.dir = tempfile.mkdtemp()
        geocode._memory.clear(); geocode._memory_dirty.clear()
        geocode._memory_written.clear(); geocode._memory_pushed.clear()
        self.calls = []
        self._real_get_all = supabase_cache.get_all
        self._real_enabled = supabase_cache.enabled
        supabase_cache.get_all = lambda ns: (self.calls.append(ns) or {"복구된주소": [37.5, 127.0]})
        supabase_cache.enabled = lambda: True

    def tearDown(self):
        supabase_cache.get_all = self._real_get_all
        supabase_cache.enabled = self._real_enabled

    def test_restores_only_when_the_file_is_empty(self):
        path = os.path.join(self.dir, "geocode_cache.json")
        cache = self.geocode._mem_load(path)
        self.assertEqual(cache, {"복구된주소": [37.5, 127.0]})
        self.assertEqual(len(self.calls), 1)

    def test_existing_file_is_never_overridden_by_remote(self):
        """⚠️ 파일이 있는데도 원격을 읽으면 57절이 잡아둔 속도가 도로 죽는다."""
        path = os.path.join(self.dir, "geocode_cache.json")
        from json_cache import write_json
        write_json(path, {"원래있던주소": [37.1, 127.1]})
        cache = self.geocode._mem_load(path)
        self.assertEqual(cache, {"원래있던주소": [37.1, 127.1]})
        self.assertEqual(self.calls, [])

    def test_only_new_entries_are_pushed(self):
        """⚠️ 매번 전체를 올리면 수만 건을 반복해서 보낸다."""
        path = os.path.join(self.dir, "geocode_cache.json")
        sent = []
        real_put_many = supabase_cache.put_many
        supabase_cache.put_many = lambda ns, items: (sent.append(dict(items)) or True)
        try:
            cache = self.geocode._mem_load(path)          # 복구된 1건
            cache["새주소"] = [37.9, 127.9]
            self.geocode._push_new_entries(path, cache)
            self.assertEqual(sent, [{"새주소": [37.9, 127.9]}])   # 복구본은 다시 안 올림
            self.geocode._push_new_entries(path, cache)
            self.assertEqual(len(sent), 1)                        # 두 번째는 보낼 게 없음
        finally:
            supabase_cache.put_many = real_put_many


class TestRestoredDataIsStillChecked(unittest.TestCase):
    """⚠️ 48-4절 — 빌라 조회에 아파트가 섞였던 사고가 있었다. 오염된 데이터가
    슈퍼베이스에 저장돼 있으면, 되살릴 때 그냥 믿는 순간 **오염이 영구히 남는다.**
    복구 경로에도 같은 검사가 걸리는지 고정한다."""

    def test_contaminated_remote_rows_are_rejected(self):
        import data_source
        saved = {k: os.environ.get(k) for k in (supabase_cache.URL_ENV, supabase_cache.KEY_ENV)}
        os.environ[supabase_cache.URL_ENV] = "https://p.supabase.co"
        os.environ[supabase_cache.KEY_ENV] = "k"
        real_get = supabase_cache.get
        real_dir = data_source.CACHE_DIR
        data_source.CACHE_DIR = tempfile.mkdtemp()
        # 아파트 데이터(aptNm)가 빌라 묶음에 저장돼 있던 상황
        supabase_cache.get = lambda ns, k: [{"aptNm": "무슨아파트", "dealAmount": "100,000"}]
        try:
            with self.assertRaises(RuntimeError) as cm:
                data_source.get_trade_rows("11380", 2025)
            self.assertIn("아파트", str(cm.exception))
        finally:
            supabase_cache.get = real_get
            data_source.CACHE_DIR = real_dir
            for k, v in saved.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v


if __name__ == "__main__":
    unittest.main()
