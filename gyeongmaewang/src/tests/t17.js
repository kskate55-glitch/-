const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];const out=[];
for(const w of [390,1280]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html#arena');await p.waitForTimeout(400);
await p.click('[data-atab="sell"]');
// 1) 험한 집, 전부 조사 3개, 기본 정리, 30일 목표가
await p.click('[data-sgc="노후"]');
for(const k of ['broker','visit','papers']) await p.click(`[data-sgact="${k}"]`);
out.push(w+' liq disabled '+await p.isDisabled('[data-sgact="liq"]'));
if(w===390) await p.screenshot({path:'s1.png',fullPage:true});
await p.click('[data-sgphase="repair"]'); await p.click('[data-sgrepair="기본"]');
await p.click('[data-sgask] >> nth=1'); out.push(w+' A '+(await p.textContent('.ag-grade'))+' '+(await p.textContent('.ag-end')).replace(/\s+/g,' ').slice(0,90));
if(w===390) await p.screenshot({path:'s2.png',fullPage:true});
// 2) 다시, 조사 없이 무리한 호가
await p.click('[data-sgretry]'); await p.click('[data-sgphase="repair"]'); await p.click('[data-sgrepair=""]');
await p.fill('#sgAsk','40000'); await p.click('#sgAskF button'); out.push(w+' B '+await p.textContent('.ag-grade'));
// 3) 명도왕 결과 연동
await p.click('[data-sgquit]'); await p.evaluate(()=>{S.arena.last={grade:"F",how:"exec",pid:"p_hug"};renderArena();});
out.push(w+' link '+(await p.textContent('[data-sgw]')));
await p.click('[data-sgw]'); await p.click('[data-sgact="visit"]'); out.push(w+' why '+(await p.textContent('.sg-open')).replace(/\s+/g,' ').slice(0,80));
out.push(w+' sw '+await p.evaluate(()=>document.documentElement.scrollWidth));}
console.log(out.join('\n'));console.log('errors',errs);await b.close();})();
