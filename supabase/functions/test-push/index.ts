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

type SimType = "test" | "success" | "error" | "cancelled" | "bridge_offline" | "bridge_online";

function buildPayload(type: SimType): string {
  const payloads: Record<SimType, { title: string; body: string; tag: string; url: string }> = {
    test: {
      title: "🔔 Teste de Notificação",
      body: "Se você está vendo isso, push notifications estão funcionando!",
      tag: "test-push",
      url: "/settings",
    },
    success: {
      title: "✅ Relatório Mensal",
      body: "Execução finalizada: success",
      tag: "exec-sim-success",
      url: "/",
    },
    error: {
      title: "❌ Backup Diário",
      body: "Execução finalizada: error",
      tag: "exec-sim-error",
      url: "/",
    },
    cancelled: {
      title: "⏹ Sync Agenda",
      body: "Execução finalizada: cancelled",
      tag: "exec-sim-cancelled",
      url: "/",
    },
    bridge_offline: {
      title: "⚠️ Agent Bridge Offline",
      body: "Sem conexão há 5 minutos. Verifique a VPS.",
      tag: "bridge-offline",
      url: "/",
    },
    bridge_online: {
      title: "✅ Agent Bridge Online",
      body: "Reconectado após 5 minutos offline.",
      tag: "bridge-online",
      url: "/",
    },
  };
  return JSON.stringify(payloads[type] || payloads.test);
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

    // Parse optional type from body
    let simType: SimType = "test";
    try {
      const body = await req.json();
      if (body?.type && ["test", "success", "error", "cancelled", "bridge_offline", "bridge_online"].includes(body.type)) {
        simType = body.type as SimType;
      }
    } catch {
      // no body or invalid json — default to "test"
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
    const payload = buildPayload(simType);

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

        await subscriber.pushTextMessage(payload, {
          urgency: "high",
          ttl: 86400,
        });
        sent++;
      } catch (e: any) {
        if (e instanceof webpush.PushMessageError && e.isGone()) {
          await adminSb.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else {
          failed++;
          console.error(`Push error for ${sub.id}:`, e);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, removed, failed, total: subs.length, type: simType }),
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
