import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusPill } from "@/components/StatusPill";
import { lookupRegistryStudy, type RegistryRecord } from "@/lib/trials.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/studies/")({
  head: () => ({
    meta: [
      { title: "Studies — ClinQSphereX" },
      {
        name: "description",
        content: "All clinical studies your research organisation is recruiting for, with protocol versions and sites.",
      },
      { property: "og:title", content: "Studies — ClinQSphereX" },
      { property: "og:description", content: "Manage clinical studies, protocol versions and research sites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudiesPage,
});

function StudiesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", title: "", sponsor: "", phase: "II", target: 50 });
  const [nctId, setNctId] = useState("");
  const [imported, setImported] = useState<RegistryRecord | null>(null);
  const lookup = useServerFn(lookupRegistryStudy);

  const { data: studies } = useQuery({
    queryKey: ["studies"],
    queryFn: async () => (await supabase.from("studies").select("*").order("created_at")).data ?? [],
  });

  const importRegistry = useMutation({
    mutationFn: async () => lookup({ data: { nctId } }),
    onSuccess: (record) => {
      setImported(record);
      setForm({
        code: record.nctId,
        title: record.title,
        sponsor: record.sponsor ?? "",
        phase: (record.phase ?? "NA").replace("PHASE", "") || "NA",
        target: record.enrollment ?? 50,
      });
      setOpen(true);
      toast.success(`${record.nctId} loaded from ClinicalTrials.gov`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      // The profile table is readable org-wide, so this must be scoped to the
      // signed-in user — an unscoped single-row read matches several rows and
      // previously surfaced as "no organisation linked to this account".
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your session has expired — please sign in again");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error("No organisation linked to this account");
      const { error } = await supabase.from("studies").insert({
        org_id: profile.org_id,
        code: form.code,
        title: form.title,
        sponsor: form.sponsor,
        phase: form.phase,
        target_enrollment: Number(form.target),
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Study created");
      setOpen(false);
      setForm({ code: "", title: "", sponsor: "", phase: "II", target: 50 });
      qc.invalidateQueries({ queryKey: ["studies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Studies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each study owns its protocol version, eligibility criteria and research sites.
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {open ? "Cancel" : "New study"}
        </button>
      </header>

      <section className="surface p-5">
        <h2 className="text-sm font-semibold">Start from a public registry record</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ClinicalTrials.gov (U.S. National Library of Medicine) is the connected registry. Enter a
          registration ID and the real record is fetched and used to prefill the form below — you
          can still edit every field before creating the study.
        </p>
        <form
          className="mt-3 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            importRegistry.mutate();
          }}
        >
          <label className="sr-only" htmlFor="nctId">
            Registry ID
          </label>
          <input
            id="nctId"
            value={nctId}
            onChange={(e) => setNctId(e.target.value)}
            placeholder="NCT01234567"
            className="w-56 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={importRegistry.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {importRegistry.isPending ? "Fetching…" : "Load from registry"}
          </button>
        </form>
        {imported && (
          <p className="mt-3 text-xs text-muted-foreground">
            Loaded {imported.nctId} · status {imported.status} ·{" "}
            {imported.conditions.slice(0, 3).join(", ") || "no listed condition"} ·{" "}
            <a className="underline" href={imported.url} target="_blank" rel="noreferrer">
              view the source record
            </a>{" "}
            (retrieved {new Date(imported.accessedAt).toISOString()}).
          </p>
        )}
      </section>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="surface grid gap-4 p-5 sm:grid-cols-2"
        >
          {(
            [
              ["code", "Study code", "text"],
              ["title", "Title", "text"],
              ["sponsor", "Sponsor", "text"],
              ["phase", "Phase", "text"],
              ["target", "Target enrolment", "number"],
            ] as const
          ).map(([key, label, type]) => (
            <div key={key}>
              <label className="text-sm font-medium" htmlFor={key}>
                {label}
              </label>
              <input
                id={key}
                type={type}
                required={key === "code" || key === "title"}
                value={String(form[key])}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Create study
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(studies ?? []).map((s) => (
          <Link
            key={s.id}
            to="/studies/$studyId"
            params={{ studyId: s.id }}
            className="surface block p-5 transition-colors hover:bg-muted"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-sm font-semibold">{s.code}</span>
              <StatusPill value={s.status} />
            </div>
            <h2 className="mt-2 text-base font-medium leading-snug">{s.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Phase {s.phase} · {s.sponsor || "no sponsor"} · protocol {s.protocol_version} · target{" "}
              {s.target_enrollment}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
