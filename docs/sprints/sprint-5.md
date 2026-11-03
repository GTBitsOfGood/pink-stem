# Sprint 5

Four fixes, one per dev. Two come from what Yuhan found while getting the
usability test session ready, and two are older tickets that never got a PR.
The tickets are GitHub issues #18, #39, #54 and #55, and this file is the shared
context, so read it before starting yours.

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

- **Sprint 4 PRs land first.** #49 through #53 are still open, and three of them
  overlap with this sprint:
  - #53 cuts the long-term fields out of the event form, which #54 also changes.
    Anish has both, so #54 builds on #53.
  - #50 relabels the footer links, and #39 changes the verify link in the same
    footer. Brody has both.
  - #51 changes how sign-up handles the waiver. The test steps in #18 work
    before and after it.
- **#55 fixes every dialog, not just the invite.** Errors in the shift editor,
  for example, are hidden the same way.

**Definition of done** is the same as sprint 4: a PR against `main`, CI green,
one approval, and a PR description with what you ran and a preview link. Add
before and after screenshots for UI changes. #18 has no UI, so paste the
`jobs/run` output instead. If you find something real that's out of scope, open
an issue instead of adding it to your PR.

## Tickets

| Ticket                                                | Owner   | Size   | Lands in                                                                     |
| ----------------------------------------------------- | ------- | ------ | ---------------------------------------------------------------------------- |
| #18 Stop dropping emails                              | Vania   | Large  | `notification.ts`, `mail.ts`, `jobs.ts`, `src/db/actions/notificationLog.ts` |
| #39 Remove the home page and land on Event shifts     | Brody   | Light  | `src/proxy.ts`, `src/app/page.tsx`, `SiteFooter.tsx`                         |
| #54 Fix location checks on the event form             | Anish   | Light  | `EventForm.tsx`, `src/services/event.ts`, `src/utils/validation/event.ts`    |
| #55 Show toasts above dialogs and check invite emails | Spencer | Medium | `Toast.tsx`, `Dialog.tsx`, `InviteDialog.tsx`                                |

## Not this sprint

- **#45, the notification center.** It's a new feature, not a fix, and Molly and
  Hannah still need to decide whether a bell replaces the messages icon from
  #41, which hasn't merged.
- **Real email on staging.** It needs a verified sending domain first.
- **Cancelling invites.** A typo in an otherwise valid address can't be caught.
  The invite just expires after seven days.
