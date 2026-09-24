/* ================= 🎬 명도왕 — 게임 화면(배경 + 인물 + 대화창 + HUD) =================
   그림 슬롯(art.js)이 채워져 있으면 그 그림을, 비어 있으면 지금의 벡터 장면·초상으로 대신한다. */
let VN_ACT = "";          // 이번 턴 행동
let VN_SHOWN = "";        // 타자 효과를 이미 보여 준 문장
const VN_BG_FALLBACK = {bg_villa_day:["villa","day"], bg_villa_night:["villa","night"], bg_stairs:["door_notice","day"], bg_front_door:["door_notice","sunset"],
  bg_room_clean:["keys_handover","day"], bg_room_messy:["interior","rain"], bg_court:["court","day"], bg_realtor:["realtor","day"], bg_alley:["villa","sunset"]};
const VN_ACT_BG = {visit:"bg_front_door", msg:"bg_alley", notice:"bg_front_door", order:"bg_court", suit:"bg_court", pledge:"bg_court", exec:"bg_front_door",
  offer:"bg_stairs", contract:"bg_realtor", lever:"bg_realtor", proof:"bg_court", lien:"bg_stairs", survey:"bg_alley", hand_full:"bg_room_clean", hand_quick:"bg_room_clean"};
function vnBgSlot(){
  const cut = id => artUrl(id) ? id : null;
  if(G.over && G.over.win && cut("cut_keys")) return "cut_keys";
  if(VN_ACT==="contract" && cut("cut_signing")) return "cut_signing";
  if(VN_ACT==="order" && cut("cut_court_order")) return "cut_court_order";
  if((VN_ACT==="notice" || (G.exec && !G.exec.warned)) && cut("cut_notice")) return "cut_notice";
  if(G.deal && G.week >= G.deal.week - 1 && cut("cut_moving")) return "cut_moving";
  if(G.over) return G.over.win ? "bg_room_clean" : "bg_room_messy";
  if(G.handover) return G.mood < 40 ? "bg_room_messy" : "bg_room_clean";
  if(VN_ACT_BG[VN_ACT]) return VN_ACT_BG[VN_ACT];
  const home = {p_youth:"bg_oneroom", p_cn:"bg_oneroom", p_pk:"bg_factory_dorm", p_mn:"bg_factory_dorm", p_lien:"bg_warehouse"}[G.pid];
  if(home && artUrl(home) && G.week % 3 === 1) return home;
  return G.week % 2 ? "bg_villa_night" : "bg_villa_day";
}
function vnExpr(){ if(G.over) return G.over.win ? "normal" : "angry"; if(G.mood < 35 || G.resist >= 75) return "angry"; if(G.mood >= 60) return "normal"; return "worried"; }
// 원하는 배경 그림이 아직 없으면, 벡터 대신 이미 올라온 '진짜' 배경 중 가장 가까운 걸 쓴다(그림체가 섞이지 않게)
const VN_BG_NEAR = {bg_villa_day:["bg_villa_night","bg_alley"], bg_villa_night:["bg_villa_day","bg_alley"], bg_alley:["bg_villa_day","bg_villa_night"],
  bg_stairs:["bg_front_door","bg_room_messy","bg_room_clean"], bg_front_door:["bg_stairs","bg_room_messy","bg_room_clean"],
  bg_room_messy:["bg_room_clean","bg_front_door"], bg_room_clean:["bg_room_messy"], bg_court:["bg_realtor"], bg_realtor:["bg_court"]};
function vnBgPick(slot){
  if(artUrl(slot)) return slot;
  for(const s of (VN_BG_NEAR[slot]||[])) if(artUrl(s)) return s;
  for(const s of ["bg_room_clean","bg_room_messy","bg_front_door","bg_stairs","bg_villa_day"]) if(artUrl(s)) return s;
  return slot;
}
// ---- 연출: 무엇이 '바뀌었을 때만' 움직인다(같은 화면을 다시 그릴 땐 가만히) ----
const VN_MEM = {};
function vnDiff(ctx, gen, slot, ex, who){
  const p = VN_MEM[ctx] || {}; VN_MEM[ctx] = {gen, slot, ex, who};
  const fresh = p.gen !== gen;
  const prevSlot = !fresh && p.slot && vnBgPick(p.slot) !== vnBgPick(slot) ? p.slot : "";
  return {prevSlot, fadeIn: fresh, enter: !!who && (fresh || p.who !== who), step: !fresh && p.who === who && ex === "angry" && p.ex !== "angry", exch: !fresh && p.who === who && p.ex !== ex};
}
function vnBgLayers(slot, d){
  if(d.prevSlot) return `<div class="vn-bg">${vnBgHTML(d.prevSlot)}</div><div class="vn-bg vn-dissolve">${vnBgHTML(slot)}</div>`;
  return `<div class="vn-bg${d.fadeIn?" vn-dissolve":""}">${vnBgHTML(slot)}</div>`;
}
// ---- 🎛️ 연출 세기(사용자가 슬라이더로 조절, 이 기기에만 저장) ----
const VN_FX_DEF = {shake:6, vig:45, grade:60, speed:22};
const VN_FX = (()=>{ try{ return Object.assign({}, VN_FX_DEF, JSON.parse(localStorage.getItem("vnfx")||"{}")); }catch(e){ return Object.assign({}, VN_FX_DEF); } })();
function vnFxApply(){ const r = document.documentElement.style; r.setProperty("--fx-shake", VN_FX.shake); r.setProperty("--fx-vig", VN_FX.vig/100); r.setProperty("--fx-grade", VN_FX.grade/100); }
vnFxApply();
const VN_FX_ROWS = [["shake","📳 흔들림",0,14,1,"px"],["vig","🌑 가장자리 어둡게",0,90,5,"%"],["grade","🎨 분위기 색보정",0,100,5,"%"],["speed","⌨️ 글자 속도",6,60,2,"ms"]];
function vnFxPanel(){
  return `<details class="panel vn-fx"><summary>🎛️ 연출 조절 <small class="note">흔들림·어둡기·색감·글자 속도</small></summary><div class="vn-fxrows">${VN_FX_ROWS.map(([k,t,a,b,st,u])=>`<label><span>${t}</span><input type="range" min="${a}" max="${b}" step="${st}" value="${VN_FX[k]}" data-vnfx="${k}"><output>${VN_FX[k]}${u}</output></label>`).join("")}</div>
   <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button type="button" class="btn" data-vnfxtest>📳 흔들림 미리 보기</button><button type="button" class="btn" data-vnfxreset>기본값으로</button></div>
   <p class="note" style="margin:8px 0 0">마음에 드는 값이 나오면 숫자를 알려 주세요 — 그 값을 모두의 기본값으로 바꿔 드려요. (지금은 이 기기에만 저장돼요)</p></details>`;
}
document.addEventListener("input", e => { const el = e.target.closest && e.target.closest("[data-vnfx]"); if(!el) return; const k = el.dataset.vnfx; VN_FX[k] = +el.value; const row = VN_FX_ROWS.find(r=>r[0]===k); const o = el.nextElementSibling; if(o) o.textContent = el.value + row[5]; try{ localStorage.setItem("vnfx", JSON.stringify(VN_FX)); }catch(err){} vnFxApply(); });
document.addEventListener("click", e => {
  if(e.target.closest("[data-vnfxreset]")){ Object.assign(VN_FX, VN_FX_DEF); try{ localStorage.removeItem("vnfx"); }catch(err){} vnFxApply(); document.querySelectorAll("[data-vnfx]").forEach(el=>{ el.value = VN_FX[el.dataset.vnfx]; const row = VN_FX_ROWS.find(r=>r[0]===el.dataset.vnfx); if(el.nextElementSibling) el.nextElementSibling.textContent = el.value + row[5]; }); return; }
  if(e.target.closest("[data-vnfxtest]")){ const v = document.querySelector(".vn"); if(v){ v.classList.remove("cam-shake"); void v.offsetWidth; v.classList.add("cam-shake"); } }
});
// ---- 💥 타격감: 수치가 바뀌면 숫자가 튀어 오른다 ----
function vnPop(ctx, gen, stats){
  const k = ctx + "#stats", p = VN_MEM[k]; VN_MEM[k] = {gen, stats};
  if(!p || p.gen !== gen) return {html:"", hit:false};
  const out = []; let hit = false;
  for(const [key, label, good] of [["mood","신뢰",1],["resist","버티기",-1]]){
    const dv = Math.round((stats[key]||0) - (p.stats[key]||0)); if(!dv) continue;
    const ok = dv * good > 0; if(!ok) hit = true;
    out.push(`<span class="vn-pop ${ok?"up":"down"}" style="animation-delay:${out.length*0.12}s">${label} ${dv>0?"+":""}${dv}</span>`);
  }
  return {html: out.length ? `<div class="vn-pops" aria-hidden="true">${out.join("")}</div>` : "", hit};
}
// 분위기(색보정) — 밤·긴장·해피엔딩
function vnMood(slot, ex, win){ return win ? "mood-win" : ex === "angry" ? "mood-tense" : /night|alley|banjiha|warehouse/.test(slot) ? "mood-night" : ""; }
function vnMoveCls(d){ return d.enter ? " mv-enter" : d.step ? " mv-step" : d.exch ? " mv-ex" : ""; }
function vnBgHTML(slot){
  slot = vnBgPick(slot);
  const u = artUrl(slot);
  if(u) return `<img class="vn-bgimg" src="${u}" alt="" decoding="async">`;
  const [k, mood] = VN_BG_FALLBACK[slot] || ["villa","day"];
  return `<div class="vn-bgvec cart m-${mood}">${typeof sceneHTML==="function" ? sceneHTML(k).replace('class="scene"','class="scene"') : ""}<span class="cart-tint"></span>${mood==="night"?'<span class="cart-stars"></span>':""}${mood==="rain"?'<span class="cart-rain"></span>':""}</div>`;
}
function vnSpriteHTML(P, ex, mv){
  const u = artNpc(P.id, ex);
  if(u) return `<img class="vn-sprite ex-${ex}${mv||""}" src="${u}" alt="${esc(P.name)}">`;
  return `<div class="vn-sprite vn-vec ex-${ex}${mv||""}">${avatarHTML(P, 150)}</div>`;
}
function vnTurn(){
  let i = G.log.length - 1; while(i > 0 && G.log[i].who !== "me") i--;
  const turn = G.log.slice(Math.max(0, i));
  const me = turn.find(l=>l.who==="me"), them = turn.filter(l=>l.who==="them").pop(), sys = turn.filter(l=>l.who==="sys");
  return {me, them, sys};
}
function vnStage(P){
  const ex = vnExpr(), slot = vnBgSlot(), t = vnTurn();
  const main = t.them ? {name:P.name.replace(/\s*\(.*\)/,""), text:t.them.t, npc:true} : (t.sys.length ? {name:"", narr:true, text:t.sys[t.sys.length-1].t} : {name:P.name.replace(/\s*\(.*\)/,""), text:(G_LINES.greet && G_LINES.greet[occType(P.type).id]) || "…누구세요?", npc:true});
  const extra = t.them ? t.sys.map(s=>s.t) : t.sys.slice(0,-1).map(s=>s.t);
  const dl = G_DEADLINE - G.week, bar = (v,c)=>`<span class="vn-bar"><i style="width:${Math.max(0,Math.min(100,v))}%;background:${c}"></i></span>`;
  const seg = (v,c) => `<span class="vn-seg">${Array.from({length:8},(_,i)=>`<i style="${i < Math.round(Math.max(0,Math.min(100,v))/12.5) ? `background:${c}` : ""}"></i>`).join("")}</span>`;
  const hud = `<div class="vn-hud"><div class="vn-card"><span class="vn-ico">📅</span><span><small>경과</small><b>${G.week}주차</b></span></div><div class="vn-card"><span class="vn-ico">💸</span><span><small>누적 비용</small><b>${man0(Math.round(gTotal()))}</b></span></div><div class="vn-card"><span class="vn-ico">🛡️</span><span><small>버티기</small>${seg(G.resist,"#ef5a5a")}</span></div><div class="vn-card"><span class="vn-ico">🤝</span><span><small>신뢰도</small>${seg(G.mood,"#4fa3ff")}</span></div>${!G.orderOk&&!G.order&&!G.suit&&dl>0&&dl<=6?`<div class="vn-card warn">⏰ 인도명령 D-${dl}주</div>`:""}</div>`;
  const key = G.week + "|" + main.text;
  const typed = VN_SHOWN === key;
  const pu = artNpc("player", G.over ? (G.over.win ? "normal" : "worried") : "normal"), npu = artNpc(P.id, ex);
  const closeUp = /^cut_/.test(slot) && slot!=="cut_moving" && !!artUrl(slot);   // 손 클로즈업 컷신은 사람을 세우지 않는다
  const d = vnDiff("game", G, slot, ex, closeUp ? "" : P.id);
  const pop = vnPop("game", G, {mood:G.mood, resist:G.resist});
  const shake = d.step || pop.hit;
  const face = main.npc ? (npu ? `<span class="vn-face${["p_pk","p_hwagyo"].includes(P.id)?" grp":""}"><img src="${npu}" alt=""></span>` : `<span class="vn-face vec">${avatarHTML(P,64)}</span>`) : "";
  return `<div class="vn ${vnMood(slot, ex, G.over && G.over.win)}${shake?" cam-shake":""}" data-vnkey="${esc(key)}">${pop.html}${shake?'<span class="vn-flash" aria-hidden="true"></span>':""}${vnBgLayers(slot, d)}${closeUp?"":vnSpriteHTML(P, ex, vnMoveCls(d))}${pu&&!closeUp?`<img class="vn-player" src="${pu}" alt="">`:""}${t.them&&!typed?'<span class="vn-dots" aria-hidden="true">…</span>':""}${hud}
    <div class="vn-box${face?" has-face":""}${main.narr?" narr":""}">${face}${t.me?`<div class="vn-me">▶ ${esc(t.me.t)}</div>`:""}${main.narr?"":`<div class="vn-name${main.npc?"":" sys"}">${esc(main.name)}</div>`}
    <div class="vn-text" id="vnText" data-full="${esc(main.text)}">${typed?esc(main.text):""}</div>${extra.length?`<div class="vn-extra">${extra.map(x=>`<div>📢 ${esc(x)}</div>`).join("")}</div>`:""}<span class="vn-next" aria-hidden="true">▼</span></div></div>`;
}
function vnType(){
  const el = document.getElementById("vnText"), box = document.querySelector(".vn"); if(!el || !box) return;
  const full = el.dataset.full || "", key = box.dataset.vnkey;
  if(VN_SHOWN === key){ el.textContent = full; return; }
  VN_SHOWN = key;
  const top = box.getBoundingClientRect().top; if(top < 90 || top > innerHeight*0.6){ const hd = document.querySelector("header"); const off = (hd && getComputedStyle(hd).position==="sticky" ? hd.offsetHeight : 0) + 10; window.scrollTo({top: scrollY + top - off, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){ el.textContent = full; return; }
  let n = 0; el.textContent = ""; box.classList.add("typing");
  const tick = () => { if(!document.body.contains(el)) return; n += 2; el.textContent = full.slice(0, n); if(n < full.length) el._t = setTimeout(tick, VN_FX.speed); else box.classList.remove("typing"); };
  tick();
  box.addEventListener("click", () => { clearTimeout(el._t); el.textContent = full; box.classList.remove("typing"); }, {once:true});
}
