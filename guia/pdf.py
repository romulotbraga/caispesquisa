import asyncio, http.server, threading, functools
from playwright.async_api import async_playwright
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',8767), functools.partial(H, directory='/home/claude/guia')).serve_forever, daemon=True).start()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page()
        await pg.goto('http://127.0.0.1:8767/guia.html'); await pg.wait_for_selector('body[data-pronto]'); await pg.wait_for_timeout(1500)
        print(await pg.evaluate('[...document.querySelectorAll(".pg")].map(s=>[s.scrollHeight, s.clientHeight])'))
        await pg.pdf(path='/home/claude/guia/CAIS_guia_rapido.pdf', format='A4', print_background=True, prefer_css_page_size=True)
        await b.close()
asyncio.run(main())
