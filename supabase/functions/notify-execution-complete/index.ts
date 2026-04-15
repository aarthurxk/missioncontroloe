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
    kty: "EC", crv: "P-256",
    x: bytesToB64url(rawPub.slice(1, 33)),
    y: bytesToB64url(rawPub.slice(33, 65)),
  };

  const privJwk: JsonWebKey = { ...pubJwk, d: bytesToB64url(rawPriv) };

  const vapidKeys = await webpush.importVapidKeys({
    publicKey: pubJwk,
    privateKey: privJwk,
  });

  return await webpush.ApplicationServer.new({
    contactInformation: vapidSubject,
    vapidKeys,
  });
}

const TERMINAL_STATUSES = new Set(["success", "error", "cancelled"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Supabase Database Webhook payload format
    const { type, record, old_record } = body;

    // Only process UPDATEs where status changed to a terminal state
    if (type !== "UPDATE") {
      return new Response(JSON.stringify({ skipped: true, reason: "not an UPDATE" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = record?.status;
    const oldStatus = old_record?.status;

    // Skip if status didn't change or isn't terminal
    if (!newStatus || !TERMINAL_STATUSES.has(newStatus) || newStatus === oldStatus) {
      return new Response(JSON.stringify({ skipped: true, reason: "status not terminal or unchanged" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const executionId = record.id;
    const robotId = record.robot_id;
    const triggeredByUserId = record.triggered_by_user_id;
    const triggeredBy = record.triggered_by;

    // Check VAPID keys
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

    // Fetch robot name
    const { data: robot } = await sb.from("robots").select("name").eq("id", robotId).single();
    const robotName = robot?.name || "Robô desconhecido";

    // Fetch trigger user name if available
    let triggerLabel = "Agendamento";
    if (triggeredByUserId) {
      const { data: profile } = await sb.from("profiles").select("name").eq("id", triggeredByUserId).single();
      triggerLabel = profile?.name ? `por ${profile.name}` : "Manual";
    } else if (triggeredBy === "dashboard" || triggeredBy === "manual") {
      triggerLabel = "Manual";
    }

    // Fetch all subscriptions, deduplicate per user
    const { data: allSubs } = await sb
      .from("push_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!allSubs || allSubs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seenUsers = new Set<string>();
    const subs: typeof allSubs = [];
    const staleIds: string[] = [];
    for (const sub of allSubs) {
      if (!seenUsers.has(sub.user_id)) {
        seenUsers.add(sub.user_id);
        subs.push(sub);
      } else {
        staleIds.push(sub.id);
      }
    }
    if (staleIds.length > 0) {
      await sb.from("push_subscriptions").delete().in("id", staleIds);
    }

    const statusEmoji: Record<string, string> = {
      success: "✅",
      error: "❌",
      cancelled: "⏹",
    };
    const emoji = statusEmoji[newStatus] || "ℹ️";
    const payload = JSON.stringify({
      title: `${emoji} ${robotName}`,
      body: `${triggerLabel} • ${newStatus}`,
      tag: `exec-${executionId}`,
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
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        });
        await subscriber.pushTextMessage(payload, { urgency: "high", ttl: 86400 });
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

    console.log(`notify-execution-complete: ${robotName} → ${newStatus} | sent=${sent} removed=${removed} failed=${failed}`);

    return new Response(
      JSON.stringify({ sent, removed, failed, total: subs.length, execution_id: executionId, status: newStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("notify-execution-complete error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
