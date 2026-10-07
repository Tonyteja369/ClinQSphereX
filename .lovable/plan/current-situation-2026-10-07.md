Your inspection is correct. Before making ANY code or database changes, I want you to design the safest migration architecture.

The application is already live in production, so data preservation and rollback are more important than speed.

### Current situation

- Current authentication: Lovable Cloud Auth
- Current users: 19
- Google users: 16
- Email/password users: 3
- Existing application user UUIDs must remain the permanent application identity.
- Existing profiles, organisations, roles, studies, candidates, consents, documents, tasks, optimization runs and audit records must remain unchanged.
- Every current user is a coordinator.
- Existing database authorization currently depends on the existing auth user's UUID and organisation.
- Firebase will generate a different UID.

### Target

Move authentication to:

Firebase Authentication  
→ Google Sign-In

while preserving the existing application identity and all existing data.

### IMPORTANT

DO NOT implement the migration yet.

DO NOT modify the production database.

DO NOT delete or disable Lovable Authentication.

DO NOT modify existing database security rules yet.

DO NOT rewrite the 15+ application pages yet.

Instead, produce a detailed technical migration architecture.

### I want the architecture to contain:

#### 1. Identity mapping

Design a mapping such as:

existing_user_uuid  
firebase_uid  
email  
organisation_id  
role  
migration_status

Explain exactly where this mapping should live and why.

The existing UUID must remain the permanent application user ID.

Firebase UID should only be the authentication identity.

#### 2. Authentication flow

Design the exact flow:

Google  
→ Firebase Authentication  
→ Firebase ID Token  
→ backend verification  
→ Firebase UID lookup  
→ existing user UUID  
→ existing organisation  
→ existing role  
→ authorized database operation

Explain every step.

#### 3. Backend/data-access architecture

Do NOT create 15 unrelated custom implementations.

Design a centralized authentication middleware and data-access/service layer that can be reused by all existing pages.

For example:

Frontend  
→ authenticated API client  
→ backend authentication middleware  
→ user mapping  
→ authorization  
→ existing database queries

Identify which existing direct database calls need to be replaced.

#### 4. Existing database protection

Explain exactly how the current database authorization works and what must change when Firebase replaces the existing authentication provider.

Do not weaken security simply to make Firebase work.

Do not recommend making the database publicly readable/writable.

#### 5. Existing user migration

For the 16 Google users:

Explain how the existing user UUID will be associated with the Firebase UID using the verified Google email.

Do NOT create duplicate profiles.

Do NOT create duplicate organisations.

Do NOT create duplicate user roles.

For the 3 email/password users:

Explain the safest migration strategy since their passwords cannot be exported.

#### 6. First-login linking

Design the first-login process:

Firebase Google login  
→ verified email  
→ find existing application user  
→ associate Firebase UID  
→ preserve existing UUID  
→ preserve profile  
→ preserve organisation  
→ preserve role  
→ allow normal application access

Also explain what happens if:

- email does not exist
- email exists but is unverified
- Firebase UID is already linked
- two accounts have the same email
- user attempts unauthorized access

#### 7. New users

Define what should happen when a completely new Google account signs in.

Should a new profile be created?

How is the default organisation selected?

How is the coordinator role assigned?

Make sure this follows the existing application's intended access model.

#### 8. Rollback strategy

Design a rollback plan.

If Firebase authentication fails after deployment, I need to be able to restore the previous authentication flow without losing data.

#### 9. Testing plan

Create a test matrix covering:

- existing Google user
- new Google user
- existing email/password user
- unknown Google email
- logout
- refresh
- session expiration
- protected routes
- organisation isolation
- role authorization
- database reads
- database writes
- audit logging
- document access
- studies
- candidates
- consents
- tasks
- optimization runs

#### 10. Production migration sequence

Give me the exact sequence:

Phase 1  
Phase 2  
Phase 3  
Phase 4  
etc.

Each phase must explain:

- what changes
- what remains untouched
- how it is tested
- what would cause us to stop
- rollback procedure

### Final requirement

At the end, give me:

A. Recommended architecture

B. Database changes required

C. Backend changes required

D. Frontend changes required

E. Firebase configuration required

F. Migration risks

G. Rollback plan

H. Estimated complexity

Again: DO NOT MODIFY THE APPLICATION YET.

I only want the architecture and migration plan first.