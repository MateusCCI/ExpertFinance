## Overview

Sistema de controle financeiro pessoal inteligente com gestão de cartões, aluguéis e livro razão.

### Tech Stack
- **Frontend:** React 19 + Vite 7 + TypeScript
- **Estilo:** Tailwind v4 + Shadcn UI (New York style)
- **Roteamento:** React Router v7
- **Backend/Banco:** Supabase (PostgreSQL relacional)
- **Autenticação:** Supabase Auth (email/password + OTP)
- **Ícones:** Lucide React
- **Animações:** Framer Motion
- **Gráficos:** Recharts
- **Formulários:** React Hook Form + Zod
- **PWA:** vite-plugin-pwa (service worker, offline)
- **Offline-First:** IndexedDB (cache local + fila de sincronização)

## Setup

### Requisitos
- Node.js 18+
- npm ou bun

### Instalação

```bash
npm install
```

### Variáveis de Ambiente

Configure o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Opcionalmente, configure `.env.local` para variáveis específicas do ambiente local.

### Desenvolvimento

```bash
npm run dev
```

O servidor inicia em `http://localhost:5173`.

### Build para Produção

```bash
npm run build
npm run preview
```

## Autenticação

A autenticação é gerenciada pelo Supabase Auth. O hook `useAuth` é o ponto central:

```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

### Rotas Protegidas

Para proteger uma página, verifique `isAuthenticated` e redirecione para `/auth`:

```typescript
if (!isAuthenticated && !isLoading) {
  return <Navigate to="/auth" replace />;
}
```

### Página de Auth

A página de autenticação está em `src/pages/Auth.tsx`. Suporta login, signup e recuperação de senha.

## Estrutura do Projeto

```
src/
├── pages/          # Páginas (rotas)
├── components/     # Componentes React
│   └── ui/         # Primitivas Shadcn UI
├── hooks/          # Hooks customizados
├── lib/            # Utilitários e config
│   ├── supabase.ts # Cliente Supabase
│   ├── indexedb.ts # Cache offline IndexedDB
│   └── utils.ts    # Helpers
├── types/          # Tipos TypeScript
└── assets/         # Imagens e estáticos
```

## Convenções

### Componentes
- Usar primitivas Shadcn UI (`src/components/ui/`) por padrão
- Adicionar `cursor-pointer` em elementos clicáveis
- Usar `tracking-tight font-bold` para títulos
- SEMPRE responsivo (mobile-first)
- EVITAR cards aninhados e sombras
- Usar `Loader2` para estados de carregamento

### Estilização
- Temas claro/escuro via `next-themes`
- Cores customizáveis em `src/index.css` (formato oklch)
- Tema cyberpunk: magenta neon (#ff00c8) + teal (#00ffcc)

### Animações
Usar Framer Motion para todas as animações:

```typescript
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

### Toasts
Usar Sonner para notificações:

```typescript
import { toast } from "sonner";

toast("Operação realizada com sucesso");
toast.error("Erro ao salvar dados");
```

### Dialogs
- Usar Dialog em vez de páginas separadas sempre que possível
- Adicionar scroll em conteúdo extenso
- Garantir que o conteúdo não seja cortado na tela

## Banco de Dados (Supabase)

O schema está definido em `supabase/migrations/00001_schema.sql`.

### Tabelas Principais
- `profiles` — Perfil do usuário (estende auth.users)
- `accounts` — Contas bancárias
- `credit_cards` — Cartões de crédito (com hierarquia virtual→físico)
- `categories` — Categorias de transações
- `transactions` — Transações financeiras
- `invoices` — Faturas de cartão
- `third_party_ledger` — Livro razão (contas com terceiros)
- `rent_config` — Configuração de aluguel
- `bank_missions` — Missões de gamificação
- `mission_progress` — Progresso de missões por usuário
- `recurring_transactions` — Transações recorrentes

### Row Level Security (RLS)
Todas as tabelas possuem RLS habilitado. Cada usuário só acessa seus próprios dados via `auth.uid() = user_id`.

## Deploy

O projeto está configurado para deploy na Vercel. O arquivo `vercel.json` configura rewrite SPA:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
