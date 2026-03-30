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

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await (supabase as any)
        .from("bridge_status")
        .select("last_seen,host")
        .eq("id", "singleton")
        .single();

      if (data?.last_seen) setLastSeen(new Date(data.last_seen));
      if (data?.host)      setHost(data.host);
    };

    fetchStatus();

    const channel = supabase
      .channel("bridge-status-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bridge_status" }, (payload) => {
        const row = payload.new as any;
        if (row.last_seen) setLastSeen(new Date(row.last_seen));
        if (row.host)      setHost(row.host);
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
  const isOnline = secondsAgo !== null && secondsAgo < 90;

  return { isOnline, lastSeen, host, secondsAgo };
}
