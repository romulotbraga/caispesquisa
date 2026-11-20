# CAIS Pesquisa · contexto do projeto

Documento vivo. Atualize ao fim de cada mudança, no mesmo commit. A skill `/caispesquisa` manda ler este arquivo antes de qualquer coisa.

Última atualização: 2026-11-20.

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
- `guia/`: guia rápido em PDF para quem nunca usou o site (`CAIS_guia_rapido.pdf`, 6 páginas, prints com dados fictícios e setas). Para refazer depois de mudar a tela: `captura.py` tira os prints do site local com o banco simulado de `mock.js` (precisa das fontes `@fontsource/archivo`, `instrument-sans` e `ibm-plex-mono` instaladas por npm na mesma pasta) e `pdf.py` gera o PDF a partir de `guia.html`. Os caminhos dentro dos scripts apontam para `/home/claude/...` e precisam ser ajustados.
- `.github/workflows/manter-ativo.yml`: leitura diária no banco para o projeto free não pausar.

## Banco

Tabelas em `public`: `atendimentos` (uma linha por atendimento, com os dados da pessoa repetidos, como era na planilha; a pessoa é o `id_pessoa`), `oficinas`, `intersetoriais`, `pontos_rede`, `encaminhamentos_doc`, `edicoes`.

- `atendimentos.n_atendimento` é preenchido por gatilho (conta os atendimentos anteriores da pessoa).
- `client_id` (uuid, único) evita duplicar quando a fila offline reenvia.
- `frentes`: frentes do PROJAD marcadas no atendimento ("RUAS; Capoeira; CnaR").
- `audio_url`: link do Drive das 5 gravações antigas. `audio_path`: caminho na pasta `audios` do Supabase para as novas.

Acesso (decisão do Romulo: aberto, como era com a planilha):
- Qualquer pessoa com o site lê tudo e lança atendimento, oficina, encontro, ponto do mapa e encaminhamento, sem login.
- Atendimento lançado não é alterado diretamente. A equipe propõe a mudança (tabela `edicoes`, estado `pendente`) e só o administrador aprova, pela função `decidir_edicao`, que confere o e-mail do login. O administrador edita direto.
- Pasta `audios` é privada: qualquer um envia, só o administrador ouve (link assinado).
- Login do administrador: link por e-mail (magic link). Plano B na própria tela: colar o endereço do link.

Tempo real: `atendimentos`, `oficinas`, `intersetoriais` e `edicoes` estão na publicação `supabase_realtime`. O site recarrega os dados quando algo muda, e também depois de cada envio.

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
- Romulo pediu para tirar as frases de ajuda do Seu nome (equipe), do telefone, das substâncias, do CPF/RG, do encaminhamento, da avaliação e da gravação (consentimento). Não recolocar.

## Planilhão (aba Banco de dados)

- Uma linha por pessoa, com os dados do atendimento mais recente. O toque na linha abre os atendimentos dela.
- Bolinha verde ao lado do nome quando o telefone é válido: abre a conversa no WhatsApp (sem DDD, assume 21).
- Lápis no fim da linha abre a ficha completa do último atendimento; cada atendimento aberto tem o seu lápis.
- Edições pendentes aparecem numa caixa no topo; os botões Aprovar e Recusar só aparecem para o administrador.
- Títulos das colunas clicáveis: ordenar (crescente/decrescente) e filtrar por valores, como numa planilha. As colunas ficam na lista `COLS` (de onde vem o valor, ordem especial da idade, filtro por mês na data, filtro só preenchido/vazio em nome, documento e telefone, valores separados por ";" em substâncias e encaminhamento). A escolha de cada pessoa fica guardada no próprio aparelho (`cais_db_vista`); "limpar" desfaz.

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
- [ ] Preencher os 6 atendimentos sem polo (Romulo disse que são PROJAD/UFRJ).

## Histórico

- 2026-11-20: campo "Seu nome (equipe)" movido para antes dos boxes Novo/Retorno.
- 2026-11-20: celular mais compacto (título curto, boxes Novo/Retorno, data sem vazar, opções preenchendo a linha, frases de ajuda retiradas; formulário cerca de 27% mais curto). Planilhão com ordenar e filtrar nos títulos. Guia refeito com as telas novas.
- 2026-11-20: guia rápido em PDF (pasta `guia/`). No planilhão, a bolinha do WhatsApp deixou de ser cortada em nomes longos.
- 2026-11-20: site novo publicado pelo Netlify a partir do repositório. A fila offline aceita registros deixados pelo site antigo no aparelho (tira o apóstrofo do documento e cria o `client_id`).
- 2026-11-20: migração da planilha para o Supabase; site passa a ler e gravar no banco; aba Banco de dados (planilhão em tempo real, edição com aprovação, WhatsApp); campo telefone; frentes do PROJAD; três atalhos em boxes no topo.
