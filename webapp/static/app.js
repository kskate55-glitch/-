/* 72-36절 — base.html 의 <script> 를 그대로 옮긴 것. 이유는 app.css 참고. */

  // 로딩이 길어질 때(특히 처음 조회하는 지역 — 비교거래마다 카카오 지오코딩을
  // 하나씩 호출해서 느림) 스피너만 덩그러니 있으면 지루하고 멈춘 것처럼
  // 보인다는 지적을 반영해, 실제 백엔드가 처리하는 순서 그대로 단계 문구를
  // 몇 초 간격으로 바꿔 보여주고(체감 대기시간을 줄이는 효과), 그 뒤로는
  // 이 프로젝트의 참고 팁을 계속 돌려서 오래 걸려도 화면이 비어 보이지 않게 한다.
  var LOADING_STEPS = [
    "주소를 좌표로 변환하는 중이에요…",
    "국토부 실거래가를 조회하는 중이에요…",
    "반경 안 비교거래를 찾는 중이에요…",
    "매도가를 계산하는 중이에요…",
  ];
  // 팁은 글자 한 줄짜리만 쓴다 — 3.5초씩 순서대로 돌린다.
  // 로딩 중 순환하는 글자 팁 (37절).
  // 팁 출처는 CLAUDE.md에 적어둔다 — 브라우저로 그대로 나가는 파일이라
  // 여기에는 출처를 쓰지 않는다(화면 문구도 같은 원칙, 42-1절).
  // 숫자가 들어간 팁은 "사례 기준"이라고 반드시 밝힌다 — 보장 수치가 아니고
  //   세법·금리는 시점마다 바뀌기 때문(이 프로젝트의 정직성 원칙과 동일).
  var LOADING_TIPS = [
    { text: "💡 경매 낙찰 후 빠르게 팔려면 보통 \"30일 목표가\" 근처가 적당해요" },
    { text: "💡 빌라는 아파트의 대체재예요 — 인근 아파트보다 비싸지면 잘 안 팔립니다" },
    { text: "💡 \"싸게 사는 것\"보다 \"실제로 팔릴 가격\"을 먼저 계산하는 게 순서예요" },
    { text: "💡 반지하는 보통 지상층 시세의 절반 수준으로 형성돼요" },
    { text: "💡 싸다고 다 팔리는 건 아니에요 — \"팔리는 빌라의 하한선\"을 잡는 게 핵심" },
    { text: "💡 빌라는 개별성이 강해서 실거래 한 건만 보고 가격을 정하면 위험해요" },
    { text: "💡 3층이 가장 인기 있고, 1층·6층은 상대적으로 덜 선호되는 편이에요" },
    { text: "💡 평당가만 맹신하지 마세요 — 면적·층·연식·상태가 섞이면 왜곡될 수 있어요" },
    { text: "💡 채광·엘리베이터·주차·누수·악취·소음·관리상태·경사는 임장 때 꼭 확인하세요" },
    { text: "💡 호가·실거래에도 업거래 같은 왜곡이 섞일 수 있어요 — 여러 건을 같이 보세요" },
    { text: "💡 경쟁을 피하는 하자 6단계: 입지 · 물종 · 물건 · 법리 · 절차 · 시장" },
    { text: "💡 \"하자 있는 물건\"이 아니라 \"통제 가능한 하자\"인지가 갈림길이에요" },
    { text: "💡 매도 전엔 네이버부동산에서 주변 경쟁 매물을 꼭 확인해보세요" },
    { text: "💡 수익률이 높은 물건일수록 환금성(빨리 팔리는 정도)은 낮아질 수 있어요" },
    { text: "💡 같은 건물이라도 수리 상태(올수리/기본/노후)에 따라 매도가능가격이 달라져요" },
    { text: "💡 현금:대출 3:7, 낙찰가는 투자금의 약 3~3.5배가 흔한 구조예요 — 사례 기준이라 보장 수치는 아닙니다" },
    { text: "💡 거래량 · 거래시기 · 면적 · 연식 · 상태 · 주변 아파트와의 가격차를 함께 보세요" },
    { text: "💡 취득세 중과배제 기준은 수도권 공시가 1억 · 지방 2억 이하 — 세법은 시점마다 달라지니 최신 기준을 꼭 확인하세요" },
    { text: "💡 명도는 인도명령까지 가도 길어야 3~6개월, 어려우면 대행을 씁니다(약 200만원 선)" },
    { text: "💡 투자금 5천~2억 구간은 수도권 비규제 빌라 올현금 단타가 주 타겟이에요 (사례 기준)" },
    { text: "💡 목표는 한 번의 대박이 아니라 반복 가능한 경매 투자 시스템이에요" },
    { text: "💡 처음 조회하는 지역은 지오코딩 때문에 조금 더 걸릴 수 있어요" },
  ];
  var TIP_MS_TEXT = 3500;

  // ⚠️⚠️ **아이폰 사파리에서 로딩 문구·팁이 안 바뀌던 원인과 해법.**
  // iOS Safari는 화면 전환(내비게이션)이 시작되면 떠나는 페이지를 **더 이상
  // 다시 그리지 않는다.** rAF로 첫 프레임은 억지로 그려낼 수 있어서 스피너는
  // 뜨지만, 그 뒤 setInterval로 문구를 바꿔봐야 화면에는 영영 반영되지
  // 않는다(DOM만 바뀌고 페인트가 없다). 로딩 단계 문구도, 37절 팁 순환도
  // 모바일에서 통째로 죽어 있던 이유가 이것이다.
  //
  // 그래서 **아예 화면을 넘기지 않는다** — 폼을 fetch로 직접 POST해서 지금
  // 페이지를 살려두고(타이머·애니메이션이 계속 돈다), 응답이 오면 그때
  // 문서를 통째로 갈아끼운다.
  //
  // ⚠️ `document.open()/write()/close()`를 쓰는 이유: 결과 페이지에는 인라인
  //    <script>(가격 분포 그래프 툴팁, 카카오맵, 북마클릿)가 들어 있는데
  //    `innerHTML`로 넣으면 **스크립트가 실행되지 않는다**. write는 구식이지만
  //    이 용도에는 확실하다.
  // ⚠️ 본문을 URLSearchParams로 만들어 보내므로 서버가 받는 형식은 평소
  //    폼 전송(application/x-www-form-urlencoded)과 **완전히 같다** —
  //    webapp/app.py는 손댈 게 없다.
  // ⚠️ URL은 그대로 "/"에 둔다(replaceState 안 함). 새로고침하면 POST가
  //    다시 날아가는 대신 빈 입력 폼이 떠서 오히려 안전하고, 결과 페이지의
  //    "← 다시 계산하기"(href="/")도 그대로 동작한다.
  // 문서를 갈아끼우기 전에 멈춰야 할 로딩 연출 타이머들.
  var loadingTimers = [];
  function clearLoadingTimers() {
    loadingTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    loadingTimers = [];
  }

  function submitWithoutLeaving(form) {
    var action = form.getAttribute("action") || window.location.href;
    // ⚠️ **폼이 정한 전송 방식을 그대로 따른다.** 예전에는 무조건 POST로
    //    보냈는데, 그랬면 `method="get"` 폼(70-2절 진단 페이지)이
    //    서버가 받을 수 없는 메서드로 나가 **405 Method Not Allowed**가
    //    떠버렸다(사용자가 실제로 맞았다). 이 핸들러는 페이지의 **모든**
    //    폼에 붙으므로, 새 페이지를 만들 때마다 같은 사고가 나길 기다리는
    //    구조였다.
    var method = (form.getAttribute("method") || "get").toUpperCase();

    // fetch/FormData가 없는 아주 구형 브라우저는 평소대로 전송한다
    // (그런 기기에서는 팁이 안 도는 대신 계산은 정상적으로 된다).
    if (!window.fetch || !window.FormData || !window.URLSearchParams) {
      form.submit();
      return;
    }

    var body;
    try {
      body = new URLSearchParams();
      new FormData(form).forEach(function (value, key) { body.append(key, value); });
    } catch (err) {
      form.submit();
      return;
    }

    var url = action, init = {
      method: method,
      credentials: "same-origin",
      headers: { "X-Requested-With": "fetch" }
    };
    if (method === "POST") {
      init.body = body;
    } else {
      // GET 폼은 값을 쿼리스트링으로 붙인다 — 화면을 안 넘기는
      // 연출(22절)은 그대로 유지하면서 메서드만 제대로 맞춘다.
      var qs = body.toString();
      url = action.split("#")[0];
      if (qs) { url += (url.indexOf("?") >= 0 ? "&" : "?") + qs; }
    }
    fetch(url, init).then(function (res) {
      return res.text();
    }).then(function (html) {
      clearLoadingTimers();   // 새 문서로 갈아끼우기 전에 연출 타이머를 정리
      document.open();
      document.write(html);
      document.close();
      window.scrollTo(0, 0);
    }).catch(function () {
      // 네트워크 오류 등 — 평소 방식으로 한 번 더 시도한다.
      form.submit();
    });
  }

  // 뒤로가기로 돌아왔을 때(BFCache) 오버레이가 켜진 채로 복원되면 멀쩡한
  // 페이지 위에 스피너만 계속 돌아간다 — 복원 시 무조건 끈다.
  window.addEventListener("pageshow", function () {
    var el = document.getElementById("loading-overlay");
    if (el) el.classList.remove("active");
  });

  document.querySelectorAll("form").forEach(function (form) {
    var handing = false;   // 우리가 다시 보내는 제출까지 가로채지 않도록

    form.addEventListener("submit", function (e) {
      if (handing) return;          // 두 번째 제출(우리가 보낸 것)은 그냥 통과
      handing = true;

      // ⚠️⚠️ **아이폰 사파리에서 로딩 마크가 안 뜨던 진짜 원인이 여기다.**
      // iOS Safari는 화면 전환(내비게이션)이 시작되면 **떠나는 페이지를 더
      // 이상 다시 그리지 않는다.** 제출 핸들러 안에서 오버레이를 켜 봐야
      // 핸들러가 끝나는 즉시 전환이 시작되므로 새 프레임이 **한 번도**
      // 그려지지 않는다 — DOM은 바뀌었는데 화면은 그대로인 것이다.
      // (`void offsetHeight`는 레이아웃만 강제할 뿐 페인트는 강제하지 못해서
      //  소용이 없었다.)
      //
      // 그래서 전송을 일단 막고, **실제로 한 프레임이 그려진 뒤에**(rAF 두
      // 번 — 첫 번째는 다음 프레임 직전, 두 번째는 그 프레임이 그려진 뒤)
      // 직접 form.submit()으로 보낸다.
      // ⚠️ form.submit()은 submit 이벤트를 다시 발생시키지 않고 HTML5 검증도
      //    건너뛴다 — 하지만 이 핸들러는 **검증을 통과한 뒤에만** 불리므로
      //    (사용자 제출은 검증 후에 submit 이벤트가 난다) 문제되지 않는다.
      e.preventDefault();

      var sent = false;
      function send() {
        if (sent) { return; }
        sent = true;
        submitWithoutLeaving(form);
      }

      try {
        // (1) 입력칸에 포커스가 남아 있으면 소프트 키보드가 떠 있는데, iOS
        //     Safari는 키보드가 뜬 동안 position:fixed 요소를 화면 밖(레이아웃
        //     뷰포트 기준)에 그려버린다 — 포커스를 먼저 풀어 키보드를 닫는다.
        // (2) 스크롤이 내려가 있으면(제출 버튼은 폼 맨 아래에 있으니 거의
        //     항상 그렇다) fixed가 제대로 안 먹는 브라우저에서 오버레이가
        //     화면 밖에 남는다 — 맨 위로 올려 확실히 보이게 한다.
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
        window.scrollTo(0, 0);

        var overlay = document.getElementById("loading-overlay");
        overlay.classList.add("active");
        void overlay.offsetHeight;   // 레이아웃 확정(페인트는 아래 rAF가 보장)

        // ⚠️ 제출 이벤트 안에서 버튼을 바로 disabled로 만들면 일부 구형
        //    WebKit이 폼 전송 자체를 취소한다 — 다음 틱으로 미룬다.
        var btn = form.querySelector("button[type=submit]");
        if (btn) setTimeout(function () { btn.disabled = true; }, 0);
      } catch (err) {
        // 연출이 실패해도 **전송은 반드시 되어야 한다** — 바로 보낸다.
        send();
        return;
      }

      // 한 프레임이 실제로 그려진 뒤 전송한다.
      if (window.requestAnimationFrame) {
        requestAnimationFrame(function () { requestAnimationFrame(send); });
      }
      // rAF가 안 오는 경우(백그라운드 탭 등) 대비 — 어떤 일이 있어도 전송된다.
      setTimeout(send, 400);

      var textEl = document.getElementById("loading-text");

      // 좁은 화면(모바일)에서는 팁을 한 줄씩 돌리는 대신 **전부 한 번에**
      // 목록으로 깔아준다 — 작은 화면에서 3.5초마다 한 줄씩 읽는 것보다
      // 쭉 훑는 편이 낫다는 사용자 요청이다. 넓은 화면은 손대지 않는다.
      var TIPS_AS_LIST = !!(window.matchMedia &&
                            window.matchMedia("(max-width: 720px)").matches);

      if (TIPS_AS_LIST) {
        var wrap = document.getElementById("loading-tips-wrap");
        var list = document.getElementById("loading-tips");
        if (wrap && list && !list.childNodes.length) {
          LOADING_TIPS.forEach(function (tip) {
            var li = document.createElement("li");
            li.textContent = tip.text;
            list.appendChild(li);
          });
        }
        if (wrap) wrap.hidden = false;
      }

      function showTip(i) {
        textEl.textContent = LOADING_TIPS[i].text;
        loadingTimers.push(setTimeout(function () {
          showTip((i + 1) % LOADING_TIPS.length);
        }, TIP_MS_TEXT));
      }

      var stepIdx = 0;
      textEl.textContent = LOADING_STEPS[0];
      var stepTimer = setInterval(function () {
        stepIdx++;
        if (stepIdx < LOADING_STEPS.length) {
          textEl.textContent = LOADING_STEPS[stepIdx];
          return;
        }
        clearInterval(stepTimer);
        // 목록을 이미 깔아뒀으면 같은 팁을 위에서 또 돌릴 이유가 없다 —
        // 단계가 끝났다는 것만 알려주고 멈춘다.
        if (TIPS_AS_LIST) {
          textEl.textContent = "거의 다 됐어요 — 결과를 정리하는 중이에요…";
          return;
        }
        showTip(0);
      }, 2200);
      loadingTimers.push(stepTimer);
    });
  });
