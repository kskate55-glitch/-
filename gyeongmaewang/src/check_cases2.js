// usage: node check_cases2.js file.js [idPrefixRange]  — validates deep case schema
const fs=require('fs'); const f=process.argv[2];
const src=fs.readFileSync(f,'utf8').replace(/^const CASES\w* =/m,'var CASES =');
eval(src); const C=CASES;
let bad=0; const e=(id,m)=>{bad++;console.log('✗',id,m)};
const ids=new Set(); const cats={}; const pos=[0,0,0,0];
const BAN=/강사|쌤|카페|http|수강생|평공|텐엑스|010-|타경\d/;
for(const c of C){
 if(ids.has(c.id)) e(c.id,'dup id'); ids.add(c.id); cats[c.cat]=(cats[c.cat]||0)+1;
 for(const k of ['id','cat','lv','title','setup','steps','lesson','trap']) if(c[k]===undefined) e(c.id,'missing '+k);
 if(!["명도","매도·임대","선순위 임차인","상가","지분","부동산 사장님","인테리어","빌라 투자","고난도 명도","외국인 점유자","위기 대응"].includes(c.cat)) e(c.id,'cat '+c.cat);
 if(!c.meters||!c.meters.d||!c.meters.w||!c.meters.m) e(c.id,'meters labels');
 if(!Array.isArray(c.steps)||c.steps.length<5||c.steps.length>7) e(c.id,'steps '+(c.steps||[]).length);
 (c.steps||[]).forEach((s,i)=>{
  if(!s.scene||!s.q||!s.why) e(c.id+'#'+i,'scene/q/why');
  if(s.chat) s.chat.forEach(m=>{ if(!m.who||!m.t||!['문자','전화','대면','서류'].includes(m.ch)) e(c.id+'#'+i,'chat fmt') });
  if(!Array.isArray(s.o)||s.o.length<3||s.o.length>4) e(c.id+'#'+i,'opts');
  const best=(s.o||[]).filter(o=>o.g===2).length; if(best!==1) e(c.id+'#'+i,'best count '+best);
  (s.o||[]).forEach((o,j)=>{ if(![0,1,2].includes(o.g)||!o.t||!o.fb||!o.after) e(c.id+'#'+i,'opt fields '+j);
    if(!o.fx||[o.fx.d,o.fx.w,o.fx.m].some(v=>typeof v!=='number')) e(c.id+'#'+i,'fx '+j);
    if(o.g===2) pos[j]++; });
  if(s.doc && (!s.doc.title||!s.doc.body)) e(c.id+'#'+i,'doc');
 });
 if(!Array.isArray(c.lesson)||c.lesson.length<3) e(c.id,'lesson');
 if(BAN.test(JSON.stringify(c))) e(c.id,'banned text');
}
console.log('cases',C.length,JSON.stringify(cats),'bestpos',pos,'errors',bad);
process.exit(bad?1:0);
