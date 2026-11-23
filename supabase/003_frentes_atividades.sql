-- 2026-11-23 · frentes do PROJAD (RUAS, Capoeira, CnaR, PROJAD PV) também nas
-- atividades coletivas e nos encontros intersetoriais, no mesmo formato de
-- atendimentos.frentes ("RUAS; Capoeira"). Só é preenchido quando o polo é PROJAD/UFRJ.
alter table public.oficinas add column if not exists frentes text;
alter table public.intersetoriais add column if not exists frentes text;
