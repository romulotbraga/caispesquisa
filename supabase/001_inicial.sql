-- CAIS · estrutura inicial do banco (organização CAIS Pesquisa, projeto CAIS Pesquisa, ref odlexesnjlglpvrhhujd)
-- Modelo de acesso: aberto para ler e lançar (como era com a planilha);
-- alterar atendimento já lançado só com aprovação do administrador.

create or replace function public.eh_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(lower(auth.jwt() ->> 'email') = 'romulotbraga@gmail.com', false)
$$;

-- ---------------------------------------------------------------- atendimentos
create table public.atendimentos (
  id bigint generated always as identity primary key,
  client_id uuid unique,                       -- evita duplicar quando a fila offline reenvia
  registro_em timestamptz not null default now(),
  data date,
  polo text, frentes text,
  equipe text, nome text, id_pessoa text not null,
  tipo_registro text, n_atendimento integer,
  faixa_etaria text, genero text, genero_outro text, lgbtqiapn text, raca_cor text,
  moradia text, tempo_rua text, endereco text, bairro text, telefone text,
  catador text, egresso_prisional text,
  substancias text, substancias_n integer, uso_multiplo text, substancias_outras text,
  vinculo_raps text, vinculo_raps_qual text, vinculo_suas text, vinculo_suas_qual text,
  primeiro_contato text, programa_social text, documentacao text, doc_numero text,
  demanda text, demanda_descricao text, satisfacao text,
  audio_nome text, audio_url text, audio_path text,
  encaminhamento text, encaminhamento_qual text, encaminhamento_efetivado text,
  foto_em text, foto_nome text, foto_url text
);
create index atendimentos_pessoa on public.atendimentos (id_pessoa);
create index atendimentos_data on public.atendimentos (data);

create or replace function public.atendimento_antes_inserir() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.n_atendimento is null then
    select count(*) + 1 into new.n_atendimento from public.atendimentos where id_pessoa = new.id_pessoa;
  end if;
  return new;
end $$;
create trigger atendimento_antes_inserir before insert on public.atendimentos
  for each row execute function public.atendimento_antes_inserir();

-- ---------------------------------------------------------------- oficinas e intersetoriais
create table public.oficinas (
  id bigint generated always as identity primary key,
  client_id uuid unique,
  registro_em timestamptz not null default now(),
  data date, polo text, atividade text, participantes integer, observacoes text
);
create table public.intersetoriais (
  id bigint generated always as identity primary key,
  client_id uuid unique,
  registro_em timestamptz not null default now(),
  data date, polo text, setores text, participantes integer, pauta text
);

-- ---------------------------------------------------------------- mapa de encaminhamentos
create table public.pontos_rede (
  id text primary key,
  nome text, categoria text, endereco text, bairro text,
  lat double precision, lng double precision,
  telefone text, whatsapp text, email text, link text, obs text,
  fonte text, fonte_contato text, situacao text not null default 'ativo',
  criado_em timestamptz default now(), criado_por text,
  alterado_em timestamptz, alterado_por text
);
create table public.encaminhamentos_doc (
  id bigint generated always as identity primary key,
  client_id uuid unique,
  registro_em timestamptz not null default now(),
  equipe text, polo text, id_pessoa text, nome text, doc_numero text,
  motivo text, destino text, destino_id text, texto text
);

-- ---------------------------------------------------------------- edições pendentes
create table public.edicoes (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  atendimento_id bigint not null references public.atendimentos (id) on delete cascade,
  proposto_por text,
  mudancas jsonb not null,          -- { campo: valor novo }
  antes jsonb,                      -- { campo: valor na hora da proposta }
  estado text not null default 'pendente' check (estado in ('pendente','aprovada','recusada')),
  decidido_em timestamptz, decidido_por text
);
create index edicoes_estado on public.edicoes (estado);

-- Aprova ou recusa uma edição. Só o administrador.
create or replace function public.decidir_edicao(p_id bigint, p_aprovar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e public.edicoes;
  k text; v text; tipo text;
  bloqueados text[] := array['id','client_id','registro_em','id_pessoa','n_atendimento','audio_nome','audio_url','audio_path'];
begin
  if not public.eh_admin() then raise exception 'Só o administrador pode aprovar edições.'; end if;
  select * into e from public.edicoes where id = p_id and estado = 'pendente' for update;
  if not found then raise exception 'Edição não encontrada ou já decidida.'; end if;
  if p_aprovar then
    for k, v in select * from jsonb_each_text(e.mudancas) loop
      if k = any(bloqueados) then continue; end if;
      select data_type into tipo from information_schema.columns
        where table_schema = 'public' and table_name = 'atendimentos' and column_name = k;
      if tipo is null then continue; end if;
      execute format('update public.atendimentos set %I = nullif($1, '''')::%s where id = $2', k, tipo)
        using v, e.atendimento_id;
    end loop;
  end if;
  update public.edicoes set estado = case when p_aprovar then 'aprovada' else 'recusada' end,
    decidido_em = now(), decidido_por = auth.jwt() ->> 'email' where id = p_id;
end $$;
revoke all on function public.decidir_edicao(bigint, boolean) from public, anon;
grant execute on function public.decidir_edicao(bigint, boolean) to authenticated;

-- ---------------------------------------------------------------- acesso (RLS)
alter table public.atendimentos enable row level security;
alter table public.oficinas enable row level security;
alter table public.intersetoriais enable row level security;
alter table public.pontos_rede enable row level security;
alter table public.encaminhamentos_doc enable row level security;
alter table public.edicoes enable row level security;

grant select, insert on public.atendimentos, public.oficinas, public.intersetoriais,
  public.encaminhamentos_doc, public.edicoes to anon, authenticated;
grant select, insert, update on public.pontos_rede to anon, authenticated;
grant update, delete on public.atendimentos, public.oficinas, public.intersetoriais,
  public.encaminhamentos_doc, public.edicoes to authenticated;

create policy ler on public.atendimentos for select to anon, authenticated using (true);
create policy lancar on public.atendimentos for insert to anon, authenticated with check (true);
create policy admin_altera on public.atendimentos for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy admin_apaga on public.atendimentos for delete to authenticated using (public.eh_admin());

create policy ler on public.oficinas for select to anon, authenticated using (true);
create policy lancar on public.oficinas for insert to anon, authenticated with check (true);
create policy admin_altera on public.oficinas for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy admin_apaga on public.oficinas for delete to authenticated using (public.eh_admin());

create policy ler on public.intersetoriais for select to anon, authenticated using (true);
create policy lancar on public.intersetoriais for insert to anon, authenticated with check (true);
create policy admin_altera on public.intersetoriais for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy admin_apaga on public.intersetoriais for delete to authenticated using (public.eh_admin());

create policy ler on public.pontos_rede for select to anon, authenticated using (true);
create policy lancar on public.pontos_rede for insert to anon, authenticated with check (true);
create policy alterar on public.pontos_rede for update to anon, authenticated using (true) with check (true);

create policy ler on public.encaminhamentos_doc for select to anon, authenticated using (true);
create policy lancar on public.encaminhamentos_doc for insert to anon, authenticated with check (true);
create policy admin_apaga on public.encaminhamentos_doc for delete to authenticated using (public.eh_admin());

create policy ler on public.edicoes for select to anon, authenticated using (true);
create policy propor on public.edicoes for insert to anon, authenticated
  with check (estado = 'pendente' and decidido_em is null and decidido_por is null);
create policy admin_apaga on public.edicoes for delete to authenticated using (public.eh_admin());

-- ---------------------------------------------------------------- tempo real
alter publication supabase_realtime add table public.atendimentos, public.oficinas,
  public.intersetoriais, public.edicoes;

-- ---------------------------------------------------------------- áudios (bucket privado)
insert into storage.buckets (id, name, public, file_size_limit)
values ('audios', 'audios', false, 26214400) on conflict (id) do nothing;
create policy audios_enviar on storage.objects for insert to anon, authenticated with check (bucket_id = 'audios');
create policy audios_ouvir on storage.objects for select to authenticated using (bucket_id = 'audios' and public.eh_admin());
