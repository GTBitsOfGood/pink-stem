# Pink STEM

[![CI](https://github.com/GTBitsOfGood/pink-stem/actions/workflows/ci.yml/badge.svg)](https://github.com/GTBitsOfGood/pink-stem/actions/workflows/ci.yml)

A notes app on **Next.js** (App Router), structured to match the
Bits of Good project conventions used in
[GTBitsOfGood/ican](https://github.com/GTBitsOfGood/ican).

## Tech Stack

- TypeScript
- Next.js (App Router)
- MongoDB with Mongoose (chosen, not wired up yet)
- TailwindCSS
- React Query
- Zod

## Onboarding

### Data

The database is MongoDB, accessed through Mongoose, but it is not wired up yet.
Notes live in an in-memory store (`src/lib/noteStore.ts`) and are cleared
whenever the dev server restarts. Nothing to install, and no connection string
to configure. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for where it
slots in.

### Dependencies

Node version is pinned in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm):

```sh
nvm use
npm install
```

### Development

```sh
npm run dev
```

Open http://localhost:3000

### Code Formatting

Install and enable [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
in VSCode. A pre-commit hook formats and lints staged files automatically.

## Scripts

| Command                | Does                        |
| ---------------------- | --------------------------- |
| `npm run dev`          | Start the dev server        |
| `npm run build`        | Production build            |
| `npm run lint`         | ESLint                      |
| `npm run typecheck`    | `tsc --noEmit`              |
| `npm run format`       | Prettier write              |
| `npm run format:check` | Prettier check (runs in CI) |

## API

Base path is `/api/v1`.

| Method   | Endpoint     | Does                       |
| -------- | ------------ | -------------------------- |
| `GET`    | `/notes`     | List notes, newest first   |
| `POST`   | `/notes`     | Create `{ title, body }`   |
| `GET`    | `/notes/:id` | Read one                   |
| `PATCH`  | `/notes/:id` | Update `{ title?, body? }` |
| `DELETE` | `/notes/:id` | Delete, returns 204        |

## Structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layering and the
checklist for adding a new resource.

```
src/
  app/
    api/v1/notes/route.ts
    api/v1/notes/[id]/route.ts
    layout.tsx
    page.tsx
  components/
    QueryProvider.tsx
    hooks/useNotes.ts
    notes/
    ui/
  constants/
  http/
    fetchHTTPClient.ts
    noteHTTPClient.ts
  lib/
    noteStore.ts
    utils.ts
  middleware/
  services/note.ts
  styles/globals.css
  types/
    exceptions.ts
    models.ts
    note.ts
  utils/
    errorHandler.ts
    errorMessages.ts
    note.ts
    validation.ts
    withErrorHandler.ts
```

## Environments

Branches, deploy previews, and branch protection are documented in
[docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

- `production` → production site
- `main` → staging site (default branch, base for feature PRs)
- every branch and PR → Netlify deploy preview
