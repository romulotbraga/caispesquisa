import asyncio, json, http.server, threading, functools, os
from playwright.async_api import async_playwright
ROOT='/home/claude/caispesquisa'; G='/home/claude/guia'
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',8766), functools.partial(H, directory=ROOT)).serve_forever, daemon=True).start()
threading.Thread(target=http.server.ThreadingHTTPServer(('127.0.0.1',8767), functools.partial(H, directory=G)).serve_forever, daemon=True).start()
MOCK=open(G+'/mock.js',encoding='utf-8').read()
def face(fam,pkg,ws): return ''.join(f"@font-face{{font-family:'{fam}';font-weight:{w};src:url(http://127.0.0.1:8767/node_modules/@fontsource/{pkg}/files/{pkg}-latin-{w}-normal.woff2) format('woff2')}}" for w in ws)
FONTES=face('Archivo','archivo',[500,600,700,800,900])+face('Instrument Sans','instrument-sans',[400,500,600,700])+face('IBM Plex Mono','ibm-plex-mono',[400,500,600,700])
open(G+'/fontes.css','w').write(FONTES)
FIG={}
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--lang=pt-BR'])
    async def nova(w,h,mobile=True,dsf=2):
        ctx = await b.new_context(viewport={'width':w,'height':h}, device_scale_factor=dsf, is_mobile=mobile, has_touch=mobile, locale='pt-BR', timezone_id='America/Sao_Paulo')
        pg = await ctx.new_page()
        async def rota(r):
            u=r.request.url
            if 'supabase-js' in u: await r.fulfill(body=MOCK, content_type='application/javascript')
            elif 'fonts.googleapis.com' in u: await r.fulfill(body=FONTES, content_type='text/css')
            elif u.startswith('http://127.0.0.1'): await r.continue_()
            else: await r.abort()
        await pg.route('**/*', rota)
        await pg.goto('http://127.0.0.1:8766/index.html'); await pg.wait_for_timeout(900)
        await pg.add_style_tag(content='#toast{display:none!important}')
        return pg
    async def foto(pg, nome, alvos, clip=None, el=None):
        vp = pg.viewport_size
        if el:
            box = await (await pg.query_selector(el)).bounding_box(); clip={'x':max(0,box['x']-8),'y':max(0,box['y']-8),'width':min(vp['width'],box['width']+16),'height':box['height']+16}
        clip = clip or {'x':0,'y':0,'width':vp['width'],'height':vp['height']}
        await pg.screenshot(path=f'{G}/{nome}.png', clip=clip)
        rs=[]
        for n,sel in alvos:
            bb = await (await pg.query_selector(sel)).bounding_box()
            rs.append({'n':n,'x':bb['x']-clip['x'],'y':bb['y']-clip['y'],'w':bb['width'],'h':bb['height']})
        FIG[nome]={'w':clip['width'],'h':clip['height'],'alvos':rs}
    chip=lambda g,t: f'.chips[data-name="{g}"] .chip:has-text("{t}")'
    # A: começo da coleta
    pg = await nova(390,1180)
    await pg.click(chip('polo','PROJAD/UFRJ')); await pg.click(chip('frentes','RUAS'))
    await pg.fill('#f_equipe','Carla (exemplo)'); await pg.fill('#f_nome','Paulo Fictício Rocha'); await pg.fill('#f_tel','(21) 90000-0009')
    await pg.evaluate('document.activeElement.blur(); window.scrollTo(0,0)'); await pg.wait_for_timeout(200)
    await foto(pg,'a_inicio',[(1,'.chips[data-name="polo"]'),(2,'#fFrentes'),(3,'#f_equipe'),(4,'#f_nome'),(5,'#f_tel')], clip={'x':0,'y':0,'width':390,'height':1090})
    # B: fim do formulário
    await pg.click(chip('encaminhamento','CAPS AD')); await pg.fill('#f_encam_qual','CAPS AD Exemplo'); await pg.click('#thumbPos')
    await pg.evaluate('document.activeElement.blur(); document.querySelector(\'.chips[data-name="encaminhamento"]\').closest(".field").scrollIntoView({block:"start"}); window.scrollBy(0,-70)'); await pg.wait_for_timeout(250)
    await foto(pg,'b_fim',[(1,'.chips[data-name="encaminhamento"]'),(2,'.thumbs'),(3,'#audioDrop'),(4,'#btnSend')], clip={'x':0,'y':185,'width':390,'height':995})
    # C: retorno
    pg = await nova(390,760)
    await pg.fill('#f_equipe','Carla (exemplo)'); await pg.click('#btnRetorno'); await pg.wait_for_timeout(500)
    await foto(pg,'c_retorno',[(1,'#retBusca'),(2,'#retLista .pitem'),(3,'#mRetorno .switch')])
    await pg.click('#retLista .pitem:has-text("Maria")'); await pg.wait_for_timeout(700); await pg.evaluate('window.scrollTo(0,0)'); await pg.wait_for_timeout(300)
    await foto(pg,'d_barra',[(1,'#pbar')], clip={'x':0,'y':0,'width':390,'height':330})
    await pg.evaluate('document.querySelector("#fEncamAnterior").scrollIntoView({block:"center"})'); await pg.wait_for_timeout(250)
    await foto(pg,'e_anterior',[], el='#fEncamAnterior')
    # F: oficina
    pg = await nova(390,760)
    await pg.click('.qbox >> nth=0'); await pg.click('.chips[data-name="of_polo"] .chip >> nth=1'); await pg.fill('#of_nome','Roda de conversa'); await pg.fill('#of_part','12'); await pg.fill('#of_obs','Conduzida por Carla e Pedro. Dois novos cadastros.')
    await pg.evaluate('document.activeElement.blur()'); await pg.wait_for_timeout(200)
    await foto(pg,'f_oficina',[(1,'.chips[data-name="of_polo"]'),(2,'#of_nome'),(3,'#of_part'),(4,'#mOficina .btn-brand')])
    await pg.keyboard.press('Escape')
    # topo com os boxes (para a capa)
    pg0 = await nova(390,760)
    await foto(pg0,'z_topo',[(1,'#tabColeta'),(2,'#tabBanco'),(3,'#tabPainel'),(4,'.quick3')], clip={'x':0,'y':0,'width':390,'height':250})
    # J: fila offline
    await pg0.evaluate('window.__falhar=true'); await pg0.fill('#f_nome','Pessoa Exemplo'); await pg0.click('#btnSend'); await pg0.wait_for_timeout(900); await pg0.evaluate('window.scrollTo(0,0)'); await pg0.wait_for_timeout(300)
    await foto(pg0,'j_fila',[(1,'#queuePill')], clip={'x':0,'y':0,'width':390,'height':120})
    # G: banco (computador)
    d = await nova(1060,520,mobile=False,dsf=2)
    await d.click('#tabBanco'); await d.wait_for_timeout(500); await d.click('tr.pl:has-text("Maria Exemplo")'); await d.wait_for_timeout(300)
    await foto(d,'g_banco',[(1,'#dbBusca'),(2,'tr.pl.aberta td.c-nome'),(3,'tr.pl.aberta a.wa'),(4,'tr.pl.aberta td.c-ed .ed'),(5,'table.sub')])
    # H: edição (celular)
    m = await nova(390,760)
    await m.fill('#f_equipe','Carla (exemplo)'); await m.click('#tabBanco'); await m.wait_for_timeout(500)
    await m.click('tr.pl:has-text("João Modelo") td.c-ed .ed'); await m.wait_for_timeout(300)
    await m.fill('#ed_bairro','Glória'); await m.evaluate('document.activeElement.blur(); document.querySelector("#ed_bairro").scrollIntoView({block:"center"})'); await m.wait_for_timeout(200)
    await foto(m,'h_editar',[(1,'#ed_bairro')])
    await m.evaluate('document.querySelector("#edEnviar").scrollIntoView({block:"end"})'); await m.wait_for_timeout(200)
    await foto(m,'h_enviar',[(1,'#edQuem'),(2,'#edEnviar')], clip={'x':0,'y':420,'width':390,'height':340})
    await m.click('#edEnviar'); await m.wait_for_timeout(900); await m.evaluate('window.scrollTo(0,0)'); await m.wait_for_timeout(300)
    await foto(m,'i_pendente',[], el='#dbPend')
    # painel
    await m.click('#tabPainel'); await m.wait_for_timeout(500)
    await foto(m,'k_painel',[(1,'#btnPainel'),(2,'#kpis')], clip={'x':0,'y':0,'width':390,'height':470})
    json.dump(FIG, open(G+'/fig.json','w'))
    print({k:(v['w'],round(v['h'])) for k,v in FIG.items()})
    await b.close()
asyncio.run(main())
