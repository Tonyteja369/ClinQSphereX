import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";

const links = [
  { to: "/platform", label: "Platform" },
  { to: "/research", label: "Research" },
  { to: "/diseases", label: "Diseases" },
  { to: "/genomics", label: "Genomics" },
  { to: "/security", label: "Security" },
  { to: "/about", label: "About" },
] as const;

export function PublicNav() {
  return (
    <header className="liquid-glass liquid-glass-nav sticky top-3 z-30 mx-3 rounded-full">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" aria-label="ClinQSphereX home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-foreground font-medium" }}
               className="nav-prism motion-press hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/auth"
            className="prism-control prism-control--primary motion-press rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Researcher Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="cinematic-band border-t border-hero-accent/20 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[1fr_auto]">
        <div>
          <Wordmark className="text-hero-foreground" />
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-hero-muted">
            From clinical data to research action — with evidence, intelligence and human control.
          </p>
          <p className="mt-6 text-sm text-hero-muted">Created by</p>
          <p className="mt-1 text-sm font-semibold text-hero-foreground">
            Katikireddy Tharun &amp; Inturi Sumanth Sai
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-7 gap-y-3 text-sm text-hero-muted">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-hero-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap justify-between gap-3 border-t border-hero-accent/15 px-5 pt-5 text-xs text-hero-muted">
        <span>© 2026 ClinQSphereX</span>
        <span>Research Prototype · Synthetic/Synthea Data · Human-in-the-Loop</span>
      </div>
    </footer>
  );
}
