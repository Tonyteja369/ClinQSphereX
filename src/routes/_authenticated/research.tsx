import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({
    meta: [
      { title: "Research — ClinQSphereX" },
      {
        name: "description",
        content:
          "The scientific purpose of ClinQSphereX: dataset, feature preparation, classical baselines, experimental quantum-kernel model, evaluation, explainability and limitations.",
      },
      { property: "og:title", content: "Research — ClinQSphereX" },
      {
        property: "og:description",
        content:
          "Research question, method, evaluation plan and the limitations we state openly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResearchPage,
});

const sections: [string, string][] = [
  [
    "Dataset",
    "Synthetic, Synthea-style participant records generated for this prototype: demographics, conditions, medications and structured clinical attributes. No real patient data is used.",
  ],
  [
    "Feature preparation",
    "Protocol criteria are expressed as structured, machine-checkable rules. Model features are limited to the attributes a screening task requires; identity fields are excluded.",
  ],
  [
    "Classical baseline",
    "Logistic regression and Gaussian naive Bayes, trained and evaluated with one shared methodology so results are comparable.",
  ],
  [
    "Quantum model",
    "A quantum feature map with a fidelity quantum kernel feeding a kernel SVM, executed on the Qiskit Aer simulator. This is a research component, not a production path.",
  ],
  [
    "Evaluation",
    "Accuracy, precision, recall, F1, ROC-AUC, training time and inference time, computed on identical splits. Metrics that have not been run are reported as “Not evaluated”.",
  ],
  [
    "Explainability",
    "Deterministic criterion contributions for screening, and feature-contribution explanations for model predictions. Contributions describe model behaviour, not causal effects.",
  ],
  [
    "Limitations",
    "Synthetic data does not reproduce real-world clinical distributions, missingness patterns or site behaviour. Simulator results do not predict hardware behaviour. No clinical validation has been performed.",
  ],
];

function ResearchPage() {
  return (
    <>
      <main className="mx-auto max-w-4xl px-1 py-4 sm:px-5 sm:py-8">
        <h1 className="font-display text-3xl font-semibold">Research</h1>

        <section className="surface-strong mt-8 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Research question
          </h2>
          <p className="mt-3 text-lg leading-relaxed">
            Can a quantum-kernel representation be practically integrated into a clinical-trial
            candidate classification workflow, and how does it compare with classical
            machine-learning baselines on synthetic clinical data?
          </p>
        </section>

        <dl className="mt-10 space-y-5">
          {sections.map(([term, detail]) => (
            <div key={term} className="surface p-5">
              <dt className="font-display text-base font-semibold">{term}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-10 rounded-lg border border-primary/30 bg-secondary p-6">
          <h2 className="font-display text-xl font-semibold">Scientific integrity</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            ClinQSphereX does not claim quantum advantage. Quantum performance is experimentally
            evaluated against classical baselines on identical data, and results are reported
            whatever they show. Where an experiment has not been run, the interface says so instead
            of displaying a number.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The platform provides screening support. It does not determine clinical eligibility,
            diagnosis, treatment or enrolment; a qualified researcher makes every decision.
          </p>
        </section>
      </main>
    </>
  );
}
