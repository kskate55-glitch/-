/* ============ 🎯 시세 맞히기 — 이미 팔린 실거래로, 직접 조사해서 맞힌다 ============
   재료: 매도가 계산기 /backtest 순회 'CSV로 저장' 파일(73-1절: gu,dong,name,date,area,floor,build_year,actual,median,p25,p75,conf,n,divergence…)
   정답(actual)은 진짜 체결가. 계산기 값(median/p25/p75)은 그 거래 '이전' 실거래로만 계산된 것이라 힌트로 써도 누출이 없다. */
let GQ = null;           // 진행 중 문제 {row, hints:{}, chat:[], busy, memo, res}
const gqEok = n => (n/10000).toFixed(2)+"억";
function gqRec(){ const R = arenaRec(); if(!R.pq) R.pq = {rows:[], done:{}}; if(!R.pq.done) R.pq.done = {}; return R.pq; }
function gqKey(r){ return [r.gu,r.name,r.date,r.area,r.floor].join("|"); }
function gqParseCSV(text){
  text = String(text||"").replace(/^﻿/,"");
  const rows = []; let cur = [], f = "", q = false;
  for(let i=0;i<text.length;i++){ const ch = text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q = false; } else f += ch; }
    else if(ch==='"') q = true; else if(ch===','){ cur.push(f); f=""; }
    else if(ch==='\n' || ch==='\r'){ if(ch==='\r' && text[i+1]==='\n') i++; cur.push(f); f=""; if(cur.some(x=>x!=="")) rows.push(cur); cur=[]; }
    else f += ch; }
  cur.push(f); if(cur.some(x=>x!=="")) rows.push(cur);
  if(rows.length < 2) return {err:"표를 찾지 못했어요. 백테스트 화면의 ‘CSV로 저장’ 파일을 통째로 올려 주세요."};
  const h = rows[0].map(x=>x.trim()), ix = k => h.indexOf(k);
  for(const k of ["gu","area","actual","median"]) if(ix(k)<0) return {err:`‘${k}’ 칸이 없어요. 백테스트 순회 CSV가 맞는지 확인해 주세요.`};
  const num = v => { const n = parseFloat(String(v||"").replace(/[^0-9.\-]/g,"")); return isFinite(n) ? n : null; };
  const txt = v => String(v||"").replace(/^'/,"").trim();
  const out = [];
  for(const r of rows.slice(1)){ const g = k => ix(k)<0 ? "" : r[ix(k)];
    const o = {gu:txt(g("gu")), dong:txt(g("dong")), name:txt(g("name")), date:txt(g("date")), area:num(g("area")), floor:num(g("floor")), build_year:num(g("build_year")),
      actual:num(g("actual")), median:num(g("median")), p25:num(g("p25")), p75:num(g("p75")), conf:num(g("conf")), n:num(g("n")), divergence:num(g("divergence"))};
    if(o.gu && o.area>0 && o.actual>0 && o.median>0) out.push(o); }
  if(!out.length) return {err:"읽을 수 있는 거래가 한 건도 없어요."};
  return {rows:out, noDong: out.filter(o=>!o.dong).length};
}
function gqImport(text){
  const r = gqParseCSV(text); if(r.err) return r.err;
  const P = gqRec(), have = new Set(P.rows.map(gqKey)); let add = 0;
  for(const o of r.rows) if(!have.has(gqKey(o))){ P.rows.push(o); have.add(gqKey(o)); add++; }
  P.rows = P.rows.slice(-400); save();
  return `✅ ${add}문제를 새로 넣었어요 (전체 ${P.rows.length}문제).` + (r.noDong ? ` ⚠️ ${r.noDong}건은 ‘동’ 칸이 비어 있어요 — 예전 CSV라서 그래요. 새로 순회해서 받은 CSV면 동까지 나와요.` : "");
}
function gqPick(){
  const P = gqRec(), left = P.rows.filter(r=>!P.done[gqKey(r)]);
  const pool = left.length ? left : P.rows; if(!pool.length) return;
  GQ = {row: pool[Math.floor(Math.random()*pool.length)], hints:{}, chat:[], busy:false, memo:"", res:null, err:""};
}
const GQ_HINTS = [
  {k:"calc", t:"🧮 계산기 추정치", pen:15, show:r=>`현실적 체결가 <b>${gqEok(r.median)}</b>`},
  {k:"band", t:"📏 계산기 범위", pen:10, show:r=> r.p25&&r.p75 ? `급매 ${gqEok(r.p25)} ~ 상단 ${gqEok(r.p75)}` : "이 CSV엔 범위 칸이 없어요"},
  {k:"sample", t:"🔎 표본 정보", pen:5, show:r=>`비교거래 ${r.n??"?"}건 · 시세 신뢰도 ${r.conf??"?"}점${r.divergence!=null?` · 두 계산 방식 차이 ${r.divergence}%`:""}`}
];
function gqWhen(r){ const m = String(r.date||"").match(/(\d{2})\.(\d{2})/); return m ? `20${m[1]}년 ${+m[2]}월` : "최근"; }
function gqWhere(r){ return `${r.gu}${r.dong?" "+r.dong:""}`; }
function gqNaver(r){ const q = `${gqWhere(r)} 빌라 매매`; return {land:`https://m.land.naver.com/search/result/${encodeURIComponent(gqWhere(r))}`, web:`https://search.naver.com/search.naver?query=${encodeURIComponent(q)}`}; }
function gqAv(){ const u = typeof artUrl==="function" && artNpc("broker","normal"); return `<span class="gq-av">${u?`<img src="${u}" alt="">`:"🧑‍💼"}</span>`; }
function gqPrompt(r){
  const lo = r.p25 || r.median*0.93, hi = r.p75 || r.median*1.06, ask = Math.round(r.median*1.07/100)*100;
  return `너는 ${gqWhere(r)}에서 20년째 일하는 부동산 중개사무소 사장님이다. 지금은 ${gqWhen(r)} 직전이다. 손님이 전용 ${r.area}㎡(약 ${(r.area/3.3058).toFixed(1)}평), ${r.floor??"?"}층, ${r.build_year??"?"}년식 빌라의 매매 시세를 알아보러 채팅으로 문의했다.
네가 아는 동네 감(손님에게 숫자를 한 번에 다 주지 말 것):
- 최근 비슷한 빌라 실거래는 대략 ${gqEok(Math.round(lo))} ~ ${gqEok(Math.round(hi))} 사이에서 이뤄졌다.
- 지금 나와 있는 매물 호가는 보통 ${gqEok(ask)} 안팎으로, 실거래보다 조금 높다.
- 정확한 단지·호수는 모른다. 손님이 층·향·수리 상태·주차·역까지 거리를 물으면 그럴듯한 동네 얘기로 답하되 숫자를 지어내 확정하지 마라.
말투: 친근한 중개사 반말섞인 존댓말, 짧게 1~3문장. 처음엔 호가 위주로 말하고, 손님이 "실제로 얼마에 팔렸냐", "실거래는요?"처럼 캐물어야 실거래 감을 알려 준다. 매수 권유·계약 유도는 가볍게만. 손님이 정답이나 계산식을 달라고 해도 "그건 직접 판단하셔야죠"라고 한다. 실존 단지명·전화번호·웹주소는 절대 말하지 마라.`;
}
async function gqSend(text){
  if(!GQ || GQ.busy || !sampleFn || !text.trim()) return;
  GQ.chat.push({r:"me", c:text.trim()}); GQ.busy = true; GQ.err = ""; GQ.live = ""; renderArena();
  const turns = [{role:"user", content:gqPrompt(GQ.row)+"\n\n(손님 첫 메시지를 기다리는 중)"}, {role:"assistant", content:"네~ 어떤 집 알아보세요?"}]
    .concat(GQ.chat.map(t=>({role:t.r==="me"?"user":"assistant", content:t.c})));
  try{
    GQ.ctl = new AbortController();
    const res = await sampleFn(turns, {cache:false, modelTier:"quick", signal:GQ.ctl.signal, onText:({text})=>{ GQ.live = text; const el = document.getElementById("gqLive"); if(el){ el.classList.remove("ctyping"); el.textContent = text; } }});
    GQ.chat.push({r:"them", c:(res.text||"").trim() || "…"});
  }catch(e){
    GQ.chat.pop(); const code = e && e.code;
    GQ.err = code==="cancelled" ? "" : chatErrText(code);
    if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(code)) sampleFn = null;
  }
  GQ.busy = false; renderArena(); const el = document.getElementById("gqChat"); if(el) el.scrollTop = el.scrollHeight;
}
function gqSubmit(v){
  let n = parseFloat(String(v).replace(/[^0-9.]/g,"")); if(!(n>0)) return;
  if(n < 100) n = n*10000;                // 2.35 → 억으로 입력한 것
  const r = GQ.row, myErr = (n - r.actual)/r.actual*100, calcErr = (r.median - r.actual)/r.actual*100;
  const pen = GQ_HINTS.filter(h=>GQ.hints[h.k]).reduce((a,h)=>a+h.pen,0);
  const score = Math.max(0, Math.round(100 - Math.abs(myErr)*5 - pen));
  GQ.res = {guess:Math.round(n), myErr, calcErr, score, pen};
  const P = gqRec(); P.done[gqKey(r)] = {me:+myErr.toFixed(1), calc:+calcErr.toFixed(1), score}; save();
}
function gqWhy(r, res){
  const t = [];
  if(r.build_year && r.build_year < 2000 && r.n!=null && r.n <= 5) t.push("오래된 집인데 비교거래까지 적은 조합 — 계산기가 평균적으로 높게 부르던 유형이에요.");
  if(Math.abs(res.calcErr) >= 15) t.push(`계산기도 ${Math.abs(res.calcErr).toFixed(0)}% 빗나간 물건이에요 — 동네 평균과 다르게 팔린 ‘개별성’이 큰 물건이었어요.`);
  if(res.myErr > 8 && GQ.chat.length && !GQ.hints.calc) t.push("호가 위주로 들었다면 높게 잡기 쉬워요 — 호가는 파는 사람 희망가, 실거래는 그보다 낮은 게 보통이에요.");
  if(r.area && r.area < 50) t.push("소형(50㎡ 미만)은 같은 동네에서도 값이 크게 흩어지는 편이에요.");
  if(r.floor != null && r.floor <= 1) t.push("1층·반지하는 같은 건물 위층보다 싸게 팔리는 게 보통이에요.");
  if(!t.length) t.push(Math.abs(res.myErr) <= 5 ? "동네 시세 감을 정확히 잡았어요." : "비슷한 평형·연식의 최근 실거래를 더 많이 모아 보면 감이 좁혀져요.");
  return t.slice(0,3);
}
function guessHTML(){
  const P = gqRec(), done = Object.values(P.done);
  const stat = done.length ? (()=>{ const me = done.reduce((a,d)=>a+Math.abs(d.me),0)/done.length, calc = done.reduce((a,d)=>a+Math.abs(d.calc),0)/done.length, win = done.filter(d=>Math.abs(d.me)<Math.abs(d.calc)).length;
    return `<div class="panel ag-top"><b>📈 내 기록</b> ${done.length}문제 · 평균 오차 <b>나 ${me.toFixed(1)}%</b> vs 계산기 ${calc.toFixed(1)}% · 계산기보다 잘 맞힌 문제 ${win}개</div>`; })() : "";
  const imp = `<details class="panel sg-open"${P.rows.length?"":" open"}><summary>📥 문제 넣기 — 백테스트 CSV 올리기</summary>
    <p class="sg-note">매도가 계산기 사이트 <b>/backtest → 전체 지역 한 번에 돌리기 → ‘CSV로 저장’</b>으로 받은 파일을 그대로 올리면, 한 줄이 한 문제가 돼요. 정답은 실제로 팔린 가격이에요.</p>
    <input type="file" id="gqFile" accept=".csv,text/csv" aria-label="CSV 파일 선택"> <span class="sg-note">또는 붙여넣기:</span>
    <form id="gqImpF"><textarea id="gqPaste" rows="3" style="width:100%" placeholder="CSV 내용을 통째로 붙여넣기"></textarea><button class="btn" type="submit">넣기</button></form>
    ${GQ_MSG?`<p class="sg-note">${esc(GQ_MSG)}</p>`:""}</details>`;
  if(!GQ){
    return `<div class="panel ag-top"><b>🎯 시세 맞히기</b><p class="sg-note" style="margin:0">이미 팔린 빌라 한 채를 보여 드려요. 네이버부동산과 AI 중개사 채팅으로 <b>직접 시세조사</b>를 한 뒤, 얼마에 팔렸을지 맞혀 보세요. 계산기와 대결이에요.</p></div>${stat}${imp}
    ${P.rows.length?`<button type="button" class="btn pri" data-gqnew>문제 받기 (${P.rows.filter(r=>!P.done[gqKey(r)]).length}문제 남음)</button>`:""}`;
  }
  const r = GQ.row, nv = gqNaver(r);
  const card = `<div class="panel ag-top"><div><span class="sg-sample" style="color:var(--blue);border-color:var(--blue)">실제로 팔린 거래</span> <b>${esc(gqWhere(r))}</b> · 빌라(단지명 비공개)</div>
    <div>전용 <b>${r.area}㎡</b>(${(r.area/3.3058).toFixed(1)}평) · ${r.floor??"?"}층 · ${r.build_year??"?"}년식 · <b>${gqWhen(r)} 계약</b></div>
    <p class="sg-note">규칙: 네이버 실거래에서 <b>${gqWhen(r)} 이후 거래는 보지 않기</b> — 그 안에 정답이 있어요.${r.dong?"":" (이 문제는 동 정보가 없어 구 단위로 조사해야 해요)"}</p></div>`;
  if(GQ.res){
    const s = GQ.res, win = Math.abs(s.myErr) < Math.abs(s.calcErr);
    return card + `<div class="panel ag-end">${s.score>=80?confettiHTML():""}<div class="ag-grade">${s.score}</div><div><b>실제로 ${gqEok(r.actual)}에 팔렸어요</b>${r.name?` <span class="sg-note">(${esc(r.name)})</span>`:""}<br>
      내 답 ${gqEok(s.guess)} (${s.myErr>=0?"+":""}${s.myErr.toFixed(1)}%) · 계산기 ${gqEok(r.median)} (${s.calcErr>=0?"+":""}${s.calcErr.toFixed(1)}%)<br><b>${win?"🏆 계산기보다 잘 맞혔어요!":"🤖 이번엔 계산기가 더 가까웠어요"}</b>${s.pen?` <span class="sg-note">힌트 −${s.pen}점</span>`:""}</div></div>
      <div class="panel ag-top"><ul class="ag-tips">${gqWhy(r,s).map(x=>`<li>${x}</li>`).join("")}</ul>${GQ.memo?`<p class="sg-note">내 조사 메모: ${esc(GQ.memo)}</p>`:""}</div>
      <button type="button" class="btn pri" data-gqnew>다음 문제</button> <button type="button" class="btn" data-gqquit>목록</button>`;
  }
  const chat = sampleFn ? `<div class="panel ag-top"><b>💬 동네 부동산 사장님께 물어보기</b><p class="sg-note" style="margin:0">처음엔 호가 위주로 말해요. ‘실제로 얼마에 팔렸어요?’처럼 캐물어 보세요.</p>
    <div class="ag-chat" id="gqChat" style="min-height:120px;max-height:40vh">${GQ.chat.map(t=>t.r==="me"?`<div class="cmsg me"><span class="cbub">${esc(t.c)}</span></div>`:`<div class="cmsg av-row">${gqAv()}<div class="cstack">${bubblesHTML(t.c)}</div></div>`).join("")}${GQ.busy?`<div class="cmsg av-row">${gqAv()}<span class="cbub${GQ.live?"":" ctyping"}" id="gqLive">${GQ.live?esc(GQ.live):"<i></i><i></i><i></i>"}</span></div>`:""}</div>
    ${GQ.err?`<p class="sg-note" style="color:var(--seal)">${esc(GQ.err)}</p>`:""}
    <form id="gqChatF" class="ag-send"><input id="gqIn" placeholder="예: ${esc(r.dong||r.gu)} ${Math.round(r.area/3.3058)}평 빌라 요즘 얼마 해요?" aria-label="사장님께 보낼 말" ${GQ.busy?"disabled":""}><button class="btn" type="submit" ${GQ.busy?"disabled":""}>보내기</button></form></div>` : `<div class="panel ag-top sg-note">AI 채팅을 쓸 수 없는 환경이에요 — 네이버부동산 조사로 진행해 주세요.</div>`;
  return card + `<div class="panel ag-top"><b>🔗 직접 조사</b><div class="ag-chips"><a class="btn" href="${nv.land}" target="_blank" rel="noopener">네이버부동산에서 ${esc(gqWhere(r))} 보기 ↗</a><a class="btn" href="${nv.web}" target="_blank" rel="noopener">네이버 검색 ↗</a></div>
    <p class="sg-note">비슷한 평형·연식 빌라의 매물 호가와, ${gqWhen(r)} 이전 실거래를 모아 보세요. 부동산이 안 열리면 앱 검색창에 동 이름을 넣으면 돼요.</p></div>` + chat +
    `<div class="panel ag-top"><b>💡 힌트</b> <span class="sg-note">(열 때마다 점수 감점)</span><div class="ag-chips">${GQ_HINTS.map(h=>GQ.hints[h.k]?`<span class="sg-say">${h.t}: ${h.show(r)}</span>`:`<button type="button" class="btn" data-gqhint="${h.k}">${h.t} (−${h.pen})</button>`).join("")}</div></div>
    <div class="panel ag-top"><b>📝 조사 메모 & 답</b><textarea id="gqMemo" rows="2" style="width:100%" placeholder="예: 비슷한 빌라 호가 3.2억, 작년 실거래 2.9억">${esc(GQ.memo)}</textarea>
    <form id="gqAnsF" class="ag-send"><input id="gqAns" inputmode="decimal" placeholder="예상 매도가 (예: 2.95 억 또는 29500 만원)" aria-label="예상 매도가"><button class="btn pri" type="submit">정답 확인</button></form></div>
    <button type="button" class="btn" data-gqquit>그만하기</button>`;
}
let GQ_MSG = "";
document.addEventListener("click", e => {
  if(page!=="arena") return; let b;
  if(e.target.closest("[data-gqnew]")){ gqPick(); renderArena(); window.scrollTo(0,0); return; }
  if(e.target.closest("[data-gqquit]")){ if(GQ && GQ.ctl) GQ.ctl.abort(); GQ = null; renderArena(); return; }
  if((b = e.target.closest("[data-gqhint]")) && GQ){ GQ.hints[b.dataset.gqhint] = true; renderArena(); return; }
});
document.addEventListener("input", e => { if(e.target.id==="gqMemo" && GQ) GQ.memo = e.target.value; });
document.addEventListener("change", e => {
  if(e.target.id!=="gqFile" || !e.target.files || !e.target.files[0]) return;
  const rd = new FileReader(); rd.onload = () => { GQ_MSG = gqImport(rd.result); renderArena(); }; rd.readAsText(e.target.files[0], "utf-8");
});
document.addEventListener("submit", e => {
  const id = e.target.id; if(!["gqImpF","gqChatF","gqAnsF"].includes(id)) return; e.preventDefault();
  if(id==="gqImpF"){ GQ_MSG = gqImport($("#gqPaste").value); renderArena(); }
  if(id==="gqChatF"){ const v = $("#gqIn").value; gqSend(v); }
  if(id==="gqAnsF" && GQ){ gqSubmit($("#gqAns").value); renderArena(); window.scrollTo(0,0); }
});
