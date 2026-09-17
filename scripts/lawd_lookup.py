"""
data/lawd_codes.md 표를 읽어서 법정동코드(5자리) -> 구 이름을 조회한다.
CLAUDE.md 5절(반경 기반 비교)에서 실거래 행의 주소를 복원할 때 쓴다.

⚠️ 현재는 서울특별시 표만 채워져 있어 "서울특별시" 접두어를 붙인다. 다른
   시/도 데이터를 쓰게 되면 data/lawd_codes.md에 시/도 구분을 추가하고
   이 모듈도 함께 고쳐야 한다.
"""

import os
import re

LAWD_MD_PATH = os.path.join("data", "lawd_codes.md")

_cache: dict[str, str] | None = None


def _load_table() -> dict[str, str]:
    mapping = {}
    if not os.path.exists(LAWD_MD_PATH):
        return mapping
    with open(LAWD_MD_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    for line in content.splitlines():
        m = re.match(r"\|\s*([^\|]+?)\s*\|\s*(\d{5})\s*\|", line)
        if m:
            mapping[m.group(2)] = m.group(1)
    return mapping


def gu_name(sgg_cd: str) -> str | None:
    global _cache
    if _cache is None:
        _cache = _load_table()
    return _cache.get((sgg_cd or "")[:5])


def find_gu_in_address(address: str) -> str | None:
    """주소 문자열 안에 있는 구 이름을 찾는다 (반경 검색 시 지오코딩 대상을
    같은 구로 좁혀서 API 호출을 아끼는 용도)."""
    global _cache
    if _cache is None:
        _cache = _load_table()
    for name in _cache.values():
        if name in address:
            return name
    return None


def full_address(row: dict) -> str | None:
    """실거래 행(item)에서 지오코딩용 지번 주소 문자열을 복원한다."""
    gu = gu_name(row.get("sggCd", ""))
    dong = row.get("umdNm", "").strip()
    jibun = row.get("jibun", "").strip()
    if not (gu and dong and jibun):
        return None
    return f"서울특별시 {gu} {dong} {jibun}"
