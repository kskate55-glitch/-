
/* ============================== 픽셀 캐릭터 (실존 인물 사진 없이 그리는 16×16 아바타) ============================== */
const AV_PRESET = {
 p_cn:[{g:"f", hair:"bun", hc:"#141010", skin:"#f3cfae", brow:"sad", mouth:"flat", top:"#c9587a", bg:"#f3d2cf", glasses:1}],
 p_hwagyo:[{g:"m", age:"old", hair:"short", hc:"#3a3a3a", skin:"#f0c6a0", brow:"flat", mouth:"smile", top:"#b5523b", bg:"#f5e3cc", fat:1},{g:"f", hair:"perm", hc:"#2a2320", skin:"#f0c6a0", brow:"sad", mouth:"flat", top:"#5f8f6e", bg:"#f5e3cc"}],
 p_mn:[{g:"m", hair:"buzz", hc:"#111", skin:"#d9a27a", brow:"flat", mouth:"smile", top:"#3f5c8a", bg:"#dfe3e8", vest:"#e07b24"}],
 p_pk:[{g:"m", hair:"short", hc:"#0e0e0e", skin:"#a86f48", brow:"flat", mouth:"smile", top:"#6b7280", bg:"#dcebe0", beard:1}],
 p_5000:[{g:"m", hair:"short", hc:"#1f1a18", skin:"#e8b98f", brow:"angry", mouth:"flat", top:"#4f7ea8", bg:"#e3e8f2", glasses:1},{g:"f", hair:"long", hc:"#3b2a20", skin:"#f0c6a0", brow:"sad", mouth:"frown", top:"#b5523b", bg:"#e3e8f2"}],
 p_delay:[{g:"m", hair:"short", hc:"#2a2320", skin:"#e8b98f", brow:"sad", mouth:"smile", top:"#6b7280", bg:"#efe6d6"}],
 p_youth:[{g:"m", hair:"short", hc:"#1f1a18", skin:"#f3cfae", brow:"sad", mouth:"flat", top:"#5f8f6e", bg:"#dcebe0"}],
 p_basic:[{g:"m", age:"old", hair:"bald", hc:"#d6d6d6", skin:"#c68b5e", brow:"sad", mouth:"frown", top:"#8a6d3b", bg:"#efe6d6", wrinkle:1, glasses:1}],
 p_mind:[{g:"f", hair:"perm", hc:"#8a8a8a", skin:"#f0c6a0", brow:"sad", mouth:"flat", top:"#7a4b8f", bg:"#e7dcef", wrinkle:1}],
 b_old:[{g:"m", age:"old", hair:"bald", hc:"#bdbdbd", skin:"#e2b48c", brow:"flat", mouth:"smile", top:"#1f3a5f", bg:"#dfe3e8", glasses:1, fat:1}],
 b_mgm:[{g:"m", hair:"short", hc:"#111", skin:"#e8b98f", brow:"flat", mouth:"smile", top:"#222", bg:"#f3d2cf", acc:"phone"}],
 b_young:[{g:"f", hair:"bun", hc:"#2a1d17", skin:"#f3cfae", brow:"flat", mouth:"smile", top:"#4f7ea8", bg:"#e3e8f2", acc:"paper"}],
 i_add:[{g:"m", age:"old", hair:"cap", cap:"#b5523b", hc:"#9a9a9a", skin:"#c68b5e", brow:"flat", mouth:"flat", top:"#6b7280", bg:"#f5e3cc", beard:1}],
 i_cheap:[{g:"m", hair:"short", hc:"#2a2320", skin:"#d9a27a", brow:"flat", mouth:"smile", top:"#e07b24", bg:"#f5e3cc"}],
 k_newlywed:[{g:"m", hair:"short", hc:"#1f1a18", skin:"#f3cfae", brow:"flat", mouth:"smile", top:"#5f8f6e", bg:"#dcebe0"},{g:"f", hair:"long", hc:"#4a2f22", skin:"#f3cfae", brow:"flat", mouth:"smile", top:"#e8a0b8", bg:"#dcebe0"}],
 p_grandpa:[{g:"m", age:"old", hair:"helmet", hc:"#c9c9c9", skin:"#c68b5e", brow:"sad", mouth:"frown", top:"#3f5c8a", vest:"#e07b24", bg:"#e9dcc7", wrinkle:1}],
 p_phishing:[{g:"m", hair:"short", hc:"#2a2320", skin:"#e8b98f", brow:"angry", mouth:"shout", top:"#39424e", headband:1, bg:"#f3d2cf"},
             {g:"f", hair:"long", hc:"#4a2f22", skin:"#f0c6a0", brow:"sad", mouth:"frown", top:"#c9587a", bg:"#f3d2cf"}],
 p_coop:[{g:"f", hair:"bun", hc:"#3b2a20", skin:"#f0c6a0", brow:"sad", mouth:"flat", top:"#5f8f6e", bg:"#dcebe0"}],
 p_ghost:[{g:"m", hair:"short", hat:"bucket", hatc:"#8a7a5a", hc:"#2b2b2b", skin:"#e2b48c", brow:"flat", mouth:"flat", top:"#6b7280", bg:"#dfe3e8", acc:"phone"}],
 p_greedy:[{g:"m", age:"old", hair:"bald", hc:"#9a9a9a", skin:"#e8b98f", brow:"flat", mouth:"smile", shades:1, top:"#1f3a5f", bg:"#e3e8f2", fat:1}],
 p_senior:[{g:"f", hair:"long", hc:"#2a1d17", skin:"#f3cfae", brow:"flat", mouth:"smile", top:"#d8c3a0", bg:"#efe6d6", glasses:1, acc:"paper"}],
 p_fake:[{g:"m", hair:"short", hc:"#1f1a18", skin:"#e8b98f", brow:"flat", mouth:"smile", top:"#7a4b8f", bg:"#e7dcef", acc:"paper"}],
 p_lien:[{g:"m", hair:"helmet", hc:"#2a2320", skin:"#c68b5e", brow:"flat", mouth:"flat", top:"#39424e", vest:"#e07b24", bg:"#f5e3cc", beard:1}],
 p_hug:[{g:"m", hair:"buzz", hc:"#1e1e1e", skin:"#d9a27a", brow:"angry", mouth:"frown", shades:1, top:"#1b1b1b", bg:"#e2d6d6", fat:1, beard:1, tattoo:1, tank:1}]
};
const AV_TYPE = {coop:{brow:"sad",mouth:"flat"}, angry:{brow:"angry",mouth:"shout"}, ghost:{brow:"flat",mouth:"flat",hair:"cap",acc:"phone"}, poor:{brow:"sad",mouth:"frown",age:"old"},
  greedy:{brow:"flat",mouth:"smile"}, bully:{brow:"angry",mouth:"shout"}, fake:{brow:"flat",mouth:"smile",acc:"paper"}, senior:{brow:"flat",mouth:"smile",acc:"paper"},
  lien:{brow:"flat",mouth:"flat",hair:"helmet",beard:1}, short:{brow:"angry",mouth:"frown",fat:1,tattoo:1,tank:1,hair:"buzz"}, shop:{brow:"sad",mouth:"flat"}};
const AV_SKIN = ["#f3cfae","#f0c6a0","#e8b98f","#d9a27a","#c68b5e"], AV_HAIR = ["#1f1a18","#2a2320","#3b2a20","#4a2f22","#6b4a35"];
const AV_TOP = ["#39424e","#5f8f6e","#c9587a","#1f3a5f","#8a6d3b","#7a4b8f","#b5523b","#4f7ea8","#6b7280"], AV_BG = ["#e3e8f2","#dcebe0","#f3d2cf","#efe6d6","#e7dcef","#dfe3e8","#f5e3cc"];
function avHash(s){ let h = 2166136261; for(const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function avSpecFor(P){
  if(AV_PRESET[P.id]) return AV_PRESET[P.id];
  if(P.av) return [P.av];
  const h = avHash(P.id), t = AV_TYPE[P.type] || {};
  const g = /(순자|미숙|정희|경자|혜진|민정|옥자|지연|수진|은희)/.test(P.name) ? "f" : "m";
  const old = +((P.name.match(/\((\d+)\)/)||[])[1]||40) >= 60;
  return [Object.assign({g, hair: g==="f" ? (old ? "perm" : ["long","bun"][h%2]) : ["short","bald","short","buzz"][h%4], hc: old ? "#bdbdbd" : AV_HAIR[h%5], skin: AV_SKIN[(h>>>3)%5],
    top: AV_TOP[(h>>>6)%AV_TOP.length], bg: AV_BG[(h>>>9)%AV_BG.length], age: old?"old":"", glasses: (h>>>12)%5===0, fat: (h>>>14)%3===0, hat: (h>>>16)%6===0 ? "bucket" : "", hatc: AV_BG[(h>>>18)%AV_BG.length]==="#dfe3e8"?"#8a7a5a":"#c9b48a", vest: (h>>>20)%7===0 ? "#e07b24" : ""}, t, old?{hc:"#bdbdbd", wrinkle:1}:{})];
}
function avShade(hex, k){ const n = parseInt(hex.slice(1),16); const f = c => Math.max(0,Math.min(255,Math.round(c*k))); return "#"+[n>>16,(n>>8)&255,n&255].map(f).map(v=>v.toString(16).padStart(2,"0")).join(""); }
function avPixels(a){
  const px = {}; const set = (x,y,c) => { if(x>=0&&x<16&&y>=0&&y<16) px[x+","+y] = c; };
  const row = (y,x0,x1,c) => { for(let x=x0;x<=x1;x++) set(x,y,c); };
  const fat = a.fat ? 1 : 0, sk = a.skin, dark = "#2b2220";
  /* 몸 */
  for(let y=12;y<16;y++) row(y, 3-fat-(y>13?1:0), 12+fat+(y>13?1:0), a.top);
  if(a.tank){ for(let y=12;y<16;y++){ set(3-fat-(y>13?1:0),y,sk); set(4-fat,y,sk); set(12+fat+(y>13?1:0),y,sk); set(11+fat,y,sk); }
    if(a.tattoo){ [[3-fat,13],[4-fat,14],[3-fat,15],[4-fat,12],[12+fat,13],[11+fat,14],[12+fat,15],[11+fat,12]].forEach(([x,y])=>set(x,y,"#2f5d62")); } }
  else if(a.tattoo){ set(6,13,"#2f5d62"); set(9,14,"#2f5d62"); }
  row(11,7,8,avShade(sk,.9));
  /* 머리 */
  row(3,6,9,sk); row(4,5,10,sk); for(let y=5;y<=9;y++) row(y,4-(fat&&y>=7?1:0),11+(fat&&y>=7?1:0),sk); row(10,5-fat,10+fat,sk);
  set(4-(fat?1:0),7,avShade(sk,.93)); set(11+(fat?1:0),7,avShade(sk,.93));
  /* 머리카락 */
  const hc = a.hc;
  if(a.hair==="short"||a.hair==="bun"||a.hair==="long"){ row(2,5,10,hc); row(3,4,11,hc); set(4,4,hc); set(11,4,hc); set(5,4,hc); if(a.hair!=="short") set(10,4,hc); set(4,5,hc); set(11,5,hc); }
  if(a.hair==="bun"){ row(1,7,8,hc); row(0,7,8,hc); }
  if(a.hair==="long"){ for(let y=5;y<=11;y++){ set(3,y,hc); set(12,y,hc); set(4,y,y>7?hc:px["4,"+y]); set(11,y,y>7?hc:px["11,"+y]); } }
  if(a.hair==="buzz"){ row(3,5,10,hc); set(4,4,hc); set(11,4,hc); row(2,6,9,hc); }
  if(a.hair==="bald"){ set(4,5,hc); set(4,6,hc); set(11,5,hc); set(11,6,hc); }
  if(a.hair==="cap"){ row(1,5,10,a.cap||"#3c4452"); row(2,4,11,a.cap||"#3c4452"); row(3,4,11,a.cap||"#3c4452"); row(4,3,9,avShade(a.cap||"#3c4452",.75)); }
  if(a.hair==="helmet"){ row(0,6,9,"#f2c230"); row(1,5,10,"#f2c230"); row(2,4,11,"#f2c230"); row(3,4,11,"#e0ae1f"); row(4,3,12,"#c9961a"); }
  /* 얼굴 */
  const eyeY = 7; set(6,eyeY,dark); set(9,eyeY,dark);
  const b = a.brow;
  if(b==="angry"){ set(5,5,hc==="#bdbdbd"?"#8a8a8a":dark); set(6,6,dark); set(10,5,dark); set(9,6,dark); }
  else if(b==="sad"){ set(5,6,dark); set(6,5,dark); set(10,6,dark); set(9,5,dark); }
  else { set(6,6,avShade(sk,.6)); set(9,6,avShade(sk,.6)); }
  if(a.glasses){ ["5,6","6,6","7,6","5,8","6,8","7,8","5,7","7,7","8,6","9,6","10,6","8,8","9,8","10,8","8,7","10,7"].forEach(k=>{ const [x,y]=k.split(",").map(Number); set(x,y,"#3a3a3a"); }); set(6,7,dark); set(9,7,dark); }
  set(7,8,avShade(sk,.85)); set(8,8,avShade(sk,.85));
  if(a.wrinkle){ set(5,9,avShade(sk,.82)); set(10,9,avShade(sk,.82)); }
  if(a.beard){ row(9,5,10,avShade(hc,1.3)); row(10,5-fat,10+fat,avShade(hc,1.3)); set(4,8,avShade(hc,1.3)); set(11,8,avShade(hc,1.3)); }
  const m = a.mouth, mc = "#7a2f2a";
  if(m==="smile"){ set(6,9,mc); set(9,9,mc); row(10,7,8,mc); }
  else if(m==="frown"){ row(9,7,8,mc); set(6,10,mc); set(9,10,mc); }
  else if(m==="shout"){ row(9,7,8,mc); row(10,7,8,"#4a1714"); set(6,9,mc); set(9,9,mc); }
  else row(9,7,8,mc);
  if(a.hair==="perm"){ row(1,5,10,hc); row(2,4,11,hc); row(3,3,12,hc); set(3,4,hc); set(12,4,hc); set(4,4,hc); set(11,4,hc); set(3,5,hc); set(12,5,hc); set(3,6,hc); set(12,6,hc); [[5,1],[8,1],[10,2],[4,3],[7,2]].forEach(([x,y])=>set(x,y,avShade(hc,.82))); }
  if(a.hat==="bucket"){ const hcol=a.hatc||"#c9b48a"; row(1,5,10,hcol); row(2,4,11,hcol); row(3,4,11,hcol); row(4,2,13,avShade(hcol,.85)); }
  if(a.headband){ row(4,4,11,"#d23b3b"); set(12,5,"#d23b3b"); }
  if(a.shades){ row(7,5,10,"#151515"); row(6,5,7,"#151515"); row(6,8,10,"#151515"); set(4,6,"#151515"); set(11,6,"#151515"); }
  if(a.vest){ for(let y=12;y<16;y++){ set(6,y,a.vest); set(9,y,a.vest); set(5,y,a.vest); set(10,y,a.vest); } set(7,14,"#f2c230"); set(8,14,"#f2c230"); }
  if(a.acc==="paper"){ for(let y=12;y<16;y++) row(y,12,14,"#fafafa"); row(13,12,14,"#9aa4b0"); row(15,12,13,"#9aa4b0"); }
  if(a.acc==="phone"){ for(let y=11;y<15;y++) row(y,12,13,"#222"); set(12,12,"#7fb3d5"); set(13,12,"#7fb3d5"); }
  return px;
}
function avSVG(a){
  const px = avPixels(a); let r = "";
  for(const k in px){ const [x,y] = k.split(","); r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${px[k]}"/>`; }
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><rect width="16" height="16" fill="${a.bg||"#e3e8f2"}"/>${r}</svg>`;
}
const AV_CACHE = {};
function avatarHTML(P, size){
  size = size || 44;
  const pic = S.arena && S.arena.pics && S.arena.pics[P.id];
  if(pic) return `<span class="av" style="width:${size}px;height:${size}px"><img src="${pic}" alt="" width="${size}" height="${size}"></span>`;
  let specs = avSpecFor(P);
  if(typeof houseOf === "function"){
    const g0 = (specs[0]||{}).g || "m";
    const extra = houseOf(P).filter(x=>x.adult).map((x,i)=>{ if(x.av) return x.av;
      const fem = /아내|노모|어머니|동거녀|딸|누나|할머니/.test(x.rel) ? true : /남편|아버지|아들|형님/.test(x.rel) ? false : (/배우자|동거인/.test(x.rel) ? g0==="m" : (avHash(P.id+i)%2===0));
      const base = avSpecFor({id:P.id+"_h"+i, type:"coop", name:(fem?"순자":"만수")+" (40)"})[0];
      return Object.assign(base, {brow:"flat", mouth:"flat"}, x.old?{age:"old", wrinkle:1, hc:"#cfcfcf", hair: fem?"perm":"bald"}:{}); });
    specs = specs.concat(extra).slice(0,3); }
  const key = P.id + "|" + JSON.stringify(specs);
  if(!AV_CACHE[key]) AV_CACHE[key] = specs.map(avPortrait);
  if(AV_CACHE[key].length > 1) return `<span class="av av2" style="width:${Math.round(size*(1+0.6*(AV_CACHE[key].length-1)))}px;height:${size}px">${AV_CACHE[key].map((s,i)=>`<span style="width:${size}px;height:${size}px;left:${i*Math.round(size*.6)}px">${s}</span>`).join("")}</span>`;
  return `<span class="av" style="width:${size}px;height:${size}px">${AV_CACHE[key][0]}</span>`;
}
/* 내 사진 → 24×24 픽셀 캐릭터 (기기 안에서만 변환, 원본은 저장·전송하지 않음) */
function pixelizePhoto(file){
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try{
        const N = 24, c = document.createElement("canvas"); c.width = N; c.height = N;
        const x = c.getContext("2d"); const s = Math.min(img.width, img.height);
        x.imageSmoothingEnabled = true;
        x.drawImage(img, (img.width-s)/2, Math.max(0,(img.height-s)/2 - s*0.08), s, s, 0, 0, N, N);
        const d = x.getImageData(0,0,N,N); const q = v => Math.min(255, Math.round(v/64)*64 + 16);
        for(let i=0;i<d.data.length;i+=4){ d.data[i]=q(d.data[i]); d.data[i+1]=q(d.data[i+1]); d.data[i+2]=q(d.data[i+2]); d.data[i+3]=255; }
        x.putImageData(d,0,0);
        URL.revokeObjectURL(url); ok(c.toDataURL("image/png"));
      }catch(e){ URL.revokeObjectURL(url); no(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error("이미지를 읽지 못했어요")); };
    img.src = url;
  });
}
function avatarEditHTML(P){
  const has = S.arena && S.arena.pics && S.arena.pics[P.id];
  return `<div class="av-edit"><label class="btn av-up">📷 사진으로 픽셀 캐릭터 만들기<input type="file" accept="image/*" data-avup="${P.id}" hidden></label>${has?`<button type="button" class="btn" data-avdel="${P.id}">기본 캐릭터로</button>`:""}
  <p class="note">사진은 이 기기 안에서 24×24 픽셀로 뭉개진 뒤 그 결과만 저장돼요. 원본 사진은 어디에도 올라가지 않아요.</p></div>`;
}
document.addEventListener("change", async e => {
  const inp = e.target.closest("[data-avup]"); if(!inp || !inp.files || !inp.files[0]) return;
  try{ const d = await pixelizePhoto(inp.files[0]); const R = arenaRec(); if(!R.pics) R.pics = {}; R.pics[inp.dataset.avup] = d; save(); renderArena(); }
  catch(err){ safeAlert("사진을 바꾸지 못했어요: " + (err && err.message || "")); }
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-avdel]"); if(!b) return;
  const R = arenaRec(); if(R.pics) delete R.pics[b.dataset.avdel]; save(); renderArena();
});
