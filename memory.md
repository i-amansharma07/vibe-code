# Agent Memory Log — vibe-code

This document serves as the persistent memory and context log for the AI assistant across sessions. It outlines the project's identity, technical architecture, historical decisions, documented plans, and prioritized technical backlog.

---

## 1. Project Overview & Vision

**vibe-code** is a chill, gamified alternative to LeetCode designed for low-stress, friendly DSA problem solving.

### Core Principles
- **No Friction / Zero Auth**: Users are identified by an anonymous UUID generated on the client and stored in `localStorage` (`vibe_user_id`). Users can immediately solve problems without signup walls.
- **Discord-Inspired Hangout Vibe**: Low-pressure atmosphere with supportive slang responses for both wins and fails (e.g. *"You cooked fr 🔥"*, *"Almost fam, check your edge cases 👀"*).
- **Dual-Execution Model**:
  - **Run**: Fast evaluation against public/sample test cases (`isVisible: true`) with no database writes.
  - **Submit**: Full evaluation against all test cases (hidden + visible), recording submissions in PostgreSQL and returning hype/encouragement slangs.
- **Dual-Layer Code Persistence**: Instant local autosave to `localStorage` + background debounce/flush (30s interval, unmount, and `Ctrl+S`/`Cmd+S`) to PostgreSQL `Draft` table.
- **Gaming Difficulty Tiers**: `BEGINNER` ➔ `AMATEUR` ➔ `SEMI_PRO` ➔ `PROFESSIONAL` ➔ `LEGENDARY`.

---

## 2. Technology Stack & Infrastructure

| Component | Technology | Role / Configuration |
|---|---|---|
| **Framework** | Next.js 16.2.6 (App Router) | React 19.2.4, Server Components for data fetching, Client Components for editor workspace. |
| **Database** | PostgreSQL 16 (Docker) | Runs on host port `5433` via `docker-compose.yml`. |
| **ORM** | Prisma 7.8.0 | Uses `@prisma/adapter-pg` driver; client generated at `src/generated/prisma`. |
| **Code Editor** | `@monaco-editor/react` 4.7.0 | Dynamic import with SSR disabled, auto-formatting, theme sync. |
| **Styling** | Tailwind CSS 4 + PostCSS | Configured via `@tailwindcss/postcss`. |
| **Theme & Icons** | `next-themes` + `lucide-react` | Dark/Light mode support. |
| **Sandbox Execution** | Piston (Docker) + Host Runner | Piston container on port `2000`; execution script in `src/lib/piston.ts`. |

---

## 3. Review of Project Documents

### 3.1 [`PLAN.md`](file:///home/aman-sharma/Desktop/vibe-code/PLAN.md) (Original Vision & Feature Roadmap)
- **Problem Listing**: Filterable by difficulty tiers and topic categories.
- **Problem Interface**: Description, input/output examples, constraints, collapsible hints (`<details>` zero-JS accordion), multi-language Monaco editor (JavaScript & Python), Run vs Submit flows.
- **Social & Hangout Roadmap**:
  - Custom hangout rooms with shareable private invite links.
  - Collaborative whiteboards ([Excalidraw](https://excalidraw.com/) / [tldraw](https://tldraw.dev/)).
  - Background lo-fi ambient audio player.
  - Google Meet / Discord voice channel links for pair programming.
  - Friendly contest countdown timers.

### 3.2 [`GEMINI.md`](file:///home/aman-sharma/Desktop/vibe-code/GEMINI.md) (Repository Architecture & Findings)
- Documented full database schema (`Problem`, `TestCase`, `Hint`, `User`, `Submission`, `Draft`).
- API endpoint contracts (`POST /api/run`, `POST /api/submit`, `GET /api/user/solved`, `GET/PUT /api/draft`).
- Detailed analysis of the local `child_process` execution model vs Dockerized Piston container.

### 3.3 [`fixes.md`](file:///home/aman-sharma/Desktop/vibe-code/fixes.md) (Prioritized Technical Improvements)
Detailed technical blueprints for upcoming refactors:
- **P0 — Security**: Migrate `src/lib/piston.ts` from host `child_process.execFile` to Piston Docker REST API (`POST http://localhost:2000/api/v2/execute`) to enforce sandboxed cgroups, memory limits, and isolated execution.
- **P0 — Driver Correctness**: Intercept `console.log()` and `print()` in test harness wrappers to prevent user debug logs from corrupting stdout JSON results and crashing `JSON.parse`.
- **P1 — Workspace UX**: Add problem search bar, difficulty chips, and topic tag filters in `ProblemsList.tsx`; add "Reset to Starter Code" button in editor toolbar.
- **P1 — API Hardening**: Add Zod validation schemas for `/api/run`, `/api/submit`, and `/api/draft`.
- **P2 — Feedback & Testing**: Add runtime (ms) and memory tracking metrics; implement custom test case playground tab; build submission history viewer.
- **P3 — Social Features**: Implement WebSocket rooms, Excalidraw whiteboard tab, and lo-fi audio player.

---

## 4. Key Files & Repository Map

```
vibe-code/
├── docker-compose.yml          # PostgreSQL (:5433) + Piston (:2000)
├── scripts/
│   └── setup-piston.sh         # Installs Node.js 18.15.0 & Python 3.10.0 into Piston
├── prisma/
│   ├── schema.prisma           # Prisma schema definition
│   └── seed.ts                 # 10 seeded DSA problems with test cases & hints
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with Geist font & ThemeProvider
│   │   ├── page.tsx            # Home page (fetches problem list via Prisma)
│   │   ├── problems/[slug]/
│   │   │   └── page.tsx        # Problem page with split workspace
│   │   └── api/
│   │       ├── run/route.ts    # POST: non-persistent test runner
│   │       ├── submit/route.ts # POST: persistent test evaluation & user submission
│   │       ├── draft/route.ts  # GET/PUT: code autosave draft sync
│   │       └── user/solved/
│   │           └── route.ts    # GET: returns array of solved problem IDs
│   ├── components/
│   │   ├── ProblemsList.tsx    # Problem cards grid with solved status
│   │   ├── ProblemCard.tsx     # Problem card component
│   │   ├── ProblemWorkspace.tsx# Monaco editor, run/submit actions & autosave
│   │   ├── ResizableLayout.tsx # Drag-to-resize split panels
│   │   ├── TestResults.tsx     # Test case visualizer
│   │   ├── DifficultyBadge.tsx # Gamified badge styling
│   │   └── ThemeToggle.tsx     # Theme switcher
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton (@prisma/adapter-pg)
│   │   ├── piston.ts           # Code execution driver & process runner
│   │   ├── messages.ts         # Slang message generator for submit feedback
│   │   └── utils.ts            # clsx + tailwind-merge helper
│   └── types/
│       └── index.ts            # TypeScript interfaces & API types
```

---

## 5. Development Guidelines & Conventions

1. **UI Layer Separation**: Keep presentation strictly separated from data fetching. UI components receive typed props; server components and API routes handle data access.
2. **Next.js 16 Rules**: Heed breaking changes in Next.js 16 (e.g. async params handling `const { slug } = await params`).
3. **Atomic Commits**: Make single-purpose, atomic git commits for each feature, fix, or schema change.
4. **Prisma Generation**: Run `npx prisma generate` after modifying `prisma/schema.prisma` (client outputs to `src/generated/prisma`).

---

## 6. Activity & Change History

- **Session 1**:
  - Explored and mapped the codebase architecture.
  - Authored [**`GEMINI.md`**](file:///home/aman-sharma/Desktop/vibe-code/GEMINI.md) documenting repository findings, sandbox setup, data models, and API contracts.
  - Authored [**`fixes.md`**](file:///home/aman-sharma/Desktop/vibe-code/fixes.md) detailing prioritized improvements across security, execution driver, UX, APIs, and multiplayer features.
  - Created [**`memory.md`**](file:///home/aman-sharma/Desktop/vibe-code/memory.md) to preserve project knowledge, roadmap status, and architectural context for future sessions.
