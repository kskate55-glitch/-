// 사용: cd src && node ../docs/story/gendocs.js ../docs/story   — 대본 데이터(oe_*.js)로 문서·매니페스트 다시 만들기
// 대본 데이터(oe_*.js) → 문서 3종 + 매니페스트
const fs=require('fs'); const OUT=process.argv[2]; const OE_DATA={};
const TAIL='\n\n[공통 조건] 첨부한 캐릭터 원본의 얼굴·머리·체형·옷 특징을 반드시 유지한다(다른 사람처럼 바뀌지 않게). 화풍: 따뜻한 흙빛(갈색·앰버·올리브) 팔레트의 레트로 2D 애니메이션 게임 일러스트, 깔끔한 선화와 부드러운 셀 채색, 영화 같은 부드러운 조명. 16:9 가로, 고해상도로 선명하게(흐림·뭉개짐·노이즈 없이). 게임 UI·자막·말풍선·글자·숫자·로고·실제 브랜드·실존 인물 얼굴 없음. 휴대폰·모니터 화면은 빛만 나고 내용은 보이지 않게. 화면 아래 1/4은 대사창이 올라가므로 얼굴·손·중요한 물건을 두지 않는다.';
const IDS=['seoyun','dohyun','mijeong','jaehoon','eunkyung','taesik'];
const NAME={seoyun:'한서윤',dohyun:'이도현',mijeong:'윤미정',jaehoon:'박재훈',eunkyung:'최은경',taesik:'김태식'};
for(const id of IDS) new Function('OE_DATA',fs.readFileSync(`oe_${id}.js`,'utf8'))(OE_DATA);
const slots=JSON.parse(fs.readFileSync('artslots_data.js','utf8').match(/const ART_SLOTS_V135 = (\[[\s\S]*?\]);/)[1]);
const exDesc=Object.fromEntries(slots.map(s=>[s.id,s.title]));
const cnt=a=>a.reduce((n,s)=>n+s.lines.length,0);
const sceneTxt=(s,i)=>`**장면 ${i+1}** — 그림: ${(s.art||[]).map(a=>'`'+a+'`').join(' → ')||'(기본)'} → 배경 \`${s.bg}\`${s.ui?` · 화면 소품: ${s.ui.type}`:''}${s.beats?` · 중간 그림: ${Object.entries(s.beats).map(([k,v])=>k+'번째 줄 `'+v[0]+'`').join(', ')}`:''}\n\n`+s.lines.map(l=>l[0]?`- **${l[0]}**: ${l[1]}`:`- *${l[1]}*`).join('\n')+'\n';
// 1) 대본
let md=`# 〈경매왕〉 캐릭터 오프닝·엔딩 대본\n\n자동 생성 — 원본 데이터는 \`src/oe_<캐릭터>.js\` (이 문서를 고치지 말고 데이터를 고친 뒤 다시 만든다).\n\n구조: **오프닝 → 사건1 → 사건1 후 실무 외전 → 사건2 → 사건3 → 사건3 후 실무 외전 → 사건4 → 엔딩(에필로그 공통부 + 판정별 마무리 → 기존 엔딩 카드)**\n\n`;
for(const id of IDS){ const D=OE_DATA[id];
  md+=`\n---\n\n## ${NAME[id]} (\`${id}\`)\n\n오프닝 ${D.opening.length}장면 · ${cnt(D.opening)}줄 / 엔딩 공통부 ${cnt(D.ending.core)}줄 · 판정별 ${['normal','good','bad','special'].map(t=>t+' '+cnt(D.ending[t])).join(' · ')}줄\n\n### 오프닝\n\n`+D.opening.map(sceneTxt).join('\n');
  md+=`\n### 엔딩 에필로그 — 공통부\n\n`+D.ending.core.map(sceneTxt).join('\n');
  for(const t of ['normal','good','bad','special']) md+=`\n### 엔딩 — ${t.toUpperCase()} 마무리 (마지막 장면 그림 = 기존 ${t} 엔딩 그림)\n\n`+D.ending[t].map(sceneTxt).join('\n');
}
fs.writeFileSync(OUT+'/OPENINGS_ENDINGS.md',md);
// 2) 자산 구분표
let a=`# 오프닝·엔딩 이미지 자산 목록 — 기존 재활용 / 새로 필요\n\n그림 후보는 **앞에서부터 있는 첫 그림**을 쓴다. 새 슬롯에 그림을 넣기 전에는 뒤의 기존 그림·배경이 대신 나온다(화면이 비지 않는다).\n\n## 새로 필요한 이미지 (캐릭터당 4장, 총 24장)\n\n| 슬롯 id | 용도 | 장면 | 그림 없을 때 대신 쓰는 것 |\n|---|---|---|---|\n`;
for(const id of IDS) for(const x of OE_DATA[id].art) a+=`| \`${x.id}\` | ${x.use==='ending'?'엔딩':'오프닝'} | ${x.title} | ${x.reuse} |\n`;
a+=`\n## 기존 이미지 재활용\n\n| 캐릭터 | 재활용하는 기존 오프닝 그림(op_*) | 재활용하는 배경·컷 | 엔딩 마지막 장면 |\n|---|---|---|---|\n`;
const manifest={generated:new Date().toISOString().slice(0,10), note:'art 후보는 앞에서부터 있는 첫 그림. "@end" = cpEndArt(캐릭터, 판정) 기존 엔딩 그림', characters:{}};
for(const id of IDS){ const D=OE_DATA[id]; const all=[...D.opening,...D.ending.core,...['normal','good','bad','special'].flatMap(t=>D.ending[t])];
  const keys=new Set(); all.forEach(s=>{(s.art||[]).forEach(k=>keys.add(k)); Object.values(s.beats||{}).flat().forEach(k=>keys.add(k)); keys.add(s.bg);});
  const op=[...keys].filter(k=>/^op_/.test(k)).sort(), bg=[...keys].filter(k=>/^(bg_|cut_)/.test(k)).sort();
  a+=`| ${NAME[id]} | ${op.map(k=>'`'+k+'`').join(' ')} | ${bg.map(k=>'`'+k+'`').join(' ')} | 기존 엔딩 그림 4장(normal·good·bad·special) 그대로 |\n`;
  manifest.characters[id]={name:NAME[id], data:`src/oe_${id}.js`, newSlots:D.art.map(x=>({id:x.id,use:x.use,title:x.title,fallback:x.reuse})), reusedOpeningArt:op, reusedBackgrounds:bg, endingArt:'CP_END_ART (기존 4장)',
    opening:D.opening.map((s,i)=>({scene:i+1,art:s.art||[],bg:s.bg,beats:s.beats||null,lines:s.lines.length})),
    ending:{core:D.ending.core.map((s,i)=>({scene:i+1,art:s.art||[],bg:s.bg,lines:s.lines.length})), ...Object.fromEntries(['normal','good','bad','special'].map(t=>[t,D.ending[t].map((s,i)=>({scene:i+1,art:s.art||[],bg:s.bg,lines:s.lines.length}))]))}};
}
a+=`\n## 기존 오프닝 그림 중 이번 대본에서 쓰지 않게 된 것\n\n`; const usedOp=new Set(Object.values(manifest.characters).flatMap(c=>c.reusedOpeningArt));
const unused=slots.filter(s=>/^op_/.test(s.id)&&!usedOp.has(s.id)).map(s=>'- `'+s.id+'` — '+s.title); a+=(unused.length?unused.join('\n'):'- 없음 (기존 오프닝 그림 33장을 모두 재활용)')+'\n\n그림 자체는 지우지 않았다(그림 목록에 그대로 있고 되살릴 수 있다).\n';
fs.writeFileSync(OUT+'/ASSET_LIST.md',a);
fs.writeFileSync(OUT+'/oe_manifest.json',JSON.stringify(manifest,null,1));
// 3) 프롬프트
let p=`# 오프닝·엔딩 새 일러스트 — GPT 이미지 생성 프롬프트 (24장)\n\n쓰는 법: 새 대화에서 **그 캐릭터 원본 이미지 1장**을 올리고 아래 코드 블록을 통째로 복사해 붙여 넣는다. 화풍은 프롬프트 안에 글로 적혀 있고, 조연 외모도 프롬프트에 묘사돼 있어 따로 첨부하지 않아도 된다.\n\n완성본은 슬롯 id를 말해 주며 보내 주면 게임에 연결한다.\n`;
for(const id of IDS){ p+=`\n---\n\n## ${NAME[id]}\n`; for(const x of OE_DATA[id].art) p+=`\n### \`${x.id}\` — ${x.title}\n\n장면: ${x.scene}\n\n\`\`\`\n${x.prompt}${TAIL}\n\`\`\`\n`; }
fs.writeFileSync(OUT+'/IMAGE_PROMPTS.md',p);
console.log('ok', Object.keys(manifest.characters).length, unused.length+' unused op');
