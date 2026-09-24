#!/usr/bin/env python3
"""전체 테스트가 **실제 네트워크로 새는지** 확인한다 (72-40절).

48절·55절·72-11절·72-39절에서 **네 번** 겪은 함정이다 — 테스트가 카카오·국토부·
브이월드로 조용히 나가고, 그러면 ① 일일 한도를 태우고 ② 그 응답에 기대는
테스트가 실행 순서에 따라 깨진다. 지금까지는 "눈치챈 것만" 고쳤는데, 이제
**세어볼 수 있다**.

⚠️ 파일 이름이 `test_`로 시작하지 않는다 — `discover`가 집어가면 자기 자신을
   다시 실행한다.

    python3 scripts/tests/check_no_network.py

새는 게 있으면 **그 테스트 이름**을 찍고 종료코드 1로 끝난다.
"""
import os
import socket
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main() -> int:
    os.chdir(ROOT)
    real_connect = socket.socket.connect
    hits: list[str] = []

    class Watcher(unittest.TextTestResult):
        current = "(시작 전)"

        def startTest(self, test):
            Watcher.current = str(test)
            super().startTest(test)

    def guard(self, address):
        # 유닉스 소켓·로컬 테스트 서버는 그냥 통과시킨다 — 막으려는 건 바깥이다.
        if isinstance(address, tuple) and len(address) > 1 and address[1] in (80, 443):
            host = str(address[0])
            if not (host.startswith("127.") or host in ("localhost", "::1")):
                hits.append(Watcher.current)
        return real_connect(self, address)

    socket.socket.connect = guard
    try:
        suite = unittest.TestLoader().discover("scripts/tests")
        result = unittest.TextTestRunner(verbosity=1, resultclass=Watcher).run(suite)
    finally:
        socket.socket.connect = real_connect

    leaking = list(dict.fromkeys(hits))
    print()
    if leaking:
        print(f"⚠️ 바깥으로 나간 테스트 {len(leaking)}개:")
        for name in leaking:
            print("   ", name)
        print("\n막는 방법: 그 테스트가 쓰는 경로의 이름을 전부 가짜로 바꾼다.")
        print("  ⚠️ `geocode`만 막으면 안 된다 — 56절 LAWD 되살리기는 `geocode_full`,")
        print("     50-1절은 `land_use.urlopen`과 `urlopen_no_pool` **둘 다**를 쓴다.")
        return 1
    print("✅ 바깥 네트워크로 나간 테스트 없음")
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
