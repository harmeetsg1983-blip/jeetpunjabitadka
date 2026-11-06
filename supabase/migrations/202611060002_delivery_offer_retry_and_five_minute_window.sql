-- JPT delivery dispatch recovery: retry READY orders when no fresh rider was online.
-- Align rider offer acceptance window with the 5-minute behavior shown in the reference flow.
CREATE OR REPLACE FUNCTION public._delivery_offer_next_internal(p_order_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
declare
  v_outlet text;
  v_partner uuid;
  v_assignment uuid;
begin
  select outlet_id into v_outlet
  from public.orders
  where id=p_order_id and status in ('accepted','preparing','ready')
  for update;

  if v_outlet is null then
    return jsonb_build_object('status','order_not_eligible_or_not_found');
  end if;

  update public.delivery_assignments
  set status='expired',
      responded_at=coalesce(responded_at,now()),
      rejection_reason='offer_timeout',
      updated_at=now()
  where order_id=p_order_id
    and status='offered'
    and offered_at < now()-interval '5 minutes';

  if exists(
    select 1 from public.delivery_assignments
    where order_id=p_order_id
      and status in ('offered','accepted','picked_up','out_for_delivery')
  ) then
    return jsonb_build_object('status','already_assigned');
  end if;

  select dp.id into v_partner
  from public.delivery_partners dp
  join public.delivery_partner_outlets dpo
    on dpo.delivery_partner_id=dp.id
   and dpo.outlet_id=v_outlet
   and dpo.is_active=true
  where dp.is_active=true
    and dp.status='online'
    and dp.onboarding_completed=true
    and dp.verification_status='verified'
    and dp.last_seen_at >= now()-interval '2 minutes'
    and not exists(
      select 1 from public.delivery_assignments x
      where x.delivery_partner_id=dp.id
        and x.status in ('offered','accepted','picked_up','out_for_delivery')
    )
  order by dp.last_seen_at desc,dp.created_at asc
  for update of dp skip locked
  limit 1;

  if v_partner is null then
    return jsonb_build_object(
      'status','no_online_rider',
      'outlet_id',v_outlet,
      'reason','no_fresh_heartbeat'
    );
  end if;

  insert into public.delivery_assignments(
    order_id,outlet_id,delivery_partner_id,status,offered_at,created_at,updated_at
  )
  values(p_order_id,v_outlet,v_partner,'offered',now(),now(),now())
  returning id into v_assignment;

  return jsonb_build_object(
    'status','offered',
    'assignment_id',v_assignment,
    'delivery_partner_id',v_partner,
    'outlet_id',v_outlet
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.jpt_process_expired_delivery_offers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  a record;
  n jsonb;
  expired_processed integer := 0;
  ready_retried integer := 0;
begin
  -- Expire offers that were not accepted within five minutes, then try the next rider.
  for a in
    select id, order_id
    from public.delivery_assignments
    where status='offered'
      and offered_at < now()-interval '5 minutes'
    order by offered_at asc
    for update skip locked
  loop
    update public.delivery_assignments
    set status='expired',
        responded_at=coalesce(responded_at,now()),
        rejection_reason='offer_timeout',
        updated_at=now()
    where id=a.id and status='offered';

    if found then
      n := public._delivery_offer_next_internal(a.order_id);
      expired_processed := expired_processed + 1;
    end if;
  end loop;

  -- Recover READY orders whose original trigger found no fresh online rider.
  for a in
    select o.id
    from public.orders o
    where o.status='ready'
      and not exists(
        select 1 from public.delivery_assignments da
        where da.order_id=o.id
          and da.status in ('offered','accepted','picked_up','out_for_delivery')
      )
    order by o.created_at asc
    limit 100
    for update of o skip locked
  loop
    n := public._delivery_offer_next_internal(a.id);
    if n->>'status'='offered' then
      ready_retried := ready_retried + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'expired_processed',expired_processed,
    'ready_retried',ready_retried
  );
end;
$function$;

-- Ensure the retry processor actually runs. pg_cron is already installed in this project.
DO $schedule$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname='jpt-delivery-offer-retry';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'jpt-delivery-offer-retry',
    '* * * * *',
    'select public.jpt_process_expired_delivery_offers();'
  );
END
$schedule$;
