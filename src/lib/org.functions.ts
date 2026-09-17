import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Default research organisation used by the demo workspace. The auth trigger
 * (handle_new_user) links new accounts to this organisation; this function is
 * the repair path for accounts whose profile row is missing or unlinked.
 */
const DEFAULT_ORG_ID = "11111111-1111-1111-1111-111111111111";

export type OrgMembership = {
  orgId: string;
  orgName: string;
  /** True when this call had to create or repair the profile link. */
  linked: boolean;
  /** Organisations this account can currently reach. */
  available: { id: string; name: string }[];
};

/**
 * Resolves — and if necessary creates — the organisation membership for the
 * signed-in researcher, so study creation never fails with "no organisation
 * linked to this account".
 */
export const ensureOrgMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrgMembership> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("org_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    let orgId = profile?.org_id ?? null;
    let linked = false;

    if (!orgId) {
      // Prefer an existing organisation over creating a duplicate.
      const { data: orgs } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .order("created_at")
        .limit(1);
      orgId = orgs?.[0]?.id ?? DEFAULT_ORG_ID;

      const email = (context.claims as { email?: string } | null)?.email ?? "";
      const { error: upsertError } = await supabaseAdmin
        .from("profiles")
        .upsert({ user_id: context.userId, org_id: orgId, email }, { onConflict: "user_id" });
      if (upsertError) throw new Error(upsertError.message);
      linked = true;
    }

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle();

    const { data: allOrgs } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .order("created_at");

    return {
      orgId,
      orgName: org?.name ?? "your research organisation",
      linked,
      available: allOrgs ?? [],
    };
  });
