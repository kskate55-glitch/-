const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(); const errs=[]; const tag=process.argv[2]||'now';
for(const [w,h] of [[1280,800],[390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h}}); await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); p.on('pageerror',e=>errs.push(w+' '+e.message));
 await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(300); await p.evaluate(()=>{try{cpUnlockAll()}catch(e){}}); await p.waitForTimeout(700);
 await p.evaluate(()=>{ arenaTab='home'; renderArena(); }); await p.waitForTimeout(300);
 await p.click('[data-lfgo],[data-frgo]'); await p.waitForTimeout(300);
 await p.click('[data-lfpick="dohyun"]'); await p.waitForTimeout(150); await p.click('[data-lfstart="dohyun"]'); await p.waitForTimeout(400);
 await p.click('[data-gxskip]'); await p.waitForTimeout(300); await p.click('[data-gxskip]'); await p.waitForTimeout(1500);
 await p.screenshot({path:`lfshot_${tag}_${w}.png`});
 const extra=process.argv[3]; if(extra){ for(const s of extra.split(',')){ await p.click(s); await p.waitForTimeout(500); await p.screenshot({path:`lfshot_${tag}_${w}_${s.replace(/\W/g,'')}.png`}); } }
 await p.close();}
console.log('errors',errs); await b.close();})();
