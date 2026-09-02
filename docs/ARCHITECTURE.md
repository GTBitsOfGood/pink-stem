# Architecture

This repo follows the Bits of Good Next.js layering used by
[GTBitsOfGood/ican](https://github.com/GTBitsOfGood/ican). Every request walks
the same path, and each layer is allowed to talk only to the one below it.

```
src/app/page.tsx                UI. No fetch calls, no business rules.
  └─ src/components/hooks/      State + orchestration for a screen.
      └─ src/http/*HTTPClient   Typed API client. The only place fetch is called.
          └─ src/app/api/v1/**  Route handler. Thin: parse, delegate, respond.
              └─ src/services/  Business logic + validation. Throws typed errors.
                  └─ src/lib/noteStore.ts   Persistence. In memory until Mongo lands.
```

## Persistence is a placeholder

The database is MongoDB, accessed through Mongoose. It is not wired up yet.
`src/lib/noteStore.ts` holds notes in a `Map` cached on `global`, and its
contents are lost on every server restart. That is fine for now, and deliberate:
nothing above the store should have to change when the real thing lands.

Two rules keep that true:

- **Store methods are async even though nothing awaits.** A real data access
  layer will be, and services already treat every call as a promise.
- **Only the service layer imports the store.** Route handlers, hooks and
  components have never heard of it.

The swap is: add `src/db/dbConnect.ts`, `src/db/models/` and `src/db/actions/`,
point `NoteService` at the new DAO, delete the store. The method signatures are
the same, so nothing else in the tree moves. Commit `6633d94` removed a working
version of exactly that layer, so `git show 6633d94` is the reference for
putting it back.

## Directory map

| Path                    | Holds                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `src/app/api/v1/`       | Versioned route handlers, one file per endpoint               |
| `src/components/`       | React components, grouped by feature; `ui/` for primitives    |
| `src/components/hooks/` | Feature hooks that own client state                           |
| `src/constants/`        | Shared literal values                                         |
| `src/http/`             | Typed frontend API clients                                    |
| `src/lib/`              | Static config, shared helpers, the in-memory store            |
| `src/middleware/`       | Request/response header helpers                               |
| `src/services/`         | Business logic classes with static methods                    |
| `src/styles/`           | Global CSS and font configuration                             |
| `src/types/`            | Shared types, including the error taxonomy in `exceptions.ts` |
| `src/utils/`            | Validation, error handling, route wrappers                    |

## Rules that keep the layering honest

**Route handlers stay thin.** They read the request, call one service method,
and shape the response. They never touch the store and never build error
responses. `withErrorHandler` resolves Next.js' async `params` and routes every
thrown error through `handleError`.

**Errors are thrown, not returned.** Services throw the typed exceptions in
`src/types/exceptions.ts` (`NotFoundError`, `InvalidArgumentsError`, and so on).
`handleError` maps each one to a status code. Adding a new failure mode means
adding an exception class, not an `if` in a route handler.

**Error copy lives in one place.** `src/utils/errorMessages.ts` is a frozen
catalog. Services reference `ERRORS.NOTE.NOT_FOUND`, never a string literal.

**The frontend never calls `fetch`.** It calls a method on an HTTP client in
`src/http/`, which wraps `fetchHTTPClient` — the one place that knows the base
URL, sets headers, and converts non-2xx responses into `HTTPError`. Components
reach those clients through a hook in `src/components/hooks/`, which wraps them
in React Query so no screen fetches from `useEffect`.

**Response headers are built, never cloned from the request.** See
`src/middleware/cache-control.ts`. Copying `req.headers` onto a response
reflects `Cookie` and `Authorization` back to the client, where an intermediary
cache or access log can capture them.

## Adding a new resource

1. `src/lib/<resource>Store.ts` — in-memory store with async static methods
2. `src/utils/errorMessages.ts` — add a `RESOURCE` block
3. `src/utils/<resource>.ts` — argument guards that throw typed exceptions
4. `src/services/<resource>.ts` — `ResourceService` with static methods
5. `src/app/api/v1/<resource>/route.ts` — handlers wrapped in `withErrorHandler`
6. `src/types/<resource>.ts` — client-facing type
7. `src/http/<resource>HTTPClient.ts` — typed client methods
8. `src/components/<resource>/` — UI, plus a hook in `src/components/hooks/`

Step 1 becomes two once Mongo lands: a Mongoose schema in `src/db/models/` and
a DAO in `src/db/actions/`.
