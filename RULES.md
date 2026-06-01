# Agent Rules

Rules that must be followed when generating responses or making changes to this codebase.

---

## 1. UI layer must be swappable

Keep data/logic and presentation strictly separated:
- Business logic, data fetching, and API calls live in server components, lib utilities, and API routes — never inline in UI components.
- UI components receive typed props only; they do not import `prisma`, call `fetch`, or contain business rules.
- Do not hardcode colours, spacing, or design tokens inside component logic — keep them in className strings so the entire visual layer can be swapped without touching data flow.
- When building a new feature, build the data layer (schema, API route, lib function) first and separately from the component that renders it.

## 2. Consult CLAUDE.md for project context

Before writing any code, check [CLAUDE.md](CLAUDE.md) for:
- Exact package versions and known breaking-change warnings (especially Next.js 16 and Prisma 7).
- The code execution architecture (local `child_process`, not Piston HTTP).
- DB schema, API contracts, and conventions already established.

Do not assume behaviour from prior training data when the project's actual version may differ.

## 3. Commit atomically as you go

Each logical unit of work gets its own commit before moving to the next. Examples of commit boundaries:
- Added/modified DB schema + migration
- Wired up a new API route
- Added a new lib utility (e.g. execution helper, message pool)
- Built or edited a single component
- Updated seed data

Do not batch multiple unrelated changes into one commit. Commit messages should say what was done in one short line (e.g. `add /api/hints route`, `update TestCase schema with isHidden flag`).

