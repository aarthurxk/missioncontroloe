import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// VAPID signing (same as web-push)
async function generatePushHeaders(
  endpoint: string,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = btoa(JSON.stringify({ aud, exp, sub: vapidSubject }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const rawPrivate = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/") + "=="),
    (c) => c.charCodeAt(0)
  );
  const rawPublic = Uint8Array.from(
    atob(vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/") + "=="),
    (c) => c.charCodeAt(0)
  );
  const x = btoa(String.fromCharCode(...rawPublic.slice(1, 33)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const y = btoa(String.fromCharCode(...rawPublic.slice(33, 65)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const d = btoa(String.fromCharCode(...rawPrivate))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sigBuf = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    sigInput
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return {
    authorization: `vapid t=${header}.${payload}.${sig}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check bridge_status singleton
    const { data: bridge } = await sb
      .from("bridge_status")
      .select("last_seen")
      .eq("id", "singleton")
      .single();

    if (!bridge || !bridge.last_seen) {
      console.log("No bridge status found, skipping.");
      return new Response(JSON.stringify({ status: "no_bridge_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastSeen = new Date(bridge.last_seen);
    const diffMs = Date.now() - lastSeen.getTime();
    const diffMinutes = diffMs / 1000 / 60;

    if (diffMinutes < 2) {
      return new Response(JSON.stringify({ status: "online", minutes_ago: diffMinutes.toFixed(1) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we already sent an offline alert recently (via app_settings)
    const { data: lastAlert } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "bridge_offline_alert_at")
      .single();

    if (lastAlert?.value) {
      const lastAlertTime = new Date(lastAlert.value);
      const alertDiffMin = (Date.now() - lastAlertTime.getTime()) / 1000 / 60;
      // Don't spam — only alert once every 30 minutes
      if (alertDiffMin < 30) {
        return new Response(
          JSON.stringify({ status: "offline_already_alerted", minutes_ago: diffMinutes.toFixed(1) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Bridge is offline > 2 min, send push to all subscriptions
    const { data: subs } = await sb.from("push_subscriptions").select("*");
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ status: "offline_no_subs", minutes_ago: diffMinutes.toFixed(1) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifPayload = JSON.stringify({
      title: "⚠️ Agent Bridge Offline",
      body: `Sem conexão há ${Math.floor(diffMinutes)} minutos. Verifique a VPS.`,
      tag: "bridge-offline",
      url: "/settings",
    });

    let sent = 0;
    let removed = 0;

    for (const sub of subs) {
      try {
        const vapidHeaders = await generatePushHeaders(
          sub.endpoint, vapidSubject, vapidPublicKey, vapidPrivateKey
        );

        const resp = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            TTL: "86400",
            Urgency: "high",
            Authorization: vapidHeaders.authorization,
            "Crypto-Key": vapidHeaders.cryptoKey,
          },
          body: notifPayload,
        });

        if (resp.status === 410 || resp.status === 404) {
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else if (resp.ok || resp.status === 201) {
          sent++;
        }
      } catch (e) {
        console.error(`Push error for ${sub.id}:`, e);
      }
    }

    // Mark alert sent
    await sb.from("app_settings").upsert({
      key: "bridge_offline_alert_at",
      value: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ status: "offline_alerted", sent, removed, minutes_ago: diffMinutes.toFixed(1) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("check-bridge-offline error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
