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

const AUTH_TIMEOUT = 3000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = useCallback(async (userId: string, attempt = 1) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single() as any,
        supabase.rpc("get_user_role", { _user_id: userId }) as any,
      ]);
      const profileData = profileRes.data ?? null;
      const roleText = roleRes.data as AppRole ?? null;
      setProfile(profileData);
      setRole(roleText);

      // Se não veio role mas usuário existe, tentar novamente (até 3x)
      if (!roleText && attempt < 3) {
        setTimeout(() => fetchProfileAndRole(userId, attempt + 1), 1500);
      }
    } catch (err) {
      console.error("Failed to fetch profile/role:", err);
      // Não reseta role/profile em caso de erro de rede — mantém o estado anterior
      if (attempt < 3) {
        setTimeout(() => fetchProfileAndRole(userId, attempt + 1), 1500);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfileAndRole(user.id);
  }, [user, fetchProfileAndRole]);

  useEffect(() => {
    let settled = false;

    const settle = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    };

    // Timeout: if auth check takes too long, stop loading
    const timeout = setTimeout(settle, AUTH_TIMEOUT);

    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Use setTimeout to avoid blocking the auth state change callback
          setTimeout(async () => {
            await fetchProfileAndRole(currentUser.id);
            settle();
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          settle();
        }
      }
    );

    // Then trigger session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("getSession error:", error);
        setUser(null);
        settle();
        return;
      }
      // If no session and onAuthStateChange hasn't fired yet
      if (!session) {
        setUser(null);
        settle();
      }
    }).catch(() => {
      settle();
    });

    return () => {
      clearTimeout(timeout);
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
