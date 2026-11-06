# Sprint 5

A bug sprint. The first tickets came from what Yuhan found while getting the
usability test session ready, plus two older tickets that never got a PR. The
rest came from the PM's questions and a QA pass on November 5. The tickets are
GitHub issues #18, #39, #54, #55 and #61 through #67, with #58 to #60 next up,
and this file is the shared context, so read it before starting yours.

## What Yuhan found

Yuhan went through staging as an admin and as a new volunteer to prepare the
usability test session. The session was canceled, but these came out of it:

- **The event form doesn't say location is required.** Nothing in the Location
  card has an asterisk, so you only find out when the save fails. That's #54.
- **A hidden join link still blocks the save.** Check "Virtual event", type a
  join link that isn't a URL, switch back to in person and fill in the address.
  The save still fails on the join link. Also #54.
- **Inviting an organizer gives no feedback.** The success and error messages
  are toasts, and toasts show up behind any open dialog. Yuhan never saw
  "Invitation sent", or the error when an address like `a@b` got past the
  browser's check. That's #55.
- **The logo takes admins to the home page.** That's #39.
- **Verification and invite emails never arrived.** That's expected on staging.
  See below.

## What the PM asked

- **"I don't see forgot password or change password."** Both exist. "Forgot your
  password?" is under the password field when you sign in, and Profile has a
  Password card. On staging the reset email goes to the function log like every
  other email. No ticket.
- **A pending volunteer could read a roster-only update.** Roster-only updates
  reach anyone with a live sign-up, and the emails leak them too. That's #61.
- **"What does 'Flagged or not' mean?"** It's the no-show flag, and nothing on
  People says so. That's #62.
- **Drop the home page and land on Event shifts.** That's #39.

## What QA found

We ran the app locally as each role and reproduced every bug before filing it.
Each ticket says how to see the problem. The worst ones are in this sprint:
shifts left behind when an event's date changes (#63), sign-ups that aren't
re-checked when an event starts requiring clearance (#64), duplicate
certificates after an hours correction (#65), virtual join links reaching
volunteers who aren't cleared (#66), and the login redirect and invite holes
(#67).

## Emails at launch

The PM listed all 28 emails with a priority. Every one is built. We checked
each P0 locally and each reached the right person. We're keeping the P1 and P2
emails too, because each tells someone something they need, and the frequent
ones (reminders, notes, messages and the organizer digest) can be turned off in
Profile. A few need fixes first: who gets important changes (#61), the join link
(#66), and reminder wording, how often notes go out and the admin's clearance
email (#60). Nothing is sent for real until production has a sending domain and
#18 lands.

## Staging doesn't send email

This is on purpose (see Email in `docs/ENVIRONMENTS.md`). Staging writes every
email to the Netlify function log instead of sending it, so the verification
link Yuhan asked for and the invite Yuhan sent both ended up there. There's no
ticket for it. Sending real email needs a domain verified with Resend, and we
don't have one yet.

Until then, testers should use the seeded demo accounts, which are already
verified. When a test needs a link from an email, like an invite, search the
function log for `[mail]`.

## The carryovers

- **#39** was a sprint 4 ticket that never got a PR. The ticket hasn't changed,
  and #43, the polish pass, is still waiting on it, so it should land early.
- **#18** has been open since sprint 2. When a send fails, that email is lost
  for good, and the job runner counts it as sent. Staging never calls Resend, so
  nothing shows it today, but production will, so it has to land before launch.
  The ticket is updated for the jobs added since sprint 2.

Sai stays on #43 from sprint 4.

## Things to know before you start

- **Sprint 4 has landed.** #49 through #53 are merged, so branch from an up to
  date `main`. #54 changes the event form #53 just cut down, and #39 changes the
  footer #50 relabeled.
- **Signing up asks for the waiver now.** Since #51, the first sign-up for each
  event asks you to confirm Pink STEM's waiver. Tick it when you follow the test
  steps in #18.
- **#55 fixes every dialog, not just the invite.** Errors in the shift editor,
  for example, are hidden the same way.
- **Anish's three tickets share `src/services/event.ts`.** Land #54, then #63,
  then #64. #61 touches `get` in the same file, so Brody rebases on whichever
  lands first.
- **#66 and #18 both change `src/services/notification.ts`.** Vania has both.

**Definition of done** is the same as sprint 4: a PR against `main`, CI green,
one approval, and a PR description with what you ran and a preview link. Add
before and after screenshots for UI changes. #18 has no UI, so paste the
`jobs/run` output instead. If you find something real that's out of scope, open
an issue instead of adding it to your PR.

## Tickets

| Ticket                                                             | Owner   | Size   | Lands in                                                                     |
| ------------------------------------------------------------------ | ------- | ------ | ---------------------------------------------------------------------------- |
| #18 Stop dropping emails                                           | Vania   | Large  | `notification.ts`, `mail.ts`, `jobs.ts`, `src/db/actions/notificationLog.ts` |
| #39 Remove the home page and land on Event shifts                  | Brody   | Light  | `src/proxy.ts`, `src/app/page.tsx`, `SiteFooter.tsx`                         |
| #54 Fix location checks on the event form                          | Anish   | Light  | `EventForm.tsx`, `src/services/event.ts`, `src/utils/validation/event.ts`    |
| #55 Show toasts above dialogs and check invite emails              | Spencer | Medium | `Toast.tsx`, `Dialog.tsx`, `InviteDialog.tsx`                                |
| #61 Keep roster-only updates to confirmed volunteers               | Brody   | Medium | `src/services/event.ts`, `src/services/eventUpdate.ts`, organizer event page |
| #62 Fix the flag label, name search and audit trail on People      | Brody   | Light  | `src/app/admin/people/`, `src/db/actions/user.ts`, `auditLog.ts`             |
| #63 Move shifts with the event when its date changes               | Anish   | Medium | `src/services/event.ts`, `src/lib/dates.ts`                                  |
| #64 Re-check sign-ups when an event's requirements change          | Anish   | Medium | `src/services/event.ts`, `src/services/signup.ts`                            |
| #65 Fix certificates and negative totals when correcting hours     | Spencer | Medium | `attendance.ts`, `certificate.ts`, `hours.ts`                                |
| #66 Keep virtual join links private until a volunteer is confirmed | Vania   | Medium | `notification.ts`, `src/services/event.ts`, `signup.ts`, `EventMeta.tsx`     |
| #67 Fix the login redirect, old invites and staff profiles         | Spencer | Light  | `src/app/login/`, `src/services/auth.ts`, `ProfileForm.tsx`                  |

Everyone has three tickets except Vania, whose #18 is the biggest one.

## Next up

These are filed and ready but not in this sprint. Take one if you finish early.

- **#58** Stop double cancels and fix Promote on full shifts
- **#59** Fix the past-event label, last-shift delete and reassign refresh
- **#60** Fix email timing and wording, and closed threads. Start after #18,
  since both change `jobs.ts`.

## Not this sprint

- **#45, the notification center.** It's a new feature, not a fix, and Molly and
  Hannah still need to decide whether a bell replaces the messages icon from
  #41.
- **Real email on staging.** It needs a verified sending domain first.
- **A button to cancel an invite.** A typo in an otherwise valid address can't
  be caught. The invite just expires after seven days.
