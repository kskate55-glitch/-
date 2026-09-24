/* ===== 케이스 카드 그림을 사례마다 다르게: 장면 + 인물 + 첫 대사 말풍선 + 시간대/날씨 + 스티커 ===== */
const CART_CACHE = {};
function caseLead(c){
  for(const s of c.steps||[]) for(const m of (s.chat||[])) if(m.who!=="나" && m.ch!=="서류" && m.t && !/^\[/.test(m.t)) return m;
  return null;
}
function caseMood(c){
  const h = avHash(c.id+"|mood");
  if(c.cat==="위기 대응") return ["night","rain","night"][h%3];
  if(c.cat==="고난도 명도") return ["rain","sunset","night","day"][h%4];
  return ["day","sunset","day","dawn","night","rain","day"][h%7];
}
const CART_STK = {"위기 대응":"🚨","고난도 명도":"💢","외국인 점유자":"🌐","인테리어":"🛠️","부동산 사장님":"🤝","빌라 투자":"📈","매도·임대":"🏷️","선순위 임차인":"📜","상가":"🏪","지분":"🧩","명도":"🔑"};
function caseArt(c, cls){
  const base = sceneImg(caseKey(c), "");
  if(!base) return "";
  if(!CART_CACHE[c.id]){
    const h = avHash(c.id), lead = caseLead(c), mood = caseMood(c);
    let q = lead ? lead.t.replace(/\s+/g," ").trim() : "";
    if(q.length > 34) q = q.slice(0, 33).replace(/[\s,.·—-]+$/,"") + "…";
    const who = lead ? caseSpeakerAv(c, lead.who) : "";
    const hue = ((h>>>4)%25) - 12;
    const stk = (c.lv>=3 ? "⚡" : "") + (CART_STK[c.cat]||"");
    const over = `<span class="cart-tint" aria-hidden="true"></span>${mood==="rain"?'<span class="cart-rain" aria-hidden="true"></span>':""}${mood==="night"?'<span class="cart-stars" aria-hidden="true"></span>':""}`
      + (who?`<span class="cart-who" aria-hidden="true">${who}</span>`:"")
      + (q?`<span class="cart-bub${(h>>>2)%2?" alt":""}"><span class="cart-q">“${esc(q)}”</span><small>${esc(lead.who.replace(/\s*\(.*\)/,"").slice(0,10))}</small></span>`:"")
      + (stk?`<span class="cart-stk" aria-hidden="true">${stk}</span>`:"");
    CART_CACHE[c.id] = base.replace('class="scene ', `style="--hue:${hue}deg" class="scene cart m-${mood} `).replace(/<\/div>\s*$/, over + "</div>");
  }
  return CART_CACHE[c.id].replace(/class="scene cart m-(\w+) [^"]*"/, (m, md) => `class="scene cart m-${md} ${cls||""}"`);
}
