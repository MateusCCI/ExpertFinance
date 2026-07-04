-- ============================================
-- EXPERTFINANCE - TESTES DE TABELAS
-- Execute no SQL Editor do Supabase para verificar dados
-- ============================================

-- Perfil do usuário (criado automaticamente no cadastro)
-- Guarda: nome, email, papel (admin/user), renda mensal, % fundo reserva
select * from public.profiles;

-- Contas bancárias do usuário
-- Guarda: nome (ex: Nubank), tipo (corrente/poupança/investimento/dinheiro), saldo, instituição, rendimento anual %CDI
select * from public.accounts order by created_at desc;

-- Cartões de crédito (físicos e virtuais)
-- Guarda: nome personalizado, bandeira, 4 últimos dígitos, limite total/disponível, dia fechamento/vencimento, anuidade, meta gasto isenção, cashback, status (ativo/bloqueado)
-- Hierarquia: cartão virtual referencia cartão físico via parent_card_id
select id, name, brand, last_digits, total_limit, available_limit, closing_day, due_day, annual_fee, spend_target_for_waiver, status, parent_card_id from public.credit_cards order by created_at desc;

-- Categorias de transações (Alimentação, Transporte, Lazer, etc.)
-- Organiza gastos e receitas. Cada categoria tem nome, cor, ícone
select * from public.categories order by name;

-- Transações financeiras (últimas 20)
-- Todo movimento: entradas (income), saídas (expense), transferências entre contas
-- Guarda: valor, descrição, data, conta, cartão, categoria, parcelas, tags de liquidação
select id, type, amount, description, date, account_id, credit_card_id, category_id from public.transactions order by date desc limit 20;

-- Faturas de cartão de crédito
-- Controle mensal por cartão: valor total, valor pago, status pago/pendente, data vencimento
-- Campo rent_abatement_amount: valor abatido no aluguel
select id, credit_card_id, month, year, total_amount, paid_amount, is_paid, due_date from public.invoices order by year desc, month desc;

-- Livro razão (contas com terceiros)
-- Conta-corrente por pessoa: quem te deve (saldo positivo), a quem você deve (saldo negativo)
-- Guarda: nome da pessoa, apelido, saldo acumulado, última atividade
select * from public.third_party_ledger order by created_at desc;

-- Configuração de aluguel (uma por usuário)
-- Guarda: nome do proprietário, valor mensal, dia vencimento, chave PIX, total consumido pelo proprietário
select * from public.rent_config;

-- Consumos do proprietário (compras que abatem do aluguel)
-- Guarda: descrição, valor, fonte (cartão ou conta), tipo (à vista/parcelado/mensal), data
-- Cada registro reduz o saldo devedor do aluguel
select id, description, amount, source_name, source_type, purchase_type, installment_current, installment_total, purchase_date from public.landlord_purchases order by purchase_date desc;

-- Missões bancárias (gamificação)
-- Metas para destravar bônus: "Envie 5 PIX ganhe +10% CDI"
-- Guarda: nome, descrição, tipo de gatilho, meta, tipo bônus, descrição bônus
select * from public.bank_missions order by created_at desc;

-- Progresso de missões por usuário
-- Acompanha quanto cada usuário completou de cada missão no mês
-- Guarda: contagem atual, meta, status completo, bônus desbloqueado
select * from public.mission_progress order by created_at desc;

-- Orçamento mensal por categoria
-- Define limite de gasto: "Alimentação: R$800/mês"
-- Cruza com transações para mostrar quanto gastou vs orçado
select b.*, c.name as category_name from public.budgets b left join public.categories c on b.category_id = c.id order by b.year desc, b.month desc;

-- Metas financeiras (savings goals)
-- Objetivos de economia: "Viagem Europa: R$15.000 até Dez/2026"
-- Guarda: nome, valor alvo, valor atual, prazo, conta vinculada
select * from public.savings_goals order by created_at desc;

-- Padrões de auto-categorização
-- Aprende associações: "iFood" → Alimentação, "Uber" → Transporte
-- Na próxima vez que digitar "iFood", categoriza automaticamente
select p.*, c.name as category_name from public.category_patterns p left join public.categories c on p.category_id = c.id order by p.priority desc;

-- Alertas inteligentes
-- Notificações: "Fatura vencendo em 3 dias", "Orçamento de Alimentação estourado"
-- Guarda: tipo, título, mensagem, severidade (info/warning/danger), lido/não lido
select * from public.alerts order by created_at desc;

-- Histórico de limites de cartão
-- Registra cada alteração de limite para gerar gráfico de evolução
-- Guarda: card_id, limite antigo, limite novo, data da mudança
select h.*, c.name as card_name from public.credit_card_limit_history h left join public.credit_cards c on h.card_id = c.id order by h.changed_at desc;

-- Descrições recentes (autocomplete)
-- Histórico de nomes digitados em transações
-- Sincroniza entre dispositivos: digita no celular, aparece no desktop
select * from public.recent_descriptions order by created_at desc limit 20;

-- Transações recorrentes (assinaturas e prestações fixas)
-- Netflix, academia, aluguel, etc. que se repetem
-- Guarda: valor, descrição, frequência (diária/semanal/mensal/anual), dia
select * from public.recurring_transactions order by created_at desc;
