const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{ window.alert=()=>{}; });
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(600);
 await p.evaluate(()=>safeAlert('최저가 이상 적어야 해요.')); await p.waitForTimeout(200);
 console.log('toast', await p.evaluate(()=>document.getElementById('scToast').textContent)); await p.screenshot({path:'sc_toast.png'});
 await p.waitForTimeout(4400); console.log('gone', await p.evaluate(()=>!document.getElementById('scToast')));
 console.log('errors',errs); await b.close(); })();
