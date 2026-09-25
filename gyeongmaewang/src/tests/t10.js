const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+process.cwd()+'/rights-study.html');await p.waitForTimeout(300);
const r=await p.evaluate(()=>{const c={sale:10000,cost:0,tax:0,rights:[{type:'가압류',date:'2020.01.01',amt:4000},{type:'근저당',date:'2020.06.01',amt:6000},{type:'가압류',date:'2021.01.01',amt:5000}],tenants:[]};
 const a=realAnalyze(c);return a.table.map(x=>x.name+':'+x.got).join(' / ')+' | base '+a.base.type});
console.log(r);
const r2=await p.evaluate(()=>{const c={sale:15000,cost:200,tax:0,rights:[{type:'근저당',date:'2020.03.10',amt:8000}],tenants:[{move:'2020.03.10',fix:'2020.03.10',demand:true,dep:9000}]};
 const a=realAnalyze(c);return a.table.map(x=>x.name+':'+x.got).join(' / ')+' | dh '+a.tenants[0].dh+' insu '+a.insu});
console.log(r2);await b.close();})();
