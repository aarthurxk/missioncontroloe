import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
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

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSb = createClient(supabaseUrl, serviceRoleKey);

    const { data: subs } = await adminSb
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum dispositivo cadastrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const appServer = await buildAppServer();
    const payload = JSON.stringify({
      title: "🔔 Teste de Notificação",
      body: "Se você está vendo isso, push notifications estão funcionando!",
      tag: "test-push",
      url: "/settings",
    });

    let sent = 0;
    let removed = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        console.log(`Sending push to sub ${sub.id}, endpoint: ${sub.endpoint.substring(0, 60)}...`);
        console.log(`keys_p256dh length: ${sub.keys_p256dh?.length}, keys_auth length: ${sub.keys_auth?.length}`);
        
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        });

        await subscriber.pushTextMessage(payload, {
          urgency: "high",
          ttl: 86400,
        });
        console.log(`Push sent successfully to sub ${sub.id}`);
        sent++;
      } catch (e: any) {
        console.error(`Push error for ${sub.id}:`, e?.constructor?.name, e?.message || String(e));
        if (e?.statusCode) console.error(`Status code: ${e.statusCode}`);
        if (e instanceof webpush.PushMessageError) {
          console.error(`PushMessageError statusCode: ${e.statusCode}, isGone: ${e.isGone()}`);
          if (e.isGone()) {
            await adminSb.from("push_subscriptions").delete().eq("id", sub.id);
            removed++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, removed, failed, total: subs.length }),
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
