# vibe-code — Recommended Improvements & Technical Fixes

This document outlines prioritized architectural, security, correctness, and user experience enhancements for the **vibe-code** platform, along with detailed explanations and implementation blueprints for each fix.

---

## Table of Contents

1. [Security &amp; Sandbox Isolation](#1-security--sandbox-isolation)
   - [Fix 1.1: Delegate Code Execution to Piston HTTP API](#fix-11-delegate-code-execution-to-piston-http-api)
   - [Fix 1.2: API Rate Limiting &amp; Execution Safeguards](#fix-12-api-rate-limiting--execution-safeguards)
2. [Execution Engine &amp; Driver Correctness](#2-execution-engine--driver-correctness)
   - [Fix 2.1: Isolate User `console.log()` / `print()` from Driver Results](#fix-21-isolate-user-consolelog--print-from-driver-results)
   - [Fix 2.2: Capture Performance Metrics (Runtime &amp; Memory)](#fix-22-capture-performance-metrics-runtime--memory)
   - [Fix 2.3: Support for Complex DSA Types (Trees, Linked Lists, Graphs)](#fix-23-support-for-complex-dsa-types-trees-linked-lists-graphs)
3. [Workspace &amp; Frontend UX Enhancements](#3-workspace--frontend-ux-enhancements)
   - [Fix 3.1: Problem Search, Difficulty &amp; Category Filters](#fix-31-problem-search-difficulty--category-filters)
   - [Fix 3.2: Custom Test Case Playground](#fix-32-custom-test-case-playground)
   - [Fix 3.3: Revert / Reset to Starter Code Action](#fix-33-revert--reset-to-starter-code-action)
   - [Fix 3.4: Submission History &amp; Past Attempts Drawer](#fix-34-submission-history--past-attempts-drawer)
4. [Backend, API &amp; Data Integrity](#4-backend-api--data-integrity)
   - [Fix 4.1: Request Validation with Zod](#fix-41-request-validation-with-zod)
   - [Fix 4.2: Eliminate Solved Badges Layout Shift](#fix-42-eliminate-solved-badges-layout-shift)
5. [Roadmap: Real-Time Multiplayer &amp; Hangout Features](#5-roadmap-real-time-multiplayer--hangout-features)
   - [Fix 5.1: Live Collaborative Hangout Rooms](#fix-51-live-collaborative-hangout-rooms)
   - [Fix 5.2: Embedded Whiteboard (Excalidraw / tldraw)](#fix-52-embedded-whiteboard-excalidraw--tldraw)
   - [Fix 5.3: Lo-Fi Background Audio Player](#fix-53-lo-fi-background-audio-player)

---

## 1. Security & Sandbox Isolation

### Fix 1.1: Delegate Code Execution to Piston HTTP API

#### 🔴 The Problem

In [`src/lib/piston.ts`](file:///home/aman-sharma/Desktop/vibe-code/src/lib/piston.ts), code execution is currently performed using `child_process.execFile` on the **host machine**. Although a Piston container is defined in [`docker-compose.yml`](file:///home/aman-sharma/Desktop/vibe-code/docker-compose.yml), it is not used by the backend.

```
[Current Insecure Architecture]
User Submits Code ──> Next.js API ──> Host child_process (Runs on actual server OS!) ⚠️
```

**Security Vulnerabilities**:

- Untrusted code can access environment variables (`DATABASE_URL`, API keys).
- User code can perform file operations (`fs.rmdirSync`, `os.system("rm -rf /")`).
- Malicious payloads can spawn fork bombs or execute arbitrary shell commands directly on the server.

#### 🟢 The Solution

Route execution through Piston's HTTP REST API (`http://localhost:2000/api/v2/execute`), which executes inside an isolated Docker container with strict cgroups, unprivileged user permissions, tmpfs mounts, memory caps, and process limits (`nproc: 512`, `nofile: 65536`).

```
[Target Secure Architecture]
User Code ──> Next.js API ──> POST http://localhost:2000/api/v2/execute ──> Piston Container (Sandboxed cgroups) ✅
```

#### 🛠️ Implementation Blueprint

Refactor `executeCode` in `src/lib/piston.ts` to call Piston:

```typescript
// src/lib/piston.ts
const PISTON_URL = process.env.PISTON_URL || "http://localhost:2000";

interface PistonExecuteResponse {
  run: {
    stdout: string;
    stderr: string;
    output: string;
    code: number;
    signal: string | null;
  };
}

export async function executeCodeInPiston(
  language: "javascript" | "python",
  code: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const languageKey = language === "javascript" ? "javascript" : "python";
  const version = language === "javascript" ? "18.15.0" : "3.10.0";

  const res = await fetch(`${PISTON_URL}/api/v2/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: languageKey,
      version: version,
      files: [{ content: code }],
      run_timeout: 5000,
      compile_timeout: 5000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Piston execution failed: ${res.statusText}`);
  }

  const data: PistonExecuteResponse = await res.json();
  return {
    stdout: data.run.stdout,
    stderr: data.run.stderr,
    exitCode: data.run.code,
  };
}
```

---

### Fix 1.2: API Rate Limiting & Execution Safeguards

#### 🔴 The Problem

The `/api/run` and `/api/submit` endpoints have no rate limiting. An automated script or spamming client can saturate server CPU and sandbox worker queues.

#### 🟢 The Solution

Implement rate-limiting middleware using an in-memory sliding window or Redis token bucket (e.g. `@upstash/ratelimit` or a local LRU cache) keyed by client IP or `userUuid`.

* Limit `POST /api/run` to 15 requests per minute per IP.
* Limit `POST /api/submit` to 5 requests per minute per IP.

---

## 2. Execution Engine & Driver Correctness

### Fix 2.1: Isolate User `console.log()` / `print()` from Driver Results

#### 🔴 The Problem

In the current driver generator ([`src/lib/piston.ts#L33`](file:///home/aman-sharma/Desktop/vibe-code/src/lib/piston.ts#L33)), the driver writes JSON results directly to standard output:

```javascript
process.stdout.write(JSON.stringify(__results));
```

If a user writes `console.log("val:", x)` inside their solution, `stdout` becomes:

```
val: 4
[{"passed":true,"input":[...],"output":4}]
```

When the API attempts `JSON.parse(stdout)`, parsing fails with `"Could not parse output"`, incorrectly failing valid user code just because they printed debug statements.

#### 🟢 The Solution

1. **JavaScript**: Intercept `console.log` during test execution to capture user logs into a separate buffer, or write the test results with a unique boundary delimiter (e.g. `__VIBE_RESULT_START__`).
2. **Python**: Intercept `sys.stdout` or print results with a structured delimiter.
3. Expose user logs in the response object (`userLogs`) and render them in a dedicated **Console / Logs** tab in the test results panel.

```javascript
// Driver snippet with delimiter and log interception:
const __logs = [];
const __originalLog = console.log;
console.log = (...args) => {
  __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

// ... run tests ...

console.log = __originalLog;
process.stdout.write("__VIBE_OUTPUT_START__" + JSON.stringify({ results: __results, logs: __logs }) + "__VIBE_OUTPUT_END__");
```

---

### Fix 2.2: Capture Performance Metrics (Runtime & Memory)

#### 🔴 The Problem

Submissions currently only return a boolean `passed` status and pass/fail counts. Users receive no feedback regarding their solution's time complexity or execution speed.

#### 🟢 The Solution

1. Measure execution wall-clock time in milliseconds using `process.hrtime.bigint()` or Piston's runtime metrics.
2. Return `runtimeMs` and memory metrics in the `SubmitResponse` payload.
3. Display performance badges (e.g. `⚡ 54 ms runtime`) in [`src/components/TestResults.tsx`](file:///home/aman-sharma/Desktop/vibe-code/src/components/TestResults.tsx).

---

### Fix 2.3: Support for Complex DSA Types (Trees, Linked Lists, Graphs)

#### 🔴 The Problem

Currently, inputs and outputs are parsed directly as plain JSON objects or arrays (`...tc.input`). This restricts problems to basic arrays and strings. Classic DSA problems involving:

- **Singly Linked Lists** (`class ListNode`)
- **Binary Trees** (`class TreeNode`)
- **Graphs** / **Adjacency Lists**

cannot be evaluated without custom serializer and deserializer helpers in the test harness.

#### 🟢 The Solution

Embed helper class definitions and conversion utilities inside the driver generation template:

```javascript
// Example Linked List Helper in JS Driver:
class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}
function arrayToListNode(arr) {
  let dummy = new ListNode(0);
  let curr = dummy;
  for (const v of arr) {
    curr.next = new ListNode(v);
    curr = curr.next;
  }
  return dummy.next;
}
function listNodeToArray(head) {
  const res = [];
  while (head) {
    res.push(head.val);
    head = head.next;
  }
  return res;
}
```

---

## 3. Workspace & Frontend UX Enhancements

### Fix 3.1: Problem Search, Difficulty & Category Filters

#### 🔴 The Problem

[`src/components/ProblemsList.tsx`](file:///home/aman-sharma/Desktop/vibe-code/src/components/ProblemsList.tsx) currently renders all seeded problems in an unfiltered list. As the problem set grows, finding specific problems or filtering by topic is difficult.

#### 🟢 The Solution

Add an interactive filter bar above the problems grid:

- **Search Bar**: Instant client-side search filtering by problem title and tags.
- **Difficulty Multi-Select / Tabs**: `All`, `Beginner`, `Amateur`, `Semi-Pro`, `Professional`, `Legendary`.
- **Topic Filter Pills**: `Array`, `String`, `Hash Map`, `Two Pointers`, `Dynamic Programming`, etc.
- **Status Filter**: `All`, `Solved`, `Unsolved`.

---

### Fix 3.2: Custom Test Case Playground

#### 🔴 The Problem

Users can only test their code against the predefined visible test cases. They cannot test custom edge cases without submitting.

#### 🟢 The Solution

Add a **"Custom Testcase"** tab next to the Test Results panel in [`ProblemWorkspace.tsx`](file:///home/aman-sharma/Desktop/vibe-code/src/components/ProblemWorkspace.tsx):

- Text area allowing users to enter custom input arguments (e.g. `[1, 2, 3], 5`).
- A **"Run Custom"** button that evaluates the user's code against their custom input and displays the returned output.

---

### Fix 3.3: Revert / Reset to Starter Code Action

#### 🔴 The Problem

If a user edits their code, the changes are immediately saved to `localStorage` and the database. If they want to discard modifications and start over with the default starter template, they have to manually delete their code or clear browser storage.

#### 🟢 The Solution

Add a **Reset** button (`RotateCcw` icon from `lucide-react`) in the editor toolbar:

- Prompts a confirmation dialog: *"Reset code to the default starter template?"*
- Resets the editor content back to `problem.starterJs` or `problem.starterPy`.
- Clears the draft cache in `localStorage` and updates the database draft.

---

### Fix 3.4: Submission History & Past Attempts Drawer

#### 🔴 The Problem

The `Submission` table records every submission with code, timestamp, and pass status. However, there is no interface for users to inspect their previous submissions or review earlier solutions.

#### 🟢 The Solution

Add a **Submissions** tab to the problem description panel:

- Lists previous submissions: timestamp, language, passed/failed status, and runtime.
- Clicking a past submission opens a read-only modal/diff view displaying the code used in that attempt with a *"Restore Code"* button.

---

## 4. Backend, API & Data Integrity

### Fix 4.1: Request Validation with Zod

#### 🔴 The Problem

API routes currently use manual `if (!problemId || !language)` checks without type or format validation.

#### 🟢 The Solution

Use `zod` schemas to validate incoming payloads and return structured `400 Bad Request` responses:

```typescript
import { z } from "zod";

export const RunRequestSchema = z.object({
  problemId: z.string().cuid(),
  language: z.enum(["javascript", "python"]),
  code: z.string().min(1).max(50000),
});

export const SubmitRequestSchema = RunRequestSchema.extend({
  userUuid: z.string().uuid(),
});
```

---

### Fix 4.2: Eliminate Solved Badges Layout Shift

#### 🔴 The Problem

On the home page, solved problem IDs are fetched asynchronously inside a client-side `useEffect` in [`ProblemsList.tsx`](file:///home/aman-sharma/Desktop/vibe-code/src/components/ProblemsList.tsx#L13). This causes green checkmark badges to pop in noticeably after the page renders.

#### 🟢 The Solution

1. Cache solved problem IDs in `localStorage` (`vibe_solved_ids`) and initialize state directly from storage on the client.
2. Alternatively, store the anonymous `uuid` in an HTTP cookie so that Next.js Server Components can query solved statuses directly in `src/app/page.tsx` during initial SSR.

---

## 5. Roadmap: Real-Time Multiplayer & Hangout Features

The original vision outlined in [`PLAN.md`](file:///home/aman-sharma/Desktop/vibe-code/PLAN.md) is to build a Discord-inspired chill coding hangout. The following features will bring this vision to life:

### Fix 5.1: Live Collaborative Hangout Rooms

- **Architecture**: Use WebSockets (PartyKit, Liveblocks, or Socket.io) to support multiplayer rooms.
- **Features**:
  - Shareable room links (`/rooms/[roomId]`).
  - Synced problem selection and live collaborative code editing (Yjs + Monaco).
  - Room participant list with custom nicknames and avatars.
  - Optional Google Meet / Discord voice channel invite link button in the room header.

### Fix 5.2: Embedded Whiteboard (Excalidraw / tldraw)

- Add a **Whiteboard** tab alongside the Problem Description and Code Editor.
- Embed [`@excalidraw/excalidraw`](https://www.npmjs.com/package/@excalidraw/excalidraw) or [`tldraw`](https://tldraw.dev/) to allow users to diagram algorithm flows, pointers, and data structures while coding.

### Fix 5.3: Lo-Fi Background Audio Player

- Add a minimalist floating audio player in the navigation bar.
- Provide curated, copyright-free lo-fi chill hop streams and volume controls with ambient background sounds (rain, cafe, vinyl crackle).

---

## Priority & Implementation Roadmap

| Priority     | Item                                                                      | Impact                          | Complexity |
| ------------ | ------------------------------------------------------------------------- | ------------------------------- | ---------- |
| **P0** | **Fix 1.1: Delegate Code Execution to Piston HTTP API**             | 🔒 Security & Sandbox Isolation | Medium     |
| **P0** | **Fix 2.1: Isolate `console.log` / `print` from Driver Output** | 🐛 Prevents parser crashes      | Low        |
| **P1** | **Fix 3.1: Problem Search & Category/Difficulty Filters**           | 🎨 Navigation & Discoverability | Low        |
| **P1** | **Fix 3.3: Reset to Starter Code Button**                           | ⚡ UX Convenience               | Low        |
| **P1** | **Fix 4.1: Request Validation with Zod**                            | 🛡️ API Hardening              | Low        |
| **P2** | **Fix 2.2: Capture Performance Metrics (Runtime / Memory)**         | 📊 Feedback & Gamification      | Medium     |
| **P2** | **Fix 3.2: Custom Test Case Playground**                            | 🛠️ Testing Flexibility        | Medium     |
| **P2** | **Fix 3.4: Submission History Viewer**                              | 📜 User Progression             | Medium     |
| **P3** | **Fix 5.1 - 5.3: Collaborative Rooms, Whiteboard & Audio**          | 🚀 Multiplayer & Hangout Vision | High       |
