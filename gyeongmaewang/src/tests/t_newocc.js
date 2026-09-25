const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h] of [[1280,800],[390,844]]){
const p=await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(800);
for(const id of ['p_hawaii','p_live','p_tojuk','p_chain','p_gamer']){
  const r=await p.evaluate(async(id)=>{ const P=personaById(id); if(!P) return {err:'no persona'};
    const out={name:P.name, type:occType(P.type).name};
    ['normal','angry','worried'].forEach(e=>out[e]=!!artNpc(id,e));
    arenaTab='game'; gStart(id); renderArena(); await new Promise(r=>setTimeout(r,300));
    const img=[...document.querySelectorAll('img')].find(i=>i.src.includes(ART_DEFAULT['npc_'+id+'_normal'])||['normal','angry','worried'].some(e=>i.src.includes(ART_DEFAULT['npc_'+id+'_'+e])));
    out.shown=!!img; if(img){ await new Promise(r=>setTimeout(r,400)); out.loaded=img.naturalWidth>0; }
    let g=0; while(!G.over && g++<80){ const need=gNeed(P); if(G.handover) gAct('hand_full'); else if(!G.orderOk && !G.order && G.week<26) gAct('order'); else if(!G.deal && !G.gone && need<=800) gAct('offer', G_OFFERS.find(v=>v>=need)); else if(G.deal && !G.contract) gAct('contract'); else if(G.orderOk && !G.exec) gAct('exec'); else gAct('visit'); }
    out.grade=G.over&&G.over.grade; return out; }, id);
  console.log(w,id,JSON.stringify(r)); if(!r.normal||!r.angry||!r.worried||!r.shown||!r.loaded||!r.grade) errs.push(w+' '+id);
  if(w===390) await p.screenshot({path:`t_newocc_${id}.png`});
}
const chat=await p.evaluate(()=>{ sampleFn=async()=>({text:""}); arenaTab='chat'; CH.pid=null; renderArena(); return ['p_hawaii','p_live','p_tojuk','p_chain','p_gamer'].map(id=>{const c=document.querySelector(`.ag-card[data-chatwith="${id}"]`); return c? c.querySelector('.ag-diff').textContent : null;}); });
console.log(w,'chat',JSON.stringify(chat)); if(chat.some(x=>!x)) errs.push('chat '+w);
}
console.log('errors',errs); await b.close();})();
