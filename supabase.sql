create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  data_hora timestamp with time zone not null,
  prioridade text not null default 'media',
  minutos_antes integer not null default 15,
  email text,
  status text not null default 'pendente',
  notificado_email boolean not null default false,
  criado_em timestamp with time zone not null default now()
);

alter table public.tarefas enable row level security;

-- Para projeto interno simples sem login.
-- Qualquer pessoa com o link e a chave anon consegue ler/alterar.
-- Se quiser login futuramente, trocamos essas políticas.
create policy "Permitir leitura anonima" on public.tarefas
for select using (true);

create policy "Permitir inserir anonimo" on public.tarefas
for insert with check (true);

create policy "Permitir atualizar anonimo" on public.tarefas
for update using (true);

create policy "Permitir excluir anonimo" on public.tarefas
for delete using (true);
