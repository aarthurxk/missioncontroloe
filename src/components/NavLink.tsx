import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface NavLinkProps {
  to: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function NavLink({ to, children, icon }: NavLinkProps) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "relative flex items-center gap-1.5 rounded-md px-2 md:px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
        isActive
          ? "text-primary bg-primary/8"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
      )}
    >
      {icon}
      <span className="hidden md:inline">{children}</span>
      {isActive && (
        <span className="absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      )}
    </Link>
  );
}
