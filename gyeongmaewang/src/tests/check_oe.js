// 사용: cd src && node tests/check_oe.js oe_seoyun.js   — 오프닝·엔딩 데이터 파일 형식 검사
const fs = require("fs"), path = require("path");
const f = process.argv[2]; if(!f){ console.log("파일 이름을 주세요"); process.exit(2); }
const id = (path.basename(f).match(/^oe_([a-z]+)\.js$/) || [])[1];
const OE_DATA = {};
try{ new Function("OE_DATA", fs.readFileSync(f, "utf8"))(OE_DATA); }catch(e){ console.log("❌ JS 문법 오류: " + e.message); process.exit(1); }
const D = OE_DATA[id]; const errs = [], warn = [];
if(!D){ console.log(`❌ OE_DATA.${id} 가 정의되지 않았어요`); process.exit(1); }
const BG = "bg_alley bg_banjiha bg_base_bulgwang bg_base_hwagok bg_base_mapo bg_base_mokdong bg_base_sillim bg_base_yeongdeungpo bg_bid_room bg_court bg_factory_dorm bg_front_door bg_office_1 bg_office_2 bg_office_3 bg_oneroom bg_realtor bg_rooftop bg_room_after bg_room_clean bg_room_empty bg_room_messy bg_shop_closed bg_stairs bg_villa_day bg_villa_night bg_warehouse cut_dohyun_commute cut_eunkyung_morning cut_jaehoon_site cut_mijeong_shop cut_seoyun_found cut_taesik_morning cut_keys cut_signing".split(" ");
const exOp = (fs.existsSync(`${__dirname}/oe_existing/existing_op_${id}.md`) ? fs.readFileSync(`${__dirname}/oe_existing/existing_op_${id}.md`, "utf8") : "").match(/op_[a-z]+_[0-9_]+/g) || [];
const NEW = [`oe_${id}_op1`, `oe_${id}_op2`, `oe_${id}_op3`, `oe_${id}_end1`];
const BAN = ["평공","텐엑스","쌤","강사","카페","아카데미","수강생","세연","모닝콜","두꺼비","유튜브","http","010-","부경꾼","경장인","로빈","이시훈","박진규","행꿈사","열린","푸디","회계사님","씨발","존나","개새"];
const UI = ["chat","search","note","bank","phone","sheet","pos","login","listing"];
const usedArt = new Set();
function scenes(name, arr, min, max, lmin, lmax, endLast){
  if(!Array.isArray(arr)){ errs.push(`${name}: 배열이 아님`); return 0; }
  if(arr.length < min || arr.length > max) errs.push(`${name}: 장면 ${arr.length}개 (필요 ${min}~${max})`);
  let n = 0;
  arr.forEach((s, i) => {
    const w = `${name}[${i}]`;
    if(!s || typeof s !== "object"){ errs.push(w + " 장면이 객체가 아님"); return; }
    if(!BG.includes(s.bg)) errs.push(`${w}: bg "${s.bg}" 는 목록에 없음`);
    if(s.art){ if(!Array.isArray(s.art) || !s.art.length) errs.push(`${w}: art는 비어 있지 않은 배열`); else s.art.forEach(a => { usedArt.add(a); if(!(a === "@end" || NEW.includes(a) || exOp.includes(a) || BG.includes(a))) errs.push(`${w}: art "${a}" 알 수 없는 키`); }); }
    if(s.beats) Object.entries(s.beats).forEach(([k, v]) => { if(!Array.isArray(v)) errs.push(`${w}: beats.${k} 배열 아님`); else v.forEach(a => { usedArt.add(a); if(!(NEW.includes(a) || exOp.includes(a) || BG.includes(a))) errs.push(`${w}: beat "${a}" 알 수 없는 키`); }); if(!(+k >= 2 && +k <= (s.lines || []).length)) errs.push(`${w}: beats 번호 ${k} 가 대사 범위 밖`); });
    if(s.ui && !UI.includes(s.ui.type)) errs.push(`${w}: ui.type "${s.ui.type}" 모름`);
    if(!Array.isArray(s.lines) || !s.lines.length){ errs.push(`${w}: lines 없음`); return; }
    s.lines.forEach((l, j) => {
      if(!Array.isArray(l) || l.length !== 2 || typeof l[1] !== "string" || !(l[0] === null || typeof l[0] === "string")) errs.push(`${w}.lines[${j}] 형식 오류`);
      else { n++; if(l[1].length > 90) warn.push(`${w}.lines[${j}] ${l[1].length}자(길다)`); }
    });
    if(endLast && i === arr.length - 1 && !(s.art && s.art.length === 1 && s.art[0] === "@end")) errs.push(`${w}: 마지막 장면 art는 ["@end"]`);
  });
  if(n < lmin || n > lmax) errs.push(`${name}: 대사 ${n}줄 (필요 ${lmin}~${lmax})`);
  return n;
}
const nOp = scenes("opening", D.opening, 9, 13, 60, 90);
const E = D.ending || {};
const nCore = scenes("ending.core", E.core, 3, 5, 22, 40);
const nv = {}; ["normal", "good", "bad", "special"].forEach(t => { nv[t] = scenes("ending." + t, E[t], 1, 2, 5, 12, true); });
if(!Array.isArray(D.art) || D.art.length !== 4) errs.push(`art: 정확히 4개 필요 (${(D.art || []).length})`);
else D.art.forEach((a, i) => {
  if(a.id !== NEW[i]) errs.push(`art[${i}].id 는 ${NEW[i]}`);
  ["title", "scene", "prompt", "reuse", "use"].forEach(k => { if(!a[k] || typeof a[k] !== "string") errs.push(`art[${i}].${k} 없음`); });
  if(a.prompt && !/16:9/.test(a.prompt)) errs.push(`art[${i}].prompt 에 16:9 표기 없음`);
  if(a.prompt && a.prompt.length < 250) warn.push(`art[${i}].prompt 가 짧음(${a.prompt.length}자)`);
  if(!usedArt.has(a.id)) errs.push(`art ${a.id} 가 대본 어느 장면에서도 쓰이지 않음`);
});
if(!(E.core || []).some(s => s.art && s.art[0] === `oe_${id}_end1`)) errs.push(`ending.core 의 한 장면 art 첫 후보가 oe_${id}_end1 이어야 함`);
const txt = JSON.stringify(D); BAN.forEach(b => { if(txt.includes(b)) errs.push(`금지어 "${b}"`); });
console.log(`${id}: 오프닝 ${D.opening ? D.opening.length : 0}장면 ${nOp}줄 · 엔딩 core ${nCore}줄 · normal ${nv.normal} good ${nv.good} bad ${nv.bad} special ${nv.special}`);
warn.slice(0, 8).forEach(w => console.log("⚠️ " + w));
if(errs.length){ errs.forEach(e => console.log("❌ " + e)); process.exit(1); }
console.log("✅ 통과");
