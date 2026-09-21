"""
28절/31절 — 네이버부동산 등에서 사용자가 복사해서 붙여넣은 매물 목록 텍스트를
파싱해서, 대상 물건과 가장 비슷한 매물 상위 N개를 뽑고(28절), 검토 중인
가격이 그 매물들 사이에서 몇 % 위치(저렴한 쪽부터)인지도 계산한다(31절
`price_rank_among_listings()`).

11절/18절은 원래 "Claude가 대화 중에 직접 읽고 계산"하는 방식으로 설계돼
있었다 — 사이트마다 형식이 달라서 정해진 스키마가 없기 때문이다(사용자
지침에 명시된 대로). 이 모듈은 그중 **웹 버전에서도 돌아가야 하는 부분**
(붙여넣은 텍스트 → 매물별 필드 추출 → 유사도 순위)만 순수 파이썬 정규식으로
최대한 흉내 낸 것이다. 웹 버전(22절)은 "AI 호출 없는 순수 파이썬"이 원칙이라
LLM 파싱을 쓸 수 없다 — 그래서 대화창에서 Claude가 직접 읽는 것보다는
인식률이 떨어질 수 있다는 한계가 있다. 도저히 못 뽑아낸 항목은 조용히
건너뛰고 몇 건을 걸렀는지만 알려준다(11절과 같은 원칙).

⚠️ 스크래핑이 아니다 — 사용자가 직접 사이트에서 복사해서 붙여넣은 텍스트만
처리한다. 11절의 "자동 수집 금지" 원칙을 그대로 따른다.
"""

import re
import statistics

# "3억 5,000", "3.6억", "3억5000만원" 등을 모두 받는다. 억 뒤 나머지(만원
# 단위)는 같은 줄 안에서만(개행 넘어가지 않게 [ \t]*) 최대 4자리까지만
# 잡는다 — 그렇게 안 하면 다음 줄의 면적 숫자("21평" 등)를 나머지로 잘못
# 삼켜버리는 문제가 있었다.
_PRICE_EOK_MAN = re.compile(r"(\d+(?:\.\d+)?)\s*억(?:[ \t]*([\d,]{1,6}))?[ \t]*(?:만\s*원?)?")
_PRICE_MAN_ONLY = re.compile(r"([\d][\d,]{3,})\s*만\s*원?")
_AREA = re.compile(r"(\d+(?:\.\d+)?)\s*(?:m2|㎡|평방미터)")
_AREA_PYEONG = re.compile(r"(\d+(?:\.\d+)?)\s*평(?!방)")
_FLOOR_FRACTION = re.compile(r"(-?\d+)\s*/\s*\d+\s*층")
_FLOOR_PLAIN = re.compile(r"(-?\d+)\s*층")
_BASEMENT = re.compile(r"반지하|지하\s*\d*층?")
_ROOM_COUNT = re.compile(r"방\s*(\d+)\s*개?|(\d+)\s*룸")
_BUILD_YEAR = re.compile(r"((?:19|20)\d{2})\s*년.{0,6}(?:준공|건축|사용승인)")
_RENT_KEYWORDS = re.compile(r"전세|월세")
_SALE_KEYWORD = re.compile(r"매매")


def _parse_price_man(text: str) -> float | None:
    m = _PRICE_EOK_MAN.search(text)
    if m:
        eok = float(m.group(1))
        rest = (m.group(2) or "0").replace(",", "")
        man = int(rest) if rest else 0
        if man >= 10000:  # 나머지가 1억을 넘으면 잘못 잡힌 것 — 무시한다
            man = 0
        return eok * 10000 + man
    m = _PRICE_MAN_ONLY.search(text)
    if m:
        return float(m.group(1).replace(",", ""))
    return None


def _parse_area(text: str) -> float | None:
    m = _AREA.search(text)
    if m:
        return float(m.group(1))
    m = _AREA_PYEONG.search(text)
    if m:
        return round(float(m.group(1)) * 3.3058, 2)
    return None


def _parse_floor(text: str) -> int | None:
    if _BASEMENT.search(text):
        return 0
    m = _FLOOR_FRACTION.search(text)
    if m:
        return int(m.group(1))
    m = _FLOOR_PLAIN.search(text)
    if m:
        return int(m.group(1))
    return None


def _parse_room_count(text: str) -> int | None:
    m = _ROOM_COUNT.search(text)
    if m:
        return int(m.group(1) or m.group(2))
    return None


def _parse_build_year(text: str) -> int | None:
    m = _BUILD_YEAR.search(text)
    if m:
        return int(m.group(1))
    return None


def _guess_name(block: str) -> str:
    for line in block.splitlines():
        line = line.strip()
        if line and not _PRICE_EOK_MAN.search(line) and not _AREA.search(line):
            return line[:30]
    return "(단지명 미확인)"


def _split_blocks(raw_text: str) -> list[str]:
    """빈 줄 2개 이상 기준으로 먼저 나눠보고, 결과가 너무 적으면(1개 이하)
    "가격 패턴이 나오는 줄"을 매물 경계로 보고 다시 나눈다 — 사이트마다
    복사 형식이 달라서 하나의 방법만으로는 부족하다."""
    blocks = [b.strip() for b in re.split(r"\n\s*\n+", raw_text) if b.strip()]
    if len(blocks) >= 2:
        return blocks

    lines = [ln for ln in raw_text.splitlines() if ln.strip()]
    blocks = []
    current: list[str] = []
    for line in lines:
        if (_PRICE_EOK_MAN.search(line) or _PRICE_MAN_ONLY.search(line)) and current:
            blocks.append("\n".join(current))
            current = [line]
        else:
            current.append(line)
    if current:
        blocks.append("\n".join(current))
    return blocks if blocks else ([raw_text.strip()] if raw_text.strip() else [])


def parse_listings(raw_text: str) -> tuple[list[dict], int]:
    """붙여넣은 텍스트에서 매매 매물만 최대한 뽑아낸다.
    반환: (매물 목록, 걸러진 건수 — 가격/면적을 못 찾았거나 매매가 아닌 것)."""
    blocks = _split_blocks(raw_text)
    listings = []
    skipped = 0
    for block in blocks:
        if _RENT_KEYWORDS.search(block) and not _SALE_KEYWORD.search(block):
            skipped += 1
            continue
        price = _parse_price_man(block)
        area = _parse_area(block)
        if price is None or area is None:
            skipped += 1
            continue
        listings.append({
            "name": _guess_name(block),
            "price_man": price,
            "area": area,
            "floor": _parse_floor(block),
            "build_year": _parse_build_year(block),
            "room_count": _parse_room_count(block),
        })
    return listings, skipped


def rank_similar_listings(listings: list[dict], subject_area: float,
                           subject_floor: int | None = None,
                           subject_build_year: int | None = None,
                           top_n: int = 20) -> list[dict]:
    """대상 물건과 유사도 점수를 매겨 가까운 순으로 정렬한다(5절 원리를
    그대로 재사용 — 면적 차이%·층 차이·준공년도 차이가 작을수록 유사).
    점수가 낮을수록(=차이가 작을수록) 상위로 온다."""
    def score(item: dict) -> float:
        s = abs(item["area"] - subject_area) / subject_area * 100  # 면적 차이 %
        if subject_floor is not None and item.get("floor") is not None:
            s += abs(item["floor"] - subject_floor) * 3
        elif subject_floor is not None:
            s += 6  # 층 정보 없는 매물은 중간 페널티
        if subject_build_year is not None and item.get("build_year") is not None:
            s += abs(item["build_year"] - subject_build_year) * 1.5
        return s

    ranked = sorted(listings, key=score)
    return ranked[:top_n]


def price_rank_among_listings(listings: list[dict], subject_area: float,
                               price_man: float, area_tolerance_pct: float = 0.15) -> dict | None:
    """CLAUDE.md 31절: 붙여넣은 매물 중 유사면적(5절과 같은 허용범위) 매물의
    평당가(만원/㎡) 분포에서, 내가 검토 중인 가격이 몇 % 위치(저렴한 쪽부터)에
    있는지 계산한다. 서로 다른 면적끼리 가격을 직접 비교하면 왜곡되므로 항상
    평당가로 정규화한다. 유사면적 매물이 3건 미만이면 통계적으로 못 믿을
    수준이라 None을 돌려준다(호출부는 그 경우 조용히 이 계산을 건너뛴다)."""
    similar = [it for it in listings
               if it.get("area") and abs(it["area"] - subject_area) / subject_area <= area_tolerance_pct]
    if len(similar) < 3:
        return None
    subject_ppm = price_man / subject_area
    listing_ppms = sorted(it["price_man"] / it["area"] for it in similar)
    cheaper_or_equal = sum(1 for p in listing_ppms if p <= subject_ppm)
    percentile = round(cheaper_or_equal / len(listing_ppms) * 100)
    return {
        "n": len(similar),
        "percentile": percentile,  # 낮을수록 저렴한 쪽(=가격 경쟁력 높음)
        "cheaper_count": sum(1 for p in listing_ppms if p < subject_ppm),
        "median_ppm": round(statistics.median(listing_ppms)),
        "subject_ppm": round(subject_ppm),
    }
