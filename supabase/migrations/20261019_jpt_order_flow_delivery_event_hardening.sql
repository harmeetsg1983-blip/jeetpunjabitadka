-- JPT order-flow delivery-event hardening.
-- Keep the existing single auto-offer trigger on public.orders.
-- Replace invalid use of realtime.broadcast_changes(..., 'private') with realtime.send(..., true).
CREATE OR REPLACE FUNCTION public.jpt_broadcast_delivery_assignment_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_partner uuid;
BEGIN
  v_partner := coalesce(NEW.delivery_partner_id, OLD.delivery_partner_id);

  IF v_partner IS NOT NULL THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA
      ),
      'delivery_assignment_' || lower(TG_OP),
      'jpt:delivery:rider:' || v_partner::text,
      true
    );
  END IF;

  RETURN coalesce(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.jpt_broadcast_delivery_location_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'record', to_jsonb(NEW),
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA
    ),
    'delivery_location_updated',
    'jpt:delivery:rider:' || NEW.delivery_partner_id::text,
    true
  );

  RETURN NEW;
END;
$function$;

-- This older READY-only trigger duplicates the guarded multi-status trigger
-- jpt_auto_delivery_offer_after_order_trg. Its unhandled exception could roll
-- back the READY transition when the delivery-offer side effect failed.
DROP TRIGGER IF EXISTS trg_delivery_auto_offer_when_ready ON public.orders;
