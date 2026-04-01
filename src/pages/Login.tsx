import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, LogIn, Shield } from "lucide-react";

const Login = () => {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* Radial glow center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, hsl(190 100% 50% / 0.05) 0%, transparent 70%)" }}
      />

      {/* Scanline */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-scanline pointer-events-none" />

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 w-10 h-10 border-l-2 border-t-2 border-primary/25" />
      <div className="absolute top-6 right-6 w-10 h-10 border-r-2 border-t-2 border-primary/25" />
      <div className="absolute bottom-6 left-6 w-10 h-10 border-l-2 border-b-2 border-primary/25" />
      <div className="absolute bottom-6 right-6 w-10 h-10 border-r-2 border-b-2 border-primary/25" />

      {/* Login panel */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="absolute -inset-6 rounded-2xl bg-primary/4 blur-2xl pointer-events-none" />

        <div className="relative rounded-xl border border-primary/20 bg-card/95 backdrop-blur-sm p-8 shadow-2xl space-y-7">
          {/* Top accent */}
          <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/15 blur-lg scale-[1.8]" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <Zap className="h-7 w-7 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h1 className="font-mono text-xl font-bold tracking-[0.2em] text-glow-primary">
                MISSION CONTROL
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase font-mono">
                Sistema de Gestão de Robôs
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <Shield className="h-3 w-3 text-muted-foreground/40" />
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@sistema.com"
                required
                autoComplete="email"
                className="bg-muted/40 border-border focus-visible:border-primary/50 focus-visible:ring-primary/20 font-mono text-sm h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="bg-muted/40 border-border focus-visible:border-primary/50 focus-visible:ring-primary/20 font-mono text-sm h-10"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[11px] font-mono text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2 font-mono text-xs tracking-widest h-10 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary-sm transition-all cursor-pointer"
              disabled={loading}
            >
              <LogIn className="h-4 w-4" />
              {loading ? "AUTENTICANDO…" : "ACESSAR SISTEMA"}
            </Button>
          </form>

          <p className="text-center text-[9px] text-muted-foreground/50 font-mono uppercase tracking-[0.15em]">
            Acesso restrito · Contate o administrador
          </p>

          {/* Bottom accent */}
          <div className="absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </div>
    </div>
  );
};

export default Login;
