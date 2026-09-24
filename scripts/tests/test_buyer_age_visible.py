"""72-29절 — 매입자 연령대 카드를 찾을 수 있게 만든다.

사용자가 실제로 못 찾았다("연령대 뭐 그건 어딧간거임"). 원인은 두 갈래였다:
① 제목에 "연령"이라는 말이 없어서(그때 제목은 "이 동네에서 집을 사는 사람"),
② 표본이 부족하거나 지원 안 되는 지역이면 **아무 말 없이 사라져서** 고장인지
   원래 없는 건지 구별할 방법이 없어서.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import buyer_age as B  # noqa: E402

_TPL = os.path.join(os.path.dirname(__file__), "..", "..", "webapp", "templates", "result.html")


def _tpl():
    with open(_TPL, encoding="utf-8") as f:
        return f.read()


class TheTitleSaysWhatItIs(unittest.TestCase):
    def test_the_word_age_is_in_the_heading(self):
        src = _tpl()
        i = src.find("result.buyer_age.region")
        self.assertGreater(i, 0, "연령대 카드가 사라졌다")
        head = src[max(0, i - 300):i]
        self.assertIn("매입자 연령대", head,
                      "제목에 '매입자 연령대'가 없으면 사용자가 못 찾는다")

    def test_the_three_reference_cards_all_have_an_icon(self):
        """참고 정보 섹션을 훑어서 찾을 수 있어야 한다."""
        src = _tpl()
        for icon, marker in (("🏘️", "인근 동 비교"),
                             ("👥", "매입자 연령대"),
                             ("📊", "시장 동향 참고")):
            self.assertIn(f"<h3>{icon} {marker}", src,
                          f"{marker} 카드 제목에 아이콘이 없다")


class ItSaysWhyWhenItIsMissing(unittest.TestCase):
    """⚠️ 20·21·26·50-1절의 '실패하면 조용히 생략' 원칙을 여기서만 비튼다 —
    그 원칙은 있는 줄도 몰랐던 정보에 대한 것이고, 이건 찾다가 못 찾은 것이다.
    """

    @classmethod
    def setUpClass(cls):
        cls.table = B.load_buyer_age()

    def _reason(self, address):
        self.assertIsNone(B.compute_buyer_age(address, self.table),
                          f"{address} 는 카드가 뜨는 주소라 이 검사에 못 쓴다")
        return B.unavailable_reason(address, self.table)

    def test_unsupported_region_explains_the_merged_label(self):
        for a in ("광주광역시 서구 화정동 1", "전라남도 목포시 상동 1"):
            r = self._reason(a)
            self.assertIn("광주", r)
            self.assertIn("전라남도", r)

    def test_thin_sample_names_the_region_and_the_count(self):
        r = self._reason("대구광역시 군위군 군위읍 1")
        self.assertIn("군위군", r)
        self.assertIn(str(B.MIN_TOTAL), r)

    def test_unknown_address_says_it_could_not_pick_a_region(self):
        self.assertIn("찾지 못해", self._reason("이상한주소 12"))

    def test_every_reason_is_a_full_sentence(self):
        for a in ("광주광역시 서구 화정동 1", "대구광역시 군위군 군위읍 1",
                  "이상한주소 12", "인천광역시 제물포구 어딘가 1"):
            r = B.unavailable_reason(a, self.table)
            self.assertTrue(r.rstrip().endswith("."), r)
            self.assertNotIn("**", r)      # 화면은 마크다운을 렌더링하지 않는다(71-1절)

    def test_it_never_raises_on_junk(self):
        """참고 정보 하나 때문에 계산이 멈추면 안 된다."""
        for a in ("", "   ", "서울", "1234", "!!!", "서울특별시"):
            self.assertIsInstance(B.unavailable_reason(a, self.table), str)

    def test_the_template_shows_the_reason(self):
        src = _tpl()
        self.assertIn("result.buyer_age_missing", src,
                      "안 뜰 때 이유를 보여주는 자리가 템플릿에 없다")
        self.assertIn("{% if not result.buyer_age and result.buyer_age_missing %}", src,
                      "카드가 뜨는데도 이유가 같이 뜨면 중복이다")

    def test_the_divider_appears_for_the_reason_too(self):
        """이유만 남는 경우에도 '참고 정보' 구분선이 있어야 카드가 떠 보인다."""
        src = _tpl()
        i = src.index('<div class="section-divider">참고 정보</div>')
        cond = src[max(0, i - 260):i]
        self.assertIn("result.buyer_age_missing", cond)


class TheParticleIsCorrect(unittest.TestCase):
    """지역명이 문장에 그대로 들어가서 '군위군는'처럼 어색해지면 안 된다."""

    def test_final_consonant_takes_eun(self):
        # ⚠️ '구'는 받침이 없다 — 처음에 강남구를 여기 넣었다가 내 테스트가
        #    틀렸다(72-13절 교훈 #5: 검사부터 결정적으로 만든 뒤 코드를 의심한다).
        for w in ("군위군", "세종", "영등포구청"):
            self.assertEqual(B._eun_neun(w), "은", w)

    def test_no_final_consonant_takes_neun(self):
        for w in ("제물포구", "서대문구", "김포시", "제주시", "강남구"):
            self.assertEqual(B._eun_neun(w), "는", w)

    def test_non_hangul_does_not_crash(self):
        for w in ("", "A", "1", "구로!"):
            self.assertIn(B._eun_neun(w), ("은", "는"))


class MostRegionsStillShowTheCard(unittest.TestCase):
    def test_coverage_stays_high(self):
        """조건을 조이다 카드가 대부분 사라지는 것을 막는다."""
        table = B.load_buyer_age()
        keys = [k for k in table if k[1]]
        shown = sum(1 for k in keys
                    if B.compute_buyer_age(f"{k[0]} {k[1]} 어딘가 1", table))
        self.assertGreater(shown / len(keys), 0.80,
                           f"시군구 {len(keys)}개 중 {shown}개만 뜬다 — 너무 많이 사라진다")


if __name__ == "__main__":
    unittest.main()
