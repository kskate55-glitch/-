"""경매왕 독립 버전 빌드 — 연습장 번들에서 게임만 전면에 띄우는 정적 사이트를 만든다.
   서버가 필요 없다(전부 브라우저에서 돈다). 결과물 폴더를 아무 정적 호스팅에 올리면 끝."""
import os, re, shutil, sys
SRC = 'rights-study.html'; BLOB = '_blob'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'gmw_out'
s = open(SRC, encoding='utf-8').read()
ids = sorted(set(re.findall(r'"([0-9a-f]{32})"', s)))
os.makedirs(os.path.join(OUT, 'assets'), exist_ok=True)
copied = 0
for i in ids:
    p = os.path.join(BLOB, i)
    if os.path.exists(p):
        shutil.copyfile(p, os.path.join(OUT, 'assets', i + '.webp')); copied += 1
boot = r'''
<style>
/* 독립 버전: 연습장 사이트 껍데기를 숨기고 게임만 */
header.top, nav.bottom, footer, .site-foot { display:none !important; }
[data-kfsexit], [data-atab="art"], [data-atab="chat"], [data-atab="dex"] { display:none !important; }
body { background:#0d111b; }
</style>
<script>
window.GMW_STANDALONE = true;
document.title = "경매왕";
// 그림은 같은 폴더의 assets/ 에서 (claude.ai 자산 저장소 대신)
artUrl = function(id){ var a = ART_DEFAULT[id]; return a ? "assets/" + a + ".webp" : null; };
try{ page = "arena"; arenaTab = "home"; render(); }catch(e){ console.error(e); }
// 주소창 #으로 다른 페이지(노트·퀴즈 등)로 가면 게임 홈으로 돌려놓는다
window.addEventListener("hashchange", function(){ if(page !== "arena"){ page = "arena"; arenaTab = "home"; render(); } });
setInterval(function(){ if(typeof page !== "undefined" && page !== "arena"){ page = "arena"; arenaTab = "home"; render(); } }, 800);
</script>
'''
# 첫 render() 전에 그림 경로·시작 페이지를 바꿔 둔다(안 그러면 첫 화면이 /_blob/ 을 찾는다)
pre = '\nwindow.GMW_STANDALONE = true;\nartUrl = function(id){ var a = ART_DEFAULT[id]; return a ? "assets/" + a + ".webp" : null; };\npage = "arena"; arenaTab = "home";\n'
k = s.rfind('\nrender();\n</script>')
assert k > 0
s = s[:k] + pre + s[k:]
i = s.rfind('</body>')
s = (s[:i] + boot + s[i:]) if i >= 0 else (s + boot)
s = re.sub(r'<title>[^<]*</title>', '', s, count=1)
head = '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>경매왕</title><meta name="description" content="낙찰부터 명도·수리·매도까지 — 경매 한 사이클을 돌려 보는 게임"><meta name="theme-color" content="#0d111b"></head><body>\n'
s = head + s + '\n</body></html>\n'
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(s)
open(os.path.join(OUT, '_headers'), 'w').write('/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/index.html\n  Cache-Control: no-cache\n')
print('ids', len(ids), 'copied', copied, 'html', len(s))
