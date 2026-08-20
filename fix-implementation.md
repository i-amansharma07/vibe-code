# Implementation Plan — Fix 1.1: Delegate Code Execution to Piston HTTP API

This document provides a comprehensive, step-by-step implementation guide to migrate the **vibe-code** execution engine from direct host process execution (`child_process.execFile`) to the sandboxed **Piston HTTP API** running in Docker.

---

## Table of Contents

- [Overview &amp; Objectives](#overview--objectives)
- [Architecture Comparison](#architecture-comparison)
- [Section 1: Environment &amp; Infrastructure Configuration](#section-1-environment--infrastructure-configuration)
  - [1.1 Environment Variable Configuration (`.env`, `.env.example`)](#11-environment-variable-configuration-env-envexample)
  - [1.2 Docker Compose Service Verification (`docker-compose.yml`)](#12-docker-compose-service-verification-docker-composeyml)
  - [1.3 Piston Runtime Initialization (`scripts/setup-piston.sh`)](#13-piston-runtime-initialization-scriptssetup-pistonsh)
- [Section 2: Execution Engine Refactoring (`src/lib/piston.ts`)](#section-2-execution-engine-refactoring-srclibpistonts)
  - [2.1 Remove Host Process &amp; Temp File Dependencies](#21-remove-host-process--temp-file-dependencies)
  - [2.2 Define Piston API Request &amp; Response Types](#22-define-piston-api-request--response-types)
  - [2.3 Implement the Piston HTTP Client (`executeInPiston`)](#23-implement-the-piston-http-client-executeinpiston)
  - [2.4 Driver Generators (`buildJsDriver`, `buildPyDriver`)](#24-driver-generators-buildjsdriver-buildpydriver)
  - [2.5 Error Formatting &amp; Stack Sanitization (`cleanErrorMessage`)](#25-error-formatting--stack-sanitization-cleanerrormessage)
  - [2.6 Core Orchestrator Refactor (`executeCode`)](#26-core-orchestrator-refactor-executecode)
  - [2.7 Complete Code Reference for `src/lib/piston.ts`](#27-complete-code-reference-for-srclibpistonts)
- [Section 3: API Route Compatibility &amp; Resilience](#section-3-api-route-compatibility--resilience)
  - [3.1 Run Endpoint Verification (`src/app/api/run/route.ts`)](#31-run-endpoint-verification-srcappapirunroutets)
  - [3.2 Submit Endpoint Verification (`src/app/api/submit/route.ts`)](#32-submit-endpoint-verification-srcappapisubmitroutets)
- [Section 4: Verification &amp; Testing Workflow](#section-4-verification--testing-workflow)
  - [4.1 Starting Services &amp; Installing Runtimes](#41-starting-services--installing-runtimes)
  - [4.2 Verifying Piston Health &amp; Runtimes](#42-verifying-piston-health--runtimes)
  - [4.3 End-to-End Test Scenarios](#43-end-to-end-test-scenarios)
  - [4.4 Security Isolation Verification](#44-security-isolation-verification)
- [Section 5: Failure Modes &amp; Troubleshooting](#section-5-failure-modes--troubleshooting)
  - [5.1 Connection Refused / Piston Down](#51-connection-refused--piston-down)
  - [5.2 Runtime Not Installed](#52-runtime-not-installed)
  - [5.3 Infinite Loops &amp; Timeouts](#53-infinite-loops--timeouts)
  - [5.4 Large Output / Memory Limit Exceeded](#54-large-output--memory-limit-exceeded)

---

## Overview & Objectives

### The Problem

Currently, [`src/lib/piston.ts`](file:///home/aman-sharma/Desktop/vibe-code/src/lib/piston.ts) executes user code using Node's `child_process.execFile` on the host machine. This poses severe security risks:

- User code can inspect host environment variables (`DATABASE_URL`, secrets).
- User code can perform arbitrary file system reads/writes or execute shell commands.
- Host processes can hang or consume unbounded host resources.

### The Objective

Migrate the execution flow to send execution payloads via HTTP `fetch` to the containerized Piston service running at `http://localhost:2000/api/v2/execute`. This confines execution within an isolated Docker container with strict memory limits, cgroups, `tmpfs`, and unprivileged execution.

---

## Architecture Comparison

### Before (Insecure Host Execution)

```
User Code ──> Next.js API (/api/run or /api/submit)
                   │
                   ▼
              src/lib/piston.ts
                   │
                   ├── Writes temp file to os.tmpdir() (/tmp/vibe-exec-*.js)
                   ├── child_process.execFile("node" | "python3") (Runs on HOST OS!) ⚠️
                   └── Unlinks temp file
```

### After (Sandboxed Piston HTTP Execution)

```
User Code ──> Next.js API (/api/run or /api/submit)
                   │
                   ▼
              src/lib/piston.ts
                   │
                   ├── Generates in-memory driver script (No host temp files)
                   ├── POST http://localhost:2000/api/v2/execute
                   │         │
                   │         ▼
                   │    Piston Container (cgroups, tmpfs, unprivileged user, ulimits) 🔒
                   │         │
                   │    Returns { run: { stdout, stderr, code, signal } }
                   │
                   └── Parses JSON results & sanitizes line numbers for user feedback
```

---

## Section 1: Environment & Infrastructure Configuration

### 1.1 Environment Variable Configuration (`.env`, `.env.example`)

#### File: [`.env`](file:///home/aman-sharma/Desktop/vibe-code/.env) and [`.env.example`](file:///home/aman-sharma/Desktop/vibe-code/.env.example)

Ensure the `PISTON_URL` environment variable is defined:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/vibecode"
PISTON_URL="http://localhost:2000"
```

- **Default value**: `http://localhost:2000`
- **In production / docker network**: If Next.js runs inside Docker, this can be set to `http://piston:2000`.

---

### 1.2 Docker Compose Service Verification (`docker-compose.yml`)

#### File: [`docker-compose.yml`](file:///home/aman-sharma/Desktop/vibe-code/docker-compose.yml)

Verify that the `piston` service is defined with proper limits:

```yaml
  piston:
    image: ghcr.io/engineer-man/piston
    container_name: vibe-code-piston
    ports:
      - "2000:2000"
    volumes:
      - piston_data:/piston
    tmpfs:
      - /tmp:exec,size=512m
    ulimits:
      nproc: 512
      nofile:
        soft: 65536
        hard: 65536
```

- **Port mapping**: `2000:2000` allows the host Next.js dev server to communicate with Piston over `http://localhost:2000`.
- **tmpfs**: Mounts `/tmp` with `512MB` limit and execution permissions.
- **ulimits**: Prevents fork bombs by capping `nproc` at 512.

---

### 1.3 Piston Runtime Initialization (`scripts/setup-piston.sh`)

#### File: [`scripts/setup-piston.sh`](file:///home/aman-sharma/Desktop/vibe-code/scripts/setup-piston.sh)

Ensure the script installs the required language packages inside the container:

```bash
#!/bin/bash
set -e

echo "⏳ Waiting for Piston to be ready..."
until curl -s http://localhost:2000/api/v2/runtimes > /dev/null 2>&1; do
  sleep 2
done

echo "📦 Installing Python 3.10.0..."
docker exec vibe-code-piston piston ppman install python=3.10.0

echo "📦 Installing Node.js 18.15.0 (javascript)..."
docker exec vibe-code-piston piston ppman install javascript=18.15.0

echo ""
echo "✅ Piston runtimes installed!"
echo "   Run: curl http://localhost:2000/api/v2/runtimes to verify."
```

---

## Section 2: Execution Engine Refactoring (`src/lib/piston.ts`)

### 2.1 Remove Host Process & Temp File Dependencies

In [`src/lib/piston.ts`](file:///home/aman-sharma/Desktop/vibe-code/src/lib/piston.ts):

- Remove `import { execFile } from "child_process";`
- Remove `import { writeFile, unlink } from "fs/promises";`
- Remove `import { tmpdir } from "os";`
- Remove `import { join } from "path";`
- Remove `import { promisify } from "util";`
- Remove `const NVM_NODE = ...` and the `checkFile` helper.

### 2.2 Define Piston API Request & Response Types

Define typed interfaces matching Piston's `/api/v2/execute` endpoint contract:

```typescript
interface PistonFile {
  name?: string;
  content: string;
  encoding?: string;
}

interface PistonExecuteRequest {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonStageResult {
  stdout: string;
  stderr: string;
  output: string;
  code: number;
  signal: string | null;
}

interface PistonExecuteResponse {
  language: string;
  version: string;
  run: PistonStageResult;
  compile?: PistonStageResult;
}
```

### 2.3 Implement the Piston HTTP Client (`executeInPiston`)

Create a helper function to communicate with Piston over HTTP:

```typescript
const PISTON_URL = process.env.PISTON_URL || "http://localhost:2000";

const RUNTIME_CONFIG = {
  javascript: {
    language: "javascript",
    version: "18.15.0",
    filename: "index.js",
  },
  python: {
    language: "python",
    version: "3.10.0",
    filename: "main.py",
  },
} as const;

async function executeInPiston(
  language: "javascript" | "python",
  code: string
): Promise<{ stdout: string; stderr: string; exitCode: number; signal: string | null }> {
  const config = RUNTIME_CONFIG[language];

  const payload: PistonExecuteRequest = {
    language: config.language,
    version: config.version,
    files: [{ name: config.filename, content: code }],
    run_timeout: 5000,
    compile_timeout: 5000,
  };

  let res: Response;
  try {
    res = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(
      `Failed to reach Piston execution service at ${PISTON_URL}. Is Docker running? (${error instanceof Error ? error.message : "Network error"})`
    );
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Piston API error (${res.status} ${res.statusText}): ${errorText}`);
  }

  const data: PistonExecuteResponse = await res.json();

  // If compilation failed (or syntax check failed in compile stage)
  if (data.compile && data.compile.code !== 0) {
    return {
      stdout: data.compile.stdout || "",
      stderr: data.compile.stderr || data.compile.output || "Compilation error",
      exitCode: data.compile.code,
      signal: data.compile.signal,
    };
  }

  return {
    stdout: data.run.stdout || "",
    stderr: data.run.stderr || "",
    exitCode: data.run.code,
    signal: data.run.signal,
  };
}
```

### 2.4 Driver Generators (`buildJsDriver`, `buildPyDriver`)

The driver generation stays in memory without touching the local disk.

- **JavaScript Driver**: Wraps user code and evaluates each test case using `fnName(...__tc.input)`.
- **Python Driver**: Imports `json` and `sys`, and evaluates each test case using `fnName(*__tc["input"])`.

```typescript
function buildJsDriver(
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[]
): string {
  const testData = JSON.stringify(testCases);
  return `
${userCode}

const __testCases = ${testData};
const __results = __testCases.map(__tc => {
  try {
    const __output = ${fnName}(...__tc.input);
    const __passed = JSON.stringify(__output) === JSON.stringify(__tc.expected);
    return { passed: __passed, input: __tc.input, expected: __tc.expected, output: __output };
  } catch (__e) {
    return { passed: false, input: __tc.input, expected: __tc.expected, output: null, error: __e.message };
  }
});
process.stdout.write(JSON.stringify(__results));
`;
}

function buildPyDriver(
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[]
): string {
  const testData = JSON.stringify(testCases);
  return `
import json as __json, sys as __sys

${userCode}

__test_cases = ${testData}
__results = []
for __tc in __test_cases:
    try:
        __output = ${fnName}(*__tc["input"])
        __passed = __output == __tc["expected"]
        __results.append({"passed": __passed, "input": __tc["input"], "expected": __tc["expected"], "output": __output})
    except Exception as __e:
        __results.append({"passed": False, "input": __tc["input"], "expected": __tc["expected"], "output": None, "error": str(__e)})

__sys.stdout.write(__json.dumps(__results))
`;
}
```

### 2.5 Error Formatting & Stack Sanitization (`cleanErrorMessage`)

Ensure line numbers reported to the user in stderr correspond accurately to their code lines:

- For JS, line offset is `1` (empty line before user code).
- For Python, line offset is `3` (`import json as __json, sys as __sys` + newline).

```typescript
function cleanErrorMessage(
  stderr: string,
  language: "javascript" | "python",
  userCodeLineOffset: number
): string {
  const lines = stderr.trim().split("\n");

  if (language === "javascript") {
    let lineNum: number | null = null;
    for (const line of lines) {
      const m = line.match(/^.*\.js:(\d+)(?::\d+)?$/);
      if (m) {
        const adjusted = parseInt(m[1]) - userCodeLineOffset;
        if (adjusted > 0) lineNum = adjusted;
        break;
      }
    }
    const errorLine = lines.find((l) => /^\w+Error:/.test(l.trim()));
    if (errorLine) {
      const msg = errorLine.trim();
      return lineNum ? `${msg} (line ${lineNum})` : msg;
    }
    const meaningful = lines
      .filter((l) => l.trim() && !/^\s+at\s/.test(l))
      .slice(0, 4)
      .join("\n");
    return meaningful || stderr.trim();
  } else {
    let lineNum: number | null = null;
    for (const line of lines) {
      const m = line.match(/File ".*", line (\d+)/);
      if (m) {
        const adjusted = parseInt(m[1]) - userCodeLineOffset;
        if (adjusted > 0) lineNum = adjusted;
        break;
      }
    }
    const errorLine = [...lines].reverse().find((l) => l.trim() && !/^\s/.test(l));
    if (errorLine) {
      const msg = errorLine.trim();
      return lineNum ? `${msg} (line ${lineNum})` : msg;
    }
    return stderr.trim();
  }
}
```

### 2.6 Core Orchestrator Refactor (`executeCode`)

The main entry point now builds the driver, sends the request to `executeInPiston`, handles timeouts/signals, and formats test results:

```typescript
export async function executeCode(
  language: "javascript" | "python",
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[]
): Promise<{
  results: {
    passed: boolean;
    input: unknown[];
    expected: unknown;
    output: unknown;
    error?: string;
  }[];
}> {
  const isJs = language === "javascript";
  const fullCode = isJs
    ? buildJsDriver(userCode, fnName, testCases)
    : buildPyDriver(userCode, fnName, testCases);

  const { stdout, stderr, signal } = await executeInPiston(language, fullCode);

  // Check for timeout / SIGKILL from Piston
  if (signal === "SIGKILL" || signal === "SIGTERM") {
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: "Execution Timed Out (Time Limit Exceeded)",
      })),
    };
  }

  // Check for syntax or runtime error in stderr
  if (stderr && !stdout) {
    const lineOffset = isJs ? 1 : 3;
    const errorMsg = cleanErrorMessage(stderr, language, lineOffset);
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: errorMsg,
      })),
    };
  }

  // Parse JSON results from stdout
  try {
    const results = JSON.parse(stdout || "[]");
    return { results };
  } catch {
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: stderr ? cleanErrorMessage(stderr, language, isJs ? 1 : 3) : "Could not parse output",
      })),
    };
  }
}
```

---

### 2.7 Complete Code Reference for `src/lib/piston.ts`

```typescript
// src/lib/piston.ts

const PISTON_URL = process.env.PISTON_URL || "http://localhost:2000";

const RUNTIME_CONFIG = {
  javascript: {
    language: "javascript",
    version: "18.15.0",
    filename: "index.js",
  },
  python: {
    language: "python",
    version: "3.10.0",
    filename: "main.py",
  },
} as const;

interface PistonFile {
  name?: string;
  content: string;
  encoding?: string;
}

interface PistonExecuteRequest {
  language: string;
  version: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonStageResult {
  stdout: string;
  stderr: string;
  output: string;
  code: number;
  signal: string | null;
}

interface PistonExecuteResponse {
  language: string;
  version: string;
  run: PistonStageResult;
  compile?: PistonStageResult;
}

function buildJsDriver(
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[]
): string {
  const testData = JSON.stringify(testCases);
  return `
${userCode}

const __testCases = ${testData};
const __results = __testCases.map(__tc => {
  try {
    const __output = ${fnName}(...__tc.input);
    const __passed = JSON.stringify(__output) === JSON.stringify(__tc.expected);
    return { passed: __passed, input: __tc.input, expected: __tc.expected, output: __output };
  } catch (__e) {
    return { passed: false, input: __tc.input, expected: __tc.expected, output: null, error: __e.message };
  }
});
process.stdout.write(JSON.stringify(__results));
`;
}

function buildPyDriver(
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[]
): string {
  const testData = JSON.stringify(testCases);
  return `
import json as __json, sys as __sys

${userCode}

__test_cases = ${testData}
__results = []
for __tc in __test_cases:
    try:
        __output = ${fnName}(*__tc["input"])
        __passed = __output == __tc["expected"]
        __results.append({"passed": __passed, "input": __tc["input"], "expected": __tc["expected"], "output": __output})
    except Exception as __e:
        __results.append({"passed": False, "input": __tc["input"], "expected": __tc["expected"], "output": None, "error": str(__e)})

__sys.stdout.write(__json.dumps(__results))
`;
}

function cleanErrorMessage(
  stderr: string,
  language: "javascript" | "python",
  userCodeLineOffset: number
): string {
  const lines = stderr.trim().split("\n");

  if (language === "javascript") {
    let lineNum: number | null = null;
    for (const line of lines) {
      const m = line.match(/^.*\.js:(\d+)(?::\d+)?$/);
      if (m) {
        const adjusted = parseInt(m[1]) - userCodeLineOffset;
        if (adjusted > 0) lineNum = adjusted;
        break;
      }
    }
    const errorLine = lines.find((l) => /^\w+Error:/.test(l.trim()));
    if (errorLine) {
      const msg = errorLine.trim();
      return lineNum ? `${msg} (line ${lineNum})` : msg;
    }
    const meaningful = lines
      .filter((l) => l.trim() && !/^\s+at\s/.test(l))
      .slice(0, 4)
      .join("\n");
    return meaningful || stderr.trim();
  } else {
    let lineNum: number | null = null;
    for (const line of lines) {
      const m = line.match(/File ".*", line (\d+)/);
      if (m) {
        const adjusted = parseInt(m[1]) - userCodeLineOffset;
        if (adjusted > 0) lineNum = adjusted;
        break;
      }
    }
    const errorLine = [...lines].reverse().find((l) => l.trim() && !/^\s/.test(l));
    if (errorLine) {
      const msg = errorLine.trim();
      return lineNum ? `${msg} (line ${lineNum})` : msg;
    }
    return stderr.trim();
  }
}

async function executeInPiston(
  language: "javascript" | "python",
  code: string
): Promise<{ stdout: string; stderr: string; exitCode: number; signal: string | null }> {
  const config = RUNTIME_CONFIG[language];

  const payload: PistonExecuteRequest = {
    language: config.language,
    version: config.version,
    files: [{ name: config.filename, content: code }],
    run_timeout: 5000,
    compile_timeout: 5000,
  };

  let res: Response;
  try {
    res = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(
      `Failed to reach Piston execution service at ${PISTON_URL}. Is Docker running? (${error instanceof Error ? error.message : "Network error"})`
    );
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Piston API error (${res.status} ${res.statusText}): ${errorText}`);
  }

  const data: PistonExecuteResponse = await res.json();

  if (data.compile && data.compile.code !== 0) {
    return {
      stdout: data.compile.stdout || "",
      stderr: data.compile.stderr || data.compile.output || "Compilation error",
      exitCode: data.compile.code,
      signal: data.compile.signal,
    };
  }

  return {
    stdout: data.run.stdout || "",
    stderr: data.run.stderr || "",
    exitCode: data.run.code,
    signal: data.run.signal,
  };
}

export async function executeCode(
  language: "javascript" | "python",
  userCode: string,
  fnName: string,
  testCases: { input: unknown[]; expected: unknown }[]
): Promise<{
  results: {
    passed: boolean;
    input: unknown[];
    expected: unknown;
    output: unknown;
    error?: string;
  }[];
}> {
  const isJs = language === "javascript";
  const fullCode = isJs
    ? buildJsDriver(userCode, fnName, testCases)
    : buildPyDriver(userCode, fnName, testCases);

  const { stdout, stderr, signal } = await executeInPiston(language, fullCode);

  if (signal === "SIGKILL" || signal === "SIGTERM") {
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: "Execution Timed Out (Time Limit Exceeded)",
      })),
    };
  }

  if (stderr && !stdout) {
    const lineOffset = isJs ? 1 : 3;
    const errorMsg = cleanErrorMessage(stderr, language, lineOffset);
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: errorMsg,
      })),
    };
  }

  try {
    const results = JSON.parse(stdout || "[]");
    return { results };
  } catch {
    return {
      results: testCases.map((tc) => ({
        passed: false,
        input: tc.input,
        expected: tc.expected,
        output: null,
        error: stderr ? cleanErrorMessage(stderr, language, isJs ? 1 : 3) : "Could not parse output",
      })),
    };
  }
}
```

---

## Section 3: API Route Compatibility & Resilience

### 3.1 Run Endpoint Verification (`src/app/api/run/route.ts`)

The [`src/app/api/run/route.ts`](file:///home/aman-sharma/Desktop/vibe-code/src/app/api/run/route.ts) endpoint invokes `executeCode(language, code, fnName, testCases)`.

- Because `executeCode` maintains the exact same signature:
  ```typescript
  executeCode(language: "javascript" | "python", userCode: string, fnName: string, testCases: ...): Promise<{ results: TestResult[] }>
  ```

  no breaking changes are introduced to the route.
- If Piston is unreachable, the route's `catch (err)` block will return `{ error: "Execution failed. Is Piston running?" }` with HTTP status `500`.

### 3.2 Submit Endpoint Verification (`src/app/api/submit/route.ts`)

The [`src/app/api/submit/route.ts`](file:///home/aman-sharma/Desktop/vibe-code/src/app/api/submit/route.ts) endpoint also calls `executeCode(...)`.

- It receives `{ results }`, evaluates `passedCount` and `allPassed`, creates the `Submission` database entry, and returns the slang message.
- Existing database persistence and response contracts remain 100% compatible.

---

## Section 4: Verification & Testing Workflow

### 4.1 Starting Services & Installing Runtimes

1. Start Docker containers:
   ```bash
   docker compose up -d
   ```
2. Run the Piston setup script to install Node.js 18.15.0 and Python 3.10.0 runtimes:
   ```bash
   bash scripts/setup-piston.sh
   ```

### 4.2 Verifying Piston Health & Runtimes

Check that Piston responds with installed runtimes:

```bash
curl -s http://localhost:2000/api/v2/runtimes | jq .
```

Expected output includes:

- `{"language": "javascript", "version": "18.15.0", ...}`
- `{"language": "python", "version": "3.10.0", ...}`

---

### 4.3 End-to-End Test Scenarios

Test both endpoints (`/api/run` and `/api/submit`) across the following cases:

#### Test Case 1: JavaScript Valid Solution (Two Sum)

- **Input Code**:
  ```javascript
  function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
      const diff = target - nums[i];
      if (map.has(diff)) return [map.get(diff), i];
      map.set(nums[i], i);
    }
    return [];
  }
  ```
- **Expected Result**: `passed: true`, `passedCount === totalCount`.

#### Test Case 2: Python Valid Solution (Two Sum)

- **Input Code**:
  ```python
  def two_sum(nums, target):
      seen = {}
      for i, n in enumerate(nums):
          diff = target - n
          if diff in seen:
              return [seen[diff], i]
          seen[n] = i
      return []
  ```
- **Expected Result**: `passed: true`, `passedCount === totalCount`.

#### Test Case 3: Syntax Error Handling

- **Input Code**: `function twoSum(nums, target) { return [[ }`
- **Expected Result**: `passed: false`, `error: "SyntaxError: ... (line 1)"`.

#### Test Case 4: Infinite Loop / Timeout Handling

- **Input Code**: `function twoSum(nums, target) { while (true) {} }`
- **Expected Result**: Times out after 5000ms, returns `error: "Execution Timed Out (Time Limit Exceeded)"`.

---

### 4.4 Security Isolation Verification

Verify that sandbox escape attempts are neutralized:

1. **Environment Variable Leak Check**:
   ```javascript
   function twoSum(nums, target) {
     return [process.env.DATABASE_URL || "clean", 0];
   }
   ```

   *Expected*: `DATABASE_URL` is undefined inside the Piston container.
2. **Host File Access Check**:
   ```javascript
   function twoSum(nums, target) {
     const fs = require('fs');
     return [fs.existsSync('/etc/shadow') ? 1 : 0, 0];
   }
   ```

   *Expected*: Unprivileged user in container cannot read protected host files.

---

## Section 5: Failure Modes & Troubleshooting

| Issue / Failure Mode                                               | Root Cause                                                         | Resolution                                                                                   |
| :----------------------------------------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **5.1 Connection Refused (`ECONNREFUSED 127.0.0.1:2000`)** | `vibe-code-piston` Docker container is stopped.                  | Run`docker compose up -d piston` and verify with `docker ps`.                            |
| **5.2 `language is not installed` (HTTP 400)**             | Piston runtime packages were not installed into container volume.  | Run`bash scripts/setup-piston.sh` to install `javascript=18.15.0` and `python=3.10.0`. |
| **5.3 Execution Timed Out**                                  | User code contains an infinite loop or recursion exceeding 5000ms. | Handled gracefully:`signal === "SIGKILL"` mapped to `"Execution Timed Out"`.             |
| **5.4 Output Memory Limit Exceeded**                         | User generated excessive output (>512MB tmpfs limit).              | Piston kills the process and returns non-zero code; handled by`cleanErrorMessage`.         |

---

## Summary of Changes by File

| File                                                                                             | Change Description                                                                                                                                                     |
| :----------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/lib/piston.ts`](file:///home/aman-sharma/Desktop/vibe-code/src/lib/piston.ts)             | **Refactor**: Replace `child_process.execFile` & temp file logic with HTTP `fetch` to Piston `/api/v2/execute`. Add typed interfaces and timeout handling. |
| [`.env`](file:///home/aman-sharma/Desktop/vibe-code/.env)                                       | **Verify**: Ensure `PISTON_URL="http://localhost:2000"` is set.                                                                                                |
| [`.env.example`](file:///home/aman-sharma/Desktop/vibe-code/.env.example)                       | **Verify**: Ensure `PISTON_URL` is documented.                                                                                                                 |
| [`scripts/setup-piston.sh`](file:///home/aman-sharma/Desktop/vibe-code/scripts/setup-piston.sh) | **Verify**: Ensure execution permissions and runtime installation commands match.                                                                                |
