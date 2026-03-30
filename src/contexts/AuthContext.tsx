import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  avatar_emoji: string;
}

export type AppRole = "admin" | "viewer";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.allSettled([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.rpc("get_user_role", { _user_id: userId }),
      ]);

      if (profileRes.status === "fulfilled") {
        setProfile((profileRes.value as any).data ?? null);
      }
      if (roleRes.status === "fulfilled") {
        setRole(((roleRes.value as any).data as AppRole) ?? null);
      }
    } catch {
      // silencioso — mantém estado anterior
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfileAndRole(user.id);
  }, [user, fetchProfileAndRole]);

  useEffect(() => {
    // Timeout absoluto: nunca fica em loading mais de 4s
    const hardTimeout = setTimeout(() => setLoading(false), 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          fetchProfileAndRole(currentUser.id).finally(() => {
            setLoading(false);
            clearTimeout(hardTimeout);
          });
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
          clearTimeout(hardTimeout);
        }
      }
    );

    // Força o disparo imediato verificando a sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Sem sessão — para de carregar imediatamente
        setUser(null);
        setLoading(false);
        clearTimeout(hardTimeout);
      }
      // Com sessão: onAuthStateChange vai disparar e resolver o loading
    }).catch(() => {
      setLoading(false);
      clearTimeout(hardTimeout);
    });

    return () => {
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfileAndRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
