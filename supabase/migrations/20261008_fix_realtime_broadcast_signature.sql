-- Fix Supabase Realtime broadcast_changes signature drift.
-- Current signature: (text,text,text,text,text,record,record,text)
-- Production DB fix applied directly to the Supabase project on 2026-10-08.
create or replace function public.jpt_broadcast_delivery_assignment_live()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_partner uuid;
begin
  v_partner := coalesce(new.delivery_partner_id, old.delivery_partner_id);
  if v_partner is not null then
    perform realtime.broadcast_changes(
      'jpt:delivery:rider:' || v_partner::text,
      'delivery_assignment_' || lower(TG_OP),
      TG_OP,
      'delivery_assignments',
      'public',
      new,
      old,
      'private'
    );
  end if;
  return coalesce(new, old);
end;
$function$;

create or replace function public.jpt_broadcast_delivery_location_live()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
  perform realtime.broadcast_changes(
    'jpt:delivery:rider:' || new.delivery_partner_id::text,
    'delivery_location_updated',
    'INSERT',
    'delivery_location_updates',
    'public',
    new,
    null,
    'private'
  );
  return new;
end;
$function$;
