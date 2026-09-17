import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { GenomicBenchmark } from "@/components/GenomicBenchmark";
import { HeartBenchmark } from "@/components/HeartBenchmark";


export const Route = createFileRoute("/_authenticated/quantum-lab")({
  head: () => ({
    meta: [
      { title: "Quantum research lab — ClinQSphereX" },
      {
        name: "description",
        content:
          "Experimental quantum-kernel research: pipeline, experiment metadata and an honest classical-versus-quantum comparison.",
      },
      { property: "og:title", content: "Quantum research lab — ClinQSphereX" },
      {
        property: "og:description",
        content: "Experiment records and comparison against classical baselines.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuantumLab,
});

const pipeline = [
  "Clinical features",
  "Feature encoding",
  "Quantum feature map",
  "Statevector simulation",
  "Quantum state",
  "Fidelity kernel",
  "Kernel SVM",
  "Prediction",
];


function QuantumLab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["optimization-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optimization_runs")
        .select("*, studies(code, title)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Quantum research lab</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          An experimental research environment. Nothing here influences a participant&apos;s status,
          and no result is used as a clinical or enrolment decision.
        </p>
      </header>

      <section aria-labelledby="pipeline" className="surface p-5">
        <h2 id="pipeline" className="text-base font-semibold">
          Quantum-kernel pipeline
        </h2>
        <ol className="mt-4 flex flex-wrap gap-2">
          {pipeline.map((step, i) => (
            <li
              key={step}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm"
            >
              <span className="font-display text-xs font-semibold tabular-nums text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          The benchmark below executes this pipeline inside the application as a full statevector
          simulation on classical hardware — not quantum hardware. The site and slot allocation
          model is separate: it is expressed as a QUBO and solved classically.
        </p>
      </section>

      <section aria-labelledby="comparison">
        <h2 id="comparison" className="text-base font-semibold">
          Classical baseline vs best quantum configuration
        </h2>
        <div className="mt-4">
          <HeartBenchmark />
        </div>
      </section>



      <section aria-labelledby="genomic-benchmark">
        <h2 id="genomic-benchmark" className="text-base font-semibold">
          Classical vs quantum genomic analysis
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Real cardiovascular variant records from ClinVar and the GWAS Catalog, run through two
          clearly separated optimisation pipelines with a researcher review step.
        </p>
        <div className="mt-4">
          <GenomicBenchmark />
        </div>
      </section>

      <section aria-labelledby="runs">
        <h2 id="runs" className="text-base font-semibold">
          Recorded optimisation experiments
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Two separate pipelines record here. Site-allocation QUBO runs solve a binary assignment
          problem; kernel-classifier runs benchmark a simulated quantum kernel. Each row states which
          pipeline produced it, so the two are never read as one experiment.
        </p>
        <div className="mt-4">
          {error ? (
            <ErrorState message={`Experiments could not be loaded: ${(error as Error).message}`} />
          ) : isLoading ? (
            <LoadingState rows={2} label="Loading experiments" />
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No optimisation runs recorded yet."
              description="Open a study and solve site allocation to record the first experiment."
            />
          ) : (
            <ul className="space-y-3">
              {data!.map((r: any) => {
                const isKernel = String(r.method).includes("kernel");
                const pipeline = isKernel
                  ? "Kernel classifier pipeline"
                  : "Site allocation QUBO pipeline";
                return (
                  <li key={r.id} className="surface p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {r.studies?.code ?? "study"} · {r.method}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {pipeline}
                    </p>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                      {[
                        ["Backend", r.backend],
                        [
                          isKernel ? "Qubits encoded" : "Binary variables",
                          r.qubo_size,
                        ],
                        [isKernel ? "ROC-AUC" : "Objective", Number(r.objective)],
                        ["Runtime", `${r.runtime_ms} ms`],
                      ].map(([k, v]) => (
                        <div key={String(k)}>
                          <dt className="text-xs text-muted-foreground">{k}</dt>
                          <dd className="mt-0.5 font-medium tabular-nums">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </section>
    </div>
  );
}
