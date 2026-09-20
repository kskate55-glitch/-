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
from datetime import datetime

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")


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


def get_trade_rows(lawd_cd: str, year_min: int) -> list[dict]:
    from molit_rhtrade_api import fetch_all_pages

    now = datetime.now()
    this_ym = f"{now.year}{now.month:02d}"
    cache_dir = os.path.join(CACHE_DIR, "trade", lawd_cd)

    all_rows = []
    for ym in _month_range(year_min, now.year, now.month):
        if ym == this_ym:
            all_rows.extend(fetch_all_pages(lawd_cd, ym))
            continue

        cache_path = os.path.join(cache_dir, f"{ym}.json")
        if os.path.exists(cache_path):
            with open(cache_path, encoding="utf-8") as f:
                all_rows.extend(json.load(f))
            continue

        rows = fetch_all_pages(lawd_cd, ym)
        os.makedirs(cache_dir, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False)
        all_rows.extend(rows)

    return all_rows
