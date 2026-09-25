const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+process.cwd()+'/rights-study.html');await p.waitForTimeout(300);
const tests=["감정가\t280,000,000원\n최저가\t196,000,000원","감정가\n280,000,000\n최저가 (70%)\n196,000,000","감정평가액 2억 8,000만원 최저매각가격 1억9,600만원","감 정 가 : 280,000,000원  최 저 가 : 196,000,000원"];
for(const t of tests) console.log(await p.evaluate(t=>{const o=realParse(t);return o.appraisal+' / '+o.minBid},t));
await b.close();})();
