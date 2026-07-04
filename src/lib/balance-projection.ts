import { supabase } from './supabase';
import {
  startOfMonth,
  endOfMonth,
  differenceInDays,
  format,
} from 'date-fns';

export async function getDailyAverageSpending(userId: string): Promise<{
  dailyAvg: number;
  daysElapsed: number;
  daysRemaining: number;
  totalSpent: number;
}> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const daysElapsed = Math.max(differenceInDays(now, monthStart), 1);
  const daysRemaining = Math.max(differenceInDays(monthEnd, now), 0);

  const startDate = format(monthStart, 'yyyy-MM-dd');
  const endDate = format(now, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  const totalSpent = (data ?? []).reduce((sum, t) => sum + t.amount, 0);
  const dailyAvg = totalSpent / daysElapsed;

  return { dailyAvg, daysElapsed, daysRemaining, totalSpent };
}

export async function projectMonthEndBalance(userId: string): Promise<{
  currentBalance: number;
  projectedBalance: number;
  dailyBurnRate: number;
  daysRemaining: number;
}> {
  const now = new Date();
  const monthEnd = endOfMonth(now);
  const daysRemaining = Math.max(differenceInDays(monthEnd, now), 0);

  // Get current total balance across all active accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('balance')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (accountsError) throw accountsError;

  const currentBalance = (accounts ?? []).reduce(
    (sum, a) => sum + a.balance,
    0,
  );

  // Get daily burn rate
  const { dailyAvg } = await getDailyAverageSpending(userId);

  const projectedBalance = currentBalance - dailyAvg * daysRemaining;

  return {
    currentBalance,
    projectedBalance,
    dailyBurnRate: dailyAvg,
    daysRemaining,
  };
}
