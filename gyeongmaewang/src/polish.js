/* ================= ✨ 마이크로 폴리시 — 표정·땀·손맛·돈 움직임·정적·열쇠·CASE OPEN/CLOSED·숨쉬기 =================
   새 시스템이 아니다. 이미 있는 장면이 '살아서 반응'하게 만드는 얇은 층.
   원칙: 짧게(대부분 1초 안), 정보를 가리지 않게, 클릭하면 바로 걷힌다.
   연출 설정(gxLevel: max/mid/min)과 OS '동작 줄이기'를 따른다 — min이면 움직임 없이 모양만. */
function pxLv(){ return typeof gxLevel === "function" ? gxLevel() : "mid"; }
function pxMin(){ return pxLv() === "min"; }

/* ---------- 🔊 효과음: 같은 소리 겹침 방지 + 새 소리 몇 개 ---------- */
const PX_SFX_LAST = {};
const PX_SYN = {
  tap(ac, t, tone, noise){ noise(t, 0.018, 0.16, 2200, 1.6); },                                     // 버튼 — 마른 딸깍
  keypad(ac, t, tone){ tone(1180 * (0.97 + Math.random() * 0.06), t, 0.035, "square", 0.05); },   // 숫자 입력
  envelope(ac, t, tone, noise){ noise(t, 0.28, 0.32, 1500, 0.7); noise(t + 0.2, 0.09, 0.4, 700, 1); tone(95, t + 0.24, 0.12, "sine", 0.35, 60); },   // 봉투 밀어 넣기
  jingle(ac, t, tone){ [2400, 3150, 2780, 3500, 2600].forEach((f, i) => tone(f * (0.96 + Math.random() * 0.08), t + i * 0.055 + Math.random() * 0.02, 0.11, "triangle", 0.09)); },   // 열쇠 짤랑
  bzz(ac, t, tone){ tone(150, t, 0.12, "square", 0.06); tone(150, t + 0.18, 0.12, "square", 0.06); },   // 휴대폰 진동
  door(ac, t, tone, noise){ noise(t, 0.35, 0.18, 380, 0.8); tone(210, t + 0.05, 0.3, "sine", 0.12, 150); },
  folder(ac, t, tone, noise){ noise(t, 0.16, 0.3, 1800, 0.8); noise(t + 0.14, 0.2, 0.22, 2600, 0.7); },   // CASE 파일철
  deep(ac, t, tone){ tone(62, t, 0.4, "sine", 0.45, 40); }};                                         // 돈 빠져나갈 때 낮은 한 번
function pxSyn(kind){
  if(typeof kcSfxOn === "function" && !kcSfxOn()) return;
  try{
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
    KC_AC = KC_AC || new AC(); const ac = KC_AC, t0 = ac.currentTime + 0.01; if(ac.state === "suspended") ac.resume();
    const out = ac.createGain(); out.gain.value = 0.35 * (0.95 + Math.random() * 0.1); out.connect(ac.destination);   // ±5% 볼륨 흔들기
    const tone = (f, t, d, type, vol, f2) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.02); };
    const noise = (t, d, vol, fq, q, type) => { const n = Math.max(1, Math.floor(ac.sampleRate * d)), buf = ac.createBuffer(1, n, ac.sampleRate), a = buf.getChannelData(0); for(let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = buf; f.type = type || "bandpass"; f.frequency.value = fq * (0.96 + Math.random() * 0.08); f.Q.value = q || 1; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(out); s.start(t); };
    PX_SYN[kind](ac, t0, tone, noise);
  }catch(e){}
}
const _px_sfx = kcSfx;
kcSfx = function(kind){
  const now = performance.now();
  if(PX_SFX_LAST[kind] && now - PX_SFX_LAST[kind] < (kind === "keypad" ? 45 : 100)) return;   // 빠른 클릭에 20개씩 겹치지 않게
  PX_SFX_LAST[kind] = now;
  if(kind === "message" || kind === "msg") pxBuzz();
  if(PX_SYN[kind]) return pxSyn(kind);
  return _px_sfx(kind);
};
// 짧게 BGM·환경음을 낮춘다(개찰 직전 정적, 큰 순간)
let PX_DUCK_T = null;
function pxDuck(level, ms){
  if(typeof SN_DUCK === "undefined" || typeof kaApplyVol !== "function") return;
  SN_DUCK = level; kaApplyVol(); clearTimeout(PX_DUCK_T);
  PX_DUCK_T = setTimeout(() => { SN_DUCK = 1; kaApplyVol(); }, ms);
}

/* ---------- 📳 휴대폰 진동 — 화면 전체가 아니라 작은 폰 알림만 ---------- */
function pxBuzz(){
  try{ if(navigator.vibrate) navigator.vibrate([22, 40, 22]); }catch(e){}
  let el = document.getElementById("pxPhone");
  if(!el){ el = document.createElement("div"); el.id = "pxPhone"; el.className = "px-phone"; el.setAttribute("aria-hidden", "true"); el.textContent = "📳"; document.body.appendChild(el); }
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 1100);
  pxSyn("bzz");
}

/* ---------- 😰 반응 API — 표정 교체 · 땀 · 놀람 · 핏대 ----------
   pxReact({face:"shocked", fx:"sweat", n:2, sound:"…", delay:900})
   얼굴은 주인공 초상(.vn-player) → 없으면 거점 전신(.lf-me). 그림이 없으면 조용히 넘어간다. */
function pxTarget(){ return document.querySelector(".vn-face.me img") || document.querySelector(".vn-player") || document.querySelector(".lf-me"); }
// 🖼️ 표정은 대사창 초상 칸에서 — 가슴 위로 자른 표정 그림을 무대에 크게 세우면 '잘라 붙인' 티가 난다.
// 무대의 '나'는 늘 뒷모습(프레임 가장자리에 걸친 구도)으로 두고, 표정 그림은 대사창 왼쪽 초상 칸에 넣는다.
function pxPortrait(){
  const img = document.querySelector(".kfs-stage .vn-player.front, .vn .vn-player.front"); if(!img) return;
  const face = img.getAttribute("src"), back = typeof artUrl === "function" && artUrl("npc_player_normal");
  const vn = img.closest(".vn"), box = vn && vn.querySelector(".vn-box");
  if(back){ img.setAttribute("src", back); img.classList.remove("front"); [...img.classList].filter(c => /^pf-/.test(c)).forEach(c => img.classList.remove(c)); }
  else img.remove();
  if(!box || !face) return;
  let slot = box.querySelector(".vn-face.me");
  if(!slot){ const old = box.querySelector(".vn-face"); if(old) old.remove(); slot = document.createElement("span"); slot.className = "vn-face me"; slot.innerHTML = `<img src="${face}" alt="">`; box.prepend(slot); box.classList.add("has-face", "has-me"); }
  else slot.querySelector("img").setAttribute("src", face);
}
function pxFace(img, face){
  if(!img || img.tagName !== "IMG" || !(img.classList.contains("vn-player") || img.closest(".vn-face.me"))) return;
  const u = typeof artUrl === "function" && artUrl("npc_playerf_" + face); if(!u || img.src.endsWith(u)) return;
  if(pxMin()){ img.src = u; return; }
  img.classList.add("px-swap"); setTimeout(() => { img.src = u; img.classList.remove("px-swap"); }, 80);   // 딱 끊지 않고 80ms 살짝 겹쳐 바꾼다
}
// 픽셀 물방울 — 게임 그림과 같은 도트 느낌(이모지 아님)
const PX_DROP = (() => {
  const rows = ["...o....", "..oxo...", "..oxo...", ".oxxxo..", ".oxwxxo.", "oxwxxxo.", "oxxxxxo.", ".oxxxo..", "..ooo..."], col = {o:"#1f5d93", x:"#8fd0ff", w:"#ffffff"};
  let r = ""; rows.forEach((row, y) => [...row].forEach((c, x) => { if(col[c]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`; }));
  return `<svg viewBox="0 0 8 9" width="15" height="17" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
})();
const PX_BANG = (() => {
  const rows = [".oo.", "oxxo", "oxxo", "oxxo", "oxxo", ".oo.", "....", ".oo.", "oxxo", ".oo."], col = {o:"#3a1d05", x:"#ffcf4a"};
  let r = ""; rows.forEach((row, y) => [...row].forEach((c, x) => { if(col[c]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`; }));
  return `<svg viewBox="0 0 4 10" width="12" height="30" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
})();
const PX_VEIN = `<svg viewBox="0 0 7 7" width="16" height="16" shape-rendering="crispEdges" aria-hidden="true"><g fill="#d8433b"><rect x="1" y="0" width="1" height="3"/><rect x="0" y="1" width="3" height="1"/><rect x="5" y="0" width="1" height="3"/><rect x="4" y="1" width="3" height="1"/><rect x="1" y="4" width="1" height="3"/><rect x="0" y="5" width="3" height="1"/><rect x="5" y="4" width="1" height="3"/><rect x="4" y="5" width="3" height="1"/></g></svg>`;
function pxFx(el, fx, n){
  if(!el) return; const r = el.getBoundingClientRect(); if(!r.width) return;
  const front = el.classList.contains("vn-player") && el.classList.contains("front");
  // 관자놀이 쯤 — 앞모습 초상은 얼굴이 크고, 전신은 머리가 위쪽 15% 안에 있다
  const port = !!el.closest(".vn-face"); const fx0 = r.left + r.width * (port ? 0.74 : front ? 0.68 : 0.62), fy0 = r.top + r.height * (port ? 0.2 : front ? 0.15 : 0.08);
  for(let i = 0; i < (n || 1); i++){
    const d = document.createElement("div"); d.className = `px-fx px-${fx}${pxMin() ? " still" : ""}`;
    d.innerHTML = fx === "sweat" ? PX_DROP : fx === "shock" ? PX_BANG : PX_VEIN;
    d.style.left = (fx0 + scrollX + (fx === "shock" ? -r.width * 0.15 : i * 9)) + "px";
    d.style.top = (fy0 + scrollY + (fx === "shock" ? -r.height * (port ? 0.34 : 0.21) : i * 6)) + "px";
    d.style.animationDelay = (i * 0.16) + "s";
    document.body.appendChild(d); setTimeout(() => d.remove(), 1300 + i * 160);
  }
  if(fx === "shock" && !pxMin()){ el.classList.remove("px-hop"); void el.offsetWidth; el.classList.add("px-hop"); }
}
function pxReact(o){
  const run = () => { const el = o.el || pxTarget(); if(o.face) pxFace(el, o.face); if(o.fx) pxFx(el, o.fx, o.n); if(o.sound) kcSfx(o.sound); if(o.duck) pxDuck(o.duck, o.duckMs || 900); };
  if(o.delay) setTimeout(run, o.delay); else run();
}

/* ---------- 🎞️ 짧은 장면 카드(CASE OPEN · 빈집 · CASE CLOSED) — 클릭하면 바로 걷힌다 ---------- */
function pxCard(html, ms, cls){
  const old = document.getElementById("pxCard"); if(old) old.remove();
  const el = document.createElement("div"); el.id = "pxCard"; el.className = "px-card " + (cls || "") + (pxMin() ? " still" : "");
  el.innerHTML = `<div class="px-card-in">${html}</div>`; el.setAttribute("aria-hidden", "true");
  const close = () => { if(!el.isConnected) return; el.classList.add("out"); setTimeout(() => el.remove(), 220); };
  el.addEventListener("pointerdown", close); document.body.appendChild(el);
  setTimeout(close, pxMin() ? Math.min(ms, 600) : ms);
  return el;
}
function pxCaseNo(){ return String((typeof KP !== "undefined" && KP && KP.no) || 1).padStart(3, "0"); }
function pxCaseOpen(){
  const R = arenaRec(); R.pxOpens = (R.pxOpens || 0) + 1;
  const short = R.pxOpens > 3;   // 몇 번 본 뒤로는 짧게
  kcSfx("folder");
  pxCard(`<div class="px-folder"><span class="px-tab">CASE</span><b class="px-disp">CASE ${pxCaseNo()}</b><small>${esc((KP && KP.title) || "")}</small>${KP && KP.court ? `<small class="px-court">🏛️ ${esc(KP.court)} ${esc(KP.caseNum || "")}</small>` : ""}<em>조사 시작</em></div>`, short ? 650 : 1150, "open");
}
function pxEmptyHouse(){
  kcSfx("jingle"); setTimeout(() => kcSfx("door"), 380);
  pxCard(`<div class="px-empty"><span class="px-key">🔑</span><p class="px-disp">열쇠를 받았다</p><p class="px-dots">……</p><small>명도 완료 · DAY ${K ? K.day : 0}<br>빈집이다. 이제 진짜 내 집.</small></div>`, 1500, "empty");
  pxDuck(0.45, 1600);
}
function pxCaseClosed(){
  pxDuck(0.4, 1400);
  pxCard(`<div class="px-folder shut"><span class="px-tab">CASE</span><b class="px-disp">CASE ${pxCaseNo()}</b><small>${esc((KP && KP.title) || "")}</small>${K && K.final ? `<strong class="px-profit ${K.final.profit < 0 ? "down" : ""}">${K.final.profit >= 0 ? "+" : "−"}${kMan(Math.abs(Math.round(K.final.profit)))}</strong>` : ""}<i class="px-stamp">CLOSED</i></div>`, 1350, "closed");
  setTimeout(() => kcSfx("stamp"), pxMin() ? 0 : 420);
}

/* ---------- 🧭 장면 전환 감지 — 이전 렌더와 비교해서 한 번씩만 ---------- */
let PX_SIG = {};
const PX_OPENED = new Set();   // 탭을 오가도 같은 사건의 서류철은 한 번만 연다
function pxAfterKing(){
  if(typeof page === "undefined" || page !== "arena" || arenaTab !== "king" || !K){ PX_SIG = {}; return; }
  const s = {seed:K.seed, step:K.step, rev:!!K.revealing, intro:!!K.intro, sealed:!!K.sealed}, P = PX_SIG, same = P.seed === s.seed;
  // CASE OPEN — 새 사건의 첫 조사 화면
  if(s.step === "brief" && !s.intro && !s.rev && (!same || P.intro) && !PX_OPENED.has(s.seed)){ PX_OPENED.add(s.seed); pxCaseOpen(); }
  if(same){
    if(s.sealed && !P.sealed) kcSfx("envelope");                             // 봉투 넣는 소리
    if(s.rev && !P.rev){                                                    // 개찰 직전 정적 — BGM 크게 낮춤
      const n = K.result ? K.result.bids.length : 3, T = typeof keRevealTimes === "function" ? keRevealTimes(n) : {total:3};
      pxDuck(0.18, Math.round(T.total * 1000));
    }
    const justShown = (P.rev && !s.rev) || (!s.rev && s.step !== P.step);
    if(justShown && K.result){
      const R = K.result;
      if(s.step === "won" && R.solo){ pxReact({face:"happy"}); pxReact({fx:"sweat", n:1, delay:950}); }       // 좋아했다가… 입찰자 1명
      else if(s.step === "won" && R.gap >= Math.max(300, K.bid * 0.05)){                                       // 과입찰 — 웃음이 굳는다
        pxReact({face:"happy"}); pxReact({face:"shocked", fx:"sweat", n:2, delay:850, duck:0.25, duckMs:1300}); pxReact({fx:"shock", delay:850});
      }
      else if(s.step === "lost" && R.gap <= 10){ pxReact({face:"shocked", delay:500}); pxReact({fx:"sweat", n:1, delay:1100}); }   // 10만원의 비극 — 멍
    }
    if(!s.rev && s.step !== P.step){
      if(s.step === "defect" && P.step === "move") pxEmptyHouse();
      if(s.step === "defect" && (K.defects || []).some(d => !d.known)) pxReact({face:"shocked", fx:"sweat", n:1, delay:pxMin() ? 0 : 1650});
      if(s.step === "result") pxCaseClosed();
    }
  }
  PX_SIG = s;
}

/* ---------- 💸 돈이 실제로 움직인다(거점 머리줄) ---------- */
let PX_CASH = null, PX_CASH_WHO = null;
function pxCashStr(v){ return v < 0 ? "대출 " + kMan(-v) : kMan(v); }
const _px_kfsHeader = kfsHeader;
kfsHeader = function(){
  let h = _px_kfsHeader();
  if(typeof lfOn === "function" && lfOn() && arenaTab === "life"){
    const v = kcRec().cash, str = pxCashStr(v);
    h = h.replace(`· ${str}</span>`, `· <b class="px-cash" data-v="${v}">${str}</b></span>`);
  }
  return h;
};
function pxAfterCash(){
  const el = document.querySelector(".px-cash"); if(!el){ return; }
  const L = typeof lfRec === "function" && lfRec(), who = L ? L.char + ":" + L.born : null; if(who !== PX_CASH_WHO){ PX_CASH_WHO = who; PX_CASH = null; }   // 다른 인생으로 바뀌면 이전 잔액과 비교하지 않는다
  const v = +el.dataset.v, prev = PX_CASH; PX_CASH = v;
  if(prev == null || Math.abs(v - prev) < 10) return;                     // 10만원 미만 변화는 조용히
  const d = v - prev;
  if(typeof keFloat === "function") keFloat(el, (d > 0 ? "+" : "−") + kMan(Math.abs(d)), d > 0 ? "px-in" : "px-out");
  kcSfx(d > 0 ? "coin" : "deep");
  if(pxMin() || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const t0 = performance.now(), dur = Math.min(1100, 600 + Math.abs(d) / 20);
  const step = now => { if(!el.isConnected) return; const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = pxCashStr(Math.round((prev + d * e) / 10) * 10); if(p < 1) requestAnimationFrame(step); else el.textContent = pxCashStr(v); };
  el.textContent = pxCashStr(prev); requestAnimationFrame(step);
}

/* ---------- 🫁 숨쉬기 · 피곤 · 스트레스 ---------- */
function pxAfterLife(){
  const st = document.querySelector(".lf-stage"); if(!st || typeof lfRec !== "function") return;
  const L = lfRec(); if(!L) return;
  st.classList.toggle("px-tired", (L.sta || 0) < 20);
  st.classList.toggle("px-stress", L.stress >= 70);
  st.classList.toggle("px-stress2", L.stress >= 88);
}
function pxRoot(){ document.documentElement.classList.toggle("px-still", pxMin()); }

const _px_render = renderArena;
renderArena = function(){
  _px_render();
  queueMicrotask(() => { try{ pxRoot(); pxPortrait(); pxAfterKing(); pxAfterCash(); pxAfterLife(); }catch(e){} });
};

/* ---------- 👆 버튼 손맛 — 눌림 모양은 CSS, 소리는 주요 버튼만 ---------- */
document.addEventListener("touchstart", () => {}, {passive:true});        // iOS에서 :active가 먹게
document.addEventListener("pointerdown", e => {
  const b = e.target.closest && e.target.closest(".btn, .ag-act, .of-spot, [data-cp]");
  if(!b || b.disabled || b.getAttribute("aria-disabled") === "true") return;
  if(typeof page !== "undefined" && page !== "arena" && !b.closest("#cpEnd")) return;
  kcSfx("tap");
}, true);
// 입찰가 숫자 입력 — 키패드 딸깍
document.addEventListener("input", e => { const t = e.target; if(t && t.matches && t.matches("#kBid")) kcSfx("keypad"); }, true);
