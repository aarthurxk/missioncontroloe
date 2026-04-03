import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reuse VAPID signing from web-push
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

  const pad = (s: string) => s + "=".repeat((4 - (s.length % 4)) % 4);
  const rawPrivate = Uint8Array.from(
    atob(pad(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/"))),
    (c) => c.charCodeAt(0)
  );
  const rawPublic = Uint8Array.from(
    atob(pad(vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/"))),
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
    // Authenticate via JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get only this user's subscriptions
    const { data: subs } = await sb.from("push_subscriptions").select("*").eq("user_id", user.id);
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum dispositivo cadastrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifPayload = JSON.stringify({
      title: "🔔 Teste de Notificação",
      body: "Se você está vendo isso, push notifications estão funcionando!",
      tag: "test-push",
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
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const adminSb = createClient(supabaseUrl, serviceRoleKey);
          await adminSb.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else if (resp.ok || resp.status === 201) {
          sent++;
        } else {
          console.error(`Push failed for ${sub.id}: ${resp.status} ${await resp.text()}`);
        }
      } catch (e) {
        console.error(`Push error for ${sub.id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ sent, removed, total: subs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("test-push error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
