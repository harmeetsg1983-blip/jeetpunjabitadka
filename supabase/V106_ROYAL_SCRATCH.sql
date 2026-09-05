-- JPT V106 — ROYAL GOLD SCRATCH
-- Run once in the SAME Supabase project used by the live menu.

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS max_discount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS scratch_enabled boolean NOT NULL DEFAULT false;

UPDATE public.offers
SET
  max_discount = CASE
    WHEN value = 20 THEN 40
    WHEN value = 30 THEN 60
    WHEN value = 40 THEN 80
    WHEN value = 50 THEN 100
    WHEN value = 60 THEN 120
    ELSE max_discount
  END,
  scratch_enabled = CASE
    WHEN value IN (20,30,40,50,60)
      AND lower(coalesce(title,'')) LIKE '%scratch%' THEN true
    ELSE scratch_enabled
  END,
  updated_at = now()
WHERE lower(coalesce(title,'')) LIKE '%scratch card%'
   OR lower(coalesce(title,'')) LIKE '%scratch%';

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT code FROM public.outlets LOOP
    INSERT INTO public.offers (outlet_id,title,description,offer_type,value,max_discount,scratch_enabled,active,min_order,created_at,updated_at)
    VALUES (r.code,'V106 Scratch Card — 20%','Royal Gold Scratch & Reveal','percent',20,40,true,true,0,now(),now()) ON CONFLICT DO NOTHING;
    INSERT INTO public.offers (outlet_id,title,description,offer_type,value,max_discount,scratch_enabled,active,min_order,created_at,updated_at)
    VALUES (r.code,'V106 Scratch Card — 30%','Royal Gold Scratch & Reveal','percent',30,60,true,true,0,now(),now()) ON CONFLICT DO NOTHING;
    INSERT INTO public.offers (outlet_id,title,description,offer_type,value,max_discount,scratch_enabled,active,min_order,created_at,updated_at)
    VALUES (r.code,'V106 Scratch Card — 40%','Royal Gold Scratch & Reveal','percent',40,80,true,true,0,now(),now()) ON CONFLICT DO NOTHING;
    INSERT INTO public.offers (outlet_id,title,description,offer_type,value,max_discount,scratch_enabled,active,min_order,created_at,updated_at)
    VALUES (r.code,'V106 Scratch Card — 50%','Royal Gold Scratch & Reveal','percent',50,100,true,true,0,now(),now()) ON CONFLICT DO NOTHING;
    INSERT INTO public.offers (outlet_id,title,description,offer_type,value,max_discount,scratch_enabled,active,min_order,created_at,updated_at)
    VALUES (r.code,'V106 Scratch Card — 60%','Royal Gold Scratch & Reveal','percent',60,120,true,true,0,now(),now()) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

UPDATE public.offers SET max_discount=40,scratch_enabled=true,active=true,updated_at=now() WHERE title='V106 Scratch Card — 20%';
UPDATE public.offers SET max_discount=60,scratch_enabled=true,active=true,updated_at=now() WHERE title='V106 Scratch Card — 30%';
UPDATE public.offers SET max_discount=80,scratch_enabled=true,active=true,updated_at=now() WHERE title='V106 Scratch Card — 40%';
UPDATE public.offers SET max_discount=100,scratch_enabled=true,active=true,updated_at=now() WHERE title='V106 Scratch Card — 50%';
UPDATE public.offers SET max_discount=120,scratch_enabled=true,active=true,updated_at=now() WHERE title='V106 Scratch Card — 60%';
