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
                  └─ src/db/actions/  DAO. Mongoose queries only.
                      └─ src/db/models/  Schema + document types.
```

## Directory map

| Path                    | Holds                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `src/app/api/v1/`       | Versioned route handlers, one file per endpoint               |
| `src/components/`       | React components, grouped by feature; `ui/` for primitives    |
| `src/components/hooks/` | Feature hooks that own client state                           |
| `src/constants/`        | Shared literal values                                         |
| `src/db/actions/`       | DAO classes with static methods                               |
| `src/db/models/`        | Mongoose schemas and document interfaces                      |
| `src/http/`             | Typed frontend API clients                                    |
| `src/lib/`              | Static config, shared helpers, seed data                      |
| `src/middleware/`       | Request/response header helpers                               |
| `src/services/`         | Business logic classes with static methods                    |
| `src/styles/`           | Global CSS and font configuration                             |
| `src/types/`            | Shared types, including the error taxonomy in `exceptions.ts` |
| `src/utils/`            | Validation, error handling, route wrappers                    |

## Rules that keep the layering honest

**Route handlers stay thin.** They read the request, call one service method,
and shape the response. They never touch Mongoose and never build error
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
URL, sets headers, and converts non-2xx responses into `HTTPError`.

## Adding a new resource

1. `src/db/models/<resource>.ts` — schema, `Resource`, `ResourceDocument`
2. `src/db/actions/<resource>.ts` — `ResourceDAO` with static methods
3. `src/utils/errorMessages.ts` — add a `RESOURCE` block
4. `src/utils/<resource>.ts` — argument guards that throw typed exceptions
5. `src/services/<resource>.ts` — `ResourceService` with static methods
6. `src/app/api/v1/<resource>/route.ts` — handlers wrapped in `withErrorHandler`
7. `src/types/<resource>.ts` — client-facing type
8. `src/http/<resource>HTTPClient.ts` — typed client methods
9. `src/components/<resource>/` — UI, plus a hook in `src/components/hooks/`
