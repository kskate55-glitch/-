"""
국토교통부 매매/전월세 실거래가를 대상 지역(LAWD_CD) 기준으로 가져온다.
CLAUDE.md 22절 규칙 — CLI 버전(molit_rhtrade_api.py를 사용자가 직접 실행해
data/raw/에 저장)과 달리, 웹 서버가 방문자 대신 그때그때 호출한다.

완료된 달(이번 달 제외)은 파일로 캐시해서 같은 구를 다시 조회하는 방문자가
매번 국토부 API를 다시 호출하지 않게 한다. 이번 달은 계약 신고가 계속
들어오는 중이라(신고기한 30일) 캐시하지 않고 매번 새로 받는다.
"""

import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import supabase_cache
from json_cache import read_json, write_json

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")

# 달마다 국토부 API를 한 번씩 부르는데, 기본 조회 기간이 21개월이라 순차로
# 돌리면 빌라+아파트 합쳐 42번을 줄줄이 기다리게 된다(국토부 응답이 한 번에
# 0.5~2초라 이것만 20~80초). 달끼리는 서로 의존이 없어서 그냥 병렬로 던지면
# 된다 — 각 달이 자기 캐시 파일만 쓰므로 공유 상태도 없다.
# ⚠️ 국토부 제한은 "일일 트래픽 건수"라 동시 호출 수를 늘려도 총 호출량은
#    똑같다. 그래도 서버를 때리지 않게 적당히 잡았다.
FETCH_WORKERS = 8


def _fetch_months(months: list[str], fetch_one) -> list[dict]:
    """달 목록을 병렬로 받아 **원래 순서대로** 이어붙인다.

    `fetch_one(ym)`은 그 달의 행 목록을 돌려준다(캐시 읽기/쓰기 포함).
    순서를 지키는 건 계산 결과를 결정적으로 만들기 위해서다 — 이후 단계가
    정렬·중복제거를 다시 하긴 하지만, 같은 입력에 같은 출력이 나오는 편이
    디버깅에 낫다."""
    if not months:
        return []
    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as executor:
        return [row for rows in executor.map(fetch_one, months) for row in rows]


def _month_range(year_min: int, this_year: int, this_month: int) -> list[str]:
    months = []
    y, m = year_min, 1
    while (y, m) <= (this_year, this_month):
        months.append(f"{y}{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return months


# ⚠️ 48-4절 — 아파트 데이터가 빌라 캐시에 섞여 들어간 사고가 있어서 폴더
# 이름에 버전을 붙였다. 서버에 남아 있을지 모르는 오염된 캐시를 **읽지 않고
# 그냥 새로 받게** 하는 가장 단순하고 확실한 방법이다(Render 무료 티어는
# 재배포 때 캐시가 날아가지만 "날아간다는 보장"은 없다).
TRADE_CACHE_DIR = "trade-v2"


def looks_like_apartment_rows(rows: list[dict]) -> bool:
    """빌라(연립다세대) 응답에 아파트 행이 섞였는지 — 카나리아.

    두 API는 단지명 필드가 다르다(빌라 `mhouseNm` · 아파트 `aptNm`). 빌라
    응답에 `aptNm`이 있으면 **엔드포인트를 잘못 탄 것**이므로, 조용히 쓰는
    대신 시끄럽게 실패시킨다 — 48-4절 사고가 몇 달이고 안 드러났던 이유가
    "틀린 데이터가 그럴듯해 보였다"는 것이라서다.
    """
    return any("aptNm" in r for r in rows)


def get_trade_rows(lawd_cd: str, year_min: int) -> list[dict]:
    from molit_rhtrade_api import fetch_all_pages

    now = datetime.now()
    this_ym = f"{now.year}{now.month:02d}"
    cache_dir = os.path.join(CACHE_DIR, TRADE_CACHE_DIR, lawd_cd)

    def _checked(rows):
        if looks_like_apartment_rows(rows):
            raise RuntimeError(
                "빌라 실거래 조회에 아파트 데이터가 섞여 들어왔습니다 "
                "(엔드포인트 오염 — CLAUDE.md 48-4절). 계산을 중단합니다.")
        return rows

    def one_month(ym):
        if ym == this_ym:
            return _checked(fetch_all_pages(lawd_cd, ym))  # 이번 달은 신고가 계속 들어와 캐시 안 함

        cache_path = os.path.join(cache_dir, f"{ym}.json")
        if os.path.exists(cache_path):
            cached = read_json(cache_path, default=None)   # 53절 — 깨진 캐시는 없는 것으로
            if cached is not None:
                return _checked(cached)

        # 62절 — 파일이 없으면 슈퍼베이스에서 되살려 본다. 무료 호스팅은
        # 재배포 때마다 파일이 날아가는데, 그때마다 국토부를 24번씩 다시
        # 부르는 게 "배포 직후엔 항상 느린" 원인이었다.
        # ⚠️ 되살린 데이터도 _checked를 통과시킨다 — 48-4절 오염이 저장돼
        #    있었다면 여기서 걸러야지, 그냥 믿으면 오염이 영구히 남는다.
        remote = supabase_cache.get(f"trade:{lawd_cd}", ym)
        if remote is not None:
            rows = _checked(remote)
            write_json(cache_path, rows)                  # 파일로도 되살려 둔다
            return rows

        rows = _checked(fetch_all_pages(lawd_cd, ym))
        write_json(cache_path, rows)                      # 53절 — 원자적 교체
        supabase_cache.put(f"trade:{lawd_cd}", ym, rows)  # 다음 배포 뒤를 위해
        return rows

    return _fetch_months(_month_range(year_min, now.year, now.month), one_month)


def get_apt_rows(lawd_cd: str, year_min: int) -> list[dict]:
    """CLAUDE.md 40절 — 같은 구의 아파트 매매 실거래를 받아온다(빌라와 비교할
    기준선용). 캐시 정책은 get_trade_rows()와 완전히 같다 — 완료된 달만
    `webapp/cache/apt/<LAWD_CD>/<YYYYMM>.json`에 저장하고, 이번 달은 신고가
    계속 들어오므로 캐시하지 않는다.

    ⚠️ 아파트 API는 활용신청·오퍼레이션명이 별개라 실패할 수 있다 — 호출부가
    빈 목록으로 받아 40절 카드만 조용히 생략하도록, 여기서 예외를 삼킨다
    (20절 건축물대장과 같은 "참고 정보는 실패해도 계산을 막지 않는다" 원칙)."""
    from molit_apt_api import fetch_all_pages, normalize_apt_row

    now = datetime.now()
    this_ym = f"{now.year}{now.month:02d}"
    cache_dir = os.path.join(CACHE_DIR, "apt", lawd_cd)

    def one_month(ym):
        cache_path = os.path.join(cache_dir, f"{ym}.json")
        if ym != this_ym and os.path.exists(cache_path):
            cached = read_json(cache_path, default=None)   # 53절
            if cached is not None:
                return cached
        if ym != this_ym:                                 # 62절 — 슈퍼베이스에서 복구
            remote = supabase_cache.get(f"apt:{lawd_cd}", ym)
            if remote is not None:
                os.makedirs(cache_dir, exist_ok=True)
                write_json(cache_path, remote)
                return remote
        try:
            rows = fetch_all_pages(lawd_cd, ym)
        except Exception:
            return []  # 한 달 실패해도 나머지 달로 계속 간다
        rows = [r for r in (normalize_apt_row(r) for r in rows) if r]
        if ym != this_ym:
            os.makedirs(cache_dir, exist_ok=True)
            write_json(cache_path, rows)                  # 53절
            supabase_cache.put(f"apt:{lawd_cd}", ym, rows)
        return rows

    return _fetch_months(_month_range(year_min, now.year, now.month), one_month)
