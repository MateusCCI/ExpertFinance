-- ===== ORÇAMENTO MENSAL POR CATEGORIA =====
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month int not null,
  year int not null,
  amount numeric(12,2) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, category_id, month, year)
);

create index idx_budgets_user_date on public.budgets(user_id, year, month);
alter table public.budgets enable row level security;
create policy "Users manage own budgets" on public.budgets for all using (auth.uid() = user_id);

-- ===== METAS FINANCEIRAS =====
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  deadline date,
  account_id uuid references public.accounts(id),
  icon text,
  color text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_goals_user on public.savings_goals(user_id);
alter table public.savings_goals enable row level security;
create policy "Users manage own goals" on public.savings_goals for all using (auth.uid() = user_id);

-- ===== PADRÕES DE AUTO-CATEGORIZAÇÃO =====
create table public.category_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pattern text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  priority int not null default 0,
  created_at timestamptz default now()
);

create index idx_patterns_user on public.category_patterns(user_id);
create index idx_patterns_priority on public.category_patterns(user_id, priority desc);
alter table public.category_patterns enable row level security;
create policy "Users manage own patterns" on public.category_patterns for all using (auth.uid() = user_id);

-- ===== ALERTAS =====
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  severity text not null default 'info',
  is_read boolean not null default false,
  action_url text,
  created_at timestamptz default now()
);

create index idx_alerts_user on public.alerts(user_id, is_read, created_at desc);
alter table public.alerts enable row level security;
create policy "Users manage own alerts" on public.alerts for all using (auth.uid() = user_id);

-- ===== HISTÓRICO DE LIMITES (para gráfico de evolução) =====
create table public.credit_card_limit_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  old_limit numeric(12,2),
  new_limit numeric(12,2) not null,
  changed_at timestamptz default now()
);

create index idx_limit_history_card on public.credit_card_limit_history(card_id, changed_at desc);
alter table public.credit_card_limit_history enable row level security;
create policy "Users view own card history" on public.credit_card_limit_history for all
  using (exists (select 1 from public.credit_cards c where c.id = card_id and c.user_id = auth.uid()));

-- ===== CONSUMOS DO PROPRIETÁRIO =====
create table public.landlord_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null,
  source_name text not null,
  source_type text not null default 'card',
  purchase_type text not null default 'single',
  installment_current int,
  installment_total int,
  purchase_date date not null default current_date,
  created_at timestamptz default now()
);

create index idx_lp_user on public.landlord_purchases(user_id);
create index idx_lp_date on public.landlord_purchases(user_id, purchase_date desc);
alter table public.landlord_purchases enable row level security;
create policy "lp" on public.landlord_purchases for all using (auth.uid() = user_id);
