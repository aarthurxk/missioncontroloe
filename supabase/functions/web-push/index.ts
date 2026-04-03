import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function b64urlToBytes(b64url: string): Uint8Array {
  const pad = b64url + "=".repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob(pad.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function buildAppServer(): Promise<webpush.ApplicationServer> {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

  const rawPub = b64urlToBytes(vapidPublicKey);
  const rawPriv = b64urlToBytes(vapidPrivateKey);

  const pubJwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(rawPub.slice(1, 33)),
    y: bytesToB64url(rawPub.slice(33, 65)),
  };

  const privJwk: JsonWebKey = {
    ...pubJwk,
    d: bytesToB64url(rawPriv),
  };

  const vapidKeys = await webpush.importVapidKeys({
    privateKey: privJwk,
    publicKey: pubJwk,
  });

  return new webpush.ApplicationServer({
    contactInformation: vapidSubject,
    vapidKeys,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: shared secret
    const pushSecret = Deno.env.get("MISSION_CONTROL_PUSH_SECRET");
    const authHeader = req.headers.get("x-push-secret") || "";
    if (!pushSecret || authHeader !== pushSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { execution_id, robot_name, status } = await req.json();
    if (!execution_id || !robot_name || !status) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceRoleKey);

    const { data: subs } = await sb.from("push_subscriptions").select("*");
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusEmoji: Record<string, string> = {
      success: "✅",
      error: "❌",
      cancelled: "⏹",
    };
    const emoji = statusEmoji[status] || "ℹ️";
    const payload = JSON.stringify({
      title: `${emoji} ${robot_name}`,
      body: `Execução finalizada: ${status}`,
      tag: `exec-${execution_id}`,
      url: "/",
    });

    const appServer = await buildAppServer();
    let sent = 0;
    let removed = 0;

    for (const sub of subs) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        });

        const resp = await subscriber.pushTextMessage(payload, {
          urgency: "high",
          ttl: 86400,
        });

        if (resp.ok || resp.status === 201) {
          sent++;
        } else if (resp.status === 410 || resp.status === 404) {
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
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
    console.error("web-push error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
