create or replace function public.jpt_partner_transition_order(
  p_order_id bigint,
  p_next_status text,
  p_target_minutes integer default 30,
  p_rejection_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders;
  v_next text := lower(trim(coalesce(p_next_status,'')));
  v_uid uuid := auth.uid();
  v_manage boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;

  v_manage :=
    (select public.partner_access_is_central_owner())
    or exists (
      select 1 from public.partner_outlet_access a
      where a.user_id=v_uid and a.outlet_id=v_order.outlet_id and a.access_level='manage'
    );

  if not v_manage then raise exception 'Order access denied for this outlet.'; end if;

  if v_next='preparing' then
    if v_order.status not in ('new','accepted') then raise exception 'Order is not in NEW/ACCEPTED state.'; end if;
    update public.orders set
      status='preparing',
      target_minutes=case when v_order.status='new' then greatest(5,least(120,coalesce(p_target_minutes,30))) else target_minutes end,
      accepted_at=case when v_order.status='new' then coalesce(accepted_at,now()) else accepted_at end,
      preparing_at=coalesce(preparing_at,now()),
      deadline_at=case when v_order.status='new' then coalesce(deadline_at,now()+(greatest(5,least(120,coalesce(p_target_minutes,30)))||' minutes')::interval) else deadline_at end,
      eta_minutes=case when v_order.status='new' then greatest(5,least(120,coalesce(p_target_minutes,30)))+20 else eta_minutes end,
      updated_at=now()
    where id=p_order_id returning * into v_order;
  elsif v_next='ready' then
    if v_order.status<>'preparing' then raise exception 'Order is not in PREPARING state.'; end if;
    update public.orders set status='ready',ready_at=coalesce(ready_at,now()),updated_at=now() where id=p_order_id returning * into v_order;
  elsif v_next='out_for_delivery' then
    if v_order.status<>'ready' then raise exception 'Order is not READY.'; end if;
    update public.orders set status='out_for_delivery',out_for_delivery_at=coalesce(out_for_delivery_at,now()),updated_at=now() where id=p_order_id returning * into v_order;
  elsif v_next='delivered' then
    if v_order.status<>'out_for_delivery' then raise exception 'Order is not OUT FOR DELIVERY.'; end if;
    update public.orders set status='delivered',delivered_at=coalesce(delivered_at,now()),updated_at=now() where id=p_order_id returning * into v_order;
  elsif v_next='cancelled' then
    if v_order.status<>'new' then raise exception 'Only a NEW order can be rejected.'; end if;
    update public.orders set status='cancelled',rejection_reason=coalesce(nullif(trim(p_rejection_reason),''),'Rejected by restaurant'),updated_at=now() where id=p_order_id returning * into v_order;
  else
    raise exception 'Unsupported order transition.';
  end if;

  return v_order;
end;
$function$;

revoke execute on function public.jpt_partner_transition_order(bigint,text,integer,text) from public, anon;
grant execute on function public.jpt_partner_transition_order(bigint,text,integer,text) to authenticated;
