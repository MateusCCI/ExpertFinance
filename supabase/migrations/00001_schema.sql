-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ===== ENUMS =====
create type user_role as enum ('admin', 'user', 'member');
create type account_type as enum ('checking', 'savings', 'investment', 'credit_card', 'cash');
create type card_status as enum ('active', 'blocked', 'cancelled');
create type transaction_type as enum ('income', 'expense', 'transfer');
create type settlement_tag as enum ('rent_abatement', 'ledger_credit', 'ledger_debit', 'normal');
create type sync_status as enum ('synced', 'pending', 'conflict');
create type mission_trigger as enum ('boleto_count', 'pix_sent_count', 'pix_received_count', 'spending_on_account', 'min_balance', 'card_purchases', 'invoice_payments');
create type bonus_type as enum ('yield_boost', 'cashback_boost', 'fee_waiver');
create type recur_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');

-- ===== PROFILES (extends auth.users) =====
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

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
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

-- ===== ACCOUNTS =====
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
create index idx_accounts_user_active on public.accounts(user_id, is_active);

alter table public.accounts enable row level security;

create policy "Users manage own accounts"
  on public.accounts for all
  using (auth.uid() = user_id);

-- ===== CREDIT CARDS =====
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
create index idx_cc_account on public.credit_cards(account_id);
create index idx_cc_parent on public.credit_cards(parent_card_id);

alter table public.credit_cards enable row level security;

create policy "Users manage own cards"
  on public.credit_cards for all
  using (auth.uid() = user_id);

-- ===== CATEGORIES =====
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

create index idx_categories_user on public.categories(user_id);
create index idx_categories_parent on public.categories(parent_id);

alter table public.categories enable row level security;

create policy "Users manage own categories"
  on public.categories for all
  using (auth.uid() = user_id);

-- ===== THIRD PARTY LEDGER =====
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

create index idx_ledger_user on public.third_party_ledger(user_id);
create index idx_ledger_balance on public.third_party_ledger(balance);

alter table public.third_party_ledger enable row level security;

create policy "Users manage own ledger"
  on public.third_party_ledger for all
  using (auth.uid() = user_id);

-- ===== TRANSACTIONS =====
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
create index idx_tx_category on public.transactions(category_id);
create index idx_tx_date on public.transactions(user_id, date);
create index idx_tx_cc on public.transactions(credit_card_id);
create index idx_tx_installment on public.transactions(installment_group_id);
create index idx_tx_recurring on public.transactions(recurring_id);
create index idx_tx_sync on public.transactions(sync_status);

alter table public.transactions enable row level security;

create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id);

-- ===== INVOICES =====
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

create index idx_inv_card on public.invoices(credit_card_id);
create index idx_inv_user_date on public.invoices(user_id, year, month);
create index idx_inv_due on public.invoices(due_date);

alter table public.invoices enable row level security;

create policy "Users manage own invoices"
  on public.invoices for all
  using (auth.uid() = user_id);

-- ===== RENT CONFIG =====
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

create index idx_rent_user on public.rent_config(user_id);

alter table public.rent_config enable row level security;

create policy "Users manage own rent config"
  on public.rent_config for all
  using (auth.uid() = user_id);

-- ===== BANK MISSIONS =====
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

create index idx_missions_active on public.bank_missions(is_active);
create index idx_missions_type on public.bank_missions(trigger_type);

alter table public.bank_missions enable row level security;

create policy "Everyone can view missions"
  on public.bank_missions for select
  using (true);

create policy "Only admins manage missions"
  on public.bank_missions for insert
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ===== MISSION PROGRESS =====
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

create index idx_mp_user_mission on public.mission_progress(user_id, mission_id);
create index idx_mp_user_month on public.mission_progress(user_id, year, month);
create index idx_mp_completed on public.mission_progress(is_completed);

alter table public.mission_progress enable row level security;

create policy "Users manage own mission progress"
  on public.mission_progress for all
  using (auth.uid() = user_id);

-- ===== RECURRING TRANSACTIONS =====
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

create index idx_rec_user on public.recurring_transactions(user_id);
create index idx_rec_active on public.recurring_transactions(is_active);

alter table public.recurring_transactions enable row level security;

create policy "Users manage own recurring transactions"
  on public.recurring_transactions for all
  using (auth.uid() = user_id);
