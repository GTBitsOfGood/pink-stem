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

The app needs no environment variables yet. When Mongo is wired up, set
`MONGODB_URI` per context under **Environment variables**, scoping the staging
value to `main` and branch deploys and the production value to `production`.
Point each context at its own database so a staging deploy can never write to
production data.

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
`production`. It checks formatting, lints, typechecks, and builds. The same
checks run locally on commit through the husky + lint-staged pre-commit hook.
