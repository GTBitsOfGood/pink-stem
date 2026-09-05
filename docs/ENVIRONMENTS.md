# Environments, branches, and deploys

## Branches

| Branch       | Purpose      | Deploys to            | Protected |
| ------------ | ------------ | --------------------- | --------- |
| `production` | Production   | Production site       | Yes       |
| `main`       | Staging      | Staging site          | Yes       |
| `feature/*`  | Feature work | Branch deploy preview | No        |

`main` is the default branch and the base for all feature PRs. Releases move
staging to production by opening a PR from `main` into `production`.

### Flow

```
feature/my-thing  ──PR──>  main (staging)  ──PR──>  production (prod)
      │                      │                          │
 deploy preview        staging site               production site
```

## Deploy previews

Netlify is configured (see `netlify.toml`) to build:

- **Deploy previews** for every pull request
- **Branch deploys** for every pushed branch
- **Production deploy** for the branch linked to the production context

Enable both in the Netlify UI under **Site configuration → Build & deploy →
Continuous deployment**:

1. Set the production branch to `production`.
2. Under **Branch deploys**, select _All_.
3. Under **Deploy previews**, enable _Any pull request against your production
   branch or branch deploy branches_.

## Environment variables

Set these under **Environment variables**, scoping staging values to `main`
and branch deploys and production values to `production`. Point each context
at its own database so a staging deploy can never write to production data.

| Variable                         | Required | Purpose                                                        |
| -------------------------------- | -------- | -------------------------------------------------------------- |
| `MONGODB_URI`                    | Yes      | Connection string; one database per context                    |
| `JWT_SECRET`                     | Yes      | Signs session cookies; rotate to sign everyone out             |
| `APP_URL`                        | Yes      | Absolute base for links in emails, PDFs, and calendar files    |
| `CRON_SECRET`                    | Yes      | Shared secret for `POST /api/v1/jobs/run`                      |
| `RESEND_API_KEY`                 | Prod     | Sends email through Resend; unset, emails go to the server log |
| `EMAIL_FROM`                     | Prod     | Sender shown on every email                                    |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`   | No       | Enables the Google sign-in button                              |
| `SEED_ADMIN_EMAIL` / `_PASSWORD` | Seed     | First admin created by `npm run seed`                          |

Leave `RESEND_API_KEY` unset on deploy previews so test sign-ups never email
real people.

## Scheduled jobs

`netlify/functions/scheduled-jobs.mts` runs hourly and calls
`POST /api/v1/jobs/run` with `CRON_SECRET`. Netlify sets `URL` automatically;
`APP_URL` is used as a fallback.

## Branch protection

Apply to **both** `main` and `production` under
**Settings → Branches → Add branch ruleset**:

- Require a pull request before merging
  - Require 1 approval (2 for `production`)
  - Dismiss stale approvals when new commits are pushed
- Require status checks to pass before merging
  - `Lint, typecheck, build` (from `.github/workflows/ci.yml`)
  - `netlify/pink-stem/deploy-preview`
- Require branches to be up to date before merging
- Require conversation resolution before merging
- Block force pushes
- Restrict deletions

## CI

`.github/workflows/ci.yml` runs on every PR and on pushes to `main` and
`production`. It checks formatting, lints, typechecks, and builds. The build
needs no environment variables. The same checks run locally on commit through
the husky + lint-staged pre-commit hook.
