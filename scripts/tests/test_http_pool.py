"""연결 재사용 urlopen 테스트 — 진짜 로컬 HTTP 서버를 띄워서 확인한다.

⚠️ 가짜로 흉내 내지 않고 실제 서버를 쓰는 이유: 이 모듈의 존재 이유가
"연결이 진짜 재사용되는가" 하나뿐이라, 그걸 흉내로 확인하면 아무것도
검증하지 못한다.
"""
import http.server
import os
import socketserver
import sys
import threading
import unittest
import urllib.error
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import http_pool  # noqa: E402


class _Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"          # keep-alive를 쓰려면 필요하다
    statuses: dict = {}
    _count_lock = threading.Lock()
    n_connections: int = 0

    # ⚠️ `id(self.connection)`으로 세면 안 된다 — 소켓 객체가 수거되면 파이썬이
    #    같은 메모리 주소를 재활용해서 서로 다른 연결이 한 개로 합쳐 세어진다
    #    (실제로 이 테스트에서 5개가 2개로 나왔다). 연결마다 핸들러가 한 번씩
    #    만들어지므로 그 횟수를 직접 센다.
    def setup(self):
        with type(self)._count_lock:
            type(self).n_connections += 1
        http.server.BaseHTTPRequestHandler.setup(self)

    def log_message(self, *a):             # 테스트 출력 조용히
        pass

    redirects: dict = {}                   # path -> (status, Location)
    seen: list = []                        # (method, path, authorization)

    def _respond(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length:
            self.rfile.read(length)
        with type(self)._count_lock:
            type(self).seen.append(
                (self.command, self.path, self.headers.get("Authorization")))
        if self.path in type(self).redirects:
            code, location = type(self).redirects[self.path]
            self.send_response(code)
            self.send_header("Location", location)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        code = type(self).statuses.get(self.path, 200)
        body = f"hello {self.path}".encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    do_GET = _respond
    do_POST = _respond


class _Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


class HttpPoolTestBase(unittest.TestCase):
    def setUp(self):
        _Handler.n_connections = 0
        _Handler.statuses = {}
        _Handler.redirects = {}
        _Handler.seen = []
        self.srv = _Server(("127.0.0.1", 0), _Handler)
        self.port = self.srv.server_address[1]
        self.thread = threading.Thread(target=self.srv.serve_forever, daemon=True)
        self.thread.start()
        self._old_env = os.environ.get(http_pool.ENABLED_ENV)
        os.environ.pop(http_pool.ENABLED_ENV, None)
        http_pool.close_all()

    def tearDown(self):
        http_pool.close_all()
        self.srv.shutdown()
        self.srv.server_close()
        if self._old_env is None:
            os.environ.pop(http_pool.ENABLED_ENV, None)
        else:
            os.environ[http_pool.ENABLED_ENV] = self._old_env

    def url(self, path="/"):
        return f"http://127.0.0.1:{self.port}{path}"


class TestConnectionIsReused(HttpPoolTestBase):
    def test_repeated_calls_share_one_connection(self):
        """이 모듈의 존재 이유 — 5번 불러도 서버가 본 연결은 1개여야 한다."""
        for i in range(5):
            with http_pool.urlopen(urllib.request.Request(self.url(f"/{i}"))) as r:
                self.assertEqual(r.read(), f"hello /{i}".encode())
        self.assertEqual(_Handler.n_connections, 1)

    def test_old_urlopen_really_did_open_a_new_one_each_time(self):
        """비교군 — 예전 방식은 5번 부르면 연결도 5개다(이 차이가 곧 절약분)."""
        for i in range(5):
            with urllib.request.urlopen(self.url(f"/{i}"), timeout=5) as r:
                r.read()
        self.assertEqual(_Handler.n_connections, 5)


class TestThreadSafety(HttpPoolTestBase):
    def test_each_thread_gets_its_own_connection(self):
        """⚠️ http.client는 스레드 안전하지 않다 — 워커 8개가 연결을 같이 쓰면
        응답이 섞인다. 스레드마다 따로 들고 있는지 고정한다."""
        errors = []

        def work(n):
            try:
                for i in range(3):
                    with http_pool.urlopen(urllib.request.Request(self.url(f"/t{n}-{i}"))) as r:
                        assert r.read() == f"hello /t{n}-{i}".encode()
            except Exception as e:                      # noqa: BLE001
                errors.append(e)
            finally:
                http_pool.close_all()

        threads = [threading.Thread(target=work, args=(n,)) for n in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(errors, [])
        # 스레드 8개 → 연결 8개 (24번 호출인데 연결은 8개뿐)
        self.assertEqual(_Handler.n_connections, 8)


class TestErrorsStayTheSame(HttpPoolTestBase):
    def test_429_is_still_an_HTTPError_with_code(self):
        """⚠️ 59절이 `e.code == 429`로 초당 제한을 가려낸다 — 예외 종류나 code가
        바뀌면 그 처리가 조용히 안 듣는다."""
        _Handler.statuses["/limited"] = 429
        with self.assertRaises(urllib.error.HTTPError) as cm:
            http_pool.urlopen(urllib.request.Request(self.url("/limited")))
        self.assertEqual(cm.exception.code, 429)

    def test_error_body_is_readable(self):
        """52절이 본문 앞부분을 읽어 안내 문구를 만든다."""
        _Handler.statuses["/boom"] = 500
        with self.assertRaises(urllib.error.HTTPError) as cm:
            http_pool.urlopen(urllib.request.Request(self.url("/boom")))
        self.assertIn(b"hello", cm.exception.read())

    def test_connection_refused_is_still_an_OSError(self):
        """54절이 `except OSError`로 네트워크 실패를 잡는다."""
        self.srv.shutdown()
        self.srv.server_close()
        with self.assertRaises(OSError):
            http_pool.urlopen(urllib.request.Request(self.url("/x")), timeout=2)


class TestStaleConnection(HttpPoolTestBase):
    def test_server_closing_an_idle_connection_is_handled_quietly(self):
        """서버가 쉬는 연결을 끊는 건 흔한 일이다 — 사용자에게 오류로 새면 안 된다."""
        with http_pool.urlopen(urllib.request.Request(self.url("/a"))) as r:
            r.read()
        # 들고 있던 연결을 서버가 끊은 것처럼 소켓만 몰래 닫는다
        for conn in list(http_pool._pool().values()):
            conn.sock.close()
        with http_pool.urlopen(urllib.request.Request(self.url("/b"))) as r:
            self.assertEqual(r.read(), b"hello /b")


class TestOffSwitch(HttpPoolTestBase):
    def test_HTTP_POOL_0_falls_back_to_the_old_behaviour(self):
        """문제가 생기면 코드를 되돌리지 않고 환경변수로 끌 수 있어야 한다."""
        os.environ[http_pool.ENABLED_ENV] = "0"
        for i in range(3):
            with http_pool.urlopen(urllib.request.Request(self.url(f"/off{i}"))) as r:
                r.read()
        self.assertEqual(_Handler.n_connections, 3)     # 재사용 안 됨 = 예전 동작


class TestHeadersAndPaths(HttpPoolTestBase):
    def test_custom_headers_survive(self):
        """카카오는 Authorization 헤더로 인증한다 — 빠지면 전부 401이 된다."""
        seen = {}

        class H(_Handler):
            def do_GET(self):
                seen.update(self.headers)
                _Handler.do_GET(self)

        self.srv.RequestHandlerClass = H
        req = urllib.request.Request(self.url("/h"), headers={"Authorization": "KakaoAK test"})
        with http_pool.urlopen(req) as r:
            r.read()
        self.assertEqual(seen.get("Authorization"), "KakaoAK test")

    def test_query_string_is_kept(self):
        """쿼리스트링이 잘리면 국토부 요청이 통째로 엉뚱해진다."""
        with http_pool.urlopen(urllib.request.Request(self.url("/q?a=1&b=2"))) as r:
            self.assertEqual(r.read(), b"hello /q?a=1&b=2")


class TestRedirectsAreFollowed(HttpPoolTestBase):
    """⚠️ `urllib.request.urlopen`은 3xx를 따라간다 — `http.client`는 안 따라간다.

    안 따라가면 국토부 XML 대신 빈 리다이렉트 본문을, 카카오 JSON 대신 HTML을
    받고 화면에는 "데이터 없음"으로만 보인다(조용히 틀리는 실패).
    """

    def test_302_lands_on_the_target(self):
        _Handler.redirects["/old"] = (302, "/new")
        with http_pool.urlopen(urllib.request.Request(self.url("/old"))) as r:
            self.assertEqual(r.read(), b"hello /new")
            self.assertEqual(r.status, 200)

    def test_relative_location_is_resolved(self):
        _Handler.redirects["/a/old"] = (301, "new")
        with http_pool.urlopen(urllib.request.Request(self.url("/a/old"))) as r:
            self.assertEqual(r.read(), b"hello /a/new")

    def test_chain_is_followed(self):
        _Handler.redirects["/1"] = (302, "/2")
        _Handler.redirects["/2"] = (302, "/3")
        with http_pool.urlopen(urllib.request.Request(self.url("/1"))) as r:
            self.assertEqual(r.read(), b"hello /3")

    def test_a_loop_does_not_hang(self):
        _Handler.redirects["/x"] = (302, "/y")
        _Handler.redirects["/y"] = (302, "/x")
        with self.assertRaises(urllib.error.HTTPError):
            http_pool.urlopen(urllib.request.Request(self.url("/x")))

    def test_303_turns_a_post_into_a_get(self):
        _Handler.redirects["/post"] = (303, "/done")
        req = urllib.request.Request(self.url("/post"), data=b"body=1")
        with http_pool.urlopen(req) as r:
            self.assertEqual(r.read(), b"hello /done")
        methods = [m for m, path, _ in _Handler.seen if path == "/done"]
        self.assertEqual(methods, ["GET"])

    def test_307_keeps_the_method(self):
        _Handler.redirects["/post"] = (307, "/done")
        req = urllib.request.Request(self.url("/post"), data=b"body=1")
        with http_pool.urlopen(req) as r:
            self.assertEqual(r.read(), b"hello /done")
        methods = [m for m, path, _ in _Handler.seen if path == "/done"]
        self.assertEqual(methods, ["POST"])

    def test_auth_header_survives_a_same_host_redirect(self):
        _Handler.redirects["/old"] = (302, "/new")
        req = urllib.request.Request(self.url("/old"),
                                     headers={"Authorization": "KakaoAK secret"})
        with http_pool.urlopen(req):
            pass
        auths = [a for _, path, a in _Handler.seen if path == "/new"]
        self.assertEqual(auths, ["KakaoAK secret"])

    def test_auth_header_is_dropped_when_the_host_changes(self):
        """6절 — 카카오 REST 키·슈퍼베이스 서비스 키가 엉뚱한 서버로 새면 안 된다."""
        _Handler.redirects["/old"] = (302, f"http://localhost:{self.port}/new")
        req = urllib.request.Request(self.url("/old"),
                                     headers={"Authorization": "KakaoAK secret"})
        with http_pool.urlopen(req):
            pass
        auths = [a for _, path, a in _Handler.seen if path == "/new"]
        self.assertEqual(auths, [None])


if __name__ == "__main__":
    unittest.main()
