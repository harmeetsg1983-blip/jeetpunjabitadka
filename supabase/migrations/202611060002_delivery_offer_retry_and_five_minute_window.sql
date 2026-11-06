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
      -- Never dispatch historical READY orders during recovery; only recent live orders.
      and o.ready_at >= now()-interval '2 hours'
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


-- Keep the rider-facing snapshot expiry aligned with the five-minute offer window.
-- Without this replacement, polling would still expire offers after 45 seconds.
CREATE OR REPLACE FUNCTION public.delivery_partner_offer_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_partner uuid;
  v_assignment record;
  v_order record;
  v_next jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select id into v_partner
  from public.delivery_partners
  where user_id=v_uid and is_active=true
  limit 1;

  if v_partner is null then
    return jsonb_build_object('status','not_registered');
  end if;

  -- Expire only after the same five-minute window used by the retry processor.
  select da.* into v_assignment
  from public.delivery_assignments da
  where da.delivery_partner_id=v_partner and da.status='offered'
  order by da.offered_at asc
  limit 1;

  if v_assignment.id is not null
     and v_assignment.offered_at < now()-interval '5 minutes' then
    update public.delivery_assignments
    set status='expired',
        responded_at=now(),
        rejection_reason='offer_timeout',
        updated_at=now()
    where id=v_assignment.id and status='offered';

    v_next:=public._delivery_offer_next_internal(v_assignment.order_id);
    return jsonb_build_object(
      'status','expired',
      'assignment_id',v_assignment.id,
      'next_offer',v_next
    );
  end if;

  if v_assignment.id is null then
    return jsonb_build_object('status','no_offer');
  end if;

  select id,outlet_id,customer_name,customer_phone,customer_address,total,status
  into v_order
  from public.orders
  where id=v_assignment.order_id;

  return jsonb_build_object(
    'status','offer',
    'assignment_id',v_assignment.id,
    'order',to_jsonb(v_order),
    'offered_at',v_assignment.offered_at
  );
end;
$function$;



-- Enforce the same five-minute deadline at the final ACCEPT RPC boundary.
-- A stale rider screen must never be able to accept an already-expired offer.
CREATE OR REPLACE FUNCTION public.delivery_assignment_respond(
  p_assignment_id uuid,
  p_accept boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid();
  a public.delivery_assignments%rowtype;
  rider public.delivery_partners%rowtype;
  next_offer jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into rider
  from public.delivery_partners
  where user_id=v_uid and is_active=true
  limit 1;

  if rider.id is null then raise exception 'DELIVERY_PARTNER_REQUIRED'; end if;

  select * into a
  from public.delivery_assignments
  where id=p_assignment_id
  for update;

  if not found then raise exception 'ASSIGNMENT_NOT_FOUND'; end if;
  if a.delivery_partner_id <> rider.id then raise exception 'NOT_ASSIGNMENT_OWNER'; end if;
  if a.status <> 'offered' then
    return jsonb_build_object('status','not_offered');
  end if;

  if p_accept then
    if a.offered_at < now()-interval '5 minutes' then
      update public.delivery_assignments
      set status='expired',
          responded_at=coalesce(responded_at,now()),
          rejection_reason='offer_timeout',
          updated_at=now()
      where id=a.id and status='offered';

      next_offer:=public._delivery_offer_next_internal(a.order_id);
      return jsonb_build_object(
        'status','expired',
        'assignment_id',a.id,
        'order_id',a.order_id,
        'next_offer',next_offer
      );
    end if;

    update public.delivery_assignments
    set status='accepted',
        responded_at=now(),
        accepted_at=now(),
        updated_at=now()
    where id=a.id and status='offered';

    if not found then
      return jsonb_build_object('status','not_offered');
    end if;

    return jsonb_build_object(
      'status','accepted',
      'assignment_id',a.id,
      'order_id',a.order_id
    );
  else
    update public.delivery_assignments
    set status='rejected',
        responded_at=now(),
        rejection_reason=left(coalesce(p_reason,'rejected'),500),
        updated_at=now()
    where id=a.id and status='offered';

    if not found then
      return jsonb_build_object('status','not_offered');
    end if;

    next_offer:=public._delivery_offer_next_internal(a.order_id);
    return jsonb_build_object(
      'status','rejected',
      'assignment_id',a.id,
      'order_id',a.order_id,
      'next_offer',next_offer
    );
  end if;
end;
$function$;

-- Ensure the retry processor actually runs. pg_cron is already installed in this project.
DO $schedule$
DECLARE
  v_job_id bigint;
BEGIN
  -- Replace either known name so the existing timeout job is not duplicated.
  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN ('jpt-delivery-offer-timeout','jpt-delivery-offer-retry')
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  -- Preserve the production job name and keep exactly one minute scheduler.
  PERFORM cron.schedule(
    'jpt-delivery-offer-timeout',
    '* * * * *',
    'select public.jpt_process_expired_delivery_offers();'
  );
END
$schedule$;
