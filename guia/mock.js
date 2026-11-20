(() => {
  const hoje = '2026-11-20';
  const T = {
    atendimentos: [
      { id:1, registro_em:'2026-10-01T12:00:00Z', data:'2026-10-01', polo:'PROJAD/UFRJ', frentes:'RUAS', equipe:'Carla (exemplo)', nome:'Maria Exemplo da Silva', id_pessoa:'PEX1', tipo_registro:'Novo cadastro', n_atendimento:1, faixa_etaria:'30–44', genero:'Mulher cis', raca_cor:'Preta', moradia:'Situação de rua >12m', bairro:'Copacabana', substancias:'Álcool; Tabaco', substancias_n:2, documentacao:'Possui parcialmente', doc_numero:'00000000191', demanda:'Documentação', demanda_descricao:'Precisa da segunda via do RG.', satisfacao:'Positivo', encaminhamento:'CAPS AD', encaminhamento_qual:'CAPS AD Exemplo', telefone:'(21) 90000-0001', vinculo_raps:'Não', vinculo_suas:'Não', lgbtqiapn:'Não', catador:'Não', egresso_prisional:'Não', programa_social:'Não' },
      { id:2, registro_em:'2026-10-20T12:00:00Z', data:'2026-10-20', polo:'PROJAD/UFRJ', frentes:'RUAS', equipe:'Carla (exemplo)', nome:'Maria Exemplo da Silva', id_pessoa:'PEX1', tipo_registro:'Retorno', n_atendimento:2, faixa_etaria:'30–44', genero:'Mulher cis', raca_cor:'Preta', moradia:'Acolhimento', bairro:'Copacabana', substancias:'Álcool', substancias_n:1, documentacao:'Possui', doc_numero:'00000000191', demanda:'Cuidados médicos', demanda_descricao:'Voltou para contar que foi atendida no CAPS.', satisfacao:'Positivo', encaminhamento:'Não houve', encaminhamento_efetivado:'Sim, chegou ao serviço', telefone:'(21) 90000-0001' },
      { id:3, registro_em:'2026-11-05T12:00:00Z', data:'2026-11-05', polo:'Espaço Normal', equipe:'Pedro (exemplo)', nome:'João Modelo Pereira', id_pessoa:'PEX2', tipo_registro:'Novo cadastro', n_atendimento:1, faixa_etaria:'45–59', genero:'Homem cis', raca_cor:'Parda', moradia:'Situação de rua ≤12m', bairro:'Lapa', substancias:'Nega uso', substancias_n:0, documentacao:'Não possui', demanda:'Documentação', satisfacao:'Positivo', encaminhamento:'CRAS', encaminhamento_qual:'CRAS Exemplo' },
      { id:4, registro_em:'2026-11-10T12:00:00Z', data:'2026-11-10', polo:'PROJAD/UFRJ', frentes:'Capoeira', equipe:'Carla (exemplo)', nome:'Ana Fictícia Souza', id_pessoa:'PEX3', tipo_registro:'Novo cadastro', n_atendimento:1, faixa_etaria:'18–29', genero:'Mulher trans', raca_cor:'Branca', moradia:'Acolhimento', bairro:'Glória', substancias:'Cannabis', substancias_n:1, documentacao:'Possui', doc_numero:'00000000272', demanda:'Cuidados médicos', satisfacao:'Positivo', encaminhamento:'Clínica da Família / CnaR', telefone:'(21) 90000-0003' },
      { id:5, registro_em:'2026-11-12T12:00:00Z', data:'2026-11-12', polo:'Espaço Normal', equipe:'Pedro (exemplo)', nome:'José Demonstração Lima', id_pessoa:'PEX4', tipo_registro:'Novo cadastro', n_atendimento:1, faixa_etaria:'≥60', genero:'Homem cis', raca_cor:'Preta', moradia:'Domicílio fixo', bairro:'Centro', substancias:'Tabaco', substancias_n:1, documentacao:'Possui', demanda:'Outros', satisfacao:'Negativo', encaminhamento:'Não houve' },
    ],
    oficinas: [{ id:1, registro_em:'2026-10-02T00:00:00Z', data:'2026-10-02', polo:'PROJAD/UFRJ', atividade:'Capoeira', participantes:12 }],
    intersetoriais: [{ id:1, registro_em:'2026-10-03T00:00:00Z', data:'2026-10-03', polo:'PROJAD/UFRJ', setores:'Saúde', participantes:5 }],
    edicoes: [], pontos_rede: [], encaminhamentos_doc: []
  };
  window.__T = T; window.__LOG = []; window.__sessao = null; let authCb = null; let rtCb = null;
  const seq = {}; const prox = t => (seq[t] = (seq[t] || Math.max(0, ...T[t].map(r => +r.id || 0))) + 1);
  function Q(t) {
    const q = { _op:'select', _ord:null, _asc:true };
    q.select = () => { if (q._op !== 'insert') q._op = 'select'; else q._ret = true; return q; };
    q.order = (c, o) => { q._ord = c; q._asc = !o || o.ascending !== false; return q; };
    q.range = (a, b) => { q._r = [a, b]; return q; };
    q.insert = row => { q._op = 'insert'; q._row = row; return q; };
    q.update = row => { q._op = 'update'; q._row = row; return q; };
    q.upsert = rows => { q._op = 'upsert'; q._row = rows; return q; };
    q.eq = (c, v) => { q._eq = [c, v]; return q; };
    q.single = () => { q._single = true; return q; };
    q.then = (res, rej) => Promise.resolve().then(() => {
      if (q._op === 'select') { let d = T[t].slice(); if (q._ord) d.sort((a, b) => (String(a[q._ord]) > String(b[q._ord]) ? 1 : -1) * (q._asc ? 1 : -1)); if (q._r) d = d.slice(q._r[0], q._r[1] + 1); return { data: JSON.parse(JSON.stringify(d)), error: null }; }
      if (q._op === 'insert') { if (window.__falhar) return { data:null, error:{ message:'Failed to fetch' } }; const r = Object.assign({}, q._row); if (t !== 'pontos_rede') r.id = prox(t); if (t === 'atendimentos' && r.n_atendimento == null) r.n_atendimento = T[t].filter(x => x.id_pessoa === r.id_pessoa).length + 1; if (t === 'edicoes') { r.estado = 'pendente'; r.criado_em = new Date().toISOString(); } T[t].push(r); window.__LOG.push(['insert', t, r]); if (rtCb) setTimeout(rtCb, 10); return { data: q._single ? r : [r], error: null }; }
      if (q._op === 'update') { T[t].filter(x => x[q._eq[0]] === q._eq[1]).forEach(x => Object.assign(x, q._row)); window.__LOG.push(['update', t, q._row]); return { data: null, error: null }; }
      return { data: null, error: null };
    }).then(res, rej);
    return q;
  }
  window.supabase = { createClient: () => ({
    from: Q,
    rpc: async (f, a) => { window.__LOG.push(['rpc', f, a]); const e = T.edicoes.find(x => x.id === a.p_id); if (!window.__sessao) return { error: { message: 'Só o administrador pode aprovar edições.' } }; if (e) { e.estado = a.p_aprovar ? 'aprovada' : 'recusada'; if (a.p_aprovar) Object.assign(T.atendimentos.find(x => x.id === e.atendimento_id), e.mudancas); } return { error: null }; },
    storage: { from: () => ({ upload: async (p) => { window.__LOG.push(['upload', p]); return { error: null }; }, createSignedUrl: async () => ({ data: { signedUrl: 'about:blank' }, error: null }) }) },
    channel: () => { const c = { on: (_a, _b, cb) => { rtCb = cb; return c; }, subscribe: cb => { setTimeout(() => cb && cb('SUBSCRIBED'), 5); return c; } }; return c; },
    auth: { getSession: async () => ({ data: { session: window.__sessao } }), onAuthStateChange: cb => { authCb = cb; }, signInWithOtp: async () => ({ error: null }), verifyOtp: async () => ({ error: null }), signOut: async () => { window.__sessao = null; authCb && authCb('SIGNED_OUT', null); } }
  }) };
  window.__entrarAdmin = () => { window.__sessao = { user: { email: 'romulotbraga@gmail.com' } }; authCb && authCb('SIGNED_IN', window.__sessao); };
})();
