import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import authVideoAsset from "@/assets/clinqspherex-molten-dna.mp4.asset.json";
import authPosterAsset from "@/assets/clinqspherex-molten-dna-poster.jpg.asset.json";

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
  const [showPassword, setShowPassword] = useState(false);

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

  async function resetPassword() {
    if (!email) {
      toast.error("Enter your institutional email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset instructions sent.");
  }

  return (
    <main className="auth-editorial min-h-screen overflow-x-hidden text-foreground">
      <div className="auth-editorial-shell mx-auto flex min-h-screen w-full max-w-[100rem] flex-col px-4 sm:px-7 lg:px-10">
        <header className="auth-editorial-nav motion-rise">
          <Link to="/" className="auth-brand" aria-label="ClinQSphereX home">
            <Wordmark />
            <span>Research · Health · Humanity</span>
          </Link>
          <nav aria-label="Product" className="auth-product-nav">
            {['Research', 'Platform', 'Features', 'Discover', 'About'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>
            ))}
          </nav>
          <div className="auth-nav-actions">
            <span className="auth-secure-label"><LockKeyhole aria-hidden /> Secure access</span>
            <a href="#sign-in" className="auth-signin-link">Sign in</a>
          </div>
        </header>

        <section className="auth-editorial-grid flex-1" aria-labelledby="auth-headline">
          <div className="auth-hero-copy motion-rise" id="research">
            <p className="auth-kicker">AI-powered research · Biomedical intelligence</p>
            <h1 id="auth-headline">
              <span>From data</span>
              <span>to human <em>impact.</em></span>
            </h1>
            <p className="auth-hero-summary">
              Intelligence for human health, built around evidence and researcher review.
            </p>
            <div className="auth-annotation-row" aria-label="Platform capabilities">
              <span>Signal analysis</span><span>Data to discovery</span><span>Human review</span>
            </div>
          </div>

          <figure className="auth-science-stage motion-rise" id="discover">
            <div className="auth-stage-index" aria-hidden>01 / SIGNAL</div>
            {allowVideo ? (
              <video autoPlay muted loop playsInline preload="metadata" poster={authPosterAsset.url}>
                <source src={authVideoAsset.url} type="video/mp4" />
              </video>
            ) : (
              <img src={authPosterAsset.url} alt="Abstract DNA structure with a luminous molecular core" />
            )}
            <div className="auth-science-overlay" aria-hidden />
            <svg className="auth-signal-line" viewBox="0 0 600 80" role="img" aria-label="Abstract biomedical signal waveform">
              <path d="M0 42h110l18-1 14-25 20 50 22-44 16 20h95l10-8 14 8h70l18-20 16 40 22-38 15 18h120" />
            </svg>
            <figcaption>
              <span>Biomedical signal architecture</span>
              <strong>Evidence remains subject to researcher review.</strong>
            </figcaption>
          </figure>

          <section className="auth-product-panel motion-rise" id="sign-in" aria-labelledby="signin-heading">
            <div className="auth-panel-head">
              <span>Secure research access</span>
              <span aria-hidden>02</span>
            </div>
            <h2 id="signin-heading">{mode === "signin" ? "Researcher sign in" : "Create your account"}</h2>
            <p>{mode === "signin" ? "Sign in to continue to your research workspace." : "Create a research workspace account."}</p>

            <form onSubmit={submit} className="auth-editorial-form">
              {mode === "signup" && (
                <div className="auth-field">
                  <label htmlFor="name">Full name</label>
                  <span className="auth-field-icon" aria-hidden><UserRound /></span>
                  <input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="auth-input" placeholder="Enter full name" />
                </div>
              )}
              <div className="auth-field">
                <label htmlFor="email">Researcher identifier</label>
                <span className="auth-field-icon" aria-hidden><Mail /></span>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter institutional email" className="auth-input" />
              </div>
              <div className="auth-field">
                <label htmlFor="password">Security token</label>
                <span className="auth-field-icon" aria-hidden><LockKeyhole /></span>
                <input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="auth-input auth-input-password" />
                <Button type="button" variant="ghost" size="icon" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </Button>
              </div>
              {mode === "signin" && (
                <Button type="button" variant="link" onClick={resetPassword} className="auth-forgot">Forgot password?</Button>
              )}
              <Button type="submit" disabled={busy} className="auth-primary-action">
                <span>{busy ? "Please wait…" : mode === "signin" ? "Initialize session" : "Create account"}</span>
                {!busy && <ArrowRight aria-hidden />}
              </Button>
            </form>

            <Button variant="outline" onClick={google} className="auth-google-action">Continue with Google</Button>
            <Button variant="ghost" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="auth-mode-action">
              {mode === "signin" ? "Create account" : "Already have an account? Sign in"}
            </Button>
            <div className="auth-trust-line"><span aria-hidden /> Secure research workspace</div>
            <p className="auth-responsibility">Screening support only. Researchers remain responsible for all decisions.</p>
          </section>
        </section>

        <footer className="auth-editorial-footer" id="about">
          <span>ClinQSphereX / Research workspace</span>
          <span>Biomedical intelligence · Human review</span>
        </footer>
      </div>
    </main>
  );
}
