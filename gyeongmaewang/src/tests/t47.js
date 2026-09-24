// 시간 예산 밸런스: 전략별로 몇 개 찾는지
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(600);
const r=await p.evaluate(()=>{ const out={};
 const plans={k1:{phone:['docs','court','call1','call3','mgmtcall','map','trade','bldg'], site:['docs','court','meter','mgmt','neigh','call3'], deep:['docs','brokers','meter','mgmt'], all:['docs','court','call3','meter','mgmt','neigh','brokers','occ']},
              k2:{phone:['docs','kim','listing','bank','call3','mgmtcall','court','trade'], site:['docs','listing','bank','down','park','mgmt'], deep:['docs','brokers','mgmt','down'], all:['docs','kim','listing','bank','down','park','mgmt','brokers']}};
 for(const pr of ['k1','k2']) for(const [n,list] of Object.entries(plans[pr])){ let f=0,t=0,did=0; for(let s=1;s<=60;s++){ K_PROP_NEXT=pr; KC_MODE='free'; kStart(s*97); list.forEach(kResearch); f+=KP.hidden.filter(h=>K.found[h.id]).length; t+=K.timeLeft; did+=K.rlog.length; } out[pr+'/'+n]=[(f/60).toFixed(2), Math.round(t/60), (did/60).toFixed(1)]; }
 return out; });
console.log('plan: [평균 발견/4, 평균 남은분, 실제 수행 수]'); for(const [k,v] of Object.entries(r)) console.log(k.padEnd(10), v.join('  '));
console.log('errors',errs);await b.close();})();
