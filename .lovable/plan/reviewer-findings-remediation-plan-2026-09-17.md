# Reviewer findings — remediation plan

You raised 17 findings. Some are small instrumentation fixes, some are real
architectural gaps. This plan groups them into three passes so the demo-facing
problems are gone first and the deeper work is scheduled honestly rather than
half-built.

Three findings (McNemar, timer disclosure, feature parity) were already
addressed in the previous pass — this plan finishes them properly rather than
re-doing them.

---

## Pass 1 — Quantum Lab correctness and honesty (do now)

**Timing (finding 1).** First confirm whether the Gram matrix is built pair-by-pair
in a loop or as one batched pass — the answer changes whether 0.00 ms is a bug or a
display problem. Then:
- switch every remaining `Date.now()` in the benchmark to high-resolution timing
- display microseconds with 3 decimals instead of milliseconds
- add a derived **mean time per kernel entry** = total kernel time ÷ 42,245
- guard every ratio against divide-by-zero, rendering `—` instead of `0.00×`
- keep the existing host-clock disclosure, now stated in microseconds

**Confidence intervals (finding 3).** McNemar's exact test already runs. Add a
**Wilson score interval** (not Wald — n = 59) on every accuracy figure, and show
the interval next to each accuracy and ROC-AUC comparison, including the sweep table.

**Feature parity (finding 2).** The matched classical arm exists. Re-verify by
tracing the training call's actual column set, and make the fairness chip state
explicitly which arm sees which features rather than a bare ✓/✕.

**ROC panel (finding 4).** The curve is resampled onto a 51-point grid; if either
curve array is empty the panel draws axes only. Add a length check, render an
explicit "no curve data" state, and plot the raw curve points rather than a grid
resample so a short curve still draws.

**PSD repair (finding 15).** After the Gram matrix is built, check for negative
eigenvalues from floating-point error and either clip them or add a small ridge
before the solver. Report whether repair was needed in the run metadata.

**Backend naming (finding 9).** Separate the experiment/backend labels so the QUBO
site-allocation run is `site_allocation_qubo` (backend `classical_exhaustive` /
`simulated_annealing`) and the kernel run stays `heart_quantum_kernel_benchmark`
(backend `statevector_simulation`).

## Pass 2 — Demo data and integrity (next)

- **Empty dashboard (5):** a reproducible seed script adding consents, tasks, a
  scheduled visit, and non-zero enrolment on both studies.
- **Personal emails in the audit trail (8):** reseed demo actors as
  `coordinator@ / reviewer@ / investigator@demo.clinqsphere.tech`.
- **Timestamp drift (6):** one shared date-formatting utility; remove every inline
  format call so Dashboard and Operations cannot disagree.
- **Live API dependency (7):** cache one real ClinVar + GWAS Catalog response as a
  fixture, served behind a flag, with a visible "cached response" badge.
- **Tamper-evident audit log (13):** `prev_hash` / `row_hash` chain computed on
  insert, a chain-verification script, and UPDATE/DELETE revoked at the database
  role level.
- **Outbox check (14):** confirm the notification insert shares a transaction with
  the status change it follows; wrap them if not.

## Pass 3 — Architectural gaps (scheduled, not rushed)

- **Coded conditions (10):** `condition_code` (SNOMED CT) alongside free text, with
  a migration mapping the existing ~10 strings.
- **Temporal criteria (11):** a `temporal_predicate` criterion type plus the
  event-history table it requires (OMOP DRUG_ERA as the model).
- **Re-identification risk (12):** de-identification layer — age bands, 90+ cap,
  district instead of city — and a k=5 anonymity check before a record is queryable.
- **Test suite (16):** three tests first — unknown never becomes pass; cross-org
  RLS returns zero rows; seed-42 golden-file benchmark output.
- **Recruitment bias (17):** compare suggested-pool demographics against the full
  registry and surface the divergence on the dashboard.

---

## Technical notes

Wilson interval and McNemar are implemented in TypeScript inside
`heart-benchmark.functions.ts` — this stack has no Python runtime, so statsmodels
and scipy are not available; the formulas are short and exact.

Timing stays `performance.now()`, which is the highest-resolution clock this
runtime exposes; the existing disclosure about the host freezing timers between
I/O remains, because switching units does not create resolution that is not there.

Stored benchmark runs missing the new fields will not render, as with the previous
disclosure fields.

## Scope check

Pass 1 is one session. Pass 2 touches the database and seed data. Pass 3 is schema
work that should not be squeezed in alongside the rest.
