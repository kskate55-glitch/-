"""입력 폼(`/`)의 라벨이 실제로 입력칸과 연결돼 있어야 한다 (CLAUDE.md 71절).

⚠️ 실제로 겪은 결함: `<label>`에 `for=`가 없고 입력칸에도 `id=`가 없어서
**라벨을 눌러도 커서가 안 갔다.** 46절이 아이콘 타일로 다시 짤 때 이 연결이
빠졌는데, 화면만 봐서는 티가 안 난다 — 47절이 "어른들은 더 안 읽힌다"고
글자를 키운 것과 같은 결의 문제로, 모바일에서 탭 영역이 라벨만큼 줄어든다.
"""
import os
import re
import sys
import unittest

_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(_ROOT, "scripts"))
sys.path.insert(0, os.path.join(_ROOT, "webapp"))


class TestLabelsPointAtRealInputs(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("MOLIT_SERVICE_KEY", "TESTKEY")
        os.environ.setdefault("KAKAO_REST_API_KEY", "TESTKEY")
        import app as webapp
        cls.html = webapp.app.test_client().get("/").get_data(as_text=True)

    def _ids(self):
        return re.findall(r'\bid="([^"]+)"', self.html)

    def test_every_for_resolves(self):
        ids = set(self._ids())
        fors = re.findall(r'<label[^>]*\bfor="([^"]+)"', self.html)
        self.assertGreater(len(fors), 10, "라벨이 거의 연결돼 있지 않다")
        self.assertEqual([f for f in fors if f not in ids], [],
                         "가리키는 입력칸이 없는 라벨이 있다")

    def test_no_duplicate_ids(self):
        ids = self._ids()
        self.assertEqual([i for i in set(ids) if ids.count(i) > 1], [],
                         "id가 겹치면 라벨이 엉뚱한 칸을 가리킨다")

    def test_the_required_four_are_all_connected(self):
        for name in ("address", "area", "floor", "build_year"):
            self.assertRegex(
                self.html, rf'<label[^>]*for="f_{name}"',
                f"필수 입력 {name} 라벨이 연결되지 않았다")
            self.assertRegex(self.html, rf'id="f_{name}"[^>]*name="{name}"')

    def test_labels_that_wrap_their_input_need_no_for(self):
        """체크박스처럼 라벨이 입력칸을 감싸고 있으면 그대로가 맞다."""
        wrapped = re.findall(r'<label class="checkbox-row">.*?</label>',
                             self.html, re.S)
        for block in wrapped:
            self.assertIn("<input", block)

    def test_the_autofill_still_finds_fields_by_name(self):
        """22-1절 탱크옥션 자동 채우기는 name으로 찾는다 — id를 붙여도 그대로다.

        (id를 붙이면서 name을 지웠다면 자동 채우기가 통째로 죽는다.)"""
        self.assertIn("input[name=", self.html, "name 기반 선택자가 사라졌다")
        for name in ("address", "area", "floor", "build_year"):
            self.assertIn(f'name="{name}"', self.html)
