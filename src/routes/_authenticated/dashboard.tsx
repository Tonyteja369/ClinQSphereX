import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SafetyBanner } from "@/components/SafetyBanner";
import { StatusPill } from "@/components/StatusPill";
import { ResearchMap } from "@/components/ResearchMap";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Coordinator dashboard — ClinQSphereX" },
      {
        name: "description",
        content:
          "Live view of study recruitment pipelines, consent status, open tasks and recent research actions.",
      },
      { property: "og:title", content: "Coordinator dashboard — ClinQSphereX" },
      { property: "og:description", content: "Recruitment pipeline and research operations overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [studies, candidates, consents, tasks, audit] = await Promise.all([
        supabase.from("studies").select("*").order("created_at"),
        supabase.from("candidates").select("id, status, match_score, study_id"),
        supabase.from("consents").select("status"),
        supabase.from("tasks").select("id, status, title, due_at, priority").eq("status", "open"),
        supabase
          .from("audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      return {
        studies: studies.data ?? [],
        candidates: candidates.data ?? [],
        consents: consents.data ?? [],
        tasks: tasks.data ?? [],
        audit: audit.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading workspace…</p>;

  const byStatus = data.candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const consentGranted = data.consents.filter((c) => c.status === "granted").length;

  const stats = [
    { label: "Active studies", value: data.studies.filter((s) => s.status === "recruiting").length },
    { label: "Candidates in pipeline", value: data.candidates.length },
    { label: "Consents granted", value: consentGranted },
    { label: "Open tasks", value: data.tasks.length },
  ];

  const candidateTotal = data.candidates.length;

  return (
    <div className="relative space-y-7 pb-10">
      <header className="motion-rise pt-1">
        <h1 className="motion-morph text-[length:var(--fs-h1)] font-semibold leading-[var(--lh-tight)] text-foreground [--morph-name:dashboard-title]">
          Research operations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recruitment pipeline, consent posture and coordinator workload across your organisation.
        </p>
      </header>

      <div className="motion-rise rounded-[var(--r-md)] bg-background shadow-sm ring-1 ring-primary/25">
        <SafetyBanner />
      </div>

      <div className="motion-rise-list grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="glass glass--react motion-lift motion-rise flex min-h-32 flex-col justify-end overflow-hidden p-5"
          >
            <p className="glass-data text-[length:var(--fs-display)] font-semibold leading-none text-foreground">
              {s.value}
            </p>
            <div className="mt-4 h-0.5 w-10 rounded-full bg-primary" aria-hidden />
            <p className="mt-2 text-sm font-medium text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <ResearchMap />
        <div className="glass glass--react motion-rise flex flex-col justify-center p-6 sm:p-8">
          <p className="text-xs font-semibold text-primary">Research intelligence map</p>
          <h2 className="mt-3 text-[length:var(--fs-h2)] font-semibold leading-[var(--lh-tight)]">
            One connected operational record
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Studies connect candidate evidence, model output, consent, tasks and audited researcher
            action without turning model suggestions into automatic decisions.
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass glass--react motion-rise p-5 sm:p-6">
          <h2 className="text-[length:var(--fs-h3)] font-semibold">Pipeline by stage</h2>
          {Object.keys(byStatus).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No candidates yet — open a study and run screening.
            </p>
          ) : (
            <>
              <div className="mt-5 flex h-11 overflow-hidden rounded-[var(--r-sm)] bg-muted" aria-label="Candidate pipeline by stage">
                {Object.entries(byStatus).map(([status, count], index) => (
                  <div
                    key={status}
                    className={`flex min-w-12 origin-left items-center justify-center px-2 text-xs font-semibold text-primary-foreground ${index % 2 === 0 ? "bg-primary" : "bg-[var(--iris-500)]"}`}
                    style={{ flexGrow: candidateTotal ? count / candidateTotal : 0 }}
                  >
                    <span className="truncate">{count}</span>
                  </div>
                ))}
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
                {Object.entries(byStatus).map(([status, count]) => (
                  <li key={status} className="flex items-center gap-2">
                    <StatusPill value={status} />
                    <span className="glass-data text-sm font-semibold text-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="glass glass--react motion-rise p-5 sm:p-6">
          <h2 className="text-[length:var(--fs-h3)] font-semibold">Studies</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {data.studies.map((s) => {
              const enrolled = data.candidates.filter(
                (c) => c.study_id === s.id && c.status === "enrolled",
              ).length;
              const enrollmentProgress = s.target_enrollment
                ? Math.min(100, (enrolled / s.target_enrollment) * 100)
                : 0;
              return (
                <li key={s.id}>
                  <Link
                    to="/studies/$studyId"
                    params={{ studyId: s.id }}
                    className="glass--solid motion-lift motion-press grid min-h-36 grid-cols-[3.5rem_1fr] gap-x-3 overflow-hidden p-4"
                  >
                    <div className="relative row-span-2 mt-1 size-12 text-primary" aria-hidden>
                      <svg viewBox="0 0 48 48" className="size-12 -rotate-90">
                        <circle cx="24" cy="24" r="19" fill="none" stroke="var(--iris-100)" strokeWidth="3" />
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          pathLength="100"
                          strokeDasharray={`${enrollmentProgress} 100`}
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="motion-morph text-sm font-semibold [--morph-name:study-code]">{s.code}</span>
                        <StatusPill value={s.status} />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.title}</p>
                    </div>
                    <p className="col-span-2 mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      {enrolled}/{s.target_enrollment} enrolled · protocol {s.protocol_version}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="glass--solid motion-rise overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-[length:var(--fs-h3)] font-semibold">Recent audited actions</h2>
        </div>
        {data.audit.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="glass-data w-full min-w-[36rem] border-collapse text-left text-sm">
              <tbody className="divide-y divide-border">
                {data.audit.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3 align-top sm:px-6">
                      <span className="font-mono text-xs font-medium text-foreground">{a.action}</span>{" "}
                      <span className="text-muted-foreground">by {a.actor_email || "system"}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-muted-foreground sm:px-6">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
