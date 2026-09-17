"""
data/lawd_codes.md 표를 읽어서 법정동코드(5자리) -> (시도, 시/군/구)를 조회한다.
CLAUDE.md 5절(반경 기반 비교)에서 실거래 행의 주소를 복원할 때 쓴다.

data/lawd_codes.md는 "시도 | 시/군/구 | LAWD_CD" 3열 표다. 서울특별시뿐 아니라
경기도 주요 시/군도 등록되어 있다 — 표에 없는 지역은 이 모듈이 None을 반환하니,
CLAUDE.md 2절/10절 규칙대로 사용자에게 재확인을 요청하고 표에 새로 추가한다.
"""

import os
import re

LAWD_MD_PATH = os.path.join("data", "lawd_codes.md")

_cache: dict[str, tuple[str, str]] | None = None


def _load_table() -> dict[str, tuple[str, str]]:
    mapping = {}
    if not os.path.exists(LAWD_MD_PATH):
        return mapping
    with open(LAWD_MD_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    for line in content.splitlines():
        m = re.match(r"\|\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*\|\s*(\d{5})\s*\|", line)
        if m:
            sido, sigungu, code = m.group(1), m.group(2), m.group(3)
            mapping[code] = (sido, sigungu)
    return mapping


def _get_cache() -> dict[str, tuple[str, str]]:
    global _cache
    if _cache is None:
        _cache = _load_table()
    return _cache


def gu_name(sgg_cd: str) -> str | None:
    entry = _get_cache().get((sgg_cd or "")[:5])
    return entry[1] if entry else None


def sido_name(sgg_cd: str) -> str | None:
    entry = _get_cache().get((sgg_cd or "")[:5])
    return entry[0] if entry else None


def find_gu_in_address(address: str) -> str | None:
    """주소 문자열 안에 있는 시/군/구 이름을 찾는다 (반경 검색 시 지오코딩 대상을
    같은 시/군/구로 좁혀서 API 호출을 아끼는 용도)."""
    for _sido, sigungu in _get_cache().values():
        if sigungu in address:
            return sigungu
    return None


def full_address(row: dict) -> str | None:
    """실거래 행(item)에서 지오코딩용 지번 주소 문자열을 복원한다."""
    entry = _get_cache().get((row.get("sggCd", "") or "")[:5])
    dong = row.get("umdNm", "").strip()
    jibun = row.get("jibun", "").strip()
    if not (entry and dong and jibun):
        return None
    sido, sigungu = entry
    return f"{sido} {sigungu} {dong} {jibun}"
