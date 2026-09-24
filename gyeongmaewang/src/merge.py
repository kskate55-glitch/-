import subprocess, os, re
s = open('v7-backup.html').read()
def rep(old,new):
    global s
    assert old in s, old[:80]; s = s.replace(old,new,1)
# ---- cases source
parts = ['deep1.js','deep2.js']
for f in ['deep3.js','deep4.js','deep5.js','deep6.js','deep7.js','deep8.js','deep9.js']:
    if os.path.exists(f) and 'errors 0' in subprocess.run(['node','check_cases2.js',f],capture_output=True,text=True).stdout: parts.append(f)
names = [re.search(r'const (CASES_\w+)', open(f).read()).group(1) for f in parts]
cases = '\n'.join(open(f).read() for f in parts) + '\nconst CASES = [' + ','.join('...'+n for n in names) + '];\n'
a = s.index('\nconst CASES = [')
b = s.index('\nrender();\n</script>')
s = s[:a] + '\n' + cases + '\n' + open('scenes.js').read() + '\n' + open('caseui.js').read() + '\n' + open('caseart.js').read() + '\n' + open('avatar.js').read() + '\n' + open('portrait.js').read() + '\n' + open('villacalc.js').read() + '\n' + open('arena.js').read() + '\n' + open('fun.js').read() + '\n' + open('scenario_sample01.js').read() + '\n' + open('sellgame.js').read() + '\n' + open('guessgame.js').read() + '\n' + open('art.js').read() + '\n' + open('vnstage.js').read() + '\n' + open('growth.js').read() + '\n' + open('kingrun.js').read() + '\n' + open('story.js').read() + '\n' + open('story2.js').read() + '\n' + open('hub.js').read() + '\n' + open('career.js').read() + '\n' + open('feel.js').read() + '\n' + open('case002.js').read() + '\n' + open('research.js').read() + '\n' + open('polish2.js').read() + '\n' + open('week.js').read() + '\n' + open('sense.js').read() + '\n' + open('life.js').read() + '\n' + open('cine.js').read() + '\n' + open('charart.js').read() + '\n' + open('stage.js').read() + '\n' + open('sheetart.js').read() + '\n' + open('qa1.js').read() + '\n' + open('campaign.js').read() + '\n' + open('polish.js').read() + '\n' + open('layout.js').read() + s[b:]
# ---- css (case deep + arena)
css = open('patch_cases.py').read().split("css='''")[1].split("'''")[0]
css_new = '\n'.join(l for l in css.splitlines() if l.split('{')[0] not in s[:s.index('</style>')] or l.startswith('@media'))
css_new += '\n' + open('arena.css').read()
rep('.rlist{display:grid}', css_new + '\n.rlist{display:grid}')
# ---- nav
rep('["real","실전"],', '["real","실전"],["arena","협상"],')
rep('      ${miniHTML()}\n    </div>', '      ${miniHTML()}\n      ${villaCalcHTML()}\n    </div>')
rep('  calc1(); calc2();\n}', '  calc1(); calc2(); villaCalcAll();\n}')
rep(' cycle:\'<svg', ' arena:\'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9" r="3"/><path d="M3 19c0-3 2.2-5 5-5s5 2 5 5M11.5 19c0-3 2.2-5 5-5s4.5 2 4.5 5"/></svg>\',\n cycle:\'<svg')
rep('  if(page==="real") renderReal();', '  if(page==="real") renderReal();\n  if(page==="arena") renderArena();')
s = s.replace('repeat(8,1fr)','repeat(9,1fr)')
rep('<button type="button" data-go="real"><b>🔎 실전 (케이스·사건 분석)</b>',
    '<button type="button" data-go="arena"><b>🎮 협상 (도감·명도왕 게임·AI 채팅)</b><span>점유자 유형 도감, 명도왕 게임, 점유자·부동산 사장님·인테리어 업자·매수자와 AI 협상 연습(코치 피드백).</span></button>\n     <button type="button" data-go="real"><b>🔎 실전 (케이스·사건 분석)</b>')
rep('/* ============================== 저장 ============================== */', open('villa_data.js').read() + '\n/* ============================== 저장 ============================== */')
old = [l for l in s.splitlines() if '<h3>실전 파트</h3>' in l][0]
new = old[:-1] + '\n    + `<div class="g hid" style="border-style:solid;box-shadow:inset 3px 0 0 var(--ok)"><h3>${GROUPS.villa.name}</h3><div class="sub">${GROUPS.villa.sub}</div><div class="items">${CONCEPTS.filter(c=>c.g==="villa").map(c=>`<button type="button" class="chip" data-jump="${c.id}">${c.name}</button>`).join("")}</div></div>`;'
rep(old, new)
rep('family=IBM+Plex+Mono:wght@500&display=swap', 'family=IBM+Plex+Mono:wght@500&family=Do+Hyeon&display=swap')
open('rights-study.html','w').write(s)
print('merged', parts, len(s))
