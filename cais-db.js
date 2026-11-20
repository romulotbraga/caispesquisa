/* =====================================================================
   CAIS · acesso ao banco (Supabase)
   Usado por index.html (coleta, banco de dados, painel) e por
   encaminhamentos.html (mapa). A chave abaixo é a chave pública do
   projeto: o que cada um pode fazer é decidido pelas regras do banco
   (ver supabase/001_inicial.sql), não por esta chave.
===================================================================== */
const CAIS = (() => {
  const URL_BANCO = 'https://odlexesnjlglpvrhhujd.supabase.co';
  const CHAVE = 'sb_publishable_nAbw9pHMK8QJYuKCowivgQ_IHUE9MdM';
  const ADMIN = 'romulotbraga@gmail.com';

  // se a biblioteca não carregou (sem internet), sb fica nulo e a coleta cai na fila do aparelho
  let sb = null;
  try {
    if (window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(URL_BANCO, CHAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    }
  } catch (e) { sb = null; }

  function exigir() { if (!sb) throw new Error('sem conexão com o banco'); return sb; }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // texto vazio vira nulo: coluna de data ou de número não aceita ''
  function limpar(obj) {
    const o = {};
    Object.keys(obj).forEach(k => { const v = obj[k]; o[k] = (v === '' || v === undefined) ? null : v; });
    return o;
  }
  const inteiro = v => { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d ? parseInt(d.slice(0, 9), 10) : null; };

  // lê a tabela inteira, de mil em mil linhas
  async function todos(tabela, coluna, crescente) {
    const c = exigir(); let ini = 0, saida = [];
    for (;;) {
      const { data, error } = await c.from(tabela).select('*').order(coluna || 'id', { ascending: crescente !== false }).range(ini, ini + 999);
      if (error) throw new Error(error.message);
      saida = saida.concat(data);
      if (data.length < 1000) break;
      ini += 1000;
    }
    return saida;
  }

  // insere uma linha; reenvio da fila offline com o mesmo client_id conta como sucesso
  async function inserir(tabela, linha) {
    const { error } = await exigir().from(tabela).insert(limpar(linha));
    if (error && error.code !== '23505') throw new Error(error.message);
  }

  /* Uma pessoa por id_pessoa, a partir das linhas de atendimentos (mais antigas primeiro).
     Os dados da pessoa são os do atendimento mais recente. */
  function pessoasDe(atends, camposPessoa) {
    const mapa = new Map();
    atends.forEach(a => {
      if (!a.id_pessoa) return;
      let p = mapa.get(a.id_pessoa);
      if (!p) { p = { id_pessoa: a.id_pessoa, n: 0, atendimentos: [], ultimo_encaminhamento: '', equipe: '' }; mapa.set(a.id_pessoa, p); }
      p.n++; p.atendimentos.push(a);
      if (a.equipe) p.equipe = a.equipe;
      if (a.encaminhamento && a.encaminhamento !== 'Não houve') {
        p.ultimo_encaminhamento = a.encaminhamento + (a.encaminhamento_qual ? ' (' + a.encaminhamento_qual + ')' : '');
      }
      p.ultimo = a;
    });
    return [...mapa.values()].map(p => {
      const u = p.ultimo, campos = {};
      (camposPessoa || []).forEach(k => { campos[k] = u[k] == null ? '' : String(u[k]); });
      return { id_pessoa: p.id_pessoa, nome: u.nome || '', doc_numero: u.doc_numero || '', telefone: u.telefone || '',
        equipe: p.equipe, ultima_data: u.data || '', n: p.n, ultimo_encaminhamento: p.ultimo_encaminhamento,
        campos, ultimo: u, atendimentos: p.atendimentos };
    });
  }

  /* Telefone → número do WhatsApp (55 + DDD + número). Sem DDD, assume 21. */
  function foneWa(v) {
    const pedacos = String(v || '').split(/\s*(?:\/|;|,|\bou\b|\be\b)\s*/);
    const nums = pedacos.map(t => {
      let d = String(t || '').replace(/\D/g, '').replace(/^0+/, '');
      if (d.length === 12 || d.length === 13) { if (d.startsWith('55')) return d; }
      if (d.length === 8 || d.length === 9) d = '21' + d;
      if (d.length === 10 || d.length === 11) d = '55' + d;
      return /^55\d{10,11}$/.test(d) ? d : '';
    }).filter(Boolean);
    return nums.find(d => /^55\d{2}9\d{8}$/.test(d)) || nums[0] || '';
  }

  /* ---------------- administrador ---------------- */
  let sessao = null;
  const ouvintes = [];
  const ehAdmin = () => !!(sessao && sessao.user && String(sessao.user.email || '').toLowerCase() === ADMIN);
  function aoMudarSessao(f) { ouvintes.push(f); }
  if (sb) {
    sb.auth.getSession().then(r => { sessao = r.data ? r.data.session : null; ouvintes.forEach(f => f()); });
    sb.auth.onAuthStateChange((_ev, s) => { sessao = s; ouvintes.forEach(f => f()); });
  }
  async function pedirLink(email) {
    const { error } = await exigir().auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
    if (error) throw new Error(error.message);
  }
  // plano B: colar o link (ou o código) que chegou no e-mail, para quando o link não abre o site
  async function entrarComLink(texto, email) {
    const t = String(texto || '').trim();
    let r;
    if (/^\d{6,8}$/.test(t)) r = await exigir().auth.verifyOtp({ email, token: t, type: 'email' });
    else {
      const m = t.match(/[?&]token(?:_hash)?=([^&\s]+)/), ty = t.match(/[?&]type=([a-z_]+)/);
      if (!m) throw new Error('não achei o código nesse link');
      r = await exigir().auth.verifyOtp({ token_hash: decodeURIComponent(m[1]), type: ty ? ty[1] : 'magiclink' });
    }
    if (r.error) throw new Error(r.error.message);
  }
  async function sair() { if (sb) await sb.auth.signOut(); }

  return { URL_BANCO, ADMIN, get sb() { return sb; }, exigir, uuid, limpar, inteiro, todos, inserir, pessoasDe, foneWa,
    ehAdmin, aoMudarSessao, pedirLink, entrarComLink, sair, get email() { return sessao && sessao.user ? sessao.user.email : ''; } };
})();
