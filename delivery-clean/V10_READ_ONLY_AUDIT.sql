-- READ ONLY — do not modify production data
select count(*) as riders from public.delivery_partners;
select count(*) as device_sessions from public.delivery_partner_device_sessions;
select count(*) as push_tokens from public.delivery_partner_device_sessions where push_token is not null and length(trim(push_token))>0;
select count(*) as assignments from public.delivery_assignments;
select count(*) as gps_rows from public.delivery_location_updates;
select count(*) as earnings from public.delivery_partner_earnings;
select assignment_id, count(*) as earning_rows
from public.delivery_partner_earnings
group by assignment_id having count(*)>1;
