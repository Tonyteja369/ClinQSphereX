# Migrate sign-in to Firebase Authentication (Google) — safely

## What exists today (inspected, nothing changed)

1. **Current sign-in provider**: Lovable Cloud auth — email/password plus Google (Lovable-managed Google button).
2. **Where users live**: the backend's built-in user store — 19 accounts (16 signed in with Google, 3 with email/password).
3. **User-related tables**: `profiles` (19 rows, one per account, each linked to an organisation), `user_roles` (19 rows — every user is `coordinator`; no admins), plus `created_by` / `reviewed_by` / `recorded_by` / `uploaded_by` / `assignee` / `actor_id` columns on studies, candidates, consents, documents, tasks, optimization runs and the audit log.
4. **How IDs are made**: the auth system issues a random UUID per account; a signup trigger copies it into `profiles.user_id` and assigns the default organisation + `coordinator` role.
5. **How data connects to users**: every table is protected by database rules that read the signed-in user's UUID (`auth.uid()`) → `current_org_id()` → organisation. All study/candidate/consent data is scoped by organisation, not by individual user.
6. **Can users be migrated?** Yes. Firebase gives each user a new UID, so the plan **keeps the existing UUID as the permanent app identity** and stores the Firebase UID alongside it. Linking happens on first Firebase login by **verified Google email** match. No data is copied or rewritten.
7. **Passwords**: the 3 email/password users cannot be moved as passwords (they are hashed and not exportable here). Because the new system is Google-only, they sign in with Google using the same email; if their email is not a Google account, an administrator links them manually.
8. **Limitations (important)**:
   - Every database protection rule depends on the current auth system's token. Firebase tokens are not accepted by the database directly, so **all reads/writes must go through server functions** that verify the Firebase token and then act on behalf of the mapped user. This is the largest part of the work (roughly 15 pages read/write the database straight from the browser today).
   - Verifying Firebase tokens on the server needs only the public Firebase project ID (Google's public signing keys) — **no service-account secret is required**.
   - Firebase Google sign-in inside the Lovable editor preview may be blocked by pop-up/iframe limits; testing should happen on the published site.
9. **Files to change**: `src/routes/auth.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/_authenticated/route.tsx`, `src/routes/_protected/route.tsx`, `src/components/AppShell.tsx` (sign out), `src/start.ts` (attach Firebase token), every `*.functions.ts` using the current auth middleware, every page that queries the database from the browser, plus new `src/lib/firebase.ts`, `src/lib/firebase-auth.server.ts`, `src/hooks/useAuth.ts`, and one additive database change.

## Plan

**Phase 0 — You provide (blocked until then)**
- A Firebase project with Google provider enabled.
- The six `VITE_FIREBASE_*` values (all public by design).
- Authorised domains in Firebase: `clinqspherex.tech`, `www.clinqspherex.tech`, `clinqspherex.lovable.app`.

**Phase 1 — Additive database change (no deletions)**
- Add `profiles.firebase_uid` (unique, nullable) and `profiles.photo_url`.
- Backup snapshot of `profiles` and `user_roles` into an archive table before anything else.

**Phase 2 — Firebase on the client**
- Firebase app init from env vars, local session persistence, `onAuthStateChanged` listener, `useAuth` hook.
- Sign-in page: same design; the Google button uses Firebase. Email/password fields hidden behind a "legacy sign-in" link during transition (not removed).
- Sign out: Firebase `signOut()`, clear cached data, go to `/auth`.

**Phase 3 — Server verification and account linking**
- Middleware verifies the Firebase ID token (signature, issuer, audience, expiry, `email_verified`).
- Linking: existing profile with `firebase_uid` → use it; else verified email matches one profile → attach UID; else create a new profile with default organisation and `coordinator` role (never admin). Roles always read from `user_roles` on the server, never from the browser.

**Phase 4 — Move database access behind server functions**
- Replace browser database calls page by page with server functions that enforce the same organisation scoping the current rules enforce.

**Phase 5 — Verify, then cut over**
- Test all 12 scenarios you listed; confirm row counts for every table match before and after.
- Old auth stays enabled and untouched until you confirm; retiring it is a separate, later step.

## Technical details
- Token check uses `jose` with Google's JWKS (`securetoken@system.gserviceaccount.com`), audience = project ID — works on the edge runtime.
- Server functions use the privileged backend client only after token verification, filtering by the mapped user's `org_id`.
- Existing database rules remain as a second safety layer.
