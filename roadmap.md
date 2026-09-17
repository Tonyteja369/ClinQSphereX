# ClinQSphereX roadmap

## Current — reviewer findings, pass 1 (benchmark correctness)
- [x] Microsecond timing with 3 decimals, derived mean time per kernel entry, ratios guarded with "—"
- [x] Wilson 95% intervals on every accuracy, shown beside the McNemar result
- [x] Feature-parity statement naming which arm sees which features
- [x] ROC panel plots measured operating points and states when no curve data exists
- [x] PSD check and ridge repair on the Gram matrix before the SVM solver
- [x] Separate pipeline labels for site-allocation QUBO vs kernel-classifier runs

## Next — reviewer findings, pass 2 (demo data and integrity)
- [ ] Reproducible seed: consents, tasks, a scheduled visit, non-zero enrolment
- [ ] Reseed demo actors to coordinator@/reviewer@/investigator@demo.clinqsphere.tech
- [ ] Single shared date-formatting utility; remove inline formatting
- [ ] Cached ClinVar + GWAS fixtures behind a flag with a "cached response" badge
- [ ] Hash-chained audit log with chain verification and revoked update/delete grants
- [ ] Confirm notification enqueue shares a transaction with the status change

## Next — reviewer findings, pass 3 (architecture)
- [ ] SNOMED CT condition codes alongside free text
- [ ] Temporal predicate criteria with an event-history table
- [ ] De-identification layer and k=5 anonymity check
- [ ] Test suite: unknown-never-passes, cross-org RLS, seed-42 golden file
- [ ] Recruitment-bias comparison against the source registry

## Current — editorial authentication launch
- [x] Rebuild authentication as a premium editorial biomedical product composition
- [x] Integrate the supplied molten-DNA film as a scientific product visual with a still fallback
- [x] Preserve password, Google, account creation, reset, routing, and researcher-responsibility flows
- [x] Verify desktop, mobile, reduced-motion, overflow, and interaction states

## Current — lavender mobile workspace and analytical dashboard
- [x] Recompose mobile sign-in and sign-up from the supplied clean lavender references
- [x] Apply the mobile application language across authenticated pages and bottom navigation
- [x] Recompose the desktop Dashboard from live workspace values with interactive visualizations
- [x] Verify core routes on narrow mobile and desktop viewports

## Current — Prismatic Ivory Nexus redesign
- [x] Rebuild authenticated navigation as a reflective collapsible vertical taskbar on desktop and mobile
- [x] Refine disease browsing and detail views into organ-led clinical workspaces
- [x] Extend optical glass, reflections and accessible route transitions across every remaining page
- [x] Apply the selected ivory-violet optical glass system across shared controls and surfaces
- [x] Recompose authentication and the authenticated shell around floating tactile workspaces
- [x] Verify the entry experience and dashboard at desktop and mobile sizes

## Done — real public research sources
- [x] Genomic Intelligence Engine at /genomics: live NCBI E-utilities, PubMed, UniProt, ClinicalTrials.gov
- [x] Live source-status panel (LIVE / SOURCE OFFLINE / CONTROLLED ACCESS), no silent fallback
- [x] Measured ingest run: records, bases, bytes, search/download/parse/process timings, throughput
- [x] Real sequence excerpts with accession, source link and retrieval timestamp
- [x] Source scale vs current run kept visually separate; projections labelled theoretical

## Current — source resilience, exports, and media accessibility
- [x] Add bounded retries and independent fresh-result caching for each genomic source
- [x] Show SOURCE OFFLINE without rendering retained or substitute records after failures
- [x] Export the current measured NCBI run as JSON or CSV with IDs and retrieval timestamps
- [x] Pause the authentication video for reduced motion and low-power/data-saving conditions, with poster fallback
- [x] Require authentication before every site page, including Genomics and all research content

## Now — premium biomedical liquid interface
- [x] Cinematic violet/white landing experience with strategic liquid-glass surfaces
- [x] Uploaded DNA video used as the cinematic background with poster and reduced-motion fallback
- [x] Premium biomedical media display and cardiovascular research centerpiece
- [x] Immersive glass authentication and research workspace styling
- [ ] Scientific visualization upgrades for candidate review and Quantum Lab
- [x] Footer creator credits and updated public navigation
- [x] Desktop/mobile, interaction, accessibility, console, and route verification
- [x] Reusable liquid-glass tokens and components for navigation, cards, dialogs, popovers, and evidence panels
- [x] Uploaded neural-network video used as the full-screen authentication landscape with minimal black shading and responsive liquid-glass form

## Now — rebrand + design system (this turn)
- [x] Rename ClinQSphereX → ClinQSphereX everywhere (nav, titles, metadata, copy)
- [x] Arctic Signal palette as semantic tokens (#0DB8D3 #1B7FDC #065B98 #193546)
- [x] Sora headings + Manrope body
- [x] Glass surfaces, depth, restrained motion
- [x] Procedural WebGL diagnostic sphere hero (R3F/Drei/Three) with static + reduced-motion fallback
- [x] Language rules: "potentially eligible", "researcher review required", "model prediction", no compliance claims

## Done — disease-centred website
- [x] Disease explorer (8 areas) + per-disease pages at /diseases and /diseases/$slug
- [x] Live ClinicalTrials.gov v2 discovery (no fabricated counts; error/empty states)
- [x] Home rebuilt: hero, challenge, disease explorer, heart demo, story flow, benchmark (Not evaluated), data-scale with sources, genomics chain, explainability, human review, governance, CTA
- [x] Provenance tags: live / reference / controlled / synthetic

## Next — screening + evidence honesty
- [ ] Three-state criterion display: MATCH / NOT MATCHED / UNKNOWN (never coerce UNKNOWN)
- [ ] Criterion → evidence value → source → timestamp → result on candidate review
- [ ] Review decisions: Approve / Needs Review / Not Eligible / Request Information
- [ ] Quantum Lab page: classical vs quantum benchmark, experiment records, no advantage claims
- [ ] Standards map with IMPLEMENTED / ARCHITECTED / ROADMAP labels

## Later
- [ ] Participant lifecycle states + consent versioning / re-consent impact
- [ ] Visits, tasks, documents, potential protocol deviations, risk + CAPA
- [ ] Data quality dashboard computed from real stored data
- [ ] Model/experiment registry with model, dataset, feature versions
- [ ] Governance center: roles, tenant scoping, retention per study, IEC states

## Blocked / out of scope for this app
- FastAPI/Python backend, Docker deploy: app runs on the current stack; Qiskit work stays in the `quantum` folder
- Real FHIR/Synthea ingestion pipeline: needs data source decision from the user
