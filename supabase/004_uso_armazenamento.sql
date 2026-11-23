-- 2026-11-23 · quanto espaço o projeto ocupa, para o e-mail semanal do backup
-- Devolve só totais em bytes (nada de dados de atendidos), então pode ser
-- lida com a chave pública. Arquivos: soma das pastas do Storage (cota de
-- 1 GB do plano free). Banco: tamanho do Postgres (cota de 500 MB).
create or replace function public.uso_armazenamento()
returns json
language sql
security definer
set search_path = ''
as $$
  select json_build_object(
    'arquivos_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'por_pasta', coalesce((select json_object_agg(bucket_id, total) from (
        select bucket_id, sum((metadata->>'size')::bigint) total from storage.objects group by bucket_id) x), '{}'::json),
    'n_arquivos', (select count(*) from storage.objects),
    'banco_bytes', pg_database_size(current_database())
  );
$$;
revoke all on function public.uso_armazenamento() from public;
grant execute on function public.uso_armazenamento() to anon, authenticated;
