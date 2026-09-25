/* ================= 🎵 손맛 — 장면별 BGM · 효과음 15종 · CASE 파일·증거카드 · 입찰표·개찰 풀 연출 · 숫자 반응 · 하루 넘김 · NPC 반응 =================
   음악·효과음은 외부 파일 없이 WebAudio로 즉석 합성한다(저작권·용량 걱정 없음). 시스템(가격·확률)은 한 글자도 안 바꾼다. */

/* ---------- 🔊 소리 설정 (BGM·효과음 따로) ---------- */
const KA_DEF = {bgm:100, sfx:100, mute:false};
function kaCfg(){ try{ const o = JSON.parse(localStorage.getItem("kc_audio")||"null"); if(o) return Object.assign({}, KA_DEF, o); if(localStorage.getItem("sfx_off")==="1") return Object.assign({}, KA_DEF, {mute:true}); }catch(e){} return Object.assign({}, KA_DEF); }
function kaSave(c){ try{ localStorage.setItem("kc_audio", JSON.stringify(c)); }catch(e){} kaApplyVol(); }
let KA = null;   // {ac, bgm, sfx}
function kaCtx(){
  if(KA) return KA;
  const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
  const ac = (typeof KC_AC !== "undefined" && KC_AC) || new AC(); KC_AC = ac;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
  const bgm = ac.createGain(), sfx = ac.createGain(); bgm.connect(comp); sfx.connect(comp);
  KA = {ac, bgm, sfx, comp}; kaApplyVol(); return KA;
}
function kaApplyVol(){ if(!KA) return; const c = kaCfg(), t = KA.ac.currentTime; KA.bgm.gain.setTargetAtTime(c.mute ? 0 : (c.bgm/100) * 0.55, t, 0.05); KA.sfx.gain.setTargetAtTime(c.mute ? 0 : (c.sfx/100) * 0.5, t, 0.05); }
kcSfxOn = function(){ const c = kaCfg(); return !c.mute && c.sfx > 0; };
kcSfxBtn = function(){
  const c = kaCfg();
  return `<details class="kc-audio"><summary>${c.mute?"🔇 소리 꺼짐":"🔊 소리"}</summary><div class="kc-audio-in">
    <label>🎵 BGM <input type="range" min="0" max="100" value="${c.bgm}" data-kaset="bgm"><output>${c.bgm}</output></label>
    <label>🔔 효과음 <input type="range" min="0" max="100" value="${c.sfx}" data-kaset="sfx"><output>${c.sfx}</output></label>
    <label class="kc-audio-mute"><input type="checkbox" data-kaset="mute" ${c.mute?"checked":""}> 음소거</label></div></details>`;
};

/* ---------- 🔔 효과음 15종 ---------- */
function kaTone(dest, f, t, d, type, vol, f2, lp){
  const ac = KA.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + Math.min(0.02, d/4)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  let node = o; if(lp){ const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; o.connect(fl); node = fl; }
  node.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.03);
}
let KA_NOISE = null;
function kaNoise(dest, t, d, vol, fq, q, type){
  const ac = KA.ac;
  if(!KA_NOISE){ const n = ac.sampleRate, buf = ac.createBuffer(1, n, ac.sampleRate), a = buf.getChannelData(0); for(let i=0;i<n;i++) a[i] = Math.random()*2-1; KA_NOISE = buf; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = KA_NOISE; f.type = type || "bandpass"; f.frequency.value = fq || 1500; f.Q.value = q || 0.8;
  g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()*0.5); s.stop(t + d + 0.02);
}
kcSfx = function(kind){
  if(!kcSfxOn()) return;
  try{
    const A = kaCtx(); if(!A) return; if(A.ac.state === "suspended") A.ac.resume();
    const o = A.sfx, t = A.ac.currentTime + 0.01, T = (...a) => kaTone(o, ...a), N = (...a) => kaNoise(o, ...a);
    switch(kind){
      case "click": N(t, 0.025, 0.18, 2400, 3); break;
      case "paper": N(t, 0.2, 0.3, 2600, 0.6); N(t+0.12, 0.18, 0.22, 3400, 0.6); break;
      case "msg": case "message": T(880, t, 0.09, "sine", 0.3); T(1320, t+0.11, 0.15, "sine", 0.3); break;
      case "knock": [0, 0.17, 0.34].forEach(d => { T(160, t+d, 0.09, "sine", 0.7, 90); N(t+d, 0.04, 0.35, 600, 1.5); }); break;
      case "door": N(t, 0.35, 0.2, 380, 4); T(220, t, 0.3, "sawtooth", 0.05, 160, 700); T(90, t+0.38, 0.14, "sine", 0.5, 60); break;
      case "stamp": T(110, t, 0.3, "sine", 0.9, 45); N(t, 0.09, 0.6, 900, 1.2); break;
      case "thud": T(72, t, 0.4, "sine", 0.7, 40); N(t, 0.07, 0.3, 380, 1); break;
      case "coin": case "money_out": T(2093, t, 0.06, "triangle", 0.22); T(1568, t+0.05, 0.09, "triangle", 0.2); N(t+0.1, 0.05, 0.15, 5000, 2); break;
      case "money_in": [1047, 1319, 1568, 2093].forEach((f,i)=>T(f, t+i*0.06, 0.2, "triangle", 0.2)); N(t, 0.25, 0.12, 6000, 1.5, "highpass"); break;
      case "shock": case "warning": T(440, t, 0.14, "square", 0.12, null, 1800); T(440, t+0.2, 0.14, "square", 0.12, null, 1800); T(110, t, 0.5, "sawtooth", 0.14, 70, 600); break;
      case "reveal": [784, 988, 1175].forEach((f,i)=>T(f, t+i*0.07, 0.35, "sine", 0.18)); T(1568, t+0.21, 0.5, "triangle", 0.1); break;
      case "angry": T(98, t, 0.45, "sawtooth", 0.2, 65, 400); T(104, t, 0.45, "sawtooth", 0.14, 70, 400); break;
      case "sign": case "contract": N(t, 0.28, 0.25, 5200, 2, "highpass"); N(t+0.3, 0.16, 0.2, 4600, 2, "highpass"); T(660, t+0.5, 0.14, "sine", 0.2); break;
      case "key": [0, 0.07, 0.15].forEach((d,i)=>{ T(3200 - i*300, t+d, 0.08, "triangle", 0.12); N(t+d, 0.04, 0.2, 7000, 3); }); break;
      case "rank": T(90, t, 0.35, "sine", 1, 40); N(t, 0.1, 0.7, 700, 1); T(1047, t+0.12, 0.6, "triangle", 0.18); break;
      case "achievement": [659, 784, 988, 1319].forEach((f,i)=>T(f, t+i*0.08, i===3?0.5:0.14, "square", 0.08, null, 3000)); break;
      case "tick": N(t, 0.03, 0.35, 3000, 2); break;
      case "fanfare": [523, 659, 784, 1047].forEach((f,i)=>T(f, t + i*0.11, i===3 ? 0.6 : 0.16, "square", 0.1, null, 3200)); break;
    }
  }catch(e){}
};

/* ---------- 🎵 장면별 BGM (절차적 칩튠 루프 · 1.1초 크로스페이드 · 긴장 레이어) ---------- */
const KA_Q = {maj:[0,4,7], min:[0,3,7], M7:[0,4,7,11], m7:[0,3,7,10], d7:[0,4,7,10], sus:[0,5,7], dim:[0,3,6]};
// prog: [반음, 코드] 한 마디씩. bass/arp/kick/hat/snare: 16칸 패턴(1마디 16분음표)
const KA_TRACKS = {
  home:     {bpm:112, root:48, prog:[[0,"M7"],[9,"m7"],[5,"M7"],[7,"d7"]], bass:"1.1.5.1.1.1.5.1.", arp:"0123012301230123", arpOct:2, arpWave:"square", lp:1800, kick:"1...1...1...1...", hat:"..1...1...1...1.", snare:"....1.......1...", pad:0.03, arpV:0.05},
  research: {bpm:84,  root:45, prog:[[0,"min"],[8,"M7"],[5,"m7"],[7,"sus"]], bass:"1.......1.......", arp:"0...2...1...3...", arpOct:2, arpWave:"triangle", lp:2400, kick:"", hat:"....1.......1...", snare:"", pad:0.045, arpV:0.07},
  court:    {bpm:92,  root:38, prog:[[0,"min"],[0,"min"],[10,"maj"],[9,"d7"]], bass:"1.1.1.1.1.1.1.1.", arp:"..........2.....", arpOct:3, arpWave:"triangle", lp:2000, kick:"1.......1.......", hat:"1...1...1...1...", snare:"", pad:0.035, arpV:0.06},
  tenant:   {bpm:96,  root:41, prog:[[0,"M7"],[9,"m7"],[2,"m7"],[7,"maj"]], bass:"1...5...1...5.1.", arp:"0.1.2.1.0.1.2.3.", arpOct:2, arpWave:"triangle", lp:2600, kick:"1.......1.......", hat:"..1...1...1...1.", snare:"", pad:0.04, arpV:0.05},
  repair:   {bpm:124, root:43, prog:[[0,"maj"],[5,"maj"],[7,"maj"],[0,"maj"],[9,"min"],[5,"maj"],[7,"maj"],[7,"sus"]], bass:"1.1.5.1.1.1.5.5.", arp:"02120212", arpOct:2, arpWave:"square", lp:2200, kick:"1...1...1...1...", hat:"1.1.1.1.1.1.1.1.", snare:"....1.......1...", pad:0.02, arpV:0.045},
  sale:     {bpm:88,  root:39, prog:[[0,"M7"],[9,"m7"],[5,"M7"],[7,"d7"]], bass:"1..5..1.1..5..1.", arp:"3...2...1...0...", arpOct:2, arpWave:"sine", lp:3000, kick:"1.........1.....", hat:"..1..1..1..1..1.", snare:"....1.......1...", pad:0.045, arpV:0.07, swing:0.12},
  good:     {bpm:120, root:48, prog:[[0,"maj"],[7,"maj"],[9,"min"],[5,"maj"]], bass:"1.1.1.5.1.1.1.5.", arp:"0120012001200123", arpOct:3, arpWave:"square", lp:3200, kick:"1...1...1...1...", hat:"..1...1...1...1.", snare:"....1.......1...", pad:0.03, arpV:0.05},
  bad:      {bpm:76,  root:36, prog:[[0,"min"],[8,"maj"],[5,"min"],[7,"maj"]], bass:"1.......5...1...", arp:"2...1...0.......", arpOct:2, arpWave:"triangle", lp:1600, kick:"1...............", hat:"", snare:"........1.......", pad:0.04, arpV:0.06}
};
const KA_NAME = {home:"BGM_01_HOME", research:"BGM_02_RESEARCH", court:"BGM_03_COURT", tenant:"BGM_04_TENANT", repair:"BGM_06_REPAIR", sale:"BGM_07_SALE", good:"BGM_08_RESULT_GOOD", bad:"BGM_09_RESULT_BAD"};
let KA_PLAY = [], KA_WANT = null, KA_TENSION = false, KA_TIMER = null, KA_UNLOCKED = false;
const kaHz = m => 440 * Math.pow(2, (m - 69) / 12);
function kaStartTrack(id){
  const A = kaCtx(); if(!A) return;
  const tr = KA_TRACKS[id]; if(!tr) return;
  const g = A.ac.createGain(), tg = A.ac.createGain(); g.gain.value = 0.0001; g.connect(A.bgm); tg.gain.value = 0.0001; tg.connect(A.bgm);
  g.gain.exponentialRampToValueAtTime(1, A.ac.currentTime + 1.1);
  const inst = {id, tr, g, tg, step:0, next:A.ac.currentTime + 0.08, dead:false};
  KA_PLAY.push(inst);
  if(!KA_TIMER) KA_TIMER = setInterval(kaPump, 60);
}
function kaFadeOut(inst){ if(inst.dead) return; inst.dead = true; const t = KA.ac.currentTime; inst.g.gain.cancelScheduledValues(t); inst.g.gain.setValueAtTime(Math.max(0.0001, inst.g.gain.value), t); inst.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); inst.tg.gain.setTargetAtTime(0.0001, t, 0.3); setTimeout(()=>{ KA_PLAY = KA_PLAY.filter(x=>x!==inst); try{ inst.g.disconnect(); inst.tg.disconnect(); }catch(e){} if(!KA_PLAY.length && KA_TIMER){ clearInterval(KA_TIMER); KA_TIMER = null; } }, 1400); }
function kaPump(){
  if(!KA) return; const ac = KA.ac, horizon = ac.currentTime + 0.3;
  for(const inst of KA_PLAY){
    const tr = inst.tr, sd = 60 / tr.bpm / 4;
    while(inst.next < horizon){
      const s = inst.step % 16, bar = Math.floor(inst.step / 16) % tr.prog.length, [deg, q] = tr.prog[bar], chord = KA_Q[q];
      let t = inst.next + (tr.swing && s % 2 ? sd * tr.swing : 0);
      const root = tr.root + deg;
      if(!inst.dead){
        const b = tr.bass[s]; if(b && b !== "."){ kaTone(inst.g, kaHz(root + (b === "5" ? 7 : 0) - 12 + 12), t, sd*1.8, "triangle", 0.2); }
        const ap = tr.arp[s % tr.arp.length]; if(ap && ap !== "."){ const i = +ap, iv = chord[i % chord.length] + (i >= chord.length ? 12 : 0); kaTone(inst.g, kaHz(root + 12*tr.arpOct + iv - 12), t, sd*1.6, tr.arpWave, tr.arpV, null, tr.lp); }
        if(s === 0 && tr.pad){ chord.forEach(iv => kaTone(inst.g, kaHz(root + 12 + iv), t, sd*15.5, "sine", tr.pad)); }
        if(tr.kick && tr.kick[s] === "1") kaTone(inst.g, 120, t, 0.16, "sine", 0.32, 45);
        if(tr.hat && tr.hat[s] === "1") kaNoise(inst.g, t, 0.04, 0.05, 8000, 1, "highpass");
        if(tr.snare && tr.snare[s] === "1") kaNoise(inst.g, t, 0.12, 0.09, 1800, 0.7);
        // 😠 긴장 레이어 — 곡은 그대로 두고 저음 드론 + 심장박동을 얹는다
        if(inst.id === "tenant"){
          if(s === 0) kaTone(inst.tg, kaHz(root - 12), t, sd*16, "sawtooth", 0.09, null, 260);
          if(s === 0 || s === 3) kaTone(inst.tg, 58, t, 0.18, "sine", 0.45, 38);
        }
      }
      inst.next += sd; inst.step++;
    }
  }
}
function kaSetTension(on){ KA_TENSION = on; const A = KA; if(!A) return; KA_PLAY.filter(x=>x.id==="tenant" && !x.dead).forEach(x => x.tg.gain.setTargetAtTime(on ? 1 : 0.0001, A.ac.currentTime, 0.35)); }
function kaWant(id){
  KA_WANT = id;
  if(!KA_UNLOCKED) return;
  const cur = KA_PLAY.find(x=>!x.dead);
  if(cur && cur.id === id) return;
  if(cur) kaFadeOut(cur);
  if(id) kaStartTrack(id);
}
function kaScene(){
  if(typeof page === "undefined" || page !== "arena") return null;
  if(["home","rec","dexall","ach","dex","art"].includes(arenaTab)) return "home";
  if(arenaTab === "guess" || arenaTab === "chat") return "research";
  if(arenaTab === "sell") return "sale";
  if(arenaTab === "game" || arenaTab === "story") return "tenant";
  if(arenaTab !== "king") return "home";
  if(!K) return "home";
  if(K.intro || K.sealed || K.revealing) return "court";
  return {brief:"research", won:"court", lost:"bad", move:"tenant", defect:"repair", list:"repair", sell:"sale", result: K.final && K.final.profit >= 0 ? "good" : "bad"}[K.step] || "home";
}
function kaTensionNow(){ if(arenaTab !== "king" || !K || K.step !== "move") return false; const o = K.occ; return !!(K.pendingFlip || (K.scene && K.scene.ex === "angry") || o.coop < 25); }
function kaSync(){ kaWant(kaScene()); kaSetTension(kaTensionNow()); }
// 브라우저는 첫 터치 전엔 소리를 막는다 — 첫 클릭에서 풀고 지금 장면 곡을 튼다
document.addEventListener("pointerdown", () => { if(KA_UNLOCKED) return; KA_UNLOCKED = true; const A = kaCtx(); if(A && A.ac.state === "suspended") A.ac.resume(); kaSync(); }, true);
document.addEventListener("visibilitychange", () => { if(!KA) return; if(document.hidden) KA.ac.suspend(); else if(KA_UNLOCKED) KA.ac.resume(); });
setInterval(() => { if(KA_UNLOCKED && typeof page !== "undefined" && page !== "arena" && KA_PLAY.some(x=>!x.dead)) kaWant(null); }, 700);

/* ---------- 📁 CASE 파일 · 증거카드 ---------- */
const KE_CARDS = [
  {id:"docs",  src:"docs",   ic:"📄", t:"매각물건명세서", d:"대항력 없음 · 배당 0원", w:15},
  {id:"elec",  src:"site",   ic:"📸", t:"차단기 테이프 흔적", d:"계량기함 — 누전 의심", w:12},
  {id:"flip",  src:"neigh",  ic:"📝", t:"옆집 할머니 증언", d:"약속은 바꿔도 딸 말은 듣는다", w:12},
  {id:"price", src:"broker", ic:"📝", t:"중개사 3곳 통화", d:"1.6억은 큰길 기준, 골목은 1.5 초중반", w:12},
  {id:"fee",   src:"office", ic:"🧾", t:"관리비 체납 내역", d:"공용부분 38만원 — 낙찰자 부담", w:12},
  {id:"rivals",src:"court",  ic:"📊", t:"사건 조회수", d:"경쟁자 규모 짐작", w:6},
  {id:"inside",src:null,     ic:"🚪", t:"???", d:"문을 열어 봐야 안다", w:0}];
const KE_BASE = 25;
function keCards(){ return (typeof KP !== "undefined" && KP.cards) || KE_CARDS; }
function keNo(){ return String((KP && KP.no) || 1).padStart(3,"0"); }
function keHas(c){ return c.id === "docs" || c.byDone ? !!K.done[c.src || c.id] : c.src ? !!K.found[c.id] : false; }
function keRate(){ return KE_BASE + keCards().filter(keHas).reduce((s,c)=>s+c.w, 0); }
function keWon(n){ return Math.round(n * 10000).toLocaleString("ko-KR"); }
function kcHangul(man){
  let won = Math.round(man) * 10000; if(!(won > 0)) return "";
  const d = ["","일","이","삼","사","오","육","칠","팔","구"], u = ["","십","백","천"], big = ["","만","억","조"];
  let out = "", i = 0;
  while(won > 0){ const chunk = won % 10000; if(chunk){ let s = ""; for(let k=3;k>=0;k--){ const n = Math.floor(chunk / Math.pow(10,k)) % 10; if(n) s += (n===1 && k>0 ? "" : d[n]) + u[k]; } out = s + big[i] + (out ? " " + out : ""); } won = Math.floor(won / 10000); i++; }
  return out.replace(/^일(?=[십백천])/, "일") + "원";
}
function keCaseHTML(){
  const rate = keRate(), n = String(K.caseNo || 1).padStart(3, "0");
  return `<div class="panel ke-case"><div class="ke-case-head"><span class="ke-no">CASE ${n}</span><span class="ke-stamp">${K.mode==="weekly"?"WEEKLY":"CONFIDENTIAL"}</span></div>
    <h3 class="ke-title">${esc(KP.title)}</h3><div class="note">${esc(KP.addr)}</div>
    <div class="ke-grid"><span>감정가</span><b>₩ ${keWon(KP.appraisal)}</b><span>최저가</span><b>₩ ${keWon(KP.minBid)}</b><span>최근 실거래</span><b>${KP.recent}</b><span>중개사 한마디</span><b>"${kMan(KP.brokerSays)}이면 바로 나가요"</b><span>겉보기 수리비</span><b>${kMan(KP.estRepair)}</b><span>점유</span><b>${esc(KP.occ.name)} (${KP.occ.age}) · ${esc(KP.occ.legal)}</b><span>경쟁 분위기</span><b>${typeof kpInterestHTML==="function" ? kpInterestHTML() : (K.found.rivals?`약 ${K.rivals.length}명`:"??")}</b></div>
    <div class="ke-rate"><span>현재 정보 파악률</span><b>${rate}%</b><div class="ke-bar"><i style="width:${rate}%"></i></div><small class="note">100%는 없어요 — 어떤 건 문을 열어 봐야 알아요.</small></div>
    <div class="ke-cards-head"><b>🗂️ 조사 파일</b> <small class="note">${keCards().filter(keHas).length} / ${keCards().length}</small></div>
    <div class="ke-cards">${keCards().map(c => { const on = keHas(c); return `<div class="ke-card ${on?"on":""} ${on && K._newEv===c.id?"new":""}">${on?`<span class="ke-ic">${c.ic}</span><b>${esc(c.t)}</b><small>${esc(c.d)}</small>`:`<span class="ke-ic">?</span><b>???</b><small>${c.src?"조사하면 드러남":esc(c.d)}</small>`}</div>`; }).join("")}</div></div>`;
}
function keBidSheet(){
  return `<div class="panel ke-sheet"><div class="ke-sheet-head"><b>🧾 기일입찰표</b><span class="note">CASE ${keNo()} · 입찰보증금 ₩ ${keWon(Math.round(KP.minBid*0.1))}</span></div>
    <label class="ke-amt">입찰금액 <span>₩ <input type="number" id="kBid" min="${KP.minBid}" step="10" value="${KP.minBid + 1000}" inputmode="numeric"> 만원</span></label>
    <div class="ke-hangul" id="kHangul">${kcHangul(KP.minBid + 1000)}</div>
    <div class="ke-err" id="kBidErr" role="alert"></div>
    <button type="button" class="btn pri" data-kcseal>✉️ 봉투에 넣기</button>
    <div class="note" style="margin-top:6px">낙찰가 = 내가 쓴 돈의 시작일 뿐. 명도·수리·이자·중개비까지 빼고도 남아야 해요.</div></div>`;
}
function keSealedHTML(){
  const S = K.sealed, rate = keRate(), P = S.pred || {};
  const hid = (id, v) => `<input type="hidden" id="${id}" value="${v==null?"":v}">`;
  return keCaseMini() + `<div class="ke-env"><div class="ke-env-in"><div class="ke-flap"></div><div class="ke-letter ke-slip"><div class="ke-slip-h">기 일 입 찰 표<small>사건번호 CASE ${keNo()}</small></div>
      <dl class="ke-slip-rows"><dt>최저매각가격</dt><dd>₩ ${keWon(KP.minBid)}</dd><dt>입찰보증금 <small>(최저가의 10%)</small></dt><dd>₩ ${keWon(Math.round(KP.minBid*0.1))}</dd></dl>
      <div class="ke-slip-amt"><small>입찰금액</small><b>₩ ${keWon(S.amt)}</b><span>${kcHangul(S.amt)}</span></div>
      <i class="ke-slip-stamp" aria-hidden="true"><b>입찰</b></i></div></div></div>
    <div class="panel ke-confirm">${rate < 70 ? `<p class="ke-warn">⚠️ 현재 정보 파악률 <b>${rate}%</b> — 그래도 입찰하시겠습니까?</p>` : `<p>정보 파악률 ${rate}%</p>`}<p class="note">제출 후에는 변경할 수 없습니다.</p>
    ${hid("kBid", S.amt)}${hid("kPredSale", P.sale)}${hid("kPredRepair", P.repair)}${hid("kPredMove", P.move)}
    <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn pri" data-kbid>📮 제출</button><button type="button" class="btn" data-kcunseal>✏️ 다시 쓰기</button></div></div>`;
}
function keCaseMini(){ return `<div class="kc-mode">📁 CASE ${keNo()} · ${esc(KP.title)} · 정보 파악률 ${keRate()}%</div>`; }
function keRevealHTML(){
  const bids = K.result.bids.slice().reverse(), n = bids.length, T = keRevealTimes(n);
  const rows = bids.map((b, i) => { const rank = n - i, top = rank === 1;
    return `<li class="ke-row ${top?"top":""} ${b.me?"me":""}" style="animation-delay:${T.row[i]}s"><span>${rank}위</span><b>${top ? `<i class="ke-wait" style="animation-delay:0s,${T.win}s">……</i><i class="ke-amt-top" style="animation-delay:${T.win}s">${keWon(b.amt)}</i>` : keWon(b.amt)}</b>${b.me?`<em style="animation-delay:${T.row[i]+0.25}s">👉 나</em>`:""}</li>`; }).join("");
  const win = K.result.win;
  return `<div class="ke-open">${vnBgHTML(artUrl("cut_bid_open") ? "cut_bid_open" : "bg_court")}<div class="ke-open-in"><p class="ke-open-h">개찰 — 입찰자 ${n}명</p><ol class="ke-rows">${rows}</ol>
    <p class="ke-verdict ${win?"win":"lose"}" style="animation-delay:${T.win + 0.35}s">${win ? "🏆 당신이 낙찰받았습니다" : `패찰 — ${kMan(K.result.gap)} 차이`}</p>
    <button type="button" class="kc-skip" data-kreveal>바로 보기 ›</button></div></div>`;
}
function keRevealTimes(n){ const row = []; let t = 0.6; for(let i=0;i<n;i++){ if(i === n-1) t += 0.5; row.push(+t.toFixed(2)); t += (i >= n-3 ? 0.7 : 0.42); } const win = row[n-1] + 0.9; return {row, win, total: win + 2.2}; }

/* ---------- 🗓️ 하루 넘김 · 날씨 ---------- */
const KE_WX = [["☀️","맑음"],["☀️","맑음"],["⛅","구름 조금"],["☁️","흐림"],["🌧️","비"],["🌙","저녁"]];
function keDate(day){ const d = new Date(K.t0 || Date.now()); d.setDate(d.getDate() + day); return d; }
function keWx(day){ const r = kRng((K.seed ^ (day * 2654435761)) >>> 0); r(); return KE_WX[Math.floor(r() * KE_WX.length)]; }
function keDayBanner(from, to){
  const d = keDate(to), wd = "일월화수목금토"[d.getDay()], wx = keWx(to), cost = Math.round(KP.dailyHold * (to - from) * 10) / 10;
  const weekly = K.step === "sell";
  const el = document.createElement("div"); el.className = "ke-day"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<b>${weekly ? `──── ${K.sale.weeks}주차가 시작됩니다 ────` : `──── DAY ${to} ────`}</b><span>${d.getMonth()+1}월 ${d.getDate()}일 · ${wd}요일 · ${wx[0]} ${wx[1]}</span><small>보유비용 이자·관리비 +${cost}만원</small>`;
  document.body.appendChild(el); setTimeout(()=>el.remove(), 1900);
}

/* ---------- 💸 숫자 반응 ---------- */
function keSpent(){ const c = K.cost; return c.bid + c.acq + c.move + c.repair + c.hold + c.fee + c.legal; }
function keFloat(anchor, text, cls){
  if(!anchor) return; const r = anchor.getBoundingClientRect(), el = document.createElement("div");
  el.className = "ke-float " + (cls||""); el.textContent = text; el.style.left = (r.left + r.width/2 + scrollX) + "px"; el.style.top = (r.top + scrollY) + "px";
  document.body.appendChild(el); anchor.classList.remove("ke-bump"); void anchor.offsetWidth; anchor.classList.add("ke-bump"); setTimeout(()=>el.remove(), 1500);
}
function keCount(el){
  const a = +el.dataset.from, b = +el.dataset.to; if(!isFinite(a) || !isFinite(b)) return;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){ el.textContent = kMan(b); return; }
  const t0 = performance.now(), dur = +el.dataset.dur || 1100;
  const f = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = kMan(a + (b - a) * e); if(p < 1 && document.body.contains(el)) requestAnimationFrame(f); };
  el.textContent = kMan(a); requestAnimationFrame(f);
}
// HUD에 보유현금 · 예상손익(범위)
kHud = (function(orig){ return function(){
  let h = orig();
  if(K && K.mode === "career"){
    const cash = K.cashStart - keSpent(), lo = Math.round(KP.trueMid*0.985 - keSpent() - KP.estRepair*0.3 - 80), hi = Math.round(KP.trueMid*1.03 - keSpent());
    h = h.replace('<div class="k-hud">', `<div class="k-hud"><span class="ke-cash ${cash < 1000 ? "danger" : ""}">💼 보유현금 ${kMan(Math.max(0, cash))}${cash < 0 ? ` · 🏦 대출 ${kMan(-cash)}` : ""}</span>`).replace(/<\/div>$/, `<span class="ke-est">📈 예상 손익 ${kcSigned(lo)} ~ ${kcSigned(hi)} <small>?</small></span></div>`);
  }
  return h;
}; })(kHud);

/* ---------- 🙋 NPC 클릭 반응 · 침묵 ---------- */
const KE_POKE = {normal:["왜 계속 쳐다봐요?","할 말 있으면 하세요.","……","(헛기침)","…아직 계세요?"], angry:["뭘 봐요.","……","할 말 없으면 가요.","(팔짱을 낀다)"], worried:["……","(시선이 바닥으로)","…아니, 그냥 생각 좀 하느라.","(한숨)"]};
const KE_BROKER = {5:"1.6 된다니까요?", 10:"…아마도요.", 15:"사장님, 저 바빠요 ㅎㅎ"};

/* ---------- kingHTML 덧씌우기 ---------- */
const _ke_kingHTML = kingHTML; kingHTML = function(){
  if(K && !K.intro && K.revealing && (K.step === "won" || K.step === "lost")) return `<div class="kc-topbar">${kcSfxBtn()}</div>` + keRevealHTML();
  if(K && !K.intro && K.step === "brief" && K.sealed) return `<div class="kc-topbar">${kcSfxBtn()}</div>` + keSealedHTML();
  let h = _ke_kingHTML();
  if(!K || K.intro) return h;
  if(K.step === "brief"){
    h = h.replace(/<div class="panel k-card"><div class="k-grid">[\s\S]*?<\/b><\/div><\/div>/, keCaseHTML());
    h = h.replace(/<div class="panel k-bidbox">[\s\S]*?<\/div><\/div>(?=<div style="margin-top:12px"><button type="button" class="btn" data-kquit>|\s*$)/, keBidSheet());   // 그만두기 버튼을 없앤 뒤엔 입찰함이 맨 끝이다
    h = h.replace(/<details class="panel vn-more" open><summary>🗂️ 조사 노트/, '<details class="panel vn-more"><summary>🗂️ 조사 노트');
  }
  if(K.step === "won"){
    const after = K.cashStart - K.cost.bid - K.cost.acq;
    if(K.mode === "career") h = h.replace('<div class="panel k-bidres win">', `<div class="panel ke-drain"><small>💼 잔금 치르고 나면 보유현금</small><div><b>${kMan(K.cashStart)}</b> <span>→</span> <b class="ke-count down" data-from="${K.cashStart}" data-to="${after}">${kMan(after)}</b></div><small class="note">낙찰가 ${kMan(K.cost.bid)} + 취득세·등기 ${kMan(K.cost.acq)}</small></div><div class="panel k-bidres win">`);
  }
  if(K.step === "result" && K.final && K.final.cashAfter != null) h = h.replace(/<b class="(up|down)">([^<]*)<\/b><\/div>\s*<div class="kc-cashmeta">/, (m, cls, txt) => `<b class="${cls} ke-count" data-from="${K.final.cashBefore}" data-to="${K.final.cashAfter}" data-dur="1500">${txt}</b></div><div class="kc-cashmeta">`);
  if(K.step === "result" && K.final){
    const stamp = `<div class="ke-closed"><span>CASE ${keNo()} CLOSED</span></div>`;
    const i = ['<div class="panel kc-cash', '<div class="panel kc-dual">', '<div class="panel k-result">'].map(m => h.indexOf(m)).filter(x => x >= 0).sort((a,b)=>a-b)[0];
    if(i != null) h = h.slice(0, i) + stamp + h.slice(i);
    h = h.replace('<div class="panel k-result"><h3>📑 경매 완료</h3>', keBestWorst() + keCredits() + '<div class="panel k-result"><h3>📑 경매 완료</h3>');
  }
  return h;
};
function keBestWorst(){
  const F = K.final, best = [], worst = [];
  if(K.occ.dInvolved) best.push("딸에게 먼저 연락했다"); if(K.found.elec) best.push("입찰 전에 계량기함을 봤다"); if(K.found.price) best.push("중개사 셋에 전화해 골목 시세를 잡았다"); if(K.moveDays <= 14) best.push(`${K.moveDays}일 만에 명도를 끝냈다`);
  if(!K.found.elec) worst.push(["현장 조사 생략 — 누전을 몰랐다", 120]); if(K.occ.flipped && !K.occ.paper) worst.push(["합의서 없이 말로만 약속했다", 50]); if(K.cost.legal >= 350) worst.push(["강제집행까지 갔다", 350]); if(K.repair.id === "full") worst.push(["풀 리모델링 과투자", 1000]); if(!K.found.fee) worst.push(["관리실 확인 생략 — 체납관리비", 38]); if(K.sale.weeks >= 6) worst.push([`매도에 ${K.sale.weeks}주 — 보유비용`, Math.round(KP.dailyHold*7*(K.sale.weeks-3))]);
  worst.sort((a,b)=>b[1]-a[1]);
  const surprise = (K.defects||[]).filter(d=>!d.known).reduce((s,d)=>s+d.cost,0) + (K.occ.flipped ? 50 : 0);
  const P = K.pred; let plan = "";
  if(P && P.sale > 0){ const exp = Math.round(P.sale - K.bid - K.cost.acq - (P.repair || KP.estRepair) - (P.move || 14) * KP.dailyHold - 28 * KP.dailyHold - Math.min(90, P.sale * 0.005)); plan = `<div><small>입찰 전 내 예상 순익 → 실제</small><b>${kcSigned(exp)} → ${kcSigned(Math.round(F.profit))}</b></div>`; }
  return `<div class="panel ke-bw">${plan}<div><small>당신이 예상하지 못한 비용</small><b>${kMan(surprise)}</b></div><div><small>🌟 가장 잘한 판단</small><b>${esc(best[0] || "끝까지 판을 마쳤다")}</b></div><div><small>💸 가장 비싼 실수</small><b>${worst[0] ? `${esc(worst[0][0])} <em>-${kMan(worst[0][1])}</em>` : "눈에 띄는 실수 없음"}</b></div></div>`;
}
function keCredits(){
  const o = K.occ, good = !K.cost.legal && o.coop >= 50;
  const ppl = [[KP.occ.name, "최종 관계", Math.round(o.coop)]]; if(o.dInvolved) ppl.push(["따님", "최종 관계", Math.min(95, Math.round(o.coop + 18))]);
  ppl.push(["동네 중개사 김사장", "신뢰도", Math.min(95, 55 + hubRec().rep/10 | 0)]); if(K.found.elec || (K.defects||[]).length) ppl.push(["전기기사 박기사", "신뢰도", K.found.elec ? 88 : 70]);
  const after = good ? `며칠 뒤, ${KP.occ.name}에게서 문자가 왔다.\n“이사는 잘 했습니다. 그동안 고생 많으셨습니다.”` : "이후 연락은 없었다.";
  return `<div class="panel ke-credits"><b>🎞️ 이번 사건에서 만난 사람들</b><ul>${ppl.map(p=>`<li><span>${esc(p[0])}</span><small>${p[1]}</small><b>${p[2]}</b></li>`).join("")}</ul><p class="ke-epi">${esc(after).replace(/\n/g,"<br>")}</p></div>`;
}

/* ---------- 렌더 훅: 음악 · 효과음 · 하루 넘김 · 숫자 반응 · 침묵 ---------- */
let KE_LAST = {};
const _ke_render = renderArena;
renderArena = function(){
  _ke_render();
  kaSync();
  if(page !== "arena") return;
  document.querySelectorAll(".ke-count").forEach(keCount);
  if(arenaTab !== "king" || !K){ KE_LAST = {}; return; }
  const same = KE_LAST.seed === K.seed, spent = keSpent();
  const sig = {seed:K.seed, step:K.step, day:K.day, spent, rev:!!K.revealing, sealed:!!K.sealed, coop:K.occ.coop, off:K.sale && K.sale.offer ? K.sale.offer.amt + ":" + K.sale.weeks : null, intro:!!K.intro};
  if(same){
    if(sig.sealed && !KE_LAST.sealed) kcSfx("paper");
    if(sig.rev && !KE_LAST.rev) keRevealSounds();
    if(!sig.rev && sig.step !== KE_LAST.step){
      if(sig.step === "move"){ kcSfx("knock"); setTimeout(()=>kcSfx("door"), 650); }
      if(sig.step === "defect") setTimeout(()=>kcSfx((K.defects||[]).some(d=>!d.known) ? "warning" : "paper"), 250);
      if(sig.step === "list") kcSfx("money_out");
      if(sig.step === "result"){ kcSfx("contract"); setTimeout(()=>kcSfx("key"), 600); setTimeout(()=>kcSfx("money_in"), 1100); setTimeout(()=>kcSfx("rank"), 1800); if(K.final && (K.final.biz === "S" || K.final.overall === "S")) setTimeout(()=>kcSfx("fanfare"), 2300); }
    }
    if(sig.off && sig.off !== KE_LAST.off) kcSfx("message");
    if(sig.step === "move" && KE_LAST.step === "move" && KE_LAST.coop - sig.coop >= 8) kcSfx("angry");
    if(sig.spent > KE_LAST.spent && !sig.rev && !["won","lost","result"].includes(sig.step) && KE_LAST.step !== "brief"){
      const hud = [...document.querySelectorAll(".k-hud span")].find(x => /들어간 돈/.test(x.textContent)) || document.querySelector(".k-hud");
      keFloat(hud, `+${kMan(Math.round(sig.spent - KE_LAST.spent))}`, "out");
    }
    if(sig.day > KE_LAST.day && ["move","defect","list","sell"].includes(sig.step) && !sig.rev) keDayBanner(KE_LAST.day, sig.day);
  }
  KE_LAST = sig;
  // 침묵 — 점유자가 바로 답하지 않는다
  if(K._silence){ const ms = K._silence, el = document.getElementById("vnText"); K._silence = 0;
    if(el){ clearTimeout(el._t); const box = el.closest(".vn"); el.textContent = "……"; if(box) box.classList.add("ke-silent"); VN_SHOWN = "";
      setTimeout(()=>{ if(!document.body.contains(el)) return; if(box) box.classList.remove("ke-silent"); VN_SHOWN = "_"; vnType(); }, ms); } }
  K._newEv = null;
};
function keRevealSounds(){
  const n = K.result.bids.length, T = keRevealTimes(n); K.revealMs = Math.round(T.total * 1000);
  kcSfx("paper"); T.row.forEach((t, i) => setTimeout(()=>{ if(K && K.revealing) kcSfx("tick"); }, t * 1000));
  setTimeout(()=>{ if(K && K.revealing) kcSfx(K.result.win ? "stamp" : "thud"); }, (T.win + 0.35) * 1000);
}
const _ke_kBid = kBid; kBid = function(amt){ _ke_kBid(amt); if(K){ K.sealed = null; if(K.result) K.revealMs = Math.round(keRevealTimes(K.result.bids.length).total * 1000); } };
const _ke_kStart = kStart; kStart = function(seed){ _ke_kStart(seed); K.t0 = Date.now(); };
const _ke_kResearch = kResearch; kResearch = function(id){ const before = Object.assign({}, K.found), had = K.done[id]; _ke_kResearch(id); if(!K || had || !K.done[id]) return; const hit = Object.keys(K.found).find(k => !before[k]); K._newEv = hit || (id === "docs" ? "docs" : null); KC_SFX_NEXT = hit ? "reveal" : "paper"; };
const _ke_kMove = kMove; kMove = function(id){ const had = K && K.scene; _ke_kMove(id); if(K && K.step === "move" && K.scene && K.scene.who === "occ" && K.scene !== had) K._silence = K.scene.ex === "angry" ? 1300 : 800; };
const _ke_kOffer = kOffer; kOffer = function(a){ _ke_kOffer(a); if(K && K.scene && K.scene.who === "occ") K._silence = 900; };
const _ke_toast = hubToastShow; hubToastShow = function(){ if(HUB_TOAST.some(t => /업적 달성|LV\./.test(t.t))) kcSfx("achievement"); _ke_toast(); };

/* ---------- 클릭 ---------- */
document.addEventListener("click", e => {
  if(typeof page === "undefined" || page !== "arena") return;
  if(e.target.closest("button, .ag-act, [data-atab]") && !e.target.closest("[data-kbid],[data-kcseal],[data-kres],[data-koffer],[data-krep]")) kcSfx("click");
  if(arenaTab !== "king" || !K) return;
  let b;
  if(e.target.closest("[data-kcseal]")){
    const amt = Math.round(+((document.getElementById("kBid")||{}).value || 0)), err = document.getElementById("kBidErr");
    if(!(amt >= KP.minBid)){ if(err) err.textContent = `최저가 ${kMan(KP.minBid)} 이상 적어야 해요.`; kcSfx("warning"); return; }
    const v = id => { const el = document.getElementById(id); if(!el || el.value === "") return null; const n = +el.value; return isFinite(n) && n >= 0 ? Math.round(n) : null; };
    K.sealed = {amt, pred:{sale:v("kPredSale"), repair:v("kPredRepair"), move:v("kPredMove")}}; renderArena(); window.scrollTo(0,0); return;
  }
  if(e.target.closest("[data-kcunseal]")){ const S = K.sealed; K.sealed = null; renderArena(); const el = document.getElementById("kBid"); if(el && S){ el.value = S.amt; el.dispatchEvent(new Event("input", {bubbles:true})); ["Sale","Repair","Move"].forEach(k=>{ const x = document.getElementById("kPred"+k), vv = S.pred[k.toLowerCase()]; if(x && vv != null) x.value = vv; }); } return; }
  if((b = e.target.closest(".k-stage .vn-sprite")) && K.step === "move"){
    K.poke = (K.poke||0) + 1; const ex = (K.scene && K.scene.ex) || "normal", L = KE_POKE[ex] || KE_POKE.normal, t = L[(K.poke-1) % L.length];
    const st = b.closest(".k-stage"); let bub = st.querySelector(".ke-bubble"); if(!bub){ bub = document.createElement("div"); bub.className = "ke-bubble"; st.appendChild(bub); }
    bub.textContent = t; bub.classList.remove("show"); void bub.offsetWidth; bub.classList.add("show"); b.classList.remove("ke-poked"); void b.offsetWidth; b.classList.add("ke-poked"); return;
  }
  if((b = e.target.closest(".kc-npc"))){ K.brokerPoke = (K.brokerPoke||0) + 1; const t = KE_BROKER[K.brokerPoke]; if(t){ const p = b.querySelector("p"); if(p){ p.textContent = `“${t}”`; p.classList.remove("ke-pop"); void p.offsetWidth; p.classList.add("ke-pop"); } kcSfx("message"); } return; }
});
document.addEventListener("input", e => {
  const t = e.target; if(!t || !t.matches) return;
  if(t.matches("[data-kaset]")){ const c = kaCfg(), k = t.dataset.kaset; if(k === "mute") c.mute = t.checked; else { c[k] = +t.value; const o = t.parentElement.querySelector("output"); if(o) o.textContent = t.value; } kaSave(c); if(k === "sfx") kcSfx("coin"); const s = t.closest("details") && t.closest("details").querySelector("summary"); if(s) s.textContent = c.mute ? "🔇 소리 꺼짐" : "🔊 소리"; if(!c.mute && KA_UNLOCKED) kaSync(); return; }
  if(t.id === "kBid" && !(K && K.sealed)){ const h = document.getElementById("kHangul"); if(h) h.textContent = kcHangul(+t.value); const err = document.getElementById("kBidErr"); if(err) err.textContent = ""; }
});
document.addEventListener("change", e => { const t = e.target; if(t && t.matches && t.matches("[data-kaset=mute]")) t.dispatchEvent(new Event("input", {bubbles:true})); });

/* ---------- 🖼️ 새 그림 연결: 격분한 할아버지 · 사무실 성장 · 입찰봉투 · 경매왕 TIP ---------- */
// 점유자가 정말 폭발 직전일 때만 '주먹 쥔' 그림으로 — 평범하게 화난 건 원래 그림 그대로
const _ke_kStage = kStage; kStage = function(bg, who, ex, text, name){
  if(who === "occ" && ex === "angry" && K && (K.pendingFlip || K.occ.coop < 35) && artUrl(`npc_${KP.occ.pid}_furious`)) ex = "furious";
  if(bg === "bg_court" && artUrl("bg_bid_room")) bg = "bg_bid_room";
  // 명도 끝난 집은 텅 비어 있다 — 최소·일부 수리는 가구 없는 빈 거실, 도배·장판까지 한 집만 단장된 거실
  if(bg === "bg_room_clean" && K && K.repair){ const rid = K.repair.id; if((rid === "min" || rid === "part") && artUrl("bg_room_empty")) bg = "bg_room_empty"; else if(rid !== "min" && rid !== "part" && artUrl("bg_room_after")) bg = "bg_room_after"; }
  let h = _ke_kStage(bg, who, ex, text, name);
  // 주인공 앞모습 — 결과가 갈리는 순간엔 내 표정이 보인다(대화 장면은 뒷모습 그대로)
  const pe = keMyFace(); const fu = pe && artUrl("npc_playerf_" + pe);
  if(fu) h = h.replace(/<img class="vn-player" src="[^"]*" alt="">/, `<img class="vn-player front pf-${pe}" src="${fu}" alt="">`);
  return h;
};
function keMyFace(){
  if(!K) return null;
  if(K.step === "won") return "happy";
  if(K.step === "lost") return "worried";
  if(K.step === "defect") return (K.defects||[]).some(d=>!d.known) ? "shocked" : "normal";
  if(K.step === "list") return "soft";
  if(K.step === "sell") return K.sale && K.sale.offer ? "happy" : (K.sale && K.sale.weeks >= 5 ? "worried" : null);
  if(K.step === "result") return !K.final ? "normal" : K.final.profit < 0 ? "worried" : (K.final.biz === "S" || K.final.biz === "A") ? "happy" : "soft";
  return null;
}
// 사무실이 자라는 홈 — 원룸 책상 → 작은 사무실(누적 1억 또는 자산 3억) → 투자회사(자산 10억)
const KE_OFFICES = [
  {id:"bg_office_1", t:"원룸 책상", need:"시작", ok:()=>true},
  {id:"bg_office_2", t:"작은 사무실", need:"누적 수익 1억 또는 자산 3억", ok:c=>c.total >= 10000 || c.cash >= 30000},
  {id:"bg_office_3", t:"경매 투자회사", need:"자산 10억", ok:c=>c.cash >= 100000}];
function keOffice(){ const c = kcRec(); let cur = null; for(const o of KE_OFFICES) if(o.ok(c) && artUrl(o.id)) cur = o; return cur; }
const _ke_home = homeHTML; homeHTML = function(){
  let h = _ke_home(); const o = keOffice();
  if(o) h = h.replace(vnBgHTML("bg_villa_night"), vnBgHTML(o.id)).replace('<div class="kc-stat">', `<div class="kc-stat">🏢 ${esc(o.t)} · `);
  return h.replace('<div class="kc-stat">', `<p class="ke-tip">💡 ${esc(keTip())}</p><div class="kc-stat">`);
};
const _ke_rec = recHTML; recHTML = function(){
  const c = kcRec();
  const row = KE_OFFICES.map(o => { const u = artUrl(o.id), on = o.ok(c); return `<figure class="ke-off ${on?"on":""}">${u?`<img src="${u}" alt="" loading="lazy">`:`<span class="ke-off-q">🚧<small>그림 준비 중</small></span>`}<figcaption><b>${on?"🔓":"🔒"} ${esc(o.t)}</b><small>${esc(o.need)}</small></figcaption></figure>`; }).join("");
  return _ke_rec().replace('<div class="panel kc-tiers">', `<div class="panel kc-tiers"><b>🏢 내 사무실</b> <small class="note">돈이 불면 홈 화면 배경이 바뀌어요</small><div class="ke-offs">${row}</div></div><div class="panel kc-tiers">`);
};
// 입찰봉투 그림
const _ke_sealed = keSealedHTML; keSealedHTML = function(){ const u = artUrl("prop_envelope"); let h = _ke_sealed(); if(u) h = h.replace('<div class="ke-env">', `<div class="ke-env has-img"><img class="ke-env-img" src="${u}" alt="봉인된 입찰봉투">`); return h; };
const _ke_sheet = keBidSheet; keBidSheet = function(){ const u = artUrl("prop_envelope"); return _ke_sheet().replace("✉️ 봉투에 넣기", u ? `<img class="ke-btn-ic" src="${u}" alt=""> 봉투에 넣기` : "✉️ 봉투에 넣기"); };
const _ke_open = keRevealHTML; keRevealHTML = function(){ const u = artUrl("prop_envelope"); return _ke_open().replace('<p class="ke-open-h">', u ? `<img class="ke-open-env" src="${u}" alt=""><p class="ke-open-h">` : '<p class="ke-open-h">'); };
// 💡 경매왕 TIP — 한 문장만
const KE_TIPS = ["싸게 샀다는 사실은 아직 수익이 아닙니다.", "싸게 사는 것보다, 실제로 팔릴 가격을 먼저 계산하세요.", "빌라는 아파트의 대체재예요. 인근 아파트보다 비싸지면 잘 안 팔립니다.",
  "금액이 싸면 팔리긴 팔리는 빌라를 고르세요 — 팔기 어려운 요소부터 제거하고.", "빌라는 개별성이 강해서 실거래 한 건만 보고 가격을 정하면 안 됩니다.", "평당가를 맹신하지 마세요. 업거래가 섞여 있을 수 있어요.",
  "수익률이 높은 물건은 환금성이 떨어질 수 있어요.", "하자 있는 물건이 아니라 '통제 가능한 하자'여야 합니다.", "한 번의 대박보다 반복 가능한 시스템이 목표예요.",
  "경쟁자 수도 시세만큼 중요합니다.", "점유자의 첫 요구액은 최종 요구액이 아닐 수 있습니다.", "말로 한 약속은 합의서가 되기 전까지 약속이 아닙니다."];
function keTip(){ return KE_TIPS[Math.floor(Math.random() * KE_TIPS.length)]; }
const _ke_intro = kcIntroHTML; kcIntroHTML = function(){ return _ke_intro().replace('<button type="button" class="kc-skip" data-kintro>', `<p class="ke-tip dark">💡 ${esc(keTip())}</p><button type="button" class="kc-skip" data-kintro>`); };
// 봉투에 넣으면 도장이 '쾅' — 애니메이션(1.05초 뒤)에 맞춰 효과음
document.addEventListener("click", e => { if(e.target.closest && e.target.closest("[data-kcseal]") && typeof kcSfx === "function") setTimeout(() => kcSfx("stamp"), 1200); });
