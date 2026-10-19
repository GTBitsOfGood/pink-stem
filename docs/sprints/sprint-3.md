# Sprint 3

Three weeks, six devs, five tickets. Sai is setting up staging. The screening
pre-check and absence reporting are pairs, and everyone else is solo. The
tickets are GitHub issues #28 through #32, and this file is the shared context.

## What we heard from Pink STEM

We demoed the Hub to Dr. Head on September 28. Her feedback shapes this whole
sprint:

- **Pink STEM runs two kinds of volunteering.** Short-term means one-off events
  like an expo or a Saturday workshop. Long-term means volunteers who show up
  every week, like the Tuesday and Thursday robotics and mechatronics classes
  at Sacred Heart. Long-term volunteers must be 18 or older, pass a background
  check and complete sexual misconduct training. Short-term volunteers need
  none of that.
- **Volunteers choose which kind they want.** Long-term is also the path to a
  paid role: 30 hours of volunteering can lead to a paid teaching position.
- **Screening is manual today.** An admin runs a check somewhere else and types
  in the result. Fingerprinting rules out full automation, but the public
  records part of the check can be automated. Dr. Head is pricing third-party
  vendors separately.
- **Absences take up a lot of staff time.** A volunteer who is sick or has an
  exam has no way to tell anyone through the app. Pink STEM chases these by
  email and text.

The Hub treats every event as short-term, and every event defaults to
requiring clearance. Both need to change.

## What this sprint is

We're building features again, mostly for long-term volunteers. There are also
two tickets that make the team's life easier: a staging site so people can test
without running everything locally, and a way for volunteers to report
absences.

Pink STEM is still working out the long-term screening process. The PM is
bringing options to them next week, so **collect only basic information for
now**. Don't build forms or storage for screening steps nobody has defined.

## Things to know before you start

- **An event is one date.** `approveRoster` closes the whole event and turns
  it `completed`. A long-term program is many dated sessions, so #28
  decides how to model it and #29 builds on that decision.
- **Message emails already exist.** `MessageService.deliver` emails the
  recipient on every new message. It sends at most one email per thread per
  hour and the hourly job sends a digest for the rest. The "messages"
  preference controls it. Nobody has seen it land in a real inbox yet because
  no environment sends real email. #32 fixes that.
- **Sprint 2 leftovers are due Wednesday.** #15 (PR #27) and #18. Anything
  you're building that sends email relies on #18, so rebase once it lands.
- **Daylight saving ends November 1**, which falls in this sprint. Anything
  that generates weekly dates has to build them in `America/New_York` using
  `src/lib/dates.ts`. Adding seven days in UTC shifts every session after the
  change by an hour.

**Definition of done** is unchanged from sprint 2: a PR against `main`, CI
green, one approval, and a PR description listing what you ran so the reviewer
can repeat it. Once staging is up, add a staging link the reviewer can click.
If something is real but out of scope, open an issue for it instead of adding
it to your PR.

## Tickets

| Ticket                                 | Devs    | Lands in                                                            |
| -------------------------------------- | ------- | ------------------------------------------------------------------- |
| #28 Long-term programs for organizers  | 1       | `src/types/event.ts`, `src/services/event.ts`, `EventForm.tsx`      |
| #29 Volunteers pick short or long-term | 1       | `src/app/events/`, `EventFilters.tsx`, `src/services/signup.ts`     |
| #30 Screening pre-check                | 2       | `src/lib/screening/`, `src/services/clearance.ts`, `src/app/admin/` |
| #31 Report an absence                  | 2 light | `src/services/signup.ts`, `src/app/dashboard/`, roster              |
| #32 Staging environment                | Sai     | Netlify, Atlas, `docs/ENVIRONMENTS.md`, README                      |

#28 and #29 share a field. #28 adds `commitment` to events in a small
PR during the first few days, and #29 works against that name in the
meantime. The two people on #30 agree on the lookup result type on day
one and then work in parallel. The same goes for the two people on #31
and the absence field on the sign-up.

#31 is the light one. It's about one week of work each, spread over the
first two weeks, for the two devs still finishing sprint 2.

## Week 3

Once the PM hears back from Pink STEM about the long-term flow, the two devs on
#31 each get another one-week ticket. Likely candidates:

- **Training completion.** Long-term volunteers need sexual misconduct
  training. For v1, clicking the training link counts as completing it. We
  agreed on that at the meeting so we aren't storing certificates.
- Whatever screening step Pink STEM settles on.

## Not this sprint

- **Production and the domain.** Dr. Head is deciding between a separate domain
  and embedding the Hub in the current site. Staging goes on a Netlify URL for
  now either way.
- **Third-party background checks.** Waiting on Dr. Head's vendor pricing.
  #30 keeps its lookups behind one interface so a vendor API can replace
  them later.
- **Text messages.** Dr. Head asked for absence alerts by text too. We have no
  SMS provider and it costs money, so #31 is email only.
- **One message thread per program.** Threads are per event, so if each session
  is its own event, a volunteer's conversation splits across sessions. Open
  an issue if #28 goes that way.
- **Automated tests.** Still the biggest risk we carry. Staging at least makes a
  real QA pass possible.
