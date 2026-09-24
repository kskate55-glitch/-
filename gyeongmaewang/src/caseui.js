/* ============================== 실전 — 케이스 스터디 (명도·매도·상가·지분 상황극) ============================== */
let CS = null;   /* {id, step, picks:[]} */
const CASE_CATS = ["명도","고난도 명도","위기 대응","외국인 점유자","매도·임대","선순위 임차인","상가","지분","부동산 사장님","인테리어","빌라 투자"];
const G_LABEL = ["아쉬운 선택","괜찮은 선택","가장 좋은 선택"], G_COLOR = ["var(--seal)","var(--warn)","var(--ok)"];
const SCENE_CACHE = {};
function sceneImg(key, cls){ if(typeof sceneHTML!=="function" || !key) return ""; if(!SCENE_CACHE[key]) SCENE_CACHE[key] = sceneHTML(key); return SCENE_CACHE[key].replace('class="scene"', `class="scene ${cls||""}"`); }
function caseKey(c){ if(!c._sk) c._sk = c.sk || ((typeof caseSceneKey==="function") ? caseSceneKey(c) : ""); return c._sk; }
function stepKey(c, s){ if(s._sk===undefined){ const k = (typeof caseSceneKey==="function") ? caseSceneKey({id:"", cat:"", title:"", setup:(s.scene||"")+" "+(s.q||"")}) : ""; s._sk = k || ""; } return s._sk; }
function caseRec(){ if(!S.cases) S.cases = {}; return S.cases; }
function caseListHTML(){
  const rec = caseRec();
  const done = CASES.filter(c=>rec[c.id]).length;
  return `<p class="lead">명도·매도·부동산 사장님·인테리어·빌라 투자·상가·지분에서 실제로 나오는 장면을 따라가며 <b>“나라면 어떻게 할까”</b>를 골라 보세요. 고를 때마다 왜 좋은지·왜 위험한지 바로 알려 드려요.</p>
    <div class="note" style="margin-bottom:10px">푼 케이스 ${done} / ${CASES.length}</div>
    ${CASE_CATS.filter(k=>CASES.some(c=>c.cat===k)).map(k=>`<div class="h2row" style="margin-top:6px"><h2 style="font-size:18px">${k}</h2></div>
      <div class="cgrid">${CASES.filter(c=>c.cat===k).map(c=>{ const r = rec[c.id];
        return `<button type="button" class="panel ccard" data-case="${c.id}">${caseArt(c,"sc-thumb")}<span class="ctitle">${esc(c.title)}</span><span class="note">${"★".repeat(c.lv)}${"☆".repeat(3-c.lv)} · 장면 ${c.steps.length}개${r?` · <b style="color:var(--ok)">최고 ${r.best}%</b>`:""}</span></button>`; }).join("")}</div>`).join("")}`;
}
function caseTotals(c, picks){ const t = {d:0,w:0,m:0}; picks.forEach((p,i)=>{ const fx = (c.steps[i].o[p]||{}).fx; if(fx){ t.d+=fx.d||0; t.w+=fx.w||0; t.m+=fx.m||0; } }); return t; }
function caseBestPicks(c){ return c.steps.map(s=>s.o.findIndex(o=>o.g===2)); }
const sgn = v => v>0 ? `+${v}` : `${v}`;
function caseGauges(c, t){
  if(!c.meters) return "";
  const M = c.meters, mood = Math.max(-10, Math.min(10, t.m)), face = mood>=3?"😊":mood>=0?"🙂":mood>=-3?"😐":"😠";
  return `<div class="cgauge"><div><span class="note">⏱ ${esc(M.d)}</span><b class="mono">${t.d}일</b></div><div><span class="note">💸 ${esc(M.w)}</span><b class="mono">${t.w.toLocaleString()}</b></div>
    <div><span class="note">${face} ${esc(M.m)}</span><b class="mono">${sgn(t.m)}</b><i class="cbar"><i style="left:50%;width:${Math.abs(mood)*5}%;${mood<0?`transform:translateX(-100%);background:var(--seal)`:"background:var(--ok)"}"></i></i></div></div>`;
}
const CASE_ORG_ICON = [[/법원|판사|경매계/,"🏛️"],[/집행관/,"⚖️"],[/행정복지|주민센터|복지/,"🏢"],[/관리사무소|관리실/,"🏢"],[/은행|대출/,"🏦"],[/경찰|112/,"🚓"],[/소방|119/,"🚒"],[/보험/,"🛡️"],[/업체|청소|이삿짐|배관/,"🧰"],[/세무|법무|변호사/,"💼"]];
const CASE_AV_CACHE = {};
function caseSpeakerAv(c, who){
  if(who==="나") return `<span class="av cav me-av">${avPortrait({g:"m", hair:"short", hc:"#1f1a18", skin:"#e8b98f", brow:"flat", mouth:"smile", top:"#1B2430", bg:"#e3e8f2"})}</span>`;
  const org = CASE_ORG_ICON.find(([re])=>re.test(who));
  if(org) return `<span class="av cav org-av">${org[1]}</span>`;
  const key = c.id + "|" + who;
  if(!CASE_AV_CACHE[key]){
    const h = avHash(key);
    const fem = /아내|딸|할머니|어머니|엄마|노모|누나|언니|여성|아주머니|부인|며느리|여자/.test(who) || (!/남편|아들|할아버지|아버지|아빠|형|남자|사장|소장|반장/.test(who) && h%3===0);
    const old = /할머니|할아버지|노모|노부|어르신|80대|70대/.test(who+" "+(c.setup||"")) && /할머니|할아버지|노모|어르신/.test(who);
    const foreign = /외국|유학생|중국|몽골|파키스탄|베트남|화교/.test(who);
    const skin = foreign && /파키스탄/.test(who+(c.setup||"")) ? "#a86f48" : AV_SKIN[(h>>>3)%5];
    const spec = {g:fem?"f":"m", age:old?"old":"", wrinkle:old?1:0, hair: fem ? (old?"perm":["long","bun"][h%2]) : (old?"bald":["short","buzz","short"][h%3]),
      hc: old ? "#cfcfcf" : AV_HAIR[(h>>>5)%5], skin, top: AV_TOP[(h>>>7)%AV_TOP.length], bg: AV_BG[(h>>>9)%AV_BG.length],
      brow: /점유자|버티|대리인/.test(who) ? ["flat","angry","sad"][h%3] : "flat", mouth: ["flat","frown","smile"][(h>>>11)%3], glasses:(h>>>13)%4===0,
      hat: /사장|소장|반장|업체/.test(who) ? "" : "", beard: !fem && (h>>>15)%5===0};
    CASE_AV_CACHE[key] = avPortrait(spec);
  }
  return `<span class="av cav">${CASE_AV_CACHE[key]}</span>`;
}
function caseChat(chat, c){
  if(!chat || !chat.length) return "";
  return `<div class="cchat">${chat.map(m=>{ const me = m.who==="나"; const doc = m.ch==="서류";
    const av = c ? caseSpeakerAv(c, m.who) : "";
    return `<div class="cmsg${me?" me":""}${doc?" doc":""} cav-row">${me?"":av}<div class="cstack2"><span class="cwho">${esc(m.who)} · ${esc(m.ch)}</span><span class="cbub">${esc(m.t)}</span></div>${me?av:""}</div>`; }).join("")}</div>`;
}
function caseDoc(d){ if(!d) return ""; return `<details class="cdoc"><summary>📄 ${esc(d.title)}</summary><pre>${esc(d.body)}</pre><button type="button" class="btn" data-ccopy style="padding:4px 10px;font-size:13px">문안 복사</button></details>`; }
function casePlayHTML(){
  const c = CASES.find(x=>x.id===CS.id);
  const facts = c.facts && c.facts.length ? `<div class="facts" style="display:flex;flex-wrap:wrap;gap:4px 16px;font-size:14px">${c.facts.map(f=>`<span>${esc(f[0])} <b>${esc(f[1])}</b></span>`).join("")}</div>` : "";
  const shown = c.steps.slice(0, CS.step+1).map((s, si) => {
    const pick = CS.picks[si], reveal = pick!==undefined;
    const opts = CS.ord[si].map(oi => { const o = s.o[oi]; const chosen = pick===oi;
      const st = reveal ? (chosen ? `border-color:${G_COLOR[o.g]};background:var(--sheet2)` : (o.g===2 ? `border-color:var(--ok)` : "opacity:.72")) : "";
      const fx = reveal && chosen && o.fx ? `<span class="cfx"><span>${sgn(o.fx.d||0)}일</span><span>${sgn(o.fx.w||0)}만원</span><span>${(o.fx.m||0)>0?"▲":(o.fx.m||0)<0?"▼":"–"} ${c.meters?esc(c.meters.m):"관계"}</span></span>` : "";
      return `<li><button type="button" class="copt" data-cpick="${si}:${oi}" ${reveal?"disabled":""} style="${st}"><span>${esc(o.t)}</span>${reveal && (chosen || o.g===2) ? `<span class="cfb"><b style="color:${G_COLOR[o.g]}">${chosen?"내 선택 · ":""}${G_LABEL[o.g]}</b> — ${esc(o.fb)}</span>` : ""}${fx}</button></li>`; }).join("");
    const after = reveal && s.o[pick].after ? `<div class="cafter">➜ ${esc(s.o[pick].after)}</div>` : "";
    const sk = stepKey(c, s), prevK = si ? stepKey(c, c.steps[si-1]) : caseKey(c);
    const pic = sk && sk!==prevK && sk!==caseKey(c) ? sceneImg(sk, "sc-step") : "";
    return `<div class="panel pad cscene">${pic}<div class="note" style="font-weight:700">장면 ${si+1} / ${c.steps.length}</div>
      <p style="margin:6px 0 8px;white-space:pre-line">${esc(s.scene)}</p>${caseChat(s.chat, c)}${caseDoc(s.doc)}<div style="font-weight:800;margin:8px 0 6px">${esc(s.q||"당신이라면?")}</div>
      <ul class="copts">${opts}</ul>${after}${reveal?`<div class="ckey">💡 ${esc(s.why)}</div>`:""}</div>`;
  }).join("");
  const cur = CS.picks[CS.step], last = CS.step === c.steps.length-1;
  let foot = "";
  if(cur!==undefined && !last) foot = `<button type="button" class="btn pri" id="cNext">다음 장면 →</button>`;
  if(cur!==undefined && last){
    const got = CS.picks.reduce((s,p,i)=>s+c.steps[i].o[p].g,0), max = c.steps.length*2, pct = Math.round(got/max*100);
    const mine = caseTotals(c, CS.picks), best = caseTotals(c, caseBestPicks(c));
    const cmp = c.meters ? `<div class="reg rlist" style="margin-top:8px"><div class="rcap">내 경로 vs 가장 좋은 경로</div>
      ${[["d",c.meters.d,"일"],["w",c.meters.w,""],["m",c.meters.m,""]].map(([k,l,u])=>`<div class="rcard"><div class="rhead"><b>${esc(l)}</b><span class="mono ramt">${k==="m"?sgn(mine[k]):mine[k].toLocaleString()+u} <span class="note">/ 최선 ${k==="m"?sgn(best[k]):best[k].toLocaleString()+u}</span></span></div></div>`).join("")}</div>` : "";
    foot = `<div class="panel score"><h3>${pct>=85?"실전 감각 좋아요":pct>=60?"절반 이상 잘 골랐어요":"다시 한 번 따라가 볼까요"} — ${pct}%</h3>${cmp}
      <div style="font-weight:700;margin-top:10px">📌 이 케이스 정리</div><ul>${c.lesson.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>
      ${c.trap?`<div class="ckey" style="border-color:var(--warn)">⚠️ ${esc(c.trap)}</div>`:""}
      <div class="row" style="justify-content:flex-start;gap:8px;margin-top:10px"><button type="button" class="btn" id="cAgain">다시 풀기</button><button type="button" class="btn" id="cList">케이스 목록</button>${nextCase(c)?`<button type="button" class="btn seal" id="cNextCase">다음 케이스 →</button>`:""}</div></div>`;
  }
  return `<div style="display:grid;gap:12px"><div class="row" style="justify-content:flex-start"><button type="button" class="btn" id="cList">← 목록</button><span class="note">${esc(c.cat)} · ${"★".repeat(c.lv)}</span></div>
    <div class="panel pad">${caseArt(c,"sc-hero")}<div style="font-weight:800;font-size:18px">${esc(c.title)}</div><p style="margin:6px 0">${c.setup}</p>${facts}</div>
    ${shown}${foot}<div class="cgwrap">${caseGauges(c, caseTotals(c, CS.picks))}</div></div>`;
}
function nextCase(c){ const i = CASES.indexOf(c); return CASES[i+1] || null; }
function caseStart(id){ const c = CASES.find(x=>x.id===id); CS = {id, step:0, picks:[], ord: c.steps.map(st => shuffle(st.o.map((_,i)=>i)))}; }
document.addEventListener("click", e => {
  if(page!=="real" || realTab!=="cases") return;
  let b;
  if((b = e.target.closest("[data-case]"))){ caseStart(b.dataset.case); renderReal(); window.scrollTo(0,0); return; }
  if((b = e.target.closest("[data-cpick]")) && CS){ const [si,oi] = b.dataset.cpick.split(":").map(Number); if(CS.picks[si]===undefined && si===CS.step){ CS.picks[si] = oi;
      const c = CASES.find(x=>x.id===CS.id); if(si===c.steps.length-1){ const pct = Math.round(CS.picks.reduce((s,p,i)=>s+c.steps[i].o[p].g,0)/(c.steps.length*2)*100); const rec = caseRec(); rec[c.id] = {best: Math.max(pct, (rec[c.id]||{}).best||0), last:pct}; save(); }
      renderReal(); } return; }
  if((b = e.target.closest("[data-ccopy]"))){ const pre = b.parentElement.querySelector("pre"); try{ navigator.clipboard.writeText(pre.textContent).then(()=>{ b.textContent = "복사했어요"; }, ()=>{ b.textContent = "복사가 막혔어요 — 직접 선택해 복사하세요"; }); }catch(err){ b.textContent = "복사가 막혔어요"; } return; }
  if(e.target.closest("#cNext") && CS){ CS.step++; renderReal(); const el = document.querySelectorAll(".cscene"); if(el.length) el[el.length-1].scrollIntoView({behavior:"smooth", block:"start"}); return; }
  if(e.target.closest("#cAgain") && CS){ caseStart(CS.id); renderReal(); window.scrollTo(0,0); return; }
  if(e.target.closest("#cList")){ CS = null; renderReal(); window.scrollTo(0,0); return; }
  if(e.target.closest("#cNextCase") && CS){ const n = nextCase(CASES.find(x=>x.id===CS.id)); if(n){ caseStart(n.id); renderReal(); window.scrollTo(0,0); } return; }
});
