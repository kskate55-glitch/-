/* ================= 📖 외전 — 사건과 사건 사이의 긴 이야기(비주얼노벨형 실무 학습) =================
   캐릭터마다 첫 번째·세 번째 스토리 사건이 끝나면 방에 '새 이야기' 알림이 뜬다(강제 재생 없음).
   · 대본은 il_<ID>.js의 script(작은 문법)로 쓰고, 여기서 한 줄짜리 명령 목록(pc)으로 바꿔 돌린다.
   · 외전 안의 숫자·계산·체험은 모두 교육용 가상 사례다 — 본편 현금·보증금·입찰가·RNG를 건드리지 않는다.
   · 저장: cpRec().il = {v, eps:{ID:{st, pc, scene, ver, picks, sheets, seen}}, notes:{}} — index가 아니라
     장면 id + 버전으로 이어 읽기를 보호한다(대본이 바뀌면 그 장면 처음부터).
   ---------------------------------------------------------------------------------------------
   대본 문법 (script)
     # 장면id | bg=배경 | music=main|focus|calm | title=장면 제목 | cg=그림칸
     [이름] 대사              [이름|happy] 표정 지정(normal happy shocked worried angry tired)
     [이름·속마음] 생각       [이름·메시지] / [이름·메신저] / [이름·전화] / [이름·알림] 메시지 말풍선
     [나레이션] 지문          [시스템 안내] / [시스템 카드] 카드형 안내
     @if 조건 / @elif 조건 / @else / @end        조건: profit loss nodeal (사건 결과) + ilCond 표의 키
     @choice  다음 줄부터  > a | 선택지 문구   …  @when a / @when b / @end  (갈래는 다시 합류)
     @sheet 시트id        실무 조작 화면(시트 정의는 sheets:{})
     @note 노트id          실무노트 한 장 해금(조용히 토스트)
     @cg 그림칸            대표 그림을 배경 위에 띄운다(@cg off 로 내림)
     // 주석               빈 줄은 무시
   ============================================================================================= */
const IL = {};                 // id → 정의(파싱된 프로그램 포함)
const IL_ORDER = [];
const IL_NAMES = {서윤:"seoyun", 도현:"dohyun", 미정:"mijeong", 재훈:"jaehoon", 은경:"eunkyung", 태식:"taesik"};
const IL_FACES = ["normal","happy","shocked","worried","angry","tired"];
const IL_MSG_TAGS = ["메시지","메신저","전화","알림","개인 메시지","문자","카톡"];
const IL_DISCLAIM = "교육용 가상 사례예요. 실제로 진행하기 전에는 해당 기관·전문가에게 확인하세요.";

function ilParse(def){
  const prog = [], scenes = [], errs = [];
  const lines = String(def.script || "").split("\n");
  const stack = [];   // {type:"if"|"choice", ...}
  let curScene = null;
  const push = n => { prog.push(n); return prog.length - 1; };
  for(let ln = 0; ln < lines.length; ln++){
    const raw = lines[ln], s = raw.trim();
    if(!s || s.startsWith("//")) continue;
    if(s.startsWith("# ")){
      const parts = s.slice(2).split("|").map(x => x.trim());
      const sc = {id:parts[0], bg:null, music:"main", title:"", cg:null};
      parts.slice(1).forEach(p => { const m = p.match(/^(\w+)\s*=\s*(.*)$/); if(m) sc[m[1]] = m[2].trim(); });
      if(scenes.find(x => x.id === sc.id)) errs.push(`장면 id 중복: ${sc.id}`);
      sc.pc = push({k:"scene", id:sc.id, bg:sc.bg, music:sc.music, title:sc.title, cg:sc.cg});
      scenes.push(sc); curScene = sc; continue;
    }
    if(!curScene){ errs.push(`${ln + 1}행: 장면(#) 앞에 내용이 있다`); continue; }
    if(s.startsWith("@")){
      const [cmd, ...rest] = s.slice(1).split(/\s+/); const arg = rest.join(" ").trim();
      if(cmd === "if"){ const pc = push({k:"cond", br:[], end:-1}); prog[pc].br.push({c:arg, to:prog.length}); stack.push({type:"if", pc, jumps:[]}); continue; }
      if(cmd === "elif" || cmd === "else"){
        const top = stack[stack.length - 1]; if(!top || top.type !== "if"){ errs.push(`${ln + 1}행: @${cmd} 짝 없음`); continue; }
        top.jumps.push(push({k:"jump", to:-1})); prog[top.pc].br.push({c:cmd === "else" ? "else" : arg, to:prog.length}); continue;
      }
      if(cmd === "choice"){ const pc = push({k:"choice", opts:[], end:-1}); stack.push({type:"choice", pc, jumps:[], collecting:true}); continue; }
      if(cmd === "when"){
        const top = stack[stack.length - 1]; if(!top || top.type !== "choice"){ errs.push(`${ln + 1}행: @when 짝 없음`); continue; }
        if(!top.collecting) top.jumps.push(push({k:"jump", to:-1}));
        top.collecting = false;
        const o = prog[top.pc].opts.find(x => x.id === arg); if(!o){ errs.push(`${ln + 1}행: 선택지 ${arg} 없음`); continue; }
        o.to = prog.length; continue;
      }
      if(cmd === "end"){
        const top = stack.pop(); if(!top){ errs.push(`${ln + 1}행: @end 짝 없음`); continue; }
        const end = prog.length;
        top.jumps.forEach(j => prog[j].to = end); prog[top.pc].end = end;
        if(top.type === "choice") prog[top.pc].opts.forEach(o => { if(o.to == null) errs.push(`${ln + 1}행: 선택지 ${o.id}에 @when 없음`); });
        continue;
      }
      if(cmd === "sheet"){ push({k:"sheet", id:arg}); if(!(def.sheets || {})[arg]) errs.push(`${ln + 1}행: 시트 ${arg} 정의 없음`); continue; }
      if(cmd === "note"){ push({k:"note", id:arg}); if(!(def.notes || []).find(n => n.id === arg)) errs.push(`${ln + 1}행: 노트 ${arg} 정의 없음`); continue; }
      if(cmd === "cg"){ push({k:"cg", id:arg}); continue; }
      errs.push(`${ln + 1}행: 모르는 명령 @${cmd}`); continue;
    }
    if(s.startsWith(">")){
      const top = stack[stack.length - 1]; if(!top || top.type !== "choice" || !top.collecting){ errs.push(`${ln + 1}행: '>' 선택지가 @choice 밖에 있다`); continue; }
      const m = s.slice(1).trim().match(/^(\w+)\s*\|\s*(.+)$/); if(!m){ errs.push(`${ln + 1}행: 선택지 형식은 '> id | 문구'`); continue; }
      prog[top.pc].opts.push({id:m[1], t:m[2], to:null}); continue;
    }
    const m = s.match(/^\[([^\]]+)\]\s*(.*)$/);
    if(!m){ errs.push(`${ln + 1}행: [이름] 없는 줄 — ${s.slice(0, 30)}`); continue; }
    let [, head, text] = m; let ex = "normal";
    const bar = head.indexOf("|"); if(bar >= 0){ ex = head.slice(bar + 1).trim(); head = head.slice(0, bar).trim(); if(!IL_FACES.includes(ex)){ errs.push(`${ln + 1}행: 표정 ${ex}`); ex = "normal"; } }
    let who = head, kind = "say", tag = "";
    if(head === "나레이션" || head === "지문"){ kind = "narr"; who = ""; }
    else if(head.startsWith("시스템")){ kind = "sys"; who = head; }
    else {
      const dot = head.indexOf("·");
      if(dot >= 0){ const t = head.slice(dot + 1).trim(); who = head.slice(0, dot).trim(); tag = t; if(t === "속마음") kind = "thought"; else if(IL_MSG_TAGS.some(x => t.startsWith(x))) kind = "msg"; }
    }
    if(!text) errs.push(`${ln + 1}행: 빈 대사`);
    push({k:"line", who, tag, kind, ex, t:text});
  }
  if(stack.length) errs.push(`닫히지 않은 블록 ${stack.length}개`);
  push({k:"end"});
  return {prog, scenes, errs};
}
function IL_DEF(def){
  const P = ilParse(def);
  Object.assign(def, P, {ver:def.ver || 1});
  if(P.errs.length && typeof console !== "undefined") console.warn(`[외전 ${def.id}]`, P.errs);
  if(!IL[def.id]) IL_ORDER.push(def.id);
  IL[def.id] = def;
  ilTracks(def);
  if(typeof ilSlot === "function") ilSlot(def);
  return def;
}

/* ---------- 🎵 외전 음악 — 캐릭터 오프닝 곡의 뼈대(멜로디 음역·화성)는 두고 편곡만 바꾼다 ---------- */
function ilTracks(def){
  if(typeof KA_TRACKS === "undefined") return;
  const base = KA_TRACKS["op_" + def.ch]; if(!base) return;
  const A = def.arrange || {};
  KA_TRACKS["il_" + def.id] = Object.assign({}, base, {bpm:Math.round(base.bpm * (A.tempo || 0.9)), pad:(base.pad || 0.04) * 1.2, lp:Math.round((base.lp || 1600) * (A.bright || 1)), kick:A.kick != null ? A.kick : base.kick, hat:A.hat != null ? A.hat : base.hat, snare:"", arpWave:A.wave || base.arpWave, arpV:(base.arpV || 0.05) * 0.85});
  KA_TRACKS["il_" + def.id + "_focus"] = Object.assign({}, base, {bpm:Math.round(base.bpm * 0.8), kick:"", snare:"", hat:"........1.......", arp:"0...1...2...1...", arpWave:"sine", lp:1200, pad:0.05, arpV:0.045});
  KA_TRACKS["il_" + def.id + "_calm"] = Object.assign({}, base, {bpm:Math.round(base.bpm * 0.75), kick:"", snare:"", hat:"", arp:"0.......2.......", arpWave:"triangle", lp:1000, pad:0.06, arpV:0.04});
  if(typeof KA_NAME !== "undefined") KA_NAME["il_" + def.id] = "BGM_IL_" + def.id;
}

/* ---------- 기록 ---------- */
function ilRec(){
  const P = typeof cpRec === "function" ? cpRec() : (window.__IL_FALLBACK = window.__IL_FALLBACK || {});
  if(!P.il || typeof P.il !== "object") P.il = {v:1, eps:{}, notes:{}, cfg:{}};
  ["eps", "notes", "cfg"].forEach(k => { if(!P.il[k] || typeof P.il[k] !== "object") P.il[k] = {}; });
  return P.il;
}
function ilState(id){ const R = ilRec(); if(!R.eps[id] || typeof R.eps[id] !== "object") R.eps[id] = {st:"locked"}; return R.eps[id]; }
function ilSave(){ if(typeof save === "function") try{ save(); }catch(e){} }
function ilCaseRec(def){ try{ const r = epOf(def.ch).res[def.after]; return r || null; }catch(e){ return null; } }
function ilOpen(def){ if(typeof def.open === "function"){ try{ return !!def.open(def); }catch(e){ return false; } } return !!ilCaseRec(def); }   // 그 사건을 끝냈으면 열린다
function ilSync(){   // 열린 외전을 locked → available 로
  let any = null;
  IL_ORDER.forEach(id => { const d = IL[id]; if(d.hidden) return; const S = ilState(id); if(S.st === "locked" && ilOpen(d)){ S.st = "available"; S.since = Date.now(); any = id; } });
  return any;
}
function ilOutcome(def){
  const r = ilCaseRec(def); if(!r) return "nodeal";
  if(r.lost || !r.full && r.profit == null) return "nodeal";
  if(r.profit > 0) return "profit";
  return r.profit < 0 ? "loss" : "nodeal";
}
const ilCond = {   // 대본 @if 조건 — 필요한 외전이 여기에 키를 더한다
  profit:d => ilOutcome(d) === "profit", loss:d => ilOutcome(d) === "loss", nodeal:d => ilOutcome(d) === "nodeal", deal:d => ilOutcome(d) !== "nodeal"};
function ilWon(v){ v = Math.round(v); return (v < 0 ? "−" : "") + Math.abs(v).toLocaleString("ko-KR") + "만원"; }
const ilVars = {
  profit:d => { const r = ilCaseRec(d); return r ? ilWon(Math.abs(r.profit || 0)) : ""; },
  caseName:d => { try{ const ep = EP_PLAN[d.ch].eps[d.after]; return `「${ep.name}」`; }catch(e){ return ""; } }};
function ilFill(def, t){ return String(t).replace(/\{\{(\w+)\}\}/g, (m, k) => { const f = ilVars[k]; const v = f ? f(def) : null; return v == null || v === "" ? m : v; }); }

/* ---------- 🗒️ 설정(글자 속도·자동 간격) — 이 브라우저에만 ---------- */
function ilCfg(){ try{ return Object.assign({speed:"normal", auto:false, gap:1}, JSON.parse(localStorage.getItem("il_cfg") || "{}")); }catch(e){ return {speed:"normal", auto:false, gap:1}; } }
function ilCfgSet(o){ const c = Object.assign(ilCfg(), o); try{ localStorage.setItem("il_cfg", JSON.stringify(c)); }catch(e){} return c; }
const IL_SPEED = {slow:1, normal:2, fast:4, instant:9999};

/* ---------- ▶ 재생기 ---------- */
let ILR = null;   // {id, def, pc, el, typing, t, log:[], sheet, album, lastAdv}
function ilStart(id, opt){
  opt = opt || {};
  const def = IL[id]; if(!def) return;
  ilClose(true);
  const S = ilState(id), album = !!opt.album;
  let pc = 0;
  if(!album && !opt.restart && S.st === "reading" && S.scene){
    const sc = def.scenes.find(x => x.id === S.scene);
    pc = sc ? (S.ver === def.ver && S.pc > sc.pc && S.pc < def.prog.length ? S.pc : sc.pc) : 0;
  }
  if(!album){ S.st = "reading"; S.ver = def.ver; if(!S.picks) S.picks = {}; if(!S.sheets) S.sheets = {}; if(!S.seen) S.seen = {}; ilSave(); }
  const el = document.createElement("div"); el.id = "ilRoot"; el.className = "il-root"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `외전 ${def.title}`);
  el.innerHTML = `<div class="il-bg"></div><div class="il-cg" hidden></div><div class="il-who-art"></div>
    <div class="il-top"><span class="il-badge">📖 외전 · ${esc(ilCharName(def.ch))}</span><b class="il-scene-t"></b>
      <div class="il-tools"><button type="button" data-il="log" title="지난 대사">📜 기록</button><button type="button" data-il="auto" aria-pressed="false">▶ 자동</button><button type="button" data-il="cfg">⚙️ 설정</button><button type="button" data-il="scenes">🗂️ 장면</button><button type="button" data-il="skip">⏭ 건너뛰기</button><button type="button" data-il="later">💾 나중에 계속</button></div></div>
    <div class="il-box" tabindex="0"><div class="il-name"></div><div class="il-text" aria-live="polite"></div><span class="il-next" aria-hidden="true">▼</span></div>
    <div class="il-choice" hidden></div><div class="il-panel" hidden></div>`;
  document.body.appendChild(el);
  ILR = {id, def, pc, el, log:[], album, lastAdv:0};
  ilTopFit();
  if(typeof kaWant === "function" && typeof kaCfg === "function" && !kaCfg().mute){ try{ KA_UNLOCKED = true; kaCtx(); kaWant("il_" + id); }catch(e){} }
  el.querySelector('[data-il="auto"]').setAttribute("aria-pressed", String(ilCfg().auto));
  if(pc > 0){ const sc = [...def.scenes].reverse().find(x => x.pc <= pc); if(sc) ilApplyScene(sc, true); }
  ilRun();
  setTimeout(() => { const b = el.querySelector(".il-box"); if(b) b.focus({preventScroll:true}); }, 30);
}
function ilTopFit(){ if(!ILR) return; const t = ILR.el.querySelector(".il-top"); if(t) ILR.el.style.setProperty("--il-top", Math.ceil(t.getBoundingClientRect().height) + "px"); }
if(typeof window !== "undefined" && window.addEventListener) window.addEventListener("resize", () => { try{ ilTopFit(); }catch(e){} });
function ilCharName(ch){ const C = typeof LF_CHARS !== "undefined" ? LF_CHARS.find(x => x.id === ch) : null; return C ? C.name : ch; }
function ilBgUrl(key, def){
  if(!key) key = "room";
  if(key === "room"){ try{ const a = LF_CHAR_ART[def.ch].room; if(a) return lfBlob(a); }catch(e){} key = "bg_room_clean"; }
  if(typeof artUrl === "function"){ const u = artUrl(key); if(u) return u; }
  return typeof artUrl === "function" ? artUrl("bg_room_clean") : null;
}
function ilApplyScene(n, quiet){
  const R = ILR; if(!R) return;
  const bg = R.el.querySelector(".il-bg"), u = ilBgUrl(n.bg, R.def), img = document.createElement("div");
  img.className = "il-bgimg"; img.style.backgroundImage = u ? `url("${u}")` : "none"; bg.appendChild(img);
  requestAnimationFrame(() => img.classList.add("on"));
  [...bg.children].slice(0, -1).forEach(x => { x.classList.remove("on"); setTimeout(() => x.remove(), 700); });
  R.el.querySelector(".il-scene-t").textContent = n.title || "";
  R.scene = n.id; R.music = n.music || "main";
  ilMusic();
  ilCg(n.cg || null);
  if(!R.album){ const S = ilState(R.id); S.scene = n.id; }
  if(!quiet && n.title && typeof gxBanner === "function") try{ gxBanner("place", {big:esc(n.title), sub:""}); }catch(e){}
}
function ilMusic(){
  const R = ILR; if(!R || typeof kaWant !== "function" || typeof kaCfg !== "function" || kaCfg().mute) return;
  const k = R.panel === "sheet" ? "_focus" : R.music === "focus" ? "_focus" : R.music === "calm" ? "_calm" : "";
  try{ kaWant("il_" + R.id + k); }catch(e){}
}
function ilCg(id){
  const R = ILR; if(!R) return; const box = R.el.querySelector(".il-cg");
  const u = id && id !== "off" && typeof artUrl === "function" ? artUrl(id) : null;
  if(!u){ box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false; box.innerHTML = `<img src="${u}" alt="">`;
}
function ilRun(){   // 다음 '보여 줄 것'(대사·선택지·시트·끝)까지 명령을 실행한다
  const R = ILR; if(!R) return;
  for(let guard = 0; guard < 5000; guard++){
    const n = R.def.prog[R.pc];
    if(!n || n.k === "end") return ilFinish();
    if(n.k === "scene"){ ilApplyScene(n); R.pc++; continue; }
    if(n.k === "cond"){ const b = n.br.find(x => x.c === "else" || ilTest(x.c)); R.pc = b ? b.to : n.end; continue; }
    if(n.k === "jump"){ R.pc = n.to; continue; }
    if(n.k === "note"){ ilUnlockNote(R.def, n.id); R.pc++; continue; }
    if(n.k === "cg"){ ilCg(n.id); R.pc++; continue; }
    if(n.k === "choice") return ilShowChoice(n);
    if(n.k === "sheet") return ilShowSheet(n.id);
    if(n.k === "line") return ilShowLine(n);
    R.pc++;
  }
}
function ilTest(c){ const f = ilCond[c]; try{ return !!(f && f(ILR.def, ILR)); }catch(e){ return false; } }
function ilSpeaker(n){
  const id = IL_NAMES[n.who] || (n.who && Object.keys(IL_NAMES).find(k => n.who.startsWith(k)) ? IL_NAMES[Object.keys(IL_NAMES).find(k => n.who.startsWith(k))] : null);
  return id;
}
function ilShowLine(n){
  const R = ILR, box = R.el.querySelector(".il-box"), tx = box.querySelector(".il-text"), nm = box.querySelector(".il-name");
  const text = ilFill(R.def, n.t);
  box.className = "il-box il-" + n.kind; box.hidden = false; R.el.querySelector(".il-choice").hidden = true;
  nm.textContent = n.kind === "narr" ? "" : n.kind === "thought" ? `${n.who} (속마음)` : n.tag && n.kind === "msg" ? `${n.who} · ${n.tag}` : n.who;
  // 초상: 주인공이면 표정 그림, 아니면 이름 머리글자
  const art = R.el.querySelector(".il-who-art"), cid = ilSpeaker(n);
  if(cid && typeof LF_CHAR_ART !== "undefined" && LF_CHAR_ART[cid] && n.kind !== "msg"){
    const f = LF_CHAR_ART[cid].face[n.ex] || LF_CHAR_ART[cid].face.normal;
    art.className = "il-who-art on" + (n.kind === "thought" ? " thought" : ""); art.innerHTML = `<img src="${lfBlob(f)}" alt="${esc(n.who)}">`;
  } else if(n.kind === "say" && n.who){ art.className = "il-who-art on npc"; art.innerHTML = `<span>${esc(n.who.replace(/\(.*\)/, "").trim().slice(0, 2))}</span>`; }
  else { art.className = "il-who-art"; art.innerHTML = ""; }
  R.log.push(R.pc); if(R.log.length > 600) R.log.shift();
  if(!R.album){ const S = ilState(R.id); S.pc = R.pc; S.seen[R.pc] = 1; }
  clearTimeout(R.t); clearTimeout(tx._t);
  const step = IL_SPEED[ilCfg().speed] || 2, reduce = typeof gxLevel === "function" && gxLevel() === "min";
  if(step >= 999 || reduce){ tx.textContent = text; R.typing = false; ilAutoArm(text); return; }
  let i = 0; tx.textContent = ""; R.typing = true; R.full = text;
  const tick = () => { if(ILR !== R) return; i += step; tx.textContent = text.slice(0, i); if(i < text.length) tx._t = setTimeout(tick, 28); else { R.typing = false; ilAutoArm(text); } };
  tick();
}
function ilAutoArm(text){
  const R = ILR; if(!R || !ilCfg().auto || R.panel) return;
  clearTimeout(R.t); const g = ilCfg().gap || 1;
  R.t = setTimeout(() => { if(ILR === R && !R.panel) ilAdvance(true); }, Math.round((1400 + String(text).length * 55) * g));
}
function ilAdvance(auto){
  const R = ILR; if(!R || R.panel || R.done) return;
  const now = Date.now(); if(!auto && now - R.lastAdv < 140) return; R.lastAdv = now;
  const n = R.def.prog[R.pc]; if(!n || n.k !== "line") return;
  const tx = R.el.querySelector(".il-text");
  if(R.typing){ clearTimeout(tx._t); tx.textContent = R.full; R.typing = false; ilAutoArm(R.full); return; }   // 첫 입력은 문장 완성
  clearTimeout(R.t); R.pc++; if(!R.album) ilSave(); ilRun();
}
function ilShowChoice(n){
  const R = ILR, ch = R.el.querySelector(".il-choice");
  clearTimeout(R.t);
  ch.hidden = false; ch.innerHTML = `<p>어떻게 할까?</p>` + n.opts.map(o => `<button type="button" class="btn" data-ilpick="${esc(o.id)}">${esc(o.t)}</button>`).join("");
  R.choosing = n;
  const b = ch.querySelector("button"); if(b) b.focus({preventScroll:true});
}
function ilPick(oid){
  const R = ILR; if(!R || !R.choosing) return; const n = R.choosing, o = n.opts.find(x => x.id === oid); if(!o) return;
  R.choosing = null; R.el.querySelector(".il-choice").hidden = true;
  R.log.push({pick:o.t});
  if(!R.album){ const S = ilState(R.id); S.picks[R.pc] = oid; }
  R.pc = o.to; if(!R.album) ilSave(); ilRun();
}
function ilFinish(){
  const R = ILR; if(!R) return; R.done = true;
  const def = R.def;
  if(!R.album){ const S = ilState(R.id); if(S.st !== "skipped") S.st = "read"; S.readAt = Date.now(); S.pc = 0; S.scene = null; (def.notes || []).forEach(nt => { if(nt.auto !== false) ilUnlockNote(def, nt.id, true); }); ilSave(); }
  if(typeof kcSfx === "function") kcSfx("stamp");
  const cgU = def.cg && typeof artUrl === "function" ? artUrl(def.cg) : null;
  ilPanel(`${cgU ? `<img class="il-end-cg" src="${cgU}" alt="">` : ""}<div class="il-end"><small>외전 · ${esc(ilCharName(def.ch))}</small><h2>「${esc(def.title)}」</h2><p>${esc(def.endLine || "이야기를 끝까지 읽었어요.")}</p>
    ${(def.notes || []).length ? `<p class="il-end-note">📒 실무노트 ${def.notes.length}장이 방의 <b>📚 외전</b>에 남았어요.</p>` : ""}
    <div class="il-row"><button type="button" class="btn" data-il="notes">📒 실무노트 보기</button><button type="button" class="btn pri" data-il="close">방으로 돌아가기</button></div></div>`, "end");
}
function ilClose(silent){
  const R = ILR; if(!R) return; ILR = null; clearTimeout(R.t);
  try{ const tx = R.el.querySelector(".il-text"); clearTimeout(tx._t); }catch(e){}
  R.el.remove();
  if(typeof kaWant === "function" && typeof kaScene === "function") try{ kaWant(kaScene()); }catch(e){}
  if(!silent && typeof renderArena === "function" && typeof page !== "undefined" && page === "arena") try{ renderArena(); }catch(e){}
}
function ilLater(){ const R = ILR; if(!R) return; if(!R.album){ const S = ilState(R.id); S.pc = R.pc; ilSave(); } ilClose(); if(typeof HUB_TOAST !== "undefined") try{ HUB_TOAST.push({t:"💾 외전 — 읽던 곳을 저장했어요. 방의 📚 외전에서 이어 읽기"}); }catch(e){} }
function ilSkip(){
  const R = ILR; if(!R) return;
  if(!R.album){ const S = ilState(R.id); S.st = "skipped"; S.pc = 0; S.scene = null; (R.def.notes || []).forEach(nt => ilUnlockNote(R.def, nt.id, true)); ilSave(); }
  ilClose();
}

/* ---------- 패널(기록·설정·장면·노트·시트·끝) — 열려 있는 동안 자동 진행은 멈춘다 ---------- */
function ilPanel(html, kind){
  const R = ILR; if(!R) return; const p = R.el.querySelector(".il-panel");
  clearTimeout(R.t); R.panel = kind || "panel"; p.hidden = false; p.className = "il-panel il-panel-" + (kind || "panel"); p.innerHTML = html; p.scrollTop = 0;
  ilMusic();
  const f = p.querySelector("button,input,select"); if(f) f.focus({preventScroll:true});
}
function ilPanelClose(){ const R = ILR; if(!R) return; const p = R.el.querySelector(".il-panel"); p.hidden = true; p.innerHTML = ""; const was = R.panel; R.panel = null; ilMusic(); if(was !== "sheet"){ const n = R.def.prog[R.pc]; if(n && n.k === "line" && !R.typing) ilAutoArm(ilFill(R.def, n.t)); } }
function ilLogHTML(){
  const R = ILR, rows = R.log.slice(-120).map(x => {
    if(typeof x === "object") return `<li class="pick">▸ ${esc(x.pick)}</li>`;
    const n = R.def.prog[x]; if(!n) return "";
    const who = n.kind === "narr" ? "" : n.kind === "thought" ? `${n.who} (속마음)` : n.who;
    return `<li class="${n.kind}">${who ? `<b>${esc(who)}</b>` : ""}<span>${esc(ilFill(R.def, n.t))}</span></li>`;
  }).join("");
  return `<h3>📜 지난 대사</h3><p class="note">다시 읽기만 해요 — 선택이나 계산이 다시 실행되지 않아요.</p><ol class="il-log">${rows || "<li>아직 없어요.</li>"}</ol><div class="il-row"><button type="button" class="btn pri" data-il="panelx">닫기</button></div>`;
}
function ilCfgHTML(){
  const c = ilCfg(), mute = typeof kaCfg === "function" ? kaCfg().mute : false;
  const opt = (k, v, t) => `<button type="button" class="btn${c[k] === v ? " pri" : ""}" data-ilcfg="${k}:${v}">${t}</button>`;
  return `<h3>⚙️ 읽기 설정</h3>
    <div class="il-cfg"><b>글자 속도</b><div>${opt("speed","slow","느리게")}${opt("speed","normal","보통")}${opt("speed","fast","빠르게")}${opt("speed","instant","즉시 표시")}</div></div>
    <div class="il-cfg"><b>자동 읽기 간격</b><div>${opt("gap",1.6,"여유 있게")}${opt("gap",1,"보통")}${opt("gap",0.6,"짧게")}</div></div>
    <div class="il-cfg"><b>소리</b><div><button type="button" class="btn" data-il="mute">${mute ? "🔇 꺼짐 — 켜기" : "🔊 켜짐 — 끄기"}</button></div></div>
    <p class="note">자동 읽기는 선택지·자료 화면·이 창이 열려 있을 땐 멈춰요. 외전을 읽는 동안 본편의 날짜·이자·체력은 흐르지 않아요.</p>
    <div class="il-row"><button type="button" class="btn pri" data-il="panelx">닫기</button></div>`;
}
function ilScenesHTML(){
  const R = ILR, S = ilState(R.id);
  return `<h3>🗂️ 장면</h3><ol class="il-scenes">${R.def.scenes.map((sc, i) => { const cur = sc.id === R.scene, seen = R.album || Object.keys(S.seen || {}).some(k => +k >= sc.pc && (i + 1 >= R.def.scenes.length || +k < R.def.scenes[i + 1].pc));
    return `<li class="${cur ? "cur" : ""}">${cur ? "▶ " : seen ? "✓ " : "· "}${esc(sc.title || sc.id)}${seen && !cur ? ` <button type="button" class="btn sm" data-ilgo="${esc(sc.id)}">여기부터</button>` : ""}</li>`; }).join("")}</ol>
    <p class="note">읽은 장면만 다시 고를 수 있어요.</p><div class="il-row"><button type="button" class="btn pri" data-il="panelx">닫기</button></div>`;
}
function ilGoScene(sid){ const R = ILR; if(!R) return; const sc = R.def.scenes.find(x => x.id === sid); if(!sc) return; ilPanelClose(); R.pc = sc.pc; ilRun(); }

/* ---------- 📒 실무노트 ---------- */
function ilUnlockNote(def, nid, quiet){
  const R = ilRec(), key = def.id + ":" + nid; if(R.notes[key]) return; R.notes[key] = Date.now();
  if(!quiet && ILR && !ILR.album && typeof gxBanner === "function"){ const nt = (def.notes || []).find(x => x.id === nid); try{ gxBanner("place", {big:"📒 실무노트", sub:esc(nt ? nt.t : "")}); }catch(e){} }
}
function ilNoteHTML(def, only){
  const R = ilRec();
  const notes = (def.notes || []).filter(nt => !only || R.notes[def.id + ":" + nt.id]);
  const body = notes.map(nt => `<section class="il-note"><h4>📒 ${esc(nt.t)}</h4>${(nt.body || []).map(p => `<p>${esc(p)}</p>`).join("")}
      ${nt.table ? `<div class="il-tbl-wrap"><table class="il-tbl">${nt.table.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div>` : ""}
      ${nt.list ? `<ul>${nt.list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</section>`).join("");
  const refs = (def.refs || []).map(k => IL_REFS[k]).filter(Boolean);
  return `<h3>📒 실무노트 — 「${esc(def.title)}」</h3><p class="note">⚠️ ${esc(IL_DISCLAIM)}</p>${body || "<p>아직 연 노트가 없어요.</p>"}
    ${refs.length ? `<details class="il-refs"><summary>🔗 참고자료 ${refs.length}개 (확인일 ${IL_REF_DATE})</summary><ul>${refs.map(r => `<li><b>${esc(r.t)}</b><br><a href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">${esc(r.u)}</a><br><small>${esc(r.use)}</small></li>`).join("")}</ul></details>` : ""}`;
}

/* ---------- 🧮 실무 조작 화면 — sort(분류) · pick(대조·고르기) · calc(가정 바꿔 보기) · doc(자료 보기) ----------
   어느 쪽이든 '직접 해 보기'와 '설명 보고 진행'을 다 열어 둔다. 틀려도 돈·기능 불이익은 없다. */
function ilShowSheet(sid){
  const R = ILR, def = R.def, sh = (def.sheets || {})[sid]; if(!sh){ R.pc++; return ilRun(); }
  R.sheetId = sid; R.sheetSt = {};
  const S = R.album ? {} : ilState(R.id); const prev = S.sheets && S.sheets[sid];
  if(prev && prev.vals) R.sheetSt.vals = Object.assign({}, prev.vals);
  ilPanel(ilSheetHTML(sh), "sheet");
}
function ilSheetHTML(sh){
  const R = ILR, st = R.sheetSt;
  const head = `<div class="il-sh-head"><small>🧮 실무 조작 · 교육용 가상 자료</small><h3>${esc(sh.title)}</h3>${sh.prompt ? `<p>${esc(sh.prompt)}</p>` : ""}</div>`;
  const docRows = sh.doc ? `<div class="il-doc">${sh.doc.title ? `<b>${esc(sh.doc.title)}</b>` : ""}<table>${sh.doc.rows.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("")}</table>${sh.doc.foot ? `<small>${esc(sh.doc.foot)}</small>` : ""}</div>` : "";
  let mid = "";
  if(sh.type === "sort"){
    st.ans = st.ans || {};
    mid = `<ol class="il-sort">${sh.items.map((it, i) => { const a = st.ans[i], ok = st.checked ? a === it.b : null;
      return `<li class="${ok === true ? "ok" : ok === false ? "bad" : ""}"><span>${esc(it.t)}</span><div class="il-bk">${sh.buckets.map(b => `<button type="button" class="btn sm${a === b.id ? " pri" : ""}" data-ilsort="${i}:${esc(b.id)}">${esc(b.t)}</button>`).join("")}</div>${st.checked && it.why && (ok === false || st.shown) ? `<small class="why">${ok === false ? "✗ " : "✓ "}${esc(it.why)}</small>` : ""}</li>`; }).join("")}</ol>`;
  } else if(sh.type === "pick"){
    st.ans = st.ans || {};
    mid = `<ol class="il-pick">${sh.fields.map((f, i) => { const a = st.ans[i], ok = st.checked ? a === f.ans : null;
      return `<li class="${ok === true ? "ok" : ok === false ? "bad" : ""}"><b>${esc(f.label)}</b>${f.draft != null ? `<em>초안: ${esc(f.draft)}</em>` : ""}<div class="il-bk">${f.opts.map((o, j) => `<button type="button" class="btn sm${a === j ? " pri" : ""}" data-ilpickf="${i}:${j}">${esc(o)}</button>`).join("")}</div>${st.checked && f.why && (ok === false || st.shown) ? `<small class="why">${esc(f.why)}</small>` : ""}</li>`; }).join("")}</ol>`;
  } else if(sh.type === "calc"){
    st.vals = st.vals || {}; sh.inputs.forEach(inp => { if(st.vals[inp.id] == null) st.vals[inp.id] = inp.def; });
    let rows = []; try{ rows = sh.rows(st.vals) || []; }catch(e){ rows = [["계산 오류", String(e.message || e)]]; }
    mid = `<div class="il-calc-in">${sh.inputs.map(inp => `<div class="il-cfg"><b>${esc(inp.label)}</b><div>${inp.opts.map(o => `<button type="button" class="btn sm${st.vals[inp.id] === o.v ? " pri" : ""}" data-ilcalc="${esc(inp.id)}:${esc(String(o.v))}">${esc(o.t)}</button>`).join("")}</div></div>`).join("")}</div>
      <div class="il-tbl-wrap"><table class="il-tbl il-calc">${rows.map(r => `<tr class="${r[2] || ""}"><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("")}</table></div>`;
    st.checked = true;
  } else if(sh.type === "doc"){ st.checked = true; }
  const foot = sh.foot ? `<ul class="il-foot">${sh.foot.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const allAns = sh.type === "sort" ? sh.items.every((_, i) => st.ans[i] != null) : sh.type === "pick" ? sh.fields.every((_, i) => st.ans[i] != null) : true;
  const right = sh.type === "sort" ? sh.items.every((it, i) => st.ans[i] === it.b) : sh.type === "pick" ? sh.fields.every((f, i) => st.ans[i] === f.ans) : true;
  const msg = st.checked && (sh.type === "sort" || sh.type === "pick") ? (right ? `<p class="il-ok">✓ ${esc(sh.okText || "맞아요. 그대로 진행해요.")}</p>` : `<p class="il-bad">표시된 줄의 설명을 보고 다시 골라 보세요. '설명 보고 진행'으로 넘어가도 괜찮아요.</p>`) : "";
  const btns = (sh.type === "sort" || sh.type === "pick")
    ? `<button type="button" class="btn" data-ilsheet="show">📖 설명 보고 진행</button>${right && st.checked ? `<button type="button" class="btn pri" data-ilsheet="done">계속 읽기 ▶</button>` : `<button type="button" class="btn pri" data-ilsheet="check"${allAns ? "" : " disabled"}>확인</button>`}`
    : `<button type="button" class="btn pri" data-ilsheet="done">${sh.type === "doc" ? "확인했어요 ▶" : "계속 읽기 ▶"}</button>`;
  return `${head}${docRows}${mid}${msg}${foot}<div class="il-row">${btns}</div>`;
}
function ilSheetDone(){
  const R = ILR; if(!R) return; const sh = R.def.sheets[R.sheetId];
  if(!R.album){ const S = ilState(R.id); S.sheets[R.sheetId] = {done:Date.now(), vals:R.sheetSt.vals || null, right:!!R.sheetSt.right}; ilSave(); }
  if(sh && sh.note) ilUnlockNote(R.def, sh.note);
  R.sheetId = null; ilPanelClose(); R.pc++; ilRun();
}
function ilSheetAct(a){
  const R = ILR; if(!R || !R.sheetId) return; const sh = R.def.sheets[R.sheetId], st = R.sheetSt;
  if(a === "check"){ st.checked = true; st.right = sh.type === "sort" ? sh.items.every((it, i) => st.ans[i] === it.b) : sh.fields.every((f, i) => st.ans[i] === f.ans); }
  else if(a === "show" && sh.type !== "sort" && sh.type !== "pick") return ilSheetDone();
  else if(a === "show"){ st.ans = {}; if(sh.type === "sort") sh.items.forEach((it, i) => st.ans[i] = it.b); else sh.fields.forEach((f, i) => st.ans[i] = f.ans); st.checked = true; st.shown = true; st.right = true; }
  else if(a === "done") return ilSheetDone();
  R.el.querySelector(".il-panel").innerHTML = ilSheetHTML(sh);
}

/* ---------- 입력 ---------- */
document.addEventListener("click", e => {
  if(!ILR) return; const R = ILR;
  if(!e.target.closest || !e.target.closest("#ilRoot")) return;
  const b = e.target.closest("[data-il],[data-ilpick],[data-ilcfg],[data-ilgo],[data-ilsort],[data-ilpickf],[data-ilcalc],[data-ilsheet]");
  if(b){
    e.preventDefault(); e.stopPropagation();
    if(b.dataset.ilpick) return ilPick(b.dataset.ilpick);
    if(b.dataset.ilgo) return ilGoScene(b.dataset.ilgo);
    if(b.dataset.ilsheet) return ilSheetAct(b.dataset.ilsheet);
    if(b.dataset.ilsort){ const [i, bk] = b.dataset.ilsort.split(":"); R.sheetSt.ans[+i] = bk; R.sheetSt.checked = false; R.el.querySelector(".il-panel").innerHTML = ilSheetHTML(R.def.sheets[R.sheetId]); return; }
    if(b.dataset.ilpickf){ const [i, j] = b.dataset.ilpickf.split(":").map(Number); R.sheetSt.ans[i] = j; R.sheetSt.checked = false; R.el.querySelector(".il-panel").innerHTML = ilSheetHTML(R.def.sheets[R.sheetId]); return; }
    if(b.dataset.ilcalc){ const [k, v] = b.dataset.ilcalc.split(":"); const sh = R.def.sheets[R.sheetId], inp = sh.inputs.find(x => x.id === k), o = inp && inp.opts.find(x => String(x.v) === v); if(o){ R.sheetSt.vals[k] = o.v; R.el.querySelector(".il-panel").innerHTML = ilSheetHTML(sh); } return; }
    if(b.dataset.ilcfg){ const [k, v] = b.dataset.ilcfg.split(":"); ilCfgSet({[k]:isNaN(+v) ? v : +v}); R.el.querySelector(".il-panel").innerHTML = ilCfgHTML(); return; }
    const a = b.dataset.il;
    if(a === "log") return ilPanel(ilLogHTML(), "log");
    if(a === "cfg") return ilPanel(ilCfgHTML(), "cfg");
    if(a === "scenes") return ilPanel(ilScenesHTML(), "scenes");
    if(a === "notes") return ilPanel(ilNoteHTML(R.def, !R.album) + `<div class="il-row"><button type="button" class="btn pri" data-il="${R.done ? "close" : "panelx"}">${R.done ? "방으로 돌아가기" : "닫기"}</button></div>`, "notes");
    if(a === "panelx") return ilPanelClose();
    if(a === "close") return ilClose();
    if(a === "later") return ilLater();
    if(a === "skip"){ if(R.album) return ilClose(); return ilPanel(`<h3>⏭ 이 외전을 건너뛸까요?</h3><p>건너뛰어도 실무노트와 기능 안내는 방의 📚 외전에서 그대로 볼 수 있어요. 나중에 처음부터 다시 읽을 수도 있어요.</p><div class="il-row"><button type="button" class="btn" data-il="panelx">계속 읽기</button><button type="button" class="btn pri" data-il="skipyes">건너뛰기</button></div>`, "skip"); }
    if(a === "skipyes") return ilSkip();
    if(a === "auto"){ const on = !ilCfg().auto; ilCfgSet({auto:on}); b.setAttribute("aria-pressed", String(on)); if(on){ const n = R.def.prog[R.pc]; if(n && n.k === "line" && !R.typing) ilAutoArm(ilFill(R.def, n.t)); } else clearTimeout(R.t); return; }
    if(a === "mute"){ if(typeof kaCfg === "function" && typeof kaSave === "function"){ const c = kaCfg(); c.mute = !c.mute; kaSave(c); if(c.mute && typeof kaWant === "function") try{ kaWant(null); }catch(_){} } R.el.querySelector(".il-panel").innerHTML = ilCfgHTML(); ilMusic(); return; }
    return;
  }
  if(R.panel || R.choosing) return;
  if(e.target.closest(".il-box, .il-bg, .il-cg, .il-who-art")){ e.preventDefault(); ilAdvance(); }
}, true);
document.addEventListener("keydown", e => {
  if(!ILR) return;
  if(e.key === "Escape"){ e.preventDefault(); if(ILR.panel && ILR.panel !== "end" && ILR.panel !== "sheet") return ilPanelClose(); return; }
  if((e.key === "Enter" || e.key === " ") && !ILR.panel && !ILR.choosing){
    if(e.target && e.target.closest && e.target.closest("button")) return;   // 버튼 위에서는 버튼이 먼저
    e.preventDefault(); if(!e.repeat) ilAdvance();
  }
}, true);

/* ---------- 🏠 방: '새 이야기' 알림 + 📚 외전 책장 ---------- */
let IL_LATER = {};   // 이번 접속에서 '나중에 읽기'를 누른 것(저장해도 다음 접속엔 다시 알림)
function ilForChar(ch){ return IL_ORDER.map(id => IL[id]).filter(d => d.ch === ch && !d.hidden); }
function ilCardHTML(ch){
  ilSync();
  const list = ilForChar(ch), fresh = list.find(d => { const S = ilState(d.id); return (S.st === "available" || S.st === "reading") && !IL_LATER[d.id]; });
  const shelf = list.filter(d => ilState(d.id).st !== "locked");
  let h = "";
  if(fresh){ const S = ilState(fresh.id);
    h += `<div class="il-alert"><small>📖 새 이야기 · 외전 · ${ilAfterTxt(fresh)}</small><b>「${esc(fresh.title)}」</b><span>${esc(fresh.sub || "")}</span>
      <div class="ep-alert-btns"><button type="button" class="btn pri" data-ilread="${fresh.id}">${S.st === "reading" ? "▶ 이어 읽기" : "📖 지금 읽기"}</button><button type="button" class="btn" data-illater="${fresh.id}">나중에 읽기</button></div></div>`; }
  if(shelf.length) h += `<button type="button" class="btn il-shelf-btn" data-ilshelf="${ch}">📚 외전 ${shelf.length}</button>`;
  return h;
}
function ilAfterTxt(d){ return `${["첫 번째","두 번째","세 번째","네 번째"][d.after] || ""} 사건 뒤${d.coda ? " · 후일담" : ""}`; }
function ilShelfHTML(ch){
  const list = ilForChar(ch).filter(d => ilState(d.id).st !== "locked");
  const lab = {available:"새 이야기", reading:"읽는 중", read:"다 읽음", skipped:"건너뜀"};
  return `<div class="il-shelf"><h3>📚 ${esc(ilCharName(ch))}의 외전</h3><p class="note">${esc(IL_DISCLAIM)} 외전을 읽어도 본편의 돈·날짜는 그대로예요.</p>
    ${list.map(d => { const S = ilState(d.id); return `<div class="il-shelf-row"><div><small>${ilAfterTxt(d)} · ${lab[S.st] || ""}</small><b>「${esc(d.title)}」</b><span>${esc(d.sub || "")}</span></div>
      <div class="il-shelf-btns">${S.st === "reading" ? `<button type="button" class="btn pri" data-ilread="${d.id}">▶ 이어 읽기</button>` : S.st === "available" ? `<button type="button" class="btn pri" data-ilread="${d.id}">📖 읽기</button>` : `<button type="button" class="btn" data-ilreplay="${d.id}">↺ 다시 보기</button>`}
      ${S.st === "reading" || S.st === "skipped" ? `<button type="button" class="btn" data-ilrestart="${d.id}">처음부터</button>` : ""}<button type="button" class="btn" data-ilnotes="${d.id}">📒 노트</button></div></div>`; }).join("") || "<p>아직 열린 외전이 없어요.</p>"}
    <div class="il-row"><button type="button" class="btn pri" data-ilshelfx>닫기</button></div></div>`;
}
function ilModal(html){
  ilModalClose();
  const el = document.createElement("div"); el.id = "ilModal"; el.className = "il-modal"; el.setAttribute("role", "dialog");
  el.innerHTML = `<div class="il-modal-in">${html}</div>`; document.body.appendChild(el);
  const f = el.querySelector("button"); if(f) f.focus({preventScroll:true});
}
function ilModalClose(){ const el = document.getElementById("ilModal"); if(el) el.remove(); }
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-ilread],[data-illater],[data-ilshelf],[data-ilshelfx],[data-ilreplay],[data-ilrestart],[data-ilnotes]"); if(!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(b.dataset.ilread){ ilModalClose(); ilStart(b.dataset.ilread); }
  else if(b.dataset.ilrestart){ ilModalClose(); ilStart(b.dataset.ilrestart, {restart:true}); }
  else if(b.dataset.ilreplay){ ilModalClose(); ilStart(b.dataset.ilreplay, {album:true}); }
  else if(b.dataset.illater){ IL_LATER[b.dataset.illater] = true; const S = ilState(b.dataset.illater); if(S.st === "available") S.st = "available"; if(typeof renderArena === "function") renderArena(); }
  else if(b.dataset.ilshelf) ilModal(ilShelfHTML(b.dataset.ilshelf));
  else if(b.dataset.ilnotes){ const d = IL[b.dataset.ilnotes]; ilModal(ilNoteHTML(d, false) + `<div class="il-row"><button type="button" class="btn" data-ilshelf="${d.ch}">← 외전 목록</button><button type="button" class="btn pri" data-ilshelfx>닫기</button></div>`); }
  else if("ilshelfx" in b.dataset) ilModalClose();
}, true);
if(typeof lfBaseHTML === "function"){
  const _il_base = lfBaseHTML;
  lfBaseHTML = function(){
    let h = _il_base();
    try{ const L = lfRec(); if(L && L.story && typeof EP_PLAN !== "undefined" && EP_PLAN[L.char]){ const c = ilCardHTML(L.char); if(c) h = h.replace(/(<div class="vn of-stage lf-stage[^"]*">)/, `$1<div class="il-dock">${c}</div>`); } }catch(e){}
    return h;
  };
}
// 외전이 열려 있는 동안엔 음악을 외전이 쥔다
if(typeof kaScene === "function"){ const _il_scene = kaScene; kaScene = function(){ if(ILR){ const k = ILR.panel === "sheet" || ILR.music === "focus" ? "_focus" : ILR.music === "calm" ? "_calm" : ""; return "il_" + ILR.id + k; } return _il_scene(); }; }

/* ---------- 🔗 참고자료 — 대사에는 넣지 않고 실무노트 맨 아래 접이식에서만 보여준다 ----------
   확인일은 원고 작성 참고일. 링크를 열어 본 적 있는 것과 원고가 '열람했다'고 적은 것을 구분하지 않고
   모두 '재확인 필요'로 둔다(이 환경에서는 외부 사이트에 직접 접속해 내용을 다시 보지 못했다). */
const IL_REF_DATE = "2026-09-26 (원고 작성 참고일 · 적용 전 재확인)";
const IL_REFS = {
  W_BATONER_FAQ:{t:"바토너 자주 하는 질문", u:"https://batoner.kr/faq", use:"한 업체의 대리인 연결 방식·전자서류 안내. 가격·기한은 게임 값으로 쓰지 않음."},
  W_BATONER_INFO:{t:"바토너 이용 안내", u:"https://batoner.kr/info", use:"해당 서비스의 신청·준비 흐름. 다른 서비스의 공통 규칙이 아님."},
  W_BATONER_TERMS:{t:"바토너 이용약관", u:"https://batoner.kr/privacy/terms", use:"맡기는 업무 범위·정보 정확성 확인. 게임의 단순화한 환불 규칙과 별개."},
  W_KAR_PROXY:{t:"한국공인중개사협회 매수신청대리인 등록 안내", u:"https://www.kar.or.kr/paidw/aidwregintro.asp", use:"개업공인중개사의 매수신청대리 등록·교육 구분."},
  W_NTS_REGISTER:{t:"국세청 사업자등록 신청", u:"https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7777&mi=2444", use:"사업자등록 신청 시점·홈택스 신청 안내."},
  W_NTS_SIMPLIFIED:{t:"국세청 간이과세 관련 공지", u:"https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=2207&nttSn=1350285", use:"간이과세 적용 배제 업종 확인."},
  W_VAT_HOUSING:{t:"조세특례제한법 시행령 주택 관련 면세 조문", u:"https://www.law.go.kr/LSW/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000664351", use:"국민주택 관련 면세의 적용요건 확인."},
  W_COURT_REGISTER:{t:"대법원 2017다9121,9138 판결(민사집행법 제144조 촉탁 구조 인용)", u:"https://www.law.go.kr/LSW/precInfoP.do?precSeq=227233", use:"대금 지급 후 소유권이전·말소등기 촉탁 구분."},
  W_REDEVELOPMENT_PORTAL:{t:"서울시 정비사업 정보몽땅", u:"https://cleanup.seoul.go.kr/", use:"정비사업 자료 확인 경로 예시. 게임 가상 지역은 실제 사업이 아님."},
  W_REDEVELOPMENT_LAW:{t:"도시 및 주거환경정비법 조합원 자격 관련 조문", u:"https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1000970595", use:"사업유형·단계에 따라 권리 검토가 필요하다는 근거. 개별 자격을 자동 판정하지 않음."},
  W_33M2_GUIDE:{t:"삼삼엠투 방 등록 절차 안내", u:"https://web.33m2.co.kr/host/campaign/article/33m2-room-registration-guide", use:"가상 준비 화면 구성 참고. 화면·문장 복제 아님."},
  W_33M2_LEASE:{t:"삼삼엠투 단기임대의 오해와 사실", u:"https://web.33m2.co.kr/en/guest/campaign/article/short-term-lease-misconceptions", use:"플랫폼의 임대차 서비스 설명. 운영의 법적 적합성을 확정하지 않음."},
  W_AIRBNB_POLICY:{t:"에어비앤비 영업신고 3단계 가이드", u:"https://www.airbnb.co.kr/e/ppap_kr_3stepguide/", use:"한국 숙소 영업신고 정보·증빙 정책과 사업자등록의 구분."},
  W_AIRBNB_URBAN:{t:"에어비앤비 외국인관광도시민박업 안내", u:"https://www.airbnb.co.kr/e/ppap_sub1a", use:"해당 업종 요건 확인의 출발점."},
  W_BANJISANG:{t:"반지상 공식 소개", u:"https://www.banjisang.com/", use:"월세 공부 관련 참고 인물 확인. 특정 발언 검증 자료 아님."},
  W_FSC_NPL:{t:"금융위원회 대부채권 양수인 관련 해석 사례", u:"https://better.fsc.go.kr/fsc_new/replyCase/LawreqDetail.do?lawreqIdx=1167&muGpNo=147&muNo=193&stNo=11", use:"채권 취급 주체·규제를 별도로 확인해야 하는 이유. 과거 사례."},
  W_SHARED_PROPERTY:{t:"찾기쉬운 생활법령정보 — 공유", u:"https://easylaw.go.kr/CSP/CnpClsMainBtr.laf?ccfNo=3&cciNo=3&cnpClsNo=3&csmSeq=1171&menuType=onhunqna&popMenu=ov", use:"공유물 처분과 지분 구분 확인."},
  W_KAMCO:{t:"한국자산관리공사 온비드 소개", u:"https://www.kamco.or.kr/portal/contents.do?mId=0405000000", use:"공매 플랫폼의 재산·처분기관 다양성."},
  F_BID_FORM:{t:"기일입찰표·위임장 서식(사용자 제공 자료 요약)", u:"(사용자 제공 파일 — 작업폴더에 없음, 원고의 요약만 반영)", use:"본인·대리인·물건번호·입찰가격·보증금 항목, 대리 입찰 시 위임 서류 안내."},
  F_SELF_REGISTER:{t:"경매 셀프등기·인도명령 서식 묶음(사용자 제공 자료 요약)", u:"(사용자 제공 파일 — 작업폴더에 없음, 원고의 요약만 반영)", use:"촉탁신청서·부동산표시목록·첨부서류 구성. 옛 수수료·날짜는 쓰지 않음."},
  F_ONBID_MANUAL:{t:"스마트온비드 입찰자 매뉴얼(사용자 제공 자료 요약)", u:"(사용자 제공 파일 — 작업폴더에 없음, 원고의 요약만 반영)", use:"사전 준비·공고 첨부자료 확인·입찰서 제출 흐름."}
};

/* ---------- 🖼️ 외전 대표 그림 칸 — 그림 올리기 목록(ART_SLOTS)에 등록해 두면 올리는 즉시 쓰인다 ----------
   그림이 없으면 대사 중 @cg와 끝 화면 그림은 조용히 빠지고, 배경·초상만으로 진행한다. */
const IL_CG_SPEC = {
  cg_il_s01:"서가 사이에서 책 여러 권을 비교하는 한서윤(기존 서윤 그림체·복장 유지)",
  cg_il_s03:"책상 위 서류·스프링 노트·접수증을 정리하는 한서윤",
  cg_il_d01:"왼쪽: 회의실에서 자료를 설명하는 이도현 / 오른쪽: 법원에서 서류를 확인하는 가상 대리인(상상 구도 표시)",
  cg_il_d03:"책상을 정리한 뒤 개인 노트북을 닫는 이도현, 금요일 저녁",
  cg_il_m01:"골목 지도와 구역 자료를 중개사와 함께 보는 윤미정",
  cg_il_m03:"가게 셔터 앞에서 달력과 계약 조건을 비교하는 윤미정",
  cg_il_j01:"식탁에서 지도와 생활비 달력을 함께 보는 박재훈 가족 셋",
  cg_il_j03:"꾸미는 중인 방 — 재훈은 가구 배치, 딸은 사진 촬영, 아내는 동선 확인",
  cg_il_e01:"찻집 테이블 위 채권 구조도와 담보 사진을 비교하는 최은경",
  cg_il_e03:"세 사람 이름이 적힌 가상 서류와 색이 다른 펜 세 자루",
  cg_il_t01:"차량 옆에서 동료와 태블릿의 기계 공고를 함께 보는 김태식",
  cg_il_t03:"낮의 상담 책상과 밤의 강의실을 잇는 김태식의 노트"};
function ilSlot(d){ if(typeof A_ === "function" && typeof ART_SLOTS !== "undefined" && d.cg && IL_CG_SPEC[d.cg] && !ART_SLOTS.some(s => s.id === d.cg)) A_(d.cg, "bg", `외전 대표 그림 — 「${d.title}」`, IL_CG_SPEC[d.cg] + " · 가로 16:9, 1600px 이상, 글자 넣지 않기, 실존 로고·실제 인물 얼굴 없이", `외전 ${d.id} 대사 중·끝 화면`); }
