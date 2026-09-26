/* ================= 🏢 팔 때 만나는 사람들 — 중개사 6명 · 매수인 5명 추가 · 인천/부천 '컨설팅비' =================
   예전엔 중개사가 김사장 한 명, 매수인이 10유형뿐이었다. 현실에서 부딪히는 사람들을 더 넣는다.
   ⚠️ 본편 난수(K.r) 순서는 건드리지 않는다 — 여기서 쓰는 운은 전부 따로 떼어 낸 난수(sfR)다.
      그래서 기존 매수자 선택·금액 계산은 그대로 두고, "그 주의 결과"에 중개사 성격을 덧씌우는 방식이다.
   ⚠️ 모두 가상의 인물이다. 특정 지역 중개사 전체가 그렇다는 뜻이 아니다(화면에도 "일부"라고 밝힌다). */
const SF_ON = true;
function sfR(){ K.sfN = (K.sfN || 0) + 1; return kRng(((K.seed || 1) * 2654435761 ^ 0x5A1E ^ K.sfN * 40503) >>> 0); }
function sfFace(key, ex){ return typeof artUrl === "function" ? (artUrl(key + "_" + ex) || artUrl(key + "_normal") || artUrl(key + "_angry")) : null; }

/* ---------- 중개사 6명 ---------- */
const SF_BROKERS = [
  {id:"kim", name:"김사장", tag:"친절한 60대", face:"npc_kim", ex:"normal", eff:{p:0, amt:0},
   blurb:"30년 이 동네에서 중개한 할아버지 사장님. 말투가 느긋하고 숫자는 정확하다.",
   week:["\"천천히 해요. 이 가격이면 임자 나타나요.\"", "\"어제 한 팀 보여 줬어요. 반응 괜찮았어요.\""]},
  {id:"cut", name:"최실장", tag:"'경매면 잘 안 나가요' 후려치기", face:"npc_brokerA", ex:"normal", eff:{p:0.05, amt:-0.02},
   blurb:"경매 물건이라는 말만 나오면 값부터 깎자고 한다. 대신 싸게 내놓으면 빨리 돌리긴 한다.",
   choice:{key:"line", yes:"🙅 '실거래 기준으로 받겠다'고 선 긋기", yesNote:"깎자는 말은 줄지만, 이 사람이 덜 열심히 돌린다", yesEff:{p:-0.02, amt:0}},
   week:["\"사장님, 경매 물건이라 하면 다들 한 번 더 깎자고 해요. 2천만 빼시죠?\"", "\"요즘 빌라 안 나가요. 경매 거면 더더욱.\""],
   tale:[["","아, 경매로 받으신 거예요? 음… 경매 물건이라 하면 사람들이 좀 꺼려요.","normal"],
     ["","솔직히 말씀드리면 시세에서 한 2천은 빼야 나가요. 경매 거는 원래 그래요.","angry"],
     ["나","등기부 보면 경매 전 권리는 다 말소됐는데요. 일반 매물이랑 뭐가 다른데요?","normal"],
     ["","…뭐, 서류야 깨끗하겠죠. 그래도 사람들 인식이 그래요. 빨리 팔고 싶으시면 제 말대로 하세요.","normal"],
     [null,"💡 매각으로 말소될 권리가 정리됐다면 서류상으로는 일반 매물과 같다. '경매라서'가 아니라 실거래로 값을 따져야 한다.","normal"]]},
  {id:"doc", name:"박 중개사", tag:"'등기부 문제 있는 거 아니에요?' 경계형", face:"npc_parkbk", ex:"worried", eff:{p:-0.08, amt:0},
   blurb:"경매 물건이면 뭔가 걸려 있을 거라 의심한다. 서류로 안심시키면 오히려 제일 꼼꼼히 설명해 준다.",
   choice:{key:"doc", yes:"📄 말소된 등기부등본 떼서 보여 주기", yesNote:"하루 걸린다 — 의심이 풀리면 손님에게도 자신 있게 설명해 준다", yesEff:{p:0.02, amt:0}, day:1},
   week:["\"손님이 '경매 거면 뭐 남은 거 없냐'고 물어서요… 서류 있으세요?\"", "\"깨끗하다고는 하는데, 저도 확인을 해야 권하죠.\""],
   docWeek:["\"등기부 보여 드렸더니 손님이 안심하더라고요.\"", "\"서류 깔끔하니까 저도 편하게 권해요.\""],
   tale:[["","경매로 낙찰받으신 거죠? 혹시… 등기부에 뭐 남아 있는 건 없어요?","worried"],
     ["","예전에 경매 물건 소개했다가 유치권 얘기 나와서 곤란했던 적이 있어서요.","worried"],
     ["","말소된 등기부랑 잔금 영수증 같은 거 보여 주시면, 저도 손님한테 자신 있게 설명할 수 있어요.","normal"],
     [null,"💡 매수자와 중개사가 경매 물건을 경계하는 건 흔한 일이다. 말소가 끝난 최신 등기부를 먼저 보여 주면 대화가 빨라진다.","normal"]]},
  {id:"blunt", name:"오사장", tag:"무뚝뚝", face:"npc_brokerC", ex:"normal", eff:{p:-0.03, amt:0.005},
   blurb:"말이 거의 없다. 광고도 크게 안 한다. 대신 괜히 값 깎자고 흔들지도 않는다.",
   week:["\"…없어요.\"", "\"한 팀 봤어요. 생각해 본대요.\"", "\"기다려요.\""],
   tale:[["","…물건 봤어요.","normal"],["","그 가격이면 돼요. 더 받으려면 기다려야 하고.","normal"],["","연락할게요.","normal"],
     [null,"💡 말이 적다고 일을 안 하는 건 아니다. 다만 광고를 많이 안 하는 사무소는 문의 자체가 적을 수 있다.","normal"]]},
  {id:"chat", name:"윤여사", tag:"'나도 경매 해 봐서 알아' 수다형", face:"npc_brokerB", ex:"normal", eff:{p:0.05, amt:-0.008},
   blurb:"동네 사람을 다 안다. 손님은 금방 데려오는데, 낙찰가까지 동네방네 말해 버려서 매수자가 그걸 알고 깎는다.",
   week:["\"어머 사장님, 오늘 두 팀 왔다 갔잖아~ 내가 다 말해 놨어.\"", "\"낙찰가? 아유 그거 다들 알아~ 내가 얘기했거든 호호.\""],
   tale:[["","어머어머, 경매로 받았어요? 나도 예전에 경매 몇 번 해 봤잖아~ 그거 명도가 제일 힘들지?","normal"],
     ["","내가 이 동네 반장 노릇을 20년 했어. 사람들 다 알아. 손님은 걱정 마, 내가 데려올게.","normal"],
     ["","근데 얼마에 받았어? 아유 말해 봐~ 그래야 내가 손님한테 얘기를 하지.","normal"],
     [null,"💡 낙찰가는 대법원 경매 정보로 누구나 볼 수 있지만, 중개사가 먼저 떠들고 다니면 매수자가 그걸 기준으로 깎으려 든다.","worried"]]},
  {id:"excl", name:"허실장", tag:"'나한테만 내놔요' 전속 요구형", face:"npc_broker", ex:"angry", eff:{p:0, amt:0},
   blurb:"처음부터 '여기저기 내놓지 말고 나한테만 달라'고 목소리를 높인다.",
   choice:{key:"excl", yes:"🤝 이 사무소에만 맡기기(전속)", yesNote:"한 곳만 광고해서 문의는 줄지만, 이 사람이 값을 지켜 준다", yesEff:{p:-0.05, amt:0.005},
           no:"🏢 여러 사무소에 같이 내놓기", noNote:"문의는 늘지만 허실장은 시큰둥해진다", noEff:{p:0.03, amt:0}},
   week:["\"다른 데 내놨어요? 그럼 저는 손 뗍니다.\"", "\"제가 알아서 해요. 여기저기 전화 돌리지 마세요.\""],
   exclWeek:["\"믿고 맡기셨으니까 제대로 해 볼게요.\"", "\"값 깎자는 손님은 제 선에서 정리했어요.\""],
   tale:[["","사장님, 이 물건 저한테만 주세요. 여기저기 내놓으면 값만 떨어져요.","angry"],
     ["","어차피 요즘은 다 공동중개로 돌아요. 제가 올리면 다른 사무소도 다 봐요. 그러니까 여러 군데 내놓을 필요가 없다니까요?","angry"],
     ["나","그래도 한 곳만 맡기면 문의가 적지 않을까요?","normal"],
     ["","아니 제 말 좀 들어 보시라니까요!","angry"],
     [null,"💡 전속중개계약은 정해진 서식으로 맺고, 중개사는 매물 정보 공개와 진행 상황 보고 의무를 진다(자세한 기준은 공인중개사법). 한 곳에 맡길지 여러 곳에 내놓을지는 매도인이 정한다.","normal"]]}];
function sfBroker(){
  if(!K) return SF_BROKERS[0];
  if(!K.sfBk){ const r = kRng(((K.seed || 1) ^ 0xB20C5) >>> 0); r(); K.sfBk = KP.gen ? SF_BROKERS[Math.floor(r() * SF_BROKERS.length)].id : "kim"; }
  return SF_BROKERS.find(b => b.id === K.sfBk) || SF_BROKERS[0];
}
function sfBkFace(b, ex){ return sfFace(b.face, ex || b.ex); }

/* ---------- 인천·부천 '컨설팅비' ---------- */
function sfCartelArea(){
  if(!KP || !KP.gen) return null;
  const a = KP.addr || "", c = KP.court || "";
  if(/부천/.test(a)) return "부천";
  if(/^\s*인천/.test(a) || /^인천지방법원$/.test(c.trim())) return "인천";
  return null;
}
const SF_CARTEL_NOTE = "공인중개사법상 중개보수는 법정 한도 안에서만 받을 수 있고, '컨설팅비' 같은 다른 명목으로 그 이상을 받는 것은 금지행위다. 이런 요구를 받으면 관할 시·군·구청 부동산 담당 부서에 문의할 수 있다. 일부 사무소 이야기일 뿐, 그 지역 중개사 전부가 그런 건 아니다.";
function sfCartelHTML(){
  const area = sfCartelArea(); if(!area) return "";
  if(K.sfCart) return `<div class="panel sf-cart done"><b>💸 ${area} 일부 사무소의 '컨설팅비 500만원'</b> — ${K.sfCart === "pay" ? "현금으로 줬다. 그 사무소들이 매물을 적극적으로 돌린다. (결과 정산에 500만원이 붙는다)" : "거절했다. 처음 몇 주는 그 사무소들이 매물을 잘 안 보여 준다."}</div>`;
  return `<div class="panel sf-cart"><div class="sf-cart-h">💸 "여기는 컨설팅비 500 먼저 주셔야 팔아 드려요"</div>
    <p>${area} 몇몇 사무소가 입을 맞춘 듯 똑같이 말한다. <b>현금 500만원</b>을 먼저 주면 적극적으로 팔아 주고, 안 주면 매물을 "잘 안 보여 준다"는 것이다.</p>
    <div class="ag-acts vn-acts sf-acts"><button type="button" class="ag-act" data-sfcart="pay"><span><b>💵 500만원 현금으로 준다</b><span class="note" style="display:block">문의가 늘고 값도 조금 더 받지만, 결과에서 500만원이 빠진다</span></span></button>
    <button type="button" class="ag-act" data-sfcart="no"><span><b>🙅 안 준다</b><span class="note" style="display:block">처음 3주는 문의가 확 준다 — 그 뒤엔 다른 사무소·직접 광고로 풀린다</span></span></button></div>
    <p class="sf-law">⚖️ ${esc(SF_CARTEL_NOTE)}</p></div>`;
}

/* ---------- 그 주의 효과 = 중개사 성격 + 선택 + 컨설팅비 ---------- */
function sfEffect(){
  const b = sfBroker(); let p = b.eff.p, amt = b.eff.amt;
  const c = b.choice, pick = c && K["sf_" + c.key];
  if(c && pick === "yes"){ p = c.yesEff.p; amt = c.yesEff.amt; }
  else if(c && pick === "no" && c.noEff){ p = c.noEff.p; amt = c.noEff.amt; }
  if(K.sfCart === "pay"){ p += 0.08; amt += 0.01; }
  else if(K.sfCart === "no" && K.sale && K.sale.weeks <= 3){ p -= 0.15; }
  return {p, amt};
}
function sfAdjust(){
  const S = K && K.sale; if(!SF_ON || !S || S.done || K.k2 || !KP.gen) return;
  if(S.sfW === S.weeks) return; S.sfW = S.weeks;
  const r = sfR(), e = sfEffect(), of = S.offer;
  if(of && of.script) return;
  if(of){
    if(e.p < 0 && r() < Math.min(0.9, -e.p / 0.45)){ S.offer = null; S.sfMiss = true; return; }
    if(r() < 0.33){ const b = SF_BUYERS[Math.floor(r() * SF_BUYERS.length)]; of.buyer = {t:b.t, flex:b.flex, cancel:b.cancel}; of.amt = Math.min(S.list, Math.round(S.trueP * (1 - b.flex - r() * 0.01) / 10) * 10); delete of.terms; }
    if(e.amt) of.amt = Math.min(S.list, Math.round(of.amt * (1 + e.amt) / 10) * 10);
  } else if(e.p > 0 && r() < Math.min(0.9, e.p / 0.55)){
    const pool = K_BUYERS.concat(SF_BUYERS), b = pool[Math.floor(r() * pool.length)];
    S.offer = {amt:Math.min(S.list, Math.round(S.trueP * (1 - b.flex - r() * 0.01 + e.amt) / 10) * 10), buyer:{t:b.t, flex:b.flex, cancel:b.cancel}, sf:true};
  }
}
const _sf_kList = kList; kList = function(price){
  if(KP.gen && sfCartelArea() && !K.sfCart){ K.sfCart = "no"; kLog("💸 컨설팅비 500만원 요구를 거절했다."); }
  const r = _sf_kList.apply(this, arguments); sfAdjust(); return r;
};
const _sf_kWeek = kWeek; kWeek = function(){ const r = _sf_kWeek.apply(this, arguments); sfAdjust(); return r; };
// 결과 정산 — 컨설팅비를 냈다면 매도 비용에 붙는다
const _sf_kFinish = kFinish; kFinish = function(){
  if(K && K.sfCart === "pay" && !K.sfCartPaid){ K.sfCartPaid = true; K.cost.broker += 500; }
  return _sf_kFinish.apply(this, arguments);
};

/* ---------- 매수인 5명 추가 (그림 없음 — 글로만 등장) ---------- */
const SF_FLAKE = "'살게요' 해 놓고 미루는 사람";
const SF_BUYERS = [
  {t:"까다로운 네일숍 사장님", flex:0.022, cancel:0.1,
   say:["\"여기 줄눈 누렇네요? 조명도 너무 어둡고. 이거 다 바꿔 주시는 거죠?\"", "손톱으로 싱크대 모서리를 톡톡 두드리며 방마다 사진을 찍었다."],
   st:{w:4, cond:{kind:"repair", t:"도배·조명·욕실 줄눈 전부 새로 해 달라는 요구", cost:[150, 260]}, give:"repair", hint:"요구는 많아도 '공사 대신 가격'이면 결국 받아들인대요"},
   tale:[["","제가 가게를 하니까 알잖아요, 디테일이 제일 중요해요. 여기 실리콘 봐요, 곰팡이 폈네.","angry"],
     ["","조명도 전부 바꿔 주시고요, 도배도 제가 고른 걸로 다시 해 주세요. 그 정도는 해 주셔야죠.","angry"],
     ["","…솔직히 위치는 딱이에요. 가게랑 가깝고. 공사 대신 그만큼 빼 주시면 생각해 볼게요.","normal"]]},
  {t:SF_FLAKE, flex:0.006, cancel:0.45,
   say:["\"네네, 저 여기로 할게요! 가계약금은… 내일 보낼게요.\"", "밝게 웃었지만, 가계약금 얘기에서만 말끝을 흐렸다."],
   st:{w:5, cond:{kind:"parent", t:"'가족이랑 한 번만 더 얘기해 보고요' — 확답이 없다"}, give:null, hint:"가계약금부터 받아 두면 그나마 덜 흔들린대요"},
   tale:[["","아 너무 좋아요, 여기로 할게요! 진짜로요.","normal"],
     ["","다만 남편이랑 한 번만 더 얘기해 보고… 아 시어머니도 한 번 보셔야 하고요.","worried"],
     ["","가계약금은 내일 꼭 보낼게요. 아니 모레요. 이번 주 안에는 꼭이요!","worried"]]},
  {t:"소심한 첫 집 매수자", flex:0.003, cancel:0.15,
   say:["\"저… 혹시 여기 물 잘 나와요? 아, 죄송해요, 이상한 거 물어서…\"", "수도꼭지를 틀어 보고는 한참 망설이다 조용히 잠갔다."],
   st:{w:5, give:"speed", hint:"값은 거의 안 깎는 대신 결정이 느리대요 — 날짜를 먼저 정해 주면 따라온대요"},
   tale:[["","저, 집을 처음 사 봐서요… 뭘 물어봐야 하는지도 잘 모르겠어요.","worried"],
     ["","가격은… 괜찮은 것 같아요. 깎는 것도 잘 못 해서요. 그냥 이대로면 돼요.","worried"],
     ["","근데 조금만 더 생각해 봐도 될까요? 날짜를 정해 주시면 그때까지 꼭 답드릴게요.","normal"]]},
  {t:"현금 부자 할아버지", flex:0.035, cancel:0.02,
   say:["\"현금으로 할 테니 딱 잘라서 얼마 빼 줄 거여?\"", "지팡이로 바닥을 두 번 치고는 창문부터 열어 봤다."],
   st:{w:2, give:"price", hint:"현금이라 잔금은 언제든 된대요 — 대신 값은 끝까지 깎는대요"},
   tale:[["","대출? 그런 거 안 혀. 통장에 다 있어. 오늘 계약하면 오늘 줘.","normal"],
     ["","근디 현금으로 사는 사람한테는 그만큼 빼 주는 게 도리여. 은행 이자도 안 들잖여.","angry"],
     ["","자네가 얼마 뺄지 말해 봐. 맞으면 지금 바로 도장 찍어.","normal"]]},
  {t:"갭투자자", flex:0.015, cancel:0.12,
   say:["\"전세 얼마까지 맞출 수 있어요? 그게 제일 중요해서요.\"", "집 구경보다 휴대폰으로 인근 전세 시세를 먼저 뒤졌다."],
   st:{w:6, cond:{kind:"docs", t:"전세 세입자가 구해지면 그 보증금으로 잔금"}, give:"price", hint:"세입자 맞추는 기간만 주면 가격은 조금 더 낸대요"},
   tale:[["","저는 실거주가 아니라서요. 전세 세입자 맞추고 그 보증금으로 잔금 치를 거예요.","normal"],
     ["","그래서 잔금일은 좀 넉넉히 주셔야 해요. 세입자가 구해져야 하니까요.","normal"],
     ["","대신 날짜만 주시면 가격은 조금 더 드릴 수 있어요.","normal"]]}];
SF_BUYERS.forEach(b => {
  if(typeof DP_BUYER_SAY !== "undefined") DP_BUYER_SAY[b.t] = b.say;
  if(typeof KF_BUYER_TALE !== "undefined") KF_BUYER_TALE[b.t] = b.tale;
  if(typeof ST_TYPES !== "undefined") ST_TYPES[b.t] = b.st;
});
// '살게요' 하고 미루던 사람은 대출 핑계가 아니라 말을 바꾼다
const _sf_kClose = kClose; kClose = function(amt, buyer){
  const r = _sf_kClose.apply(this, arguments), S = K && K.sale;
  if(S && !S.done && buyer && buyer.t === SF_FLAKE && S.note) S.note = S.note.replace(/"대출이 덜 나와서요…"/, "\"…저희 그냥 다른 집 하기로 했어요. 죄송해요.\" 2주를 끌다가 말을 바꿨다 —");
  return r;
};

/* ---------- 화면 ---------- */
function sfBrokerCardHTML(){
  const b = sfBroker(), c = b.choice, pick = c && K["sf_" + c.key], img = sfBkFace(b);
  let acts = "";
  if(c && !pick){
    acts = `<div class="ag-acts vn-acts sf-acts"><button type="button" class="ag-act" data-sfpick="yes"><span><b>${c.yes}</b><span class="note" style="display:block">${esc(c.yesNote)}</span></span></button>${c.no ? `<button type="button" class="ag-act" data-sfpick="no"><span><b>${c.no}</b><span class="note" style="display:block">${esc(c.noNote)}</span></span></button>` : ""}</div>`;
  } else if(c && pick) acts = `<div class="note sf-picked">✔ ${pick === "yes" ? esc(c.yes.replace(/^\S+\s/, "")) : esc((c.no || "").replace(/^\S+\s/, ""))}</div>`;
  const talk = !K.brokerHeard && b.id !== "kim" ? `<button type="button" class="btn kf-talk" data-sftalk="1">🗣️ ${esc(b.name)} 얘기 들어 보기</button>` : "";
  return `<div class="panel sf-bk"><div class="sf-bk-row">${img ? `<img class="sf-bk-img" src="${img}" alt="${esc(b.name)}">` : ""}<div><div class="sf-bk-h">🏢 이번에 맡을 중개사 · <b>${esc(b.name)}</b> <span class="sf-tag">${esc(b.tag)}</span></div><div class="sf-bk-t">${esc(b.blurb)}</div></div></div>${acts}${talk}</div>`;
}
function sfWeekLine(){
  const S = K.sale, b = sfBroker(), c = b.choice, pick = c && K["sf_" + c.key];
  const pool = (b.id === "doc" && pick === "yes" && b.docWeek) || (b.id === "excl" && pick === "yes" && b.exclWeek) || b.week;
  const line = pool[(S.weeks + (K.seed || 0)) % pool.length];
  const miss = S.sfMiss && !S.offer ? ` <small class="sf-miss">— 보여 줄 만한 손님이 있었는데 이번 주엔 연결이 안 됐다.</small>` : "";
  const cart = K.sfCart === "no" && S.weeks <= 3 ? `<div class="sf-miss">💸 컨설팅비를 안 줘서 몇몇 사무소가 매물을 잘 안 보여 준다 (${S.weeks}/3주)</div>` : "";
  return `<div class="panel sf-week">${sfBkFace(b) ? `<img class="sf-bk-mini" src="${sfBkFace(b)}" alt="">` : ""}<div><b>${esc(b.name)}</b> ${esc(line)}${miss}${cart}</div></div>`;
}
const _sf_kingHTML = kingHTML; kingHTML = function(){
  let h = _sf_kingHTML.apply(this, arguments);
  if(!SF_ON || !K || !KP || !KP.gen || K.k2) return h;
  if(K.step === "list"){
    if(sfBroker().id !== "kim") h = h.replace(/<button type="button" class="btn kf-talk" data-kftalk="broker">[^<]*<\/button>/, "");
    h = h.replace('<h3 class="vn-q">호가를 정하세요</h3>', sfCartelHTML() + sfBrokerCardHTML() + '<h3 class="vn-q">호가를 정하세요</h3>');
  }
  if(K.step === "sell" && K.sale && !K.sale.done){
    const key = '<div class="panel k-card"><div class="k-grid"><span>현재 호가</span>', i = h.indexOf(key);
    if(i >= 0) h = h.slice(0, i) + sfWeekLine() + h.slice(i);
  }
  // 매물을 맡은 사람이 김사장이 아니면, 늘 조언해 주던 김사장은 '단골'로 따로 표시한다(두 사람이 섞여 보이지 않게)
  if(sfBroker().id !== "kim") h = h.replace("<b>📞 동네 중개사 김사장</b>", "<b>📞 단골 김사장 <small>(매물은 안 맡았지만 조언은 해 줌)</small></b>");
  if(K.step === "result" && K.sfCartPaid) h = h.replace("<span>매도 중개수수료</span>", "<span>매도 중개수수료 + 컨설팅비 500</span>");
  return h;
};
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("[data-sfcart],[data-sfpick],[data-sftalk]"); if(!t || !K) return;
  e.preventDefault(); e.stopPropagation();
  const b = sfBroker();
  if(t.dataset.sfcart){ K.sfCart = t.dataset.sfcart; kLog(K.sfCart === "pay" ? "💸 컨설팅비 500만원을 현금으로 줬다." : "💸 컨설팅비 500만원 요구를 거절했다."); }
  else if(t.dataset.sfpick){ const c = b.choice; K["sf_" + c.key] = t.dataset.sfpick; if(t.dataset.sfpick === "yes" && c.day) kDay(c.day); kLog(`🏢 ${b.name}: ${t.dataset.sfpick === "yes" ? c.yes : c.no}`); }
  else if(t.dataset.sftalk){
    K.brokerHeard = true;
    const lines = b.id === "kim" ? KF_BROKER_TALE() : b.tale;
    kLog(`🗣️ ${b.name} 얘기를 들었다.`);
    if(typeof mtPlay === "function"){ mtPlay(lines, {name:"중개사 " + b.name, face:ex => sfBkFace(b, ex), title:"🗣️ 중개사 얘기 듣는 중", done:() => renderArena()}); return; }
  }
  if(typeof save === "function") save(); renderArena();
}, true);
// v216 그림 도착 — 새 매수인 3명(네일숍 사장님·미루는 사람·소심한 첫 집) 얼굴. 나머지 둘(현금 부자·갭투자자)은 아직 글로만.
if(typeof BY_ART !== "undefined") Object.assign(BY_ART, {
  "까다로운 네일숍 사장님":{art:{normal:"387b40ea240845918ca4d46a9c2dcfe8", angry:"f6f91f2a0c4dd4f1d2921b74b4f3e92e", worried:"70227dd6d91b26c89f0063abc8cb0636"}, ex:"normal"},
  [SF_FLAKE]:{art:{normal:"e1d4655f0c522f3e5a111a7a985d111a", angry:"1cd3f9924e5730f1a0bb390b0ba2bf7d", worried:"4230448fd1cd7c882b39545b74986e2f"}, ex:"normal"},
  "소심한 첫 집 매수자":{art:{normal:"cb36e38662d8ce64cd1c9f82e9ea6686", angry:"92dc2f1ce9d14ca3299d577b23268010", worried:"fede1d938c3d430741fa3630c3279f31"}, ex:"normal"}});
