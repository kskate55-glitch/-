/* ================= 🌦️ 살아 있는 세계 — 환경음 · 사람 반응음 · 날씨 · 계절/시기 · 대사 읽기 =================
   음원 파일 없이 WebAudio로 즉석 합성한다. 레이어: BGM / 환경음 / 효과음 / 음성(반응음).
   날씨·시기는 배경이 아니라 수치에 들어간다 — 조사 시간, 누수 단서, 경쟁자 수, 명도 일정, 수리비·기간, 매수 문의. */

/* ---------- 🔊 설정 확장: 마스터·환경음·음성·대사 읽기 ---------- */
Object.assign(KA_DEF, {master:100, amb:60, voice:80, react:true, tts:false, ttsAuto:false});
const _sn_ctx = kaCtx; kaCtx = function(){
  const A = _sn_ctx(); if(!A) return A;
  if(!A.amb){
    const ac = A.ac, master = ac.createGain();
    try{ A.comp.disconnect(); }catch(e){}
    A.comp.connect(master); master.connect(ac.destination);
    const amb = ac.createGain(), voice = ac.createGain(); amb.connect(A.comp); voice.connect(A.comp);
    Object.assign(A, {master, amb, voice}); kaApplyVol();
  }
  return A;
};
let SN_DUCK = 1;
kaApplyVol = function(){
  if(!KA) return; const c = kaCfg(), t = KA.ac.currentTime, m = c.mute ? 0 : 1;
  KA.bgm.gain.setTargetAtTime(m * (c.bgm/100) * 0.55 * SN_DUCK, t, 0.08);
  KA.sfx.gain.setTargetAtTime(m * (c.sfx/100) * 0.5, t, 0.05);
  if(KA.master){ KA.master.gain.setTargetAtTime(m * (c.master/100), t, 0.05); KA.amb.gain.setTargetAtTime(m * (c.amb/100) * 0.5 * SN_DUCK, t, 0.08); KA.voice.gain.setTargetAtTime(m * (c.voice/100) * 0.7, t, 0.05); }
};
kcSfxBtn = function(){
  const c = kaCfg(), sl = (k, ic, t) => `<label>${ic} ${t} <input type="range" min="0" max="100" value="${c[k]}" data-kaset="${k}"><output>${c[k]}</output></label>`;
  const ck = (k, t) => `<label class="kc-audio-mute"><input type="checkbox" data-kaflag="${k}" ${c[k]?"checked":""}> ${t}</label>`;
  return `<details class="kc-audio"><summary>${c.mute?"🔇 소리 꺼짐":"🔊 소리"}</summary><div class="kc-audio-in">
    ${sl("master","🎚️","전체")}${sl("bgm","🎵","BGM")}${sl("amb","🌧️","환경음")}${sl("sfx","🔔","효과음")}${sl("voice","🗣️","사람 소리")}
    <label class="kc-audio-mute"><input type="checkbox" data-kaset="mute" ${c.mute?"checked":""}> 음소거</label>
    ${ck("react","감정 반응음(한숨·호통…)")}${ck("tts","대사 읽기 버튼 보이기")}${ck("ttsAuto","새 대사 자동으로 읽기")}
    <div class="sn-test"><button type="button" data-sntest="amb">▶ 환경음</button><button type="button" data-sntest="voice">▶ 반응음</button><button type="button" data-sntest="chime">▶ 따랑~</button></div></div></details>`;
};
document.addEventListener("change", e => {
  const t = e.target; if(!t || !t.matches || !t.matches("[data-kaflag]")) return;
  const c = kaCfg(); c[t.dataset.kaflag] = t.checked; kaSave(c);
  if(t.dataset.kaflag === "tts" || t.dataset.kaflag === "ttsAuto"){ snTtsButton(); if(!t.checked && window.speechSynthesis) speechSynthesis.cancel(); }
});
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-sntest]"); if(!b) return;
  KA_UNLOCKED = true; const A = kaCtx(); if(!A) return; if(A.ac.state === "suspended") A.ac.resume();
  const t = A.ac.currentTime + 0.05, k = b.dataset.sntest;
  if(k === "amb"){ SN_EV.car(A.amb, t, 1); SN_EV.dog(A.amb, t + 1.4, 1); SN_EV.babble(A.amb, t + 2.2, {n:7, vol:0.5}); }
  if(k === "voice") snReact("angry", "m");
  if(k === "chime") snChime();
});

/* ---------- 🔉 합성 재료 ---------- */
let SN_NOISE = null;
function snNoiseBuf(){ const ac = KA.ac; if(SN_NOISE) return SN_NOISE; const n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), a = buf.getChannelData(0); let b = 0; for(let i=0;i<n;i++){ const w = Math.random()*2-1; b = 0.97*b + 0.03*w; a[i] = w*0.6 + b*2.2; } SN_NOISE = buf; return buf; }
const snR = (a, b) => a + Math.random() * (b - a);
function snEnv(g, t, a, peak, hold, rel){ g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); }
function snNoiseHit(dest, t, d, vol, fq, q, type, fq2){ const ac = KA.ac, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = snNoiseBuf(); f.type = type || "bandpass"; f.frequency.setValueAtTime(fq, t); if(fq2) f.frequency.exponentialRampToValueAtTime(fq2, t + d); f.Q.value = q || 1; snEnv(g, t, Math.min(0.04, d/4), vol, d*0.3, d*0.7); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + d + 0.1); }
function snTone(dest, t, f, f2, d, type, vol, lp, vib){ const ac = KA.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); let n = o;
  if(vib){ const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + d + 0.05); }
  if(lp){ const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; o.connect(fl); n = fl; }
  snEnv(g, t, Math.min(0.03, d/5), vol, d*0.35, d*0.65); n.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.08); }
// 말소리 흉내 — 음절 단위로 음높이가 움직이는 성대음 + 포먼트 필터(알아듣는 말이 아니라 '사람이 말한다'는 느낌)
function snSyl(dest, t, f0, d, vol, lp, f1){ const ac = KA.ac, o = ac.createOscillator(), fa = ac.createBiquadFilter(), fb = ac.createBiquadFilter(), g = ac.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * snR(0.85, 1.15), t + d);
  fa.type = "bandpass"; fa.frequency.value = f1 || snR(500, 900); fa.Q.value = 3; fb.type = "lowpass"; fb.frequency.value = lp || 1800;
  snEnv(g, t, 0.025, vol, d*0.5, d*0.5); o.connect(fa); fa.connect(fb); fb.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.06); }
function snBed(dest, spec){
  const ac = KA.ac, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = snNoiseBuf(); s.loop = true;
  f.type = spec.type || "lowpass"; f.frequency.value = spec.f; f.Q.value = spec.q || 0.7; g.gain.value = spec.vol;
  let lfo = null; if(spec.lfo){ lfo = ac.createOscillator(); const lg = ac.createGain(); lfo.frequency.value = spec.lfo[0]; lg.gain.value = spec.vol * spec.lfo[1]; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
  let chain = f; if(spec.lp2){ const f2 = ac.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = spec.lp2; f.connect(f2); chain = f2; }
  s.connect(f); chain.connect(g); g.connect(dest); s.start(0, Math.random() * 1.5);
  return () => { try{ s.stop(); if(lfo) lfo.stop(); }catch(e){} };
}
function snHumBed(dest, f, vol){ const ac = KA.ac, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o2.frequency.value = f * 2; g.gain.value = vol; o.connect(g); o2.connect(g); g.connect(dest); o.start(); o2.start(); return () => { try{ o.stop(); o2.stop(); }catch(e){} }; }

/* ---------- 🏙️ 생활 소리 이벤트 ---------- */
const SN_EV = {
  paper:(d,t)=>{ snNoiseHit(d, t, 0.09, 0.25, 3800, 0.8, "highpass"); snNoiseHit(d, t + 0.11, 0.07, 0.18, 4200, 0.8, "highpass"); },
  cough:(d,t)=>{ snNoiseHit(d, t, 0.13, 0.3, 450, 1.2); snNoiseHit(d, t + 0.2, 0.1, 0.22, 500, 1.2); },
  chair:(d,t)=>{ snTone(d, t, 140, 95, 0.45, "sawtooth", 0.05, 700); },
  steps:(d,t)=>{ const n = 3 + Math.floor(Math.random()*3); for(let i=0;i<n;i++) snNoiseHit(d, t + i*0.42, 0.07, 0.22, 220, 1.5, "lowpass"); },
  car:(d,t,v)=>{ snNoiseHit(d, t, 3.2, 0.22 * (v||1), 300, 0.7, "lowpass", 900); },
  bike:(d,t)=>{ snTone(d, t, 85, 150, 2.2, "sawtooth", 0.06, 600); },
  dog:(d,t)=>{ const n = 1 + Math.floor(Math.random()*3); for(let i=0;i<n;i++) snTone(d, t + i*0.28, 560, 330, 0.13, "square", 0.08, 1300); },
  cat:(d,t)=>{ snTone(d, t, 620, 520, 0.7, "sine", 0.05, 2400, [6, 40]); },
  birds:(d,t)=>{ for(let i=0;i<4;i++) snTone(d, t + i*0.13, snR(2600, 3800), snR(3000, 4400), 0.07, "sine", 0.03); },
  babble:(d,t,o)=>{ o = o || {}; const f0 = o.f0 || snR(150, 240), n = o.n || (4 + Math.floor(Math.random()*6)); let tt = t;
    for(let i=0;i<n;i++){ const dd = snR(0.09, 0.2); snSyl(d, tt, f0 * snR(0.85, 1.25), dd, (o.vol || 0.12) * snR(0.6, 1), o.lp || 1400); tt += dd + snR(0.02, 0.09); } },
  laugh:(d,t,o)=>{ const f0 = (o && o.f0) || snR(200, 280); for(let i=0;i<4;i++){ snSyl(d, t + i*0.16, f0 * (1.15 - i*0.06), 0.1, 0.1, 1600, 800); snNoiseHit(d, t + i*0.16, 0.08, 0.05, 1500, 1); } },
  tv:(d,t)=>{ SN_EV.babble(d, t, {n:6, vol:0.08, lp:520, f0:snR(120, 200)}); snTone(d, t, 330, 330, 1.4, "triangle", 0.015, 600); },
  drill:(d,t)=>{ snTone(d, t, 95, 110, 1.3, "square", 0.025, 900, [38, 25]); },
  metalDoor:(d,t)=>{ snTone(d, t, 180, 120, 0.4, "square", 0.05, 900); snNoiseHit(d, t, 0.25, 0.2, 900, 2); },
  printer:(d,t)=>{ for(let i=0;i<6;i++) snNoiseHit(d, t + i*0.22, 0.15, 0.08, 1900, 2); },
  phone:(d,t)=>{ for(let k=0;k<2;k++) for(let i=0;i<10;i++){ snTone(d, t + k*1.3 + i*0.05, 440, null, 0.045, "sine", 0.03); snTone(d, t + k*1.3 + i*0.05, 480, null, 0.045, "sine", 0.03); } },
  keys:(d,t)=>{ const n = 5 + Math.floor(Math.random()*8); for(let i=0;i<n;i++) snNoiseHit(d, t + i*snR(0.07, 0.16), 0.025, 0.1, 4200, 2, "highpass"); },
  drip:(d,t)=>{ snTone(d, t, 1400, 520, 0.08, "sine", 0.07); },
  zap:(d,t)=>{ snNoiseHit(d, t, 0.18, 0.12, 5000, 3, "highpass"); snTone(d, t, 60, 60, 0.25, "sawtooth", 0.02, 400); },
  cicada:(d,t)=>{ snTone(d, t, 4600, 4400, 3.5, "sawtooth", 0.012, 7000, [28, 900]); },
  truck:(d,t)=>{ for(let i=0;i<4;i++) snTone(d, t + i*0.8, 1100, null, 0.4, "square", 0.02, 2000); },
  gust:(d,t)=>{ snNoiseHit(d, t, 2.4, 0.18, 250, 0.6, "lowpass", 600); }
};
// 장면별 환경음: 바닥에 깔리는 소리(beds) + 가끔 들리는 소리(ev: [이름, 최소초, 최대초, 옵션])
const SN_SCENES = {
  room:       {beds:[{f:180, vol:0.05}], hum:[60, 0.004], ev:[["car",7,16,{v:0.35}],["keys",9,20],["paper",14,30]]},
  office:     {beds:[{f:180, vol:0.05}], hum:[60, 0.006], ev:[["keys",5,12],["phone",25,55],["printer",18,40],["car",10,24,{v:0.3}]]},
  court:      {beds:[{type:"bandpass", f:520, q:0.6, vol:0.1, lfo:[0.15, 0.4]}], ev:[["babble",0.4,1.2,{vol:0.06, lp:1100}],["paper",3,7],["cough",5,11],["chair",8,16],["steps",6,13]]},
  court_many: {beds:[{type:"bandpass", f:520, q:0.6, vol:0.17, lfo:[0.2, 0.35]}], ev:[["babble",0.2,0.7,{vol:0.07, lp:1200}],["laugh",8,16],["paper",2,5],["cough",4,9],["chair",6,12],["steps",4,9]]},
  court_few:  {beds:[{type:"bandpass", f:480, q:0.6, vol:0.035}], hum:[60, 0.005], ev:[["cough",6,14],["paper",7,15],["steps",9,18]]},
  court_hush: {beds:[{type:"bandpass", f:480, q:0.6, vol:0.03}], hum:[60, 0.004], ev:[["cough",4,9],["paper",5,10]]},
  site_day:   {beds:[{f:320, vol:0.08, lfo:[0.07, 0.3]}], ev:[["car",4,10],["bike",12,26],["dog",14,32],["babble",9,20,{vol:0.07, lp:1300}],["birds",10,24],["cat",30,70],["drill",40,90],["truck",60,140]]},
  site_night: {beds:[{f:260, vol:0.045}], ev:[["car",10,22,{v:0.6}],["tv",8,18],["laugh",14,30],["babble",10,22,{vol:0.08, lp:1500, f0:170}],["bike",18,40],["dog",20,45],["metalDoor",22,50]]},
  house:      {beds:[{f:200, vol:0.045}], hum:[60, 0.004], ev:[["tv",9,20],["car",12,26,{v:0.3}],["steps",14,30],["dog",30,70]]},
  empty:      {beds:[{f:240, vol:0.035}], hum:[120, 0.003], ev:[["drip",1.6,3.6],["zap",18,45],["gust",15,35]]},
  broker:     {beds:[{f:200, vol:0.045}], hum:[60, 0.005], ev:[["keys",4,10],["phone",16,40],["printer",14,32],["babble",10,22,{vol:0.05, lp:1200}]]}
};
// 날씨 레이어 — 밖이면 그대로, 안이면 창 너머로(먹먹하게)
const SN_WX_LAYER = {
  rain:   {beds:[{type:"highpass", f:1800, vol:0.14, lp2:7000},{f:500, vol:0.06}], ev:[["drip",0.8,2.4]]},
  monsoon:{beds:[{type:"highpass", f:1500, vol:0.22, lp2:7500},{f:450, vol:0.1, lfo:[0.1, 0.25]}], ev:[["drip",0.4,1.4],["gust",12,26]]},
  snow:   {beds:[{f:300, vol:0.07, lfo:[0.08, 0.5]}], ev:[["gust",10,22]]},
  cold:   {beds:[{f:380, vol:0.1, lfo:[0.12, 0.55]}], ev:[["gust",6,14]]},
  heat:   {beds:[], ev:[["cicada",4,9]]},
  cloudy: {beds:[{f:300, vol:0.03, lfo:[0.05, 0.5]}], ev:[]},
  clear:  {beds:[], ev:[]}
};
let SN_AMB = null;      // {key, g, stops, next, dead}
let SN_AMB_TIMER = null;
function snAmbStart(key){
  const A = kaCtx(); if(!A || !A.amb) return;
  const [base, wx, where] = key.split("|"), sc = SN_SCENES[base], ly = SN_WX_LAYER[wx] || SN_WX_LAYER.clear;
  if(!sc) return;
  const ac = A.ac, g = ac.createGain(); g.gain.value = 0.0001; g.connect(A.amb); g.gain.exponentialRampToValueAtTime(1, ac.currentTime + 1.2);
  const inside = where === "in", wg = ac.createGain(); wg.gain.value = inside ? 0.55 : 1;
  let wdest = wg; if(inside){ const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; wg.connect(f); f.connect(g); } else wg.connect(g);
  const stops = sc.beds.map(b => snBed(g, b)).concat(ly.beds.map(b => snBed(wdest, b)));
  if(sc.hum) stops.push(snHumBed(g, sc.hum[0], sc.hum[1]));
  const now = performance.now() / 1000, evs = sc.ev.map(e => ({e, dest:g})).concat(ly.ev.map(e => ({e, dest:wdest})));
  const inst = {key, g, stops, evs:evs.map(x => Object.assign(x, {next: now + snR(0.5, x.e[1])})), dead:false};
  SN_AMB = inst;
  if(!SN_AMB_TIMER) SN_AMB_TIMER = setInterval(snAmbPump, 250);
}
function snAmbPump(){
  const I = SN_AMB; if(!I || I.dead || !KA || document.hidden || KA.ac.state !== "running") return;
  const now = performance.now() / 1000;
  for(const x of I.evs){ if(now >= x.next){ const [name, a, b, opt] = x.e; try{ SN_EV[name](x.dest, KA.ac.currentTime + 0.05, opt && opt.v != null ? opt.v : opt); }catch(e){} x.next = now + snR(a, b); } }
}
function snAmbStop(){
  const I = SN_AMB; if(!I) return; I.dead = true; SN_AMB = null;
  const t = KA.ac.currentTime; I.g.gain.cancelScheduledValues(t); I.g.gain.setValueAtTime(Math.max(0.0001, I.g.gain.value), t); I.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  setTimeout(() => { I.stops.forEach(s => s()); try{ I.g.disconnect(); }catch(e){} }, 1300);
}
function snAmbWant(key){
  if(!KA_UNLOCKED || !key){ if(!key && SN_AMB) snAmbStop(); return; }
  if(SN_AMB && SN_AMB.key === key) return;
  if(SN_AMB) snAmbStop();
  snAmbStart(key);
}

/* ---------- 📅 달력 · 날씨 · 시기 ---------- */
const SN_DOW = ["일","월","화","수","목","금","토"];
const SN_WX = {
  clear:{t:"맑음", ic:"☀️"}, cloudy:{t:"흐림", ic:"☁️"}, rain:{t:"비", ic:"🌧️"}, monsoon:{t:"장마", ic:"☔"},
  snow:{t:"눈", ic:"🌨️"}, cold:{t:"한파", ic:"🥶"}, heat:{t:"폭염", ic:"🥵"}};
// 시기: [시작월,일, 끝월,일] (끝 포함) — 해마다 조금씩 다른 명절은 게임용으로 대략 잡았다
const SN_PERIODS = [
  {id:"moving", t:"이사철", ic:"📦", r:[[3,1,4,25],[9,1,9,17],[10,6,10,31]], d:"실수요자가 움직인다 — 매수 문의↑ · 경쟁 입찰↑ · 이사·수리 비용 조금↑"},
  {id:"monsoon",t:"장마철", ic:"☔", r:[[6,24,7,26]], d:"누수·곰팡이가 잘 드러난다 · 현장 이동이 오래 걸린다 · 이사·공사 지연"},
  {id:"vacation",t:"휴가철", ic:"🏖️", r:[[7,22,8,18]], d:"중개사·업자 일정이 밀린다 · 매수 문의 잠시 줄어든다"},
  {id:"chuseok",t:"추석 연휴 전후", ic:"🌕", r:[[9,18,10,5]], d:"등기·이사·명도 날짜가 밀리기 쉽다"},
  {id:"seollal",t:"설 연휴 전후", ic:"🧧", r:[[2,10,2,22]], d:"등기·이사·명도 날짜가 밀리기 쉽다"},
  {id:"yearend",t:"연말·연초", ic:"🎄", r:[[12,15,12,31],[1,1,1,10]], d:"대출·계약 일정이 늘어지고 거래 심리가 보수적"},
  {id:"offseason",t:"겨울 비수기", ic:"❄️", r:[[11,25,12,14],[1,11,2,9]], d:"매수 문의가 뜸하다 · 경쟁도 약해진다 · 배관·결로 하자↑"}];
function snDate(ms){ const d = new Date(ms); return {y:d.getUTCFullYear(), m:d.getUTCMonth()+1, d:d.getUTCDate(), dow:d.getUTCDay(), ms}; }
function snIn(D, r){ const v = D.m * 100 + D.d, a = r[0] * 100 + r[1], b = r[2] * 100 + r[3]; return v >= a && v <= b; }
function snPeriods(D){ return SN_PERIODS.filter(p => p.r.some(r => snIn(D, r))); }
function snSeason(m){ return m >= 3 && m <= 5 ? "봄" : m >= 6 && m <= 8 ? "여름" : m >= 9 && m <= 11 ? "가을" : "겨울"; }
function snWeatherOf(D){
  const r = kRng(((D.y * 1000 + D.m * 40 + D.d) * 2654435761) >>> 0), u = (r(), r());
  const P = snPeriods(D).map(p => p.id);
  let table;
  if(P.includes("monsoon")) table = [["monsoon",0.62],["cloudy",0.16],["heat",0.12],["clear",0.1]];
  else if(D.m === 12 || D.m <= 2) table = [["clear",0.42],["cloudy",0.22],["snow",0.16],["cold",0.2]];
  else if(D.m <= 5) table = [["clear",0.55],["cloudy",0.25],["rain",0.2]];
  else if(D.m <= 8) table = [["heat",0.35],["clear",0.3],["rain",0.17],["cloudy",0.18]];
  else if(D.m <= 10) table = [["clear",0.6],["cloudy",0.25],["rain",0.15]];
  else table = [["clear",0.45],["cloudy",0.3],["rain",0.13],["cold",0.12]];
  let acc = 0, id = table[table.length-1][0]; for(const [k, p] of table){ acc += p; if(u < acc){ id = k; break; } }
  const base = [-2,1,7,13,18,22,26,27,22,15,7,0][D.m - 1], temp = Math.round(base + (r() - 0.5) * 6 + (id === "heat" ? 6 : id === "cold" ? -8 : id === "snow" ? -3 : 0));
  return Object.assign({id, temp}, SN_WX[id]);
}
function snStartMs(){
  if(K.board && typeof bdRec === "function") return Date.UTC(2026, 2, 4) + (bdRec().n - 1) * 7 * 864e5;   // 게시판 1주차 = 2026.03.04(수)
  if(K.mode === "weekly"){ const n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); }
  return Date.UTC(2026, 0, 1) + ((K.seed >>> 0) % 365) * 864e5;
}
function snNow(){                       // 지금 이 판의 날짜·날씨·시기
  if(!K) return null;
  if(K.cal0 == null) K.cal0 = snStartMs();
  const D = snDate(K.cal0 + (K.day || 0) * 864e5), P = snPeriods(D), W = snWeatherOf(D);
  const mon = P.find(p => p.id === "monsoon");
  let monDay = 0; if(mon){ const [a, b] = mon.r[0]; monDay = Math.round((D.ms - Date.UTC(D.y, a - 1, b)) / 864e5) + 1; }
  return {D, P, W, season:snSeason(D.m), has:id => P.some(p => p.id === id), monDay};
}
function snLine(N){ N = N || snNow(); if(!N) return ""; const {D, W} = N;
  const per = N.P.filter(p => p.id !== "offseason" || !N.has("yearend")).map(p => p.id === "monsoon" && N.monDay ? `${p.t.replace("철","")} ${N.monDay}일차` : p.t);
  return `${D.y}.${String(D.m).padStart(2,"0")}.${String(D.d).padStart(2,"0")} · ${SN_DOW[D.dow]} · ${N.season}${per.length ? " · " + per.join(" · ") : ""} · ${W.ic} ${W.t} ${W.temp}°C`; }

/* ---------- 🎲 날씨·시기가 실제 수치에 들어가는 곳 ---------- */
// 1) 판 시작: 날짜 정하기 + 경쟁 분위기
const _sn_kStart = kStart; kStart = function(seed){
  _sn_kStart(seed); if(!K) return;
  K.cal0 = snStartMs(); const N = snNow();
  K.rain = N.W.id === "rain" || N.W.id === "monsoon";          // polish2의 '비 +15%'를 진짜 날씨로
  K.snNotes = [];
  if(N.has("moving") && K.rivals.length){ const v = K.rivals[0]; K.rivals.push({t:"이사철 실수요자", lo:v.lo, hi:v.hi * 1.02}); K.snNotes.push("📦 이사철 — 실수요자가 입찰장에 한 명 더 나온다."); }
  if((N.has("offseason") || N.has("yearend")) && K.rivals.length >= 3){ K.rivals.pop(); K.snNotes.push("❄️ 비수기 — 경쟁자가 한 명 줄었다."); }
};
// 2) 조사: 날씨별 현장 시간 · 장마/비엔 누수 단서가 잘 보인다
function snSiteMul(){ if(!K) return 1; const w = snNow().W.id; return w === "monsoon" ? 1.05 : w === "snow" || w === "cold" ? 1.15 : w === "heat" ? 1.08 : 1; }
const _sn_krDur = krDur; krDur = function(a){ const d = _sn_krDur(a), m = a.loc === "site" ? snSiteMul() : 1; return m === 1 ? d : d.map(x => Math.round(x * m)); };
const _sn_krRoll = krRoll; krRoll = function(a){
  if(!K) return _sn_krRoll(a); const w = snNow().W.id;
  if((w === "rain" || w === "monsoon") && a.out && a.out.some(o => [].concat(o.reveal || [], o.hint || []).includes("leak"))){
    const bump = w === "monsoon" ? 0.2 : 0.12;
    return _sn_krRoll(Object.assign({}, a, {out:a.out.map(o => [].concat(o.reveal || [], o.hint || []).includes("leak") ? Object.assign({}, o, {p:Math.min(0.95, o.p + bump)}) : o)}));
  }
  return _sn_krRoll(a);
};
// 3) 명도: 장마·명절·한파는 이사를 미룰 핑계가 된다(한 판에 한 번)
function snMoveDelay(){
  if(!K || K._snMoved) return; K._snMoved = true;
  const N = snNow(); let n = 0, t = "";
  if(N.has("monsoon") || N.W.id === "monsoon") { n = 2; t = "☔ 장마 — \"비 오는데 이삿짐을 어떻게 싸요\" 이사가 이틀 밀렸다."; }
  else if(N.has("chuseok") || N.has("seollal")){ n = 3; t = "🌕 명절 전 — \"명절은 지내고 나갈게요\" 사흘 밀렸다."; }
  else if(N.W.id === "cold" || N.W.id === "snow"){ n = 2; t = "🥶 한파 — 이삿짐센터가 날짜를 못 잡아 이틀 밀렸다."; }
  else if(N.has("vacation")){ n = 1; t = "🏖️ 휴가철 — 연락이 닿는 가족이 휴가 중이라 하루 밀렸다."; }
  if(n){ kDay(n); kLog(t); K.snNotes.push(t); K._snMoveNote = t; }
}
const _sn_kMove = kMove; kMove = function(id){ _sn_kMove(id); if(K && K.step === "move") snMoveDelay(); };
if(typeof k2Move === "function"){ const _sn_k2Move = k2Move; k2Move = function(id){ _sn_k2Move(id); if(K && K.step === "move") snMoveDelay(); }; }
// 4) 수리: 겨울 배관·장마 곰팡이 · 휴가철/장마 공사 지연 · 이사철 비용↑
function snRepairExtra(base){
  const N = snNow(), out = []; let cost = 0, days = 0;
  if(N.season === "겨울"){ cost += 35; out.push("🥶 겨울 — 배관 동파 점검·보온 35만원 추가"); }
  if(N.has("monsoon") || N.W.id === "monsoon"){ cost += 30; days += 2; out.push("☔ 장마 — 곰팡이 제거·건조에 30만원, 공사 이틀 지연"); }
  if(N.has("vacation")){ days += 3; out.push("🏖️ 휴가철 — 업자 일정이 밀려 사흘 지연"); }
  if(N.has("moving") && base > 0){ const c = Math.round(base * 0.08); cost += c; out.push(`📦 이사철 — 업자 성수기라 비용 +8% (${kMan(c)})`); }
  if(cost) K.cost.repair += cost; if(days) kDay(days);
  if(out.length){ out.forEach(x => kLog(x)); K._snRepair = out; }
}
const _sn_kRepair = kRepair; kRepair = function(id){ const p = K_REPAIR.find(x=>x.id===id); _sn_kRepair(id); if(K) snRepairExtra(p ? p.cost : 0); };
if(typeof k2Fix === "function"){ const _sn_k2Fix = k2Fix; k2Fix = function(id){ const before = K.cost.repair; _sn_k2Fix(id); if(K && K.step !== "defect") snRepairExtra(Math.max(0, K.cost.repair - before)); }; }
// 5) 매도: 이사철엔 문의가 더, 휴가철·비수기·연말엔 덜 — 원래 확률 흐름(K.r)은 건드리지 않고 별도 주사위로
function snSaleSeason(){
  const S = K.sale; if(!S || S.done) return;
  const N = snNow(), r = kRng(((K.seed ^ (S.weeks * 7919 + 17)) >>> 0) || 3); r();
  if(S.offer && !S.offer.script && (N.has("vacation") || N.has("offseason") || N.has("yearend")) && r() < 0.2){ S.offer = null; S.snNote = `${N.has("vacation") ? "🏖️ 휴가철" : "❄️ 비수기"}이라 이번 주 문의가 끊겼다.`; return; }
  if(!S.offer && N.has("moving") && r() < 0.2){ const b = K_BUYERS[Math.floor(r() * K_BUYERS.length)]; S.offer = {amt:Math.min(S.list, Math.round(S.trueP * (1 - b.flex - r()*0.01) / 10) * 10), buyer:b}; S.snNote = "📦 이사철 — 급하게 집을 찾는 사람이 연락해 왔다."; return; }
  S.snNote = "";
}
const _sn_kWeek = kWeek; kWeek = function(){ _sn_kWeek(); if(K) snSaleSeason(); };
if(typeof k2Week === "function"){ const _sn_k2Week = k2Week; k2Week = function(){ _sn_k2Week(); if(K) snSaleSeason(); }; }

/* ---------- 🗓️ 화면: 날짜 줄 · 날씨 효과 안내 · 비/눈 그림 ---------- */
function snChip(){ const N = snNow(); return N ? `<div class="sn-chip" title="${esc(N.P.map(p=>p.t + ": " + p.d).join("\n"))}">📅 ${esc(snLine(N))}</div>` : ""; }
function snEffectsHTML(){
  const N = snNow(); if(!N) return "";
  const lines = [];
  const w = N.W.id;
  if(w === "rain") lines.push("🌧️ 비 — 현장 조사 +15% · 누수 단서가 더 잘 보인다");
  if(w === "monsoon") lines.push("☔ 장마 — 현장 조사 +20% · 누수 단서가 훨씬 잘 보인다");
  if(w === "snow" || w === "cold") lines.push(`${N.W.ic} ${N.W.t} — 현장 조사 +15%`);
  if(w === "heat") lines.push("🥵 폭염 — 오래 걷는 현장 조사 +8%");
  N.P.forEach(p => lines.push(`${p.ic} ${p.t} — ${p.d}`));
  (K.snNotes || []).forEach(x => { if(!lines.includes(x)) lines.push(x); });
  return lines.length ? `<details class="panel sn-fx"><summary>${N.W.ic} 오늘 날씨·시기가 판에 주는 영향 (${lines.length})</summary><ul class="note">${lines.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details>` : "";
}
const _sn_kingHTML = kingHTML; kingHTML = function(){
  let h = _sn_kingHTML();
  if(!K || K.intro || K.revealing || K.sealed) return h;
  if(K.step === "brief"){ const at = h.indexOf('<div class="panel kr-clock">'); const ins = snChip() + snEffectsHTML(); h = at >= 0 ? h.slice(0, at) + ins + h.slice(at) : ins + h; }
  const extra = [];
  if(K.step === "move" && K._snMoveNote) extra.push(K._snMoveNote);
  if((K.step === "list" || K.step === "sell" || K.step === "defect") && K._snRepair && !K._snRepairShown){ extra.push(...K._snRepair); if(K.step === "sell") K._snRepairShown = true; }
  if(K.step === "sell" && K.sale && K.sale.snNote) extra.push(K.sale.snNote);
  if(extra.length){ const box = `<div class="panel sn-note">${snChip()}<ul>${extra.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`; const at = h.indexOf('<div class="k-hud'); h = at >= 0 ? h.slice(0, at) + box + h.slice(at) : h + box; }
  return h;
};
const _sn_kfsHeader = kfsHeader; kfsHeader = function(){
  const h = _sn_kfsHeader();
  if(arenaTab !== "king" || !K || K.intro) return h;
  const N = snNow(); if(!N) return h;
  return h.replace('</span></div>\n    <div class="kfs-tools">', ` · ${N.W.ic} ${N.D.m}/${N.D.d}(${SN_DOW[N.D.dow]}) ${N.W.temp}°</span></div>\n    <div class="kfs-tools">`);
};

/* ---------- 🗣️ 사람 반응음 · 대사 읽기 ---------- */
function snVoicePitch(){ const pid = (KP && KP.occ && KP.occ.pid) || ""; const f = /grandma|halmoni|woman|mom|coop|lady|girl|f_|female|jeong|eunju/i.test(pid) ? 1.7 : 1; const old = /grand|old|elder|halabeoji/i.test(pid) ? 0.85 : 1; return 120 * f * old; }
function snReact(kind, who){
  const c = kaCfg(); if(!c.react || c.mute) return;
  const A = kaCtx(); if(!A || !A.voice || !KA_UNLOCKED) return; if(A.ac.state === "suspended") A.ac.resume();
  const d = A.voice, t = A.ac.currentTime + 0.03, f0 = who === "f" ? 210 : who === "m" ? 120 : snVoicePitch();
  switch(kind){
    case "angry": snSyl(d, t, f0 * 1.1, 0.16, 0.28, 1400, 650); snNoiseHit(d, t, 0.18, 0.12, 700, 1.2); snSyl(d, t + 0.24, f0 * 0.95, 0.3, 0.3, 1300, 600); snNoiseHit(d, t + 0.6, 0.5, 0.1, 800, 0.9, "bandpass", 450); break;   // "에이… 허"
    case "sigh":  snNoiseHit(d, t, 1.2, 0.2, 1000, 0.8, "bandpass", 420); break;
    case "worried": snSyl(d, t, f0 * 1.05, 0.5, 0.22, 1200, 620); break;   // "어…"
    case "sob":   for(let i=0;i<3;i++){ snNoiseHit(d, t + i*0.32, 0.18, 0.12, 900, 1.5); snTone(d, t + i*0.32, f0 * 1.6, f0 * 1.4, 0.2, "triangle", 0.03, 900, [9, 12]); } break;
    case "relief": snNoiseHit(d, t, 0.7, 0.12, 900, 0.8, "bandpass", 500); snSyl(d, t + 0.75, f0 * 1.1, 0.22, 0.18, 1400, 700); snSyl(d, t + 0.98, f0 * 1.3, 0.18, 0.16, 1500, 750); break;   // "휴… 네!"
    case "doubt": snSyl(d, t, f0, 0.28, 0.2, 900, 500); snSyl(d, t + 0.3, f0 * 1.1, 0.35, 0.18, 900, 500); break;   // "음… 흠"
    case "surprise": snSyl(d, t, f0 * 1.1, 0.12, 0.22, 1600, 700); snSyl(d, t + 0.13, f0 * 1.6, 0.18, 0.26, 1800, 800); break;   // "예?"
    case "yes": snSyl(d, t, f0 * 1.2, 0.14, 0.2, 1500, 750); snSyl(d, t + 0.16, f0 * 1.05, 0.2, 0.2, 1400, 700); break;   // "네, 네"
  }
}
const SN_EX_REACT = {angry:"angry", furious:"angry", worried:"worried", sad:"sob", cry:"sob", shocked:"surprise", happy:"relief", soft:"yes", normal:null};
function snChime(){ const A = kaCtx(); if(!A) return; if(A.ac.state === "suspended") A.ac.resume(); const t = A.ac.currentTime + 0.03;
  [[1319, 0], [1047, 0.32]].forEach(([f, dt]) => { snTone(A.sfx, t + dt, f, null, 1.3, "sine", 0.22); snTone(A.sfx, t + dt, f * 2.01, null, 0.9, "sine", 0.05); }); }
// 대사 읽기 — 브라우저 내장 음성(한국어). 없으면 버튼만 조용히 사라진다.
function snVoiceKo(){ try{ return (speechSynthesis.getVoices() || []).find(v => /^ko/i.test(v.lang)) || null; }catch(e){ return null; } }
function snSpeak(text){
  if(!window.speechSynthesis || !text) return false;
  try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[()（）]/g, " ")); u.lang = "ko-KR"; const v = snVoiceKo(); if(v) u.voice = v; u.rate = 1.05; u.volume = Math.min(1, kaCfg().voice / 100 + 0.1); speechSynthesis.speak(u); return true; }catch(e){ return false; }
}
function snTtsButton(){
  const c = kaCfg(), box = document.querySelector(".vn-box"), old = document.querySelector(".sn-tts");
  if(!c.tts || !window.speechSynthesis || !box || !document.getElementById("vnText")){ if(old) old.remove(); return; }
  if(old) return;
  const b = document.createElement("button"); b.type = "button"; b.className = "sn-tts"; b.textContent = "🗣️ 읽기"; b.title = "지금 대사 소리 내어 읽기";
  b.addEventListener("click", e => { e.stopPropagation(); const el = document.getElementById("vnText"); if(el) snSpeak(el.dataset.full || el.textContent); });
  box.appendChild(b);
}
// 대사가 찍히는 동안 BGM·환경음을 살짝 낮춘다
let SN_DUCK_T = null;
function snDuck(sec){ SN_DUCK = 0.82; kaApplyVol(); clearTimeout(SN_DUCK_T); SN_DUCK_T = setTimeout(() => { SN_DUCK = 1; kaApplyVol(); }, sec * 1000); }
const _sn_vnType = vnType; vnType = function(){
  const el = document.getElementById("vnText"), full = el ? (el.dataset.full || "") : "", box = document.querySelector(".vn"), fresh = box && VN_SHOWN !== box.dataset.vnkey;
  _sn_vnType();
  if(fresh && full){ snDuck(Math.min(3.5, 0.6 + full.length * 0.045)); if(kaCfg().ttsAuto && kaCfg().tts) snSpeak(full); }
};

/* ---------- 🎬 장면 → 환경음 · 반응음 · 날씨 그림 ---------- */
function snAmbKey(){
  if(typeof page === "undefined" || page !== "arena") return null;
  const t = arenaTab;
  if(t === "king" && K){
    const N = snNow(), wx = N ? N.W.id : "clear";
    let base, out = false;
    if(K.revealing) base = "court_hush";
    else if(K.intro || K.sealed || K.step === "won" || K.step === "lost") base = K.rivals.length >= 6 ? "court_many" : K.rivals.length <= 1 ? "court_few" : "court";
    else if(K.step === "brief"){ if(K.loc === "site"){ out = true; base = (typeof bdClock === "function" && bdClock().h >= 18) ? "site_night" : "site_day"; } else base = "room"; }
    else if(K.step === "move" || K.step === "cross") base = "house";
    else if(K.step === "defect") base = "empty";
    else if(K.step === "list" || K.step === "sell") base = "broker";
    else base = "room";
    const court = base.startsWith("court");
    return `${base}|${court ? "clear" : wx}|${out ? "out" : "in"}`;
  }
  if(t === "game" || t === "story") return "house|clear|in";
  if(t === "office" || t === "board") return "office|clear|in";
  return "room|clear|in";
}
let SN_LAST = {};
const _sn_render = renderArena; renderArena = function(){
  const sil = K && arenaTab === "king" ? (K._silence || 0) : 0;
  _sn_render();
  try{
    snAmbWant(kaCfg().mute ? null : snAmbKey());
    snTtsButton();
    // 게임 창(kfsRoot)은 바깥 래퍼가 이 렌더 뒤에 다시 만든다 — 날씨 그림은 그 다음에 입힌다
    queueMicrotask(() => { const root = document.getElementById("kfsRoot"); if(!root) return; root.classList.remove("sn-rain", "sn-heavy", "sn-snow", "sn-dim"); const k = snAmbKey() || "", wx = k.split("|")[1];
      if(arenaTab === "king" && K && !K.revealing){ if(wx === "rain") root.classList.add("sn-rain"); if(wx === "monsoon") root.classList.add("sn-rain", "sn-heavy"); if(wx === "snow") root.classList.add("sn-snow"); if(/^(rain|monsoon|snow|cold|cloudy)$/.test(wx)) root.classList.add("sn-dim"); } });
    if(arenaTab === "king" && K){
      const sc = K.scene, key = sc && sc.who === "occ" ? sc.t + "|" + sc.ex : null;
      if(key && key !== SN_LAST.scene && SN_LAST.seed === K.seed){ const kind = SN_EX_REACT[sc.ex] || (Math.random() < 0.3 ? "doubt" : null); if(kind) setTimeout(() => snReact(kind), Math.max(0, sil - 450)); }
      if(K.step !== SN_LAST.step && SN_LAST.seed === K.seed && (K.step === "sell" || K.step === "list")) setTimeout(snChime, 300);   // 중개사무소 문 "따랑~"
      SN_LAST = {scene:key, step:K.step, seed:K.seed};
    } else SN_LAST = {};
  }catch(e){ console.warn(e); }
};
// 중개사 사무실을 직접 찾아가는 조사도 "따랑~"
const _sn_kResearch = kResearch; kResearch = function(id){ const had = K && K.done[id]; _sn_kResearch(id); if(K && !had && K.done[id] && /^(brokers|park)$/.test(id)) setTimeout(snChime, 120); };
// 첫 터치로 소리가 풀리면 환경음도 같이 켠다
document.addEventListener("pointerdown", () => setTimeout(() => { try{ if(KA_UNLOCKED && !kaCfg().mute) snAmbWant(snAmbKey()); }catch(e){} }, 60), true);
setInterval(() => { try{ if(KA_UNLOCKED && (typeof page === "undefined" || page !== "arena") && SN_AMB) snAmbWant(null); }catch(e){} }, 900);
