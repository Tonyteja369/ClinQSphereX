import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Wordmark } from "@/components/Wordmark";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import authVideoAsset from "@/assets/clinqspherex-auth-landscape.mp4.asset.json";
import authPosterAsset from "@/assets/clinqspherex-auth-landscape-poster.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Researcher sign in — ClinQSphereX" },
      {
        name: "description",
        content:
          "Sign in to the ClinQSphereX clinical research operations workspace to manage studies, screening, consent and coordination.",
      },
      { property: "og:title", content: "Researcher sign in — ClinQSphereX" },
      {
        property: "og:description",
        content: "Access your clinical research operations workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowVideo, setAllowVideo] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    let active = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const constrainedNetwork = Boolean(
      connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g",
    );
    if (reducedMotion || constrainedNetwork) return;

    const batteryNavigator = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (!batteryNavigator.getBattery) {
      setAllowVideo(true);
      return;
    }
    batteryNavigator.getBattery().then((battery) => {
      if (active) setAllowVideo(battery.charging || battery.level > 0.2);
    }).catch(() => {
      if (active) setAllowVideo(true);
    });
    return () => { active = false; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="auth-landscape optical-field relative min-h-screen overflow-hidden text-foreground">
       {allowVideo ? (
         <video
           className="auth-landscape-video"
           autoPlay
           muted
           loop
           playsInline
           preload="metadata"
           poster={authPosterAsset.url}
           aria-label="Abstract biomedical neural network visualization"
         >
           <source src={authVideoAsset.url} type="video/mp4" />
         </video>
       ) : (
         <img
           src={authPosterAsset.url}
           alt="Abstract biomedical neural network visualization"
           className="auth-landscape-video"
         />
       )}
       <div className="auth-landscape-shade" aria-hidden />
       <div className="auth-prism auth-prism-one" aria-hidden />
       <div className="auth-prism auth-prism-two" aria-hidden />

       <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between">
           <Link to="/" className="text-foreground" aria-label="ClinQSphereX home">
            <Wordmark />
          </Link>
           <div className="glass-label normal-case text-foreground">
            <LockKeyhole className="size-3.5" aria-hidden />
            Secure research access
          </div>
        </div>

         <div className="flex flex-1 items-center justify-center py-10">
           <div className="auth-prismatic-frame motion-rise w-full max-w-[31rem] rounded-[2.6rem] p-[2px]">
           <GlassPanel variant="elevated" className="auth-glass-panel w-full rounded-[2.5rem] p-7 sm:p-10">
             <div className="mb-8 flex flex-col items-center text-center">
               <div className="auth-mark motion-lift mb-5 grid size-16 place-items-center rounded-[1.4rem]">
                 <ShieldCheck className="size-7 text-primary" aria-hidden />
               </div>
               <p className="text-xs font-semibold uppercase text-primary">Biomedical research gateway</p>
               <h1 className="mt-2 text-3xl font-semibold text-foreground">
                 {mode === "signin" ? "Researcher sign in" : "Create your account"}
               </h1>
             </div>
             <p className="text-center text-sm leading-relaxed text-muted-foreground">
              {mode === "signin"
                ? "Sign in to continue to your research workspace."
                : "Accounts join the demo research organisation with the coordinator role."}
            </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <div>
               <label htmlFor="name" className="ml-3 text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                 className="auth-input mt-1.5 w-full rounded-full px-5 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          <div>
             <label htmlFor="email" className="ml-3 text-sm font-medium text-foreground">
               Research identifier
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
               placeholder="Enter institutional email"
               className="auth-input mt-1.5 w-full rounded-full px-5 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
             <label htmlFor="password" className="ml-3 text-sm font-medium text-foreground">
               Security token
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
               placeholder="Enter password"
               className="auth-input mt-1.5 w-full rounded-full px-5 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="mt-2 h-12 w-full"
          >
             <span>{busy ? "Please wait…" : mode === "signin" ? "Initialize session" : "Create account"}</span>
            {!busy && <ArrowRight className="size-4" aria-hidden />}
          </Button>
        </form>

        <Button
          variant="outline"
          onClick={google}
          className="mt-3 h-11 w-full"
        >
          Continue with Google
        </Button>

        <Button
          variant="ghost"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-muted-foreground"
        >
          {mode === "signin"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </Button>
             <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
               <span className="size-1.5 rounded-full bg-success" aria-hidden />
               Secure research workspace
             </div>
             <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              Screening support only. Researchers remain responsible for all decisions.
            </p>
          </GlassPanel>
           </div>
        </div>
      </div>
    </main>
  );
}
