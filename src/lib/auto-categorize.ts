import { supabase } from './supabase';

export async function getCategoryPatterns(
  userId: string,
): Promise<{ pattern: string; category_id: string; priority: number }[]> {
  const { data, error } = await supabase
    .from('category_patterns')
    .select('pattern, category_id, priority')
    .eq('user_id', userId)
    .order('priority', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function suggestCategory(
  description: string,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const patterns = await getCategoryPatterns(user.id);
  const lowerDesc = description.toLowerCase();

  for (const { pattern, category_id } of patterns) {
    if (lowerDesc.includes(pattern.toLowerCase())) {
      return category_id;
    }
  }

  return null;
}

export async function saveCategoryPattern(
  description: string,
  categoryId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Find highest priority for this user to assign the next one
  const { data: existing } = await supabase
    .from('category_patterns')
    .select('priority')
    .eq('user_id', user.id)
    .order('priority', { ascending: false })
    .limit(1);

  const nextPriority = existing && existing.length > 0 ? existing[0].priority + 1 : 1;

  const { error } = await supabase.from('category_patterns').insert({
    user_id: user.id,
    pattern: description,
    category_id: categoryId,
    priority: nextPriority,
  });

  if (error) throw error;
}
