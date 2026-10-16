# Environments, branches, and deploys

## Sites

| Site                | Netlify production branch | URL                                   | Database                            | Status     |
| ------------------- | ------------------------- | ------------------------------------- | ----------------------------------- | ---------- |
| `pink-stem-staging` | `main`                    | https://pink-stem-staging.netlify.app | Atlas project `pink-stem`           | Live       |
| production          | `production`              | Waiting on Dr. Head's domain decision | Its own Atlas project, created then | Not set up |

Staging and production are **two Netlify sites**, not one site with `main` as a
branch deploy. Netlify only runs scheduled functions on a site's published
production deploy, never on branch deploys or deploy previews, so the hourly
job would never run on a `main` branch deploy. Giving staging its own site also
keeps production secrets off the site every reviewer clicks through.

## Branches

| Branch       | Purpose      | Deploys to                       | Protected |
| ------------ | ------------ | -------------------------------- | --------- |
| `production` | Production   | Production site (once it exists) | Yes       |
| `main`       | Staging      | Staging site                     | Yes       |
| `feature/*`  | Feature work | Deploy preview on its PR         | No        |

`main` is the default branch and the base for all feature PRs. Releases move
staging to production by opening a PR from `main` into `production`.

### Flow

```
feature/my-thing  ──PR──>  main (staging)  ──PR──>  production (prod)
      │                      │                          │
 deploy preview        staging site               production site
 (staging database)    (staging database)         (production database)
```

## Staging site

Netlify builds from `netlify.toml`; the Next.js adapter is installed
automatically and needs no plugin entry. In the Netlify UI, under **Project
configuration → Build & deploy → Continuous deployment → Branches and deploy
contexts**:

1. Production branch: `main`
2. Branch deploys: _None_. Pull requests already get a deploy preview, and a
   branch deploy on top of it builds every push twice.
3. Deploy previews: _Any pull request against your production branch / branch
   deploy branches_

Under **Project configuration → Access & security → Visitor access**, keep team
login and password protection **off**. Reviewers and Pink STEM are not on the
Netlify team, and the hourly job reaches the app through the public URL, so a
gate there answers it with a 401 login page. The app already requires a login
for everything that is not public.

Deploy previews use the same environment variables as `main`, so every PR
preview reads and writes the staging database. A reviewer can log in with the
demo accounts and click through the change. Treat staging data as disposable.

## Staging database

MongoDB Atlas, free tier (M0), in its own Atlas project so nothing production
uses later can be reached with staging credentials.

- **Project and cluster:** project `pink-stem`, cluster `pink-stem-cluster`
- **Database:** `pink-stem-staging`. The name must be in the connection string;
  without it Mongo writes to `test`.
- **Database user:** `pink-stem-staging-app`, with an Atlas-generated password
  and one privilege: `readWrite` on `pink-stem-staging`, restricted to
  `pink-stem-cluster`. It cannot read or drop any other database.
- **Network access:** `0.0.0.0/0`. Netlify functions have no fixed outbound
  IPs, so the generated password and the narrow user are the protection.

```
mongodb+srv://pink-stem-staging-app:<password>@<cluster-host>/pink-stem-staging?retryWrites=true&w=majority&appName=pink-stem-cluster
```

The free tier allows 500 connections. `dbConnect` caches the connection on
`global`, so a warm function instance reuses it. Each instance still holds a
few driver connections. After a round of real clicking, check the cluster's
**Metrics → Connections** chart. It should stay far below the limit.

## Environment variables

Set these under **Project configuration → Environment variables** on the
staging site. Use _Same value for all deploy contexts_ and _All scopes_:
production (`main`) and deploy previews share them by design. `proxy.ts` runs
as an edge function and reads `JWT_SECRET`, so do not narrow the scopes.

| Variable                       | Required | Staging value                           | Purpose                                                        |
| ------------------------------ | -------- | --------------------------------------- | -------------------------------------------------------------- |
| `MONGODB_URI`                  | Yes      | Staging connection string above         | Connection string; one database per site                       |
| `JWT_SECRET`                   | Yes      | `openssl rand -base64 48`               | Signs session cookies; rotate to sign everyone out             |
| `APP_URL`                      | Yes      | `https://pink-stem-staging.netlify.app` | Absolute base for links in emails, PDFs, and calendar files    |
| `CRON_SECRET`                  | Yes      | `openssl rand -base64 48`               | Shared secret for `POST /api/v1/jobs/run`                      |
| `RESEND_API_KEY`               | Prod     | **Unset**; see [Email](#email)          | Sends email through Resend; unset, emails go to the server log |
| `EMAIL_FROM`                   | Prod     | Unset                                   | Sender shown on every email                                    |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No       | Unset                                   | Enables the Google sign-in button                              |

Deploy previews link to the staging URL in emails, not to the preview URL.
Both read the same database, so those links still work.

`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_DEMO_PASSWORD` are read
only by the seed script on your machine. They do not belong in Netlify.

## Email

Staging uses the **console transport**: `RESEND_API_KEY` is unset, so every
email is written to the function log instead of being sent and staging cannot
email anyone. To read one, open **Logs & metrics → Functions →
`___netlify-server-handler`** and search for `[mail]`. That is also where
verification and consent links land when you register a new account on
staging.

## Seeding staging

The seed runs from your machine. Create `.env.staging.local` (ignored by git):

```sh
MONGODB_URI=<staging connection string>
SEED_ADMIN_EMAIL=<a team address you own, not a pinkstem.org one>
SEED_ADMIN_PASSWORD=<generated>
SEED_DEMO_PASSWORD=<generated>
```

```sh
npm run seed:staging
```

The script prints the database and host it is about to write to. For any
database that is not local, it stops until you type the database name. This
matters because Node's `--env-file` does not override variables already in
the environment. A `MONGODB_URI` exported in your shell wins over the file
without any warning, and the prompt is where you would notice.

Re-running is safe: accounts that exist are left alone, and demo events are
only created when the demo organizer has none. Demo events are dated relative
to the day of seeding, so they drift into the past. To start over, drop the
`pink-stem-staging` database in the Atlas Data Explorer (the app user
cannot drop it) and run `npm run seed:staging` again.

Demo logins and passwords are shared in Slack, never in the repo.

## Scheduled jobs

`netlify/functions/scheduled-jobs.mts` runs hourly and calls
`POST /api/v1/jobs/run` with `CRON_SECRET`. Netlify sets `URL` automatically;
`APP_URL` is used as a fallback. It runs only on the staging site's production
deploy (`main`), never on deploy previews.

To confirm it is running, open **Logs & metrics → Functions →
`scheduled-jobs`**. Each run logs `[scheduled-jobs] 200` followed by the job
results. A `401` means `CRON_SECRET` is missing or wrong, and `URL or
CRON_SECRET missing` means the variable is unset. **Run now** on the same page
triggers it immediately.

## Production (not set up yet)

When the domain is decided:

1. Create a new Atlas project and cluster, with its own user, scoped to its own
   database. Never reuse staging credentials.
2. Create a second Netlify site from the same repo with production branch
   `production`. Turn off branch deploys and deploy previews there, so no PR
   builds with production secrets.
3. Set the variables above with production values, including `RESEND_API_KEY`
   and `EMAIL_FROM` from a verified sending domain.
4. Seed it with `npm run seed`, without `demo`.

## Branch protection

Apply to **both** `main` and `production` under
**Settings → Branches → Add branch ruleset**:

- Require a pull request before merging
  - Require 1 approval (2 for `production`)
  - Dismiss stale approvals when new commits are pushed
- Require status checks to pass before merging
  - `Lint`, `Typecheck`, `Build` (from `.github/workflows/ci.yml`)
  - `netlify/pink-stem-staging/deploy-preview` (`main` only)
- Require branches to be up to date before merging
- Require conversation resolution before merging
- Block force pushes
- Restrict deletions

## CI

`.github/workflows/ci.yml` runs on every PR and on pushes to `main` and
`production`. It checks formatting, lints, typechecks, and builds. The build
needs no environment variables. The same checks run locally on commit through
the husky + lint-staged pre-commit hook.
