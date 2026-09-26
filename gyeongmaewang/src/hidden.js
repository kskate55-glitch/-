/* ================= 🎲 숨겨진 놀이 6종 (v219) =================
   본편은 현실적인 경매 시뮬레이션 그대로 두고, 아주 가끔 황당하고 귀여운 미니게임이 튀어나온다.
   원칙
   - 필수가 아니다. 실패해도 원래보다 불리해지지 않는다. SKIP 가능.
   - 한 사건에서 한 번만. 어떤 놀이가 숨어 있는지는 사건 시드로 정한 별도 난수로 정한다(게임 난수 K.r 순서는 그대로).
   - 보상은 의도적으로 파격적이다. 다만 법적 권리·채무·명도절차가 마법처럼 사라지는 게 아니라
     '점유자가 스스로 양보했다 / 우연히 좋은 사람을 만났다'로만 설명한다.
   - 첫 발견 전에는 메뉴에 도감조차 없다. 기록은 kRec().hx 에 저장(옛 저장파일은 기본값 자동 생성). */
const HX_GAMES = [
  {id:"omok",   ic:"⚫", name:"五目勝負",       sub:"명도 오목"},
  {id:"pk",     ic:"⚽", name:"명도 승부차기",   sub:"페널티킥 다섯 개"},
  {id:"truck",  ic:"🚚", name:"이삿짐 테트리스", sub:"트럭에 한 번에"},
  {id:"detect", ic:"🔦", name:"하자 탐정",       sub:"벽지가 말해 준다"},
  {id:"devil",  ic:"😈", name:"500만원의 유혹",  sub:"입찰 악마"},
  {id:"vend",   ic:"🥤", name:"수상한 법원 자판기", sub:"두 개가 나오는 날"}];
const HX_ACH = {
  omok:["⚫","오목으로 시작된 합의","점유자와 오목을 두고 이겼다"],
  pk:["⚽","골 넣고 집 비우기","승부차기로 이사 날짜를 정했다"],
  truck:["🚚","마지막까지 사람 사는 일","이삿짐을 한 번에 전부 실었다"],
  detect:["🔦","벽지가 말해주고 있었다","숨은 하자를 모두 찾았다"],
  devil:["🛡️","500만원도 돈이다","악마의 속삭임에도 처음 정한 가격 그대로"],
  vend:["🥤","두 개가 나오는 날","법원 자판기는 가끔 실수를 한다."],
  all6:["🎲","경매하러 온 거 맞죠?","숨겨진 놀이 6개를 모두 찾았다"],
  allp:["👑","경매왕은 못하는 게 없다","숨겨진 놀이 6개 모두 PERFECT"]};
const HX_VEND_JACKPOT = 0.035;   // 화면에 공개하지 않는다
/* ---------- 기록 ---------- */
function hxRec(){
  const R = kRec(); if(!R.hx || typeof R.hx !== "object") R.hx = {};
  if(!R.hx.g) R.hx.g = {}; if(!R.hx.ach) R.hx.ach = {};
  HX_GAMES.forEach(g => { const x = R.hx.g[g.id] = R.hx.g[g.id] || {}; ["found","win","perfect"].forEach(k => { x[k] = !!x[k]; }); x.plays = +x.plays || 0; });
  return R.hx;
}
function hxSave(){ try{ if(typeof save === "function") save(); }catch(e){} }
function hxFoundN(){ const H = hxRec(); return HX_GAMES.filter(g => H.g[g.id].found).length; }
function hxAch(id){
  const H = hxRec(); if(H.ach[id]) return; H.ach[id] = Date.now(); hxSave();
  const a = HX_ACH[id]; hxToast(`${a[0]} 숨은 업적 — 「${a[1]}」`, a[2]);
  if(id !== "all6" && id !== "allp"){
    if(HX_GAMES.every(g => H.g[g.id].found)) setTimeout(() => hxAch("all6"), 1800);
    if(HX_GAMES.every(g => H.g[g.id].perfect)) setTimeout(() => hxAch("allp"), 3600);
  }
}
function hxDiscover(id){
  const H = hxRec(), x = H.g[id], first = !hxFoundN();
  if(!x.found){ x.found = true; hxSave(); setTimeout(() => hxToast(first ? "🎲 메뉴에 새 항목이 생겼다 — 숨겨진 놀이 1 / 6" : `🎲 숨겨진 놀이 ${hxFoundN()} / 6`, "", "quiet"), 400); }
  if(HX_GAMES.every(g => H.g[g.id].found)) setTimeout(() => hxAch("all6"), 2500);
}
function hxResult(id, grade){          // grade: perfect / good / fail / skip
  const x = hxRec().g[id]; if(grade !== "skip") x.plays++;
  if(grade === "perfect" || grade === "good") x.win = true;
  if(grade === "perfect") x.perfect = true;
  hxSave();
}
/* ---------- 이 사건에 무엇이 숨어 있나 (사건 시드 · 별도 난수) ---------- */
function hxR(salt){ return kRng((((K && K.seed) || 7) * 2654435761 ^ salt) >>> 0); }
function hxPlan(){
  if(!K) return null;
  if(K.hx && K.hx.seed === K.seed) return K.hx;
  const P = KP && KP.occ && typeof personaById === "function" ? personaById(KP.occ.pid) : null, t = P ? P.type : "";
  const r = hxR(0x41D3), stars = (KP && KP.stars) || 1, gen = !!(KP && KP.gen);
  const arm = {};
  if(gen && ["senior","greedy","ghost","lien","care"].includes(t) && r() < 0.42) arm.omok = true;
  else if(gen && ["coop","poor","short","angry","bully"].includes(t) && r() < 0.36) arm.pk = true;
  if(gen && r() < 0.22) arm.truck = true;
  if(gen && stars >= 2 && KP.hidden.some(h => h.k === "defect") && r() < 0.2) arm.detect = true;
  if(r() < 0.15) arm.devil = true;
  // 한 사건에 너무 많이 몰리지 않게 — 최대 둘(자판기는 늘 그 자리에 있다)
  const keys = Object.keys(arm); while(keys.length > 2){ delete arm[keys.splice(Math.floor(r() * keys.length), 1)[0]]; }
  K.hx = {seed:K.seed, arm, done:{}, t};
  return K.hx;
}
function hxArmed(id){ const X = hxPlan(); return !!(X && X.arm[id] && !X.done[id]); }
if(typeof kStart === "function"){ const _hx_kStart = kStart; kStart = function(){ const o = _hx_kStart.apply(this, arguments); try{ if(K) K.hx = null; hxPlan(); }catch(e){} return o; }; }
/* ---------- 오버레이 공통 ---------- */
let HX = null;
function hxSfx(k){ try{ if(typeof kcSfx === "function") kcSfx(k); }catch(e){} }
function hxOpen(id, title, sub, bodyFn){
  hxClose(true);
  const el = document.createElement("div"); el.id = "hxRoot"; el.className = "hx-root hx-dark"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", title);
  el.innerHTML = `<div class="hx-title"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
  document.body.appendChild(el); hxSfx("thud");
  HX = {id, el, timers:[]};
  HX.timers.push(setTimeout(() => { if(!HX || HX.el !== el) return; el.classList.remove("hx-dark"); el.innerHTML = `<div class="hx-box"><div class="hx-top"><b>${title}</b><button type="button" class="hx-skip" data-hxskip>SKIP ▶</button></div><div class="hx-body"></div></div>`; bodyFn(el.querySelector(".hx-body")); }, 1300));
}
function hxClose(silent){
  if(!HX) return; HX.timers.forEach(clearTimeout); if(HX.stop) try{ HX.stop(); }catch(e){}
  HX.el.remove(); HX = null; if(!silent){ try{ renderArena(); }catch(e){} }
}
function hxEnd(grade, lines, after){
  if(!HX) return; const id = HX.id; if(HX.stop) try{ HX.stop(); }catch(e){} HX.stop = null;
  if(K && K.hx) K.hx.done[id] = true;
  hxResult(id, grade);
  const body = HX.el.querySelector(".hx-body"), big = grade === "perfect" ? `<div class="hx-big perfect">PERFECT!<small>대성공!</small></div>` : grade === "good" ? `<div class="hx-big good">GOOD!</div>` : grade === "fail" ? `<div class="hx-big fail">…</div>` : "";
  if(grade === "perfect"){ HX.el.classList.add("hx-flash"); hxSfx("fanfare"); } else if(grade === "good") hxSfx("coin");
  body.innerHTML = `${big}<div class="hx-lines">${(lines || []).map(l => Array.isArray(l) ? `<p><b>${l[0]}</b> “${l[1]}”</p>` : `<p class="n">${l}</p>`).join("")}</div><button type="button" class="btn primary hx-ok" data-hxok>계속하기</button>`;
  HX.after = after;
}
document.addEventListener("click", e => {
  if(!HX) return;
  if(e.target.closest("[data-hxskip]")){ e.preventDefault(); const id = HX.id, a = HX.onSkip; if(K && K.hx) K.hx.done[id] = true; hxResult(id, "skip"); hxClose(true); if(a) a(); try{ renderArena(); }catch(_){} return; }
  if(e.target.closest("[data-hxok]")){ e.preventDefault(); const a = HX.after; hxClose(true); if(a) a(); try{ renderArena(); }catch(_){} hxSave(); }
}, true);
function hxToast(t, s, kind){
  const d = document.createElement("div"); d.className = "hx-toast" + (kind ? " " + kind : ""); d.innerHTML = `<b>${t}</b>${s ? `<small>${s}</small>` : ""}`;
  const live = [...document.querySelectorAll(".hx-toast:not(.out)")]; d.style.top = (16 + live.reduce((a, x) => a + x.offsetHeight + 8, 0)) + "px";
  document.body.appendChild(d); setTimeout(() => d.classList.add("out"), 3600); setTimeout(() => d.remove(), 4300);
}
/* ---------- 대화 한 토막(선택지 하나) ---------- */
function hxTalk(lines, choice, go){
  const el = document.createElement("div"); el.id = "hxTalk"; el.className = "hx-talk";
  el.innerHTML = `<div class="hx-talk-box">${lines.map(([w, t]) => `<p><b>${w}</b> “${t}”</p>`).join("")}<div class="hx-talk-acts"><button type="button" class="btn primary" data-hxyes>${choice}</button><button type="button" class="btn" data-hxno>다음에요</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener("click", e => { if(e.target.closest("[data-hxyes]")){ el.remove(); go(); } else if(e.target.closest("[data-hxno]")){ el.remove(); } });
}
function hxOccName(){ return (KP && KP.occ && KP.occ.name) || "점유자"; }
/* ============ 1. 명도 오목 ============ */
function hxOmok(){
  hxDiscover("omok");
  hxTalk([[hxOccName(), "바둑 둘 줄 압니까?"], ["나", "아뇨."], [hxOccName(), "오목은?"]], "그건 좀 합니다.", () => {
    hxTalk([[hxOccName(), "그럼 한 판 합시다."]], "…네.", () => hxOpen("omok", "五目勝負", "흑 = 나 · 백 = " + hxOccName(), body => {
      const N = 9, B = Array(N * N).fill(0); let over = false;
      body.innerHTML = `<p class="hx-hint">다섯 개를 먼저 한 줄로 놓으면 이긴다. 가로·세로·대각선.</p><div class="hx-omok" style="--n:${N}">${B.map((_, i) => `<button type="button" class="hx-pt" data-hxpt="${i}" aria-label="${Math.floor(i / N) + 1}행 ${i % N + 1}열"></button>`).join("")}</div>`;
      const cells = [...body.querySelectorAll(".hx-pt")];
      const line = (i, who) => { const x = i % N, y = Math.floor(i / N); for(const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]){ let c = 1; for(const s of [1, -1]){ let a = x + dx * s, b = y + dy * s; while(a >= 0 && a < N && b >= 0 && b < N && B[b * N + a] === who){ c++; a += dx * s; b += dy * s; } } if(c >= 5) return true; } return false; };
      const put = (i, who) => { B[i] = who; cells[i].classList.add(who === 1 ? "b" : "w"); cells[i].disabled = true; };
      const score = (i, who) => { const x = i % N, y = Math.floor(i / N); let s = 0; for(const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]){ let c = 0; for(const sg of [1, -1]){ let a = x + dx * sg, b = y + dy * sg; while(a >= 0 && a < N && b >= 0 && b < N && B[b * N + a] === who){ c++; a += dx * sg; b += dy * sg; } } s += c * c; } return s; };
      const ai = () => {
        const empty = B.map((v, i) => v ? -1 : i).filter(i => i >= 0); if(!empty.length) return -1;
        for(const i of empty){ B[i] = 2; const w = line(i, 2); B[i] = 0; if(w) return i; }     // 이길 수 있으면 둔다
        for(const i of empty){ B[i] = 1; const w = line(i, 1); B[i] = 0; if(w) return i; }     // 내가 다음 수에 이기면 막는다
        let best = empty[0], bs = -1;
        for(const i of empty){ const s = score(i, 2) * 1.0 + score(i, 1) * 0.8 + Math.random() * 1.6 - Math.abs(i % N - 4) * 0.05 - Math.abs(Math.floor(i / N) - 4) * 0.05; if(s > bs){ bs = s; best = i; } }
        return best;
      };
      put(4 * N + 4 + 1, 2);                                      // 점유자가 먼저 한 점
      body.addEventListener("click", e => {
        const b = e.target.closest("[data-hxpt]"); if(!b || over || b.disabled) return;
        const i = +b.dataset.hxpt; put(i, 1); hxSfx("tick");
        if(line(i, 1)){ over = true; return setTimeout(() => hxOmokWin(), 500); }
        const j = ai(); if(j < 0){ over = true; return setTimeout(() => hxOmokLose(true), 500); }
        setTimeout(() => { put(j, 2); if(line(j, 2)){ over = true; setTimeout(() => hxOmokLose(false), 700); } }, 260);
      });
    }));
  });
}
function hxOmokWin(){
  const o = K.occ, need = typeof kfOccNeed === "function" ? kfOccNeed() : 100, amt = Math.max(0, Math.round(need * 0.35 / 10) * 10);
  hxEnd("perfect", [`${hxOccName()}이(가) 한참 오목판을 바라본다.`, [hxOccName(), "……졌네."], [hxOccName(), "약속은 약속이지. 사흘 뒤에 나갈게요. 이사비는 " + (amt ? `${kMan(amt)}만 주면 돼요.` : "됐고요.")], `특별 합의 — 3일 뒤 이사 · 이사비 ${kMan(amt)} (원래 요구 ${kMan(need)}) · 합의서 작성`], () => {
    o.coop = 100; o.resist = 0; o.paper = true; o.agreed = {amt, day:K.day + 3}; K.offering = false;
    kLog(`⚫ 오목 한 판 끝에 ${hxOccName()}이(가) 스스로 양보했다 — 3일 뒤 이사, 이사비 ${kMan(amt)}. 합의서를 썼다.`);
    hxAch("omok");
  });
}
function hxOmokLose(draw){
  hxEnd("fail", [[hxOccName(), draw ? "무승부네. 재밌었어요." : "경매는 잘하는데 오목은 영 아니네."], "분위기가 조금 풀렸다. (협조도 소폭 ↑)"], () => { K.occ.coop += 6; kClampOcc && kClampOcc(); });
}
/* ============ 2. 명도 승부차기 ============ */
function hxPk(){
  hxDiscover("pk");
  hxTalk([[hxOccName(), "근데 사장님 축구 좀 합니까?"], ["나", "……갑자기요?"], [hxOccName(), "페널티킥 다섯 개. 나보다 많이 넣으면 오늘 이사 날짜 정합시다."]], "하시죠.", () => hxOpen("pk", "⚽ 명도 승부차기", "골키퍼 — " + hxOccName(), body => {
    const occGoals = 2 + Math.floor(Math.random() * 2);   // 점유자는 이미 차 두었다
    let shot = 0, goals = 0, busy = false;
    const draw = () => { body.innerHTML = `<p class="hx-hint">${hxOccName()}: ${occGoals}골 · 나: ${goals}골 <small>(${shot}/5)</small> — 골대 안 원하는 곳을 누르세요.</p>
      <div class="hx-goal"><div class="hx-keeper" style="left:${HX.kx || 50}%">🧤</div>${[0,1,2,3,4,5].map(z => `<button type="button" class="hx-zone" data-hxz="${z}" aria-label="${["왼쪽 위","가운데 위","오른쪽 위","왼쪽 아래","가운데 아래","오른쪽 아래"][z]}"></button>`).join("")}${HX.ball != null ? `<span class="hx-ball" style="left:${HX.ball[0]}%;top:${HX.ball[1]}%">⚽</span>` : ""}</div><p class="hx-pkmsg">${HX.msg || "&nbsp;"}</p>`; };
    HX.kx = 50; draw();
    body.addEventListener("click", e => {
      const z = e.target.closest("[data-hxz]"); if(!z || busy || shot >= 5) return; busy = true;
      const zi = +z.dataset.hxz, col = zi % 3, row = Math.floor(zi / 3), dive = Math.floor(Math.random() * 3);
      const wide = (col !== 1 && row === 0 && Math.random() < 0.12), saved = !wide && dive === col && Math.random() < (row === 0 ? 0.55 : 0.8);
      shot++; HX.kx = [18, 50, 82][dive]; HX.ball = [[18, 50, 82][col], row ? 68 : 26];
      if(!wide && !saved){ goals++; HX.msg = "⚽ 골!"; hxSfx("coin"); } else { HX.msg = wide ? "……하늘로 떴다." : "🧤 막혔다!"; hxSfx("thud"); }
      draw();
      setTimeout(() => { HX.ball = null; HX.kx = 50; busy = false; if(shot >= 5) return hxPkEnd(goals, occGoals); draw(); }, 750);
    });
  }));
}
function hxPkEnd(g, og){
  const o = K.occ, need = typeof kfOccNeed === "function" ? kfOccNeed() : 100;
  if(g > og){
    const perfect = g >= 5, amt = Math.round(need * (perfect ? 0.2 : 0.5) / 10) * 10, tale = KP.tale && KP.tale[0] ? [].concat(KP.tale[0]).map(x => Array.isArray(x) ? x[1] : x).filter(Boolean)[0] : null;
    hxEnd(perfect ? "perfect" : "good", [[hxOccName(), "졌네요. 말했으니까 지켜야죠."], tale ? `(한숨 돌리고 털어놓은 사정) ${tale}` : "그제야 속사정을 털어놓았다.", perfect ? [hxOccName(), "됐습니다. 이사비도 원래 얘기했던 것보다 훨씬 적게 주세요."] : [hxOccName(), "이사비는 반만 주세요. 이틀 뒤에 나갈게요."], `이사일 확정 — 2일 뒤 · 이사비 ${kMan(amt)} (원래 요구 ${kMan(need)})`], () => {
      o.coop = 100; o.resist = 0; o.agreed = {amt, day:K.day + 2}; o.paper = true; K.offering = false; o.heard = Math.max(o.heard || 0, 1);
      kLog(`⚽ 승부차기 ${g}:${og} — ${hxOccName()}이(가) 스스로 이사 날짜와 이사비를 양보했다(합의서 작성).`); hxAch("pk");
    });
  } else hxEnd("fail", [[hxOccName(), g === og ? "비겼네요. 그럼 얘기로 합시다." : "사장님, 공은 발로 차는 거예요."], "웃음이 한 번 났다. 협상은 원래대로."], () => { o.coop += 4; kClampOcc && kClampOcc(); });
}
/* ============ 3. 이삿짐 테트리스 ============ */
const HX_TRUCK = {w:5, h:4, pcs:[["🗄️","장롱",2,2],["🛏️","침대",2,2],["🛋️","소파",3,1],["🧊","냉장고",1,2],["🪑","책상",2,1],["📦","박스",1,1],["📦","박스",1,1],["📦","박스",1,1],["💺","의자",1,1],["🪴","화분",1,1]]};
function hxTruck(){
  hxDiscover("truck");
  hxTalk([[hxOccName(), "아이고…… 이걸 언제 다 싣나."]], "제가 좀 도와드릴게요.", () => hxOpen("truck", "🚚 이삿짐 테트리스", "60초 · 트럭 한 대에 전부", body => {
    const W = HX_TRUCK.w, Hh = HX_TRUCK.h, grid = Array(W * Hh).fill(-1), pcs = HX_TRUCK.pcs.map((p, i) => ({i, ic:p[0], n:p[1], w:p[2], h:p[3], at:null}));
    let sel = null, left = 60;
    const fits = (p, x, y, w, h) => { if(x < 0 || y < 0 || x + w > W || y + h > Hh) return false; for(let a = 0; a < w; a++) for(let b = 0; b < h; b++){ const v = grid[(y + b) * W + x + a]; if(v !== -1 && v !== p.i) return false; } return true; };
    const lift = p => { grid.forEach((v, k) => { if(v === p.i) grid[k] = -1; }); p.at = null; };
    const place = (p, x, y) => { for(let a = 0; a < p.w; a++) for(let b = 0; b < p.h; b++) grid[(y + b) * W + x + a] = p.i; p.at = [x, y]; };
    const filled = () => grid.filter(v => v >= 0).length;
    const draw = () => {
      body.innerHTML = `<p class="hx-hint">짐을 고른 뒤 트럭 칸을 누르면 그 칸이 짐의 왼쪽 위가 된다. 🔄로 돌리기 · 실은 짐을 누르면 다시 내린다. <b class="hx-time">⏱ ${left}초</b></p>
        <div class="hx-truck" style="--w:${W};--h:${Hh}">${grid.map((v, k) => `<button type="button" class="hx-cell${v >= 0 ? " on" : ""}" data-hxc="${k}">${v >= 0 && pcs[v].at && pcs[v].at[0] + pcs[v].at[1] * W === k ? pcs[v].ic : ""}</button>`).join("")}</div>
        <div class="hx-pcs">${pcs.map(p => `<button type="button" class="hx-pc${p.at ? " used" : ""}${sel === p ? " sel" : ""}" data-hxp="${p.i}" ${p.at ? "disabled" : ""}>${p.ic} ${p.n} <small>${p.w}×${p.h}</small></button>`).join("")}<button type="button" class="hx-pc rot" data-hxrot ${sel ? "" : "disabled"}>🔄 돌리기</button><button type="button" class="hx-pc done" data-hxdone>다 실었어요</button></div>`;
    };
    const finish = () => { const f = filled(), all = pcs.every(p => p.at); hxTruckEnd(all ? "perfect" : f >= W * Hh * 0.75 ? "good" : "fail"); };
    draw();
    const iv = setInterval(() => { left--; const t = body.querySelector(".hx-time"); if(t) t.textContent = `⏱ ${left}초`; if(left <= 0){ clearInterval(iv); finish(); } }, 1000); HX.stop = () => clearInterval(iv);
    body.addEventListener("click", e => {
      let b;
      if((b = e.target.closest("[data-hxp]"))){ sel = pcs[+b.dataset.hxp]; return draw(); }
      if(e.target.closest("[data-hxrot]") && sel){ [sel.w, sel.h] = [sel.h, sel.w]; return draw(); }
      if(e.target.closest("[data-hxdone]")){ clearInterval(iv); return finish(); }
      if((b = e.target.closest("[data-hxc]"))){
        const k = +b.dataset.hxc, x = k % W, y = Math.floor(k / W);
        if(grid[k] >= 0 && !sel){ lift(pcs[grid[k]]); return draw(); }
        if(sel && fits(sel, x, y, sel.w, sel.h)){ place(sel, x, y); sel = null; hxSfx("thud"); if(pcs.every(p => p.at)){ clearInterval(iv); draw(); return setTimeout(finish, 400); } return draw(); }
        if(grid[k] >= 0){ lift(pcs[grid[k]]); return draw(); }
      }
    });
  }));
}
function hxTruckEnd(grade){
  const amt = (K.hxTruckPaid || 0);
  if(grade === "perfect") hxEnd("perfect", ["「한 번에 전부 실었습니다」", `${hxOccName()}이(가) 잠시 바라본다.`, [hxOccName(), "……사장님."], ["나", "네?"], [hxOccName(), "이사비 얘기했던 거 있잖아요."], ["나", "네."], [hxOccName(), "됐어요. 안 받을게요. 오늘 이렇게까지 도와줬는데 뭘."], `이사비 ${kMan(amt)} — 점유자가 스스로 돌려줬다.`], () => { K.cost.move = Math.max(0, K.cost.move - amt); kLog(`🚚 이삿짐을 한 번에 실어 줬더니 ${hxOccName()}이(가) 이사비 ${kMan(amt)}을(를) 돌려줬다. "오늘 이렇게까지 도와줬는데 뭘."`); hxAch("truck"); });
  else if(grade === "good"){ const back = Math.round(amt * 0.5 / 10) * 10; hxEnd("good", [[hxOccName(), "덕분에 금방 끝났네요. 반은 도로 가져가세요."], `이사비 ${kMan(back)} 돌려받음`], () => { K.cost.move = Math.max(0, K.cost.move - back); kLog(`🚚 이삿짐을 거들었더니 ${hxOccName()}이(가) 이사비 절반(${kMan(back)})을 돌려줬다.`); }); }
  else hxEnd("fail", [[hxOccName(), "……그냥 제가 할게요."], ["나", "죄송합니다."], "합의한 조건 그대로 진행한다."]);
}
/* ============ 4. 하자 탐정 ============ */
const HX_SPOTS = [["천장 누수 흔적", 30, 9], ["벽 모서리 곰팡이", 7, 40], ["샷시 결로", 71, 34], ["벽 균열", 50, 44], ["들뜬 바닥", 38, 86], ["보일러 주변 물자국", 88, 70]];
function hxDetect(){
  hxDiscover("detect");
  hxOpen("detect", "🔦 하자 탐정", "25초 · 이상한 곳을 누르세요", body => {
    const hit = {}; let left = 25, miss = 0;
    body.innerHTML = `<p class="hx-hint">빈집에 들어섰다. 벽지·천장·바닥이 뭔가 말하고 있다. <b class="hx-time">⏱ 25초</b> · 찾음 <b class="hx-cnt">0</b>/${HX_SPOTS.length}</p>
      <div class="hx-room" data-hxroom><div class="hx-win"></div><div class="hx-door"></div><div class="hx-boiler">보일러</div><div class="hx-floor"></div>${HX_SPOTS.map((s, i) => `<i class="hx-flaw f${i}" style="left:${s[1]}%;top:${s[2]}%"></i>`).join("")}<div class="hx-frame"></div><div class="hx-plant">🪴</div></div><p class="hx-found"></p>`;
    const room = body.querySelector("[data-hxroom]"), cnt = body.querySelector(".hx-cnt"), fl = body.querySelector(".hx-found");
    const done = () => { clearInterval(iv); const n = Object.keys(hit).length; hxDetectEnd(n >= HX_SPOTS.length ? "perfect" : n >= 3 ? "good" : "fail", n); };
    const iv = setInterval(() => { left--; const t = body.querySelector(".hx-time"); if(t) t.textContent = `⏱ ${left}초`; if(left <= 0) done(); }, 1000); HX.stop = () => clearInterval(iv);
    room.addEventListener("click", e => {
      const r = room.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
      const i = HX_SPOTS.findIndex((s, k) => !hit[k] && Math.hypot((s[1] - x) * r.width / 100, (s[2] - y) * r.height / 100) < Math.max(26, r.width * 0.07));
      if(i < 0){ miss++; room.classList.remove("miss"); void room.offsetWidth; room.classList.add("miss"); return; }
      hit[i] = true; room.querySelector(".f" + i).classList.add("got"); cnt.textContent = Object.keys(hit).length; fl.textContent = "🔎 " + HX_SPOTS.filter((_, k) => hit[k]).map(s => s[0]).join(" · "); hxSfx("coin");
      if(Object.keys(hit).length >= HX_SPOTS.length) setTimeout(done, 350);
    });
  });
}
function hxDetectEnd(grade, n){
  const defs = KP.hidden.filter(h => h.k === "defect"), unknown = defs.filter(h => !K.found[h.id]);
  const sum = defs.reduce((a, h) => a + (h.cost || 0), 0);
  if(grade === "perfect") hxEnd("perfect", ["「숨겨진 하자를 모두 발견했습니다」", `이 집에서 드러날 하자를 전부 잡았다 — ${defs.map(h => h.t).join(" · ")}`, `예상 수리비 약 ${kMan(sum)} — 입찰가에서 미리 빼 두면 된다.`], () => { defs.forEach(h => { K.found[h.id] = true; }); K.hxRepairSeen = sum; kLog(`🔦 하자 탐정 PERFECT — ${defs.map(h => h.t).join(", ")}. 예상 수리비 약 ${kMan(sum)}.`); hxAch("detect"); });
  else if(grade === "good"){ const one = unknown[0] || defs[0]; hxEnd("good", [`${n}곳을 찾았다. 그중 제일 수상한 곳 — ${one ? one.t : "벽지 들뜸"}.`, one ? `수리비 약 ${kMan(one.cost || 0)} 예상` : ""], () => { if(one){ K.found[one.id] = true; kLog(`🔦 하자 탐정 — ${one.t} 발견(수리비 약 ${kMan(one.cost || 0)}).`); } }); }
  else hxEnd("fail", [`${n}곳밖에 못 찾았다. 원래 조사 결과대로 간다.`]);
}
/* ============ 5. 입찰 악마 ============ */
function hxDevil(go){
  hxDiscover("devil");
  hxOpen("devil", "😈 500만원의 유혹", "제출 직전", body => {
    body.innerHTML = `<div class="hx-dv"><p><b>😈 악마</b> “500만 더 쓰자.”</p><p><b>😇 천사</b> “집에 가.”</p><p><b>😈 악마</b> “여기까지 왔는데 500이 돈이냐?”</p><p><b>😇 천사</b> “500만원은 돈이다.”</p></div>
      <p class="hx-hint">가운데 초록 칸이 <b>처음 정한 내 원칙 가격</b>이다. 바늘이 거기 왔을 때 STOP.</p>
      <div class="hx-gauge"><i class="zone"></i><i class="core"></i><b class="needle"></b></div><button type="button" class="btn primary hx-stop" data-hxstop>✋ STOP</button>`;
    const nd = body.querySelector(".needle"); let t0 = performance.now(), pos = 0, raf = 0, done = false;
    const tick = t => { pos = 50 + 48 * Math.sin((t - t0) / 1000 * 2 * Math.PI * 0.85); nd.style.left = pos + "%"; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); HX.stop = () => cancelAnimationFrame(raf); HX.onSkip = go;
    body.querySelector("[data-hxstop]").addEventListener("click", () => {
      if(done) return; done = true; cancelAnimationFrame(raf); const d = Math.abs(pos - 50);
      const g = d <= 3 ? "perfect" : d <= 12 ? "good" : "fail";
      if(g === "perfect") hxEnd("perfect", ["「강철멘탈」", ["나", "처음 정한 가격 그대로 간다."], "마음이 가벼워졌다. (스트레스 크게 ↓)"], () => { K.hxSteel = true; if(typeof lfOn === "function" && lfOn()) lfStress(-20); hxAch("devil"); go(); });
      else if(g === "good") hxEnd("good", [["나", "……아니, 원래 가격."], "악마가 투덜대며 사라졌다. (스트레스 ↓)"], () => { if(typeof lfOn === "function" && lfOn()) lfStress(-8); go(); });
      else hxEnd("fail", [["😈 악마", "아쉽네."], "입찰가는 봉투에 적어 둔 그대로다. 최종 확인은 내가 한다."], go);
    });
  });
}
window.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-kbid]"); if(!b || !K || !K.sealed || HX || K.hxDevilPass) return;
  if(!hxArmed("devil")) return;
  e.preventDefault(); e.stopImmediatePropagation();
  hxDevil(() => { K.hxDevilPass = true; setTimeout(() => { const nb = document.querySelector("[data-kbid]"); if(nb) nb.click(); }, 60); });
}, true);
/* ============ 6. 수상한 법원 자판기 ============ */
function hxVend(){
  hxDiscover("vend");
  hxOpen("vend", "법원 자판기", "", body => {
    body.innerHTML = `<div class="hx-vm"><button type="button" class="hx-can" data-hxcan="밀크커피">☕<b>밀크커피</b><small>500원</small></button><button type="button" class="hx-can" data-hxcan="캔커피">🥫<b>캔커피</b><small>800원</small></button><button type="button" class="hx-can" data-hxcan="율무차">🍵<b>율무차</b><small>500원</small></button></div><p class="hx-vmsg"></p>`;
    body.addEventListener("click", e => {
      const c = e.target.closest("[data-hxcan]"); if(!c || K.hxVended) return; K.hxVended = true;
      const lucky = hxR(0x7E4D)() < HX_VEND_JACKPOT, m = body.querySelector(".hx-vmsg"); hxSfx("coin");
      m.textContent = "「덜컹.」";
      setTimeout(() => {
        if(lucky){ hxSfx("thud"); m.innerHTML = "「덜컹.」<br>「덜컹.」<br>……두 개가 나왔다."; setTimeout(() => hxEnd("perfect", [`${c.dataset.hxcan} 두 개. 하나는 옆자리 사람에게 건넸다.`]), 1300); K.vendingLuck = true; K.hxVendEvt = null; }
        else { const warm = Math.random() < 0.7; hxEnd("good", [warm ? "따뜻하다." : "……그냥 캔이다."]); if(warm && typeof lfOn === "function" && lfOn()) lfStress(-2); }
      }, 900);
    });
  });
}
/* 자판기 행운 — 효과는 말하지 않는다. 사건 후반 알맞은 때 한 번 터진다 */
function hxLuckFire(kind){
  if(!K || !K.vendingLuck || K.hxVendEvt) return false;
  K.hxVendEvt = kind; const H = hxRec();
  setTimeout(() => { hxAch("vend"); }, 2600);
  return true;
}
/* 명도 시작 — C. 기적의 명도 */
function hxLuckMove(){
  if(!K.vendingLuck || K.hxVendEvt || K.step !== "move" || !K.occ || K.occ.agreed || hxR(0xC0)() > 0.34) return;
  hxLuckFire("C"); const o = K.occ, need = typeof kfOccNeed === "function" ? kfOccNeed() : 100, amt = Math.round(need * 0.3 / 10) * 10;
  o.coop = 100; o.resist = 0; o.paper = true; o.agreed = {amt, day:K.day + 4};
  kSay(`저, 사장님… 제가 먼저 연락드려요. 좋은 방이 갑자기 나와서요. 나흘 뒤에 나갈게요. 이사비는 ${amt ? kMan(amt) + "만 주시면 돼요" : "안 주셔도 돼요"}.`, "normal");
  kLog(`📞 뜻밖의 전화 — 점유자가 먼저 이사 일정을 제안했다(4일 뒤, 이사비 ${kMan(amt)}, 합의서 작성).`);
  hxToast("✨ 숨겨진 기연 발생!", "점유자가 먼저 연락해 왔다");
}
if(typeof kRepair === "function"){
  const _hx_kRepair = kRepair;
  kRepair = function(id){
    const want = K && K.vendingLuck && !K.hxVendEvt && hxR(0xA0)() < 0.5, d0 = K ? K.day : 0, c0 = K ? K.cost.repair : 0;
    const r = _hx_kRepair.apply(this, arguments);
    if(want && K.repair){
      const spent = K.cost.repair - c0, days = K.day - d0, back = Math.round(spent * 0.45 / 10) * 10, dd = Math.floor(days / 2);
      hxLuckFire("A"); K.cost.repair -= back; if(dd){ K.day -= dd; K.cost.hold = Math.max(0, Math.round((K.cost.hold - KP.dailyHold * dd) * 10) / 10); }
      kLog(`🛠️ 중개사가 우연히 소개해 준 '전설의 수리업자' — 공사비 ${kMan(back)} 할인, 공사기간 ${dd}일 단축.`);
      hxToast("✨ 숨겨진 기연 발생!", "전설의 수리업자를 만났다");
    }
    return r;
  };
}
if(typeof kList === "function"){
  const _hx_kList = kList;
  kList = function(price){
    const r = _hx_kList.apply(this, arguments);
    if(K && K.vendingLuck && !K.hxVendEvt && K.sale && !K.sale.done){
      const B = hxR(0xB0)() < 0.55;
      if(B){ hxLuckFire("B"); K.sale.offer = {amt:Math.round(K.sale.list * 0.985 / 10) * 10, buyer:{t:"현금 매수자", flex:0, cancel:0}}; K.sale.note = "💵 매도 시작 첫 주 — 현금 매수자가 나타났다. 호가에 거의 그대로, 잔금도 빨리 치르겠단다."; hxToast("✨ 숨겨진 기연 발생!", "현금 매수자 등장"); }
      else { hxLuckFire("D"); K.sale.offer = {amt:Math.round(Math.min(K.sale.list, K.sale.trueP) / 10) * 10, buyer:{t:"좋은 중개사가 데려온 매수자", flex:0.004, cancel:0}}; K.sale.note = "🤝 뜻밖의 좋은 중개사 — 첫 주 만에 매수 후보를 데려왔다."; hxToast("✨ 숨겨진 기연 발생!", "뜻밖의 좋은 중개사"); }
    }
    return r;
  };
}
/* ---------- 이삿날 — 트럭 앞에서 ---------- */
if(typeof kfMoved === "function"){
  const _hx_kfMoved = kfMoved;
  kfMoved = function(){
    const o = K && K.occ, amt = o && o.agreed ? o.agreed.amt : 0;
    if(o && o.agreed && amt > 0 && hxArmed("truck")) K.hxTruckPaid = amt, K.hxTruckAsk = true;
    return _hx_kfMoved.apply(this, arguments);
  };
}
/* ---------- 화면에 숨은 입구를 심는다 ---------- */
function hxHookHTML(){
  if(!K || K.intro || K.revealing || HX) return "";
  const X = hxPlan(); if(!X) return "";
  if(K.step === "move" && K.occ && !K.occ.agreed && !K.offering && (K.occ.turns || 0) >= 1){
    if(hxArmed("omok")) return `<button type="button" class="hx-odd" data-hxgo="omok">⚫ 방 구석에 먼지 쌓인 바둑판이 보인다. <small>…말을 걸어 볼까?</small></button>`;
    if(hxArmed("pk")) return `<button type="button" class="hx-odd" data-hxgo="pk">⚽ 현관에 흙 묻은 축구화가 놓여 있다. <small>…축구 좋아하세요?</small></button>`;
  }
  if(K.step === "defect" && K.hxTruckAsk && hxArmed("truck")) return `<button type="button" class="hx-odd" data-hxgo="truck">🚚 이삿날 아침 — 트럭 앞에서 ${esc(hxOccName())}이(가) 난감해한다. <small>…도와드릴까?</small></button>`;
  if(K.step === "brief" && !K.sealed && K.loc === "site" && hxArmed("detect")) return `<button type="button" class="hx-odd" data-hxgo="detect">🔦 빈방 벽지 한쪽이 이상하게 들떠 있다. <small>…자세히 볼까?</small></button>`;
  return "";
}
if(typeof kingHTML === "function"){
  const _hx_kingHTML = kingHTML;
  kingHTML = function(){
    let h = _hx_kingHTML.apply(this, arguments);
    try{
      const x = hxHookHTML();
      if(x){ const pref = {move:['<div class="ag-acts'], brief:['<h4 class="kr-grp"'], defect:['<div class="panel']}[K.step] || [];
        let at = -1; for(const a of pref){ at = h.indexOf(a); if(at > 0) break; }
        h = at > 0 ? h.slice(0, at) + x + h.slice(at) : h + x; }
      if(K && (K.step === "won" || K.step === "lost") && K.hxSteel && K.result && K.result.gap <= 100 && !K.hxSteelShown){
        h = h.replace(/(<div class="panel k-bidres (?:lose|win)">)/, `<div class="panel hx-steel"><b>🛡️ 강철멘탈</b> — 처음 정한 가격 그대로 썼고, 2등과 ${kMan(K.result.gap)} 차이였다. ${K.result.win ? "원칙이 이겼다." : "원칙대로 졌다. 후회는 없다."}</div>$1`);
      }
    }catch(e){}
    return h;
  };
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-hxgo]"); if(!b || HX) return;
  e.preventDefault(); e.stopPropagation();
  const id = b.dataset.hxgo, f = {omok:hxOmok, pk:hxPk, truck:hxTruck, detect:hxDetect}[id];
  if(K && K.hx){ if(id === "truck") K.hxTruckAsk = false; }
  if(f){ if(K && K.hx) K.hx.done[id] = true; f(); }
}, true);
/* 법원 자판기 — 표시 없음, 반짝임 없음. 입찰 법정 무대 한쪽에 그냥 서 있다 */
function hxPlaceVend(){
  const st = document.querySelector("#kfsRoot .kfs-stage") || document.querySelector(".vn.k-stage");
  const old = document.getElementById("hxVend");
  const court = K && arenaTab === "king" && (K.sealed || K.revealing || K.step === "won" || K.step === "lost");
  if(!st || !court || (K.hx && K.hx.done.vend)){ if(old) old.remove(); return; }
  // 무대 그림이 너무 작게 줄어든 화면(모바일 입찰표)이면 — 패널 맨 아래 구석에 그냥 서 있다
  const sr = st.getBoundingClientRect(), pn = document.querySelector("#kfsRoot .kfs-panel"), host = (sr.height < 160 || !st.getClientRects().length) && pn ? pn : st;
  if(old && old.parentNode === host) return; if(old) old.remove();
  const v = document.createElement("div"); v.id = "hxVend"; v.className = "hx-vend" + (host === st ? "" : " inpanel"); v.setAttribute("aria-hidden", "true"); v.innerHTML = "<i></i><i></i><i></i><u></u>";
  host.appendChild(v);
}
document.addEventListener("click", e => {
  if(!e.target.closest || !e.target.closest("#hxVend") || HX) return;
  e.preventDefault(); e.stopPropagation(); if(K && K.hx) K.hx.done.vend = true; hxVend();
}, true);
if(typeof renderArena === "function"){
  const _hx_render = renderArena;
  renderArena = function(){ try{ if(K && arenaTab === "king" && K.step === "move") hxLuckMove(); }catch(e){} const r = _hx_render.apply(this, arguments); try{ hxPlaceVend(); hxMenu(); hxFloatOdd(); setTimeout(() => { try{ hxFloatOdd(); hxPlaceVend(); hxMenu(); }catch(_){} }, 60); }catch(e){} return r; };
}
/* 조사 화면처럼 버튼이 도크로 옮겨지고 원래 칸이 가려지는 화면이면 — 숨은 입구를 무대 그림 위 쪽지로 띄운다 */
function hxFloatOdd(){
  const odd = document.querySelector(".hx-odd:not(.hx-onstage)"); if(!odd || odd.getClientRects().length) return;
  const st = document.querySelector("#kfsRoot .kfs-stage"); if(!st || !st.getClientRects().length) return;
  odd.classList.add("hx-onstage"); st.appendChild(odd);
}
/* ---------- 숨겨진 놀이 도감 (처음 발견 전에는 메뉴 자체가 없다) ---------- */
function hxMenu(){
  const m = document.querySelector("#kfsRoot .kfs-menu"); if(!m || m.querySelector("[data-hxdex]")) return;
  const n = hxFoundN(); if(!n) return;
  const b = document.createElement("button"); b.type = "button"; b.dataset.hxdex = "1"; b.textContent = `🎲 숨겨진 놀이 ${n}/6`; m.appendChild(b);
}
function hxDexHTML(){
  const H = hxRec();
  return `<div class="hx-dex"><div class="hx-top"><b>🎲 숨겨진 놀이 ${hxFoundN()} / 6</b><button type="button" class="hx-skip" data-hxdexclose>닫기 ✕</button></div>
    <ul>${HX_GAMES.map(g => { const x = H.g[g.id]; return x.found ? `<li class="on"><span>${g.ic}</span><b>${g.name}</b><small>${g.sub}</small><em>${x.perfect ? "👑 PERFECT" : x.win ? "✓ 승리" : "도전함"} · ${x.plays}회</em></li>` : `<li><span>❔</span><b>? ? ?</b></li>`; }).join("")}</ul>
    ${Object.keys(H.ach).length ? `<div class="hx-achs"><b>숨은 업적</b>${Object.keys(H.ach).map(k => `<span>${HX_ACH[k][0]} ${HX_ACH[k][1]}<small>${HX_ACH[k][2]}</small></span>`).join("")}</div>` : ""}</div>`;
}
document.addEventListener("click", e => {
  if(e.target.closest && e.target.closest("[data-hxdex]")){ e.preventDefault(); e.stopPropagation(); const m = document.querySelector(".kfs-menu"); if(m) m.hidden = true; const d = document.createElement("div"); d.id = "hxDex"; d.className = "hx-talk"; d.innerHTML = hxDexHTML(); document.body.appendChild(d); return; }
  if(e.target.closest && (e.target.closest("[data-hxdexclose]") || e.target.id === "hxDex")){ const d = document.getElementById("hxDex"); if(d) d.remove(); }
}, true);
