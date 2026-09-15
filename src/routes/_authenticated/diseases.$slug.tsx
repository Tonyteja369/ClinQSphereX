import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SafetyBanner } from "@/components/SafetyBanner";
import { TrialSearch } from "@/components/TrialSearch";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import { ProvenanceTag } from "@/components/DataProvenance";
import { getDisease, diseases } from "@/lib/diseases";
import { diseaseVisual } from "@/lib/disease-visuals";

export const Route = createFileRoute("/_authenticated/diseases/$slug")({
  loader: ({ params }) => {
    const disease = getDisease(params.slug);
    if (!disease) throw notFound();
    return { disease };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Disease area not found — ClinQSphereX" }, { name: "robots", content: "noindex" }] };
    }
    const d = loaderData.disease;
    const title = `${d.name} Research Intelligence — ClinQSphereX`;
    const description = `${d.focus}. Live ClinicalTrials.gov discovery, structured eligibility criteria and researcher-reviewed screening for ${d.name.toLowerCase()} studies.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DiseasePage,
});

/** Illustrative synthetic profile — never presented as a real person or a verdict. */
const outcomes = ["met", "not_met", "unknown"] as const;

function DiseasePage() {
  const { disease } = Route.useLoaderData();
  const others = diseases.filter((d) => d.slug !== disease.slug);
  const visual = diseaseVisual(disease.slug);

  return (
    <>
      <main className="min-h-screen bg-transparent">
        <section className="mx-auto max-w-6xl px-5 pb-10 pt-14">
          <Link to="/diseases" className="text-sm text-muted-foreground hover:text-foreground">
            ← All disease areas
          </Link>
          <div className="mt-4 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">
                {disease.name} Research Intelligence
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
                {disease.overview}
              </p>
            </div>
            {visual && (
              <figure className="surface-strong overflow-hidden rounded-2xl">
                <img
                  src={visual.url}
                  alt={visual.alt}
                  width={1024}
                  height={1024}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
                  Illustrative scientific visualization — not patient imagery or a clinical finding.
                </figcaption>
              </figure>
            )}
          </div>
          <div className="mt-8 max-w-3xl">
            <SafetyBanner />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="surface p-5">
              <h2 className="text-sm font-semibold">Conditions in scope</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {disease.conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="surface p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Research variables</h2>
                <ProvenanceTag kind="synthetic" />
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {disease.variables.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Variables are only used when they exist in the underlying dataset. Demonstration
                records are synthetic and are not real patient data.
              </p>
            </div>
            <div className="surface p-5">
              <h2 className="text-sm font-semibold">Why screening is hard here</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{disease.complexity}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-6">
          <TrialSearch initialCondition={disease.condition} />
        </section>

        <section aria-labelledby="screening" className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="screening" className="font-display text-2xl font-semibold">
              Structured eligibility screening
            </h2>
            <ProvenanceTag kind="synthetic" />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Protocol text becomes one row per criterion. Each row records the expected value and the
            observed value, and resolves to PASS, FAIL or UNKNOWN. Missing information stays UNKNOWN —
            it is never converted into a pass.
          </p>
          <div className="surface mt-6 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <caption className="sr-only">
                Illustrative synthetic screening example for {disease.name}
              </caption>
              <thead className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Criterion
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Expected
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Illustrative outcome
                  </th>
                </tr>
              </thead>
              <tbody>
                {disease.criteria.map((c, i) => (
                  <tr key={c.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{c.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.expected}</td>
                    <td className="px-4 py-3">
                      <OutcomeBadge outcome={outcomes[i % outcomes.length]!} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Illustrative synthetic research profile. Outcomes shown here demonstrate the display
            format only; live outcomes are computed inside the workspace from your own data.
          </p>
        </section>

        <section aria-labelledby="review" className="border-t border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 id="review" className="font-display text-2xl font-semibold">
              The decision stays with a researcher
            </h2>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Model prediction", "Ranked shortlist with a confidence level."],
                ["Evidence", "Observed value, source and timestamp per criterion."],
                ["Explanation", "Feature contributions behind the prediction."],
                ["Researcher review", "Pending review · Requires more evidence · Not relevant · Potentially relevant."],
                ["Research action", "Outreach, screening visit or exclusion — recorded with the reviewer."],
              ].map(([t, b], i) => (
                <li key={t} className="surface p-5">
                  <span className="font-display text-xs font-semibold tabular-nums text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="limits" className="mx-auto max-w-6xl px-5 py-14">
          <h2 id="limits" className="font-display text-2xl font-semibold">
            Limitations for this area
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              disease.complexity,
              "Demonstration records are synthetic; no real patient data is used on this site.",
              "Registry records are shown as published by ClinicalTrials.gov and are not verified against any individual.",
              "Model output is a prediction, not a diagnosis, and never changes a participant's status on its own.",
            ].map((l) => (
              <li key={l} className="surface p-5 text-sm leading-relaxed text-muted-foreground">
                {l}
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Other disease areas
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((d) => (
              <li key={d.slug}>
                <Link
                  to="/diseases/$slug"
                  params={{ slug: d.slug }}
                  className="inline-block rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
