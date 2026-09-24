/* ============ 🏷️ 매도 게임 — 계산기 시나리오(정답지 JSON)로 노는 매도 한 판 ============
   시나리오 모양은 매도가 계산기 73절 export_scenario.py 출력과 같다.
   명도왕 결과(S.arena.last)가 집 상태 → 38절 사다리로 이어진다. */
const SCENARIOS = [typeof SCENARIO_SAMPLE_01!=="undefined" ? SCENARIO_SAMPLE_01 : null].filter(Boolean);
const SG_REPAIR = {"노후>기본":400, "노후>올수리":2500, "기본>올수리":2100};   // 연습용 예시 공사비(만원)
const SG_INTEREST = 100;   // 연습용 예시: 월 대출이자(만원)
const SG_ACTS = [
  {k:"broker", ico:"🏢", t:"부동산 사장님 방문", d:"비교거래와 사장님이 보는 시세, 호가 전략을 듣는다"},
  {k:"visit",  ico:"🚶", t:"임장", d:"집 상태를 보고 ‘손보면 얼마 더 받는지’ 감을 잡는다"},
  {k:"papers", ico:"📄", t:"서류·통계 열람", d:"이 물건 시세가 얼마나 흔들리는지(예상 범위)와 주의 신호"},
  {k:"liq",    ico:"📊", t:"거래량 분석", d:"이 동네 비슷한 평수가 한 달에 몇 건 팔리나"}
];
let SG = null;
const sgEok = n => (n/10000).toFixed(2)+"억";
function sgMult(sc, cond){ return (sc.condition_multiplier||{})[cond] || 1; }
function sgFromMyeongdo(){
  const L = arenaRec().last; if(!L) return null;
  const bad = /exec|messy|reoccupied/.test(L.how||"") || /[CF]/.test(L.grade||"");
  return {cond: bad ? "노후" : "기본", why: bad ? `명도왕 최근 판이 ${L.grade}등급${L.how==="exec"?"(강제집행)":""}으로 끝나 집이 험하게 남았어요` : `명도왕 최근 판을 ${L.grade}등급으로 깔끔하게 끝내 집 상태가 괜찮아요`};
}
function sgStart(i, cond, why){
  const sc = SCENARIOS[i]; if(!sc) return;
  SG = {i, sc, cond, why, ap:3, open:{}, phase:"research", repair:null, ask:null, res:null};
}
function sgSell(){
  const sc = SG.sc, finalCond = SG.repair || SG.cond, m = sgMult(sc, finalCond);
  const T = Math.round(sc.truth.sale_price_man * m);          // 이 상태에서 시장이 실제로 받아 주는 값
  const cost = SG.repair ? SG_REPAIR[SG.cond+">"+SG.repair] : 0;
  const r = SG.ask / T;
  let months, sold, note;
  if(r <= 0.97){ months = 1; sold = SG.ask; note = "보자마자 계약! 다만 시장보다 싸게 내놨어요."; }
  else if(r <= 1.02){ months = 2; sold = SG.ask; note = "적정 호가 — 두 달 만에 제값에 팔렸어요."; }
  else if(r <= 1.06){ months = 4; sold = T; note = "문의는 오는데 계약이 안 돼, 네 달 만에 시장가로 네고해서 팔았어요."; }
  else { months = 6; sold = Math.round(T*0.98); note = "호가가 너무 높아 반년을 끌다가 결국 시장가보다 조금 낮게 내렸어요."; }
  const fee = Math.round(sold*0.005), interest = months*SG_INTEREST;
  const net = sold - cost - interest - fee;
  // 최선: 가능한 수리 선택 × 호가를 T로 맞춘 경우 중 최대
  let best = -Infinity;
  for(const to of [null,"기본","올수리"]){ if(to && !SG_REPAIR[SG.cond+">"+to]) continue;
    const t2 = Math.round(sc.truth.sale_price_man * sgMult(sc, to||SG.cond)); const c2 = to ? SG_REPAIR[SG.cond+">"+to] : 0;
    best = Math.max(best, t2 - c2 - 2*SG_INTEREST - Math.round(t2*0.005)); }
  const gap = best - net, grade = gap<=100?"S":gap<=400?"A":gap<=900?"B":gap<=1600?"C":"F";
  SG.res = {T, cost, months, sold, fee, interest, net, best, grade, note, finalCond};
  SG.phase = "done";
  const R = arenaRec(); R.sell = R.sell || {}; const k = sc.scenario_id, prev = R.sell[k];
  if(!prev || "SABCF".indexOf(grade) < "SABCF".indexOf(prev.grade)) R.sell[k] = {grade, net};
  save();
}
function sgBand(sc, extra){
  const lo = sc.prediction.low_man, hi = sc.prediction.high_man, pos = v => Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100));
  const pins = (extra||[]).map((p,i)=>`<span class="sg-pin" style="left:${pos(p.v)}%;background:${p.c}" title="${p.t}"></span><span class="sg-pinl${i%2?" sg-low":""}" style="left:${pos(p.v)}%;color:${p.c}">${p.t} ${sgEok(Math.round(p.d||p.v))}</span>`).join("");
  return `<div class="sg-band"><div class="sg-bar">${pins}</div><div class="sg-ends"><span>${sgEok(lo)}</span><span>${sgEok(hi)}</span></div></div>`;
}
function sgOpenHTML(k){
  const sc = SG.sc, s = sc.scenarios, mult = sgMult(sc, SG.cond);
  if(k==="broker"){
    const rows = [...sc.comparables].sort((a,b)=>b.similarity-a.similarity).slice(0,6).map(c=>`<tr><td>${esc(c.name)}</td><td>${c.area}㎡ · ${c.floor}층 · ${c.build_year}년</td><td>${c.ym}</td><td><b>${sgEok(c.amount_man)}</b></td><td>${c.distance_m}m</td></tr>`).join("");
    return `<div class="sg-say">🧑‍💼 사장님: “이 평수 깨끗한 거면 <b>${sgEok(s.median)}</b> 정도 보셔야죠. 빨리 팔 거면 <b>${sgEok(sc.tiers.d30)}</b>, 욕심내면 <b>${sgEok(sc.tiers.test)}</b>까지는 한번 던져 볼 수 있고요.”</div>
    <div class="tscroll"><table class="sg-t"><thead><tr><th>단지</th><th>면적·층·연식</th><th>계약</th><th>금액</th><th>거리</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="sg-note">사장님 시세는 ‘깨끗한 기본 상태’ 기준이에요. 이 집이 노후면 그만큼 낮게 봐야 해요.</p>`;
  }
  if(k==="visit"){
    const lad = (sc.condition_ladder||{})[SG.cond] || [];
    const rows = lad.map(x=>`<li>${x.is_current?"<b>지금</b> ":""}${esc(x.label)} — <b>${sgEok(x.price_man)}</b>${x.gain_man?` <span class="sg-up">(+${sgEok(x.gain_man)})</span>`:""}${!x.is_current&&SG_REPAIR[SG.cond+">"+x.condition]?` · 예상 공사비 ${man0(SG_REPAIR[SG.cond+">"+x.condition])}`:""}</li>`).join("");
    const opts = ((sc.reveal||{}).visit||{}).inspection_options || [];
    return `<p>집 상태: <b>${SG.cond}</b>${SG.why?` — ${esc(SG.why)}`:""}</p><ul class="sg-lad">${rows}</ul>
    <p class="sg-note">상태별 값은 경매용 매도가 기준에 현장 경험 배율(노후 0.90 · 기본 1.00 · 올수리 1.08)을 곱한 참고치예요. 검증된 수치가 아니에요.</p>
    ${opts.length?`<p class="sg-note">임장 체크포인트: ${opts.map(esc).join(" · ")}</p>`:""}`;
  }
  if(k==="papers"){
    const w = (sc.warnings||[]).map(x=>`<li><b>${esc(x.label||x.key||"")}</b> ${esc(x.detail||"")}</li>`).join("");
    return `<p>과거 비슷한 조건 물건의 80%가 팔린 범위(깨끗한 기본 상태 기준): <b>${sgEok(sc.prediction.low_man)} ~ ${sgEok(sc.prediction.high_man)}</b> · ${esc(sc.prediction.label)} (±${sc.prediction.pct}%)</p>${sgBand(sc,[{v:s.median,c:"var(--blue)",t:"중앙값"}])}
    ${w?`<ul class="sg-lad">${w}</ul>`:`<p class="sg-note">✅ 특별한 주의 신호는 없어요.</p>`}`;
  }
  if(k==="liq"){
    const L = sc.liquidity, g = r => L.counts.filter(c=>c.radius_m===r).map(c=>`${c.months}개월 ${c.count}건(월 ${c.monthly_avg})`).join(" · ");
    const m3 = (L.counts.find(c=>c.radius_m===500&&c.months===3)||{}).monthly_avg || 0;
    return `<p>반경 300m: ${g(300)}<br>반경 500m: ${g(500)}</p><p class="sg-say">${m3>=3?"📈 거래가 활발한 동네예요 — 적정가면 금방 나가요.":m3>=1?"➖ 보통이에요 — 호가를 욕심내면 몇 달 걸릴 수 있어요.":"📉 거래가 뜸해요 — 시장보다 조금만 높아도 오래 걸려요."}</p>`;
  }
  return "";
}
function sellHTML(){
  if(!SCENARIOS.length) return `<div class="panel ag-top">아직 불러온 시나리오가 없어요.</div>`;
  if(!SG){
    const R = arenaRec(), fm = sgFromMyeongdo();
    const cards = SCENARIOS.map((sc,i)=>{ const b = (R.sell||{})[sc.scenario_id];
      return `<div class="panel ag-top"><div><b>${esc(sc.subject.display_name)}</b> · ${esc(sc.subject.dong)} · 전용 ${sc.subject.area}㎡ · ${sc.subject.build_year}년식 ${sc._sample?'<span class="sg-sample">샘플 — 숫자는 연습용 가짜</span>':""} ${b?`<span class="ag-best">최고 ${b.grade}</span>`:""}</div>
      <div class="ag-chips">${fm?`<button type="button" class="btn" data-sgstart="${i}" data-sgc="${fm.cond}" data-sgw="1">🔗 명도왕 결과로 시작 (${fm.cond})</button>`:""}<button type="button" class="btn" data-sgstart="${i}" data-sgc="기본">🧹 깨끗한 집으로</button><button type="button" class="btn" data-sgstart="${i}" data-sgc="노후">🏚️ 험한 집으로</button></div>
      ${fm?`<p class="sg-note">${esc(fm.why)}</p>`:`<p class="sg-note">명도왕 게임을 한 판 끝내면, 그 결과(깔끔하게 끝냈는지)가 이 집 상태로 이어져요.</p>`}</div>`; }).join("");
    return `<div class="panel ag-top"><b>🏷️ 명도 끝! 이제 팔 차례</b><p class="sg-note" style="margin:0">행동력 3으로 조사할 곳을 고르고 → 수리할지 정하고 → 호가를 내요. 너무 싸면 손해, 너무 비싸면 이자가 쌓여요. 월 이자 ${man0(SG_INTEREST)}·공사비는 연습용 예시예요.</p></div>${cards}`;
  }
  const sc = SG.sc, sub = sc.subject;
  const head = `<div class="panel ag-top"><div class="ag-who"><div><b>${esc(sub.display_name)}</b> · 전용 ${sub.area}㎡ · ${sub.build_year}년식<br><span class="sg-note">집 상태: ${SG.cond}${SG.repair?` → ${SG.repair}(수리)`:""} ${sc._sample?'· <span class="sg-sample">샘플 시나리오</span>':""}</span></div><span class="sg-ap">행동력 ${"●".repeat(SG.ap)}${"○".repeat(3-SG.ap)}</span></div></div>`;
  const opened = SG_ACTS.filter(a=>SG.open[a.k]).map(a=>`<details class="panel sg-open" open><summary>${a.ico} ${a.t}</summary>${sgOpenHTML(a.k)}</details>`).join("");
  if(SG.phase==="research"){
    const acts = SG_ACTS.map(a=>`<button type="button" class="ag-act" data-sgact="${a.k}" ${SG.open[a.k]||!SG.ap?"disabled":""}><span class="ag-ai">${a.ico}</span><span><b>${a.t}</b><br><small>${a.d}</small></span></button>`).join("");
    return head + opened + `<div class="ag-acts" style="margin-top:10px">${acts}</div><button type="button" class="btn sg-next" data-sgphase="repair">조사 끝 → 수리 결정</button> <button type="button" class="btn" data-sgquit>그만하기</button>`;
  }
  if(SG.phase==="repair"){
    const ch = [[null,"그대로 판다","공사비 0"]].concat(["기본","올수리"].filter(t=>SG_REPAIR[SG.cond+">"+t]).map(t=>[t, t==="기본"?"기본 정리(청소·도배·장판)":"올수리(전체 리모델링)", "공사비 "+man0(SG_REPAIR[SG.cond+">"+t])+" · 한 달 더 걸림 없음(예시)"]));
    return head + opened + `<div class="panel ag-top"><b>🔨 수리할까요?</b>${SG.open.visit?"":`<p class="sg-note">임장을 안 가서 손보면 얼마 오를지 몰라요.</p>`}<div class="ag-acts">${ch.map(([t,l,d])=>`<button type="button" class="ag-act" data-sgrepair="${t||""}"><span><b>${l}</b><br><small>${d}</small></span></button>`).join("")}</div></div>`;
  }
  if(SG.phase==="ask"){
    const m = sgMult(sc, SG.repair||SG.cond), T = sc.tiers, nm = {urgent:"초급매가",d30:"30일 목표가",d60:"60일 목표가",normal:"일반 매도가",test:"최고가 테스트"};
    const btns = SG.open.broker ? Object.keys(nm).map(k=>`<button type="button" class="btn" data-sgask="${Math.round(T[k]*m/10)*10}">${nm[k]} ${sgEok(Math.round(T[k]*m/10)*10)}</button>`).join("") : `<p class="sg-note">사장님을 안 만나서 호가 전략표가 없어요. 직접 숫자를 넣어야 해요.</p>`;
    const def = Math.round(sc.scenarios.median*m/10)*10;
    return head + opened + `<div class="panel ag-top"><b>🏷️ 호가를 정하세요</b>${SG.open.broker&&m!==1?`<p class="sg-note">버튼 값은 사장님 표에 이 집 상태 배율(×${m})을 곱한 값이에요.</p>`:""}<div class="ag-chips">${btns}</div>
    <form id="sgAskF" class="ag-send"><input id="sgAsk" type="number" inputmode="numeric" step="10" min="1000" value="${SG.open.broker?def:""}" placeholder="호가(만원) 예: 30000" aria-label="호가(만원)"><button class="btn" type="submit">이 가격에 내놓기</button></form></div>`;
  }
  const r = SG.res, g = r.grade;
  return head + `<div class="panel ag-end">${g==="S"||g==="A"?confettiHTML():""}<div class="ag-grade">${g}</div><div><b>${r.note}</b><br>
  호가 ${sgEok(SG.ask)} → ${r.months}개월 만에 <b>${sgEok(r.sold)}</b>에 매도</div></div>
  <div class="panel ag-top"><b>💰 정산</b><ul class="sg-lad"><li>매도가 ${man0(r.sold)}</li><li>− 공사비 ${man0(r.cost)}</li><li>− 이자 ${r.months}개월 × ${man0(SG_INTEREST)} = ${man0(r.interest)}</li><li>− 중개보수(0.5% 예시) ${man0(r.fee)}</li><li><b>= 손에 남는 돈 ${man0(r.net)}</b> (이 물건 최선 ${man0(r.best)})</li></ul>
  <p>🎯 정답 시장가(${r.finalCond} 상태): <b>${sgEok(r.T)}</b></p>${sgBand(sc,[{v:r.T/sgMult(sc,r.finalCond),d:r.T,c:"var(--ok)",t:"정답"},{v:SG.ask/sgMult(sc,r.finalCond),d:SG.ask,c:"var(--seal)",t:"내 호가"}])}
  <p class="sg-note">띠는 ‘기본 상태’ 기준 예상 범위예요. 정답은 이 범위 안 ${Math.round(sc.truth.position*100)}% 지점에 있었어요 — 계산기 중앙값(${sgEok(sc.scenarios.median)})이 늘 정답은 아니에요.</p>
  <ul class="ag-tips">${sgTips(r).map(t=>`<li>${t}</li>`).join("")}</ul></div>
  <button type="button" class="btn" data-sgretry>같은 물건 다시</button> <button type="button" class="btn" data-sgquit>물건 목록</button>`;
}
function sgTips(r){
  const t = [], sc = SG.sc;
  if(!SG.open.broker) t.push("사장님을 안 만났다 — 비교거래와 호가 전략표 없이 감으로 불렀다.");
  if(!SG.open.visit && SG.cond==="노후") t.push("험한 집인데 임장을 안 갔다 — 기본 정리만 해도 얼마 오르는지 몰랐다.");
  if(SG.cond==="노후" && !SG.repair) t.push("노후 상태 그대로 팔았다 — 청소·도배·장판 같은 작은 수리가 가장 가성비 좋은 경우가 많다.");
  if(SG.repair==="올수리") t.push("올수리는 공사비가 커서 단기 매도에선 남는 게 적기 쉽다. 보통은 기본 정리까지.");
  if(r.months>=4) t.push("호가가 시장보다 높아 이자가 쌓였다 — 버틴 달수 × 이자가 네고 폭보다 커지기 쉽다.");
  if(SG.ask < r.T*0.97) t.push("시장보다 싸게 내놨다 — 거래량이 받쳐 주는 동네면 30~60일 목표가면 충분하다.");
  if(!t.length) t.push("조사 → 수리 → 호가의 순서를 잘 밟았다.");
  return t.slice(0,4);
}
document.addEventListener("click", e => {
  if(page!=="arena") return; let b;
  if((b = e.target.closest("[data-sgstart]"))){ const fm = b.dataset.sgw ? sgFromMyeongdo() : null; sgStart(+b.dataset.sgstart, b.dataset.sgc, fm ? fm.why : ""); renderArena(); return; }
  if(!SG) return;
  if((b = e.target.closest("[data-sgact]")) && SG.ap>0 && !SG.open[b.dataset.sgact]){ SG.open[b.dataset.sgact] = true; SG.ap--; renderArena(); return; }
  if((b = e.target.closest("[data-sgphase]"))){ SG.phase = b.dataset.sgphase; renderArena(); return; }
  if((b = e.target.closest("[data-sgrepair]"))){ SG.repair = b.dataset.sgrepair || null; SG.phase = "ask"; renderArena(); return; }
  if((b = e.target.closest("[data-sgask]"))){ SG.ask = +b.dataset.sgask; sgSell(); renderArena(); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-sgretry]")){ sgStart(SG.i, SG.cond, SG.why); renderArena(); return; }
  if(e.target.closest("[data-sgquit]")){ SG = null; renderArena(); return; }
});
document.addEventListener("submit", e => {
  if(e.target.id!=="sgAskF" || !SG) return; e.preventDefault();
  const v = Math.round(+$("#sgAsk").value); if(!(v>=1000 && v<=500000)) return;
  SG.ask = v; sgSell(); renderArena(); window.scrollTo(0,0);
});
