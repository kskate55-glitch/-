const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});
await p.addInitScript(()=>{window.MT_SKIP_TALE=true}); await p.goto('http://localhost:8765/rights-study.html#arena');await p.waitForTimeout(800);
await p.evaluate(async()=>{localStorage.clear(); arenaTab='king'; KC_MODE='career'; K_PROP_NEXT='k1'; KC_INTRO=false; kStart(5); K.intro=false;
 K.rivals=[{t:"이사철 실수요자",lo:1.10,hi:1.16},{t:"겉 마진 보고 온 투자자",lo:1.06,hi:1.12},{t:"초보 과입찰러",lo:1.13,hi:1.15},{t:"무조건 저가형",lo:1.0,hi:1.02},{t:"감정가 맹신러",lo:1.0,hi:1.01}]; kBid(KP.minBid); K.revealing=false; renderArena();});
await p.waitForTimeout(2500); const el=await p.$('.k-bids'); await el.scrollIntoViewIfNeeded(); await el.screenshot({path:'t_bids.png'}); await b.close();})();
