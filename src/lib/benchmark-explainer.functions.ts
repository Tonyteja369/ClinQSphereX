import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * AI-assisted discrepancy explainer for the heart quantum-kernel benchmark.
 *
 * It receives ONLY numbers the run already measured (no patient records) and
 * returns a short plain-language reading of why the quantum arm may look lower
 * than expected. It never produces new metrics — the prompt forbids inventing
 * numbers and the UI labels the output as an AI-written interpretation.
 */

const MODEL = "google/gemini-3.8-flash";

export type DiscrepancyInput = {
  classical: { accuracy: number; roc_auc: number; tpr: number; fpr: number; positives: number; negatives: number; auc_recomputed: number; curve_points: number };
  quantum: { accuracy: number; roc_auc: number; tpr: number; fpr: number; positives: number; negatives: number; auc_recomputed: number; curve_points: number };
  test_samples: number;
  discordant_pairs: number;
  mcnemar_p: number | null;
  quantum_features: string[];
  classical_features: number;
  qubits: number;
  feature_map: string;
  svm_c: number;
  kernel_min_eigenvalue: number | null;
  psd_repaired: boolean;
  notes: string[];
};

export type DiscrepancyExplanation = {
  summary: string;
  model: string;
  generated_at: string;
};

export const explainBenchmarkDiscrepancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DiscrepancyInput) => {
    if (!input || typeof input !== "object") throw new Error("Diagnostics payload is required");
    if (!input.classical || !input.quantum) throw new Error("Both arms are required");
    return input;
  })
  .handler(async ({ data }): Promise<DiscrepancyExplanation> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The AI service is not configured for this workspace.");

    const system = [
      "You are a careful ML evaluation reviewer for a clinical research prototype.",
      "You are given measured diagnostics from one benchmark run comparing a classical",
      "logistic regression against a simulated quantum-kernel SVM.",
      "Rules: never invent a number; only cite numbers present in the payload.",
      "Never claim quantum advantage. Never give clinical advice.",
      "If the recomputed AUC differs from the reported AUC, say so first and explain the likely cause.",
      "If a recomputed AUC is below 0.5, note that it indicates inverted score orientation.",
      "Answer in at most 180 words: first a one-sentence summary of what changed in the",
      "ROC/AUC inputs, then 3-5 short bullet points of likely causes ranked by plausibility.",
      "Plain text with '-' bullets, no markdown headings.",
    ].join(" ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(data) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("The AI service is rate limited right now. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits are exhausted for this workspace. Add credits to continue.");
      if (res.status === 403) throw new Error("AI access is blocked by a workspace policy or limit.");
      throw new Error(`The AI service returned ${res.status}. ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as any;
    const summary: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!summary) throw new Error("The AI service returned an empty explanation.");

    return { summary, model: MODEL, generated_at: new Date().toISOString() };
  });
