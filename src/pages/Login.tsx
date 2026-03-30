import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Zap, LogIn } from "lucide-react";

const Login = () => {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verificar se precisa de setup — com timeout para não bloquear
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    (async () => {
      try {
        const { data } = await supabase.rpc("has_any_users") as any;
        // Só redireciona para setup se explicitamente retornar false (boolean)
        if (data === false) {
          navigate("/setup", { replace: true });
        }
      } catch {
        // Falha silenciosa — mostra login normalmente
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [navigate]);

  // Redirecionar se já está logado
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError("Email ou senha inválidos. Verifique suas credenciais.");
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  // Formulário sempre renderiza — nunca bloqueia
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Zap className="h-10 w-10 text-primary" />
          <h1 className="font-mono text-2xl font-bold tracking-tight">
            MISSION CONTROL
          </h1>
          <p className="text-sm text-muted-foreground">
            Faça login para acessar o painel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              className="bg-card border-border"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="bg-card border-border"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading || authLoading}>
            <LogIn className="h-4 w-4" />
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Acesso restrito. Contate o admin para obter uma conta.
        </p>
      </div>
    </div>
  );
};

export default Login;
