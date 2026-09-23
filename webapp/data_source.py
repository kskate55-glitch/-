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
import threading
import time
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

# ⚠️ **동시에 나가는 국토부 호출 수를 전체에서 이만큼으로 묶는다(72-2절).**
#    빌라 조회와 40절 아파트 조회를 겹쳐 돌리면 대기시간이 크게 줄지만,
#    각자 워커 8개를 쓰면 순간 16개가 나가 59절이 지목한 429(초당 제한)
#    위험이 커진다. 슬롯을 공유하면 **겹쳐 돌면서도 순간 호출 수는 예전
#    그대로**다 — 겹치기의 이득만 가져오고 위험은 안 늘린다.
_MOLIT_SLOTS = threading.BoundedSemaphore(FETCH_WORKERS)

# ⛔ **아파트에만 더 좁은 슬롯을 주는 안은 실측으로 기각했다(72-5절).**
#    "빌라가 급하니 아파트를 조이면 빌라가 먼저 끝난다"고 봤는데, 실제로는
#    아파트가 **꼬리**라 조일수록 페이지 전체가 늦어졌다(3.17→3.78→4.98초).
#    빌라는 이미 충분히 빨리 끝나고 있었다.


def _fetch_months(months: list[str], fetch_one, extra_slots=None) -> list[dict]:
    """달 목록을 병렬로 받아 **원래 순서대로** 이어붙인다.

    `fetch_one(ym)`은 그 달의 행 목록을 돌려준다(캐시 읽기/쓰기 포함).
    순서를 지키는 건 계산 결과를 결정적으로 만들기 위해서다 — 이후 단계가
    정렬·중복제거를 다시 하긴 하지만, 같은 입력에 같은 출력이 나오는 편이
    디버깅에 낫다."""
    if not months:
        return []
    def _one(ym):
        if extra_slots is not None:     # 우선순위가 낮은 쪽(아파트)은 한 칸 더 통과해야 한다
            with extra_slots, _MOLIT_SLOTS:
                return fetch_one(ym)
        with _MOLIT_SLOTS:          # 전체 동시 호출 수를 FETCH_WORKERS로 묶는다
            return fetch_one(ym)

    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as executor:
        return [row for rows in executor.map(_one, months) for row in rows]


# ⚠️ **이번 달도 아주 짧게는 캐시한다(72-5절).** 22절이 "이번 달은 신고가
#    계속 들어오므로 캐시하지 않는다"고 정한 건 맞지만, **실거래 신고기한이
#    30일**이라 몇 분 사이에 바뀔 일이 사실상 없다. 그런데 그 한 달 때문에
#    재방문 요청이 매번 국토부를 기다렸다 — 캐시가 다 찬 재방문 0.63초 중
#    0.6초가 이것이었다. 10분이면 "거의 실시간"과 구분이 안 되면서 재방문이
#    사실상 공짜가 된다.
CURRENT_MONTH_TTL_SEC = 600


def _read_fresh(path: str, ttl: int = CURRENT_MONTH_TTL_SEC):
    """TTL 안이면 저장된 행 목록, 아니면 None. 깨진 파일은 53절대로 무시된다."""
    blob = read_json(path, default=None)
    if not isinstance(blob, dict) or "ts" not in blob:
        return None
    if time.time() - blob["ts"] > ttl:
        return None
    rows = blob.get("rows")
    return rows if isinstance(rows, list) else None


def _write_fresh(path: str, rows: list) -> None:
    try:
        write_json(path, {"ts": time.time(), "rows": rows})
    except OSError:
        pass          # 못 써도 조회 자체는 이미 성공했다


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


# ⚠️ **40절 아파트는 최근 12개월만 받는다(72-2절).** 빌라와 달리 아파트는
#    "인근 아파트 ㎡당가 중앙값" 하나만 쓰는데, 아파트는 거래가 워낙 많아
#    (실측 사례: 강북구 한 달 100~200건) 12개월이면 동 단위 표본이 넘친다.
#    얻는 것: 요청당 국토부 호출 9회 감소(48-6절 한도 문제에도 도움) +
#    대기시간 단축. **12개월(만 1년)로 끊은 건 계절성을 타지 않게 하려는
#    것**이다 — 8개월로 더 줄이면 특정 계절에 치우친 중앙값이 나온다.
APT_MONTHS = 12


def _recent_months(n: int, this_year: int, this_month: int) -> list[str]:
    """이번 달까지 최근 n개월을 오래된 순으로."""
    out = []
    y, m = this_year, this_month
    for _ in range(n):
        out.append(f"{y}{m:02d}")
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(out))


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
            # 이번 달은 완료된 달과 달리 **짧은 TTL**로만 들고 있는다(위 주석).
            cur_path = os.path.join(cache_dir, f"{ym}.current.json")
            fresh = _read_fresh(cur_path)
            if fresh is not None:
                return _checked(fresh)
            rows = _checked(fetch_all_pages(lawd_cd, ym))
            os.makedirs(cache_dir, exist_ok=True)
            _write_fresh(cur_path, rows)
            return rows

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
        if ym == this_ym:
            # 빌라와 같은 처리 — 이번 달은 짧은 TTL로만 들고 있는다(72-5절).
            fresh = _read_fresh(os.path.join(cache_dir, f"{ym}.current.json"))
            if fresh is not None:
                return fresh
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
        if ym == this_ym:
            os.makedirs(cache_dir, exist_ok=True)
            _write_fresh(os.path.join(cache_dir, f"{ym}.current.json"), rows)
        if ym != this_ym:
            os.makedirs(cache_dir, exist_ok=True)
            write_json(cache_path, rows)                  # 53절
            supabase_cache.put(f"apt:{lawd_cd}", ym, rows)
        return rows

    # 빌라와 달리 최근 APT_MONTHS개월만 받는다 — 위 주석 참고.
    months = _recent_months(APT_MONTHS, now.year, now.month)
    earliest = f"{year_min}01"
    return _fetch_months([m for m in months if m >= earliest], one_month)
