"""경매왕 독립 버전 빌드 — 연습장 번들에서 게임만 전면에 띄우는 정적 사이트를 만든다.
   서버가 필요 없다(전부 브라우저에서 돈다). 결과물 폴더를 아무 정적 호스팅에 올리면 끝."""
import os, re, shutil, sys
SRC = 'rights-study.html'; BLOB = '_blob'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'gmw_out'
s = open(SRC, encoding='utf-8').read()
# 따옴표 안 id뿐 아니라 경로에 바로 박힌 id("/_blob/<id>", "assets/<id>.webp")도 — 실제 그림 파일이 있는 것만 복사한다
ids = sorted(i for i in set(re.findall(r'(?<![0-9a-f])([0-9a-f]{32})(?![0-9a-f])', s)) if os.path.exists(os.path.join(BLOB, i)))
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
var _gmwArt = artUrl; artUrl = function(id){ var u = _gmwArt(id); return u ? u.replace(/^\/_blob\/([0-9a-f]{32})$/, "assets/$1.webp") : null; };
try{ page = "arena"; arenaTab = "home"; render(); }catch(e){ console.error(e); }
// 주소창 #으로 다른 페이지(노트·퀴즈 등)로 가면 게임 홈으로 돌려놓는다
window.addEventListener("hashchange", function(){ if(page !== "arena"){ page = "arena"; arenaTab = "home"; render(); } });
setInterval(function(){ if(typeof page !== "undefined" && page !== "arena"){ page = "arena"; arenaTab = "home"; render(); } }, 800);
</script>
'''
# 첫 render() 전에 그림 경로·시작 페이지를 바꿔 둔다(안 그러면 첫 화면이 /_blob/ 을 찾는다)
pre = '\nwindow.GMW_STANDALONE = true;\nvar _gmwArt0 = artUrl; artUrl = function(id){ var u = _gmwArt0(id); return u ? u.replace(/^\\/_blob\\/([0-9a-f]{32})$/, "assets/$1.webp") : null; };\n\npage = "arena"; arenaTab = "home";\n'
k = s.rfind('\nrender();\n</script>')
assert k > 0
s = s[:k] + pre + s[k:]
i = s.rfind('</body>')
s = (s[:i] + boot + s[i:]) if i >= 0 else (s + boot)
s = re.sub(r'<title>[^<]*</title>', '', s, count=1)
head = '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>경매왕</title><meta name="description" content="낙찰부터 명도·수리·매도까지 — 경매 한 사이클을 돌려 보는 게임"><meta name="theme-color" content="#0d111b"></head><body>\n'
s = head + s + '\n</body></html>\n'
# ☁ 회원·클라우드 저장(Supabase) — config.js 가 비어 있으면 아무 일도 안 한다
s = s.replace('\n</body></html>\n', '\n<script src="config.js"></script>\n<script src="cloud.js"></script>\n</body></html>\n')
shutil.copyfile('cloud.js', os.path.join(OUT, 'cloud.js'))
cfg = os.path.join(OUT, 'config.js')
if not os.path.exists(cfg):   # 이미 채워 둔 설정은 덮어쓰지 않는다
    open(cfg, 'w', encoding='utf-8').write('''/* Supabase 연결 설정 — 비워 두면 회원 기능 없이 이 기기에만 저장된다.
   ⚠ anonKey 자리에는 anon(publishable) 키만. service_role / sb_secret_ 키는 절대 넣지 않는다(넣으면 자동으로 꺼진다). */
window.GMW_CLOUD = {
  url: "",        // 예: https://abcdxyz.supabase.co
  anonKey: "",    // Project Settings → API → anon public (또는 sb_publishable_...)
  emailDomain: "users.kyungmaewang.local"   // 아이디를 가짜 이메일로 바꿀 때 쓰는 도메인(사용자에게 안 보인다)
};
''')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(s)
open(os.path.join(OUT, '_headers'), 'w').write('/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/index.html\n  Cache-Control: no-cache\n/config.js\n  Cache-Control: no-cache\n/cloud.js\n  Cache-Control: no-cache\n')
print('ids', len(ids), 'copied', copied, 'html', len(s))
