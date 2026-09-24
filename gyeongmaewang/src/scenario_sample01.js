// ⚠️ 샘플입니다 — 숫자는 전부 가짜예요.
// 모양(어떤 값이 어디 들어 있는지)만 진짜와 똑같습니다.
// 진짜 시나리오는 73절 scripts/export_scenario.py 로 굽습니다.

const SCENARIO_SAMPLE_01 = {
  "schema": 1,
  "scenario_id": "sample-01",
  "version": "2b6aa88",
  "generated_at": "2026-09-24",
  "source": {
    "radius_m": 400.0,
    "area_tolerance_pct": 15.0,
    "build_year_tolerance": 4.0,
    "year_min": 2025,
    "calibration": 1.0,
    "monthly_trend_rate": null
  },
  "subject": {
    "display_name": "○○빌라 3층",
    "dong": "홍은동",
    "area": 59.88,
    "floor": 3,
    "build_year": "2012",
    "address": null
  },
  "truth": {
    "sale_price_man": 29214,
    "position": 0.35
  },
  "scenarios": {
    "p25": 28831,
    "median": 31078,
    "p75": 32462,
    "ai_base": 30680,
    "auction": 29950,
    "confidence": 85,
    "model_divergence_pct": 2.8910481994361183,
    "n_total": 36,
    "n_close": 20,
    "n_this_year": 36
  },
  "prediction": {
    "pct": 20.0,
    "risks": 0,
    "tier": 0,
    "label": "안정적인 편",
    "sample_n": 34,
    "low_man": 24863,
    "high_man": 37294
  },
  "tiers": {
    "urgent": 27230,
    "d30": 29100,
    "d60": 31080,
    "normal": 32330,
    "test": 34180
  },
  "warnings": [],
  "condition_multiplier": {
    "올수리": 1.08,
    "기본": 1.0,
    "노후": 0.9
  },
  "condition_ladder": {
    "노후": [
      {
        "condition": "노후",
        "label": "현재 상태 (노후 — 수리 필요)",
        "is_current": true,
        "price_man": 26960,
        "gain_man": 0
      },
      {
        "condition": "기본",
        "label": "기본 정리 후 (청소·도배·장판 등)",
        "is_current": false,
        "price_man": 29950,
        "gain_man": 2990
      },
      {
        "condition": "올수리",
        "label": "올수리 후 (전체 리모델링)",
        "is_current": false,
        "price_man": 32350,
        "gain_man": 5390
      }
    ],
    "기본": [
      {
        "condition": "기본",
        "label": "현재 상태 (기본 — 깨끗함)",
        "is_current": true,
        "price_man": 29950,
        "gain_man": 0
      },
      {
        "condition": "올수리",
        "label": "올수리 후 (전체 리모델링)",
        "is_current": false,
        "price_man": 32350,
        "gain_man": 2400
      }
    ],
    "올수리": [
      {
        "condition": "올수리",
        "label": "현재 상태 (올수리 완료)",
        "is_current": true,
        "price_man": 32350,
        "gain_man": 0
      }
    ]
  },
  "comparables": [
    {
      "name": "○○빌라",
      "area": 56.19,
      "floor": 1,
      "build_year": "2010",
      "ym": "2026.01",
      "amount_man": 25951,
      "distance_m": 0,
      "similarity": 76
    },
    {
      "name": "○○빌라",
      "area": 61.05,
      "floor": 2,
      "build_year": "2011",
      "ym": "2026.03",
      "amount_man": 29843,
      "distance_m": 0,
      "similarity": 92
    },
    {
      "name": "○○빌라",
      "area": 55.59,
      "floor": 3,
      "build_year": "2012",
      "ym": "2026.05",
      "amount_man": 32595,
      "distance_m": 0,
      "similarity": 86
    },
    {
      "name": "○○빌라",
      "area": 58.6,
      "floor": 4,
      "build_year": "2013",
      "ym": "2026.07",
      "amount_man": 28112,
      "distance_m": 0,
      "similarity": 92
    },
    {
      "name": "△△하이츠",
      "area": 59.47,
      "floor": 2,
      "build_year": "2011",
      "ym": "2026.02",
      "amount_man": 32385,
      "distance_m": 50,
      "similarity": 91
    },
    {
      "name": "△△하이츠",
      "area": 59.38,
      "floor": 3,
      "build_year": "2012",
      "ym": "2026.04",
      "amount_man": 32414,
      "distance_m": 50,
      "similarity": 94
    },
    {
      "name": "△△하이츠",
      "area": 58.64,
      "floor": 4,
      "build_year": "2013",
      "ym": "2026.06",
      "amount_man": 30880,
      "distance_m": 50,
      "similarity": 88
    },
    {
      "name": "△△하이츠",
      "area": 58.48,
      "floor": 5,
      "build_year": "2014",
      "ym": "2026.08",
      "amount_man": 29040,
      "distance_m": 50,
      "similarity": 79
    }
  ],
  "liquidity": {
    "latest_year": 2026,
    "latest_month": 9,
    "radii": [
      300,
      500
    ],
    "counts": [
      {
        "radius_m": 300,
        "months": 3,
        "count": 10,
        "monthly_avg": 3.3
      },
      {
        "radius_m": 300,
        "months": 6,
        "count": 19,
        "monthly_avg": 3.2
      },
      {
        "radius_m": 300,
        "months": 12,
        "count": 28,
        "monthly_avg": 2.3
      },
      {
        "radius_m": 500,
        "months": 3,
        "count": 14,
        "monthly_avg": 4.7
      },
      {
        "radius_m": 500,
        "months": 6,
        "count": 29,
        "monthly_avg": 4.8
      },
      {
        "radius_m": 500,
        "months": 12,
        "count": 44,
        "monthly_avg": 3.7
      }
    ]
  },
  "reveal": {
    "desk": [
      "subject"
    ],
    "broker": [
      "comparables",
      "scenarios.median"
    ],
    "visit": {
      "inspection_options": [
        "채광 나쁨",
        "주차공간 부족",
        "누수 흔적 있음",
        "악취 심함",
        "소음 있음",
        "건물 관리상태 열악",
        "경사 심함"
      ]
    },
    "papers": [
      "prediction",
      "warnings"
    ]
  },
  "_sample": "⚠️ 이 파일은 모양을 보여주려고 만든 샘플입니다 — 숫자는 가짜예요. 진짜는 scripts/export_scenario.py 로 굽습니다."
};
