"""
저장된 국토부 연립다세대 실거래가 XML(들)을 읽어서
매도가 범위(보수적 급매가 / 현실적 체결가 / 상단 매도가 / AI 기준매도가 / 권장 호가)를
CLAUDE.md 8절 포맷으로 계산하고, 12절 규칙에 따른 월별 계절성(거래 활발한 달)과
15절 규칙에 따른 월별 가격 추이, 16절 규칙에 따른 예상 전세가·매매 대비 비교,
19절 규칙에 따른 입지 체크·수익성 계산, 20절 규칙에 따른 건축물대장 조회
(승강기·세대수·사용승인일), 21절 규칙에 따른 인근 중개업소 조회, 23절 규칙에
따른 예상 월세 추정(전월세전환율 역산, --monthly-deposit 생략 시 반경 안
실제 월세 거래로 역산한 실측치를 우선 쓴다), 26절 규칙에 따른 역세권
프리미엄 참고(--station-premium, 거리-가격 회귀)도 함께 출력한다.

사용법:
    python estimate_price.py --dir data/raw --rent-dir data/raw_rent \
        --address "서울특별시 강북구 수유동 468-202" --dong 수유동 \
        --area 69.27 --floor 5 --radius 400 --year-min 2025 \
        --bid-price 10200 --extra-cost 300

--dir              : XML 파일들이 들어있는 폴더 (여러 달치를 다 넣어두면 자동으로 합쳐서 계산)
--rent-dir         : 전월세 실거래가 XML 폴더 (기본 data/raw_rent) — 데이터가 있으면
                     16절 예상 전세가·매매 대비 비교도 함께 계산한다
--address          : 대상 물건의 지번 주소 — 카카오 로컬 API로 좌표를 구하는 데 쓴다
--dong             : 법정동명 (umdNm) — 계절성/가격추이 등 동네 단위 분석 범위로 쓰인다
--area             : 대상 물건의 전용면적(㎡) — ±15% 이내를 "비슷한 면적"으로 취급
--floor            : 대상 물건의 층 (선택 — 유사층 가중치 판단에 사용)
--build-year       : 대상 물건의 준공년도 (선택 — 유사연식 가중치 판단에 사용)
--radius           : 비교 반경(미터), 기본 400m
--year-min         : 매도가 계산에 사용할 최소 계약년도 (기본값: 실행 시점 기준 작년)
--bid-price        : 낙찰가/입찰예정가 (만원 단위, 선택 — 주면 수익성 계산도 같이 보여준다)
--acquisition-rate : 취득 부대비용률 (기본 1.1%, 1주택/무주택 실수요 기준 — 다주택/
                     규제지역이면 최대 13%까지 올라가니 본인 상황에 맞게 조정 필요)
--sale-rate        : 매도 중개수수료율 (기본 0.5%)
--extra-cost       : 명도비·수리비 등 추가비용 (만원 단위, 기본 0)
--no-location      : 입지 체크(지하철역/초등학교/마트 거리)와 34절 주변 지형 참고(산/하천)를 건너뛴다
--brokers-csv      : 서울 인근 중개업소 조회용 CSV (기본 data/brokers_seoul.csv,
                     서울 열린데이터광장에서 받은 공인중개사사무소 정보)
--broker-radius    : 인근 중개업소 조회 반경(미터), 기본 1000m
--no-brokers       : 인근 중개업소 조회를 건너뛴다
--monthly-deposit  : 예상 월세 추정용 월세보증금 (만원, 선택 — 주면 23절 예상 월세
                     추정을 같이 보여준다. 순수월세면 0)
--conversion-rate  : 전월세전환율 (연 %, 선택) — 생략하면 반경 안 실제 월세
                     거래로 역산한 실측치를 쓰고, 그것도 없으면 6.0(기본값)
이 스크립트는 실거래가 XML 파일 텍스트만 읽는다 — 국토부 API를 직접 호출하지
않는다 (그건 molit_rhtrade_api.py/molit_rhrent_api.py의 몫). 다만 --address를
좌표로 바꾸기 위해 카카오 로컬 API는 직접 호출하고(geocode.py, 환경변수
KAKAO_REST_API_KEY 필요), 경기도 물건이면 인근 중개업소 조회를 위해 경기데이터드림
API도 직접 호출한다(broker_lookup.py, 환경변수 GG_DATA_KEY 필요).
"""

import argparse
import glob
import os
import re
import statistics
import xml.etree.ElementTree as ET
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

# .env에 적어둔 키를 환경변수로 올린다 (6절) — 이미 설정된 값은 안 덮어쓴다.
try:
    from env_file import load_env
    load_env()
except ImportError:  # 다른 경로에서 import될 때도 죽지 않게
    pass


MAX_GEOCODE_CANDIDATES = 200  # 이보다 후보가 많으면 상위 N개까지만 지오코딩한다 (웹 타임아웃 방지)
GEOCODE_WORKERS = 8  # 지오코딩 병렬 호출 수 — 너무 크면 카카오 초당 호출 제한에 걸릴 수 있다


def load_transactions(xml_dir: str) -> list[dict]:
    """xml_dir 바로 아래뿐 아니라, molit_rhtrade_api.py/molit_rhrent_api.py가
    지역별로 나눠 저장하는 하위 폴더(data/raw/<LAWD_CD>/*.xml)까지 재귀적으로
    찾는다 — --dir data/raw처럼 여러 지역을 한 번에 합쳐서 볼 때도,
    --dir data/raw/11500처럼 특정 지역만 볼 때도 둘 다 그대로 동작한다."""
    rows = []
    xml_paths = glob.glob(os.path.join(xml_dir, "**", "*.xml"), recursive=True)
    txt_paths = glob.glob(os.path.join(xml_dir, "**", "*.txt"), recursive=True)
    for path in xml_paths + txt_paths:
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(path, "r", encoding="cp949") as f:
                content = f.read()

        # 파일에 <response>가 여러 개 이어붙어 있을 수도 있으니 관대하게 파싱
        # (여러 번 호출한 결과를 그냥 한 파일에 이어붙였을 경우 대비)
        for match in re.finditer(r"<response>.*?</response>", content, re.S):
            try:
                root = ET.fromstring(match.group(0))
            except ET.ParseError:
                continue
            for item in root.findall(".//item"):
                row = {child.tag: (child.text or "").strip() for child in item}
                if row:
                    rows.append(row)
    return rows


def dedupe(rows: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for r in rows:
        key = (
            r.get("umdNm"), r.get("mhouseNm"), r.get("jibun"),
            r.get("dealYear"), r.get("dealMonth"), r.get("dealDay"),
            r.get("dealAmount"), r.get("excluUseAr"), r.get("floor"),
        )
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def dedupe_rent(rows: list[dict]) -> list[dict]:
    """전월세 행은 dealAmount가 없고 deposit/monthlyRent가 금액 필드라 dedupe()와
    키가 다르다 (CLAUDE.md 16절)."""
    seen = set()
    out = []
    for r in rows:
        key = (
            r.get("umdNm"), r.get("mhouseNm"), r.get("jibun"),
            r.get("dealYear"), r.get("dealMonth"), r.get("dealDay"),
            r.get("deposit"), r.get("monthlyRent"), r.get("excluUseAr"), r.get("floor"),
        )
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def filter_pure_jeonse(rows: list[dict]) -> list[dict]:
    """월세가 섞이지 않은(monthlyRent == 0) 순수 전세 거래만 남긴다 (CLAUDE.md 16절 —
    환산보증금 계산은 하지 않으므로 월세가 섞인 거래는 전세가 추정에서 제외한다)."""
    out = []
    for r in rows:
        if to_amount_man(r.get("monthlyRent", "0")) != 0:
            continue
        out.append(r)
    return out


def filter_wolse(rows: list[dict]) -> list[dict]:
    """월세가 섞인(monthlyRent != 0) 거래만 남긴다 — 16절과 반대. CLAUDE.md 23-1절
    실측 전월세전환율 계산에 쓴다. 16절은 이 거래들을 버리지만, 여기서는 반대로
    이 거래들이야말로 "월세보증금 대비 월세" 실제 사례라 전환율 역산의 재료다."""
    out = []
    for r in rows:
        if to_amount_man(r.get("monthlyRent", "0")) == 0:
            continue
        out.append(r)
    return out


def estimate_conversion_rate(rent_dir: str, subject_coord: tuple[float, float], area: float,
                              floor: int | None, build_year: str | None, radius_m: float,
                              year_min: int, this_year: int, gu_filter: str | None,
                              area_tolerance_pct: float = 0.15, build_year_tolerance: int = 4) -> dict | None:
    """CLAUDE.md 23-1절 규칙: 8절 매도가 계산에는 안 쓰이고 버려지던 월세 낀
    전월세 실거래(filter_wolse)를 반경/면적/연식/층 조건(find_comparables)으로
    같은 물건 기준까지 좁힌 뒤, 각 건의 (월세보증금, 월세)를 16절과 동일한
    조건으로 구한 "예상 전세보증금"(순수 전세 비교거래의 현실적 전세가)과
    비교해서 그 지역 실제 전월세전환율을 역산한다.

    전환율(연 %) = 월세×12 ÷ (예상 전세보증금 − 월세보증금) × 100

    예상 전세보증금 자체가 없거나(전세 비교거래 0건), 월세 비교거래가 없거나,
    계산된 전환율이 죄다 비현실적 범위(0~30%) 밖이면 None을 돌려준다 — 이 경우
    호출부는 23절 기본값(6.0%)으로 조용히 폴백한다."""
    rent_rows = dedupe_rent(load_transactions(rent_dir))
    if not rent_rows:
        return None

    jeonse_rows = filter_pure_jeonse(rent_rows)
    jeonse_filtered = find_comparables(jeonse_rows, subject_coord, area, floor, build_year,
                                        radius_m, year_min, this_year, gu_filter,
                                        amount_field="deposit",
                                        area_tolerance_pct=area_tolerance_pct,
                                        build_year_tolerance=build_year_tolerance)
    if not jeonse_filtered:
        return None
    reference_deposit = compute_scenarios(jeonse_filtered, radius_m, this_year, subject_area=area)["median"]

    wolse_rows = filter_wolse(rent_rows)
    wolse_filtered = find_comparables(wolse_rows, subject_coord, area, floor, build_year,
                                       radius_m, year_min, this_year, gu_filter,
                                       amount_field="monthlyRent",
                                       area_tolerance_pct=area_tolerance_pct,
                                       build_year_tolerance=build_year_tolerance)
    if not wolse_filtered:
        return None

    rates = []
    for r in wolse_filtered:
        monthly = r["_amount_man"]
        deposit = to_amount_man(r.get("deposit", ""))
        if deposit != deposit:
            continue
        denom = reference_deposit - deposit
        if denom <= 0:
            continue  # 월세보증금이 예상 전세가보다 크거나 같으면 역산이 성립하지 않는다
        rate = monthly * 12 / denom * 100
        if 0 < rate < 30:  # 입력 오류 등으로 인한 비현실적 이상치는 제외 (통상 3~15% 범위)
            rates.append(rate)

    if not rates:
        return None

    rates.sort()
    n = len(rates)
    median_rate = rates[n // 2] if n % 2 else (rates[n // 2 - 1] + rates[n // 2]) / 2
    return {"rate": median_rate, "n": n, "reference_deposit": reference_deposit}


def to_amount_man(s: str) -> float:
    """'36,900' (만원 단위 문자열) -> 36900.0 (만원, float)"""
    try:
        return float(s.replace(",", ""))
    except (ValueError, AttributeError):
        return float("nan")


# 거래유형(dealingGbn)별 가중치 — molit_rhtrade_api.py 상단의 공식 기술문서로
# 검증된 필드다(✅). 직거래는 가족 간 거래처럼 시세를 반영 안 하는 경우가 섞일
# 수 있지만, 그렇다고 완전히 제외하면 안 된다 — 빌라는 표본 자체가 워낙 적어서
# 거래를 통째로 버리면 표본 부족 문제가 더 심해질 수 있다는 지적을 반영해
# "제외"가 아니라 "가중치 감소"로만 처리한다. ⚠️ 실제 응답 문자열이 정확히
# "중개거래"/"직거래"인지는 아직 실측 샘플로 확인하지 못했다 — 알려진 두 값 외에
# 다른 표기(빈 문자열 포함)는 잘못 추측해서 부당하게 낮추는 것보다 안전하게
# 중개거래와 동일한 가중치(1.0)로 둔다. 실제 값이 다르면 이 표만 고치면 된다.
DEALING_TYPE_WEIGHT = {"중개거래": 1.0, "직거래": 0.4}
DEALING_TYPE_WEIGHT_DEFAULT = 1.0

# 평당가(㎡당가) 기준 이상치 다운웨이트 — median ± PRICE_OUTLIER_MAD_MULTIPLIER×MAD
# 밖이면 PRICE_OUTLIER_WEIGHT로 가중치를 낮춘다(제외는 아님 — 마찬가지로 표본이
# 적은 빌라 특성상 통째로 버리기보다 낮춰서 반영하는 쪽이 안전하다). MAD는
# 스케일 보정(×1.4826) 없이 그대로 쓴다 — 통계적으로 검증된 값이 아니라 경험적
# 임계치라는 점은 동일하다.
PRICE_OUTLIER_MAD_MULTIPLIER = 3
PRICE_OUTLIER_WEIGHT = 0.05
PRICE_OUTLIER_MIN_SAMPLE = 5  # 이보다 표본이 적으면 이상치 판단 자체가 무의미해서 건너뜀

# 가중 중앙값을 낼 때 각 거래를 몇 개로 복제할지 정하는 배율(7절).
# ⚠️ 이게 없으면(=1) 가중치 체계 전체가 무력해진다 — 실제 가중치는 대부분
#    0.05~1.6 범위라 round()를 바로 걸면 1.5 미만이 전부 1개로 뭉개져서,
#    유사도 90점 최근 거래(1.166)와 이상치(0.05)가 **똑같이 1개**로 반영됐다.
#    100을 곱한 뒤 반올림하면 각각 117개 / 5개가 되어 배율이 그대로 살아난다.
WEIGHT_REPLICATION_SCALE = 100

# 48절 백테스트로 잡는 매매가 보정 계수. **지금은 1.0 — 보정 없음.**
#
# ⛔ **한때 0.97이었는데 되돌렸다.** 그 값은 "고양시 덕양구 10건에서 계산기가
#    +2.6% 높게 불렀다"를 근거로 잡은 건데, 48-4절에서 **그 10건이 빌라가
#    아니라 아파트였다는 게 드러났다**(엔드포인트 오염 버그). 아파트 표본으로
#    맞춘 계수를 빌라 계산에 계속 걸어둘 근거가 없다.
# ⚠️ 오염을 걷어낸 진짜 빌라 표본(경기 21건)에서는 오히려 **계산기가 낮게**
#    부르고 있었다(지상층 17건 편향 -5.0%, 보정을 빼면 약 -2.1%). 즉 0.97은
#    방향까지 반대였다.
# ⚠️ **다시 켜려면 깨끗한 빌라 표본으로 다시 재야 한다.** 48-4절 수정 이후의
#    백테스트 결과로 편향을 확인하고 이 값 하나만 고치면 된다.
# ⚠️ **전세(16절)에는 적용하지 않는다** — 매매 실거래로만 잰 편향이라 전세에
#    그대로 쓰면 근거 없는 보정이 된다. 그래서 기본값을 1.0으로 두고 매매
#    호출부만 명시적으로 이 값을 넘긴다(계수가 1.0이어도 구조는 그대로 둔다 —
#    다시 켤 때 호출부를 또 고치지 않아도 되게).
SALE_CALIBRATION_FACTOR = 1.0

# 동일건물 보너스 — 좌표가 거의 겹치는(=사실상 같은 건물) 거래는 "바로 이
# 건물이 실제로 얼마에 팔렸는지" 보여주는 가장 직접적인 증거라 가중치를 한 번
# 더 높인다. 지번 문자열(jibun)을 비교하는 대신 좌표 거리로 판정한다 — 5절이
# "동일건물 매칭" 대신 반경 기반 비교로 바꾼 것과 같은 이유다(지번 표기가
# "123-4"/"산 123-4"처럼 미묘하게 달라도 좌표 거리는 안정적으로 잡힌다).
# ⚠️ 18절/describe_comparable_similarity()의 전례처럼, 이 플래그는 UI 텍스트에
# 새로 노출하지 않는다 — 사용자가 "판단까지 얹은 부가 설명은 이해하기 어렵다"고
# 지적한 걸 반영해, 이미 있는 "유사도" 점수·거리 열로 충분히 드러나는 정보 위에
# 또 다른 판단 문구를 얹지 않기로 한 결정을 그대로 따른 것 — 순수 내부 가중치
# 보정으로만 쓴다.
SAME_BUILDING_DISTANCE_M = 20  # 빌라 한 동 부지 규모를 감안한 경험적 임계치 — 검증된 값은 아니다
SAME_BUILDING_BONUS = 2.0  # GPT 제안 범위(1.5~2.5)의 중간값 — 마찬가지로 경험적 값
# 51절 — 보너스를 받으려면 같은 건물 거래가 이만큼은 있어야 한다.
# 한 건짜리는 "건물 시세"가 아니라 "그 한 호실 가격"이라 보너스를 주지 않는다.
SAME_BUILDING_MIN_COUNT = 2

# CLAUDE.md 35절: 수리상태별 매도가능가격 참고 배율 — 사용자가 들은 경매 강의의
# "험한집/깔끔한 기본집/올수리는 각각 다른 매도가능가격을 가진다"는 인사이트를
# 반영했다. 국토부 실거래가에는 수리상태 필드가 없어(18절 방개수 보정과 같은
# 이유) 이 배율을 데이터로 검증할 방법이 없다 — SAME_BUILDING_BONUS와 같은
# 성격의, 강의에서 나온 경험적 참고치일 뿐이다. "기본"은 배율 1.0(보정 없음)
# 이라 결과 화면에 따로 표시하지 않는다.
CONDITION_MULTIPLIER = {"올수리": 1.08, "기본": 1.00, "노후": 0.90}
CONDITION_LABELS = {
    "올수리": "올수리 (전체 리모델링 완료)",
    "기본": "기본 (깨끗한 상태, 별도 수리 불필요)",
    "노후": "노후 (수리 필요)",
}

# CLAUDE.md 38절: 상태별 매도가 3단계(사다리). 위 배율을 "하나 골라서 한 번
# 곱하는" 데서 그치지 않고, 노후 → 기본 → 올수리로 올라갈 때 매도가가 얼마씩
# 올라가는지를 한 표에 나란히 보여주기 위한 순서/라벨이다. 강의가 짚은
# "험한 집/깔끔한 기본집/올수리집은 각각 다른 매도가능가격을 가진다"를
# 그대로 옮긴 것 — 배율 자체는 위와 동일한 (검증 안 된) 경험적 참고치다.
CONDITION_ORDER = ["노후", "기본", "올수리"]
CONDITION_STEP_LABELS = {
    "기본": "기본 정리 후 (청소·도배·장판 등)",
    "올수리": "올수리 후 (전체 리모델링)",
}
# 지금 상태인 줄은 "~ 후"라고 쓰면 어색해서(이미 그 상태다) 별도 라벨을 쓴다.
CONDITION_CURRENT_LABELS = {
    "노후": "현재 상태 (노후 — 수리 필요)",
    "기본": "현재 상태 (기본 — 깨끗함)",
    "올수리": "현재 상태 (올수리 완료)",
}

# CLAUDE.md 36절: 임장 체크리스트 — "이 요소가 나쁘면 가격을 낮춰도 잘 안
# 팔린다"고 짚은 항목들. 국토부 실거래가·카카오 API 어디에도 이 정보가 없어
# 임장(현장답사) 때 사용자가 직접 확인해서 체크해야 한다(43절).
#
# ⚠️ 사용자 지적으로 두 가지를 고쳤다:
# (1) **"엘리베이터"를 뺐다.** 20절 건축물대장 조회로 승강기 유무가 이미
#     자동으로 확인되고 41절 층·승강기 항목이 그걸로 판정까지 한다 — 같은
#     걸 임장에서 또 체크하게 하면 중복이고, 한 요소로 두 번 감점된다.
# (2) **항목명을 "나쁜 상태"로 못박았다.** 예전엔 "채광"·"주차"처럼 중립적인
#     명사라 "좋으면 체크하는 건지 나쁘면 체크하는 건지" 알 수 없었다
#     (사용자가 실제로 헷갈린다고 지적). 지금은 라벨 자체가 나쁜 상태를
#     서술해서, 읽는 즉시 "해당되면 체크"임이 드러난다.
INSPECTION_CHECKLIST = [
    "채광 나쁨", "주차공간 부족", "누수 흔적 있음", "악취 심함",
    "소음 있음", "건물 관리상태 열악", "경사 심함",
]
# 위 항목을 폼 필드 이름(ASCII)과 짝지어 둔다 — 임장에서 "이 항목이 나쁘다"고
# 체크한 것을 41절 환금성 점수에 실제로 반영하기 위해서다(43절). 값이 화면
# 라벨이라 순서를 바꾸면 안 되고, 항목을 늘리면 키도 같이 늘린다.
INSPECTION_FIELDS = [
    ("light", "채광 나쁨"), ("parking", "주차공간 부족"),
    ("leak", "누수 흔적 있음"), ("smell", "악취 심함"), ("noise", "소음 있음"),
    ("management", "건물 관리상태 열악"), ("slope", "경사 심함"),
]
# 체크된 "나쁜 항목" 개수별 판정 — 강의가 "이 요소가 나쁘면 값을 낮춰도
# 안 팔린다"고 못박은 항목들이라, 두 개 이상이면 바로 주의로 본다.
# ⚠️ 경계값(1개/2개)은 검증된 기준이 아니라 경험적으로 끊은 값이다.
INSPECTION_WARN_COUNT = 2


def find_comparables(rows: list[dict], subject_coord: tuple[float, float], area: float,
                      floor: int | None, build_year: str | None, radius_m: float,
                      year_min: int, this_year: int, gu_filter: str | None,
                      amount_field: str = "dealAmount",
                      area_tolerance_pct: float = 0.15, build_year_tolerance: int = 4,
                      this_month: int | None = None,
                      monthly_trend_rate: float | None = None,
                      subject_building: tuple | None = None,
                      first_floor_ratio: float = 1.0) -> list[dict]:
    """CLAUDE.md 5절 규칙: 실제 반경(기본 400m) 안의 유사면적 매물만 비교 대상으로
    삼고, 거리·면적·층·준공년도 종합 유사도(`similarity_score()`)와 계약
    시점 최근성(`weight_for_recency()`)으로 가중치를 준다.

    빌라/다세대는 한 건물에 보통 3~4세대뿐이라 "동일건물" 비교는 표본이 거의
    항상 부족하다. 그래서 실제 중개업소·투자자들처럼 "실제 반경 안 + 비슷한
    면적 + 비슷한 층 + 비슷한 연식"을 기준으로 삼는다. 건물명이 같은지는 더
    이상 필터링에 쓰지 않는다.

    `_weight` = `weight_for_recency()`(계약월이 최근일수록 큼) ×
    `similarity_score()`를 세제곱해서 0~1로 눌러 강조한 값(유사도가 높을수록
    비교거래 반영 비중이 훨씬 커짐) — 예전엔 "연도가중치 × 거리가중치 ×
    층가중치"를 각각 곱하는 방식이었는데, 사용자가 "실거래 추세는 최근
    거래에 더 큰 가중치를, 비교물건 유사도는 0~100점으로 매겨서 고득점을
    훨씬 크게 반영해달라"고 요청해서 이 방식으로 바꿨다. 각 비교거래의
    유사도 점수는 `_similarity_score`(0~100)에 그대로 남겨둔다.

    amount_field: 금액 필드명. 매매 행은 "dealAmount", 전세 행은 "deposit"
    (CLAUDE.md 16절 — 예상 전세가도 같은 로직으로 계산한다).

    area_tolerance_pct/build_year_tolerance: 면적/준공년도 허용범위(기본
    ±15%/±4년) — CLI `--area-tolerance`/`--build-year-tolerance`, 웹 폼
    "상세 옵션"으로 사용자가 직접 조정할 수 있다(5절).

    monthly_trend_rate: CLAUDE.md 7-2절 시계열 가격보정 — 15절 가격 추이로
    추정한 월평균 변동률을 주면, 오래된 거래일수록 `time_correction_factor()`로
    "지금 시세 수준으로 보정"한 값을 `_amount_man_adjusted`에 따로 저장한다
    (원본 `_amount_man`은 그대로 둬서 "핵심 비교거래" 목록엔 실제 체결가가
    표시된다 — 계산에만 보정값을 쓴다). None이면(기본값) 보정을 적용하지
    않는다.

    지오코딩(카카오 API 호출)이 후보 하나마다 순차 네트워크 왕복이라 후보가
    많은 구(garbage 400건대도 흔함)는 그것만으로 몇 분씩 걸려 웹 서버
    타임아웃을 넘긴다 — 그래서 비-네트워크 필터(면적/연식/구)를 먼저 다
    통과한 후보만 모아서 병렬로 지오코딩한다(MAX_GEOCODE_CANDIDATES로 상한도
    둔다).
    """
    # 54절 — 전용면적 0/음수는 ZeroDivisionError로 터진다(면적 차이를 % 로
    # 재기 때문). 웹은 폼에서 막지만 CLI·백테스트·다른 호출부는 안 막으므로,
    # 여기서 **무슨 값이 잘못됐는지 말하는 예외**로 바꿔 둔다.
    if not area or area <= 0:
        raise ValueError(f"전용면적은 0보다 커야 합니다 (받은 값: {area!r})")

    from geocode import geocode, haversine_m
    from lawd_lookup import full_address, gu_name

    if this_month is None:
        this_month = datetime.now().month  # 명시적으로 안 넘겨주면 실행 시점 기준으로 폴백

    candidates = []
    for r in rows:
        try:
            deal_year = int(r.get("dealYear", "0"))
        except ValueError:
            continue
        if deal_year < year_min:
            continue  # 연도 제한 규칙 — 기준연도 이전 거래는 매도가 계산에서 제외
        if r.get("cdealType", "").strip() == "해제":
            continue  # 해제된 거래 제외

        try:
            row_area = float(r.get("excluUseAr", "nan"))
            amount = to_amount_man(r.get(amount_field, ""))
        except (ValueError, TypeError):
            continue
        if amount != amount or not row_area:
            continue
        if abs(row_area - area) / area > area_tolerance_pct:
            continue  # 반경 안이라도 면적이 많이 다르면 비교 대상에서 제외

        row_build_year = r.get("buildYear", "").strip()
        if build_year is not None and row_build_year.isdigit():
            if abs(int(row_build_year) - int(build_year)) > build_year_tolerance:
                continue  # 준공년도 허용범위를 벗어나면 비교 대상에서 아예 제외

        if gu_filter and gu_name(r.get("sggCd", "")) != gu_filter:
            continue  # 다른 구는 400m 반경에 들 일이 사실상 없어 지오코딩을 아낀다

        addr = full_address(r)
        if not addr:
            continue

        candidates.append((r, addr, amount))

    if len(candidates) > MAX_GEOCODE_CANDIDATES:
        candidates = candidates[:MAX_GEOCODE_CANDIDATES]

    subject_lat, subject_lon = subject_coord

    def _geocode_one(item):
        r, addr, amount = item
        return r, amount, geocode(addr)

    out = []
    with ThreadPoolExecutor(max_workers=GEOCODE_WORKERS) as executor:
        for r, amount, coord in executor.map(_geocode_one, candidates):
            if coord is None:
                continue
            distance = haversine_m(subject_lat, subject_lon, coord[0], coord[1])
            if distance > radius_m:
                continue

            row_floor = None
            try:
                row_floor = int(r.get("floor", "").strip())
            except (ValueError, AttributeError):
                pass

            subject_is_basement = floor is not None and floor <= 0
            row_is_basement = row_floor is not None and row_floor <= 0
            # ⚠️ **양방향으로** 막는다. 예전엔 `row_is_basement and not
            #    subject_is_basement`라 한쪽만 걸렸다 — 대상이 지상층이면
            #    반지하를 빼줬지만, **대상이 반지하일 때 지상층 거래가 그대로
            #    섞여 들어왔다.** 반지하는 지상층의 절반 수준이라 매도가가
            #    두 배 가까이 부풀었다(실측: 반지하 4건 평균 오차 42.6%,
            #    편향 +32.6%, 최악 +94.8%). 5절 원문이 말하는 "반지하끼리는
            #    정상 비교"가 곧 대칭 조건인데 코드가 절반만 구현돼 있었다.
            #    자세한 건 CLAUDE.md 48-4절.
            if row_is_basement != subject_is_basement:
                continue  # 반지하↔지상층은 가격대가 크게 달라 서로 비교하지 않는다

            row_area = float(r.get("excluUseAr"))  # 첫 번째 루프에서 이미 유효성 검증됨
            row_build_year = r.get("buildYear", "").strip()
            score = similarity_score(
                distance_m=distance, radius_m=radius_m,
                area=row_area, subject_area=area, area_tolerance_pct=area_tolerance_pct,
                floor=row_floor, subject_floor=floor,
                build_year=int(row_build_year) if row_build_year.isdigit() else None,
                subject_build_year=int(build_year) if build_year is not None else None,
                build_year_tolerance=build_year_tolerance,
            )
            recency_weight = weight_for_recency(r.get("dealYear"), r.get("dealMonth"), this_year, this_month)
            dealing_gbn = normalize_dealing_gbn(r.get("dealingGbn"))
            dealing_weight = DEALING_TYPE_WEIGHT.get(dealing_gbn, DEALING_TYPE_WEIGHT_DEFAULT)

            # rows의 원본 dict를 직접 고치지 않고 복사본에 써넣는다 — find_comparables()는
            # 같은 rows를 다른 조건(예: 30절 유동성 점수가 floor/build_year 없이 더 넓은
            # 반경으로 다시 호출)으로 여러 번 호출될 수 있는데, 원본을 직접 고치면 먼저 만든
            # filtered 리스트의 _distance_m/_weight/_similarity_score가 나중 호출로 덮어써지는
            # 버그가 생긴다(실제로 겪었다 — 30절 유동성 계산 후 "핵심 비교거래"에 찍히는
            # 유사도 점수가 엉뚱하게 바뀌어 있었다).
            r = dict(r)
            r["_distance_m"] = distance
            r["_amount_man"] = amount
            r["_lat"], r["_lon"] = coord
            r["_similarity_score"] = score
            r["_dealing_gbn"] = dealing_gbn
            r["_weight"] = recency_weight * SIMILARITY_EMPHASIS_CURVE(score) * dealing_weight
            # 51-1절 — 같은 건물인지는 **지번으로 판별**한다. 좌표 20m는
            # 대상 물건의 지번을 모를 때만 쓰는 폴백이다: 빌라 밀집지에서는
            # 바로 옆 동도 20m 안에 들어와서 **남의 건물을 같은 건물로
            # 잘못 잡는다**(설계 결함이었다).
            if subject_building is not None:
                is_same = building_identity(r.get("umdNm"), r.get("jibun")) == subject_building
            else:
                is_same = distance <= SAME_BUILDING_DISTANCE_M
            if is_same:
                # ⚠️ 보너스는 여기서 바로 곱하지 않는다 — **몇 건인지 다 세고 난 뒤**
                #    아래에서 한꺼번에 적용한다(51절). 한 건뿐이면 "건물 시세"가
                #    아니라 "그 한 호실 가격"이라 보너스를 주지 않는다.
                r["_same_building"] = True
            if monthly_trend_rate is not None:
                factor = time_correction_factor(r.get("dealYear"), r.get("dealMonth"),
                                                 this_year, this_month, monthly_trend_rate)
                r["_amount_man_adjusted"] = amount * factor
                r["_time_correction_factor"] = factor

            # 64절 — 1층 ↔ 지상 중간층의 가격대 차이를 메운다.
            # ⚠️ 7-2절과 **같은 `_amount_man_adjusted` 필드를 쓰되 곱해서 얹는다**
            #    (7-2절이 다시 켜져도 두 보정이 서로를 덮어쓰지 않는다).
            # ⚠️ 원래 `_amount_man`(실제 체결가)은 절대 안 건드린다 — "핵심
            #    비교거래" 목록에는 항상 신고된 금액 그대로 떠야 한다.
            floor_factor = first_floor_price_factor(row_floor, floor, first_floor_ratio)
            if floor_factor != 1.0:
                r["_amount_man_adjusted"] = r.get("_amount_man_adjusted", amount) * floor_factor
                r["_first_floor_factor"] = floor_factor
            out.append(r)

    # 51절 — 동일건물 보너스는 **같은 건물 거래가 2건 이상일 때만** 준다.
    # 한 건뿐이면 그건 "이 건물의 시세"가 아니라 "그 한 호실이 받은 값"이라,
    # 대표성이 없어도 견제할 거래가 없어 그대로 끌려간다(실측: 같은 건물
    # 0건 14.5% · **1건 18.9%** · 2~3건 11.0% · 4건 이상 3.1% — 정보를 더
    # 줬는데 오히려 나빠지는 구간이 있었다). 보너스를 안 줘도 그 거래는
    # 거리 0m라 유사도 거리 점수를 이미 만점으로 받는다 — 버리는 게 아니라
    # **이중으로 세지 않는** 것뿐이다.
    same_building_rows = [r for r in out if r.get("_same_building")]
    if len(same_building_rows) >= SAME_BUILDING_MIN_COUNT:
        for r in same_building_rows:
            r["_weight"] *= SAME_BUILDING_BONUS

    # 평당가(㎡당가) 기준 이상치 다운웨이트 — 같은 반경·면적대인데 가격이
    # 유독 튀는 거래(특수관계자 거래, 입력 오류 등)가 가중 중앙값을 왜곡하지
    # 않도록, median ± 3×MAD 밖인 거래는 가중치를 크게 낮춘다(제외는 아님).
    # 시계열 보정(_amount_man_adjusted)이 적용된 경우 그 값으로 이상치를
    # 판단한다 — 그래야 "오래돼서 싼" 거래가 "실제로 비정상적으로 싼" 거래와
    # 헷갈리지 않는다.
    price_per_sqm = []
    for r in out:
        try:
            row_area = float(r.get("excluUseAr"))
        except (TypeError, ValueError):
            continue
        if row_area > 0:
            amount_for_outlier_check = r.get("_amount_man_adjusted", r["_amount_man"])
            price_per_sqm.append((r, amount_for_outlier_check / row_area))

    if len(price_per_sqm) >= PRICE_OUTLIER_MIN_SAMPLE:
        pps_values = [pps for _, pps in price_per_sqm]
        median_pps = statistics.median(pps_values)
        mad = statistics.median([abs(pps - median_pps) for pps in pps_values])
        if mad > 0:
            threshold = PRICE_OUTLIER_MAD_MULTIPLIER * mad
            for r, pps in price_per_sqm:
                if abs(pps - median_pps) > threshold:
                    r["_weight"] *= PRICE_OUTLIER_WEIGHT
                    r["_price_outlier"] = True

    out.sort(key=lambda r: r["_distance_m"])
    return out


# 적응형 반경(5절 확장) — 사용자가 지정한(또는 기본 400m) 반경에서 유효 비교거래가
# 너무 적으면 이 단계들을 따라 단계적으로 넓혀본다. 사용자가 지정한 반경보다
# 좁게는 절대 시도하지 않는다(사용자 설정을 최소값으로 존중).
ADAPTIVE_RADIUS_STEPS_M = (200, 300, 400, 600, 800, 1000)
ADAPTIVE_RADIUS_MIN_COMPARABLES = 7


def find_comparables_adaptive(rows: list[dict], subject_coord: tuple[float, float], area: float,
                               floor: int | None, build_year: str | None, base_radius_m: float,
                               year_min: int, this_year: int, gu_filter: str | None,
                               **kwargs) -> tuple[list[dict], float, bool]:
    """⛔ **지금은 어디서도 호출하지 않는다(사용자 요청으로 껐다).** CLI·웹
    둘 다 지정한 반경 그대로 `find_comparables()`를 부른다 — "400m로 잡았으면
    400m 안에서만 보고 싶다"는 판단이다. 반경이 조용히 600·800m로 바뀌면
    화면의 "반경 Nm"와 머릿속 기준이 어긋나고, 멀리 있는 다른 생활권 거래가
    표본에 섞여 들어온다(가중치가 낮아질 뿐 빠지지는 않는다). 표본이 부족하면
    사용자가 직접 `--radius`(웹은 상세 옵션)를 올리면 된다.

    7-2절 시계열 보정과 같은 처리로 함수와 단위 테스트는 그대로 남겨 뒀다 —
    되살리려면 호출부를 이 함수로 바꾸고 `radius_expanded` 안내 문구를 다시
    붙이면 된다.

    ── 아래는 껐을 당시의 동작 설명이다(되살릴 때 참고) ──

    CLAUDE.md 5절 확장 — 고정 반경 하나만 보면 동네마다 표본 편차가 크다
    (어떤 동네는 400m 안에 15건, 어떤 동네는 2건뿐). 그래서 사용자가 지정한
    반경에서 먼저 찾아보고, `ADAPTIVE_RADIUS_MIN_COMPARABLES`(기본 7)건보다
    적으면 `ADAPTIVE_RADIUS_STEPS_M`을 따라 그보다 넓은 단계로만 다시 찾는다.
    거리가 멀어질수록 `similarity_score()`의 거리 점수가 자동으로 낮아지므로
    "억지로 먼 거래를 가깝게 취급"하는 문제는 생기지 않는다 — 단지 표본을
    좀 더 확보할 뿐이다. 매 단계 `find_comparables()`를 새로 호출하지만
    지오코딩 결과가 `data/geocode_cache.json`에 캐시돼 있어 재호출 비용이
    크지 않다(30절 유동성 계산이 이미 같은 방식을 쓰고 있다).

    반환값: (비교거래 리스트, 실제 사용된 반경(m), 반경을 확대했는지 여부)."""
    result = find_comparables(rows, subject_coord, area, floor, build_year, base_radius_m,
                               year_min, this_year, gu_filter, **kwargs)
    if len(result) >= ADAPTIVE_RADIUS_MIN_COMPARABLES:
        return result, base_radius_m, False

    best, best_radius = result, base_radius_m
    for step in ADAPTIVE_RADIUS_STEPS_M:
        if step <= base_radius_m:
            continue
        widened = find_comparables(rows, subject_coord, area, floor, build_year, step,
                                    year_min, this_year, gu_filter, **kwargs)
        best, best_radius = widened, step
        if len(widened) >= ADAPTIVE_RADIUS_MIN_COMPARABLES:
            break
    return best, best_radius, best_radius != base_radius_m


def normalize_dealing_gbn(raw) -> str | None:
    """실거래 응답의 거래유형(`dealingGbn`) 표기를 "중개거래"/"직거래"로 정규화한다.

    ⚠️ 5절에 적어둔 대로 **실제 응답 문자열을 실측 샘플로 확인하지 못했다.**
    그래서 완전 일치(`==`)로만 보면, 앞뒤에 공백이나 부가 표기가 섞여 오는
    순간 모든 거래가 조용히 "알 수 없음"으로 떨어져 5절 다운웨이트도
    8-1-1절 다이아몬드 표시도 통째로 작동하지 않게 된다 — 그 상태를 화면
    으로는 알아챌 수 없다는 게 특히 나쁘다. 그래서 포함 여부로 느슨하게
    판정한다. 둘 다 아니면 `None`을 돌려주고, 호출부는 5절 원칙대로
    중개거래와 동일하게(감점 없이) 다룬다."""
    text = (raw or "").strip()
    if not text:
        return None
    if "직거래" in text:
        return "직거래"
    if "중개" in text:
        return "중개거래"
    return None


def weight_for_recency(deal_year: str, deal_month: str, this_year: int, this_month: int) -> float:
    """CLAUDE.md 7절(개정) — 계약 시점 가중치를 연 단위가 아니라 **월 단위**로
    더 세밀하게 나눈다.

    이전엔 "올해 계약=1.5 / 작년 계약=1.0 / 그 이전=0.3"으로 연 단위로만
    나눴다 — 이러면 "올해 1월 거래"와 "올해 12월 거래"가 똑같이 취급되고,
    "작년 1월"과 "작년 12월"도 똑같이 취급된다는 문제가 있었다. 특히
    가격이 떨어지는 동네에서는 "작년 초의 고가 거래"가 최근 거래와 동일한
    가중치를 받아 매도가가 과대평가될 수 있다는 지적을 반영해, 계약월
    기준 "몇 개월 전 거래인지"로 다시 나눴다:
    - 최근 3개월 이내: 1.6
    - 4~12개월 전: 1.0
    - 13개월 이상 전: 0.4

    ⚠️ 이 배율(1.6/1.0/0.4)은 "최근 3개월 50% + 4~12개월 30% + 전년도 20%"
    라는 사용자 요청을 참고해서 상대적 비중을 정한 경험적 값이다 —
    통계적으로 도출한 값이 아니다. 실제로 각 구간에 거래가 몇 건씩
    있느냐에 따라 최종 반영 비중은 달라진다(예: 최근 3개월 거래가 원래
    적은 동네라면 배율을 아무리 높여도 실제 영향력은 그만큼 못 나온다).
    """
    try:
        y, m = int(deal_year), int(deal_month)
    except (TypeError, ValueError):
        return 0.5
    months_ago = (this_year - y) * 12 + (this_month - m)
    if months_ago < 0:
        months_ago = 0  # 미래 계약월(데이터 이상치) 방어 — 최신 취급
    if months_ago <= 3:
        return 1.6
    if months_ago <= 12:
        return 1.0
    return 0.4  # 13개월 이상 전 — 4절 연도 필터를 이미 통과한 거래만 여기 온다


# 유사도 점수(0~100)를 최종 가중치로 바꿀 때 쓰는 강조 곡선. score/100의
# 세제곱을 쓰면 90점은 0.729, 60점은 0.216이 되어(약 3.4배 차이) 고득점
# 거래가 저득점 거래보다 "훨씬 크게" 반영된다 — 사용자가 요청한 "90점짜리를
# 60점짜리보다 훨씬 크게 반영"을 만족하는 지수. 3은 임의로 고른 경험적
# 값이고, 더 강하게/약하게 강조하고 싶으면 이 지수만 바꾸면 된다.
SIMILARITY_EMPHASIS_POWER = 3


# CLAUDE.md 64절 — 1층은 지상층 중에서도 값이 따로 논다(사생활·보안·채광).
# ⚠️ 7절 층 점수는 **층 번호 차이만** 본다: `diff <= 1`이면 만점이라 1층과 2층이
#    똑같이 취급됐다. 그래서 1층 물건을 2·3층 거래로 계산하면 그대로 과대평가되고,
#    반대로 2·3층 물건에 1층 거래가 섞이면 과소평가된다.
#    실측(백테스트 74건)에 그 양쪽이 다 찍혀 있었다 — 1층 대상 편향 **+7.0%**,
#    2~3층 대상 편향 **−2.7%**(차이 +9.7%p, 95%CI [+0.4, +19.9]). 면적·연식을
#    통제한 회귀에서도 1층 효과가 +8.2%p로 남았다.
#
# ⚠️ **계수를 실측 점추정치(9%)로 잡지 않았다.** 신뢰구간이 넓어(진짜 값이 2%일
#    수도 18%일 수도 있다) 민감도 분석으로 "틀렸을 때 얼마나 나빠지나"를 봤다:
#      적용 없음 → 최악 편향 13.9% · 평균 5.5%
#      3% → 10.9% / 4.1%   5% → 7.9% / 3.6%
#      **7% → 6.3% / 3.3%  ← 최악·평균 둘 다 최소**
#      9% → 6.4% / 3.5%
#    진짜 할인이 **아예 없더라도** 7% 보정 쪽이 지금보다 편향이 작다.
FIRST_FLOOR_PRICE_RATIO = 0.93


def first_floor_price_factor(row_floor: int | None, subject_floor: int | None,
                              ratio: float = FIRST_FLOOR_PRICE_RATIO) -> float:
    """비교거래 가격을 "대상 물건의 층대였다면 얼마"로 환산하는 배율 (64절).

    ⚠️ `ratio`가 1.0이면 아무것도 하지 않는다 — `find_comparables()`의
    `first_floor_ratio` 기본값이 1.0이라, **매매 호출부가 명시적으로 켤 때만**
    보정이 걸린다. 16절 전세·23-1절 전환율이 매매 실거래로만 잰 이 계수를
    실수로 물려받는 걸 막기 위해서다(48-2절 `SALE_CALIBRATION_FACTOR`와 같은 보호).

    ⚠️ 반지하(층 0 이하)에는 적용하지 않는다 — 5절이 이미 반지하↔지상층을
    **양방향으로 하드 제외**하므로 여기까지 오면 둘 다 반지하이거나 둘 다
    지상층이고, 반지하끼리는 이 보정이 의미가 없다.
    """
    if ratio == 1.0:
        return 1.0
    if row_floor is None or subject_floor is None:
        return 1.0
    if row_floor <= 0 or subject_floor <= 0:
        return 1.0
    row_is_first = row_floor == 1
    subject_is_first = subject_floor == 1
    if row_is_first == subject_is_first:
        return 1.0
    # 대상이 1층이면 지상 중간층 거래를 1층 값으로 낮추고, 반대면 올린다.
    return ratio if subject_is_first else 1.0 / ratio


def SIMILARITY_EMPHASIS_CURVE(score: float) -> float:
    return (score / 100) ** SIMILARITY_EMPHASIS_POWER


def similarity_score(distance_m: float, radius_m: float,
                      area: float, subject_area: float, area_tolerance_pct: float,
                      floor: int | None, subject_floor: int | None,
                      build_year: int | None, subject_build_year: int | None,
                      build_year_tolerance: int) -> float:
    """CLAUDE.md 7절(개정) — 비교거래 하나가 대상 물건과 얼마나 비슷한지를
    거리·면적·층·준공년도 네 가지로 0~100점 종합 점수를 매긴다.

    ⚠️ 사용자가 원래 요청한 건 "거리+면적+준공연도+역거리+층+엘리베이터+
    주차+방/욕실+방향" 9개 요소였다. 이 중 지금 실제로 계산에 넣을 수
    있는 건 **거리·면적·층·준공년도 네 가지뿐**이다 — 나머지는 이 프로젝트가
    쓰는 데이터 소스로는 비교거래(과거 실거래) 단위로 구할 방법이 없다:
    - **역거리**: 26절 역세권 프리미엄처럼 비교거래마다 카카오 키워드 검색을
      추가로 호출해야 해서 비용 문제로 기본 점수에는 안 넣었다(추후 26절처럼
      옵션으로 켤 수 있게 확장 가능 — 지금은 안 함).
    - **엘리베이터**: 20절 건축물대장 조회로 얻을 수는 있지만, 대상 물건
      하나가 아니라 비교거래 수십 건마다 추가로 호출해야 해서 API
      호출량이 급격히 늘어난다(현재는 대상 물건 하나에만 쓴다).
    - **주차/방개수/욕실개수/방향**: 국토부 실거래가(과거 체결 기록)에는
      애초에 이 필드 자체가 없다 — 18절에서 방 개수를 "현재 매물" 붙여넣기
      텍스트로만 근사하는 것과 같은 이유다. 과거에 팔린 물건의 방향·주차
      대수 같은 정보는 공개된 어떤 데이터로도 구할 수 없다.

    그래서 지금은 구할 수 있는 네 요소로만 점수를 매기고, 가중치는
    거리 35% · 면적 30% · 층 20% · 준공년도 15%로 뒀다(경험적 배분 —
    검증된 공식이 아니다). 준공년도 정보가 없으면(대상 물건 준공년도를
    모르거나 비교거래에 buildYear가 없으면) 그 15%를 나머지 세 요소에
    비례 배분한다.

    각 하위 점수(0~100):
    - 거리 점수 = 100 × max(0, 1 − 거리/반경) — 반경 경계에서 0에 가까워짐.
    - 면적 점수 = 100 × max(0, 1 − |면적차이%| / 허용범위%) — 5절 하드
      필터를 이미 통과했으므로 허용범위 안에서만 움직인다.
    - 층 점수 = 층 차이가 0~1이면 100, 그 뒤로는 차이 1당 20점씩 깎고
      최저 20점(대상 물건 층을 모르면 5절처럼 필터링만 안 할 뿐 점수는
      중립값 60으로 둔다).
    - 준공년도 점수 = 100 × max(0, 1 − |연식차이| / 허용범위) — 마찬가지로
      5절 하드 필터를 이미 통과했으므로 허용범위 안에서만 움직인다.
    """
    distance_score = 100 * max(0.0, 1 - distance_m / radius_m) if radius_m else 100.0

    area_diff_pct = abs(area - subject_area) / subject_area * 100 if subject_area else 0
    area_score = 100 * max(0.0, 1 - area_diff_pct / (area_tolerance_pct * 100)) if area_tolerance_pct else 100.0

    if subject_floor is not None and floor is not None:
        diff = abs(floor - subject_floor)
        floor_score = 100.0 if diff <= 1 else max(20.0, 100 - (diff - 1) * 20)
    else:
        floor_score = 60.0  # 층 정보를 모르면 중립값(예전 7절의 0.6 배율과 같은 취지)

    have_build_year = subject_build_year is not None and build_year is not None
    if have_build_year and build_year_tolerance:
        build_year_score = 100 * max(0.0, 1 - abs(build_year - subject_build_year) / build_year_tolerance)
    else:
        build_year_score = None

    if have_build_year:
        weights = {"distance": 0.35, "area": 0.30, "floor": 0.20, "build_year": 0.15}
        scores = {"distance": distance_score, "area": area_score, "floor": floor_score,
                  "build_year": build_year_score}
    else:
        # 준공년도 정보가 없으면 그 몫(15%)을 나머지 세 요소에 비례 배분한다
        base = {"distance": 0.35, "area": 0.30, "floor": 0.20}
        total = sum(base.values())
        weights = {k: v / total for k, v in base.items()}
        scores = {"distance": distance_score, "area": area_score, "floor": floor_score}

    return sum(scores[k] * weights[k] for k in weights)


PYEONG_PER_SQM = 1 / 3.3058  # listing_parser.py와 같은 환산 계수(평 = ㎡ × 이 값)


def estimate_building_top_floors(rows: list[dict]) -> dict[tuple[str, str], int]:
    """CLAUDE.md 5절 "핵심 비교거래" 층 표시 확장 — 같은 지번(umdNm+jibun,
    사실상 같은 건물)으로 묶은 전체 실거래 기록(rows, 필터링 전 원본) 안에서
    "지금까지 거래된 기록 중 가장 높은 층"을 추정한다.

    ⚠️ 이건 **추정치**다 — 건축물대장 실제 총 층수(20절)를 매 비교거래마다
    조회하면 정확하겠지만, 7절에서 이미 "비교거래 수십 건마다 추가로
    건축물대장을 호출하면 API 호출량이 급격히 는다"는 이유로 엘리베이터
    정보를 포기한 것과 같은 이유로 하지 않는다. 대신 이미 갖고 있는 MOLIT
    데이터만으로 근사한다 — 진짜 탑층이 우리가 가진 기간 동안 한 번도 안
    팔렸다면 놓칠 수 있다는 한계가 있다.

    한 건물에 서로 다른 층이 2개 이상 관측돼야만 포함한다 — 거래가 1건뿐인
    건물은 "관측된 최고층"이라는 말 자체가 의미가 없다(그 1건이 진짜
    최고층인지 알 방법이 없다)."""
    floors_by_building: dict[tuple[str, str], set[int]] = {}
    for r in rows:
        umd = (r.get("umdNm") or "").strip()
        jibun = (r.get("jibun") or "").strip()
        if not umd or not jibun:
            continue
        try:
            floor = int((r.get("floor") or "").strip())
        except (TypeError, ValueError):
            continue
        if floor <= 0:
            continue
        floors_by_building.setdefault((umd, jibun), set()).add(floor)
    return {key: max(floors) for key, floors in floors_by_building.items() if len(floors) >= 2}


def is_estimated_top_floor(row: dict, top_floor_map: dict[tuple[str, str], int]) -> bool:
    """`estimate_building_top_floors()`가 만든 지도로 이 거래가 관측된
    최고층인지만 불리언으로 돌려준다 — 웹 템플릿에서 "N층"과 "(탑층 추정)"을
    따로 렌더링(줄바꿈 등)하고 싶을 때 쓴다. CLI는 `format_floor_label()`의
    합쳐진 문자열을 그대로 쓴다."""
    floor_raw = (row.get("floor") or "").strip()
    try:
        floor = int(floor_raw)
    except ValueError:
        return False
    if floor <= 0:
        return False
    key = ((row.get("umdNm") or "").strip(), (row.get("jibun") or "").strip())
    return top_floor_map.get(key) == floor


def format_floor_label(row: dict, top_floor_map: dict[tuple[str, str], int]) -> str:
    """CLAUDE.md 5절 — CLI "핵심 비교거래" 층 열에 쓰는 표시용 문자열. 대상
    건물에서 관측된 최고층과 같으면 "(탑층 추정)"을 붙인다."""
    floor_raw = (row.get("floor") or "").strip()
    if not floor_raw:
        return "층정보없음"
    try:
        floor = int(floor_raw)
    except ValueError:
        return "층정보없음"
    if floor <= 0:
        return f"{floor}층"
    if is_estimated_top_floor(row, top_floor_map):
        return f"{floor}층(탑층 추정)"
    return f"{floor}층"


def describe_comparable_similarity(subject_area: float, subject_floor: int | None,
                                    subject_build_year: str | None, row: dict) -> str:
    """비교거래 하나의 정보를 짧게 요약한다 — "핵심 비교거래" 목록에 물건마다
    붙여서, 표를 따로 안 보고 이 한 줄만 봐도 어떤 물건인지 감이 오게 한다.

    ⚠️ **이 절은 개정됐다.** 원래는 대상 물건과의 차이(면적 ±N%·층 ±N·
    준공 N년 신축/구축)와 층 선호순위·탑층 주의 같은 부가 판단까지 얹었는데,
    사용자가 실제 화면을 보고 "이해하기 너무 어렵다"고 지적해서 전부 걷어내고
    **절대값 정보 세 가지**(면적/㎡+평, 층, 준공년도)만 단순하게 보여주는
    방식으로 되돌렸다. 비교거래가 대상 물건과 얼마나 비슷한지는 이미 같은
    행의 "유사도" 점수와 거리로 충분히 드러나므로, 여기서는 그 판단을 다시
    설명하려 하지 않고 그냥 "이 물건이 뭔지"만 빠르게 읽히게 한다."""
    parts = []

    row_area = row.get("excluUseAr")
    try:
        row_area = float(row_area)
        pyeong = row_area * PYEONG_PER_SQM
        parts.append(f"{row_area:.1f}㎡({pyeong:.1f}평)")
    except (TypeError, ValueError):
        parts.append("면적 정보없음")

    row_floor_raw = (row.get("floor") or "").strip()
    if row_floor_raw:
        try:
            row_floor = int(row_floor_raw)
            parts.append("반지하" if row_floor <= 0 else f"{row_floor}층")
        except ValueError:
            parts.append("층 정보없음")
    else:
        parts.append("층 정보없음")

    row_build_year = (row.get("buildYear") or "").strip()
    parts.append(f"{row_build_year}년식" if row_build_year.isdigit() else "준공년도 정보없음")

    return " · ".join(parts)


def normalize_jibun(jibun) -> tuple[bool, int, int] | None:
    """지번 문자열 → (산 여부, 본번, 부번). 못 읽으면 `None`.

    `'123-4'` / `'산 123-4'` / `'0123-0004'` / `'123'` 을 모두 같은 형태로
    맞춘다 — 5절이 애초에 지번 문자열 비교를 포기했던 이유가 이 표기 흔들림
    이었는데, 숫자만 뽑아 정수로 만들면 안정적으로 잡힌다.
    """
    if not jibun:
        return None
    text = str(jibun)
    nums = re.findall(r"\d+", text)
    if not nums:
        return None
    # ⚠️ '산'은 **다른 필지다** — '산 123-4'와 '123-4'를 같은 건물로 보면 안 된다.
    return ("산" in text, int(nums[0]), int(nums[1]) if len(nums) > 1 else 0)


def building_identity(dong, jibun) -> tuple | None:
    """실거래 행 하나의 건물 신원 = (동 이름, 산 여부, 본번, 부번).

    ⚠️ **동 이름을 반드시 같이 넣는다** — 지번 번호는 동마다 반복된다.
    """
    j = normalize_jibun(jibun)
    if not j or not dong:
        return None
    return (str(dong).strip(), *j)


def building_identity_parts(dong, main_no, sub_no, is_mountain=False) -> tuple | None:
    """대상 물건용 — 카카오 지오코딩이 준 본번/부번으로 같은 신원을 만든다
    (`geocode_full()`의 `main_no`/`sub_no`/`is_mountain`)."""
    if not dong:
        return None
    try:
        main = int(str(main_no).strip() or 0)
        sub = int(str(sub_no).strip() or 0)
    except (TypeError, ValueError):
        return None
    if main <= 0:
        return None
    return (str(dong).strip(), bool(is_mountain), main, sub)


def weighted_quantile(pairs: list[tuple[float, float]], q: float) -> float | None:
    """(값, 가중치) 목록의 q(0~1) 분위수. 값이 없으면 `None`.

    ⚠️ **예전엔 가중치만큼 값을 복제한 리스트의 중앙값**으로 근사했다
    (`_replication_count()`). 동작은 했지만 두 가지가 나빴다:
      1. 가중치를 정수로 양자화한다 — 배율을 살리려고 100을 곱해야 했고,
         **그 배율을 빠뜨린 탓에 모든 가중치가 1표로 뭉개지는 버그를 실제로
         겪었다**(7절 버그 이력). 이 방식에는 그 실수가 존재할 수 없다.
      2. 비교거래 40건이면 리스트가 4천 개로 불어난다.

    누적가중치에 **중점 규칙**(각 점의 대표 위치 = 누적 − 자기 가중치/2)을
    쓰고 점 사이를 선형보간한다 — 가중치가 전부 같으면 통상적인 백분위수와
    일치한다.
    """
    pts = sorted((v, w) for v, w in pairs if w and w > 0)
    if not pts:
        return None
    total = sum(w for _, w in pts)
    if total <= 0:
        return None
    xs, ps, acc = [], [], 0.0
    for v, w in pts:
        acc += w
        xs.append(v)
        ps.append((acc - w / 2) / total)
    if q <= ps[0]:
        return xs[0]
    if q >= ps[-1]:
        return xs[-1]
    for i in range(1, len(ps)):
        if q <= ps[i]:
            lo, hi = ps[i - 1], ps[i]
            t = 0.0 if hi == lo else (q - lo) / (hi - lo)
            return xs[i - 1] + (xs[i] - xs[i - 1]) * t
    return xs[-1]


def _weighted_amount_pairs(filtered: list[dict]) -> list[tuple[float, float]]:
    """총액 모델용 (체결가, 가중치) 쌍. 7-2절 보정값이 있으면 그쪽을 쓴다."""
    return [(r.get("_amount_man_adjusted", r["_amount_man"]), r["_weight"]) for r in filtered]


def _weighted_unit_price_pairs(filtered: list[dict],
                                subject_area: float) -> list[tuple[float, float]]:
    """7-1절 ㎡당가 모델용 (대상 면적으로 환산한 금액, 가중치) 쌍."""
    pairs = []
    for r in filtered:
        try:
            row_area = float(r.get("excluUseAr"))
        except (TypeError, ValueError):
            continue
        if row_area <= 0:
            continue
        amount = r.get("_amount_man_adjusted", r["_amount_man"])
        pairs.append((amount / row_area * subject_area, r["_weight"]))
    return pairs


def _replication_count(weight: float) -> int:
    """가중치 → 가중 중앙값 리스트에 복제할 개수(7절).

    ⛔ **더 이상 계산에 쓰이지 않는다** — `weighted_quantile()`로 대체했다
    (7-4절). 함수와 테스트는 5절 적응형 반경·7-2절 시계열 보정과 같은
    처리로 남겨 뒀다: 아래 버그 이력이 이 프로젝트에서 제일 비싼 교훈이라
    지워버리면 같은 실수를 다시 한다.

    ⚠️ 예전엔 `max(1, round(weight))`였는데, 실제 가중치가 대부분 0.05~1.6
    범위라 **1.5 미만이 전부 1개로 뭉개졌다** — 유사도 90점 최근 거래도,
    가중치를 1/10로 깎은 평당가 이상치도, 직거래 다운웨이트도 화면에만
    반영되고 계산에는 똑같이 1표씩 들어갔다(실측 확인: 유사도 50~100점 ×
    최근성 0.4~1.6 조합 18가지 중 2개가 되는 건 1.6 하나뿐). 그래서
    `WEIGHT_REPLICATION_SCALE`을 곱한 뒤 반올림해서 배율을 그대로 살린다.
    최소 1개는 유지한다 — 아주 낮은 가중치라도 "그런 거래가 있었다"는 사실
    자체는 남기는 게 5절의 "제외가 아니라 다운웨이트" 원칙에 맞다."""
    return max(1, round(weight * WEIGHT_REPLICATION_SCALE))


def _weighted_amounts_sorted(filtered: list[dict]) -> list[float]:
    """find_comparables()가 채운 _amount_man/_weight로 가중 복제 리스트를
    만들어 정렬해서 돌려준다(7절 — round(가중치)만큼, 최소 1개 복제).
    compute_scenarios()의 p25/중앙값/p75와 compute_price_tiers()의 더 세분화된
    백분위수가 이 리스트를 공유한다.

    7-2절 시계열 보정이 적용된 행은 `_amount_man_adjusted`(보정값)를 쓰고,
    없으면(보정 미적용) 원래 `_amount_man`(실제 체결가)으로 폴백한다 — 화면에
    표시되는 "핵심 비교거래" 목록은 항상 실제 체결가(`_amount_man`)를 그대로
    보여주고, 계산에만 보정값이 쓰인다."""
    amounts_weighted = []
    for r in filtered:
        amount = r.get("_amount_man_adjusted", r["_amount_man"])
        amounts_weighted.extend([amount] * _replication_count(r["_weight"]))
    return sorted(amounts_weighted)


def _weighted_unit_prices_sorted(filtered: list[dict], subject_area: float) -> list[float]:
    """CLAUDE.md 7-1절 ㎡당가 모델 — 비교거래의 평당가(만원/㎡ = _amount_man ÷
    비교거래 면적)를 대상 물건 면적(subject_area)에 곱해 "이 물건 넓이 기준으로
    환산했다면 얼마였을지" 리스트를 만들고, `_weighted_amounts_sorted()`와 같은
    방식(round(가중치)만큼 복제, 최소 1개)으로 가중 복제해서 정렬한다.

    총액 모델(`_weighted_amounts_sorted()`)은 이미 5절에서 ±허용범위로 면적을
    거른 거래들의 원 체결가를 그대로 쓰는 반면, 이 모델은 면적 차이를 한 번 더
    정규화한다 — 허용범위 안에서도 비교거래가 대상 물건보다 살짝 크거나
    작으면 총액 모델은 그 차이를 그대로 반영하지만, 이 모델은 "같은 넓이면
    얼마"로 환산해서 비교한다. `compute_scenarios()`가 두 모델을 50:50으로
    블렌딩하고, 둘이 많이 갈리면 그 자체를 불확실성 신호(model_divergence_pct)로
    쓴다."""
    amounts_weighted = []
    for r in filtered:
        try:
            row_area = float(r.get("excluUseAr"))
        except (TypeError, ValueError):
            continue
        if row_area <= 0:
            continue
        amount = r.get("_amount_man_adjusted", r["_amount_man"])  # 7-2절 시계열 보정 — 있으면 우선 사용
        unit_price = amount / row_area
        amounts_weighted.extend([unit_price * subject_area] * _replication_count(r["_weight"]))
    return sorted(amounts_weighted)


def _weighted_percentile(amounts_sorted: list[float], pct: float) -> float:
    """정렬된 가중 복제 리스트에서 pct(0~100) 위치의 값을 최근접-순위 방식으로
    뽑는다. compute_scenarios()의 p25/p75(중앙값-of-절반 방식)보다 더 세밀한
    구간을 나눠야 하는 29절 가격 구간 전략에 쓴다."""
    n = len(amounts_sorted)
    if n == 0:
        return 0.0
    idx = min(n - 1, max(0, round(pct / 100 * (n - 1))))
    return amounts_sorted[idx]


def compute_scenarios(filtered: list[dict], radius_m: float, this_year: int,
                       subject_area: float | None = None,
                       calibration: float = 1.0) -> dict:
    """CLAUDE.md 7~8절 규칙: 가중 복제 후 p25/중앙값/p75와 시세 신뢰도를 계산한다.
    매매·전세(16절) 양쪽에서 공통으로 쓴다 — find_comparables()가 이미 채워둔
    _amount_man/_weight/_distance_m을 그대로 사용한다.

    subject_area를 주면 CLAUDE.md 7-1절 ㎡당가 모델(`_weighted_unit_prices_sorted()`)을
    함께 계산해서 총액 모델(위 amounts_weighted)과 50:50으로 블렌딩한다 —
    "총액 모델 50% + 단가 모델 50%"라는 두 독립적인 계산 경로의 평균을 최종
    값으로 쓰고, 두 모델이 크게 갈리면(`model_divergence_pct`) 그 자체를
    불확실성 신호로 보고 시세 신뢰도에서 깎는다(최대 15점). subject_area를
    생략하면(기존 호출부와의 하위호환) 예전처럼 총액 모델만 쓴다.

    `calibration`은 48절 백테스트로 잡은 보정 계수다(1.0이면 보정 없음).
    ⚠️ 기본값을 1.0으로 둔 건 **전세(16절)에 실수로 매매 보정이 새어 들어가는
    걸 막기 위해서다** — 매매 호출부만 `SALE_CALIBRATION_FACTOR`를 명시적으로
    넘긴다. 세 값에 같은 배율을 곱하므로 스프레드 비율은 그대로이고, 따라서
    **시세 신뢰도 점수는 보정의 영향을 받지 않는다**."""
    # 54절 — 빈 비교거래로 부르면 나눗셈에서 터진다. 지금은 모든 호출부가
    #    앞에서 막고 있지만, 가드가 없으면 다음에 부르는 사람이 똑같이 밟는다.
    if not filtered:
        raise ValueError("비교거래가 비어 있어 매도가를 계산할 수 없습니다")

    total_pairs = _weighted_amount_pairs(filtered)

    median_total = weighted_quantile(total_pairs, 0.50)
    p25_total = weighted_quantile(total_pairs, 0.25)
    p75_total = weighted_quantile(total_pairs, 0.75)

    unit_weighted = _weighted_unit_price_pairs(filtered, subject_area) if subject_area else []
    model_divergence_pct = None
    if unit_weighted:
        median_unit = weighted_quantile(unit_weighted, 0.50)
        p25_unit = weighted_quantile(unit_weighted, 0.25)
        p75_unit = weighted_quantile(unit_weighted, 0.75)
        median_man = (median_total + median_unit) / 2
        p25 = (p25_total + p25_unit) / 2
        p75 = (p75_total + p75_unit) / 2
        if median_man:
            model_divergence_pct = abs(median_total - median_unit) / median_man * 100
    else:
        median_man, p25, p75 = median_total, p25_total, p75_total

    if calibration != 1.0:
        median_man, p25, p75 = median_man * calibration, p25 * calibration, p75 * calibration

    n_total = len(filtered)
    n_this_year = sum(1 for r in filtered if r.get("dealYear") == str(this_year))
    n_close = sum(1 for r in filtered if r["_distance_m"] <= radius_m / 2)

    spread = (p75 - p25) / median_man if median_man else 1
    confidence = 100
    confidence -= max(0, (5 - n_total)) * 10
    confidence -= max(0, (2 - n_close)) * 10
    confidence -= min(30, spread * 100)
    confidence -= max(0, (1 - (n_this_year / n_total))) * 15
    if model_divergence_pct is not None:
        confidence -= min(15, model_divergence_pct)
    confidence = max(10, min(100, round(confidence)))

    return {
        "p25": p25, "median": median_man, "p75": p75,
        "n_total": n_total, "n_close": n_close, "n_this_year": n_this_year,
        "confidence": confidence, "model_divergence_pct": model_divergence_pct,
    }


PRICE_TIER_LABELS = {
    "urgent": "초급매가", "d30": "30일 목표가", "d60": "60일 목표가",
    "normal": "일반 매도가", "test": "최고가 테스트",
}


# ── 49절 추정 경고등 ──────────────────────────────────────────────────
# ⚠️ 실측 44건(경기 빌라, 48절 백테스트)으로 잡은 **1차 기준**이다. 세 경고
#    중 하나라도 걸린 건과 안 걸린 건의 성적이 이렇게 갈렸다:
#      경고 없음 19건 → 평균 오차  6.8% · ±10% 79% · 25% 넘게 틀린 건  5%
#      경고 있음 25건 → 평균 오차 17.1% · ±10% 44% · 25% 넘게 틀린 건 20%
#    크게 틀린 7건 중 6건이 이 경고에 걸렸다(나머지 한 건은 어떤 지표로도
#    미리 못 걸렀다 — 그래서 "경고 없음"이 정확을 보장하지는 않는다).
# ⚠️ 세 기준 전부 **먼저 이유를 알고 나서 데이터로 확인한 것**이지, 숫자만
#    맞춰 고른 게 아니다(각 항목 설명 참고).
ESTIMATE_WARN_DIVERGENCE_PCT = 3.0   # 7-1절 모델 괴리율
# ⛔ 최대지분 경고는 껐다 (49-1절) — 두 표본 연속으로 재현에 실패했다.
#    되살리려면 compute_estimate_warnings()에 블록을 다시 넣으면 된다.
ESTIMATE_WARN_TOP_SHARE_PCT = 45.0   # 한 건이 전체 가중치에서 차지하는 지분

# ── 50절 정비구역(재개발) 신호 탐지 ────────────────────────────────────
# ⚠️ **프리미엄을 가격에 더하지 않는다. 있을 수 있다고 알리기만 한다.**
#    이유는 50절 참고 — 구역 경계 한 블록 차이로 0이 되고, 단계별로 0~수억까지
#    갈리는 값이라 자동 반영하면 전 물건이 과대평가된다.
REDEV_AGE_MIN = 25            # 재개발 기대는 구축에 붙는다 — 신축이 비싼 건 정상
REDEV_PRICE_RATIO = 1.8       # 구 전체 ㎡당가 중앙값 대비 몇 배부터 이상으로 볼지
REDEV_MIN_COUNT = 2           # 한 건은 우연일 수 있어 2건 이상 몰려야 신호로 본다
REDEV_MIN_BASELINE_SAMPLE = 20  # 기준선(구 중앙값)을 믿으려면 이만큼은 필요


# 토지이용계획의 "지역지구등 지정여부"에 정비사업 관련 구역이 잡히는지 보는
# 키워드 표 (50-1절). **API 응답을 받아오는 부분은 아직 없고, 이 판정만 있다** —
# 엔드포인트·필드명을 확인하지 못해 지어내지 않았다(20절/21절과 같은 원칙).
#
# ⚠️ **"지구단위계획구역"은 일부러 뺐다.** 전국에 널려 있어 신호가 되지 않는다 —
#    넣으면 거의 모든 물건에 경고가 떠서 경고 자체가 무의미해진다.
REDEV_ZONE_KEYWORDS = (
    "정비구역", "재정비촉진", "재개발", "재건축",
    "도시환경정비", "주거환경개선", "가로주택정비", "소규모주택정비",
)


def is_redevelopment_zone(zone_names) -> dict | None:
    """토지이용계획의 지역지구 목록에서 정비사업 구역을 찾는다 (50-1절).

    ⚠️ **이 함수는 네트워크를 타지 않는다.** 이미 받아온 지역지구 이름 목록을
    받아 판정만 한다 — 토지이용계획 API 스펙을 확인하면 그 응답을 여기에
    넘기기만 하면 된다.

    ⚠️ 찾았다고 **가격을 바꾸지는 않는다**(50절 결정 그대로). 다만 50절의
    "동네에 비싼 구축이 몰려 있다"는 간접 추정과 달리, 이건 **그 필지가
    구역 안인지 직접 확인**하는 것이라 훨씬 강한 근거다.
    """
    if not zone_names:
        return None
    hits = []
    for name in zone_names:
        text = (name or "").strip()
        if not text:
            continue
        for kw in REDEV_ZONE_KEYWORDS:
            if kw in text:
                hits.append(text)
                break
    if not hits:
        return None
    # 같은 이름이 여러 번 와도 한 번만 — 순서는 응답 순서를 지킨다.
    seen, unique = set(), []
    for h in hits:
        if h not in seen:
            seen.add(h)
            unique.append(h)
    return {"zones": unique, "count": len(unique)}


def _unit_price(row: dict) -> float | None:
    """㎡당가(만원). 금액이나 면적을 못 읽으면 None."""
    try:
        amount = to_amount_man(row.get("dealAmount", ""))
        area = float(row.get("excluUseAr"))
    except (TypeError, ValueError):
        return None
    if not amount or not area:
        return None
    return amount / area


def detect_redevelopment_signal(rows: list[dict], dong: str | None,
                                 this_year: int) -> dict | None:
    """같은 동에 "구축인데 유별나게 비싼" 거래가 몰려 있는지 본다 (50절).

    정비구역 빌라는 건물이 아니라 **대지지분** 값으로 팔린다. 그래서 전용면적
    대비 가격이 동네 시세의 두세 배까지 뛰는데, 국토부 실거래가에는 정비구역
    여부도 대지지분도 필드가 없어 **계산기가 원리적으로 못 맞힌다**(실측:
    광명 `한보주택` 34㎡가 6.5억 — 동네 ㎡당가 중앙값의 2.81배, 오차 −48.5%).

    ⚠️ **지오코딩을 하지 않는다** — 40절 인근 아파트 대비와 같은 이유로 같은
    법정동(`umdNm`)으로 근사한다. 추가 API 호출이 0이다.

    ⚠️ 기준선은 **구 전체** ㎡당가 중앙값이다. 동 중앙값을 쓰면 그 동이 통째로
    정비구역일 때 기준선까지 같이 올라가 신호가 사라진다.
    """
    if not dong:
        return None

    all_units = [u for u in (_unit_price(r) for r in rows) if u]
    if len(all_units) < REDEV_MIN_BASELINE_SAMPLE:
        return None
    baseline = statistics.median(all_units)
    if baseline <= 0:
        return None

    hits = []
    for r in rows:
        if (r.get("umdNm") or "").strip() != dong:
            continue
        build_year = (r.get("buildYear") or "").strip()
        if not build_year.isdigit():
            continue
        if this_year - int(build_year) < REDEV_AGE_MIN:
            continue                       # 신축이 비싼 건 정비구역 신호가 아니다
        unit = _unit_price(r)
        if unit and unit >= baseline * REDEV_PRICE_RATIO:
            hits.append({
                "name": (r.get("mhouseNm") or "").strip() or "(단지명없음)",
                "area": float(r["excluUseAr"]),
                "amount_man": to_amount_man(r.get("dealAmount", "")),
                "build_year": int(build_year),
                "ratio": round(unit / baseline, 2),
            })

    if len(hits) < REDEV_MIN_COUNT:
        return None

    hits.sort(key=lambda h: -h["ratio"])
    return {
        "dong": dong,
        "count": len(hits),
        "baseline_unit": round(baseline, 1),
        "max_ratio": hits[0]["ratio"],
        "examples": hits[:3],
    }




def top_weight_share(filtered: list[dict]) -> float | None:
    """가장 큰 비교거래 한 건이 전체 가중치에서 차지하는 지분(%).

    7절 가중 중앙값은 가중치에 비례해 표를 복제하므로, 이 값이 크면 **그 한
    건이 사실상 답을 정한다**(동일건물 보너스 2.0 × 최근성 1.6이 겹치면
    표본 3건에서 80%까지 간다 — 실측 확인)."""
    weights = [r.get("_weight") or 0 for r in filtered]
    total = sum(weights)
    return round(max(weights) / total * 100, 1) if total > 0 else None


# ── 49-2절 예측구간 ────────────────────────────────────────────────────
# "시세 신뢰도 78점"은 **실측에서 정확도를 예측하지 못했다**(49절·49-1절).
# 대신 백테스트 잔차를 그대로 구간으로 돌려준다 — 점수를 해석할 필요 없이
# "80% 확률로 1.41~1.79억"이라고 바로 읽힌다.
#
# ⚠️ **이 구간은 8절 현실적 체결가(median) 기준이다** — 백테스트가 실제
#    체결가와 비교한 값이 그것이기 때문이다. 경매용 매도가(8-2절)에 그대로
#    붙이면 근거 없는 숫자가 된다.
#
# 위험요인 세 가지를 **세기만 한다**(가중치를 새로 만들지 않는다):
PREDICTION_RISK_DIVERGENCE_PCT = 3.0    # 7-1절 두 모델 괴리율
PREDICTION_RISK_SMALL_AREA_SQM = 50.0   # 소형 — 유일하게 통계적으로 튼튼한 신호
# ⛔ `PREDICTION_RISK_SAME_BUILDING_ONE`(같은 건물 거래 1건)은 **뺐다** — 67절.
#    118건(경기 65 + 서울 53)으로 재보니 +1.1%p [−3.8, +6.8]로 0을 못 넘는다.

PREDICTION_INTERVAL_LEVEL = 80          # %

# 위험요인 개수 → ±몇 % (경기·서울 92건 실측 80% 분위수를 **올림**해서 잡았다).
# ⚠️ 표본이 칸당 26~37건뿐이라 꼬리가 과소평가되기 쉬워, 실측값보다 넓게 뒀다:
#    실측 ±9.3 / ±17.4 / ±25.0  →  아래 ±10 / ±18 / ±25
# ⚠️ 66절 — **독립 표본(서울 53건)에서 이 구간이 약속을 못 지켰다.**
# ±10/18/25%로는 적중이 50% / 58% / 76%였다(설계는 80%). "80%가 이 범위 안에서
# 팔렸다"는 화면 문구가 거짓말이 되는 방향이라, 폭을 넓혔다 — 좁아서 틀리는
# 쪽이 넓어서 싱거운 쪽보다 훨씬 해롭다(입찰가를 그만큼 잘못 쓰게 된다).
# 새 값의 실측 적중: 서울 75/79/90%(전체 83%) · 경기 74건 93%.
# ⚠️ 67절에서 위험요인을 셋 → 둘로 줄였는데 **폭은 그대로 뒀다** — 새 등급에
#    그대로 씌워도 경기 89% · 서울 83% · 합계 86%로 약속을 지킨다. 여기서 더
#    조이면(예: ±20/32/35) 서울 위험1개 칸 한 건에 맞추는 과적합이 된다.
PREDICTION_INTERVAL_PCT = {0: 20.0, 1: 30.0, 2: 35.0}
# 화면에 "비슷한 조건의 과거 물건 N건 중 80%가…"로 나가는 표본 수 —
# 67절에서 위험요인을 둘로 줄인 뒤 다시 센 값이다(경기 65 + 서울 53 = 118건).
PREDICTION_INTERVAL_SAMPLE_N = {0: 41, 1: 46, 2: 31}
PREDICTION_INTERVAL_LABEL = {
    0: "안정적인 편",
    1: "보통",
    2: "불안정 — 넓게 잡으세요",
}


def count_prediction_risks(filtered: list[dict],
                            subject_area: float | None,
                            model_divergence_pct: float | None) -> int:
    """이 추정이 흔들릴 위험요인이 몇 개인지 센다 (0~2). 49-2절 · 67절.

    ⚠️ **원래 세 개였는데 하나를 뺐다**(67절). 독립 표본 118건
    (경기 65 + 서울 53) 부트스트랩 95% 신뢰구간:
      - 소형(<50㎡)    +5.2%p [+0.6, +10.0] → ✅ 합쳐야 유의
      - 괴리율 ≥3%     +4.2%p [−0.3, +8.9]  → 경기만 유의, 서울은 역방향
      - ~~같은 건물 1건~~ +1.1%p [−3.8, +6.8] → ⛔ **어디서도 유의하지 않아 뺐다**
    둘만 남겨도 구간이 단조로 갈라지고(합계 9.4 / 15.9 / 16.8%) 갈라내는
    폭은 오히려 커진다(경기 +9.5%p → +10.8%p) — **하나하나를 독립된
    근거로 내세우지 않는다는 원칙은 그대로다.**

    `filtered`는 더 이상 읽지 않지만 인자로 남겨 둔다 — 호출부가 세 군데라
    시그니처를 바꾸면 그쪽이 조용히 깨진다.
    """
    risks = 0
    if model_divergence_pct is not None and model_divergence_pct >= PREDICTION_RISK_DIVERGENCE_PCT:
        risks += 1
    if subject_area is not None and subject_area < PREDICTION_RISK_SMALL_AREA_SQM:
        risks += 1
    return risks


def compute_prediction_interval(center_man: float | None,
                                 filtered: list[dict],
                                 subject_area: float | None,
                                 model_divergence_pct: float | None) -> dict | None:
    """현실적 체결가 기준 예측구간. 계산할 수 없으면 `None`.

    "비슷한 조건의 과거 물건 N건 중 80%가 이 범위 안에서 팔렸다"는 뜻이지,
    통계 모형에서 유도한 신뢰구간이 아니다 — 화면에 그대로 밝힌다.
    """
    if not center_man or center_man <= 0 or not filtered:
        return None
    risks = count_prediction_risks(filtered, subject_area, model_divergence_pct)
    tier = min(risks, 2)          # 3개짜리는 표본이 8건뿐이라 2개 칸에 합친다
    pct = PREDICTION_INTERVAL_PCT[tier]
    return {
        "level": PREDICTION_INTERVAL_LEVEL,
        "pct": pct,
        "risks": risks,
        "tier": tier,
        "label": PREDICTION_INTERVAL_LABEL[tier],
        "sample_n": PREDICTION_INTERVAL_SAMPLE_N[tier],
        "center_man": center_man,
        "low_man": center_man * (1 - pct / 100),
        "high_man": center_man * (1 + pct / 100),
    }


def compute_estimate_warnings(filtered: list[dict],
                               model_divergence_pct: float | None,
                               redevelopment: dict | None = None,
                               zone_check: dict | None = None) -> list[dict]:
    """이 추정치를 얼마나 믿어도 되는지 경고등으로 돌려준다 (49절).

    ⚠️ **7절 시세 신뢰도 점수를 대체하는 게 아니라 보완한다.** 48절 실측에서
    신뢰도 점수는 빌라 데이터에서 정확도를 거의 구별하지 못했다(80점 이상
    10.3% vs 60점 미만 10.6% — 단조 관계가 아니다). 신뢰도 89점짜리가 55%
    틀린 사례도 있었다. 반면 아래 세 가지는 오차를 뚜렷하게 갈랐다.
    """
    warnings = []

    # ① 두 계산 방식이 갈린다 = 표본이 대상 물건과 어긋났다는 신호.
    #    7-1절 50:50 블렌딩이 가격 편향 자체는 상쇄하므로, 이 어긋남은
    #    **가격이 아니라 괴리율로만** 드러난다(48-2-1절에서 시뮬레이션으로
    #    먼저 확인하고, 실측에서 1% 미만 8.8% vs 6% 이상 24.5%로 재확인).
    if model_divergence_pct is not None and model_divergence_pct >= ESTIMATE_WARN_DIVERGENCE_PCT:
        warnings.append({
            "key": "divergence",
            "label": "두 계산 방식의 답이 갈립니다",
            "detail": (f"총액 기준과 ㎡당가 기준 추정이 {model_divergence_pct:.1f}% 차이 납니다 — "
                       "비교거래의 면적 구성이 이 물건과 치우쳐 있다는 신호예요."),
            "advice": "면적 허용범위를 좁히거나 반경을 조정해 다시 계산해 보세요.",
        })

    # ② ⛔ "한 건이 답을 독점한다"(최대지분 ≥45%) 경고는 **껐다** — 49-1절.
    #    표본 92건에서 방향이 **뒤집혔다**(45% 이상 8.7% vs 그 미만 11.4%).
    #    처음 근거였던 44건 표본을 다시 보면 거기서도 30~45%(17.5%)가
    #    45% 이상(15.7%)보다 나빠서 애초에 단조 관계가 아니었다 — 임계값
    #    하나를 잘못 잡은 것이었다. `top_weight_share()`는 백테스트 CSV가
    #    계속 쓰므로 남겨 둔다.

    # ③ ⛔ "같은 건물 거래가 딱 한 건" 경고도 **껐다** — 67절.
    #    ② 최대지분과 똑같은 경로를 밟았다. 경기 44건에서 "1건이 0건보다
    #    나쁘다"는 반직관적 순서가 나와 채택했고 92건에서도 같은 순서가
    #    보였지만, **두 표본이 사실 같은 물건이었다**(49-2절 — 웹 순회는
    #    시드가 고정이라 같은 지역을 다시 돌리면 같은 물건이 다시 뽑힌다).
    #    독립 표본인 서울 53건에서는 **방향이 뒤집혔고**(−3.8%p),
    #    118건을 합쳐도 +1.1%p [−3.8, +6.8]로 0을 넘지 못한다.
    #    빼도 갈라내는 힘이 그대로다(합계 +4.2%p → +4.2%p). 대신 경고율이
    #    59% → 47%로 내려간다 — **둘에 한 번 뜨는 경고는 경고가 아니다.**
    #    `_same_building` 플래그 자체는 8-1-1절 그래프 테두리와 5절
    #    동일건물 보너스가 계속 쓰므로 그대로 둔다.

    # ④ 50-1절 — 토지이용계획으로 **직접 확인된** 정비구역. 아래 ⑤의 간접
    #    추정보다 근거가 훨씬 강하므로, 둘 다 있으면 이쪽만 보여준다.
    if zone_check:
        names = " · ".join(zone_check["zones"][:3])
        warnings.append({
            "key": "zone",
            "label": "이 땅은 정비구역 안입니다",
            "detail": (f"토지이용계획에 {names}(으)로 지정돼 있어요. "
                       "정비구역 빌라는 건물이 아니라 대지지분(입주권) 값으로 "
                       "팔려서 이 계산기의 매도가와 전혀 다르게 형성됩니다."),
            "advice": "이 매도가는 쓰지 마세요 — 대지지분과 사업 진행 단계로 따로 따져야 합니다.",
        })
        return warnings

    # ⑤ 50절 — 정비구역(재개발) **의심**(동네 거래로 간접 추정).
    if redevelopment:
        ex = redevelopment["examples"][0]
        warnings.append({
            "key": "redevelopment",
            "label": "이 동네에 정비구역(재개발)이 있을 수 있습니다",
            "detail": (f"{redevelopment['dong']}에 지은 지 오래됐는데 시세의 "
                       f"{redevelopment['max_ratio']:.1f}배까지 거래된 빌라가 "
                       f"{redevelopment['count']}건 있어요 "
                       f"(예: {ex['name']} {ex['area']:.0f}㎡ {ex['amount_man'] / 10000:.2f}억, "
                       f"{ex['build_year']}년식). "
                       "정비구역 빌라는 건물이 아니라 대지지분 값으로 팔려서 "
                       "이 계산기가 못 맞힙니다."),
            "advice": "대상 물건이 정비구역 안인지 먼저 확인하세요 — 안이면 이 매도가는 쓰지 마세요.",
        })

    return warnings


def print_estimate_warnings(warnings: list[dict]):
    """49절 경고등 — 걸린 게 없으면 아무것도 찍지 않는다."""
    if not warnings:
        return
    print()
    print("[⚠️ 이 추정치, 그대로 믿기 전에 확인하세요]")
    print("  비슷한 신호가 뜬 추정치는 평균 오차가 2배 이상 컸습니다"
          " (실측 44건: 신호 없음 6.8% · 있음 17.1%).")
    for w in warnings:
        print(f"  · {w['label']}")
        print(f"      {w['detail']}")
        print(f"      → {w['advice']}")
    print("  ※ 신호가 떴다고 틀린 값이라는 뜻은 아닙니다 — 한 번 더 확인하라는 표시입니다.")


def compute_price_tiers(filtered: list[dict], calibration: float = 1.0,
                         subject_area: float | None = None) -> dict:
    """CLAUDE.md 29절: 8절과 같은 가중 복제 분포를 5단계 백분위수(10/30/50/70/92)로
    더 세분화해서 "얼마나 빨리 팔릴 만한 가격대인지" 참고용 라벨을 붙인다.

    ⚠️ 실제 "이 가격에 내놓으면 며칠 만에 팔린다"는 데이터(개별 물건의 등록일
    →계약일 이력)는 이 프로젝트에 없다 — 국토부 실거래가에는 등록일이 없고
    체결가만 있다. 그래서 "30일/60일"은 확정된 예측이 아니라, 비교거래 분포
    안에서 가격이 낮을수록(=상대적으로 싸게 내놓을수록) 더 빨리 팔릴 가능성이
    높다는 상식적 가정을 반영한 목표 라벨일 뿐이다 — 30절 유동성 점수와 함께
    보면 "이 동네가 원래 거래가 활발한지"까지 고려해서 더 현실적으로 참고할 수
    있다."""
    # 54절 — 빈 비교거래로 부르면 나눗셈에서 터진다. 지금은 모든 호출부가
    #    앞에서 막고 있지만, 가드가 없으면 다음에 부르는 사람이 똑같이 밟는다.
    if not filtered:
        raise ValueError("비교거래가 비어 있어 가격 구간를 계산할 수 없습니다")

    # ⚠️ **8절과 완전히 같은 분포를 써야 한다** — 예전엔 두 가지가 어긋나 있었다:
    #    (ㄱ) 8절은 "하위 절반의 중앙값"(튜키 힌지), 29절은 최근접-순위 백분위수
    #    (ㄴ) 8절은 총액·㎡당가 두 모델을 50:50으로 블렌딩(7-1절)하는데 29절은
    #         총액 모델만 썼다
    #    그래서 29절 원문이 "60일 목표가(p50)는 현실적 체결가와 **거의** 같음"
    #    이라고 적어야 했다. 지금은 같은 `weighted_quantile()`에 같은 블렌딩을
    #    써서 **정확히 같다**(`subject_area`를 넘긴 경우).
    #    ⚠️ `subject_area`를 생략하면 총액 모델만 쓴다 — 하위호환 유지용이고,
    #       그때는 d60이 현실적 체결가와 미세하게 다를 수 있다.
    total_pairs = _weighted_amount_pairs(filtered)
    unit_pairs = _weighted_unit_price_pairs(filtered, subject_area) if subject_area else []

    def q(p: float) -> float:
        a = weighted_quantile(total_pairs, p)
        if not unit_pairs:
            return a
        b = weighted_quantile(unit_pairs, p)
        return (a + b) / 2 if b is not None else a

    tiers = {
        "urgent": q(0.10), "d30": q(0.30), "d60": q(0.50),
        "normal": q(0.70), "test": q(0.92),
    }
    # 8절 산출값과 같은 보정을 걸어야 화면 안에서 두 숫자가 어긋나지 않는다.
    return {k: round(v * calibration, -1) for k, v in tiers.items()}


def compute_liquidity(rows: list[dict], subject_coord: tuple[float, float], area: float,
                       this_year: int, gu_filter: str | None = None,
                       area_tolerance_pct: float = 0.15, radii: tuple[int, ...] = (300, 500)) -> dict | None:
    """CLAUDE.md 30절: 반경 300m/500m 안에서 유사면적(5절과 같은 허용범위)
    거래가 최근 3/6/12개월 동안 몇 건이었는지로 이 동네·이 면적대의 거래
    유동성(공급 대비 얼마나 빨리 소화되는지)을 근사한다.

    5절의 층·준공년도 하드 필터는 일부러 적용하지 않는다 — 여기서는 "이
    동네·이 면적대가 원래 얼마나 자주 거래되는지"만 보는 것이라 층/연식까지
    맞출 필요가 없어서(층/연식까지 맞추면 표본이 너무 줄어 유동성 자체를
    가늠하기 어려워진다). find_comparables()를 floor=None, build_year=None으로
    불러써서 재사용한다 — 이미 8절 계산에서 지오코딩된 주소는 캐시(`data/
    geocode_cache.json`)에 남아 있어 두 번째 호출은 대부분 캐시로 빠르게
    끝난다.

    12/13/15절과 같은 원칙으로, 시스템 날짜가 아니라 **데이터 안에서 가장 최근
    계약월**을 기준으로 "최근 N개월"을 센다(실거래 신고가 최대 30일 걸려서
    이번 달 데이터가 아직 다 안 들어왔을 수 있기 때문)."""
    year_min = this_year - 2  # 12개월 창을 넉넉히 덮기 위해 2년치를 넓게 가져온다
    wide = find_comparables(rows, subject_coord, area, None, None, max(radii),
                             year_min, this_year, gu_filter,
                             area_tolerance_pct=area_tolerance_pct)
    if not wide:
        return None

    def _ym(r):
        try:
            return int(r["dealYear"]) * 12 + int(r["dealMonth"])
        except (KeyError, ValueError, TypeError):
            return None

    yms = [_ym(r) for r in wide if _ym(r) is not None]
    if not yms:
        return None
    latest = max(yms)

    counts = {}
    for months in (3, 6, 12):
        cutoff = latest - months + 1
        for radius in radii:
            counts[(radius, months)] = sum(
                1 for r in wide
                if r["_distance_m"] <= radius and (ym := _ym(r)) is not None and cutoff <= ym <= latest
            )

    return {
        "latest_year": latest // 12, "latest_month": latest % 12 or 12,
        "counts": counts, "radii": radii,
    }


def speed_label_for_percentile(percentile: float, liquidity_monthly_avg: float | None = None) -> str:
    """CLAUDE.md 29절(확장) — 사용자가 "가격별 매도확률"을 직접 설명해준 방식을
    반영한다: 가격 구간(29절 5단계) 각각이 **지금 나와 있는 경쟁 매물** 대비
    몇 % 위치인지(31절 `price_rank_among_listings()`가 계산한 퍼센타일 —
    낮을수록 저렴한 쪽)와 최근 거래 속도(30절 유동성, 반경 500m 최근 3개월
    월평균 거래건수)를 합쳐서 "이 가격이면 얼마나 빨리 소진될 것 같은지"를
    사람이 읽는 말로 바꾼다.

    핵심 아이디어(사용자 설명 그대로): 단순히 "과거 실거래 대비 싼 가격"이
    아니라 "지금 이 순간 경쟁하는 매물들 사이에서 내 가격이 어디쯤인지"가
    실제 매도 속도를 더 잘 설명한다 — 예를 들어 최근 실거래가 1.5억인데
    지금 1.45억 매물이 이미 여러 개 쌓여 있다면(=낮은 가격인데도 퍼센타일이
    높게 나옴), 그 가격대 시장 자체가 약해졌을 가능성을 뜻한다. 29절의
    가격 구간(초급매가~최고가 테스트)은 **과거** 실거래 분포 기준이고, 이
    함수가 계산하는 퍼센타일은 **현재** 매물 분포 기준이라, 둘이 어긋나면
    (예: "최고가 테스트" 가격인데 현재 매물 대비로는 오히려 싼 편) 그 자체가
    "지금 시장이 과거보다 오른 상태"라는 신호가 된다.

    ⚠️ 29절과 같은 한계 — 실측 매도소요일 데이터(등록일→계약일 이력)가
    없어서 "몇 주/몇 개월" 같은 구체적 기간은 여전히 말할 수 없다. 그래서
    "빠른 소진 가능성" 같은 상대적 표현만 쓰고, 확정 기간은 말하지 않는다.
    """
    adjusted = percentile
    if liquidity_monthly_avg is not None:
        if liquidity_monthly_avg >= 3:
            adjusted -= 10  # 거래가 활발한 동네면 같은 가격도 더 빨리 소화될 여지
        elif liquidity_monthly_avg < 1:
            adjusted += 10  # 거래가 뜸한 동네면 같은 가격도 더 오래 걸릴 여지
    adjusted = max(0, min(100, adjusted))

    if adjusted <= 20:
        return "빠른 소진 가능성 매우 높음"
    if adjusted <= 40:
        return "빠른 소진 가능성 높음"
    if adjusted <= 65:
        return "정상 매도 구간"
    if adjusted <= 85:
        return "다소 느릴 수 있음"
    return "장기화 가능성 큼"


MODEL_DIVERGENCE_MENTION_THRESHOLD_PCT = 8  # 이 정도부터는 우연한 오차가 아니라 언급할 만하다고 판단


def build_verdict_parts(confidence: int, n_total: int, liquidity: dict | None = None,
                         listing_summary: dict | None = None, trend_pct: float | None = None,
                         model_divergence_pct: float | None = None,
                         sale_pressure: dict | None = None) -> list[str]:
    """CLAUDE.md 32절: 시세 신뢰도·유동성·경쟁매물 포지션·가격 추이를 한데
    묶어 사람이 읽는 짧은 종합 판단 문단을 만든다. Claude(LLM)를 호출하지
    않는 규칙 기반 템플릿이다 — 22절 원칙(웹 버전은 AI 호출 없는 순수
    파이썬)을 지키기 위해서다. 그래서 뉘앙스가 사람이 직접 쓴 것만큼
    섬세하지는 않다는 한계가 있고, 참고용 요약이라는 점을 항상 전제로 한다."""
    parts = []

    if confidence >= 70:
        parts.append(f"비교거래 {n_total}건이 확보되어 시세 신뢰도({confidence}/100)가 높은 편입니다.")
    elif confidence >= 40:
        parts.append(f"비교거래 {n_total}건 기준 시세 신뢰도는 {confidence}/100로 보통 수준입니다 — 반경이나 허용범위를 넓혀 표본을 늘리면 더 정확해질 수 있어요.")
    else:
        parts.append(f"비교거래가 {n_total}건뿐이라 시세 신뢰도({confidence}/100)가 낮습니다 — 이 결과는 참고용으로만 활용하고, 반경을 넓혀 다시 확인해 보세요.")

    if liquidity is not None:
        c = liquidity["counts"]
        monthly_avg = c.get((500, 3), 0) / 3
        if monthly_avg >= 3:
            tone = "거래가 활발한 편이라"
        elif monthly_avg >= 1:
            tone = "거래가 보통 수준으로 이뤄지고 있어"
        else:
            tone = "최근 거래가 뜸한 편이라"
        parts.append(f"반경 500m 유사면적 거래가 최근 3개월 월평균 {monthly_avg:.1f}건으로, {tone} "
                     + ("적정가 수준이면 비교적 빠르게 소화될 가능성이 있습니다." if monthly_avg >= 1
                        else "가격을 낮춰야 매도 속도를 확보할 수 있습니다."))

    if listing_summary is not None:
        pct = listing_summary["percentile"]
        n = listing_summary["n"]
        if pct <= 30:
            parts.append(f"현재 붙여넣은 유사면적 매물 {n}건 중 일반 매도가 기준 가격 경쟁력이 상위 {pct}%로 저렴한 편입니다.")
        elif pct <= 60:
            parts.append(f"현재 붙여넣은 유사면적 매물 {n}건 대비 일반 매도가는 중간 정도(상위 {pct}%) 가격대입니다.")
        else:
            parts.append(f"현재 붙여넣은 유사면적 매물 {n}건 대비 일반 매도가가 상위 {pct}%로 비싼 편이라, 빠른 매도가 필요하면 초급매가~30일 목표가 쪽을 검토해볼 만합니다.")

    if sale_pressure is not None and sale_pressure.get("months_of_supply") is not None:
        parts.append(f"지금 나와 있는 유사면적 경쟁 매물 {sale_pressure['n_listings']}건은 이 동네 거래 속도"
                     f"(월평균 {sale_pressure['monthly_deal_avg']}건)로 따지면 약 {sale_pressure['months_of_supply']}개월치 물량이라"
                     f" 매도 압력은 '{sale_pressure['level']}' 수준입니다.")

    if trend_pct is not None:
        if trend_pct > 3:
            parts.append(f"최근 가격 추이도 {trend_pct:+.1f}%로 상승세라 매도에 유리한 시점일 수 있습니다.")
        elif trend_pct < -3:
            parts.append(f"다만 최근 가격 추이가 {trend_pct:+.1f}%로 하락세라, 너무 늦추면 더 낮은 가격을 감수해야 할 수 있습니다.")

    if model_divergence_pct is not None and model_divergence_pct >= MODEL_DIVERGENCE_MENTION_THRESHOLD_PCT:
        parts.append(f"총액 기준 추정과 ㎡당가 기준 추정이 {model_divergence_pct:.0f}% 차이 나 모델 간 의견이 다소 엇갈립니다 — 표본을 늘리거나 참고용으로만 활용하세요.")

    parts.append("⚠️ 규칙 기반으로 자동 생성한 참고용 요약이며, 최종 판단은 직접 확인 후 내리세요.")
    return parts


def build_verdict(*args, **kwargs) -> str:
    """32절 종합 판단을 한 문단 문자열로 돌려준다(CLI·기존 호출부용).

    화면에서는 문장마다 줄을 나눠 보여주는 편이 훨씬 읽기 쉬워서
    (사용자가 "설명 문장들 줄바꿈 좀 제대로 해달라"고 지적했다) 웹
    버전은 `build_verdict_parts()`를 직접 불러 문장 리스트를 그대로
    받아 쓴다 — 이 함수는 그걸 공백으로 이어붙인 것뿐이다."""
    return " ".join(build_verdict_parts(*args, **kwargs))


# CLAUDE.md 41절: 환금성·경쟁 진단(강의 관점) — 판정 등급별 가점.
MARKETABILITY_SCORES = {"good": 100, "ok": 60, "warn": 25}
MARKETABILITY_ICONS = {"good": "👍", "ok": "➖", "warn": "⚠️", "info": "ℹ️", "unknown": "❔"}
MARKETABILITY_VERDICT_LABELS = {
    "good": "좋음", "ok": "보통", "warn": "주의", "info": "참고", "unknown": "정보 없음",
}
# 항목을 보여주는 순서 — **강의가 중요하다고 짚은 순서 그대로**다
# (`data/lecture_notes_villa.md`). 계산에는 영향이 없고 화면 배치만
# 바뀐다. 사용자가 "강의 내용 중 중요한 순서대로 차례대로 보여달라"고
# 요청해서 정했다:
#   1) 가격 위치 — "빌라는 아파트의 대체재라 싸야 팔린다"(강의 3절),
#      "싸게 사는 것보다 팔릴 가격을 먼저 계산"(17절 6번). 강의 전체를
#      관통하는 1순위 명제다.
#   2) 층·승강기 — "금액이 싸면 팔리긴 팔리는 빌라를 골라야 한다,
#      팔기 어려운 요소를 제거하라"(5절 1번). 가격으로도 못 덮는 요소.
#   3) 거래량 — "필요한 데이터" 목록의 맨 앞(6절 1번). 가격이 맞아도
#      거래 자체가 없으면 못 판다.
#   4) 경쟁 매물 — "실제 매물·실거래·주변 경쟁물건을 함께 확인"(7절).
#   5) 시세 판단 근거 — "개별성이 강해 실거래 하나로 정하면 안 된다"(4절).
#   6) 연식 — "연식별 거래량을 따로 보라"(6절 4번). 판정이 아닌 참고.
# 앞쪽 = 물건 자체 속성(가격·층·입지·임장·연식), 뒤쪽 = 시장 지표.
# 연식은 판정 항목이 되면서 물건 속성 묶음 맨 뒤로 들어왔다.
MARKETABILITY_ORDER = [
    "price_position", "floor", "transit_school", "inspection", "build_year",
    "volume", "competition", "confidence", "apt_gap",
]

# CLAUDE.md 45절 — 역세권·초품아 판정 거리. 사용자가 "층·승강기 다음으로
# 중요한 요소"라고 짚어서 41절 진단에 넣었다.
# ⚠️ 경계값은 통상 쓰이는 기준(역까지 도보 10분 ≈ 800m, 초등학교 도보
# 통학권 ≈ 500m)을 옮긴 참고값이지 데이터로 검증한 수치가 아니다.
# CLAUDE.md 41절 — 연식 판정. 원래는 판정 없이 "2010년 전후로 매수층이
# 갈린다"는 안내(`info`)만 했는데, 사용자가 "완전 구축이면 그것도 디버프
# 요소로 넣어달라"고 해서 실제 감점 항목으로 바꿨다.
# ⚠️ 경계값은 경험적으로 끊은 참고값이지 데이터로 검증한 수치가 아니다.
def _as_int(value) -> int | None:
    """건축물대장 응답은 숫자도 문자열("5")로 오고, 빈 값·None·"-"도 섞인다 —
    숫자로 못 읽으면 조용히 None을 돌려준다(판정에서 그냥 빠진다)."""
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


BUILD_AGE_NEW_MAX = 15   # 이내면 준신축 — 실거주 매수층이 가장 두껍다
BUILD_AGE_OK_MAX = 30    # 이내면 무난 / 넘으면 "완전 구축"

STATION_NEAR_M = 800    # 이내면 역세권
STATION_OK_M = 1200     # 이내면 걸어갈 만함
SCHOOL_NEAR_M = 500     # 이내면 초품아급 도보 통학권
SCHOOL_OK_M = 1000      # 이내면 통학 가능권


# 20절 건축물대장 조회로는 위반건축물 딱지를 알 수 없다 — 그 사실을 41절
# 층·승강기 항목 안에서 함께 밝힌다(예전엔 별도 "건물 정보" 카드에 있었다).
BUILDING_PERMIT_NOTES = [
    "⚠️ 위반건축물 딱지(불법 증축·용도변경 등)는 이 조회로 확인할 수 없어요 — 건축물대장 표제부 응답에 해당 항목이 없습니다.",
    "낙찰 전에 정부24 \"건축물대장 열람\"에서 직접 확인하세요 — 위반건축물이면 대출·매도 양쪽에서 크게 불리해집니다.",
]


def _building_facts(building: dict | None, floor: int | None, is_top_floor: bool) -> list[str] | None:
    """20절 건축물대장에서 받아온 사실을 41절 층·승강기 항목 안에 함께 보여줄
    짧은 문구 목록으로 만든다.

    ⚠️ 예전엔 이 값들이 결과 페이지 맨 아래 "건물 정보" 카드에 따로 떠 있어서,
    "승강기 없음 / 지상 5층"이라는 **사실**과 "그래서 팔기 불리하다"는 **판정**이
    화면상 멀리 떨어져 있었다 — 사용자가 "건축물대장 정보는 환금성 진단의
    층·승강기와 묶어서 더 자세히 설명해야 한다"고 지적해서 이 항목 안으로
    옮겼다(40절 인근 아파트 대비를 진단 항목 안 접이식으로 합친 것과 같은
    원칙). 조회에 실패했으면 None을 돌려줘서 아무것도 안 붙인다."""
    if not building:
        return None
    facts = []

    elevator = building.get("elevator")  # 웹은 "있음 (1대)"/"없음" 문자열을 미리 만들어 둔다
    if not elevator:
        count = _as_int(building.get("elevator_count"))
        has = building.get("has_elevator")
        elevator = (f"있음 ({count}대)" if count else "있음") if has else ("없음" if has is False else None)
    if elevator:
        facts.append(f"승강기 {elevator}")

    ground_floors = _as_int(building.get("ground_floors"))
    if ground_floors:
        where = f"지상 {ground_floors}층 건물"
        if floor is not None and floor > 0:
            where += f"의 {floor}층" + (" (탑층)" if is_top_floor else "")
        facts.append(where)

    households = _as_int(building.get("household_count"))
    if households:
        facts.append(f"{households}세대")

    approval = str(building.get("approval_date") or "").strip()
    if len(approval) == 8 and approval.isdigit():
        facts.append(f"사용승인 {approval[:4]}.{approval[4:6]}.{approval[6:]}")
    elif approval:
        facts.append(f"사용승인 {approval}")

    return facts or None


def build_marketability_report(floor: int | None = None, build_year: int | None = None,
                                this_year: int | None = None, confidence: int | None = None,
                                liquidity: dict | None = None, sale_pressure: dict | None = None,
                                listing_summary: dict | None = None,
                                building: dict | None = None,
                                inspection_bad: list[str] | None = None,
                                inspection_clean: bool = False,
                                apt_gap: dict | None = None,
                                location: dict | None = None) -> dict:
    """CLAUDE.md 41절: "이 빌라가 실제로 잘 팔릴 물건인가"를 강의
    (`data/lecture_notes_villa.md`)가 짚은 기준으로 항목별 진단한다.

    강의의 핵심 주장은 "가격만 맞추면 되는 게 아니다"였다 — 빌라는
    아파트의 대체재라 싸야 팔리지만 **싸다고 다 팔리는 것도 아니고**,
    개별성이 강해 실거래 하나로 3~6개월 뒤 매도가를 잡기도 어렵다.
    그래서 8절이 내놓는 "얼마"와 별개로 **"얼마나 잘 팔릴까"** 를 따로
    보여주는 게 이 절의 목적이다.

    ⚠️ 32절과 같은 성격의 **규칙 기반 판정**이다 — Claude(LLM)를 부르지
    않고(22절 원칙), 이미 계산해둔 지표(30절 유동성·39절 매도압력·31절
    가격 포지션·7절 신뢰도·20절 건축물대장·층)를 강의 기준에 맞춰 등급만
    매긴다. 강의의 경험칙을 옮긴 것이지 통계로 검증한 기준이 아니다.

    반환: {"score", "grade", "summary", "items": [{key, label, verdict,
    text, lecture}], "weaknesses"}"""
    items = []

    # ① 거래량 — 강의가 "필요한 데이터"의 맨 앞에 둔 항목. 가격이 맞아도
    #    거래 자체가 없으면 못 판다.
    if liquidity is not None:
        monthly = liquidity["counts"].get((500, 3), 0) / 3
        if monthly >= 3:
            v, t = "good", f"반경 500m 유사면적 거래가 최근 3개월 월평균 {monthly:.1f}건으로 꾸준히 돌아가는 동네예요."
        elif monthly >= 1:
            v, t = "ok", f"반경 500m 유사면적 거래가 최근 3개월 월평균 {monthly:.1f}건으로 보통 수준이에요 — 가격이 매도 속도를 가릅니다."
        else:
            v, t = "warn", f"반경 500m 유사면적 거래가 최근 3개월 월평균 {monthly:.1f}건뿐이라 거래 자체가 뜸합니다 — 매도 기간을 넉넉히 잡으세요."
        items.append({"key": "volume", "label": "거래량 (이 동네가 원래 잘 도나)", "verdict": v, "text": t,
                       "why": "거래량·거래시기·면적별·연식별 거래량을 가격과 함께 봐야 합니다"})

    # ② 경쟁 매물 압력 — 39절. 같은 물건이 이미 몇 개나 줄 서 있는지.
    if sale_pressure is not None and sale_pressure.get("months_of_supply") is not None:
        level = sale_pressure["level"]
        v = {"낮음": "good", "보통": "ok"}.get(level, "warn")
        t = (f"지금 나와 있는 유사면적 경쟁 매물 {sale_pressure['n_listings']}건은 이 동네 거래 속도로 "
             f"약 {sale_pressure['months_of_supply']}개월치 물량이에요 (매도 압력 {level}).")
        items.append({"key": "competition", "label": "경쟁 매물 (내 앞에 몇 개나 줄 서 있나)", "verdict": v, "text": t,
                       "why": "경매 물건만 보지 말고 실제 매물·실거래·주변 경쟁물건을 함께 확인해야 합니다"})
    else:
        items.append({"key": "competition", "label": "경쟁 매물 (내 앞에 몇 개나 줄 서 있나)", "verdict": "unknown",
                       "text": "네이버부동산 매물 목록을 붙여넣으면 경쟁 매물이 몇 개월치 물량인지 계산해 드려요.",
                       "why": "경매 물건만 보지 말고 실제 매물·실거래·주변 경쟁물건을 함께 확인해야 합니다"})

    # ③ 가격 위치 — 31절. "싸야 팔린다"는 강의 명제를 지금 경쟁 매물 기준으로 본다.
    if listing_summary is not None:
        pct = listing_summary["percentile"]
        if pct <= 30:
            v, t = "good", f"일반 매도가가 붙여넣은 유사면적 매물 {listing_summary['n']}건 중 상위 {pct}%로 저렴한 편이에요."
        elif pct <= 60:
            v, t = "ok", f"일반 매도가가 붙여넣은 유사면적 매물 {listing_summary['n']}건 중 상위 {pct}%로 중간 가격대예요."
        else:
            v, t = "warn", (f"일반 매도가가 붙여넣은 유사면적 매물 {listing_summary['n']}건 중 상위 {pct}%로 비싼 편이에요 "
                             f"— 빌라는 싸야 팔리는 물건이라 이 위치면 오래 걸릴 수 있습니다.")
        items.append({"key": "price_position", "label": "가격 위치 (경쟁 매물 대비)", "verdict": v, "text": t,
                       "why": "빌라는 아파트의 대체재라, 인근 아파트보다 비싸지면 잘 안 팔립니다"})

    # 인근 아파트 대비 — 40절. "빌라는 아파트의 대체재"라는 명제를 숫자로
    #   옮긴 항목이다. ⚠️ 판정 항목 중 **맨 뒤**에 둔다 — 사용자가 "경매
    #   단타용으로는 그렇게까지 중한 게 아니라 참고치로 보는 것"이라고
    #   지적했다. 갭이 크면 "지금 당장 빨리 팔린다"기보다 "수요층이 두껍고
    #   키 맞추기 상승 여력이 남아 있다"는 뜻이라, 단기 매도보다 중·장기
    #   보유에서 더 크게 작용한다.
    if apt_gap:
        v = apt_gap["verdict"]
        t = (f"{apt_gap['dong']} 아파트 {apt_gap['n']}건의 ㎡당가 중앙값 {apt_gap['apt_unit_price']:,}만원 대비, "
             f"이 빌라는 {apt_gap['villa_unit_price']:,}만원으로 아파트의 {apt_gap['ratio_pct']}% 수준이에요"
             f" (갭 {apt_gap['gap_pct']}%). " + _apt_gap_sentence(apt_gap))
        t += " 다만 이건 단기 매도(단타)보다 중·장기 보유에서 더 크게 작용하는 신호라 참고치로 보세요."
        items.append({"key": "apt_gap", "label": "인근 아파트 대비 (참고 — 중·장기 신호)", "verdict": v, "text": t,
                       "why": "아파트와 값 차이가 클수록 예산이 모자라 내려오는 수요가 두껍고, 키 맞추기 상승 여력도 남습니다"})

    # ④ 층·승강기 — "팔기 어려운 요소" 중 이 계산기가 데이터로 확인할 수
    #    있는 것들(나머지는 36절 임장 체크리스트로 넘긴다).
    #    ⚠️ 사용자 지적 두 가지를 반영해 개정했다:
    #    (1) "층·승강기인데 왜 승강기 유무가 안 써 있냐" — 건축물대장에서
    #        이미 받아온 값을 **항상 문장으로** 붙인다(있으면 유리/없으면 불리).
    #    (2) "4층은 승강기 없어도 무난하거나 조금 나쁜 편" — 예전엔 4층 이상
    #        승강기 없음을 전부 warn으로 묶었는데, 4층과 5층 이상을 갈랐다.
    #    (3) 5·6층 같은 고층은 건축물대장 지상층수(`grndFlrCnt`)와 비교해
    #        **탑층인지 실제로 확인**한다 — 5-1절 비교거래의 "관측된 최고층"
    #        추정과 달리 이건 대장 원본 값이라 훨씬 확실하다.
    if floor is not None:
        has_elevator = building.get("has_elevator") if building else None
        ground_floors = _as_int(building.get("ground_floors")) if building else None
        is_top_floor = bool(ground_floors and floor >= ground_floors > 1)

        if has_elevator is True:
            elv = "승강기가 있어 매도에 유리해요"
        elif has_elevator is False:
            elv = "승강기가 없어 매도에 불리해요"
        else:
            elv = "승강기 유무는 건축물대장에서 확인하지 못했어요"

        if floor <= 0:
            v, head = "warn", "반지하·지하는 지상층보다 시세가 절반 가까이 낮게 형성되는 경우가 많아 매수층이 크게 좁아집니다"
        elif floor == 1:
            v, head = "ok", "1층은 사생활·채광 때문에 선호도가 낮은 편이지만, 노인·유아 가구에는 오히려 장점이 되기도 해요"
        elif floor in (2, 3):
            v, head = "good", f"{floor}층은 빌라에서 가장 선호되는 층대예요"
        elif has_elevator:
            v, head = "good", f"{floor}층이지만 승강기가 있어 고층의 불리함이 크게 줄어듭니다"
        elif floor == 4 and has_elevator is False:
            # 4층은 계단으로 오르내릴 만한 마지막 층이라 5층 이상과 나눠 본다.
            v, head = "ok", f"{floor}층은 승강기가 없어도 무난하거나 조금 나쁜 편이에요"
        elif floor >= 5 and has_elevator is False:
            v, head = "warn", f"{floor}층인데 승강기가 없어요 — 고층인데 승강기가 없는 건 대표적인 '팔기 어려운 요소'예요"
        else:
            v, head = "ok", f"{floor}층은 무난한 편이에요"

        t = f"{head}. {elv}."
        if is_top_floor:
            # 탑층은 누수·단열·여름 더위 때문에 같은 건물 안에서도 선호도가
            # 떨어진다 — 좋게 나온 판정은 한 단계 내리고 문장으로도 밝힌다.
            t += (f" 건축물대장상 지상 {ground_floors}층 건물이니 이 집이 바로 탑층이에요 — "
                  f"탑층에서 가장 흔한 하자가 옥상에서 내려오는 누수라, 임장 때 옥상에 직접 올라가 "
                  f"방수층이 깨지거나 물이 고인 곳은 없는지, 집 안에서는 천장·벽 모서리에 "
                  f"물 자국이나 곰팡이가 없는지 꼭 보세요. 여름 더위·단열에도 불리해서 "
                  f"같은 건물 안에서도 선호도가 떨어지는 층입니다.")
            if v == "good":
                v = "ok"
        elif ground_floors and ground_floors > 1:
            t += f" 건축물대장상 지상 {ground_floors}층 건물이라 탑층은 아니에요 — 옥상 누수 위험은 그만큼 덜합니다."
        items.append({"key": "floor", "label": "층·승강기 (팔기 어려운 요소)", "verdict": v, "text": t,
                       "facts": _building_facts(building, floor, is_top_floor),
                       "notes": BUILDING_PERMIT_NOTES if building else None,
                       "why": "층수·승강기·탑층 여부는 값을 낮춰도 덮이지 않는 대표적인 팔기 어려운 요소입니다"})

    # 역세권·초품아 — 45절. 19절 입지 체크(`compute_location_check()`)가 이미
    #   구해둔 거리를 판정으로만 옮긴다(추가 API 호출 없음).
    if location:
        station = (location.get("지하철역") or {}).get("place")
        school = (location.get("초등학교") or {}).get("place")
        failed = all((location.get(k) or {}).get("error") for k in ("지하철역", "초등학교"))
        if failed:
            items.append({"key": "transit_school", "label": "역세권·학세권 (입지)", "verdict": "unknown",
                           "text": "카카오 로컬 조회에 실패해서 역·학교까지 거리를 확인하지 못했어요.",
                           "why": "역과 초등학교까지의 거리는 매수층을 직접 넓히거나 좁히는 요소입니다"})
        else:
            s_d = station["distance_m"] if station else None
            c_d = school["distance_m"] if school else None
            score = 0
            score += 2 if (s_d is not None and s_d <= STATION_NEAR_M) else (
                1 if (s_d is not None and s_d <= STATION_OK_M) else 0)
            score += 2 if (c_d is not None and c_d <= SCHOOL_NEAR_M) else (
                1 if (c_d is not None and c_d <= SCHOOL_OK_M) else 0)
            v = "good" if score >= 3 else ("ok" if score == 2 else "warn")

            none_txt = f"{LOCATION_SEARCH_RADIUS_M / 1000:.1f}km 안에 없음"
            s_txt = f"{station['name']} {s_d}m" if station else none_txt
            c_txt = f"{school['name']} {c_d}m" if school else none_txt
            if v == "good":
                tail = "역·학교가 둘 다 가까워서 매수층이 넓어지는 입지예요."
            elif v == "ok":
                tail = "둘 중 하나는 가깝고 하나는 애매해요 — 가까운 쪽을 매물 설명에 앞세우는 게 좋습니다."
            else:
                tail = "역·학교 모두 걸어가기엔 먼 편이라 매수층이 좁아집니다 — 가격으로 상쇄해야 해요."
            items.append({"key": "transit_school", "label": "역세권·학세권 (입지)", "verdict": v,
                           "text": f"지하철역 {s_txt} · 초등학교 {c_txt}. {tail}",
                           "why": "역과 초등학교까지의 거리는 매수층을 직접 넓히거나 좁히는 요소입니다"})

    # ⑤ 임장 체크 — 36절 목록을 "직접 보고 온 결과"로 받아 점수에 반영한다.
    #    데이터로는 절대 알 수 없는 항목이라, 사용자가 채워주기 전까지는
    #    감점도 가점도 하지 않는다(`unknown`).
    if inspection_bad:
        n_bad = len(inspection_bad)
        joined = " · ".join(inspection_bad)
        if n_bad >= INSPECTION_WARN_COUNT:
            v, t = "warn", f"임장에서 걸린다고 하신 항목 {n_bad}가지 — {joined}. 이런 항목은 값을 낮춰도 매수자가 잘 안 붙습니다."
        else:
            v, t = "ok", f"임장에서 걸린다고 하신 항목 — {joined}. 한 가지 정도면 가격으로 상쇄해볼 만합니다."
        items.append({"key": "inspection", "label": "임장 체크 (직접 보고 온 결과)", "verdict": v, "text": t,
                       "why": "채광·주차·누수·악취·소음·관리상태·경사는 어떤 데이터에도 없어 직접 보고 와야 알 수 있습니다"})
    elif inspection_clean:
        items.append({"key": "inspection", "label": "임장 체크 (직접 보고 온 결과)", "verdict": "good",
                       "text": f"임장에서 {len(INSPECTION_CHECKLIST)}가지 항목 중 걸리는 게 없다고 하셨어요 — 가격만 맞추면 되는 조건입니다.",
                       "why": "채광·주차·누수·악취·소음·관리상태·경사는 어떤 데이터에도 없어 직접 보고 와야 알 수 있습니다"})
    else:
        items.append({"key": "inspection", "label": "임장 체크 (직접 보고 온 결과)", "verdict": "unknown",
                       "text": "임장에서 확인한 내용을 아래 체크리스트에 체크하면 이 점수에 바로 반영해 드려요.",
                       "why": "채광·주차·누수·악취·소음·관리상태·경사는 어떤 데이터에도 없어 직접 보고 와야 알 수 있습니다"})

    # ⑤ 판단 근거의 두께 — 강의가 "빌라는 개별성이 강하다"고 짚은 부분.
    if confidence is not None:
        if confidence >= 70:
            v, t = "good", f"비슷한 조건의 실거래가 충분히 잡혀 시세 신뢰도가 {confidence}/100입니다."
        elif confidence >= 40:
            v, t = "ok", f"시세 신뢰도가 {confidence}/100로 보통이에요 — 반경·허용범위를 넓혀 표본을 늘리면 더 또렷해집니다."
        else:
            v, t = "warn", f"시세 신뢰도가 {confidence}/100로 낮아요 — 비슷한 물건이 워낙 안 팔리는 동네라는 뜻일 수 있습니다."
        items.append({"key": "confidence", "label": "시세 판단 근거 (개별성 극복 정도)", "verdict": v, "text": t,
                       "why": "빌라는 개별성이 강해서 실거래 하나만 보고 가격을 정하면 안 됩니다"})

    # ⑥ 연식 — 예전엔 판정 없는 안내(`info`)였는데, 사용자가 "완전 구축이면
    #    그것도 디버프 요소로 넣어달라"고 해서 실제 감점 항목으로 바꿨다.
    # ⚠️ `build_year`는 호출부마다 타입이 다르게 온다 — 웹은 `int()`로 바꿔서
    #    넘기지만 CLI `--build-year`는 문자열 그대로다(5절 하드 필터가 문자열
    #    비교를 쓰기 때문). 예전엔 여기서 `this_year - build_year`를 바로 해서
    #    **CLI로 준공년도를 주면 이 지점에서 TypeError로 죽었다.** 호출부가
    #    정규화해 주기를 기대하지 말고 여기서 직접 숫자로 맞춘다.
    build_year = _as_int(build_year)
    if build_year and this_year:
        age = this_year - build_year
        if age <= BUILD_AGE_NEW_MAX:
            v, t = "good", (f"{build_year}년식(약 {age}년차) 준신축이라 실거주 매수층이 가장 두꺼운 구간이에요 "
                             f"— 연식만으로 걸러지는 일이 거의 없습니다.")
        elif age <= BUILD_AGE_OK_MAX:
            v, t = "ok", (f"{build_year}년식(약 {age}년차)이에요. 아주 불리하진 않지만 "
                           f"{BUILD_AGE_NEW_MAX}년 이내 물건과 나란히 놓이면 밀리는 편이라 가격으로 상쇄해야 합니다.")
        else:
            v, t = "warn", (f"{build_year}년식(약 {age}년차) 완전 구축이라 실거주 매수층이 확 좁아집니다 "
                             f"— 대출·보수비 부담까지 겹쳐 같은 값이면 더 새 물건으로 넘어가요. "
                             f"정비구역 기대감이 붙는 자리가 아니면 가격을 확실히 낮춰야 팔립니다.")
        item = {"key": "build_year", "label": "연식 (오래될수록 매수층이 좁아짐)", "verdict": v, "text": t,
                "why": "연식별로 거래량과 매수층이 다르니 따로 떼서 봐야 합니다"}
        # 연식이 오래되면 "매수층이 좁다"로 끝낼 게 아니라, 임장에서 뭘 보고
        # 비용을 어떻게 잡아야 하는지까지 알려준다(사용자 요청).
        if age > BUILD_AGE_OK_MAX:
            item["notes"] = [
                "🔎 임장에서 누수·노후도를 특히 유심히 보세요 — 천장·벽 모서리 물 자국, 창틀 결로·곰팡이, 배관에서 나오는 녹물, 외벽 균열, 옥상 방수 상태. 오래된 건물일수록 여기서 하자가 나옵니다.",
                f"💰 인테리어 비용을 넉넉히 잡으세요 — {age}년차면 도배·장판만으로 끝나지 않고 배관·창호·보일러까지 손봐야 하는 경우가 흔합니다. 위 인테리어 칸 공사비를 넉넉하게 넣고 다시 계산해 보세요.",
            ]
        elif age > BUILD_AGE_NEW_MAX:
            item["notes"] = [
                f"🔎 {age}년차면 배관·보일러·창호가 한 번 손볼 시기에 들어섭니다 — 임장 때 누수 자국과 수압을 같이 확인하고, 인테리어 비용을 도배·장판보다 여유 있게 잡으세요.",
            ]
        items.append(item)

    # 강의가 중요하다고 짚은 순서로 정렬하고(위 MARKETABILITY_ORDER), 판정이
    # 매겨진 항목에는 1부터 순번을 붙인다 — "무엇부터 봐야 하는지"가 화면에서
    # 바로 드러나게 하려는 것이다. 판정 없는 참고 항목(연식)은 번호 없이
    # 맨 뒤에 둔다.
    items.sort(key=lambda i: MARKETABILITY_ORDER.index(i["key"])
               if i["key"] in MARKETABILITY_ORDER else len(MARKETABILITY_ORDER))
    rank = 0
    for item in items:
        item["verdict_label"] = MARKETABILITY_VERDICT_LABELS.get(item["verdict"], "")
        if item["verdict"] == "info":
            item["rank"] = None
        else:
            rank += 1
            item["rank"] = rank

    scored = [i for i in items if i["verdict"] in MARKETABILITY_SCORES]
    if scored:
        score = round(sum(MARKETABILITY_SCORES[i["verdict"]] for i in scored) / len(scored))
    else:
        score = None

    if score is None:
        grade = "판단 보류"
    elif score >= 75:
        grade = "환금성 좋은 편"
    elif score >= 50:
        grade = "보통"
    else:
        grade = "주의 — 팔기 어려울 수 있음"

    weaknesses = [i["label"].split(" (")[0] for i in items if i["verdict"] == "warn"]
    # 요약도 한 덩어리 줄글이 아니라 문장 리스트로 돌려준다 — 화면에서
    # 줄을 나눠 보여주기 위해서다(32절 `build_verdict_parts()`와 같은 이유).
    if score is None:
        summary_lines = ["진단에 쓸 지표가 아직 부족해요."]
    elif weaknesses:
        summary_lines = [
            f"환금성 {score}/100 — {grade}.",
            f"약점은 {' · '.join(weaknesses)}입니다.",
            "'값만 맞으면 팔리긴 팔리는 빌라'가 되려면 이 항목들을 가격으로 상쇄해야 해요.",
        ]
    else:
        summary_lines = [
            f"환금성 {score}/100 — {grade}.",
            "눈에 띄는 약점 없이 고르게 괜찮은 편이에요.",
        ]

    return {"score": score, "grade": grade, "summary": " ".join(summary_lines),
            "summary_lines": summary_lines, "items": items, "weaknesses": weaknesses}


def print_marketability_report(report: dict):
    """41절 진단을 CLI 텍스트로 출력한다."""
    if not report["items"]:
        return
    head = f"{report['score']}/100 — {report['grade']}" if report["score"] is not None else report["grade"]
    print(f"[환금성·경쟁 진단] (규칙 기반 판정, 참고용) {head}")
    print("(중요한 순서대로 정렬했습니다 — 1번부터 보세요)")
    for item in report["items"]:
        icon = MARKETABILITY_ICONS.get(item["verdict"], "·")
        head = f"{item['rank']}. " if item.get("rank") else "참고. "
        print(f"{head}{icon} {item['label']} — {item['verdict_label']}")
        if item.get("facts"):
            print(f"   [건축물대장] {' · '.join(item['facts'])}")
        print(f"   {item['text']}")
        for note in item.get("notes") or []:
            print(f"   {note}")
        print(f"   └ {item['why']}")
    for line in report["summary_lines"]:
        print(f"→ {line}" if line is report["summary_lines"][0] else f"  {line}")
    print("⚠️ 이미 계산된 지표를 경험칙에 맞춰 등급만 매긴 규칙 기반 판정입니다 — 통계로 검증한 기준이 아닙니다.")
    print()


def compute_monthly_rent(realistic_sale_man: float, deposit_man: float, annual_rate_pct: float) -> float:
    """CLAUDE.md 23절 규칙: 전세가 아니라 8절에서 산출한 매도가(현실적 체결가)에
    전월세전환율을 적용해 예상 월세를 역산한다 (현업 공인중개사 확인 관행 —
    전세보증보험 가입한도 제한으로 순수 전세가 줄면서 매도가 기준 환산이
    일반화됐다). 실거래 데이터가 아닌 추정치이므로 항상 참고용임을 밝힌다."""
    return (realistic_sale_man - deposit_man) * annual_rate_pct / 100 / 12


def print_monthly_rent(realistic_sale_man: float, deposit_man: float, annual_rate_pct: float, fmt,
                        rate_source: str = "기본값", measured: dict | None = None) -> None:
    monthly_rent = compute_monthly_rent(realistic_sale_man, deposit_man, annual_rate_pct)
    print()
    print("[예상 월세 추정] (전월세전환율 역산, 예상 매도가 기준)")
    print(f"기준 매도가(현실적 체결가): {fmt(realistic_sale_man)}")
    print(f"가정: 월세보증금 {deposit_man:.0f}만원, 연 전환율 {annual_rate_pct:.1f}% ({rate_source})")
    print(f"예상 월세: {monthly_rent:.0f}만원/월")
    if measured is not None and abs(measured["rate"] - annual_rate_pct) > 0.05:
        print(f"참고: 반경 안 실제 월세 거래 {measured['n']}건으로 역산한 이 지역 실측 전환율은 {measured['rate']:.1f}%입니다"
              f" (예상 전세보증금 {measured['reference_deposit']:,.0f}만원 기준).")
    print("⚠️ 실거래 데이터가 아닌 추정치입니다 — 인근 실제 월세 매물과 비교해서 조정하세요.")
    print("   전환율은 법정 상한(기준금리+2%p)과 실제 시장 관행이 다를 수 있어 참고값일 뿐입니다.")


def seasonality_index(rows: list[dict]) -> dict[int, int] | None:
    """월별 거래량 지수(전체 평균=100)를 계산. 표본이 6개월 미만이면 None."""
    counts_by_month_year: dict[int, dict[str, int]] = {m: {} for m in range(1, 13)}
    for r in rows:
        try:
            month = int(r.get("dealMonth", "0"))
        except ValueError:
            continue
        if not 1 <= month <= 12:
            continue
        year = r.get("dealYear", "")
        counts_by_month_year[month][year] = counts_by_month_year[month].get(year, 0) + 1

    months_with_data = [m for m, years in counts_by_month_year.items() if years]
    if len(months_with_data) < 6:
        return None

    avg_by_month = {
        m: (sum(years.values()) / len(years) if years else 0)
        for m, years in counts_by_month_year.items()
    }
    overall_avg = statistics.mean(v for v in avg_by_month.values() if v > 0)
    return {m: round(v / overall_avg * 100) for m, v in avg_by_month.items()}


def compute_seasonality(all_rows: list[dict], dong: str) -> dict:
    """CLAUDE.md 12절 규칙: 연도 필터 없이 전체 기간으로 월별 거래 패턴을 본다."""
    non_cancelled = [r for r in all_rows if r.get("cdealType", "").strip() != "해제"]
    dong_rows = [r for r in non_cancelled if r.get("umdNm", "").strip() == dong.strip()]
    years_in_dong = {r.get("dealYear") for r in dong_rows if r.get("dealYear")}

    if len(dong_rows) >= 24 and len(years_in_dong) >= 2:
        scope_rows, scope_label = dong_rows, f"{dong}"
    else:
        scope_rows, scope_label = non_cancelled, "동 데이터 부족 — 조회 지역 전체"

    index = seasonality_index(scope_rows)
    if index is None:
        return {"scope_label": scope_label, "index": None, "busy": [], "slow": []}

    busy = sorted((m for m in index if index[m] >= 110), key=lambda m: index[m], reverse=True)[:3]
    slow = sorted((m for m in index if index[m] <= 90), key=lambda m: index[m])[:3]
    return {"scope_label": scope_label, "index": index, "busy": busy, "slow": slow}


def print_seasonality(season: dict):
    print()
    index = season["index"]
    if index is None:
        print("[계절성 분석] 표본이 부족해 계절성 분석을 생략합니다 (최소 6개월 이상 분포 필요).")
        return

    busy, slow = season["busy"], season["slow"]
    print(f"[계절성 분석] ({season['scope_label']} 기준, 거래량 지수 — 전체 평균=100)")
    print(" ".join(f"{m}월:{index[m]}" for m in range(1, 13)))
    print(f"거래 활발한 달: {', '.join(f'{m}월' for m in busy) if busy else '뚜렷한 성수기 없음'}")
    print(f"거래 적은 달: {', '.join(f'{m}월' for m in slow) if slow else '뚜렷한 비수기 없음'}")
    if busy:
        print("→ 매도 시점을 조정할 수 있다면 위 활발한 달 사이에 내놓는 것이 매수 수요가")
        print("  가장 많은 시기입니다. (참고용 통계이며 표본이 적을수록 신뢰도가 낮습니다)")
    else:
        print("→ 뚜렷한 계절성이 보이지 않아 매도 시점보다 가격 자체에 집중하는 것을 추천합니다.")


def _price_trend_monthly_series(all_rows: list[dict], dong: str) -> tuple[list[tuple[int, int, float]], str]:
    """15절(가격 추이)과 7-2절(시계열 보정)이 공유하는 집계 로직 — 월별 평균
    평당가(만원/㎡)를 (연, 월, 평균평당가) 튜플 리스트로 시간순 정렬해서 돌려준다.
    `compute_price_trend()`(15절 텍스트/그래프용 문자열 라벨 포맷)와
    `estimate_monthly_trend_rate()`(7-2절 월평균 변동률 추정)가 같은 집계를 두 번
    구현하지 않도록 이 함수 하나로 합쳤다."""
    non_cancelled = [r for r in all_rows if r.get("cdealType", "").strip() != "해제"]
    dong_rows = [r for r in non_cancelled if r.get("umdNm", "").strip() == dong.strip()]

    if len(dong_rows) >= 12:
        scope_rows, scope_label = dong_rows, dong
    else:
        scope_rows, scope_label = non_cancelled, "동 데이터 부족 — 조회 지역 전체"

    buckets: dict[tuple[int, int], list[float]] = defaultdict(list)
    for r in scope_rows:
        try:
            y, m = int(r.get("dealYear", "0")), int(r.get("dealMonth", "0"))
            area = float(r.get("excluUseAr", "nan"))
            amount = to_amount_man(r.get("dealAmount", ""))
        except (ValueError, TypeError):
            continue
        if not y or not 1 <= m <= 12 or amount != amount or not area:
            continue
        buckets[(y, m)].append(amount / area)

    series = sorted((y, m, statistics.mean(vals)) for (y, m), vals in buckets.items())
    return series, scope_label


def compute_price_trend(all_rows: list[dict], dong: str) -> dict:
    """CLAUDE.md 15절 규칙: 월별 평균 평당가(만원/㎡) 흐름을 시간순으로 뽑는다."""
    series, scope_label = _price_trend_monthly_series(all_rows, dong)
    if len(series) < 3:
        return {"scope_label": scope_label, "series": []}
    return {"scope_label": scope_label, "series": [(f"{y}.{m:02d}", avg) for y, m, avg in series]}


# 시계열 가격보정(7-2절) — 오래된 거래도 딱 이 개월수만큼만 보정하고, 그보다
# 먼 과거는 더 외삽하지 않는다(추세가 그만큼 오래 이어졌으리라는 가정이
# 약해지므로). 최종 보정 배율도 이 비율을 넘지 않게 clamp한다 — 5절 평당가
# 이상치 다운웨이트와 같은 "보정은 하되 폭주는 막는다"는 원칙이다.
TIME_CORRECTION_MAX_MONTHS = 12
TIME_CORRECTION_MAX_PCT = 0.15


def estimate_monthly_trend_rate(all_rows: list[dict], dong: str) -> float | None:
    """CLAUDE.md 7-2절 — 15절과 같은 월별 평당가 시계열의 첫 점과 마지막 점으로
    월평균 복리 변동률을 추정한다. 시계열이 3개월 미만이면(15절과 동일한 최소
    표본 기준) None을 돌려주고, 호출부는 조용히 시계열 보정을 건너뛴다."""
    series, _ = _price_trend_monthly_series(all_rows, dong)
    if len(series) < 3:
        return None
    y0, m0, v0 = series[0]
    y1, m1, v1 = series[-1]
    months_span = (y1 - y0) * 12 + (m1 - m0)
    if months_span <= 0 or v0 <= 0:
        return None
    return (v1 / v0) ** (1 / months_span) - 1


def time_correction_factor(deal_year: str, deal_month: str, this_year: int, this_month: int,
                            monthly_rate: float) -> float:
    """CLAUDE.md 7-2절 — 비교거래 하나를 "그 가격 수준이 지금까지의 추세를 따라
    지금 시점까지 왔다면 얼마"로 환산하는 배율. `months_ago`가 클수록 보정폭이
    커지지만 `TIME_CORRECTION_MAX_MONTHS`를 넘는 부분은 더 키우지 않고(먼
    과거일수록 그 추세가 그대로 이어졌으리라는 가정이 약해지므로 외삽을
    제한한다), 최종 배율도 `TIME_CORRECTION_MAX_PCT`(±15%) 안으로 clamp한다."""
    try:
        y, m = int(deal_year), int(deal_month)
    except (TypeError, ValueError):
        return 1.0
    months_ago = (this_year - y) * 12 + (this_month - m)
    months_ago = max(0, min(months_ago, TIME_CORRECTION_MAX_MONTHS))
    factor = (1 + monthly_rate) ** months_ago
    lo, hi = 1 - TIME_CORRECTION_MAX_PCT, 1 + TIME_CORRECTION_MAX_PCT
    return max(lo, min(hi, factor))


def compute_profit(bid_price_man: float, sale_price_man: float, acquisition_rate: float,
                    sale_rate: float, extra_cost_man: float) -> dict:
    """CLAUDE.md 19절 규칙: 낙찰가 대비 매도 시나리오별 순수익을 계산한다.
    모든 금액은 만원 단위. 세율/비용은 참고용 기본값이며 실제 상황(다주택 여부,
    규제지역, 명도비 등)에 따라 사용자가 직접 조정해야 한다.
    """
    total_cost = bid_price_man * (1 + acquisition_rate) + extra_cost_man
    sale_cost = sale_price_man * sale_rate
    net_profit = sale_price_man - total_cost - sale_cost
    roi_pct = (net_profit / total_cost * 100) if total_cost else 0
    return {"total_cost": total_cost, "net_profit": net_profit, "roi_pct": roi_pct}


def print_profit(bid_price_man: float, scenarios: dict, acquisition_rate: float,
                  sale_rate: float, extra_cost_man: float):
    def fmt(man):
        return f"{man / 10000:.2f}억"

    total_cost = bid_price_man * (1 + acquisition_rate) + extra_cost_man
    print()
    print(f"[수익성 계산] (낙찰가/입찰예정가 {fmt(bid_price_man)} 기준)")
    print(f"총 매수비용: {fmt(total_cost)} (낙찰가 + 취득 부대비용 {acquisition_rate*100:.1f}% + 추가비용 {fmt(extra_cost_man)})")
    print()
    print("매도 시나리오별 순수익:")
    labels = {
        "conservative": "보수적 급매가",
        "realistic": "현실적 체결가",
        "auction_price": "경매용 매도가",
        "upper": "상단 매도가",
        "ai_base": "AI 기준매도가",
        "listing": "권장 최초 호가",
    }
    for key, label in labels.items():
        result = compute_profit(bid_price_man, scenarios[key], acquisition_rate, sale_rate, extra_cost_man)
        sign = "+" if result["net_profit"] >= 0 else ""
        print(f"- {label} 기준: 순수익 {sign}{fmt(result['net_profit'])} (수익률 {sign}{result['roi_pct']:.1f}%)")
    print()
    print("⚠️ 취득세율은 다주택 여부·규제지역 여부에 따라 1.1%~최대 13%까지 크게 달라집니다.")
    print("   본인 상황에 맞는 정확한 세율로 --acquisition-rate를 조정하세요.")
    print("⚠️ 명도비·수리비·대출이자 등은 --extra-cost로 직접 반영해야 합니다 (기본값 0).")


def compute_condition_ladder(base_man: float, current_condition: str,
                              repair_costs: dict | None = None) -> list[dict]:
    """CLAUDE.md 38절: 지금 상태에서 손을 볼수록 매도가가 얼마나 올라가는지,
    그리고 그 공사비를 들일 값어치가 있는지를 한 표로 만든다.

    - `base_man`: 8절/8-2절 산출값 하나(만원). 이 값은 반경 안 실거래를
      섞어서 낸 값이라 **"기본"(깔끔한 보통 상태)** 을 가정한 것으로 본다 —
      그래서 각 단계 가격 = `base_man × CONDITION_MULTIPLIER[단계]`다.
    - `current_condition`: 지금 이 물건의 상태. 이 단계부터 위(더 좋은 상태)
      로만 사다리를 만든다 — 올수리된 집을 "노후로 되돌리면 얼마"는 의미가
      없어서다.
    - `repair_costs`: {단계: 예상 공사비(만원)} — 사용자가 넣은 값만 쓴다.
      넣으면 "추가 회수액 − 공사비 = 순증"까지 계산한다.

    ⚠️ 35절과 같은 한계가 그대로 적용된다 — 국토부 실거래가에는 수리상태
    필드가 없어 이 배율은 데이터로 검증할 수 없는 경험적 참고치다."""
    if current_condition not in CONDITION_MULTIPLIER:
        return []
    repair_costs = repair_costs or {}
    start = CONDITION_ORDER.index(current_condition)
    current_price = round(base_man * CONDITION_MULTIPLIER[current_condition], -1)

    rows = []
    for cond in CONDITION_ORDER[start:]:
        price = round(base_man * CONDITION_MULTIPLIER[cond], -1)
        gain = round(price - current_price, -1)
        cost = repair_costs.get(cond)
        row = {
            "condition": cond,
            "label": (CONDITION_CURRENT_LABELS[cond] if cond == current_condition
                       else CONDITION_STEP_LABELS[cond]),
            "is_current": cond == current_condition,
            "price_man": price,
            "gain_man": gain,
            "cost_man": cost,
            "net_man": None,
        }
        if cost is not None and cond != current_condition:
            row["net_man"] = round(gain - cost, -1)
        rows.append(row)
    return rows


def print_condition_ladder(rows: list[dict], base_label: str, fmt):
    """38절 사다리를 CLI 텍스트로 출력한다."""
    if not rows:
        return
    print(f"[상태별 매도가 3단계] ({base_label} 기준 — 같은 집이라도 수리 상태에 따라 매도가능가격이 달라집니다)")
    print("⚠️ 국토부 실거래가에는 수리상태 정보가 없어 검증된 수치가 아닙니다 — 현장 경험에서 나온 참고 배율(노후 0.90 · 기본 1.00 · 올수리 1.08)일 뿐입니다.")
    for row in rows:
        line = f"- {row['label']}: {fmt(row['price_man'])}"
        if not row["is_current"]:
            line += f" (현재 대비 +{fmt(row['gain_man'])})"
            if row["cost_man"] is not None:
                verdict = "남는 장사" if row["net_man"] > 0 else "손해"
                line += f" · 예상 공사비 {row['cost_man']:,.0f}만원 → 순증 {fmt(row['net_man'])} ({verdict})"
        print(line)
    if any(r["cost_man"] is None and not r["is_current"] for r in rows):
        print("  (예상 공사비를 넣으면 '고쳐서 남는지'까지 계산합니다)")
    print()


def compute_condition_adjustment(scenarios: dict, condition: str) -> dict:
    """CLAUDE.md 35절: 수리상태별 매도가능가격 참고 배율을 8절/8-2절 산출값에
    곱한 참고값을 만든다. 원래 값(scenarios)은 그대로 두고 별도 dict로 반환한다
    — 7-2절 시계열보정의 "원본은 그대로, 보정값은 별도 필드" 원칙과 같다."""
    multiplier = CONDITION_MULTIPLIER[condition]
    return {key: round(value * multiplier, -1) for key, value in scenarios.items()}


def print_condition_adjustment(scenarios: dict, condition: str, fmt):
    if condition not in CONDITION_MULTIPLIER or condition == "기본":
        return
    adjusted = compute_condition_adjustment(scenarios, condition)
    labels = {
        "conservative": "보수적 급매가",
        "realistic": "현실적 체결가",
        "auction_price": "경매용 매도가",
        "upper": "상단 매도가",
        "ai_base": "AI 기준매도가",
        "listing": "권장 최초 호가",
    }
    multiplier = CONDITION_MULTIPLIER[condition]
    sign = "+" if multiplier >= 1 else ""
    print(f"[수리상태 참고 배율] ({CONDITION_LABELS[condition]}, {sign}{(multiplier - 1) * 100:.0f}% 참고용)")
    print("⚠️ 국토부 실거래가에는 수리상태 정보가 없어 검증된 수치가 아닙니다 — 현장 경험에서 나온 참고 배율일 뿐입니다.")
    for key, label in labels.items():
        print(f"{label}: {fmt(scenarios[key])} → {fmt(adjusted[key])}")
    print()


def print_inspection_checklist():
    print()
    print("[임장 체크리스트] (참고용 — 매도가 계산에는 반영되지 않습니다)")
    print("아래 요소가 나쁘면 가격을 낮춰도 잘 안 팔릴 수 있어요 — 임장(현장답사) 때 직접 확인하세요:")
    print(", ".join(INSPECTION_CHECKLIST))
    print()


# CLAUDE.md 19절/45절 — 입지 체크 검색 반경. 1km였던 걸 1.5km로 넓혔다:
# 45절에서 "역까지 1.1km"와 "아예 없음"을 구분해서 판정해야 하는데, 1km에서
# 자르면 둘 다 "없음"으로 뭉개진다.
LOCATION_SEARCH_RADIUS_M = 1500

# 34절 주변 지형(산·하천) 검색 반경. 입지 체크(1.5km)와 **일부러 다르게**
# 1km로 둔다 — 45절 판정 때문에 넓힌 게 아니라 순수 참고 정보라, 너무
# 넓히면 "1.4km 떨어진 산"처럼 체감과 무관한 결과만 늘어난다. 웹에서는
# 두 결과가 한 카드에 같이 나오므로(19절 입지 체크의 "자연" 갈래) 반경이
# 다르다는 사실이 항목별 "N km 안에 없음" 문구로 드러난다.
TERRAIN_SEARCH_RADIUS_M = 1000

# 사용자가 "편의점이나 병원, 중학교 고등학교 등등 더 자세히 만들 수 있냐"고
# 물어서 세 개(지하철역·초등학교·마트)에서 열 개로 늘리고, 읽기 쉽게 네 갈래로
# 묶었다. 각 항목은 (키워드, 화면 라벨).
# ⚠️ **점수에 들어가는 건 지하철역·초등학교 둘뿐이다**(45절, `LOCATION_SCORED`)
#    — 나머지는 참고 정보로만 보여준다. 사용자와 정한 원칙: 편의점이 200m냐
#    400m냐가 빌라 매도 속도를 가르지는 않는데 다 점수에 넣으면 오히려
#    변별력이 흐려진다.
# ⚠️ 혐오시설(유흥가·모텔촌·공장)은 **일부러 뺐다** — 매도에 제일 크게
#    영향 주는 요소인 건 맞지만, 키워드 검색으로는 정확히 못 잡는다(34절
#    산·하천에서 겪은 것과 같은 한계). 없는 문제를 만들어내는 쪽이 더
#    해로워서 36절 임장 체크로 넘긴다.
LOCATION_GROUPS = [
    ("교통", "🚇", [("지하철역", "지하철역"), ("버스정류장", "버스정류장")]),
    ("교육", "🏫", [("초등학교", "초등학교"), ("중학교", "중학교"), ("고등학교", "고등학교")]),
    ("생활", "🏪", [("편의점", "편의점"), ("대형마트", "대형마트"), ("공원", "공원")]),
    ("의료", "🏥", [("병원", "병원"), ("약국", "약국")]),
]
# 45절 환금성 판정에 실제로 쓰이는 키워드 — 여기 없는 항목은 화면 참고용이다.
LOCATION_SCORED = ("지하철역", "초등학교")
LOCATION_KEYWORDS = [item for _name, _icon, items in LOCATION_GROUPS for item in items]


def compute_location_check(subject_coord: tuple[float, float],
                            keywords=None, radius_m: int = LOCATION_SEARCH_RADIUS_M) -> dict:
    """19절 입지 체크를 dict로 계산한다 — CLI 출력(`print_location_check`)과
    웹 버전, 45절 환금성 항목이 같은 결과를 나눠 쓴다.

    반환: {키워드: {"place": {...}|None, "error": str|None}}. 호출 실패는
    예외로 올리지 않고 `error`에 담는다 — 입지 체크는 참고 정보이지
    매도가 계산의 필수 조건이 아니다(20절/34절과 같은 원칙)."""
    from geocode import nearby_place

    # 항목이 10개라 순차로 돌리면 카카오를 열 번 줄줄이 기다린다 — 서로
    # 의존이 없어 병렬로 던진다(캐시가 차 있으면 어차피 즉시 끝난다).
    def _one(item):
        keyword = item[0]
        try:
            return keyword, {"place": nearby_place(subject_coord[0], subject_coord[1],
                                                    keyword, radius_m=radius_m), "error": None}
        except RuntimeError as e:
            return keyword, {"place": None, "error": str(e)}

    items = list(keywords or LOCATION_KEYWORDS)
    if not items:
        return {}
    with ThreadPoolExecutor(max_workers=GEOCODE_WORKERS) as executor:
        return dict(executor.map(_one, items))


def print_location_check(subject_coord: tuple[float, float]):
    """CLAUDE.md 19절 규칙: 카카오 로컬 API로 가까운 지하철역/초등학교/마트를 찾는다."""
    checked = compute_location_check(subject_coord)
    km = f"{LOCATION_SEARCH_RADIUS_M / 1000:.1f}km"
    print()
    print(f"[입지 체크] (카카오 로컬 기준, 반경 {km})")
    for group_name, icon, items in LOCATION_GROUPS:
        parts = []
        for keyword, label in items:
            got = checked.get(keyword) or {}
            if got.get("error"):
                parts.append(f"{label} 조회 실패")
            elif got.get("place"):
                parts.append(f"{label} {got['place']['name']} {got['place']['distance_m']}m")
            else:
                parts.append(f"{label} 없음")
        print(f"{icon} {group_name}: " + " · ".join(parts))
    print(f"※ 지하철역·초등학교 거리만 환금성 진단 판정에 쓰입니다 — 나머지는 참고 정보이고, "
          f"매도가 계산에는 어느 것도 반영되지 않아요. '없음'은 반경 {km} 안에 없다는 뜻입니다.")
    return checked


def compute_terrain_check(subject_coord: tuple[float, float]) -> dict:
    """CLAUDE.md 34절: 산/하천이 가까이 있는지를 카카오 키워드 검색으로 참고
    확인한다. CLI(`print_terrain_check`)와 웹 버전(`webapp/app.py`) 양쪽에서
    이 함수를 재사용한다.

    ⚠️ 실험적 기능이다 — 카카오 키워드 검색은 장소명에 그 글자가 포함되기만
    해도 걸리는 단순 텍스트 매칭이라(19절/26절의 지하철역·학교·마트 검색과
    달리 "산"·"강"·"천"은 카카오의 표준 장소 카테고리가 아니라 자연 지형이라
    전용 카테고리 코드도 없다), `geocode.nearby_place()`의 `name_suffix`
    필터로 "실제로 그 글자로 끝나는 이름"만 골라 노이즈를 줄였지만 완벽하지
    않다. 결과를 항상 참고용으로만 취급한다."""
    from geocode import nearby_place

    result = {"mountain": None, "mountain_error": None, "river": None, "river_error": None}

    try:
        result["mountain"] = nearby_place(subject_coord[0], subject_coord[1], "산",
                                           radius_m=TERRAIN_SEARCH_RADIUS_M, name_suffix="산")
    except RuntimeError as e:
        result["mountain_error"] = str(e)

    river_candidates = []
    river_error = None
    for keyword, suffix in [("강", "강"), ("천", "천")]:
        try:
            r = nearby_place(subject_coord[0], subject_coord[1], keyword,
                             radius_m=TERRAIN_SEARCH_RADIUS_M, name_suffix=suffix)
        except RuntimeError as e:
            river_error = str(e)
            continue
        if r:
            river_candidates.append(r)
    if river_candidates:
        result["river"] = min(river_candidates, key=lambda r: r["distance_m"])
    elif river_error and not river_candidates:
        result["river_error"] = river_error

    return result


def print_terrain_check(subject_coord: tuple[float, float]) -> None:
    terrain = compute_terrain_check(subject_coord)
    print()
    print("[주변 지형 참고] (카카오 로컬 키워드 검색, 반경 1km — 실험적, 참고용)")
    if terrain["mountain_error"]:
        print(f"가장 가까운 산: 조회 실패 ({terrain['mountain_error']})")
    elif terrain["mountain"]:
        print(f"가장 가까운 산: {terrain['mountain']['name']} ({terrain['mountain']['distance_m']}m)")
    else:
        print("가장 가까운 산: 1km 이내 없음")

    if terrain["river_error"]:
        print(f"가장 가까운 하천/강: 조회 실패 ({terrain['river_error']})")
    elif terrain["river"]:
        print(f"가장 가까운 하천/강: {terrain['river']['name']} ({terrain['river']['distance_m']}m)")
    else:
        print("가장 가까운 하천/강: 1km 이내 없음")
    print("⚠️ 키워드 검색 기반 참고용 정보라 정확도가 완벽하지 않을 수 있습니다 — 결과가 이상하면 실제 지도로 확인하세요.")


def print_broker_check(address: str, subject_coord: tuple[float, float], dong: str,
                        brokers_csv: str, radius_m: float):
    """CLAUDE.md 21절 규칙: 임장 시 바로 전화해볼 수 있는 인근 중개업소를 찾는다.
    서울은 사용자가 받아둔 CSV를 지오코딩해서 반경순, 경기도는 경기데이터드림
    API를 법정동 일치로만 필터한다 (개별 주소가 없어 거리순 정렬 불가). 다른
    시/도는 아직 데이터 소스가 없어 조용히 생략한다."""
    from broker_lookup import MAX_CANDIDATES, find_brokers_gyeonggi, find_nearby_brokers_seoul, load_seoul_brokers
    from lawd_lookup import find_gu_in_address

    print()
    if "서울특별시" in address:
        rows = load_seoul_brokers(brokers_csv)
        if not rows:
            print(f"[인근 중개업소] {brokers_csv}가 없어 생략합니다.")
            print(f"       서울 열린데이터광장에서 공인중개사사무소 정보 CSV를 받아 {brokers_csv}에 저장해 주세요.")
            return
        brokers, truncated = find_nearby_brokers_seoul(rows, subject_coord, dong, radius_m)
        print(f"[인근 중개업소] ({dong} 기준, 반경 {radius_m:.0f}m, 영업중만 — 서울 열린데이터광장 CSV)")
        if truncated:
            print(f"       (참고: {dong}에 영업중 사무소가 많아 상위 {MAX_CANDIDATES}건만 지오코딩했습니다)")
        if not brokers:
            print("반경 안에서 찾지 못했습니다.")
            return
        for b in brokers[:8]:
            print(f"- {b['name']} ({b['broker_name']}) {b['tel']} — {b['distance_m']:.0f}m")
    elif "경기도" in address:
        sigun_nm = find_gu_in_address(address)
        if not sigun_nm:
            print("[인근 중개업소] 주소에서 시/군 이름을 찾지 못해 생략합니다.")
            return
        sigun_nm = sigun_nm.split(" ")[0]  # 경기데이터드림은 구 단위가 아닌 시/군 단위로 추정됨
        try:
            brokers = find_brokers_gyeonggi(sigun_nm, dong)
        except RuntimeError as e:
            print(f"[인근 중개업소] 조회 실패: {e}")
            return
        print(f"[인근 중개업소] ({dong} 기준, 영업중만 — 경기데이터드림, ⚠️ 개별 주소 정보가 없어 거리순 정렬 불가)")
        if not brokers:
            print("같은 동에서 찾지 못했습니다.")
            return
        for b in brokers[:8]:
            print(f"- {b['name']} ({b['broker_name']}) {b['tel']}")
    else:
        return  # 서울/경기 외 지역은 아직 데이터 소스가 없다


def print_building_info(subject_detail: dict):
    """CLAUDE.md 20절 규칙: 건축물대장에서 승강기/세대수/사용승인일 등을 확인한다."""
    from building_register import get_building_info

    print()
    print("[건물 정보] (건축물대장 기준)")
    try:
        info = get_building_info(
            subject_detail.get("b_code"), subject_detail.get("main_no"),
            subject_detail.get("sub_no"), subject_detail.get("is_mountain", False),
        )
    except RuntimeError as e:
        print(f"조회 실패: {e}")
        return None

    if info is None:
        print("건축물대장 조회 결과가 없습니다 (API 미승인, 필드명 불일치, 주소 문제 등 확인 필요).")
        return None

    elevator_txt = f"있음 ({info['elevator_count']}대)" if info["has_elevator"] else "없음"
    print(f"승강기: {elevator_txt}")
    if info.get("household_count"):
        print(f"세대수: {info['household_count']}세대")
    if info.get("approval_date"):
        print(f"사용승인일: {info['approval_date']}")
    if info.get("ground_floors"):
        print(f"지상층수: {info['ground_floors']}층")
    # 사용자가 "위반건축물 딱지도 대장으로 확인되지 않냐"고 물어서 넣은 안내 —
    # 20절대로 이 오퍼레이션(getBrTitleInfo) 응답에는 해당 필드가 없다. 조용히
    # 빼두면 "확인됐다"고 오해할 수 있어서, 확인 못 한다는 사실을 명시한다.
    print("⚠️ 위반건축물 딱지(불법 증축·용도변경 등)는 이 조회로는 확인할 수 없습니다 — 표제부 조회 응답에 해당 필드가 없어서예요. 낙찰 전에 정부24 '건축물대장 열람'에서 직접 확인하세요. 위반건축물이면 대출·매도 양쪽에서 크게 불리해집니다.")
    return info  # 41절 환금성 진단이 승강기 유무·지상층수를 쓴다


def _trend_direction(delta, threshold=2.0, unit="p"):
    if delta is None:
        return "추세 판단 불가"
    if abs(delta) < threshold:
        return "보합"
    return f"{'상승' if delta > 0 else '하락'} 중 ({delta:+.1f}{unit})"


def print_market_trend(address: str):
    """CLAUDE.md 24절 규칙: 한국부동산원 연립다세대 매매수급동향지수(우리
    프로젝트 대상과 정확히 일치)를 참고용으로 보여준다. 매도가 계산에는
    반영하지 않는다. 지수 숫자만 던지면 이해하기 어려워서 쉬운 말로도
    풀어주고, 다른 지역/최초 집계 시점 대비 숫자로도 비교해준다.
    (KB부동산 스타일 아파트 지표는 사용자 요청으로 출력에서 뺐다 — 계산
    로직 자체는 market_index.py에 남아있어 필요하면 다시 켤 수 있다.)"""
    from market_index import (
        VILLA_SIDO_ALIAS, _plain_market_desc, compute_villa_market_trend,
        format_ranking_peers, latest_value_for, load_villa_market_index,
        load_villa_seoul_zone_index, rank_region, region_from_address,
        seoul_zone_from_address,
    )

    villa_zone = seoul_zone_from_address(address)
    villa_trend = None
    villa_label = None
    villa_is_zone = False
    villa_rows = None
    if villa_zone is not None:
        villa_rows = load_villa_seoul_zone_index()
        villa_trend = compute_villa_market_trend(villa_rows, villa_zone)
        if villa_trend is not None:
            villa_label = f"서울 {villa_zone}"
            villa_is_zone = True

    if villa_trend is None:
        villa_region = region_from_address(address, VILLA_SIDO_ALIAS)
        if villa_region is not None:
            villa_rows = load_villa_market_index()
            villa_trend = compute_villa_market_trend(villa_rows, villa_region)
            if villa_trend is not None:
                villa_label = villa_trend["region"]

    if villa_trend is not None:
        idx = villa_trend["index_latest"]
        unit_note = ("서울 내 5대 생활권(도심/동북/서북/서남/동남) 단위 참고용입니다 (개별 구/동 신호 아님)"
                     if villa_is_zone else "시/도 단위 참고용입니다 (구/동 단위 신호 아님)")
        print()
        print(f"[시장 동향 참고 - 연립다세대] ({villa_label}, 한국부동산원 매매수급동향지수, {villa_trend['snapshot_date']} 기준 스냅샷)")
        print(f"매매수급동향지수: {idx:.1f} (기준선 100 대비 {idx - 100:+.1f})")
        print(f"→ {_plain_market_desc(idx)}")
        since = villa_trend["since_start"]
        print(f"최근 3개월 추세: {_trend_direction(villa_trend['index_trend'])} "
              f"({villa_trend['start_date']} 최초 집계 {villa_trend['start_value']:.1f} → 지금 {idx:.1f}, {since:+.1f}p)")

        if villa_is_zone:
            zone_rank = rank_region(villa_rows, villa_zone, "index")
            if zone_rank is not None:
                print(f"서울 5개 생활권 비교 ({zone_rank['date']} 기준):")
                for line in format_ranking_peers(zone_rank["ranking"], villa_zone, max_show=5):
                    print(f"  {line}")
        national = latest_value_for(load_villa_market_index(), "전국", "index")
        if national is not None:
            _nat_date, nat_val = national
            print(f"전국 평균({nat_val:.1f}) 대비: {idx - nat_val:+.1f}p "
                  f"({'전국보다 강세' if idx > nat_val else '전국보다 약세' if idx < nat_val else '전국과 비슷'})")
        print(f"⚠️ {unit_note}. 매도가 계산에 자동 반영되지 않습니다.")
        print("   이 지표는 2025년 11월부터 모은 스냅샷이라 '작년 대비' 계산은 아직 할 수 없습니다 —")
        print(f"   대신 최초 집계({villa_trend['start_date']}) 대비 변화로 참고하세요. 최신 수치는 한국부동산원 R-ONE에서 확인하세요.")


def compute_distance_premium(filtered: list[dict], keyword: str = "지하철역",
                              search_radius_m: int = 1500, max_sample: int = 15) -> dict | None:
    """CLAUDE.md 26절 규칙: find_comparables()가 이미 지오코딩해둔 비교거래
    좌표를 재사용해서, 대상 시설(기본 지하철역)까지 거리와 평당가 사이의
    실제 관계를 단순 선형회귀로 추정한다 — "역에서 가까울수록 실제로 평당가가
    얼마나 비싼지"를 이 지역 실거래 데이터로 직접 계산한다 (19절 입지체크가
    대상 물건 하나의 거리만 보여주는 것과 달리, 여기서는 그 거리가 가격에
    실제로 얼마나 영향을 주는지까지 본다).

    이미 거리순으로 정렬된 filtered에서 가까운 상위 max_sample개만 쓴다 —
    카카오 키워드 검색을 비교거래마다 하나씩 호출해야 해서(geocode()와 달리
    결과가 좌표+키워드 조합마다 달라 캐시 재사용이 제한적이다) 비용을 이
    정도로 묶는다."""
    from geocode import nearby_place

    sample = filtered[:max_sample]

    def _lookup(r):
        return r, nearby_place(r["_lat"], r["_lon"], keyword, search_radius_m)

    points = []  # (시설까지 거리 m, 평당가 만원/㎡)
    with ThreadPoolExecutor(max_workers=GEOCODE_WORKERS) as executor:
        for r, place in executor.map(_lookup, sample):
            if place is None:
                continue
            area = float(r.get("excluUseAr", "nan") or "nan")
            if area != area or not area:
                continue
            points.append((place["distance_m"], r["_amount_man"] / area))

    if len(points) < 5:
        return None  # 표본이 너무 적으면(카카오에 시설이 안 잡히는 경우 포함) 회귀 자체가 무의미하다

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    n = len(points)
    mean_x, mean_y = sum(xs) / n, sum(ys) / n
    var_x = sum((x - mean_x) ** 2 for x in xs)
    if var_x == 0:
        return None  # 표본의 거리가 다 똑같으면(한 건물에 몰림 등) 기울기를 구할 수 없다

    cov_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    slope = cov_xy / var_x  # 거리 1m 늘어날 때 평당가(만원/㎡) 변화
    var_y = sum((y - mean_y) ** 2 for y in ys)
    r_squared = (cov_xy ** 2) / (var_x * var_y) if var_y > 0 else 0.0

    return {
        "n": n, "keyword": keyword,
        "change_per_100m": slope * 100,
        "pct_per_100m": (slope * 100 / mean_y * 100) if mean_y else 0,
        "r_squared": r_squared,
        "avg_price_ppyeong": mean_y,
        "mean_distance": mean_x,
        "min_distance": min(xs), "max_distance": max(xs),
    }


# 7-3절 역세권 회귀보정 — GPT 조언 반영. 26절 회귀는 원래 참고 정보일 뿐이었는데
# ("매도가 계산에 자동 반영되지 않습니다"), 이 임계치를 모두 만족할 때만 "만약
# 역세권 위치를 반영해서 보정하면" 이라는 **참고용 what-if 수치**를 하나 더
# 보여준다 — 24절 시장동향과 같은 원칙으로, 8절 공식 매도가 값(보수적 급매가/
# 현실적 체결가/상단 매도가/AI 기준매도가/권장 호가) 자체는 절대 건드리지
# 않는다. GPT가 원래 제안한 건 이 회귀식으로 8절 값 자체를 보정하는 것이었지만,
# 표본이 최대 15건뿐인 단순 선형회귀 하나로 공식 매도가를 바꾸는 건 위험 부담이
# 크다고 판단해 "별도 참고 수치"로 낮춰 잡았다.
STATION_REGRESSION_MIN_SAMPLE = 15  # 26절 max_sample과 동일 — 사실상 "가까운 15건을 다 구했을 때만"
STATION_REGRESSION_MIN_DISTANCE_SPREAD_M = 300  # 표본 거리가 다 몰려 있으면 기울기를 못 믿는다
STATION_REGRESSION_MIN_R_SQUARED = 0.3  # 26절 출력의 경고 임계치(0.2)보다 더 엄격하게 잡았다
STATION_REGRESSION_MAX_CORRECTION_PCT = 0.05  # 보정폭은 ±5%로 제한(GPT 제안 그대로)


def compute_distance_premium_correction(premium: dict | None, subject_distance_m: float) -> dict | None:
    """CLAUDE.md 7-3절 — compute_distance_premium()의 회귀가 아래 조건을 모두
    만족할 때만, 대상 물건의 실제 역까지 거리를 반영한 참고용 보정 배율을
    계산한다. 하나라도 안 맞으면 None을 돌려주고, 호출부는 조용히 생략한다
    (8절 매도가 계산 자체는 이 함수와 무관하게 항상 그대로 진행된다):
    - 표본 STATION_REGRESSION_MIN_SAMPLE(15건) 이상
    - 거리 범위(최대−최소)가 STATION_REGRESSION_MIN_DISTANCE_SPREAD_M(300m) 이상
    - 설명력 R²가 STATION_REGRESSION_MIN_R_SQUARED(0.3) 이상
    - 계수 방향이 상식적(역에 가까울수록 비싸짐, change_per_100m < 0)
    """
    if premium is None or premium["n"] < STATION_REGRESSION_MIN_SAMPLE:
        return None
    if premium["max_distance"] - premium["min_distance"] < STATION_REGRESSION_MIN_DISTANCE_SPREAD_M:
        return None
    if premium["r_squared"] < STATION_REGRESSION_MIN_R_SQUARED:
        return None
    if premium["change_per_100m"] >= 0:
        return None

    slope = premium["change_per_100m"] / 100  # 만원/㎡ per m
    diff_m = subject_distance_m - premium["mean_distance"]
    price_diff_ppyeong = slope * diff_m
    avg_price = premium["avg_price_ppyeong"]
    pct = (price_diff_ppyeong / avg_price) if avg_price else 0.0
    pct = max(-STATION_REGRESSION_MAX_CORRECTION_PCT, min(STATION_REGRESSION_MAX_CORRECTION_PCT, pct))

    return {
        "factor": 1 + pct, "pct": pct * 100,
        "subject_distance_m": subject_distance_m, "avg_distance_m": premium["mean_distance"],
    }


def print_distance_premium(filtered: list[dict], subject_coord: tuple[float, float] | None = None,
                            realistic_man: float | None = None, fmt=None, keyword: str = "지하철역") -> None:
    result = compute_distance_premium(filtered, keyword)
    print()
    label = keyword
    if result is None:
        print(f"[역세권 프리미엄 참고] 표본이 부족하거나({label}까지 거리가 다 비슷하거나 검색 결과가 없음) "
              "계산할 만한 관계를 찾지 못해 생략합니다.")
        return

    direction = "가까울수록 비싸지는" if result["change_per_100m"] < 0 else "가까울수록 오히려 싸지는"
    print(f"[역세권 프리미엄 참고] (반경 안 비교거래 {result['n']}건, {label}까지 거리 기준 — {result['min_distance']}~{result['max_distance']}m 분포)")
    print(f"{label}에서 100m 멀어질 때마다 평당가 {abs(result['change_per_100m']):.1f}만원/㎡ "
          f"({abs(result['pct_per_100m']):.1f}%) {'하락' if result['change_per_100m'] < 0 else '상승'} 경향")
    print(f"→ 이 지역 비교거래는 {label}에 {direction} 경향을 보입니다 (설명력 R²={result['r_squared']:.2f}, "
          f"1에 가까울수록 거리만으로 가격 차이가 잘 설명됨).")
    if result["r_squared"] < 0.2:
        print("⚠️ 설명력(R²)이 낮아 거리 외에 다른 요인(층·연식·개별 단지 차이 등)의 영향이 더 클 수 있습니다.")
    print("⚠️ 표본이 최대 15건인 단순 참고 통계입니다 — 매도가 계산에 자동 반영되지 않습니다.")

    if subject_coord is not None and realistic_man is not None and fmt is not None:
        from geocode import nearby_place

        try:
            subject_place = nearby_place(subject_coord[0], subject_coord[1], keyword)
        except RuntimeError:
            subject_place = None
        if subject_place is not None:
            correction = compute_distance_premium_correction(result, subject_place["distance_m"])
            if correction is not None:
                corrected = realistic_man * correction["factor"]
                print(f"→ [참고, 7-3절] 대상 물건은 {label}까지 {subject_place['distance_m']}m로 "
                      f"비교거래 평균({correction['avg_distance_m']:.0f}m)보다 "
                      f"{'가깝습니다' if subject_place['distance_m'] < correction['avg_distance_m'] else '멉니다'} — "
                      f"이 회귀를 반영해 보정하면 현실적 체결가는 {fmt(realistic_man)} → {fmt(corrected)}"
                      f"({correction['pct']:+.1f}%)입니다. ⚠️ 공식 매도가 값에는 반영되지 않은 참고용 수치입니다.")


def print_jeonse_comparison(rent_dir: str, subject_coord: tuple[float, float], area: float,
                             floor: int | None, build_year: str | None, radius_m: float,
                             year_min: int, this_year: int, gu_filter: str | None,
                             realistic_sale: float, fmt,
                             area_tolerance_pct: float = 0.15, build_year_tolerance: int = 4) -> None:
    """CLAUDE.md 16절 규칙: 매매가와 같은 반경/면적/연식/층 조건으로 예상 전세가를
    계산하고, 방금 계산한 매매 현실적 체결가와 나란히 비교한다."""
    rent_rows = dedupe_rent(load_transactions(rent_dir))
    if not rent_rows:
        return  # 전세 데이터가 없으면 조용히 생략한다 — 선택 기능이라 매매가 계산을 막지 않는다

    jeonse_rows = filter_pure_jeonse(rent_rows)
    jeonse_filtered = find_comparables(jeonse_rows, subject_coord, area, floor, build_year,
                                        radius_m, year_min, this_year, gu_filter,
                                        amount_field="deposit",
                                        area_tolerance_pct=area_tolerance_pct,
                                        build_year_tolerance=build_year_tolerance)
    if not jeonse_filtered:
        print()
        print(f"[예상 전세가] 반경 {radius_m:.0f}m, 유사면적 조건에 맞는 전세 비교거래를 찾지 못해 생략합니다.")
        return

    jscen = compute_scenarios(jeonse_filtered, radius_m, this_year, subject_area=area)
    print()
    print(f"[예상 전세가] (매매가와 동일 조건 — 반경 {radius_m:.0f}m, 유사면적·유사층·유사연식)")
    print(f"유효 비교거래: {jscen['n_total']}건 (반경 {radius_m:.0f}m 이내, {radius_m/2:.0f}m 이내 {jscen['n_close']}건 / {this_year}년 {jscen['n_this_year']}건)")
    print(f"시세 신뢰도: {jscen['confidence']}/100")
    print()
    print(f"보수적 급매 전세가: {fmt(jscen['p25'])}")
    print(f"현실적 전세가: {fmt(jscen['median'])}")
    print(f"상단 전세가: {fmt(jscen['p75'])}")
    print()
    print("핵심 전세 비교거래 (가까운 순):")
    for r in jeonse_filtered[:8]:
        floor_txt = f"{r.get('floor')}층" if r.get("floor") else "층정보없음"
        print(f"- {r.get('mhouseNm','(단지명없음)')} {r.get('excluUseAr','?')}㎡, {floor_txt}, "
              f"{r.get('dealYear')}.{r.get('dealMonth')} 계약, {fmt(r['_amount_man'])} — {r['_distance_m']:.0f}m")

    jeonse_realistic = jscen["median"]
    ratio = jeonse_realistic / realistic_sale * 100 if realistic_sale else 0
    gap = realistic_sale - jeonse_realistic
    print()
    print("[매매 vs 전세 비교]")
    print(f"예상 매매가(현실적 체결가): {fmt(realistic_sale)}")
    print(f"예상 전세가(현실적 전세가): {fmt(jeonse_realistic)}")
    print(f"전세가율: {ratio:.1f}%")
    print(f"갭(매매가 - 전세가, 갭투자 시 필요자금 근사): {fmt(gap)}")
    if ratio >= 80:
        print("→ 전세가율이 높은 편입니다. 매매가 대비 갭투자 부담이 적은 지역일 수 있습니다.")
    elif ratio >= 65:
        print("→ 평균적인 수준의 전세가율입니다.")
    else:
        print("→ 전세가율이 낮은 편입니다. 매매가에 거품이 있거나 전세 수요가 약할 수 있습니다.")
    print("⚠️ 참고용 통계이며 확정 판단이 아닙니다. 전세 매물 수가 매매보다 적어 표본이 부족할 수 있습니다.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="data/raw")
    ap.add_argument("--rent-dir", default="data/raw_rent", help="전월세 실거래가 XML 폴더 — 데이터가 있으면 예상 전세가와 매매 대비 비교도 함께 보여준다 (CLAUDE.md 16절)")
    ap.add_argument("--address", required=True, help="대상 물건의 지번 주소 (지오코딩용, 예: '서울특별시 강북구 수유동 468-202')")
    ap.add_argument("--dong", required=True, help="법정동명 — 계절성/가격추이 등 동네 단위 분석 범위로 쓰인다")
    ap.add_argument("--area", type=float, required=True,
                    help="대상 물건의 전용면적(㎡) — 0보다 커야 한다")
    ap.add_argument("--floor", type=int, default=None, help="대상 물건의 층 (선택 — 유사층 가중치 판단에 사용)")
    ap.add_argument("--build-year", default=None, help="대상 물건의 준공년도 (선택 — 유사연식 가중치 판단에 사용)")
    ap.add_argument("--radius", type=float, default=400,
                     help="비교 반경(미터), 기본 400m — 최소값일 뿐, 이 안에 비교거래가 7건 미만이면 자동으로 더 넓혀서 찾는다")
    ap.add_argument("--area-tolerance", type=float, default=15.0, help="면적 허용범위(%%, 기본 15) — 대상 물건 전용면적과 이 범위 안 오차인 실거래만 비교 대상으로 삼는다")
    ap.add_argument("--build-year-tolerance", type=int, default=4, help="준공년도 허용범위(년, 기본 4) — --build-year를 줬을 때만 적용")
    ap.add_argument("--year-min", type=int, default=None)
    ap.add_argument("--html", action="store_true", help="reports/ 폴더에 예쁜 HTML 리포트도 저장하고 브라우저로 연다")
    ap.add_argument("--bid-price", type=float, default=None, help="낙찰가/입찰예정가 (만원 단위) — 주면 수익성 계산도 같이 보여준다")
    ap.add_argument("--acquisition-rate", type=float, default=0.011, help="취득 부대비용률 (취득세+법무비 등 합산, 기본 1.1%% — 1주택/무주택 실수요 기준) — 다주택/규제지역이면 최대 13%%까지 올라가니 조정 필요")
    ap.add_argument("--sale-rate", type=float, default=0.005, help="매도 중개수수료율 (기본 0.5%%)")
    ap.add_argument("--extra-cost", type=float, default=0, help="명도비·수리비 등 추가비용 (만원 단위, 기본 0)")
    ap.add_argument("--no-location", action="store_true", help="입지 체크(지하철역/초등학교/마트 거리)와 34절 주변 지형 참고(산/하천)를 건너뛴다")
    ap.add_argument("--no-building-info", action="store_true", help="건축물대장 조회(승강기/세대수/사용승인일)를 건너뛴다")
    ap.add_argument("--brokers-csv", default="data/brokers_seoul.csv", help="서울 인근 중개업소 조회용 CSV 경로 (서울 열린데이터광장에서 받은 공인중개사사무소 정보)")
    ap.add_argument("--broker-radius", type=float, default=1000, help="인근 중개업소 조회 반경(미터), 기본 1000m")
    ap.add_argument("--no-brokers", action="store_true", help="인근 중개업소 조회를 건너뛴다")
    ap.add_argument("--monthly-deposit", type=float, default=None, help="예상 월세 추정용 월세보증금(만원) — 주면 23절 예상 월세 추정을 같이 보여준다")
    ap.add_argument("--conversion-rate", type=float, default=None, help="전월세전환율(연 %%) — 생략하면 반경 안 실제 월세 거래로 역산한 실측치를 쓰고, 그것도 없으면 6.0(참고용 기본값)으로 폴백한다")
    ap.add_argument("--no-market-trend", action="store_true", help="24절 시장 동향 참고 지표(매수우위지수 등)를 건너뛴다")
    ap.add_argument("--no-dong-compare", action="store_true", help="25절 인근 동 비교(거래활발도/가격상승률)를 건너뛴다")
    ap.add_argument("--station-premium", action="store_true", help="26절 역세권 프리미엄 참고(거리-가격 회귀)를 계산한다 — 카카오 키워드 검색을 비교거래마다 추가로 호출해서 기본은 꺼져 있다")
    ap.add_argument("--condition", choices=list(CONDITION_MULTIPLIER), default=None,
                     help="35절/38절 현재 수리상태 — 주면 상태별 매도가 3단계 사다리를 보여준다 (검증된 수치가 아닌 경험적 참고치)")
    ap.add_argument("--repair-cost-basic", type=float, default=None,
                     help="38절 기본 정리(청소·도배·장판 등) 예상 공사비(만원) — 주면 '고쳐서 남는지'까지 계산한다")
    ap.add_argument("--repair-cost-full", type=float, default=None,
                     help="38절 올수리(전체 리모델링) 예상 공사비(만원)")
    ap.add_argument("--inspection-bad", nargs="*", choices=INSPECTION_CHECKLIST, default=None,
                     metavar="항목",
                     help="43절 임장에서 걸린다고 본 항목 (예: --inspection-bad 누수 경사) — 41절 환금성 점수에 반영된다")
    ap.add_argument("--apt-dir", default="data/raw_apt",
                     help="40절 아파트 매매 실거래가 XML 폴더 — 데이터가 있으면 인근 아파트 대비 가격비율도 함께 보여준다")
    ap.add_argument("--inspection-clean", action="store_true",
                     help="43절 임장에서 8가지 항목 중 걸리는 게 없었음 — 41절 환금성 점수에 가점으로 반영된다")
    args = ap.parse_args()
    if args.area <= 0:                 # 54절 — argparse는 음수·0을 그대로 통과시킨다
        ap.error(f"--area는 0보다 커야 합니다 (받은 값: {args.area})")

    this_year = datetime.now().year
    this_month = datetime.now().month
    year_min = args.year_min or (this_year - 1)

    rows = dedupe(load_transactions(args.dir))
    if not rows:
        print(f"[안내] {args.dir} 폴더에서 유효한 XML 거래 데이터를 찾지 못했습니다.")
        print("       molit_rhtrade_api.py로 조회한 결과를 이 폴더에 .xml 또는 .txt로 저장해 주세요.")
        return

    from geocode import geocode_full
    from lawd_lookup import find_gu_in_address

    subject_detail = geocode_full(args.address)
    if subject_detail is None:
        print(f"[안내] 대상 물건 주소({args.address})를 좌표로 변환하지 못했습니다.")
        print("       카카오 개발자 콘솔에서 발급받은 KAKAO_REST_API_KEY가 .env에 있는지,")
        print("       주소 표기가 정확한지(지번 주소 권장) 확인해 주세요.")
        return
    subject_coord = (subject_detail["lat"], subject_detail["lon"])

    from naver_link import naver_land_url

    naver_url = naver_land_url(*subject_coord)
    print(f"[참고] 이 지역 네이버부동산 매물(빌라·매매) 바로 보기: {naver_url}")
    print()

    location_check = None
    if not args.no_location:
        location_check = print_location_check(subject_coord)
        print_terrain_check(subject_coord)

    if not args.no_brokers:
        print_broker_check(args.address, subject_coord, args.dong, args.brokers_csv, args.broker_radius)

    building_info = None
    if not args.no_building_info:
        building_info = print_building_info(subject_detail)

    print_inspection_checklist()

    if not args.no_market_trend:
        print_market_trend(args.address)

    gu_filter = find_gu_in_address(args.address)

    # ⚠️ 7-2절 시계열 가격보정은 껐다 — 어차피 기준연도 이후(보통 2년치)
    #    데이터만 쓰는데 그 안에서 다시 "지금 시세로 환산"하는 건 얻는
    #    것보다 헷갈리게 하는 쪽이 크다는 사용자 판단이다. 오래된 거래를
    #    덜 반영하는 건 7절 계약 시점 가중치가 이미 하고 있다.
    area_tolerance_pct = args.area_tolerance / 100
    # ⛔ 5절 적응형 반경도 껐다(사용자 요청) — 지정한 반경이 곧 계산 범위다.
    #    자세한 이유는 find_comparables_adaptive() 독스트링 참고.
    effective_radius = args.radius
    # 51-1절 — 같은 건물 판별에 쓸 대상 물건의 지번 신원. 카카오 지오코딩이
    # 이미 준 본번/부번을 그대로 쓰므로 **추가 호출이 0**이다. 못 만들면
    # None이라 예전처럼 좌표 20m 폴백으로 돌아간다.
    subject_building = building_identity_parts(
        args.dong, subject_detail.get("main_no"), subject_detail.get("sub_no"),
        bool(subject_detail.get("is_mountain")))

    filtered = find_comparables(
        rows, subject_coord, args.area, args.floor, args.build_year,
        args.radius, year_min, this_year, gu_filter,
        area_tolerance_pct=area_tolerance_pct,
        build_year_tolerance=args.build_year_tolerance,
        this_month=this_month,
        subject_building=subject_building,
        first_floor_ratio=FIRST_FLOOR_PRICE_RATIO)  # 64절 — 매매 경로만 켠다

    if not filtered:
        print(f"[안내] 반경 {args.radius:.0f}m 안에서 유사면적 조건에 맞는 비교거래를 찾지 못했습니다.")
        print("       반경을 넓히거나(--radius), 면적 허용범위를 넓히거나(--area-tolerance), "
              "data/raw에 더 많은 지역/기간 데이터를 추가해 보세요.")
        return

    scen = compute_scenarios(filtered, effective_radius, this_year, subject_area=args.area,
                             calibration=SALE_CALIBRATION_FACTOR)
    n_total, n_close, n_2026, confidence = scen["n_total"], scen["n_close"], scen["n_this_year"], scen["confidence"]
    conservative = scen["p25"]
    realistic = scen["median"]
    upper = scen["p75"]
    ai_base = round((conservative * 0.3 + realistic * 0.5 + upper * 0.2), -1)
    listing = round(upper * 1.03, -1)
    auction_price = round((conservative + realistic) / 2, -1)

    def fmt(man):
        eok = man / 10000
        return f"{eok:.2f}억"

    print(f"분석기간: {year_min}.01 ~ {this_year}.12")
    print(f"유효 비교거래: {n_total}건 (반경 {effective_radius:.0f}m 이내, {effective_radius/2:.0f}m 이내 {n_close}건 / {this_year}년 {n_2026}건)")
    print(f"시세 신뢰도: {confidence}/100")
    print()
    print(f"보수적 급매가: {fmt(conservative)}")
    print(f"현실적 체결가: {fmt(realistic)} (일반 매매 기준)")
    print(f"경매용 매도가: {fmt(auction_price)} (보수적 급매가~현실적 체결가 중간값 — 경매 낙찰 후 되파는 경우 참고)")
    print(f"상단 매도가: {fmt(upper)}")
    print(f"AI 기준매도가: {fmt(ai_base)}")
    print(f"권장 최초 호가: {fmt(listing)}")
    print()

    # 49-2절 — 백테스트 잔차 기반 예측구간. 신뢰도 점수와 달리 실측으로
    # 검증된 숫자라, 화면에서는 이쪽을 주된 신호로 읽는다.
    interval = compute_prediction_interval(
        realistic, filtered, args.area, scen.get("model_divergence_pct"))
    if interval:
        print(f"[예측구간] 현실적 체결가 {fmt(realistic)} 기준 — {interval['label']}")
        print(f"{interval['level']}% 구간: {fmt(interval['low_man'])} ~ {fmt(interval['high_man'])} (±{interval['pct']:.0f}%)")
        print(f"※ 비슷한 조건의 과거 실거래 {interval['sample_n']}건 중 {interval['level']}%가 이 범위 안에서 팔렸다는 뜻입니다 —")
        print(f"   통계 모형으로 유도한 신뢰구간이 아니라 백테스트 실측 오차 분포입니다.")
        print()

    if args.condition:
        # 38절 — 지금 상태에서 손볼수록 매도가가 얼마나 올라가는지 사다리로
        # 보여준다. 기준값은 경매용 매도가(8-2절) — 이 계산기가 전제하는
        # "낙찰받아 되파는" 상황에 가장 가까운 값이라서다.
        repair_costs = {}
        if args.repair_cost_basic is not None:
            repair_costs["기본"] = args.repair_cost_basic
        if args.repair_cost_full is not None:
            repair_costs["올수리"] = args.repair_cost_full
        print_condition_ladder(
            compute_condition_ladder(auction_price, args.condition, repair_costs),
            "경매용 매도가", fmt)

    liquidity = compute_liquidity(rows, subject_coord, args.area, this_year, gu_filter,
                                   area_tolerance_pct=area_tolerance_pct)

    verdict = build_verdict(confidence, n_total, liquidity=liquidity,
                             model_divergence_pct=scen.get("model_divergence_pct"))
    print("[종합 판단] (규칙 기반 자동 요약, 참고용)")
    print(verdict)
    print()

    # 40절 — 인근 아파트 대비 가격비율. data/raw_apt에 데이터가 없으면 조용히 생략.
    apt_gap = None
    if os.path.isdir(args.apt_dir):
        apt_gap = compute_apt_gap(dedupe(load_transactions(args.apt_dir)), args.dong,
                                   args.area, auction_price, this_year, year_min,
                                   subject_coord=subject_coord)
        print_apt_gap(apt_gap)

    # 49절 — 이 추정치를 얼마나 믿어도 되는지(경고등). 새로 계산하는 게 없다.
    # 50-1절 — 토지이용계획으로 정비구역 직접 확인(엔드포인트 미설정이면 생략).
    zone_check = None
    if subject_detail:
        try:
            from land_use import get_land_use_zones
            zone_check = is_redevelopment_zone(get_land_use_zones(
                subject_detail.get("b_code"), subject_detail.get("main_no"),
                subject_detail.get("sub_no"), bool(subject_detail.get("is_mountain"))))
        except Exception:
            zone_check = None
    print_estimate_warnings(compute_estimate_warnings(
        filtered, scen.get("model_divergence_pct"),
        detect_redevelopment_signal(rows, args.dong, this_year), zone_check))

    # 41절 — "얼마"(8절)와 별개로 "얼마나 잘 팔릴까"를 강의 기준으로 진단한다.
    print_marketability_report(build_marketability_report(
        floor=args.floor, build_year=args.build_year, this_year=this_year,
        confidence=confidence, liquidity=liquidity, building=building_info,
        inspection_bad=args.inspection_bad,
        inspection_clean=args.inspection_clean and not args.inspection_bad,
        apt_gap=apt_gap, location=location_check))

    tiers = compute_price_tiers(filtered, calibration=SALE_CALIBRATION_FACTOR,
                                subject_area=args.area)
    print("[가격 구간별 매도 전략] (비교거래 분포 안에서의 위치 기반 참고 라벨 — 실제 매도 소요일수 데이터는 아님)")
    for key in ("urgent", "d30", "d60", "normal", "test"):
        print(f"- {PRICE_TIER_LABELS[key]}: {fmt(tiers[key])}")
    print("⚠️ '30일/60일' 등은 확정된 판매 기간이 아니라, 가격이 비교거래 분포에서 낮을수록 빨리 팔릴 가능성이 높다는 참고용 목표 라벨입니다.")
    print()

    if liquidity is not None:
        c = liquidity["counts"]
        print(f"[거래량·유동성 점수] (유사면적 기준, 데이터상 최근 계약월 {liquidity['latest_year']}.{liquidity['latest_month']:02d} 기준)")
        for radius in liquidity["radii"]:
            m3, m6, m12 = c[(radius, 3)], c[(radius, 6)], c[(radius, 12)]
            print(f"- 반경 {radius}m: 최근 3개월 {m3}건(월평균 {m3/3:.1f}) · 6개월 {m6}건(월평균 {m6/6:.1f}) · 12개월 {m12}건(월평균 {m12/12:.1f})")
        print("※ 5절의 층/준공년도 하드 필터는 적용하지 않은, 유사면적만 기준으로 한 거래 빈도입니다.")
        print()

    build_year_note = f", 준공년도 ±{args.build_year_tolerance}년 이내" if args.build_year is not None else ""
    top_floor_map = estimate_building_top_floors(rows)
    print(f"핵심 비교거래 (과거 실거래 기준 — 국토교통부에 신고된 실제 체결 기록입니다, 지금 나온 매물 호가가 아닙니다):")
    print(f"가까운 순 — 반경 {effective_radius:.0f}m 안, 전용면적 ±{args.area_tolerance:.0f}%{build_year_note}인 "
          f"실거래 중 거리·면적·층·준공년도 종합 유사도(0~100점, 거리 35%·면적 30%·층 20%·준공년도 15%)가 "
          f"높을수록, 계약월이 최근일수록 가중치를 높게 준 것입니다:")
    # 64절 — 보정이 실제로 걸렸으면 반드시 알린다. 목록의 금액은 신고된 실제
    # 체결가 그대로라, 안 알리면 "표에 뜬 가격이랑 매도가가 왜 안 맞지"로 읽힌다
    # (7-2절 시계열 보정이 안내 문구를 단 것과 같은 이유). 웹에도 같은 문장이 있다.
    if any(c.get("_first_floor_factor") for c in filtered):
        _ff_pct = (1 - FIRST_FLOOR_PRICE_RATIO) * 100
        if args.floor == 1:
            print(f"  ※ 이 물건은 1층이라, 위층 실거래는 1층 시세대로 약 {_ff_pct:.0f}% 낮춰서 "
                  f"계산했습니다 (아래 목록의 금액은 신고된 실제 체결가 그대로입니다).")
        else:
            print(f"  ※ 비교거래 중 1층 건은 위층 시세대로 약 {_ff_pct:.0f}% 올려서 "
                  f"계산했습니다 (아래 목록의 금액은 신고된 실제 체결가 그대로입니다).")
    for r in filtered[:8]:
        floor_txt = format_floor_label(r, top_floor_map)
        note = describe_comparable_similarity(args.area, args.floor, args.build_year, r)
        print(f"- {r.get('mhouseNm','(단지명없음)')} {r.get('excluUseAr','?')}㎡, {floor_txt}, "
              f"{r.get('dealYear')}.{r.get('dealMonth')} 계약, {fmt(r['_amount_man'])} — {r['_distance_m']:.0f}m "
              f"(유사도 {r['_similarity_score']:.0f}점 · {note})")

    if args.station_premium:
        print_distance_premium(filtered, subject_coord, realistic, fmt)

    if args.monthly_deposit is not None:
        measured_rate = estimate_conversion_rate(args.rent_dir, subject_coord, args.area, args.floor,
                                                   args.build_year, args.radius, year_min, this_year, gu_filter,
                                                   area_tolerance_pct=area_tolerance_pct,
                                                   build_year_tolerance=args.build_year_tolerance)
        if args.conversion_rate is not None:
            effective_rate, rate_source = args.conversion_rate, "사용자 지정"
        elif measured_rate is not None:
            effective_rate = measured_rate["rate"]
            rate_source = f"실측치, 반경 안 월세 거래 {measured_rate['n']}건 기준"
        else:
            effective_rate, rate_source = 6.0, "기본값, 반경 안에 참고할 월세 실거래 없음"
        print_monthly_rent(realistic, args.monthly_deposit, effective_rate, fmt,
                            rate_source=rate_source, measured=measured_rate)

    print_jeonse_comparison(args.rent_dir, subject_coord, args.area, args.floor, args.build_year,
                             args.radius, year_min, this_year, gu_filter, realistic, fmt,
                             area_tolerance_pct=area_tolerance_pct,
                             build_year_tolerance=args.build_year_tolerance)

    if args.bid_price is not None:
        scenarios = {
            "conservative": conservative, "realistic": realistic, "auction_price": auction_price,
            "upper": upper, "ai_base": ai_base, "listing": listing,
        }
        print_profit(args.bid_price, scenarios, args.acquisition_rate, args.sale_rate, args.extra_cost)

    season = compute_seasonality(rows, args.dong)
    print_seasonality(season)

    trend = compute_price_trend(rows, args.dong)
    print()
    if trend["series"]:
        first_label, first_val = trend["series"][0]
        last_label, last_val = trend["series"][-1]
        change_pct = (last_val - first_val) / first_val * 100 if first_val else 0
        sign = "+" if change_pct >= 0 else ""
        print(f"[가격 추이] ({trend['scope_label']} 기준, {first_label} → {last_label})")
        print(f"평당가(만원/㎡) {first_val:.0f} → {last_val:.0f} ({sign}{change_pct:.1f}%)")
    else:
        print("[가격 추이] 그래프를 그리기엔 데이터가 부족합니다 (최소 3개월 이상 분포 필요).")

    if not args.no_dong_compare:
        from lawd_lookup import gu_name
        from rank_areas import print_dong_comparison

        gu_rows = [r for r in rows if gu_filter is None or gu_name(r.get("sggCd", "")) == gu_filter]
        print_dong_comparison(gu_rows, args.dong, gu_filter)

    if args.html:
        from report import render_report

        from naver_link import naver_land_url, naver_search_url

        comparables = [
            {
                "name": r.get("mhouseNm", "(단지명없음)"),
                "area": r.get("excluUseAr", "?"),
                "date": f"{r.get('dealYear')}.{r.get('dealMonth')}",
                "amount": r["_amount_man"],
                "label": f"{r['_distance_m']:.0f}m",
                "search_url": naver_search_url(f"{r.get('umdNm', '')} {r.get('mhouseNm', '')}".strip()),
                "map_url": naver_land_url(r["_lat"], r["_lon"], zoom=19) if r.get("_lat") is not None else None,
            }
            for r in filtered[:8]
        ]
        html_str = render_report(
            building=args.dong, dong=args.dong, area=args.area,
            period=f"{year_min}.01 ~ {this_year}.12", generated=datetime.now().strftime("%Y.%m.%d %H:%M"),
            confidence=confidence, conservative=conservative, realistic=realistic,
            upper=upper, ai_base=ai_base, listing=listing, auction_price=auction_price,
            n_total=n_total, n_close=n_close,
            comparables=comparables, season=season, trend=trend, filtered=filtered,
            naver_url=naver_url, this_year=this_year, this_month=this_month,
        )
        reports_dir = "reports"
        os.makedirs(reports_dir, exist_ok=True)
        out_name = f"{args.dong.replace(' ', '_')}_{datetime.now():%Y%m%d_%H%M%S}.html"
        out_path = os.path.join(reports_dir, out_name)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_str)
        print(f"\n[HTML 리포트 저장됨] {out_path}")
        try:
            os.startfile(out_path)  # Windows 전용: 기본 브라우저로 바로 열기
        except AttributeError:
            pass  # Windows가 아니면 자동으로 열지 않고 저장만 한다


if __name__ == "__main__":
    main()


# ──────────────────────────────────────────────────────────────────────
# CLAUDE.md 40절 — 인근 아파트 대비 가격비율
# ──────────────────────────────────────────────────────────────────────
# 사용자가 현업 중개사에게 배운 내용: **인근 아파트 시세가 높고 빌라와 차이가
# 많이 날수록 빌라가 잘 팔린다.** 아파트를 사고 싶은데 돈이 모자라 빌라로
# 내려오는 수요가 두텁고, 빌라 값은 결국 아파트와 "키 맞추기"를 하려는
# 경향이 있어서 상승 여력도 남는다는 것이다. 반대로 빌라가 아파트 값에
#바짝 붙어 있으면 "굳이 빌라를 살 이유"가 사라진다.
#
# 그래서 비율(빌라 ㎡당가 ÷ 아파트 ㎡당가)은 **낮을수록 좋다.**
# ⚠️ 구간 경계는 검증된 수치가 아니라 위 경험칙을 옮긴 참고값이다.
APT_GAP_GOOD_MAX = 0.60   # 이하: 갭이 넉넉함
APT_GAP_OK_MAX = 0.80     # 이하: 보통, 초과: 빌라 매력 약함
APT_GAP_MIN_SAMPLE = 5    # 이보다 적으면 비율을 못 믿으므로 계산 자체를 건너뛴다
# 같은 동에 아파트가 거의 없을 때 넓힐 범위 — **구 전체가 아니라 인접 동까지만**.
# 같은 구라도 반대편 끝 동네는 시세가 전혀 달라 기준선으로 쓸 수 없어서다.
# 동 경계 데이터는 없으므로 **동 중심 좌표 사이 거리**로 근사한다(2km 이내면
# 사실상 맞닿은 동네로 본다). ⚠️ 경계값은 경험적으로 끊은 참고치다.
APT_GAP_NEARBY_RADIUS_M = 2000


def _nearby_dong_names(apt_rows: list[dict], dong: str, gu_code: str,
                        subject_coord: tuple[float, float], radius_m: int) -> list[str]:
    """같은 구 안에서 대상 동과 **맞닿은 동네**의 이름만 고른다.

    동 경계 데이터가 없으므로 **동 중심 좌표 사이 거리**로 근사한다 — 각
    동을 "시도 시군구 동" 주소로 한 번씩만 지오코딩하면 되므로(한 구에
    보통 10~25개, `data/geocode_cache.json`에 캐시) 아파트 거래 수백 건을
    통째로 지오코딩하는 것과는 비용이 비교가 안 된다.

    지오코딩에 실패한 동은 조용히 건너뛴다 — 인접 여부를 모르는 동을
    "가깝다"고 넣는 것보다 빼는 쪽이 안전하다."""
    from geocode import geocode, haversine_m
    from lawd_lookup import gu_name, sido_name

    sido, gu = sido_name(gu_code), gu_name(gu_code)
    if not sido or not gu:
        return []

    candidates = {
        (r.get("umdNm") or "").strip()
        for r in apt_rows
        if (r.get("sggCd") or "").strip() == gu_code and (r.get("umdNm") or "").strip()
    }
    candidates.discard(dong.strip())

    # 한 구에 동이 10~25개라 순차로 돌리면 그만큼 카카오를 줄줄이 기다린다 —
    # 서로 의존이 없어 5절 비교거래 지오코딩과 같은 방식으로 병렬 처리한다.
    def _coord_of(name):
        try:
            return geocode(f"{sido} {gu} {name}")
        except Exception:
            return None

    names = sorted(candidates)
    if not names:
        return []
    with ThreadPoolExecutor(max_workers=GEOCODE_WORKERS) as executor:
        coords = list(executor.map(_coord_of, names))
    return [name for name, coord in zip(names, coords)
            if coord and haversine_m(subject_coord[0], subject_coord[1],
                                      coord[0], coord[1]) <= radius_m]


def compute_apt_gap(apt_rows: list[dict], dong: str, area: float, villa_price_man: float,
                    this_year: int, year_min: int,
                    area_tolerance_pct: float = 0.30,
                    lawd_cd: str | None = None,
                    subject_coord: tuple[float, float] | None = None,
                    nearby_radius_m: int = APT_GAP_NEARBY_RADIUS_M) -> dict | None:
    """같은 동(`umdNm`) 아파트 실거래의 ㎡당가 중앙값과 대상 빌라를 비교한다.

    - **지오코딩을 하지 않는다.** 5절처럼 반경으로 자르려면 아파트 거래마다
      카카오를 한 번씩 더 불러야 해서(7절에서 엘리베이터·역거리를 포기한
      것과 같은 비용 문제) 같은 법정동으로 근사한다. "인근 아파트 시세"는
      동 단위로도 충분히 잡힌다.
    - 면적 허용범위는 8절(±15%)보다 **넓게(±30%) 잡는다** — 빌라와 아파트는
      평형 구성 자체가 달라서 좁게 잡으면 표본이 거의 안 남는다. 어차피
      비교는 총액이 아니라 ㎡당가로 하므로 면적 차이에 덜 민감하다.
    - `cdealType`이 "해제"인 거래와 기준연도 미만은 4절 규칙대로 뺀다.

    반환: {"ratio", "apt_unit_price", "villa_unit_price", "n", "dong",
           "verdict", "gap_pct"} 또는 표본 부족 시 None."""
    if not apt_rows or not dong or not area or not villa_price_man:
        return None

    lo, hi = area * (1 - area_tolerance_pct), area * (1 + area_tolerance_pct)

    def _unit_prices(rows) -> list[float]:
        out = []
        for r in rows:
            if (r.get("cdealType") or "").strip() == "해제":
                continue
            try:
                if int(r["dealYear"]) < year_min:
                    continue
                a = float(r["excluUseAr"])
                amount = to_amount_man(r["dealAmount"])
            except (KeyError, ValueError, TypeError):
                continue
            if not a or amount is None or not (lo <= a <= hi):
                continue
            out.append(amount / a)
        return out

    dong_rows = [r for r in apt_rows if (r.get("umdNm") or "").strip() == dong.strip()]
    unit_prices = _unit_prices(dong_rows)
    scope, scope_label = "dong", dong

    # 같은 동에 아파트가 거의 없는 동네(빌라만 빼곡한 구도심 등)가 실제로
    # 있다 — 그럴 때 카드를 통째로 없애기보다 **바로 인접한 동까지만** 넓혀서
    # 보여주고, 어느 동을 끌어왔는지 화면에 밝힌다(5절 적응형 반경이 넓힌
    # 사실을 항상 알리는 것과 같은 원칙).
    # ⚠️ 구 전체로 넓히지 않는다 — 같은 구라도 반대편 끝 동네는 시세가 전혀
    #    달라 기준선으로 쓸 수 없다.
    nearby_dongs: list[str] = []
    if len(unit_prices) < APT_GAP_MIN_SAMPLE and subject_coord:
        gu_code = (lawd_cd or "").strip()
        if not gu_code and dong_rows:
            gu_code = (dong_rows[0].get("sggCd") or "").strip()
        if gu_code:
            nearby_dongs = _nearby_dong_names(apt_rows, dong, gu_code, subject_coord,
                                               nearby_radius_m)
            if nearby_dongs:
                scope_names = {dong.strip(), *nearby_dongs}
                near_rows = [r for r in apt_rows
                             if (r.get("sggCd") or "").strip() == gu_code
                             and (r.get("umdNm") or "").strip() in scope_names]
                widened = _unit_prices(near_rows)
                if len(widened) >= APT_GAP_MIN_SAMPLE:
                    unit_prices, scope = widened, "nearby"
                    scope_label = f"{dong}+인접 {len(nearby_dongs)}개 동"

    if len(unit_prices) < APT_GAP_MIN_SAMPLE:
        return None

    apt_unit = statistics.median(unit_prices)
    villa_unit = villa_price_man / area
    if apt_unit <= 0:
        return None

    ratio = villa_unit / apt_unit
    if ratio <= APT_GAP_GOOD_MAX:
        verdict = "good"
    elif ratio <= APT_GAP_OK_MAX:
        verdict = "ok"
    else:
        verdict = "warn"
    return _finish_apt_gap({
        "ratio": ratio,
        "ratio_pct": round(ratio * 100),
        "gap_pct": round((1 - ratio) * 100),
        "apt_unit_price": round(apt_unit),
        "villa_unit_price": round(villa_unit),
        "n": len(unit_prices),
        "dong": scope_label,
        "scope": scope,
        "widened": scope == "nearby",
        "nearby_dongs": nearby_dongs if scope == "nearby" else [],
        "verdict": verdict,
    })


def _finish_apt_gap(gap: dict) -> dict:
    gap["sentence"] = _apt_gap_sentence(gap)
    return gap


def print_apt_gap(gap: dict | None, fmt=None):
    """40절 결과를 CLI 텍스트로 출력한다."""
    if not gap:
        return
    widened = (f" — 같은 동 표본이 적어 인접 동({', '.join(gap['nearby_dongs'])})까지 넓혔습니다"
               if gap.get("widened") else "")
    print(f"[인근 아파트 대비] ({gap['dong']} 아파트 실거래 {gap['n']}건, 유사면적 ±30% ㎡당가 중앙값 기준{widened})")
    print(f"아파트 {gap['apt_unit_price']:,}만원/㎡ vs 이 빌라 {gap['villa_unit_price']:,}만원/㎡ "
          f"→ 아파트의 {gap['ratio_pct']}% 수준 (갭 {gap['gap_pct']}%)")
    print(f"→ {_apt_gap_sentence(gap)}")
    print("⚠️ 같은 동 아파트 실거래로 낸 참고 수치입니다 — 매도가 계산에는 반영되지 않습니다.")
    print()


def _apt_gap_sentence(gap: dict) -> str:
    if gap["verdict"] == "good":
        return (f"아파트와 값 차이가 넉넉해서(갭 {gap['gap_pct']}%), 아파트를 사려다 예산이 모자라 "
                "빌라로 내려오는 수요가 붙기 좋은 구간이에요.")
    if gap["verdict"] == "ok":
        return "아파트와의 격차가 보통 수준이에요 — 가격이 매도 속도를 가르는 구간입니다."
    return (f"이 빌라 값이 인근 아파트의 {gap['ratio_pct']}%까지 붙어 있어요 — "
            "이 정도면 매수자가 굳이 빌라를 고를 이유가 약해집니다.")
