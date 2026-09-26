/* ================= 🌆 환경음 — 장소·날씨·매물마다 다른 '거기 있는 소리' (v215) =================
   BGM 밑에 얇게 깔린다. 녹음 파일 없이 전부 WebAudio로 만든다(외부 음원·저작권 없음).
   · 장소:  법원(웅성거림·발소리·안내 차임·종이) / 현장 골목(차 지나가는 소리·경적·자전거 따르릉·아이들 꺄르륵·새)
            / 집(방 공기·냉장고 웅) / 중개사무소(도로 웅·키보드·전화벨·출입문 차임) / 수리 현장(망치·드릴)
   · 날씨:  비·장마 = 빗소리(밖에선 크게, 안에선 창 너머로 먹먹하게 + 물방울) · 추위 = 바람 · 여름 = 매미 · 밤 = 풀벌레
   · 매물:  주소·물건 설명의 낱말로 성격을 정한다(큰길·역 → 차 많음, 학교 → 아이들, 시장 → 사람 소리, 공장 → 기계 웅)
            + 물건마다 고정된 난수로 조금씩 달라서 같은 '골목'도 매번 똑같이 들리지 않는다.
   ⚠️ 게임 난수(K.r)는 쓰지 않는다 — 소리는 Math.random·자체 난수만. 볼륨은 소리 설정의 '🌆 환경음' 막대. */
const AMB_ON = true;
if(typeof KA_DEF !== "undefined" && KA_DEF.amb == null) KA_DEF.amb = 80;
let AMB = null;              // {g, beds:{}, scene, key}
let AMB_BROWN = null, AMB_WHITE = null;
function ambBuf(kind){
  const ac = KA.ac, n = ac.sampleRate * 3, buf = ac.createBuffer(1, n, ac.sampleRate), a = buf.getChannelData(0);
  if(kind === "brown"){ let l = 0; for(let i = 0; i < n; i++){ l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; a[i] = l * 3.5; } }
  else for(let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1;
  return buf;
}
function ambVol(){ const c = kaCfg(); return c.mute ? 0 : ((c.amb == null ? 80 : c.amb) / 100) * 0.42; }
function ambInit(){
  if(AMB) return AMB; const A = kaCtx(); if(!A) return null;
  const g = A.ac.createGain(); g.gain.value = ambVol(); g.connect(A.comp);
  AMB_WHITE = ambBuf("white"); AMB_BROWN = ambBuf("brown");
  AMB = {g, beds:{}, scene:null, key:"", ev:{}};
  return AMB;
}
function ambPan(node, p){ const ac = KA.ac; if(!ac.createStereoPanner) return node; const s = ac.createStereoPanner(); s.pan.value = p; node.connect(s); return s; }

/* ---------- 계속 깔리는 소리(bed) ---------- */
function ambLoop(buf, type, fq, q){ const ac = KA.ac, s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = 0; s.loopEnd = buf.duration; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = fq; f.Q.value = q || 0.7; s.connect(f); s.start(0, Math.random() * 2); return {s, f}; }
function ambLfo(param, rate, depth, base){ const ac = KA.ac, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); if(base != null) param.value = base; o.start(); return o; }
const AMB_BEDS = {
  // 비: 밝은 쉬익(바깥) — 안에선 lowpass로 먹먹하게
  rain:(v, inside) => { const a = ambLoop(AMB_WHITE, "lowpass", inside ? 1300 : 5200, 0.5), b = ambLoop(AMB_BROWN, "lowpass", 700, 0.4); const g = KA.ac.createGain(); a.f.connect(g); b.f.connect(g); return {src:[a.s, b.s], out:g, vol:v}; },
  wind:(v) => { const a = ambLoop(AMB_BROWN, "bandpass", 500, 0.9); const o = ambLfo(a.f.frequency, 0.09, 260, 520); const g = KA.ac.createGain(); a.f.connect(g); const o2 = ambLfo(g.gain, 0.13, 0.5, 0.6); return {src:[a.s], osc:[o, o2], out:g, vol:v}; },
  traffic:(v) => { const a = ambLoop(AMB_BROWN, "lowpass", 260, 0.6); const g = KA.ac.createGain(); a.f.connect(g); const o = ambLfo(g.gain, 0.05, 0.35, 0.7); return {src:[a.s], osc:[o], out:g, vol:v}; },
  room:(v) => { const a = ambLoop(AMB_BROWN, "lowpass", 160, 0.5); const ac = KA.ac, h = ac.createOscillator(), hg = ac.createGain(); h.frequency.value = 58; hg.gain.value = 0.05; h.connect(hg); h.start(); const g = ac.createGain(); a.f.connect(g); hg.connect(g); return {src:[a.s], osc:[h], out:g, vol:v}; },
  // 법원 복도 웅성거림: 말소리 대역 잡음에 음절 속도(3~6Hz) 흔들림을 두 겹
  murmur:(v) => { const ac = KA.ac, g = ac.createGain(), out = [];
    [[420, 4.1], [880, 5.3], [1500, 3.2]].forEach(([fq, r], i) => { const a = ambLoop(i ? AMB_WHITE : AMB_BROWN, "bandpass", fq, 1.6); const m = ac.createGain(); a.f.connect(m); m.connect(g); out.push(a.s, ambLfo(m.gain, r, 0.45, 0.55), ambLfo(m.gain, r * 0.37, 0.25)); });
    return {src:out.filter(x => x.buffer), osc:out.filter(x => !x.buffer), out:g, vol:v}; },
  // 매미(여름 낮) — 높은 대역 잡음을 빠르게 떨고, 몇 초마다 크게 울었다 잦아든다
  cicada:(v) => { const a = ambLoop(AMB_WHITE, "bandpass", 5200, 3.5), g = KA.ac.createGain(); a.f.connect(g); const o = ambLfo(g.gain, 28, 0.35, 0.4), o2 = ambLfo(g.gain, 0.22, 0.35); return {src:[a.s], osc:[o, o2], out:g, vol:v}; },
  crickets:(v) => { const ac = KA.ac, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 4400; o.type = "sine"; o.connect(g); g.gain.value = 0; const t = ambLfo(g.gain, 14, 0.5, 0), t2 = ambLfo(g.gain, 0.6, 0.4); o.start(); return {src:[], osc:[o, t, t2], out:g, vol:v}; },
  machine:(v) => { const ac = KA.ac, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = "sawtooth"; o.frequency.value = 47; f.type = "lowpass"; f.frequency.value = 300; o.connect(f); f.connect(g); o.start(); const l = ambLfo(g.gain, 0.8, 0.2, 0.6); return {src:[], osc:[o, l], out:g, vol:v}; }};
function ambBedOn(id, vol, inside){
  const B = AMB.beds[id], t = KA.ac.currentTime;
  if(B && B.inside === !!inside){ B.g.gain.setTargetAtTime(vol, t, 0.8); return; }
  if(B) ambBedOff(id);
  const b = AMB_BEDS[id](vol, inside), g = KA.ac.createGain(); g.gain.value = 0.0001; b.out.connect(g); g.connect(AMB.g); g.gain.setTargetAtTime(vol, t, 1.2);
  AMB.beds[id] = {g, src:b.src || [], osc:b.osc || [], inside:!!inside};
}
function ambBedOff(id){
  const B = AMB.beds[id]; if(!B) return; delete AMB.beds[id];
  const t = KA.ac.currentTime; B.g.gain.setTargetAtTime(0.0001, t, 0.6);
  setTimeout(() => { [...B.src, ...B.osc].forEach(n => { try{ n.stop(); }catch(e){} }); try{ B.g.disconnect(); }catch(e){} }, 3500);
}

/* ---------- 가끔 들리는 소리(event) ---------- */
function ambN(dest, t, d, vol, fq, q, type, buf){ const ac = KA.ac, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = buf || AMB_WHITE; f.type = type || "bandpass"; f.frequency.value = fq; f.Q.value = q || 0.8; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 2); s.stop(t + d + 0.05); return {f, g}; }
function ambT(dest, f, t, d, type, vol, f2){ const ac = KA.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, d / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.03); }
function ambOut(pan, vol){ const g = KA.ac.createGain(); g.gain.value = vol == null ? 1 : vol; ambPan(g, pan).connect(AMB.g); return g; }
const AMB_EV = {
  // 차가 옆을 지나간다 — 부웅 커졌다 작아지며 왼→오
  car:() => { const ac = KA.ac, t = ac.currentTime + 0.05, d = 2.6 + Math.random() * 1.6, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = AMB_BROWN; f.type = "lowpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(1100, t + d * 0.5); f.frequency.linearRampToValueAtTime(320, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + d * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); let n = g; if(ac.createStereoPanner){ const p = ac.createStereoPanner(), dir = Math.random() < 0.5 ? -1 : 1; p.pan.setValueAtTime(-0.8 * dir, t); p.pan.linearRampToValueAtTime(0.8 * dir, t + d); g.connect(p); n = p; } n.connect(AMB.g); s.start(t, Math.random()); s.stop(t + d + 0.1); },
  honk:() => { const o = ambOut(Math.random() * 1.4 - 0.7, 0.5), t = KA.ac.currentTime + 0.05, two = Math.random() < 0.5; [0, two ? 0.28 : null].filter(x => x != null).forEach(dt => { ambT(o, 352, t + dt, 0.24, "square", 0.08); ambT(o, 443, t + dt, 0.24, "square", 0.07); }); },
  // 자전거 따르릉 — 종을 빠르게 여러 번 친다
  bike:() => { const o = ambOut(Math.random() * 1.2 - 0.6, 0.6), t = KA.ac.currentTime + 0.05, n = 7 + (Math.random() * 5 | 0); for(let i = 0; i < n; i++){ const tt = t + i * 0.045, v = 0.12 * (1 - i / (n + 2)); ambT(o, 2350, tt, 0.35, "sine", v); ambT(o, 3490, tt, 0.25, "sine", v * 0.6); ambT(o, 5120, tt, 0.14, "sine", v * 0.35); } },
  // 아이들 꺄르륵 — 높은 목소리가 짧게 오르내리며 겹친다
  kids:() => { const pan = Math.random() * 1.6 - 0.8, o = ambOut(pan, 0.55), ac = KA.ac, t0 = ac.currentTime + 0.05, f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 1.2; f.connect(o);
    const voices = 1 + (Math.random() * 2 | 0) + (Math.random() < 0.4 ? 1 : 0);
    for(let v = 0; v < voices; v++){ const base = 780 + Math.random() * 420, st = t0 + v * (0.15 + Math.random() * 0.4), n = 4 + (Math.random() * 5 | 0);
      for(let i = 0; i < n; i++){ const tt = st + i * (0.1 + Math.random() * 0.04), fq = base * (1.25 - i * 0.05) * (0.94 + Math.random() * 0.12); ambT(f, fq, tt, 0.09, "triangle", 0.1, fq * 1.18); ambN(f, tt, 0.07, 0.03, 2500, 1); } }
    if(Math.random() < 0.5) for(let i = 0; i < 6; i++) ambN(o, t0 + 0.9 + i * 0.18, 0.06, 0.05, 260, 1.5);   // 뛰어가는 발소리
  },
  birds:() => { const o = ambOut(Math.random() * 1.6 - 0.8, 0.35), t = KA.ac.currentTime + 0.05, n = 2 + (Math.random() * 4 | 0), b = 2900 + Math.random() * 1800; for(let i = 0; i < n; i++) ambT(o, b, t + i * 0.13, 0.08, "sine", 0.07, b * (1.25 + Math.random() * 0.3)); },
  steps:() => { const o = ambOut(Math.random() * 1.4 - 0.7, 0.7), t = KA.ac.currentTime + 0.05, n = 4 + (Math.random() * 5 | 0), heel = Math.random() < 0.5; for(let i = 0; i < n; i++){ ambN(o, t + i * 0.42, 0.07, heel ? 0.12 : 0.08, heel ? 1900 : 320, heel ? 2.5 : 1.2); } },
  chime:() => { const o = ambOut(0, 0.45), t = KA.ac.currentTime + 0.05; ambT(o, 659, t, 0.9, "sine", 0.09); ambT(o, 523, t + 0.45, 1.2, "sine", 0.09); },
  paper:() => { const o = ambOut(Math.random() - 0.5, 0.5), t = KA.ac.currentTime + 0.05; for(let i = 0; i < 3; i++) ambN(o, t + i * 0.09, 0.12, 0.05, 4200, 0.6, "highpass"); },
  voice:() => { const o = ambOut(Math.random() * 1.2 - 0.6, 0.35), ac = KA.ac, t = ac.currentTime + 0.05, f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 2; f.connect(o); const b = 140 + Math.random() * 90, n = 3 + (Math.random() * 5 | 0); for(let i = 0; i < n; i++) ambT(f, b * (0.9 + Math.random() * 0.25), t + i * 0.16, 0.14, "sawtooth", 0.04); },
  phone:() => { const o = ambOut(0.5, 0.35), t = KA.ac.currentTime + 0.05; for(let k = 0; k < 2; k++) for(let i = 0; i < 20; i++){ const tt = t + k * 1.6 + i * 0.05; ambT(o, 440, tt, 0.045, "sine", 0.05); ambT(o, 480, tt, 0.045, "sine", 0.05); } },
  keys:() => { const o = ambOut(-0.3, 0.4), t = KA.ac.currentTime + 0.05, n = 5 + (Math.random() * 10 | 0); for(let i = 0; i < n; i++) ambN(o, t + i * (0.08 + Math.random() * 0.1), 0.03, 0.06, 3000, 2); },
  drip:() => { const o = ambOut(Math.random() - 0.5, 0.5), t = KA.ac.currentTime + 0.05, f = 900 + Math.random() * 700; ambT(o, f, t, 0.12, "sine", 0.06, f * 1.7); },
  hammer:() => { const o = ambOut(0.4, 0.5), t = KA.ac.currentTime + 0.05, n = 2 + (Math.random() * 4 | 0); for(let i = 0; i < n; i++) ambN(o, t + i * 0.55, 0.12, 0.2, 520, 1.4); },
  drill:() => { const o = ambOut(-0.4, 0.3), ac = KA.ac, t = ac.currentTime + 0.05, d = 1 + Math.random() * 1.5, s = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); s.type = "sawtooth"; s.frequency.setValueAtTime(180, t); s.frequency.linearRampToValueAtTime(260, t + 0.3); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 1.5; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.1); g.gain.setValueAtTime(0.05, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.2); s.connect(f); f.connect(g); g.connect(o); s.start(t); s.stop(t + d + 0.3); },
  market:() => { for(let i = 0; i < 2 + (Math.random() * 2 | 0); i++) setTimeout(() => AMB && AMB_EV.voice(), i * 500); }};

/* ---------- 지금 어디, 무슨 날씨, 어떤 동네인가 ---------- */
function ambWx(){
  try{ if(typeof snNow === "function" && typeof K !== "undefined" && K){ const N = snNow(); if(N) return {id:N.W.id, m:N.D.m}; } }catch(e){}
  try{ if(typeof lfRec === "function" && lfRec() && typeof snWeatherOf === "function"){ const D = lfDate(); const W = snWeatherOf({y:D.y, m:D.m, d:D.d}); return {id:W.id, m:D.m}; } }catch(e){}
  return {id:"clear", m:0};
}
function ambHour(){ try{ if(typeof lfRec === "function" && lfRec() && typeof lfDate === "function") return lfDate().h; }catch(e){} return 14; }
function ambTraits(){
  const s = typeof KP !== "undefined" && KP ? [KP.addr, KP.title, KP.short, KP.trait].join(" ") : "";
  const T = {traffic:0.5, honk:0.18, kids:0.45, bike:0.35, birds:0.4, market:0, machine:0};
  if(/대로|역세권|역 |역에|사거리|큰길|버스|도로변/.test(s)){ T.traffic = 1; T.honk = 0.6; T.birds = 0.15; }
  if(/학교|초등|학원|놀이터|아이/.test(s)) T.kids = 1.1;
  if(/시장|상가|식당|중식|미용실|카페|모텔|숙박/.test(s)){ T.market = 0.8; T.traffic = Math.max(T.traffic, 0.7); }
  if(/공장|팔탄|창고/.test(s)){ T.machine = 0.7; T.kids = 0.05; T.bike = 0.1; T.traffic = 0.35; }
  if(/읍|면 |리 /.test(s)){ T.traffic = 0.25; T.birds = 0.9; T.honk = 0.05; }
  // 물건마다 조금씩 다르게(고정된 난수 — 게임 난수와 무관)
  const r = kRng((String(KP && KP.id || s).split("").reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7) ^ 0xA3B1) >>> 0);
  Object.keys(T).forEach(k => T[k] = Math.max(0, T[k] * (0.7 + r() * 0.6)));
  return T;
}
function ambScene(){
  if(!AMB_ON || typeof page === "undefined" || page !== "arena") return null;
  if(typeof GX_OP !== "undefined" && GX_OP) return null;                    // 오프닝·엔딩 연출은 자체 음악만
  if(document.getElementById("mtTale")) return AMB && AMB.scene;              // 사연 듣는 중엔 그대로
  if(arenaTab !== "king" || typeof K === "undefined" || !K) return "home";
  if(K.intro || K.sealed || K.revealing || K.step === "won" || K.step === "lost") return "court";
  if(K.step === "brief") return K.loc === "site" ? "street" : "home";
  if(K.step === "move") return "street";
  if(K.step === "defect" || K.step === "list") return "work";
  if(K.step === "sell") return "office";
  return "home";
}
// 장면 → (bed 목록, event 빈도[초당])
function ambPlan(scene){
  const w = ambWx(), wet = w.id === "rain" || w.id === "monsoon", h = ambHour(), night = h >= 20 || h < 6, T = ambTraits();
  const beds = {}, ev = {}, out = scene === "street";
  const inside = !out;
  if(wet) beds.rain = [w.id === "monsoon" ? (out ? 0.55 : 0.28) : (out ? 0.38 : 0.18), inside];
  if(w.id === "cold" || w.id === "snow") beds.wind = [out ? 0.22 : 0.08, false];
  if(scene === "court"){ beds.murmur = [0.2]; beds.room = [0.18]; Object.assign(ev, {steps:0.1, paper:0.06, chime:0.012, voice:0.12}); }
  if(scene === "home"){ beds.room = [0.22]; if(!wet) Object.assign(ev, {birds:night ? 0 : 0.015, car:0.02}); if(wet) ev.drip = 0.1; }
  if(scene === "office"){ beds.room = [0.16]; beds.traffic = [0.12]; Object.assign(ev, {keys:0.06, phone:0.008, chime:0.01, car:0.03, voice:0.04}); }
  if(scene === "work"){ beds.room = [0.16]; Object.assign(ev, {hammer:0.05, drill:0.03, car:0.02, steps:0.02}); }
  if(scene === "street"){
    beds.traffic = [0.08 + T.traffic * 0.16];
    if(T.machine) beds.machine = [T.machine * 0.1];
    const dry = wet ? 0.35 : 1, snowy = w.id === "snow" ? 0.4 : 1;
    Object.assign(ev, {car:(0.04 + T.traffic * 0.1) * snowy, honk:T.honk * 0.03 * snowy, bike:T.bike * 0.025 * dry, kids:night ? 0 : T.kids * 0.035 * dry, birds:night ? 0 : T.birds * 0.04 * dry, steps:0.03, market:T.market * 0.03 * dry});
    if(!wet && !night && w.m >= 6 && w.m <= 8 && w.id !== "cloudy") beds.cicada = [0.07];
    if(night && !wet && w.m >= 5 && w.m <= 10) beds.crickets = [0.05];
  }
  return {beds, ev, key:scene + "|" + w.id + "|" + (night ? "n" : "d") + "|" + (KP && KP.id || "")};
}
function ambSync(){
  const off = typeof KA_UNLOCKED === "undefined" || !KA_UNLOCKED || kaCfg().mute || !(kaCfg().amb > 0);
  const scene = off ? null : ambScene();
  if(!scene){ if(AMB){ Object.keys(AMB.beds).forEach(ambBedOff); AMB.ev = {}; AMB.scene = null; AMB.key = ""; } return; }
  if(!ambInit()) return;
  const P = ambPlan(scene); if(AMB.key === P.key) return;
  AMB.key = P.key; AMB.scene = scene; AMB.ev = P.ev;
  Object.keys(AMB.beds).forEach(id => { if(!P.beds[id]) ambBedOff(id); });
  Object.entries(P.beds).forEach(([id, [v, inside]]) => ambBedOn(id, v, inside));
}
// 가끔 들리는 소리 — 0.5초마다 빈도대로 굴린다(한 번에 너무 겹치지 않게 최근 발생은 잠깐 쉰다)
setInterval(() => {
  if(!AMB || !AMB.scene || !KA || KA.ac.state !== "running" || document.hidden) return;
  const now = performance.now();
  Object.entries(AMB.ev).forEach(([k, rate]) => { if(!rate || !AMB_EV[k]) return; if((AMB.last || 0) > now - 700) return; if(Math.random() < rate * 0.5){ AMB.last = now; try{ AMB_EV[k](); }catch(e){} } });
}, 500);
setInterval(() => { try{ ambSync(); }catch(e){} }, 1500);
if(typeof renderArena === "function"){ const _amb_r = renderArena; renderArena = function(){ const o = _amb_r.apply(this, arguments); try{ ambSync(); }catch(e){} return o; }; }
document.addEventListener("pointerdown", () => setTimeout(() => { try{ ambSync(); }catch(e){} }, 60), true);
// 볼륨: 소리 설정에 '🌆 환경음' 막대
if(typeof kaApplyVol === "function"){ const _amb_v = kaApplyVol; kaApplyVol = function(){ _amb_v.apply(this, arguments); if(AMB && KA) AMB.g.gain.setTargetAtTime(ambVol(), KA.ac.currentTime, 0.05); }; }
if(typeof kcSfxBtn === "function"){ const _amb_btn = kcSfxBtn; kcSfxBtn = function(){ const h = _amb_btn.apply(this, arguments), c = kaCfg(), a = c.amb == null ? 80 : c.amb; return h.replace('<label class="kc-audio-mute">', `<label>🌆 환경음 <input type="range" min="0" max="100" value="${a}" data-kaset="amb"><output>${a}</output></label><label class="kc-audio-mute">`); }; }
