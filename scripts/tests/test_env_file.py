"""CLAUDE.md 6절 — `.env` 로더 테스트.

제일 중요한 보증은 **"이미 설정된 환경변수를 덮어쓰지 않는다"**이다. 이게
깨지면 Render 대시보드에 넣은 키를 저장소에 딸려온 파일이 덮어쓰게 된다.
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import env_file  # noqa: E402


class TestParseEnv(unittest.TestCase):
    def test_basic_pairs(self):
        self.assertEqual(env_file.parse_env("A=1\nB=two\n"), {"A": "1", "B": "two"})

    def test_strips_wrapping_quotes(self):
        parsed = env_file.parse_env('A="따옴표"\nB=\'홑따옴표\'\n')
        self.assertEqual(parsed, {"A": "따옴표", "B": "홑따옴표"})

    def test_keeps_inner_quotes_and_equals(self):
        """키 값에 =가 들어가는 경우가 실제로 있다(공공데이터포털 인증키)."""
        parsed = env_file.parse_env("KEY=abc==def\n")
        self.assertEqual(parsed["KEY"], "abc==def")

    def test_skips_blanks_and_comments(self):
        parsed = env_file.parse_env("\n# 주석\n  \nA=1\n#B=2\n")
        self.assertEqual(parsed, {"A": "1"})

    def test_accepts_export_prefix(self):
        """셸에서 쓰던 파일을 그대로 갖다 놓는 경우가 흔하다."""
        self.assertEqual(env_file.parse_env("export A=1\n"), {"A": "1"})

    def test_ignores_lines_without_equals(self):
        self.assertEqual(env_file.parse_env("그냥 문장\nA=1\n"), {"A": "1"})


class TestLoadEnv(unittest.TestCase):
    def setUp(self):
        self.keys = ["_TEST_ENV_NEW", "_TEST_ENV_EXISTING"]
        for k in self.keys:
            os.environ.pop(k, None)

    def tearDown(self):
        for k in self.keys:
            os.environ.pop(k, None)

    def _write(self, text):
        f = tempfile.NamedTemporaryFile("w", suffix=".env", delete=False, encoding="utf-8")
        f.write(text)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def test_sets_unset_keys(self):
        path = self._write("_TEST_ENV_NEW=hello\n")
        loaded = env_file.load_env(path)
        self.assertEqual(os.environ["_TEST_ENV_NEW"], "hello")
        self.assertEqual(loaded, ["_TEST_ENV_NEW"])

    def test_never_overrides_an_existing_value(self):
        """⚠️ 핵심 보증 — 배포 환경(Render)에서 준 값이 항상 이겨야 한다."""
        os.environ["_TEST_ENV_EXISTING"] = "from-shell"
        path = self._write("_TEST_ENV_EXISTING=from-file\n")
        loaded = env_file.load_env(path)
        self.assertEqual(os.environ["_TEST_ENV_EXISTING"], "from-shell")
        self.assertNotIn("_TEST_ENV_EXISTING", loaded)

    def test_missing_file_is_silent(self):
        self.assertEqual(env_file.load_env("/tmp/이-파일은-없습니다-12345.env"), [])

    def test_returns_key_names_only_not_values(self):
        """실수로 키 값이 로그에 찍히는 걸 막기 위해 이름만 돌려준다."""
        path = self._write("_TEST_ENV_NEW=비밀값\n")
        loaded = env_file.load_env(path)
        self.assertEqual(loaded, ["_TEST_ENV_NEW"])
        self.assertNotIn("비밀값", loaded)


class TestExampleFileStaysSafe(unittest.TestCase):
    """`.env.example`은 커밋되는 파일이라 실제 키가 들어가면 안 된다."""

    def test_example_has_no_values(self):
        root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        path = os.path.join(root, ".env.example")
        with open(path, encoding="utf-8") as f:
            parsed = env_file.parse_env(f.read())
        self.assertTrue(parsed, ".env.example에 키 항목이 하나도 없습니다")
        for key, value in parsed.items():
            self.assertEqual(value, "", f"{key}에 값이 채워져 있습니다 — 커밋되면 키가 샙니다")

    def test_example_covers_the_keys_the_code_needs(self):
        root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        with open(os.path.join(root, ".env.example"), encoding="utf-8") as f:
            parsed = env_file.parse_env(f.read())
        for key in ("MOLIT_SERVICE_KEY", "KAKAO_REST_API_KEY"):
            self.assertIn(key, parsed)


if __name__ == "__main__":
    unittest.main()
