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

   Não guarda os arquivos de áudio nem as fotos, só as tabelas (os
   caminhos dos arquivos ficam registrados nas abas fotos e atendimentos).
===================================================================== */
const URL_BANCO = 'https://odlexesnjlglpvrhhujd.supabase.co';
const CHAVE = 'sb_publishable_nAbw9pHMK8QJYuKCowivgQ_IHUE9MdM';
const PASTA = 'CAIS · Backups do banco';
const TABELAS = ['atendimentos', 'oficinas', 'intersetoriais', 'fotos', 'edicoes', 'encaminhamentos_doc', 'pontos_rede'];

function instalar() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'fazerBackup')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('fazerBackup').timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).inTimezone('America/Sao_Paulo').create();
  const url = fazerBackup();
  Logger.log('Backup semanal agendado (segundas, 6h). Primeira cópia: ' + url);
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

function pasta() {
  const it = DriveApp.getFoldersByName(PASTA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PASTA);
}

function fazerBackup() {
  const hoje = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm');
  const ss = SpreadsheetApp.create('CAIS backup ' + hoje);
  const resumo = [['tabela', 'linhas']];
  TABELAS.forEach((tabela, i) => {
    const linhas = lerTabela(tabela);
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
  const ab = ss.insertSheet('resumo', 0);
  ab.getRange(1, 1, resumo.length, 2).setValues(resumo);
  ab.getRange(1, 1, 1, 2).setFontWeight('bold');
  ab.getRange(resumo.length + 2, 1).setValue('Gerado em ' + hoje + ' (horário de Brasília)');
  DriveApp.getFileById(ss.getId()).moveTo(pasta());
  return ss.getUrl();
}
