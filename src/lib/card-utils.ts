import { supabase } from "./supabase";

/**
 * Para qualquer cartão (físico ou virtual), retorna o ID do cartão físico
 * que controla o limite. Se já for físico, retorna o próprio ID.
 */
export async function getPhysicalCardId(cardId: string): Promise<string> {
  const { data } = await supabase
    .from("credit_cards")
    .select("parent_card_id")
    .eq("id", cardId)
    .single();

  return data?.parent_card_id || cardId;
}

/**
 * Recalcula o available_limit de todos os cartões baseado nas transações reais.
 * Rodar uma vez para corromper dados inconsistentes.
 */
export async function recalculateAllCardLimits(): Promise<void> {
  const { data: cards } = await supabase
    .from("credit_cards")
    .select("id, total_limit, parent_card_id")
    .is("parent_card_id", null);

  if (!cards || cards.length === 0) return;

  const { data: transactions } = await supabase
    .from("transactions")
    .select("credit_card_id, amount, type")
    .not("credit_card_id", "is", null)
    .eq("type", "expense");

  for (const card of cards) {
    const spent = (transactions || [])
      .filter((t) => t.credit_card_id === card.id)
      .reduce((s, t) => s + t.amount, 0);

    const newLimit = Math.max(0, card.total_limit - spent);

    await supabase
      .from("credit_cards")
      .update({ available_limit: newLimit, updated_at: new Date().toISOString() })
      .eq("id", card.id);
  }
}
