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
        "flex items-center gap-1.5 rounded-md px-2 md:px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {icon}
      <span className="hidden md:inline">{children}</span>
    </Link>
  );
}