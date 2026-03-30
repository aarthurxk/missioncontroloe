import { Navigate, useInRouterContext } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "admin";
}) {
  const inRouter = useInRouterContext();
  const { user, role, loading } = useAuth();

  if (!inRouter || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Zap className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
