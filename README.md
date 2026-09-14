# Pink STEM Volunteer Hub

[![CI](https://github.com/GTBitsOfGood/pink-stem/actions/workflows/ci.yml/badge.svg)](https://github.com/GTBitsOfGood/pink-stem/actions/workflows/ci.yml)

One place for [Pink STEM](https://pinkstem.org) organizers to staff events,
for volunteers to claim shifts, and for verified service hours to become a
certificate a school or employer can check. Built on **Next.js** (App Router)
and **MongoDB**, structured to match the Bits of Good conventions used in
[GTBitsOfGood/ican](https://github.com/GTBitsOfGood/ican).

The product requirements live in the PRD (`Pink STEM Volunteer Hub`, v0.2).
Every v1 feature in it is implemented: accounts and three roles, volunteer
profile and clearance gate, events with shifts, browse and sign-up with a
waitlist, roster check-off and hour approval, event updates, event-scoped
messaging with admin oversight, certificates with public verification,
transactional email, the admin console with CSV reports, and the audit trail.

## Tech Stack

- TypeScript
- Next.js (App Router)
- MongoDB with Mongoose
- TailwindCSS
- React Query
- Zod

## Onboarding

### MongoDB

Install [MongoDB Community Server](https://www.mongodb.com/docs/manual/administration/install-community/)
to host a local instance, or run the bundled Docker setup with
`docker compose up`. [MongoDB Compass](https://www.mongodb.com/try/download/compass#compass)
is helpful for inspecting the database.

### Dependencies

Node version is pinned in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm):

```sh
nvm use
npm install
```

### Environment

```sh
cp .env.local.example .env.local   # then set MONGODB_URI and JWT_SECRET
```

Only `MONGODB_URI` and `JWT_SECRET` are required locally. Without
`RESEND_API_KEY`, every email is printed to the server console instead of
being sent, including the guardian consent and invitation links.

### Seed data

```sh
npm run seed          # org settings + the first admin (SEED_ADMIN_EMAIL / PASSWORD)
npm run seed -- demo  # also an organizer, three volunteers, and three events
```

Demo accounts share the password printed at the end of the seed:
`admin@pinkstem.org`, `organizer@example.com`, `maya@example.com` (cleared),
`priya@example.com` (cleared), `sofia@example.com` (minor, awaiting consent).

### Development

```sh
npm run dev
```

Open http://localhost:3000. Scheduled work (reminders, digests, clearance
expiry, roster nudges) runs from `POST /api/v1/jobs/run`; trigger it locally
with `npm run jobs` once `CRON_SECRET` is set.

### Code Formatting

Install and enable [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
in VSCode. A pre-commit hook formats and lints staged files automatically.

## Scripts

| Command                | Does                                        |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start the dev server                        |
| `npm run build`        | Production build                            |
| `npm run lint`         | ESLint                                      |
| `npm run typecheck`    | `tsc --noEmit`                              |
| `npm run format`       | Prettier write                              |
| `npm run format:check` | Prettier check (runs in CI)                 |
| `npm run seed`         | Create settings and the first admin account |
| `npm run jobs`         | Run the scheduled jobs against a dev server |

## API

Base path is `/api/v1`. Every route is a thin handler over one service call;
authorization is enforced server-side on every request by `withAuth`.

| Area         | Endpoints                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth         | `auth/register`, `auth/login`, `auth/logout`, `auth/google`, `auth/me`, `auth/forgot-password`, `auth/reset-password`, `auth/invite/:token`                        |
| Me           | `me` (profile), `me/waiver`, `me/guardian-consent`, `me/signups`, `me/hours`, `me/certificates`                                                                    |
| Public       | `events`, `events/:id`, `settings`, `consent/:token`, `verify/:code`                                                                                               |
| Organizer    | `events` (create), `events/:id` (update), `events/:id/{publish,cancel,duplicate,shifts,roster,updates,broadcast}`, `shifts/:id`, `updates/:id`, `organizer/events` |
| Sign-ups     | `signups`, `signups/:id/{cancel,approve,promote,attendance,calendar}`                                                                                              |
| Messaging    | `threads`, `threads/:id`, `threads/:id/messages`, `threads/:id/report`                                                                                             |
| Certificates | `certificates/:id/pdf`, `certificates/:id/revoke`                                                                                                                  |
| Admin        | `admin/{overview,people,people/:id,people/:id/clearance,people/:id/signout,invitations,organizers,events,hours,audit,reports/:kind,settings}`                      |
| Jobs         | `jobs/run` (bearer `CRON_SECRET`)                                                                                                                                  |

## Structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layering, the data
model, and the checklist for adding a new resource.

```
src/
  app/               Pages (App Router) and api/v1 route handlers
  components/        React components by feature; ui/ primitives; hooks/
  constants/         Labels, product limits, org defaults, query keys
  db/                dbConnect, Mongoose models/, DAO actions/
  http/              Typed frontend API clients
  lib/               Session, dates, tokens, email templates, PDF, CSV, ICS
  middleware/        Response header helpers
  services/          Business logic classes with static methods
  styles/            Global CSS and font configuration
  types/             Domain types, API shapes, error taxonomy
  utils/             Validation schemas, auth wrappers, error handling
  proxy.ts           Page-level access gate
scripts/seed.ts      Seed script
netlify/functions/   Hourly trigger for the job runner
```

## Environments

Branches, deploy previews, environment variables, and branch protection are
documented in [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

- `production` → production site
- `main` → staging site (default branch, base for feature PRs)
- every branch and PR → Netlify deploy preview
