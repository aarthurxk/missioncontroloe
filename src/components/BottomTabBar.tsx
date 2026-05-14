import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ScrollText, BarChart3, CalendarClock, Settings, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/downloads", icon: Download, label: "Downloads" },
  { to: "/scheduler", icon: CalendarClock, label: "Agenda" },
];

export function BottomTabBar() {
  const { pathname } = useLocation();
  const { role } = useAuth();

  const visibleTabs = role === "admin"
    ? [...tabs, { to: "/settings", icon: Settings, label: "Config" }]
    : tabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/60 md:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around h-14">
        {visibleTabs.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 min-w-0 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full bg-primary" />
              )}
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
              <span className={cn(
                "text-[10px] font-medium leading-tight",
                isActive && "font-semibold"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
