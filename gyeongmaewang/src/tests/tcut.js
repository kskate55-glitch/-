const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(300);
console.log(await p.evaluate(()=>{const c=document.createElement('canvas');c.width=60;c.height=60;const x=c.getContext('2d');
 for(let i=0;i<60;i+=10)for(let j=0;j<60;j+=10){x.fillStyle=((i+j)/10)%2?'#cccccc':'#ffffff';x.fillRect(i,j,10,10);}
 x.fillStyle='#111';x.fillRect(20,20,20,20);x.fillStyle='#eee';x.fillRect(25,25,10,10); // white inside outline
 artCutBg(x,60,60);const d=x.getImageData(0,0,60,60).data;const a=(X,Y)=>d[(Y*60+X)*4+3];
 return [ART_SLOTS.length, a(2,2), a(15,15), a(22,22), a(30,30)];}));
await b.close();})();
