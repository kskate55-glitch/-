p='rights-study.html'; s=open(p).read()
def rep(old,new):
    global s
    assert old in s, old[:70]; s=s.replace(old,new,1)
rep('let realTab = "case",','let realTab = "cases",')
rep('<button type="button" data-rtab="case" aria-pressed="${realTab==="case"}">사건 분석 연습</button>',
    '<button type="button" data-rtab="cases" aria-pressed="${realTab==="cases"}">케이스 스터디</button><button type="button" data-rtab="case" aria-pressed="${realTab==="case"}">권리분석 연습</button>')
rep('  if(realTab==="case"){\n    if(!RC',
    '  if(realTab==="cases"){\n    body = CS ? casePlayHTML() : caseListHTML();\n  } else if(realTab==="case"){\n    if(!RC')
rep('<h2 style="font-size:26px;margin-top:4px">${realTab==="case"?"사건 한 건 끝까지 분석하기":"내가 보는 물건 분석하기"}</h2>',
    '<h2 style="font-size:26px;margin-top:4px">${realTab==="cases"?"케이스로 배우는 명도·매도·투자":realTab==="case"?"사건 한 건 끝까지 분석하기":"내가 보는 물건 분석하기"}</h2>')
rep('<b>🔎 실전 사건 분석</b><span>등기부·임차인·배당까지 한 건을 끝까지. 탱크옥션 화면을 붙여넣으면 내 물건도 분석해요.</span>',
    '<b>🔎 실전 (케이스·사건 분석)</b><span>명도·매도·상가·지분 상황극, 권리분석 한 건 끝까지, 탱크옥션 붙여넣기 분석.</span>')
css='''.cgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:8px}
.ccard{display:grid;gap:4px;text-align:left;padding:12px 14px;cursor:pointer;color:var(--ink)}
.ccard:hover{border-color:var(--rule)}
.ctitle{font-weight:700;font-size:15px}
.copts{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.copt{width:100%;text-align:left;border:1.5px solid var(--line);background:var(--sheet);border-radius:8px;padding:10px 12px;display:grid;gap:4px;color:var(--ink);font:inherit}
.copt:not([disabled]):hover{border-color:var(--rule)}
.copt[disabled]{cursor:default}
.cfb{font-size:13.5px;color:var(--ink2)}
.cgwrap{position:sticky;bottom:10px;z-index:15}
@media (max-width:640px){.cgwrap{bottom:calc(66px + env(safe-area-inset-bottom,0px))}}
.cgauge{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:var(--sheet);border:1.5px solid var(--ink);border-radius:10px;padding:8px 10px;box-shadow:var(--shadow)}
.cgauge>div{display:grid;gap:2px;min-width:0}
.cgauge b{font-size:16px}
.cbar{display:block;position:relative;height:5px;background:var(--line);border-radius:3px;overflow:hidden}
.cbar>i{position:absolute;top:0;bottom:0;border-radius:3px}
.cchat{display:grid;gap:6px;margin:6px 0}
.cmsg{display:grid;justify-items:start;gap:2px;max-width:88%}
.cmsg.me{justify-self:end;justify-items:end}
.cwho{font-size:11.5px;color:var(--muted)}
.cbub{background:var(--sheet2);border:1px solid var(--line);border-radius:14px 14px 14px 4px;padding:8px 11px;white-space:pre-line;line-height:1.55}
.cmsg.me .cbub{background:var(--blue-soft);border-color:var(--blue);border-radius:14px 14px 4px 14px}
.cmsg.doc .cbub{border-radius:4px;border-style:dashed;font-size:14px}
.cdoc{border:1px dashed var(--rule);border-radius:8px;padding:6px 10px;margin:6px 0;background:var(--sheet)}
.cdoc summary{cursor:pointer;font-weight:700}
.cdoc pre{white-space:pre-wrap;font-family:var(--sans);font-size:14px;line-height:1.6;margin:8px 0;padding:10px;background:var(--sheet2);border-radius:6px}
.cafter{margin-top:8px;padding:8px 10px;border-radius:6px;background:var(--sheet2);font-size:14.5px;font-weight:600}
.cfx{display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;color:var(--muted)}
.cfx span{border:1px solid var(--line);border-radius:10px;padding:1px 7px}
.ckey{margin-top:8px;padding:8px 10px;border-left:3px solid var(--blue);background:var(--blue-soft);border-radius:4px;font-size:14px}
@media (max-width:640px){.cgrid{grid-template-columns:1fr}}
'''
rep('.rlist{display:grid}', css+'.rlist{display:grid}')
i=s.rindex('\nrender();\n</script>')
s=s[:i]+'\n'+open('cases_all.js').read()+'\n'+open('caseui.js').read()+s[i:]
open(p,'w').write(s)
