# Feedback de Melhorias — Minhas Finanças

## O que foi feito e por quê

### 1. Limite do Cartão de Crédito — Correção completa

**Problema**: O `available_limit` dos cartões ficava inconsistente — mostrava valores negativos no Dashboard, ou inflado sem transação correspondente.

**Causa raiz**: Múltiplos bugs na cadeia de criação/edição/deleção de transações:

| Bug | Arquivo | O que estava errado | Correção |
|-----|---------|---------------------|----------|
| Ledger sem desconto | `Ledger.tsx` | `handleRecordTxn` e `handleSettleCard` criavam transações com `credit_card_id` mas **nunca chamavam `updateCardLimit`** — o limite nunca era descontado | Adicionado `updateCardLimit(id, -amount)` após `createTxn` |
| Valor absoluto vs delta | `Ledger.tsx` | Primeira tentativa passava `Math.max(0, currentLimit - amount)` como segundo argumento, mas `updateCardLimit` agora espera um **delta**, causando **dupla subtração** | Trocado para `-amount` direto |
| Race condition | `use-cards.ts` | `updateCardLimit` aceitava valor absoluto — duas chamadas sequenciais liam o mesmo valor stale do banco | Reescrito para abordagem **delta**: lê valor fresco, aplica diff, escreve |
| deleteTransaction sem `updated_at` | `use-transactions.ts` | Ao restaurar limite, escrevia `available_limit` direto no Supabase sem setar `updated_at` | Adicionado `updated_at: new Date().toISOString()` |
| Dashboard com valores negativos | `Dashboard.tsx` | `total_limit - available_limit` ficava negativo quando available > total | Protegido com `Math.max(0, ...)` em 4 cálculos |
| Dados corrompidos no banco | Banco Supabase | Transações antigas tinham limites inconsistentes | Criada `recalculateAllCardLimits()` que roda uma vez no Dashboard e corrige tudo |

**Arquivos modificados**: `use-cards.ts`, `Ledger.tsx`, `use-transactions.ts`, `Dashboard.tsx`, `card-utils.ts`

---

### 2. QuickExpenseDialog — Unificação

**Problema**: Existia um popup inline no Transactions.tsx e o componente global `quick-expense-dialog.tsx`. Os 3 botões (FAB rosa, "Nova Transação", botão +) deveriam usar o mesmo popup.

**Correção**: Removido código inline do Transactions.tsx (interface + function ~300 linhas). Todos os botões agora usam o componente global que tem hooks próprios.

**Arquivos modificados**: `Transactions.tsx`

---

### 3. Cartões Virtuais — Transações e dígitos

**Problema 1**: Compras feitas em cartão virtual não apareciam no card do cartão físico pai. O filtro era `t.credit_card_id === card.id` — só matcheava transações do físico.

**Correção**: Criada função `getCardTransactionIds(physicalCardId)` que retorna o ID do físico + todos os IDs dos virtuais filhos. Ambas as abas (Visão Geral e Histórico) usam isso.

**Problema 2**: Dígitos do cartão virtual não apareciam em lugar nenhum.

**Correção**: Adicionado `••••{last_digits}` do virtual em:
- Card visual no CreditCards (abaixo do dígito do físico)
- Dropdown do QuickExpenseDialog (`Nome ••••1234 (virtual)`)
- Dropdown do editor de transação (Transactions.tsx)
- Lista de transações (mostra dígitos do virtual ao lado da data)

**Arquivos modificados**: `CreditCards.tsx`, `quick-expense-dialog.tsx`, `Transactions.tsx`

---

### 4. Campo de data no QuickExpenseDialog

**Problema**: Transações sempre usavam "hoje" como data — sem opção de escolher data diferente.

**Correção**: Adicionado campo `type="date"` entre Descrição e Categoria, com valor padrão "hoje". O `handleSave` usa a data selecionada.

**Arquivos modificados**: `quick-expense-dialog.tsx`

---

### 5. Reports — Adaptação mobile

**Problema**: Tela de Relatórios não era responsiva — tabs com ícones + texto em 4 colunas, padding grande, textos grandes.

**Correção**:
- Tabs: texto menor (`text-[10px]`), ícones escondidos no mobile (`hidden md:block`), nomes abreviados ("Picos", "Reserva")
- Padding: `px-5 py-5` → `px-3 py-3` no mobile
- Barras de progresso: alturas e larguras menores
- Chart de Picos: margem esquerda reduzida (80 → 50)
- Tab Reserva: grid 2 colunas → 1 coluna no mobile

**Arquivos modificados**: `Reports.tsx`

---

### 6. Documentation

**Criado**: `CLAUDE.md` na raiz do projeto — documentação completa para que outra IA entenda stack, arquitetura, regras de negócio, bugs resolvidos e padrões de código.

**Arquivos criados**: `CLAUDE.md`

---

## Melhorias sugeridas (prioridade)

### Alta prioridade

1. **Remover dependências mortas** — 10 pacotes instalados mas nunca importados:
   - `@vly-ai/integrations`, `@zumer/snapdom`, `axios`, `hono`, `embla-carousel-react`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `@jridgewell/trace-mapping`, `@oslojs/crypto`
   - Comando: `npm uninstall <pacote>`

2. **Deletar módulos mortos**:
   - `src/lib/indexedb.ts` — nunca importado
   - `src/lib/vly-integrations.ts` — nunca importado

3. **Remover 40 componentes Shadcn não usados** — dos 54 instalados, só 14 são importados. Os outros são peso morto.

### Média prioridade

4. **Refatorar Ledger.tsx (1169 linhas) e CreditCards.tsx (1079 linhas)** — Extrair sub-componentes, separar lógica em hooks customizados.

5. **Tipar 22 usages de `: any`** — Principalmente em `Ledger.tsx` (14) e `CreditCards.tsx` (6). Usar tipos de `src/types/database.ts`.

6. **Remover `console.log`** de `instrumentation.tsx` ou usar `drop_console` no Vite para produção.

### Baixa prioridade

7. **Conectar IndexedDB** — `indexedb.ts` tem 243 linhas de cache offline que nunca foram conectadas. `sync-manager.ts` tem uma implementação mais simples. Decidir qual usar.

8. **Adicionar testes** — Zero testes unitários ou de integração no projeto.

9. **Configurar ESLint stricter** — Atualmente tem config básica.

10. **Adicionar loading states** — Algumas pages têm loading genérico, outras não tratam.
