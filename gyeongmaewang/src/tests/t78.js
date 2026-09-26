// 조사 화면 PC: 오른쪽 칸은 머리줄 '상황판' 알약으로 접히고, 누르면 열린다. 입찰표·사건 파일·행동 메뉴가 겹치지 않는다.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m); if(!c) errs.push(m);};
const R=(p,s)=>p.evaluate(s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return (r.width&&r.height&&cs.visibility!=='hidden')?{l:r.left,r:r.right,t:r.top,b:r.bottom}:null;},s);
const over=(a,c)=>a&&c&&a.l<c.r-1&&c.l<a.r-1&&a.t<c.b-1&&c.t<a.b-1;
for(const [w,h,life] of [[1280,824,'dohyun'],[1440,900,null],[1024,700,'seoyun'],[390,844,'dohyun']]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(w+' '+e.message));
await p.addInitScript(()=>{window.MT_SKIP_TALE=true});
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(900);
await p.evaluate(ch=>{localStorage.clear();kcRec().fr={full:true};cpUnlockAll(); if(ch){lfNew(ch);lfRec().intro=false;} arenaTab='king';KC_MODE='career';K_PROP_NEXT='k1';KC_INTRO=false;kStart(5);K.intro=false;renderArena();},life);await p.waitForTimeout(1500);
const tag=`${w}${life?' '+life:''}`;
if(w<=900){ ok(!(await R(p,'.sf-pill')) && !!(await R(p,'.kfs-panel')), tag+' 모바일: 알약 없음 · 아래 칸 그대로'); await p.close(); continue; }
ok(!!(await R(p,'.sf-pill')) && !(await R(p,'.kfs-panel')), tag+' 상황판 알약만 보이고 오른쪽 칸은 접힘');
ok(await p.evaluate(()=>/⏱/.test(document.querySelector('.sf-pill').innerText)), tag+' 알약에 남은 조사 시간');
const stage=await R(p,'.kfs-stage'); ok(stage && stage.r>=w-2, tag+' 그림 칸이 화면 전체 폭');
const sheet=await R(p,'.stg-sheet'), dock=await R(p,'.nx-bar'); ok(!over(sheet,dock), tag+' 행동 메뉴와 입찰표가 안 겹침');
await p.click('[data-sfside]'); await p.waitForTimeout(250);
ok(!!(await R(p,'.kfs-panel .kr-clock')), tag+' 알약 누르면 상황판이 열림(남은 시간 칸)');
if(life){ const has=await p.$('.kfs-panel [data-lfnext]'); if(has){ await p.click('.kfs-panel [data-lfnext]'); await p.waitForTimeout(500); ok(await p.evaluate(()=>K.lf.rday===1), tag+' 상황판 안 "오늘은 여기까지" 버튼이 눌림'); } }
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
ok(!(await R(p,'.kfs-panel')), tag+' Esc로 닫힘');
await p.click('[data-sfside]'); await p.waitForTimeout(200); await p.mouse.click(200,500); await p.waitForTimeout(200);
ok(!(await R(p,'.kfs-panel')), tag+' 바깥을 누르면 닫힘');
await p.click('[data-stg="file"]'); await p.waitForTimeout(350);
const file=await R(p,'.stg-file');
if(w>=1100 && await p.evaluate(()=>!!document.querySelector('.stg-dock.stg-mid'))){ const sh=await R(p,'.stg-sheet'), pl=await R(p,'.vn-player'); ok(!!file && !!sh && !over(file,sh) && !over(file,await R(p,'.nx-bar')) && !(pl && file.l < pl.r-1), tag+' v210: 사건 파일은 가운데 빈 곳 — 입찰표·메뉴·주인공과 안 겹침(입찰표도 그대로 보임)'); }
else ok(!!file && !(await R(p,'.stg-sheet')) && !over(file,await R(p,'.nx-bar')), tag+' 사건 파일은 입찰표 자리에 — 메뉴와 안 겹침');
ok(await p.evaluate(()=>{const b=document.querySelector('.stg-file .ke-grid b'); return b && getComputedStyle(b).color!=='rgb(22, 27, 37)' && getComputedStyle(document.querySelector('.stg-file .ke-case')).backgroundColor==='rgb(251, 247, 238)';}), tag+' 사건 파일 크림색 종이 · 글씨 보임');
await p.click('.stg-x'); await p.waitForTimeout(300);
ok(!!(await R(p,'.stg-sheet')) && !(await R(p,'.stg-file')), tag+' 사건 파일 닫으면 입찰표 다시(넓은 화면은 원래도 보임)');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), tag+' 가로 스크롤 없음');
await p.screenshot({path:`../t78_${w}.png`}); await p.close();}
console.log('errors',errs); await b.close();})();
