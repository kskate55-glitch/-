import http.server, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.html':'text/html; charset=utf-8', '':'image/png'}
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(('',8765),H).serve_forever()
