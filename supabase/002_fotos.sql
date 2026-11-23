-- 2026-11-23 · fotos das atividades coletivas e dos encontros intersetoriais
-- Cada foto é uma linha em public.fotos, ligada ao lançamento pelo client_id
-- (uuid) da linha em oficinas ou intersetoriais. O arquivo fica na pasta
-- privada "fotos" do Storage; o site mostra por link assinado.
-- Acesso segue a decisão do projeto (site aberto): qualquer pessoa com o site
-- vê e envia fotos; só o administrador altera ou apaga.

-- todo lançamento passa a ter client_id (os 52 + 19 migrados da planilha não tinham)
alter table public.oficinas alter column client_id set default gen_random_uuid();
alter table public.intersetoriais alter column client_id set default gen_random_uuid();
update public.oficinas set client_id = gen_random_uuid() where client_id is null;
update public.intersetoriais set client_id = gen_random_uuid() where client_id is null;

create table public.fotos (
  id bigint generated always as identity primary key,
  client_id uuid unique,                        -- evita duplicar quando a fila offline reenvia
  criado_em timestamptz not null default now(),
  origem text not null check (origem in ('oficinas','intersetoriais')),
  registro uuid not null,                       -- client_id do lançamento
  caminho text not null,                        -- caminho na pasta "fotos" do Storage
  enviado_por text
);
create index fotos_registro on public.fotos (registro);

alter table public.fotos enable row level security;
grant select, insert on public.fotos to anon, authenticated;
grant update, delete on public.fotos to authenticated;
create policy ler on public.fotos for select to anon, authenticated using (true);
create policy lancar on public.fotos for insert to anon, authenticated with check (true);
create policy admin_altera on public.fotos for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy admin_apaga on public.fotos for delete to authenticated using (public.eh_admin());

alter publication supabase_realtime add table public.fotos;

-- pasta das fotos: privada (sem link público), 10 MB por arquivo, só imagem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;
create policy fotos_enviar on storage.objects for insert to anon, authenticated with check (bucket_id = 'fotos');
create policy fotos_ver on storage.objects for select to anon, authenticated using (bucket_id = 'fotos');
create policy fotos_apagar on storage.objects for delete to authenticated using (bucket_id = 'fotos' and public.eh_admin());
