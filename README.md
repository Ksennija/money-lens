# money-lens

See where your money really goes.
This project is for persons who earn enough, but don’t understand why they don’t save.

A web app imports banking transactions, categorizes spendings and shows the user where their money goes each month: how much they save or spend comparing with the previous month.

It is a TypeScript monorepo: React.js on frontend (`/frontend`) and Node.js on backend (`/backend`).

## Prerequisites

- **Node.js 22 or newer**
- **pnpm** (this is a pnpm workspace, so use pnpm, not npm)
- **A running PostgreSQL database** (the backend uses it for data and sessions)

## Setup

```bash
pnpm install                          # installs both projects and runs `prisma generate`
cp backend/.env.example backend/.env  # then edit it (see below)
pnpm --filter backend prisma:migrate  # creates the database tables
pnpm dev                              # starts the frontend and backend together
```

In `backend/.env`, set:

- `DATABASE_URL`: your Postgres connection string, for example `postgresql://user:password@localhost:5432/money_lens`. The database must already exist.
- `SESSION_SECRET`: a long random string. Generate one with `openssl rand -hex 32`.

Optional: `TRUST_PROXY` and `DB_POOL_MAX` (see `backend/.env.example`).

## Running

- Backend: <http://localhost:3000> (change with the `PORT` variable)
- Frontend: Vite dev server, usually <http://localhost:5173>. It proxies API calls to the backend.

When the project starts, the user can see a home page on the screen.

## Other commands

- `pnpm test`: run the tests of both projects
- `pnpm build`: build both projects
- `pnpm check:deps`: check the dependency rules

## Status

The project is in development. The Insights and History pages are not done to the end.
