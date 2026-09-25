const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];const ok=(c,m)=>{console.log((c?'✅':'❌')+' '+m);if(!c)errs.push(m);};
const p=await b.newPage({viewport:{width:1280,height:900}}); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/rights-study.html#arena'); await p.waitForTimeout(900);
const r=await p.evaluate(()=>({
  price:[nmPrice("1억 7천은 무조건 되쥬. 요즘 투룸 없어서 난리여유."), nmPrice("1억 7천은 무조건 됩니다.")],
  grandpa:personaById('p_grandpa').opener, tojuk:personaById('p_tojuk').opener, chain:personaById('p_chain').opener, kim:personaById('b_old').opener,
  styleHas:['p_grandpa','p_tojuk','p_chain','b_old'].map(id=>/사투리/.test(personaById(id).style)),
  teacher:DP_BUYER_SAY["은퇴한 선생님"][0], jaehoon:LF_VOICE.jaehoon.tic }));
console.log(JSON.stringify(r,null,1));
ok(r.price[0]===r.price[1] && r.price[0]>0, '사투리 대사도 가격 인식 같음 '+r.price);
ok(r.styleHas.every(Boolean), 'AI 채팅 말투 설정에 사투리 명시');
ok(/아이가/.test(r.jaehoon) && /니께/.test(r.teacher) && /랑께/.test(r.tojuk) && /마소/.test(r.chain) && /유/.test(r.kim) && /우짜라꼬/.test(r.grandpa), '6명 대사 반영');
console.log('errors',errs); await b.close();})();
