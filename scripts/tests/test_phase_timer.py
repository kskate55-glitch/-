"""구간별 소요시간 계측(_PhaseTimer) 단위 테스트.

⚠️ 이 계측 줄의 존재 이유는 "로딩이 느리다"를 추측으로 고치지 않기 위해서다.
계측 자체가 조용히 틀리면 엉뚱한 결론(예: 서버 리전을 옮긴다)으로 이어지므로
집계 규칙을 테스트로 고정한다.
"""
import os
import sys
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "webapp"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("KAKAO_REST_API_KEY", "test")
os.environ.setdefault("MOLIT_SERVICE_KEY", "test")

from app import _PhaseTimer  # noqa: E402


class TestPhaseTimer(unittest.TestCase):
    def test_measure_returns_the_value_unchanged(self):
        """계측이 결과를 바꾸면 안 된다 — 감싸기만 한다."""
        t = _PhaseTimer()
        self.assertEqual(t.measure("x", lambda: {"a": 1}), {"a": 1})

    def test_exception_still_propagates_and_is_recorded(self):
        """실패한 구간도 시간은 남기고, 예외는 그대로 올려보낸다."""
        t = _PhaseTimer()
        with self.assertRaises(ValueError):
            t.measure("터지는 구간", lambda: (_ for _ in ()).throw(ValueError("boom")))
        self.assertIsInstance(t.summary()["total"], float)

    def test_slow_phase_shows_up_with_its_label(self):
        t = _PhaseTimer()
        t.measure("느린 구간", lambda: time.sleep(0.12))
        labels = [p["label"] for p in t.summary()["parts"]]
        self.assertIn("느린 구간", labels)

    def test_trivial_phases_are_hidden(self):
        """0.05초 미만은 안 보여준다 — 줄이 지저분해지기만 한다."""
        t = _PhaseTimer()
        t.measure("순식간", lambda: None)
        self.assertEqual([p["label"] for p in t.summary()["parts"]], [])

    def test_unmeasured_time_is_reported_as_the_remainder(self):
        """계측 안 한 구간이 오래 걸리면 '나머지'로 드러나야 한다 —
        안 그러면 '합이 전체보다 한참 작은' 이상한 줄이 찍힌다."""
        t = _PhaseTimer()
        t.measure("잰 구간", lambda: time.sleep(0.06))
        time.sleep(0.12)                      # 안 잰 구간
        s = t.summary()
        self.assertIn("나머지", [p["label"] for p in s["parts"]])
        self.assertGreaterEqual(s["total"], 0.17)

    def test_parts_never_exceed_the_total(self):
        t = _PhaseTimer()
        t.measure("a", lambda: time.sleep(0.06))
        t.measure("b", lambda: time.sleep(0.06))
        s = t.summary()
        self.assertLessEqual(sum(p["sec"] for p in s["parts"]), s["total"] + 0.02)


if __name__ == "__main__":
    unittest.main()
