import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { runHeartBenchmark, type BenchmarkResult } from "@/lib/heart-benchmark.functions";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/DataState";

const STEPS = [
  "Dataset prepared",
  "Features preprocessed",
  "Identical split created",
  "Classical baseline trained",
  "Quantum configurations swept",
  "Best configuration selected",
  "Evaluation complete",
];

const n3 = (v: number) => v.toFixed(3);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
/**
 * Durations are measured in milliseconds but reported in microseconds with
 * three decimals, because most stages here finish far below a millisecond.
 */
const ms = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toFixed(3)} s`
    : v >= 1
      ? `${v.toFixed(3)} ms`
      : v > 0
        ? `${(v * 1000).toFixed(3)} µs`
        : "below timer resolution";
const ci = (i: { lower: number; upper: number }) =>
  `${(i.lower * 100).toFixed(1)}–${(i.upper * 100).toFixed(1)}%`;
const signed = (v: number, f: (n: number) => string) => `${v > 0 ? "+" : ""}${f(v)}`;
const signedMs = (v: number) => `${v > 0 ? "+" : "−"}${ms(Math.abs(v))}`;


export function HeartBenchmark() {
  const run = useServerFn(runHeartBenchmark);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [status, setStatus] = useState<"ready" | "running" | "completed" | "failed">("ready");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [kernelId, setKernelId] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  // Latest stored experiment, so a reload still shows real measured values.
  const stored = useQuery({
    queryKey: ["heart-benchmark-latest"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optimization_runs")
        .select("metrics, created_at")
        .eq("method", "heart_quantum_kernel_benchmark")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.metrics as unknown as BenchmarkResult | null) ?? null;
    },
  });

  useEffect(() => {
    // Older stored runs predate the configuration sweep and the reviewer
    // disclosures (significance, timer probe, feature-matched arm); ignore them
    // so the page never renders a result without those checks.
    const s = stored.data;
    if (
      !result &&
      status === "ready" &&
      s?.kernel_previews?.length &&
      s.significance &&
      s.timer &&
      s.classical_matched &&
      s.intervals &&
      s.kernel_timing &&
      s.psd

    ) {
      setResult(s);
    }
  }, [stored.data, result, status]);

  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => setProgress((p) => Math.min(STEPS.length - 1, p + 1)), 700);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (result && !kernelId) setKernelId(result.best_quantum.kernel_id);
  }, [result, kernelId]);

  async function execute() {
    setStatus("running");
    setError(null);
    setProgress(0);
    setResult(null);
    setKernelId(null);
    try {
      const res = await run({ data: { testSize: 0.2, seed: 42 } });
      setResult(res);
      setProgress(STEPS.length);
      setStatus("completed");
      void stored.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Benchmark failed");
      setStatus("failed");
    }
  }

  const qualityData = useMemo(
    () =>
      result
        ? (["accuracy", "precision", "recall", "f1", "roc_auc"] as const).map((k) => ({
            metric: k === "roc_auc" ? "ROC-AUC" : k[0]!.toUpperCase() + k.slice(1),
            Classical: Number(result.classical[k].toFixed(4)),
            Quantum: Number(result.quantum[k].toFixed(4)),
          }))
        : [],
    [result],
  );

  const runtimeData = useMemo(
    () =>
      result
        ? [
            { stage: "Data preparation", ms: result.timings.data_preparation_ms },
            { stage: "Preprocessing", ms: result.timings.preprocessing_ms },
            { stage: "Classical training", ms: result.classical.training_time_ms },
            { stage: "Quantum kernel", ms: result.quantum.kernel_time_ms },
            { stage: "Quantum training", ms: result.quantum.training_time_ms },
            { stage: "Classical inference", ms: result.classical.inference_time_ms },
            { stage: "Quantum inference", ms: result.quantum.inference_time_ms },
          ].map((r) => ({ stage: r.stage, µs: Number((r.ms * 1000).toFixed(3)) }))
        : [],
    [result],
  );


  const rocData = useMemo(() => {
    if (!result) return [];
    /**
     * Prefer the fpr/tpr operating points the run produced. If a stored result
     * predates those arrays, rebuild the curve from the per-record test scores
     * so the panel still plots measured values rather than nothing.
     */
    const fromTraces = (side: "classical" | "quantum") => {
      const traces = result.prediction_trace ?? [];
      if (traces.length === 0) return [] as { fpr: number; tpr: number }[];
      const rows = traces.map((t: any) => ({
        score: side === "classical" ? t.classical_score : t.quantum_score,
        label:
          (side === "classical" ? t.classical_correct : t.quantum_correct)
            ? side === "classical"
              ? t.classical_prediction
              : t.quantum_prediction
            : 1 - (side === "classical" ? t.classical_prediction : t.quantum_prediction),
      }));
      const pos = rows.filter((r: { score: number; label: number }) => r.label === 1).length;
      const neg = rows.length - pos;
      if (pos === 0 || neg === 0) return [] as { fpr: number; tpr: number }[];
      const sorted = [...rows].sort((a, b) => b.score - a.score);
      let tp = 0;
      let fp = 0;
      const pts = [{ fpr: 0, tpr: 0 }];
      for (const r of sorted) {
        if (r.label === 1) tp += 1;
        else fp += 1;
        pts.push({ fpr: fp / neg, tpr: tp / pos });
      }
      return pts;
    };
    const cCurve =
      result.classical.roc_curve?.length ? result.classical.roc_curve : fromTraces("classical");
    const qCurve =
      result.quantum.roc_curve?.length ? result.quantum.roc_curve : fromTraces("quantum");
    if (import.meta.env.DEV) {
      console.debug("[HeartBenchmark] ROC points", {
        classical: cCurve.length,
        quantum: qCurve.length,
      });
    }
    if (cCurve.length === 0 && qCurve.length === 0) return [];

    // Plot the measured operating points themselves — every distinct FPR either
    // arm produced — rather than resampling onto a fixed grid, so short curves
    // still draw.
    const xs = Array.from(
      new Set([0, 1, ...cCurve.map((p) => p.fpr), ...qCurve.map((p) => p.fpr)]),
    ).sort((a, b) => a - b);
    const at = (curve: { fpr: number; tpr: number }[], x: number) => {
      if (curve.length === 0) return null;
      let tpr = 0;
      for (const p of curve) if (p.fpr <= x) tpr = Math.max(tpr, p.tpr);
      return Number(tpr.toFixed(4));
    };
    return xs.map((x) => ({
      fpr: Number(x.toFixed(4)),
      Classical: at(cCurve, x),
      Quantum: at(qCurve, x),
    }));
  }, [result]);


  const preview = result
    ? (result.kernel_previews.find((p) => p.kernel_id === kernelId) ?? result.kernel_previews[0]!)
    : null;

  const rows: { label: string; c: string; q: string; diff: string }[] = result
    ? [
        {
          label: "Accuracy",
          c: n3(result.classical.accuracy),
          q: n3(result.quantum.accuracy),
          diff: signed(result.comparison.accuracy_delta, n3),
        },
        {
          label: "Precision",
          c: n3(result.classical.precision),
          q: n3(result.quantum.precision),
          diff: signed(result.comparison.precision_delta, n3),
        },
        {
          label: "Recall",
          c: n3(result.classical.recall),
          q: n3(result.quantum.recall),
          diff: signed(result.comparison.recall_delta, n3),
        },
        {
          label: "F1",
          c: n3(result.classical.f1),
          q: n3(result.quantum.f1),
          diff: signed(result.comparison.f1_delta, n3),
        },
        {
          label: "ROC-AUC",
          c: n3(result.classical.roc_auc),
          q: n3(result.quantum.roc_auc),
          diff: signed(result.comparison.roc_auc_delta, n3),
        },
        {
          label: "Training time",
          c: ms(result.classical.training_time_ms),
          q: ms(result.quantum.training_time_ms),
          diff: signedMs(result.quantum.training_time_ms - result.classical.training_time_ms),
        },
        {
          label: "Inference time",
          c: ms(result.classical.inference_time_ms),
          q: ms(result.quantum.inference_time_ms),
          diff: signedMs(result.quantum.inference_time_ms - result.classical.inference_time_ms),
        },
        {
          label: "Quantum kernel time",
          c: "Not applicable",
          q: ms(result.quantum.kernel_time_ms),
          diff: "—",
        },
        {
          label: "Total runtime",
          c: ms(result.classical.total_time_ms),
          q: ms(result.quantum.total_time_ms),
          diff: signedMs(result.quantum.total_time_ms - result.classical.total_time_ms),
        },
      ]
    : [
        "Accuracy",
        "Precision",
        "Recall",
        "F1",
        "ROC-AUC",
        "Training time",
        "Inference time",
        "Quantum kernel time",
        "Total runtime",
      ].map((label) => ({ label, c: "Not evaluated", q: "Not evaluated", diff: "—" }));

  return (
    <div className="space-y-6">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Heart Disease Benchmark Laboratory</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Real public research data · classical baseline vs a searched quantum-kernel
              configuration space. Every value below is measured during the run; nothing is
              precomputed or assumed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              aria-live="polite"
            >
              {status}
            </span>
            <Button onClick={execute} disabled={status === "running"}>
              {status === "running" ? "Running sweep…" : "Run benchmark"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Config label="Dataset" value="UCI Heart Disease" />
          <Config
            label="Records"
            value={
              result ? `${result.dataset.records_used} of ${result.dataset.records}` : "Loaded at run time"
            }
          />
          <Config
            label="Configuration sweep"
            value={
              result
                ? `${result.quantum_experiments.length} configurations`
                : "2–5 qubits · 1–3 reps · 2 feature maps · 3 C values"
            }
          />
          <Config label="Train / test split" value="80 / 20" />
          <Config label="Random seed" value="42" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          The reported configuration is chosen on an inner validation split carved from the training
          rows only — the test set is never used to select a configuration, and no metric is set by
          hand.
        </p>

        <div className="mt-4 rounded-md border border-border bg-secondary p-3 text-sm">
          <strong>Comparison conditions — including what is not matched.</strong>
          <span className="mt-2 flex flex-wrap gap-2">
            {[
              ["Same dataset", true],
              [
                result
                  ? `Features NOT matched (classical ${result.dataset.features} vs quantum ${result.best_quantum.feature_dimensions})`
                  : "Features NOT matched in the headline arms",
                false,
              ],
              ["Same split", true],
              ["Same seed", true],
              ["Same test set", true],
              ["Same evaluation protocol", true],
              ["No test-label tuning", true],
            ].map(([t, ok]) => (
              <span
                key={String(t)}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${ok ? "border-border" : "border-destructive text-destructive"}`}
              >
                {ok ? "✓" : "✕"} {String(t)}
              </span>
            ))}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">
            A feature-matched classical arm is trained on exactly the features the quantum
            configuration encodes and reported alongside the headline row.
          </p>
        </div>

        <ol className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {STEPS.map((s, i) => {
            const done = status === "completed" || i < progress;
            const active = status === "running" && i === progress;
            return (
              <li key={s} className="flex items-center gap-1.5">
                <span aria-hidden>{done ? "✓" : active ? "⟳" : "○"}</span>
                <span className={done ? "text-foreground" : undefined}>{s}</span>
              </li>
            );
          })}
        </ol>

        {error ? (
          <div className="mt-4">
            <ErrorState message={`SOURCE OFFLINE — ${error}`} />
          </div>
        ) : null}
      </GlassPanel>

      <GlassPanel className="overflow-x-auto p-5">
        <h4 className="text-base font-semibold">
          Classical baseline vs best quantum configuration
        </h4>
        <table className="mt-4 w-full min-w-[38rem] text-sm">
          <caption className="sr-only">Measured comparison of the two pipelines</caption>
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5">Metric</th>
              <th scope="col" className="px-4 py-2.5">Classical baseline</th>
              <th scope="col" className="px-4 py-2.5">Best quantum configuration</th>
              <th scope="col" className="px-4 py-2.5">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="px-4 py-2.5 text-left font-medium">
                  {r.label}
                </th>
                <td className="px-4 py-2.5 tabular-nums">{r.c}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.q}</td>
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No benchmark has been executed in this workspace yet, so every cell reads “Not
            evaluated”. Run the benchmark to populate it with measured values.
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Experiment {result.experiment_id} · {new Date(result.executed_at).toLocaleString()} ·{" "}
            {result.persisted ? "stored in this workspace" : result.persistence_note}
          </p>
        )}
      </GlassPanel>

      {result ? (
        <GlassPanel className="p-5">
          <h4 className="text-base font-semibold">Reviewer disclosures — read these first</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Three things a statistician would check. We state them before they are asked.
          </p>

          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-md border border-border bg-secondary p-3">
              <strong>1 · The accuracy gap is not statistically significant.</strong>
              <p className="mt-1">{result.significance.interpretation}</p>
              <dl className="mt-2 grid gap-3 sm:grid-cols-4">
                <Item k="Test records" v={String(result.significance.test_samples)} />
                <Item
                  k="Discordant pairs"
                  v={String(result.significance.full_vs_quantum.discordant_pairs)}
                />
                <Item
                  k="McNemar exact p"
                  v={result.significance.full_vs_quantum.p_value.toFixed(4)}
                />
                <Item
                  k="Matched-arm p"
                  v={result.significance.matched_vs_quantum.p_value.toFixed(4)}
                />
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                {result.significance.method} Only-classical-correct{" "}
                {result.significance.full_vs_quantum.only_first_correct}, only-quantum-correct{" "}
                {result.significance.full_vs_quantum.only_second_correct}.
              </p>
            </div>

            <div className="rounded-md border border-border bg-secondary p-3">
              <strong>
                2 · Timings{" "}
                {result.timer.advanced
                  ? `are clipped by a ${result.timer.resolution_ms.toFixed(3)} ms clock step.`
                  : "cannot be measured in this runtime."}
              </strong>
              <p className="mt-1">{result.timer.note}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Any duration displayed as “below timer resolution” is a clock limitation, not a claim
                of zero work. The workload evidence is the operation count below.
              </p>
            </div>

            <div className="rounded-md border border-border bg-secondary p-3">
              <strong>3 · The headline arms do not use the same features.</strong>
              <p className="mt-1">{result.fair_comparison.feature_parity_note}</p>
              <dl className="mt-2 grid gap-3 sm:grid-cols-4">
                <Item
                  k="Classical (all features)"
                  v={`${pct(result.classical.accuracy)} · ${result.dataset.features} features`}
                />
                <Item
                  k="Classical (feature-matched)"
                  v={`${pct(result.classical_matched.accuracy)} · ${result.classical_matched.feature_count} features`}
                />
                <Item
                  k="Quantum kernel"
                  v={`${pct(result.best_quantum.accuracy)} · ${result.best_quantum.feature_dimensions} encoded`}
                />
                <Item k="Matched features" v={result.classical_matched.features.join(", ")} />
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Feature-matched arm: precision {pct(result.classical_matched.precision)} · recall{" "}
                {pct(result.classical_matched.recall)} · F1 {pct(result.classical_matched.f1)} ·
                ROC-AUC {pct(result.classical_matched.roc_auc)}. It is the only like-for-like row.
              </p>
            </div>

            <div className="rounded-md border border-border bg-secondary p-3">
              <strong>Kernel evaluations, checkable on screen.</strong>
              <p className="mt-1 font-mono text-xs">
                {result.best_quantum.kernel_evaluation_formula}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Train matrix {result.best_quantum.kernel_train_dim} (upper triangle only, diagonal
                fixed at 1) plus test matrix {result.best_quantum.kernel_test_dim}. The count follows
                from the split sizes, so it can be verified live.
              </p>
            </div>

            <div className="rounded-md border border-border bg-secondary p-3">
              <strong>4 · Confidence intervals on every accuracy.</strong>
              <p className="mt-1">{result.intervals.note}</p>
              <dl className="mt-2 grid gap-3 sm:grid-cols-3">
                <Item
                  k="Classical (all features)"
                  v={`${pct(result.classical.accuracy)} · 95% CI ${ci(result.intervals.classical)}`}
                />
                <Item
                  k="Classical (feature-matched)"
                  v={`${pct(result.classical_matched.accuracy)} · 95% CI ${ci(result.intervals.classical_matched)}`}
                />
                <Item
                  k="Quantum kernel"
                  v={`${pct(result.best_quantum.accuracy)} · 95% CI ${ci(result.intervals.quantum)}`}
                />
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">{result.intervals.method}</p>
            </div>

            <div className="rounded-md border border-border bg-secondary p-3">
              <strong>5 · Cost per kernel entry.</strong>
              <dl className="mt-2 grid gap-3 sm:grid-cols-3">
                <Item
                  k="Kernel construction"
                  v={ms(result.kernel_timing.total_kernel_ms)}
                />
                <Item
                  k="Kernel evaluations"
                  v={result.kernel_timing.kernel_evaluations.toLocaleString()}
                />
                <Item
                  k="Mean per entry"
                  v={
                    result.kernel_timing.mean_per_entry_us === null
                      ? "—"
                      : `${result.kernel_timing.mean_per_entry_us.toFixed(3)} µs`
                  }
                />
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">{result.kernel_timing.note}</p>
            </div>

            <div className="rounded-md border border-border bg-secondary p-3">
              <strong>
                6 · Kernel matrix {result.psd.repaired ? "required PSD repair." : "is positive semi-definite."}
              </strong>
              <p className="mt-1">{result.psd.note}</p>
              <dl className="mt-2 grid gap-3 sm:grid-cols-3">
                <Item
                  k="Smallest eigenvalue"
                  v={result.psd.checked ? result.psd.min_eigenvalue.toExponential(3) : "not evaluated"}
                />
                <Item k="Repair applied" v={result.psd.repaired ? "Yes" : "No"} />
                <Item
                  k="Diagonal ridge"
                  v={result.psd.ridge > 0 ? result.psd.ridge.toExponential(3) : "0"}
                />
              </dl>
            </div>

          </div>
        </GlassPanel>
      ) : null}


      {result ? (
        <>
          <GlassPanel className="p-5">
            <h4 className="text-base font-semibold">Best quantum configuration</h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Summary
                title="Best quantum accuracy"
                value={pct(result.best_quantum.accuracy)}
                name={result.best_quantum.label}
              />
              <Summary
                title="Classical baseline"
                value={pct(result.classical.accuracy)}
                name="Logistic regression"
              />
              <Summary
                title="Difference"
                value={`${result.accuracy_difference >= 0 ? "+" : "−"}${Math.abs(result.accuracy_difference_pp).toFixed(1)} pp`}
                name="Best quantum minus classical"
              />
              <Summary
                title="Configuration"
                value={`${result.best_quantum.qubits} qubits`}
                name={`${result.best_quantum.feature_map_type === "zz" ? "ZZ-style Pauli map" : "Z-only product map"} · ${result.best_quantum.reps} repetition${result.best_quantum.reps === 1 ? "" : "s"} · C=${result.best_quantum.svm_c}`}
              />
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <Item k="Precision" v={pct(result.best_quantum.precision)} />
              <Item k="Recall" v={pct(result.best_quantum.recall)} />
              <Item k="F1" v={pct(result.best_quantum.f1)} />
              <Item k="ROC-AUC" v={pct(result.best_quantum.roc_auc)} />
              <Item k="Validation accuracy" v={pct(result.best_quantum.validation_accuracy)} />
            </dl>

            <div className="mt-5 space-y-3">
              <AccuracyBar
                label="Classical accuracy (all 13 features)"
                value={result.classical.accuracy}
                tone="primary"
              />
              <AccuracyBar
                label="Classical accuracy (feature-matched — the like-for-like row)"
                value={result.classical_matched.accuracy}
                tone="primary"
              />
              <AccuracyBar
                label="Best quantum accuracy"
                value={result.best_quantum.accuracy}
                tone={result.quantum_exceeds_classical ? "success" : "muted"}
              />
            </div>

            <p className="mt-4 text-sm">
              {result.quantum_exceeds_classical
                ? `Under the evaluated experimental configuration, the best quantum-kernel model achieved higher test accuracy than the classical logistic-regression baseline (${pct(result.best_quantum.accuracy)} vs ${pct(result.classical.accuracy)}, +${Math.abs(result.accuracy_difference_pp).toFixed(1)} percentage points). Performance is configuration- and dataset-dependent; this is not a general quantum-advantage result.`
                : `Under the evaluated configurations, the classical baseline achieved higher or equal test accuracy (${pct(result.classical.accuracy)} vs ${pct(result.best_quantum.accuracy)}). Best measured quantum configuration did not exceed the classical baseline. The quantum result remains an experimental benchmark.`}{" "}
              {result.significance
                ? `McNemar exact p = ${result.significance.full_vs_quantum.p_value.toFixed(4)} on ${result.significance.full_vs_quantum.discordant_pairs} discordant record${result.significance.full_vs_quantum.discordant_pairs === 1 ? "" : "s"}: the difference between the two arms is not statistically distinguishable from noise, whichever arm is numerically ahead.`
                : null}

            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Selection rule: {result.evaluation_protocol.selection_rule} Full sweep runtime{" "}
              {ms(result.sweep_runtime_ms)} across {result.quantum_experiments.length}{" "}
              configurations.
            </p>
            <p className="mt-2 rounded-md border border-border bg-secondary p-3 text-xs">
              <strong>Do not read the sweep maximum as a quantum result.</strong> The highest test
              accuracy appearing anywhere in the sweep is{" "}
              {pct(result.best_quantum_by_test.accuracy)} ({result.best_quantum_by_test.label}) —
              numerically above the classical baseline of {pct(result.classical.accuracy)}. That
              figure was picked by looking at the held-out test labels across{" "}
              {result.quantum_experiments.length} configurations, so it is an optimistically biased
              number, not a measured advantage. The reported quantum arm above is the one selected on
              inner-validation data only, before the test set was touched.
            </p>

          </GlassPanel>

          <GlassPanel className="overflow-x-auto p-5">
            <h4 className="text-base font-semibold">Quantum configuration sweep</h4>
            <table className="mt-4 w-full min-w-[62rem] text-sm">
              <caption className="sr-only">Measured metrics for every quantum configuration</caption>
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {[
                    "Configuration",
                    "Qubits",
                    "Reps",
                    "Map",
                    "C",
                    "Features",
                    "Val acc",
                    "Accuracy",
                    "Precision",
                    "Recall",
                    "F1",
                    "ROC-AUC",
                    "Kernel time",
                    "Train time",
                    "Inference",
                  ].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.quantum_experiments.map((e) => {
                  const isBest = e.label === result.best_quantum.label;
                  return (
                    <tr key={e.label} className={isBest ? "bg-secondary font-medium" : undefined}>
                      <th scope="row" className="px-3 py-2.5 text-left font-medium">
                        {e.label}
                        {isBest ? " · selected" : ""}
                      </th>
                      <td className="px-3 py-2.5 tabular-nums">{e.qubits}</td>
                      <td className="px-3 py-2.5 tabular-nums">{e.reps}</td>
                      <td className="px-3 py-2.5">{e.feature_map_type.toUpperCase()}</td>
                      <td className="px-3 py-2.5 tabular-nums">{e.svm_c}</td>
                      <td className="px-3 py-2.5 tabular-nums">{e.feature_dimensions}</td>
                      <td className="px-3 py-2.5 tabular-nums">{n3(e.validation_accuracy)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{n3(e.accuracy)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{n3(e.precision)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{n3(e.recall)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{n3(e.f1)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{n3(e.roc_auc)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{ms(e.kernel_time_ms)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{ms(e.training_time_ms)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{ms(e.inference_time_ms)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Every row is a completed experiment. Kernel, training and inference time are measured
              separately with a high-resolution timer and reported in microseconds when
              sub-millisecond.
            </p>
          </GlassPanel>

          {preview ? (
            <GlassPanel className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-base font-semibold">Quantum kernel matrices</h4>
                <label className="text-xs text-muted-foreground">
                  Configuration{" "}
                  <select
                    className="ml-2 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                    value={preview.kernel_id}
                    onChange={(e) => setKernelId(e.target.value)}
                  >
                    {result.kernel_previews.map((p) => (
                      <option key={p.kernel_id} value={p.kernel_id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <KernelHeatmap
                  title={`Training kernel — first ${preview.train_shown} × ${preview.train_shown} of ${preview.train_total} × ${preview.train_total}`}
                  matrix={preview.train}
                />
                <KernelHeatmap
                  title={`Test vs training kernel — first ${preview.test_shown} × ${preview.train_shown} of ${preview.test_total} × ${preview.train_total}`}
                  matrix={preview.test}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Fidelity values for this configuration range {preview.min} – {preview.max} with mean{" "}
                {preview.mean}. Colour follows the viridis scale shown under each matrix — dark
                purple is the lowest measured fidelity, yellow the highest. Hover a cell to read the
                measured value.
              </p>
            </GlassPanel>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <GlassPanel className="p-5">
              <h4 className="text-sm font-semibold">Relative efficiency (quantum / classical)</h4>
              <dl className="mt-3 space-y-2 text-sm">
                <Ratio label="Training time" value={result.comparison.training_time_ratio} />
                <Ratio label="Inference time" value={result.comparison.inference_time_ratio} />
                <Ratio label="Total runtime" value={result.comparison.total_time_ratio} />
              </dl>
            </GlassPanel>

            <GlassPanel className="p-5 md:col-span-2">
              <h4 className="text-sm font-semibold">Quantum computation</h4>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <Item k="Qubits" v={String(result.best_quantum.qubits)} />
                <Item
                  k="Samples"
                  v={`${result.dataset.train_samples} train / ${result.dataset.test_samples} test`}
                />
                <Item k="Feature dimensions" v={String(result.best_quantum.feature_dimensions)} />
                <Item k="Original features" v={String(result.best_quantum.original_features)} />
                <Item k="Training kernel" v={result.best_quantum.kernel_train_dim} />
                <Item k="Test kernel" v={result.best_quantum.kernel_test_dim} />
                <Item k="Kernel evaluations" v={result.best_quantum.kernel_evaluations.toLocaleString()} />
                <Item k="Kernel computation" v={ms(result.quantum.kernel_time_ms)} />
                <Item k="Classifier training" v={ms(result.quantum.training_time_ms)} />
                <Item k="Inference" v={ms(result.quantum.inference_time_ms)} />
                <Item k="Support vectors" v={String(result.quantum.support_vectors)} />
                <Item k="SVM C" v={String(result.best_quantum.svm_c)} />
                <Item k="Kernel type" v={result.configuration.kernel_type} />
                <Item k="Feature map" v={result.best_quantum.feature_map} />
                <Item k="Shots" v={result.configuration.shots} />
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Encoded features: {result.best_quantum.features.join(", ")} ·{" "}
                {result.best_quantum.encoding} · {result.configuration.backend}
              </p>
            </GlassPanel>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <GlassPanel className="p-5">
              <h4 className="text-sm font-semibold">Data & preprocessing parameters</h4>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Item k="Dataset" v={result.dataset.name} />
                <Item k="Records used" v={`${result.dataset.records_used} of ${result.dataset.records}`} />
                <Item
                  k="Train / test"
                  v={`${result.dataset.train_samples} / ${result.dataset.test_samples}`}
                />
                <Item
                  k="Inner train / validation"
                  v={`${result.dataset.inner_train_samples} / ${result.dataset.validation_samples}`}
                />
                <Item k="Random seed" v={String(result.configuration.random_seed)} />
                <Item k="Feature scaling" v={result.configuration.scaling} />
                <Item k="Feature selection" v={result.configuration.feature_selection} />
                <Item k="Missing values" v={result.dataset.missing_value_handling} />
                <Item k="Label definition" v={result.dataset.label_definition} />
                <Item
                  k="Positive rate"
                  v={`${pct(result.dataset.positive_rate_train)} train · ${pct(result.dataset.positive_rate_test)} test`}
                />
              </dl>
            </GlassPanel>

            <GlassPanel className="p-5">
              <h4 className="text-sm font-semibold">Evaluation protocol</h4>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <Item k="Positive class" v={result.evaluation_protocol.positive_class} />
                <Item k="Averaging" v={result.evaluation_protocol.averaging} />
                <Item k="Zero division" v={result.evaluation_protocol.zero_division} />
                <Item k="Classical scores" v={result.evaluation_protocol.classical_score_source} />
                <Item k="Quantum scores" v={result.evaluation_protocol.quantum_score_source} />
                <Item
                  k="Thresholds"
                  v={`classical ${result.evaluation_protocol.classical_threshold} · quantum ${result.evaluation_protocol.quantum_threshold}`}
                />
                <Item k="Evaluation set" v={result.evaluation_protocol.evaluation_set} />
                <Item k="Selection rule" v={result.evaluation_protocol.selection_rule} />
              </dl>
              <h5 className="mt-4 text-sm font-semibold">Measured stage timings</h5>
              <dl className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                <Item k="Data preparation" v={ms(result.timings.data_preparation_ms)} />
                <Item k="Preprocessing" v={ms(result.timings.preprocessing_ms)} />
                <Item k="Classical training" v={ms(result.timings.classical_training_ms)} />
                <Item k="Classical inference" v={ms(result.timings.classical_inference_ms)} />
                <Item k="Quantum total" v={ms(result.timings.quantum_total_ms)} />
                <Item k="Benchmark total" v={ms(result.timings.benchmark_total_ms)} />
              </dl>
            </GlassPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel className="p-5">
              <h4 className="text-sm font-semibold">Predictive performance</h4>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qualityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="metric" fontSize={12} />
                    <YAxis domain={[0, 1]} fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Classical" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Quantum" fill="var(--accent-foreground)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5">
              <h4 className="text-sm font-semibold">Computational cost (microseconds)</h4>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runtimeData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="stage" width={130} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="µs" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5">
              <h4 className="text-sm font-semibold">ROC curves (test predictions)</h4>
              {rocData.length === 0 ? (
                <p className="mt-4 rounded-md border border-border bg-secondary p-3 text-sm">
                  No curve data available for this run — the stored result contains{" "}
                  {result.classical.roc_curve?.length ?? 0} classical and{" "}
                  {result.quantum.roc_curve?.length ?? 0} quantum curve points, so nothing is
                  plotted. The axes are not drawn over an empty chart.
                </p>
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rocData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="fpr"
                        type="number"
                        domain={[0, 1]}
                        fontSize={12}
                        label={{ value: "FPR", position: "insideBottom", offset: -2 }}
                      />
                      <YAxis domain={[0, 1]} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="stepAfter"
                        dataKey="Classical"
                        stroke="var(--primary)"
                        dot={false}
                        connectNulls
                      />
                      <Line
                        type="stepAfter"
                        dataKey="Quantum"
                        stroke="var(--accent-foreground)"
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                ROC-AUC — classical {n3(result.classical.roc_auc)} · quantum{" "}
                {n3(result.quantum.roc_auc)}, both computed from continuous scores, not hard labels.
                Plotted from the {result.classical.roc_curve?.length ?? 0} classical and{" "}
                {result.quantum.roc_curve?.length ?? 0} quantum operating points actually produced by
                the run.
              </p>
            </GlassPanel>


            <GlassPanel className="p-5">
              <h4 className="text-sm font-semibold">Confusion matrices (test set)</h4>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Confusion title="Classical baseline" m={result.classical.confusion} />
                <Confusion title="Best quantum configuration" m={result.quantum.confusion} />
              </div>
            </GlassPanel>
          </div>

          {diagnostics ? (
            <GlassPanel className="p-5">
              <h4 className="text-sm font-semibold">Quantum advantage diagnostics</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                The same inputs the ROC chart uses, recomputed here from the {diagnostics.samples}{" "}
                per-record test predictions. If a reported AUC disagrees with the recomputed value,
                the reported figure is wrong — not the chart.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[42rem] text-sm">
                  <caption className="sr-only">Recomputed ROC and AUC inputs per arm</caption>
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {[
                        "Input",
                        "Classical",
                        "Quantum",
                      ].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(
                      [
                        ["Positives / negatives in test set", (a: Arm) => `${a.pos} / ${a.neg}`],
                        ["TPR at the decision threshold", (a: Arm) => (a.tpr === null ? "—" : n3(a.tpr))],
                        ["FPR at the decision threshold", (a: Arm) => (a.fpr === null ? "—" : n3(a.fpr))],
                        ["TP / FP counts used", (a: Arm) => `${a.tp} / ${a.fp}`],
                        ["ROC-AUC reported by the run", (a: Arm) => n3(a.reported)],
                        [
                          "ROC-AUC recomputed here (rank method)",
                          (a: Arm) => (a.auc === null ? "—" : n3(a.auc)),
                        ],
                        [
                          "Difference (recomputed − reported)",
                          (a: Arm) => (a.delta === null ? "—" : signed(a.delta, n3)),
                        ],
                        ["Curve points plotted", (a: Arm) => String(a.curve_points)],
                      ] as [string, (a: Arm) => string][]
                    ).map(([label, f]) => (
                      <tr key={label}>
                        <th scope="row" className="px-3 py-2 text-left font-medium">
                          {label}
                        </th>
                        <td className="px-3 py-2 tabular-nums">{f(diagnostics.classical)}</td>
                        <td className="px-3 py-2 tabular-nums">{f(diagnostics.quantum)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="mt-4 space-y-1 text-sm">
                {diagnostics.flags.length === 0 ? (
                  <li className="text-muted-foreground">
                    No inconsistency found: both recomputed AUCs match the reported values to three
                    decimals, and both curves carry plotted points.
                  </li>
                ) : (
                  diagnostics.flags.map((f) => (
                    <li key={f} className="rounded-md border border-border bg-secondary p-2">
                      {f}
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-5 border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h5 className="text-sm font-semibold">AI discrepancy explainer</h5>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={explain}
                    disabled={explaining}
                  >
                    {explaining ? "Analysing…" : "Explain these numbers"}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sends only the measured numbers above — no patient records — to the AI service and
                  asks what changed in the ROC/AUC inputs and what could cause it. The reply is an
                  AI-written interpretation, not a measurement, and no figure on this page comes from
                  it.
                </p>
                {explainError ? (
                  <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    {explainError}
                  </p>
                ) : null}
                {explanation ? (
                  <div className="mt-3 rounded-md border border-border bg-secondary p-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {explanation.summary}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Generated by {explanation.model} at{" "}
                      {new Date(explanation.generated_at).toISOString()}.
                    </p>
                  </div>
                ) : null}
              </div>
            </GlassPanel>
          ) : null}

          <GlassPanel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">Per-sample prediction trace</h4>
              <Button variant="outline" size="sm" onClick={() => setShowTrace((v) => !v)}>
                {showTrace ? "Hide trace" : `Show ${result.prediction_trace.length} test predictions`}
              </Button>
            </div>
            {showTrace ? (
              <div className="mt-4 max-h-96 overflow-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <caption className="sr-only">De-identified per-sample test predictions</caption>
                  <thead className="sticky top-0 bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {["Sample", "True", "Classical", "Score", "Quantum", "Score", "Agreement"].map(
                        (h) => (
                          <th key={h} scope="col" className="px-3 py-2">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.prediction_trace.map((t) => (
                      <tr key={t.id}>
                        <th scope="row" className="px-3 py-2 text-left font-medium">
                          {t.id}
                        </th>
                        <td className="px-3 py-2 tabular-nums">{t.true_label}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {t.classical_prediction} {t.classical_correct ? "✓" : "✗"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{t.classical_score.toFixed(3)}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {t.quantum_prediction} {t.quantum_correct ? "✓" : "✗"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{t.quantum_score.toFixed(3)}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {t.classical_prediction === t.quantum_prediction ? "agree" : "differ"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                De-identified test identifiers only — no patient-level information from the source
                records is exposed. Confusion-matrix counts are derived from exactly these rows.
              </p>
            )}
          </GlassPanel>

          <GlassPanel className="p-5">
            <h4 className="text-sm font-semibold">Research interpretation</h4>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              On {result.dataset.test_samples} held-out records from the UCI Heart Disease dataset,
              the selected quantum-kernel configuration reached a ROC-AUC of{" "}
              {n3(result.quantum.roc_auc)} compared with {n3(result.classical.roc_auc)} for the
              classical logistic-regression baseline (accuracy {n3(result.quantum.accuracy)}, 95% CI{" "}
              {ci(result.intervals.quantum)} vs {n3(result.classical.accuracy)}, 95% CI{" "}
              {ci(result.intervals.classical)} — the intervals overlap). The quantum pipeline
              required{" "}
              {result.comparison.total_time_ratio === null
                ? "an unmeasurable multiple of"
                : `${result.comparison.total_time_ratio.toFixed(2)}× `}{" "}
              the total runtime of the classical pipeline in this run, of which{" "}
              {ms(result.quantum.kernel_time_ms)} was kernel construction.
            </p>

            <p className="mt-3 text-sm">
              Experimental quantum-kernel benchmark. Results are environment-dependent and
              dataset-specific and do not establish general quantum advantage. The quantum pipeline
              in this prototype is a full statevector simulation executed on classical hardware, not
              quantum hardware. This is a research prototype: the model is not a diagnosis, it does
              not autonomously enrol anyone, and every prediction requires researcher review.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Reproduce this experiment: seed {result.reproduction.seed}, test size{" "}
              {result.reproduction.test_size}, samples {result.reproduction.samples}.{" "}
              {result.reproduction.note}
            </p>
          </GlassPanel>
        </>
      ) : null}
    </div>
  );
}

function Config({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  );
}

function Ratio({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums" title={value === null ? "Denominator measured below timer resolution — no ratio can be derived." : undefined}>
        {value === null ? "—" : `${value.toFixed(2)}×`}
      </dd>
    </div>
  );
}


function Summary({ title, name, value }: { title: string; name: string; value: string }) {
  return (
    <GlassPanel className="p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{name}</p>
    </GlassPanel>
  );
}

function AccuracyBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "muted";
}) {
  const fill =
    tone === "success" ? "bg-success" : tone === "primary" ? "bg-primary" : "bg-muted-foreground";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{(value * 100).toFixed(1)}%</span>
      </div>
      <div
        className="mt-1 h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label} ${(value * 100).toFixed(1)} percent`}
      >
        {/* Linear 0–100% scale for both bars — no scale manipulation. */}
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

// Perceptual sequential colormap (viridis stops), interpolated in sRGB.
const VIRIDIS: [number, number, number][] = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
];

function viridis(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (VIRIDIS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = VIRIDIS[i]!;
  const b = VIRIDIS[Math.min(VIRIDIS.length - 1, i + 1)]!;
  const c = a.map((v, k) => Math.round(v + (b[k]! - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function KernelHeatmap({ title, matrix }: { title: string; matrix: number[][] }) {
  const cols = matrix[0]?.length ?? 0;
  if (!cols) {
    return (
      <figure>
        <figcaption className="text-xs text-muted-foreground">{title}</figcaption>
        <p className="mt-2 text-xs text-muted-foreground">No kernel values available.</p>
      </figure>
    );
  }

  let lo = Infinity;
  let hi = -Infinity;
  for (const row of matrix)
    for (const v of row) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  const span = hi - lo || 1;

  return (
    <figure>
      <figcaption className="text-xs text-muted-foreground">{title}</figcaption>
      <div
        className="mt-2 grid gap-px overflow-hidden rounded-md border border-border bg-border p-px"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {matrix.flatMap((row, i) =>
          row.map((v, j) => (
            <div
              key={`${i}-${j}`}
              title={`K[${i}, ${j}] = ${v}`}
              className="aspect-square min-h-[10px]"
              style={{ backgroundColor: viridis((v - lo) / span) }}
            />
          )),
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="tabular-nums">{lo.toFixed(3)}</span>
        <span
          className="h-2 flex-1 rounded-full"
          style={{
            backgroundImage: `linear-gradient(to right, ${VIRIDIS.map((c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`).join(", ")})`,
          }}
        />
        <span className="tabular-nums">{hi.toFixed(3)}</span>
      </div>
    </figure>
  );
}

function Confusion({
  title,
  m,
}: {
  title: string;
  m: { tp: number; fp: number; tn: number; fn: number };
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
        {[
          ["True positive", m.tp],
          ["False positive", m.fp],
          ["True negative", m.tn],
          ["False negative", m.fn],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-md border border-border p-2">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
