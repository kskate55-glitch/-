/* ☁ 경매왕 독립 버전 — 회원·클라우드 저장·이탈 통계 (Supabase)
   - config.js 에 url/anonKey 가 비어 있으면 아무것도 안 한다(지금처럼 이 기기에만 저장).
   - 브라우저에는 anon(publishable) 키만 둔다. service_role 키는 절대 여기 오지 않는다.
   - 받는 정보: 아이디(영문·숫자), 비밀번호, 시작한 이유 하나. 이름·생일·전화·주소·실제 이메일·성별은 받지 않는다.
   - 아이디는 가짜 이메일(<id>@<emailDomain>)로 바꿔 Supabase Auth에 넣는다. 화면에는 절대 안 보인다. */
(function(){
  "use strict";
  var CFG = window.GMW_CLOUD || {};
  if(!CFG.url || !CFG.anonKey){ window.GMW_CLOUD_ON = false; return; }   // 설정 전 = 지금처럼 이 기기에만
  function looksSecret(k){
    if(/^sb_secret_/.test(k)) return true;
    try{ var p = k.split(".")[1]; if(!p) return false; return /service_role/.test(atob(p.replace(/-/g,"+").replace(/_/g,"/"))); }catch(e){ return false; }
  }
  if(looksSecret(CFG.anonKey)){
    console.error("config.js 에 비밀(service_role/secret) 키가 들어 있어요 — 절대 안 됩니다. anon/publishable 키로 바꾸세요.");
    window.GMW_CLOUD_ON = false; return;
  }
  // supabase-js 는 설정이 있을 때만 불러온다(없으면 첫 화면을 느리게 할 이유가 없다)
  if(window.supabase && window.supabase.createClient) start();
  else {
    var tag = document.createElement("script");
    tag.src = CFG.sdk || "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
    tag.onload = start; tag.onerror = function(){ window.GMW_CLOUD_ON = false; console.warn("Supabase 라이브러리를 못 불러와 이 기기에만 저장합니다."); };
    document.head.appendChild(tag);
  }
  function start(){
  var SB = window.supabase;
  window.GMW_CLOUD_ON = true;
  var DOMAIN = CFG.emailDomain || "users.kyungmaewang.local";
  var sb = SB.createClient(CFG.url, CFG.anonKey, {auth:{persistSession:true, autoRefreshToken:true, storageKey:"gmw-auth"}});
  window.GMW_SB = sb; // 테스트용
  var REASONS = [["investing","실제 경매 투자 중"],["studying","경매 공부 중"],["curious","경매에 관심 있음"],["fun","게임이 재미있어 보여서"],["other","기타"]];
  var ID_RE = /^[a-z0-9_]{4,16}$/;
  var user = null, profile = null, dirty = false, pushing = false, timer = null, lastState = "", evQueue = [];

  /* ---------- 모양 ---------- */
  var css = document.createElement("style");
  css.textContent = [
    ".gc-pill{position:fixed;left:10px;bottom:10px;z-index:9998;font:600 12px/1 system-ui,sans-serif;padding:7px 11px;border-radius:999px;background:rgba(20,26,40,.88);color:#cfe3ff;border:1px solid rgba(160,190,255,.25);cursor:pointer;backdrop-filter:blur(4px)}",
    ".gc-pill.off{color:#ffd18a;border-color:rgba(255,190,90,.4)}.gc-pill.busy{color:#b9c6da}",
    ".gc-veil{position:fixed;inset:0;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(6,9,16,.78);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}",
    ".gc-box{width:100%;max-width:380px;background:#141a28;color:#e8eefa;border:1px solid #2b3550;border-radius:18px;padding:22px 20px;box-shadow:0 20px 60px rgba(0,0,0,.5);font:15px/1.6 system-ui,sans-serif}",
    ".gc-box h2{margin:0 0 4px;font-size:22px}.gc-box p{margin:6px 0;color:#aab6cc;font-size:14px}",
    ".gc-box button{display:block;width:100%;margin:8px 0 0;padding:13px;border-radius:12px;border:1px solid #33405e;background:#1d2538;color:#e8eefa;font:700 15px system-ui,sans-serif;cursor:pointer}",
    ".gc-box button.pri{background:linear-gradient(135deg,#f0b43a,#e08a1a);border:0;color:#1a1204}",
    ".gc-box button.link{background:none;border:0;color:#8fb3ff;font-weight:600;padding:8px}",
    ".gc-box label{display:block;margin:10px 0 3px;font-size:13px;color:#aab6cc}",
    ".gc-box input[type=text],.gc-box input[type=password]{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:10px;border:1px solid #33405e;background:#0e1320;color:#fff;font-size:16px}",
    ".gc-reasons label{display:flex;gap:8px;align-items:center;margin:4px 0;color:#e8eefa;font-size:14px}",
    ".gc-warn{background:#2a1f10;border:1px solid #6b4a1a;color:#ffd18a;border-radius:10px;padding:8px 10px;font-size:13px;margin-top:10px}",
    ".gc-err{color:#ff9a9a;font-size:13px;min-height:1.2em;margin-top:8px}"
  ].join("\n");
  document.head.appendChild(css);

  var pill = document.createElement("button");
  pill.className = "gc-pill busy"; pill.type = "button"; pill.textContent = "☁ 연결 중…";
  pill.addEventListener("click", openAccount);
  document.body.appendChild(pill);
  function setPill(kind){
    var t = {saved:"☁ 저장됨", saving:"☁ 저장 중...", offline:"⚠ 오프라인 — 연결되면 저장돼요", local:"💾 이 기기에만 저장 중", error:"⚠ 저장 실패 — 다시 시도 중"}[kind] || kind;
    pill.textContent = t; pill.className = "gc-pill" + (kind === "offline" || kind === "error" || kind === "local" ? " off" : kind === "saving" ? " busy" : "");
  }

  var veil = null;
  function close(){ if(veil){ veil.remove(); veil = null; } }
  function modal(html){ close(); veil = document.createElement("div"); veil.className = "gc-veil"; veil.innerHTML = '<div class="gc-box">' + html + "</div>"; document.body.appendChild(veil); return veil; }
  function h(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function isAnon(){ return !!(user && (user.is_anonymous || !user.email)); }

  /* ---------- 첫 화면 ---------- */
  function gate(){
    var v = modal('<h2>🏆 경매왕</h2><p>낙찰부터 명도·수리·매도까지, 경매 한 바퀴.</p>' +
      '<button class="pri" data-g="try">▶ 바로 체험하기</button>' +
      '<button data-g="signup">아이디 만들기</button>' +
      '<button class="link" data-g="login">이미 아이디가 있어요 — 로그인</button>' +
      '<p style="font-size:12px;margin-top:12px">이름·전화번호·이메일은 받지 않아요. 체험하다가 언제든 아이디를 만들면 기록이 그대로 이어져요.</p>' +
      '<div class="gc-err"></div>');
    v.addEventListener("click", function(e){
      var g = e.target.getAttribute && e.target.getAttribute("data-g"); if(!g) return;
      if(g === "try") tryAnon(v); else if(g === "signup") signupForm(false); else if(g === "login") loginForm();
    });
  }
  function tryAnon(v){
    var err = v.querySelector(".gc-err"); err.textContent = "";
    sb.auth.signInAnonymously().then(function(r){
      if(r.error){ close(); setPill("local"); console.warn("익명 로그인 실패:", r.error.message); return; }
      user = r.data.user; close(); afterAuth("new");
    }).catch(function(){ close(); setPill("local"); });
  }

  function signupForm(fromPrompt){
    var anon = isAnon();
    var v = modal('<h2>' + (anon ? "아이디 만들기 — 10초" : "아이디 만들기") + '</h2>' +
      (anon ? '<p>지금까지 한 기록이 그대로 이 아이디로 옮겨져요.</p>' : "") +
      '<label>아이디 (영문 소문자·숫자·_ 4~16자)</label><input type="text" name="id" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="16">' +
      '<label>비밀번호 (8자 이상)</label><input type="password" name="pw" autocomplete="new-password">' +
      '<label>비밀번호 확인</label><input type="password" name="pw2" autocomplete="new-password">' +
      '<label>경매왕을 시작한 이유</label><div class="gc-reasons">' +
      REASONS.map(function(r, i){ return '<label><input type="radio" name="reason" value="' + r[0] + '"' + "" + "> " + r[1] + "</label>"; }).join("") + "</div>" +
      '<div class="gc-warn">⚠ 비밀번호를 잊으면 계정 복구가 어렵습니다. 이메일을 받지 않아서 찾아 드릴 방법이 없어요.</div>' +
      '<div class="gc-err"></div>' +
      '<button class="pri" data-s="go">아이디 만들기</button>' +
      '<button class="link" data-s="back">' + (anon || fromPrompt ? "그냥 계속하기" : "← 돌아가기") + "</button>");
    v.addEventListener("click", function(e){
      var s = e.target.getAttribute && e.target.getAttribute("data-s"); if(!s) return;
      if(s === "back"){ if(user) close(); else gate(); return; }
      doSignup(v);
    });
  }
  function readSignup(v){
    var id = (v.querySelector("[name=id]").value || "").trim().toLowerCase();
    var pw = v.querySelector("[name=pw]").value || "", pw2 = v.querySelector("[name=pw2]").value || "";
    var rs = v.querySelector("[name=reason]:checked");
    if(!ID_RE.test(id)) return {err:"아이디는 영문 소문자·숫자·_ 로 4~16자예요."};
    if(pw.length < 8) return {err:"비밀번호는 8자 이상이어야 해요."};
    if(pw !== pw2) return {err:"비밀번호 확인이 맞지 않아요."};
    if(!rs) return {err:"시작한 이유를 하나 골라 주세요."};
    return {id:id, pw:pw, reason:rs.value};
  }
  function authMsg(e){
    var m = (e && e.message || "") + "";
    if(/already|registered|exists/i.test(m)) return "이미 있는 아이디예요. 다른 아이디를 써 주세요.";
    if(/invalid login|credentials/i.test(m)) return "아이디 또는 비밀번호가 맞지 않아요.";
    if(/password/i.test(m)) return "비밀번호가 너무 쉬워요. 더 길게 만들어 주세요.";
    if(/rate|too many/i.test(m)) return "잠깐 너무 많이 시도했어요. 조금 뒤에 다시 해 주세요.";
    if(/email/i.test(m)) return "가입 설정 문제로 막혔어요(관리자: Confirm Email 끄기 / emailDomain 확인).";
    if(/fetch|network/i.test(m)) return "인터넷 연결을 확인해 주세요.";
    return "잠시 문제가 생겼어요. 다시 시도해 주세요.";
  }
  function doSignup(v){
    var err = v.querySelector(".gc-err"), f = readSignup(v);
    if(f.err){ err.textContent = f.err; return; }
    err.textContent = "만드는 중…";
    var email = f.id + "@" + DOMAIN, p;
    if(isAnon()) p = sb.auth.updateUser({email:email, password:f.pw}); // 같은 계정으로 승격 — 기록 그대로
    else p = sb.auth.signUp({email:email, password:f.pw});
    p.then(function(r){
      if(r.error){ err.textContent = authMsg(r.error); return; }
      var u = r.data && r.data.user;
      if(!u || (r.data.session === null && !isAnon())){ err.textContent = "가입은 됐는데 로그인이 안 됐어요 — 관리자가 Confirm Email을 꺼야 해요."; return; }
      var wasAnon = isAnon(); user = u;
      return sb.from("profiles").upsert({user_id:u.id, username:f.id, reason:f.reason}).then(function(pr){
        if(pr.error){ console.warn("profile", pr.error.message); }
        profile = {username:f.id, reason:f.reason};
        close(); logEvent("signup", {from_trial:wasAnon, reason:f.reason});
        afterAuth("new");
      });
    }).catch(function(e){ err.textContent = authMsg(e); });
  }

  function loginForm(){
    var v = modal('<h2>로그인</h2>' +
      '<label>아이디</label><input type="text" name="id" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="16">' +
      '<label>비밀번호</label><input type="password" name="pw" autocomplete="current-password">' +
      '<div class="gc-err"></div><button class="pri" data-l="go">로그인</button><button class="link" data-l="back">← 돌아가기</button>');
    v.addEventListener("click", function(e){
      var s = e.target.getAttribute && e.target.getAttribute("data-l"); if(!s) return;
      if(s === "back"){ if(user) close(); else gate(); return; }
      var err = v.querySelector(".gc-err");
      var id = (v.querySelector("[name=id]").value || "").trim().toLowerCase(), pw = v.querySelector("[name=pw]").value || "";
      if(!ID_RE.test(id) || !pw){ err.textContent = "아이디와 비밀번호를 확인해 주세요."; return; }
      err.textContent = "들어가는 중…";
      var go = function(){ return sb.auth.signInWithPassword({email:id + "@" + DOMAIN, password:pw}); };
      // 체험 중(익명)이었다면 그 세션을 닫고 들어간다 — 체험 기록은 이 기기에만 남는다
      (isAnon() ? sb.auth.signOut().then(go) : go()).then(function(r){
        if(r.error){ err.textContent = authMsg(r.error); return; }
        user = r.data.user; close(); afterAuth("login");
      }).catch(function(e){ err.textContent = authMsg(e); });
    });
  }

  function openAccount(){
    if(!user){ gate(); return; }
    var anon = isAnon();
    var name = profile ? profile.username : "";
    var v = modal('<h2>☁ 내 계정</h2>' +
      (anon ? '<p>지금은 <b>체험 중</b>이에요. 이 기기에서만 이어할 수 있어요.</p><button class="pri" data-a="up">아이디 만들기 — 10초</button>'
            : '<p>아이디: <b>' + h(name || "(불러오는 중)") + '</b></p><p>다른 기기에서 이 아이디로 로그인하면 이어서 할 수 있어요.</p>') +
      '<button data-a="save">지금 저장하기</button>' +
      '<button data-a="out">' + (anon ? "체험 종료(이 기기 기록 지우기)" : "로그아웃") + "</button>" +
      '<button class="link" data-a="x">닫기</button>');
    v.addEventListener("click", function(e){
      var a = e.target.getAttribute && e.target.getAttribute("data-a"); if(!a) return;
      if(a === "x") close();
      else if(a === "up") signupForm(false);
      else if(a === "save"){ dirty = true; push(true); close(); }
      else if(a === "out") logout(anon);
    });
  }
  function logout(anon){
    if(anon && !safeConfirm("체험 기록이 사라져요. 계속할까요?")) return;
    var done = function(){
      sb.auth.signOut().finally(function(){
        try{ localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_KEY + ":ts"); }catch(e){}
        location.reload();
      });
    };
    if(!anon && dirty) push(true).finally(done); else done();
  }

  /* ---------- 저장 동기화 ---------- */
  function snapshot(){ try{ return JSON.stringify(S); }catch(e){ return ""; } }
  function applyRemote(state){
    try{
      S = Object.assign(blank(), state || {});
      localStorage.setItem(LS_KEY, JSON.stringify(S));
      localStorage.setItem(LS_KEY + ":ts", String(S.updated || 0));   // 두 탭 방어 기준도 이 기록으로 맞춘다
      lastState = snapshot();
      if(typeof render === "function") render();
    }catch(e){ console.error(e); }
  }
  function afterAuth(how){
    setPill("saving");
    var uid = user.id;
    if(!profile && !isAnon()) sb.from("profiles").select("username,reason").eq("user_id", uid).maybeSingle().then(function(r){ if(r.data) profile = r.data; });
    sb.from("saves").select("state,updated").eq("user_id", uid).maybeSingle().then(function(r){
      if(r.error){ setPill(navigator.onLine ? "error" : "offline"); schedule(8000); return; }
      var remote = r.data;
      var localUpd = S.updated || 0;
      if(remote && remote.state && (how === "login" || (remote.updated || 0) > localUpd)){
        applyRemote(remote.state); setPill("saved");               // 계정 기록을 이 기기로
      } else {
        dirty = true; push(true);                                  // 이 기기 기록을 계정으로(처음 로그인 = 옮기기)
      }
      flushEvents();
    }).catch(function(){ setPill("offline"); schedule(8000); });
  }
  function schedule(ms){ clearTimeout(timer); timer = setTimeout(function(){ push(false); }, ms); }
  function push(now){
    if(!user) return Promise.resolve();
    if(!dirty){ setPill("saved"); return Promise.resolve(); }
    if(pushing){ if(now) schedule(600); return Promise.resolve(); }
    if(!navigator.onLine){ setPill("offline"); return Promise.resolve(); }
    var snap = snapshot(); if(!snap) return Promise.resolve();
    pushing = true; dirty = false; setPill("saving");
    return sb.from("saves").upsert({user_id:user.id, state:JSON.parse(snap), updated:S.updated || Date.now(), updated_at:new Date().toISOString()})
      .then(function(r){
        pushing = false;
        if(r.error){ dirty = true; setPill(navigator.onLine ? "error" : "offline"); schedule(15000); return; }
        lastState = snap; setPill(dirty ? "saving" : "saved"); if(dirty) schedule(1500);
      }, function(){ pushing = false; dirty = true; setPill("offline"); schedule(15000); });
  }
  // 게임의 save()를 감싼다 — 이 기기 저장은 그대로, 계정 저장은 1.5초 모아서
  if(typeof save === "function"){
    var _save = save;
    save = function(){ var r = _save.apply(this, arguments); if(user){ dirty = true; setPill("saving"); schedule(1500); } return r; };
  }
  window.addEventListener("online", function(){ if(user && dirty) push(true); else if(user) setPill("saved"); });
  window.addEventListener("offline", function(){ if(user) setPill("offline"); });
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "hidden" && dirty) push(true); });

  /* ---------- 이탈 통계 (익명 — 개인정보 없음) ---------- */
  function logEvent(name, props){
    evQueue.push({name:String(name).slice(0, 40), props:props || {}});
    if(evQueue.length > 60) evQueue.shift();
    flushEvents();
  }
  function flushEvents(){
    if(!user || !evQueue.length || !navigator.onLine) return;
    var batch = evQueue.splice(0, evQueue.length).map(function(e){ return {user_id:user.id, name:e.name, props:e.props}; });
    sb.from("events").insert(batch).then(function(r){ if(r.error){ evQueue = batch.map(function(b){ return {name:b.name, props:b.props}; }).concat(evQueue).slice(-60); } });
  }
  window.GMW_LOG = logEvent;
  // CASE 시작 → 조사 → 입찰 → 명도 → 수리 → 매도 → 결과 → 다음 CASE
  var STAGE = {brief:"research", won:"won", lost:"lost", move:"evict", cross:"crossroad", defect:"repair", list:"sell", sell:"sell", result:"result"};
  var seen = {}, lastSeed = null, lastResultSeed = null, prompted = false;
  function watch(){
    try{
      if(typeof K === "undefined" || !K) return;
      var cid = (typeof KP !== "undefined" && KP && KP.id) || "k1";
      if(K.seed !== lastSeed){
        if(lastSeed !== null && lastResultSeed === lastSeed) logEvent("next_case", {case:cid});
        lastSeed = K.seed; logEvent("case_start", {case:cid});
      }
      var st = K.intro ? "intro" : (K.sealed ? "bid" : STAGE[K.step] || K.step);
      var key = K.seed + ":" + st;
      if(st !== "intro" && !seen[key]){
        seen[key] = 1;
        var p = {case:cid, step:st};
        if(st === "result"){ p.n_research = Object.keys(K.done || {}).length; lastResultSeed = K.seed; }
        logEvent("case_step", p);
        if(st === "result" && isAnon() && !prompted){ prompted = true; setTimeout(upgradePrompt, 2500); }
      }
    }catch(e){}
  }
  setInterval(watch, 1000);
  function upgradePrompt(){
    if(!isAnon() || veil) return;
    var v = modal('<h2>🏆 CASE 클리어!</h2><p>다른 기기에서도 이어하시겠어요?</p>' +
      '<button class="pri" data-u="up">아이디 만들기 — 10초</button><button class="link" data-u="no">그냥 계속하기</button>');
    logEvent("upgrade_prompt", {});
    v.addEventListener("click", function(e){
      var u = e.target.getAttribute && e.target.getAttribute("data-u"); if(!u) return;
      if(u === "up") signupForm(true); else close();
    });
  }

  /* ---------- 시작 ---------- */
  sb.auth.getSession().then(function(r){
    var s = r.data && r.data.session;
    if(s && s.user){ user = s.user; afterAuth("restore"); }
    else { setPill("local"); gate(); }
  }).catch(function(){ setPill("local"); gate(); });
  } // start
})();
