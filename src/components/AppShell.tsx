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
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import { Wordmark } from "@/components/Wordmark";
import { Monogram } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [railOpen, setRailOpen] = useState(true);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <TooltipProvider delayDuration={120}>
    <div className="optical-field app-workspace min-h-screen">
      <div
        aria-hidden
        className={cn("route-progress", isNavigating && "route-progress--active")}
      />
      <aside className={cn("workspace-taskbar liquid-glass liquid-glass-nav", railOpen && "workspace-taskbar--open")}>
        <div className="taskbar-brand">
          <Link to="/dashboard" aria-label="ClinQSphereX dashboard" className="taskbar-mark motion-press">
            <Monogram className="size-8" />
          </Link>
          <div className="taskbar-brand-copy">
            <Wordmark showMark={false} />
            <span>Research operations</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="taskbar-toggle hidden md:inline-flex"
            onClick={() => setRailOpen((open) => !open)}
            aria-label={railOpen ? "Collapse taskbar" : "Expand taskbar"}
          >
            {railOpen ? <PanelLeftClose aria-hidden /> : <PanelLeftOpen aria-hidden />}
          </Button>
        </div>
        <nav aria-label="Research workspace" className="taskbar-nav">
          {nav.map((item) => (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <Link
                  to={item.to}
                  aria-label={item.label}
                  aria-current={pathname.startsWith(item.to) ? "page" : undefined}
                  className={cn("taskbar-item motion-press nav-prism", pathname.startsWith(item.to) && "taskbar-item--active prism-control")}
                >
                  <span className="taskbar-icon"><item.icon aria-hidden /></span>
                  <span className="taskbar-label">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className={railOpen ? "md:hidden" : undefined}>{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" onClick={signOut} className="taskbar-item taskbar-signout">
              <span className="taskbar-icon"><LogOut aria-hidden /></span>
              <span className="taskbar-label">Sign out</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className={railOpen ? "md:hidden" : undefined}>Sign out</TooltipContent>
        </Tooltip>
      </aside>

      <div className={cn("workspace-canvas", railOpen && "workspace-canvas--rail-open")}>
        <main className="app-page relative mx-auto w-full max-w-6xl flex-1 px-3 py-7 sm:px-5 md:px-6">{children}</main>
      </div>
    </div>
    </TooltipProvider>
  );
}
