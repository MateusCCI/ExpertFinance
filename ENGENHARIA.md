# Engenharia Completa — Minhas Finanças

> Documentação técnica completa para estudo de engenharia de software.
> Sistema de finanças pessoais PWA mobile-first.

---

## 1. Visão Geral do Sistema

### 1.1 O que é
Aplicativo web progressivo (PWA) para controle financeiro pessoal. Permite gerenciar contas bancárias, cartões de crédito (incluindo virtuais), transações, faturas, aluguéis, terceiros (quem deve/deve), e missões gamificadas.

### 1.2 Stack Tecnológica

| Camada | Tecnologia | Versão | Função |
|--------|-----------|--------|--------|
| Frontend | React | 19.2 | Framework UI |
| Build | Vite | 7.2 | Bundler + Dev Server |
| Estilo | Tailwind CSS | 4.1 | Utility-first CSS |
| UI | Shadcn UI | - | Componentes baseados em Radix |
| Gráficos | Recharts | 2.15 | Charts declarativos |
| Animação | Framer Motion | 12.23 | Transições e animações |
| Roteamento | React Router | 7.10 | Navegação SPA |
| Backend | Supabase | 2.108 | PostgreSQL + Auth + Realtime |
| Deploy | Vercel | - | Hosting + Edge Functions |
| PWA | vite-plugin-pwa | 1.3 | Service Worker + Cache |
| Linguagem | TypeScript | 5.9 | Type safety |

### 1.3 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 1.4 Comandos

```bash
npm run dev          # Inicia dev server (http://localhost:5173)
npx tsc --noEmit     # Type-check sem gerar output
npx vite build       # Build production (gera dist/)
npm run lint         # ESLint
npm run format       # Prettier
```

---

## 2. Arquitetura do Sistema

### 2.1 Diagrama de Camadas

```
┌─────────────────────────────────────────────────┐
│                    UI (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Pages    │  │Components│  │  UI (Shadcn) │   │
│  │ (9 rotas) │  │ (globais)│  │  (54 atoms)  │   │
│  └────┬─────┘  └────┬─────┘  └──────────────┘   │
│       │              │                            │
│  ┌────▼──────────────▼──────────────────────┐    │
│  │              Hooks (9 hooks)              │    │
│  │  useAuth | useCards | useTransactions     │    │
│  │  useAccounts | useCategories | useInvoices│    │
│  │  useLedger | useRent | useMissions       │    │
│  └────────────────┬─────────────────────────┘    │
│                   │                               │
│  ┌────────────────▼─────────────────────────┐    │
│  │         Lib (utilities)                   │    │
│  │  supabase | card-utils | themes           │    │
│  │  ensure-profile | auto-categorize         │    │
│  └────────────────┬─────────────────────────┘    │
└───────────────────┼─────────────────────────────┘
                    │ Supabase JS Client
┌───────────────────▼─────────────────────────────┐
│              Supabase (Backend)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │PostgreSQL│  │   Auth   │  │   Storage    │   │
│  │ 16 tabelas│  │ JWT/RLS  │  │  (opcional)  │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
└─────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Dados

```
Usuário interage → Componente React → Hook (useXxx) → Supabase Client → PostgreSQL
                                       ↓
                              Estado React (useState)
                                       ↓
                              UI re-renderiza
```

### 2.3 Padrão de cada Hook

Cada hook segue o mesmo padrão:

```typescript
// src/hooks/use-accounts.ts
export function useAccounts() {
  const [data, setData] = useState<Type[]>([]);    // Estado local
  const [loading, setLoading] = useState(true);     // Loading state

  useEffect(() => {                                  // Busca inicial
    const fetch = async () => {
      await ensureProfile();                         // Garante perfil
      const { data, error } = await supabase
        .from("table_name")
        .select("*");
      setData(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const create = async (item) => { ... };            // CRUD
  const update = async (id, patch) => { ... };
  const remove = async (id) => { ... };

  return { data, loading, create, update, remove };  // Interface pública
}
```

---

## 3. Banco de Dados

### 3.1 Schema Completo (16 tabelas)

```sql
-- ============================================================
-- TABELA: profiles
-- Propósito: Perfil do usuário autenticado
-- FK: id ← auth.users(id)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'member')),
  monthly_income NUMERIC(12,2),
  reserve_fund_percentage NUMERIC(5,2),
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: accounts
-- Propósito: Contas bancárias do usuário
-- Um usuário pode ter várias contas (corrente, poupança, investimento)
-- ============================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,                    -- Nome da conta (ex: "Nubank", "Itaú")
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'investment', 'credit_card', 'cash')),
  balance NUMERIC(12,2) DEFAULT 0,       -- Saldo atual
  color TEXT,                            -- Cor para identificação visual
  is_active BOOLEAN DEFAULT true,
  annual_yield NUMERIC(5,2),             -- Rendimento anual (%)
  last_yield_date DATE,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: credit_cards
-- Propósito: Cartões de crédito (físicos e virtuais)
-- parent_card_id: se não nulo, é cartão virtual → desconta do pai
-- ============================================================
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  brand TEXT,                            -- Visa, Mastercard, etc.
  last_digits TEXT,                      -- Últimos 4 dígitos
  total_limit NUMERIC(12,2) NOT NULL,    -- Limite total do cartão
  available_limit NUMERIC(12,2) NOT NULL, -- Limite disponível (ATUALIZADO POR updateCardLimit)
  closing_day INTEGER NOT NULL,          -- Dia de fechamento da fatura
  due_day INTEGER NOT NULL,              -- Dia de vencimento
  annual_fee NUMERIC(12,2),             -- Anuidade
  spend_target_for_waiver NUMERIC(12,2), -- Meta de gasto para isenção
  cashback_rate NUMERIC(5,4),           -- Taxa de cashback (ex: 0.01 = 1%)
  cashback_balance NUMERIC(12,2) DEFAULT 0,
  parent_card_id UUID REFERENCES credit_cards(id), -- NULL = físico, não NULL = virtual
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'cancelled')),
  color TEXT,                            -- Cor do cartão
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: categories
-- Propósito: Categorização de transações
-- Hierarquia: parent_id permite subcategorias
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: transactions
-- Propósito: TODAS as movimentações financeiras
-- 17 campos obrigatórios (mesmo que null)
-- ============================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  account_id UUID NOT NULL REFERENCES accounts(id),        -- Sempre preenchido
  credit_card_id UUID REFERENCES credit_cards(id),         -- NULL se não for cartão
  category_id UUID REFERENCES categories(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,                               -- Data da transação
  installment_count INTEGER,                               -- Total de parcelas
  installment_number INTEGER,                              -- Qual parcela (1, 2, 3...)
  installment_group_id UUID,                               -- Agrupa parcelas da mesma compra
  destination_account_id UUID REFERENCES accounts(id),     -- Para transferências
  settlement_tag TEXT DEFAULT 'normal' CHECK (settlement_tag IN ('rent_abatement', 'ledger_credit', 'ledger_debit', 'normal')),
  settled_person_id UUID REFERENCES third_party_ledger(id),
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_id UUID,
  sync_status TEXT DEFAULT 'synced',
  client_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: invoices
-- Propósito: Faturas mensais dos cartões de crédito
-- Uma fatura por cartão por mês
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id),
  month INTEGER NOT NULL,                -- Mês (1-12)
  year INTEGER NOT NULL,                 -- Ano
  total_amount NUMERIC(12,2) DEFAULT 0,  -- Total da fatura
  paid_amount NUMERIC(12,2) DEFAULT 0,   -- Quanto já pagou
  is_paid BOOLEAN DEFAULT false,
  due_date DATE,
  closing_date DATE,
  rent_abatement_amount NUMERIC(12,2),   -- Abatimento de aluguel
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, credit_card_id, month, year)
);

-- ============================================================
-- TABELA: third_party_ledger
-- Propósito: Controle de quem deve / a quem deve
-- Saldo positivo = pessoa te deve
-- Saldo negativo = você deve para a pessoa
-- ============================================================
CREATE TABLE third_party_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  person_name TEXT NOT NULL,
  person_nickname TEXT,
  balance NUMERIC(12,2) DEFAULT 0,
  last_activity_date TIMESTAMPTZ,
  notes TEXT,
  sync_status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: ledger_transactions
-- Propósito: Movimentações com terceiros
-- ============================================================
CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  person_id UUID NOT NULL REFERENCES third_party_ledger(id),
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELA: rent_config
-- Propósito: Configuração de aluguel
-- UNIQUE(user_id) → usar upsert com onConflict
-- ============================================================
CREATE TABLE rent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
  landlord_name TEXT NOT NULL,
  monthly_rent_amount NUMERIC(12,2) NOT NULL,
  due_day INTEGER NOT NULL,
  pix_key TEXT,
  accumulated_landlord_spending NUMERIC(12,2) DEFAULT 0,
  payment_account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELAS DE GAMIFICAÇÃO
-- ============================================================
CREATE TABLE bank_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_target INTEGER NOT NULL,
  trigger_account_type TEXT,
  bonus_type TEXT NOT NULL,
  bonus_description TEXT,
  bonus_value NUMERIC(12,2),
  institution TEXT,
  is_active BOOLEAN DEFAULT true,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  mission_id UUID NOT NULL REFERENCES bank_missions(id),
  current_count INTEGER DEFAULT 0,
  target_count INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  target_account_id UUID REFERENCES accounts(id),
  bonus_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELAS AUXILIARES
-- ============================================================
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  deadline DATE,
  account_id UUID REFERENCES accounts(id),
  icon TEXT,
  color TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE category_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  pattern TEXT NOT NULL,                 -- Texto para match (ex: "iFood")
  category_id UUID NOT NULL REFERENCES categories(id),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger')),
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credit_card_limit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES credit_cards(id),
  old_limit NUMERIC(12,2),
  new_limit NUMERIC(12,2) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  credit_card_id UUID REFERENCES credit_cards(id),
  category_id UUID REFERENCES categories(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month INTEGER,
  day_of_week INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  last_generated DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Relacionamentos (ER)

```
auth.users ──1:1──► profiles
profiles ──1:N──► accounts
profiles ──1:N──► credit_cards
profiles ──1:N──► categories
profiles ──1:N──► transactions
profiles ──1:1──► rent_config
profiles ──1:N──► third_party_ledger
profiles ──1:N──► budgets
profiles ──1:N──► savings_goals

accounts ──1:N──► transactions (account_id)
accounts ──1:N──► credit_cards (account_id)

credit_cards ──1:N──► transactions (credit_card_id)
credit_cards ──1:N──► invoices
credit_cards ──1:N──► credit_cards (parent_card_id → virtual)
credit_cards ──1:N──► credit_card_limit_history

categories ──1:N──► transactions
categories ──1:N──► categories (parent_id → subcategorias)

third_party_ledger ──1:N──► ledger_transactions
third_party_ledger ──1:N──► transactions (settled_person_id)

bank_missions ──1:N──► mission_progress
```

---

## 4. Rotas da Aplicação

```
/               → Landing page (apresentação)
/auth           → Login / Cadastro
/dashboard      → Visão geral (cards, charts, insights)
/cards          → Cartões de crédito (visão geral + histórico)
/transactions   → Lista de transações (busca, filtros, edição)
/accounts       → Contas bancárias
/ledger         → Terceiros (quem deve/deve)
/rent           → Aluguel + gastos do proprietário
/missions       → Missões gamificadas
/reports        → Relatórios (Performance, Rentabilidade, Picos, Reserva)
/settings       → Configurações + temas
*               → 404 Not Found
```

**Lazy loading**: Todas as páginas usam `React.lazy()` + `Suspense` para code splitting.

---

## 5. Regras de Negócio Detalhadas

### 5.1 Limite do Cartão de Crédito (CRÍTICO)

```typescript
// src/hooks/use-cards.ts
// Assinatura: (id: string, delta: number) => Promise<void>
// delta POSITIVO = restaurar limite
// delta NEGATIVO = descontar limite
const updateCardLimit = async (id: string, delta: number) => {
  // 1. Resolver cartão virtual → físico
  const physicalId = await getPhysicalCardId(id);

  // 2. Ler limite ATUAL do banco (frescor!)
  const { data: current } = await supabase
    .from("credit_cards")
    .select("available_limit, total_limit")
    .eq("id", physicalId)
    .single();

  // 3. Aplicar delta com proteção mínima
  const newLimit = Math.max(0, (current?.available_limit ?? 0) + delta);

  // 4. Escrever no banco
  await supabase
    .from("credit_cards")
    .update({ available_limit: newLimit, updated_at: new Date().toISOString() })
    .eq("id", physicalId);

  // 5. Atualizar estado React
  setCards((prev) => prev.map((c) =>
    c.id === physicalId ? { ...c, available_limit: newLimit } : c
  ));
};
```

**Por que delta-based?**
- Duas chamadas sequenciais (ex: editar transação → restaurar antigo + descontar novo) funcionam corretamente
- Cada chamada lê o valor mais recente do banco
- Elimina race conditions entre chamadas sequenciais

**Onde é chamado:**

| Local | Quando | Delta |
|-------|--------|-------|
| `quick-expense-dialog.tsx` | Nova despesa no crédito | `-installmentAmount` |
| `CreditCards.tsx` | Nova compra no cartão | `-numAmount` |
| `Ledger.tsx` handleRecordTxn | Gasto com terceiros no cartão | `-amount` |
| `Ledger.tsx` handleSettleCard | Passar dívida no cartão | `-amount` |
| `Transactions.tsx` editar | Restaurar cartão antigo | `+oldAmount` |
| `Transactions.tsx` editar | Descontar cartão novo | `-newAmount` |
| `use-transactions.ts` delete | Excluir despesa com cartão | `+tx.amount` |

### 5.2 QuickExpenseDialog (Popup Unificado)

```
3 botões → 1 popup:
├── FAB rosa central (BottomNav)
├── "Nova Transação" (MobileBottomNav)
└── Botão + (MobileHeader)
```

**Fluxo ao salvar:**
1. Valida: amount, description obrigatórios; cardId se paymentMethod ≠ "cash"
2. Calcula groupId para parcelas (crypto.randomUUID())
3. Cria transação via `createTransaction()`
4. Se crédito: desconta limite via `updateCardLimit(cardId, -installmentAmount)`
5. Se crédito: cria/atualiza fatura do mês atual
6. Cria parcelas restantes (se > 1x)
7. Reseta form e fecha popup

### 5.3 Conta ou Cartão — Mutuamente Exclusivos

```typescript
// QuickExpenseDialog
// Selecionar cartão:
setCardId(selectedCard.id);
// account_id é preenchido silenciosamente: selectedCard.account_id

// Selecionar conta:
setCardId(""); // limpa cartão
// account_id = conta selecionada
```

### 5.4 Cartões Virtuais

```
Cartão Físico (parent_card_id = null)
├── Cartão Virtual 1 (parent_card_id = id_do_físico)
├── Cartão Virtual 2 (parent_card_id = id_do_físico)
└── ...

Regra: Transação em virtual desconta do limite do físico
Solução: getPhysicalCardId() resolve a hierarquia
```

### 5.5 Perfil Obrigatório

```typescript
// src/lib/ensure-profile.ts
// TODA operação que referencie profiles(id) deve chamar ensureProfile() antes
// Cria perfil se não existir (primeira vez que o user loga)
await ensureProfile();
// Agora é seguro fazer inserts em tabelas com FK para profiles
```

---

## 6. Layout Mobile

### 6.1 Estrutura

```
┌─────────────────────────┐
│      MobileHeader        │  ← Titulo + botão +
├─────────────────────────┤
│                          │
│      Conteúdo            │  ← scrollável
│      (pb-20)             │
│                          │
├─────────────────────────┤
│    MobileBottomNav       │  ← 5 itens + FAB rosa
│  [🏠][💳][➕][📋][⚙️]  │
└─────────────────────────┘
```

### 6.2 Breakpoints

- **Mobile**: `< md:` → bottom nav, header compacto, padding `pb-20`
- **Desktop**: `≥ md:` → sidebar, header normal, padding `pb-6`

### 6.3 BottomNav

```
5 itens: Dashboard, Transações, Cartões, Contas, Mais
FAB rosa central (abre QuickExpenseDialog)
Hamburger "Mais" abre menu flutuante com: Aluguel, Terceiros, Missões, Relatórios, Configurações
```

---

## 7. Temas de Cores

### 7.1 Como funciona

```typescript
// src/lib/themes.ts
// CSS classes NÃO funcionam — usa JS puro
export function applyTheme(themeId: string) {
  const theme = themes.find((t) => t.id === themeId);
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);              // --primary
    root.style.setProperty(key.replace("--", "--color-"), value); // --color-primary
  });
}
```

### 7.2 Temas disponíveis

| ID | Nome | Primária | Accent |
|----|------|----------|--------|
| cyberpunk | Cyberpunk | #ff00c8 (rosa neon) | #00ffcc (teal) |
| neon | Neon | #a855f7 (roxo) | #06b6d4 (ciano) |
| aurora | Aurora | #10b981 (esmeralda) | #6366f1 (índigo) |
| rose | Rosé | #f43f5e (rosa) | #fb923c (laranja) |
| midnight | Meia-Noite | #3b82f6 (azul royal) | #8b5cf6 (violeta) |
| gold | Gold | #f59e0b (dourado) | #ef4444 (vermelho) |

---

## 8. Padrões de Código

### 8.1 Native Select (NÃO usar Radix Select)

```tsx
// ✅ CORRETO — HTML nativo
<select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none"
>
  <option value="">Selecione...</option>
  {items.map((item) => (
    <option key={item.id} value={item.id}>{item.name}</option>
  ))}
</select>

// ❌ ERRADO — Radix Select tem bugs com value=undefined
<Select value={value} onValueChange={setValue}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>...</SelectContent>
</Select>
```

CSS obrigatório para seguir tema:
```css
select { background-color: var(--color-background); color: var(--color-foreground); }
select option { background-color: var(--color-background); color: var(--color-foreground); }
```

### 8.2 Toast — Sempre top-center

```tsx
// ✅ CORRETO
toast("Mensagem", { description: "Detalhe" });

// ❌ ERRADO — conflita com BottomNav
toast("Mensagem"); // default position = bottom-right
```

### 8.3 Hooks — NUNCA depois de early return

```tsx
// ❌ ERRADO — causa "Rendered more hooks than during previous render"
function MyComponent() {
  if (!isAuthenticated) return null;
  const { data } = useSomething(); // ❌ Hook condicional!
}

// ✅ CORRETO — todos os hooks antes de qualquer return
function MyComponent() {
  const { data } = useSomething();
  const [state, setState] = useState();

  if (!isAuthenticated) return null; // Early return DEPOIS dos hooks
  return <div>{data}</div>;
}
```

### 8.4 Supabase — Cuidados

```typescript
// ❌ .single() retorna erro 406 quando 0 rows
const { data } = await supabase.from("table").select("*").single();

// ✅ .maybeSingle() retorna null quando 0 rows
const { data } = await supabase.from("table").select("*").maybeSingle();

// ❌ 409 conflict em rent_config (UNIQUE constraint)
await supabase.from("rent_config").insert({ user_id, ... });

// ✅ upsert com onConflict
await supabase.from("rent_config").upsert({ user_id, ... }, { onConflict: "user_id" });

// ❌ Campo ausente pode usar default 0
await supabase.from("cards").update({ name: "Novo" });
// Se available_limit não foi passado, pode usar default 0

// ✅ Sempre incluir campos que devem ser preservados
await supabase.from("cards").update({
  name: "Novo",
  available_limit: currentCard.available_limit, // ← preservar!
});
```

### 8.5 Transações — Campos obrigatórios

```typescript
// TODOS os 17 campos devem ser passados (mesmo que null)
await createTransaction({
  account_id: "uuid",
  credit_card_id: null,          // ou uuid se cartão
  category_id: null,
  type: "expense",
  amount: 100,
  description: "Supermercado",
  date: new Date().toISOString(),
  installment_count: null,
  installment_number: null,
  installment_group_id: null,
  destination_account_id: null,
  settlement_tag: "normal",      // NUNCA "" — viola enum
  settled_person_id: null,
  notes: null,
  is_recurring: false,
  recurring_id: null,
  client_id: null,
});
```

---

## 9. Estrutura de Componentes

### 9.1 Componentes Globais

| Componente | Arquivo | Função |
|-----------|---------|--------|
| QuickExpenseDialog | `components/quick-expense-dialog.tsx` | Popup unificado de nova transação |
| MobileHeader | `components/mobile-header.tsx` | Header responsivo com botão + |
| MobileBottomNav | `components/mobile-bottom-nav.tsx` | Bottom nav com 5 itens + FAB |
| ThemeSwitcher | `components/theme-switcher.tsx` | Seletor de temas |

### 9.2 Componentes de Dashboard

| Componente | Função |
|-----------|--------|
| SmartInsights | Insights inteligentes de gastos |
| BalanceProjection | Projeção de saldo futuro |
| SavingsGoals | Cards de metas de economia |
| BudgetOverview | Resumo orçamento vs real |

### 9.3 Componentes de Charts

| Componente | Tipo Recharts | Função |
|-----------|---------------|--------|
| CashFlowChart | AreaChart | Fluxo de caixa tempo |
| SpendingChart | PieChart | Gastos por categoria |
| BalanceTrend | LineChart | Tendência de saldo |
| BudgetRing | PieChart (donut) | Progresso do orçamento |

### 9.4 UI (Shadcn) — 14 componentes efetivamente usados

`button`, `badge`, `select`, `input`, `dialog`, `alert-dialog`, `alert`, `progress`, `tabs`, `label`, `separator`, `dropdown-menu`, `switch`, `card`, `sonner`

---

## 10. Bugs Conhecidos e Soluções

### 10.1 settlement_tag vazio
```typescript
// ❌ Causava erro 400 silencioso no Supabase
settlement_tag: ""

// ✅ Usar valor válido do enum
settlement_tag: "normal"
```

### 10.2 Ledger resetando limite
```typescript
// ❌ camelCase mismatch — availableLimit sempre undefined
const limit = selectedCard.availableLimit; // undefined!

// ✅ snake_case para bater com o banco
const limit = selectedCard.available_limit;
```

### 10.3 Dashboard com negativos
```typescript
// ❌ Quando available_limit > total_limit
const used = card.total_limit - card.available_limit; // negativo!

// ✅ Proteção
const used = Math.max(0, card.total_limit - card.available_limit);
```

### 10.4 Cartão virtual consumindo limite errado
```typescript
// ❌ Transação em virtual só atualizava o virtual
await updateCardLimit(virtualCardId, -amount);

// ✅ Resolver para o físico antes
const physicalId = await getPhysicalCardId(virtualCardId);
await updateCardLimit(physicalId, -amount);
```

### 10.5 Dados corrompidos no banco
```typescript
// Função de recálculo — roda uma vez no Dashboard
// Calcula available_limit = total_limit - SUM(transações expense)
export async function recalculateAllCardLimits() {
  const { data: cards } = await supabase
    .from("credit_cards").select("id, total_limit")
    .is("parent_card_id", null);

  const { data: txs } = await supabase
    .from("transactions").select("credit_card_id, amount")
    .not("credit_card_id", "is", null).eq("type", "expense");

  for (const card of cards) {
    const spent = txs.filter(t => t.credit_card_id === card.id)
                     .reduce((s, t) => s + t.amount, 0);
    await supabase.from("credit_cards")
      .update({ available_limit: Math.max(0, card.total_limit - spent) })
      .eq("id", card.id);
  }
}
```

---

## 11. Performance e Otimizações

### 11.1 Code Splitting
```typescript
// main.tsx — cada página é lazy-loaded
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Transactions = lazy(() => import("./pages/Transactions.tsx"));
// ...
```

### 11.2 Manual Chunks (vite.config.ts)
```typescript
manualChunks: {
  "react-vendor": ["react", "react-dom", "react-router"],
  "radix-ui": ["@radix-ui/react-dialog", ...],
  "framer-motion": ["framer-motion"],
  "charts": ["recharts"],
  "forms": ["react-hook-form", "@hookform/resolvers", "zod"],
}
```

### 11.3 Memoização
```typescript
// useMemo para cálculos pesados
const physicalCards = useMemo(
  () => rawCards.filter((c) => !c.parent_card_id),
  [rawCards]
);

// useCallback para funções passadas como props
const getCardName = useCallback(
  (cardId: string) => cards.find((c) => c.id === cardId)?.name ?? "---",
  [cards]
);
```

### 11.4 PWA
- Service Worker com NetworkFirst caching para APIs
- Precaching de assets estáticos (JS, CSS, SVG, PNG)
- Manifest para instalação como app

---

## 12. Deploy

### 12.1 Vercel

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 12.2 Build

```bash
npx vite build
# Gera dist/ com:
# - index.html
# - assets/ (JS, CSS, SVG, PNG)
# - sw.js (Service Worker)
# - manifest.webmanifest
```

---

## 13. Checklist para Nova IA

- [ ] Ler `CLAUDE.md` — visão geral
- [ ] Ler `FEEDBACK.md` — melhorias pendentes
- [ ] Ler este arquivo (`ENGENHARIA.md`) — deep dive técnico
- [ ] Entender `src/types/database.ts` — todos os tipos
- [ ] Entender `src/hooks/use-cards.ts` — delta-based limit
- [ ] Entender `src/components/quick-expense-dialog.tsx` — popup unificado
- [ ] Entender `src/lib/card-utils.ts` — virtual→físico
- [ ] NUNCA usar Radix Select — usar `<select>` nativo
- [ ] NUNCA usar `settlement_tag: ""` — usar `"normal"`
- [ ] SEMPRE chamar `updateCardLimit` ao criar transação com cartão
- [ ] SEMPRE chamar `ensureProfile()` antes de inserts com FK para profiles
- [ ] Hooks ANTES de early returns
- [ ] Toast com `position="top-center"`
