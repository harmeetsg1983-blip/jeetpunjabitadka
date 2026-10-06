import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3.4.5";

type PushRequest = {
  event_type?: string;
  outlet_id?: string;
  order_id?: string | number;
  order_no?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function secretKeys() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return legacy ? { default: legacy } : {};
}

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

let vaultCache: Record<string,string> | null = null;

async function vaultSecrets() {
  if (vaultCache) return vaultCache;
  const dbUrl = Deno.env.get("SUPABASE_DB_URL") || "";
  if (!dbUrl) return {};
  const sql = postgres(dbUrl, { prepare: false, max: 1 });
  try {
    const rows = await sql<{name:string; value:string}>\`
      select name, decrypted_secret as value
      from vault.decrypted_secrets
      where name in ('jpt_push_internal_secret','jpt_vapid_subject','jpt_vapid_public_key','jpt_vapid_private_key')
    \`;
    vaultCache = Object.fromEntries(rows.map(r => [r.name, r.value]));
    return vaultCache;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const vault = await vaultSecrets();
  const internalSecret = Deno.env.get("JPT_PUSH_INTERNAL_SECRET") || vault.jpt_push_internal_secret || "";
  const supplied = req.headers.get("x-jpt-push-secret") || "";
  if (!internalSecret || !safeEqual(supplied, internalSecret)) {
    return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  }

  const vapidSubject = Deno.env.get("JPT_VAPID_SUBJECT") || vault.jpt_vapid_subject || "";
  const vapidPublic = Deno.env.get("JPT_VAPID_PUBLIC_KEY") || vault.jpt_vapid_public_key || "";
  const vapidPrivate = Deno.env.get("JPT_VAPID_PRIVATE_KEY") || vault.jpt_vapid_private_key || "";
  if (!vapidSubject || !vapidPublic || !vapidPrivate) {
    return json({ ok: false, error: "VAPID_NOT_CONFIGURED" }, 503);
  }

  let payload: PushRequest;
  try { payload = await req.json(); }
  catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }

  const outletId = String(payload.outlet_id || "").trim();
  const orderId = String(payload.order_id || "").trim();
  if (!outletId || !orderId) return json({ ok: false, error: "OUTLET_AND_ORDER_REQUIRED" }, 400);

  const keys = secretKeys();
  const serviceKey = keys.default;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  if (!serviceKey || !supabaseUrl) return json({ ok: false, error: "SUPABASE_SERVER_CONFIG_MISSING" }, 503);

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: rows, error: queryError } = await admin
    .from("restaurant_partner_push_subscriptions")
    .select("id,endpoint,subscription,sound_enabled,is_active")
    .eq("outlet_id", outletId)
    .eq("is_active", true);

  if (queryError) return json({ ok: false, error: queryError.message }, 500);

  const notification = {
    title: payload.title || "Jeet Punjabi Tadka — New Order",
    body: payload.body || ("New order " + (payload.order_no || orderId)),
    url: payload.url || ("./admin.html?push=order&section=orders&order_id=" + encodeURIComponent(orderId) + "&outlet_id=" + encodeURIComponent(outletId)),
    tag: payload.tag || ("jpt-new-order-" + orderId),
    event_type: payload.event_type || "order.created",
    order_id: orderId,
    outlet_id: outletId
  };

  let sent = 0, failed = 0, removed = 0;
  for (const row of rows || []) {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(notification), { TTL: 120 });
      sent++;
    } catch (e) {
      failed++;
      const status = Number((e as any)?.statusCode || 0);
      if (status === 404 || status === 410) {
        await admin.from("restaurant_partner_push_subscriptions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", row.id);
        removed++;
      }
    }
  }

  return json({ ok: true, outlet_id: outletId, order_id: orderId, attempted: (rows || []).length, sent, failed, removed });
});
