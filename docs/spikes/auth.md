# Authentication and role-based access spike

## Recommendation at a glance

- **Use:** Firebase Authentication for identity and sessions.
- **Keep in MongoDB:** profiles, roles, schools, guardian links, consent,
  enrollment, progress, awards, submissions, and grades.
- **Parent/child model:** two separate accounts connected by a verified guardian
  relationship.
- **Educator/admin sign-in:** Google, with privileged roles granted only by
  invitation or approval.
- **Parent sign-in:** Google or managed email/password.
- **Student sign-in:** school-managed Google account when available.
- **Under-13 rule:** keep the student `PENDING_CONSENT` until school
  authorization or verifiable parental consent is recorded.
- **Main tradeoff:** Firebase reduces password and session security work but adds
  medium vendor lock-in through the Firebase UID.
- **Estimated auth cost at 2,000 users:** $0 for email and social sign-in; SMS,
  hosting, MongoDB, and support are separate.

Firebase is the best fit for both possible product routes:

- **Route A — integrate:** Google sign-in supports educators; Google Classroom
  access remains a separate authorization.
- **Route B — own content:** Firebase supplies managed email/password without
  Pink STEM building password storage, resets, token rotation, and abuse
  protection.

## Pink STEM requirements

- Serve an education program for girls underrepresented in STEM.
- Support the Aviation course now without designing around 30–50 hypothetical
  courses.
- Support Google-hosted or Pink STEM-hosted curriculum.
- Protect student progress, awards, submissions, and grades.
- Support people with multiple roles, such as an educator who is also a parent.
- Authorize by both role and relationship; a role by itself is insufficient.

| Role          | Allowed scope                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Student       | Own enrollment, lessons, submissions, progress, awards, and feedback                               |
| Parent        | Registration, consent, and information for verified linked children only                           |
| Educator      | Classes assigned to that educator and students enrolled in those classes                           |
| Administrator | Invitations, role assignment, organizations, curriculum administration, and audited support access |

## Provider comparison

Pricing reflects published plans verified on September 4, 2026. It excludes
hosting, MongoDB, email delivery, SMS, and support contracts.

| Decision factor     | Auth.js                                                                 | Clerk                                                                                             | Firebase Authentication                                                               |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Cost at 2,000 users | $0 software license; infrastructure and email cost extra                | $0 within Hobby's 50,000 monthly retained-user limit; Pro advertised at $20/month billed annually | $0 within the 50,000 Tier 1 email/social MAU allowance                                |
| Google sign-in      | Supported                                                               | Supported                                                                                         | Supported                                                                             |
| Email/password      | Pink STEM implements and secures it                                     | Managed                                                                                           | Managed                                                                               |
| Roles               | Custom JWT or database roles                                            | Organization roles and permissions                                                                | Custom claims plus MongoDB authorization                                              |
| Identity record     | Pink STEM MongoDB via adapter                                           | Clerk                                                                                             | Firebase                                                                              |
| MongoDB join        | Native record                                                           | Clerk user ID                                                                                     | Firebase UID                                                                          |
| Workspace sign-in   | Google OAuth/OIDC                                                       | Google OAuth/OIDC; enterprise SAML/OIDC is separate                                               | Google OAuth/OIDC                                                                     |
| Under-13 use        | Technically possible; Pink STEM owns all compliance and credential risk | Public policy says services are not intended for children under 16                                | Conditional on Pink STEM's consent flow, contract review, and compliant configuration |
| Lock-in             | Low                                                                     | High                                                                                              | Medium                                                                                |
| Verdict             | Too much password-security scope for Sprint 2                           | Do not use for student accounts without written child-use clearance                               | **Recommended**                                                                       |

### Auth.js details

- **Strengths**
  - Open source.
  - Official MongoDB adapter.
  - Google OAuth support.
  - Roles can live in database sessions or JWTs.
  - Pink STEM controls and can export the complete identity record.
- **Weaknesses**
  - The Credentials provider delegates password handling to Pink STEM.
  - Pink STEM would own hashing, password policy, verification, resets,
    revocation, rate limiting, recovery, and abuse protection.
  - The security work is disproportionate to one Aviation-course launch.
- **Under-13 answer**
  - Auth.js is a library rather than a hosted user service, so it does not impose
    a separate hosted-account age restriction.
  - Pink STEM remains fully responsible for COPPA, FERPA-related controls,
    consent, security, retention, and any connected identity-provider rules.
- **Verdict:** reconsider only if self-hosted identity becomes a firm requirement
  and the team budgets for credential security.

### Clerk details

- **Strengths**
  - Managed Google and password authentication.
  - Prebuilt Next.js user interfaces.
  - Built-in roles and permissions through Clerk Organizations.
  - Hobby supports up to 50,000 monthly retained users.
- **Weaknesses**
  - Clerk owns the identity record; MongoDB requires an external-ID join and
    synchronization.
  - Hobby limits each organization to 20 members, which is too small if a school
    is represented as one organization.
  - Pro is advertised at $20/month billed annually; additional B2B controls and
    enterprise connections can add cost.
- **Under-13 answer**
  - Clerk's public privacy policy states that its services are not intended for
    children under 16.
  - Treat direct student use as disallowed unless Clerk provides written terms
    covering Pink STEM's intended K–12 use.
- **Verdict:** polished, but the child-use restriction makes it a poor fit.

### Firebase Authentication details

- **Strengths**
  - Managed Google and email/password authentication.
  - Server-side token verification, session cookies, revocation, and account
    disabling.
  - Email/social authentication is free for the first 50,000 monthly active
    users.
  - Custom claims can carry small, slow-changing access hints.
  - Fits Pink STEM's Google-heavy Route A without requiring Route A.
- **Weaknesses**
  - Firebase owns the authentication record.
  - MongoDB must join each profile through a unique Firebase UID.
  - Migration requires exporting or recreating Firebase identities.
  - Custom claims are limited to 1,000 bytes and can be stale until token
    refresh.
- **Under-13 answer**
  - Firebase does not make Pink STEM COPPA- or FERPA-compliant automatically.
  - Pink STEM must provide notice, obtain the applicable consent, minimize data,
    enforce retention, and review the Firebase terms and data-processing
    agreement before launch.
  - No under-13 account becomes active until consent or valid school authority
    is recorded in MongoDB.
- **Verdict:** best balance of managed security, cost, Google support, and
  implementation effort.

## Google Workspace and Classroom

- **Google sign-in and Classroom access are separate grants.**
- Initial sign-in requests only identity scopes: `openid`, `email`, and
  `profile`.
- Classroom scopes are requested later, only if Route A is selected and an
  educator connects Classroom.
- Classroom refresh tokens are encrypted and stored separately from general
  user profiles.
- A Google account never automatically receives `EDUCATOR` or `ADMIN`.
- Privileged roles require a Pink STEM invitation or administrator approval.
- Identify the Google user by the stable provider subject/UID, not an email
  address that can change.
- For domain restrictions, validate Google's signed hosted-domain claim; do not
  trust the email suffix alone.
- A hosted domain proves organization membership, not access to a class.
- Workspace administrators can mark third-party apps trusted, limited, or
  blocked.
- Workspace for Education blocks under-18 users from unconfigured third-party
  apps, so a school administrator may need to approve Pink STEM first.

## Identity, authorization, and database protection

Firebase answers **who signed in**. MongoDB answers **what that user may do**.

### Request path

1. Firebase authenticates the user.
2. Pink STEM exchanges the fresh Firebase ID token for a secure server session.
3. A server-side `withAuth` wrapper verifies the session and revocation state.
4. The server reads the Firebase UID from verified claims, never from request
   data.
5. MongoDB loads the matching active Pink STEM profile.
6. The service checks role plus guardian, class, school, or enrollment
   relationship.
7. The data-access layer performs the filtered read or write.

### Required protections

- Never expose the MongoDB connection string or Firebase Admin credential to the
  browser.
- Allow MongoDB connections only from the deployed server environment.
- Give the app a least-privilege MongoDB user limited to the Pink STEM database.
- Use `HttpOnly`, `Secure`, and `SameSite` session cookies over HTTPS.
- Apply CSRF protection to session creation and state-changing requests.
- Verify session revocation for protected requests.
- Keep current roles and relationships authoritative in MongoDB.
- Use Firebase custom claims only as coarse access hints.
- Validate request bodies and identifiers before building MongoDB queries.
- Never accept client-provided MongoDB filters, update operators, user IDs, or
  roles as authorization evidence.
- Filter list queries by the user's permitted student, class, or school IDs.
- Return only fields needed by the current screen.
- Audit privileged reads, role changes, consent changes, and grade writes.

### MongoDB records

| Record                | Required data                                                                               | Key constraint               |
| --------------------- | ------------------------------------------------------------------------------------------- | ---------------------------- |
| User profile          | Firebase UID, roles, status, display name, age band, optional email, school IDs, timestamps | Unique Firebase UID          |
| Guardian relationship | Guardian user ID, student user ID, pending/verified/revoked status, timestamps              | Unique guardian/student pair |
| Consent record        | Student ID, parent or school authority, policy version, method, grant and revocation times  | Append-only history          |
| School membership     | User ID, school ID, school-level roles, invited/active/removed status                       | Unique user/school pair      |

- Do not copy password hashes, full Firebase user objects, or general OAuth
  tokens into MongoDB.
- Store an age band instead of a full birth date unless the exact date is
  required.
- Revoking consent preserves the historical consent record and records the
  revocation.

## Parent and child accounts

**Decision: use two linked accounts.**

- Parent and student each receive a separate user profile.
- A guardian relationship links them.
- Credentials are never shared.
- One parent can link to multiple children.
- One child can link to multiple guardians.
- Parent access can be revoked without deleting the student's school record.
- Student progress remains attached to one durable identity.
- Audit logs identify whether the student, parent, educator, or administrator
  performed an action.
- The student can later transition to independent access without moving course
  history.

### Registration sequence

1. A parent signs in and creates the minimum child profile, or a school sends an
   approved roster/invitation.
2. Pink STEM stores an age band and sets an under-13 profile to
   `PENDING_CONSENT`.
3. Pink STEM verifies the parent or records the school's valid authority.
4. Pink STEM records the consent version, method, authority, and timestamp.
5. The student becomes `ACTIVE`.
6. The student uses a school-managed Google identity when available.
7. Direct credentials for a child without a school identity remain disabled
   until consent and account-recovery requirements are approved.

## COPPA and FERPA

This section identifies product requirements, not legal advice.

### COPPA

- Applies to child-directed services collecting personal information from
  children under 13 and services with actual knowledge of that collection.
- Treat Pink STEM's under-13 path as in scope.
- Give parents direct notice through a clear privacy notice.
- Obtain verifiable parental consent before collecting child data unless a valid
  educational school-consent path applies.
- Let parents review and request deletion of their child's information.
- Let parents stop further collection or use.
- Collect only what is reasonably necessary for Aviation participation.
- Protect confidentiality, security, and integrity.
- Retain child information only as long as necessary, then delete it securely.
- School consent applies only in the educational context where the school may
  act for the parent; it does not authorize unrelated commercial use.

### FERPA

- FERPA applies directly to covered educational agencies and institutions.
- Pink STEM may receive FERPA-protected education records when working with a
  school.
- The school and Pink STEM need a valid disclosure basis, such as the
  school-official exception.
- Agreements must define legitimate educational interest, direct control,
  permitted use, redisclosure limits, and deletion or return of records.
- A parent sees only verified linked children.
- An educator sees only assigned classes and enrolled students.
- An `EDUCATOR` or `PARENT` role alone never grants broad student-record access.

### Data to avoid

- Exact birth date when an age band is sufficient.
- Home address, phone number, geolocation, or student photo by default.
- Demographic information not required by the Aviation course.
- Behavioral advertising identifiers.
- Education records in Firebase custom claims or analytics events.
- Google access tokens in a general user document.

## Authorization matrix

| Action                    | Student                    | Parent                     | Educator            | Administrator                       |
| ------------------------- | -------------------------- | -------------------------- | ------------------- | ----------------------------------- |
| View own profile/progress | Yes                        | Yes                        | Yes                 | Yes                                 |
| View student progress     | Own record only            | Verified linked child only | Assigned class only | Audited support/administration only |
| Submit Aviation work      | Own active enrollment only | No                         | No                  | No by default                       |
| Record a grade            | No                         | No                         | Assigned class only | Only when policy requires it        |
| Grant or revoke roles     | No                         | No                         | No                  | Yes                                 |
| Give or withdraw consent  | No                         | Own linked child only      | No                  | Record valid school authority only  |

- Client-side checks may hide controls but are not security boundaries.
- Every protected API route verifies the server session and active account.
- Every service checks both role and resource relationship.
- Unauthorized requests return `401`; authenticated users outside the allowed
  scope receive `403`.

## Sprint 2 implementation plan

1. Create separate Firebase projects and credentials for development, staging,
   and production.
2. Add Firebase client and Admin SDK configuration.
3. Exchange fresh ID tokens for secure server session cookies.
4. Add Mongoose models and unique indexes for profiles, guardian relationships,
   consent records, and school memberships.
5. Add `withAuth` above the existing error wrapper; keep relationship checks in
   services.
6. Implement invitation-based Google onboarding for educators and
   administrators; new identities receive no privileged role by default.
7. Implement parent onboarding and the pending child-profile flow.
8. Keep under-13 access disabled until the required consent is recorded.
9. Test missing, expired, revoked, suspended, and wrong-role sessions.
10. Test cross-child, cross-class, and cross-school access attempts.
11. Test sign-in with a real Workspace for Education domain and document the
    administrator approval process.
12. If Route A is selected, add Classroom authorization as a separate,
    incremental OAuth connection.

## Final recommendation

- Adopt **Firebase Authentication plus MongoDB-owned authorization**.
- Use two linked parent and child accounts.
- Keep privileged roles invitation-based.
- Separate Google sign-in from Classroom access.
- Block under-13 activation until consent or valid school authority is recorded.
- Keep all learning records and current permissions out of Firebase.
- Reconsider Auth.js only if self-hosted identity becomes mandatory.
- Reconsider Clerk only with written approval for the intended child users.
