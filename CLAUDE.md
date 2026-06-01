@AGENTS.md
@RULES.md

# vibe-code — Project Knowledge Base

## What this is

A chill, Discord-vibes coding platform (think LeetCode but actually fun). Users browse problems, write solutions in JavaScript or Python, run against visible test cases, and submit for full evaluation. No auth — identity is a UUID stored in localStorage.

## Tech stack

| Layer | Version | Notes |
|---|---|---|
| Framework | Next.js 16.2.6 | App Router. **Not the Next.js you know — read `node_modules/next/dist/docs/` before writing any Next-specific code.** |
| React | 19.2.4 | Server components for data fetching, client components for interactivity |
| Database | PostgreSQL 16 (Docker, port 5433) | via Prisma 7 with `@prisma/adapter-pg` |
| ORM | Prisma 7.8 | Client generated to `src/generated/prisma` |
| Code execution | Local `child_process.execFile` | Runs `node` / `python3` directly on the host — NOT via the Piston HTTP API (despite the filename) |
| Editor | `@monaco-editor/react` 4.7 | Loaded dynamically (SSR disabled) |
| Styling | Tailwind CSS 4 + PostCSS | `@tailwindcss/postcss` plugin |
| Theming | `next-themes` 0.4.6 | Dark/light via `ThemeProvider` |
| Icons | `lucide-react` 1.17 | |

## Running locally

```bash
# 1. Start infrastructure
docker compose up -d          # postgres on :5433

# 2. Environment
cp .env.example .env          # DATABASE_URL + PISTON_URL already set

# 3. Database
npm run db:migrate            # runs prisma migrate dev
npm run db:seed               # seeds problems via prisma/seed.ts

# 4. Dev server
npm run dev                   # http://localhost:3000
```

Other DB commands:
- `npm run db:reset` — drop + re-migrate + re-seed
- `npm run piston:setup` — installs runtimes into the Piston container (unused by current execution layer)

## Project structure

```
src/
  app/
    page.tsx                  # Homepage — server component, fetches problem list
    layout.tsx                # Root layout with ThemeProvider
    globals.css               # Tailwind base
    problems/[slug]/page.tsx  # Problem detail — server component + embedded client hints
    api/
      run/route.ts            # POST — run against visible test cases, no DB write
      submit/route.ts         # POST — run all test cases, write Submission to DB
      user/solved/route.ts    # GET ?uuid= — returns solved problemIds
  components/
    ProblemsList.tsx          # Client: filterable problem list
    ProblemCard.tsx           # Single problem row
    ProblemWorkspace.tsx      # Client: Monaco editor + run/submit logic
    TestResults.tsx           # Run/submit result display
    DifficultyBadge.tsx       # Coloured badge for difficulty
    ThemeProvider.tsx         # next-themes wrapper
    ThemeToggle.tsx           # Dark/light toggle button
  lib/
    prisma.ts                 # Prisma client singleton
    piston.ts                 # Code execution via child_process (node / python3)
    messages.ts               # Hype/fail message pools for submit feedback
    utils.ts                  # cn() helper (clsx + tailwind-merge)
  types/index.ts              # Shared TS types
  generated/prisma/           # Auto-generated Prisma client (do not edit)
prisma/
  schema.prisma               # DB schema
  seed.ts                     # Problem seeder
  migrations/                 # Prisma migration files
```

## Database schema

**Problem** — core entity. Has `starterJs`/`starterPy` (starter code), `fnNameJs`/`fnNamePy` (function name the driver calls), `examples` (JSON), `tags` (String[]), `constraints` (String[]).

**TestCase** — belongs to Problem. `isVisible: true` = shown in Run mode; all cases used on Submit. Input/expected stored as JSON.

**Hint** — ordered hints per problem. Rendered as `<details>` elements (zero-JS accordion).

**User** — identified only by `uuid` (from localStorage). Created on first submission via `upsert`.

**Submission** — each run/submit call. Stores `language`, `code`, `passed`, `passedAt`.

**Difficulty enum**: `BEGINNER | AMATEUR | SEMI_PRO | PROFESSIONAL | LEGENDARY`

## Code execution architecture

`src/lib/piston.ts` builds a driver script that wraps user code, runs all test cases in a loop, and writes JSON results to stdout. Execution is **local** via `execFile`:

- **JavaScript**: uses NVM node at `~/.nvm/versions/node/v20.20.2/bin/node` (falls back to system `node`). Override with `NVM_NODE_PATH` env var.
- **Python**: uses `python3`.
- Timeout: 5 seconds per execution.
- Temp files written to `os.tmpdir()`, cleaned up in `finally`.

The `docker-compose.yml` includes a Piston container (port 2000) and `PISTON_URL` is in `.env`, but the current execution layer does **not** call the Piston HTTP API.

## API contracts

### `POST /api/run`
```json
{ "problemId": "...", "language": "javascript|python", "code": "..." }
```
Returns visible test cases only. Does not write to DB.
```json
{ "results": [...], "passedCount": 2, "totalCount": 3 }
```

### `POST /api/submit`
```json
{ "problemId": "...", "language": "javascript|python", "code": "...", "userUuid": "..." }
```
Runs all test cases, upserts User, creates Submission.
```json
{ "passed": true, "results": [...], "message": "You cooked fr 🔥", "passedCount": 5, "totalCount": 5 }
```

### `GET /api/user/solved?uuid=<uuid>`
```json
{ "solvedIds": ["cuid1", "cuid2"] }
```

## Key conventions

- User identity comes from `localStorage.getItem("vibe_user_id")` (UUID). Set on first load in `ProblemWorkspace`.
- Run uses only `isVisible: true` test cases; Submit uses all test cases.
- `randomMessage(passed)` from `src/lib/messages.ts` returns hype/encouragement copy.
- Prisma client output is `src/generated/prisma` — regenerate with `npx prisma generate` after schema changes.
- `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json` are standard configs, nothing custom.

## Planned features (not yet built)

From PLAN.md: rooms with invite links, collaborative whiteboards (Excalidraw/tldraw), light music, contest mode with friends, Google Meet integration. Auth deferred post-MVP.
