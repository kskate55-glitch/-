"""
주영이의 빌라 경매 매도가 계산기 — 웹 버전. CLAUDE.md 22절 규칙.

scripts/estimate_price.py의 5~8절 로직(반경 기반 비교거래 선정, 가중 중앙값)을
그대로 재사용한다 — 계산 자체는 순수 파이썬이라 Claude/AI 호출이 전혀 없다.
CLI 버전과 다른 점은, 사용자가 국토부 API를 직접 실행해 data/raw/에 저장하는
대신, 이 서버가 주소를 받으면 그때그때 국토부/카카오 API를 대신 호출해준다는
것뿐이다 (data_source.py).

실행 (로컬):
    pip install -r requirements.txt
    MOLIT_SERVICE_KEY="발급받은_인증키" KAKAO_REST_API_KEY="발급받은_키" python webapp/app.py
    브라우저에서 http://localhost:5000 접속

⚠️ apis.data.go.kr / dapi.kakao.com에 접속 가능한 환경(본인 PC, 또는 실제
   배포한 서버)에서 실행해야 한다 — Claude Code 샌드박스에서는 실행 불가.
⚠️ 여러 방문자가 쓸 걸 가정한 최소 기능(MVP) 버전이다. 8절 매도가(8-2절
   경매용 매도가 포함)·20절 건물정보(승강기/세대수/사용승인일)·24절
   시장동향·25절 인근 동 비교·26절 역세권 프리미엄(체크박스로 켜야 계산)
   까지 지원한다. 19절 수익성 계산은 사용자 요청으로 웹 버전에서 뺐다
   (CLI에는 그대로 있다). 예상 전세가(16절)·인근 중개업소(21절)·23절
   실측 전월세전환율(전월세 실거래 데이터를 아직 실시간으로 안 받아온다)도
   아직 웹 버전에 없다 — CLI(estimate_price.py)에는 이미 있다.

⚠️ 비밀번호 보호는 사용자 요청으로 제거했다 — 주소를 아는 사람은 누구나
바로 쓸 수 있다. 되살리려면 커밋 aa236d1의 `_password_required`/`login`
라우트와 `webapp/templates/login.html`을 꺼내 쓰면 된다(CLAUDE.md 22절).

KAKAO_JS_KEY 환경변수(선택)를 설정하면 27절 결과 페이지에 대상 물건 위치를
보여주는 카카오맵 미리보기가 뜬다. KAKAO_REST_API_KEY와는 다른 키이고,
카카오 개발자 콘솔에서 실제 배포 도메인을 등록해야 그 도메인에서 동작한다
(자세한 건 CLAUDE.md 27절 참고). 설정 안 하면 지도만 생략되고 나머지는
그대로 동작한다.
"""

import os
import sys
import time
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify, render_template, request  # noqa: E402

# 27절 지도 미리보기용 카카오맵 JS SDK 키. KAKAO_REST_API_KEY(서버에서만
# 쓰는 비밀키)와는 완전히 다른 키다 — 카카오맵 JS SDK는 브라우저에서 직접
# 불러써야 하는 구조라 애초에 프론트엔드 노출을 전제로 설계됐고, 대신
# 카카오 개발자 콘솔에서 이 키를 쓸 도메인(배포한 실제 주소)을 등록해야
# 그 도메인에서만 동작한다. 설정 안 해도(또는 도메인 미등록이어도) 지도만
# 조용히 생략되고 나머지 계산은 그대로 된다.
KAKAO_JS_KEY = os.environ.get("KAKAO_JS_KEY")

app = Flask(__name__)


def _fmt_eok(man: float) -> str:
    return f"{man / 10000:.2f}억"


# 57절 — 40절 아파트 조회를 빌라 조회 직후 백그라운드로 미리 던질지. 끄면
# 예전처럼 필요한 시점(지오코딩이 다 끝난 뒤)에 직접 부른다 — A/B 측정과
# 회귀 테스트가 이 스위치로 두 동작을 모두 확인한다.
PREFETCH_APT = True


@app.context_processor
def _inject_version():
    """모든 화면 푸터에 배포 버전을 꽂는다 — 48-5절."""
    return {"deploy_version": _deploy_version()}


@app.errorhandler(Exception)
def _friendly_error(e):
    """⚠️ 마지막 안전망 — 방문자에게 Flask 기본 500 화면을 절대 안 보여준다.

    친구가 실제로 `Internal Server Error` 흰 화면을 받았다(원인은 국토부가
    XML이 아닌 응답을 보낸 것). 원인은 그때그때 다를 수 있으므로, 개별
    호출부를 다 막는 것과 별개로 여기서 한 번 더 받아 **무엇이 터졌는지
    화면에 적어** 준다 — 로그를 볼 수 없는 사용자가 그 문구를 그대로
    전해줄 수 있어야 원인을 좁힐 수 있다.
    """
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return e                      # 404 등 정상적인 HTTP 응답은 그대로 둔다
    app.logger.exception("unhandled error")
    now = datetime.now()
    return render_template(
        "index.html",
        error=(f"처리 중 예상 못 한 오류가 발생했습니다 ({type(e).__name__}: {str(e)[:150]}). "
               "잠시 후 다시 시도해 보시고, 계속되면 이 문구를 그대로 알려주세요."),
        form={}, last_year=now.year - 1), 500


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html", last_year=datetime.now().year - 1)


# ── 깨우기용 가벼운 엔드포인트 ─────────────────────────────────────────
# ⚠️ 무료 호스팅은 15분간 방문이 없으면 서버를 재우고, 다음 접속 때 깨어나느라
#    첫 요청이 30~60초 걸린다(콜드 스타트). 외부에서 이 주소를 주기적으로
#    찔러 주면 서버가 계속 깨어 있어 그 지연이 사라진다.
#  - 템플릿·API·캐시를 일절 건드리지 않는다(렌더링 비용 0) — `/`를 찌르면
#    매번 입력 폼 전체를 그려야 해서 깨우기용으로는 낭비다.
#  - ⚠️ `/robots.txt`를 찌르면 안 된다 — 잠든 동안 호스팅 쪽이 그 경로를
#    가로채 자기가 응답해 버려서 **요청이 서버까지 오지 않고, 따라서 안 깨어난다.**
@app.route("/healthz", methods=["GET"])
def healthz():
    return {"ok": True, "version": _deploy_version()}, 200


# ── 구간별 소요시간 계측 ───────────────────────────────────────────────
# ⚠️ "로딩이 느리다"를 추측으로 고치지 않기 위한 장치다. 이 서비스의 대기시간은
#    전부 네트워크라, **어느 구간이 느린지**를 알아야 고칠 방법이 갈린다:
#      - 실거래 조회가 느리다  → 국토부까지의 거리(리전) 또는 캐시가 빈 것
#      - 비교거래 찾기가 느리다 → 카카오 지오코딩 호출 수(캐시 적중률)
#      - 둘 다 빠른데 체감이 느리다 → 콜드 스타트(서버가 자고 있었음)
#    화면 맨 아래에 한 줄로 찍어서, 사용자가 캡처만 보내도 원인이 좁혀지게 한다.
class _PhaseTimer:
    def __init__(self):
        self._start = time.monotonic()
        self._phases: list[tuple[str, float]] = []

    def measure(self, label: str, fn):
        """fn()을 실행하고 걸린 시간을 기록한 뒤 결과를 그대로 돌려준다."""
        t0 = time.monotonic()
        try:
            return fn()
        finally:
            self._phases.append((label, time.monotonic() - t0))

    def summary(self) -> dict:
        total = time.monotonic() - self._start
        known = sum(d for _, d in self._phases)
        parts = [{"label": l, "sec": round(d, 2)} for l, d in self._phases if d >= 0.05]
        rest = total - known
        if rest >= 0.05:
            parts.append({"label": "나머지", "sec": round(rest, 2)})
        return {"total": round(total, 2), "parts": parts}


# ── 48절 정확도 백테스트 (웹) ────────────────────────────────────────────
# CLI(`scripts/backtest.py`)와 **같은 함수를 그대로 부른다** — 누출 차단
# 로직(`estimate_as_of`)이 한 곳에만 있어야 웹과 CLI 결과가 갈리지 않는다.
#
# ⚠️ 사용자가 "왕초보라 터미널을 못 쓴다"고 해서 만든 화면이다. 터미널·파이썬
#    설치·키 입력이 전부 필요 없고, 이미 배포된 사이트에서 버튼만 누르면 된다.
# ⚠️ 건수 상한이 낮은 이유는 Render 무료 티어 gunicorn 타임아웃(120초) 때문이다.
#    첫 건은 비교거래를 수백 개 지오코딩해야 해서 느리지만, 같은 구 안에서는
#    주소가 겹쳐 캐시가 차므로 두 번째 건부터는 훨씬 빠르다.
# ⚠️ 48-5절 — "고친 게 지금 사이트에 올라간 건지" 화면에서 바로 확인하려고 둔다.
# 사용자가 백테스트를 돌린 뒤 "이게 고치기 전 코드냐 후 코드냐"를 알 방법이
# 전혀 없어서 실제로 옛 코드로 27분을 돌린 적이 있다. 배포할 때 들어오는
# 커밋 해시를 읽어 화면 맨 아래에 찍는다(없으면 "local").
#
# ⚠️ 63절 — 호스팅마다 넣어주는 환경변수 이름이 다르다. 한 곳만 보면 **서버를
#    옮기는 순간 버전 표시가 조용히 사라지고**, 하필 그때가 "어느 코드로 도는
#    건지"를 제일 알아야 하는 시점이다. 아는 이름을 순서대로 훑고, 마지막
#    수단으로 직접 넣을 수 있는 APP_VERSION도 본다.
_VERSION_ENVS = (
    "APP_VERSION",              # 어디서든 직접 지정 (최후의 수단)
    "RENDER_GIT_COMMIT",        # Render
    "RAILWAY_GIT_COMMIT_SHA",   # Railway
    "VERCEL_GIT_COMMIT_SHA",    # Vercel
    "FLY_IMAGE_REF",            # Fly.io
    "HEROKU_SLUG_COMMIT",       # Heroku
    "SOURCE_VERSION",           # 여러 빌드팩 공통
    "GIT_COMMIT", "COMMIT_SHA",
)


def _deploy_version() -> str:
    for name in _VERSION_ENVS:
        value = (os.environ.get(name) or "").strip()
        if value:
            return value[-7:] if name == "FLY_IMAGE_REF" else value[:7]
    return "local"


BACKTEST_MAX_CASES = 20
BACKTEST_DEFAULT_CASES = 10
# 48-3절 전체순회 기본 건수 — 67개 구를 도는 동안 구당 시간을 줄이려고
# 단건 기본값(10)보다 낮게 잡았다. 구가 많아 총 표본은 오히려 훨씬 크다.
BACKTEST_SWEEP_CASES = 6

# 70절 — ⚠️ **표본 번호(시드)를 화면에서 바꿀 수 있어야 한다.** 예전엔 여기
#    42가 박혀 있어서, 같은 지역을 다시 돌리면 **항상 같은 물건이 다시
#    뽑혔다**(49-2절). 그래서 순회를 아무리 여러 번 돌려도 새 표본이 안
#    생겼고, 67절·70절이 둘 다 "다음 독립 표본에서 확인한다"로 끝나 놓고
#    정작 그 독립 표본을 만들 방법이 없었다 — 84건을 받았는데 처음 보는
#    물건이 9건뿐인 일이 실제로 있었다.
#    같은 번호를 쓰면 예전처럼 재현되고(코드 변경의 A/B 비교에 필요하다),
#    번호를 바꾸면 같은 지역에서 **다른 물건**이 뽑힌다.
BACKTEST_DEFAULT_SEED = 42


def _backtest_regions() -> list[dict]:
    """`data/lawd_codes.md` 표를 드롭다운용 목록으로. 시도 → 구 순으로 정렬."""
    from lawd_lookup import _get_cache

    items = [{"code": code, "sido": sido, "gu": gu}
             for code, (sido, gu) in _get_cache().items()]
    items.sort(key=lambda r: (r["sido"], r["gu"]))
    return items


def _lawd_from_kakao(stale_code: str) -> str | None:
    """`data/lawd_codes.md`의 코드가 낡았을 때, 그 지역명을 카카오에 물어
    **지금 맞는 법정동코드 앞 5자리**를 받아온다 (56절).

    코드를 기억이나 추측으로 적지 않는다는 2절/10절 원칙을 지키면서도
    행정구역 개편을 따라가는 방법이다 — `/estimate`는 원래부터 사용자가 친
    주소를 카카오로 지오코딩해 b_code 앞 5자리를 쓰고 있었고, 그래서 표가
    낡아도 **일반 계산은 멀쩡했다.** 순회만 표를 직접 읽어서 막혔던 것이다.

    실패하면 조용히 None — 이 경로가 죽어서 순회 전체가 멈추면 안 된다.
    """
    try:
        from geocode import geocode_full
        from lawd_lookup import gu_name, sido_name

        sido, gu = sido_name(stale_code), gu_name(stale_code)
        if not sido or not gu:
            return None
        detail = geocode_full(f"{sido} {gu}")
        code = (detail or {}).get("b_code") or ""
        return code[:5] or None
    except Exception:
        return None


def _backtest_seed(raw) -> int:
    """표본 번호. 숫자가 아니면 기본값으로 돌아간다 — 순회가 멈추면 안 된다."""
    try:
        return max(0, min(int(raw), 9999))
    except (TypeError, ValueError):
        return BACKTEST_DEFAULT_SEED


def _run_region_backtest(lawd_cd: str, n_cases: int, months: int,
                          seed: int = BACKTEST_DEFAULT_SEED) -> dict:
    """구 하나를 백테스트한다. HTML 화면과 48-3절 전체순회 JSON이 **같은 함수**를
    쓴다 — 두 경로가 갈리면 "화면 숫자와 순회 숫자가 다른" 문제가 생긴다.

    실패는 예외로 던지지 않고 `error` 키에 담아 돌려준다. 전체순회는 구 하나가
    실패해도 나머지를 계속 돌려야 해서다.
    """
    from datetime import datetime as _dt

    import backtest as bt
    from data_source import get_trade_rows
    from estimate_price import dedupe
    from lawd_lookup import gu_name

    gu = gu_name(lawd_cd)
    this_year = _dt.now().year
    try:
        rows = dedupe(get_trade_rows(lawd_cd, this_year - 2))
    except RuntimeError as e:
        return {"error": f"국토부 조회 중 문제가 생겼어요: {e}", "gu": gu}
    except Exception as e:                      # 전체순회 도중 한 구가 죽지 않게
        return {"error": f"조회 실패: {e}", "gu": gu}

    used_code, code_note = lawd_cd, None
    if not rows:
        # 56절 — 33개월이 전부 0건이면 그 지역에 빌라가 없는 게 아니라
        # **`data/lawd_codes.md`의 코드가 낡은 것**이다(부천시가 실제로 그랬다).
        # 코드를 추측해서 적지 않고(2절/10절), `/estimate`가 늘 쓰는 방식 그대로
        # **카카오에 물어본다** — 행정구역 개편은 카카오가 우리 표보다 먼저 따라간다.
        resolved = _lawd_from_kakao(lawd_cd)
        if resolved and resolved != lawd_cd:
            try:
                rows = dedupe(get_trade_rows(resolved, this_year - 2))
            except Exception:
                rows = []
            if rows:
                used_code, code_note = resolved, (
                    f"표에 적힌 코드({lawd_cd})로는 0건이라 카카오가 알려준 "
                    f"코드({resolved})로 다시 받았어요 — data/lawd_codes.md를 고쳐야 합니다.")

    if not rows:
        hint = ""
        if used_code == lawd_cd:
            hint = (f" (코드 {lawd_cd}로 33개월 내내 0건이었어요 — 행정구역이 바뀌어 "
                    "코드가 낡았을 수 있습니다)")
        return {"error": f"이 지역의 실거래 데이터를 찾지 못했어요.{hint}", "gu": gu}

    targets, pool = bt.pick_targets(rows, months=months, n=n_cases, gu=None, seed=seed)
    if not targets:
        return {"error": f"최근 {months}개월 안에 검증할 거래가 없어요. 기간을 늘려보세요.",
                "gu": gu}

    results, skipped = [], {}
    for target in targets:
        try:
            out = bt.estimate_as_of(rows, target, 400, 2, 0.15, 4)
        except Exception as e:
            # ⚠️ 예전엔 그냥 "오류"로만 셌는데, 서울 19개 구가 전부 "오류 6건"으로
            #    죽었을 때 **무엇이 터졌는지 알 방법이 전혀 없었다**(48-6절).
            #    예외 종류와 메시지 앞부분을 그대로 남긴다 — 화면에 뜨는 사유가
            #    곧 다음 수정의 단서다.
            label = f"오류({type(e).__name__}: {str(e)[:60]})" if str(e) else f"오류({type(e).__name__})"
            skipped[label] = skipped.get(label, 0) + 1
            continue
        if out is None:
            skipped["주소 인식 실패"] = skipped.get("주소 인식 실패", 0) + 1
            continue
        if out.get("skipped"):
            skipped["비슷한 거래가 너무 적음"] = skipped.get("비슷한 거래가 너무 적음", 0) + 1
            continue
        out["error_pct"] = (out["median"] - out["actual"]) / out["actual"] * 100
        out["in_band"] = out["p25"] <= out["actual"] <= out["p75"]
        out["actual_eok"] = _fmt_eok(out["actual"])
        out["median_eok"] = _fmt_eok(out["median"])
        out["p25_eok"] = _fmt_eok(out["p25"])
        out["p75_eok"] = _fmt_eok(out["p75"])
        d = str(out["ymd"])
        out["date_label"] = f"{d[2:4]}.{d[4:6]}.{d[6:8]}"
        out["gu"] = gu
        results.append(out)

    if not results:
        return {"error": "검증할 수 있는 건이 하나도 없었어요 — " +
                         " · ".join(f"{k} {v}건" for k, v in skipped.items()),
                "gu": gu, "skipped": skipped, "pool": pool}

    results.sort(key=lambda r: abs(r["error_pct"]))
    summary = bt.summarize(results)

    # 7절 시세 신뢰도가 실제로 정확도를 예측하는지 — 이 페이지의 숨은 핵심 지표
    bands = []
    for label, lo, hi in (("70점 이상", 70, 101), ("40~69점", 40, 70), ("40점 미만", 0, 40)):
        group = [abs(r["error_pct"]) for r in results if lo <= r["confidence"] < hi]
        if group:
            bands.append({"label": label, "n": len(group),
                          "mape": sum(group) / len(group)})

    return {"error": None, "gu": gu, "results": results, "summary": summary,
            "bands": bands, "skipped": skipped, "pool": pool}


@app.route("/backtest", methods=["GET", "POST"])
def backtest_page():
    regions = _backtest_regions()
    form = request.form if request.method == "POST" else {}
    lawd_cd = (form.get("lawd_cd") or "").strip()
    try:
        n_cases = min(int(form.get("n_cases") or BACKTEST_DEFAULT_CASES), BACKTEST_MAX_CASES)
    except ValueError:
        n_cases = BACKTEST_DEFAULT_CASES
    months = 1
    try:
        months = max(1, min(int(form.get("months") or 1), 6))
    except ValueError:
        pass
    seed = _backtest_seed(form.get("seed"))

    base = {"regions": regions, "lawd_cd": lawd_cd, "n_cases": n_cases,
            "months": months, "max_cases": BACKTEST_MAX_CASES,
            "sweep_cases": BACKTEST_SWEEP_CASES, "seed": seed}

    if request.method == "GET" or not lawd_cd:
        return render_template("backtest.html", **base)

    out = _run_region_backtest(lawd_cd, n_cases, months)
    if out.get("error"):
        return render_template("backtest.html", error=out["error"], **base)

    return render_template(
        "backtest.html", results=out["results"], summary=out["summary"],
        bands=out["bands"], skipped=out["skipped"], pool=out["pool"],
        gu=out["gu"], **base)


@app.route("/backtest/one", methods=["POST"])
def backtest_one():
    """48-3절 — 구 **하나**만 돌려 JSON으로 돌려준다.

    ⚠️ 전체 순회를 서버에서 for문으로 돌리지 않는 이유: Render 무료 티어
    gunicorn 타임아웃이 120초라 67개 구를 한 요청에 담으면 무조건 끊긴다.
    대신 브라우저가 구를 하나씩 던지고(요청당 한 구 → 타임아웃 안 걸림)
    결과를 쌓아 전체 통계를 낸다.

    ⚠️ 건별 기록을 통째로 돌려주는 이유: 전체 평균을 구마다의 평균을 또
    평균내서 구하면(구별 건수가 달라) 틀린다. 브라우저가 **건 단위로** 모아
    계산해야 맞다. 크게 튄 건을 전 지역에서 뽑아 보여주는 데도 필요하다.
    """
    lawd_cd = (request.form.get("lawd_cd") or "").strip()
    if not lawd_cd:
        return jsonify({"ok": False, "error": "지역 코드가 없습니다."}), 400
    try:
        n_cases = min(int(request.form.get("n_cases") or BACKTEST_SWEEP_CASES),
                      BACKTEST_MAX_CASES)
    except ValueError:
        n_cases = BACKTEST_SWEEP_CASES
    try:
        months = max(1, min(int(request.form.get("months") or 1), 6))
    except ValueError:
        months = 1
    seed = _backtest_seed(request.form.get("seed"))

    out = _run_region_backtest(lawd_cd, n_cases, months, seed)
    if out.get("error"):
        # 58절 — 일일 한도를 넘긴 거면 브라우저가 **순회를 즉시 멈추도록** 알린다.
        # 예전엔 남은 지역을 전부 두들겨서, 이미 바닥난 한도를 수백 번 더
        # 긁고도 전부 실패로 끝났다(한 번 돌 때마다 다음 날 몫까지 까먹는다).
        from molit_rhtrade_api import QUOTA_MESSAGE

        # ⚠️ 59절 — **429는 여기 해당하지 않는다.** 그건 초당 호출 제한이라
        #    기다리면 풀리고, 이제 API 계층이 알아서 물러섰다 다시 시도한다.
        #    순회를 멈춰야 하는 건 **진짜 일일 한도(resultCode 22)**뿐이다.
        quota = QUOTA_MESSAGE[:20] in out["error"]
        return jsonify({"ok": False, "lawd_cd": lawd_cd, "gu": out.get("gu"),
                        "error": out["error"], "quota_exhausted": quota})

    cases = [{
        "gu": out["gu"], "name": r["name"], "date": r["date_label"],
        "area": round(r["area"], 1), "floor": r["floor"],
        "build_year": r.get("build_year"),
        "actual": r["actual"], "median": r["median"],
        "err": round(r["error_pct"], 2), "conf": r["confidence"],
        "n": r["n_comparables"], "in_band": bool(r["in_band"]),
        "divergence": (round(r["divergence"], 1)
                       if r.get("divergence") is not None else None),
        "sb": r.get("same_building_n"),
        "outliers": r.get("outlier_n"),
        "share": r.get("top_weight_share"),
    } for r in out["results"]]

    # ⚠️ 66절 — **건마다 배포 버전을 실어 보낸다.** 48-5절에서 화면 푸터에
    #    버전을 찍어뒀는데도, 내려받은 CSV만 보고는 "어느 코드로 돌린
    #    결과인지" 알 방법이 없어 64절 1층 보정의 효과를 판정하지 못했다.
    #    순회는 오래 걸려서 다시 돌리기도 비싸다 — 결과에 붙여 두는 게 맞다.
    #    같은 이유로 **표본 번호도 함께 싣는다**(70절) — 시드가 다르면 다른
    #    물건이 뽑히므로, 이 값이 없으면 두 CSV가 독립 표본인지 같은 표본을
    #    다시 잰 것인지 사후에 가릴 수가 없다.
    version = _deploy_version()
    for c in cases:
        c["version"] = version
        c["seed"] = seed
    return jsonify({"ok": True, "lawd_cd": lawd_cd, "gu": out["gu"],
                    "version": version, "seed": seed,
                    "pool": out["pool"], "skipped": out["skipped"],
                    "cases": cases})


@app.route("/estimate", methods=["POST"])
def estimate():
    form = request.form
    address = form.get("address", "").strip()

    error = None
    if not address:
        error = "주소를 입력해 주세요."

    area = None
    if not error:
        try:
            area = float(form.get("area", ""))
            if area <= 0:
                raise ValueError
        except ValueError:
            error = "전용면적을 올바른 숫자로 입력해 주세요."

    # 층·준공년도는 필수다 — 둘 중 하나라도 빠지면 5~7절 유사층/유사연식
    # 가중치·필터가 제대로 안 걸려서 비교거래가 뒤죽박죽 섞이고 매도가
    # 산출값이 중구난감해진다(사용자가 실제로 겪은 문제).
    floor = None
    if not error:
        floor_raw = form.get("floor", "").strip()
        if not floor_raw:
            error = "층을 입력해 주세요 (반지하/지하는 0 이하로 입력)."
        else:
            try:
                floor = int(floor_raw)
            except ValueError:
                error = "층을 올바른 숫자로 입력해 주세요."

    build_year = None
    if not error:
        build_year_raw = form.get("build_year", "").strip()
        if not build_year_raw:
            error = "준공년도를 입력해 주세요."
        elif not (build_year_raw.isdigit() and len(build_year_raw) == 4):
            error = "준공년도를 4자리 숫자로 입력해 주세요 (예: 2012)."
        else:
            build_year = build_year_raw

    if error:
        return render_template("index.html", error=error, form=form,
                                last_year=datetime.now().year - 1)

    def _optional_int(name):
        raw = form.get(name, "").strip()
        return int(raw) if raw else None

    def _optional_float(name, default=None):
        raw = form.get(name, "").strip()
        return float(raw) if raw else default

    radius = _optional_float("radius", 400)
    area_tolerance_pct_input = _optional_float("area_tolerance", 15.0)
    area_tolerance_pct = area_tolerance_pct_input / 100
    build_year_tolerance = _optional_int("build_year_tolerance") or 4
    this_year = datetime.now().year
    this_month = datetime.now().month
    year_min = _optional_int("year_min") or (this_year - 1)

    from geocode import geocode_full

    _timer = _PhaseTimer()
    try:
        subject_detail = _timer.measure("주소→좌표", lambda: geocode_full(address))
    except RuntimeError as e:
        return render_template("index.html", error=f"카카오 API 설정을 확인해 주세요: {e}",
                                form=form, last_year=this_year - 1)

    if subject_detail is None:
        return render_template(
            "index.html",
            error="주소를 좌표로 변환하지 못했습니다. 지번 주소로 다시 입력해 주세요 (예: 서울특별시 강북구 수유동 468-202).",
            form=form, last_year=this_year - 1,
        )

    subject_coord = (subject_detail["lat"], subject_detail["lon"])

    from naver_link import naver_land_url, naver_search_url

    naver_url = naver_land_url(*subject_coord)

    lawd_cd = (subject_detail.get("b_code") or "")[:5]
    if len(lawd_cd) != 5:
        return render_template("index.html", error="주소에서 지역코드를 확인하지 못했습니다.",
                                form=form, last_year=this_year - 1)

    building = None
    try:
        from building_register import get_building_info

        building_info = get_building_info(
            subject_detail.get("b_code"), subject_detail.get("main_no"),
            subject_detail.get("sub_no"), subject_detail.get("is_mountain", False),
        )
        if building_info:
            building = {
                "elevator": f"있음 ({building_info['elevator_count']}대)" if building_info["has_elevator"] else "없음",
                "has_elevator": building_info["has_elevator"],  # 41절 환금성 진단이 쓴다
                "household_count": building_info.get("household_count"),
                "approval_date": building_info.get("approval_date"),
                "ground_floors": building_info.get("ground_floors"),
            }
    except RuntimeError:
        building = None  # 건축물대장 조회는 참고 정보일 뿐 — 실패해도 매도가 계산은 계속 진행한다

    from estimate_price import (CONDITION_LABELS, CONDITION_MULTIPLIER,
                                 INSPECTION_CHECKLIST, INSPECTION_FIELDS,
                                 LOCATION_GROUPS, LOCATION_KEYWORDS,
                                 LOCATION_SCORED, LOCATION_SEARCH_RADIUS_M,
                                 TERRAIN_SEARCH_RADIUS_M)

    inspection_checklist = INSPECTION_CHECKLIST
    # 43절 — 임장에서 "이 항목이 나쁘다"고 체크한 것을 41절 환금성 점수에
    # 반영한다. `inspection_clean`(문제 없음)을 따로 두는 이유: 체크가 0개인
    # 상태만으로는 "가봤는데 멀쩡하다"와 "아직 안 가봤다"를 구분할 수 없어서다.
    inspection_bad = [label for key, label in INSPECTION_FIELDS
                      if form.get(f"insp_{key}")]
    inspection_clean = bool(form.get("insp_clean")) and not inspection_bad

    # 45절 — 역세권·학세권. 19절 입지 체크를 웹에도 붙였다(예전엔 CLI 전용).
    # 처음엔 판정에 쓰는 두 개(지하철역·초등학교)만 조회했는데, 사용자가
    # "더 자세히 만들 수 있냐"고 해서 19절 전체 목록(10개, 4갈래)으로 늘렸다.
    # 첫 조회는 카카오 호출 10번이지만 좌표+키워드 캐시
    # (`data/nearby_place_cache.json`)가 있어 같은 동네를 다시 조회하면 0번이다.
    location = None
    try:
        from estimate_price import compute_location_check

        location = compute_location_check(subject_coord)
    except Exception:
        location = None

    # 34절 주변 지형 — 예전엔 별도 카드였는데 지금은 위 입지 체크 카드의
    # 다섯 번째 갈래("🌳 자연")로 합쳐 들어간다(아래 location_card 참고).
    # 그래서 여기서는 갈래 안에 그대로 넣을 수 있는 항목 목록으로 만든다.
    terrain_places = []
    try:
        from estimate_price import compute_terrain_check

        t = compute_terrain_check(subject_coord)
        if t["mountain"] or t["river"]:
            terrain_none = f"{TERRAIN_SEARCH_RADIUS_M / 1000:.0f}km 안에 없음"
            terrain_places = [
                {"label": "산", "place": t["mountain"], "scored": False, "none_text": terrain_none},
                {"label": "하천/강", "place": t["river"], "scored": False, "none_text": terrain_none},
            ]
    except RuntimeError:
        terrain_places = []  # 참고 정보일 뿐 — 실패해도 매도가 계산은 계속 진행한다

    def _direction(delta, unit="p"):
        if delta is None:
            return "추세 판단 불가"
        if abs(delta) < 2:
            return "보합"
        return f"{'상승' if delta > 0 else '하락'} 중 ({delta:+.1f}{unit})"

    villa_market_trend = None
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
        peers = []
        if villa_is_zone:
            zone_rank = rank_region(villa_rows, villa_zone, "index")
            if zone_rank is not None:
                peers = format_ranking_peers(zone_rank["ranking"], villa_zone, max_show=5)
        national = latest_value_for(load_villa_market_index(), "전국", "index")
        national_line = None
        if national is not None:
            _nat_date, nat_val = national
            national_line = (f"전국 평균({nat_val:.1f}) 대비 {idx - nat_val:+.1f}p "
                              f"({'전국보다 강세' if idx > nat_val else '전국보다 약세' if idx < nat_val else '전국과 비슷'})")
        villa_market_trend = {
            "region": villa_label, "date": villa_trend["snapshot_date"],
            "index": f"{idx:.1f}", "diff": f"{idx - 100:+.1f}",
            "plain_desc": _plain_market_desc(idx),
            "trend": _direction(villa_trend["index_trend"]),
            "start_date": villa_trend["start_date"], "start_value": f"{villa_trend['start_value']:.1f}",
            "since_start": f"{villa_trend['since_start']:+.1f}",
            "peers": peers, "national_line": national_line,
            "is_zone": villa_is_zone,
        }

    # 69절 — 매입자 연령대. CSV 한 번 읽는 게 전부라 API 호출도, 비용도 0이다.
    # ⚠️ 실패해도 카드만 생략한다 — 20·21·26·50-1절과 같은 원칙.
    buyer_age = None
    try:
        from buyer_age import compute_buyer_age
        buyer_age = compute_buyer_age(address)
    except (OSError, ValueError, KeyError, ImportError):
        buyer_age = None

    from data_source import get_trade_rows
    from estimate_price import (FIRST_FLOOR_PRICE_RATIO, SALE_CALIBRATION_FACTOR,
                                compute_scenarios, dedupe,
                                estimate_monthly_trend_rate, find_comparables)
    # 68절 — CLI와 **같은 문장**을 쓰려고 한 함수에서 가져온다. 이름이 지역
    # 변수 `time_correction_note`와 겹쳐서 별칭을 붙인다.
    from estimate_price import time_correction_note as ep_time_correction_note
    from lawd_lookup import find_dong_in_address

    # 40절 아파트 조회를 미리 던지려면 동 이름이 먼저 필요하다(주소 문자열만
    # 보면 되는 순수 함수라 앞으로 당겨도 아무 부작용이 없다).
    target_dong_early = find_dong_in_address(address)

    try:
        rows = _timer.measure("실거래 조회",
                              lambda: dedupe(get_trade_rows(lawd_cd, year_min)))
    except RuntimeError as e:
        return render_template("index.html", error=f"국토부 API 조회 중 문제가 발생했습니다: {e}",
                                form=form, last_year=this_year - 1)
    except Exception as e:
        # ⚠️ RuntimeError만 잡으면 예상 못 한 예외가 그대로 올라가 방문자에게
        #    Flask 기본 500 화면이 뜬다 — 실제로 겪었다(응답이 XML이 아니어서
        #    ET.ParseError가 났다). 여기서 한 번 더 받아 안내로 바꾼다.
        return render_template(
            "index.html",
            error=(f"국토부 실거래가 조회에 실패했습니다 ({type(e).__name__}: {str(e)[:150]}). "
                   "잠시 후 다시 시도해 보세요 — 일일 조회 한도에 걸렸을 수도 있습니다."),
            form=form, last_year=this_year - 1)

    if not rows:
        return render_template(
            "index.html",
            error="이 지역의 실거래 데이터를 찾지 못했습니다. 조회 기간을 늘려서 다시 시도해 보세요.",
            form=form, last_year=this_year - 1,
        )

    # ⚡ 57절 — 40절 아파트 조회를 **여기서 미리 던져둔다.** 예전엔 한참 아래
    #    (지오코딩·유사도 계산이 다 끝난 뒤)에서야 불러서, 국토부를 기다리는
    #    구간이 빌라·아파트 두 번으로 **줄줄이** 생겼다. 둘은 서로 의존이
    #    전혀 없고 각자 자기 캐시만 쓰므로(22절 "의존 없는 호출은 병렬로"
    #    방침 그대로) 지금 던져놓고 필요할 때 받으면 된다 — 새 지역 첫
    #    조회에서 국토부 왕복 한 묶음이 통째로 빠진다.
    _apt_future = None
    if target_dong_early and PREFETCH_APT:
        try:
            from concurrent.futures import ThreadPoolExecutor

            from data_source import get_apt_rows as _get_apt_rows
            _apt_pool = ThreadPoolExecutor(max_workers=1)
            _apt_future = _apt_pool.submit(_get_apt_rows, lawd_cd, year_min)
            _apt_pool.shutdown(wait=False)
        except Exception:
            _apt_future = None      # 미리 받기 실패는 조용히 — 아래에서 그냥 직접 부른다

    # 7-2절 시계열 가격보정 — CLI는 data/raw의 전체 기간 데이터로 추세를
    # 추정하지만, 웹 버전은 애초에 get_trade_rows()가 year_min 이후 데이터만
    # 가져오므로 그 범위 안에서만 추세를 추정한다(그래도 최근 추세가 더
    # 중요하다는 점에서 크게 어긋나지 않는다).
    target_dong = target_dong_early

    # ⚠️ 7-2절 시계열 가격보정은 껐다 — 어차피 year_min 이후(보통 2년치)
    #    데이터만 쓰는데 그 안에서 다시 "지금 시세로 환산"하는 건 얻는
    #    것보다 헷갈리게 하는 쪽이 크다는 사용자 판단이다. 오래된 거래를
    #    덜 반영하는 건 7절 계약 시점 가중치(최근 3개월 1.6 / 4~12개월
    #    1.0 / 13개월 이상 0.4)가 이미 하고 있다.
    # ⛔ 5절 적응형 반경은 껐다(사용자 요청) — 입력한 반경이 곧 계산 범위다.
    #    자세한 이유는 estimate_price.find_comparables_adaptive() 독스트링 참고.
    # 51-1절 — 같은 건물 판별을 좌표 20m가 아니라 지번으로 한다. 카카오
    # 지오코딩이 이미 준 본번/부번을 재사용하므로 추가 호출이 0이고,
    # 못 만들면 None이라 예전 폴백(20m)으로 돌아간다.
    from estimate_price import building_identity_parts
    subject_building = building_identity_parts(
        target_dong, subject_detail.get("main_no"), subject_detail.get("sub_no"),
        bool(subject_detail.get("is_mountain")))

    # 68절 — 7-2절 시계열 보정을 다시 켰다. 주소에서 동을 못 뽑으면(target_dong이
    # None) 조용히 None이라 예전처럼 보정 없이 간다.
    trend_rate = (estimate_monthly_trend_rate(rows, target_dong) if target_dong else None)

    filtered = _timer.measure("비교거래 찾기", lambda: find_comparables(
        rows, subject_coord, area, floor, build_year,
        radius, year_min, this_year, gu_filter=None,
        area_tolerance_pct=area_tolerance_pct,
        build_year_tolerance=build_year_tolerance,
        this_month=this_month,
        subject_building=subject_building,
        monthly_trend_rate=trend_rate,               # 68절 — 매매 경로만 켠다
        first_floor_ratio=FIRST_FLOOR_PRICE_RATIO))  # 64절 — 매매 경로만 켠다
    if not filtered:
        return render_template(
            "index.html",
            error=(f"반경 {radius:.0f}m 안에서 유사면적 조건에 맞는 비교거래를 찾지 못했습니다. "
                   f"상세 옵션에서 반경이나 면적 허용범위를 넓혀서 다시 시도해 보세요."),
            form=form, last_year=this_year - 1,
        )

    scen = compute_scenarios(filtered, radius, this_year, subject_area=area,
                             calibration=SALE_CALIBRATION_FACTOR)
    # 49절 — 이 추정치를 얼마나 믿어도 되는지 경고등. 새로 계산하는 게 없고
    # 이미 구한 값(괴리율·가중치·동일건물 플래그)만 읽는다.
    from estimate_price import (compute_estimate_warnings,
                                detect_redevelopment_signal)
    # 50절 — 정비구역 신호. 지오코딩을 안 해서 추가 API 호출이 0이다.
    redevelopment = detect_redevelopment_signal(rows, target_dong, this_year)
    # 50-1절 — 토지이용계획으로 정비구역을 **직접** 확인한다. 엔드포인트
    # (LAND_USE_API_URL)가 아직 안 채워져 있으면 조용히 None이라 아무 일도
    # 일어나지 않는다 — 20절/26절과 같은 "없으면 생략" 원칙.
    zone_check = None
    if subject_detail:
        try:
            from estimate_price import is_redevelopment_zone
            from land_use import get_land_use_zones
            zone_check = is_redevelopment_zone(get_land_use_zones(
                subject_detail.get("b_code"), subject_detail.get("main_no"),
                subject_detail.get("sub_no"), bool(subject_detail.get("is_mountain"))))
        except Exception:
            zone_check = None       # 참고 정보라 실패해도 계산을 막지 않는다
    estimate_warnings = compute_estimate_warnings(
        filtered, scen.get("model_divergence_pct"), redevelopment, zone_check)
    conservative = scen["p25"]
    realistic = scen["median"]
    upper = scen["p75"]
    ai_base = round((conservative * 0.3 + realistic * 0.5 + upper * 0.2), -1)

    # 49-2절 — 백테스트 잔차 기반 예측구간. ⚠️ 기준은 **현실적 체결가**다
    # (백테스트가 실제 체결가와 비교한 값이 그것이라서) — 히어로의 경매용
    # 매도가에 그대로 붙이면 근거 없는 숫자가 된다.
    from estimate_price import compute_prediction_interval
    _pi = compute_prediction_interval(
        realistic, filtered, area, scen.get("model_divergence_pct"))
    prediction_interval = None
    if _pi:
        prediction_interval = {
            **_pi,
            "low": _fmt_eok(_pi["low_man"]),
            "high": _fmt_eok(_pi["high_man"]),
            "center": _fmt_eok(_pi["center_man"]),
        }
    auction_price = round((conservative + realistic) / 2, -1)

    # CLAUDE.md 38절 — 상태별 매도가 3단계. 35절이 "고른 상태 하나에 배율을
    # 한 번 곱한 값"만 보여줬다면, 여기서는 지금 상태에서 손볼수록 매도가가
    # 얼마씩 올라가는지(그리고 공사비를 넣으면 남는 장사인지까지) 사다리로
    # 보여준다. 기준값은 경매용 매도가 — 이 계산기가 전제하는 "낙찰받아
    # 되파는" 상황에 가장 가까운 값이라서다.
    condition = form.get("condition", "").strip()
    condition_display = None
    if condition in CONDITION_MULTIPLIER:
        from estimate_price import CONDITION_MULTIPLIER as _CM
        from estimate_price import compute_condition_ladder

        repair_costs = {}
        for step, field in (("기본", "repair_cost_basic"), ("올수리", "repair_cost_full")):
            cost = _optional_float(field)
            if cost is not None:
                repair_costs[step] = cost
        ladder = compute_condition_ladder(auction_price, condition, repair_costs)
        if ladder:
            condition_display = {
                "current_label": CONDITION_LABELS[condition],
                "base_label": "경매용 매도가",
                "rows": [
                    {
                        "label": row["label"],
                        "is_current": row["is_current"],
                        "price": _fmt_eok(row["price_man"]),
                        "gain": None if row["is_current"] else _fmt_eok(row["gain_man"]),
                        "cost": f"{row['cost_man']:,.0f}만원" if row["cost_man"] is not None else None,
                        "net": _fmt_eok(row["net_man"]) if row["net_man"] is not None else None,
                        "net_positive": None if row["net_man"] is None else row["net_man"] > 0,
                        "multiplier_pct": f"{(_CM[row['condition']] - 1) * 100:+.0f}",
                    }
                    for row in ladder
                ],
                "has_cost": any(row["cost_man"] is not None for row in ladder),
            }

    from estimate_price import (
        PRICE_TIER_LABELS, build_verdict, compute_liquidity, compute_price_tiers,
        speed_label_for_percentile,
    )

    price_tiers = compute_price_tiers(filtered, calibration=SALE_CALIBRATION_FACTOR,
                                      subject_area=area)
    liquidity = compute_liquidity(rows, subject_coord, area, this_year, gu_filter=None,
                                   area_tolerance_pct=area_tolerance_pct)

    from price_chart import MARKER_COLORS, render_price_distribution_html

    # "권장 최초 호가"는 사용자 요청으로 웹 화면에서 뺐다(뭔지 헷갈린다는
    # 피드백) — CLI에는 그대로 있다.
    price_chart_html = render_price_distribution_html(filtered, {
        "보수적 급매가": conservative, "현실적 체결가": realistic, "경매용 매도가": auction_price,
        "상단 매도가": upper, "AI 기준매도가": ai_base,
    }, hero_name="경매용 매도가", this_year=this_year, this_month=this_month,
        # 8-1절 — 이 그래프는 히어로 카드 안이 아니라 전용 카드(결과 페이지
        # 전체 폭)에 들어간다. 좁은 칸에 끼워넣던 때(420×300)와 달리 가로로
        # 긴 viewBox(880×330)를 쓰고, 좁은 화면에서는 720px 아래로 줄어들지
        # 않게 막은 뒤 가로 스크롤로 넘긴다.
        width=880, height=270, min_width=720)
    marker_colors = {
        "conservative": MARKER_COLORS["보수적 급매가"], "realistic": MARKER_COLORS["현실적 체결가"],
        "upper": MARKER_COLORS["상단 매도가"], "ai_base": MARKER_COLORS["AI 기준매도가"],
    }

    dong_compare = None
    from rank_areas import MIN_SAMPLE, build_dong_stats, find_dong_rank, rank_by_price_change, rank_by_volume

    dong_result = build_dong_stats(rows) if target_dong else None
    if dong_result is not None:
        latest_ym, dong_data = dong_result
        latest_y, latest_m = divmod(latest_ym, 12)
        volume_ranked = rank_by_volume(dong_data)
        price_ranked = rank_by_price_change(dong_data)
        vol_rank = find_dong_rank(volume_ranked, target_dong)
        price_rank = find_dong_rank(price_ranked, target_dong)
        dong_compare = {
            "dong": target_dong, "latest_month": f"{latest_y}.{latest_m + 1:02d}",
            "volume_top": [
                {"dong": d, "count": c, "is_target": d == target_dong}
                for d, c in volume_ranked[:5]
            ],
            "volume_rank_note": (f"{vol_rank}위 {target_dong} {dict(volume_ranked)[target_dong]}건 "
                                  f"({len(volume_ranked)}개 동 중)") if vol_rank and vol_rank > 5 else None,
            "volume_missing": vol_rank is None,
            "price_top": [
                {"dong": d, "change_pct": f"{'+' if chg >= 0 else ''}{chg:.1f}%", "is_target": d == target_dong}
                for d, chg, _avg, _cnt in price_ranked[:5]
            ],
            "price_rank_note": None,
            "price_missing": price_rank is None,
        }
        if price_rank and price_rank > 5:
            chg = {d: chg for d, chg, _a, _c in price_ranked}[target_dong]
            sign = "+" if chg >= 0 else ""
            dong_compare["price_rank_note"] = f"{price_rank}위 {target_dong} {sign}{chg:.1f}% ({len(price_ranked)}개 동 중)"
        if not volume_ranked and not price_ranked:
            dong_compare = None

    station_premium = None
    if form.get("station_premium"):
        from estimate_price import compute_distance_premium, compute_distance_premium_correction

        premium = compute_distance_premium(filtered)
        if premium is not None:
            station_premium = {
                "n": premium["n"], "keyword": premium["keyword"],
                "min_distance": premium["min_distance"], "max_distance": premium["max_distance"],
                "change_per_100m": f"{abs(premium['change_per_100m']):.1f}",
                "pct_per_100m": f"{abs(premium['pct_per_100m']):.1f}",
                "direction": "하락" if premium["change_per_100m"] < 0 else "상승",
                "tendency": "가까울수록 비싸지는" if premium["change_per_100m"] < 0 else "가까울수록 오히려 싸지는",
                "r_squared": f"{premium['r_squared']:.2f}",
                "low_confidence": premium["r_squared"] < 0.2,
                "correction": None,
            }

            # 7-3절 — 조건이 까다로워(표본 15건·거리범위 300m·R²0.3·상식적 방향)
            # 다 맞을 때만, 대상 물건의 실제 역까지 거리를 반영한 참고용 보정
            # 수치를 추가로 보여준다. 8절 공식 매도가 값 자체는 바뀌지 않는다.
            try:
                from geocode import nearby_place

                subject_place = nearby_place(subject_coord[0], subject_coord[1], "지하철역")
            except RuntimeError:
                subject_place = None
            if subject_place is not None:
                correction = compute_distance_premium_correction(premium, subject_place["distance_m"])
                if correction is not None:
                    station_premium["correction"] = {
                        "subject_distance_m": subject_place["distance_m"],
                        "avg_distance_m": f"{correction['avg_distance_m']:.0f}",
                        "closer": subject_place["distance_m"] < correction["avg_distance_m"],
                        "pct": f"{correction['pct']:+.1f}",
                        "corrected_realistic": _fmt_eok(realistic * correction["factor"]),
                    }

    from estimate_price import describe_comparable_similarity, estimate_building_top_floors, is_estimated_top_floor

    top_floor_map = estimate_building_top_floors(rows)

    build_year_note = f", 준공년도 ±{build_year_tolerance}년 이내" if build_year is not None else ""
    expanded_note = ""  # 5절 적응형 반경을 끄면서 "자동으로 넓혔습니다" 안내도 비워둔다
    # 68절 — 7-2절 시계열 보정을 다시 켜면서 안내 문구도 되살렸다. 보정이
    # 실제로 걸린 행이 있을 때만 붙는다(CLI와 같은 문장 — 한 함수에서 나온다).
    time_correction_note = ""
    if any(c.get("_amount_man_adjusted") for c in filtered):
        time_correction_note = ep_time_correction_note(trend_rate)

    # 64절 — 1층 보정이 실제로 걸렸으면 **반드시 알린다.** 조용히 값만 바꾸면
    # "왜 예전 계산이랑 숫자가 다르지" 혼란을 준다(7-2절이 같은 이유로 안내
    # 문구를 달았다). 목록의 금액은 신고된 실제 체결가 그대로라, 안 알리면
    # "표에 뜬 가격들이랑 매도가가 왜 안 맞지"로도 읽힌다.
    first_floor_note = ""
    if any(c.get("_first_floor_factor") for c in filtered):
        pct = (1 - FIRST_FLOOR_PRICE_RATIO) * 100
        if floor == 1:
            first_floor_note = (
                f" 이 물건은 1층이라, 위층 실거래는 1층 시세대로 약 {pct:.0f}% 낮춰서 계산했습니다"
                f"(아래 목록의 금액은 신고된 실제 체결가 그대로입니다)."
            )
        else:
            first_floor_note = (
                f" 비교거래 중 1층 건은 위층 시세대로 약 {pct:.0f}% 올려서 계산했습니다"
                f"(아래 목록의 금액은 신고된 실제 체결가 그대로입니다)."
            )
    comparable_criteria = (
        f"반경 {radius:.0f}m 안, 전용면적 ±{area_tolerance_pct_input:.0f}%{build_year_note}인 실거래 중 "
        f"거리·면적·층·준공년도 종합 유사도(0~100점, 표의 '유사도' 열)가 높을수록, "
        f"계약월이 최근일수록 가중치를 높게 줘서 고른 것입니다."
        f"{first_floor_note}{expanded_note}{time_correction_note}"
    )

    price_tiers_display = {
        "rows": [
            {"key": k, "label": PRICE_TIER_LABELS[k], "price": _fmt_eok(price_tiers[k]),
             "speed": None, "percentile": None}
            for k in ("urgent", "d30", "d60", "normal", "test")
        ],
    }

    liquidity_display = None
    if liquidity is not None:
        c = liquidity["counts"]
        liquidity_display = {
            "latest": f"{liquidity['latest_year']}.{liquidity['latest_month']:02d}",
            "rows": [
                {
                    "radius": radius,
                    "m3": c[(radius, 3)], "m3_avg": f"{c[(radius, 3)] / 3:.1f}",
                    "m6": c[(radius, 6)], "m6_avg": f"{c[(radius, 6)] / 6:.1f}",
                    "m12": c[(radius, 12)], "m12_avg": f"{c[(radius, 12)] / 12:.1f}",
                }
                for radius in liquidity["radii"]
            ],
        }

    # 결과 페이지 안에서 바로 매물을 붙여넣고 재계산할 수 있게, 지금 제출된
    # 값(주소·면적·층 등)을 숨은 필드로 그대로 echo해둔다 — 28절 UX 개선:
    # 예전엔 네이버부동산 링크는 결과 페이지에 있고 붙여넣기 칸은 입력 폼
    # 페이지에 있어서, 링크 열고 복사한 뒤 "뒤로가기"로 폼을 다시 채워야
    # 했다. 이제 결과 페이지 자체에 작은 재제출 폼을 둬서 그 왕복을 없앤다.
    resubmit_fields = {k: v for k, v in form.items() if k != "listings_text"}
    # 43절 — 임장 체크는 결과를 보고 현장에 다녀온 뒤에 채우는 게 자연스러워서,
    # 결과 페이지에서 바로 체크하고 재계산할 수 있는 폼을 하나 더 뒀다. 그
    # 폼에는 임장 필드를 숨은 값으로 넣으면 안 되므로(체크박스가 그 자리를
    # 대신한다) 따로 걸러낸 세트를 만든다.
    _insp_keys = {f"insp_{key}" for key, _ in INSPECTION_FIELDS} | {"insp_clean"}
    resubmit_fields_no_inspection = {k: v for k, v in form.items() if k not in _insp_keys}

    # 19절 입지 체크 + 34절 주변 지형을 카드 하나로 합친다 — 사용자가
    # "두 개를 합쳐도 괜찮을 것 같은데? 교통·교육·생활·의료 다음에 자연이라는
    # 파트로"라고 해서, 지형을 다섯 번째 갈래로 붙였다. 둘 다 카카오 로컬
    # 키워드 검색이라 데이터 성격도 같다.
    # ⚠️ 검색 반경이 다르다 — 입지는 1.5km(45절 때문에 넓혔다), 지형은
    #    nearby_place() 기본값인 1km다. 그래서 "없음" 문구를 갈래가 아니라
    #    항목마다 따로 들고 다닌다(`none_text`).
    location_card = None
    if location and any((location.get(k) or {}).get("place") for k, _ in LOCATION_KEYWORDS):
        loc_none = f"{LOCATION_SEARCH_RADIUS_M / 1000:.1f}km 안에 없음"
        groups = [
            {"name": name, "icon": icon,
             "places": [{"label": label,
                         "place": (location.get(kw) or {}).get("place"),
                         "scored": kw in LOCATION_SCORED,
                         "none_text": loc_none}
                        for kw, label in items]}
            for name, icon, items in LOCATION_GROUPS
        ]
        if terrain_places:
            groups.append({"name": "자연", "icon": "🌳", "places": terrain_places,
                            "experimental": True})
        # 한 갈래 안에서 하나도 못 찾았으면 그 갈래는 통째로 뺀다.
        location_card = {
            "groups": [g for g in groups if any(p["place"] for p in g["places"])],
            "radius_km": f"{LOCATION_SEARCH_RADIUS_M / 1000:.1f}",
            "has_terrain": bool(terrain_places),
        }

    result = {
        "address": address,
        "period": f"{year_min}.01 ~ {this_year}.12",
        "building": building,
        "location": location_card,
        "inspection_checklist": inspection_checklist,
        "inspection_fields": INSPECTION_FIELDS,
        "inspection_bad": inspection_bad,
        "inspection_clean": inspection_clean,
        "resubmit_fields_no_inspection": resubmit_fields_no_inspection,
        "condition_adjustment": condition_display,
        "villa_market_trend": villa_market_trend,
        "buyer_age": buyer_age,
        "dong_compare": dong_compare,
        "station_premium": station_premium,
        "price_chart_html": price_chart_html,
        "marker_colors": marker_colors,
        "naver_land_url": naver_url,
        "kakao_js_key": KAKAO_JS_KEY,
        "subject_lat": subject_coord[0],
        "subject_lon": subject_coord[1],
        "search_radius_m": radius,
        "price_tiers": price_tiers_display,
        "liquidity": liquidity_display,
        "resubmit_fields": resubmit_fields,
        "n_total": scen["n_total"], "n_close": scen["n_close"], "n_this_year": scen["n_this_year"],
        "confidence": scen["confidence"],
        "prediction_interval": prediction_interval,
        "conservative": _fmt_eok(conservative), "realistic": _fmt_eok(realistic),
        "auction_price": _fmt_eok(auction_price),
        "upper": _fmt_eok(upper), "ai_base": _fmt_eok(ai_base),
        "comparable_criteria": comparable_criteria,
        "comparables": [
            {
                "name": r.get("mhouseNm", "(단지명없음)"),
                "area": r.get("excluUseAr", "?"),
                "floor": r.get("floor") or "?",
                "is_top_floor": is_estimated_top_floor(r, top_floor_map),
                "date": f"{r.get('dealYear')}.{r.get('dealMonth')}",
                "amount": _fmt_eok(r["_amount_man"]),
                "distance": f"{r['_distance_m']:.0f}m",
                "score": round(r["_similarity_score"]),
                "note": describe_comparable_similarity(area, floor, build_year, r),
                "search_url": naver_search_url(f"{r.get('umdNm', '')} {r.get('mhouseNm', '')}".strip()),
                "map_url": naver_land_url(r["_lat"], r["_lon"], zoom=19) if r.get("_lat") is not None else None,
            }
            for r in filtered[:8]
        ],
    }

    listings_text = form.get("listings_text", "").strip()
    similar_listings = None
    listing_price_summary = None  # 31절 — 일반 매도가 기준 가격 경쟁력, 붙여넣은 매물이 있을 때만 계산됨
    pressure = None  # 39절 — 경쟁매물 ÷ 최근 실거래, 마찬가지로 매물을 붙여넣은 경우만
    if listings_text:
        from listing_parser import (parse_listings, price_rank_among_listings,
                                     rank_similar_listings, sale_pressure)

        parsed, skipped = parse_listings(listings_text)
        if parsed:
            ranked = rank_similar_listings(parsed, area, floor, int(build_year), top_n=20)
            similar_listings = {
                "rows": [
                    {
                        "name": it["name"],
                        "price": _fmt_eok(it["price_man"]),
                        "area": it["area"],
                        "floor": it["floor"] if it["floor"] is not None else "?",
                        "note": describe_comparable_similarity(area, floor, build_year, {
                            "excluUseAr": it["area"],
                            "floor": str(it["floor"]) if it["floor"] is not None else None,
                            "buildYear": str(it["build_year"]) if it["build_year"] is not None else None,
                        }),
                    }
                    for it in ranked
                ],
                "n_parsed": len(parsed),
                "n_skipped": skipped,
                "n_shown": len(ranked),
            }
            listing_price_summary = price_rank_among_listings(parsed, area, price_tiers["normal"],
                                                                area_tolerance_pct)
            if listing_price_summary is not None:
                result["price_tiers"]["competitive_note"] = (
                    f"일반 매도가({_fmt_eok(price_tiers['normal'])}) 기준 붙여넣은 유사면적 매물 "
                    f"{listing_price_summary['n']}건 중 가격 경쟁력 상위 {listing_price_summary['percentile']}%"
                    f" (이보다 싼 매물 {listing_price_summary['cheaper_count']}개)"
                )

            # 29절 확장 — 5단계 가격 구간 각각이 "지금 나와 있는 경쟁 매물" 대비
            # 몇 % 위치인지(31절)와 30절 유동성을 합쳐서 구간마다 예상 소진
            # 속도를 붙인다. 과거 실거래 기준 구간(29절)과 현재 매물 기준
            # 퍼센타일(31절)이 어긋나면(예: "최고가 테스트"인데 현재 매물
            # 대비로는 오히려 싼 편) 그 자체가 시장이 움직였다는 신호가 된다.
            liquidity_avg_500_3m = liquidity["counts"][(500, 3)] / 3 if liquidity is not None else None

            # 39절 — 지금 쌓인 경쟁 매물이 이 동네 거래 속도로 몇 개월치인지.
            pressure = sale_pressure(parsed, area, liquidity_avg_500_3m, area_tolerance_pct)

            for row in result["price_tiers"]["rows"]:
                tier_rank = price_rank_among_listings(parsed, area, price_tiers[row["key"]], area_tolerance_pct)
                if tier_rank is not None:
                    row["percentile"] = tier_rank["percentile"]
                    row["speed"] = speed_label_for_percentile(tier_rank["percentile"], liquidity_avg_500_3m)
        else:
            similar_listings = {"rows": [], "n_parsed": 0, "n_skipped": skipped, "n_shown": 0}

    result["similar_listings"] = similar_listings
    result["sale_pressure"] = pressure
    result["listings_text_echo"] = listings_text
    # 32절 — 문장을 한 덩어리로 흘려보내지 않고 문장 리스트 그대로 받아서
    # 화면에서 줄을 나눈다(긴 줄글은 읽기 어렵다는 사용자 지적 반영).
    from estimate_price import build_verdict_parts

    result["verdict_lines"] = build_verdict_parts(
        scen["confidence"], scen["n_total"], liquidity=liquidity,
        listing_summary=listing_price_summary,
        model_divergence_pct=scen.get("model_divergence_pct"),
        sale_pressure=pressure)
    result["verdict"] = " ".join(result["verdict_lines"])

    # 44절 — 계절성(12절)·가격 추이(15절)를 웹에도 그림으로 붙인다. 계산
    # 함수는 CLI와 같은 걸 그대로 쓰고, 그리기만 웹용 렌더러를 쓴다.
    # ⚠️ 웹은 year_min 이후 데이터만 들고 있어서(CLI는 data/raw 전체 기간)
    #    "전체 기간" 기준인 12절 원문과 달리 최근 몇 년치 기준이다 — 화면에
    #    그 사실을 적는다.
    from estimate_price import compute_price_trend, compute_seasonality
    from price_chart import render_price_trend_svg, render_seasonality_bars_html

    season_card = trend_card = None
    if target_dong:
        season = compute_seasonality(rows, target_dong)
        season_chart = render_seasonality_bars_html(season)
        if season_chart:
            season_card = {
                "chart_html": season_chart,
                "scope": season["scope_label"],
                "busy": [f"{m}월" for m in season["busy"]],
                "slow": [f"{m}월" for m in season["slow"]],
            }
        trend = compute_price_trend(rows, target_dong)
        trend_chart = render_price_trend_svg(trend)
        if trend_chart:
            first_v, last_v = trend["series"][0][1], trend["series"][-1][1]
            trend_card = {
                "chart_html": trend_chart,
                "scope": trend["scope_label"],
                "first": f"{trend['series'][0][0]} {first_v:,.0f}",
                "last": f"{trend['series'][-1][0]} {last_v:,.0f}",
                "change_pct": f"{(last_v / first_v - 1) * 100:+.1f}" if first_v else None,
            }
    result["seasonality"] = season_card
    result["price_trend"] = trend_card

    # 40절 — 인근 아파트 대비 가격비율. 아파트 API는 활용신청이 별개라
    # 실패할 수 있어서, 실패하면 조용히 생략하고 나머지 계산은 그대로 간다.
    apt_gap = None
    if target_dong:
        try:
            from data_source import get_apt_rows
            from estimate_price import compute_apt_gap

            # 57절 — 위에서 미리 던져둔 결과를 받는다(없으면 지금 직접 부른다).
            apt_rows = (_apt_future.result(timeout=60) if _apt_future is not None
                        else get_apt_rows(lawd_cd, year_min))
            apt_gap = compute_apt_gap(apt_rows, target_dong, area, auction_price,
                                       this_year, year_min, lawd_cd=lawd_cd,
                                       subject_coord=subject_coord)
        except Exception:
            apt_gap = None
    result["apt_gap"] = apt_gap

    # 41절 — "얼마"(8절)와 별개로 "얼마나 잘 팔릴까"를 강의 기준으로 진단한다.
    # 매물을 붙여넣었으면 경쟁 매물·가격 위치 항목까지 채워진다.
    from estimate_price import MARKETABILITY_ICONS, build_marketability_report

    marketability = build_marketability_report(
        floor=floor, build_year=int(build_year), this_year=this_year,
        confidence=scen["confidence"], liquidity=liquidity, sale_pressure=pressure,
        listing_summary=listing_price_summary, building=building,
        inspection_bad=inspection_bad, inspection_clean=inspection_clean,
        apt_gap=apt_gap, location=location)
    for item in marketability["items"]:
        item["icon"] = MARKETABILITY_ICONS.get(item["verdict"], "·")
    result["marketability"] = marketability
    result["estimate_warnings"] = estimate_warnings

    monthly_deposit = _optional_float("monthly_deposit")
    if monthly_deposit is not None:
        from estimate_price import compute_monthly_rent

        conversion_rate = _optional_float("conversion_rate", 6.0)
        monthly_rent = compute_monthly_rent(realistic, monthly_deposit, conversion_rate)
        result["monthly_rent"] = {
            "deposit": f"{monthly_deposit:.0f}", "rate": f"{conversion_rate:.1f}",
            "amount": f"{monthly_rent:.0f}",
        }

    result["timings"] = _timer.summary()

    return render_template("result.html", result=result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
