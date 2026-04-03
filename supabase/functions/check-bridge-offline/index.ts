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
    publicKey: pubJwk,
    privateKey: privJwk,
  });

  return await webpush.ApplicationServer.new({
    contactInformation: vapidSubject,
    vapidKeys,
  });
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

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bridge } = await sb
      .from("bridge_status")
      .select("last_seen")
      .eq("id", "singleton")
      .single();

    if (!bridge || !bridge.last_seen) {
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

    const { data: lastAlert } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "bridge_offline_alert_at")
      .single();

    if (lastAlert?.value) {
      const lastAlertTime = new Date(lastAlert.value);
      const alertDiffMin = (Date.now() - lastAlertTime.getTime()) / 1000 / 60;
      if (alertDiffMin < 30) {
        return new Response(
          JSON.stringify({ status: "offline_already_alerted", minutes_ago: diffMinutes.toFixed(1) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
      url: "/",
    });

    const appServer = await buildAppServer();
    let sent = 0;
    let removed = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        });

        await subscriber.pushTextMessage(notifPayload, {
          urgency: "high",
          ttl: 86400,
        });
        sent++;
      } catch (e) {
        if (e instanceof webpush.PushMessageError && e.isGone()) {
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else {
          failed++;
          console.error(`Push error for ${sub.id}:`, e);
        }
      }
    }

    await sb.from("app_settings").upsert({
      key: "bridge_offline_alert_at",
      value: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ status: "offline_alerted", sent, removed, failed, minutes_ago: diffMinutes.toFixed(1) }),
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
