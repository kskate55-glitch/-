/* ================= 💼 경매인 인생 — 커리어 자금 · 판단 기록 · 두 개의 등급 · 개찰 연출 · 이번 주 경매 · 공유카드 · 효과음 =================
   한 판이 끝나도 돈이 누적된다. 목표는 10억. 모든 금액은 만원. 원본 함수는 감싸기만 한다. */
const KC_START_CASH = 15000, KC_GOAL = 100000;
const KC_REP_NAMES = [[0,"무명 투자자"],[50,"동네에서 이름 좀 알려진 사람"],[150,"중개사들이 먼저 연락하는 사람"],[400,"법정에서 알아보는 사람"],[800,"경매왕"]];
const KC_TIERS = [[15000,"구축 빌라",true],[30000,"아파트·신축 빌라"],[50000,"다가구"],[100000,"상가주택"],[200000,"꼬마빌딩"]];
function kcRec(){
  const R = arenaRec();
  if(!R.career) R.career = {cash:KC_START_CASH, start:KC_START_CASH, total:0, cases:0, wins:0, fails:0, bids:0, lostBids:0, best:null, worst:null, streak:0, history:[], weekly:{}};
  const c = R.career; if(!c.history) c.history = []; if(!c.weekly) c.weekly = {}; return c;
}
function kcRepName(rep){ let n = KC_REP_NAMES[0][1]; for(const [r, t] of KC_REP_NAMES) if(rep >= r) n = t; return n; }
function kcMan(v){ return (v < 0 ? "-" : "") + kMan(Math.abs(v)); }
function kcEok(v){ return (v/10000).toFixed(2) + "억"; }
function kcSigned(v){ return (v >= 0 ? "+" : "-") + kMan(Math.abs(v)); }
// ISO 주차 — 같은 주엔 모두 같은 물건·같은 경쟁자·같은 사건
function kcWeek(d){ d = d ? new Date(d) : new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); const w = Math.ceil(((t - Date.UTC(y,0,1)) / 864e5 + 1) / 7); return `${y}-W${String(w).padStart(2,"0")}`; }
function kcSeedOf(str){ let h = 2166136261; for(const ch of str){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 1e9 || 7; }

/* ---------- 🎯 이번 판 도전 ---------- */
const KC_GOALS = [
  {id:"move14", t:"14일 안에 명도", ok:()=>K.moveDays <= 14},
  {id:"fee150", t:"이사비+법적비용 150만원 이하", ok:()=>K.cost.move + K.cost.legal <= 150},
  {id:"found3", t:"숨은 위험 3개 이상 발견", ok:()=>K.final.found >= 3},
  {id:"rep700", t:"수리·하자 총액 700만원 이하", ok:()=>K.cost.repair <= 700},
  {id:"sell4",  t:"매도 4주 안에 계약", ok:()=>K.sale.weeks <= 4},
  {id:"p2000",  t:"세전 순익 2,000만원 이상", ok:()=>K.final.profit >= 2000},
  {id:"nolaw",  t:"강제집행 없이 명도", ok:()=>K.cost.legal < 350}];
function kcPickGoals(seed){ const r = kRng(seed ^ 0x9e3779b9), pool = KC_GOALS.slice(), out = []; while(out.length < 2){ out.push(pool.splice(Math.floor(r()*pool.length), 1)[0]); } return out; }

/* ---------- 🔊 효과음 (외부 파일 없이 WebAudio로 합성) ---------- */
let KC_AC = null;
function kcSfxOn(){ try{ return localStorage.getItem("sfx_off") !== "1"; }catch(e){ return true; } }
function kcSfx(kind){
  if(!kcSfxOn()) return;
  try{
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
    KC_AC = KC_AC || new AC(); const ac = KC_AC, t0 = ac.currentTime + 0.01; if(ac.state === "suspended") ac.resume();
    const out = ac.createGain(); out.gain.value = 0.35; out.connect(ac.destination);
    const tone = (f, t, d, type, vol, f2) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.02); };
    const noise = (t, d, vol, fq, q, type) => { const n = Math.floor(ac.sampleRate * d), buf = ac.createBuffer(1, n, ac.sampleRate), a = buf.getChannelData(0); for(let i=0;i<n;i++) a[i] = (Math.random()*2-1) * (1 - i/n); const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = buf; f.type = type || "bandpass"; f.frequency.value = fq || 1500; f.Q.value = q || 0.8; g.gain.value = vol || 0.4; s.connect(f); f.connect(g); g.connect(out); s.start(t); };
    if(kind==="paper"){ noise(t0, 0.22, 0.35, 2600, 0.6); noise(t0+0.12, 0.18, 0.25, 3400, 0.6); }
    if(kind==="stamp"){ tone(110, t0, 0.28, "sine", 0.9, 45); noise(t0, 0.08, 0.7, 900, 1.2); }
    if(kind==="thud"){ tone(70, t0, 0.35, "sine", 0.7, 40); noise(t0, 0.06, 0.3, 400, 1); }
    if(kind==="msg"){ tone(880, t0, 0.09, "sine", 0.35); tone(1320, t0+0.11, 0.14, "sine", 0.35); }
    if(kind==="coin"){ tone(1560, t0, 0.07, "triangle", 0.3); tone(2080, t0+0.06, 0.16, "triangle", 0.3); }
    if(kind==="shock"){ tone(420, t0, 0.38, "sawtooth", 0.22, 110); noise(t0, 0.12, 0.25, 700, 1); }
    if(kind==="sign"){ noise(t0, 0.35, 0.3, 5200, 2, "highpass"); tone(660, t0+0.36, 0.12, "sine", 0.25); }
    if(kind==="tick"){ noise(t0, 0.03, 0.4, 3000, 2); }
    if(kind==="fanfare"){ [523, 659, 784, 1047].forEach((f,i)=>tone(f, t0 + i*0.11, i===3 ? 0.5 : 0.16, "square", 0.16)); }
  }catch(e){}
}
function kcSfxBtn(){ return `<button type="button" class="kc-sfx" data-kcsfx aria-pressed="${kcSfxOn()}" title="효과음 켜기/끄기">${kcSfxOn()?"🔊 효과음":"🔇 효과음 꺼짐"}</button>`; }

/* ---------- 새 판 시작(모드: career 커리어 · weekly 이번 주 · free 연습) ---------- */
let KC_MODE = "career", KC_INTRO = false;
function kcStart(mode, prop){
  const c = kcRec(); mode = mode || "career"; KC_MODE = mode;
  K_PROP_NEXT = mode === "weekly" ? "k1" : (prop && K_PROPS[prop] ? prop : "k1");
  const week = kcWeek(), seed = mode === "weekly" ? kcSeedOf("gyeongmaewang-" + week) : undefined;
  KC_INTRO = true; kStart(seed);
}
const _kc_kStart = kStart; kStart = function(seed){
  _kc_kStart(seed);
  const c = kcRec(), p = hubRec();
  K.mode = KC_MODE; K.week = kcWeek(); K.caseNo = c.cases + 1; K.cashStart = c.cash;
  K.goals = kcPickGoals(K.seed); K.intro = KC_INTRO; KC_INTRO = false;
  // 소문: 명성이 높으면 "저 사람 또 왔네" — 당신을 아는 투자자가 붙는다(주간 경매는 모두 같은 조건이라 제외)
  if(K.mode === "career" && p.rep >= 400) K.rivals.push({t:"당신을 아는 투자자", lo:1.12, hi:1.20, p:0.5});
};
// 명성이 높으면 점유자가 "돈 많은 사장님"이라며 이사비를 더 부른다(최대 +20%)
const _kc_kOccNeed = kOccNeed; kOccNeed = function(){ const n = _kc_kOccNeed(); if(!K || K.mode !== "career") return n; const rep = hubRec().rep; return Math.round(n * (1 + Math.min(0.2, rep/4000)) / 10) * 10; };
const _kc_kResearch = kResearch; kResearch = function(id){ const before = K && K.done[id]; _kc_kResearch(id); if(K && !before && K.done[id]) KC_SFX_NEXT = "paper"; };
let KC_SFX_NEXT = null, KC_REVEAL_NEXT = false, KC_PRED_NEXT = null;
const _kc_kBid = kBid; kBid = function(amt){
  _kc_kBid(amt); if(!K || !K.result) return;
  K.pred = KC_PRED_NEXT; KC_PRED_NEXT = null;
  if(KC_REVEAL_NEXT){ K.revealing = true; KC_REVEAL_NEXT = false; }
  if(K.mode === "career"){ const c = kcRec(); c.bids++; if(K.step === "lost") c.lostBids++; if(typeof save==="function") save(); }
};

/* ---------- 결과: 두 개의 등급 · 판단 기록 비교 · 커리어 누적 ---------- */
const KC_GRADE_SC = {S:4, A:3, B:2, C:1, F:0};
function kcBizGrade(profit){ return profit >= 3000 ? "S" : profit >= 2000 ? "A" : profit >= 1000 ? "B" : profit >= 0 ? "C" : "F"; }
function kcPredCompare(){
  const P = K.pred; if(!P) return null;
  const act = {sale:K.sale.price, repair:K.cost.repair, move:K.moveDays}, rows = [];
  const pct = (p, a) => a ? (p - a) / a * 100 : 0;
  if(P.sale > 0) rows.push({k:"sale", t:"매도가", p:P.sale, a:act.sale, err:pct(P.sale, act.sale), unit:"man"});
  if(P.repair >= 0 && P.repair !== null) rows.push({k:"repair", t:"수리비", p:P.repair, a:act.repair, err:pct(P.repair, act.repair), unit:"man"});
  if(P.move > 0) rows.push({k:"move", t:"명도기간", p:P.move, a:act.move, err:P.move - act.move, unit:"day"});
  return rows.length ? rows : null;
}
function kcJudge(){
  const F = K.final, parts = [];
  const found = F.found / F.hid; parts.push([found, 40, `숨은 위험 ${F.found}/${F.hid} 발견`]);
  const rep = {good:1, part:1, min:0.55, full:0}[K.repair.id] ?? 0.5; parts.push([rep, 15, rep >= 1 ? "수리 범위 적절" : rep > 0 ? "수리를 아꼈다(매도가 손해)" : "수리 과투자"]);
  const over = K.bid / (KP.trueMid * 0.78); const bidS = over <= 1 ? 1 : Math.max(0, 1 - (over - 1) * 5); parts.push([bidS, 15, bidS >= 1 ? "입찰가 절제" : "입찰가가 높았다"]);
  const rows = kcPredCompare();
  if(rows){ const e = rows.reduce((s, r) => s + (r.k === "sale" ? Math.max(0, 1 - Math.abs(r.err)/10) : r.k === "repair" ? Math.max(0, 1 - Math.abs(r.err)/80) : Math.max(0, 1 - Math.abs(r.err)/25)), 0) / rows.length; parts.push([e, 30, `판단 기록 정확도 ${Math.round(e*100)}점`]); }
  const tot = parts.reduce((s,p)=>s+p[1],0), sc = parts.reduce((s,p)=>s+p[0]*p[1],0) / tot * 100;
  const g = sc >= 85 ? "S" : sc >= 70 ? "A" : sc >= 55 ? "B" : sc >= 40 ? "C" : "F";
  return {g, score:Math.round(sc), notes:parts.map(p=>p[2])};
}
function kcVerdict(biz, jdg){
  const b = KC_GRADE_SC[biz], j = KC_GRADE_SC[jdg];
  if(b >= 3 && j >= 3) return "실력으로 번 돈입니다. 같은 판단이면 다음 물건에서도 남습니다.";
  if(b >= 3 && j <= 1) return "돈은 벌었는데, 다시 하면 위험합니다. 이번엔 운이 판단을 덮어 줬어요.";
  if(b <= 1 && j >= 3) return "결과는 아쉬워도 판단은 좋았습니다. 이 판단을 반복하면 결국 남습니다.";
  if(b <= 1 && j <= 1) return "이번 판은 복기가 필요합니다. '이렇게 했다면'부터 보세요.";
  return "무난한 한 판 — 약한 칸 하나만 고치면 한 단계 올라갑니다.";
}
const _kc_kFinish = kFinish; kFinish = function(){
  _kc_kFinish();
  const F = K.final, T = kTaxes(), c = kcRec(), p = hubRec();
  F.biz = kcBizGrade(F.profit); F.judge = kcJudge(); F.verdict = kcVerdict(F.biz, F.judge.g); F.pred = kcPredCompare();
  F.goals = (K.goals||[]).map(g => ({t:g.t, ok:!!g.ok()})); F.goalsOk = F.goals.length && F.goals.every(g=>g.ok);
  if(F.goalsOk) hubAward(150, 20, "🎯 이번 판 도전 성공");
  const entry = {n:K.caseNo, mode:K.mode, week:K.week, seed:K.seed, at:Date.now(), title:KP.title, bid:K.bid, sale:K.sale.price, profit:Math.round(F.profit), after:Math.round(T.bizAfter), days:K.day, moveDays:K.moveDays,
    grades:F.grades, biz:F.biz, judge:F.judge.g, found:F.found, hid:F.hid, pred:F.pred, style:F.style[0], overall:F.overall};
  if(K.mode === "career"){
    F.cashBefore = c.cash; c.cash = Math.round(c.cash + T.bizAfter); F.cashAfter = c.cash;
    F.repBefore = p.rep; // hubAward는 원본 kFinish 래퍼에서 이미 반영됨 — 이전 명성은 대략값으로 복원
    c.cases++; c.total += Math.round(T.bizAfter); if(F.profit > 0){ c.wins++; c.streak++; } else { c.fails++; c.streak = 0; }
    F.newBest = !c.best || entry.after > c.best.after; if(F.newBest) c.best = entry; if(!c.worst || entry.after < c.worst.after) c.worst = entry;
  }
  if(K.mode === "weekly"){ const w = c.weekly[K.week]; F.newBest = !w || entry.profit > w.profit; if(F.newBest) c.weekly[K.week] = entry; F.weekTries = (w && w.tries || 0) + 1; c.weekly[K.week].tries = F.weekTries; }
  c.history.unshift(entry); c.history = c.history.slice(0, 40);
  if(typeof save==="function") save();
};
// 명성 before 값을 정확히 남기려고 hubAward 직전 값을 잡아 둔다
const _kc_hubAward = hubAward; hubAward = function(xp, rep, why){ if(K && K.step === "result" && K.repStart == null) K.repStart = hubRec().rep; _kc_hubAward(xp, rep, why); };

/* ---------- 능력치(여러 판 누적) ---------- */
function kcAbilities(){
  const h = kcRec().history.filter(e => e.mode !== "free"), avg = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : null;
  const band = (v, cuts) => v == null ? "—" : v <= cuts[0] ? "S" : v <= cuts[1] ? "A" : v <= cuts[2] ? "B" : v <= cuts[3] ? "C" : "D";
  const gAvg = key => { const a = h.map(e => KC_GRADE_SC[e.grades && e.grades[key]]).filter(x => x != null); const v = avg(a); return v == null ? "—" : v >= 3.5 ? "S" : v >= 2.75 ? "A" : v >= 2 ? "B" : v >= 1.25 ? "C" : "D"; };
  const errs = k => h.map(e => (e.pred||[]).find(r => r.k === k)).filter(Boolean).map(r => Math.abs(r.err));
  const foundR = avg(h.map(e => e.found / e.hid));
  return [
    {k:"sale", t:"시세감각", g:band(avg(errs("sale")), [3,6,10,15]), d:"예상 매도가가 실제와 얼마나 가까웠나"},
    {k:"bid", t:"입찰감각", g:gAvg("bid"), d:"남는 가격에 적었나"},
    {k:"found", t:"권리·현장조사", g:foundR == null ? "—" : foundR >= 0.99 ? "S" : foundR >= 0.75 ? "A" : foundR >= 0.5 ? "B" : foundR >= 0.25 ? "C" : "D", d:"숨은 위험을 입찰 전에 찾았나"},
    {k:"move", t:"사람읽기", g:band(avg(errs("move")), [3,7,12,20]), d:"명도가 며칠 걸릴지 맞혔나"},
    {k:"repair", t:"수리견적", g:band(avg(errs("repair")), [15,30,50,80]), d:"수리비를 제대로 잡았나"},
    {k:"sell", t:"매도협상", g:gAvg("sell"), d:"제값 받고 팔았나"}];
}
function kcAbilityHTML(){
  const A = kcAbilities(), got = A.filter(a => a.g !== "—");
  const order = "SABCD", best = got.slice().sort((a,b)=>order.indexOf(a.g)-order.indexOf(b.g))[0], worst = got.slice().sort((a,b)=>order.indexOf(b.g)-order.indexOf(a.g))[0];
  const line = best && worst && best.g !== worst.g ? `${best.t}이(가) 강하고 ${worst.t}이(가) 약한 편이에요.` : got.length ? "고르게 성장 중이에요." : "경매를 끝내면 능력치가 쌓여요. 입찰 전 '판단 기록'을 적어야 감각 칸이 채워져요.";
  return `<div class="panel kc-abil"><b>🧠 내 경매 능력</b><div class="kc-abil-grid">${A.map(a=>`<div class="kc-ab"><span>${a.t}</span><b class="k-g g${a.g==="—"?"C":a.g}">${a.g}</b><small>${a.d}</small></div>`).join("")}</div><div class="note">${esc(line)}</div></div>`;
}

/* ---------- 공유카드 (가짜 백분위 없음 — 개인 최고기록 / 개발자 기준만) ---------- */
function kcShareText(){
  const F = K.final, G = F.grades, L = "━━━━━━━━━━━━━━";
  const tag = K.mode === "weekly" ? `📅 ${K.week.replace("-", " ")} 이번 주 경매` : K.mode === "career" ? `💼 커리어 ${K.caseNo}호 물건` : "🎮 연습 판";
  const brag = F.newBest ? (K.mode === "weekly" ? "🏅 이번 주 내 최고기록 갱신!" : "🏅 개인 최고기록 갱신!") : "";
  const dev = F.biz === "S" && F.judge.g === "S" ? "⭐ 개발자 기준 S랭크 돌파" : "";
  return [L, "      🏆 경매왕", L, tag, KP.title, `낙찰     ${kMan(K.bid)}`, `매도     ${kMan(K.sale.price)}`, `순이익   ${kcSigned(Math.round(F.profit))} (세전)`, `보유기간 ${K.day}일 · 수익률 ${F.rate.toFixed(1)}%`,
    `입찰 ${G.bid} · 명도 ${G.move} · 수리 ${G.repair} · 매도 ${G.sell}`, `💰 사업 ${F.biz} · 🧠 판단 ${F.judge.g}`, `유형: ${F.style[0]}`, brag, dev,
    K.mode === "weekly" ? "같은 물건, 님은 얼마 남겼어요?" : "", "#경매왕", L].filter(Boolean).join("\n");
}
function kcCopy(text, btn){
  const done = ok => { if(btn){ btn.textContent = ok ? "✅ 복사됨 — 단톡방에 붙여넣기" : "⚠️ 복사가 막혔어요 — 위 글을 길게 눌러 복사"; } };
  try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(()=>done(true), ()=>{ fallback(); }); return; } }catch(e){}
  fallback();
  function fallback(){ const ta = document.getElementById("kcShareTa"); if(ta){ ta.focus(); ta.select(); try{ done(document.execCommand("copy")); }catch(e){ done(false); } } else done(false); }
}

/* ---------- 화면 ---------- */
function kcIntroHTML(){
  const c = kcRec(), wk = K.mode === "weekly";
  const lines = [wk ? `이번 주 경매 · ${K.week}` : "서울○○지방법원", "오전 10:17", "오늘 입찰할 물건은 하나.", `감정가 ${kMan(KP.appraisal)}`, `최저가 ${kMan(KP.minBid)}.`,
    wk ? "이번 주엔 모두가 같은 물건, 같은 경쟁자, 같은 사건을 만난다." : `그리고 당신 통장에는\n${kMan(c.cash)}이 있다.`];
  return `<div class="kc-intro" data-vnkey="intro-${K.seed}">${vnBgHTML(artUrl("bg_bid_room") ? "bg_bid_room" : "bg_court")}<div class="kc-intro-in">${lines.map((l,i)=>`<p style="animation-delay:${0.35 + i*0.55}s">${esc(l).replace(/\n/g,"<br>")}</p>`).join("")}
    <button type="button" class="btn pri kc-open" data-kintro style="animation-delay:${0.35 + lines.length*0.55}s">📂 사건번호 열기</button><button type="button" class="kc-skip" data-kintro>건너뛰기 ›</button></div></div>`;
}
function kcRevealHTML(){
  return `<div class="kc-reveal" aria-live="polite">${vnBgHTML(artUrl("cut_bid_open") ? "cut_bid_open" : "bg_court")}<div class="kc-reveal-in"><p>입찰표를 제출했습니다.</p><p class="d1">…</p><p class="d2">개찰 중</p><p class="d3">…</p>
    <button type="button" class="kc-skip" data-kreveal>바로 보기 ›</button></div></div>`;
}
function kcGoalsHTML(done){
  if(!K.goals || !K.goals.length) return "";
  const F = K.final;
  return `<div class="panel kc-goals"><b>🎯 이번 판 도전</b> <small class="note">둘 다 성공하면 보너스 +150 XP</small><ul>${K.goals.map((g,i)=>{ const r = done && F && F.goals ? F.goals[i] : null; return `<li class="${r ? (r.ok ? "ok" : "no") : ""}">${r ? (r.ok ? "✅" : "❌") : "⬜"} ${esc(g.t)}</li>`; }).join("")}</ul></div>`;
}
function kcPredInputs(){
  return `<div class="panel kc-pred"><b>📝 내 판단 기록</b> <small class="note">입찰 전에 적어 두면, 끝나고 실제와 비교해 드려요</small>
    <div class="kc-pred-grid"><label>예상 매도가<span><input type="number" id="kPredSale" step="10" placeholder="예: 15500"> 만원</span></label>
    <label>예상 수리비<span><input type="number" id="kPredRepair" step="10" placeholder="예: 400"> 만원</span></label>
    <label>예상 명도기간<span><input type="number" id="kPredMove" step="1" placeholder="예: 14"> 일</span></label></div></div>`;
}
function kcPredTable(rows){
  if(!rows) return `<div class="panel kc-predres"><b>📝 판단 기록</b><div class="note">이번 판은 입찰 전 예측을 적지 않았어요. 다음 판엔 적어 보세요 — 여러 판이 쌓이면 '내 경매 능력'이 나와요.</div></div>`;
  const f = r => r.unit === "day" ? `${r.p}일` : kMan(r.p), fa = r => r.unit === "day" ? `${r.a}일` : kMan(r.a);
  const e = r => r.unit === "day" ? `${r.err > 0 ? "+" : ""}${r.err}일` : `${r.err > 0 ? "+" : ""}${r.err.toFixed(1)}%`;
  const good = r => r.unit === "day" ? Math.abs(r.err) <= 5 : Math.abs(r.err) <= (r.k === "sale" ? 3 : 25);
  const best = rows.slice().sort((a,b)=>(a.unit==="day"?Math.abs(a.err)*0.6:Math.abs(a.err)) - (b.unit==="day"?Math.abs(b.err)*0.6:Math.abs(b.err)));
  const WHO = {sale:"집값", repair:"수리비", move:"사람"};
  const line = rows.length >= 2 ? `${WHO[best[0].k]}을(를) ${WHO[best[best.length-1].k]}보다 더 잘 읽는 편입니다.` : "";
  return `<div class="panel kc-predres"><b>📝 판단 기록 — 내 예상 vs 실제</b><table class="kc-ptab"><thead><tr><th></th><th>예상</th><th>실제</th><th>오차</th></tr></thead><tbody>${rows.map(r=>`<tr class="${good(r)?"ok":"no"}"><td>${r.t}</td><td>${f(r)}</td><td>${fa(r)}</td><td><b>${e(r)}</b></td></tr>`).join("")}</tbody></table>${line?`<div class="note">${esc(line)}</div>`:""}</div>`;
}
function kcResultTop(){
  const F = K.final, p = hubRec(), c = kcRec();
  let html = `<div class="panel kc-dual"><div class="kc-dg"><small>💰 사업 결과</small><span class="k-g g${F.biz==="F"?"C":F.biz}">${F.biz}</span><em>순익 ${kcSigned(Math.round(F.profit))}</em></div>
    <div class="kc-dg"><small>🧠 투자 판단</small><span class="k-g g${F.judge.g==="F"?"C":F.judge.g}">${F.judge.g}</span><em>${F.judge.score}점</em></div>
    <p class="kc-verdict">“${esc(F.verdict)}”</p><ul class="kc-jnotes">${F.judge.notes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></div>`;
  if(K.mode === "career" && F.cashAfter != null){
    const pct = (F.cashAfter - F.cashBefore) / F.cashBefore * 100, rb = K.repStart != null ? K.repStart : p.rep;
    const nb = kcRepName(rb), na = kcRepName(p.rep);
    html = `<div class="panel kc-cash"><small>💼 ${K.caseNo}호 물건 종료 — 보유자금 (세후, 매매사업자 기준)</small>
      <div class="kc-cashrow"><b>${kMan(F.cashBefore)}</b><span>→</span><b class="${pct>=0?"up":"down"}">${kMan(F.cashAfter)}</b></div>
      <div class="kc-cashmeta"><span>총자산 <b class="${pct>=0?"up":"down"}">${pct>=0?"+":""}${pct.toFixed(1)}%</b></span><span>명성 ${esc(nb)}${na!==nb?` → <b>${esc(na)}</b>`:""}</span><span>🎯 10억까지 ${Math.min(100, c.cash/KC_GOAL*100).toFixed(1)}%</span></div>
      ${F.newBest?`<div class="kc-best">🏅 개인 최고기록 갱신!</div>`:""}</div>` + html;
  }
  if(K.mode === "weekly") html = `<div class="panel kc-cash weekly"><small>📅 ${esc(K.week)} 이번 주 경매 · ${F.weekTries}번째 도전</small><div class="kc-cashrow"><b>${kcSigned(Math.round(F.profit))}</b></div><div class="kc-cashmeta"><span>이번 주 내 최고 ${kcSigned(kcRec().weekly[K.week].profit)}</span><span>커리어 자금엔 반영되지 않아요 — 모두 같은 조건으로 비교하는 판</span></div>${F.newBest?`<div class="kc-best">🏅 이번 주 내 최고기록 갱신!</div>`:""}</div>` + html;
  return html;
}
function kcShareHTML(){
  const t = kcShareText();
  return `<details class="panel kc-share" open><summary>📤 공유카드 — 경매 모임 단톡방에 던지기</summary><pre>${esc(t)}</pre><textarea id="kcShareTa" readonly aria-hidden="true" tabindex="-1">${esc(t)}</textarea>
    <button type="button" class="btn pri" data-kshare>📋 카드 복사</button> <span class="note">순위·백분위는 전체 기록을 모으는 서버가 생기면 붙일게요 — 지금은 가짜 숫자를 안 써요.</span></details>`;
}
function kcBrokerLine(){
  const c = kcRec(), rep = hubRec().rep;
  if(K.mode !== "career") return "";
  const t = rep >= 150 ? "아, 요즘 빌라 몇 개 하신다는 분이시죠? 솔직히 말씀드리면 이 골목은 1억 5천 중반이 현실적이에요." : c.cases >= 1 ? "어? 전에 한 번 하셨던 사장님 아니에요? 이번에도 빌라네요. 잘 해 봐요." : "경매로 받으셨어요? 처음이세요? 호가는 너무 욕심내지 마세요.";
  return `<div class="panel kc-npc"><b>📞 동네 중개사 김사장</b><p>“${esc(t)}”</p>${rep>=150?'<small class="note">명성 덕분에 중개사가 솔직한 가격을 먼저 말해 줘요.</small>':""}</div>`;
}
const _kc_kingHTML = kingHTML; kingHTML = function(){
  if(K && K.intro) return kcIntroHTML();
  if(K && K.revealing && (K.step === "won" || K.step === "lost")) return kcRevealHTML();
  let h = _kc_kingHTML();
  if(!K) return h;
  if(K.step === "brief"){
    const head = K.mode === "weekly" ? `<div class="kc-mode weekly">📅 이번 주 경매 ${esc(K.week)} — 모두 같은 물건·같은 경쟁자</div>` : K.mode === "career" ? `<div class="kc-mode">💼 커리어 ${K.caseNo}호 물건 · 보유자금 ${kMan(kcRec().cash)}</div>` : "";
    h = h.replace('<div class="panel k-card">', head + kcGoalsHTML(false) + '<div class="panel k-card">').replace('<div class="panel k-bidbox">', kcPredInputs() + '<div class="panel k-bidbox">');
  }
  if(K.step === "move" && K.mode === "career" && hubRec().rep >= 300) h = h.replace('<div class="panel k-occ">', `<div class="note kc-rumor">💬 소문: '돈 많은 경매 사장님'이라는 말이 돌아서, 점유자가 이사비를 조금 더 부를 수 있어요.</div><div class="panel k-occ">`);
  if(K.step === "sell" && K.sale && K.sale.weeks === 1) h = h.replace('<div class="panel k-card">', kcBrokerLine() + '<div class="panel k-card">');
  if(K.step === "result" && K.final && K.final.biz){
    h = h.replace('<div class="panel k-result">', kcResultTop() + '<div class="panel k-result">');
    h = h.replace('<div class="panel k-style">', kcPredTable(K.final.pred) + kcGoalsHTML(true) + '<div class="panel k-style">');
    const again = K.mode === "career" ? "▶ 다음 경매 (커리어)" : K.mode === "weekly" ? "↺ 이번 주 물건 다시 도전" : "↺ 한 판 더";
    h = h.replace('<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-kstart>↺ 한 판 더 (다른 경쟁자·다른 사건)</button>', kcShareHTML() + `<div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" class="btn pri" data-kstart>${again}</button><button type="button" class="btn" data-atab="rec">📊 기록 보기</button>`);
  }
  if(K.step === "lost") h = h.replace("↺ 같은 물건 다시 (다른 경쟁자)", K.mode === "weekly" ? "↺ 이번 주 물건 다시 도전" : "📋 경매 게시판에서 다른 물건 고르기 (보증금은 돌려받았어요)");
  return `<div class="kc-topbar">${kcSfxBtn()}</div>` + h;
};

/* ---------- 홈(타이틀) · 기록 탭 ---------- */
// 열린 사건만 버튼으로 — 아직 안 끝낸 가장 앞 사건을 추천(pri)
function kcCaseButtons(running){
  const c = kcRec(), p = hubRec(), open = Object.values(K_PROPS).filter(P => !P.unlock || P.unlock(p)).sort((a,b)=>a.no-b.no);
  if(!c.cases && open.length <= 1) return `<button type="button" class="btn ${running?"":"pri"}" data-kcnew="career" data-prop="k1">▶ 새 게임 <small>보유 현금 1억 5,000만원으로 시작</small></button>`;
  const rec = open.find(P => !p.cleared["king:"+P.id]) || open[open.length-1];
  return open.map(P => `<button type="button" class="btn ${!running && P===rec?"pri":""}" data-kcnew="career" data-prop="${P.id}">📁 CASE ${String(P.no).padStart(3,"0")} ${esc(P.short||P.title)}${!p.cleared["king:"+P.id]?' <em class="kc-new">NEW</em>':""} <small>${"★".repeat(P.stars||1)}${"☆".repeat(5-(P.stars||1))} · ${esc(P.tagline||"")} · 보유 ${kMan(c.cash)}</small></button>`).join("");
}
homeHTML = function(){
  hubBackfill();
  const p = hubRec(), c = kcRec(), L = hubLevel(p.xp), wk = kcWeek(), W = c.weekly[wk];
  const running = K && K.step && K.step !== "result" && K.step !== "lost";
  const occ = hubOccList(), ends = STORY_EPS.reduce((n,E)=>n+Object.keys(E.endings).length,0);
  return `<div class="vn-title hub-hero kc-title">${vnBgHTML("bg_villa_night")}<div><h3 class="kc-logo">🏆 경 매 왕</h3><p class="kc-tag">싸게 사는 것만으로는 돈을 벌 수 없습니다.</p>
     <div class="kc-menu">${running?`<button type="button" class="btn pri" data-atab="king">▶ 이어하기 <small>${K.mode==="weekly"?"이번 주 경매":`${K.caseNo}호 물건`} · ${K.day}일째</small></button>`:""}
      ${kcCaseButtons(running)}
      <button type="button" class="btn" data-kcnew="weekly">📅 이번 주 경매 <small>${wk}${W?` · 내 최고 ${kcSigned(W.profit)}`:" · 아직 도전 전"}</small></button>
      <div class="kc-menu-row"><button type="button" class="btn" data-atab="rec">📊 기록</button><button type="button" class="btn" data-atab="dexall">📖 도감</button><button type="button" class="btn" data-atab="ach">🏅 업적</button><button type="button" class="btn" data-kcpractice>🧪 연습실</button></div></div>
     <div class="kc-stat">경매인 LV.${L.lv} · 누적수익 ${kcSigned(c.total)} · 처리 물건 ${c.cases}건</div>${kcSfxBtn()}</div></div>
   ${hubBar()}
   <div class="hub-grid">
     <button type="button" class="panel hub-tile" data-atab="story"><span class="hub-ic">🎬</span><b>스토리</b><small>엔딩 ${Object.keys(p.ends).length} / ${ends}</small></button>
     <button type="button" class="panel hub-tile" data-atab="dexall"><span class="hub-ic">📖</span><b>도감</b><small>점유자 ${Object.keys(p.met).length}/${occ.length} · 사건 ${Object.keys(p.events).length}/${HUB_EVENTS.length}</small></button>
     <button type="button" class="panel hub-tile" data-atab="rec"><span class="hub-ic">📊</span><b>기록</b><small>보유 ${kMan(c.cash)} · 10억까지 ${Math.min(100,c.cash/KC_GOAL*100).toFixed(1)}%</small></button></div>
   <h3 class="ag-role" id="kcPractice">🧪 연습실 <small class="note">본게임 전에 감 잡기 — 여기서도 경험치가 쌓여요</small></h3>
   <div class="hub-grid sm">
     <button type="button" class="panel hub-tile" data-atab="game"><span class="hub-ic">🎮</span><b>명도왕</b><small>점유자 한 명과 주 단위 명도</small></button>
     <button type="button" class="panel hub-tile" data-atab="chat"><span class="hub-ic">💬</span><b>협상 연습</b><small>AI 점유자·중개사와 대화</small></button>
     <button type="button" class="panel hub-tile" data-atab="sell"><span class="hub-ic">🏷️</span><b>매도 연습</b><small>호가 정하기</small></button>
     <button type="button" class="panel hub-tile" data-atab="guess"><span class="hub-ic">🎯</span><b>시세 맞히기</b><small>실제 과거 거래로</small></button></div>`;
};
function recHTML(){
  const c = kcRec(), p = hubRec(), wk = kcWeek(), W = c.weekly[wk];
  const tier = KC_TIERS.map(([need, t]) => `<li class="${c.cash >= need ? "on" : ""}"><span>${c.cash >= need ? "🔓" : "🔒"} ${esc(t)}</span><small>자산 ${kMan(need)}${c.cash >= need ? "" : ` · ${kMan(need - c.cash)} 더`}</small></li>`).join("");
  const hist = c.history.slice(0, 12).map(e => `<tr><td>${e.mode==="weekly"?`📅 ${esc(e.week)}`:e.mode==="career"?`💼 ${e.n}호`:"🎮"}</td><td>${kcEok(e.bid)} → ${kcEok(e.sale)}</td><td class="${e.profit>=0?"up":"down"}">${kcSigned(e.profit)}</td><td>${e.biz} / ${e.judge}</td><td>${e.days}일</td></tr>`).join("");
  const weeks = Object.entries(c.weekly).sort((a,b)=>b[0].localeCompare(a[0])).slice(0, 8);
  return `<p class="lead">한 판이 끝나도 돈은 남아요. <b>1억 5천에서 10억까지</b> — 어떤 판단이 돈을 불렸는지 여기 쌓여요.</p>
   <div class="panel kc-career"><div class="kc-cashrow"><small>보유자금</small><b>${kMan(c.cash)}</b></div>
     <div class="hub-xpbar kc-goalbar"><i style="width:${Math.min(100, c.cash/KC_GOAL*100)}%"></i></div><small class="note">🎯 목표 10억 — ${Math.min(100,c.cash/KC_GOAL*100).toFixed(1)}%</small>
     <div class="kc-cstats"><span>처리 물건 <b>${c.cases}</b></span><span>누적 세후 수익 <b class="${c.total>=0?"up":"down"}">${kcSigned(c.total)}</b></span><span>흑자 ${c.wins} · 적자 ${c.fails}</span><span>입찰 ${c.bids} · 패찰 ${c.lostBids}</span><span>연속 흑자 ${c.streak}</span><span>명성 ${esc(kcRepName(p.rep))}</span></div>
     ${c.best?`<div class="note">🏅 최고 거래: ${c.best.n}호 ${kcSigned(c.best.after)} (세후) · 😣 최악: ${c.worst.n}호 ${kcSigned(c.worst.after)}</div>`:""}</div>
   ${kcAbilityHTML()}
   <div class="panel kc-tiers"><b>🏢 자산이 커지면 열리는 물건</b><ul>${tier}</ul><small class="note">지금은 구축 빌라만 있어요 — 다음 물건들은 순서대로 들어와요.</small></div>
   <div class="panel kc-weekly"><b>📅 이번 주 경매 (${wk})</b><p class="note">매주 월요일 바뀌어요. 이번 주엔 모두가 같은 물건·같은 경쟁자·같은 사건을 만나요 — 링크 던지고 "나 얼마 남겼는데 님은?" 하는 판이에요.</p>
     ${W?`<div>내 최고 <b>${kcSigned(W.profit)}</b> · ${W.tries||1}번 도전 · 사업 ${W.biz} / 판단 ${W.judge}</div>`:""}<button type="button" class="btn pri" data-kcnew="weekly" style="margin-top:8px">📅 이번 주 경매 ${W?"다시 도전":"시작"}</button>
     ${weeks.length>1?`<ul class="note">${weeks.slice(1).map(([w,e])=>`<li>${esc(w)} — ${kcSigned(e.profit)}</li>`).join("")}</ul>`:""}</div>
   ${hist?`<div class="panel kc-histp"><b>🗂️ 지난 경매</b><div class="tier-table-wrap"><table class="kc-hist"><thead><tr><th></th><th>낙찰 → 매도</th><th>세전 순익</th><th>사업/판단</th><th>보유</th></tr></thead><tbody>${hist}</tbody></table></div></div>`:""}
   <details class="panel"><summary>⚠️ 커리어 처음부터 다시</summary><p class="note">보유자금·기록이 1억 5천으로 돌아가요. 레벨·도감·업적은 그대로예요.</p><button type="button" class="btn" data-kcreset>🔄 커리어 초기화</button></details>`;
}
hubTabs = function(){
  const b = (id, t) => `<button type="button" data-atab="${id}" aria-pressed="${arenaTab===id}">${t}</button>`;
  return `<div class="hub-tabs"><div class="seg rtabs hub-main" role="tablist" aria-label="경매왕 메뉴">${b("home","🏠 홈")}${b("king","🏆 경매왕")}${b("rec","📊 기록")}${b("story","🎬 스토리")}${b("dexall","📖 도감")}${b("ach","🏅 업적")}</div>
   <div class="hub-practice"><span>🧪 연습실</span>${b("game","🎮 명도왕")}${b("chat","💬 협상")}${b("sell","🏷️ 매도")}${b("guess","🎯 시세")}${b("dex","📘 공략노트")}${b("art","🎨 그림")}</div></div>`;
};
let KC_LAST = {};
const _kc_render = renderArena;
renderArena = function(){
  if(page !== "arena") return;
  if(arenaTab === "rec"){
    $("#main").innerHTML = `<section class="page"><div class="eyebrow">경매 RPG</div><h2 style="font-size:26px;margin-top:4px">기록</h2>${hubTabs()}${recHTML()}</section>`;
    hubToastShow();
  } else _kc_render();
  // 효과음·연출은 feel.js가 맡는다 — 여기선 개찰 타이머만
  if(arenaTab === "king" && K){
    if(KC_SFX_NEXT){ kcSfx(KC_SFX_NEXT); KC_SFX_NEXT = null; }
    if(K.revealing && !K._revT){ K._revT = setTimeout(()=>{ if(K && K.revealing){ K.revealing = false; K._revT = null; renderArena(); } }, K.revealMs || 1900); }
  }
};

/* ---------- 클릭 — 시작 버튼은 캡처 단계에서 가로챈다(모드·인트로를 붙이려고) ---------- */
document.addEventListener("click", e => {
  if(page !== "arena") return;
  let b;
  if((b = e.target.closest("[data-kcnew]"))){ e.stopImmediatePropagation(); arenaTab = "king"; kcStart(b.dataset.kcnew, b.dataset.prop); renderArena(); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-hubnew]")){ e.stopImmediatePropagation(); arenaTab = "king"; kcStart("career"); renderArena(); window.scrollTo(0,0); return; }
  // 패찰 뒤 "다른 물건" — 같은 물건을 바로 다시 띄우지 말고 경매 게시판으로 돌아가 고르게 한다
  if(arenaTab === "king" && K && K.step === "lost" && (K.mode || "career") === "career" && e.target.closest("[data-kstart]")){
    e.stopImmediatePropagation(); K = null;
    if(typeof lfOn === "function" && lfOn()){ arenaTab = "life"; if(typeof LF_SPOT !== "undefined") LF_SPOT = "board"; }
    else { arenaTab = "office"; if(typeof OF_SPOT !== "undefined") OF_SPOT = "board"; }
    renderArena(); window.scrollTo(0,0); return; }
  if(arenaTab === "king" && e.target.closest("[data-kstart]")){ e.stopImmediatePropagation(); kcStart(K && K.mode || "career", K && K.prop); renderArena(); window.scrollTo(0,0); return; }
  if(arenaTab === "king" && K && e.target.closest("[data-kbid]")){
    const v = id => { const el = document.getElementById(id); if(!el || el.value === "") return null; const n = +el.value; return isFinite(n) && n >= 0 ? Math.round(n) : null; };
    const pred = {sale:v("kPredSale"), repair:v("kPredRepair"), move:v("kPredMove")};
    KC_PRED_NEXT = (pred.sale || pred.repair != null || pred.move) ? pred : null;
    KC_REVEAL_NEXT = true;   // 원래 핸들러가 이어서 kBid를 부른다
  }
}, true);
document.addEventListener("click", e => {
  if(page !== "arena") return;
  let b;
  if(e.target.closest("[data-kcsfx]")){ try{ localStorage.setItem("sfx_off", kcSfxOn() ? "1" : "0"); }catch(x){} if(kcSfxOn()) kcSfx("coin"); renderArena(); return; }
  if(e.target.closest("[data-kcpractice]")){ const el = document.getElementById("kcPractice"); if(el) el.scrollIntoView({behavior:"smooth"}); return; }
  if(e.target.closest("[data-kcreset]")){ if(safeConfirm("커리어(보유자금·경매 기록)를 1억 5천으로 되돌릴까요? 레벨·도감·업적은 남아요.")){ delete arenaRec().career; if(typeof save==="function") save(); renderArena(); } return; }
  if(!K || arenaTab !== "king") return;
  if(e.target.closest("[data-kintro]")){ K.intro = false; kcSfx("paper"); renderArena(); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-kreveal]")){ K.revealing = false; clearTimeout(K._revT); K._revT = null; renderArena(); return; }
  if((b = e.target.closest("[data-kshare]"))){ kcCopy(kcShareText(), b); return; }
  if(e.target.closest("[data-koffer]") || e.target.closest("[data-krep]")) kcSfx("coin");
});
