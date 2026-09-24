"""72-40절 — 붙여넣기 본문 상한과 413 한국어 안내.

⚠️ 손대기 전에는 **werkzeug 기본 500KB**가 걸려 있었다. 한글은 폼 전송 때
URL 인코딩으로 글자당 9바이트가 되므로 **약 5만 5천 자**에서 잘렸고, 28절
북마클릿(페이지 텍스트를 통째로 복사한다)을 쓰면 실사용 붙여넣기가 그 선을
넘었다. 그리고 그때 화면은 **영어 기본 413**이었다 — 70-3절이 404·405를
한국어로 바꾸면서 이것만 빠뜨린 것이다.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
for p in (os.path.join(ROOT, "scripts"), os.path.join(ROOT, "webapp")):
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("KAKAO_REST_API_KEY", "테스트키")

import app as webapp  # noqa: E402

FORM = {"address": "서울특별시 강북구 수유동 468-202",
        "area": "59.9", "floor": "3", "build_year": "2012"}


def post(chars):
    """⚠️ 지오코딩을 막고 부른다 — 여기서 보는 건 **413이 뜨는지**뿐이고,
    안 막으면 테스트가 실제 카카오로 새어 나간다(48·55·72-11절의 그 함정.
    전체 discover에서 소켓을 막아 실제로 잡았다)."""
    import geocode
    body = dict(FORM, listings_text="가" * chars)
    saved = geocode.geocode_full
    geocode.geocode_full = lambda *a, **k: None
    try:
        return webapp.app.test_client().post("/estimate", data=body)
    finally:
        geocode.geocode_full = saved


class RealisticPastesGetThrough(unittest.TestCase):
    def test_a_paste_far_past_the_old_500kb_default_is_accepted(self):
        """한글 15만 자 = 옛 기본값의 두 배가 넘는다 — 예전엔 413이었다."""
        self.assertNotEqual(post(150_000).status_code, 413)

    def test_the_limit_is_well_past_a_whole_naver_page(self):
        """28절 북마클릿이 복사하는 페이지 전체보다 넉넉해야 한다."""
        chars = webapp.PASTE_LIMIT_BYTES // 9      # 한글 1자 = 인코딩 후 9바이트
        self.assertGreater(chars, 300_000)


class OverTheLimitSpeaksKorean(unittest.TestCase):
    def test_it_is_not_the_english_default_page(self):
        res = post(2_000_000)
        text = res.get_data(as_text=True)
        self.assertEqual(res.status_code, 413)
        self.assertNotIn("Request Entity Too Large", text)
        self.assertNotIn("Payload Too Large", text)

    def test_it_says_what_to_do_about_it(self):
        text = post(2_000_000).get_data(as_text=True)
        self.assertIn("붙여넣은 글이 너무 깁니다", text)
        self.assertIn("잘라서", text)

    def test_the_input_form_still_renders_so_they_can_retry(self):
        text = post(2_000_000).get_data(as_text=True)
        self.assertIn('name="address"', text)


class TheLimitStillExists(unittest.TestCase):
    """무제한으로 열어두지 않는다 — 큰 POST 하나로 워커가 재시작하면
    57절·72-5절 메모리 캐시가 날아가 그 뒤 방문자가 전부 느려진다."""

    def test_both_knobs_are_set(self):
        self.assertEqual(webapp.app.config["MAX_CONTENT_LENGTH"],
                         webapp.PASTE_LIMIT_BYTES)
        self.assertEqual(webapp.app.config["MAX_FORM_MEMORY_SIZE"],
                         webapp.PASTE_LIMIT_BYTES)

    def test_it_is_bounded(self):
        self.assertLessEqual(webapp.PASTE_LIMIT_BYTES, 16 * 1024 * 1024)


if __name__ == "__main__":
    unittest.main()
