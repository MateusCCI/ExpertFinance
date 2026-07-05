-- Adicionar coluna is_virtual para cartões virtuais sem pai
-- Executar no Supabase Dashboard > SQL Editor
ALTER TABLE credit_cards
ADD COLUMN IF NOT EXISTS is_virtual boolean DEFAULT false;
