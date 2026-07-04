-- Atomic update for credit card available_limit
-- Prevents race conditions when multiple transactions modify the same card
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new

create or replace function update_card_limit_atomic(
  p_card_id uuid,
  p_delta numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_limit numeric;
  v_total_limit numeric;
begin
  -- Lock the row and get current values
  select available_limit, total_limit
  into v_new_limit, v_total_limit
  from credit_cards
  where id = p_card_id
  for update;

  if not found then
    raise exception 'Card not found: %', p_card_id;
  end if;

  -- Calculate new limit bounded by [0, total_limit]
  v_new_limit := greatest(0, least(v_total_limit, v_new_limit + p_delta));

  -- Update atomically
  update credit_cards
  set available_limit = v_new_limit,
      updated_at = now()
  where id = p_card_id;

  return v_new_limit;
end;
$$;

-- Grant execution to authenticated users
grant execute on function update_card_limit_atomic(uuid, numeric) to authenticated;
