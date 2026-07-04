-- ============================================
-- EXPERTFINANCE - SCHEMA COMPLETO DO BANCO
-- ============================================
-- Projeto: Sistema de Controle Financeiro Pessoal
-- Stack: React + Vite + Supabase (PostgreSQL)
-- Hospedagem: Vercel (Plano Hobby)
-- Autor: MiMoCode
-- ============================================

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- ============================================
-- ENUMS (Tipos personalizados)
-- ============================================

-- Papel do usuário no sistema
create type user_role as enum ('admin', 'user', 'member');

-- Tipos de conta bancária
create type account_type as enum ('checking', 'savings', 'investment', 'credit_card', 'cash');

-- Status do cartão de crédito
create type card_status as enum ('active', 'blocked', 'cancelled');

-- Tipos de transação financeira
create type transaction_type as enum ('income', 'expense', 'transfer');

-- Tags de liquidação (para aluguel e livro razão)
create type settlement_tag as enum ('rent_abatement', 'ledger_credit', 'ledger_debit', 'normal');

-- Status de sincronização offline
create type sync_status as enum ('synced', 'pending', 'conflict');

-- Gatilhos de missões bancárias
create type mission_trigger as enum ('boleto_count', 'pix_sent_count', 'pix_received_count', 'spending_on_account', 'min_balance', 'card_purchases', 'invoice_payments');

-- Tipos de bônus de missão
create type bonus_type as enum ('yield_boost', 'cashback_boost', 'fee_waiver');

-- Frequência de transações recorrentes
create type recur_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');

-- ============================================
-- TABELA: profiles (Perfil do usuário)
-- Estende auth.users com dados adicionais
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role user_role default 'user',
  monthly_income numeric(12,2),
  reserve_fund_percentage numeric(5,2),
  currency text default 'BRL',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "p" on public.profiles for all using (auth.uid() = id);

-- Trigger: cria perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data->>'name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- TABELA: accounts (Contas bancárias)
-- Ex: Nubank, Itaú, XP Investimentos, Dinheiro
-- ============================================
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type account_type not null,
  balance numeric(12,2) not null default 0,
  institution text,
  color text,
  is_active boolean not null default true,
  annual_yield numeric(5,2),
  last_yield_date timestamptz,
  sync_status sync_status default 'synced',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_accounts_user on public.accounts(user_id);
alter table public.accounts enable row level security;
create policy "a" on public.accounts for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: credit_cards (Cartões de crédito)
-- Suporta hierarquia: cartão físico → virtuais
-- ============================================
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  brand text,
  last_digits text,
  total_limit numeric(12,2) not null,
  available_limit numeric(12,2) not null,
  closing_day int not null,
  due_day int not null,
  annual_fee numeric(12,2),
  spend_target_for_waiver numeric(12,2),
  cashback_rate numeric(5,2),
  cashback_balance numeric(12,2) default 0,
  parent_card_id uuid references public.credit_cards(id),
  status card_status not null default 'active',
  sync_status sync_status default 'synced',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_cc_user on public.credit_cards(user_id);
alter table public.credit_cards enable row level security;
create policy "cc" on public.credit_cards for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: categories (Categorias de transações)
-- Organiza gastos: Alimentação, Transporte, etc.
-- ============================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  is_default boolean default false,
  parent_id uuid references public.categories(id),
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy "cat" on public.categories for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: third_party_ledger (Livro razão)
-- Conta-corrente com terceiros (quem deve, a quem deve)
-- ============================================
create table public.third_party_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  person_name text not null,
  person_nickname text,
  balance numeric(12,2) not null default 0,
  last_activity_date timestamptz,
  notes text,
  sync_status sync_status default 'synced',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.third_party_ledger enable row level security;
create policy "tp" on public.third_party_ledger for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: transactions (Transações financeiras)
-- Toda movimentação: entradas, saídas, transferências
-- ============================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  credit_card_id uuid references public.credit_cards(id),
  category_id uuid references public.categories(id),
  type transaction_type not null,
  amount numeric(12,2) not null,
  description text not null,
  date timestamptz not null,
  installment_count int,
  installment_number int,
  installment_group_id text,
  destination_account_id uuid references public.accounts(id),
  settlement_tag settlement_tag default 'normal',
  settled_person_id uuid references public.third_party_ledger(id),
  notes text,
  is_recurring boolean default false,
  recurring_id text,
  sync_status sync_status default 'synced',
  client_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_tx_user on public.transactions(user_id);
create index idx_tx_account on public.transactions(account_id);
create index idx_tx_date on public.transactions(user_id, date);
alter table public.transactions enable row level security;
create policy "tx" on public.transactions for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: invoices (Faturas de cartão de crédito)
-- Controle de faturas mensais por cartão
-- ============================================
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  month int not null,
  year int not null,
  total_amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  is_paid boolean not null default false,
  due_date timestamptz not null,
  closing_date timestamptz not null,
  rent_abatement_amount numeric(12,2),
  sync_status sync_status default 'synced',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.invoices enable row level security;
create policy "inv" on public.invoices for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: rent_config (Configuração de aluguel)
-- Dados do contrato de locação
-- ============================================
create table public.rent_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  landlord_name text not null,
  monthly_rent_amount numeric(12,2) not null,
  due_day int not null,
  pix_key text,
  accumulated_landlord_spending numeric(12,2) default 0,
  payment_account_id uuid references public.accounts(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.rent_config enable row level security;
create policy "rc" on public.rent_config for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: bank_missions (Missões bancárias)
-- Gamificação:Complete metas para ganhar bônus
-- ============================================
create table public.bank_missions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  trigger_type mission_trigger not null,
  trigger_target numeric(12,2) not null,
  trigger_account_type account_type,
  bonus_type bonus_type not null,
  bonus_description text not null,
  bonus_value numeric(5,2),
  institution text,
  is_active boolean not null default true,
  icon text,
  created_at timestamptz default now()
);
alter table public.bank_missions enable row level security;
create policy "bm" on public.bank_missions for all using (true);

-- ============================================
-- TABELA: ledger_transactions (Transações do livro razão)
-- Movimentações entre você e terceiros
-- ============================================
create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  person_id uuid not null references public.third_party_ledger(id) on delete cascade,
  type text not null,
  amount numeric(12,2) not null,
  description text not null,
  date timestamptz not null,
  created_at timestamptz default now()
);
create index idx_ltx_user on public.ledger_transactions(user_id);
create index idx_ltx_person on public.ledger_transactions(person_id);
alter table public.ledger_transactions enable row level security;
create policy "ltx" on public.ledger_transactions for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: mission_progress (Progresso de missões)
-- Acompanha quanto cada usuário completou
-- ============================================
create table public.mission_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.bank_missions(id) on delete cascade,
  current_count numeric(12,2) not null default 0,
  target_count numeric(12,2) not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  year int not null,
  month int not null,
  target_account_id uuid references public.accounts(id),
  bonus_unlocked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.mission_progress enable row level security;
create policy "mp" on public.mission_progress for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: recurring_transactions (Transações recorrentes)
-- Assinaturas, prestações fixas, etc.
-- ============================================
create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  credit_card_id uuid references public.credit_cards(id),
  category_id uuid references public.categories(id),
  type transaction_type not null,
  amount numeric(12,2) not null,
  description text not null,
  frequency recur_frequency not null,
  day_of_month int,
  day_of_week int,
  start_date timestamptz not null,
  end_date timestamptz,
  is_active boolean not null default true,
  last_generated timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.recurring_transactions enable row level security;
create policy "rt" on public.recurring_transactions for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: budgets (Orçamento mensal por categoria)
-- Define limite de gasto por categoria
-- ============================================
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
alter table public.budgets enable row level security;
create policy "b" on public.budgets for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: savings_goals (Metas financeiras)
-- Objetivos de economia com prazo e valor
-- ============================================
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
alter table public.savings_goals enable row level security;
create policy "sg" on public.savings_goals for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: category_patterns (Auto-categorização)
-- Aprende padrões: "iFood" → Alimentação
-- ============================================
create table public.category_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pattern text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  priority int not null default 0,
  created_at timestamptz default now()
);
alter table public.category_patterns enable row level security;
create policy "cp" on public.category_patterns for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: alerts (Alertas inteligentes)
-- Notificações: fatura vencendo, orçamento estourado, etc.
-- ============================================
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
alter table public.alerts enable row level security;
create policy "al" on public.alerts for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: credit_card_limit_history (Histórico de limites)
-- Registra mudanças de limite para gráfico de evolução
-- ============================================
create table public.credit_card_limit_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  old_limit numeric(12,2),
  new_limit numeric(12,2) not null,
  changed_at timestamptz default now()
);
alter table public.credit_card_limit_history enable row level security;
create policy "clh" on public.credit_card_limit_history for all
  using (exists (select 1 from public.credit_cards c where c.id = card_id and c.user_id = auth.uid()));

-- ============================================
-- TABELA: landlord_purchases (Consumos do proprietário)
-- Compras que o proprietário fez no seu cartão/conta
-- Abatem do valor do aluguel
-- ============================================
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
alter table public.landlord_purchases enable row level security;
create policy "lp" on public.landlord_purchases for all using (auth.uid() = user_id);

-- ============================================
-- TABELA: recent_descriptions (Autocomplete de nomes)
-- Histórico de descrições usadas em transações
-- Sincroniza entre dispositivos
-- ============================================
create table public.recent_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  description text not null,
  created_at timestamptz default now(),
  unique(user_id, description)
);
create index idx_rd_user on public.recent_descriptions(user_id, created_at desc);
alter table public.recent_descriptions enable row level security;
create policy "rd" on public.recent_descriptions for all using (auth.uid() = user_id);
