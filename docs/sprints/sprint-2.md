# Sprint 2

Two weeks, six tickets, each self-contained. The tickets are GitHub issues
#15 through #20; this file is the shared context.

## We are building a volunteer management system

Sprint 1 spiked a tutoring platform and asked Route A or Route B: integrate with
the curriculum Pink STEM keeps in Google Sites, Classroom and Docs, or pull it
into our own database and render graded modules ourselves. **We are doing
neither.** Both depended on a content decision the nonprofit could not make on
our timeline. Volunteer staffing was a defined need with no open questions, so
that is what we built: the Pink STEM Volunteer Hub. Organizers staff events,
volunteers claim shifts, and verified service hours become a certificate a
school or employer can check. This is settled. If the curriculum question comes
back, it comes back as its own project.

`content-model.md`, `gamification.md`, `google-classroom.md` and
`integrations.md` are shelved; do not build against them. `auth.md` is worth
reading for the threat model, but its Firebase recommendation was written for a
tutoring product and does not carry over.

**Auth is ours, email and password only.** No Firebase, no Clerk, no Google
sign-in. Roles, `sessionVersion` revocation and the audit trail already live in
MongoDB and `withAuth`; a vendor would mean rebuilding all three to gain a
button nobody configured. #15 deletes the half-finished Google flow, and
#15 and #20 do password auth properly.

## Where the code is

The Hub shipped in PRs #12 and #13. `main` has accounts and three roles,
clearance gating, events with shifts, sign-up with a waitlist, roster check-off
and hour approval, event updates, event-scoped messaging, certificates with
public verification, transactional email, the admin console, and the audit
trail.

The line between roles is participate vs. administer. A volunteer participates.
An organizer participates and runs their own events. An admin administers
everything and participates in nothing. The code does not enforce that last part
yet; #16 does.

## What this sprint is

Hardening, not features. The product works on one laptop with one person
clicking through it. It has not been hardened for a second server, a flaky
email provider, a brute-force attempt, or an admin hunting one pending clearance
across six tabs. Those are the six tickets.

- **Netlify runs every route handler as a serverless function.** Nothing held in
  module memory survives across instances or a recycle. Two tickets exist
  because we wrote code that assumed otherwise.
- **Everyone works locally.** There is no hosted database, so a deploy preview
  builds but every screen that reads data fails. That is expected. Run
  `docker compose up -d`, then `npm run seed -- demo`, and verify against that.
- **There are no tests.** CI is `format:check`, `lint`, `typecheck` and
  `build`. Review and your own manual checking are the whole safety net.

**Definition of done for every ticket:** PR against `main`, CI green, one
reviewer approval, and a PR description listing the steps you ran locally so the
reviewer can repeat them, including anything you could not verify by hand. If
your change affects setup, update `.env.local.example` and the README in the
same PR. Anything real but out of scope becomes its own issue rather than
growing the diff.

## Where each ticket lands

| Ticket                         | Lands in                                                       |
| ------------------------------ | -------------------------------------------------------------- |
| #15 Password change, no Google | `src/services/auth.ts`, `src/lib/session.ts`                   |
| #16 Admin console surface      | `src/app/admin/`, `admin.ts`, `SiteHeader.tsx`                 |
| #17 Shared rate limit and lock | `src/lib/rateLimit.ts`, `src/db/`, `jobs.ts`                   |
| #18 Email delivery             | `src/services/notification.ts`, `mail.ts`, `jobs.ts`           |
| #19 Sign-up capacity           | `src/services/signup.ts`, `src/db/actions/shift.ts`, `jobs.ts` |
| #20 Registration and login     | `src/services/auth.ts`, `src/utils/`                           |

No ticket depends on another landing first; take them in any order. #15 and
#20 share `auth.ts`, and #17, #18 and #19 share `JobService.runAll`, so whoever
merges second rebases. Each ticket says how to handle that overlap.

## Not this sprint

Agreed out of scope. Open an issue for each so it is not rediscovered next
sprint.

- **Step-up auth on irreversible admin actions.** Revoking a certificate,
  adjusting posted hours, deactivating an account and opening a minor's thread
  all run off a 30-day cookie with no re-authentication.
- **`AdminService.listPeople` with `clearance=none`** loads every cleared user
  id into memory for a `$nin`.
- **CSRF tokens on state-changing routes.** The session cookie is already
  `sameSite: "lax"`, so this is defence in depth, and it touches every mutating
  route.
- **Hosted staging and production databases.** First thing after this sprint.
  Two databases, so staging can never write production data;
  `docs/ENVIRONMENTS.md` has the variables. #17 cannot be confirmed on
  Netlify until then.
- **Automated tests and a QA pass.** Needs a sprint of its own. This is the
  biggest known risk we carry into sprint 3.
