-- JPT Central Owner Sponsor Ads RLS
-- Controlled migration for the existing sponsor tables.
-- Only authenticated users passing the existing central-owner authorization
-- function may create, update, or delete sponsor rows.
-- Existing SELECT policies are intentionally left untouched.

create policy "JPT central owner insert delivery sponsor ads v1"
on public.delivery_partner_sponsor_ads
for insert
to authenticated
with check ((select public.partner_access_is_central_owner()));

create policy "JPT central owner update delivery sponsor ads v1"
on public.delivery_partner_sponsor_ads
for update
to authenticated
using ((select public.partner_access_is_central_owner()))
with check ((select public.partner_access_is_central_owner()));

create policy "JPT central owner delete delivery sponsor ads v1"
on public.delivery_partner_sponsor_ads
for delete
to authenticated
using ((select public.partner_access_is_central_owner()));

create policy "JPT central owner insert checkout sponsor ads v1"
on public.checkout_sponsor_ads
for insert
to authenticated
with check ((select public.partner_access_is_central_owner()));

create policy "JPT central owner update checkout sponsor ads v1"
on public.checkout_sponsor_ads
for update
to authenticated
using ((select public.partner_access_is_central_owner()))
with check ((select public.partner_access_is_central_owner()));

create policy "JPT central owner delete checkout sponsor ads v1"
on public.checkout_sponsor_ads
for delete
to authenticated
using ((select public.partner_access_is_central_owner()));
