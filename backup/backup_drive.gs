/* =====================================================================
   CAIS · backup semanal do banco no Google Drive
   Roda no Apps Script da conta Google do Romulo (script.google.com).
   Lê as tabelas do Supabase pela API pública (a mesma chave que o site
   usa; o banco libera leitura) e salva uma planilha Google por semana na
   pasta "CAIS · Backups do banco", uma aba por tabela.

   Instalar: colar este arquivo num projeto novo do Apps Script, salvar,
   escolher a função "instalar" e clicar em Executar. Na primeira vez o
   Google pede autorização. "instalar" já faz um backup na hora e agenda
   um por semana (segunda-feira, entre 6h e 7h).

   Arquivos: as fotos e as gravações também são copiadas, para a
   subpasta "arquivos" (uma vez cada; depois só os novos). As fotos saem
   com a chave pública. As gravações são privadas e só saem com a chave
   secreta do Supabase guardada nas Propriedades do script com o nome
   CHAVE_SECRETA (Configurações do projeto > Propriedades do script).
   Sem ela, o backup avisa no resumo e copia só as fotos.
   A chave secreta passa por cima de todas as regras do banco: fica só
   nas propriedades do script, nunca no código nem no repositório.

   E-mail: a cada backup chega um e-mail para a conta dona do script com
   o % ocupado da cota de arquivos (1 GB do plano free) e do banco
   (500 MB), lido pela função uso_armazenamento (supabase/004).
===================================================================== */
const URL_BANCO = 'https://odlexesnjlglpvrhhujd.supabase.co';
const CHAVE = 'sb_publishable_nAbw9pHMK8QJYuKCowivgQ_IHUE9MdM';
const PASTA = 'CAIS · Backups do banco';
const LIMITE_MS = 5 * 60 * 1000;   // o Apps Script para em 6 min; o que faltar vai na próxima semana
const COTA_ARQUIVOS = 1024 * 1024 * 1024;   // 1 GB do plano free
const COTA_BANCO = 500 * 1024 * 1024;       // 500 MB do plano free
const TABELAS = ['atendimentos', 'oficinas', 'intersetoriais', 'fotos', 'edicoes', 'encaminhamentos_doc', 'pontos_rede'];

function instalar() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'fazerBackup')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('fazerBackup').timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).inTimezone('America/Sao_Paulo').create();
  const url = fazerBackup();
  Logger.log('Backup semanal agendado (segundas, 6h). Primeira cópia: ' + url + '. O e-mail com o espaço ocupado foi enviado.');
}

function lerTabela(tabela) {
  let saida = [], ini = 0;
  for (;;) {
    const r = UrlFetchApp.fetch(`${URL_BANCO}/rest/v1/${tabela}?select=*&order=id.asc&limit=1000&offset=${ini}`, {
      headers: { apikey: CHAVE, Authorization: 'Bearer ' + CHAVE }, muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) throw new Error(`${tabela}: ${r.getResponseCode()} ${r.getContentText().slice(0, 200)}`);
    const parte = JSON.parse(r.getContentText());
    saida = saida.concat(parte);
    if (parte.length < 1000) return saida;
    ini += 1000;
  }
}

function subpasta(mae, nome) {
  const it = mae.getFoldersByName(nome);
  return it.hasNext() ? it.next() : mae.createFolder(nome);
}
function pasta() {
  const it = DriveApp.getFoldersByName(PASTA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PASTA);
}

// copia para o Drive os arquivos que ainda não estão lá; devolve contagens
function copiarArquivos(bucket, caminhos, chave, inicio) {
  const destino = subpasta(subpasta(pasta(), 'arquivos'), bucket);
  const r = { novos: 0, ja: 0, faltam: 0, erros: 0 };
  [...new Set(caminhos.filter(Boolean))].forEach(caminho => {
    const nome = caminho.replace(/\//g, '__');
    if (destino.getFilesByName(nome).hasNext()) { r.ja++; return; }
    if (Date.now() - inicio > LIMITE_MS) { r.faltam++; return; }
    const resp = UrlFetchApp.fetch(`${URL_BANCO}/storage/v1/object/authenticated/${bucket}/${caminho.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { apikey: chave, Authorization: 'Bearer ' + chave }, muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) { r.erros++; Logger.log(`${bucket}/${caminho}: ${resp.getResponseCode()}`); return; }
    destino.createFile(resp.getBlob().setName(nome));
    r.novos++;
  });
  return r;
}

function fazerBackup() {
  const inicio = Date.now(), lidas = {};
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm');
  const ss = SpreadsheetApp.create('CAIS backup ' + hoje);
  const resumo = [['tabela', 'linhas']];
  TABELAS.forEach((tabela, i) => {
    const linhas = lerTabela(tabela);
    lidas[tabela] = linhas;
    const aba = i === 0 ? ss.getSheets()[0].setName(tabela) : ss.insertSheet(tabela);
    const cols = [];
    linhas.forEach(l => Object.keys(l).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
    if (!cols.length) cols.push('(vazia)');
    // tudo como texto: CPF não perde zero à esquerda e nada vira fórmula
    const valores = [cols].concat(linhas.map(l => cols.map(k => {
      const v = l[k];
      if (v == null) return '';
      return typeof v === 'object' ? JSON.stringify(v) : String(v);
    })));
    const rg = aba.getRange(1, 1, valores.length, cols.length);
    rg.setNumberFormat('@');
    rg.setValues(valores);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, cols.length).setFontWeight('bold');
    resumo.push([tabela, linhas.length]);
  });
  // arquivos: fotos com a chave pública; gravações só com a chave secreta
  const fotos = copiarArquivos('fotos', lidas.fotos.map(f => f.caminho), CHAVE, inicio);
  resumo.push(['arquivos: fotos', `${fotos.novos} copiadas agora, ${fotos.ja} já estavam, ${fotos.faltam} para a próxima, ${fotos.erros} com erro`]);
  const secreta = PropertiesService.getScriptProperties().getProperty('CHAVE_SECRETA');
  if (secreta) {
    const au = copiarArquivos('audios', lidas.atendimentos.map(a => a.audio_path), secreta, inicio);
    resumo.push(['arquivos: gravações', `${au.novos} copiadas agora, ${au.ja} já estavam, ${au.faltam} para a próxima, ${au.erros} com erro`]);
  } else {
    resumo.push(['arquivos: gravações', 'NÃO copiadas: falta a propriedade CHAVE_SECRETA no script']);
  }
  const ab = ss.insertSheet('resumo', 0);
  ab.getRange(1, 1, resumo.length, 2).setValues(resumo.map(l => l.map(String)));
  ab.autoResizeColumns(1, 2);
  ab.getRange(1, 1, 1, 2).setFontWeight('bold');
  ab.getRange(resumo.length + 2, 1).setValue('Gerado em ' + hoje + ' (horário de Brasília)');
  DriveApp.getFileById(ss.getId()).moveTo(pasta());
  try { enviarUso(ss.getUrl(), resumo); } catch (e) { Logger.log('e-mail de uso falhou: ' + e); }
  return ss.getUrl();
}

const mb = b => (b / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB';
const pct = (b, cota) => (100 * b / cota).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

function lerUso() {
  const r = UrlFetchApp.fetch(`${URL_BANCO}/rest/v1/rpc/uso_armazenamento`, {
    method: 'post', contentType: 'application/json', payload: '{}',
    headers: { apikey: CHAVE, Authorization: 'Bearer ' + CHAVE }, muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) throw new Error('uso_armazenamento: ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 200));
  return JSON.parse(r.getContentText());
}

function barra(b, cota) {
  const p = Math.min(100, 100 * b / cota), cor = p >= 85 ? '#C0392B' : p >= 70 ? '#D99A1B' : '#0B7A63';
  return `<div style="background:#E6EEEA;border-radius:6px;height:12px;width:320px;overflow:hidden"><div style="background:${cor};height:12px;width:${Math.max(p, 0.5)}%"></div></div>`;
}

// e-mail semanal: quanto da cota de 1 GB de arquivos está ocupado
function enviarUso(urlBackup, resumo) {
  const u = lerUso();
  const arq = Number(u.arquivos_bytes) || 0, banco = Number(u.banco_bytes) || 0;
  const pp = u.por_pasta || {};
  const nomes = { audios: 'Gravações', fotos: 'Fotos' };
  const p = 100 * arq / COTA_ARQUIVOS;
  const alerta = p >= 85 ? 'Atenção: quase cheio. Hora de apagar do Supabase as gravações antigas que já estão no Drive.'
    : p >= 70 ? 'Aviso: passou de 70%. Vale planejar a limpeza das gravações antigas que já estão no Drive.' : '';
  const linhasPasta = Object.keys(pp).sort().map(k => `<tr><td style="padding:2px 12px 2px 0">${nomes[k] || k}</td><td>${mb(Number(pp[k]))}</td></tr>`).join('')
    || '<tr><td>Nenhum arquivo ainda</td></tr>';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#10312C">
    <h2 style="margin:0 0 4px">CAIS Pesquisa · espaço ocupado</h2>
    <p style="margin:0 0 14px;color:#5B6F69">Plano gratuito do Supabase</p>
    ${alerta ? `<p style="background:#FFF4DC;border:1px solid #EED9AC;border-radius:8px;padding:8px 10px"><b>${alerta}</b></p>` : ''}
    <p style="margin:0 0 4px"><b>Arquivos: ${pct(arq, COTA_ARQUIVOS)} de 1 GB</b> (${mb(arq)}, ${u.n_arquivos} arquivo${u.n_arquivos == 1 ? '' : 's'})</p>
    ${barra(arq, COTA_ARQUIVOS)}
    <table style="margin:8px 0 16px;font-size:13px">${linhasPasta}</table>
    <p style="margin:0 0 4px"><b>Banco de dados: ${pct(banco, COTA_BANCO)} de 500 MB</b> (${mb(banco)})</p>
    ${barra(banco, COTA_BANCO)}
    <p style="margin:18px 0 6px"><b>Backup desta semana</b></p>
    <table style="font-size:13px">${resumo.slice(1).map(l => `<tr><td style="padding:2px 12px 2px 0">${l[0]}</td><td>${l[1]}</td></tr>`).join('')}</table>
    <p><a href="${urlBackup}">Abrir a cópia no Drive</a></p>
  </div>`;
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: `CAIS · arquivos ocupando ${pct(arq, COTA_ARQUIVOS)} de 1 GB` + (alerta ? ' · atenção' : ''),
    htmlBody: html
  });
}
