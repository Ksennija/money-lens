# money-lens

See where your money really goes.
This project is for persons who earn enough, but don’t understand why they don’t save.

A web app imports banking transactions, categorizes spendings and shows the user where their money goes each month: how much they save or spend comparing with the previous month.

# What can User do

    Create account
        ↓
    Connect/import transactions
        ↓
    App categorizes them
        ↓
    Monthly analysis
        ↓
    Discover spending patterns

# Architecture

It is a TypeScript monorepo: React.js on frontend (`/frontend`) and Node.js on backend (`/backend`).

```
Browser (React, Vite)  ──HTTP /api──▶  Express backend  ──▶  PostgreSQL
                                             │
                                             └──▶  Frankfurter API (exchange rates)
```

The two projects only talk over HTTP. In development, Vite proxies `/api` to the backend.

## Frontend (`frontend/src`)

| Folder | Role |
| --- | --- |
| `pages/` | One component per screen: Overview, Transactions, Insights, Import, Login, Registration |
| `components/` | Parts shared by pages (navigation bar, month navigation, category filter, rates notice) |
| `api/` | One small function per backend endpoint. It checks the answer and has no React code |
| `hooks/`, `lib/` | Month navigation, month and category helpers |

Pages call `api/`, never the other way round. Routing is in `App.tsx`: signed-out users are sent to sign in.

## Backend (`backend/src`)

A request goes through these layers, top to bottom:

| Layer | Role |
| --- | --- |
| `routes/` | HTTP only: read the request, call a service, send the answer. One file per endpoint |
| `middleware/` | Sessions, `requireAuth`, login rate limit, error handlers |
| `services/` | Use cases: import a CSV, compare months, find category changes, convert currencies |
| `domain/` | The business rules as plain functions: CSV parsing, categorization, month comparison, category changes, currency math |
| `db/` | The only code that talks to Postgres (Prisma and a session pool) |

`domain/` knows nothing about HTTP or the database, so its rules are tested without either. `services/` connects the rules to the database and to the exchange rate API.

Endpoints, all under `/api` and all except register and login need a session:

| Endpoint | Purpose |
| --- | --- |
| `POST /register`, `POST /login`, `POST /logout`, `GET /me` | Account and session |
| `POST /transactions/import` | Upload a bank CSV; each transaction is categorized on the way in |
| `GET /transactions` | List transactions, filtered by category |
| `GET /comparison` | Income, spending and savings of a month against the previous month |
| `GET /category-changes` | Which categories changed against the same days last month |

## Main flows

- **Categorization:** the first keyword rule that matches a transaction wins. With no match, money in is `income` and anything else is `other`. Refunds count against spending, not as income.
- **Currencies:** amounts are converted into one reporting currency (the most common one in the user's transactions, EUR by default) with the rate of the transaction day. Rates come from Frankfurter and are cached in the `ExchangeRate` table. If the API is down, the newest cached rate from the last 7 days is used and the pages show a notice.

## Data (`backend/prisma/schema.prisma`)

`User`, `Transaction` (amount in cents, category, currency), `ExchangeRate` (cached daily rates) and `Session`.

## Rules that keep it this way

`pnpm check:deps` fails when a layer imports the wrong neighbour, for example `domain/` importing `db/`, a route using Prisma directly, or the frontend importing backend code. The rules are in `.dependency-cruiser.cjs`.

The specs in `spec/` describe each feature and its test cases.


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
