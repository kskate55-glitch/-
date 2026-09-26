// 외전 대본 검수 — node il_check.js [ID...]
// 기본 경로(각 결과 갈래 profit/loss/nodeal × 선택지 첫 번째)의 글자 수·노드 수, 파서 오류, 금지어, 미치환 변수를 센다.
const fs = require("fs"), vm = require("vm");
const ctx = {console, window:{}, document:{addEventListener(){}}, localStorage:{getItem(){return null}, setItem(){}}, KA_TRACKS:{op_seoyun:{bpm:100}, op_dohyun:{bpm:100}, op_mijeong:{bpm:100}, op_jaehoon:{bpm:100}, op_eunkyung:{bpm:100}, op_taesik:{bpm:100}}, KA_NAME:{}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/interlude.js", "utf8"), ctx);
const files = fs.readdirSync(__dirname).filter(f => /^il_[A-Z]\d\d\.js$/.test(f)).sort();
files.forEach(f => vm.runInContext(fs.readFileSync(__dirname + "/" + f, "utf8"), ctx));
const BAN = ["평공","텐엑스","쌤","강사","카페","아카데미","수강생","세연","모닝콜","두꺼비","유튜브","http","010-","부경꾼","경장인","로빈","이시훈","박진규","행꿈사","열린","푸디","회계사님","TODO"];
const want = process.argv.slice(2);
let bad = 0; const rows = [];
vm.runInContext("this.__IL = IL; this.__ORDER = IL_ORDER;", ctx);
for(const id of ctx.__ORDER){
  if(want.length && !want.includes(id)) continue;
  const d = ctx.__IL[id];
  const errs = d.errs.slice();
  const walk = (outcome, pickIdx) => {
    let pc = 0, chars = 0, nodes = 0, sheets = 0, guard = 0; const seenScenes = [];
    while(guard++ < 20000){
      const n = d.prog[pc]; if(!n || n.k === "end") break;
      if(n.k === "scene"){ seenScenes.push(n.id); pc++; continue; }
      if(n.k === "cond"){ const b = n.br.find(x => x.c === "else" || x.c === outcome || (x.c === "deal" && outcome !== "nodeal") || (d.condDefault && d.condDefault[x.c])); pc = b ? b.to : n.end; continue; }
      if(n.k === "jump"){ pc = n.to; continue; }
      if(n.k === "choice"){ const o = n.opts[Math.min(pickIdx, n.opts.length - 1)]; pc = o.to; continue; }
      if(n.k === "sheet"){ sheets++; pc++; continue; }
      if(n.k === "line"){ chars += n.t.length; nodes++; pc++; continue; }
      pc++;
    }
    return {chars, nodes, sheets, scenes:seenScenes.length};
  };
  const res = ["profit","loss","nodeal"].map(o => walk(o, 0)), alt = walk("profit", 1);
  const all = d.prog.filter(n => n.k === "line").map(n => n.t).join("\n") + JSON.stringify(d.notes || []) + JSON.stringify(d.sheets ? Object.values(d.sheets).map(s => ({t:s.title, p:s.prompt, i:s.items, f:s.fields, doc:s.doc, foot:s.foot})) : []) + (d.title || "") + (d.sub || "");
  BAN.forEach(w => { if(all.includes(w)) errs.push("금지어: " + w); });
  const vars = (all.match(/\{\{\w+\}\}/g) || []).filter(v => !["{{profit}}","{{caseName}}"].includes(v) && !(d.vars || []).includes(v.slice(2, -2)));
  if(vars.length) errs.push("모르는 변수: " + [...new Set(vars)].join(","));
  const min = Math.min(...res.map(r => r.chars));
  if(!d.noLen && min < 5000) errs.push(`기본 경로 글자 수 부족: ${min}`);
  if(d.scenes.length < 6 && !d.noLen) errs.push(`장면 ${d.scenes.length}개(6개 이상)`);
  rows.push([id, d.title, d.scenes.length, res.map(r => r.chars).join("/"), res.map(r => r.nodes).join("/"), alt.chars, res[0].sheets, (d.notes || []).length]);
  if(errs.length){ bad++; console.log(`❌ ${id}`); errs.forEach(e => console.log("   " + e)); }
}
console.log("ID | 제목 | 장면 | 글자(흑자/적자/미거래) | 노드 | 다른선택 경로 글자 | 실무조작 | 노트");
rows.forEach(r => console.log(r.join(" | ")));
console.log(bad ? `FAIL ${bad}` : "ALL OK");
process.exit(bad ? 1 : 0);
