# CLAUDE.md — Minhas Finanças

## Visão Geral

App de finanças pessoais PWA mobile-first. Backend: **Supabase** (PostgreSQL + Auth). Deploy: **Vercel**.

**Stack**: React 19 + Vite 7 + Tailwind v4 + Shadcn UI + Recharts + Framer Motion + Supabase JS v2

**Package manager**: npm (não usar Bun)

**Variáveis de ambiente** (`.env`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Comandos**:
```bash
npx tsc --noEmit          # Type-check
npx vite build            # Build production
npm run dev               # Dev server
```

---

## Estrutura de Pastas

```
src/
├── components/
│   ├── ui/                 # 54 componentes Shadcn (button, dialog, select, tabs...)
│   ├── dashboard/          # smart-insights, balance-projection, savings-goals, budget-overview
│   ├── charts/             # cash-flow, spending, balance-trend, budget-ring (Recharts)
│   ├── quick-expense-dialog.tsx   # Popup unificado de nova transação
│   ├── mobile-header.tsx          # Header responsivo com botão +
│   ├── mobile-bottom-nav.tsx      # Bottom nav com 5 itens + FAB rosa
│   └── theme-switcher.tsx
├── hooks/                  # 9 hooks Supabase
│   ├── use-auth.ts         # Auth (login/logout/session)
│   ├── use-accounts.ts     # CRUD contas bancárias
│   ├── use-cards.ts        # CRUD cartões + updateCardLimit (delta-based)
│   ├── use-transactions.ts # CRUD transações + deleteTransaction
│   ├── use-categories.ts   # CRUD categorias
│   ├── use-invoices.ts     # CRUD faturas de cartão
│   ├── use-ledger.ts       # CRUD terceiros (quem deve/deve)
│   ├── use-rent.ts         # Config aluguel + landlord_purchases
│   └── use-missions.ts     # Sistema de missões/gamificação
├── pages/                  # 9 páginas
│   ├── Dashboard.tsx       # Visão geral com cards, charts, insights
│   ├── Transactions.tsx    # Lista + edição + exclusão de transações
│   ├── CreditCards.tsx     # Cartões: Visão Geral (2 abas) + Histórico
│   ├── Accounts.tsx        # Contas bancárias
│   ├── Ledger.tsx          # Terceiros (quem deve/deve) + liquidação
│   ├── Rent.tsx            # Aluguel + gastos do proprietário
│   ├── Missions.tsx        # Missões gamificadas
│   ├── Reports.tsx         # Relatórios: Performance, Rentabilidade, Picos, Reserva
│   ├── Settings.tsx        # Configurações + temas
│   └── Auth.tsx            # Login/Cadastro
├── lib/
│   ├── supabase.ts         # Cliente Supabase
│   ├── card-utils.ts       # getPhysicalCardId() — resolve virtual→físico
│   ├── ensure-profile.ts   # Garante row em profiles(id) antes de FKs
│   ├── themes.ts           # 6 temas via applyTheme() com style.setProperty()
│   ├── auto-categorize.ts  # Pattern-matching para auto-categorizar
│   ├── balance-projection.ts # Cálculos de projeção de saldo
│   ├── sync-manager.ts     # Fila de sync offline→Supabase
│   └── indexedb.ts         # Cache IndexedDB (offline-first)
├── types/
│   └── database.ts         # Tipos TypeScript das 16 tabelas
└── App.tsx                 # Router (rotas flat, sem nested layouts)
```

---

## Banco de Dados (Supabase — 16 tabelas)

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfil do usuário (role, income, reserve %) |
| `accounts` | Contas bancárias (tipo, saldo, rendimento) |
| `credit_cards` | Cartões (limite, fechamento, cashback, parent_card_id para virtual) |
| `categories` | Categorias de transação (ícone, cor, parent_id) |
| `transactions` | Transações (tipo, parcelas, settlement_tag, credit_card_id) |
| `invoices` | Faturas de cartão (mês/ano, total, pago, rent_abatement) |
| `rent_config` | Config de aluguel (proprietário, valor, PIX) |
| `third_party_ledger` | Terceiros (nome, saldo corrente) |
| `ledger_transactions` | Transações com terceiros |
| `bank_missions` | Missões/gamificação |
| `mission_progress` | Progresso do usuário nas missões |
| `recurring_transactions` | Transações recorrentes |
| `budgets` | Orçamento mensal por categoria |
| `savings_goals` | Metas de economia |
| `category_patterns` | Regras de auto-categorização |
| `alerts` | Notificações in-app |

**Colunas manualmente adicionadas**: `available_limit` e `color` na tabela `credit_cards` foram adicionadas via SQL dashboard — não existiam no schema original.

---

## Regras de Negócio Críticas

### Limite do Cartão de Crédito

**Assinatura**: `updateCardLimit(id: string, delta: number)`

A função é **delta-based**: lê o valor fresco do banco internamente e aplica o diff. Elimina race conditions.

```
updateCardLimit(cardId, -100)   → desconta R$100
updateCardLimit(cardId, +100)   → restaura R$100
```

**TODA criação de transação com cartão DEVE chamar `updateCardLimit`**:
- `quick-expense-dialog.tsx` → `updateCardLimit(cardId, -installmentAmount)`
- `CreditCards.tsx` (NewPurchaseForm) → `updateCardLimit(cardId, -numAmount)`
- `Ledger.tsx` (handleRecordTxn) → `updateCardLimit(txnCardId, -amount)`
- `Ledger.tsx` (handleSettleCard) → `updateCardLimit(settleCardId, -amount)`

**Edição de transação**: restaura limite antigo (`+oldAmount`) e desconta novo (`-newAmount`)

**Exclusão**: `deleteTransaction` em `use-transactions.ts` restaura limite automaticamente

**Cartões virtuais**: `getPhysicalCardId(id)` em `src/lib/card-utils.ts` resolve `parent_card_id` para descontar do cartão físico correto.

### QuickExpenseDialog (Popup Unificado)

3 botões abrem o mesmo popup:
1. FAB rosa central no BottomNav
2. "Nova Transação" no MobileBottomNav
3. Botão + no MobileHeader

O componente usa hooks próprios (useCategories, useAccounts, useCreditCards) — não depende de props do pai. `account_id` é auto-resolved do `cardId`.

**Formas de pagamento**: 3 botões — Dinheiro (cash), Débito (debit), Crédito (credit). Quando cartão selecionado, account_id = card.account_id (preenchido silenciosamente).

### Conta ou Cartão — Mutuamente Exclusivos

Selecionar cartão preenche conta automaticamente. Selecionar conta limpa cartão. Nunca ambos.

### Transações

- 17 campos obrigatórios (mesmo que null)
- `settlement_tag` enum: `rent_abatement`, `ledger_credit`, `ledger_debit`, `normal` — "none" é inválido
- `credit_card_id` não-nulo implica `account_id` = card.account_id
- Campo de data obrigatório (default: hoje)

### Perfil

`ensureProfile()` deve ser chamado antes de qualquer operação que referencie `profiles(id)` — todas as tabelas com FK para profiles.

---

## Padrões de Código

### Native Select > Radix Select
Usar `<select>` HTML nativo em vez de Radix Select — bugs com `value=undefined`.

```tsx
<select value={value} onChange={(e) => setValue(e.target.value)}
  className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none">
  <option value="">Selecione...</option>
  {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
</select>
```

CSS explícito necessário para seguir tema:
```css
select { background-color: var(--color-background); color: var(--color-foreground); }
select option { background-color: var(--color-background); color: var(--color-foreground); }
```

### Temas
6 temas via JavaScript `applyTheme()` com `element.style.setProperty()` — CSS classes não funcionam.

### Toast
Usar `position="top-center"` — default conflita com BottomNav.

### Regras de Hooks
Hooks NUNCA depois de early returns — causa "Rendered more hooks than during previous render".

### Supabase
- `.single()` retorna 406 quando 0 rows → usar `.maybeSingle()`
- 409 conflict em rent_config → usar `upsert` com `onConflict: "user_id"`
- Update com campo ausente pode usar default 0 → sempre incluir campos que devem ser preservados

---

## Layout Mobile

- **MobileHeader**: botão + para ação principal
- **MobileBottomNav**: 5 itens + FAB rosa central + hamburger "Mais"
- **Sidebar**: visível apenas em `md:` (desktop)
- **Bottom padding**: `pb-20` mobile, `pb-6` desktop

---

## Temas de Cores

cyberpunk (default), neon, aurora, rose, midnight, gold. Aplicados via JS com `style.setProperty()`.

---

## Bugs Conhecidos / Resolvidos

- `settlement_tag: ""` causava erro 400 silencioso → corrigido para `"normal"`
- Ledger resetava limite para 0 (camelCase mismatch `availableLimit` vs `available_limit`)
- Double update de limite em 3 locations
- `updateTransaction` não ajustava limite → agora calcula delta
- Cartão virtual consumia limite do físico errado → `getPhysicalCardId()` resolve
- Dashboard mostrava valores negativos → protegido com `Math.max(0, ...)`
- Dados corrompidos no banco → `recalculateAllCardLimits()` roda uma vez no Dashboard
- `recalculateAllCardLimits` executa automaticamente na primeira carga e seta flag no localStorage

---

## Deploy

Vercel com rewrites SPA:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

PWA configurado com `vite-plugin-pwa` — service worker com NetworkFirst caching.
