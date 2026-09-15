import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; info: string | null };

const ROUTER_HOOK_HINTS = [
  "useContext",
  "useRouter",
  "useNavigate",
  "useRouterState",
  "RouterProvider",
  "Cannot read properties of null",
];

function looksLikeRouterContextFailure(error: Error) {
  const text = `${error.message}\n${error.stack ?? ""}`;
  return ROUTER_HOOK_HINTS.some((hint) => text.includes(hint));
}

/**
 * Developer-mode only. Captures render errors and, when they look like a missing
 * router context (navigation hook used outside a RouterProvider), prints a
 * diagnostic panel plus a structured console group. Renders children untouched
 * in production builds.
 */
export class DevRouterDiagnostics extends Component<Props, State> {
  override state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (!import.meta.env.DEV) return;
    const routerContextFailure = looksLikeRouterContextFailure(error);
    const details = {
      message: error.message,
      routerContextFailure,
      likelyCause: routerContextFailure
        ? "A navigation hook (useRouter/useNavigate/useRouterState) ran without a RouterProvider above it — often a stale module/preview cache, a duplicate @tanstack/react-router copy, or a component rendered outside the route tree."
        : "Not a router-context signature; treat as a normal render error.",
      route: typeof window === "undefined" ? "(ssr)" : window.location.pathname,
      componentStack: info.componentStack,
      stack: error.stack,
    };
    // eslint-disable-next-line no-console
    console.groupCollapsed("[router-diagnostics] render failure");
    // eslint-disable-next-line no-console
    console.error(error);
    // eslint-disable-next-line no-console
    console.table({
      routerContextFailure: String(routerContextFailure),
      route: details.route,
      message: details.message,
    });
    // eslint-disable-next-line no-console
    console.info(details.likelyCause);
    // eslint-disable-next-line no-console
    console.groupEnd();
    this.setState({ info: info.componentStack ?? null });
  }

  override render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    if (!import.meta.env.DEV) throw error;

    const routerContextFailure = looksLikeRouterContextFailure(error);

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Developer diagnostics — not shown in production
          </p>
          <h1 className="mt-2 text-lg font-semibold text-foreground">
            {routerContextFailure ? "Router context unavailable" : "Render error"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {routerContextFailure
              ? "A navigation hook ran without a RouterProvider above it. Common causes: stale preview/module cache, a duplicate @tanstack/react-router instance, or a component rendered outside the route tree."
              : "The route failed to render. Details below."}
          </p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Route</dt>
              <dd className="font-mono text-foreground">
                {typeof window === "undefined" ? "(ssr)" : window.location.pathname}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Message</dt>
              <dd className="font-mono text-foreground">{error.message}</dd>
            </div>
          </dl>
          <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            {info ?? error.stack}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null, info: null })}
            className="mt-4 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry render
          </button>
        </div>
      </div>
    );
  }
}
