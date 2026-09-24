"""72-33절 — 경고 문구를 일반인이 읽을 수 있게.

사용자 지적: *"이거 무슨 말인지 나도 이해 못 하겠는데… 일반인들이 보면
이걸 이해할까?"* — 예전 문구는 업계 용어를 그대로 썼다.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import estimate_price as ep  # noqa: E402


def _rows(n=4):
    return [{"_amount_man": 30000 + i * 200, "_area": 60.0, "_weight": 1.0,
             "_distance_m": 100.0, "_similarity_score": 80.0,
             "dealYear": "2026", "dealMonth": "8"} for i in range(n)]


#: 화면에 나오면 안 되는 업계 용어. 값은 왜 안 되는지.
JARGON = {
    "㎡당가": "단위가 아니라 계산 방식 이름이다 — '1㎡에 얼마'로 풀어 쓴다",
    "총액 기준": "무슨 총액인지 모른다",
    "괴리율": "두 답이 갈린다는 말로 푼다",
    "면적 구성": "비교한 집들의 크기라고 쓴다",
    "치우쳐": "유난히 크거나 작다고 쓴다",
    "표본": "비교할 거래라고 쓴다",
    "편향": "높게/낮게 부른다고 쓴다",
    "분위수": "",
    "가중": "",
}


def _all_warnings():
    out = []
    out += ep.compute_estimate_warnings(_rows(4), 15.9, None, None, 1991)
    out += ep.compute_estimate_warnings(_rows(12), 0.0, None, None, 2015)
    redev = {"dong": "홍은동", "max_ratio": 2.8, "count": 3,
             "examples": [{"name": "한보주택", "area": 34.0,
                           "amount_man": 30600, "build_year": 1991}]}
    out += ep.compute_estimate_warnings(_rows(12), 0.0, redev, None, 1991)
    for v in ("early", "late", "no"):
        out += ep.compute_estimate_warnings(_rows(12), 0.0, redev, None, 1991, v)
    out += ep.compute_estimate_warnings(_rows(12), 0.0, None,
                                        {"zones": ["정비구역"], "pnu": "1" * 19}, 1991)
    return out


class NoJargonReachesTheScreen(unittest.TestCase):
    def test_every_warning_avoids_industry_words(self):
        for w in _all_warnings():
            blob = " ".join(w[f] for f in ("label", "detail", "advice"))
            for word, why in JARGON.items():
                self.assertNotIn(word, blob,
                                 f"[{w['key']}] '{word}' 는 일반인이 모른다 — {why}")

    def test_the_divergence_warning_explains_both_methods(self):
        w = [x for x in ep.compute_estimate_warnings(_rows(12), 15.9, None, None, 2015)
             if x["key"] == "divergence"][0]
        self.assertIn("통째로 얼마에", w["detail"])
        self.assertIn("1㎡에 얼마", w["detail"])
        self.assertIn("크기", w["label"], "제목이 '무엇이 문제인지'를 먼저 말해야 한다")

    def test_the_advice_says_where_to_click(self):
        """'면적 허용범위를 좁혀라'만으로는 어디서 하는지 모른다."""
        w = [x for x in ep.compute_estimate_warnings(_rows(12), 15.9, None, None, 2015)
             if x["key"] == "divergence"][0]
        self.assertIn("상세 옵션", w["advice"])

    def test_no_markdown_anywhere(self):
        for w in _all_warnings():
            for f in ("label", "detail", "advice"):
                self.assertNotIn("**", w[f], f"{w['key']}.{f}")

    def test_no_source_attribution(self):
        """42-1절 — 화면 문구에 출처를 드러내지 않는다."""
        for w in _all_warnings():
            blob = " ".join(w[f] for f in ("label", "detail", "advice"))
            for banned in ("강의", "평공", "텐엑스", "48절", "70절"):
                self.assertNotIn(banned, blob)

    def test_labels_are_sentences_not_headings(self):
        """제목만 읽어도 무슨 일인지 알아야 한다."""
        for w in _all_warnings():
            self.assertGreaterEqual(len(w["label"]), 10, w["label"])


class TheCardHeaderIsPlainToo(unittest.TestCase):
    def _tpl(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "webapp", "templates", "result.html")
        with open(path, encoding="utf-8") as f:
            return f.read()

    def test_the_header_explains_what_the_numbers_mean(self):
        src = self._tpl()
        self.assertIn("과거 실거래 125건에 이 계산기를 다시 돌려", src)
        self.assertIn("1.4배쯤 더 많이 빗나갔어요", src)

    def test_both_caveats_survive(self):
        """신호가 떴다고 틀린 것도, 없다고 맞는 것도 아니다."""
        src = self._tpl()
        self.assertIn("틀린 값이라는 뜻은 아닙니다", src)
        self.assertIn("신호가 없다고 정확한 것도 아닙니다", src)


if __name__ == "__main__":
    unittest.main()


class TheChartAndItsListAreOneCard(unittest.TestCase):
    """72-33절 — 그래프와 그 점들의 목록은 같은 이야기다.

    사용자 지적: *"둘이 칸을 나누지 말고 같이 보이게 하면 이게 뭐구나 하고
    더 직관적으로 한 번에 보일 것 같아."*
    """

    def _tpl(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "webapp", "templates", "result.html")
        with open(path, encoding="utf-8") as f:
            return f.read()

    def test_the_chart_is_not_its_own_card(self):
        src = self._tpl()
        self.assertNotIn('{% if result.price_chart_html %}\n<div class="card">', src,
                         "그래프가 아직 별도 카드다")

    def test_one_card_holds_both(self):
        src = self._tpl()
        i = src.index("이 매도가, 어떤 실거래를 보고 나온 건가")
        j = src.index("위 점들의 실제 목록", i)
        seg = src[i:j]           # 제목 → 목록 갈래 사이만 본다
        self.assertIn("result.price_chart_html", seg)
        self.assertEqual(seg.count('<div class="card"'), 0,
                         "그래프와 목록 사이에 새 카드가 끼어 있다")

    def test_the_heading_is_not_printed_twice(self):
        """카드가 제목을 대니 그래프는 자기 제목을 빼야 한다."""
        import price_chart as pc
        rows = [{"_amount_man": 30000 + i * 500, "_area": 60.0, "_weight": 1.0,
                 "_distance_m": 100.0, "_similarity_score": 80.0,
                 "dealYear": "2026", "dealMonth": "8", "mhouseNm": "빌라"}
                for i in range(6)]
        with_head = pc.render_price_distribution_html(rows, {"현실적 체결가": 32000})
        without = pc.render_price_distribution_html(rows, {"현실적 체결가": 32000},
                                                    heading=None)
        self.assertIn("매도가 산출 근거", with_head)
        self.assertNotIn("매도가 산출 근거", without)
        # 카드 머리말과 겹치는 첫 줄도 같이 빠진다
        self.assertNotIn("점 하나하나가", without)
        # 나머지 설명은 남는다
        self.assertIn("어디쯤 위치", without)

    def test_the_webapp_passes_no_heading(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..", "webapp", "app.py")
        with open(path, encoding="utf-8") as f:
            self.assertIn("heading=None", f.read(),
                          "웹이 제목을 그대로 두면 카드 제목과 두 번 나온다")


class ThePaletteHasMoreThanGreen(unittest.TestCase):
    """72-33절 — 초록만 쓰니 단조롭다는 지적. 역할을 나눈다:
    값·긍정=초록 · 제목·설명 강조=딥 인디고 · 주의=앰버."""

    def _css(self):
        path = os.path.join(os.path.dirname(__file__), "..", "..",
                            "webapp", "static", "app.css")
        with open(path, encoding="utf-8") as f:
            return f.read()

    def test_the_accent_tokens_exist(self):
        css = self._css()
        for token in ("--accent-ink:", "--accent-ink-dark:", "--accent-tint:",
                      "--accent-warm:", "--accent-warm-tint:"):
            self.assertIn(token, css, f"{token} 토큰이 없다")

    def test_the_accents_are_actually_used(self):
        css = self._css()
        self.assertIn("var(--accent-ink)", css, "토큰만 만들고 안 쓰면 소용없다")

    def test_green_is_still_the_brand_colour(self):
        """초록을 **대체**하는 게 아니라 역할을 나누는 것이다."""
        self.assertIn("--primary: #03c75a", self._css())

    def test_the_chart_knows_the_accent_too(self):
        import price_chart as pc
        self.assertEqual(pc.ACCENT_INK, "#23476b",
                         "그래프 축 색이 화면 토큰과 갈리면 톤이 어긋난다")


class TheChartHasDepth(unittest.TestCase):
    """72-33절 — "그래프도 더 화려하게". 채도가 아니라 깊이를 준다."""

    def _chart(self):
        import price_chart as pc
        rows = [{"_amount_man": 30000 + i * 500, "_area": 60.0, "_weight": 1.0 - i * 0.05,
                 "_distance_m": 100.0 + i * 10, "_similarity_score": 80.0,
                 "dealYear": "2026", "dealMonth": "8", "mhouseNm": f"빌라{i}"}
                for i in range(10)]
        # ⚠️ 후광은 **대표값 마커가 실제로 있을 때만** 그려진다 —
        #    hero_name 만 주고 markers 에 그 값을 안 넣으면 안 나온다.
        return pc.render_price_distribution_html(
            rows, {"보수적 급매가": 30500, "현실적 체결가": 32000,
                   "경매용 매도가": 31200, "상단 매도가": 33500},
            hero_name="경매용 매도가")

    def test_gradients_are_defined_and_used(self):
        svg = self._chart()
        self.assertIn("<defs>", svg)
        self.assertIn("linearGradient", svg)
        self.assertIn("radialGradient", svg)
        self.assertGreaterEqual(svg.count("url(#"), 3,
                                "정의만 하고 안 쓰면 그려지지 않는다")

    def test_the_gradient_ids_are_unique_per_chart(self):
        """⚠️ CLI 리포트(14절)에는 그래프가 둘 이상 들어간다 — id 가 겹치면
        나중 것이 먼저 것의 그라데이션을 덮어쓴다."""
        import re
        import price_chart as pc
        a = self._chart()
        rows = [{"_amount_man": 90000, "_area": 60.0, "_weight": 1.0,
                 "_distance_m": 10.0, "_similarity_score": 50.0,
                 "dealYear": "2025", "dealMonth": "1", "mhouseNm": "다른빌라"}]
        b = pc.render_price_distribution_html(rows, {"현실적 체결가": 90000})
        ids_a = set(re.findall(r'id="(pd\d+)[hag]"', a))
        ids_b = set(re.findall(r'id="(pd\d+)[hag]"', b))
        self.assertTrue(ids_a and ids_b)
        self.assertFalse(ids_a & ids_b, "두 그래프의 그라데이션 id 가 겹친다")

    def test_no_undefined_placeholders_leak(self):
        """f-string 에 없는 이름을 쓰면 NameError 로 터진다 — 실제로 겪었다."""
        import re
        self.assertFalse(re.findall(r"\{[A-Z_]+\}", self._chart()))
