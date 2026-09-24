"""대지권면적(`landAr`) — 실거래 응답에 이미 오고 있을지도 모르는 필드.

72-16절이 "남은 오차는 가중치가 아니라 **없는 정보**이고, 구축 빌라에서
가장 유력한 후보가 대지지분"이라고 정리했다. 그리고 72-16절 진단 화면
(`/building-check`)으로 **건축물대장에 대지면적(`platArea`)·연면적
(`totArea`)이 실제로 온다는 것이 확인됐다**(실측: 서대문구 홍은동 265-218 —
platArea 284 · totArea 424.8 · 비율 0.6685).

그런데 그 확인 직후에 더 값싼 길이 하나 드러났다.

⭐ **`landAr`(대지권면적)은 연립다세대 매매 실거래 응답 필드 목록에 원래
   있다** — `molit_rhtrade_api.py` 상단의 검증된 기술문서 표에 `excluUseAr`
   바로 옆에 적혀 있고, `_parse_response()`가 `{child.tag: ...}`로 **모든
   태그를 그대로 보관**하므로 값이 온다면 이미 행 안에 들어 있다.

왜 이게 중요한가 — 비용이 0이다:

| | 72-16절이 예상한 길 | `landAr`이 온다면 |
|---|---|---|
| 대상 물건 | 건축물대장 1회 (이미 부른다) | 추가 0회 |
| **비교거래 수십 건** | **건마다 건축물대장 1회** | **추가 0회** |

72-8절이 "국토부 호출이 임계경로"라고 못박았고 48-6절은 한도를 실제로
넘겼다 — 비교거래마다 조회를 하나씩 더 붙이는 건 요청당 호출을 두 배로
만드는 일이라 간단히 결정할 수 없었다. 이 필드가 오면 그 문제가 통째로
사라진다.

⚠️ **그런데 값이 실제로 채워져 오는지는 아직 못 봤다.** 기술문서 표에
   있다는 것과 응답에 값이 들어 있다는 것은 다르다(21·27·50-1절이 지켜온
   구분 그대로다). 그래서 이 모듈은 **가격을 한 글자도 바꾸지 않고**,
   "오는가 / 온다면 쓸모가 있는가"만 재는 장치다.

⚠️ **온다고 해서 자동으로 쓸모가 있는 것도 아니다.** 아래 `summarize()`가
   재는 두 번째 질문이 그것이다 — 한 동네 빌라가 전부 용적률 상한에 맞춰
   지어졌다면 대지지분율이 거의 상수라 **정보가 0이다.** 채워져 오더라도
   흩어짐이 없으면 이 가설은 거기서 끝난다.
"""

import statistics

try:
    from estimate_price import is_usable_number
except ImportError:                     # 단독 실행·테스트 경로
    import math

    def is_usable_number(value: float) -> bool:
        return value == value and -math.inf < value < math.inf and value > 0


#: 검증된 기술문서 표에 적힌 이름 그대로. 추측한 이름이 아니다.
LAND_AREA_FIELD = "landAr"

#: 대지지분율이 이 배수보다 덜 흩어져 있으면 신호로 쓸 수 없다고 본다.
#: ⚠️ 검증된 기준이 아니라 "p90이 p10의 1.2배도 안 되면 사실상 상수"라는
#:    읽기용 눈금이다 — 실측이 쌓이면 고친다.
FLAT_SPREAD_MAX = 1.2

#: 흩어짐을 말하려면 최소 이만큼은 있어야 한다(분위수가 의미를 가지려면).
MIN_SAMPLE = 20


def _number(value):
    """문자열로 오는 실거래 필드를 관대하게 읽는다 (못 읽으면 None)."""
    try:
        number = float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None
    # ⚠️ 72-7절 — NaN·무한대는 `> 0` 같은 가드를 그냥 통과한다.
    return number if is_usable_number(number) else None


def land_area_sqm(row: dict):
    """그 거래 행의 대지권면적(㎡). 없거나 못 읽으면 None."""
    return _number((row or {}).get(LAND_AREA_FIELD))


def land_share_ratio(row: dict):
    """대지지분율 = 대지권면적 ÷ 전용면적. 없으면 None.

    ⚠️ **전용면적으로 나누는 이유**: 대지권면적 자체는 큰 집이 크게 나오는
    게 당연해서 그대로는 비교가 안 된다. 전용면적 1㎡당 딸린 땅이 얼마인지로
    바꿔야 "같은 평형인데 땅을 많이 낀 집"이 드러난다.

    ⚠️ 건축물대장 쪽 비율(`platArea/totArea`, 72-16절)과 **분모가 다르다** —
    그쪽은 연면적(전유+공용)이라 값이 더 작게 나온다. 둘을 섞어서 같은
    숫자인 양 쓰면 안 된다.
    """
    land = land_area_sqm(row)
    area = _number((row or {}).get("excluUseAr"))
    if land is None or area is None:
        return None
    return land / area


def summarize(rows: list[dict]) -> dict:
    """이 필드가 **오는가**, 온다면 **흩어져 있는가**를 한 번에 잰다.

    돌려주는 것:
      - `total` / `with_land` / `fill_pct` : 채워져 오는 비율
      - `p10` / `p50` / `p90` / `spread`   : 대지지분율의 흩어짐 (spread = p90/p10)
      - `verdict` : no_field / sparse / thin / flat / varies
      - `note`    : 그 판정을 사람 말로 한 줄

    ⚠️ 네트워크를 타지 않는다 — 이미 받아 둔 행만 읽는다.
    """
    rows = rows or []
    total = len(rows)
    ratios = [r for r in (land_share_ratio(row) for row in rows) if r is not None]
    with_land = len(ratios)
    fill_pct = (with_land / total * 100) if total else 0.0

    out = {"total": total, "with_land": with_land, "fill_pct": round(fill_pct, 1),
           "p10": None, "p50": None, "p90": None, "spread": None,
           "verdict": "no_field", "note": ""}

    if with_land == 0:
        out["note"] = (f"조회한 {total}건 어디에도 대지권면적(`{LAND_AREA_FIELD}`)이 "
                       "채워져 오지 않습니다 — 이 길은 막혔고, 대지지분을 쓰려면 "
                       "비교거래마다 건축물대장을 따로 조회하는 수밖에 없습니다.")
        return out

    if fill_pct < 50:
        out["verdict"] = "sparse"

    ordered = sorted(ratios)

    def _q(p):
        if len(ordered) == 1:
            return ordered[0]
        pos = p * (len(ordered) - 1)
        lo = int(pos)
        hi = min(lo + 1, len(ordered) - 1)
        return ordered[lo] + (ordered[hi] - ordered[lo]) * (pos - lo)

    out["p10"], out["p50"], out["p90"] = round(_q(0.10), 3), round(_q(0.50), 3), round(_q(0.90), 3)
    if out["p10"] > 0:
        out["spread"] = round(out["p90"] / out["p10"], 2)

    if with_land < MIN_SAMPLE:
        out["verdict"] = "thin"
        out["note"] = (f"{with_land}건에만 값이 있어 흩어짐을 말하기엔 이릅니다 "
                       f"(최소 {MIN_SAMPLE}건). 값 자체는 오고 있습니다.")
        return out

    if out["spread"] is not None and out["spread"] < FLAT_SPREAD_MAX:
        out["verdict"] = "flat"
        out["note"] = (f"값은 오는데 거의 상수입니다 (상위 10%가 하위 10%의 "
                       f"{out['spread']}배뿐) — 한 동네 빌라가 다 비슷한 밀도로 "
                       "지어졌다는 뜻이라, 이걸 계산에 넣어도 비교거래를 "
                       "가려내지 못합니다.")
        return out

    out["verdict"] = "varies" if out["verdict"] != "sparse" else "sparse"
    spread_txt = f"상위 10%가 하위 10%의 {out['spread']}배" if out["spread"] else "흩어짐 있음"
    prefix = (f"{out['fill_pct']}%에만 값이 있지만, " if out["verdict"] == "sparse" else "")
    out["note"] = (f"{prefix}전용 1㎡당 대지지분이 {out['p10']}~{out['p90']}㎡로 "
                   f"갈립니다 ({spread_txt}) — 비교거래를 가려낼 만한 흩어짐입니다. "
                   "다음은 이 값이 실제로 오차를 예측하는지 백테스트로 재는 것입니다.")
    return out
