# Sprint 2

Two weeks, 6 devs, 6 tickets. Everyone is solo this time.
The ticket bodies are in `tickets.md`. This file is the shared context.

## We are building a volunteer management system

Sprint 1 was five research spikes on a tutoring platform. The question they were
meant to answer was Route A or Route B: integrate with the curriculum Pink STEM
already keeps in Google Sites, Classroom and Docs, or pull that content into our
own database and render gamified, graded modules ourselves. Aviation was going to
be the first course.

**We are doing neither.** The direction is a volunteer management system: the
Pink STEM Volunteer Hub. Organizers staff events, volunteers claim shifts, and
verified service hours become a certificate a school or employer can check.

Both curriculum routes depended on a content decision the nonprofit had not made
and could not make on our timeline. Volunteer staffing was a defined need with no
open questions in front of it, so that is what we built. This is settled. If the
curriculum question comes back it comes back as its own project, not as a pivot
mid-sprint.

**What that means for the sprint 1 spikes.** `content-model.md`,
`gamification.md`, `google-classroom.md` and `integrations.md` are shelved. Do
not build against them. `auth.md` is worth reading for the threat model, but its
Firebase recommendation does not carry over: it was written for a tutoring
product with student, parent and educator accounts, and we have volunteers,
organizers and admins.

**Auth is ours, email and password only.** No Firebase, no Clerk, no Google
sign-in. The app already has roles in MongoDB, session revocation through
`sessionVersion`, and an audit trail wired through `withAuth`, and handing
identity to a vendor would mean rebuilding all three to gain a sign-in button
nobody has configured. The half-finished Google flow gets deleted in ticket 1.
What we own instead is doing password auth properly, which is tickets 1 and 6.

## Where the code is

The Volunteer Hub shipped in PRs #12 and #13. What is in `main` today: accounts
and three roles, clearance gating, events with shifts, sign-up with a waitlist,
roster check-off and hour approval, event updates, event-scoped messaging,
certificates with public verification, transactional email, the admin console,
and the audit trail.

Three roles, and the line between them is participate vs. administer. A volunteer
participates. An organizer participates and runs their own events. An admin
administers everything and participates in nothing. That last part is not true in
the code yet, which is ticket 2.

## What this sprint is

Not features. The product works on a laptop with one person clicking through it.
It has not been hardened for a second server, a flaky email provider, a
brute-force attempt, or an admin who has to find one pending clearance among six
tabs. Those are the six tickets.

Three things to know before you pick yours up:

The app deploys to Netlify, where every route handler is a serverless function.
There is no single long-lived process, so anything held in module memory is
per-instance and disappears when the instance is recycled. Two tickets exist
because we wrote code that assumed otherwise.

**Everyone works locally this sprint.** There is no hosted database yet, so
staging and deploy previews have nothing to connect to. Run your own MongoDB
(`docker compose up -d`), seed it (`npm run seed -- demo`), and verify your ticket
against that. Standing up staging and production is the first thing that happens
after this sprint, and until it does, a deploy preview will build but every screen
that reads data will fail. That is expected, not a bug in your branch.

There are no tests. Not one. CI runs `format:check`, `lint`, `typecheck` and
`build`, and that is the entire safety net. Nothing in this sprint changes that,
so review and your own manual checking are the only things standing between a
regression and production. Say in every PR how you verified the change, and if
you cannot verify part of it by hand, say that too.

**Definition of done for every ticket:** PR open against `main`, CI green, one
reviewer approval, and the PR description listing the steps you ran locally to
verify it, so the reviewer can repeat them. No deploy preview check this sprint;
there is nothing behind it. If your change affects setup, update
`.env.local.example` and the README in the same PR. Anything you find that is real
but out of scope becomes its own issue rather than growing the diff.

## Lane assignments

| Ticket                        | Dev   | Lands in                                            |
| ----------------------------- | ----- | --------------------------------------------------- |
| 1. Sessions, and drop Google  | Dev 1 | `src/services/auth.ts`, `src/lib/session.ts`        |
| 2. Admin console surface      | Dev 2 | `src/app/admin/`, `admin.ts`, `SiteHeader.tsx`      |
| 3. Shared rate limit and lock | Dev 3 | `src/lib/rateLimit.ts`, `src/db/`                   |
| 4. Email delivery             | Dev 4 | `src/services/notification.ts`, `mail.ts`           |
| 5. Sign-up capacity           | Dev 5 | `src/services/signup.ts`, `src/db/actions/shift.ts` |
| 6. Registration and login     | Dev 6 | `src/services/auth.ts`, `src/utils/`                |

**Tickets 1 and 6 are both in `src/services/auth.ts`.** Dev 1 lands the Google
deletion early in week one, Dev 6 starts after it merges. Agree that on day one
and neither of you spends the sprint rebasing.

## Not this sprint

Real, agreed, and deliberately out of scope. Open an issue for each so they are
not rediscovered from scratch next sprint.

- **Step-up auth on irreversible admin actions.** Revoking a certificate,
  adjusting posted hours, deactivating an account and opening a minor's message
  thread all run off a 30-day cookie with no re-authentication, so a borrowed
  laptop with a live session can do every one of them. Too large to land next to
  ticket 1.
- **`AdminService.listPeople` with `clearance=none`** pulls every user id that has
  a clearance into memory and passes it as `$nin`.
- **Hosted staging and production databases.** Deferred so the team can work
  locally through this sprint, and the first thing to pick up after it. Two
  databases, not one, so a staging deploy can never write to production data;
  `docs/ENVIRONMENTS.md` has the variable list. Nothing ships to a real user until
  this is done, and ticket 3 cannot be confirmed on Netlify until it is.
- **No automated tests, and no QA pass either.** The absence of a suite is what
  made most of this sprint necessary, and we are shipping six more changes
  without one. It needs a sprint of its own, not a ticket bolted onto a feature.
  This is the biggest known risk we are carrying into sprint 3.
