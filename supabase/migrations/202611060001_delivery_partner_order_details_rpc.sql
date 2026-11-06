-- Delivery Partner: expose only the authenticated rider's own active assigned order details.
-- Apply only after review; this migration is intentionally not executed against production here.
create or replace function public.delivery_partner_order_details(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider_id uuid;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select dp.id
    into v_rider_id
  from public.delivery_partners dp
  where dp.user_id = auth.uid()
    and dp.is_active = true
    and dp.onboarding_completed = true
    and dp.verification_status = 'verified'
  limit 1;

  if v_rider_id is null then
    raise exception 'RIDER_NOT_APPROVED';
  end if;

  select jsonb_build_object(
    'ok', true,
    'assignment_id', da.id,
    'order', jsonb_build_object(
      'id', o.id,
      'order_no', o.order_no,
      'customer_name', o.customer_name,
      'customer_phone', o.customer_phone,
      'address', coalesce(nullif(btrim(o.customer_address), ''), nullif(btrim(o.address), '')),
      'delivery_lat', o.delivery_lat,
      'delivery_lng', o.delivery_lng,
      'status', o.status,
      'ready_at', o.ready_at
    )
  )
  into v_result
  from public.delivery_assignments da
  join public.orders o on o.id = da.order_id
  where da.id = p_assignment_id
    and da.delivery_partner_id = v_rider_id
    and da.status in ('accepted', 'picked_up', 'out_for_delivery')
  limit 1;

  if v_result is null then
    raise exception 'ASSIGNMENT_NOT_AVAILABLE';
  end if;

  return v_result;
end;
$$;

revoke all on function public.delivery_partner_order_details(uuid) from public;
revoke all on function public.delivery_partner_order_details(uuid) from anon;
grant execute on function public.delivery_partner_order_details(uuid) to authenticated;
