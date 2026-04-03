import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type PushState = "unsupported" | "not-pwa" | "no-vapid" | "ready" | "subscribed" | "denied";

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("unsupported");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  const isPwa =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;

  const isSupported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Fetch VAPID public key from backend
  useEffect(() => {
    supabase.functions.invoke("vapid-public-key", { method: "GET" }).then(({ data, error: err }) => {
      if (!err && data?.vapid_public_key) {
        setVapidKey(data.vapid_public_key);
      }
    });
  }, []);

  // Determine initial state
  useEffect(() => {
    if (!isSupported) { setState("unsupported"); return; }
    if (!isPwa) { setState("not-pwa"); return; }
    if (vapidKey === null) { setState("no-vapid"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }

    // Check existing subscription
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "ready");
    });
  }, [isSupported, isPwa, vapidKey]);

  const subscribe = useCallback(async () => {
    if (!user || !vapidKey) return;
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        setError("Permissão de notificação negada.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const keys = sub.toJSON().keys!;
      const ua = navigator.userAgent;
      const label = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : "Desktop";

      await (supabase.from("push_subscriptions" as any) as any).upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          keys_p256dh: keys.p256dh,
          keys_auth: keys.auth,
          device_label: label,
        },
        { onConflict: "user_id,endpoint" }
      );

      setState("subscribed");
    } catch (e: any) {
      setError(e.message || "Erro ao ativar notificações.");
    } finally {
      setLoading(false);
    }
  }, [user, vapidKey]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await (supabase.from("push_subscriptions" as any) as any)
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("ready");
    } catch (e: any) {
      setError(e.message || "Erro ao desativar.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { state, loading, error, subscribe, unsubscribe };
}
