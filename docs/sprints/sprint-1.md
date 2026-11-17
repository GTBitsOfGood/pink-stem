# Sprint 1

Two weeks, 6 devs, 5 tickets. Gamification is a pair, everyone else is solo.
This file is the shared context. The ticket bodies themselves live on GitHub.

## Sprint context

We have not settled on a product direction with the nonprofit yet. There are two
plausible routes:

- **Route A, integrate.** Pink STEM keeps authoring curriculum in Google Sites,
  Classroom and Docs. We build a thin platform on top of that: accounts,
  dashboards, registration, progress tracking, and links out to existing content
  and to partners (Omniverse City, Augusta University, VolunTrack).
- **Route B, own the content.** We pull the curriculum into our own database and
  render interactive, gamified modules ourselves, with challenges, points, badges
  and teacher-visible grades along the lines of the GameStar Mechanics model the
  nonprofit described.

**Scope note: there is one course to build right now, Aviation.** The long-term
goal is still 30 to 50 courses, but Aviation is the only one we are developing
this semester, and it is the one every spike should be grounded in. Design for
Aviation first and keep an eye on whether the approach would generalize later.
Don't design for fifty hypothetical courses we haven't seen.

**The database is MongoDB, but it is not wired up yet.** The repo currently
keeps notes in an in-memory store (`src/lib/noteStore.ts`) that resets on every
server restart, and connecting it for real is a sprint 2 ticket. Design against
Mongo: propose Mongoose schemas and their document interfaces, and where a
decision depends on the database, assume Mongo rather than hedging.

None of the tickets assume either answer. Each dev has one covering the full two
weeks: get the dev environment working, then run one timeboxed
research spike in their lane. The five resulting documents are what we take into
the direction meeting. Sprint 2 is when we start building, and we will scope it
from what these spikes turn up.

Every spike produces a written doc in `docs/spikes/`, not a feature. The point is
a recommendation the PM and EM can act on, with enough evidence behind it to hold
up in discussion. Respect the timebox. If you run out of hours before you run out
of questions, that is a finding in itself. Write down where you got to and stop.

**Definition of done for every ticket:** PR open against `main`, CI green
(`format:check`, `lint`, `typecheck` and `build` all passing), one reviewer
approval, and the spike doc committed under `docs/spikes/`.

The same environment setup block appears in all five tickets. That is
intentional. Splitting it into one shared ticket would leave five people waiting
on one person's PR, and each dev needs to confirm their own machine works.

---

## Lane assignments

| Ticket                | Dev             | Spike output                      |
| --------------------- | --------------- | --------------------------------- |
| Auth and access       | Dev 1           | `docs/spikes/auth.md`             |
| Data and integrations | Dev 2           | `docs/spikes/google-classroom.md` |
| Aviation curriculum   | Dev 3           | `docs/spikes/content-model.md`    |
| Gamification          | Dev 4 and Dev 6 | `docs/spikes/gamification.md`     |
| Partner integrations  | Dev 5           | `docs/spikes/integrations.md`     |

---
