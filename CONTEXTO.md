# CAIS Pesquisa · contexto do projeto

Documento vivo. Atualize ao fim de cada mudança, no mesmo commit. A skill `/caispesquisa` manda ler este arquivo antes de qualquer coisa.

Última atualização: 2026-11-23.

## O que é

Site de coleta de campo da pesquisa de implementação do CAIS (Rio de Janeiro), usado pela equipe no celular durante os atendimentos à população em situação de rua. Dois polos: Espaço Normal e PROJAD/UFRJ. Não tem relação com o Instituto Apontar. Dono e administrador: Romulo (o e-mail de administrador está na constante `ADMIN` de `cais-db.js` e na função `eh_admin` do banco).

- Site: https://caispesquisa.netlify.app
- Repositório: `romulotbraga/caispesquisa` (privado), branch `main`. Cópia local do Romulo: `C:\Users\SSD 960\Documents\GitHub\caispesquisa`.
- Banco: Supabase, organização **CAIS Pesquisa** (plano free), projeto **CAIS Pesquisa**, ref `odlexesnjlglpvrhhujd`, região us-east-2.
- Planilha antiga (só histórico, o site não usa mais): "Base de dados - CAIS", id `1Q6OuValZxnOvm2t0ZjlNtJRPSpnqTVpA6M5ROIhajLE`.
- Checklist da migração (Sheet no Claude): https://claude.ai/artifact/HVHTRxpXLUC92Xct7HTvsn

## Como trabalhar

1. Romulo pede a mudança no chat. Faça, teste, atualize este arquivo, faça commit e push na `main` sem pedir que ele faça nada. O Netlify publica a partir do repositório (ver Pendências enquanto isso não estiver ligado).
2. Ao mudar `cais-db.js`, aumente o `?v=` nas duas páginas, para o celular não ficar com a versão velha.
3. Mudança só de tela (HTML, CSS, JS) não precisa do conector do Supabase.
4. Mudança na estrutura do banco (tabela, coluna, regra de acesso) precisa do conector do Supabase apontado para a organização CAIS Pesquisa. O conector só enxerga uma organização por vez e normalmente fica na Instituto Apontar (por causa do /sistemaapontar). Confira com `list_organizations`; se não aparecer CAIS Pesquisa, avise o Romulo antes de começar: ele desconecta e reconecta o conector escolhendo CAIS Pesquisa, e volta para Instituto Apontar no fim. Registre toda mudança de estrutura num arquivo novo em `supabase/`.
5. Campo novo no formulário: coluna em `atendimentos`, campo no HTML, entrada em `dados` (submitAtend), em `CAMPOS_PESSOA` se for dado da pessoa (volta preenchido no retorno; a lista existe em `index.html` e em `encaminhamentos.html`), em `INPUT_DE` se for texto, em `ROT` para aparecer na ficha de edição, e coluna no planilhão se fizer sentido.
6. Teste antes do push: o ambiente do Claude não alcança o Supabase nem os CDNs, então o teste é com navegador sem tela e um banco simulado (trocar a resposta de `supabase-js` por um objeto falso), mais os testes de regra de acesso direto no banco com `set local role anon` dentro de um bloco que termina em erro (para desfazer).
7. Textos em português para o Romulo: sem travessões.

## Arquivos

- `index.html`: página única com três abas. Coleta (formulário, retorno de atendido, fila offline, gravação de áudio, modais de oficina e de encontro intersetorial), Banco de dados (planilhão) e Painel (indicadores).
- `encaminhamentos.html`: mapa de encaminhamentos (pontos da rede, atendidos, geração de PDF de encaminhamento). `apiGet`/`apiPost` mantêm o formato antigo do Apps Script, mas leem e gravam no Supabase.
- `cais-db.js`: cliente do Supabase, leitura paginada, inserção, agrupamento por pessoa (`pessoasDe`), telefone para WhatsApp (`foneWa`), login do administrador.
- `supabase/001_inicial.sql`: tabelas, gatilho, função de aprovação, regras de acesso, tempo real e pasta de áudios.
- `supabase/002_fotos.sql`: tabela `fotos`, pasta `fotos` e `client_id` em todos os lançamentos de oficinas e intersetoriais.
- `supabase/003_frentes_atividades.sql`: coluna `frentes` em `oficinas` e `intersetoriais`.
- `guia/`: guia rápido em PDF para quem nunca usou o site (`CAIS_guia_rapido.pdf`, 6 páginas, prints com dados fictícios e setas). Para refazer depois de mudar a tela: `captura.py` tira os prints do site local com o banco simulado de `mock.js` (precisa das fontes `@fontsource/archivo`, `instrument-sans` e `ibm-plex-mono` instaladas por npm na mesma pasta) e `pdf.py` gera o PDF a partir de `guia.html`. Os caminhos dentro dos scripts apontam para `/home/claude/...` e precisam ser ajustados.
- `backup/backup_drive.gs`: backup semanal no Drive do Romulo, por Apps Script na conta Google dele. Lê as 7 tabelas pela API pública e cria uma planilha Google por semana (uma aba por tabela, tudo como texto, mais a aba resumo) na pasta "CAIS · Backups do banco". `instalar()` faz uma cópia na hora e agenda `fazerBackup` para as segundas, 6h. Guarda todas as cópias. Também copia os arquivos para a subpasta "arquivos" (fotos e audios), uma vez cada, com limite de 5 min por execução (o resto vai na semana seguinte). Fotos saem com a chave pública; gravações só com a chave secreta do Supabase guardada pelo Romulo nas Propriedades do script como `CHAVE_SECRETA` (nunca no código). Os 5 áudios antigos com `audio_url` já estão no Drive e não são copiados de novo. Se criar tabela nova, acrescentar em `TABELAS` e o Romulo cola o arquivo de novo no Apps Script.
- `.github/workflows/manter-ativo.yml`: leitura diária no banco para o projeto free não pausar.

## Banco

Tabelas em `public`: `atendimentos` (uma linha por atendimento, com os dados da pessoa repetidos, como era na planilha; a pessoa é o `id_pessoa`), `oficinas`, `intersetoriais`, `fotos`, `pontos_rede`, `encaminhamentos_doc`, `edicoes`.

- `fotos`: uma linha por foto de atividade coletiva ou encontro intersetorial. `origem` ('oficinas' ou 'intersetoriais'), `registro` (= `client_id` do lançamento), `caminho` na pasta `fotos`, `enviado_por`. Desde 23/11/2026 todo lançamento de `oficinas` e `intersetoriais` tem `client_id` (os migrados ganharam um; a coluna tem valor padrão).

- `atendimentos.n_atendimento` é preenchido por gatilho (conta os atendimentos anteriores da pessoa).
- `client_id` (uuid, único) evita duplicar quando a fila offline reenvia.
- `frentes`: frentes do PROJAD marcadas no atendimento (opções: RUAS, Capoeira, CnaR, PROJAD PV; gravadas como "RUAS; Capoeira").
- `audio_url`: link do Drive das 5 gravações antigas. `audio_path`: caminho na pasta `audios` do Supabase para as novas.

Acesso (decisão do Romulo: aberto, como era com a planilha):
- Qualquer pessoa com o site lê tudo e lança atendimento, oficina, encontro, ponto do mapa e encaminhamento, sem login.
- Atendimento lançado não é alterado diretamente. A equipe propõe a mudança (tabela `edicoes`, estado `pendente`) e só o administrador aprova, pela função `decidir_edicao`, que confere o e-mail do login. O administrador edita direto.
- Pasta `audios` é privada: qualquer um envia, só o administrador ouve (link assinado).
- Pasta `fotos` é privada (sem link público), até 10 MB e só imagem: qualquer um envia e vê (link assinado de 1 h, como o resto do site aberto); só o administrador apaga. Tabela `fotos`: qualquer um lê e lança; só o administrador altera ou apaga.
- Login do administrador: link por e-mail (magic link). Plano B na própria tela: colar o endereço do link.

Tempo real: `atendimentos`, `oficinas`, `intersetoriais`, `fotos` e `edicoes` estão na publicação `supabase_realtime`. O site recarrega os dados quando algo muda, e também depois de cada envio.

## Regras do painel

Iguais às do painel antigo (conferido com os números do Apps Script em 20/11/2026):
- Encaminhamento realizado: atendimento com `encaminhamento` preenchido e diferente de "Não houve".
- Efetivado: atendimento com `encaminhamento_efetivado` = "Sim, chegou ao serviço".
- Avaliação: `satisfacao` preenchida; positiva = "Positivo".
- Oficinas e encontros contam linha por linha, inclusive lançamentos repetidos.
- Registros sem polo entram só na coluna Total.
- Tempo até o 1º atendimento não é coletado.

## Coleta no celular

- Abaixo de 600 px: título só "CAIS · Coleta de campo", opções (chips) esticam para preencher a linha, exceto a última linha; faixa etária em 5 colunas; campos e espaçamentos menores.
- "Seu nome (equipe)" fica num cartão próprio acima dos boxes Novo/Retorno, fora do `formAtend` (o retorno lista os atendidos de quem está registrando; o nome continua preenchido depois de cada envio).
- No topo, dois boxes lado a lado: Novo atendido e Retorno de atendido (`#btnNovo`, `#btnRetorno`, dentro de `#pbar`). O ativo fica verde; no retorno, o box mostra o nome e o número do atendimento.
- Modais de oficina e de encontro intersetorial têm "📷 Adicionar fotos" (várias por vez). A foto é reduzida no aparelho (lado maior 1600 px, JPEG 0,8) e vai junto na fila offline; se o aparelho ficar sem espaço, a fila guarda o registro sem as fotos. Envio em `enviarFotos` (repetir é seguro).
- Os modais de oficina e de encontro também mostram as frentes do PROJAD quando o polo é PROJAD/UFRJ (`#of_frentes_box`, `#in_frentes_box`, grupos `of_frentes` e `in_frentes`); gravam em `frentes` só com polo PROJAD/UFRJ.
- Ao marcar PROJAD/UFRJ, o bloco de frentes (RUAS, Capoeira, CnaR, PROJAD PV) surge com animação em cascata (CSS na classe `.frentes-box`, usada nos três blocos de frentes, toca sozinha porque o bloco sai de `display:none`; desligada para quem pede menos movimento no aparelho).
- Romulo pediu para tirar as frases de ajuda do Seu nome (equipe), do telefone, das substâncias, do CPF/RG, do encaminhamento, da avaliação e da gravação (consentimento). Não recolocar.

## Planilhão (aba Banco de dados)

- Três abas no topo (`#dbAbas`, objeto `ABAS_DB`): Atendimentos (uma linha por pessoa, descrito abaixo), Atividades coletivas (tabela `oficinas`, colunas `COLS_OFI`) e Encontros intersetoriais (tabela `intersetoriais`, colunas `COLS_INTER`). Nas duas últimas é uma linha por lançamento, com o mesmo ordenar e filtrar nos títulos; o toque na linha abre o texto inteiro de observações ou pauta; não há edição pela tela. Cada aba guarda a sua ordem e os seus filtros no aparelho (`cais_db_vista`, `cais_db_vista_ofi`, `cais_db_vista_inter`), e a última aba aberta fica em `cais_db_aba`.
- Uma linha por pessoa, com os dados do atendimento mais recente. O toque na linha abre os atendimentos dela.
- Coluna Frentes: junta, sem repetir, as frentes de todos os atendimentos da pessoa (função `frentesDe`), e não só do último; o filtro conta a pessoa em cada frente.
- Botão "Exportar para planilha" (`exportarPlanilha`): gera um .xlsx da aba aberta com duas abas, "Na tela" (linhas visíveis, com busca, filtros e ordem, nas colunas do planilhão) e "Completo" (a tabela inteira com todos os campos, menos `client_id`; nos atendimentos, um registro por atendimento). Datas saem como datas do Excel. A biblioteca SheetJS (`xlsx@0.18.5`, jsdelivr) só é baixada no clique. No celular o botão diz só "Exportar".
- A linha de contagem, "ao vivo" e dica foi escondida a pedido do Romulo (CSS; os elementos continuam no HTML). Só aparece o aviso de filtro/ordem com o "limpar", quando houver.
- Abas de atividades e encontros têm a coluna Frentes (filtrável, valores separados por ";") e a coluna Fotos (contagem e botão ＋ para adicionar fotos a qualquer lançamento, `addFotosPlanilha`). Linha aberta mostra as miniaturas (link assinado, guardado em `URL_FOTO`); tocar abre a foto. Não há apagar foto pela tela (só pelo painel do Supabase, administrador).
- Bolinha verde ao lado do nome quando o telefone é válido: abre a conversa no WhatsApp (sem DDD, assume 21).
- Lápis no fim da linha abre a ficha completa do último atendimento; cada atendimento aberto tem o seu lápis.
- Edições pendentes aparecem numa caixa no topo; os botões Aprovar e Recusar só aparecem para o administrador.
- Títulos das colunas clicáveis: ordenar (crescente/decrescente) e filtrar por valores, como numa planilha. As colunas ficam na lista `COLS` (de onde vem o valor, ordem especial da idade, filtro por mês na data, filtro só preenchido/vazio em nome, documento e telefone, valores separados por ";" em substâncias, encaminhamento e frentes). A escolha de cada pessoa fica guardada no próprio aparelho (`cais_db_vista`); "limpar" desfaz.

## Migração da planilha (20/11/2026)

Entraram: 96 atendimentos (63 pessoas), 52 oficinas, 19 encontros intersetoriais (16 da aba INTERSETORIAL e 3 da aba antiga INTERSETORIAIS), 366 pontos da rede, 5 encaminhamentos gerados. Ficaram na planilha: abas `antigo_*`, `base_censo_2024` e `Indicadores`.

A leitura direta da planilha (esquema `migracao` e extensão `http`) foi removida do banco em 20/11/2026, depois de conferir que nada novo tinha entrado na planilha após a publicação do site. Se aparecer registro na planilha depois dessa data (alguém com o site antigo aberto), é preciso trazer à mão.

## Pendências

- [x] Netlify ligado ao repositório em 20/11/2026; o site novo está no ar e lendo o banco (conferido nos registros de acesso do Supabase).
- [x] Leitura da planilha desligada em 20/11/2026.
- [x] Site URL do login configurado e primeiro login de administrador feito em 20/11/2026; edição aprovada e áudio enviado no teste do Romulo.
- [x] Atendimentos de teste apagados em 20/11/2026 (4 registros com nome "Teste" e 1 sem nome lançado por "Testador"; o banco ficou com 92 atendimentos de 60 pessoas). Falta o Romulo apagar o arquivo de áudio de teste em Storage > audios.
- [x] Romulo decidiu manter as 3 oficinas "Oficina de música" de 22/08, o encontro "Encontro" de 22/08 e os 19 encontros intersetoriais (20/11/2026).
- [ ] Romulo: restringir o compartilhamento da planilha (está legível por qualquer pessoa com o link).
- [ ] O envio de e-mail do mapa ainda usa um Apps Script próprio (`EMAIL_URL` em `encaminhamentos.html`), que não depende da planilha.
- [ ] Romulo: instalar o backup semanal (colar `backup/backup_drive.gs` em script.google.com, criar a propriedade `CHAVE_SECRETA` e executar `instalar`). Pedido em 23/11/2026.
- [ ] Guia em PDF ainda cita só três frentes e não mostra fotos, Exportar nem as abas novas do Banco de dados (RUAS, Capoeira, CnaR); refazer quando houver outra mudança de tela.
- [ ] Preencher os 6 atendimentos sem polo (Romulo disse que são PROJAD/UFRJ).

## Histórico

- 2026-11-23: backup também copia fotos e gravações.
- 2026-11-23: script de backup semanal no Drive (`backup/backup_drive.gs`). O plano free do Supabase não oferece backup que se possa baixar.
- 2026-11-23: frentes do PROJAD também nos lançamentos de atividades e encontros, com coluna Frentes filtrável nas duas planilhas. Migração `003_frentes_atividades.sql` aplicada.
- 2026-11-23: fotos nas atividades coletivas e nos encontros intersetoriais (no lançamento e pelo ＋ do planilhão). Migração `002_fotos.sql` aplicada.
- 2026-11-23: coluna renomeada para "Frentes"; botão Exportar para planilha; linha de contagem e dica escondida.
- 2026-11-23: quarta frente do PROJAD, "PROJAD PV". Planilhão de atendimentos ganhou a coluna Frentes PROJAD, com filtro.
- 2026-11-23: aba Banco de dados ganhou as abas Atividades coletivas e Encontros intersetoriais no mesmo formato de planilha. Frentes do PROJAD surgem com animação.
- 2026-11-20: campo "Seu nome (equipe)" movido para antes dos boxes Novo/Retorno.
- 2026-11-20: celular mais compacto (título curto, boxes Novo/Retorno, data sem vazar, opções preenchendo a linha, frases de ajuda retiradas; formulário cerca de 27% mais curto). Planilhão com ordenar e filtrar nos títulos. Guia refeito com as telas novas.
- 2026-11-20: guia rápido em PDF (pasta `guia/`). No planilhão, a bolinha do WhatsApp deixou de ser cortada em nomes longos.
- 2026-11-20: site novo publicado pelo Netlify a partir do repositório. A fila offline aceita registros deixados pelo site antigo no aparelho (tira o apóstrofo do documento e cria o `client_id`).
- 2026-11-20: migração da planilha para o Supabase; site passa a ler e gravar no banco; aba Banco de dados (planilhão em tempo real, edição com aprovação, WhatsApp); campo telefone; frentes do PROJAD; três atalhos em boxes no topo.
