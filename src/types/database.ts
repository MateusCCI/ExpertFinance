// Tipos gerados a partir do schema Supabase (supabase/migrations/00001_schema.sql)

// ===== ENUMS =====
export type UserRole = "admin" | "user" | "member";
export type AccountType = "checking" | "savings" | "investment" | "credit_card" | "cash";
export type CardStatus = "active" | "blocked" | "cancelled";
export type TransactionType = "income" | "expense" | "transfer";
export type SettlementTag = "rent_abatement" | "ledger_credit" | "ledger_debit" | "normal";
export type SyncStatus = "synced" | "pending" | "conflict";
export type MissionTrigger =
  | "boleto_count"
  | "pix_sent_count"
  | "pix_received_count"
  | "spending_on_account"
  | "min_balance"
  | "card_purchases"
  | "invoice_payments";
export type BonusType = "yield_boost" | "cashback_boost" | "fee_waiver";
export type RecurFrequency = "daily" | "weekly" | "monthly" | "yearly";

// ===== TABLES =====

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  monthly_income: number | null;
  reserve_fund_percentage: number | null;
  currency: string;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string | null;
  is_active: boolean;
  annual_yield: number | null;
  last_yield_date: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  brand: string | null;
  last_digits: string | null;
  total_limit: number;
  available_limit: number;
  closing_day: number;
  due_day: number;
  annual_fee: number | null;
  spend_target_for_waiver: number | null;
  cashback_rate: number | null;
  cashback_balance: number;
  parent_card_id: string | null;
  is_virtual: boolean;
  status: CardStatus;
  color: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  parent_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  credit_card_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  installment_count: number | null;
  installment_number: number | null;
  installment_group_id: string | null;
  destination_account_id: string | null;
  settlement_tag: SettlementTag;
  settled_person_id: string | null;
  notes: string | null;
  is_recurring: boolean;
  recurring_id: string | null;
  sync_status: SyncStatus;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  credit_card_id: string;
  month: number;
  year: number;
  total_amount: number;
  paid_amount: number;
  is_paid: boolean;
  due_date: string;
  closing_date: string;
  rent_abatement_amount: number | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface RentConfig {
  id: string;
  user_id: string;
  landlord_name: string;
  monthly_rent_amount: number;
  due_day: number;
  pix_key: string | null;
  accumulated_landlord_spending: number;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThirdPartyLedger {
  id: string;
  user_id: string;
  person_name: string;
  person_nickname: string | null;
  balance: number;
  last_activity_date: string | null;
  notes: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface BankMission {
  id: string;
  name: string;
  description: string;
  trigger_type: MissionTrigger;
  trigger_target: number;
  trigger_account_type: AccountType | null;
  bonus_type: BonusType;
  bonus_description: string;
  bonus_value: number | null;
  institution: string | null;
  is_active: boolean;
  icon: string | null;
  created_at: string;
}

export interface MissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  current_count: number;
  target_count: number;
  is_completed: boolean;
  completed_at: string | null;
  year: number;
  month: number;
  target_account_id: string | null;
  bonus_unlocked: boolean;
  created_at: string;
  updated_at: string;
}

// ===== NOVAS TABELAS (features) =====

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: number;
  year: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  account_id: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryPattern {
  id: string;
  user_id: string;
  pattern: string;
  category_id: string;
  priority: number;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger";
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface CreditCardLimitHistory {
  id: string;
  card_id: string;
  old_limit: number | null;
  new_limit: number;
  changed_at: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  credit_card_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  frequency: RecurFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  last_generated: string | null;
  created_at: string;
  updated_at: string;
}

// ===== DATABASE INTERFACE =====

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at">; Update: Partial<Omit<Profile, "id" | "created_at">> };
      accounts: { Row: Account; Insert: Omit<Account, "id" | "created_at" | "updated_at" | "sync_status">; Update: Partial<Omit<Account, "id" | "created_at">> };
      credit_cards: { Row: CreditCard; Insert: Omit<CreditCard, "id" | "created_at" | "updated_at" | "sync_status">; Update: Partial<Omit<CreditCard, "id" | "created_at">> };
      categories: { Row: Category; Insert: Omit<Category, "id" | "created_at">; Update: Partial<Omit<Category, "id" | "created_at">> };
      transactions: { Row: Transaction; Insert: Omit<Transaction, "id" | "created_at" | "updated_at" | "sync_status">; Update: Partial<Omit<Transaction, "id" | "created_at">> };
      invoices: { Row: Invoice; Insert: Omit<Invoice, "id" | "created_at" | "updated_at" | "sync_status">; Update: Partial<Omit<Invoice, "id" | "created_at">> };
      rent_config: { Row: RentConfig; Insert: Omit<RentConfig, "id" | "created_at" | "updated_at">; Update: Partial<Omit<RentConfig, "id" | "created_at">> };
      third_party_ledger: { Row: ThirdPartyLedger; Insert: Omit<ThirdPartyLedger, "id" | "created_at" | "updated_at" | "sync_status">; Update: Partial<Omit<ThirdPartyLedger, "id" | "created_at">> };
      bank_missions: { Row: BankMission; Insert: Omit<BankMission, "id" | "created_at">; Update: Partial<Omit<BankMission, "id" | "created_at">> };
      mission_progress: { Row: MissionProgress; Insert: Omit<MissionProgress, "id" | "created_at" | "updated_at">; Update: Partial<Omit<MissionProgress, "id" | "created_at">> };
      recurring_transactions: { Row: RecurringTransaction; Insert: Omit<RecurringTransaction, "id" | "created_at" | "updated_at">; Update: Partial<Omit<RecurringTransaction, "id" | "created_at">> };
      budgets: { Row: Budget; Insert: Omit<Budget, "id" | "created_at" | "updated_at">; Update: Partial<Omit<Budget, "id" | "created_at">> };
      savings_goals: { Row: SavingsGoal; Insert: Omit<SavingsGoal, "id" | "created_at" | "updated_at">; Update: Partial<Omit<SavingsGoal, "id" | "created_at">> };
      category_patterns: { Row: CategoryPattern; Insert: Omit<CategoryPattern, "id" | "created_at">; Update: Partial<Omit<CategoryPattern, "id" | "created_at">> };
      alerts: { Row: Alert; Insert: Omit<Alert, "id" | "created_at">; Update: Partial<Omit<Alert, "id" | "created_at">> };
      credit_card_limit_history: { Row: CreditCardLimitHistory; Insert: Omit<CreditCardLimitHistory, "id" | "changed_at">; Update: Partial<Omit<CreditCardLimitHistory, "id" | "changed_at">> };
    };
  };
}
