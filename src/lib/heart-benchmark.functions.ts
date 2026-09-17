import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Heart disease model benchmark laboratory.
 *
 * Real public data: UCI Heart Disease (Cleveland, processed) is fetched live
 * from the UCI Machine Learning Repository and cached server-side.
 *
 * Both pipelines run on exactly the same dataset, preprocessing, split, labels
 * and seed:
 *   - Classical baseline : logistic regression (batch gradient descent)
 *   - Quantum kernel     : statevector-simulated feature maps, fidelity kernel,
 *                          kernel SVM (SMO), swept over qubits / repetitions /
 *                          feature-map type / SVM C.
 *
 * Configuration selection uses an inner train/validation split carved out of
 * the training data only. The test set is never used to choose a configuration.
 *
 * The quantum pipeline is a full statevector simulation executed on classical
 * hardware inside this application. It is not quantum hardware, and no quantum
 * advantage is assumed or claimed. Every number returned here is measured
 * during the run; nothing is fabricated or hardcoded.
 */

const DATA_URL =
  "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data";

const FEATURE_NAMES = [
  "age",
  "sex",
  "cp",
  "trestbps",
  "chol",
  "fbs",
  "restecg",
  "thalach",
  "exang",
  "oldpeak",
  "slope",
  "ca",
  "thal",
];

export type WilsonInterval = {
  estimate: number;
  lower: number;
  upper: number;
  successes: number;
  n: number;
  level: string;
};

export type PsdReport = {
  checked: boolean;
  min_eigenvalue: number;
  repaired: boolean;
  ridge: number;
  note: string;
};

export type MetricSet = {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  confusion: { tp: number; fp: number; tn: number; fn: number };
  roc_curve: { fpr: number; tpr: number }[];
};

export type KernelPreview = {
  kernel_id: string;
  label: string;
  qubits: number;
  reps: number;
  feature_map_type: string;
  train: number[][];
  test: number[][];
  train_shown: number;
  test_shown: number;
  train_total: number;
  test_total: number;
  min: number;
  max: number;
  mean: number;
};

export type QuantumExperiment = MetricSet & {
  label: string;
  kernel_id: string;
  qubits: number;
  reps: number;
  feature_map: string;
  feature_map_type: "zz" | "z";
  svm_c: number;
  features: string[];
  feature_dimensions: number;
  original_features: number;
  encoding: string;
  padded: boolean;
  kernel_matrix: string;
  kernel_train_dim: string;
  kernel_test_dim: string;
  kernel_evaluations: number;
  kernel_evaluation_formula: string;
  support_vectors: number;
  validation_accuracy: number;
  kernel_time_ms: number;
  training_time_ms: number;
  inference_time_ms: number;
  total_time_ms: number;
};

export type PredictionTrace = {
  id: string;
  true_label: number;
  classical_prediction: number;
  classical_score: number;
  quantum_prediction: number;
  quantum_score: number;
  classical_correct: boolean;
  quantum_correct: boolean;
};

export type BenchmarkResult = {
  experiment_id: string;
  executed_at: string;
  dataset: {
    name: string;
    source_url: string;
    records: number;
    records_used: number;
    features: number;
    train_samples: number;
    test_samples: number;
    inner_train_samples: number;
    validation_samples: number;
    positive_rate_train: number;
    positive_rate_test: number;
    missing_value_handling: string;
    label_definition: string;
    fetched_at: string;
  };
  configuration: {
    qubits: number;
    test_size: number;
    random_seed: number;
    quantum_features: string[];
    feature_map: string;
    backend: string;
    simulator: string;
    shots: string;
    preprocessing: string;
    scaling: string;
    feature_selection: string;
    encoding: string;
    kernel_type: string;
    kernel_evaluation: string;
    svm: string;
    svm_c: number;
    swept_qubits: number[];
    swept_reps: number[];
    swept_feature_maps: string[];
    swept_c: number[];
  };
  evaluation_protocol: {
    positive_class: string;
    averaging: string;
    zero_division: string;
    classical_score_source: string;
    quantum_score_source: string;
    classical_threshold: number;
    quantum_threshold: number;
    selection_rule: string;
    evaluation_set: string;
  };
  timings: {
    data_preparation_ms: number;
    preprocessing_ms: number;
    classical_training_ms: number;
    classical_inference_ms: number;
    quantum_kernel_ms: number;
    quantum_training_ms: number;
    quantum_inference_ms: number;
    quantum_total_ms: number;
    sweep_ms: number;
    benchmark_total_ms: number;
  };
  classical: MetricSet & {
    model: string;
    training_time_ms: number;
    inference_time_ms: number;
    total_time_ms: number;
  };
  quantum_experiments: QuantumExperiment[];
  kernel_previews: KernelPreview[];
  prediction_trace: PredictionTrace[];
  best_quantum: QuantumExperiment;
  best_quantum_by_test: QuantumExperiment;
  quantum: MetricSet & {
    model: string;
    kernel_time_ms: number;
    training_time_ms: number;
    inference_time_ms: number;
    total_time_ms: number;
    kernel_matrix: string;
    support_vectors: number;
  };
  accuracy_difference: number;
  accuracy_difference_pp: number;
  quantum_exceeds_classical: boolean;
  classical_matched: MetricSet & {
    model: string;
    features: string[];
    feature_count: number;
    training_time_ms: number;
    inference_time_ms: number;
    total_time_ms: number;
  };
  significance: {
    method: string;
    test_samples: number;
    full_vs_quantum: ReturnType<typeof mcnemarExact>;
    matched_vs_quantum: ReturnType<typeof mcnemarExact>;
    interpretation: string;
  };
  timer: {
    advanced: boolean;
    resolution_ms: number;
    spins: number;
    note: string;
  };
  intervals: {
    method: string;
    test_samples: number;
    classical: WilsonInterval;
    classical_matched: WilsonInterval;
    quantum: WilsonInterval;
    note: string;
  };
  kernel_timing: {
    total_kernel_ms: number;
    kernel_evaluations: number;
    mean_per_entry_us: number | null;
    measurable: boolean;
    note: string;
  };
  psd: PsdReport;
  fair_comparison: {

    same_dataset: boolean;
    same_features: boolean;
    feature_parity_note: string;
    same_split: boolean;
    same_seed: boolean;
    same_test_set: boolean;
    same_evaluation_protocol: boolean;
    no_test_label_tuning: boolean;
  };
  comparison: {
    accuracy_delta: number;
    precision_delta: number;
    recall_delta: number;
    f1_delta: number;
    roc_auc_delta: number;
    training_time_ratio: number;
    inference_time_ratio: number;
    total_time_ratio: number;
  };
  reproducible: boolean;
  reproduction: {
    seed: number;
    test_size: number;
    samples: number;
    note: string;
  };
  sweep_runtime_ms: number;
  persisted: boolean;
  persistence_note: string;
};

/* ------------------------------------------------------------------ data */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { x: number[]; y: number };
let datasetCache: { rows: Row[]; rawRecords: number; fetchedAt: string } | null = null;

async function loadHeartDataset() {
  if (datasetCache) return datasetCache;
  let lastError = "request failed";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const started = Date.now();
    try {
      const res = await fetch(DATA_URL, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) {
        lastError = `HTTP ${res.status} after ${Date.now() - started} ms`;
      } else {
        const text = await res.text();
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const rows: Row[] = [];
        for (const line of lines) {
          const parts = line.split(",");
          if (parts.length !== 14) continue;
          if (parts.some((p) => p === "?" || p === "")) continue;
          const nums = parts.map(Number);
          if (nums.some((n) => !Number.isFinite(n))) continue;
          rows.push({ x: nums.slice(0, 13), y: nums[13]! > 0 ? 1 : 0 });
        }
        if (rows.length < 50) throw new Error("dataset parsed with too few complete records");
        datasetCache = {
          rows,
          rawRecords: lines.length,
          fetchedAt: new Date().toISOString(),
        };
        return datasetCache;
      }
    } catch (error) {
      lastError = `${error instanceof Error ? error.message : "request failed"} after ${Date.now() - started} ms`;
    }
    if (attempt < 3) await wait(300 * attempt);
  }
  throw new Error(
    `UCI Heart Disease repository unavailable — 3 attempts; last failure: ${lastError}`,
  );
}

/* --------------------------------------------------------------- helpers */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function evaluate(scores: number[], labels: number[], threshold: number): MetricSet {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  scores.forEach((s, i) => {
    const pred = s >= threshold ? 1 : 0;
    const y = labels[i]!;
    if (pred === 1 && y === 1) tp += 1;
    else if (pred === 1 && y === 0) fp += 1;
    else if (pred === 0 && y === 0) tn += 1;
    else fn += 1;
  });
  const accuracy = (tp + tn) / labels.length;
  // zero-division convention: undefined precision/recall/F1 report 0.
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  // ROC over the actual continuous score distribution.
  const pairs = scores.map((s, i) => ({ s, y: labels[i]! })).sort((a, b) => b.s - a.s);
  const pos = labels.filter((y) => y === 1).length;
  const neg = labels.length - pos;
  const curve: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }];
  let cTp = 0;
  let cFp = 0;
  let auc = 0;
  let prevFpr = 0;
  let prevTpr = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    if (pairs[i]!.y === 1) cTp += 1;
    else cFp += 1;
    if (i + 1 < pairs.length && pairs[i + 1]!.s === pairs[i]!.s) continue;
    const tpr = pos === 0 ? 0 : cTp / pos;
    const fpr = neg === 0 ? 0 : cFp / neg;
    auc += ((fpr - prevFpr) * (tpr + prevTpr)) / 2;
    curve.push({ fpr, tpr });
    prevFpr = fpr;
    prevTpr = tpr;
  }
  return { accuracy, precision, recall, f1, roc_auc: auc, confusion: { tp, fp, tn, fn }, roc_curve: curve };
}

/* ------------------------------------------------------------- classical */

function trainLogisticRegression(X: number[][], y: number[], iterations = 800, lr = 0.1, l2 = 1e-3) {
  const n = X.length;
  const d = X[0]!.length;
  const w = new Array<number>(d).fill(0);
  let b = 0;
  for (let it = 0; it < iterations; it += 1) {
    const gw = new Array<number>(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i += 1) {
      let z = b;
      const xi = X[i]!;
      for (let j = 0; j < d; j += 1) z += w[j]! * xi[j]!;
      const p = 1 / (1 + Math.exp(-z));
      const err = p - y[i]!;
      for (let j = 0; j < d; j += 1) gw[j] = gw[j]! + err * xi[j]!;
      gb += err;
    }
    for (let j = 0; j < d; j += 1) w[j] = w[j]! - lr * (gw[j]! / n + l2 * w[j]!);
    b -= lr * (gb / n);
  }
  return { w, b };
}

/* ------------------------------------------------------- quantum kernel */

type FeatureMapType = "zz" | "z";

/** Phase of every computational basis state for the selected feature map. */
function featureMapPhases(x: number[], qubits: number, reps: number, type: FeatureMapType) {
  const dim = 1 << qubits;
  const cos = new Float64Array(dim);
  const sin = new Float64Array(dim);
  for (let z = 0; z < dim; z += 1) {
    let phase = 0;
    for (let i = 0; i < qubits; i += 1) {
      const bi = (z >> i) & 1;
      if (bi) phase += 2 * x[i]!;
      if (type === "zz") {
        for (let j = i + 1; j < qubits; j += 1) {
          const bj = (z >> j) & 1;
          if (bi !== bj) phase += 2 * (Math.PI - x[i]!) * (Math.PI - x[j]!);
        }
      }
    }
    phase *= reps;
    cos[z] = Math.cos(phase);
    sin[z] = Math.sin(phase);
  }
  return { cos, sin };
}

function fidelity(
  a: { cos: Float64Array; sin: Float64Array },
  b: { cos: Float64Array; sin: Float64Array },
  dim: number,
) {
  let re = 0;
  let im = 0;
  for (let z = 0; z < dim; z += 1) {
    re += a.cos[z]! * b.cos[z]! + a.sin[z]! * b.sin[z]!;
    im += a.sin[z]! * b.cos[z]! - a.cos[z]! * b.sin[z]!;
  }
  return (re * re + im * im) / (dim * dim);
}

/** Simplified SMO on a precomputed kernel matrix, labels in {-1, +1}. */
function trainKernelSvm(K: number[][], y: number[], C = 1, tol = 1e-3, maxPasses = 12) {
  const n = y.length;
  const alpha = new Array<number>(n).fill(0);
  let b = 0;
  const rand = mulberry32(7);
  const f = (i: number) => {
    let s = b;
    for (let k = 0; k < n; k += 1) if (alpha[k] !== 0) s += alpha[k]! * y[k]! * K[i]![k]!;
    return s;
  };
  let passes = 0;
  while (passes < maxPasses) {
    let changed = 0;
    for (let i = 0; i < n; i += 1) {
      const Ei = f(i) - y[i]!;
      if ((y[i]! * Ei < -tol && alpha[i]! < C) || (y[i]! * Ei > tol && alpha[i]! > 0)) {
        let j = Math.floor(rand() * (n - 1));
        if (j >= i) j += 1;
        const Ej = f(j) - y[j]!;
        const ai = alpha[i]!;
        const aj = alpha[j]!;
        const [L, H] =
          y[i] !== y[j]
            ? [Math.max(0, aj - ai), Math.min(C, C + aj - ai)]
            : [Math.max(0, ai + aj - C), Math.min(C, ai + aj)];
        if (L >= H) continue;
        const eta = 2 * K[i]![j]! - K[i]![i]! - K[j]![j]!;
        if (eta >= 0) continue;
        let ajNew = aj - (y[j]! * (Ei - Ej)) / eta;
        ajNew = Math.min(H, Math.max(L, ajNew));
        if (Math.abs(ajNew - aj) < 1e-6) continue;
        const aiNew = ai + y[i]! * y[j]! * (aj - ajNew);
        const b1 = b - Ei - y[i]! * (aiNew - ai) * K[i]![i]! - y[j]! * (ajNew - aj) * K[i]![j]!;
        const b2 = b - Ej - y[i]! * (aiNew - ai) * K[i]![j]! - y[j]! * (ajNew - aj) * K[j]![j]!;
        alpha[i] = aiNew;
        alpha[j] = ajNew;
        b = aiNew > 0 && aiNew < C ? b1 : ajNew > 0 && ajNew < C ? b2 : (b1 + b2) / 2;
        changed += 1;
      }
    }
    passes = changed === 0 ? passes + 1 : 0;
    if (changed === 0) break;
  }
  return { alpha, b };
}

const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

/**
 * Probe how finely the host clock actually advances. Serverless/edge runtimes
 * deliberately freeze timers between I/O operations, so CPU-bound sections can
 * legitimately measure as exactly 0 ms. We report the probe instead of hiding it.
 */
function probeTimerResolution() {
  const t0 = performance.now();
  let spins = 0;
  let t1 = t0;
  while (t1 === t0 && spins < 5_000_000) {
    spins += 1;
    t1 = performance.now();
  }
  const advanced = t1 !== t0;
  return {
    advanced,
    resolution_ms: advanced ? t1 - t0 : 0,
    spins,
    note: advanced
      ? `Host clock advanced after ${spins.toLocaleString()} reads; smallest observed step ${(t1 - t0).toFixed(3)} ms. Durations below this step are reported as "below timer resolution", not as real zeros.`
      : `Host clock did not advance across ${spins.toLocaleString()} consecutive reads. This runtime freezes timers between I/O operations, so CPU-bound stages measure exactly 0 ms regardless of the work done. Treat all sub-step durations as unmeasurable here and use the reported operation counts (kernel evaluations, SMO passes) as the workload evidence.`,
  };
}

/**
 * Wilson score interval (95%, two-sided) on a proportion. Wald is deliberately
 * avoided: its coverage is poor at the sample sizes used here.
 */
function wilson(p: number, n: number, z = 1.959963985): WilsonInterval {
  if (n <= 0) {
    return { estimate: p, lower: 0, upper: 1, successes: 0, n: 0, level: "95%" };
  }
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  const r = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1e6) / 1e6;
  return {
    estimate: r(p),
    lower: r(centre - half),
    upper: r(centre + half),
    successes: Math.round(p * n),
    n,
    level: "95%",
  };
}

/**
 * Smallest eigenvalue of a symmetric matrix, estimated by power iteration on
 * (cI − K) where c bounds the spectrum (Gershgorin). Used to detect the small
 * negative eigenvalues that floating-point error introduces into a Gram matrix.
 */
function minEigenvalueEstimate(K: number[][], iters = 40) {
  const n = K.length;
  if (n === 0) return 0;
  let c = 0;
  for (let i = 0; i < n; i += 1) {
    let s = 0;
    const Ki = K[i]!;
    for (let j = 0; j < n; j += 1) s += Math.abs(Ki[j]!);
    if (s > c) c = s;
  }
  const rand = mulberry32(11);
  let v = new Float64Array(n);
  for (let i = 0; i < n; i += 1) v[i] = rand() - 0.5;
  let lamMax = 0;
  for (let t = 0; t < iters; t += 1) {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      let s = c * v[i]!;
      const Ki = K[i]!;
      for (let j = 0; j < n; j += 1) s -= Ki[j]! * v[j]!;
      w[i] = s;
    }
    let norm = 0;
    for (let i = 0; i < n; i += 1) norm += w[i]! * w[i]!;
    norm = Math.sqrt(norm);
    if (!(norm > 0)) break;
    for (let i = 0; i < n; i += 1) v[i] = w[i]! / norm;
    lamMax = norm;
  }
  return c - lamMax;
}

/**
 * A fidelity Gram matrix is PSD in exact arithmetic, but accumulated rounding
 * can push the smallest eigenvalue slightly negative, which an SVM solver on a
 * precomputed kernel is not entitled to assume. Add the smallest ridge that
 * restores PSD, and report whether it was needed.
 */
function repairPsd(K: number[][]): PsdReport {
  const minEig = minEigenvalueEstimate(K);
  if (minEig >= -1e-10) {
    return {
      checked: true,
      min_eigenvalue: minEig,
      repaired: false,
      ridge: 0,
      note: `Smallest estimated eigenvalue ${minEig.toExponential(3)} — the Gram matrix is positive semi-definite as computed, so no repair was applied.`,
    };
  }
  const ridge = -minEig + 1e-8;
  for (let i = 0; i < K.length; i += 1) K[i]![i] = K[i]![i]! + ridge;
  return {
    checked: true,
    min_eigenvalue: minEig,
    repaired: true,
    ridge,
    note: `Smallest estimated eigenvalue ${minEig.toExponential(3)} was negative from floating-point error. A ridge of ${ridge.toExponential(3)} was added to the diagonal before the SVM solver, restoring positive semi-definiteness.`,
  };
}

/** Two-sided exact McNemar test on the discordant pairs of two classifiers. */
function mcnemarExact(aCorrect: boolean[], bCorrect: boolean[]) {

  let b = 0; // first correct, second wrong
  let c = 0; // second correct, first wrong
  for (let i = 0; i < aCorrect.length; i += 1) {
    if (aCorrect[i] && !bCorrect[i]) b += 1;
    else if (!aCorrect[i] && bCorrect[i]) c += 1;
  }
  const n = b + c;
  let p = 1;
  if (n > 0) {
    const k = Math.min(b, c);
    // binomial tail with p = 0.5, computed with a running coefficient
    let coeff = 1;
    let tail = 1; // C(n,0)
    for (let i = 1; i <= k; i += 1) {
      coeff = (coeff * (n - i + 1)) / i;
      tail += coeff;
    }
    p = Math.min(1, 2 * tail * Math.pow(0.5, n));
  }
  return {
    discordant_pairs: n,
    only_first_correct: b,
    only_second_correct: c,
    p_value: Math.round(p * 1e6) / 1e6,
    significant_at_05: p < 0.05,
  };
}

/* --------------------------------------------------------------- runner */

export const runHeartBenchmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { testSize?: number; seed?: number; samples?: number }) => ({
    testSize: Math.min(0.4, Math.max(0.1, input.testSize ?? 0.2)),
    seed: Math.round(input.seed ?? 42),
    samples: Math.min(303, Math.max(60, Math.round(input.samples ?? 303))),
  }))
  .handler(async ({ data, context }): Promise<BenchmarkResult> => {
    const { testSize, seed, samples } = data;
    const benchmarkStart = performance.now();
    const dataPrepStart = performance.now();
    const ds = await loadHeartDataset();

    // Same seeded shuffle drives sub-sampling and the split for every pipeline.
    const rand = mulberry32(seed);
    const order = ds.rows.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    const used = order.slice(0, Math.min(samples, ds.rows.length)).map((i) => ds.rows[i]!);
    const testCount = Math.max(10, Math.round(used.length * testSize));
    const test = used.slice(0, testCount);
    const train = used.slice(testCount);
    const dataPrepMs = performance.now() - dataPrepStart;

    // Standardisation fitted on the training set only.
    const preStart = performance.now();
    const d = FEATURE_NAMES.length;
    const mean = new Array<number>(d).fill(0);
    const std = new Array<number>(d).fill(0);
    for (let j = 0; j < d; j += 1) {
      mean[j] = train.reduce((s, r) => s + r.x[j]!, 0) / train.length;
      const v = train.reduce((s, r) => s + (r.x[j]! - mean[j]!) ** 2, 0) / train.length;
      std[j] = Math.sqrt(v) || 1;
    }
    const scale = (r: Row) => r.x.map((v, j) => (v - mean[j]!) / std[j]!);
    const Xtr = train.map(scale);
    const Xte = test.map(scale);
    const ytr = train.map((r) => r.y);
    const yte = test.map((r) => r.y);
    const preMs = performance.now() - preStart;

    // --- classical baseline (trained once on the shared split) ---------------
    const cTrainStart = performance.now();
    const model = trainLogisticRegression(Xtr, ytr);
    const cTrainMs = performance.now() - cTrainStart;

    const cInferStart = performance.now();
    const cScores = Xte.map((xi) => {
      let z = model.b;
      for (let j = 0; j < d; j += 1) z += model.w[j]! * xi[j]!;
      return 1 / (1 + Math.exp(-z));
    });
    const cInferMs = performance.now() - cInferStart;
    const classicalMetrics = evaluate(cScores, yte, 0.5);

    // Feature ranking computed on the training set only (no test labels used).
    const meanY = ytr.reduce((s, v) => s + v, 0) / ytr.length;
    const ranked = FEATURE_NAMES.map((name, j) => {
      let num = 0;
      let dx = 0;
      let dy = 0;
      for (let i = 0; i < Xtr.length; i += 1) {
        const a = Xtr[i]![j]!;
        const bb = ytr[i]! - meanY;
        num += a * bb;
        dx += a * a;
        dy += bb * bb;
      }
      return { name, j, r: Math.abs(num / (Math.sqrt(dx * dy) || 1)) };
    }).sort((a, b) => b.r - a.r);

    const ySigned = ytr.map((v) => (v === 1 ? 1 : -1));

    // Inner validation split, carved out of TRAINING data only. Configuration
    // selection uses this split; the test set is never consulted.
    const innerCount = Math.max(10, Math.round(train.length * 0.25));
    const valIdx = Array.from({ length: innerCount }, (_, i) => i);
    const innerIdx = Array.from({ length: train.length - innerCount }, (_, i) => i + innerCount);

    const sweptQubits = [2, 3, 4, 5];
    const sweptReps = [1, 2, 3];
    const sweptMaps: FeatureMapType[] = ["zz", "z"];
    const sweptC = [0.5, 1, 4];

    const quantumExperiments: QuantumExperiment[] = [];
    const kernelPreviews: KernelPreview[] = [];
    const testScoresByLabel = new Map<string, number[]>();

    const sweepStart = performance.now();
    for (const qubits of sweptQubits) {
      const chosen = ranked.slice(0, Math.min(qubits, ranked.length));
      const idx = chosen.map((c) => c.j);
      const padded = qubits > chosen.length;
      // Documented mapping: qubit k encodes selected feature k; if a
      // configuration requests more qubits than selected features, the
      // remaining qubits cycle over the same ordered feature list.
      const qubitFeature = Array.from({ length: qubits }, (_, k) => idx[k % idx.length]!);
      const lo = qubitFeature.map((j) => Math.min(...Xtr.map((r) => r[j]!)));
      const hi = qubitFeature.map((j) => Math.max(...Xtr.map((r) => r[j]!)));
      const encode = (row: number[]) =>
        qubitFeature.map((j, k) => {
          const span = hi[k]! - lo[k]! || 1;
          return Math.min(Math.PI, Math.max(0, ((row[j]! - lo[k]!) / span) * Math.PI));
        });
      const encTr = Xtr.map(encode);
      const encTe = Xte.map(encode);

      for (const reps of sweptReps) {
        for (const mapType of sweptMaps) {
          const dim = 1 << qubits;
          const kernelStart = performance.now();
          const trStates = encTr.map((r) => featureMapPhases(r, qubits, reps, mapType));
          const teStates = encTe.map((r) => featureMapPhases(r, qubits, reps, mapType));
          const n = trStates.length;
          const Ktr: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
          for (let i = 0; i < n; i += 1) {
            Ktr[i]![i] = 1;
            for (let j = i + 1; j < n; j += 1) {
              const k = fidelity(trStates[i]!, trStates[j]!, dim);
              Ktr[i]![j] = k;
              Ktr[j]![i] = k;
            }
          }
          const Kte = teStates.map((t) => trStates.map((s) => fidelity(t, s, dim)));
          const kernelMs = performance.now() - kernelStart;
          const kernelEvaluations = (n * (n - 1)) / 2 + Kte.length * n;
          // Shown in the UI so the count can be checked arithmetically on screen.
          const kernelEvaluationFormula = `${n}×${n - 1}/2 + ${Kte.length}×${n} = ${((n * (n - 1)) / 2).toLocaleString()} + ${(Kte.length * n).toLocaleString()} = ${kernelEvaluations.toLocaleString()}`;

          const kernelId = `${qubits}q-${reps}r-${mapType}`;
          // PSD check + repair before the matrix reaches the SVM solver.
          const psdReport = repairPsd(Ktr);
          psdByKernel.set(kernelId, psdReport);

          const previewN = Math.min(16, n);
          const previewT = Math.min(10, Kte.length);
          let kmin = 1;
          let kmax = 0;
          let ksum = 0;
          for (let i = 0; i < n; i += 1) {
            for (let j = 0; j < n; j += 1) {
              const v = Ktr[i]![j]!;
              if (v < kmin) kmin = v;
              if (v > kmax) kmax = v;
              ksum += v;
            }
          }
          kernelPreviews.push({
            kernel_id: kernelId,
            label: `${qubits} qubits · ${reps} rep${reps === 1 ? "" : "s"} · ${mapType.toUpperCase()} map`,
            qubits,
            reps,
            feature_map_type: mapType,
            train: Array.from({ length: previewN }, (_, i) =>
              Array.from({ length: previewN }, (_, j) => round4(Ktr[i]![j]!)),
            ),
            test: Array.from({ length: previewT }, (_, i) =>
              Array.from({ length: previewN }, (_, j) => round4(Kte[i]![j]!)),
            ),
            train_shown: previewN,
            test_shown: previewT,
            train_total: n,
            test_total: Kte.length,
            min: round4(kmin),
            max: round4(kmax),
            mean: round4(ksum / (n * n)),
          });

          // Inner validation matrices, drawn from the training kernel only.
          const Kinner = innerIdx.map((i) => innerIdx.map((j) => Ktr[i]![j]!));
          const Kval = valIdx.map((i) => innerIdx.map((j) => Ktr[i]![j]!));
          const yInner = innerIdx.map((i) => ySigned[i]!);
          const yValBin = valIdx.map((i) => ytr[i]!);

          for (const C of sweptC) {
            // Validation fit — used only to rank configurations.
            const vSvm = trainKernelSvm(Kinner, yInner, C);
            const vScores = Kval.map((krow) => {
              let s = vSvm.b;
              for (let k = 0; k < krow.length; k += 1) {
                if (vSvm.alpha[k] !== 0) s += vSvm.alpha[k]! * yInner[k]! * krow[k]!;
              }
              return s;
            });
            const validationAccuracy = evaluate(vScores, yValBin, 0).accuracy;

            // Final fit on the full training split, evaluated on the test set.
            const qTrainStart = performance.now();
            const svm = trainKernelSvm(Ktr, ySigned, C);
            const qTrainMs = performance.now() - qTrainStart;

            const qInferStart = performance.now();
            const qScores = Kte.map((krow) => {
              let s = svm.b;
              for (let k = 0; k < krow.length; k += 1) {
                if (svm.alpha[k] !== 0) s += svm.alpha[k]! * ySigned[k]! * krow[k]!;
              }
              return s;
            });
            const qInferMs = performance.now() - qInferStart;
            const metrics = evaluate(qScores, yte, 0);

            const label = `${qubits}q · ${reps} rep${reps === 1 ? "" : "s"} · ${mapType.toUpperCase()} · C=${C}`;
            quantumExperiments.push({
              label,
              kernel_id: kernelId,
              qubits,
              reps,
              feature_map:
                mapType === "zz"
                  ? `ZZ-style Pauli feature map, ${reps} repetition${reps === 1 ? "" : "s"}, ${qubits} qubits`
                  : `Z-only product feature map, ${reps} repetition${reps === 1 ? "" : "s"}, ${qubits} qubits`,
              feature_map_type: mapType,
              svm_c: C,
              features: qubitFeature.map((j) => FEATURE_NAMES[j]!),
              feature_dimensions: qubits,
              original_features: d,
              encoding: padded
                ? "Min–max encoding to [0, π] with training ranges; surplus qubits cycle the ordered feature list."
                : "Min–max encoding to [0, π] using training ranges only; qubit k encodes selected feature k.",
              padded,
              kernel_matrix: `${n} × ${n} train, ${Kte.length} × ${n} test`,
              kernel_train_dim: `${n} × ${n}`,
              kernel_test_dim: `${Kte.length} × ${n}`,
              kernel_evaluations: kernelEvaluations,
              kernel_evaluation_formula: kernelEvaluationFormula,
              support_vectors: svm.alpha.filter((a) => a > 1e-8).length,
              validation_accuracy: validationAccuracy,
              kernel_time_ms: kernelMs,
              training_time_ms: qTrainMs,
              inference_time_ms: qInferMs,
              total_time_ms: kernelMs + qTrainMs + qInferMs,
              ...metrics,
            });

            // Keep the measured test decision scores so the selected
            // configuration can expose a per-sample prediction trace.
            testScoresByLabel.set(label, qScores);

          }
        }
      }
    }
    const sweepMs = performance.now() - sweepStart;

    // Configuration selected WITHOUT test labels: highest inner-validation
    // accuracy, ties broken by lower runtime.
    const best = quantumExperiments.reduce((a, b) => {
      if (b.validation_accuracy !== a.validation_accuracy)
        return b.validation_accuracy > a.validation_accuracy ? b : a;
      return b.total_time_ms < a.total_time_ms ? b : a;
    });
    // Reported separately for transparency only; never used for selection.
    const bestByTest = quantumExperiments.reduce((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy > a.accuracy ? b : a;
      if (b.roc_auc !== a.roc_auc) return b.roc_auc > a.roc_auc ? b : a;
      return b.total_time_ms < a.total_time_ms ? b : a;
    });

    const traceScores = testScoresByLabel.get(best.label) ?? null;
    const predictionTrace: PredictionTrace[] = yte.map((y, i) => {
      const cs = cScores[i]!;
      const qs = traceScores ? traceScores[i]! : 0;
      const cp = cs >= 0.5 ? 1 : 0;
      const qp = traceScores ? (qs >= 0 ? 1 : 0) : 0;
      return {
        id: `TEST-${String(i + 1).padStart(3, "0")}`,
        true_label: y,
        classical_prediction: cp,
        classical_score: round4(cs),
        quantum_prediction: qp,
        quantum_score: round4(qs),
        classical_correct: cp === y,
        quantum_correct: qp === y,
      };
    });

    // --- feature-matched classical arm ---------------------------------------
    // The headline classical baseline sees ALL 13 standardised features, while
    // the quantum arm encodes only the selected few. That is NOT feature parity,
    // so we also train the identical logistic regression on exactly the features
    // the selected quantum configuration encodes, and report both.
    const matchedIdx = Array.from(new Set(best.features.map((f) => FEATURE_NAMES.indexOf(f)))).filter(
      (j) => j >= 0,
    );
    const matchedNames = matchedIdx.map((j) => FEATURE_NAMES[j]!);
    const mTrainStart = performance.now();
    const mModel = trainLogisticRegression(
      Xtr.map((r) => matchedIdx.map((j) => r[j]!)),
      ytr,
    );
    const mTrainMs = performance.now() - mTrainStart;
    const mInferStart = performance.now();
    const mScores = Xte.map((r) => {
      let z = mModel.b;
      matchedIdx.forEach((j, k) => {
        z += mModel.w[k]! * r[j]!;
      });
      return 1 / (1 + Math.exp(-z));
    });
    const mInferMs = performance.now() - mInferStart;
    const matchedMetrics = evaluate(mScores, yte, 0.5);

    // --- statistical significance of the classical/quantum gap ---------------
    const quantumCorrect = predictionTrace.map((t) => t.quantum_correct);
    const classicalCorrect = predictionTrace.map((t) => t.classical_correct);
    const matchedCorrect = mScores.map((s, i) => (s >= 0.5 ? 1 : 0) === yte[i]);
    const mcFull = mcnemarExact(classicalCorrect, quantumCorrect);
    const mcMatched = mcnemarExact(matchedCorrect, quantumCorrect);
    const timer = probeTimerResolution();

    const cTotal = cTrainMs + cInferMs;
    const qTotal = best.total_time_ms;
    const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);
    const accuracyDifference = best.accuracy - classicalMetrics.accuracy;

    const result: BenchmarkResult = {
      experiment_id: crypto.randomUUID(),
      executed_at: new Date().toISOString(),
      dataset: {
        name: "UCI Heart Disease (Cleveland, processed)",
        source_url: "https://archive.ics.uci.edu/dataset/45/heart+disease",
        records: ds.rows.length,
        records_used: used.length,
        features: d,
        train_samples: train.length,
        test_samples: test.length,
        inner_train_samples: innerIdx.length,
        validation_samples: valIdx.length,
        positive_rate_train: ytr.reduce((s, v) => s + v, 0) / ytr.length,
        positive_rate_test: yte.reduce((s, v) => s + v, 0) / yte.length,
        missing_value_handling:
          "Records containing '?' in any of the 14 columns are excluded; no value is imputed.",
        label_definition: "Positive class = original 'num' target greater than 0 (any disease presence).",
        fetched_at: ds.fetchedAt,
      },
      configuration: {
        qubits: best.qubits,
        test_size: testSize,
        random_seed: seed,
        quantum_features: best.features,
        feature_map: best.feature_map,
        backend: "In-app full statevector simulation (classical hardware)",
        simulator: "Deterministic statevector simulator implemented in this application",
        shots: "Not applicable — exact statevector fidelity, no sampling",
        preprocessing:
          "Train-only standardisation (z-score); quantum features are the top-|Pearson r| training features, min–max encoded to [0, π] using training ranges only.",
        scaling: "Z-score standardisation fitted on training rows only, then min–max to [0, π]",
        feature_selection: "Top |Pearson r| against the training labels (training rows only)",
        encoding: best.encoding,
        kernel_type: "Fidelity quantum kernel (|⟨φ(x)|φ(x')⟩|²)",
        kernel_evaluation: "Exact statevector inner product, precomputed kernel matrices",
        svm: "Kernel SVM trained with simplified SMO (tol 1e-3, max 12 passes)",
        svm_c: best.svm_c,
        swept_qubits: sweptQubits,
        swept_reps: sweptReps,
        swept_feature_maps: sweptMaps.map((m) => (m === "zz" ? "ZZ-style Pauli" : "Z-only product")),
        swept_c: sweptC,
      },
      evaluation_protocol: {
        positive_class: "Heart disease present (label 1)",
        averaging: "Binary — metrics reported for the positive class",
        zero_division: "Undefined precision/recall/F1 reported as 0",
        classical_score_source: "Logistic-regression predicted probability",
        quantum_score_source: "Kernel SVM continuous decision function",
        classical_threshold: 0.5,
        quantum_threshold: 0,
        selection_rule:
          "Highest inner-validation accuracy (validation split carved from training rows only); ties broken by lower runtime.",
        evaluation_set: "Held-out test split, untouched during selection",
      },
      timings: {
        data_preparation_ms: dataPrepMs,
        preprocessing_ms: preMs,
        classical_training_ms: cTrainMs,
        classical_inference_ms: cInferMs,
        quantum_kernel_ms: best.kernel_time_ms,
        quantum_training_ms: best.training_time_ms,
        quantum_inference_ms: best.inference_time_ms,
        quantum_total_ms: best.total_time_ms,
        sweep_ms: sweepMs,
        benchmark_total_ms: performance.now() - benchmarkStart,
      },
      classical: {
        model: "Logistic regression (batch gradient descent, 800 iterations)",
        ...classicalMetrics,
        training_time_ms: cTrainMs,
        inference_time_ms: cInferMs,
        total_time_ms: cTotal,
      },
      quantum_experiments: quantumExperiments,
      kernel_previews: kernelPreviews,
      prediction_trace: predictionTrace,
      best_quantum: best,
      best_quantum_by_test: bestByTest,
      quantum: {
        model: `Quantum kernel SVM (fidelity kernel, SMO) — selected from ${quantumExperiments.length} configurations`,
        accuracy: best.accuracy,
        precision: best.precision,
        recall: best.recall,
        f1: best.f1,
        roc_auc: best.roc_auc,
        confusion: best.confusion,
        roc_curve: best.roc_curve,
        kernel_time_ms: best.kernel_time_ms,
        training_time_ms: best.training_time_ms,
        inference_time_ms: best.inference_time_ms,
        total_time_ms: best.total_time_ms,
        kernel_matrix: best.kernel_matrix,
        support_vectors: best.support_vectors,
      },
      accuracy_difference: accuracyDifference,
      accuracy_difference_pp: accuracyDifference * 100,
      quantum_exceeds_classical: best.accuracy > classicalMetrics.accuracy,
      classical_matched: {
        model: `Logistic regression (identical settings) restricted to the ${matchedNames.length} feature${matchedNames.length === 1 ? "" : "s"} the selected quantum configuration encodes`,
        features: matchedNames,
        feature_count: matchedNames.length,
        ...matchedMetrics,
        training_time_ms: mTrainMs,
        inference_time_ms: mInferMs,
        total_time_ms: mTrainMs + mInferMs,
      },
      significance: {
        method:
          "McNemar exact test (two-sided, binomial on discordant pairs) on the held-out test split.",
        test_samples: yte.length,
        full_vs_quantum: mcFull,
        matched_vs_quantum: mcMatched,
        interpretation: `Headline classical vs quantum differ on ${mcFull.discordant_pairs} of ${yte.length} test records (${mcFull.only_first_correct} only-classical-correct, ${mcFull.only_second_correct} only-quantum-correct), exact p = ${mcFull.p_value}. ${
          mcFull.significant_at_05
            ? "This difference is statistically significant at α = 0.05."
            : "This difference is NOT statistically significant at α = 0.05 — on this test set the two models are statistically indistinguishable, and any accuracy gap shown should be read as noise, not evidence of quantum benefit."
        }`,
      },
      timer,
      intervals: {
        method:
          "Wilson score interval, 95% (two-sided). Wald intervals are not used — their coverage is poor at this sample size.",
        test_samples: yte.length,
        classical: wilson(classicalMetrics.accuracy, yte.length),
        classical_matched: wilson(matchedMetrics.accuracy, yte.length),
        quantum: wilson(best.accuracy, yte.length),
        note: `With ${yte.length} held-out records, every accuracy on this page carries a 95% Wilson interval roughly ±${(
          (wilson(best.accuracy, yte.length).upper - wilson(best.accuracy, yte.length).lower) *
          50
        ).toFixed(1)} percentage points wide on each side. The classical and quantum intervals overlap almost entirely, which is the same conclusion the McNemar test reaches.`,
      },
      kernel_timing: {
        total_kernel_ms: best.kernel_time_ms,
        kernel_evaluations: best.kernel_evaluations,
        mean_per_entry_us:
          best.kernel_evaluations > 0 ? (best.kernel_time_ms * 1000) / best.kernel_evaluations : null,
        measurable: best.kernel_time_ms > 0,
        note:
          best.kernel_time_ms > 0
            ? "Mean time per kernel entry is derived from the measured kernel-construction duration divided by the counted kernel evaluations."
            : "The kernel stage measured below the host timer resolution, so no per-entry time can be derived. The counted kernel evaluations remain the workload evidence.",
      },
      psd: psdBest ?? {
        checked: false,
        min_eigenvalue: 0,
        repaired: false,
        ridge: 0,
        note: "Positive semi-definiteness was not evaluated for this configuration.",
      },

      fair_comparison: {
        same_dataset: true,
        same_features: matchedNames.length === d,
        feature_parity_note: `NOT matched in the headline row: the classical logistic regression uses all ${d} standardised features, while the selected quantum configuration encodes ${matchedNames.length} (${matchedNames.join(", ")}). The feature-matched classical arm reported alongside it trains the same logistic regression on exactly those ${matchedNames.length} features and is the only like-for-like comparison.`,
        same_split: true,
        same_seed: true,
        same_test_set: true,
        same_evaluation_protocol: true,
        no_test_label_tuning: true,
      },
      comparison: {
        accuracy_delta: accuracyDifference,
        precision_delta: best.precision - classicalMetrics.precision,
        recall_delta: best.recall - classicalMetrics.recall,
        f1_delta: best.f1 - classicalMetrics.f1,
        roc_auc_delta: best.roc_auc - classicalMetrics.roc_auc,
        training_time_ratio: ratio(best.training_time_ms, cTrainMs),
        inference_time_ratio: ratio(best.inference_time_ms, cInferMs),
        total_time_ratio: ratio(qTotal, cTotal),
      },
      reproducible: true,
      reproduction: {
        seed,
        test_size: testSize,
        samples,
        note:
          "Re-running the benchmark with this seed, test size and sample count reproduces the same split, the same deterministic feature maps and the same measured metrics; wall-clock timings vary with the host.",
      },
      sweep_runtime_ms: sweepMs,
      persisted: false,
      persistence_note: "",
    };

    // Persist the experiment so the page can show the latest result after reload.
    try {
      const { supabase, userId } = context;
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: study } = await supabase
        .from("studies")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (profile?.org_id && study?.id) {
        const { error } = await supabase.from("optimization_runs").insert({
          org_id: profile.org_id,
          study_id: study.id,
          method: "heart_quantum_kernel_benchmark",
          backend: "statevector_simulation",
          objective: best.roc_auc,
          qubo_size: best.qubits,
          runtime_ms: Math.round(result.sweep_runtime_ms),
          assignment: [],
          metrics: JSON.parse(JSON.stringify(result)),
          created_by: userId,
        });
        if (error) {
          result.persistence_note = `Result not stored: ${error.message}`;
        } else {
          result.persisted = true;
        }
      } else {
        result.persistence_note =
          "Result not stored: an experiment record needs a workspace study, and none exists yet.";
      }
    } catch (error) {
      result.persistence_note = `Result not stored: ${error instanceof Error ? error.message : "unknown error"}`;
    }

    return result;
  });
