import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) {
      return reply(500, { error: "SERVER_CONFIGURATION_ERROR" });
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return reply(401, { error: "AUTH_REQUIRED" });
    }

    // Validate the caller's JWT with Supabase Auth; never trust a user ID from the body.
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return reply(401, { error: "AUTH_REQUIRED" });

    const body = await req.json().catch(() => ({}));
    const assignmentId = String(body?.assignment_id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignmentId)) {
      return reply(400, { error: "INVALID_ASSIGNMENT_ID" });
    }

    // Service-role access stays server-side. Every lookup is scoped to the authenticated rider.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rider, error: riderError } = await admin
      .from("delivery_partners")
      .select("id,is_active,onboarding_completed,verification_status")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (riderError) throw riderError;
    if (!rider || !rider.is_active || !rider.onboarding_completed || rider.verification_status !== "verified") {
      return reply(403, { error: "RIDER_NOT_APPROVED" });
    }

    const { data: assignment, error: assignmentError } = await admin
      .from("delivery_assignments")
      .select("id,order_id,status")
      .eq("id", assignmentId)
      .eq("delivery_partner_id", rider.id)
      .in("status", ["accepted", "picked_up", "out_for_delivery"])
      .maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment) return reply(404, { error: "ASSIGNMENT_NOT_AVAILABLE" });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,order_no,customer_name,customer_phone,customer_address,address,delivery_lat,delivery_lng,status,ready_at")
      .eq("id", assignment.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return reply(404, { error: "ORDER_NOT_AVAILABLE" });

    return reply(200, {
      ok: true,
      assignment_id: assignment.id,
      order: {
        id: order.id,
        order_no: order.order_no,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        address: (order.customer_address || "").trim() || (order.address || "").trim(),
        delivery_lat: order.delivery_lat,
        delivery_lng: order.delivery_lng,
        status: order.status,
        ready_at: order.ready_at,
      },
    });
  } catch (error) {
    console.error("delivery-partner-order-details:", error);
    return reply(500, { error: "ORDER_DETAILS_UNAVAILABLE" });
  }
});
