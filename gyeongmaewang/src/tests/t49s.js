const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ fs.writeFileSync('/tmp/gmwtest/config.js','window.GMW_CLOUD={url:"https://x.supabase.co",anonKey:"x.eyJyb2xlIjoiYW5vbiJ9.y"};');
const b=await chromium.launch(); for(const [w,h] of [[1280,800],[390,844]]){ const c=await b.newContext({viewport:{width:w,height:h}});
await c.addInitScript(`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}})},from:()=>({})})}`);
const p=await c.newPage(); await p.goto('http://localhost:8790/'); await p.waitForTimeout(900); await p.screenshot({path:`cl_gate_${w}.png`});
await p.click('[data-g="signup"]'); await p.waitForTimeout(300); await p.screenshot({path:`cl_signup_${w}.png`}); await c.close(); }
fs.writeFileSync('/tmp/gmwtest/config.js','window.GMW_CLOUD={url:"",anonKey:""};'); await b.close(); })();
