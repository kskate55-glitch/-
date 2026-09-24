"""72-36절 — CSS·JS 를 캐시되는 정적 파일로 뺐다.

인라인일 때는 페이지마다 30.8KB(gzip 10.9KB)가 **매번** 실려 갔다.
"""
import gzip
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))

_WEB = os.path.join(os.path.dirname(__file__), "..", "..", "webapp")
_BASE = os.path.join(_WEB, "templates", "base.html")
_CSS = os.path.join(_WEB, "static", "app.css")
_JS = os.path.join(_WEB, "static", "app.js")


def _read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


class TheyAreRealFiles(unittest.TestCase):
    def test_both_exist_and_are_not_empty(self):
        for p in (_CSS, _JS):
            self.assertTrue(os.path.exists(p), f"{p} 가 없다")
            self.assertGreater(os.path.getsize(p), 2000, f"{p} 가 비었다")

    def test_base_no_longer_inlines_them(self):
        src = _read(_BASE)
        self.assertNotIn("<style>", src, "CSS 가 아직 인라인이다")
        self.assertIsNone(re.search(r"<script>\s*\n", src),
                          "base.html 에 인라인 <script> 가 남았다")

    def test_base_links_them_with_a_cache_buster(self):
        src = _read(_BASE)
        for name in ("app.css", "app.js"):
            m = re.search(r"filename='%s'\s*\)\s*\}\}\?v=\{\{\s*deploy_version" % name, src)
            self.assertIsNotNone(m, f"{name} 에 ?v=배포버전 버스터가 없다")

    def test_the_script_is_deferred_and_last(self):
        """원래 </body> 직전 인라인이었다 — defer 로 같은 시점에 돈다."""
        src = _read(_BASE)
        i, j = src.index("app.js"), src.index("</body>")
        self.assertLess(i, j)
        self.assertIn("defer", src[i - 200:j])


class NothingJinjaLeakedIntoTheFiles(unittest.TestCase):
    """⚠️ 정적 파일은 Jinja 를 거치지 않는다 — `{{ }}` 가 남으면 글자로 나간다."""

    def test_no_template_syntax(self):
        for p in (_CSS, _JS):
            body = _read(p)
            self.assertNotIn("{{", body, f"{p} 에 Jinja 표현식이 남았다")
            self.assertNotIn("{%", body, f"{p} 에 Jinja 문이 남았다")

    def test_the_hero_image_uses_a_relative_path(self):
        """`url_for` 를 뺀 자리 — /static/app.css 기준 상대경로라야 맞는다."""
        css = _read(_CSS)
        self.assertIn('url("hero-building.png")', css)
        self.assertTrue(os.path.exists(os.path.join(_WEB, "static", "hero-building.png")))


class ThePageGotLighter(unittest.TestCase):
    def test_the_css_is_worth_caching(self):
        """요청 하나를 더 만들 값어치가 있는 크기여야 한다."""
        gz = len(gzip.compress(_read(_CSS).encode(), 6))
        self.assertGreater(gz, 5 * 1024,
                           "gzip 5KB 미만이면 요청을 더 만드는 게 손해다")

    def test_static_files_are_cached_for_a_long_time(self):
        os.environ.setdefault("KAKAO_REST_API_KEY", "t")
        os.environ.setdefault("MOLIT_SERVICE_KEY", "t")
        import app
        self.assertGreaterEqual(app.app.config["SEND_FILE_MAX_AGE_DEFAULT"],
                                60 * 60 * 24 * 30,
                                "버스터가 있는데 캐시를 짧게 주면 이득이 없다")

    def test_a_long_cache_requires_the_buster(self):
        """⚠️ 버스터 없이 1년 캐시를 주면 고친 CSS 가 며칠씩 반영 안 된다."""
        self.assertIn("?v={{ deploy_version }}", _read(_BASE))


class TheStylesStillCoverTheUi(unittest.TestCase):
    """옮기다 규칙을 흘리면 화면이 통째로 무너진다 — 주요 클래스를 고정한다."""

    KEY_RULES = [".card", ".sec-head", ".zoom-step", ".nb-donut", ".loc-row",
                 ".price-item", ".mk-title", ".paste-fold", ".home-hero",
                 ".cta-submit", ".table-scroll", ".note-lines", ".subject-resolved"]

    def test_every_key_class_has_a_rule(self):
        css = _read(_CSS)
        for sel in self.KEY_RULES:
            self.assertIn(sel, css, f"{sel} 규칙이 사라졌다")

    def test_the_colour_tokens_survived(self):
        css = _read(_CSS)
        for token in ("--primary:", "--accent-ink:", "--accent-warm:"):
            self.assertIn(token, css)


if __name__ == "__main__":
    unittest.main()
