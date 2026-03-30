import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BridgeStatus {
  isOnline: boolean;
  lastSeen: Date | null;
  host: string | null;
  secondsAgo: number | null;
}

export function useBridgeStatus(): BridgeStatus {
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Busca inicial + subscribe realtime
  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("key,value")
        .in("key", ["bridge_last_seen", "bridge_host"]);

      if (data) {
        const ls = (data as any[]).find((r) => r.key === "bridge_last_seen");
        const h  = (data as any[]).find((r) => r.key === "bridge_host");
        if (ls?.value) setLastSeen(new Date(ls.value));
        if (h?.value)  setHost(h.value);
      }
    };

    fetchStatus();

    // Realtime: atualiza quando bridge escreve heartbeat
    const channel = supabase
      .channel("bridge-heartbeat")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_settings" }, (payload) => {
        const row = payload.new as any;
        if (row.key === "bridge_last_seen" && row.value) setLastSeen(new Date(row.value));
        if (row.key === "bridge_host" && row.value) setHost(row.value);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Tick a cada 10s para atualizar "secondsAgo"
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = lastSeen ? Math.floor((now - lastSeen.getTime()) / 1000) : null;
  // Considera online se último heartbeat foi há menos de 90s (3 ciclos de 30s)
  const isOnline = secondsAgo !== null && secondsAgo < 90;

  return { isOnline, lastSeen, host, secondsAgo };
}
