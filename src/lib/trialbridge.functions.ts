import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { screenCohort, type Criterion, type ParticipantLike } from "./matching";
import { solveQubo, type AllocCandidate, type AllocSite } from "./qubo";

type Ctx = { supabase: any; userId: string; claims: Record<string, unknown> };

async function orgContext(context: Ctx) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("org_id, email, full_name")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No research organisation is linked to this account.");
  return data as { org_id: string; email: string; full_name: string };
}

async function audit(
  context: Ctx,
  orgId: string,
  email: string,
  action: string,
  entity: string,
  entityId: string | null,
  meta: Record<string, unknown>,
) {
  await context.supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: context.userId,
    actor_email: email,
    action,
    entity,
    entity_id: entityId,
    meta,
  });
}

/** Re-screen a study's participant pool against the CURRENT protocol criteria. */
export const runScreening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studyId: string }) => {
    if (!input?.studyId) throw new Error("studyId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { org_id, email } = await orgContext(ctx);

    const [{ data: study }, { data: criteriaRows }, { data: participants }] = await Promise.all([
      ctx.supabase.from("studies").select("*").eq("id", data.studyId).maybeSingle(),
      ctx.supabase.from("eligibility_criteria").select("*").eq("study_id", data.studyId),
      ctx.supabase.from("participants").select("*").eq("org_id", org_id),
    ]);
    if (!study) throw new Error("Study not found");

    const criteria = (criteriaRows ?? []) as Criterion[];
    if (!criteria.length) throw new Error("Add at least one eligibility criterion first.");

    const results = screenCohort((participants ?? []) as ParticipantLike[], criteria);

    const { data: existing } = await ctx.supabase
      .from("candidates")
      .select("id, participant_id, status")
      .eq("study_id", data.studyId);
    const locked = new Set(
      (existing ?? [])
        .filter((c: any) => !["suggested", "under_review"].includes(c.status))
        .map((c: any) => c.participant_id),
    );

    const rows = results
      .filter((r) => !locked.has(r.participantId))
      .map((r) => ({
        org_id,
        study_id: data.studyId,
        participant_id: r.participantId,
        status: (r.disqualified ? "ineligible" : "suggested") as string,
        match_score: r.score,
        confidence: r.confidence,
        explanation: r.explanation,
        screened_protocol_version: study.protocol_version,
        criteria_snapshot_at: new Date().toISOString(),
      }));

    if (rows.length) {
      const { error } = await ctx.supabase
        .from("candidates")
        .upsert(rows, { onConflict: "study_id,participant_id" });
      if (error) throw new Error(error.message);
    }

    await audit(ctx, org_id, email, "screening.run", "study", data.studyId, {
      screened: results.length,
      written: rows.length,
      skipped_locked: locked.size,
      protocol_version: study.protocol_version,
    });

    return {
      screened: results.length,
      shortlisted: rows.filter((r) => r.status === "suggested").length,
      flaggedIneligible: rows.filter((r) => r.status === "ineligible").length,
      lockedUnchanged: locked.size,
    };
  });

/** A qualified reviewer confirms or overrides a suggestion. */
export const reviewCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { candidateId: string; status: string; note?: string; siteId?: string | null }) => {
      const allowed = [
        "suggested",
        "under_review",
        "contacted",
        "consented",
        "screen_failed",
        "ineligible",
        "enrolled",
        "withdrawn",
      ];
      if (!input?.candidateId) throw new Error("candidateId is required");
      if (!allowed.includes(input.status)) throw new Error("Unsupported review decision");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { org_id, email } = await orgContext(ctx);

    const { data: candidate } = await ctx.supabase
      .from("candidates")
      .select("*, participants(code), studies(title, protocol_version)")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (!candidate) throw new Error("Candidate not found");

    if (["contacted", "consented", "enrolled"].includes(data.status)) {
      const { data: consent } = await ctx.supabase
        .from("consents")
        .select("status")
        .eq("study_id", candidate.study_id)
        .eq("participant_id", candidate.participant_id)
        .maybeSingle();
      const granted = consent?.status === "granted";
      if (data.status === "enrolled" && !granted) {
        throw new Error("Enrolment blocked: informed consent has not been recorded as granted.");
      }
      if (data.status !== "enrolled" && consent?.status === "revoked") {
        throw new Error("Consent was revoked for this participant; outreach is not permitted.");
      }
    }

    const { error } = await ctx.supabase
      .from("candidates")
      .update({
        status: data.status,
        review_note: data.note ?? "",
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
        ...(data.siteId !== undefined ? { site_id: data.siteId } : {}),
      })
      .eq("id", data.candidateId);
    if (error) throw new Error(error.message);

    await audit(ctx, org_id, email, "candidate.review", "candidate", data.candidateId, {
      from: candidate.status,
      to: data.status,
      note: data.note ?? "",
      participant: candidate.participants?.code,
    });

    // Queue the follow-up notification asynchronously (idempotent per transition).
    await ctx.supabase.from("job_queue").upsert(
      {
        org_id,
        job_type: `notify.${data.status}`,
        idempotency_key: `${data.candidateId}:${data.status}`,
        payload: {
          candidate_id: data.candidateId,
          participant: candidate.participants?.code,
          study: candidate.studies?.title,
        },
      },
      { onConflict: "org_id,idempotency_key", ignoreDuplicates: true },
    );

    return { ok: true };
  });

/** Record or revoke informed consent. */
export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studyId: string; participantId: string; status: string }) => {
    const allowed = ["not_started", "sent", "granted", "declined", "revoked", "expired"];
    if (!allowed.includes(input?.status)) throw new Error("Unsupported consent status");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { org_id, email } = await orgContext(ctx);
    const now = new Date().toISOString();

    const { error } = await ctx.supabase.from("consents").upsert(
      {
        org_id,
        study_id: data.studyId,
        participant_id: data.participantId,
        status: data.status,
        recorded_by: ctx.userId,
        granted_at: data.status === "granted" ? now : null,
        revoked_at: data.status === "revoked" ? now : null,
      },
      { onConflict: "study_id,participant_id" },
    );
    if (error) throw new Error(error.message);

    if (data.status === "revoked") {
      await ctx.supabase
        .from("candidates")
        .update({ status: "withdrawn", review_note: "Consent revoked by participant" })
        .eq("study_id", data.studyId)
        .eq("participant_id", data.participantId);
    }

    await audit(ctx, org_id, email, "consent.update", "participant", data.participantId, {
      study_id: data.studyId,
      status: data.status,
    });
    return { ok: true };
  });

/** Build and solve the site-allocation QUBO for reviewer-approved candidates. */
export const runAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studyId: string }) => {
    if (!input?.studyId) throw new Error("studyId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { org_id, email } = await orgContext(ctx);

    const [{ data: cands }, { data: sites }] = await Promise.all([
      ctx.supabase
        .from("candidates")
        .select("id, match_score, status, participants(code, city, attributes)")
        .eq("study_id", data.studyId)
        .in("status", ["under_review", "contacted", "consented"])
        .order("match_score", { ascending: false })
        .limit(6),
      ctx.supabase.from("sites").select("*").eq("study_id", data.studyId).eq("active", true),
    ]);

    const siteList: AllocSite[] = (sites ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      capacity: Math.max(1, Math.min(3, s.weekly_capacity)),
    }));
    if (!siteList.length) throw new Error("This study has no active research sites.");
    if (!(cands ?? []).length)
      throw new Error("No reviewer-approved candidates are waiting for site allocation.");

    const candList: AllocCandidate[] = (cands ?? []).map((c: any) => {
      const base = Number(c.participants?.attributes?.distance_km ?? 12);
      const distanceKm: Record<string, number> = {};
      siteList.forEach((s, i) => {
        distanceKm[s.id] = Math.round(base * (1 + i * 0.45));
      });
      return {
        id: c.id,
        label: c.participants?.code ?? "candidate",
        score: Number(c.match_score),
        distanceKm,
      };
    });

    const result = solveQubo(candList, siteList);

    const { data: run, error } = await ctx.supabase
      .from("optimization_runs")
      .insert({
        org_id,
        study_id: data.studyId,
        method: "site_allocation_qubo",
        backend: result.method === "exhaustive" ? "classical_exhaustive" : "classical_annealing",
        objective: result.objective,
        qubo_size: result.numVariables,
        runtime_ms: result.runtimeMs,
        assignment: result.assignment,
        metrics: {
          numTerms: result.numTerms,
          perSiteLoad: result.perSiteLoad,
          unassigned: result.unassigned,
          note: "Same QUBO consumed by quantum/site_allocation_qaoa.py. Solved classically here; no QPU executed.",
        },
        created_by: ctx.userId,
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);

    for (const a of result.assignment) {
      await ctx.supabase.from("candidates").update({ site_id: a.siteId }).eq("id", a.candidateId);
    }

    await audit(ctx, org_id, email, "allocation.run", "study", data.studyId, {
      variables: result.numVariables,
      objective: result.objective,
      solver: result.method,
    });

    return { run, result };
  });

/** Drain the notification queue with bounded retries and dead-lettering. */
export const processQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const { org_id, email } = await orgContext(ctx);

    const { data: jobs } = await ctx.supabase
      .from("job_queue")
      .select("*")
      .eq("org_id", org_id)
      .in("status", ["pending", "failed"])
      .lte("next_run_at", new Date().toISOString())
      .order("created_at")
      .limit(20);

    let sent = 0;
    let failed = 0;
    let dead = 0;

    for (const job of jobs ?? []) {
      const attempts = job.attempts + 1;
      // Simulated delivery channel: ~15% transient failures, retried with backoff.
      const delivered = Math.random() > 0.15;
      if (delivered) {
        await ctx.supabase
          .from("job_queue")
          .update({ status: "sent", attempts, last_error: "" })
          .eq("id", job.id);
        sent++;
      } else if (attempts >= job.max_attempts) {
        await ctx.supabase
          .from("job_queue")
          .update({ status: "dead_letter", attempts, last_error: "Delivery channel unavailable" })
          .eq("id", job.id);
        dead++;
      } else {
        await ctx.supabase
          .from("job_queue")
          .update({
            status: "failed",
            attempts,
            last_error: "Delivery channel unavailable — retry scheduled",
            next_run_at: new Date(Date.now() + attempts * 30_000).toISOString(),
          })
          .eq("id", job.id);
        failed++;
      }
    }

    await audit(ctx, org_id, email, "queue.drain", "job_queue", null, { sent, failed, dead });
    return { processed: (jobs ?? []).length, sent, retrying: failed, deadLettered: dead };
  });
