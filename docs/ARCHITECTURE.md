# Architecture

This repo follows the Bits of Good Next.js layering used by
[GTBitsOfGood/ican](https://github.com/GTBitsOfGood/ican). Every request walks
the same path, and each layer is allowed to talk only to the one below it.

```
src/app/**/page.tsx             UI. No fetch calls, no business rules.
  └─ src/components/hooks/      React Query hooks that own client state.
      └─ src/http/*HTTPClient   Typed API client. The only place fetch is called.
          └─ src/app/api/v1/**  Route handler. Thin: parse, delegate, respond.
              └─ src/services/  Business logic + validation. Throws typed errors.
                  └─ src/db/actions/  DAO. Mongoose queries only.
                      └─ src/db/models/  Schema definitions.
```

## Directory map

| Path                    | Holds                                                           |
| ----------------------- | --------------------------------------------------------------- |
| `src/app/api/v1/`       | Versioned route handlers, one file per endpoint                 |
| `src/app/**`            | Pages, grouped by audience: public, volunteer, organizer, admin |
| `src/components/`       | React components by feature; `ui/` for primitives               |
| `src/components/hooks/` | Feature hooks that own client state through React Query         |
| `src/constants/`        | Labels for every enum, product limits, org defaults, query keys |
| `src/db/actions/`       | DAO classes with static methods                                 |
| `src/db/models/`        | Mongoose schemas; the interfaces they implement live in `types` |
| `src/http/`             | Typed frontend API clients                                      |
| `src/lib/`              | Session signing, dates, tokens, email templates, PDF, CSV, ICS  |
| `src/middleware/`       | Response header helpers                                         |
| `src/services/`         | Business logic classes with static methods                      |
| `src/styles/`           | Global CSS and font configuration                               |
| `src/types/`            | Domain types, composite API shapes, the error taxonomy          |
| `src/utils/`            | Zod schemas, `withAuth`, authorization guards, error handling   |
| `src/proxy.ts`          | Page-level redirect gate (Next.js proxy)                        |

## Rules that keep the layering honest

**Route handlers stay thin.** They read the request, call one service method,
and shape the response. They never touch Mongoose and never build error
responses. `withErrorHandler` wraps public routes; `withAuth` layers session
handling and role checks on the same shape and hands the service an `Actor`.

**Authorization happens in services, on every request.** `withAuth` loads the
user from the database each time, so deactivation and forced sign-out take
effect immediately. Organizers are scoped to their own events through
`assertCanManageEvent`; admins pass everywhere. `proxy.ts` only redirects
signed-out or under-privileged visitors away from pages they cannot use.

**Errors are thrown, not returned.** Services throw the typed exceptions in
`src/types/exceptions.ts`; `handleError` maps each one to a status code. Zod
validation errors become 400s automatically, so services call `schema.parse`
and move on.

**Error copy lives in one place.** `src/utils/errorMessages.ts` is a frozen
catalog. Services reference `ERRORS.SIGNUP.OVERLAP`, never a string literal.

**Types are declared once.** Domain interfaces live in `src/types/` and are
implemented by the Mongoose schemas. DAOs return lean `Doc<T>` documents;
client code reads the same shapes through `Serialized<T>`, which turns
ObjectIds and Dates into strings.

**Dates render in Pink STEM's time zone everywhere.** `src/lib/dates.ts`
formats with `America/New_York` on the server and in the browser, and
date-only inputs (`YYYY-MM-DD`) are parsed as midnight in that zone.

**The frontend never calls `fetch`.** It calls a method on an HTTP client in
`src/http/`, which wraps `fetchHTTPClient`. Components reach those clients
through a hook in `src/components/hooks/`, so no screen fetches from
`useEffect`.

## Data model

| Collection         | Purpose                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| `users`            | Accounts, profile, waiver acceptance, notification preferences, session version |
| `clearances`       | Screening outcome per user; admins only. Organizers receive a derived boolean   |
| `events`           | Organizer-owned events: draft → published → completed, cancelled from any state |
| `shifts`           | The unit volunteers sign up for; `filledCount` is maintained atomically         |
| `signups`          | One per volunteer per shift, ever; pending reasons; embedded attendance         |
| `hoursledgers`     | Append-only source of truth for hour totals; corrections reference the original |
| `eventupdates`     | Notes and important changes, soft-deleted                                       |
| `messagethreads`   | One thread per volunteer per event, admin-readable, minors flagged              |
| `messages`         | Text only, with per-message report fields                                       |
| `certificates`     | Immutable snapshots with a random verification code                             |
| `auditlogs`        | Append-only record of every consequential action                                |
| `actiontokens`     | Hashed one-time links: password reset, invites, guardian consent                |
| `orgsettings`      | Singleton organization configuration                                            |
| `notificationlogs` | Idempotency keys so scheduled emails send exactly once                          |

Two decisions carry most of the weight:

- **Capacity is enforced in the database.** `ShiftDAO.claimSpot` is a single
  conditional `findOneAndUpdate` (`filledCount < capacity`), so two volunteers
  racing for the last spot cannot both win. The loser is offered the waitlist.
- **The ledger is append-only.** `HoursLedgerDAO` has no update or delete. An
  admin correction is a new row that points at the row it reverses, and any
  certificate covering those hours is revoked and reissued with a new code.

## Scheduled work

`JobService.runAll` (`POST /api/v1/jobs/run`) sends shift reminders, low-fill
alerts, unapproved-roster nudges, clearance expiry warnings, note and message
digests, and the organizer digest, and closes stale threads. Every send is
keyed in `notificationlogs`, so the runner is safe to fire hourly and a late
or repeated run is harmless. `netlify/functions/scheduled-jobs.mts` is the
hourly trigger in production.

## Adding a new resource

1. `src/types/<resource>.ts` — the interface and any enum arrays
2. `src/db/models/<resource>.ts` — schema, indexes, `defineModel`
3. `src/db/actions/<resource>.ts` — `ResourceDAO` with static methods
4. `src/utils/errorMessages.ts` — add a `RESOURCE` block
5. `src/utils/validation/<resource>.ts` — zod input schemas
6. `src/services/<resource>.ts` — `ResourceService` with static methods
7. `src/app/api/v1/<resource>/route.ts` — handlers wrapped in `withAuth`
8. `src/http/<resource>HTTPClient.ts` — typed client methods
9. `src/components/hooks/use<Resource>.ts` and `src/components/<resource>/`
