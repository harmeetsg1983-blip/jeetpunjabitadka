-- JPT Central Owner Sponsor Media Storage + Read RLS
-- Controlled follow-up migration for Central Media Lab sponsor management.
-- Adds central-owner SELECT on sponsor rows and central-owner media upload/update/delete
-- for the two existing sponsor storage buckets.

create policy "JPT central owner select delivery sponsor ads v2"
on public.delivery_partner_sponsor_ads
for select
to authenticated
using ((select public.partner_access_is_central_owner()));

create policy "JPT central owner select checkout sponsor ads v2"
on public.checkout_sponsor_ads
for select
to authenticated
using ((select public.partner_access_is_central_owner()));

create policy "JPT central owner insert delivery sponsor media v2"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'delivery-partner-sponsors'
  and (storage.foldername(name))[1] = 'sponsors'
  and (select public.partner_access_is_central_owner())
);

create policy "JPT central owner update delivery sponsor media v2"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'delivery-partner-sponsors'
  and (storage.foldername(name))[1] = 'sponsors'
  and (select public.partner_access_is_central_owner())
)
with check (
  bucket_id = 'delivery-partner-sponsors'
  and (storage.foldername(name))[1] = 'sponsors'
  and (select public.partner_access_is_central_owner())
);

create policy "JPT central owner delete delivery sponsor media v2"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'delivery-partner-sponsors'
  and (storage.foldername(name))[1] = 'sponsors'
  and (select public.partner_access_is_central_owner())
);

create policy "JPT central owner insert checkout sponsor media v2"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'checkout-sponsor-media'
  and (storage.foldername(name))[1] = 'checkout-sponsors'
  and (select public.partner_access_is_central_owner())
);

create policy "JPT central owner update checkout sponsor media v2"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'checkout-sponsor-media'
  and (storage.foldername(name))[1] = 'checkout-sponsors'
  and (select public.partner_access_is_central_owner())
)
with check (
  bucket_id = 'checkout-sponsor-media'
  and (storage.foldername(name))[1] = 'checkout-sponsors'
  and (select public.partner_access_is_central_owner())
);

create policy "JPT central owner delete checkout sponsor media v2"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'checkout-sponsor-media'
  and (storage.foldername(name))[1] = 'checkout-sponsors'
  and (select public.partner_access_is_central_owner())
);
