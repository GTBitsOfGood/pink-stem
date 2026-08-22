# Pink Stem

Simple MERN-style app built on **Next.js** (App Router) — MongoDB + Mongoose + React + Node, with Next API routes replacing a standalone Express server.

## Stack
- **M**ongoDB via Mongoose (`src/lib/mongodb.ts`, `src/models/Note.ts`)
- **E**xpress-equivalent: Next.js Route Handlers (`src/app/api/notes/*`)
- **R**eact (Next App Router)
- **N**ode.js runtime

## Setup
```bash
npm install
cp .env.local.example .env.local   # then edit MONGODB_URI
npm run dev
```

Open http://localhost:3000

## API
- `GET    /api/notes` — list
- `POST   /api/notes` — create `{ title, body }`
- `GET    /api/notes/:id` — read
- `PUT    /api/notes/:id` — update
- `DELETE /api/notes/:id` — delete

## Structure
```
src/
  app/
    api/notes/route.ts
    api/notes/[id]/route.ts
    layout.tsx
    page.tsx
  lib/mongodb.ts
  models/Note.ts
```
