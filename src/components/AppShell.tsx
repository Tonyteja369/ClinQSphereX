import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Atom,
  BookOpen,
  Dna,
  HeartPulse,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/studies", label: "Studies", icon: FlaskConical },
  { to: "/participants", label: "Participants", icon: Users },
  { to: "/tasks", label: "Tasks & visits", icon: ListChecks },
  { to: "/operations", label: "Operations", icon: Activity },
  { to: "/quantum-lab", label: "Quantum lab", icon: Atom },
  { to: "/governance", label: "Governance", icon: ShieldCheck },
  { to: "/diseases", label: "Diseases", icon: HeartPulse },
  { to: "/research", label: "Research", icon: BookOpen },
  { to: "/genomics", label: "Genomics", icon: Dna },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isNavigating = useRouterState({ select: (s) => s.status === "pending" });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="optical-field min-h-screen p-3 sm:p-5 md:flex md:gap-5">
      <div
        aria-hidden
        className={cn("route-progress", isNavigating && "route-progress--active")}
      />
      <aside className="liquid-glass liquid-glass-nav sticky top-5 hidden h-[calc(100vh-2.5rem)] w-64 shrink-0 flex-col rounded-[2rem] px-4 py-6 md:flex">
        <Link to="/dashboard" className="px-1">
          <Wordmark />
        </Link>
        <p className="mt-1 px-1 text-xs text-muted-foreground">Research operations</p>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "motion-press nav-prism flex items-center gap-2.5 rounded-full px-3 py-2.5 text-sm transition-[color,background-color,box-shadow,transform]",
                pathname.startsWith(item.to)
                  ? "prism-control bg-card/75 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-card/55 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <Button
          variant="ghost"
          onClick={signOut}
          className="justify-start px-3 text-muted-foreground"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav aria-label="Workspace" className="liquid-glass liquid-glass-nav sticky top-3 z-20 flex items-center gap-3 overflow-x-auto rounded-full px-4 py-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "motion-press nav-prism whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground",
                pathname.startsWith(item.to) && "prism-control bg-card/75 font-semibold text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Button onClick={signOut} variant="ghost" size="sm" className="whitespace-nowrap text-muted-foreground">
            Sign out
          </Button>
        </nav>
        <main className="app-page relative mx-auto w-full max-w-6xl flex-1 px-2 py-7 sm:px-4 md:px-6 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-72 before:bg-[radial-gradient(circle_at_65%_0%,var(--accent),transparent_65%)]">{children}</main>
      </div>
    </div>
  );
}
