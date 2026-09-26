/* ================= 🎼 브금 다채롭게 — 캐릭터별 편곡 · 사건마다 다른 화음 진행 · 멜로디 · 엔딩 4종 · 미리듣기 =================
   · 음원 파일 없이 feel.js 합성기를 그대로 쓴다. 곡 이름(kaScene)은 안 바꾸고, kaWant 에서 "지금 캐릭터·지금 사건"에 맞는 변주 곡으로 바꿔 튼다.
   · 캐릭터 테마 선율(GX_MOTIF 5음)이 모든 변주 멜로디의 첫 소절이 된다 — 곡이 달라도 "이 캐릭터 곡"으로 들린다.
   · 새 필드가 없는 곡(기존 16곡)은 예전과 한 음도 다르게 나지 않는다(kaPump 가 새 필드만 추가로 처리).
   · 게임 수치(가격·확률·시간)는 건드리지 않는다. */

/* ---------- 악기 ---------- */
function bvVoice(dest, f, t, d, wave, v, lp){
  if(wave === "epiano"){ kaTone(dest, f, t, d, "sine", v, null, lp); kaTone(dest, f*2, t, d*0.55, "sine", v*0.32, null, lp); kaTone(dest, f*3, t, d*0.25, "sine", v*0.1, null, lp); return; }
  if(wave === "pluck"){ kaTone(dest, f, t, Math.min(d, 0.32), "triangle", v*1.15, null, lp || 2400); kaTone(dest, f*2, t, Math.min(d, 0.12), "triangle", v*0.25, null, lp || 2400); return; }
  if(wave === "bell"){ kaTone(dest, f, t, d*1.4, "sine", v, null, lp); kaTone(dest, f*2.76, t, d*0.45, "sine", v*0.22, null, lp); return; }
  kaTone(dest, f, t, d, wave, v, null, lp);
}

/* ---------- kaPump 확장 (기존 곡은 동작 동일) ---------- */
kaPump = function(){
  if(!KA) return; const ac = KA.ac, horizon = ac.currentTime + 0.3;
  for(const inst of KA_PLAY){
    const tr = inst.tr, sd = 60 / tr.bpm / 4, L = 16 * tr.prog.length;
    while(inst.next < horizon){
      const s = inst.step % 16, bar = Math.floor(inst.step / 16) % tr.prog.length, [deg, q] = tr.prog[bar], chord = KA_Q[q];
      let t = inst.next + (tr.swing && s % 2 ? sd * tr.swing : 0);
      const root = tr.root + deg;
      if(!inst.dead){
        const b = tr.bass[s];
        if(b && b !== "."){
          let m = root + (b === "5" ? 7 : 0);
          if(tr.walk && b === "w"){ const w = [0, 2, 4, 5, 7, 9, 10][(inst.step >> 2) % 7]; m = root + (chord.includes(3) ? [0,3,5,7,10,7,5][(inst.step >> 2) % 7] : w); }
          kaTone(inst.g, kaHz(m), t, sd*1.8, "triangle", 0.2);
        }
        const ap = tr.arp[s % tr.arp.length]; if(ap && ap !== "."){ const i = +ap, iv = chord[i % chord.length] + (i >= chord.length ? 12 : 0); bvVoice(inst.g, kaHz(root + 12*tr.arpOct + iv - 12), t, sd*1.6, tr.arpWave, tr.arpV, tr.lp); }
        if(s === 0 && tr.pad){ chord.forEach(iv => kaTone(inst.g, kaHz(root + 12 + iv), t, sd*15.5, "sine", tr.pad)); }
        if(tr.kick && tr.kick[s] === "1") kaTone(inst.g, 120, t, 0.16, "sine", 0.32, 45);
        if(tr.hat && tr.hat[s] === "1") kaNoise(inst.g, t, 0.04, tr.hatV || 0.05, 8000, 1, "highpass");
        if(tr.snare && tr.snare[s] === "1") kaNoise(inst.g, t, 0.12, 0.09, 1800, 0.7);
        // 🎶 멜로디 — melAlways 가 아니면 한 바퀴(진행 전체) 부르고 한 바퀴 쉰다
        if(tr.mel){ const cyc = Math.floor(inst.step / L); if(tr.melAlways || cyc % 2 === 0){ const n = tr.mel[inst.step % L]; if(n) bvVoice(inst.g, kaHz(n[0]), t, sd * n[1] * 0.95, tr.melWave || "triangle", tr.melV || 0.045, tr.melLp || tr.lp); } }
        // 😠 긴장 레이어 — 명도 곡(변주 포함)에만
        if(inst.id === "tenant" || tr.tension){
          if(s === 0) kaTone(inst.tg, kaHz(root - 12), t, sd*16, "sawtooth", 0.09, null, 260);
          if(s === 0 || s === 3) kaTone(inst.tg, 58, t, 0.18, "sine", 0.45, 38);
        }
      }
      inst.next += sd; inst.step++;
    }
  }
};
kaSetTension = function(on){ KA_TENSION = on; const A = KA; if(!A) return; KA_PLAY.filter(x => (x.id === "tenant" || x.tr.tension) && !x.dead).forEach(x => x.tg.gain.setTargetAtTime(on ? 1 : 0.0001, A.ac.currentTime, 0.35)); };

/* ---------- 재료 ---------- */
function bvHash(s){ let h = 2166136261; for(const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function bvRng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const BV_MINOR = q => q === "min" || q === "m7" || q === "dim";
function bvIsMinor(tr){ return BV_MINOR(tr.prog[0][1]); }
// 사건마다 고르는 화음 진행 — 0번은 원곡 진행(그대로)
const BV_PROG = {
  maj:[null, [[0,"M7"],[4,"m7"],[5,"M7"],[7,"sus"]], [[0,"maj"],[9,"m7"],[2,"m7"],[7,"d7"]], [[5,"M7"],[7,"d7"],[4,"m7"],[9,"m7"]], [[0,"M7"],[2,"m7"],[4,"m7"],[5,"M7"],[0,"M7"],[9,"m7"],[5,"M7"],[7,"sus"]]],
  min:[null, [[0,"m7"],[5,"m7"],[10,"maj"],[3,"M7"]], [[0,"min"],[10,"maj"],[8,"M7"],[7,"d7"]], [[0,"min"],[8,"M7"],[3,"M7"],[7,"sus"]], [[0,"m7"],[3,"M7"],[8,"M7"],[7,"d7"]]]
};
const BV_RHY = ["1.1.1...1.1.....", "1...1.1.1...1...", "1.....1.1.1.1...", "1..1..1.1.......", "1...1...1.1.1...", "1.1...1.1...1..."];

// 캐릭터 편곡 — 같은 장면 곡이어도 캐릭터마다 조성·빠르기·악기·리듬감이 다르다
const BV_CHAR = {
  seoyun:  {key:0,  tempo:0.92, swing:0.14, wave:"epiano", melWave:"epiano",   lp:0.85, hatV:0.035, label:"로파이 전자피아노"},
  dohyun:  {key:2,  tempo:1.06, swing:0,    wave:"pluck",  melWave:"square",   lp:1.05, melLp:1800, label:"시티팝"},
  mijeong: {key:-3, tempo:1.02, swing:0.08, wave:"pluck",  melWave:"triangle", lp:1.2,  label:"밝은 어쿠스틱"},
  jaehoon: {key:-5, tempo:0.96, swing:0.22, wave:"square", melWave:"triangle", lp:0.8,  shuffle:true, label:"셔플"},
  eunkyung:{key:3,  tempo:0.9,  swing:0.16, wave:"epiano", melWave:"bell",     lp:1.1,  jazz:true, label:"재즈"},
  taesik:  {key:-2, tempo:0.88, swing:0.08, wave:"triangle", melWave:"triangle", lp:0.75, label:"옛날 드라마"}
};
const BV_SCENES = ["home","base_night","research","court","tenant","repair","sale","good","bad"];

/* ---------- 멜로디 짓기 — 첫 소절은 캐릭터 테마(GX_MOTIF), 이어서 음계 안에서 한 걸음씩, 마지막은 으뜸음으로 쉰다 ---------- */
function bvMelody(tr, ch, seed){
  const R = bvRng(seed), bars = tr.prog.length, L = 16 * bars, mel = new Array(L).fill(null);
  const minor = bvIsMinor(tr), pent = minor ? [0,3,5,7,10] : [0,2,4,7,9];
  const tonic = tr.root; let center = tonic; while(center < 67) center += 12; while(center > 78) center -= 12;
  const scale = []; for(let o = -12; o <= 24; o += 12) pent.forEach(p => { const m = center + o + p; if(m >= 64 && m <= 86) scale.push(m); }); scale.sort((a, b) => a - b);
  const inRange = m => { while(m < 64) m += 12; while(m > 86) m -= 12; return m; };
  const nearest = (m, pool) => pool.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a);
  const motif = (typeof GX_MOTIF !== "undefined" && GX_MOTIF[ch]) || [0, 4, 7, 4, 0].map(x => x + 72);
  const mInt = motif.map(x => x - motif[0]);
  let prev = center + 7;
  for(let bar = 0; bar < bars; bar++){
    const [deg, q] = tr.prog[bar], ch3 = KA_Q[q].map(iv => tr.root + deg + iv);
    const chordPool = []; for(let o = -24; o <= 36; o += 12) ch3.forEach(m => { const x = m + o; if(x >= 64 && x <= 88) chordPool.push(x); });
    const rhy = BV_RHY[(bar === 0 ? seed : Math.floor(R() * 997)) % BV_RHY.length], ons = [];
    for(let s = 0; s < 16; s++) if(rhy[s] === "1") ons.push(s);
    const last = bar === bars - 1, rest = !last && bar % 2 === 1 && R() < 0.35;   // 가끔 한 마디 비운다(숨)
    if(rest){ continue; }
    let notes;
    if(bar === 0 || (bar === Math.floor(bars / 2) && bars >= 4)){   // 테마 소절(처음 + 중간에 한 번 더, 조옮김)
      const start = nearest(prev, chordPool);
      notes = ons.map((_, i) => inRange(start + mInt[i % mInt.length]));
    } else {
      notes = []; let cur = nearest(prev, chordPool);
      ons.forEach((_, i) => {
        if(i === 0){ notes.push(cur); return; }
        let k = scale.indexOf(nearest(cur, scale)); k += R() < 0.5 ? -1 : 1; if(R() < 0.2) k += R() < 0.5 ? -1 : 1;
        k = Math.max(0, Math.min(scale.length - 1, k)); cur = scale[k]; notes.push(cur);
      });
      const n1 = notes.length - 1;
      if(last){ const tp = chordPool.filter(m => (((m - tonic) % 12) + 12) % 12 === 0); notes[n1] = nearest(notes[n1], tp.length ? tp : chordPool); }
      else notes[n1] = nearest(notes[n1], chordPool);
    }
    notes = notes.map(m => inRange(m));
    ons.forEach((s, i) => { const nxt = i + 1 < ons.length ? ons[i + 1] : (last ? 16 : Math.min(16, s + 4)); mel[bar * 16 + s] = [notes[i], Math.max(1, Math.min(nxt - s, last && i === ons.length - 1 ? 12 : 6))]; });
    prev = notes[notes.length - 1];
  }
  return mel;
}

/* ---------- 변주 곡 만들기 ---------- */
function bvJazz(prog){ return prog.map(([d, q]) => [d, q === "maj" ? "M7" : q === "min" ? "m7" : q]); }
function bvMinorize(prog){ return prog.map(([d, q]) => [d, q === "maj" ? "min" : q === "M7" ? "m7" : q === "d7" ? "min" : q]); }
function bvScene(base, ch, caseKey){
  const src = KA_TRACKS[base], C = BV_CHAR[ch]; if(!src || !C) return null;
  const id = `${base}@${ch}` + (caseKey != null ? `#${caseKey}` : "");
  if(KA_TRACKS[id]) return id;
  const minor = bvIsMinor(src), bank = BV_PROG[minor ? "min" : "maj"];
  const pick = caseKey != null ? bvHash(caseKey + ":" + base) % bank.length : 0;
  let prog = bank[pick] || src.prog; if(C.jazz) prog = bvJazz(prog);
  const tr = Object.assign({}, src, {
    bpm: Math.round(src.bpm * C.tempo), root: src.root + C.key, prog,
    swing: Math.max(src.swing || 0, C.swing), arpWave: C.wave, lp: Math.round((src.lp || 2000) * C.lp), hatV: C.hatV,
    tension: base === "tenant", melWave: C.melWave, melLp: C.melLp, melV: base === "court" || base === "tenant" ? 0.03 : 0.042
  });
  if(C.shuffle && tr.bass) tr.bass = tr.bass.replace(/\./g, (m, i) => i % 4 === 2 ? "1" : ".").slice(0, 16);
  if(C.jazz && tr.bass) { tr.bass = "w...w...w...w..."; tr.walk = true; }
  tr.mel = bvMelody(tr, ch, bvHash(id));
  KA_TRACKS[id] = tr; if(typeof KA_NAME !== "undefined") KA_NAME[id] = (KA_NAME[base] || base) + "_" + ch.toUpperCase();
  return id;
}
function bvOpening(ch){
  const base = "op_" + ch, src = KA_TRACKS[base]; if(!src) return base;
  const id = base + "@mel"; if(KA_TRACKS[id]) return id;
  const tr = Object.assign({}, src, {melWave:(BV_CHAR[ch] || {}).melWave, melV:0.04});
  tr.mel = bvMelody(tr, ch, bvHash(id)); KA_TRACKS[id] = tr; if(typeof KA_NAME !== "undefined") KA_NAME[id] = (KA_NAME[base] || base.toUpperCase());
  return id;
}
// 엔딩 4종 — 같은 테마를 판정에 맞게 편곡
function bvEnding(ch, type){
  const base = "op_" + ch, src = KA_TRACKS[base], C = BV_CHAR[ch] || {}; if(!src) return base;
  const id = `end_${ch}_${type}`; if(KA_TRACKS[id]) return id;
  const majProg = BV_MINOR(src.prog[0][1]) ? [[0,"M7"],[5,"M7"],[9,"m7"],[7,"sus"]] : src.prog;
  const set = {
    special:{prog:majProg, bpm:src.bpm, key:2, arpWave:"bell", pad:(src.pad||0.04)*1.5, kick:"1.......1.......", hat:"..1...1...1...1.", snare:"", lp:(src.lp||2000)*1.3, melAlways:true},
    good:   {prog:majProg, bpm:src.bpm, key:0, arpWave:C.wave || src.arpWave, pad:(src.pad||0.04)*1.3, kick:"1.......1.......", hat:"....1.......1...", snare:"", lp:(src.lp||2000)*1.15, melAlways:true},
    normal: {prog:src.prog, bpm:Math.round(src.bpm*0.9), key:0, arpWave:"sine", pad:(src.pad||0.04)*1.3, kick:"", hat:"........1.......", snare:"", lp:(src.lp||2000)*0.9, melAlways:false},
    bad:    {prog:bvMinorize(src.prog), bpm:Math.round(src.bpm*0.8), key:-2, arpWave:"triangle", pad:(src.pad||0.04)*1.4, kick:"", hat:"", snare:"", lp:(src.lp||2000)*0.7, arp:"0.......2.......", melAlways:false}
  }[type] || {};
  const tr = Object.assign({}, src, set, {root:src.root + (set.key || 0), melWave:C.melWave, melV:type === "bad" ? 0.035 : 0.048});
  tr.mel = bvMelody(tr, ch, bvHash(id)); KA_TRACKS[id] = tr; if(typeof KA_NAME !== "undefined") KA_NAME[id] = `BGM_END_${ch.toUpperCase()}_${type.toUpperCase()}`;
  return id;
}

/* ---------- 지금 누구·어떤 사건인가 ---------- */
function bvChar(){
  try{ if(typeof GX_OP !== "undefined" && GX_OP) return GX_OP.id; }catch(e){}
  try{ if(typeof ILR !== "undefined" && ILR && ILR.def) return ILR.def.ch; }catch(e){}
  try{ const L = typeof lfRec === "function" ? lfRec() : null; if(L && L.char) return L.char; }catch(e){}
  return null;
}
function bvCaseKey(){ try{ if(typeof K !== "undefined" && K && typeof KP !== "undefined" && KP && KP.id) return KP.id; }catch(e){} return null; }
let BV_ON = true, BV_PREVIEW = 0;
function bvResolve(id){
  if(!BV_ON || !id || typeof id !== "string") return id;
  try{
    if(id.startsWith("op_")){ const ch = id.slice(3); if(typeof GX_OP !== "undefined" && GX_OP && GX_OP.mode === "end") return bvEnding(ch, GX_OP.type || "normal"); return bvOpening(ch); }
    if(BV_SCENES.includes(id)){ const ch = bvChar(); if(ch && BV_CHAR[ch]) return bvScene(id, ch, ["home","base_night"].includes(id) ? null : bvCaseKey()) || id; }
  }catch(e){}
  return id;
}
const _bv_want = kaWant;
kaWant = function(id){
  if(BV_PREVIEW && Date.now() < BV_PREVIEW) return;   // 미리듣기 중엔 화면이 바뀌어도 곡을 안 바꾼다
  BV_PREVIEW = 0;
  return _bv_want(bvResolve(id));
};

/* ---------- 🎧 미리듣기 (소리 설정 칸) ---------- */
const BV_PREVIEW_LIST = [["op","오프닝"],["home","거점(낮)"],["base_night","거점(밤)"],["research","조사"],["court","법원·입찰"],["tenant","명도"],["repair","수리"],["sale","매도"],["good","결과 좋음"],["bad","결과 나쁨"],["end:special","엔딩 SPECIAL"],["end:good","엔딩 GOOD"],["end:normal","엔딩 NORMAL"],["end:bad","엔딩 BAD"]];
function bvPreviewId(ch, what, n){
  if(what === "op") return bvOpening(ch);
  if(what.startsWith("end:")) return bvEnding(ch, what.slice(4));
  return bvScene(what, ch, what === "home" || what === "base_night" ? null : "preview" + (n || 0));
}
if(typeof kcSfxBtn === "function"){
  const _bv_btn = kcSfxBtn;
  kcSfxBtn = function(){
    const h = _bv_btn.apply(this, arguments); const cur = bvChar() || "seoyun";
    const names = (typeof LF_CHARS !== "undefined" ? LF_CHARS : []).reduce((o, c) => (o[c.id] = c.name, o), {});
    const row = `<div class="bv-prev"><b>🎧 브금 들어보기</b>
      <select data-bvch>${Object.keys(BV_CHAR).map(k => `<option value="${k}"${k === cur ? " selected" : ""}>${names[k] || k} · ${BV_CHAR[k].label}</option>`).join("")}</select>
      <select data-bvwhat>${BV_PREVIEW_LIST.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select>
      <span class="bv-btns"><button type="button" class="btn sm" data-bvplay>▶ 듣기</button><button type="button" class="btn sm" data-bvnext title="같은 장면, 다른 사건 버전">🔀 다른 사건</button><button type="button" class="btn sm" data-bvstop>■</button></span></div>`;
    return h.replace(/<\/div><\/details>\s*$/, row + "</div></details>");
  };
}
let BV_PN = 0;
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-bvplay],[data-bvnext],[data-bvstop]"); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const box = b.closest(".bv-prev"); if(!box) return;
  if(b.hasAttribute("data-bvstop")){ BV_PREVIEW = 0; if(typeof kaSync === "function") kaSync(); else kaWant(null); return; }
  if(b.hasAttribute("data-bvnext")) BV_PN++;
  const ch = box.querySelector("[data-bvch]").value, what = box.querySelector("[data-bvwhat]").value;
  const id = bvPreviewId(ch, what, BV_PN); if(!id) return;
  KA_UNLOCKED = true; const A = kaCtx(); if(A && A.ac.state === "suspended") A.ac.resume();
  BV_PREVIEW = 0; _bv_want(id); BV_PREVIEW = Date.now() + 90000;
}, true);
