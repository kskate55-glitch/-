/* ================= ✅ 베타 완성도 1차 — 정보 등급·출처 · 입찰가 감 · 정보 복기 · 실패 도감 · 결과 공유 카드 =================
   새 시스템을 늘리는 대신, 이미 있는 판(조사→입찰→결과)에 "판단할 거리"와 "돌아볼 거리"를 붙인다. */

/* ---------- 7·8. 조사 파일 카드 — [확정]/[추정]/[미확인] + 출처 ---------- */
const QA_CARD = {docs:["확정","법원 서류 · 매각물건명세서"], elec:["추정","현장 · 계량기함 흔적"], flip:["추정","옆집 주민"], price:["추정","동네 중개사"],
  fee:["확정","관리실 장부"], rivals:["추정","법원 사건 조회수"], inside:["미확인","문을 열어 봐야 안다"], kim:["추정","김사장(전화)"],
  leak:["추정","아래층 주민"], dump:["확정","매물 사이트"], loan:["확정","은행 대출 상담"]};
function qaCardMeta(c){ const m = QA_CARD[c.id] || ["추정", ""]; return c.id === "price" && KP && KP.id === "k2" ? ["추정","박 중개사"] : m; }
function qaTagCards(){
  const cards = typeof keCards === "function" ? keCards() : [];
  document.querySelectorAll(".ke-cards .ke-card").forEach((el, i) => {
    const c = cards[i]; if(!c || el.querySelector(".qa-tier")) return;
    const on = el.classList.contains("on"), [tier, who] = on ? qaCardMeta(c) : ["미확인", ""];
    el.insertAdjacentHTML("afterbegin", `<span class="qa-tier t-${tier}">${tier === "확정" ? "✅" : tier === "추정" ? "🟡" : "❔"} ${tier}</span>`);
    if(on && who) el.insertAdjacentHTML("beforeend", `<small class="qa-who">출처 · ${esc(who)}</small>`);
  });
}

/* ---------- 13·14·15. 입찰표 — 예상 수익 범위(정보가 적으면 넓게) + 보수·균형·공격 구간(정답 가격은 안 알려 준다) ---------- */
function qaBidModel(){
  const band = typeof lfBand === "function" ? lfBand() : {lo:KP.trueMid * 0.9, hi:KP.trueMid * 1.1};
  const known = KP.hidden ? KP.hidden.filter(h => K.found[h.id]).length : 0, unk = KP.hidden ? KP.hidden.length - known : 0;
  const repair = (KP.estRepair || 250) + unk * 90;                   // 모르는 위험이 남을수록 비용 쪽 불확실성이 커진다
  const cost = m => m * 0.06 + 350 + repair;                         // 명도·이자·중개·세금 대략(매도가에 비례하는 몫 + 고정)
  const net = (sale, bid) => sale - cost(sale) - bid * 1.017;
  const zone = (sale, margin) => Math.round((sale - cost(sale) - margin) / 1.017 / 10) * 10;
  const mid = (band.lo + band.hi) / 2;
  return {band, unk, net, z:{safe:zone(band.lo, 800), bal:zone(mid, 700), agg:zone(band.hi, 300)}};
}
function qaBidLine(amt){
  if(!K || !KP || !(amt > 0)) return "";
  const M = qaBidModel(), lo = Math.round(M.net(M.band.lo, amt) / 10) * 10, hi = Math.round(M.net(M.band.hi, amt) / 10) * 10;
  const s = v => (v >= 0 ? "+" : "−") + kMan(Math.abs(v));
  const where = amt <= M.z.safe ? ["safe","보수적 구간"] : amt <= M.z.bal ? ["bal","균형 구간"] : amt <= M.z.agg ? ["agg","공격적 구간"] : ["over","구간 밖 — 남기기 어려운 가격"];
  const pos = x => Math.max(0, Math.min(100, (x - KP.minBid) / Math.max(1, (M.z.agg * 1.08) - KP.minBid) * 100));
  return `<div class="qa-bid"><div class="qa-bid-row"><span>예상 세전 수익</span><b class="${hi < 0 ? "down" : lo < 0 ? "" : "up"}">${s(lo)} ~ ${s(hi)} ?</b></div>
    <div class="qa-zones" aria-hidden="true"><i class="z-safe" style="width:${pos(M.z.safe)}%"></i><i class="z-bal" style="width:${pos(M.z.bal) - pos(M.z.safe)}%"></i><i class="z-agg" style="width:${pos(M.z.agg) - pos(M.z.bal)}%"></i><b style="left:${pos(amt)}%"></b></div>
    <div class="qa-bid-row"><small>지금 가격: <b class="z-t-${where[0]}">${where[1]}</b></small><small class="note">${M.unk ? `모르는 위험 ${M.unk}개 — 범위가 넓어요` : "위험을 다 봐서 범위가 좁아요"}</small></div></div>`;
}
function qaBidRefresh(){ const el = document.getElementById("kBid"), box = document.getElementById("qaBid"); if(el && box) box.innerHTML = qaBidLine(Math.round(+el.value || 0)); }
function qaBidMount(){
  const hg = document.getElementById("kHangul"); if(!hg || document.getElementById("qaBid")) return;
  hg.insertAdjacentHTML("afterend", `<div id="qaBid"></div>`); qaBidRefresh();
}
document.addEventListener("input", e => { if(e.target && e.target.id === "kBid") qaBidRefresh(); });

/* ---------- 8·30. CASE 복기 — 들은 정보 중 무엇이 맞았나 ---------- */
function qaVerdict(c){
  const sale = K.sale && K.sale.price, D = K.defects || [], has = re => D.some(d => re.test(d.t));
  const m = {
    docs:["ok","서류 그대로였어요 — 권리는 서류에서 확정."],
    elec:has(/누전/) ? ["ok","실제로 누전이었어요 — 배선 교체가 필요했어요."] : ["meh","흔적만 있었고 큰 문제는 아니었어요."],
    flip:["ok","약속보다 딸의 말이 더 잘 먹혔어요."],
    price:sale ? ["ok", `골목 시세가 맞았어요 — 실제 매도가 ${kMan(sale)}.`] : ["meh","골목 시세 기준이었어요."],
    fee:["ok","공용 관리비는 실제로 낙찰자 몫이었어요."],
    rivals:K.result ? ["ok", `실제 입찰자 ${K.result.bids.length}명(나 포함).`] : ["meh","분위기만 짐작할 수 있었어요."],
    kim:["bad", sale ? `허풍이었어요 — 1억 7천이 아니라 ${kMan(sale)}에 팔렸어요.` : "허풍이었어요 — 큰길 기준 호가였어요."],
    leak:has(/누수/) ? ["ok","벽 뒤 누수 — 증언이 맞았어요."] : ["meh","이번엔 드러나지 않았어요."],
    dump:["ok","같은 건물 급매가 실제 가격의 기준선이 됐어요."],
    loan:["ok","매수자 대출이 실제로 적게 나왔어요 — 매수자층이 좁았어요."],
    inside:D.length ? ["ok", "문을 열어 보니: " + D.map(d => d.t.replace(/^[^\s]+\s/, "")).slice(0, 2).join(" / ")] : ["meh","별일 없었어요."]};
  return m[c.id] || ["meh",""];
}
function qaReviewHTML(){
  if(!K || !KP || typeof keCards !== "function") return "";
  const cards = keCards(), got = cards.filter(c => keHas(c)), miss = cards.filter(c => !keHas(c) && c.id !== "inside");
  const row = c => { const [v, t] = qaVerdict(c), [tier, who] = qaCardMeta(c); return `<li class="qa-v-${v}"><b>${v === "ok" ? "✅" : v === "bad" ? "❌" : "〰"} ${esc(c.t === "???" ? "문을 열어 보니" : c.t)}</b> <small>${tier} · ${esc(who)}</small><span>${esc(t)}</span></li>`; };
  return `<div class="panel qa-review"><b>📂 CASE 복기 — 들은 정보, 무엇이 맞았나</b>
    <ul>${got.map(row).join("") || `<li class="note">입찰 전에 확인한 정보가 없어요.</li>`}${cards.filter(c => c.id === "inside").map(row).join("")}</ul>
    ${miss.length ? `<div class="qa-miss"><b>🙈 놓친 정보 ${miss.length}개</b><ul>${miss.map(c => `<li>${c.ic} <b>${esc(c.t)}</b> — ${esc(c.d)} <small>(${esc(qaCardMeta(c)[1])})</small></li>`).join("")}</ul></div>` : `<div class="qa-miss good">🔎 숨은 정보를 모두 입찰 전에 찾았어요.</div>`}</div>`;
}

/* ---------- 32. 실패 도감 ---------- */
const QA_FAILS = [
  {id:"overbid", ic:"💸", t:"누구랑 싸운 거지?", d:"2등보다 1,500만원 넘게 써서 낙찰", f:()=>K.result && K.result.win && !K.result.solo && K.result.gap >= 1500},
  {id:"solo_hi", ic:"🫥", t:"혼자 비싸게", d:"단독낙찰인데 최저가보다 15% 넘게 씀", f:()=>K.result && K.result.solo && K.bid >= KP.minBid * 1.15},
  {id:"tenman", ic:"💔", t:"10만원의 비극", d:"10만원 이하 차이로 패찰", f:()=>K.result && !K.result.win && K.result.gap <= 10},
  {id:"timid", ic:"🐢", t:"너무 소심했다", d:"1위보다 1,500만원 넘게 낮게 써서 패찰", f:()=>K.result && !K.result.win && K.result.gap >= 1500},
  {id:"bomb", ic:"💣", t:"문 열고 알았다", d:"입찰 전에 찾을 수 있던 하자를 낙찰 뒤에 발견", f:()=>(K.defects || []).some(d => !d.known && /누전|누수/.test(d.t))},
  {id:"remodel", ic:"🔨", t:"고칠수록 손해", d:"수리비 900만원 이상 쓰고 적자", f:()=>K.final && K.cost.repair >= 900 && K.final.profit < 0},
  {id:"red", ic:"📉", t:"적자 CASE", d:"팔고 나니 손해", f:()=>K.final && K.final.profit < 0},
  {id:"slow", ic:"🐌", t:"안 팔리는 집", d:"매도에 8주 넘게 걸림", f:()=>K.sale && K.sale.done && K.sale.weeks >= 8},
  {id:"forfeit", ic:"🧾", t:"보증금 몰수", d:"잔금을 포기하고 입찰보증금을 날림", f:()=>K.k2 && K.k2.forfeited}];
// ⚠ 도감은 인생(캐릭터)과 무관하게 모은다 — arenaRec().failDex. (c.fails는 원래 '적자 CASE 수' 숫자라 이름이 겹치면 안 된다)
function qaFailRec(){
  const R = arenaRec(), c = kcRec();
  if(!R.failDex) R.failDex = {};
  if(c.fails && typeof c.fails === "object"){ for(const k in c.fails) R.failDex[k] = (R.failDex[k] || 0) + (+c.fails[k] || 0); c.fails = (c.history || []).filter(h => h && h.profit != null && h.profit <= 0).length; }   // v57 저장 복구
  if(!(typeof c.fails === "number" && isFinite(c.fails))) c.fails = 0;
  return R.failDex;
}
function qaFailCheck(){
  if(!K || K._qaFails || !(K.step === "result" || K.step === "lost")) return;
  K._qaFails = [];
  const R = qaFailRec();
  QA_FAILS.forEach(F => { let hit = false; try{ hit = !!F.f(); }catch(e){} if(hit){ R[F.id] = (R[F.id] || 0) + 1; K._qaFails.push(F.id); } });
  if(K._qaFails.length && typeof HUB_TOAST !== "undefined") HUB_TOAST.push({t:`📕 실패 도감 +${K._qaFails.length} — ${K._qaFails.map(id => QA_FAILS.find(x => x.id === id).t).join(" · ")}`});
  if(typeof save === "function") save();
}
function qaFailDexHTML(){
  const R = qaFailRec(), n = QA_FAILS.filter(F => R[F.id]).length;
  return `<div class="panel qa-fails"><b>📕 실패 도감</b> <small class="note">${n} / ${QA_FAILS.length} — 실패도 기록이에요</small>
    <ul>${QA_FAILS.map(F => R[F.id] ? `<li><span>${F.ic}</span><b>${esc(F.t)}</b><small>${esc(F.d)}${R[F.id] > 1 ? ` · ${R[F.id]}번` : ""}</small></li>` : `<li class="off"><span>❔</span><b>???</b><small>아직 겪지 않았어요</small></li>`).join("")}</ul></div>`;
}

/* ---------- 31. 결과 공유 카드 — 이미지로 저장 ---------- */
function qaGrade(){ const G = K.final && K.final.grades; if(!G) return "-"; const v = {S:4, A:3, B:2, C:1}, a = Object.values(G).map(x => v[x] || 1), m = a.reduce((s, x) => s + x, 0) / a.length; return m >= 3.5 ? "S" : m >= 2.75 ? "A" : m >= 2 ? "B" : "C"; }
function qaShareCard(){
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const g = c.getContext("2d");
  const L = typeof lfRec === "function" ? lfRec() : null, C = L ? LF_CHARS.find(x => x.id === L.char) : null;
  const grad = g.createLinearGradient(0, 0, 0, 1350); grad.addColorStop(0, "#141a2a"); grad.addColorStop(1, "#0b0e16"); g.fillStyle = grad; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = "#e8b04a"; g.font = "700 34px sans-serif"; g.fillText("경매왕 · CASE " + String(KP.no || 1).padStart(3, "0"), 80, 110);
  g.fillStyle = "#fff"; g.font = "800 64px sans-serif"; g.fillText(C ? C.name : "나의 경매", 80, 200);
  g.fillStyle = "#b9c0cb"; g.font = "500 34px sans-serif"; g.fillText(KP.title, 80, 255);
  const F = K.final, days = K.day || 0, rows = [["낙찰가", kMan(K.bid)], ["매도가", K.sale && K.sale.price ? kMan(K.sale.price) : "-"], ["보유 기간", days + "일"], ["세전 수익", (F.profit >= 0 ? "+" : "−") + kMan(Math.abs(Math.round(F.profit)))], ["수익률(ROI)", F.rate.toFixed(1) + "%"]];
  rows.forEach(([k, v], i) => { const y = 520 + i * 104; g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(80, y - 70, 920, 92); g.fillStyle = "#b9c0cb"; g.font = "500 36px sans-serif"; g.fillText(k, 110, y); g.fillStyle = i === 3 ? (F.profit >= 0 ? "#63d38b" : "#ff7b6b") : "#fff"; g.font = "800 44px sans-serif"; g.textAlign = "right"; g.fillText(v, 970, y); g.textAlign = "left"; });
  g.fillStyle = "#e8b04a"; g.font = "900 200px sans-serif"; g.textAlign = "right"; g.fillText(qaGrade(), 1000, 1200); g.textAlign = "left";
  g.fillStyle = "#fff"; g.font = "800 44px sans-serif"; g.fillText("“" + (F.style ? F.style[0] : "") + "”", 80, 1100);
  const worst = (K._qaFails || [])[0]; g.fillStyle = "#b9c0cb"; g.font = "500 32px sans-serif";
  g.fillText(worst ? "가장 큰 실수 · " + QA_FAILS.find(x => x.id === worst).t : (F.tips && F.tips.length ? "아쉬운 점 · " + F.tips.length + "개" : "실수 없이 끝냈다"), 80, 1160);
  g.fillStyle = "rgba(255,255,255,.35)"; g.font = "500 26px sans-serif"; g.fillText("게임 속 가상 물건 · 실제 투자 조언 아님", 80, 1280);
  const draw = () => { const img = document.getElementById("qaShareImg"); if(img) img.src = c.toDataURL("image/png"); };
  const u = typeof lfArtUrl === "function" && L ? lfArtUrl(L.char, "select") : null;
  draw();
  if(u){ const im = new Image(); im.onload = () => { const w = 250, h = w * im.height / im.width, bh = 330; g.save(); g.beginPath(); g.roundRect ? g.roundRect(750, 60, w, bh, 24) : g.rect(750, 60, w, bh); g.clip(); g.drawImage(im, 750, 60 - (h - bh) * 0.2, w, h); g.restore(); draw(); }; im.src = u; }
}
function qaShareHTML(){ return K && K.final ? `<div class="panel qa-share"><b>🪪 결과 카드</b> <small class="note">이미지를 길게 누르거나(휴대폰) 오른쪽 클릭(PC)해서 저장·공유하세요</small><img id="qaShareImg" alt="CASE 결과 카드" width="1080" height="1350"></div>` : ""; }

/* ---------- 결과 화면에 붙이기 ---------- */
const _qa_king = kingHTML; kingHTML = function(){
  let h = _qa_king(); if(!K || K.intro) return h;
  if((K.step === "result" || K.step === "lost") && !K.revealing){
    qaFailCheck();
    const add = (K.step === "result" ? qaReviewHTML() + qaShareHTML() : "") + (K._qaFails && K._qaFails.length ? `<div class="panel qa-failnew">📕 실패 도감에 기록됐어요 — ${K._qaFails.map(id => { const F = QA_FAILS.find(x => x.id === id); return `${F.ic} ${esc(F.t)}`; }).join(" · ")}</div>` : "");
    h = h.includes('<div class="panel k-style">') ? h.replace('<div class="panel k-style">', add + '<div class="panel k-style">') : h + add;
  }
  return h;
};
const _qa_render = renderArena; renderArena = function(){ _qa_render(); queueMicrotask(() => { if(typeof stgActive === "function" && stgActive()){ qaTagCards(); qaBidMount(); } if(document.getElementById("qaShareImg")) try{ qaShareCard(); }catch(e){} }); };
// 벽(거점)과 사무실 트로피 벽에 실패 도감
if(typeof lfPanel === "function"){ const _qa_lfp = lfPanel; lfPanel = function(id){ const h = _qa_lfp(id); return id === "wall" ? h + qaFailDexHTML() : h; }; }
