create or replace function spend_tokens(p_user_id uuid, p_cost int)
returns boolean
language plpgsql
security definer
as $$
declare
  v_user record;
  v_today date := current_date;
  v_last_reset date;
begin
  select tokens_used_today, daily_token_limit, is_premium, generations_reset_at
  into v_user
  from users
  where id = p_user_id
  for update;

  if not found then return false; end if;

  v_last_reset := date(v_user.generations_reset_at at time zone 'utc');

  -- Reset tokens if it's a new day
  if v_last_reset is null or v_today <> v_last_reset then
    update users
    set tokens_used_today = p_cost,
        generations_reset_at = now()
    where id = p_user_id;
    return true;
  end if;

  -- Check limit
  if not v_user.is_premium and (v_user.tokens_used_today + p_cost) > coalesce(v_user.daily_token_limit, 20) then
    return false;
  end if;

  -- Proceed to deduct
  update users
  set tokens_used_today = tokens_used_today + p_cost
  where id = p_user_id;

  return true;
end;
$$;

create or replace function refund_tokens(p_user_id uuid, p_cost int)
returns boolean
language plpgsql
security definer
as $$
declare
  v_user record;
begin
  select tokens_used_today
  into v_user
  from users
  where id = p_user_id
  for update;

  if not found then return false; end if;

  if (v_user.tokens_used_today - p_cost) < 0 then
    raise warning 'Refund would take tokens_used_today below zero for user %', p_user_id;
    update users
    set tokens_used_today = 0
    where id = p_user_id;
  else
    update users
    set tokens_used_today = tokens_used_today - p_cost
    where id = p_user_id;
  end if;

  return true;
end;
$$;
