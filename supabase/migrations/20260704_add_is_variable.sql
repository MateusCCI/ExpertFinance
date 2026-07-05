-- Adicionar coluna is_variable para distinguir assinaturas de valor fixo vs variável
-- Executar no Supabase Dashboard > SQL Editor
ALTER TABLE recurring_transactions
ADD COLUMN IF NOT EXISTS is_variable boolean DEFAULT false;
