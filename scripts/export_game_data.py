#!/usr/bin/env python3
"""74절 — 저장소에 쌓인 실제 데이터를 게임용 JS 한 파일로 굽는다.

73절 `export_scenario.py`가 **물건 하나**의 정답지를 굽는다면, 이 스크립트는
**게임 전체가 쓰는 판**을 굽는다 — 전국 지역 맵, 시장 분위기, 시세 맞히기
문제, 매도 판정 규칙.

⚠️ **네트워크를 타지 않는다.** `data/`·`reports/`에 이미 있는 파일과
`scripts/estimate_price.py`의 상수만 읽는다. API 키가 필요 없고, 따라서
결과 파일에 키가 섞일 길도 없다(6절).

⚠️ **숫자를 손으로 적지 않는다.** 배율·경계값은 전부 `estimate_price.py`에서
직접 읽어 온다 — 72-13절 교훈 #4·#5(남의 파일을 먼저 읽는다, 기억으로
쓰지 않는다)를 이 스크립트 자체에 적용한 것이다. 계산기 상수를 고치면
다시 구울 때 게임 쪽도 따라온다.

사용법:
    python3 scripts/export_game_data.py --out game/auction-game-data.js
"""
from __future__ import annotations

import argparse
import csv
import html
import json
import os
import re
import subprocess
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

import estimate_price as ep          # noqa: E402
import listing_parser as lp          # noqa: E402

SCHEMA = 1

# 69절 — 원본이 광주광역시와 전라남도를 한 라벨로 묶어 내려보내 둘을 가를 수 없다.
SKIP_SIDO = {"전남광주"}
MIN_TOTAL = 200          # 69절과 같은 기준
YOUNG_AGES = ("30대", "40대")


# ----------------------------------------------------------------- 지역 맵
def build_regions() -> tuple[list[dict], dict]:
    """매입자 연령대 표 → 전국 시군구 맵 (게임 스테이지 고르기용)."""
    path = os.path.join(ROOT, "data", "buyer_age_by_region.csv")
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))

    table: dict[tuple[str, str], dict[str, dict[str, int]]] = {}
    for r in rows:
        sido = (r.get("sido") or "").strip()
        gu = (r.get("sigungu") or "").strip()
        age = (r.get("age") or "").strip()
        if not sido or sido in SKIP_SIDO:
            continue
        cell = table.setdefault((sido, gu), {})
        cell[age] = {y: _int(r.get(y)) for y in ("2019", "2025")}

    def young_pct(cell, year):
        total = cell.get("합계", {}).get(year, 0)
        etc = cell.get("기타", {}).get(year, 0)
        base = total - etc
        if total < MIN_TOTAL or base < MIN_TOTAL:
            return None
        young = sum(cell.get(a, {}).get(year, 0) for a in YOUNG_AGES)
        return round(young / base * 100, 1)

    # 시/도 평균 (합계 행)
    sido_young = {}
    for (sido, gu), cell in table.items():
        if gu:
            continue
        v = young_pct(cell, "2025")
        if v is not None:
            sido_young[sido] = v
    national = sido_young.pop("전국", None)

    regions = []
    for (sido, gu), cell in table.items():
        if not gu:
            continue
        y = young_pct(cell, "2025")
        if y is None:
            continue
        vol25 = cell.get("합계", {}).get("2025", 0)
        vol19 = cell.get("합계", {}).get("2019", 0)
        growth = round((vol25 - vol19) / vol19 * 100, 1) if vol19 >= MIN_TOTAL else None
        regions.append({
            "sido": sido, "gu": gu,
            "young": y,
            "sidoYoung": sido_young.get(sido),
            "vol": vol25,
            "growth": growth,
        })

    regions.sort(key=lambda r: (-r["young"], r["sido"], r["gu"]))
    # 전국 사분위로 매수층 두께 등급 — 절대 기준이 아니라 상대 위치다
    vals = sorted(r["young"] for r in regions)
    q1, q3 = vals[len(vals) // 4], vals[len(vals) * 3 // 4]
    for i, r in enumerate(regions, 1):
        r["rank"] = i
        r["demand"] = "두꺼움" if r["young"] >= q3 else ("얇음" if r["young"] <= q1 else "보통")

    meta = {
        "national": national,
        "sido": sido_young,
        "count": len(regions),
        "q1": q1, "q3": q3,
        "min": vals[0], "max": vals[-1],
    }
    return regions, meta


# ------------------------------------------------------------- 시장 분위기
# ⚠️ 원본 CSV에는 시/도 행과 **권역 행이 섞여 있다**(경기 7권역·부산 3권역·
# 서울 강남/강북지역). 24절이 "권역을 구성하는 시/군/구 목록을 신뢰할 수 있게
# 확인하지 못해 시/도 단위로만 쓴다"고 정해 둔 그대로, 게임에도 시/도만 내보낸다
# — 안 가르면 게임 쪽이 '경부1권'을 시/도로 착각한다.
SIDO_KEYS = ("전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산",
             "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주")


def build_market() -> dict:
    """한국부동산원 연립다세대 매매수급동향지수 → 이번 판의 시장 분위기."""
    def latest(path):
        out = {}
        for r in csv.DictReader(open(os.path.join(ROOT, "data", path), encoding="utf-8-sig")):
            d, reg, idx = (r.get("date") or "").strip(), (r.get("region") or "").strip(), r.get("index")
            if not d or not reg:
                continue
            try:
                v = float(idx)
            except (TypeError, ValueError):
                continue
            if reg not in out or d > out[reg][0]:
                out[reg] = (d, v)
        return out

    raw = latest("reb_villa_market_index.csv")
    zone = latest("reb_villa_market_index_seoul_zone.csv")
    sido = {k: v for k, v in raw.items() if k in SIDO_KEYS}
    dropped = sorted(set(raw) - set(sido))
    asof = max([d for d, _ in list(sido.values()) + list(zone.values())], default=None)
    return {
        "asof": asof,
        "baseline": 100,
        "sido": {k: v for k, (_, v) in sorted(sido.items())},
        "seoulZone": {k: v for k, (_, v) in sorted(zone.items())},
        "droppedRegions": dropped,
        "note": "100보다 높으면 사려는 사람이 많은 쪽(집주인 우위), 낮으면 그 반대예요.",
    }


# --------------------------------------------------- 시세 맞히기 (실제 리포트)
_EOK = re.compile(r"^([\d.]+)억$")


def build_appraise() -> list[dict]:
    """`reports/*.html`(실제로 돌린 결과) → 시세 맞히기 문제.

    ⚠️ 정답이 **계산기가 부른 값**이지 실제 체결가가 아니다 — 73-1절이
    적어둔 한계 그대로이고, 문제 문구에도 그렇게 적는다.
    """
    out = []
    for path in sorted(_glob_reports()):
        t = open(path, encoding="utf-8").read()
        m = re.search(r"<h1[^>]*>(.*?)</h1>", t, re.S)
        title = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""
        dong = title.split()[0] if title else os.path.basename(path).split("_")[0]

        sub = re.search(r"전용\s*([\d.]+)\s*㎡", t)
        area = float(sub.group(1)) if sub else None
        per = re.search(r"분석기간\s*([\d.]+)\s*~\s*([\d.]+)", html.unescape(re.sub(r"<[^>]+>", " ", t)))

        # 산출값 카드
        vals = {}
        for lab, val in re.findall(
                r'class="label"[^>]*>([^<]+)</div>\s*<div class="value"[^>]*>([^<]+)<', t):
            mm = _EOK.match(val.strip())
            if mm:
                vals[lab.strip()] = float(mm.group(1))

        # 비교거래 표
        comps = []
        for tb in re.findall(r"<table.*?</table>", t, re.S):
            heads = [html.unescape(re.sub(r"<[^>]+>", "", h)).strip()
                     for h in re.findall(r"<th[^>]*>(.*?)</th>", tb, re.S)]
            if "단지명" not in heads:
                continue
            for r in re.findall(r"<tr[^>]*>(.*?)</tr>", tb, re.S):
                cells = [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip()
                         for c in re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)]
                if len(cells) < 5:
                    continue
                name = re.sub(r"[🗺️🔍\s]+$", "", cells[0]).strip()
                a = re.sub(r"[^\d.]", "", cells[1])
                price = _EOK.match(cells[3].strip())
                comps.append({
                    "name": name,
                    "area": float(a) if a else None,
                    "ym": cells[2],
                    "price": float(price.group(1)) if price else None,
                    "dist": re.sub(r"[^\d]", "", cells[4]),
                })
            break

        n = re.search(r"유효 비교거래\s*(\d+)건", html.unescape(re.sub(r"<[^>]+>", " ", t)))
        out.append({
            "id": f"ap-{dong}",
            "dong": dong,
            "area": area,
            "period": [per.group(1), per.group(2)] if per else None,
            "compTotal": int(n.group(1)) if n else len(comps),
            "comps": comps,
            "answer": vals,
        })
    return out


def _glob_reports():
    d = os.path.join(ROOT, "reports")
    return [os.path.join(d, f) for f in os.listdir(d) if f.endswith(".html")] if os.path.isdir(d) else []


# ------------------------------------------------------------------- 규칙
def build_rules() -> dict:
    """계산기 상수를 그대로 옮긴다 — 손으로 적지 않는다."""
    return {
        "condition": ep.CONDITION_MULTIPLIER,
        "conditionNote": "국토부 실거래에는 수리상태 필드가 없어 검증된 수치가 아니에요 — 현장 경험에서 나온 참고 배율입니다.",
        "tierLabels": ep.PRICE_TIER_LABELS,
        "pressure": [{"upto": u, "label": l, "note": n} for u, l, n in lp.SALE_PRESSURE_BANDS],
        "interval": {
            "pct": {str(k): v for k, v in ep.PREDICTION_INTERVAL_PCT.items()},
            "risks": {
                "small": ep.PREDICTION_RISK_SMALL_AREA_SQM,
                "oldBuildYear": ep.PREDICTION_RISK_OLD_BUILD_YEAR,
                "divergencePct": ep.PREDICTION_RISK_DIVERGENCE_PCT,
            },
            "note": "위험요인 개수(0~3)만큼 범위가 넓어져요. 통계 모형이 아니라 과거 거래에 계산기를 다시 돌려본 실측 오차 분포입니다.",
        },
        "location": {
            "stationNear": ep.STATION_NEAR_M, "stationOk": ep.STATION_OK_M,
            "schoolNear": ep.SCHOOL_NEAR_M, "schoolOk": ep.SCHOOL_OK_M,
        },
        "buildAge": {"new": ep.BUILD_AGE_NEW_MAX, "ok": ep.BUILD_AGE_OK_MAX},
        "aptGap": {"good": ep.APT_GAP_GOOD_MAX, "ok": ep.APT_GAP_OK_MAX},
        "firstFloor": ep.FIRST_FLOOR_PRICE_RATIO,
        "inspection": ep.INSPECTION_CHECKLIST,
        "marketabilityOrder": ep.MARKETABILITY_ORDER,
        "thinSample": {"n": ep.ESTIMATE_WARN_THIN_SAMPLE,
                       "oldBuildYear": ep.ESTIMATE_WARN_THIN_OLD_BUILD_YEAR},
    }


# ------------------------------------------------------------------ 유틸
def _int(v):
    try:
        return int(str(v).replace(",", "").strip())
    except (TypeError, ValueError):
        return 0


def _version():
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT,
                              capture_output=True, text=True, timeout=5).stdout.strip() or "local"
    except Exception:
        return "local"


def main(argv=None):
    ap = argparse.ArgumentParser(description="게임용 데이터 한 파일 굽기 (74절)")
    ap.add_argument("--out", default=os.path.join("game", "auction-game-data.js"))
    ap.add_argument("--json", action="store_true", help="JS 대신 순수 JSON으로")
    args = ap.parse_args(argv)

    regions, rmeta = build_regions()
    data = {
        "schema": SCHEMA,
        "version": _version(),
        "generated": date.today().isoformat(),
        "source": "국토교통부 실거래가 · 한국부동산원 매매수급동향지수 · 매입자 연령대 통계",
        "regions": regions,
        "regionMeta": rmeta,
        "market": build_market(),
        "appraise": build_appraise(),
        "rules": build_rules(),
    }

    body = json.dumps(data, ensure_ascii=False, indent=1)
    if args.json:
        text = body
    else:
        text = ("/* 경매 게임용 데이터 — scripts/export_game_data.py 가 구운 파일입니다.\n"
                "   손으로 고치지 마세요. 계산기 상수를 고친 뒤 다시 구우면 여기도 따라옵니다.\n"
                f"   구운 날: {data['generated']} · 코드 버전: {data['version']} */\n"
                f"const AUCTION_DATA = {body};\n")

    out = args.out if os.path.isabs(args.out) else os.path.join(ROOT, args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"✅ {out}")
    print(f"   지역 {len(regions)}개 · 시장지수 {len(data['market']['sido'])}시도"
          f"+{len(data['market']['seoulZone'])}권역 · 시세문제 {len(data['appraise'])}개")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
