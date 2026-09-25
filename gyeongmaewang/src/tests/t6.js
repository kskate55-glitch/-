const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for (const w of [1280,390]){const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html');await p.waitForTimeout(600);
const r=await p.evaluate(()=>{const ids=WB.map(q=>q.id);const per={};WB.forEach(q=>per[q.u]=(per[q.u]||0)+1);return {n:WB.length,uniq:new Set(ids).size,per}});
console.log(w,JSON.stringify(r));
// render every new item in review mode
const bad=await p.evaluate(()=>{let bad=0;const news=WB.filter(q=>/^w\d+-(09|1\d|2\d)$/.test(q.id));try{startWB(news,'practice','test');}catch(e){return 'start '+e.message}return news.length});
console.log('new-ish',bad, 'scrollW',await p.evaluate(()=>document.documentElement.scrollWidth));
await p.screenshot({path:`s6_${w}.png`});}
console.log('errors',errs);await b.close();})();
