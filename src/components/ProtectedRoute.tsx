import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "admin";
}) {
  const { user, role, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Safety net: se após 5s ainda estiver loading, força mostrar login
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  // Ainda carregando e não deu timeout → mostra spinner
  if (loading && !timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Zap className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  // Não autenticado → manda para login
  if (!user) return <Navigate to="/login" replace />;

  // Role insuficiente → manda para dashboard
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
