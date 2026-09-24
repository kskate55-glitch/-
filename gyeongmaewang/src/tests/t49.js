// ☁ 독립 버전 회원·클라우드 저장 — 가짜 Supabase(서버는 이 Node 프로세스)로 두 기기를 흉내 낸다
const { chromium } = require('playwright');
const fs = require('fs');
const SITE = '/tmp/gmwtest';
const srv = {users:[], saves:{}, profiles:{}, events:[], calls:[]};
let nid = 1;
function handle(op, a){
  srv.calls.push(op);
  if(op==='anon'){ const u={id:'u'+(nid++), is_anonymous:true, email:null}; srv.users.push(u); return {user:u}; }
  if(op==='signUp'){ if(srv.users.find(u=>u.email===a.email)) return {error:{message:'User already registered'}}; const u={id:'u'+(nid++), is_anonymous:false, email:a.email, pw:a.password}; srv.users.push(u); return {user:u}; }
  if(op==='update'){ if(srv.users.find(u=>u.email===a.email)) return {error:{message:'User already registered'}}; const u=srv.users.find(u=>u.id===a.uid); u.email=a.email; u.pw=a.password; u.is_anonymous=false; return {user:u}; }
  if(op==='login'){ const u=srv.users.find(u=>u.email===a.email&&u.pw===a.password); return u?{user:u}:{error:{message:'Invalid login credentials'}}; }
  if(op==='select'){ const src=a.t==='saves'?srv.saves:srv.profiles; return {data:src[a.uid]||null}; }
  if(op==='upsert'){ if(a.row.user_id!==a.uid) return {error:{message:'RLS'}}; (a.t==='saves'?srv.saves:srv.profiles)[a.uid]=a.row; return {}; }
  if(op==='insert'){ for(const r of a.rows){ if(r.user_id!==a.uid) return {error:{message:'RLS'}}; } srv.events.push(...a.rows); return {}; }
}
const MOCK = `
window.supabase = { createClient: function(url, key){
  const K='mock-session';
  const sess=()=>{try{return JSON.parse(localStorage.getItem(K));}catch(e){return null;}};
  const setS=u=>{ if(u) localStorage.setItem(K, JSON.stringify({user:u})); else localStorage.removeItem(K); };
  const call=(op,a)=>{ if(!navigator.onLine) return Promise.reject(new TypeError('Failed to fetch')); return window.__srv(op,a||{}); };
  const uid=()=>{const s=sess(); return s&&s.user.id;};
  return {
    auth:{
      getSession:async()=>({data:{session:sess()}}),
      signInAnonymously:async()=>{const r=await call('anon'); setS(r.user); return {data:{user:r.user, session:{user:r.user}}, error:null};},
      signUp:async({email,password})=>{const r=await call('signUp',{email,password}); if(r.error) return {data:{}, error:r.error}; setS(r.user); return {data:{user:r.user, session:{user:r.user}}, error:null};},
      updateUser:async({email,password})=>{const r=await call('update',{uid:uid(),email,password}); if(r.error) return {data:{}, error:r.error}; setS(r.user); return {data:{user:r.user}, error:null};},
      signInWithPassword:async({email,password})=>{const r=await call('login',{email,password}); if(r.error) return {data:{}, error:r.error}; setS(r.user); return {data:{user:r.user, session:{user:r.user}}, error:null};},
      signOut:async()=>{setS(null); return {error:null};}
    },
    from:function(t){ return {
      select:()=>({eq:()=>({maybeSingle:()=>call('select',{t,uid:uid()})})}),
      upsert:row=>call('upsert',{t,uid:uid(),row:JSON.parse(JSON.stringify(row))}).then(r=>({error:r.error||null})),
      insert:rows=>call('insert',{t,uid:uid(),rows}).then(r=>({error:r.error||null}))
    }; }
  };
}};`;
function cfg(url, key){ fs.writeFileSync(SITE+'/config.js', `window.GMW_CLOUD={url:${JSON.stringify(url)},anonKey:${JSON.stringify(key)},emailDomain:"users.kyungmaewang.local"};`); }
const pill = p => p.evaluate(()=>{const e=document.querySelector('.gc-pill'); return e?e.textContent:null;});
(async()=>{
  const b = await chromium.launch(); const errs=[]; const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
  async function device(){ const c=await b.newContext({viewport:{width:390,height:844}}); await c.exposeFunction('__srv', handle); await c.addInitScript(MOCK); const p=await c.newPage(); p.on('pageerror',e=>errs.push('pageerror '+e.message)); return [c,p]; }

  // 0) 설정이 비어 있으면: 아무것도 안 뜨고 게임은 그대로
  cfg('',''); { const [c,p]=await device(); await p.goto('http://localhost:8790/'); await p.waitForTimeout(1200);
    ok(await pill(p)===null && !(await p.$('.gc-veil')), '설정 없음 → 회원 UI 없음'); ok(await p.evaluate(()=>page==='arena'), '설정 없음 → 게임 정상'); await c.close(); }
  // 0-2) 비밀 키를 넣으면 스스로 꺼진다
  cfg('https://x.supabase.co','sb_secret_abc'); { const [c,p]=await device(); await p.goto('http://localhost:8790/'); await p.waitForTimeout(1000);
    ok(await pill(p)===null, 'secret 키 → 자동 차단'); await c.close(); }
  const role = s => 'x.'+Buffer.from(JSON.stringify({role:s})).toString('base64')+'.y';
  cfg('https://x.supabase.co', role('service_role')); { const [c,p]=await device(); await p.goto('http://localhost:8790/'); await p.waitForTimeout(1000);
    ok(await pill(p)===null, 'service_role JWT → 자동 차단'); await c.close(); }

  cfg('https://x.supabase.co', role('anon'));
  // 1) 기기 A — 체험하기
  const [cA,A]=await device(); await A.goto('http://localhost:8790/'); await A.waitForTimeout(800);
  ok(!!(await A.$('.gc-veil [data-g="try"]')), '첫 화면: 바로 체험하기 버튼');
  await A.click('[data-g="try"]'); await A.waitForTimeout(700);
  ok(!(await A.$('.gc-veil')) && /저장됨|저장 중/.test(await pill(A)), '체험 → 창 닫힘 · '+await pill(A));
  const anonId = srv.users[0].id;
  await A.evaluate(()=>{ S.cloudMark = 'deviceA-'+Date.now(); save(); }); await A.waitForTimeout(2200);
  ok(srv.saves[anonId] && /deviceA/.test(srv.saves[anonId].state.cloudMark||''), '체험 기록이 서버에 저장됨 · '+await pill(A));
  // 2) 게임 한 판 흉내 → 퍼널 이벤트 + 클리어 후 가입 권유
  await A.evaluate(()=>{ kStart(4242); }); await A.waitForTimeout(1300);
  await A.evaluate(()=>{ K.intro=false; K.step='brief'; }); await A.waitForTimeout(1200);
  await A.evaluate(()=>{ K.step='result'; }); await A.waitForTimeout(4200);
  const steps = srv.events.filter(e=>e.name==='case_step').map(e=>e.props.step);
  ok(srv.events.some(e=>e.name==='case_start') && steps.includes('research') && steps.includes('result'), '퍼널 기록: '+steps.join('→'));
  ok(srv.events.every(e=>e.user_id===anonId && !JSON.stringify(e.props).match(/@|pw|password/)), '이벤트에 개인정보 없음');
  ok(await A.evaluate(()=>/CASE 클리어/.test(document.querySelector('.gc-veil')?.textContent||'')), 'CASE 클리어 → 아이디 만들기 권유');
  await A.click('[data-u="up"]'); await A.waitForTimeout(300);
  // 검증: 잘못된 입력
  await A.fill('[name=id]','AB'); await A.fill('[name=pw]','12345678'); await A.fill('[name=pw2]','12345678'); await A.click('[data-s="go"]');
  ok(/4~16/.test(await A.textContent('.gc-err')), '짧은 아이디 거절');
  await A.fill('[name=id]','tester_01'); await A.fill('[name=pw2]','87654321'); await A.click('[data-s="go"]');
  ok(/맞지 않/.test(await A.textContent('.gc-err')), '비밀번호 확인 불일치 거절');
  await A.fill('[name=pw2]','12345678'); await A.click('[data-s="go"]');
  ok(/이유/.test(await A.textContent('.gc-err')), '이유 미선택 거절');
  ok(/계정 복구가 어렵/.test(await A.textContent('.gc-warn')), '비밀번호 분실 경고 표시');
  const names = await A.evaluate(()=>[...new Set([...document.querySelectorAll('.gc-box input')].map(i=>i.name))].sort().join(','));
  ok(names==='id,pw,pw2,reason', '가입 입력칸은 아이디·비번·확인·이유뿐: '+names);
  await A.check('[name=reason][value="studying"]'); await A.click('[data-s="go"]'); await A.waitForTimeout(1500);
  const up = srv.users.find(u=>u.email==='tester_01@users.kyungmaewang.local');
  ok(up && up.id===anonId && !up.is_anonymous, '체험 계정이 같은 id로 승격(기록 유지)');
  ok(srv.profiles[anonId] && srv.profiles[anonId].username==='tester_01' && srv.profiles[anonId].reason==='studying' && Object.keys(srv.profiles[anonId]).length===3, '프로필: 아이디+이유만');
  ok(!/users\.kyungmaewang\.local/.test(await A.evaluate(()=>document.body.innerText)), '가짜 이메일이 화면에 안 보임');
  // 3) 기기 B — 로그인하면 A 기록이 따라온다
  const markA = srv.saves[anonId].state.cloudMark;
  const [cB,B]=await device(); await B.goto('http://localhost:8790/'); await B.waitForTimeout(800);
  await B.click('[data-g="login"]'); await B.fill('[name=id]','tester_01'); await B.fill('[name=pw]','wrongpass'); await B.click('[data-l="go"]'); await B.waitForTimeout(400);
  ok(/맞지 않/.test(await B.textContent('.gc-err')), '틀린 비밀번호 거절');
  await B.fill('[name=pw]','12345678'); await B.click('[data-l="go"]'); await B.waitForTimeout(1200);
  ok(await B.evaluate(()=>S.cloudMark)===markA, '다른 기기에서 기록 이어받음');
  ok(await B.evaluate(()=>JSON.parse(localStorage.getItem('rights-study-v1')).cloudMark)===markA, '받은 기록이 그 기기에도 저장');
  // 4) 오프라인 → 대기 → 다시 연결되면 저장
  await cB.setOffline(true); await B.evaluate(()=>{ S.cloudMark='deviceB-offline'; save(); }); await B.waitForTimeout(2200);
  ok(/오프라인/.test(await pill(B)) && srv.saves[anonId].state.cloudMark===markA, '오프라인 → '+await pill(B)+' (서버는 그대로)');
  await cB.setOffline(false); await B.waitForTimeout(1500);
  ok(srv.saves[anonId].state.cloudMark==='deviceB-offline' && /저장됨/.test(await pill(B)), '재연결 → 밀린 저장 반영 · '+await pill(B));
  // 5) 새로고침해도 로그인 유지 · 창 안 뜸
  await B.reload(); await B.waitForTimeout(1200);
  ok(!(await B.$('.gc-veil')) && await B.evaluate(()=>S.cloudMark)==='deviceB-offline', '새로고침 → 로그인 유지');
  // 6) 이미 있는 아이디로 가입 시도
  const [cC,C]=await device(); await C.goto('http://localhost:8790/'); await C.waitForTimeout(700);
  await C.click('[data-g="signup"]'); await C.fill('[name=id]','tester_01'); await C.fill('[name=pw]','abcdefgh'); await C.fill('[name=pw2]','abcdefgh'); await C.check('[name=reason][value="fun"]'); await C.click('[data-s="go"]'); await C.waitForTimeout(600);
  ok(/이미 있는 아이디/.test(await C.textContent('.gc-err')), '중복 아이디 안내');
  // 7) 로그아웃 → 이 기기 기록 지우고 첫 화면
  await B.click('.gc-pill'); await B.waitForTimeout(200); ok(/tester_01/.test(await B.textContent('.gc-box')), '계정 창에 아이디 표시');
  await B.click('[data-a="out"]'); await B.waitForTimeout(1500);
  ok(!!(await B.$('.gc-veil [data-g="try"]')) && await B.evaluate(()=>!localStorage.getItem('rights-study-v1')), '로그아웃 → 첫 화면 · 이 기기 기록 삭제');
  // 8) 안전: 코드에 service_role 이 들어 있지 않다
  const code = fs.readFileSync(SITE+'/cloud.js','utf8')+fs.readFileSync(SITE+'/index.html','utf8');
  ok(!/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(code), '빌드 결과에 실제 키 문자열 없음');
  await A.screenshot({path:'cl_a.png'});
  console.log('calls', srv.calls.length, 'events', srv.events.length);
  console.log('errors', errs); await b.close();
  cfg('','');
})();
